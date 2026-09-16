import { useState, useEffect, useMemo } from 'react';
import { GuidedProject } from '@/lib/network/guidedMode';
import { getQuizQuestionsForProject, SdnQuizQuestion } from '@/lib/network/sdnQuiz';
import { secureStorage } from '@/lib/storage/secureStorage';

export function useGuidedQuiz(project: GuidedProject | null) {
    const [usedShowMeStepIds, setUsedShowMeStepIds] = useState<Set<string>>(new Set());
    const [showSdnQuiz, setShowSdnQuiz] = useState(false);
    const [sdnQuizIndex, setSdnQuizIndex] = useState(0);
    const [sdnQuizScore, setSdnQuizScore] = useState(0);
    const [quizEarnedPoints, setQuizEarnedPoints] = useState(0);
    const [sdnQuizAnswered, setSdnQuizAnswered] = useState<string[]>([]);
    const [sdnQuizFeedback, setSdnQuizFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
    const [sdnShuffledChoices, setSdnShuffledChoices] = useState<Array<{ text: string; originalIndex: number }>>([]);

    const quizQuestions = useMemo<SdnQuizQuestion[]>(() => {
        return project ? getQuizQuestionsForProject(project.id) : getQuizQuestionsForProject();
    }, [project]);

    useEffect(() => {
        if (typeof window === 'undefined' || !project) return;
        const saved = secureStorage.getItem(`sdn_quiz_progress_${project.id}`);
        const savedPoints = secureStorage.getItem(`quiz_earned_points_${project.id}`);
        if (saved) {
            try {
                const progress = JSON.parse(saved) as { score?: number; answered?: string[] };
                setSdnQuizScore(progress.score || 0);
                setSdnQuizAnswered(progress.answered || []);
            } catch { /* Ignore */ }
        } else {
            setSdnQuizScore(0);
            setSdnQuizAnswered([]);
        }
        if (savedPoints) {
            setQuizEarnedPoints(Number(savedPoints) || 0);
        } else {
            setQuizEarnedPoints(0);
        }
        setSdnQuizIndex(0);
    }, [project]);

    useEffect(() => {
        if (typeof window !== 'undefined' && project) {
            secureStorage.setItem(`sdn_quiz_progress_${project.id}`, JSON.stringify({ score: sdnQuizScore, answered: sdnQuizAnswered }));
            secureStorage.setItem(`quiz_earned_points_${project.id}`, String(quizEarnedPoints));
        }
    }, [sdnQuizScore, sdnQuizAnswered, quizEarnedPoints, project]);

    return {
        usedShowMeStepIds,
        setUsedShowMeStepIds,
        showSdnQuiz,
        setShowSdnQuiz,
        sdnQuizIndex,
        setSdnQuizIndex,
        sdnQuizScore,
        setSdnQuizScore,
        quizEarnedPoints,
        setQuizEarnedPoints,
        sdnQuizAnswered,
        setSdnQuizAnswered,
        sdnQuizFeedback,
        setSdnQuizFeedback,
        sdnShuffledChoices,
        setSdnShuffledChoices,
        quizQuestions,
    };
}
