'use client';

import React, { useMemo } from 'react';
import type { Achievement, StudentProgress } from '@/types/ui-ux';
import { ACHIEVEMENT_CATEGORIES } from '@/constants/ui-ux';
import {
    calculateLevel,
    getXPProgress,
    getAchievementsByCategory,
    getAchievementCompletionPercentage,
    formatXP,
    getStreakStatus,
} from '@/utils/achievement';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Badge } from './badge';
import { Icon } from './icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

export interface AchievementPanelProps {
    progress: StudentProgress;
    className?: string;
}

/**
 * Achievement Panel Component
 * Displays student progress, achievements, and gamification elements
 */
export function AchievementPanel({ progress, className = '' }: AchievementPanelProps) {
    const currentLevel = calculateLevel(progress.totalXP);
    const xpProgress = getXPProgress(progress.totalXP, currentLevel);
    const completionPercentage = getAchievementCompletionPercentage(progress);
    const streakStatus = getStreakStatus(progress);

    // Group achievements by category
    const achievementsByCategory = useMemo(() => {
        const grouped: Record<string, Achievement[]> = {};
        Object.keys(ACHIEVEMENT_CATEGORIES).forEach((category) => {
            grouped[category] = getAchievementsByCategory(progress, category);
        });
        return grouped;
    }, [progress]);

    const progressPercentage = (xpProgress.current / xpProgress.needed) * 100;

    return (
        <Card className={`w-full ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Achievements & Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Level and XP Overview */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold text-blue-600">Level {currentLevel}</div>
                            <div className="text-sm text-gray-600">Total XP: {formatXP(progress.totalXP)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-semibold text-gray-700">Tasks Completed</div>
                            <div className="text-2xl font-bold text-green-600">{progress.tasksCompleted}</div>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>Progress to Level {currentLevel + 1}</span>
                            <span>
                                {formatXP(xpProgress.current)} / {formatXP(xpProgress.needed)}
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                    </div>

                    {/* Streak Status */}
                    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                        <Icon name="zap" size={16} className="text-orange-600" />
                        <span className="text-sm font-semibold text-orange-700">{streakStatus}</span>
                    </div>
                </div>

                {/* Overall Completion */}
                <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">Overall Completion</span>
                        <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-2" />
                </div>

                {/* Achievements by Category */}
                <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-4">Achievements</h3>

                    <Tabs defaultValue="network-basics" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                            {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, category]) => (
                                <TabsTrigger key={key} value={key} className="text-xs">
                                    <Icon name={category.icon} size={14} className="mr-1" />
                                    <span className="hidden sm:inline">{category.name}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {Object.entries(achievementsByCategory).map(([category, achievements]) => (
                            <TabsContent key={category} value={category} className="space-y-3 mt-4">
                                {achievements.length > 0 ? (
                                    achievements.map((achievement) => (
                                        <div
                                            key={achievement.id}
                                            className={`p-3 rounded-lg border-2 transition-all ${achievement.isUnlocked
                                                ? 'bg-blue-50 border-blue-300'
                                                : 'bg-gray-50 border-gray-200 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="text-2xl">{achievement.icon}</div>
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm">{achievement.name}</div>
                                                    <div className="text-xs text-gray-600">{achievement.description}</div>
                                                    {achievement.isUnlocked && achievement.unlockedAt && (
                                                        <div className="text-xs text-blue-600 mt-1">
                                                            Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={achievement.isUnlocked ? 'default' : 'secondary'}>
                                                        +{achievement.reward.xp} XP
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <div className="text-sm">No achievements in this category yet</div>
                                        <div className="text-xs text-gray-400">Keep learning to unlock achievements!</div>
                                    </div>
                                )}
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>

                {/* Leaderboard Placeholder */}
                <div className="border-t pt-4">
                    <h3 className="font-semibold text-sm mb-3">Personal Best</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Highest Level</span>
                            <span className="font-semibold">{currentLevel}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total XP</span>
                            <span className="font-semibold">{formatXP(progress.totalXP)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tasks Completed</span>
                            <span className="font-semibold">{progress.tasksCompleted}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
