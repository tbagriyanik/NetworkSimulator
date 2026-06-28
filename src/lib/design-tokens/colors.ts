/**
 * Color Scales and Semantic Colors
 * 
 * Comprehensive color system with proper contrast ratios
 * and accessibility compliance for all theme variants.
 */

import type { ColorScale, SemanticColors, SurfaceColors } from './types';

// Primary Color Scale (Blue-based)
export const primaryColors: ColorScale = {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Base primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
};

// Secondary Color Scale (Slate-based)
export const secondaryColors: ColorScale = {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b', // Base secondary
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
};

// Accent Color Scale (Cyan-based)
export const accentColors: ColorScale = {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4', // Base accent
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
    950: '#083344',
};

// Cable Colors (network-related)
export const cableColors: Record<string, { primary: string; secondary: string }> = {
    straight: { primary: '#64748b', secondary: '#94a3b8' },
    crossover: { primary: '#94a3b8', secondary: '#cbd5e1' },
    ethernet: { primary: '#10b981', secondary: '#22c55e' },
    fiber: { primary: '#3b82f6', secondary: '#2563eb' },
    console: { primary: '#ef4444', secondary: '#dc2626' },
    wireless: { primary: '#eab308', secondary: '#f59e0b' },
    error: { primary: '#ef4444', secondary: '#dc2626' },
};

// Semantic Colors
export const semanticColors: SemanticColors = {
    success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e', // Base success
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
        950: '#052e16',
    },
    warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b', // Base warning
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
        950: '#451a03',
    },
    error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444', // Base error
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
        950: '#450a0a',
    },
    info: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6', // Base info (same as primary)
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
    },
};

// Light Theme Surface Colors
export const lightSurfaceColors: SurfaceColors = {
    background: '#ffffff',
    foreground: '#0f172a',
    card: '#ffffff',
    cardForeground: '#0f172a',
    popover: '#ffffff',
    popoverForeground: '#0f172a',
    muted: '#f1f5f9',
    mutedForeground: '#64748b',
    accent: '#f1f5f9',
    accentForeground: '#0f172a',
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#3b82f6',
};

// Dark Theme Surface Colors
export const darkSurfaceColors: SurfaceColors = {
    background: '#020617',
    foreground: '#f8fafc',
    card: '#020617',
    cardForeground: '#f8fafc',
    popover: '#020617',
    popoverForeground: '#f8fafc',
    muted: '#1e293b',
    mutedForeground: '#94a3b8',
    accent: '#1e293b',
    accentForeground: '#f8fafc',
    border: '#1e293b',
    input: '#1e293b',
    ring: '#06b6d4',
};

// High Contrast Theme Surface Colors
export const highContrastSurfaceColors: SurfaceColors = {
    background: '#000000',
    foreground: '#ffffff',
    card: '#000000',
    cardForeground: '#ffffff',
    popover: '#000000',
    popoverForeground: '#ffffff',
    muted: '#1a1a1a',
    mutedForeground: '#cccccc',
    accent: '#1a1a1a',
    accentForeground: '#ffffff',
    border: '#666666',
    input: '#333333',
    ring: '#00ffff',
};

// Utility function to generate CSS custom properties from color scales
export function generateColorVariables(
    prefix: string,
    colorScale: ColorScale
): Record<string, string> {
    const variables: Record<string, string> = {};

    Object.entries(colorScale).forEach(([key, value]) => {
        variables[`--color-${prefix}-${key}`] = value;
    });

    return variables;
}

// Utility function to generate surface color variables
export function generateSurfaceVariables(
    surfaceColors: SurfaceColors
): Record<string, string> {
    return {
        '--color-background': surfaceColors.background,
        '--color-foreground': surfaceColors.foreground,
        '--color-card': surfaceColors.card,
        '--color-card-foreground': surfaceColors.cardForeground,
        '--color-popover': surfaceColors.popover,
        '--color-popover-foreground': surfaceColors.popoverForeground,
        '--color-muted': surfaceColors.muted,
        '--color-muted-foreground': surfaceColors.mutedForeground,
        '--color-accent': surfaceColors.accent,
        '--color-accent-foreground': surfaceColors.accentForeground,
        '--color-border': surfaceColors.border,
        '--color-input': surfaceColors.input,
        '--color-ring': surfaceColors.ring,
    };
}