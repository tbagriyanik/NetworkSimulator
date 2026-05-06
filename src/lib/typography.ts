/**
 * Typography Utilities
 * Provides utility functions for typography calculations and responsive sizing
 */

import { TYPOGRAPHY_SCALE, BREAKPOINTS } from '@/constants/ui-ux';

/**
 * Get typography styles for a given variant
 */
export function getTypographyStyles(variant: keyof typeof TYPOGRAPHY_SCALE) {
    const scale = TYPOGRAPHY_SCALE[variant];
    return {
        fontSize: `${scale.size}px`,
        fontWeight: scale.weight,
        lineHeight: scale.lineHeight,
    };
}

/**
 * Calculate responsive font size based on viewport width
 * Uses linear interpolation between mobile and desktop sizes
 */
export function getResponsiveFontSize(
    mobileSize: number,
    desktopSize: number,
    viewportWidth: number
): number {
    const mobileBreakpoint = BREAKPOINTS.mobile;
    const desktopBreakpoint = BREAKPOINTS.desktop;

    if (viewportWidth <= mobileBreakpoint) {
        return mobileSize;
    }

    if (viewportWidth >= desktopBreakpoint) {
        return desktopSize;
    }

    // Linear interpolation for tablet sizes
    const ratio =
        (viewportWidth - mobileBreakpoint) /
        (desktopBreakpoint - mobileBreakpoint);
    return mobileSize + (desktopSize - mobileSize) * ratio;
}

/**
 * Get line height in pixels
 */
export function getLineHeightPixels(
    fontSize: number,
    lineHeight: number
): number {
    return fontSize * lineHeight;
}

/**
 * Calculate letter spacing based on font size
 * Larger text typically needs less letter spacing
 */
export function getLetterSpacing(fontSize: number): number {
    if (fontSize >= 32) return -0.5;
    if (fontSize >= 24) return -0.25;
    if (fontSize >= 18) return 0;
    if (fontSize >= 16) return 0.25;
    return 0.5;
}

/**
 * Get CSS class for typography variant
 */
export function getTypographyClass(
    variant: keyof typeof TYPOGRAPHY_SCALE
): string {
    const classMap: Record<keyof typeof TYPOGRAPHY_SCALE, string> = {
        h1: 'text-3xl font-bold leading-tight',
        h2: 'text-2xl font-bold leading-snug',
        h3: 'text-lg font-semibold leading-relaxed',
        body: 'text-base font-normal leading-relaxed',
        small: 'text-sm font-normal leading-relaxed',
        tiny: 'text-xs font-normal leading-relaxed',
    };

    return classMap[variant];
}

/**
 * Truncate text to a specific number of lines
 */
export function getTruncateClass(lines: number): string {
    const classMap: Record<number, string> = {
        1: 'line-clamp-1',
        2: 'line-clamp-2',
        3: 'line-clamp-3',
        4: 'line-clamp-4',
        5: 'line-clamp-5',
        6: 'line-clamp-6',
    };

    return classMap[lines] || 'line-clamp-1';
}

/**
 * Get responsive typography classes for different breakpoints
 */
export function getResponsiveTypographyClasses(
    mobileVariant: keyof typeof TYPOGRAPHY_SCALE,
    tabletVariant?: keyof typeof TYPOGRAPHY_SCALE,
    desktopVariant?: keyof typeof TYPOGRAPHY_SCALE
): string {
    const classes = [getTypographyClass(mobileVariant)];

    if (tabletVariant) {
        classes.push(`md:${getTypographyClass(tabletVariant)}`);
    }

    if (desktopVariant) {
        classes.push(`lg:${getTypographyClass(desktopVariant)}`);
    }

    return classes.join(' ');
}

/**
 * Calculate optimal line length for readability
 * Typically 50-75 characters per line
 */
export function getOptimalLineLength(fontSize: number): number {
    // Rough estimate: 1 character ≈ 0.5 * fontSize
    const charsPerLine = Math.round(fontSize * 1.5);
    return Math.max(50, Math.min(75, charsPerLine));
}

/**
 * Get font family CSS
 */
export function getFontFamilyCSS(type: 'primary' | 'monospace'): string {
    const families = {
        primary: 'Inter, Segoe UI, sans-serif',
        monospace: 'Fira Code, monospace',
    };
    return families[type];
}

/**
 * Create CSS for typography variant
 */
export function createTypographyCSS(
    variant: keyof typeof TYPOGRAPHY_SCALE
): string {
    const scale = TYPOGRAPHY_SCALE[variant];
    return `
    font-size: ${scale.size}px;
    font-weight: ${scale.weight};
    line-height: ${scale.lineHeight};
    letter-spacing: ${getLetterSpacing(scale.size)}px;
  `;
}
