'use client';

import { useMemo, useState, useEffect } from 'react';
import { Trophy, X, Clock, BookOpen, FileText, GraduationCap } from 'lucide-react';
import { useDrag } from '@/hooks/useDrag';
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
  type: 'session' | 'project' | 'guided-lesson' | 'exam';
  label: string;
  date: string;
  detail: string;
  scoreText?: string;
  iconColor: string;
}

export function BasarilarimPanel({ t, language, isDark, onClose, zIndex }: BasarilarimPanelProps) {
  const { containerRef, handleDragStart, position, setPosition } = useDrag({
    storageKey: 'basarilarim-panel-pos',
    defaultPosition: { x: 16, y: 96 },
    origin: 'bottom-right',
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
        iconColor: 'text-blue-500',
      });
    }

    for (const p of summary.projects) {
      result.push({
        type: 'project',
        label: t.projectSaved,
        date: p.lastDate,
        detail: p.name,
        iconColor: 'text-cyan-500',
      });
    }

    for (const l of summary.guidedLessons) {
      result.push({
        type: 'guided-lesson',
        label: t.guidedLesson,
        date: l.completedAt,
        detail: l.name,
        scoreText: `${l.points}/${l.totalPoints}`,
        iconColor: 'text-emerald-500',
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

    result.sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return result;
  }, [t, refreshKey]);

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
  };

  return (
    <div
      ref={containerRef}
      className={cn("hidden md:block fixed animate-scale-in")}
      style={{ bottom: `${position.y}px`, right: `${position.x}px`, zIndex }}
    >
      <div className={`rounded-2xl border shadow-2xl w-[340px] flex flex-col backdrop-blur-md ${isDark ? 'bg-zinc-950/40 border-zinc-800/50 shadow-black/40' : 'bg-white/40 border-zinc-200/50 shadow-zinc-200/50'}`}>
        <div
          className={`flex items-center justify-between px-3 py-2 border-b cursor-grab active:cursor-grabbing select-none shrink-0 ${isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'}`}
          onPointerDown={handleDragStart}
        >
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.basarilarim}</span>
          </div>
          <TooltipWrapper title={t.close}>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-5 h-5 rounded-md bg-red-500 hover:bg-red-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0">
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
        <div className="overflow-y-auto max-h-[280px] custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Trophy className="w-8 h-8 text-slate-400 mb-2" />
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.basarilarimEmpty}</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {items.map((item, i) => {
                const Icon = IconMap[item.type];
                return (
                  <div key={`${item.type}-${i}`} className={`flex items-start gap-2 p-2 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} transition-colors`}>
                    <div className={`mt-0.5 ${item.iconColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                        {item.date && (
                          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{formatDate(item.date, language)}</span>
                        )}
                      </div>
                      <span className={`text-xs truncate block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.detail}</span>
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
      </div>
    </div>
  );
}
