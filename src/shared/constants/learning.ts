export const RESOURCE_TYPES = {
  COURSE: 'course',
  BOOK: 'book',
  VIDEO: 'video',
  ARTICLE: 'article',
  PROJECT: 'project',
  BOOTCAMP: 'bootcamp',
  WORKSHOP: 'workshop',
  MENTORSHIP: 'mentorship',
} as const;

export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const COST_CATEGORIES = {
  FREE: 'free',
  PAID: 'paid',
  FREEMIUM: 'freemium',
} as const;

export const LEARNING_RECOMMENDATIONS = {
  MAX_RESOURCES_PER_SKILL: 3,
  MAX_TIMELINE_WEEKS: 52, // 1 year
  MIN_RESOURCES_PER_PATH: 5,
} as const;