import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { openai, LLAMA_MODELS, PROMPT_TEMPLATES, MODEL_PARAMS } from '../config/openrouter';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import type { SkillGap, LearningResource, LearningPath, ApiResponse } from '../../../shared/types';

const router = express.Router();

// Validation middleware
const validateLearningPathRequest = [
  body('skillGaps').isArray().withMessage('Skill gaps array is required'),
  body('skillGaps.*.skill.name').notEmpty().withMessage('Skill name is required'),
  body('skillGaps.*.gap').isIn(['small', 'medium', 'large']).withMessage('Valid gap size is required'),
];

// Generate personalized learning path
router.post('/generate', validateLearningPathRequest, asyncHandler(async (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { skillGaps, preferences } = req.body;
  const userId = req.user!.id;

  try {
    // Use LLaMA model to generate learning path
    const aiLearningPath = await generateAILearningPath(skillGaps, preferences);

    // Create learning path object
    const learningPath: Partial<LearningPath> = {
      userId,
      skillGaps,
      resources: aiLearningPath.resources || [],
      estimatedTimeline: aiLearningPath.estimatedTimeline || 12,
      priorityOrder: aiLearningPath.priorityOrder || skillGaps.map((gap: SkillGap) => gap.skill.id),
      createdAt: new Date(),
    };

    // Save learning path to database
    const { data: savedPath, error: saveError } = await supabase
      .from('learning_paths')
      .insert({
        user_id: userId,
        skill_gaps: skillGaps,
        resources: learningPath.resources,
        estimated_timeline: learningPath.estimatedTimeline,
        priority_order: learningPath.priorityOrder,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      throw new CustomError('Failed to save learning path', 500);
    }

    res.status(201).json({
      success: true,
      message: 'Learning path generated successfully',
      data: {
        learningPath: savedPath,
        aiRecommendations: aiLearningPath,
      },
    } as ApiResponse<{
      learningPath: any;
      aiRecommendations: any;
    }>);

  } catch (error) {
    throw error;
  }
}));

// Get user's learning paths
router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userId = req.user!.id;

  const { data: learningPaths, error } = await supabase
    .from('learning_paths')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new CustomError('Failed to fetch learning paths', 500);
  }

  res.json({
    success: true,
    data: { learningPaths },
  } as ApiResponse<{ learningPaths: any[] }>);
}));

// Get specific learning path
router.get('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: learningPath, error } = await supabase
    .from('learning_paths')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new CustomError('Learning path not found', 404);
  }

  res.json({
    success: true,
    data: { learningPath },
  } as ApiResponse<{ learningPath: any }>);
}));

// Update learning path progress
router.put('/:id/progress', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { completedResources, currentSkill, notes } = req.body;

  const { data: learningPath, error } = await supabase
    .from('learning_paths')
    .update({
      completed_resources: completedResources,
      current_skill: currentSkill,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new CustomError('Failed to update learning path', 500);
  }

  res.json({
    success: true,
    message: 'Learning path progress updated successfully',
    data: { learningPath },
  } as ApiResponse<{ learningPath: any }>);
}));

// Regenerate learning path
router.post('/:id/regenerate', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { preferences } = req.body;

  // Get existing learning path
  const { data: existingPath, error: fetchError } = await supabase
    .from('learning_paths')
    .select('skill_gaps')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw new CustomError('Learning path not found', 404);
  }

  // Generate new learning path with AI
  const newLearningPath = await generateAILearningPath(existingPath.skill_gaps, preferences);

  // Update learning path
  const { data: updatedPath, error: updateError } = await supabase
    .from('learning_paths')
    .update({
      resources: newLearningPath.resources,
      estimated_timeline: newLearningPath.estimatedTimeline,
      priority_order: newLearningPath.priorityOrder,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new CustomError('Failed to update learning path', 500);
  }

  res.json({
    success: true,
    message: 'Learning path regenerated successfully',
    data: {
      learningPath: updatedPath,
      aiRecommendations: newLearningPath,
    },
  } as ApiResponse<{
    learningPath: any;
    aiRecommendations: any;
  }>);
}));

// Get learning resources by skill
router.get('/resources/:skillName', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { skillName } = req.params;
  const { difficulty, type, cost } = req.query;

  // Build filter conditions
  const filters: any = {};
  if (difficulty) filters.difficulty = difficulty;
  if (type) filters.type = type;
  if (cost) filters.cost = cost;

  // Get resources from database (you can populate this with curated resources)
  const { data: resources, error } = await supabase
    .from('learning_resources')
    .select('*')
    .ilike('skills', `%${skillName}%`)
    .order('rating', { ascending: false });

  if (error) {
    throw new CustomError('Failed to fetch learning resources', 500);
  }

  // Filter by additional criteria
  let filteredResources = resources;
  if (difficulty) {
    filteredResources = filteredResources.filter(r => r.difficulty === difficulty);
  }
  if (type) {
    filteredResources = filteredResources.filter(r => r.type === type);
  }
  if (cost) {
    filteredResources = filteredResources.filter(r => r.cost === cost);
  }

  res.json({
    success: true,
    data: { resources: filteredResources },
  } as ApiResponse<{ resources: any[] }>);
}));

// Get learning path recommendations
router.get('/recommendations', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userId = req.user!.id;

  // Get user's current skills and recent analyses
  const { data: recentAnalyses, error: analysisError } = await supabase
    .from('skill_gaps')
    .select('skill_gaps, overall_gap')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  if (analysisError) {
    throw new CustomError('Failed to fetch recent analyses', 500);
  }

  // Generate personalized recommendations
  const recommendations = await generatePersonalizedRecommendations(recentAnalyses);

  res.json({
    success: true,
    data: { recommendations },
  } as ApiResponse<{ recommendations: any }>);
}));

// Helper function to generate AI-powered learning path
async function generateAILearningPath(skillGaps: SkillGap[], preferences?: any): Promise<any> {
  try {
    const prompt = PROMPT_TEMPLATES.LEARNING_PATH.replace('{skillGaps}', JSON.stringify(skillGaps));

    const completion = await openai.chat.completions.create({
      model: LLAMA_MODELS.LEARNING_PATH,
      messages: [
        {
          role: 'system',
          content: 'You are an expert career development advisor. Create personalized learning paths. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      ...MODEL_PARAMS,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI model');
    }

    const learningPath = JSON.parse(response);
    
    // Transform AI response to match our types
    const resources: LearningResource[] = (learningPath.resources || []).map((resource: any) => ({
      id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: resource.title || '',
      type: resource.type || 'course',
      url: resource.url || '',
      difficulty: resource.difficulty || 'beginner',
      estimatedHours: resource.estimatedHours || 10,
      cost: resource.cost || 'free',
    }));

    return {
      resources,
      estimatedTimeline: learningPath.estimatedTimeline || 12,
      priorityOrder: learningPath.priorityOrder || [],
      learningStrategy: learningPath.learningStrategy || '',
    };

  } catch (error) {
    console.error('AI learning path generation error:', error);
    // Return fallback learning path
    return generateFallbackLearningPath(skillGaps);
  }
}

// Helper function to generate fallback learning path
function generateFallbackLearningPath(skillGaps: SkillGap[]): any {
  const priorityOrder = skillGaps
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .map(gap => gap.skill.id);

  const resources: LearningResource[] = skillGaps.map(gap => ({
    id: `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: `Learn ${gap.skill.name}`,
    type: 'course',
    url: `https://example.com/learn/${gap.skill.name.toLowerCase().replace(/\s+/g, '-')}`,
    difficulty: gap.currentLevel === 'expert' ? 'advanced' : gap.currentLevel,
    estimatedHours: gap.gap === 'large' ? 20 : gap.gap === 'medium' ? 12 : 6,
    cost: 'free',
  }));

  return {
    resources,
    estimatedTimeline: Math.ceil(skillGaps.length * 3), // 3 weeks per skill
    priorityOrder,
    learningStrategy: 'Focus on high-priority skills first, then build foundational knowledge',
  };
}

// Helper function to generate personalized recommendations
async function generatePersonalizedRecommendations(analyses: any[]): Promise<any> {
  try {
    if (analyses.length === 0) {
      return {
        nextSteps: ['Upload your resume to get started'],
        trendingSkills: ['JavaScript', 'Python', 'React', 'AWS'],
        learningTips: ['Focus on one skill at a time', 'Build projects to practice'],
      };
    }

    // Analyze recent skill gaps
    const allGaps = analyses.reduce((acc: any[], analysis) => {
      return acc.concat(analysis.skill_gaps || []);
    }, []);

    const highPrioritySkills = allGaps
      .filter((gap: any) => gap.priority === 'high')
      .map((gap: any) => gap.skill.name)
      .slice(0, 3);

    const nextSteps = highPrioritySkills.map(skill => `Focus on improving ${skill}`);
    
    if (nextSteps.length === 0) {
      nextSteps.push('Great job! Consider learning new technologies to stay competitive');
    }

    return {
      nextSteps,
      trendingSkills: ['JavaScript', 'Python', 'React', 'AWS', 'Docker', 'Kubernetes'],
      learningTips: [
        'Practice with real projects',
        'Join online communities',
        'Follow industry leaders',
        'Set specific learning goals',
      ],
      skillFocus: highPrioritySkills,
    };

  } catch (error) {
    console.error('Recommendations generation error:', error);
    return {
      nextSteps: ['Start with the basics'],
      trendingSkills: ['JavaScript', 'Python', 'React'],
      learningTips: ['Focus on fundamentals', 'Build projects'],
    };
  }
}

export default router;
