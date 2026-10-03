import React from 'react';

interface ConnectionTooltipState {
  x: number;
  y: number;
  sourceDeviceName: string;
  sourcePort: string;
  targetDeviceName: string;
  targetPort: string;
  cableType: string;
  statusMessage: string;
  visible: boolean;
}

interface ConnectionTooltipProps {
  connectionTooltip: ConnectionTooltipState | null;
  isDark: boolean;
  language: string;
  CABLE_COLORS: Record<string, { primary: string; bg: string; text: string; border: string }>;
}

export const ConnectionTooltip: React.FC<ConnectionTooltipProps> = ({
  connectionTooltip,
  isDark,
  language,
  CABLE_COLORS
}) => {
  if (!connectionTooltip || !connectionTooltip.visible) return null;

  const msg = connectionTooltip.statusMessage || '';
  const isOkStatus = msg.startsWith('⚡') || msg.includes('OK') || msg.includes('sorunsuz');
  const isWarningStatus = msg.startsWith('⚠️') || msg.startsWith('🟠');

  const statusBadgeStyle = isOkStatus
    ? (isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
    : isWarningStatus
      ? (isDark ? 'bg-amber-950/60 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200')
      : (isDark ? 'bg-rose-950/60 text-rose-400 border-rose-800/50' : 'bg-rose-50 text-rose-700 border-rose-200');

  const cableColor = CABLE_COLORS[connectionTooltip.cableType]?.primary || 'var(--color-primary-500)';

  return (
    <div
      className={`fixed z-[100] pointer-events-none transition-opacity duration-200 ${
        connectionTooltip.visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        left: connectionTooltip.x,
        top: connectionTooltip.y - 12,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div
        className={`px-3.5 py-2.5 rounded-xl border liquid-glass-light animate-scale-in shadow-2xl backdrop-blur-md ${
          isDark
            ? 'bg-secondary-950/90 border-secondary-700/60 text-white shadow-accent-500/10'
            : 'bg-white/95 border-secondary-200/80 text-secondary-900 shadow-secondary-400/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5 border-b pb-1 border-secondary-500/20">
          <span
            className="w-2.5 h-2.5 rounded-full shadow-sm"
            style={{ backgroundColor: cableColor }}
          />
          <span className="text-[11px] font-extrabold tracking-wider opacity-80 uppercase">
            {connectionTooltip.cableType === 'straight' ? (language === 'tr' ? 'Düz Kablo' : 'Straight Cable') :
              connectionTooltip.cableType === 'crossover' ? (language === 'tr' ? 'Çapraz Kablo' : 'Crossover Cable') :
                connectionTooltip.cableType === 'console' ? (language === 'tr' ? 'Konsol Kablosu' : 'Console Cable') :
                  connectionTooltip.cableType === 'serial' ? (language === 'tr' ? 'Seri Kablo' : 'Serial Cable') :
                    connectionTooltip.cableType === 'wireless' ? (language === 'tr' ? 'Kablosuz Bağlantı' : 'Wireless Connection') :
                      connectionTooltip.cableType}
          </span>
        </div>
        <div className="text-xs font-bold flex items-center justify-between gap-2 py-0.5" style={{ color: cableColor }}>
          <span className="opacity-95">{connectionTooltip.sourceDeviceName}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary-500/15 font-mono">{connectionTooltip.sourcePort}</span>
          <span className="opacity-60">↔</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-secondary-500/15 font-mono">{connectionTooltip.targetPort}</span>
          <span className="opacity-95">{connectionTooltip.targetDeviceName}</span>
        </div>
        <div className={`text-[11px] mt-1.5 font-bold font-mono flex items-center justify-center gap-1 px-2.5 py-1 rounded-md border ${statusBadgeStyle}`}>
          {connectionTooltip.statusMessage}
        </div>
        {/* Arrow */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${
          isDark ? 'border-t-secondary-800' : 'border-t-white'
        }`} />
      </div>
    </div>
  );
};
