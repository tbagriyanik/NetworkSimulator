import React from 'react';
import { X, Award, RotateCcw, ArrowRight, SkipForward, CheckCircle2, HelpCircle } from 'lucide-react';
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
    availableQuestions?: SdnQuizQuestion[];
    sdnQuizScore: number;
    setSdnQuizScore: React.Dispatch<React.SetStateAction<number>>;
    quizEarnedPoints: number;
    setQuizEarnedPoints: React.Dispatch<React.SetStateAction<number>>;
    sdnQuizAnswered: string[];
    setSdnQuizAnswered: React.Dispatch<React.SetStateAction<string[]>>;
    sdnQuizFeedback: { correct: boolean; explanation: string } | null;
    setSdnQuizFeedback: (val: { correct: boolean; explanation: string } | null) => void;
    sdnShuffledChoices: Array<{ text: string; originalIndex: number }>;
    onSkipOrNextQuestion?: () => void;
    onResetQuiz?: () => void;
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
    availableQuestions = [],
    sdnQuizScore,
    setSdnQuizScore,
    quizEarnedPoints,
    setQuizEarnedPoints,
    sdnQuizAnswered,
    setSdnQuizAnswered,
    sdnQuizFeedback,
    setSdnQuizFeedback,
    sdnShuffledChoices,
    onSkipOrNextQuestion,
    onResetQuiz,
    projectId,
    language,
    t
}: QuizModalProps) {
    if (!showSdnQuiz) return null;

    const isTr = language === 'tr';
    const totalQuestionsCount = Math.max(quizQuestions.length, 1);
    const completedAll = availableQuestions.length === 0 || !sdnQuestion;

    const handleNext = () => {
        setSdnQuizFeedback(null);
        if (onSkipOrNextQuestion) {
            onSkipOrNextQuestion();
        } else {
            const nextPoolLen = Math.max(1, availableQuestions.length);
            setSdnQuizIndex(index => (index + 1) % nextPoolLen);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sdn-quiz-title">
            <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-primary-300/40 bg-white shadow-2xl dark:border-primary-700/40 dark:bg-secondary-900">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-secondary-200/80 p-4 dark:border-secondary-800">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-bold">
                            🎓
                        </div>
                        <div>
                            <h2 id="sdn-quiz-title" className="text-base font-bold text-secondary-900 dark:text-secondary-100">
                                {isTr ? 'Bilgi Quiz’i' : 'Knowledge Quiz'}
                            </h2>
                            <p className="text-xs text-secondary-500">
                                {isTr ? 'Ağ & Sistem Konu Soruları' : 'Network & Systems Topic Questions'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSdnQuiz(false)}
                        className="rounded-lg p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-900 dark:hover:bg-secondary-800 dark:hover:text-secondary-100 transition"
                        aria-label={isTr ? 'Quiz’i kapat' : 'Close quiz'}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto overscroll-contain p-5 scrollbar-thin scrollbar-thumb-secondary-400 dark:scrollbar-thumb-secondary-600">
                    {/* Score Bar */}
                    <div className="mb-4 rounded-xl border border-secondary-200 dark:border-secondary-800 bg-secondary-50/70 dark:bg-secondary-800/40 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                            <span>
                                {isTr ? 'Kazanılan Doğru:' : 'Score:'} <strong className="text-primary-600 dark:text-primary-400">{sdnQuizScore}/{totalQuestionsCount}</strong>
                            </span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <Award className="h-3.5 w-3.5" />
                                +{quizEarnedPoints} {t.pts || 'pts'}
                            </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary-200 dark:bg-secondary-700">
                            <div
                                className="h-full bg-primary-500 dark:bg-primary-400 transition-all duration-300"
                                style={{ width: `${Math.min(100, (sdnQuizScore / totalQuestionsCount) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {completedAll ? (
                        /* All Questions Completed View */
                        <div className="py-6 text-center">
                            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-950/60 text-success-600 dark:text-success-400">
                                <CheckCircle2 className="h-9 w-9" />
                            </div>
                            <h3 className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
                                {isTr ? 'Tebrikler! Tüm Soruları Tamamladınız!' : 'Congratulations! All Questions Completed!'}
                            </h3>
                            <p className="mt-1.5 text-xs text-secondary-600 dark:text-secondary-400 max-w-sm mx-auto">
                                {isTr
                                    ? `Bu dersin tüm sorularını başarıyla yanıtladınız ve toplam +${quizEarnedPoints} puan kazandınız.`
                                    : `You have successfully answered all quiz questions for this lesson and earned +${quizEarnedPoints} points.`}
                            </p>

                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                                {onResetQuiz && (
                                    <button
                                        onClick={onResetQuiz}
                                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-4 py-2.5 text-xs font-semibold text-secondary-800 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        {isTr ? 'Yeniden Başlat (Pratik Yap)' : 'Restart (Practice Again)'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowSdnQuiz(false)}
                                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-primary-700 transition"
                                >
                                    {isTr ? 'Derse Devam Et' : 'Continue Lesson'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Question & Options View */
                        <div>
                            <div className="flex items-center justify-between text-[11px] font-medium text-secondary-500 dark:text-secondary-400">
                                <span>{isTr ? `Soru ${(sdnQuizIndex % totalQuestionsCount) + 1} / ${totalQuestionsCount} (${availableQuestions.length} kalan)` : `Question ${(sdnQuizIndex % totalQuestionsCount) + 1} / ${totalQuestionsCount} (${availableQuestions.length} remaining)`}</span>
                            </div>

                            <p className="mt-2.5 text-sm font-semibold text-secondary-900 dark:text-secondary-100 leading-relaxed">
                                {typeof sdnQuestion.question === 'object'
                                    ? (sdnQuestion.question[isTr ? 'tr' : 'en'] || sdnQuestion.question.tr)
                                    : sdnQuestion.question}
                            </p>

                            {/* Choices */}
                            <div className="mt-3.5 space-y-2">
                                {sdnShuffledChoices.map(({ text: choice, originalIndex }, idx) => {
                                    const optionLetter = String.fromCharCode(65 + idx);
                                    return (
                                        <button
                                            key={`${sdnQuestion.id}-${choice}`}
                                            disabled={sdnQuizFeedback !== null}
                                            onClick={() => {
                                                const result = answerSdnQuiz(sdnQuestion.id, originalIndex, projectId, language);
                                                if (!sdnQuizAnswered.includes(sdnQuestion.id)) {
                                                    if (result.correct) {
                                                        setSdnQuizAnswered(answered => [...answered, sdnQuestion.id]);
                                                        setSdnQuizScore(score => score + 1);
                                                        const pts = result.points || 10;
                                                        const maxAllowedPoints = quizQuestions.reduce((acc, q) => acc + (q.points || 10), 0);
                                                        setQuizEarnedPoints(prev => {
                                                            const nextVal = prev + pts;
                                                            return Math.min(nextVal, maxAllowedPoints);
                                                        });
                                                        toast({
                                                            title: isTr ? `+${pts} Puan Kazanıldı!` : `+${pts} Points Earned!`,
                                                            description: isTr ? 'Quiz sorusu doğru cevaplandı!' : 'Quiz question answered correctly!'
                                                        });
                                                    }
                                                }
                                                setSdnQuizFeedback(result);
                                            }}
                                            className="group flex w-full items-start gap-3 rounded-xl border border-secondary-200/90 dark:border-secondary-700/80 bg-white dark:bg-secondary-800/60 p-3 text-left text-xs text-secondary-800 dark:text-secondary-200 shadow-sm hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 disabled:opacity-75 transition-all"
                                        >
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary-100 dark:bg-secondary-700 font-bold text-secondary-700 dark:text-secondary-300 group-hover:bg-primary-500 group-hover:text-white transition">
                                                {optionLetter}
                                            </span>
                                            <span className="mt-0.5 leading-normal flex-1 break-words">{choice}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Skip / Next button if question is difficult */}
                            {sdnQuizFeedback === null && (
                                <div className="mt-4 flex items-center justify-between border-t border-secondary-200 dark:border-secondary-800 pt-3">
                                    <span className="flex items-center gap-1 text-[11px] text-secondary-500">
                                        <HelpCircle className="h-3.5 w-3.5" />
                                        {isTr ? 'Zor mu geldi? Soruyu atlayıp sonraya bırakabilirsiniz.' : 'Too difficult? Skip and answer later.'}
                                    </span>
                                    <button
                                        onClick={handleNext}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-secondary-100 dark:bg-secondary-800 px-3 py-1.5 text-xs font-semibold text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition"
                                    >
                                        <SkipForward className="h-3.5 w-3.5" />
                                        {isTr ? 'Sonraki Soru (Atla)' : 'Next Question (Skip)'}
                                    </button>
                                </div>
                            )}

                            {/* Feedback Box */}
                            {sdnQuizFeedback && (
                                <div className={cn(
                                    'mt-4 rounded-xl border p-3.5 text-xs shadow-sm',
                                    sdnQuizFeedback.correct
                                        ? 'border-success-300 bg-success-50 text-success-800 dark:border-success-800/60 dark:bg-success-950/30 dark:text-success-300'
                                        : 'border-error-300 bg-error-50 text-error-800 dark:border-error-800/60 dark:bg-error-950/30 dark:text-error-300'
                                )}>
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="flex items-center gap-1.5">
                                            {sdnQuizFeedback.correct ? '✅ ' : '❌ '}
                                            {sdnQuizFeedback.correct ? (isTr ? 'Doğru Cevap!' : 'Correct Answer!') : (isTr ? 'Yanlış Cevap' : 'Incorrect')}
                                        </span>
                                        {sdnQuizFeedback.correct && (
                                            <span className="text-[11px] font-semibold text-success-700 dark:text-success-300">+10 {t.pts || 'pts'}</span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 leading-relaxed text-[11px] opacity-90">{sdnQuizFeedback.explanation}</p>
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            onClick={handleNext}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-primary-700 transition"
                                        >
                                            {isTr ? 'Sonraki Soru' : 'Next Question'}
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
