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
  const pad = 6;
  const w = deviceWidth + pad * 2;
  const h = deviceHeight + pad * 2;
  const x = -pad;
  const y = -pad;
  const rx = 12;

  return (
    <>
      <defs>
        <filter id="selectionGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={SELECTION_HIGHLIGHT_COLOR} floodOpacity="0.4" />
        </filter>
      </defs>
      {device.type === 'firewall' ? (
        <>
          <path
            d={`M ${pad} ${y} L ${deviceWidth - pad} ${y} Q ${w - pad} ${y} ${w - pad} ${pad} L ${w - pad} ${deviceHeight - 8} L ${deviceWidth / 2} ${h - pad} L ${x} ${deviceHeight - 8} L ${x} ${pad} Q ${x} ${y} ${pad} ${y} Z`}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="3.5"
            opacity="0.75"
            filter="url(#selectionGlowFilter)"
            className="selection-glow"
          />
          <path
            d={`M ${pad} ${y} L ${deviceWidth - pad} ${y} Q ${w - pad} ${y} ${w - pad} ${pad} L ${w - pad} ${deviceHeight - 8} L ${deviceWidth / 2} ${h - pad} L ${x} ${deviceHeight - 8} L ${x} ${pad} Q ${x} ${y} ${pad} ${y} Z`}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="1.5"
            opacity="0.4"
            className="selection-glow-outer"
          />
        </>
      ) : device.type === 'router' ? (
        <>
          {/* Rounded rectangle highlight matching router shape */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={16}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="3.5"
            opacity="0.75"
            filter="url(#selectionGlowFilter)"
            className="selection-glow"
          />
          <rect
            x={x - 2}
            y={y - 2}
            width={w + 4}
            height={h + 4}
            rx={18}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="1.5"
            opacity="0.4"
            className="selection-glow-outer"
          />
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
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="3.5"
            opacity="0.75"
            filter="url(#selectionGlowFilter)"
            className="selection-glow"
          />
          <rect
            x={x - 2}
            y={y - 2}
            width={w + 4}
            height={h + 4}
            rx={rx + 2}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="1.5"
            opacity="0.4"
            className="selection-glow-outer"
          />
        </>
      ) : isSwitchDeviceType(device.type) ? (
        <>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={8}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="3.5"
            opacity="0.75"
            filter="url(#selectionGlowFilter)"
            className="selection-glow"
          />
          <rect
            x={x - 2}
            y={y - 2}
            width={w + 4}
            height={h + 4}
            rx={10}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="1.5"
            opacity="0.4"
            className="selection-glow-outer"
          />
        </>
      ) : (
        <>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="3.5"
            opacity="0.75"
            filter="url(#selectionGlowFilter)"
            className="selection-glow"
          />
          <rect
            x={x - 2}
            y={y - 2}
            width={w + 4}
            height={h + 4}
            rx={rx + 2}
            fill="none"
            stroke={SELECTION_HIGHLIGHT_COLOR}
            strokeWidth="1.5"
            opacity="0.4"
            className="selection-glow-outer"
          />
        </>
      )}
    </>
  );
}
