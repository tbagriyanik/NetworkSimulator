'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export interface VirtualCursorState {
  visible: boolean;
  x: number;
  y: number;
  clicking: boolean;
  typingText?: string;
  actionLabel?: string;
}

export function VirtualCursorOverlay() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [cursor, setCursor] = useState<VirtualCursorState>({
    visible: false,
    x: 100,
    y: 100,
    clicking: false,
  });
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  useEffect(() => {
    const handleMove = (e: Event) => {
      const detail = (e as CustomEvent<Partial<VirtualCursorState>>).detail;
      setCursor(prev => ({
        ...prev,
        ...detail,
        visible: detail.visible !== undefined ? detail.visible : true,
      }));
    };

    const handleHide = () => {
      setCursor(prev => ({ ...prev, visible: false }));
    };

    const handleProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ active: boolean }>).detail;
      setIsSimulationActive(!!detail?.active);
    };

    window.addEventListener('virtual-cursor-move', handleMove);
    window.addEventListener('virtual-cursor-hide', handleHide);
    window.addEventListener('simulation-progress', handleProgress);

    return () => {
      window.removeEventListener('virtual-cursor-move', handleMove);
      window.removeEventListener('virtual-cursor-hide', handleHide);
      window.removeEventListener('simulation-progress', handleProgress);
    };
  }, []);

  // Block keypresses (except Escape) during simulation lock
  useEffect(() => {
    if (!isSimulationActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('simulation-stop'));
      }
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isSimulationActive]);

  return (
    <>
      {/* Simulation Lock Shield: Blocks user canvas zoom, device drag, clicks during active simulation */}
      {isSimulationActive && (
        <div
          className="fixed inset-0 z-[9990] bg-transparent cursor-wait pointer-events-auto select-none"
          onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
      )}

      {/* Virtual Cursor Animation */}
      {cursor.visible && (
        <div
          className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-start will-change-[left,top]"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Virtual Mouse Pointer */}
            <div className="relative">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                className={`drop-shadow-[0_4px_12px_rgba(59,130,246,0.5)] transition-transform duration-150 ${
                  cursor.clicking ? 'scale-75 translate-y-1' : 'scale-100 hover:scale-105'
                }`}
              >
                <path
                  d="M3 3l7.5 18 2.5-7 7-2.5L3 3z"
                  fill="var(--color-primary-500, #3b82f6)"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Click Ripple & Halo Effect */}
              {cursor.clicking && (
                <>
                  <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 border-primary-400 bg-primary-400/20 animate-ping pointer-events-none" />
                  <span className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-primary-500/40 blur-xs pointer-events-none" />
                </>
              )}
            </div>

            {/* Action Badge (Light / Dark theme adaptive) */}
            {cursor.actionLabel && (
              <div className={`mt-1 ml-4 px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-lg backdrop-blur-sm whitespace-nowrap animate-fade-in border ${
                isDark
                  ? 'bg-secondary-900/95 text-white border-secondary-700/80 shadow-black/40'
                  : 'bg-white/95 text-secondary-900 border-secondary-300 shadow-secondary-400/30'
              }`}>
                {cursor.actionLabel}
              </div>
            )}

            {/* Simulated Typing Indicator (Light / Dark theme adaptive) */}
            {cursor.typingText && (
              <div className={`mt-1 ml-4 px-2.5 py-1 rounded-md text-[11px] font-mono shadow-xl flex items-center gap-1.5 animate-pulse border ${
                isDark
                  ? 'bg-secondary-950 text-emerald-400 border-emerald-500/40 shadow-black/50'
                  : 'bg-white text-emerald-700 border-emerald-500/50 shadow-emerald-500/10'
              }`}>
                <span className="opacity-70">&gt;</span>
                <span className="font-semibold">{cursor.typingText}</span>
                <span className={`w-1.5 h-3 animate-bounce inline-block ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
