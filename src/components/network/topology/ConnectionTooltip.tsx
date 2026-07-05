import React from 'react';

export interface ConnectionTooltipProps {
  connectionTooltip: {
    visible: boolean;
    x: number;
    y: number;
    cableType: string;
    sourceDeviceName: string;
    sourcePort: string;
    targetPort: string;
    targetDeviceName: string;
    statusMessage: string;
  };
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

  return (
    <div
      className={`fixed z-[100] pointer-events-none transition-opacity duration-300 ${connectionTooltip.visible ? 'opacity-100' : 'opacity-0'
        }`}
      style={{
        left: connectionTooltip.x,
        top: connectionTooltip.y - 10,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div
        className={`px-3 py-2 rounded-xl border liquid-glass-strong animate-scale-in shadow-2xl ${isDark
          ? 'border-secondary-700/50 text-white shadow-accent-500/10'
          : 'border-secondary-200/50 text-secondary-900 shadow-secondary-200/50'
          }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full"
            style={{ backgroundColor: CABLE_COLORS[connectionTooltip.cableType]?.primary || '#3b82f6' }}
          />
          <span className="text-[10px] font-black tracking-widest opacity-60">
            {connectionTooltip.cableType === 'straight' ? (language === 'tr' ? 'Düz Kablo' : 'Straight') :
              connectionTooltip.cableType === 'crossover' ? (language === 'tr' ? 'Çapraz Kablo' : 'Crossover') :
                connectionTooltip.cableType === 'console' ? (language === 'tr' ? 'Konsol Kablosu' : 'Console') :
                  connectionTooltip.cableType === 'serial' ? (language === 'tr' ? 'Seri Kablo' : 'Serial') :
                    connectionTooltip.cableType === 'wireless' ? (language === 'tr' ? 'Kablosuz' : 'Wireless') :
                      connectionTooltip.cableType}
          </span>
        </div>
        <div className="text-xs font-bold" style={{ color: CABLE_COLORS[connectionTooltip.cableType]?.primary || '#3b82f6' }}>
          <span className="opacity-90">{connectionTooltip.sourceDeviceName}</span>
          <span className="mx-1 opacity-70">{connectionTooltip.sourcePort}</span>
          <span className="mx-1 opacity-50">↔</span>
          <span className="mx-1 opacity-70">{connectionTooltip.targetPort}</span>
          <span className="opacity-90">{connectionTooltip.targetDeviceName}</span>
        </div>
        <div className={`text-[10px] mt-1 font-semibold ${connectionTooltip.statusMessage === (language === 'tr' ? 'Bağlantı sorunsuz' : 'Connection OK') ? 'text-success-500' : 'text-error-500'}`}>
          {connectionTooltip.statusMessage}
        </div>
        {/* Arrow */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isDark ? 'border-t-secondary-800' : 'border-t-white'
          }`} />
      </div>
    </div>
  );
};
