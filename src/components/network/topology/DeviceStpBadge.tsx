'use client';

import { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { isSwitchDeviceType } from '../NetworkTopology/utils/networkTopology.helpers';

interface DeviceStpBadgeProps {
  device: CanvasDevice;
  deviceWidth: number;
  isDark: boolean;
  deviceStates?: Map<string, SwitchState>;
}

export function DeviceStpBadge({ device, deviceWidth, isDark, deviceStates }: DeviceStpBadgeProps) {
  if (!isSwitchDeviceType(device.type)) return null;

  const deviceState = deviceStates?.get(device.id);
  const defaultStp = deviceState?.stpState?.[1]; // VLAN 1 is default
  if (!defaultStp) return null;

  if (defaultStp.isRoot === true) {
    return (
      <g transform={`translate(${deviceWidth / 2}, 0)`}>
        <rect
          x="-22"
          y="-10"
          width="44"
          height="13"
          rx="3.5"
          fill="var(--color-warning-500)"
          stroke="var(--color-warning-400)"
          strokeWidth="1"
          className="animate-pulse"
        />
        <text
          y="-2.5"
          fill="var(--color-secondary-950)"
          fontSize="7.5"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          ğŸ‘‘ ROOT
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${deviceWidth / 2}, 0)`}>
      <rect
        x="-24"
        y="-10"
        width="48"
        height="13"
        rx="3.5"
        fill={isDark ? 'var(--color-secondary-800)' : 'var(--color-secondary-200)'}
        stroke={isDark ? 'var(--color-secondary-700)' : 'var(--color-secondary-300)'}
        strokeWidth="1"
      />
      <text
        y="-2.5"
        fill={isDark ? 'var(--color-secondary-200)' : 'var(--color-secondary-800)'}
        fontSize="6.5"
        fontWeight="semibold"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        Pri: {defaultStp.bridgeId.split('.')[0]}
      </text>
    </g>
  );
}
