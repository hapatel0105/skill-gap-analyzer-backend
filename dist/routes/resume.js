"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/resume.ts
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const supabase_1 = require("../config/supabase");
const openrouter_1 = require("../config/openrouter");
const errorHandler_1 = require("../middleware/errorHandler");
const upload_1 = require("../middleware/upload");
const errorHandler_2 = require("../middleware/errorHandler");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// Updated validation for multipart form data
const validateResumeData = [
    (0, express_validator_1.body)('title').optional().trim().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('description').optional().trim().isLength({ max: 500 }),
];
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { data: resumes, error } = await supabase_1.supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
    if (error)
        throw new errorHandler_2.CustomError('Failed to fetch resumes', 500);
    res.status(200).json({ success: true, data: resumes });
}));
router.post('/upload', upload_1.uploadResume, upload_1.handleUploadError, upload_1.validateUploadedFile, validateResumeData, // Add validation middleware
(0, errorHandler_1.asyncHandler)(async (req, res) => {
    // Check for validation errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        // Clean up uploaded file if validation fails
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        throw new errorHandler_2.CustomError('Invalid input data', 400);
    }
    const file = req.file;
    if (!file) {
        throw new errorHandler_2.CustomError('No file uploaded. Please upload a PDF/DOC/DOCX file.', 400);
    }
    const filePath = file.path;
    const originalFileName = file.originalname;
    const sanitizedFileName = originalFileName.replace(/\s+/g, '_'); // remove spaces
    const { title, description } = req.body;
    const userId = req.user.id;
    try {
        // Extract text
        let extractedText = '';
        const fileExt = path_1.default.extname(sanitizedFileName).toLowerCase();
        if (fileExt === '.pdf') {
            const dataBuffer = fs_1.default.readFileSync(filePath);
            const pdfData = await (0, pdf_parse_1.default)(dataBuffer);
            extractedText = pdfData.text;
        }
        else if (fileExt === '.docx' || fileExt === '.doc') {
            const result = await mammoth_1.default.extractRawText({ path: filePath });
            extractedText = result.value;
        }
        else {
            // For other text files
            extractedText = fs_1.default.readFileSync(filePath, 'utf8');
        }
        if (!extractedText.trim()) {
            throw new errorHandler_2.CustomError('Could not extract text from file. Please ensure the file contains readable text.', 400);
        }
        // Extract skills using AI
        const skills = await extractSkillsWithAI(extractedText);
        // Prepare storage filename with timestamp and user ID
        const timestamp = Date.now();
        const storageFileName = `resumes/${userId}/${timestamp}-${sanitizedFileName}`;
        const fileBuffer = fs_1.default.readFileSync(filePath);
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase_1.supabaseAdmin.storage
            .from(supabase_1.STORAGE_BUCKETS.RESUMES)
            .upload(storageFileName, fileBuffer, {
            upsert: false,
            contentType: file.mimetype
        });
        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            throw new errorHandler_2.CustomError(`File upload to storage failed: ${uploadError.message}`, 500);
        }
        // Get public URL
        const { data: urlData } = supabase_1.supabase.storage
            .from(supabase_1.STORAGE_BUCKETS.RESUMES)
            .getPublicUrl(storageFileName);
        // Save resume metadata to database
        const { data: resumeData, error: dbError } = await supabase_1.supabase
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
            await supabase_1.supabaseAdmin.storage
                .from(supabase_1.STORAGE_BUCKETS.RESUMES)
                .remove([storageFileName]);
            throw new errorHandler_2.CustomError('Failed to save resume data', 500);
        }
        // Clean up local file
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        res.status(201).json({
            success: true,
            message: 'Resume uploaded and parsed successfully',
            data: {
                resume: resumeData,
                extractedSkills: skills,
                extractedText: extractedText.substring(0, 500) + '...' // Preview of extracted text
            },
        });
    }
    catch (error) {
        // Clean up local file on error
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        console.error('Upload route error:', error);
        throw error;
    }
}));
async function extractSkillsWithAI(text) {
    try {
        const prompt = openrouter_1.PROMPT_TEMPLATES.SKILL_EXTRACTION.replace('{resumeText}', text);
        const completion = await openrouter_1.openai.chat.completions.create({
            model: openrouter_1.LLAMA_MODELS.SKILL_EXTRACTION,
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
            ...openrouter_1.MODEL_PARAMS,
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
        }
        catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            return [];
        }
        if (!Array.isArray(skills)) {
            console.error('AI response is not an array:', skills);
            return [];
        }
        return skills.map((skill, index) => ({
            id: `skill_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
            name: skill.name || 'Unknown Skill',
            category: skill.category || 'Other',
            level: skill.level || 'beginner',
            confidence: typeof skill.confidence === 'number' ? skill.confidence : 0.8,
        }));
    }
    catch (error) {
        console.error('AI skill extraction error:', error);
        return []; // Return empty array instead of throwing
    }
}
exports.default = router;
//# sourceMappingURL=resume.js.map