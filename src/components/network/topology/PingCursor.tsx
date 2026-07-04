'use client';

import type { CanvasDevice } from '../networkTopology.types';

interface PingCursorProps {
  pingMode: boolean;
  pingCursorPos: { x: number; y: number } | null;
  pingSource: CanvasDevice | null;
  isDark: boolean;
  t: Record<string, string>;
}

export function PingCursor({
  pingMode,
  pingCursorPos,
  pingSource,
  isDark,
  t
}: PingCursorProps) {
  if (!pingMode || !pingCursorPos) return null;

  const bgClass = pingSource
    ? (isDark ? 'bg-yellow-500 text-white' : 'bg-yellow-400 text-white')
    : (isDark ? 'bg-primary-600 text-white' : 'bg-primary-500 text-white');

  return (
    <div
      className="fixed z-[200] pointer-events-none select-none"
      style={{ left: pingCursorPos.x + 16, top: pingCursorPos.y + 16 }}
    >
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-lg ${bgClass}`}>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        {pingSource ? t.selectTarget : t.selectSource}
      </div>
    </div>
  );
}
