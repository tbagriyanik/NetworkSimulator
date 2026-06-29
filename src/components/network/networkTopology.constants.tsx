import { CableType } from '@/lib/network/types';
import { CanvasNote } from './networkTopology.types';

export const DEVICE_ICON_PATHS = {
  pc: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 0 0 2-2V5a2 2 0 0 0 -2-2H5a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2z',
  iot: {
    center: { cx: 12, cy: 12, r: 2 },
    ring1: { cx: 12, cy: 12, r: 5 },
    ring2: { cx: 12, cy: 12, r: 8 },
  },
  switch: 'M5 12h14M5 12a2 2 0 0 1 -2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2M5 12a2 2 0 0 0 -2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0 -2-2m-2-4h.01M17 16h.01',
  router: {
    circle: { cx: 12, cy: 12, r: 9 },
    paths: 'M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2'
  }
};

export const DEVICE_ICON_COLORS = {
  pc: 'var(--color-primary-500)',
  iot: '#d35400',
  switch: 'var(--color-accent-500)',
  switchL2: '#28a745',
  switchL3: '#6f42c1',
  router: '#6f42c1',
  firewall: '#b02a37',
  wlc: '#ffc107',
} as const;

export const DEVICE_ICONS = {
  pc: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.pc} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={DEVICE_ICON_PATHS.pc} />
    </svg>
  ),
  iot: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.iot} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.247 7.761a6 6 0 0 1 0 8.478" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.075 4.933a10 10 0 0 1 0 14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.925 19.067a10 10 0 0 1 0-14.134" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.753 16.239a6 6 0 0 1 0-8.478" />
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx="12" cy="12" r="2" />
    </svg>
  ),
  switch: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.switch} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={DEVICE_ICON_PATHS.switch} />
    </svg>
  ),
  switchL2: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.switchL2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={DEVICE_ICON_PATHS.switch} />
    </svg>
  ),
  switchL3: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.switchL3} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={DEVICE_ICON_PATHS.switch} />
    </svg>
  ),
  router: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.router} viewBox="0 0 24 24">
      <circle strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} cx={DEVICE_ICON_PATHS.router.circle.cx} cy={DEVICE_ICON_PATHS.router.circle.cy} r={DEVICE_ICON_PATHS.router.circle.r} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={DEVICE_ICON_PATHS.router.paths} />
    </svg>
  ),
  firewall: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.firewall} viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  ),
  wlc: (
    <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke={DEVICE_ICON_COLORS.wlc} viewBox="0 0 24 24" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M12 5l-2 2m2-2l2 2m-2 12l-2-2m2 2l2-2M5 12l2-2m-2 2l2 2M19 12l-2-2m2 2l-2 2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  ),
};

export const CABLE_COLORS: Record<CableType | 'error', { primary: string; bg: string; text: string; border: string }> = {
  straight: { primary: 'var(--color-primary-500)', bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30' },
  crossover: { primary: 'var(--color-warning-500)', bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30' },
  console: { primary: 'var(--color-accent-500)', bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  wireless: { primary: 'var(--color-warning-400)', bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30' },
  serial: { primary: 'var(--color-success-500)', bg: 'bg-lime-500', text: 'text-lime-400', border: 'border-lime-500/30' },
  error: { primary: 'var(--color-error-500)', bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30' },
};

export const DRAG_THRESHOLD = 5;
export const LONG_PRESS_DURATION = 500; // ms
export const TOOLTIP_DELAY = 150; // ms
export const TOOLTIP_OFFSET_Y = -15; // px
export const MOMENTUM_THRESHOLD = 8; // Velocity threshold for momentum scroll
export const MOMENTUM_DECAY = 0.92; // Exponential decay factor per frame
export const MOMENTUM_MIN_SPEED = 0.5; // Stop momentum when velocity falls below this

export const VIRTUAL_CANVAS_WIDTH_MOBILE = 3000;
export const VIRTUAL_CANVAS_HEIGHT_MOBILE = 2000;
export const VIRTUAL_CANVAS_WIDTH_DESKTOP = 3000;
export const VIRTUAL_CANVAS_HEIGHT_DESKTOP = 2000;

export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 4.0;
export const DEFAULT_ZOOM = 1.0;
export const NOTE_DEFAULT_WIDTH = 180;
export const NOTE_DEFAULT_HEIGHT = 120;
export const NOTE_HEADER_HEIGHT = 22;
export const NOTE_COLORS = [
  'var(--color-primary-500)', // Blue
  'var(--color-success-500)', // Emerald
  'var(--color-warning-600)', // Violet
  'var(--color-warning-400)', // Amber
  'var(--color-error-500)', // Red
  'var(--color-accent-500)', // Cyan
  'var(--color-accent-600)', // Pink
  'var(--color-secondary-500)', // Orange
  'var(--color-success-600)', // Lime
  'var(--color-secondary-400)', // Slate
  'var(--color-warning-700)', // Purple
  'var(--color-primary-400)', // Light Blue
  'var(--color-success-400)'  // Light Green
];
export const NOTE_FONTS_DESKTOP = [
  'Roboto',
  'Impact',
  'Verdana',
  'Trebuchet MS',
  'Courier New'
];
export const NOTE_FONTS_MOBILE = [
  'Roboto',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Arial'
];
export const NOTE_FONT_SIZES: Array<CanvasNote['fontSize']> = [10, 12, 16, 20];
export const NOTE_OPACITY: Array<CanvasNote['opacity']> = [0.25, 0.5, 0.75, 1];

// Port spacing constants
export const PC_PORT_SPACING = 18;
export const PORT_SPACING = 14;
export const PORT_ROW_SPACING = 14;
export const PORT_START_X = 14;
export const PORT_START_Y = 80;

// Port colors
export const PORT_COLORS = {
  ethernet: {
    connected: 'var(--color-primary-500)',
    disconnected: 'var(--color-primary-600)',
    shutdown: 'var(--color-error-500)',
    blocked: 'var(--color-accent-600)',  // Pink for STP blocked
  },
  console: {
    connected: 'var(--color-accent-500)',
    disconnected: 'var(--color-accent-600)',
    shutdown: 'var(--color-error-500)',
    blocked: 'var(--color-accent-600)',
  },
  gigabit: {
    connected: 'var(--color-secondary-500)',
    disconnected: 'var(--color-secondary-600)',
    shutdown: 'var(--color-error-500)',
    blocked: 'var(--color-accent-600)',  // Pink for STP blocked
  },
  serial: {
    connected: 'var(--color-success-500)',
    disconnected: 'var(--color-success-600)',
    shutdown: 'var(--color-error-500)',
    blocked: 'var(--color-accent-600)',
  },
} as const;

// Device status colors
export const STATUS_COLORS = {
  online: 'var(--color-success-500)',
  offline: 'var(--color-error-500)',
  error: 'var(--color-error-500)',
} as const;

// Stroke colors for device selection
export const STROKE_COLORS = {
  cyan: '#06b6d4',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  blue: '#3b82f6',
  slateLight: '#cbd5e1',
  slateDark: '#0f172a',
} as const;

// Selection highlight color for devices and notes
export const SELECTION_HIGHLIGHT_COLOR = '#5ad57d';
