'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  GripHorizontal,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExamProject } from '@/lib/network/examMode';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-breakpoint';

interface ExamModePanelProps {
  project: ExamProject | null;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  score: number;
  isFinished?: boolean;
  onFinish?: () => void;
  // Auto-completion context
  lastCommand?: string;
  lastOutput?: string;
  deviceAccessed?: 'switch' | 'router' | 'pc' | null;
  deviceAccessedId?: string | null;
  deviceState?: unknown;
  deviceStates?: Map<string, unknown>;
  topologyConnections?: unknown[];
  topologyDevices?: unknown[];
  onCheckTasks?: (context: {
    lastCommand?: string;
    lastOutput?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceAccessedId?: string | null;
    deviceState?: unknown;
    deviceStates?: Map<string, unknown>;
    topologyConnections?: unknown[];
    topologyDevices?: unknown[];
  }) => void;
  onOpenEditor?: () => void;
}

export function ExamModePanel({
  project,
  onMinimize,
  isMinimized,
  score,
  isFinished = false,
  onFinish,
  lastCommand,
  lastOutput,
  deviceAccessed,
  deviceAccessedId,
  deviceState,
  deviceStates,
  topologyConnections,
  topologyDevices,
  onCheckTasks,
  onOpenEditor
}: ExamModePanelProps) {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  const [isChecklistExpanded, setIsChecklistExpanded] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 80 });

  // Elapsed time since exam started
  const [, setElapsedSeconds] = useState(0);
  const [timeLeft, setTimeLimit] = useState<number | null>(null);
  const [hasAutoFinished, setHasAutoFinished] = useState(false);

  const isFinishedState = isFinished || !!project?.finishedAt || hasAutoFinished;

  useEffect(() => {
    if (!project?.startedAt) return;

    const limitSec = project.durationMinutes * 60;

    const update = (nowMs: number = Date.now()) => {
      const diff = Math.floor((nowMs - new Date(project.startedAt as unknown as string | number).getTime()) / 1000);
      setElapsedSeconds(diff);
      setTimeLimit(Math.max(0, limitSec - diff));
    };

    // Stop timer immediately when exam is finished (with or without finishedAt persisted yet)
    if (isFinishedState) {
      const endTimeMs = project.finishedAt ? new Date(project.finishedAt).getTime() : Date.now();
      update(endTimeMs);
      return;
    }

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [project?.startedAt, project?.durationMinutes, project?.finishedAt, isFinishedState]);

  useEffect(() => {
    setTimeout(() => setHasAutoFinished(false), 0);
  }, [project?.startedAt, project?.finishedAt]);

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Set initial position
  useEffect(() => {
    const panelWidth = isMobile ? Math.min(320, window.innerWidth - 16) : 320;
    setTimeout(() => setPosition({ x: Math.max(0, window.innerWidth - panelWidth - 16), y: 80 }), 0);
  }, [isMobile]);

  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dragCleanupTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-finish when time expires
  useEffect(() => {
    return () => {
      if (dragCleanupTimerRef.current) clearTimeout(dragCleanupTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !isFinishedState && onFinish) {
      setTimeout(() => setHasAutoFinished(true), 0);
      onFinish();
    }
  }, [timeLeft, isFinishedState, onFinish]);

  // Auto-finish when full score is reached
  useEffect(() => {
    if (score >= 100 && !isFinishedState && onFinish) {
      setTimeout(() => setHasAutoFinished(true), 0);
      onFinish();
    }
  }, [score, isFinishedState, onFinish]);

  // Auto-check tasks when context changes
  useEffect(() => {
    if (onCheckTasks && project && !isFinishedState) {
      onCheckTasks({
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
  }, [lastCommand, lastOutput, deviceAccessed, deviceAccessedId, deviceState, deviceStates, topologyConnections, topologyDevices, onCheckTasks, project, isFinishedState]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !dragRef.current) return;
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = requestAnimationFrame(() => {
          if (!isDragging || !dragRef.current) return;
          const dx = e.clientX - dragRef.current.startX;
          const dy = e.clientY - dragRef.current.startY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setHasDragged(true);
          setPosition({
            x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx)),
            y: Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
          });
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        dragRef.current = null;
        dragCleanupTimerRef.current = setTimeout(() => setHasDragged(false), 100);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }
    return;
  }, [isDragging]);

  if (!project) return null;

  const completedCount = project.tasks.filter(t => t.completed).length;
  const isOverTime = timeLeft !== null && timeLeft <= 0;

  if (isMinimized) {
    return (
      <div
        className="fixed z-50 flex flex-col gap-2"
        style={{ left: position.x, top: position.y }}
      >
        <div
          data-drag-handle
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border-2 cursor-grab active:cursor-grabbing transition-all",
            "bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400 text-white",
            isOverTime && "animate-pulse from-error-600 to-error-700"
          )}
          onClick={() => !hasDragged && onMinimize()}
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="w-4 h-4 opacity-60" />
          <GraduationCap className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {language === 'tr' ? 'Sınavı Aç' : 'Open Exam'}
          </span>
          <div className="flex flex-col items-end ml-2">
            <span className="text-[10px] font-bold leading-tight">{score}/100</span>
            <span className={cn("text-[10px] font-mono leading-tight", isOverTime && "text-yellow-200 font-bold")}>
              {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </span>
          </div>
          <ChevronUp className="w-4 h-4 ml-1 opacity-60" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 w-[320px] max-w-[calc(100vw-16px)] flex flex-col rounded-xl overflow-hidden",
        isDragging && "cursor-default"
      )}
      style={{
        left: position.x,
        top: position.y,
        maxHeight: 'calc(100vh - 100px)',
      }}
    >
      <div
        className={cn(
          "flex flex-col rounded-xl shadow-2xl border overflow-hidden liquid-glass-light",
          "border-emerald-500/50 dark:border-emerald-500/30",
          "max-h-full"
        )}
      >
        {/* Header */}
        <div
          data-drag-handle
          className={cn(
            "flex items-center justify-between p-4 bg-gradient-to-r text-white",
            "cursor-grab active:cursor-grabbing select-none",
            isFinishedState
              ? "from-emerald-500 to-emerald-600"
              : isOverTime
                ? "from-error-600 to-error-700"
                : "from-rose-500 to-rose-600"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 opacity-50" />
            {isFinishedState ? <CheckCircle2 className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            <div>
              <h3 className="font-semibold text-sm">
                {isFinishedState
                  ? (language === 'tr' ? 'Sınav Tamamlandı' : 'Exam Completed')
                  : t.examMode}
              </h3>
              <p className="text-xs text-rose-100 truncate max-w-[160px]">{project.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {project.isCustom && onOpenEditor && (
              <button
                onClick={onOpenEditor}
                className="p-1.5 rounded-md hover:bg-black/10 transition-colors"
                title={t.examEditor}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button onClick={onMinimize} className="p-1.5 rounded-md hover:bg-black/10 transition-colors" title={language === 'tr' ? 'Küçült' : 'Minimize'}>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Score + Checklist */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <div className="flex flex-col">
            {/* Stats Row */}
            <div className="grid grid-cols-2 divide-x divide-secondary-200 dark:divide-secondary-700 bg-secondary-50 dark:bg-secondary-800/50 border-b border-secondary-200 dark:border-secondary-700">
              <div className="flex flex-col items-center py-3">
                <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold tracking-wider">{t.score}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-rose-500">{score}</span>
                  <span className="text-xs text-secondary-400">/ 100</span>
                </div>
              </div>
              <div className="flex flex-col items-center py-3">
                <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold tracking-wider">{t.examTime}</span>
                <div className={cn("flex items-center gap-1.5", isOverTime && "text-error-500 animate-pulse")}>
                  <Clock className="w-4 h-4" />
                  <span className="text-xl font-mono font-bold">
                    {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Overtime Alert */}
            {isOverTime && (
              <div className="px-4 py-2 bg-error-500/10 border-b border-error-500/20 flex items-center gap-2 text-[11px] text-error-600 dark:text-error-400 font-bold">
                <AlertTriangle className="w-3 h-3" />
                {language === 'tr' ? 'SÜRE DOLDU!' : 'TIME EXPIRED!'}
              </div>
            )}

            {/* Checklist */}
            <button
              onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
              className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-secondary-600 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700"
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                {t.checklist} ({completedCount}/{project.tasks.length})
              </div>
              {isChecklistExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isChecklistExpanded && (
              <div className="p-3 space-y-2">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      task.completed
                        ? "bg-success-50 dark:bg-success-900/10 border-success-200 dark:border-success-800/30 opacity-75"
                        : "bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700"
                    )}
                  >
                    <div className="mt-0.5">
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-success-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-secondary-300 dark:text-secondary-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-bold",
                          task.completed ? "text-success-600 dark:text-success-400 line-through" : "text-secondary-700 dark:text-secondary-200"
                        )}>
                          {task.title[language]}
                        </span>
                        <span className="text-[10px] font-black bg-secondary-100 dark:bg-secondary-700 px-1.5 py-0.5 rounded text-secondary-500">
                          {task.weight} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary-500 dark:text-secondary-400 leading-relaxed">
                        {task.description[language]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!isFinishedState && !isOverTime && (
          <div className="p-3 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700">
            <Button
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold h-9 rounded-lg"
              onClick={() => {
                if (window.confirm(language === 'tr' ? 'Sınavı bitirmek istediğinize emin misiniz?' : 'Are you sure you want to finish the exam?')) {
                  setHasAutoFinished(true);
                  onFinish?.();
                }
              }}
            >
              {t.finishExam}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
