/**
 * UI/UX Constants for Network Simulator
 * Defines color palette, typography, breakpoints, and other design system constants
 */

import type { ColorPalette, TypographyScale, ResponsiveBreakpoint, UIUXConfig } from '@/types/ui-ux';

/**
 * Color Palette
 * Vibrant, modern colors designed to appeal to students aged 13-18
 */
export const COLOR_PALETTE: ColorPalette = {
    primary: {
        blue: '#0066FF',
        green: '#00CC66',
        orange: '#FF9900',
        red: '#FF3333',
        purple: '#9933FF',
    },
    secondary: {
        lightBlue: '#E6F2FF',
        lightGreen: '#E6FFCC',
        lightOrange: '#FFEECC',
        lightRed: '#FFCCCC',
        lightPurple: '#F0E6FF',
    },
    neutral: {
        darkGray: '#1A1A1A',
        mediumGray: '#666666',
        lightGray: '#F5F5F5',
        white: '#FFFFFF',
        black: '#000000',
    },
    highContrast: {
        text: '#000000',
        background: '#FFFFFF',
        border: '#000000',
    },
};

/**
 * Typography Scale
 * Defines font sizes, weights, and line heights for different text levels
 */
export const TYPOGRAPHY_SCALE: TypographyScale = {
    h1: {
        size: 32,
        weight: 700,
        lineHeight: 1.2,
    },
    h2: {
        size: 24,
        weight: 700,
        lineHeight: 1.3,
    },
    h3: {
        size: 18,
        weight: 600,
        lineHeight: 1.4,
    },
    body: {
        size: 16,
        weight: 400,
        lineHeight: 1.5,
    },
    small: {
        size: 14,
        weight: 400,
        lineHeight: 1.5,
    },
    tiny: {
        size: 12,
        weight: 400,
        lineHeight: 1.4,
    },
};

/**
 * Font Families
 */
export const FONT_FAMILIES = {
    primary: 'Inter, Segoe UI, sans-serif',
    monospace: 'Fira Code, monospace',
};

/**
 * Responsive Breakpoints
 * Mobile-first approach
 */
export const BREAKPOINTS: ResponsiveBreakpoint = {
    mobile: 768, // < 768px
    tablet: 1024, // 768px - 1024px
    desktop: 1024, // > 1024px
};

/**
 * Spacing Scale
 * Consistent spacing throughout the application
 */
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

/**
 * Animation Durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
    fast: 150,
    normal: 300,
    slow: 500,
    verySlow: 1000,
};

/**
 * Animation Easing Functions
 */
export const ANIMATION_EASING = {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
};

/**
 * Device Type Colors
 * Maps device types to their visual colors
 */
export const DEVICE_TYPE_COLORS: Record<string, string> = {
    pc: COLOR_PALETTE.primary.blue,
    router: COLOR_PALETTE.primary.green,
    switch: COLOR_PALETTE.primary.orange,
    iot: COLOR_PALETTE.primary.purple,
    firewall: COLOR_PALETTE.primary.red,
    loadbalancer: COLOR_PALETTE.primary.blue,
};

/**
 * Device Status Colors
 */
export const DEVICE_STATUS_COLORS: Record<string, string> = {
    online: COLOR_PALETTE.primary.green,
    offline: COLOR_PALETTE.primary.red,
};

/**
 * Connection Type Colors
 */
export const CONNECTION_TYPE_COLORS: Record<string, string> = {
    ethernet: COLOR_PALETTE.primary.blue,
    wireless: COLOR_PALETTE.primary.purple,
    serial: COLOR_PALETTE.primary.orange,
};

/**
 * Touch Target Minimum Size (in pixels)
 * WCAG 2.5.5 Level AAA recommendation
 */
export const TOUCH_TARGET_SIZE = 44;

/**
 * Focus Indicator Width (in pixels)
 */
export const FOCUS_INDICATOR_WIDTH = 2;

/**
 * Tooltip Delays (in milliseconds)
 */
export const TOOLTIP_DELAYS = {
    show: 200,
    hide: 200,
};

/**
 * Modal Z-Index Levels
 */
export const Z_INDEX = {
    base: 0,
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modalBackdrop: 400,
    modal: 500,
    popover: 600,
    tooltip: 700,
};

/**
 * Learning Mode Features
 * Defines which features are available in each learning mode
 */
export const MODE_FEATURES = {
    beginner: {
        deviceTypes: ['pc', 'router', 'switch'],
        advancedSettings: false,
        guidedModeDefault: true,
        maxDevices: 10,
    },
    intermediate: {
        deviceTypes: ['pc', 'router', 'switch', 'iot', 'firewall'],
        advancedSettings: true,
        guidedModeDefault: false,
        maxDevices: 50,
    },
    advanced: {
        deviceTypes: ['pc', 'router', 'switch', 'iot', 'firewall', 'loadbalancer'],
        advancedSettings: true,
        guidedModeDefault: false,
        maxDevices: 200,
    },
};

/**
 * Achievement Categories
 */
export const ACHIEVEMENT_CATEGORIES = {
    'network-basics': {
        name: 'Network Basics',
        description: 'Learn fundamental networking concepts',
        icon: 'network',
    },
    'advanced-concepts': {
        name: 'Advanced Concepts',
        description: 'Master complex networking topics',
        icon: 'brain',
    },
    'speed-challenges': {
        name: 'Speed Challenges',
        description: 'Complete tasks within time limits',
        icon: 'zap',
    },
    'creative-builds': {
        name: 'Creative Builds',
        description: 'Design innovative network solutions',
        icon: 'lightbulb',
    },
    troubleshooting: {
        name: 'Troubleshooting',
        description: 'Diagnose and fix network issues',
        icon: 'wrench',
    },
};

/**
 * XP Thresholds for Levels
 * Level 1-10 progression system
 */
export const XP_THRESHOLDS = {
    1: 0,
    2: 100,
    3: 250,
    4: 450,
    5: 700,
    6: 1000,
    7: 1350,
    8: 1750,
    9: 2200,
    10: 2700,
};

/**
 * XP Rewards
 */
export const XP_REWARDS = {
    taskCompletion: 50,
    achievementUnlock: 100,
    streakBonus: 25,
    challengeCompletion: 150,
};

/**
 * Complete UI/UX Configuration
 */
export const UI_UX_CONFIG: UIUXConfig = {
    colors: COLOR_PALETTE,
    typography: TYPOGRAPHY_SCALE,
    breakpoints: BREAKPOINTS,
    spacing: SPACING,
};

/**
 * Contrast Ratios for Accessibility
 */
export const CONTRAST_RATIOS = {
    wcagAA: 4.5, // For normal text
    wcagAALarge: 3, // For large text (18pt+)
    wcagAAA: 7, // Enhanced contrast
};

/**
 * Keyboard Shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
    save: 'Ctrl+S',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    delete: 'Delete',
    selectAll: 'Ctrl+A',
    deselect: 'Escape',
    help: 'F1',
};

/**
 * Error Message Categories
 */
export const ERROR_CATEGORIES = {
    configuration: 'Configuration Error',
    connection: 'Connection Error',
    file: 'File Error',
    simulation: 'Simulation Error',
};

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
    ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
    ipv6: /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/,
    macAddress: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    deviceName: /^[a-zA-Z0-9\-_]{1,32}$/,
};
