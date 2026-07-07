'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  GripHorizontal,
  Lightbulb,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Wand2,
  Volume2,
  VolumeX,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { GuidedProject, getProgressPercentage } from '@/lib/network/guidedMode';
import { useLanguage } from '@/contexts/LanguageContext';
import { TutorialAnimationPlayer } from './TutorialAnimationPlayer';
import { generateCertificate } from '@/lib/utils/certificateGenerator';

interface GuidedModePanelProps {
  project: GuidedProject | null;
  currentStepIndex: number;
  onStepComplete: (stepId: string) => void;
  onStepUncomplete: (stepId: string) => void;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  lastCompletedStep?: string | null;
  // Step readiness - controls if "Complete" button is enabled
  isCurrentStepReady?: boolean;
  // Auto-completion context
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
  onClose,
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

  // Load hint and expanded states from localStorage
  const [showHint, setShowHint] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('guided_show_hint');
    return saved === 'true';
  });

  const [showAnimation, setShowAnimation] = React.useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  const [expandedSteps, setExpandedSteps] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('guided_expanded_steps');
    return saved ? JSON.parse(saved) : [];
  });

  // Save hint state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guided_show_hint', String(showHint));
    }
  }, [showHint]);

  // Save expanded steps to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guided_expanded_steps', JSON.stringify(expandedSteps));
    }
  }, [expandedSteps]);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 80 }); // right-4 top-20 (x set in useEffect)

  // Elapsed time since guided project started
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!project?.startedAt) return;
    const update = () => {
      setElapsedSeconds(Math.floor((Date.now() - new Date(project.startedAt as unknown as string | number).getTime()) / 1000));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [project?.startedAt]);

  const formatElapsed = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Set initial position on mount (client-side only)
  useEffect(() => {
    setTimeout(() => setPosition({ x: window.innerWidth - 336, y: 80 }), 0);
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step when it changes
  const activeStepRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Auto-expand active step instructions
    if (project && currentStepIndex < project.steps.length) {
      const step = project.steps[currentStepIndex];
      if (step.detailedInstructions && !expandedSteps.includes(step.id)) {
        setTimeout(() => setExpandedSteps(prev => [...prev, step.id]), 0);
      }
    }
  }, [currentStepIndex, project]);

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
  }, [lastCommand, lastOutput, deviceAccessed, deviceState, topologyConnections, topologyDevices, onCheckAutoComplete, project, currentStepIndex]);

  // Celebration effects
  const triggerStepCelebration = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Always show toast message
    toast({
      title: language === 'tr' ? `${currentStepIndex + 1}. Adım Tamamlandı! 🎉` : `Step ${currentStepIndex + 1} Completed! 🎉`,
      description: language === 'tr' ? 'Harika iş!' : 'Great job!',
    });

    // Check if graphics effects are disabled
    const isGraphicsLow = document.body.classList.contains('graphics-low');

    if (isGraphicsLow) {
      return;
    }

    // Create emoji particles
    const emojis = ['🎉', '✨', '🌟', '⭐'];
    for (let i = 0; i < 20; i++) {
      const emoji = document.createElement('div');
      emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      emoji.style.cssText = `
        position: fixed;
        left: ${Math.random() * 100}vw;
        top: 100vh;
        font-size: 24px;
        pointer-events: none;
        z-index: 9999;
        animation: float-up 2s ease-out forwards;
      `;
      document.body.appendChild(emoji);
      setTimeout(() => emoji.remove(), 2000);
    }
  }, [language, currentStepIndex]);

  const triggerLessonCompleteCelebration = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Always show toast message
    toast({
      title: language === 'tr' ? 'Ders Tamamlandı! 🏆' : 'Lesson Completed! 🏆',
      description: language === 'tr' ? 'Tebrikler, tüm adımları tamamladınız!' : 'Congratulations, you completed all steps!',
    });

    // Check if graphics effects are disabled
    const isGraphicsLow = document.body.classList.contains('graphics-low');

    if (isGraphicsLow) {
      return;
    }

    // Create more emoji particles for lesson completion
    const emojis = ['🎉', '🎊', '✨', '🌟', '⭐', '🏆', '👏'];
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const emoji = document.createElement('div');
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        emoji.style.cssText = `
          position: fixed;
          left: ${Math.random() * 100}vw;
          top: 100vh;
          font-size: ${20 + Math.random() * 20}px;
          pointer-events: none;
          z-index: 9999;
          animation: float-up 3s ease-out forwards;
        `;
        document.body.appendChild(emoji);
        setTimeout(() => emoji.remove(), 3000);
      }, i * 50);
    }
  }, [language]);


  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag from header
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  }, [position]);


  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;

    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position.x,
      initialY: position.y
    };
  }, [position]);


  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !dragRef.current) return;

        // Cancel previous animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          if (!isDragging || !dragRef.current) return;

          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;

          // Mark as dragged if moved significantly
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            setHasDragged(true);
          }

          setPosition({
            x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx)),
            y: Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
          });
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        dragRef.current = null;
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setTimeout(() => setHasDragged(false), 100);
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging || !dragRef.current) return;

        // Cancel previous animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          if (!isDragging || !dragRef.current) return;

          const touch = e.touches[0];
          const dx = touch.clientX - dragRef.current.startX;
          const dy = touch.clientY - dragRef.current.startY;

          // Mark as dragged if moved significantly
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            setHasDragged(true);
          }

          setPosition({
            x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx)),
            y: Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
          });
        });
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        dragRef.current = null;
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        setTimeout(() => setHasDragged(false), 100);
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
    return;
  }, [isDragging]);

  // Trigger celebration when all steps are completed
  const completedCount = project?.steps.filter(s => s.completed).length || 0;
  const isAllCompleted = project ? completedCount === project.steps.length : false;

  const currentPoints = React.useMemo(() => {
    return project?.steps
      .filter(s => s.completed)
      .reduce((acc, s) => acc + (s.points || 0), 0) || 0;
  }, [project]);

  const totalPoints = project?.totalPoints || project?.steps.reduce((acc, s) => acc + (s.points || 0), 0) || 0;

  const handleDownloadCertificate = useCallback(() => {
    if (!project) return;
    const studentName = prompt(language === 'tr' ? 'Sertifika için adınızı girin:' : 'Enter your name for the certificate:') || 'Student';

    generateCertificate({
      studentName,
      projectTitle: project.title,
      score: currentPoints,
      totalScore: totalPoints,
      date: new Date().toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US'),
      language
    });

    toast({
      title: language === 'tr' ? 'Sertifika Oluşturuldu!' : 'Certificate Generated!',
      description: language === 'tr' ? 'PDF dosyanız indiriliyor.' : 'Your PDF file is being downloaded.',
    });
  }, [project, language, currentPoints, totalPoints]);

  useEffect(() => {
    if (project && isAllCompleted) {
      triggerLessonCompleteCelebration();
    }
  }, [isAllCompleted, project, triggerLessonCompleteCelebration]);

  // Listen for step completion event from useGuidedMode
  useEffect(() => {
    const handleStepCompleted = (e: Event) => {
      const points = (e as CustomEvent<{ points: number }>).detail?.points || 0;
      if (points > 0) {
        toast({
          title: language === 'tr' ? `+${points} ${t.pointsEarned}!` : `+${points} ${t.pointsEarned}!`,
          description: language === 'tr' ? 'Harika iş!' : 'Great job!',
        });
      }
      triggerStepCelebration();
    };

    window.addEventListener('guided-step-completed', handleStepCompleted);
    return () => window.removeEventListener('guided-step-completed', handleStepCompleted);
  }, [triggerStepCelebration, language, t.pointsEarned]);

  const progress = project ? getProgressPercentage(project.steps) : 0;
  const currentStep = project ? project.steps[currentStepIndex] : null;

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps(prev =>
      prev.includes(stepId)
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return t.beginner;
      case 'intermediate': return t.intermediate;
      case 'advanced': return t.advanced;
      default: return difficulty;
    }
  };

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

    // Try to find a better voice if available
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith(language) && (v.name.includes('Google') || v.name.includes('Premium')));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  }, [currentStep, language, isSpeaking]);

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
        {/* Main Floating Button */}
        <div
          data-drag-handle
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border-2 cursor-grab active:cursor-grabbing transition-all",
            "bg-gradient-to-r from-primary-500 to-primary-600 border-primary-400 text-white",
            "animate-pulse",
            isDragging && "cursor-default"
          )}
          onClick={() => {
            // Only trigger click if not dragged
            if (!hasDragged) {
              onMinimize();
            }
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <GripHorizontal className="w-4 h-4 opacity-60" />
          <Wand2 className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {t.openWizard}
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
        {/* Header - Draggable */}
        <div
          data-drag-handle
          className={cn(
            "flex items-center justify-between p-4 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 text-white",
            "cursor-grab active:cursor-grabbing select-none shadow-inner"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 opacity-50" />
            <div className="relative">
              <Wand2 className="w-5 h-5" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-warning-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-xs tracking-tighter">
                {t.tutorialWizard}
              </h3>
              <p className="text-[10px] text-primary-100/80 truncate max-w-[160px] font-medium">{project.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMinimize}
              className="p-1.5 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white"
              title={t.minimize}
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Points */}
        <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-900/50 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-secondary-500 dark:text-secondary-400">{t.progress}</span>
            <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">
              {completedCount} / {project.steps.length}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-secondary-400 font-bold">{t.totalScore}</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-warning-500 fill-warning-500" />
              <span className="text-sm font-black text-warning-600 dark:text-warning-400 tabular-nums">
                {currentPoints} <span className="text-[10px] text-secondary-400 font-normal">/ {totalPoints}</span>
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-success-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isAllCompleted && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="text-xs text-success-600 dark:text-success-400 font-medium text-center animate-pulse">
                {t.allStepsCompleted}
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
              <button
                onClick={handleDownloadCertificate}
                className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-success-500 hover:bg-success-600 text-white rounded-lg font-bold text-xs transition-all shadow-lg shadow-success-500/20"
              >
                <Award className="w-4 h-4" />
                {language === 'tr' ? 'Sertifikayı İndir' : 'Download Certificate'}
              </button>
            </div>
          )}
        </div>

        {/* Current Step Highlight */}
        {currentStep && !currentStep.completed && (
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                {t.currentStep}: {currentStep.order}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium text-sm text-secondary-800 dark:text-secondary-200">
                {currentStep.title[language]}
              </h4>
              <button
                onClick={handleToggleSpeech}
                className={cn(
                  "p-1 rounded-md transition-all shrink-0",
                  isSpeaking
                    ? "bg-primary-500 text-white animate-pulse"
                    : "hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400"
                )}
                title={isSpeaking ? (language === 'tr' ? 'Durdur' : 'Stop') : (language === 'tr' ? 'Sesli Dinle' : 'Read Aloud')}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-2">
              {currentStep.description[language]}
            </p>

            {/* Animation Section */}
            {currentStep.animationId && (
              <div className="mb-3 space-y-2">
                <button
                  onClick={() => setShowAnimation(!showAnimation)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {showAnimation ? t.hideAnimation : t.showAnimation}
                </button>
                {showAnimation && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                    <TutorialAnimationPlayer animationId={currentStep.animationId} />
                  </div>
                )}
              </div>
            )}

            {/* Hint Section */}
            <Collapsible open={showHint} onOpenChange={setShowHint}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 transition-colors">
                  <Lightbulb className="w-3 h-3" />
                  {showHint ? t.hideHint : t.showHint}
                  {showHint ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 rounded text-xs text-warning-800 dark:text-warning-200">
                  <Lightbulb className="w-3 h-3 inline mr-1" />
                  {currentStep.hint[language]}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Detailed Instructions */}
            {currentStep.detailedInstructions && (
              <Collapsible
                open={expandedSteps.includes(currentStep.id)}
                onOpenChange={() => toggleStepExpand(currentStep.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className="mt-2 flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors">
                    {t.instructions}
                    {expandedSteps.includes(currentStep.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ol className="mt-2 space-y-1 text-xs text-secondary-600 dark:text-secondary-400 pl-4">
                    {currentStep.detailedInstructions[language].map((instruction, idx) => (
                      <li key={idx} className="list-decimal">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Steps List */}
        <ScrollArea className="flex-1 overflow-y-auto guided-steps-scrollbar">
          <div className="p-2 space-y-1 pr-3">
            {project.steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = step.completed;
              return (
                <div
                  key={step.id}
                  ref={isActive ? activeStepRef : undefined}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg transition-all",
                    isActive && "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800",
                    isCompleted && !isActive && "bg-secondary-100 dark:bg-secondary-800 opacity-60",
                    !isActive && !isCompleted && "hover:bg-secondary-50 dark:hover:bg-secondary-700/50"
                  )}
                >
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-success-500" />
                    ) : isActive ? (
                      <Circle className="w-5 h-5 text-primary-500 animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-secondary-300 dark:text-secondary-600" />
                    )}
                  </div>

                  {/* Undo button for completed steps */}
                  {isCompleted && (
                    <button
                      onClick={() => onStepUncomplete(step.id)}
                      className="text-xs text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors flex-shrink-0"
                    >
                      {t.uncomplete}
                    </button>
                  )}

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-xs font-medium",
                        isActive && "text-primary-600 dark:text-primary-400",
                        isCompleted && "text-secondary-600 dark:text-white line-through",
                        !isActive && !isCompleted && "text-secondary-500 dark:text-secondary-400"
                      )}>
                        {step.order}. {step.title[language]}
                      </span>
                      {step.points && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          isCompleted
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                            : "bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400"
                        )}>
                          {step.points} {t.pts}
                        </span>
                      )}
                    </div>

                    {isActive && (
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 truncate">
                        {step.description[language]}
                      </p>
                    )}

                    {/* Completion Time */}
                    {isCompleted && step.completedAt && project.startedAt && (
                      <p className="text-[10px] text-secondary-400 dark:text-secondary-300 mt-0.5">
                        {t.completedAt}: {new Date(step.completedAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="ml-1 text-secondary-400">
                          ({(() => {
                            const duration = Math.round((new Date(step.completedAt).getTime() - new Date(project.startedAt).getTime()) / 1000);
                            const minutes = Math.floor(duration / 60);
                            const seconds = duration % 60;
                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                          })()})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Info */}
        <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 text-xs text-secondary-500 dark:text-secondary-400 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="font-mono tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {getDifficultyText(project.difficulty)}
          </div>
        </div>
      </div>
    </div>
  );
}


