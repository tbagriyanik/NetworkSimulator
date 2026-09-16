'use client';

import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { isSwitchDeviceType } from '../NetworkTopology/utils/networkTopology.helpers';
import { SELECTION_HIGHLIGHT_COLOR } from '../NetworkTopology/utils/networkTopology.constants';
import { colors } from '@/lib/design-tokens/colors';

interface DeviceSelectionGlowProps {
  device: CanvasDevice;
  deviceWidth: number;
  deviceHeight: number;
  isDark: boolean;
}

export function DeviceSelectionGlow({ device, deviceWidth, deviceHeight, isDark }: DeviceSelectionGlowProps) {
  return (
    <>
      <defs>
        <filter id="selectionGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={SELECTION_HIGHLIGHT_COLOR} floodOpacity="0.25" />
        </filter>
      </defs>
      {device.type === 'firewall' ? (
        <>
          <path d={`M 6 -4 L ${deviceWidth - 6} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight - 11} L ${deviceWidth / 2} ${deviceHeight + 4} L -4 ${deviceHeight - 11} L -4 6 Q -4 -4 6 -4 Z`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
          <path d={`M 6 -4 L ${deviceWidth - 6} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight - 11} L ${deviceWidth / 2} ${deviceHeight + 4} L -4 ${deviceHeight - 11} L -4 6 Q -4 -4 6 -4 Z`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
        </>
      ) : device.type === 'router' ? (
        <>
          <path d={`M ${16} -4 L ${deviceWidth - 16} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 16 L ${deviceWidth + 4} ${deviceHeight + 4} L -4 ${deviceHeight + 4} L -4 16 Q -4 -4 16 -4`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
          <path d={`M ${16} -4 L ${deviceWidth - 16} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 16 L ${deviceWidth + 4} ${deviceHeight + 4} L -4 ${deviceHeight + 4} L -4 16 Q -4 -4 16 -4`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
        </>
      ) : device.type === 'iot' ? (
        <>
          {device.iot?.sensorType === 'motion' && (
            <circle
              cx={deviceWidth / 2}
              cy={deviceHeight / 2}
              r={75}
              fill={colors.cables.wireless}
              fillOpacity={isDark ? 0.15 : 0.1}
              stroke={colors.cables.wireless}
              strokeOpacity={isDark ? 0.3 : 0.2}
              strokeWidth="1"
              strokeDasharray="4 2"
              style={{ pointerEvents: 'none' }}
            />
          )}
          <path d={`M -4 -4 L ${deviceWidth + 4 - 10} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
          <path d={`M -4 -4 L ${deviceWidth + 4 - 10} -4 Q ${deviceWidth + 4} -4 ${deviceWidth + 4} 6 L ${deviceWidth + 4} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
        </>
      ) : isSwitchDeviceType(device.type) ? (
        <>
          <path d={`M -4 -4 L ${deviceWidth + 4} -4 L ${deviceWidth + 4} ${deviceHeight + 4 - 10} Q ${deviceWidth + 4} ${deviceHeight + 4} ${deviceWidth + 4 - 10} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
          <path d={`M -4 -4 L ${deviceWidth + 4} -4 L ${deviceWidth + 4} ${deviceHeight + 4 - 10} Q ${deviceWidth + 4} ${deviceHeight + 4} ${deviceWidth + 4 - 10} ${deviceHeight + 4} L 6 ${deviceHeight + 4} Q -4 ${deviceHeight + 4} -4 ${deviceHeight + 4 - 10} L -4 -4 Z`} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
        </>
      ) : (
        <>
          <rect x="-4" y="-4" width={deviceWidth + 8} height={deviceHeight + 8} rx={10} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="4" opacity="0.5" filter="url(#selectionGlowFilter)" className="selection-glow" />
          <rect x="-4" y="-4" width={deviceWidth + 8} height={deviceHeight + 8} rx={10} fill="none" stroke={SELECTION_HIGHLIGHT_COLOR} strokeWidth="2" opacity="0.35" className="selection-glow-outer" />
        </>
      )}
    </>
  );
}
