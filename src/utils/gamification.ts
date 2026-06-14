/**
 * Gamification System
 * Streak tracking, challenges, leaderboard, and feedback messages
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 */

// ============================================================================
// Types
// ============================================================================

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
    streakBroken: boolean;
    daysActive: number;
}

export interface Challenge {
    id: string;
    name: string;
    description: string;
    type: 'speed' | 'accuracy' | 'creativity' | 'troubleshooting';
    difficulty: 'easy' | 'medium' | 'hard';
    timeLimit?: number; // in seconds
    requirements: ChallengeRequirement[];
    reward: {
        xp: number;
        badge?: string;
    };
    completed: boolean;
    completedAt?: Date;
    bestTime?: number;
}

export interface ChallengeRequirement {
    type: 'devices' | 'connections' | 'pings' | 'time' | 'accuracy';
    value: number;
    operator: '>=' | '=' | '<=';
}

export interface LeaderboardEntry {
    studentId: string;
    name: string;
    level: number;
    totalXP: number;
    achievements: number;
    tasksCompleted: number;
    streakDays: number;
    rank?: number;
}

export interface PersonalBest {
    category: string;
    metric: string;
    value: number;
    unit: string;
    achievedAt: Date;
    previousBest?: number;
    improved: boolean;
}

export interface FeedbackMessage {
    type: 'success' | 'info' | 'warning' | 'encouragement' | 'achievement';
    title: string;
    message: string;
    action?: string;
}

// ============================================================================
// Streak Tracking
// ============================================================================

const STREAK_STORAGE_KEY = 'netsim_streak_data';

export function getStreakData(studentId: string): StreakData {
    try {
        const stored = localStorage.getItem(`${STREAK_STORAGE_KEY}_${studentId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...parsed,
                lastActivityDate: new Date(parsed.lastActivityDate),
            };
        }
    } catch {
        // Ignore parsing errors
    }

    return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: new Date(0),
        streakBroken: false,
        daysActive: 0,
    };
}

export function saveStreakData(studentId: string, data: StreakData): void {
    try {
        localStorage.setItem(`${STREAK_STORAGE_KEY}_${studentId}`, JSON.stringify(data));
    } catch {
        // Ignore storage errors
    }
}

export function updateStreak(studentId: string): StreakData {
    const data = getStreakData(studentId);
    const now = new Date();
    const lastActivity = new Date(data.lastActivityDate);

    // Reset to midnight for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());

    const daysSinceLastActivity = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastActivity === 0) {
        // Already active today, no change
        return data;
    } else if (daysSinceLastActivity === 1) {
        // Consecutive day, streak continues
        data.currentStreak += 1;
        data.daysActive += 1;
        data.streakBroken = false;

        if (data.currentStreak > data.longestStreak) {
            data.longestStreak = data.currentStreak;
        }
    } else {
        // Streak broken
        if (data.currentStreak > 0) {
            data.streakBroken = true;
        }
        data.currentStreak = 1;
        data.daysActive += 1;
    }

    data.lastActivityDate = now;
    saveStreakData(studentId, data);

    return data;
}

export function checkStreakMilestone(streakDays: number): string | null {
    const milestones: Record<number, string> = {
        1: '🎯 First day! Great start!',
        3: '🔥 3-day streak! Keep it up!',
        7: '⚡ Week streak! You\'re on fire!',
        14: '🌟 Two weeks! Amazing dedication!',
        21: '💪 Three weeks! Almost there!',
        30: '🏆 Month streak! Legendary!',
        60: '👑 Two months! Unstoppable!',
        90: '🌟 Three months! Master learner!',
        180: '🎖️ Six months! Epic commitment!',
        365: '🏅 Year streak! You\'re a hero!',
    };

    return milestones[streakDays] || null;
}

// ============================================================================
// Challenge System
// ============================================================================

export const PREDEFINED_CHALLENGES: Challenge[] = [
    {
        id: 'speed-builder-1',
        name: 'Quick Builder I',
        description: 'Build a network with 3 devices in under 2 minutes',
        type: 'speed',
        difficulty: 'easy',
        timeLimit: 120,
        requirements: [
            { type: 'devices', value: 3, operator: '>=' },
            { type: 'connections', value: 2, operator: '>=' },
        ],
        reward: { xp: 100, badge: 'speed-demon' },
        completed: false,
    },
    {
        id: 'speed-builder-2',
        name: 'Quick Builder II',
        description: 'Build a network with 5 devices in under 3 minutes',
        type: 'speed',
        difficulty: 'medium',
        timeLimit: 180,
        requirements: [
            { type: 'devices', value: 5, operator: '>=' },
            { type: 'connections', value: 4, operator: '>=' },
        ],
        reward: { xp: 200, badge: 'turbo-networker' },
        completed: false,
    },
    {
        id: 'speed-builder-3',
        name: 'Speed Master',
        description: 'Build a network with 10 devices in under 5 minutes',
        type: 'speed',
        difficulty: 'hard',
        timeLimit: 300,
        requirements: [
            { type: 'devices', value: 10, operator: '>=' },
            { type: 'connections', value: 8, operator: '>=' },
        ],
        reward: { xp: 500, badge: 'lightning-fast' },
        completed: false,
    },
    {
        id: 'perfect-ping',
        name: 'Perfect Ping',
        description: 'Send 5 successful pings without any failures',
        type: 'accuracy',
        difficulty: 'easy',
        requirements: [
            { type: 'pings', value: 5, operator: '>=' },
            { type: 'accuracy', value: 100, operator: '=' },
        ],
        reward: { xp: 150 },
        completed: false,
    },
    {
        id: 'network-architect',
        name: 'Network Architect',
        description: 'Create a network with routers, switches, and PCs',
        type: 'creativity',
        difficulty: 'medium',
        requirements: [
            { type: 'devices', value: 6, operator: '>=' },
        ],
        reward: { xp: 250, badge: 'network-architect' },
        completed: false,
    },
    {
        id: 'troubleshooting-pro',
        name: 'Troubleshooting Pro',
        description: 'Fix 3 broken connections',
        type: 'troubleshooting',
        difficulty: 'medium',
        requirements: [
            { type: 'connections', value: 3, operator: '>=' },
        ],
        reward: { xp: 200, badge: 'fixer' },
        completed: false,
    },
    {
        id: 'connection-master',
        name: 'Connection Master',
        description: 'Create 15 connections in a single session',
        type: 'creativity',
        difficulty: 'hard',
        requirements: [
            { type: 'connections', value: 15, operator: '>=' },
        ],
        reward: { xp: 300, badge: 'connectivity-king' },
        completed: false,
    },
];

export function checkChallengeCompletion(
    challenge: Challenge,
    stats: { devices: number; connections: number; pings: number; successfulPings: number; time: number }
): boolean {
    if (challenge.completed) return false;

    // Check time limit
    if (challenge.timeLimit && stats.time > challenge.timeLimit) {
        return false;
    }

    // Check all requirements
    return challenge.requirements.every(req => {
        let value: number;

        switch (req.type) {
            case 'devices':
                value = stats.devices;
                break;
            case 'connections':
                value = stats.connections;
                break;
            case 'pings':
                value = stats.pings;
                break;
            case 'accuracy':
                value = stats.pings > 0 ? (stats.successfulPings / stats.pings) * 100 : 0;
                break;
            default:
                return false;
        }

        switch (req.operator) {
            case '>=':
                return value >= req.value;
            case '=':
                return value === req.value;
            case '<=':
                return value <= req.value;
            default:
                return false;
        }
    });
}

export function completeChallenge(challenge: Challenge, time: number): Challenge {
    return {
        ...challenge,
        completed: true,
        completedAt: new Date(),
        bestTime: challenge.bestTime ? Math.min(challenge.bestTime, time) : time,
    };
}

export function getChallengeStatus(challenges: Challenge[]): {
    total: number;
    completed: number;
    easy: { total: number; completed: number };
    medium: { total: number; completed: number };
    hard: { total: number; completed: number };
} {
    const byDifficulty = (diff: 'easy' | 'medium' | 'hard') => ({
        total: challenges.filter(c => c.difficulty === diff).length,
        completed: challenges.filter(c => c.difficulty === diff && c.completed).length,
    });

    return {
        total: challenges.length,
        completed: challenges.filter(c => c.completed).length,
        easy: byDifficulty('easy'),
        medium: byDifficulty('medium'),
        hard: byDifficulty('hard'),
    };
}

// ============================================================================
// Leaderboard
// ============================================================================

const LEADERBOARD_STORAGE_KEY = 'netsim_leaderboard';

export function getLeaderboard(): LeaderboardEntry[] {
    try {
        const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parsing errors
    }
    return [];
}

export function saveLeaderboard(entry: LeaderboardEntry): void {
    const leaderboard = getLeaderboard();

    // Update or add entry
    const existingIndex = leaderboard.findIndex(e => e.studentId === entry.studentId);
    if (existingIndex >= 0) {
        leaderboard[existingIndex] = { ...entry, rank: leaderboard[existingIndex].rank };
    } else {
        leaderboard.push(entry);
    }

    // Sort by XP (descending)
    leaderboard.sort((a, b) => b.totalXP - a.totalXP);

    // Assign ranks
    leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
    });

    try {
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(leaderboard.slice(0, 100))); // Keep top 100
    } catch {
        // Ignore storage errors
    }
}

export function getLeaderboardTop(limit = 10): LeaderboardEntry[] {
    return getLeaderboard().slice(0, limit);
}

export function getStudentRank(studentId: string): number | null {
    const leaderboard = getLeaderboard();
    const entry = leaderboard.find(e => e.studentId === studentId);
    return entry?.rank || null;
}

// ============================================================================
// Personal Best Tracking
// ============================================================================

const PERSONAL_BEST_STORAGE_KEY = 'netsim_personal_bests';

export function getPersonalBests(studentId: string): PersonalBest[] {
    try {
        const stored = localStorage.getItem(`${PERSONAL_BEST_STORAGE_KEY}_${studentId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.map((pb: any) => ({
                ...pb,
                achievedAt: new Date(pb.achievedAt),
            }));
        }
    } catch {
        // Ignore parsing errors
    }
    return [];
}

export function savePersonalBest(studentId: string, best: PersonalBest): PersonalBest | null {
    const bests = getPersonalBests(studentId);

    const existingIndex = bests.findIndex(b => b.category === best.category && b.metric === best.metric);

    if (existingIndex >= 0) {
        const existing = bests[existingIndex];

        // Determine if this is better based on metric type
        const isBetter = best.value > existing.value;

        if (isBetter) {
            const newBest: PersonalBest = {
                ...best,
                previousBest: existing.value,
                improved: true,
            };
            bests[existingIndex] = newBest;

            try {
                localStorage.setItem(`${PERSONAL_BEST_STORAGE_KEY}_${studentId}`, JSON.stringify(bests));
            } catch {
                // Ignore storage errors
            }

            return newBest;
        }

        return null;
    } else {
        bests.push({ ...best, improved: true });

        try {
            localStorage.setItem(`${PERSONAL_BEST_STORAGE_KEY}_${studentId}`, JSON.stringify(bests));
        } catch {
            // Ignore storage errors
        }

        return best;
    }
}

// ============================================================================
// Feedback Messages
// ============================================================================

export const ENCOURAGING_MESSAGES: Record<string, string[]> = {
    onLogin: [
        'Welcome back! Ready to build some networks? 🚀',
        'Great to see you again! Let\'s learn something new! 📚',
        'Your network simulator awaits! What will you create today? 🎨',
    ],
    onFirstDevice: [
        'First device added! You\'re on your way! 👶',
        'Great start! Now add more devices to build your network! 🔌',
        'First step to becoming a network expert! 🎓',
    ],
    onFirstConnection: [
        'Connected! Your network is coming to life! 🔗',
        'First connection made! Keep connecting devices! 🌐',
        'Excellent! Your devices can now communicate! 📡',
    ],
    onFirstPing: [
        'Ping successful! Your network is working! ✨',
        'Great job! The connection is alive! 💪',
        'Ping received! You\'re a networking pro! 🏆',
    ],
    onLevelUp: [
        'Level up! You\'re getting stronger! 💪',
        'Congratulations on your new level! Keep going! 🌟',
        'Amazing progress! You\'re leveling up fast! ⚡',
    ],
    onStreak: [
        'Streak bonus! Consistency is key! 🔥',
        'Keep that streak going! You\'re building great habits! 📈',
        'Daily learner! Your dedication is inspiring! 🌟',
    ],
    onChallengeComplete: [
        'Challenge completed! You crushed it! 🎯',
        'Well done! That was a tough challenge! 🏆',
        'Challenge conquered! You\'re unstoppable! 💪',
    ],
    onError: [
        'Don\'t worry, mistakes help us learn! Try again! 💪',
        'That didn\'t work, but you\'re getting closer! Keep trying! 🔧',
        'Learning from errors makes you better! Let\'s fix this! 🛠️',
    ],
    onBreak: [
        'Great work so far! Take a break if you need it! ☕',
        'You\'ve been learning a lot! Stay refreshed! 🥤',
        'Keep up the awesome work! Remember to rest! 😊',
    ],
};

export function getRandomMessage(context: keyof typeof ENCOURAGING_MESSAGES): string {
    const messages = ENCOURAGING_MESSAGES[context];
    if (!messages || messages.length === 0) {
        return 'Keep up the great work! 🌟';
    }
    return messages[Math.floor(Math.random() * messages.length)];
}

export function createFeedbackMessage(
    type: FeedbackMessage['type'],
    context: string,
    data?: Record<string, any>
): FeedbackMessage {
    const messages: Record<FeedbackMessage['type'], { title: string; message: string }> = {
        success: {
            title: '🎉 Success!',
            message: getRandomMessage(context as keyof typeof ENCOURAGING_MESSAGES),
        },
        info: {
            title: '💡 Did you know?',
            message: getRandomMessage('onLogin'),
        },
        warning: {
            title: '⚠️ Heads up',
            message: 'Check your configuration before continuing.',
        },
        encouragement: {
            title: '🌟 Keep going!',
            message: getRandomMessage(context as keyof typeof ENCOURAGING_MESSAGES),
        },
        achievement: {
            title: '🏆 Achievement Unlocked!',
            message: `Congratulations! You've unlocked: ${data?.name || 'New Achievement'}`,
        },
    };

    return {
        type,
        ...messages[type],
        action: data?.action,
    };
}

// ============================================================================
// Gamification Utilities
// ============================================================================

export function calculateCompletionPercentage(
    completed: number,
    total: number
): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
}

export function getDifficultyColor(difficulty: 'easy' | 'medium' | 'hard'): string {
    const colors = {
        easy: 'text-green-600 bg-green-100',
        medium: 'text-yellow-600 bg-yellow-100',
        hard: 'text-red-600 bg-red-100',
    };
    return colors[difficulty];
}

export function formatTime(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

export function getRankLabel(rank: number): string {
    if (rank === 1) return '🥇 1st';
    if (rank === 2) return '🥈 2nd';
    if (rank === 3) return '🥉 3rd';
    return `${rank}th`;
}
