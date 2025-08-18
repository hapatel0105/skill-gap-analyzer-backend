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
//# sourceMappingURL=skills.d.ts.map