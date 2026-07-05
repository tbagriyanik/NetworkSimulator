/**
 * Typography Design Tokens
 * 
 * Comprehensive typography system with font families, sizes,
 * weights, and line heights for optimal readability and hierarchy.
 */

import type { FontFamilyTokens, FontSizeScale, LineHeightScale, FontWeightScale } from './types';

// Font Family Tokens
export const fontFamilies: FontFamilyTokens = {
    sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Fira Sans',
        'Droid Sans',
        'Helvetica Neue',
        'sans-serif',
    ],
    mono: [
        'JetBrains Mono',
        'SF Mono',
        'Monaco',
        'Inconsolata',
        'Roboto Mono',
        'Source Code Pro',
        'Menlo',
        'Consolas',
        'DejaVu Sans Mono',
        'monospace',
    ],
    display: [
        'Inter Display',
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'sans-serif',
    ],
};

// Font Size Scale (rem-based for accessibility)
export const fontSizes: FontSizeScale = {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    '8xl': '6rem',    // 96px
    '9xl': '8rem',    // 128px
};

// Line Height Scale
export const lineHeights: LineHeightScale = {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
};

// Font Weight Scale
export const fontWeights: FontWeightScale = {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
};

// Utility function to generate typography CSS variables
export function generateTypographyVariables(): Record<string, string> {
    const variables: Record<string, string> = {};

    // Font families
    variables['--font-sans'] = fontFamilies.sans.join(', ');
    variables['--font-mono'] = fontFamilies.mono.join(', ');
    variables['--font-display'] = fontFamilies.display.join(', ');

    // Font sizes
    Object.entries(fontSizes).forEach(([key, value]) => {
        variables[`--font-size-${key}`] = value;
    });

    // Line heights
    Object.entries(lineHeights).forEach(([key, value]) => {
        variables[`--line-height-${key}`] = value;
    });

    // Font weights
    Object.entries(fontWeights).forEach(([key, value]) => {
        variables[`--font-weight-${key}`] = value;
    });

    return variables;
}