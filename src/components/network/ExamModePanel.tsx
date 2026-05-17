'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  GripHorizontal,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  GraduationCap,
  Settings,
  Move,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import { ExamProject, ExamTask } from '@/lib/network/examMode';
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
  deviceAccessed?: 'switch' | 'router' | 'pc' | null;
  deviceState?: any;
  topologyConnections?: any[];
  topologyDevices?: any[];
  onCheckTasks?: (context: {
    lastCommand?: string;
    deviceAccessed?: 'switch' | 'router' | 'pc' | null;
    deviceState?: any;
    topologyConnections?: any[];
    topologyDevices?: any[];
  }) => void;
  onOpenEditor?: () => void;
}

export function ExamModePanel({
  project,
  onClose,
  onMinimize,
  isMinimized,
  score,
  isFinished = false,
  onFinish,
  lastCommand,
  deviceAccessed,
  deviceState,
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timeLeft, setTimeLimit] = useState<number | null>(null);

  const isFinishedState = isFinished || !!project?.finishedAt;

  useEffect(() => {
    if (!project?.startedAt) return;

    const limitSec = project.durationMinutes * 60;

    const update = () => {
      const diff = Math.floor((Date.now() - new Date(project.startedAt!).getTime()) / 1000);
      setElapsedSeconds(diff);
      setTimeLimit(Math.max(0, limitSec - diff));
    };

    if (isFinishedState && project.finishedAt) {
      const diff = Math.floor((new Date(project.finishedAt).getTime() - new Date(project.startedAt).getTime()) / 1000);
      setElapsedSeconds(diff);
      setTimeLimit(Math.max(0, limitSec - diff));
      return;
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [project?.startedAt, project?.durationMinutes, project?.finishedAt, isFinishedState]);

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
    setPosition({ x: Math.max(0, window.innerWidth - panelWidth - 16), y: 80 });
  }, [isMobile]);

  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Auto-check tasks when context changes
  useEffect(() => {
    if (onCheckTasks && project && !isFinishedState) {
        onCheckTasks({
          lastCommand,
          deviceAccessed,
          deviceState,
          topologyConnections,
          topologyDevices
        });
    }
  }, [lastCommand, deviceAccessed, deviceState, topologyConnections, topologyDevices, onCheckTasks, project, isFinishedState]);

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
        setTimeout(() => setHasDragged(false), 100);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
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
            "flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border-2 cursor-default transition-all",
            "bg-gradient-to-r from-rose-500 to-rose-600 border-rose-400 text-white",
            isOverTime && "animate-pulse from-red-600 to-red-700"
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
          "flex flex-col rounded-xl shadow-2xl border overflow-hidden",
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl",
          "border-slate-200 dark:border-slate-700",
          "max-h-full"
        )}
      >
        {/* Header */}
        <div
          data-drag-handle
          className={cn(
            "flex items-center justify-between p-4 bg-gradient-to-r text-white",
            "cursor-default select-none",
            isFinishedState
              ? "from-emerald-500 to-emerald-600"
              : isOverTime
                ? "from-red-600 to-red-700"
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center py-3">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{t.score}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-500">{score}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="flex flex-col items-center py-3">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{t.examTime}</span>
            <div className={cn("flex items-center gap-1.5", isOverTime && "text-red-500 animate-pulse")}>
              <Clock className="w-4 h-4" />
              <span className="text-xl font-mono font-bold">
                {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
              </span>
            </div>
          </div>
        </div>

        {/* Overtime Alert */}
        {isOverTime && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2 text-[11px] text-red-600 dark:text-red-400 font-bold">
                <AlertTriangle className="w-3 h-3" />
                {language === 'tr' ? 'SÜRE DOLDU!' : 'TIME EXPIRED!'}
            </div>
        )}

        {/* Checklist */}
        <div className="flex-1 overflow-hidden flex flex-col">
        <Collapsible open={isChecklistExpanded} onOpenChange={setIsChecklistExpanded}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                {t.checklist} ({completedCount}/{project.tasks.length})
              </div>
              {isChecklistExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-3 space-y-2">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-all",
                      task.completed
                        ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30 opacity-75"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <div className="mt-0.5">
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          "text-xs font-bold",
                          task.completed ? "text-green-600 dark:text-green-400 line-through" : "text-slate-700 dark:text-slate-200"
                        )}>
                          {task.title[language]}
                        </span>
                        <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500">
                          {task.weight} pts
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {task.description[language]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          {isFinishedState ? (
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 rounded-lg"
              onClick={onClose}
            >
              {language === 'tr' ? 'Kapat' : 'Close'}
            </Button>
          ) : (
            <Button
              className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold h-9 rounded-lg"
              onClick={() => {
                  if (window.confirm(language === 'tr' ? 'Sınavı bitirmek istediğinize emin misiniz?' : 'Are you sure you want to finish the exam?')) {
                      onFinish?.();
                  }
              }}
            >
              {t.finishExam}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
