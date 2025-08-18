import OpenAI from 'openai';
export declare const openai: OpenAI;
export declare const LLAMA_MODELS: {
    readonly SKILL_EXTRACTION: string;
    readonly GAP_ANALYSIS: string;
    readonly LEARNING_PATH: string;
};
export declare const PROMPT_TEMPLATES: {
    readonly SKILL_EXTRACTION: "You are an expert at analyzing resumes and extracting technical skills. \n  \nGiven the following resume text, extract all technical skills and categorize them. For each skill, determine the appropriate level (beginner, intermediate, advanced, expert) based on context clues.\n\nResume text:\n{resumeText}\n\nPlease return a JSON array of skills in this format:\n[\n  {\n    \"name\": \"skill name\",\n    \"category\": \"category from: Programming Languages, Frameworks & Libraries, Databases, Cloud Platforms, DevOps & Tools, Soft Skills, Design & UX, Data Science & ML, Mobile Development, Web Technologies, Security, Testing & QA\",\n    \"level\": \"beginner|intermediate|advanced|expert\",\n    \"confidence\": 0.95\n  }\n]\n\nOnly return valid JSON, no additional text.";
    readonly GAP_ANALYSIS: "You are an expert at analyzing skill gaps between current skills and job requirements.\n\nCurrent skills: {currentSkills}\nRequired skills: {requiredSkills}\n\nAnalyze the gaps and return a JSON object with:\n{\n  \"skillGaps\": [\n    {\n      \"skill\": \"skill name\",\n      \"currentLevel\": \"beginner|intermediate|advanced|expert\",\n      \"requiredLevel\": \"beginner|intermediate|advanced|expert\",\n      \"gap\": \"none|small|medium|large\",\n      \"priority\": \"low|medium|high\"\n    }\n  ],\n  \"overallGap\": \"small|medium|large\",\n  \"recommendedFocus\": [\"skill1\", \"skill2\"],\n  \"estimatedTimeToClose\": 12\n}\n\nOnly return valid JSON, no additional text.";
    readonly LEARNING_PATH: "You are an expert at creating personalized learning paths for skill development.\n\nSkill gaps to address: {skillGaps}\n\nCreate a learning path with resources and timeline. Return JSON:\n{\n  \"resources\": [\n    {\n      \"title\": \"resource title\",\n      \"type\": \"course|book|video|article|project\",\n      \"url\": \"resource url\",\n      \"difficulty\": \"beginner|intermediate|advanced\",\n      \"estimatedHours\": 20,\n      \"cost\": \"free|paid|freemium\"\n    }\n  ],\n  \"estimatedTimeline\": 16,\n  \"priorityOrder\": [\"skill1\", \"skill2\"],\n  \"learningStrategy\": \"Focus on high-priority skills first, then build foundational knowledge\"\n}\n\nOnly return valid JSON, no additional text.";
};
export declare const MODEL_PARAMS: {
    readonly temperature: 0.1;
    readonly max_tokens: 1000;
    readonly top_p: 0.9;
    readonly frequency_penalty: 0.1;
    readonly presence_penalty: 0.1;
};
//# sourceMappingURL=openrouter.d.ts.map