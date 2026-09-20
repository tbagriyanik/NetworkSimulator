'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Trophy, X, Clock, BookOpen, FileText, GraduationCap, Gamepad2 } from 'lucide-react';
import { useDrag } from '@/hooks/useDrag';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { getSummary } from '@/utils/achievementRecords';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn } from '@/lib/utils';
import type { Translations } from '@/contexts/LanguageContext';

interface BasarilarimPanelProps {
  t: Translations;
  language: 'tr' | 'en';
  isDark: boolean;
  onClose: () => void;
  zIndex: number;
}

function formatDate(iso: string, lang: 'tr' | 'en'): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}sn`;
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hrs > 0) return `${hrs}s ${mins}dk`;
  return `${mins}dk`;
}

interface FlatItem {
  type: 'session' | 'project' | 'guided-lesson' | 'exam' | 'story-campaign';
  label: string;
  date: string;
  detail: string;
  scoreText?: string;
  iconColor: string;
}

export function BasarilarimPanel({ t, language, isDark, onClose, zIndex }: BasarilarimPanelProps) {
  const isMobile = useIsMobile();
  const { containerRef, handleDragStart, position, setPosition } = useDrag({
    storageKey: 'basarilarim-panel-pos',
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-left',
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('basarilarim-updated', handler);
    return () => window.removeEventListener('basarilarim-updated', handler);
  }, []);

  const items = useMemo((): FlatItem[] => {
    void refreshKey; // re-run when notified
    const summary = getSummary();
    const result: FlatItem[] = [];

    if (summary.totalSessionSeconds > 0) {
      result.push({
        type: 'session',
        label: t.sessionDuration,
        date: '',
        detail: formatDuration(summary.totalSessionSeconds),
        iconColor: 'text-primary-500',
      });
    }

    for (const p of summary.projects) {
      result.push({
        type: 'project',
        label: t.projectSaved,
        date: p.lastDate,
        detail: p.name,
        iconColor: 'text-accent-500',
      });
    }

    for (const l of summary.guidedLessons) {
      result.push({
        type: 'guided-lesson',
        label: t.guidedLesson,
        date: l.completedAt,
        detail: l.name,
        scoreText: `${l.points}/${l.totalPoints}`,
        iconColor: 'text-success-500',
      });
    }

    for (const e of summary.exams) {
      result.push({
        type: 'exam',
        label: t.examResult,
        date: e.completedAt,
        detail: e.name,
        scoreText: `${e.score}/${e.maxScore}`,
        iconColor: 'text-purple-500',
      });
    }

    if (summary.storyCampaigns) {
      for (const sc of summary.storyCampaigns) {
        result.push({
          type: 'story-campaign',
          label: language === 'tr' ? 'Etkileşimli Senaryo' : 'Interactive Story',
          date: sc.completedAt,
          detail: sc.name,
          scoreText: `${sc.score} Pn · ${sc.rank}`,
          iconColor: 'text-amber-400',
        });
      }
    }

    result.sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [t, language, refreshKey]);

  // Clamp after content change so panel top stays inside viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const panelH = el.offsetHeight;
    if (panelH === 0) return;
    const topEdgeY = position.y + panelH;
    if (topEdgeY > window.innerHeight - 16) {
      setPosition({ x: position.x, y: Math.max(16, window.innerHeight - panelH - 16) });
    }
  }, [items, items.length]);

  const IconMap: Record<FlatItem['type'], typeof Clock> = {
    session: Clock,
    project: FileText,
    'guided-lesson': BookOpen,
    exam: GraduationCap,
    'story-campaign': Gamepad2,
  };

  const [size, setSize] = useState({ width: 340, height: 320 });
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ startX: 0, startY: 0, startW: 340, startH: 320 });

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
    document.body.style.cursor = 'se-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvt: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvt.clientX - resizeStartRef.current.startX;
      const deltaY = moveEvt.clientY - resizeStartRef.current.startY;
      const newW = Math.max(260, Math.min(600, resizeStartRef.current.startW + deltaX));
      const newH = Math.max(200, Math.min(600, resizeStartRef.current.startH + deltaY));
      setSize({ width: newW, height: newH });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      data-state="open"
      className={cn("fixed animate-scale-in")}
      style={{
        bottom: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: isMobile ? 9999 : zIndex,
        width: isMobile ? 'calc(100vw - 32px)' : `${size.width}px`,
        maxWidth: isMobile ? '360px' : undefined,
      }}
    >
      <div
        className={`rounded-2xl overflow-hidden border shadow-2xl ${isMobile ? 'w-full max-h-[70vh]' : 'w-full'} flex flex-col backdrop-blur-lg relative ${isDark ? 'bg-secondary-950/75 border-success-500/30 shadow-black/40' : 'bg-white/75 border-success-500/50 shadow-secondary-200/50'}`}
        style={{ height: isMobile ? undefined : `${size.height}px` }}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing select-none shrink-0 ${isDark ? 'bg-white/5 border-success-500/20' : 'bg-black/5 border-success-500/30'}`}
          onPointerDown={handleDragStart}
        >
          <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
            <Trophy className="w-4 h-4 text-warning-500 pointer-events-none" />
            <span className={`font-semibold text-sm pointer-events-none ${isDark ? 'text-secondary-100' : 'text-secondary-800'}`}>{t.basarilarim}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-6 h-6 rounded-md bg-error-500 hover:bg-error-600 active:scale-95 cursor-pointer transition-all inline-flex items-center justify-center shrink-0 shadow-sm border border-error-600/30">
              <X className="w-3 h-3 text-white stroke-[3] pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar", isMobile ? "max-h-[280px]" : "")}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Trophy className="w-8 h-8 text-secondary-400 mb-2" />
              <p className={`text-xs text-center ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>{t.basarilarimEmpty}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {items.map((item, i) => {
                const Icon = IconMap[item.type];
                return (
                  <div key={`${item.type}-${i}`} className={`flex items-start gap-2 p-2 rounded-lg text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}>
                    <div className={`mt-0.5 ${item.iconColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-[11px] font-semibold ${isDark ? 'text-secondary-300' : 'text-secondary-700'}`}>{item.label}</span>
                        {item.date && (
                          <span className={`text-[10px] ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>{formatDate(item.date, language)}</span>
                        )}
                      </div>
                      <span className={`text-xs truncate block text-left ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>{item.detail}</span>
                      {item.scoreText && (
                        <span className={`text-[10px] font-mono font-semibold ${item.iconColor}`}>{item.scoreText}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resize Handle for Desktop */}
        {!isMobile && (
          <div
            className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-end justify-end opacity-60 hover:opacity-100 transition-opacity z-50 select-none"
            onMouseDown={handleResizeStart}
            title="Boyutlandır"
          >
            <div className={cn("w-2.5 h-2.5 rounded-br-full border-b-2 border-r-2 bg-transparent", isDark ? "border-secondary-400" : "border-secondary-600")} />
          </div>
        )}
      </div>
    </div>
  );
}
