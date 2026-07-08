'use client';

import { cn } from '@/lib/utils';
import { DEVICE_ICON_COLORS } from './networkTopology.constants';
import type { DeviceType } from './networkTopology.types';

export interface DeviceIconProps {
  type: DeviceType;
  className?: string;
  size?: number | string;
  color?: string;
  switchModel?: string;
  active?: boolean;
}

export function DeviceIcon({
  type,
  className,
  size = 24,
  color,
  switchModel,
  active = false
}: DeviceIconProps) {
  const defaultColor = color || (() => {
    if (type === 'pc') return DEVICE_ICON_COLORS.pc;
    if (type === 'iot') return DEVICE_ICON_COLORS.iot;
    if (type === 'firewall') return DEVICE_ICON_COLORS.firewall;
    if (type === 'router') return DEVICE_ICON_COLORS.router;
    if (type === 'wlc') return DEVICE_ICON_COLORS.wlc;
    if (type === 'switchL2') return DEVICE_ICON_COLORS.switchL2;
    if (type === 'switchL3') return (switchModel === 'WS-C3650-24PS' ? 'var(--color-purple-500)' : DEVICE_ICON_COLORS.switchL3);
    return DEVICE_ICON_COLORS[type as keyof typeof DEVICE_ICON_COLORS] ?? DEVICE_ICON_COLORS.pc;
  })();

  const strokeWidth = active ? 2 : 1.25;
  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: defaultColor,
    strokeWidth,
    className: cn(
      'transition-all duration-200',
        active && 'filter drop-shadow-[0_0_1px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.05)]',
      className
    )
  };

  switch (type) {
    case 'pc':
      return (
        <svg {...svgProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z"
          />
        </svg>
      );
    case 'iot':
      return (
        <svg {...svgProps}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.247 7.761a6 6 0 0 1 0 8.478" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.075 4.933a10 10 0 0 1 0 14.134" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.925 19.067a10 10 0 0 1 0-14.134" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.753 16.239a6 6 0 0 1 0-8.478" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case 'firewall':
      return (
        <svg {...svgProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 12 2 2 4-4"
          />
        </svg>
      );
    case 'router':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2"
          />
        </svg>
      );
    case 'switchL2':
    case 'switchL3':
      return (
        <svg {...svgProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      );
    case 'wlc':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      );
  }
}
