import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [quizSeed, setQuizSeed] = useState(0);

  // Raw questions for project/lesson
  const rawQuestions = useMemo<SdnQuizQuestion[]>(() => {
    return project ? getQuizQuestionsForProject(project.id) : getQuizQuestionsForProject();
  }, [project]);

  // Shuffled question pool
  const quizQuestions = useMemo<SdnQuizQuestion[]>(() => {
    const list = [...rawQuestions];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [rawQuestions, quizSeed]);

  // Eklenmiş puan olan (doğru cevaplanmış) sorular tekrar sorulmaz
  const availableQuestions = useMemo<SdnQuizQuestion[]>(() => {
    const answeredSet = new Set(sdnQuizAnswered);
    return quizQuestions.filter(q => !answeredSet.has(q.id));
  }, [quizQuestions, sdnQuizAnswered]);

  // Aktif soru
  const currentQuizQuestion = useMemo<SdnQuizQuestion | undefined>(() => {
    if (availableQuestions.length === 0) return undefined;
    const safeIdx = Math.abs(sdnQuizIndex) % availableQuestions.length;
    return availableQuestions[safeIdx];
  }, [availableQuestions, sdnQuizIndex]);

  // Zor ise / atla sonraki soruya geç
  const handleSkipOrNextQuestion = useCallback(() => {
    setSdnQuizFeedback(null);
    if (availableQuestions.length > 1) {
      setSdnQuizIndex(prev => (prev + 1) % availableQuestions.length);
    } else {
      setSdnQuizIndex(0);
    }
  }, [availableQuestions.length]);

  // Tüm sorular tamamlandığında veya pratik için sıfırlama
  const handleResetQuiz = useCallback(() => {
    setSdnQuizAnswered([]);
    setSdnQuizScore(0);
    setSdnQuizFeedback(null);
    setSdnQuizIndex(0);
    setQuizSeed(prev => prev + 1);
    if (typeof window !== 'undefined' && project) {
      secureStorage.removeItem(`sdn_quiz_progress_${project.id}`);
    }
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
    setSdnQuizFeedback(null);
    setQuizSeed(prev => prev + 1);
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
    availableQuestions,
    currentQuizQuestion,
    handleSkipOrNextQuestion,
    handleResetQuiz,
  };
}
