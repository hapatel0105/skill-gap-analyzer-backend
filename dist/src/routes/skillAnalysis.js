"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const supabase_1 = require("../config/supabase");
const openrouter_1 = require("../config/openrouter");
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const skillUtils_1 = require("../src/shared/utils/skillUtils");
const router = express_1.default.Router();
// Validation middleware
const validateAnalysisRequest = [
    (0, express_validator_1.body)('resumeId').isUUID().withMessage('Valid resume ID is required'),
    (0, express_validator_1.body)('jobDescriptionId').isUUID().withMessage('Valid job description ID is required'),
];
// Analyze skill gaps between resume and job description
router.post('/analyze', validateAnalysisRequest, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw new errorHandler_2.CustomError('Validation failed', 400);
    }
    const { resumeId, jobDescriptionId } = req.body;
    const userId = req.user.id;
    try {
        // Get resume skills
        const { data: resume, error: resumeError } = await supabase_1.supabase
            .from('resumes')
            .select('extracted_skills')
            .eq('id', resumeId)
            .eq('user_id', userId)
            .single();
        if (resumeError) {
            throw new errorHandler_2.CustomError('Resume not found', 404);
        }
        // Get job description skills
        const { data: jobDescription, error: jobError } = await supabase_1.supabase
            .from('job_descriptions')
            .select('required_skills, preferred_skills')
            .eq('id', jobDescriptionId)
            .eq('user_id', userId)
            .single();
        if (jobError) {
            throw new errorHandler_2.CustomError('Job description not found', 404);
        }
        const currentSkills = resume.extracted_skills || [];
        const requiredSkills = jobDescription.required_skills || [];
        const preferredSkills = jobDescription.preferred_skills || [];
        // Use LLaMA model for advanced gap analysis
        const aiAnalysis = await performAIGapAnalysis(currentSkills, [...requiredSkills, ...preferredSkills]);
        // Calculate gaps manually as fallback
        const manualGaps = calculateManualGaps(currentSkills, requiredSkills, preferredSkills);
        // Combine AI and manual analysis
        const finalAnalysis = {
            skillGaps: aiAnalysis.skillGaps && aiAnalysis.skillGaps.length > 0 ? aiAnalysis.skillGaps : manualGaps,
            overallGap: aiAnalysis.overallGap || (0, skillUtils_1.calculateOverallGap)(manualGaps),
            recommendedFocus: aiAnalysis.recommendedFocus || getRecommendedFocus(manualGaps),
            estimatedTimeToClose: aiAnalysis.estimatedTimeToClose || (0, skillUtils_1.estimateTimeToClose)(manualGaps),
        };
        // Save analysis to database
        const { data: savedAnalysis, error: saveError } = await supabase_1.supabase
            .from('skill_gaps')
            .insert({
            user_id: userId,
            resume_id: resumeId,
            job_description_id: jobDescriptionId,
            skill_gaps: finalAnalysis.skillGaps,
            overall_gap: finalAnalysis.overallGap,
            recommended_focus: finalAnalysis.recommendedFocus,
            estimated_time_to_close: finalAnalysis.estimatedTimeToClose,
            created_at: new Date().toISOString(),
        })
            .select()
            .single();
        if (saveError) {
            console.error('Failed to save analysis:', saveError);
            // Continue even if save fails
        }
        res.json({
            success: true,
            message: 'Skill gap analysis completed successfully',
            data: {
                analysis: finalAnalysis,
                savedAnalysis: savedAnalysis,
                summary: {
                    totalCurrentSkills: currentSkills.length,
                    totalRequiredSkills: requiredSkills.length,
                    totalPreferredSkills: preferredSkills.length,
                    totalGaps: finalAnalysis.skillGaps.length,
                    criticalGaps: finalAnalysis.skillGaps.filter(gap => gap.priority === 'high').length,
                },
            },
        });
    }
    catch (error) {
        throw error;
    }
}));
// Get all skill analyses for the current user
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { data: analyses, error } = await supabase_1.supabase
        .from('skill_gaps')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        throw new errorHandler_2.CustomError('Failed to fetch skill analyses', 500);
    }
    res.json({
        success: true,
        data: analyses,
    });
}));
// Get analysis history for user
router.get('/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { data: analyses, error } = await supabase_1.supabase
        .from('skill_gaps')
        .select(`
      *,
      resumes (title, file_name),
      job_descriptions (title, company)
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        throw new errorHandler_2.CustomError('Failed to fetch analysis history', 500);
    }
    res.json({
        success: true,
        data: { analyses },
    });
}));
// Get specific analysis
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { data: analysis, error } = await supabase_1.supabase
        .from('skill_gaps')
        .select(`
      *,
      resumes (title, file_name, extracted_skills),
      job_descriptions (title, company, required_skills, preferred_skills)
    `)
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (error) {
        throw new errorHandler_2.CustomError('Analysis not found', 404);
    }
    res.json({
        success: true,
        data: { analysis },
    });
}));
// Re-analyze existing analysis
router.post('/:id/reanalyze', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    // Get existing analysis
    const { data: existingAnalysis, error: fetchError } = await supabase_1.supabase
        .from('skill_gaps')
        .select(`
      *,
      resumes (extracted_skills),
      job_descriptions (required_skills, preferred_skills)
    `)
        .eq('id', id)
        .eq('user_id', userId)
        .single();
    if (fetchError) {
        throw new errorHandler_2.CustomError('Analysis not found', 404);
    }
    const currentSkills = existingAnalysis.resumes.extracted_skills || [];
    const requiredSkills = existingAnalysis.job_descriptions.required_skills || [];
    const preferredSkills = existingAnalysis.job_descriptions.preferred_skills || [];
    // Perform new AI analysis
    const newAnalysis = await performAIGapAnalysis(currentSkills, [...requiredSkills, ...preferredSkills]);
    // Update analysis
    const { data: updatedAnalysis, error: updateError } = await supabase_1.supabase
        .from('skill_gaps')
        .update({
        skill_gaps: newAnalysis.skillGaps,
        overall_gap: newAnalysis.overallGap,
        recommended_focus: newAnalysis.recommendedFocus,
        estimated_time_to_close: newAnalysis.estimatedTimeToClose,
        updated_at: new Date().toISOString(),
    })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
    if (updateError) {
        throw new errorHandler_2.CustomError('Failed to update analysis', 500);
    }
    res.json({
        success: true,
        message: 'Analysis updated successfully',
        data: {
            analysis: updatedAnalysis,
        },
    });
}));
// Get skills insights and recommendations
router.get('/insights', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    // Get all user's skills from resumes
    const { data: resumes, error: resumeError } = await supabase_1.supabase
        .from('resumes')
        .select('extracted_skills')
        .eq('user_id', userId);
    if (resumeError) {
        throw new errorHandler_2.CustomError('Failed to fetch resumes', 500);
    }
    // Aggregate all skills
    const allSkills = resumes.reduce((acc, resume) => {
        return acc.concat(resume.extracted_skills || []);
    }, []);
    // Get skill insights
    const insights = await generateSkillInsights(allSkills);
    res.json({
        success: true,
        data: { insights },
    });
}));
// Helper function to perform AI-powered gap analysis
async function performAIGapAnalysis(currentSkills, requiredSkills) {
    try {
        const prompt = openrouter_1.PROMPT_TEMPLATES.GAP_ANALYSIS
            .replace('{currentSkills}', JSON.stringify(currentSkills))
            .replace('{requiredSkills}', JSON.stringify(requiredSkills));
        const completion = await openrouter_1.openai.chat.completions.create({
            model: openrouter_1.LLAMA_MODELS.GAP_ANALYSIS,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert at analyzing skill gaps and providing career development advice. Return only valid JSON.',
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
            throw new Error('No response from AI model');
        }
        const analysis = JSON.parse(response);
        // Transform AI response to match our types
        const skillGaps = (analysis.skillGaps || []).map((gap) => ({
            skill: {
                id: gap.skill || `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: gap.skill || '',
                category: 'Other',
                level: gap.currentLevel || 'beginner',
            },
            currentLevel: gap.currentLevel || 'beginner',
            requiredLevel: gap.requiredLevel || 'intermediate',
            gap: gap.gap || 'medium',
            priority: gap.priority || 'medium',
        }));
        return {
            skillGaps,
            overallGap: analysis.overallGap || 'medium',
            recommendedFocus: analysis.recommendedFocus || [],
            estimatedTimeToClose: analysis.estimatedTimeToClose || 12,
        };
    }
    catch (error) {
        console.error('AI gap analysis error:', error);
        return {};
    }
}
// Helper function to calculate gaps manually
function calculateManualGaps(currentSkills, requiredSkills, preferredSkills) {
    const gaps = [];
    const allRequired = [...requiredSkills, ...preferredSkills];
    // Find gaps for required skills
    for (const required of allRequired) {
        const current = currentSkills.find(c => c.name.toLowerCase() === required.name.toLowerCase());
        if (!current) {
            // Skill not found - large gap
            gaps.push({
                skill: required,
                currentLevel: 'beginner',
                requiredLevel: required.level,
                gap: 'large',
                priority: (0, skillUtils_1.calculatePriority)('large', true),
            });
        }
        else {
            // Skill found - calculate gap
            const gap = (0, skillUtils_1.calculateSkillGap)(current.level, required.level);
            if (gap !== 'none') {
                gaps.push({
                    skill: required,
                    currentLevel: current.level,
                    requiredLevel: required.level,
                    gap,
                    priority: (0, skillUtils_1.calculatePriority)(gap, true),
                });
            }
        }
    }
    return gaps;
}
// Helper function to get recommended focus areas
function getRecommendedFocus(gaps) {
    const highPrioritySkills = gaps
        .filter(gap => gap.priority === 'high')
        .map(gap => gap.skill.name);
    const mediumPrioritySkills = gaps
        .filter(gap => gap.priority === 'medium')
        .map(gap => gap.skill.name);
    return [...highPrioritySkills, ...mediumPrioritySkills].slice(0, 5);
}
// Helper function to generate skill insights
async function generateSkillInsights(skills) {
    try {
        const prompt = `Analyze the following skills and provide insights:

Skills: ${JSON.stringify(skills)}

Provide insights in JSON format:
{
  "strengths": ["skill1", "skill2"],
  "weaknesses": ["skill1", "skill2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "marketDemand": "high|medium|low",
  "growthAreas": ["area1", "area2"]
}`;
        const completion = await openrouter_1.openai.chat.completions.create({
            model: openrouter_1.LLAMA_MODELS.GAP_ANALYSIS,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert career advisor. Return only valid JSON.',
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
            throw new Error('No response from AI model');
        }
        return JSON.parse(response);
    }
    catch (error) {
        console.error('AI insights generation error:', error);
        return {
            strengths: [],
            weaknesses: [],
            recommendations: [],
            marketDemand: 'medium',
            growthAreas: [],
        };
    }
}
exports.default = router;
//# sourceMappingURL=skillAnalysis.js.map