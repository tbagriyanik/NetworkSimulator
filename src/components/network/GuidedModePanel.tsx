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
  BookOpen,
  Move,
  Sparkles,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { GuidedStep, GuidedProject, getProgressPercentage } from '@/lib/network/guidedMode';
import { useLanguage } from '@/contexts/LanguageContext';

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
  deviceAccessed?: 'switch' | 'router' | 'pc' | null;
  deviceAccessedId?: string | null;
  deviceState?: any;
  topologyConnections?: any[];
  topologyDevices?: any[];
  onCheckAutoComplete?: (context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: any;
    topologyConnections?: any[];
    topologyDevices?: any[];
  }) => void;
}

export function GuidedModePanel({
  project,
  currentStepIndex,
  onStepComplete,
  onStepUncomplete,
  onClose,
  onMinimize,
  isMinimized,
  lastCompletedStep,
  isCurrentStepReady = false,
  lastCommand,
  deviceAccessed,
  deviceAccessedId,
  deviceState,
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
      setElapsedSeconds(Math.floor((Date.now() - new Date(project.startedAt!).getTime()) / 1000));
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
    setPosition({ x: window.innerWidth - 336, y: 80 });
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

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
        setExpandedSteps(prev => [...prev, step.id]);
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
          deviceAccessed,
          deviceAccessedId,
          deviceState,
          topologyConnections,
          topologyDevices
        });
      }
    }
  }, [lastCommand, deviceAccessed, deviceState, topologyConnections, topologyDevices, onCheckAutoComplete, project, currentStepIndex]);

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

  const handleMouseMove = useCallback((e: MouseEvent) => {
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
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
    // Reset hasDragged after a short delay to allow click to complete
    setTimeout(() => setHasDragged(false), 100);
  }, []);

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

  const handleTouchMove = useCallback((e: TouchEvent) => {
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
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
    // Reset hasDragged after a short delay to allow click to complete
    setTimeout(() => setHasDragged(false), 100);
  }, []);

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

  useEffect(() => {
    if (project && isAllCompleted) {
      triggerLessonCompleteCelebration();
    }
  }, [isAllCompleted, project, triggerLessonCompleteCelebration]);

  // Listen for step completion event from useGuidedMode
  useEffect(() => {
    const handleStepCompleted = (e: any) => {
      const points = e.detail?.points || 0;
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

  if (!project) return null;

  const progress = getProgressPercentage(project.steps);
  const currentStep = project.steps[currentStepIndex];

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

  if (isMinimized) {
    return (
      <div
        className="fixed z-50 flex flex-col gap-2"
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
            "flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border-2 cursor-default transition-all",
            "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 text-white",
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

        {/* Helper Text */}
        <div className="text-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-full shadow-sm">
            {language === 'tr' ? 'Sürüklemek için tutun' : 'Hold to drag'}
          </span>
        </div>
      </div>
    );
  }

  return (
      <div
        ref={panelRef}
        className={cn(
          "fixed z-50 w-80 flex flex-col rounded-xl overflow-hidden",
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
          "flex flex-col rounded-xl shadow-2xl border overflow-hidden",
          "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl",
          "border-slate-200/50 dark:border-slate-700/50",
          "max-h-full"
        )}
      >
        {/* Header - Draggable */}
        <div
          data-drag-handle
          className={cn(
            "flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white",
            "cursor-default active:cursor-default select-none shadow-inner"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 opacity-50" />
            <div className="relative">
              <Wand2 className="w-5 h-5" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-tighter">
                {t.tutorialWizard}
              </h3>
              <p className="text-[10px] text-blue-100/80 truncate max-w-[160px] font-medium">{project.title}</p>
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
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">{t.progress}</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {completedCount} / {project.steps.length}
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t.totalScore}</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {currentPoints} <span className="text-[10px] text-slate-400 font-normal">/ {totalPoints}</span>
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-green-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isAllCompleted && (
            <div className="mt-2 text-xs text-green-600 dark:text-green-400 font-medium text-center animate-pulse">
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
                    <span className="ml-2 text-slate-500 dark:text-slate-400">
                      ({minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`})
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>

        {/* Current Step Highlight */}
        {currentStep && !currentStep.completed && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {t.currentStep}: {currentStep.order}
              </span>
            </div>
            <h4 className="font-medium text-sm text-slate-800 dark:text-slate-200 mb-1">
              {currentStep.title[language]}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              {currentStep.description[language]}
            </p>

            {/* Hint Section */}
            <Collapsible open={showHint} onOpenChange={setShowHint}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">
                  <Lightbulb className="w-3 h-3" />
                  {showHint ? t.hideHint : t.showHint}
                  {showHint ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
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
                  <button className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    {t.instructions}
                    {expandedSteps.includes(currentStep.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ol className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-4">
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
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {project.steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = step.completed;
              const isFuture = index > currentStepIndex;

              return (
                <div
                  key={step.id}
                  ref={isActive ? activeStepRef : undefined}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg transition-all",
                    isActive && "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800",
                    isCompleted && !isActive && "bg-slate-100 dark:bg-slate-800 opacity-60",
                    !isActive && !isCompleted && "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  )}
                >
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isActive ? (
                      <Circle className="w-5 h-5 text-blue-500 animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  {/* Undo button for completed steps */}
                  {isCompleted && (
                    <button
                      onClick={() => onStepUncomplete(step.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                    >
                      {t.uncomplete}
                    </button>
                  )}

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-xs font-medium",
                        isActive && "text-blue-600 dark:text-blue-400",
                        isCompleted && "text-slate-600 dark:text-white line-through",
                        !isActive && !isCompleted && "text-slate-500 dark:text-slate-400"
                      )}>
                        {step.order}. {step.title[language]}
                      </span>
                      {step.points && (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                          isCompleted
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {step.points} {t.pts}
                        </span>
                      )}
                    </div>

                    {isActive && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                        {step.description[language]}
                      </p>
                    )}

                    {/* Completion Time */}
                    {isCompleted && step.completedAt && project.startedAt && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-300 mt-0.5">
                        {t.completedAt}: {new Date(step.completedAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="ml-1 text-slate-400">
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
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
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

export default GuidedModePanel;
