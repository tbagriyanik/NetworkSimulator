/**
 * Spacing and Layout Design Tokens
 * 
 * Comprehensive spacing system with consistent scale
 * for margins, padding, gaps, and layout dimensions.
 */

import type { SpacingScale, RadiusScale, ShadowScale } from './types';

// Spacing Scale (rem-based for accessibility and consistency)
export const spacing: SpacingScale = {
    0: '0px',
    px: '1px',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
    36: '9rem',       // 144px
    40: '10rem',      // 160px
    44: '11rem',      // 176px
    48: '12rem',      // 192px
    52: '13rem',      // 208px
    56: '14rem',      // 224px
    60: '15rem',      // 240px
    64: '16rem',      // 256px
    72: '18rem',      // 288px
    80: '20rem',      // 320px
    96: '24rem',      // 384px
};

// Border Radius Scale
export const borderRadius: RadiusScale = {
    none: '0px',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
};

// Shadow Scale - subtle
export const shadows: ShadowScale = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
    lg: '0 6px 12px -3px rgb(0 0 0 / 0.06), 0 3px 5px -4px rgb(0 0 0 / 0.04)',
    xl: '0 12px 20px -5px rgb(0 0 0 / 0.06), 0 5px 8px -6px rgb(0 0 0 / 0.04)',
    '2xl': '0 15px 35px -12px rgb(0 0 0 / 0.08)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
    none: '0 0 #0000',
};

// Dark theme shadows - subtle
export const darkShadows: ShadowScale = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.15)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.2), 0 1px 2px -1px rgb(0 0 0 / 0.15)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.2), 0 2px 4px -2px rgb(0 0 0 / 0.15)',
    lg: '0 6px 12px -3px rgb(0 0 0 / 0.2), 0 3px 5px -4px rgb(0 0 0 / 0.15)',
    xl: '0 12px 20px -5px rgb(0 0 0 / 0.2), 0 5px 8px -6px rgb(0 0 0 / 0.15)',
    '2xl': '0 15px 35px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
    none: '0 0 #0000',
};

// High contrast shadows - subtle
export const highContrastShadows: ShadowScale = {
    sm: '0 1px 2px 0 rgb(255 255 255 / 0.1)',
    base: '0 1px 3px 0 rgb(255 255 255 / 0.15), 0 1px 2px -1px rgb(255 255 255 / 0.1)',
    md: '0 4px 6px -1px rgb(255 255 255 / 0.15), 0 2px 4px -2px rgb(255 255 255 / 0.1)',
    lg: '0 6px 12px -3px rgb(255 255 255 / 0.15), 0 3px 5px -4px rgb(255 255 255 / 0.1)',
    xl: '0 12px 20px -5px rgb(255 255 255 / 0.15), 0 5px 8px -6px rgb(255 255 255 / 0.1)',
    '2xl': '0 15px 35px -12px rgb(255 255 255 / 0.2)',
    inner: 'inset 0 2px 4px 0 rgb(255 255 255 / 0.1)',
    none: '0 0 #0000',
};

// Layout Presets for Common Spacing Patterns
export const layoutPresets = {
    // Component spacing
    'component-xs': spacing[1],    // 4px
    'component-sm': spacing[2],    // 8px
    'component-md': spacing[4],    // 16px
    'component-lg': spacing[6],    // 24px
    'component-xl': spacing[8],    // 32px

    // Section spacing
    'section-xs': spacing[8],      // 32px
    'section-sm': spacing[12],     // 48px
    'section-md': spacing[16],     // 64px
    'section-lg': spacing[24],     // 96px
    'section-xl': spacing[32],     // 128px

    // Page spacing
    'page-xs': spacing[16],        // 64px
    'page-sm': spacing[20],        // 80px
    'page-md': spacing[24],        // 96px
    'page-lg': spacing[32],        // 128px
    'page-xl': spacing[40],        // 160px

    // Container spacing
    'container-xs': spacing[4],    // 16px
    'container-sm': spacing[6],    // 24px
    'container-md': spacing[8],    // 32px
    'container-lg': spacing[12],   // 48px
    'container-xl': spacing[16],   // 64px
};

// Breakpoint-specific spacing adjustments
export const responsiveSpacing = {
    mobile: {
        'container-padding': spacing[4],  // 16px
        'section-gap': spacing[8],        // 32px
        'component-gap': spacing[3],      // 12px
    },
    tablet: {
        'container-padding': spacing[6],  // 24px
        'section-gap': spacing[12],       // 48px
        'component-gap': spacing[4],      // 16px
    },
    desktop: {
        'container-padding': spacing[8],  // 32px
        'section-gap': spacing[16],       // 64px
        'component-gap': spacing[6],      // 24px
    },
};

// Utility function to generate spacing CSS variables
export function generateSpacingVariables(): Record<string, string> {
    const variables: Record<string, string> = {};

    // Spacing scale
    Object.entries(spacing).forEach(([key, value]) => {
        variables[`--spacing-${key}`] = value;
    });

    // Border radius
    Object.entries(borderRadius).forEach(([key, value]) => {
        variables[`--radius-${key}`] = value;
    });

    // Layout presets
    Object.entries(layoutPresets).forEach(([key, value]) => {
        variables[`--layout-${key}`] = value;
    });

    return variables;
}

// Utility function to generate shadow variables for different themes
export function generateShadowVariables(theme: 'light' | 'dark' | 'high-contrast'): Record<string, string> {
    const variables: Record<string, string> = {};
    let shadowScale: ShadowScale;

    switch (theme) {
        case 'dark':
            shadowScale = darkShadows;
            break;
        case 'high-contrast':
            shadowScale = highContrastShadows;
            break;
        default:
            shadowScale = shadows;
    }

    Object.entries(shadowScale).forEach(([key, value]) => {
        variables[`--shadow-${key}`] = value;
    });

    return variables;
}