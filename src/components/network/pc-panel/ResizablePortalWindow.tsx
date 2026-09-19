'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraphicsQuality } from '@/lib/store/appStore';

export type WindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type ResizeSide = 'left' | 'right' | 'top' | 'bottom' | 'nw' | 'ne' | 'sw' | 'se';

type ResizeState = {
  side: ResizeSide;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originW: number;
  originH: number;
};

export const clampWindow = (
  win: WindowState,
  minW = 280,
  minH = 150
): WindowState => {
  if (typeof window === 'undefined') return win;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const width = Math.min(vw, Math.max(minW, win.width));
  const height = Math.min(vh, Math.max(minH, win.height));

  const x = Math.max(0, Math.min(win.x, vw - 120));
  const y = Math.max(0, Math.min(win.y, vh - 60));

  return { x, y, width, height };
};

export interface ResizablePortalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  isDark?: boolean;
  isMobile?: boolean;
  windowState?: WindowState;
  onWindowStateChange?: (newState: WindowState) => void;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  headerContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerBar?: React.ReactNode;
  borderColorClass?: string;
  headerBgClass?: string;
  children: React.ReactNode;
}

export function ResizablePortalWindow({
  isOpen,
  onClose,
  title,
  icon,
  isDark = true,
  isMobile = false,
  windowState: externalWindowState,
  onWindowStateChange,
  defaultWidth = 800,
  defaultHeight = 550,
  minWidth = 320,
  minHeight = 200,
  headerContent,
  headerActions,
  footerBar,
  borderColorClass,
  headerBgClass,
  children,
}: ResizablePortalWindowProps) {
  const graphicsQuality = useGraphicsQuality();
  const [mounted, setMounted] = useState(false);

  const getDefaultState = (): WindowState => {
    if (typeof window === 'undefined') {
      return { x: 50, y: 50, width: defaultWidth, height: defaultHeight };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(vw - 24, defaultWidth);
    const h = Math.min(vh - 24, defaultHeight);
    return {
      x: Math.max(12, Math.round((vw - w) / 2)),
      y: Math.max(12, Math.round((vh - h) / 2)),
      width: w,
      height: h,
    };
  };

  const initialWinState = externalWindowState || getDefaultState();

  const [localWindow, setLocalWindow] = useState<WindowState>(initialWinState);
  const localDragRef = useRef<DragState | null>(null);
  const localResizeRef = useRef<ResizeState | null>(null);
  const localWindowRef = useRef<WindowState>(initialWinState);
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (externalWindowState) {
      const clamped = clampWindow(externalWindowState, minWidth, minHeight);
      setLocalWindow(clamped);
      localWindowRef.current = clamped;
    }
  }, [externalWindowState?.x, externalWindowState?.y, externalWindowState?.width, externalWindowState?.height, minWidth, minHeight]);

  useEffect(() => {
    if (isOpen) {
      const clamped = clampWindow(localWindowRef.current, minWidth, minHeight);
      setLocalWindow(clamped);
      localWindowRef.current = clamped;
      onWindowStateChange?.(clamped);
    }
  }, [isOpen]);

  // Handle mobile back button and escape key
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleMobileBack = () => {
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mobile-back-pressed', handleMobileBack);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (localDragRef.current) {
        const state = localDragRef.current;
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;

        const rawX = state.originX + dx;
        const rawY = state.originY + dy;
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

        const clampedX = Math.max(0, Math.min(rawX, vw - 120));
        const clampedY = Math.max(0, Math.min(rawY, vh - 60));

        localWindowRef.current = {
          ...localWindowRef.current,
          x: clampedX,
          y: clampedY,
        };
        if (windowRef.current) {
          windowRef.current.style.left = `${clampedX}px`;
          windowRef.current.style.top = `${clampedY}px`;
          windowRef.current.style.transform = '';
        }
      } else if (localResizeRef.current) {
        const state = localResizeRef.current;
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;

        const minW = minWidth;
        const minH = minHeight;
        const next = { ...localWindowRef.current };
        if (state.side === 'bottom') next.height = Math.max(minH, state.originH + dy);
        else if (state.side === 'right') next.width = Math.max(minW, state.originW + dx);
        else if (state.side === 'top') {
          const nh = Math.max(minH, state.originH - dy);
          next.height = nh;
          next.y = Math.max(0, state.originY - (nh - state.originH));
        } else if (state.side === 'left') {
          const nw = Math.max(minW, state.originW - dx);
          next.width = nw;
          next.x = Math.max(0, state.originX - (nw - state.originW));
        } else if (state.side === 'se') {
          next.width = Math.max(minW, state.originW + dx);
          next.height = Math.max(minH, state.originH + dy);
        } else if (state.side === 'sw') {
          const nw = Math.max(minW, state.originW - dx);
          next.width = nw;
          next.x = Math.max(0, state.originX - (nw - state.originW));
          next.height = Math.max(minH, state.originH + dy);
        } else if (state.side === 'ne') {
          const nh = Math.max(minH, state.originH - dy);
          next.width = Math.max(minW, state.originW + dx);
          next.height = nh;
          next.y = Math.max(0, state.originY - (nh - state.originH));
        } else if (state.side === 'nw') {
          const nwW = Math.max(minW, state.originW - dx);
          const nwH = Math.max(minH, state.originH - dy);
          next.width = nwW;
          next.x = Math.max(0, state.originX - (nwW - state.originW));
          next.height = nwH;
          next.y = Math.max(0, state.originY - (nwH - state.originH));
        }

        localWindowRef.current = next;
        if (windowRef.current) {
          windowRef.current.style.width = `${next.width}px`;
          windowRef.current.style.height = `${next.height}px`;
          windowRef.current.style.left = `${next.x}px`;
          windowRef.current.style.top = `${next.y}px`;
        }
      }
    };

    const handleUp = () => {
      const clamped = clampWindow(localWindowRef.current, minWidth, minHeight);
      localWindowRef.current = clamped;

      if (windowRef.current) {
        windowRef.current.style.left = `${clamped.x}px`;
        windowRef.current.style.top = `${clamped.y}px`;
        windowRef.current.style.width = `${clamped.width}px`;
        windowRef.current.style.height = `${clamped.height}px`;
        windowRef.current.style.transform = '';
      }
      setLocalWindow(clamped);

      if (localDragRef.current) {
        localDragRef.current = null;
      }
      if (localResizeRef.current) {
        localResizeRef.current = null;
      }
      onWindowStateChange?.(clamped);
    };

    const handleResize = () => {
      const clamped = clampWindow(localWindowRef.current, minWidth, minHeight);
      setLocalWindow(clamped);
      localWindowRef.current = clamped;
      onWindowStateChange?.(clamped);
      if (windowRef.current) {
        windowRef.current.style.width = `${clamped.width}px`;
        windowRef.current.style.height = `${clamped.height}px`;
        windowRef.current.style.left = `${clamped.x}px`;
        windowRef.current.style.top = `${clamped.y}px`;
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [onWindowStateChange, minWidth, minHeight]);

  if (!isOpen || !mounted) return null;

  const startResize = (side: ResizeSide, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    localResizeRef.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      originX: localWindow.x,
      originY: localWindow.y,
      originW: localWindow.width,
      originH: localWindow.height,
    };
  };

  const isLowGraphics = graphicsQuality === 'low';

  const defaultBorder = isLowGraphics
    ? (isDark ? 'border-secondary-700 bg-secondary-950 text-secondary-100' : 'border-secondary-300 bg-white text-secondary-900')
    : (borderColorClass || (isDark ? 'border-secondary-700 bg-secondary-900 text-secondary-100' : 'border-secondary-300 bg-white text-secondary-900'));

  const defaultHeaderBg = isLowGraphics
    ? (isDark ? 'border-secondary-800 bg-secondary-900 text-secondary-100' : 'border-secondary-300 bg-secondary-100 text-secondary-900')
    : (headerBgClass || (isDark ? 'border-secondary-800 bg-secondary-950 text-secondary-100' : 'border-secondary-200 bg-secondary-50 text-secondary-900'));

  return createPortal(
    <div
      data-portal-window="true"
      data-portal-overlay="true"
      className="fixed inset-0 z-[9999] pointer-events-auto bg-transparent"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={windowRef}
        className="absolute"
        style={{
          left: localWindow.x,
          top: localWindow.y,
          width: localWindow.width,
          maxWidth: isMobile ? 'calc(100vw - 16px)' : 'none',
          height: localWindow.height,
          willChange: 'transform',
          contain: 'layout style paint',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        tabIndex={-1}
      >
        <div
          className={`h-full w-full rounded-2xl border ${defaultBorder} flex flex-col overflow-hidden ${isLowGraphics ? '' : 'shadow-2xl'}`}
          style={{ borderWidth: isLowGraphics ? 1 : 3, boxShadow: isLowGraphics ? 'none' : undefined, willChange: 'auto', contain: 'layout style paint' }}
        >
          {/* Window Header */}
          <div
            className={`flex items-center justify-between px-4 py-2 border-b cursor-grab active:cursor-grabbing select-none touch-none ${defaultHeaderBg}`}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('input, textarea, select, button')) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              localDragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                originX: localWindow.x,
                originY: localWindow.y,
              };
            }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {icon || <span className={`w-2.5 h-2.5 rounded-full bg-success-500 ${isLowGraphics ? '' : 'animate-pulse'} shrink-0`} />}
              {headerContent ? (
                headerContent
              ) : (
                <span className="text-[10px] sm:text-sm font-semibold truncate">{title}</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              {headerActions}
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-6 w-6 shrink-0 rounded-md bg-error-500 text-white hover:bg-error-600 hover:text-white active:scale-95 transition-all shadow-sm border border-error-600/30"
                aria-label="Kapat"
              >
                <X className="w-3.5 h-3.5 stroke-[3]" />
              </Button>
            </div>
          </div>

          {/* Window Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col" style={{ contain: 'layout style paint' }}>
            {children}
          </div>

          {/* Optional Footer Bar */}
          {footerBar}

          {/* Resize Handles */}
          {!isMobile && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize select-none touch-none z-10" onPointerDown={(e) => startResize('left', e)} />
              <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize select-none touch-none z-10" onPointerDown={(e) => startResize('right', e)} />
              <div className="absolute left-0 right-0 top-0 h-1 cursor-ns-resize select-none touch-none z-10" onPointerDown={(e) => startResize('top', e)} />
              <div className="absolute left-0 right-0 bottom-0 h-1 cursor-ns-resize select-none touch-none z-10" onPointerDown={(e) => startResize('bottom', e)} />
              <div className="absolute left-0 top-0 w-3 h-3 cursor-nw-resize select-none touch-none z-10" onPointerDown={(e) => startResize('nw', e)} />
              <div className="absolute right-0 top-0 w-3 h-3 cursor-ne-resize select-none touch-none z-10" onPointerDown={(e) => startResize('ne', e)} />
              <div className="absolute left-0 bottom-0 w-3 h-3 cursor-sw-resize select-none touch-none z-10" onPointerDown={(e) => startResize('sw', e)} />
              <div className="absolute right-0 bottom-0 w-3 h-3 cursor-se-resize select-none touch-none z-10" onPointerDown={(e) => startResize('se', e)} />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
