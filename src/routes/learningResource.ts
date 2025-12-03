import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { openai, LLAMA_MODELS, MODEL_PARAMS } from '../config/openrouter';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import type { LearningResource, Skill, ApiResponse } from '../shared/types';

const router = express.Router();

// Validation middleware
const validateLearningResource = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('type').isIn(['course', 'tutorial', 'book', 'video', 'documentation', 'practice', 'certification']).withMessage('Invalid resource type'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid difficulty level'),
  body('estimated_hours').optional().isInt({ min: 1, max: 1000 }).withMessage('Estimated hours must be between 1 and 1000'),
  body('cost').optional().isIn(['free', 'paid', 'subscription', 'one_time']).withMessage('Invalid cost type'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
];

const validateFilters = [
  query('type').optional().isIn(['course', 'tutorial', 'book', 'video', 'documentation', 'practice', 'certification']).withMessage('Invalid resource type'),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid difficulty level'),
  query('cost').optional().isIn(['free', 'paid', 'subscription', 'one_time']).withMessage('Invalid cost type'),
  query('skill').optional().isString().withMessage('Skill filter must be a string'),
  query('min_rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Min rating must be between 0 and 5'),
  query('max_hours').optional().isInt({ min: 1 }).withMessage('Max hours must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
];

// Create new learning resource
router.post('/', validateLearningResource, asyncHandler(async (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const {
    title,
    type,
    url,
    difficulty = 'beginner',
    estimated_hours = 10,
    cost = 'free',
    skills = [],
    rating = 0.0,
    description
  } = req.body;

  try {
    // Optionally use AI to analyze the resource and extract skills if URL is provided
    let extractedSkills = skills;
    if (!skills.length && description) {
      extractedSkills = await extractSkillsFromResource(title, description, type);
    }

    // Save learning resource to database
    const { data: learningResource, error: dbError } = await supabaseAdmin
      .from('learning_resources')
      .insert({
        title,
        type,
        url,
        difficulty,
        estimated_hours,
        cost,
        skills: extractedSkills,
        rating,
        description,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new CustomError('Failed to save learning resource', 500);
    }

    res.status(201).json({
      success: true,
      message: 'Learning resource created successfully',
      data: {
        learningResource,
        extractedSkills: extractedSkills.length > skills.length ? extractedSkills : null,
      },
    } as ApiResponse<{ learningResource: LearningResource; extractedSkills: string[] | null }>);

  } catch (error) {
    throw error;
  }
}));

// Get learning resources with filtering and pagination
router.get('/', validateFilters, asyncHandler(async (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Invalid query parameters', 400);
  }

  const {
    type,
    difficulty,
    cost,
    skill,
    min_rating,
    max_hours,
    limit = 20,
    offset = 0,
    search
  } = req.query;

  let query = supabaseAdmin
    .from('learning_resources')
    .select('*', { count: 'exact' });

  // Apply filters
  if (type) query = query.eq('type', type);
  if (difficulty) query = query.eq('difficulty', difficulty);
  if (cost) query = query.eq('cost', cost);
  if (skill) query = query.contains('skills', [skill as string]);
  if (min_rating) query = query.gte('rating', parseFloat(min_rating as string));
  if (max_hours) query = query.lte('estimated_hours', parseInt(max_hours as string));

  // Text search on title and description
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Apply pagination and ordering
  query = query
    .order('created_at', { ascending: false })
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

  const { data: learningResources, error, count } = await query;

  if (error) {
    console.error('Database error:', error);
    throw new CustomError('Failed to fetch learning resources', 500);
  }

  res.json({
    success: true,
    data: {
      learningResources,
      pagination: {
        total: count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: (count || 0) > parseInt(offset as string) + parseInt(limit as string)
      }
    },
  } as ApiResponse<{
    learningResources: LearningResource[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    }
  }>);
}));

// Get specific learning resource
router.get('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  const { data: learningResource, error } = await supabaseAdmin
    .from('learning_resources')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !learningResource) {
    throw new CustomError('Learning resource not found', 404);
  }

  res.json({
    success: true,
    data: { learningResource },
  } as ApiResponse<{ learningResource: LearningResource }>);
}));

// Update learning resource
router.put('/:id', validateLearningResource, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const {
    title,
    type,
    url,
    difficulty,
    estimated_hours,
    cost,
    skills,
    rating,
    description
  } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const updateData: any = {
    title,
    type,
    url,
    difficulty,
    estimated_hours,
    cost,
    skills,
    rating,
    description,
    updated_at: new Date().toISOString(),
  };

  const { data: learningResource, error } = await supabaseAdmin
    .from('learning_resources')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !learningResource) {
    console.error('Database error:', error);
    throw new CustomError('Failed to update learning resource', 500);
  }

  res.json({
    success: true,
    message: 'Learning resource updated successfully',
    data: { learningResource },
  } as ApiResponse<{ learningResource: LearningResource }>);
}));

// Delete learning resource
router.delete('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('learning_resources')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Database error:', error);
    throw new CustomError('Failed to delete learning resource', 500);
  }

  res.json({
    success: true,
    message: 'Learning resource deleted successfully',
  } as ApiResponse<null>);
}));

// Get learning resources by skills
router.post('/by-skills', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { skills, difficulty, limit = 10 } = req.body;

  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    throw new CustomError('Skills array is required', 400);
  }

  let query = supabaseAdmin
    .from('learning_resources')
    .select('*')
    .overlaps('skills', skills);

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  query = query
    .order('rating', { ascending: false })
    .limit(limit);

  const { data: learningResources, error } = await query;

  if (error) {
    console.error('Database error:', error);
    throw new CustomError('Failed to fetch learning resources', 500);
  }

  res.json({
    success: true,
    data: {
      learningResources,
      skillsQueried: skills
    },
  } as ApiResponse<{ learningResources: LearningResource[]; skillsQueried: string[] }>);
}));

// Get recommended resources based on skill gaps
router.post('/recommendations', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { currentSkills = [], targetSkills = [], difficulty = 'beginner', limit = 5 } = req.body;

  if (!Array.isArray(targetSkills) || targetSkills.length === 0) {
    throw new CustomError('Target skills array is required', 400);
  }

  // Find skills that user needs to learn
  const skillGaps = targetSkills.filter((skill: string) =>
    !currentSkills.some((current: string) =>
      current.toLowerCase() === skill.toLowerCase()
    )
  );

  if (skillGaps.length === 0) {
    return res.json({
      success: true,
      data: {
        learningResources: [],
        message: 'No skill gaps identified - you already have all target skills!'
      },
    });
  }

  let query = supabaseAdmin
    .from('learning_resources')
    .select('*')
    .overlaps('skills', skillGaps)
    .eq('difficulty', difficulty);

  query = query
    .order('rating', { ascending: false })
    .limit(limit);

  const { data: learningResources, error } = await query;

  if (error) {
    console.error('Database error:', error);
    throw new CustomError('Failed to fetch recommendations', 500);
  }

  res.json({
    success: true,
    data: {
      learningResources,
      skillGaps,
      currentSkills,
      targetSkills
    },
  } as ApiResponse<{
    learningResources: LearningResource[];
    skillGaps: string[];
    currentSkills: string[];
    targetSkills: string[];
  }>);
}));

// Analyze resource content and extract skills
router.post('/analyze', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { title, description, type } = req.body;

  if (!title || !description || !type) {
    throw new CustomError('Title, description, and type are required', 400);
  }

  try {
    const skills = await extractSkillsFromResource(title, description, type);

    res.json({
      success: true,
      data: {
        extractedSkills: skills,
      },
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new CustomError('Failed to analyze resource', 500);
  }
}));

// Helper function to extract skills from resource using AI
async function extractSkillsFromResource(title: string, description: string, type: string): Promise<string[]> {
  try {
    const prompt = `You are an expert at analyzing learning resources and extracting relevant technical skills.

Given the following learning resource information, extract all technical skills that someone would learn from this resource.

Title: ${title}
Type: ${type}
Description: ${description}

Please return a JSON array of skill names (strings only). Focus on technical skills, programming languages, frameworks, tools, and technologies.

Example format:
["JavaScript", "React", "Node.js", "MongoDB", "REST APIs"]

Only return valid JSON array, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: LLAMA_MODELS.SKILL_EXTRACTION,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing learning resources and extracting technical skills. Return only a valid JSON array of skill names.',
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

    // Parse JSON response
    const skills = JSON.parse(response);

    // Validate that it's an array of strings
    if (!Array.isArray(skills) || !skills.every(skill => typeof skill === 'string')) {
      throw new Error('Invalid skills format from AI');
    }

    return skills;

  } catch (error) {
    console.error('AI skill extraction error:', error);
    // Return empty array if AI fails
    return [];
  }
}

export default router;