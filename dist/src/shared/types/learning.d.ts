import { SkillGap } from './skills';
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
//# sourceMappingURL=learning.d.ts.map