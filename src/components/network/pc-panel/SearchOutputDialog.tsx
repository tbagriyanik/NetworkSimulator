'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WINDOW_CLOSE_BUTTON_CLASS } from '@/components/ui/windowStandards';

interface SearchOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  labels: {
    searchOutputTitle: string;
    searchOutputDescription: string;
    searchPlaceholder: string;
    close: string;
    noResultsFound: string;
  };
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  matchIndex?: number;
  matchCount?: number;
}

const DEFAULT_WIDTH = 360;

export function SearchOutputDialog({
  open,
  onOpenChange,
  isDark,
  labels,
  searchQuery,
  onSearchQueryChange,
  onNext,
  onPrev,
  matchIndex = -1,
  matchCount = 0,
}: SearchOutputDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    return { x: Math.max(12, w - DEFAULT_WIDTH - 16), y: Math.min(24, Math.max(12, h - 240)) };
  });
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0, dragging: false });

  // Escape only closes the search popup, never bubbles to close the CLI/CMD window
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [open, onOpenChange]);

  // Focus the input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [role="button"]')) return;
    if (!popupRef.current) return;
    e.preventDefault();
    document.body.style.userSelect = 'none';
    const rect = popupRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = rect.left;
    const origY = rect.top;
    dragRef.current = { startX, startY, origX, origY, dragging: true };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current.dragging || !popupRef.current) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      popupRef.current.style.left = `${origX + dx}px`;
      popupRef.current.style.top = `${origY + dy}px`;
    };
    const onUp = () => {
      document.body.style.userSelect = '';
      if (!dragRef.current.dragging || !popupRef.current) return;
      dragRef.current.dragging = false;
      const finalX = Math.max(8, Math.min(window.innerWidth - 200, popupRef.current.getBoundingClientRect().left));
      const finalY = Math.max(8, Math.min(window.innerHeight - 56, popupRef.current.getBoundingClientRect().top));
      setPos({ x: finalX, y: finalY });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  if (!open) return null;

  const hasMatches = matchCount > 0;
  const current = hasMatches && matchIndex >= 0 ? matchIndex + 1 : 0;

  const popup = (
    <div
      ref={popupRef}
      role="dialog"
      aria-label={labels.searchOutputTitle}
      className={cn(
        'fixed z-[10000] flex flex-col w-[min(360px,calc(100vw-24px))] rounded-xl border shadow-2xl overflow-hidden',
        isDark ? 'bg-secondary-900 border-secondary-700 text-white' : 'bg-white border-secondary-200'
      )}
      style={pos ? { left: pos.x, top: pos.y } : { right: 16, top: 24 }}
    >
      {/* Header - drag handle */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-3 py-2 border-b select-none cursor-grab active:cursor-grabbing touch-none',
          isDark ? 'border-secondary-700 bg-secondary-800' : 'border-secondary-200 bg-secondary-50'
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={handleDragStart}
      >
        <span className={cn('text-xs font-semibold truncate', isDark ? 'text-secondary-200' : 'text-secondary-800')}>
          {labels.searchOutputTitle}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
          className={WINDOW_CLOSE_BUTTON_CLASS}
          aria-label={labels.close}
          title={labels.close}
        >
          <X className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        <p className={cn('text-[11px] leading-snug', isDark ? 'text-secondary-400' : 'text-secondary-500')}>
          {labels.searchOutputDescription}
        </p>
        <div className="relative">
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) onPrev?.();
                else onNext?.();
              }
            }}
            placeholder={labels.searchPlaceholder}
            className="pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange('')}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors',
                isDark ? 'hover:bg-secondary-700 text-secondary-400' : 'hover:bg-secondary-200 text-secondary-500'
              )}
              aria-label={labels.close}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={cn('tabular-nums', isDark ? 'text-secondary-300' : 'text-secondary-600')}>
              {current}/{matchCount || 0}
            </span>
            {searchQuery.trim() && !hasMatches && (
              <span className={cn('font-sans', isDark ? 'text-error-400' : 'text-error-600')}>{labels.noResultsFound}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={onPrev}
              disabled={!hasMatches}
              className={cn('h-8 w-8 rounded-lg', isDark ? 'text-secondary-300 hover:text-white' : 'text-secondary-600 hover:text-secondary-900')}
              title="Shift+Enter"
              aria-label="Previous match"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onNext}
              disabled={!hasMatches}
              className={cn('h-8 w-8 rounded-lg', isDark ? 'text-secondary-300 hover:text-white' : 'text-secondary-600 hover:text-secondary-900')}
              title="Enter"
              aria-label="Next match"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(popup, document.body) : null;
}