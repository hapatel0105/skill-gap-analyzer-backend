export const SKILL_CATEGORIES = {
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
} as const;

export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const GAP_SIZES = {
  NONE: 'none',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export const EXPERIENCE_LEVELS = {
  ENTRY: 'entry',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
} as const;

export const DEFAULT_SKILL_LEVEL = 'beginner' as const;