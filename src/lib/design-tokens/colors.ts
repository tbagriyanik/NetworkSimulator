/**
 * Color Design Tokens
 * Centralized color tokens for UI, topology canvas, status indicators, and packet animations.
 */

export const colors = {
  // Status Colors
  status: {
    online: '#10b981',
    offline: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    idle: '#6b7280',
    active: '#22c55e',
    inactive: '#9ca3af',
  },

  // Network Cable Colors
  cables: {
    straight: '#3b82f6',
    crossover: '#f59e0b',
    fiber: '#8b5cf6',
    serial: '#ec4899',
    console: '#64748b',
    wireless: '#06b6d4',
    default: '#94a3b8',
    selected: '#38bdf8',
    hover: '#60a5fa',
    active: '#22c55e',
    disabled: '#475569',
  },

  wirelessSsid: ['#f59e0b', '#a855f7', '#10b981', '#ec4899', '#06b6d4'],

  // Topology Canvas & Device Node Colors
  topology: {
    bg: '#0f172a',
    canvasBg: '#1e293b',
    gridLine: '#334155',
    deviceBg: '#1e293b',
    deviceBorder: '#475569',
    deviceSelectedBorder: '#38bdf8',
    deviceText: '#f8fafc',
    subText: '#94a3b8',
    halo: 'rgba(56, 189, 248, 0.25)',
    noteBg: '#1e293b',
    noteBorder: '#475569',
    noteText: '#e2e8f0',
  },

  // Packet & Simulation Animation Colors
  packet: {
    icmp: '#3b82f6',
    arp: '#f59e0b',
    tcp: '#10b981',
    udp: '#8b5cf6',
    dns: '#ec4899',
    dhcp: '#06b6d4',
    http: '#eab308',
    error: '#ef4444',
    success: '#22c55e',
  },

  // Terminal & Console Colors
  terminal: {
    bg: '#090d16',
    fg: '#f1f5f9',
    prompt: '#38bdf8',
    command: '#f8fafc',
    output: '#cbd5e1',
    error: '#f87171',
    warning: '#fbbf24',
    cursor: '#38bdf8',
    selection: '#1e3a8a',
  },

  // Brand / Theme UI Colors
  theme: {
    primary: '#0284c7',
    primaryHover: '#0369a1',
    secondary: '#475569',
    accent: '#38bdf8',
    background: '#0f172a',
    card: '#1e293b',
    cardHover: '#334155',
    border: '#334155',
    ring: '#38bdf8',
  },

  // Common Colors
  common: {
    white: '#ffffff',
    black: '#000000',
    navy: '#003399',
    navyShort: '#039',
  },

  // Neutral / Gray palette
  neutral: {
    50: '#f8f9fa',
    100: '#f0f2f5',
    soft: '#f3f4f6',
    200: '#e9ecef',
    light: '#eeeeee',
    lighter: '#dddddd',
    300: '#dee2e6',
    medium: '#d6d8db',
    400: '#ced4da',
    muted: '#cccccc',
    450: '#e2e3e5',
    500: '#adb5bd',
    600: '#6c757d',
    700: '#495057',
    dark: '#333333',
    800: '#343a40',
    900: '#212529',
  },

  // Indigo (Tutorial animations, Canvas ambient)
  indigo: {
    400: '#818cf8',
    500: '#6366f1',
  },

  // Blue shades
  blue: {
    100: '#dbeafe',
    600: '#2563eb',
    700: '#1d4ed8',
  },

  // Green shades
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
  },

  // Red shades
  red: {
    50: '#fef2f2',
    100: '#f8d7da',
    200: '#fecaca',
    light: '#f5c6cb',
    600: '#dc2626',
  },

  // Amber / Yellow shades
  amber: {
    100: '#fef3c7',
    200: '#fde68a',
    light: '#ffeaa7',
    400: '#ffc107',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
  },

  // Sky / Light Blue shades
  sky: {
    50: '#e0f2fe',
    100: '#bae6fd',
    200: '#7dd3fc',
    500: '#0ea5e9',
  },

  // Purple shades
  purple: {
    400: '#c084fc',
    500: '#a855f7',
    900: '#581c87',
  },

  // Orange shades
  orange: {
    100: '#ffedd5',
    500: '#f97316',
  },

  // Slate shades
  slate: {
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Teal shades
  teal: {
    600: '#0d9488',
  },

  // Yellow shades
  yellow: {
    100: '#fef9c3',
    600: '#ca8a04',
    700: '#a16207',
  },

  // Syntax highlighting colors
  syntax: {
    constant: '#fb7185',
  },
} as const;

export type ColorTokenGroup = typeof colors;
