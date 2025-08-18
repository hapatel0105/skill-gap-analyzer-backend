"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_RECOMMENDATIONS = exports.COST_CATEGORIES = exports.DIFFICULTY_LEVELS = exports.RESOURCE_TYPES = void 0;
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
exports.DIFFICULTY_LEVELS = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
};
exports.COST_CATEGORIES = {
    FREE: 'free',
    PAID: 'paid',
    FREEMIUM: 'freemium',
};
exports.LEARNING_RECOMMENDATIONS = {
    MAX_RESOURCES_PER_SKILL: 3,
    MAX_TIMELINE_WEEKS: 52, // 1 year
    MIN_RESOURCES_PER_PATH: 5,
};
//# sourceMappingURL=learning.js.map