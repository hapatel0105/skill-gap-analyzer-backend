import express from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../config/supabase';
import { openai, LLAMA_MODELS, PROMPT_TEMPLATES, MODEL_PARAMS } from '../config/openrouter';
import { asyncHandler } from '../middleware/errorHandler';
import { CustomError } from '../middleware/errorHandler';
import type { Skill, JobDescription, ApiResponse } from '../shared/types';

const router = express.Router();

// Validation middleware
const validateJobDescription = [
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Job title is required and must be less than 100 characters'),
  body('company').trim().isLength({ min: 1, max: 100 }).withMessage('Company name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Job description must be between 10 and 5000 characters'),
];

// Create new job description
router.post('/', validateJobDescription, asyncHandler(async (req: express.Request, res: express.Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { title, company, description } = req.body;
  const userId = req.user!.id;

  try {
    // Use LLaMA model to extract required skills from job description
    const skills = await extractSkillsFromJobDescription(description);

    // Save job description to database
    const { data: jobDescription, error: dbError } = await supabase
      .from('job_descriptions')
      .insert({
        user_id: userId,
        title,
        company,
        description,
        required_skills: skills.required,
        preferred_skills: skills.preferred,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      throw new CustomError('Failed to save job description', 500);
    }

    res.status(201).json({
      success: true,
      message: 'Job description created successfully',
      data: {
        jobDescription,
        extractedSkills: skills,
      },
    } as ApiResponse<{ jobDescription: any; extractedSkills: { required: Skill[]; preferred: Skill[] } }>);

  } catch (error) {
    throw error;
  }
}));

// Get user's job descriptions
router.get('/', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userId = req.user!.id;

  const { data: jobDescriptions, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new CustomError('Failed to fetch job descriptions', 500);
  }

  res.json({
    success: true,
    data: { jobDescriptions },
  } as ApiResponse<{ jobDescriptions: any[] }>);
}));

// Get specific job description
router.get('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: jobDescription, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new CustomError('Job description not found', 404);
  }

  res.json({
    success: true,
    data: { jobDescription },
  } as ApiResponse<{ jobDescription: any }>);
}));

// Update job description
router.put('/:id', validateJobDescription, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { title, company, description } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  // Re-extract skills if description changed
  let skills = null;
  if (description) {
    skills = await extractSkillsFromJobDescription(description);
  }

  const updateData: any = {
    title,
    company,
    description,
    updated_at: new Date().toISOString(),
  };

  if (skills) {
    updateData.required_skills = skills.required;
    updateData.preferred_skills = skills.preferred;
  }

  const { data: jobDescription, error } = await supabase
    .from('job_descriptions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new CustomError('Failed to update job description', 500);
  }

  res.json({
    success: true,
    message: 'Job description updated successfully',
    data: { 
      jobDescription,
      extractedSkills: skills,
    },
  } as ApiResponse<{ jobDescription: any; extractedSkills?: { required: Skill[]; preferred: Skill[] } }>);
}));

// Delete job description
router.delete('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { error } = await supabase
    .from('job_descriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new CustomError('Failed to delete job description', 500);
  }

  res.json({
    success: true,
    message: 'Job description deleted successfully',
  } as ApiResponse<null>);
}));

// Re-analyze job description skills
router.post('/:id/reanalyze', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  // Get job description
  const { data: jobDescription, error: fetchError } = await supabase
    .from('job_descriptions')
    .select('description')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw new CustomError('Job description not found', 404);
  }

  // Re-extract skills with AI
  const skills = await extractSkillsFromJobDescription(jobDescription.description);

  // Update job description with new skills
  const { data: updatedJobDescription, error: updateError } = await supabase
    .from('job_descriptions')
    .update({
      required_skills: skills.required,
      preferred_skills: skills.preferred,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new CustomError('Failed to update skills', 500);
  }

  res.json({
    success: true,
    message: 'Skills re-analyzed successfully',
    data: {
      jobDescription: updatedJobDescription,
      extractedSkills: skills,
    },
  } as ApiResponse<{ jobDescription: any; extractedSkills: { required: Skill[]; preferred: Skill[] } }>);
}));

// Get skills comparison between resume and job description
router.get('/:id/compare/:resumeId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id: jobId, resumeId } = req.params;
  const userId = req.user!.id;

  // Get job description
  const { data: jobDescription, error: jobError } = await supabase
    .from('job_descriptions')
    .select('required_skills, preferred_skills')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (jobError) {
    throw new CustomError('Job description not found', 404);
  }

  // Get resume skills
  const { data: resume, error: resumeError } = await supabase
    .from('resumes')
    .select('extracted_skills')
    .eq('id', resumeId)
    .eq('user_id', userId)
    .single();

  if (resumeError) {
    throw new CustomError('Resume not found', 404);
  }

  // Combine all required skills
  const allRequiredSkills = [
    ...(jobDescription.required_skills || []),
    ...(jobDescription.preferred_skills || []),
  ];

  const currentSkills = resume.extracted_skills || [];

  res.json({
    success: true,
    data: {
      currentSkills,
      requiredSkills: allRequiredSkills,
      comparison: {
        totalRequired: allRequiredSkills.length,
        totalCurrent: currentSkills.length,
        matchingSkills: currentSkills.filter((current: Skill) => 
          allRequiredSkills.some((required: Skill) => 
            required.name.toLowerCase() === current.name.toLowerCase()
          )
        ),
      },
    },
  } as ApiResponse<{
    currentSkills: Skill[];
    requiredSkills: Skill[];
    comparison: {
      totalRequired: number;
      totalCurrent: number;
      matchingSkills: Skill[];
    };
  }>);
}));

router.post('/analyze', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { jobDescriptionId, description } = req.body;
  if (!jobDescriptionId || !description) {
    throw new CustomError('jobDescriptionId and description are required', 400);
  }

  const skills = await extractSkillsFromJobDescription(description);

  res.json({
    success: true,
    data: {
      requiredSkills: skills.required,
      preferredSkills: skills.preferred,
    },
  });
}));

// Helper function to extract skills from job description using LLaMA model
async function extractSkillsFromJobDescription(description: string): Promise<{ required: Skill[]; preferred: Skill[] }> {
  try {
    const prompt = `You are an expert at analyzing job descriptions and extracting technical skills.

Given the following job description, extract all technical skills and categorize them as either required or preferred.

Job description:
${description}

Please return a JSON object in this format:
{
  "required": [
    {
      "name": "skill name",
      "category": "category from: Programming Languages, Frameworks & Libraries, Databases, Cloud Platforms, DevOps & Tools, Soft Skills, Design & UX, Data Science & ML, Mobile Development, Web Technologies, Security, Testing & QA",
      "level": "beginner|intermediate|advanced|expert"
    }
  ],
  "preferred": [
    {
      "name": "skill name",
      "category": "category",
      "level": "beginner|intermediate|advanced|expert"
    }
  ]
}

Only return valid JSON, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: LLAMA_MODELS.SKILL_EXTRACTION,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing job descriptions and extracting technical skills. Return only valid JSON.',
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
    
    // Validate and transform skills
    if (!skills.required || !skills.preferred) {
      throw new Error('Invalid skills format');
    }

    const transformSkills = (skillArray: any[]): Skill[] => {
      return skillArray.map((skill: any) => ({
        id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: skill.name || '',
        category: skill.category || 'Other',
        level: skill.level || 'beginner',
      }));
    };

    return {
      required: transformSkills(skills.required),
      preferred: transformSkills(skills.preferred),
    };

  } catch (error) {
    console.error('AI skill extraction error:', error);
    // Return empty arrays if AI fails
    return { required: [], preferred: [] };
  }
}

export default router;
