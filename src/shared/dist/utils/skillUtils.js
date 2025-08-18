"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_LEVELS = void 0;
exports.calculateSkillGap = calculateSkillGap;
exports.calculatePriority = calculatePriority;
exports.groupSkillsByCategory = groupSkillsByCategory;
exports.calculateOverallGap = calculateOverallGap;
exports.estimateTimeToClose = estimateTimeToClose;
exports.findNearLevelSkills = findNearLevelSkills;
exports.sortSkillsByPriority = sortSkillsByPriority;
// Skill level mapping for numerical comparison
exports.SKILL_LEVELS = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4,
};
// Calculate skill gap between current and required levels
function calculateSkillGap(currentLevel, requiredLevel) {
    const current = exports.SKILL_LEVELS[currentLevel];
    const required = exports.SKILL_LEVELS[requiredLevel];
    const difference = required - current;
    if (difference <= 0)
        return 'none';
    if (difference === 1)
        return 'small';
    if (difference === 2)
        return 'medium';
    return 'large';
}
// Determine priority based on gap size and skill importance
function calculatePriority(gap, isRequired = true) {
    if (gap === 'none')
        return 'low';
    if (isRequired) {
        if (gap === 'large')
            return 'high';
        if (gap === 'medium')
            return 'high';
        return 'medium';
    }
    else {
        if (gap === 'large')
            return 'medium';
        if (gap === 'medium')
            return 'medium';
        return 'low';
    }
}
// Group skills by category
function groupSkillsByCategory(skills) {
    return skills.reduce((acc, skill) => {
        if (!acc[skill.category]) {
            acc[skill.category] = [];
        }
        acc[skill.category].push(skill);
        return acc;
    }, {});
}
// Calculate overall skill gap assessment
function calculateOverallGap(skillGaps) {
    if (skillGaps.length === 0)
        return 'small';
    const gapScores = skillGaps.map(gap => {
        switch (gap.gap) {
            case 'none': return 0;
            case 'small': return 1;
            case 'medium': return 2;
            case 'large': return 3;
            default: return 0;
        }
    });
    const averageScore = gapScores.reduce((sum, score) => sum + score, 0) / gapScores.length;
    if (averageScore < 1)
        return 'small';
    if (averageScore < 2)
        return 'medium';
    return 'large';
}
// Estimate time to close skill gaps (in weeks)
function estimateTimeToClose(skillGaps) {
    const gapTimeEstimates = skillGaps.map(gap => {
        switch (gap.gap) {
            case 'none': return 0;
            case 'small': return 2; // 2 weeks
            case 'medium': return 6; // 6 weeks
            case 'large': return 12; // 12 weeks
            default: return 0;
        }
    });
    // Consider parallel learning (not all skills need to be learned sequentially)
    const maxTime = Math.max(...gapTimeEstimates);
    const averageTime = gapTimeEstimates.reduce((sum, time) => sum + time, 0) / gapTimeEstimates.length;
    // Weighted average favoring parallel learning
    return Math.ceil((maxTime * 0.6) + (averageTime * 0.4));
}
// Find skills that are close to the next level
function findNearLevelSkills(skills) {
    return skills.filter(skill => {
        const level = exports.SKILL_LEVELS[skill.level];
        return level < 4; // Not expert level
    });
}
// Sort skills by priority for learning
function sortSkillsByPriority(skillGaps) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return skillGaps.sort((a, b) => {
        // First sort by priority
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0)
            return priorityDiff;
        // Then by gap size
        const gapOrder = { large: 4, medium: 3, small: 2, none: 1 };
        return gapOrder[b.gap] - gapOrder[a.gap];
    });
}
//# sourceMappingURL=skillUtils.js.map