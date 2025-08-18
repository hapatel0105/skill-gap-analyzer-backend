// routes/resume.ts
import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase, STORAGE_BUCKETS, supabaseAdmin } from '../config/supabase';
import { openai, LLAMA_MODELS, PROMPT_TEMPLATES, MODEL_PARAMS } from '../config/openrouter';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadResume, handleUploadError, validateUploadedFile, cleanupUploadedFile } from '../middleware/upload';
import { CustomError } from '../middleware/errorHandler';
import type { Skill, ApiResponse } from '../../../shared/types';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Updated validation for multipart form data
const validateResumeData = [
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (error) throw new CustomError('Failed to fetch resumes', 500);

    res.status(200).json({ success: true, data: resumes } as ApiResponse<any[]>);
  })
);

router.post(
  '/upload',
  uploadResume,
  handleUploadError,
  validateUploadedFile,
  validateResumeData, // Add validation middleware
  asyncHandler(async (req: Request, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw new CustomError('Invalid input data', 400);
    }

    const file = req.file;
    if (!file) {
      throw new CustomError('No file uploaded. Please upload a PDF/DOC/DOCX file.', 400);
    }

    const filePath = file.path;
    const originalFileName = file.originalname;
    const sanitizedFileName = originalFileName.replace(/\s+/g, '_'); // remove spaces
    const { title, description } = req.body;
    const userId = req.user!.id;

    try {
      // Extract text
      let extractedText = '';
      const fileExt = path.extname(sanitizedFileName).toLowerCase();

      if (fileExt === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdf(dataBuffer);
        extractedText = pdfData.text;
      } else if (fileExt === '.docx' || fileExt === '.doc') {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } else {
        // For other text files
        extractedText = fs.readFileSync(filePath, 'utf8');
      }

      if (!extractedText.trim()) {
        throw new CustomError('Could not extract text from file. Please ensure the file contains readable text.', 400);
      }

      // Extract skills using AI
      const skills = await extractSkillsWithAI(extractedText);

      // Prepare storage filename with timestamp and user ID
      const timestamp = Date.now();
      const storageFileName = `resumes/${userId}/${timestamp}-${sanitizedFileName}`;
      const fileBuffer = fs.readFileSync(filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.RESUMES)
        .upload(storageFileName, fileBuffer, { 
          upsert: false,
          contentType: file.mimetype 
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new CustomError(`File upload to storage failed: ${uploadError.message}`, 500);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.RESUMES)
        .getPublicUrl(storageFileName);

      // Save resume metadata to database
      const { data: resumeData, error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          file_name: sanitizedFileName,
          file_url: urlData.publicUrl,
          storage_path: storageFileName,
          title: title || sanitizedFileName,
          description: description || '',
          extracted_text: extractedText,
          extracted_skills: skills,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Clean up uploaded file from storage if DB insert fails
        await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.RESUMES)
          .remove([storageFileName]);
        
        throw new CustomError('Failed to save resume data', 500);
      }

      // Clean up local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(201).json({
        success: true,
        message: 'Resume uploaded and parsed successfully',
        data: { 
          resume: resumeData, 
          extractedSkills: skills,
          extractedText: extractedText.substring(0, 500) + '...' // Preview of extracted text
        },
      } as ApiResponse<{ resume: any; extractedSkills: Skill[]; extractedText: string }>);

    } catch (error: any) {
      // Clean up local file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      console.error('Upload route error:', error);
      throw error;
    }
  })
);

async function extractSkillsWithAI(text: string): Promise<Skill[]> {
  try {
    const prompt = PROMPT_TEMPLATES.SKILL_EXTRACTION.replace('{resumeText}', text);

    const completion = await openai.chat.completions.create({
      model: LLAMA_MODELS.SKILL_EXTRACTION,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing resumes and extracting technical skills. Return only valid JSON array of skills.',
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
      console.warn('No response from AI model for skill extraction');
      return [];
    }

    let skills;
    try {
      let raw = response; // the string from OpenAI
      raw = raw.replace(/```json|```/g, '').trim(); // remove ```json and ```
      skills = JSON.parse(raw);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return [];
    }

    if (!Array.isArray(skills)) {
      console.error('AI response is not an array:', skills);
      return [];
    }

    return skills.map((skill: any, index: number) => ({
      id: `skill_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      name: skill.name || 'Unknown Skill',
      category: skill.category || 'Other',
      level: skill.level || 'beginner',
      confidence: typeof skill.confidence === 'number' ? skill.confidence : 0.8,
    }));

  } catch (error) {
    console.error('AI skill extraction error:', error);
    return []; // Return empty array instead of throwing
  }
}

export default router;