'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { toast } from "@/hooks/use-toast";
import {
  GripHorizontal,
  Clock,
  Target,
  ChevronUp,
  Compass,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GuidedProject, getProgressPercentage } from '@/lib/network/guidedMode';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateCertificate } from '@/lib/utils/certificateGenerator';
import { isDesktopApp } from '@/lib/utils/desktopDetection';
import { usePrompt } from '@/contexts/PromptContext';

import { useGuidedPanelState } from './guidedMode/useGuidedPanelState';
import { useGuidedQuiz } from './guidedMode/useGuidedQuiz';
import { useCelebrationEffects } from './guidedMode/useCelebrationEffects';
import { PanelHeader } from './guidedMode/PanelHeader';
import { CurrentStepPanel } from './guidedMode/CurrentStepPanel';
import { QuizModal } from './guidedMode/QuizModal';
import { StepsList } from './guidedMode/StepsList';
import { formatElapsed, getDifficultyText } from './guidedMode/guidedUtils';

interface GuidedModePanelProps {
  project: GuidedProject | null;
  currentStepIndex: number;
  onStepComplete: (stepId: string) => void;
  onStepUncomplete: (stepId: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  lastCompletedStep?: string | null;
  isCurrentStepReady?: boolean;
  lastCommand?: string;
  lastOutput?: string;
  deviceAccessed?: 'switch' | 'router' | 'pc' | null;
  deviceAccessedId?: string | null;
  deviceState?: unknown;
  deviceStates?: Map<string, unknown>;
  topologyConnections?: unknown[];
  topologyDevices?: unknown[];
  onCheckAutoComplete?: (context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: unknown;
    deviceStates?: Map<string, unknown>;
    topologyConnections?: unknown[];
    topologyDevices?: unknown[];
  }) => void;
}

export function GuidedModePanel({
  project,
  currentStepIndex,
  onStepUncomplete,
  onClose: _onClose,
  onMinimize,
  isMinimized,
  lastCommand,
  lastOutput,
  deviceAccessed,
  deviceAccessedId,
  deviceState,
  deviceStates,
  topologyConnections,
  topologyDevices,
  onCheckAutoComplete
}: GuidedModePanelProps) {
  const { t, language } = useLanguage();
  const { openPrompt } = usePrompt();

  const {
    showHint,
    setShowHint,
    showAnimation,
    setShowAnimation,
    isSpeaking,
    setIsSpeaking,
    synthRef,
    utteranceRef,
    expandedSteps,
    position,
    elapsedSeconds,
    isDragging,
    hasDragged,
    panelRef,
    activeStepRef,
    handleMouseDown,
    handleTouchStart,
    toggleStepExpand,
  } = useGuidedPanelState(project, currentStepIndex);

  const {
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
  } = useGuidedQuiz(project);

  const { triggerStepCelebration, triggerLessonCompleteCelebration } = useCelebrationEffects(language, currentStepIndex);

  // Auto-check completion when context changes
  useEffect(() => {
    if (onCheckAutoComplete && project && currentStepIndex < project.steps.length) {
      const currentStep = project.steps[currentStepIndex];
      if (currentStep && !currentStep.completed) {
        onCheckAutoComplete({
          lastCommand,
          lastOutput,
          deviceAccessed,
          deviceAccessedId,
          deviceState,
          deviceStates,
          topologyConnections,
          topologyDevices
        });
      }
    }
  }, [lastCommand, lastOutput, deviceAccessed, deviceAccessedId, deviceState, deviceStates, topologyConnections, topologyDevices, onCheckAutoComplete, project, currentStepIndex]);

  const completedCount = project?.steps.filter(s => s.completed).length || 0;
  const isAllCompleted = project ? completedCount === project.steps.length : false;

  const stepsCurrentPoints = useMemo(() => {
    return project?.steps
      .filter(s => s.completed)
      .reduce((acc, s) => acc + (s.points || 0), 0) || 0;
  }, [project]);

  const quizTotalPoints = useMemo(() => {
    return quizQuestions.reduce((acc: number, q: { points?: number }) => acc + (q.points || 10), 0);
  }, [quizQuestions]);

  const stepsTotalPoints = useMemo(() => {
    return project?.totalPoints || project?.steps.reduce((acc, s) => acc + (s.points || 0), 0) || 0;
  }, [project]);

  const totalPoints = stepsTotalPoints + quizTotalPoints;
  const currentPoints = stepsCurrentPoints + quizEarnedPoints;

  const handleDownloadCertificate = useCallback(async () => {
    if (!project) return;
    const result = await openPrompt({
      title: language === 'tr' ? 'Sertifika' : 'Certificate',
      message: language === 'tr' ? 'Sertifika için adınızı girin:' : 'Enter your name for the certificate:',
      confirmLabel: language === 'tr' ? 'İndir' : 'Download',
      cancelLabel: language === 'tr' ? 'Vazgeç' : 'Cancel',
    });
    const studentName = result.confirmed && result.value.trim() ? result.value.trim() : 'Student';

    toast({
      title: language === 'tr' ? 'Sertifika hazırlanıyor...' : 'Preparing certificate...',
      description: language === 'tr' ? 'QR kod oluşturuluyor, lütfen bekleyin.' : 'Generating QR code, please wait.',
    });

    const generated = await generateCertificate({
      studentName,
      projectTitle: project.title,
      score: currentPoints,
      totalScore: totalPoints,
      date: new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US'),
      language
    });

    if (generated) {
      toast({
        title: language === 'tr' ? 'Sertifika Oluşturuldu!' : 'Certificate Generated!',
        description: language === 'tr' ? 'PDF dosyanız indiriliyor.' : 'Your PDF file is being downloaded.',
      });
    }
  }, [project, language, currentPoints, totalPoints, openPrompt]);

  useEffect(() => {
    if (project && isAllCompleted) {
      triggerLessonCompleteCelebration();
    }
  }, [isAllCompleted, project, triggerLessonCompleteCelebration]);

  useEffect(() => {
    const handleStepCompleted = (e: Event) => {
      const points = (e as CustomEvent<{ points: number }>).detail?.points || 0;
      if (points > 0) {
        toast({
          title: language === 'tr' ? `+${points} ${(t as Record<string, string>).pointsEarned}!` : `+${points} ${(t as Record<string, string>).pointsEarned}!`,
          description: language === 'tr' ? 'Harika iş!' : 'Great job!',
        });
      }
      triggerStepCelebration();
    };

    window.addEventListener('guided-step-completed', handleStepCompleted);
    return () => window.removeEventListener('guided-step-completed', handleStepCompleted);
  }, [triggerStepCelebration, language, t]);

  const progress = project ? getProgressPercentage(project.steps) : 0;
  const currentStep = project ? project.steps[currentStepIndex] : null;
  const sdnQuestion = quizQuestions[sdnQuizIndex];

  useEffect(() => {
    if (!sdnQuestion) return;
    const rawChoices = typeof sdnQuestion.choices === 'object' && !Array.isArray(sdnQuestion.choices)
      ? (sdnQuestion.choices[language === 'tr' ? 'tr' : 'en'] || sdnQuestion.choices.tr)
      : sdnQuestion.choices;
    const choices = (rawChoices as string[]).map((text: string, originalIndex: number) => ({ text, originalIndex }));
    for (let index = choices.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
    }
    setSdnShuffledChoices(choices);
  }, [sdnQuestion, language, setSdnShuffledChoices]);

  const handleToggleSpeech = useCallback(() => {
    if (!synthRef.current || !currentStep) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = `${currentStep.title[language]}. ${currentStep.description[language]}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === 'tr' ? 'tr-TR' : 'en-US';

    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(language) && v.name.includes('Premium'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  }, [currentStep, language, isSpeaking, setIsSpeaking, synthRef, utteranceRef]);

  if (!project) return null;

  if (isMinimized) {
    return (
      <div
        className="fixed z-[70] flex flex-col gap-2"
        style={{
          left: position.x,
          top: position.y,
          willChange: isDragging ? 'transform' : 'auto',
          contain: 'layout style paint'
        }}
      >
        <div
          data-drag-handle
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border-2 cursor-grab active:cursor-grabbing transition-all",
            "bg-gradient-to-r from-primary-500 to-primary-600 border-primary-400 text-white",
            "animate-pulse",
            isDragging && "cursor-default"
          )}
          onClick={() => {
            if (!hasDragged) {
              onMinimize();
            }
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <GripHorizontal className="w-4 h-4 opacity-60" />
          <Compass className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">
            {(t as Record<string, string>).openWizard}
          </span>
          <div className="w-12 h-1.5 bg-white/30 rounded-full overflow-hidden ml-2">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium opacity-80 ml-1">
            {progress}%
          </span>
          <ChevronUp className="w-4 h-4 ml-1 opacity-60" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed z-[70] w-80 flex flex-col rounded-xl overflow-hidden",
        isDragging && "cursor-default"
      )}
      style={{
        left: position.x,
        top: position.y,
        maxHeight: 'calc(100vh - 100px)',
        willChange: isDragging ? 'transform' : 'auto',
        contain: 'layout style paint'
      }}
    >
      <div
        className={cn(
          "flex flex-col rounded-xl shadow-2xl border overflow-hidden liquid-glass-light",
          "border-success-500/50 dark:border-success-500/30",
          "max-h-full"
        )}
      >
        <PanelHeader
          project={project}
          onMinimize={onMinimize}
          handleMouseDown={handleMouseDown}
          handleTouchStart={handleTouchStart}
          t={t as Record<string, string>}
        />

        {/* Progress Bar & Points */}
        <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-900/50 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider text-secondary-400 font-bold">{(t as Record<string, string>).progress}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-primary-600 dark:text-primary-400 tabular-nums">
                  {completedCount}
                </span>
                <span className="text-xs text-secondary-500 dark:text-secondary-400 font-medium">
                  / {project.steps.length}
                </span>
                <span className="text-xs text-secondary-400 ml-1">
                  ({project.steps.length - completedCount} {language === 'tr' ? 'kaldı' : 'remaining'})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-secondary-400 font-bold">{(t as Record<string, string>).totalScore}</span>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <Award className="w-3.5 h-3.5 text-warning-500 fill-warning-500" />
                <span className="text-sm font-black text-warning-600 dark:text-warning-400 tabular-nums">
                  {currentPoints} <span className="text-[10px] text-secondary-400 font-normal">/ {totalPoints}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="w-full h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-success-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isAllCompleted && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="text-xs text-success-600 dark:text-success-400 font-medium text-center animate-pulse">
                {(t as Record<string, string>).allStepsCompleted}
                {project.startedAt && (() => {
                  const lastCompletedStep = project.steps.filter(s => s.completed).sort((a, b) =>
                    (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
                  )[0];
                  if (lastCompletedStep?.completedAt) {
                    const duration = Math.round((new Date(lastCompletedStep.completedAt).getTime() - new Date(project.startedAt).getTime()) / 1000);
                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    return (
                      <span className="ml-2 text-secondary-500 dark:text-secondary-400">
                        ({minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`})
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              {!isDesktopApp() && (
                <>
                  <button
                    onClick={handleDownloadCertificate}
                    disabled={totalPoints > 0 && (currentPoints / totalPoints) * 100 < 50}
                    title={totalPoints > 0 && (currentPoints / totalPoints) * 100 < 50 ? (language === 'tr' ? 'Sertifika için en az %50 tamamlama gereklidir.' : 'At least 50% completion is required for a certificate.') : undefined}
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-success-500 hover:bg-success-600 text-white rounded-lg font-bold text-xs transition-all shadow-lg shadow-success-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-success-500"
                  >
                    <Award className="w-4 h-4" />
                    {language === 'tr' ? 'Sertifikayı İndir' : 'Download Certificate'}
                  </button>
                  {totalPoints > 0 && (currentPoints / totalPoints) * 100 < 50 && (
                    <p className="text-center text-xs text-warning-500 dark:text-warning-400 mt-1.5">
                      {language === 'tr' ? `Sertifika için en az %50 gerekli (Mevcut: %${Math.round((currentPoints / totalPoints) * 100)})` : `Min. 50% required (Current: ${Math.round((currentPoints / totalPoints) * 100)}%)`}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Current Step Highlight */}
        {currentStep && !currentStep.completed && (
          <CurrentStepPanel
            currentStep={currentStep}
            totalSteps={project.steps.length}
            language={language}
            showHint={showHint}
            setShowHint={setShowHint}
            showAnimation={showAnimation}
            setShowAnimation={setShowAnimation}
            isSpeaking={isSpeaking}
            handleToggleSpeech={handleToggleSpeech}
            usedShowMeStepIds={usedShowMeStepIds}
            setUsedShowMeStepIds={setUsedShowMeStepIds}
            expandedSteps={expandedSteps}
            toggleStepExpand={toggleStepExpand}
            t={t as Record<string, string>}
          />
        )}

        {/* Quiz Launcher & Modal */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowSdnQuiz(true)}
            className="w-full rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 text-left text-xs font-bold text-primary-700 dark:text-primary-300"
          >
            🎓 {language === 'tr' ? 'Bilgi Quiz’i' : 'Knowledge Quiz'}
            <span className="float-right">{sdnQuizScore}/{quizQuestions.length} (+{quizEarnedPoints} {(t as Record<string, string>).pts})</span>
          </button>
          <QuizModal
            showSdnQuiz={showSdnQuiz}
            setShowSdnQuiz={setShowSdnQuiz}
            sdnQuestion={sdnQuestion}
            sdnQuizIndex={sdnQuizIndex}
            setSdnQuizIndex={setSdnQuizIndex}
            quizQuestions={quizQuestions}
            sdnQuizScore={sdnQuizScore}
            setSdnQuizScore={setSdnQuizScore}
            quizEarnedPoints={quizEarnedPoints}
            setQuizEarnedPoints={setQuizEarnedPoints}
            sdnQuizAnswered={sdnQuizAnswered}
            setSdnQuizAnswered={setSdnQuizAnswered}
            sdnQuizFeedback={sdnQuizFeedback}
            setSdnQuizFeedback={setSdnQuizFeedback}
            sdnShuffledChoices={sdnShuffledChoices}
            projectId={project.id}
            language={language}
            t={t as Record<string, string>}
          />
        </div>

        <ScrollArea className="flex-1 overflow-y-auto guided-steps-scrollbar">
          <StepsList
            project={project}
            currentStepIndex={currentStepIndex}
            activeStepRef={activeStepRef}
            onStepUncomplete={onStepUncomplete}
            language={language}
            t={t as Record<string, string>}
          />
        </ScrollArea>

        {/* Footer Info */}
        <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 text-xs text-secondary-500 dark:text-secondary-400 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="font-mono tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {getDifficultyText(project.difficulty, t as Record<string, string>)}
          </div>
        </div>
      </div>
    </div>
  );
}
