import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { answerSdnQuiz, SdnQuizQuestion } from '@/lib/network/sdnQuiz';
import { toast } from '@/hooks/use-toast';

export interface QuizModalProps {
    showSdnQuiz: boolean;
    setShowSdnQuiz: (val: boolean) => void;
    sdnQuestion: SdnQuizQuestion | undefined;
    sdnQuizIndex: number;
    setSdnQuizIndex: React.Dispatch<React.SetStateAction<number>>;
    quizQuestions: SdnQuizQuestion[];
    sdnQuizScore: number;
    setSdnQuizScore: React.Dispatch<React.SetStateAction<number>>;
    quizEarnedPoints: number;
    setQuizEarnedPoints: React.Dispatch<React.SetStateAction<number>>;
    sdnQuizAnswered: string[];
    setSdnQuizAnswered: React.Dispatch<React.SetStateAction<string[]>>;
    sdnQuizFeedback: { correct: boolean; explanation: string } | null;
    setSdnQuizFeedback: (val: { correct: boolean; explanation: string } | null) => void;
    sdnShuffledChoices: Array<{ text: string; originalIndex: number }>;
    projectId?: string;
    language: 'tr' | 'en';
    t: Record<string, string>;
}

export function QuizModal({
    showSdnQuiz,
    setShowSdnQuiz,
    sdnQuestion,
    sdnQuizIndex,
    setSdnQuizIndex,
    quizQuestions,
    sdnQuizScore,
    setSdnQuizScore,
    quizEarnedPoints,
    setQuizEarnedPoints,
    sdnQuizAnswered,
    setSdnQuizAnswered,
    sdnQuizFeedback,
    setSdnQuizFeedback,
    sdnShuffledChoices,
    projectId,
    language,
    t
}: QuizModalProps) {
    if (!showSdnQuiz || !sdnQuestion) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="sdn-quiz-title">
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-primary-300 bg-white shadow-2xl dark:border-primary-700 dark:bg-secondary-900">
                <div className="flex items-center justify-between border-b border-secondary-200 p-4 dark:border-secondary-700">
                    <div>
                        <h2 id="sdn-quiz-title" className="font-bold text-secondary-900 dark:text-secondary-100">🎓 {language === 'tr' ? 'Bilgi Quiz’i' : 'Knowledge Quiz'}</h2>
                        <p className="text-xs text-secondary-500">{language === 'tr' ? 'Ders Konu Soruları' : 'Lesson Topic Questions'}</p>
                    </div>
                    <button onClick={() => setShowSdnQuiz(false)} className="rounded p-1 hover:bg-secondary-100 dark:hover:bg-secondary-800" aria-label={language === 'tr' ? 'Quiz’i kapat' : 'Close quiz'}><X className="h-5 w-5" /></button>
                </div>
                <div className="overflow-y-auto overscroll-contain p-5 scrollbar-thin scrollbar-thumb-secondary-400 dark:scrollbar-thumb-secondary-600">
                    <div className="flex justify-between text-[10px] text-secondary-500">
                        <span>{sdnQuizIndex + 1}/{quizQuestions.length}</span>
                        <span>{language === 'tr' ? 'Doğru' : 'Score'}: {sdnQuizScore}/{quizQuestions.length} (+{quizEarnedPoints} {t.pts})</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-secondary-800 dark:text-secondary-200">
                        {typeof sdnQuestion.question === 'object' ? (sdnQuestion.question[language === 'tr' ? 'tr' : 'en'] || sdnQuestion.question.tr) : sdnQuestion.question}
                    </p>
                    <div className="mt-3 space-y-2">
                        {sdnShuffledChoices.map(({ text: choice, originalIndex }) => (
                            <button
                                key={choice}
                                disabled={sdnQuizFeedback !== null}
                                onClick={() => {
                                    const result = answerSdnQuiz(sdnQuestion.id, originalIndex, projectId, language);
                                    if (!sdnQuizAnswered.includes(sdnQuestion.id)) {
                                        setSdnQuizAnswered(answered => [...answered, sdnQuestion.id]);
                                        if (result.correct) {
                                            setSdnQuizScore(score => score + 1);
                                            const pts = result.points || 10;
                                            setQuizEarnedPoints(prev => prev + pts);
                                            toast({
                                                title: language === 'tr' ? `+${pts} Puan Kazanıldı!` : `+${pts} Points Earned!`,
                                                description: language === 'tr' ? 'Quiz sorusu doğru cevaplandı!' : 'Quiz question answered correctly!'
                                            });
                                        }
                                    }
                                    setSdnQuizFeedback(result);
                                }}
                                className="w-full whitespace-normal break-words rounded border border-secondary-200 dark:border-secondary-700 px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30 disabled:opacity-70"
                            >{choice}</button>
                        ))}
                    </div>
                    {sdnQuizFeedback && (
                        <div className={cn('mt-3 rounded p-2 text-[11px]', sdnQuizFeedback.correct ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300' : 'bg-error-50 text-error-700 dark:bg-error-900/30 dark:text-error-300')}>
                            <p className="font-bold">{sdnQuizFeedback.correct ? (language === 'tr' ? 'Doğru!' : 'Correct!') : (language === 'tr' ? 'Yanlış' : 'Incorrect')}</p>
                            <p>{sdnQuizFeedback.explanation}</p>
                            <button onClick={() => {
                                setSdnQuizFeedback(null);
                                setSdnQuizIndex(index => (index + 1) % quizQuestions.length);
                            }} className="mt-1 font-bold underline">
                                {language === 'tr' ? 'Sonraki soru' : 'Next question'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
