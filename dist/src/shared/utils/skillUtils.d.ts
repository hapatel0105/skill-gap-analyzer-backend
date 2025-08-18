import { Skill, SkillGap } from '../types';
export declare const SKILL_LEVELS: {
    readonly beginner: 1;
    readonly intermediate: 2;
    readonly advanced: 3;
    readonly expert: 4;
};
export declare function calculateSkillGap(currentLevel: Skill['level'], requiredLevel: Skill['level']): 'none' | 'small' | 'medium' | 'large';
export declare function calculatePriority(gap: 'none' | 'small' | 'medium' | 'large', isRequired?: boolean): 'low' | 'medium' | 'high';
export declare function groupSkillsByCategory(skills: Skill[]): Record<string, Skill[]>;
export declare function calculateOverallGap(skillGaps: SkillGap[]): 'small' | 'medium' | 'large';
export declare function estimateTimeToClose(skillGaps: SkillGap[]): number;
export declare function findNearLevelSkills(skills: Skill[]): Skill[];
export declare function sortSkillsByPriority(skillGaps: SkillGap[]): SkillGap[];
export declare const getSkillLevelColor: (level: Skill["level"]) => "bg-green-200 text-green-800" | "bg-yellow-200 text-yellow-800" | "bg-blue-200 text-blue-800" | "bg-purple-200 text-purple-800" | "bg-gray-200 text-gray-800";
//# sourceMappingURL=skillUtils.d.ts.map