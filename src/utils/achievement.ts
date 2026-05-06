/**
 * Achievement System Utilities
 * Handles achievement tracking, XP calculation, and level progression
 */

import type { Achievement, StudentProgress } from '@/types/ui-ux';
import { XP_THRESHOLDS, XP_REWARDS, ACHIEVEMENT_CATEGORIES } from '@/constants/ui-ux';

const STORAGE_KEY = 'netsim_student_progress';

/**
 * Get current student progress from storage
 */
export function getStudentProgress(studentId: string): StudentProgress {
    try {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${studentId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...parsed,
                lastActivityDate: new Date(parsed.lastActivityDate),
                createdAt: new Date(parsed.createdAt),
                achievements: parsed.achievements.map((a: any) => ({
                    ...a,
                    unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
                })),
            };
        }
    } catch {
        // Ignore parsing errors
    }

    // Return default progress
    return {
        studentId,
        level: 1,
        totalXP: 0,
        achievements: [],
        tasksCompleted: 0,
        streakDays: 0,
        lastActivityDate: new Date(),
        createdAt: new Date(),
    };
}

/**
 * Save student progress to storage
 */
export function saveStudentProgress(progress: StudentProgress): void {
    try {
        localStorage.setItem(`${STORAGE_KEY}_${progress.studentId}`, JSON.stringify(progress));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXP: number): number {
    for (let level = 10; level >= 1; level--) {
        if (totalXP >= XP_THRESHOLDS[level as keyof typeof XP_THRESHOLDS]) {
            return level;
        }
    }
    return 1;
}

/**
 * Get XP needed for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
    const nextLevel = Math.min(currentLevel + 1, 10);
    return XP_THRESHOLDS[nextLevel as keyof typeof XP_THRESHOLDS];
}

/**
 * Get current XP progress towards next level
 */
export function getXPProgress(totalXP: number, currentLevel: number): { current: number; needed: number } {
    const currentLevelXP = XP_THRESHOLDS[currentLevel as keyof typeof XP_THRESHOLDS];
    const nextLevelXP = getXPForNextLevel(currentLevel);
    const currentProgress = totalXP - currentLevelXP;
    const neededProgress = nextLevelXP - currentLevelXP;

    return {
        current: Math.max(0, currentProgress),
        needed: neededProgress,
    };
}

/**
 * Award XP for task completion
 */
export function awardTaskXP(progress: StudentProgress): StudentProgress {
    const newProgress = { ...progress };
    newProgress.totalXP += XP_REWARDS.taskCompletion;
    newProgress.tasksCompleted += 1;
    newProgress.lastActivityDate = new Date();

    const newLevel = calculateLevel(newProgress.totalXP);
    if (newLevel > progress.level) {
        newProgress.level = newLevel;
    }

    return newProgress;
}

/**
 * Award XP for achievement unlock
 */
export function awardAchievementXP(progress: StudentProgress): StudentProgress {
    const newProgress = { ...progress };
    newProgress.totalXP += XP_REWARDS.achievementUnlock;

    const newLevel = calculateLevel(newProgress.totalXP);
    if (newLevel > progress.level) {
        newProgress.level = newLevel;
    }

    return newProgress;
}

/**
 * Award streak bonus XP
 */
export function awardStreakBonus(progress: StudentProgress): StudentProgress {
    const newProgress = { ...progress };
    newProgress.totalXP += XP_REWARDS.streakBonus;
    newProgress.streakDays += 1;

    const newLevel = calculateLevel(newProgress.totalXP);
    if (newLevel > progress.level) {
        newProgress.level = newLevel;
    }

    return newProgress;
}

/**
 * Award XP for challenge completion
 */
export function awardChallengeXP(progress: StudentProgress): StudentProgress {
    const newProgress = { ...progress };
    newProgress.totalXP += XP_REWARDS.challengeCompletion;

    const newLevel = calculateLevel(newProgress.totalXP);
    if (newLevel > progress.level) {
        newProgress.level = newLevel;
    }

    return newProgress;
}

/**
 * Unlock an achievement
 */
export function unlockAchievement(progress: StudentProgress, achievement: Achievement): StudentProgress {
    const newProgress = { ...progress };

    // Check if already unlocked
    if (newProgress.achievements.some((a) => a.id === achievement.id && a.isUnlocked)) {
        return newProgress;
    }

    // Add or update achievement
    const existingIndex = newProgress.achievements.findIndex((a) => a.id === achievement.id);
    const unlockedAchievement = {
        ...achievement,
        isUnlocked: true,
        unlockedAt: new Date(),
    };

    if (existingIndex >= 0) {
        newProgress.achievements[existingIndex] = unlockedAchievement;
    } else {
        newProgress.achievements.push(unlockedAchievement);
    }

    // Award XP for achievement
    return awardAchievementXP(newProgress);
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(
    progress: StudentProgress,
    category: string
): Achievement[] {
    return progress.achievements.filter((a) => a.category === category);
}

/**
 * Get achievement completion percentage
 */
export function getAchievementCompletionPercentage(progress: StudentProgress): number {
    if (progress.achievements.length === 0) return 0;
    const unlockedCount = progress.achievements.filter((a) => a.isUnlocked).length;
    return Math.round((unlockedCount / progress.achievements.length) * 100);
}

/**
 * Check if student leveled up
 */
export function checkLevelUp(oldProgress: StudentProgress, newProgress: StudentProgress): boolean {
    return newProgress.level > oldProgress.level;
}

/**
 * Get level up message
 */
export function getLevelUpMessage(level: number): string {
    const messages: Record<number, string> = {
        1: 'Welcome to the Network Simulator!',
        2: 'Great start! You\'re learning fast.',
        3: 'You\'re becoming a network expert!',
        4: 'Impressive progress!',
        5: 'Halfway to mastery!',
        6: 'You\'re a network pro!',
        7: 'Exceptional skills!',
        8: 'You\'re a networking master!',
        9: 'Outstanding achievement!',
        10: 'You\'ve reached the highest level! 🎉',
    };

    return messages[level] || 'Level Up!';
}

/**
 * Format XP for display
 */
export function formatXP(xp: number): string {
    if (xp >= 1000) {
        return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
}

/**
 * Get streak status
 */
export function getStreakStatus(progress: StudentProgress): string {
    if (progress.streakDays === 0) {
        return 'No active streak';
    }
    if (progress.streakDays === 1) {
        return '1 day streak';
    }
    return `${progress.streakDays} day streak`;
}

/**
 * Reset streak if inactive for more than 24 hours
 */
export function updateStreakIfNeeded(progress: StudentProgress): StudentProgress {
    const now = new Date();
    const lastActivity = new Date(progress.lastActivityDate);
    const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastActivity > 24 && progress.streakDays > 0) {
        return {
            ...progress,
            streakDays: 0,
        };
    }

    return progress;
}
