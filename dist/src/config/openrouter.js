"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PARAMS = exports.PROMPT_TEMPLATES = exports.LLAMA_MODELS = exports.openai = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
if (!openrouterApiKey) {
    throw new Error('Missing OpenRouter API key');
}
// Configure OpenAI client to use OpenRouter
exports.openai = new openai_1.default({
    apiKey: openrouterApiKey,
    baseURL: openrouterBaseUrl,
    defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Skill Gap Analyzer',
    },
});
// LLaMA model configurations
exports.LLAMA_MODELS = {
    SKILL_EXTRACTION: process.env.SKILL_EXTRACTION_MODEL || 'gpt-4o-mini',
    GAP_ANALYSIS: process.env.GAP_ANALYSIS_MODEL || 'gpt-4o-mini',
    LEARNING_PATH: process.env.LEARNING_PATH_MODEL || 'gpt-4o-mini',
};
// Prompt templates for different AI tasks
exports.PROMPT_TEMPLATES = {
    SKILL_EXTRACTION: `You are an expert at analyzing resumes and extracting technical skills. 
  
Given the following resume text, extract all technical skills and categorize them. For each skill, determine the appropriate level (beginner, intermediate, advanced, expert) based on context clues.

Resume text:
{resumeText}

Please return a JSON array of skills in this format:
[
  {
    "name": "skill name",
    "category": "category from: Programming Languages, Frameworks & Libraries, Databases, Cloud Platforms, DevOps & Tools, Soft Skills, Design & UX, Data Science & ML, Mobile Development, Web Technologies, Security, Testing & QA",
    "level": "beginner|intermediate|advanced|expert",
    "confidence": 0.95
  }
]

Only return valid JSON, no additional text.`,
    GAP_ANALYSIS: `You are an expert at analyzing skill gaps between current skills and job requirements.

Current skills: {currentSkills}
Required skills: {requiredSkills}

Analyze the gaps and return a JSON object with:
{
  "skillGaps": [
    {
      "skill": "skill name",
      "currentLevel": "beginner|intermediate|advanced|expert",
      "requiredLevel": "beginner|intermediate|advanced|expert",
      "gap": "none|small|medium|large",
      "priority": "low|medium|high"
    }
  ],
  "overallGap": "small|medium|large",
  "recommendedFocus": ["skill1", "skill2"],
  "estimatedTimeToClose": 12
}

Only return valid JSON, no additional text.`,
    LEARNING_PATH: `You are an expert at creating personalized learning paths for skill development.

Skill gaps to address: {skillGaps}

Create a learning path with resources and timeline. Return JSON:
{
  "resources": [
    {
      "title": "resource title",
      "type": "course|book|video|article|project",
      "url": "resource url",
      "difficulty": "beginner|intermediate|advanced",
      "estimatedHours": 20,
      "cost": "free|paid|freemium"
    }
  ],
  "estimatedTimeline": 16,
  "priorityOrder": ["skill1", "skill2"],
  "learningStrategy": "Focus on high-priority skills first, then build foundational knowledge"
}

Only return valid JSON, no additional text.`,
};
// Model parameters for consistent results
exports.MODEL_PARAMS = {
    temperature: 0.1, // Low temperature for consistent, structured outputs
    max_tokens: 1000,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
};
//# sourceMappingURL=openrouter.js.map