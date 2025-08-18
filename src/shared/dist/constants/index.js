"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_RECOMMENDATIONS = exports.TIME_ESTIMATES = exports.DEFAULT_SKILL_LEVEL = exports.AI_MODELS = exports.FILE_UPLOAD = exports.EXPERIENCE_LEVELS = exports.GAP_SIZES = exports.PRIORITY_LEVELS = exports.COST_CATEGORIES = exports.DIFFICULTY_LEVELS = exports.RESOURCE_TYPES = exports.SKILL_CATEGORIES = void 0;
// Skill categories for organizing skills
exports.SKILL_CATEGORIES = {
    PROGRAMMING_LANGUAGES: 'Programming Languages',
    FRAMEWORKS_LIBRARIES: 'Frameworks & Libraries',
    DATABASES: 'Databases',
    CLOUD_PLATFORMS: 'Cloud Platforms',
    DEVOPS_TOOLS: 'DevOps & Tools',
    SOFT_SKILLS: 'Soft Skills',
    DESIGN: 'Design & UX',
    DATA_SCIENCE: 'Data Science & ML',
    MOBILE: 'Mobile Development',
    WEB_TECHNOLOGIES: 'Web Technologies',
    SECURITY: 'Security',
    TESTING: 'Testing & QA',
};
// Learning resource types
exports.RESOURCE_TYPES = {
    COURSE: 'course',
    BOOK: 'book',
    VIDEO: 'video',
    ARTICLE: 'article',
    PROJECT: 'project',
    BOOTCAMP: 'bootcamp',
    WORKSHOP: 'workshop',
    MENTORSHIP: 'mentorship',
};
// Difficulty levels
exports.DIFFICULTY_LEVELS = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
};
// Cost categories
exports.COST_CATEGORIES = {
    FREE: 'free',
    PAID: 'paid',
    FREEMIUM: 'freemium',
};
// Priority levels
exports.PRIORITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
};
// Gap sizes
exports.GAP_SIZES = {
    NONE: 'none',
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
};
// Experience levels
exports.EXPERIENCE_LEVELS = {
    ENTRY: 'entry',
    MID: 'mid',
    SENIOR: 'senior',
    LEAD: 'lead',
};
// File upload constraints
exports.FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ],
    ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.txt'],
};
// AI model configurations
exports.AI_MODELS = {
    SKILL_EXTRACTION: 'gpt-4o-mini',
    GAP_ANALYSIS: 'gpt-4o-mini',
    LEARNING_PATH: 'gpt-4o-mini',
};
// Default skill levels for new users
exports.DEFAULT_SKILL_LEVEL = 'beginner';
// Time estimates (in weeks)
exports.TIME_ESTIMATES = {
    SMALL_GAP: 2,
    MEDIUM_GAP: 6,
    LARGE_GAP: 12,
    PROJECT_BASED_LEARNING: 4,
};
// Learning path recommendations
exports.LEARNING_RECOMMENDATIONS = {
    MAX_RESOURCES_PER_SKILL: 3,
    MAX_TIMELINE_WEEKS: 52, // 1 year
    MIN_RESOURCES_PER_PATH: 5,
};
//# sourceMappingURL=index.js.map