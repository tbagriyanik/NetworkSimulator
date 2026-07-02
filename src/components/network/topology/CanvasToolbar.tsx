'use client';

import React from 'react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';

interface CanvasToolbarProps {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  resetView: () => void;
  handleZoomMouseDown: (e: React.MouseEvent) => void;
  handleZoomWheel: (e: React.WheelEvent) => void;
  isDraggingZoom: boolean;
  isDark: boolean;
  t: Record<string, string>;
  MIN_ZOOM: number;
  MAX_ZOOM: number;
}

export function CanvasToolbar({
  zoom,
  setZoom,
  setPan,
  canvasRef,
  resetView,
  handleZoomMouseDown,
  handleZoomWheel,
  isDraggingZoom,
  isDark,
  t,
  MIN_ZOOM,
  MAX_ZOOM
}: CanvasToolbarProps) {
  return (
    <div
      className={`fixed bottom-[60px] right-[10px] items-center gap-1 px-2 py-1 rounded-xl border ${
        isDark ? 'bg-slate-800/90 border-slate-700/50 shadow-lg' : 'bg-white/95 border-slate-200/60 shadow-md'
      } flex z-40`}
    >
      <TooltipWrapper
        title={
          <div className="flex items-center gap-2">
            <span>{t.zoomOut}</span>
            <ShortcutBadge shortcut="-" variant="primary" />
          </div>
        }
      >
        <button
          aria-label={t.zoomOut}
          onClick={() =>
            setZoom((z) => {
              const newZoom = Math.max(MIN_ZOOM, z - 0.25);
              if (!canvasRef.current) return newZoom;
              const rect = canvasRef.current.getBoundingClientRect();
              const cursorX = rect.width / 2;
              const cursorY = rect.height / 2;
              setPan((prevPan) => ({
                x: cursorX - (cursorX - prevPan.x) * (newZoom / z),
                y: cursorY - (cursorY - prevPan.y) * (newZoom / z),
              }));
              return newZoom;
            })
          }
          className={`w-7 h-7 flex items-center justify-center rounded ${
            isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          −
        </button>
      </TooltipWrapper>
      
      <button
        type="button"
        onClick={resetView}
        onMouseDown={handleZoomMouseDown}
        onWheel={handleZoomWheel}
        className={`text-xs font-mono w-12 text-center cursor-pointer select-none rounded transition-colors ${
          isDraggingZoom
            ? 'text-blue-400'
            : isDark
            ? 'text-slate-300 hover:bg-slate-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
        title={t.dragToZoomOrScroll}
      >
        {Math.round(zoom * 100)}%
      </button>

      <TooltipWrapper
        title={
          <div className="flex items-center gap-2">
            <span>{t.zoomIn}</span>
            <ShortcutBadge shortcut="+" variant="primary" />
          </div>
        }
      >
        <button
          aria-label={t.zoomIn}
          onClick={() =>
            setZoom((z) => {
              const newZoom = Math.min(MAX_ZOOM, z + 0.25);
              if (!canvasRef.current) return newZoom;
              const rect = canvasRef.current.getBoundingClientRect();
              const cursorX = rect.width / 2;
              const cursorY = rect.height / 2;
              setPan((prevPan) => ({
                x: cursorX - (cursorX - prevPan.x) * (newZoom / z),
                y: cursorY - (cursorY - prevPan.y) * (newZoom / z),
              }));
              return newZoom;
            })
          }
          className={`w-7 h-7 flex items-center justify-center rounded ${
            isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          +
        </button>
      </TooltipWrapper>
      
      <div className={`w-px h-5 ${isDark ? 'bg-slate-600' : 'bg-slate-300'} mx-1`} />
      
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={resetView}
            className={`px-2 py-1 text-xs rounded ui-hover-surface ${
              isDark ? 'text-slate-300 hover:text-slate-100' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.reset}
          </button>
        </TooltipTrigger>
        <TooltipContent className="flex items-center gap-2">
          <span>{t.reset}</span>
          <ShortcutBadge shortcut="Alt+R" variant="primary" />
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
