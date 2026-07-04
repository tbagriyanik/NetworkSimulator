'use client';

import type { CableType } from '@/lib/network/types';

interface CanvasOverlaysProps {
  isDark: boolean;
  language: string;
  connectionTooltip: {
    x: number;
    y: number;
    sourceDeviceName: string;
    sourcePort: string;
    targetDeviceName: string;
    targetPort: string;
    cableType: string;
    statusMessage: string;
    visible: boolean;
  } | null;
  errorToast: { message: string; details?: string; type?: 'success' | 'error' } | null;
  isDraggingInteractionDisabled: boolean;
  CABLE_COLORS: Record<CableType | 'error', { primary: string; bg: string; text: string; border: string }>;
}

export function CanvasOverlays({
  isDark,
  language,
  connectionTooltip,
  errorToast,
  isDraggingInteractionDisabled,
  CABLE_COLORS
}: CanvasOverlaysProps) {
  return (
    <>
      {/* Connection Tooltip */}
      {!isDraggingInteractionDisabled && connectionTooltip && connectionTooltip.visible && (
        <div
          className={`fixed z-[100] pointer-events-none transition-opacity duration-300 ${
            connectionTooltip.visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: connectionTooltip.x,
            top: connectionTooltip.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div
            className={`px-3 py-2 rounded-xl border liquid-glass-strong animate-scale-in shadow-2xl ${
              isDark
                ? 'border-secondary-700/50 text-white shadow-accent-500/10'
                : 'border-secondary-200/50 text-secondary-900 shadow-secondary-200/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: CABLE_COLORS[connectionTooltip.cableType as keyof typeof CABLE_COLORS]?.primary || '#3b82f6',
                }}
              />
              <span className="text-[10px] font-black tracking-widest opacity-60">
                {connectionTooltip.cableType === 'straight'
                  ? language === 'tr' ? 'Düz Kablo' : 'Straight'
                  : connectionTooltip.cableType === 'crossover'
                  ? language === 'tr' ? 'Çapraz Kablo' : 'Crossover'
                  : connectionTooltip.cableType === 'console'
                  ? language === 'tr' ? 'Konsol Kablosu' : 'Console'
                  : connectionTooltip.cableType === 'serial'
                  ? language === 'tr' ? 'Seri Kablo' : 'Serial'
                  : connectionTooltip.cableType === 'wireless'
                  ? language === 'tr' ? 'Kablosuz' : 'Wireless'
                  : connectionTooltip.cableType}
              </span>
            </div>
            <div
              className="text-xs font-bold"
              style={{
                color: CABLE_COLORS[connectionTooltip.cableType as keyof typeof CABLE_COLORS]?.primary || '#3b82f6',
              }}
            >
              <span className="opacity-90">{connectionTooltip.sourceDeviceName}</span>
              <span className="mx-1 opacity-70">{connectionTooltip.sourcePort}</span>
              <span className="mx-1 opacity-50">↔</span>
              <span className="mx-1 opacity-70">{connectionTooltip.targetPort}</span>
              <span className="opacity-90">{connectionTooltip.targetDeviceName}</span>
            </div>
            <div
              className={`text-[10px] mt-1 font-semibold ${
                connectionTooltip.statusMessage === (language === 'tr' ? 'Bağlantı sorunsuz' : 'Connection OK')
                  ? 'text-success-500'
                  : 'text-error-500'
              }`}
            >
              {connectionTooltip.statusMessage}
            </div>
            {/* Arrow */}
            <div
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${
                isDark ? 'border-t-secondary-800' : 'border-t-white'
              }`}
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {errorToast && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed bottom-4 left-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-40 ${
            errorToast.type === 'success'
              ? isDark
                ? 'bg-success-500/20 border border-success-500/50 text-success-300'
                : 'bg-success-50 border border-success-200 text-success-700'
              : isDark
              ? 'bg-error-500/20 border border-error-500/50 text-error-300'
              : 'bg-error-50 border border-error-200 text-error-700'
          }`}
        >
          {errorToast.message}
        </div>
      )}
    </>
  );
}
