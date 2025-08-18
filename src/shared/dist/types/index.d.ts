export interface Skill {
    id: string;
    name: string;
    category: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsOfExperience?: number;
}
export interface SkillGap {
    skill: Skill;
    currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    requiredLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    gap: 'none' | 'small' | 'medium' | 'large';
    priority: 'low' | 'medium' | 'high';
}
export interface Resume {
    id: string;
    userId: string;
    fileName: string;
    fileUrl: string;
    extractedSkills: Skill[];
    uploadedAt: Date;
}
export interface JobDescription {
    id: string;
    title: string;
    company: string;
    description: string;
    requiredSkills: Skill[];
    preferredSkills: Skill[];
    createdAt: Date;
}
export interface LearningResource {
    id: string;
    title: string;
    type: 'course' | 'book' | 'video' | 'article' | 'project';
    url: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedHours: number;
    cost: 'free' | 'paid' | 'freemium';
}
export interface LearningPath {
    id: string;
    userId: string;
    skillGaps: SkillGap[];
    resources: LearningResource[];
    estimatedTimeline: number;
    priorityOrder: string[];
    createdAt: Date;
}
export interface User {
    id: string;
    email: string;
    name: string;
    jobRole?: string;
    targetRole?: string;
    experience: 'entry' | 'mid' | 'senior' | 'lead';
    createdAt: Date;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface SkillAnalysis {
    extractedSkills: Skill[];
    confidence: number;
    processingTime: number;
}
export interface GapAnalysisResult {
    skillGaps: SkillGap[];
    overallGap: 'small' | 'medium' | 'large';
    recommendedFocus: string[];
    estimatedTimeToClose: number;
}
//# sourceMappingURL=index.d.ts.map