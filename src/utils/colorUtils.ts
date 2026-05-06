/**
 * Color Utility Functions
 * Provides functions for color manipulation, contrast checking, and accessibility compliance
 */

import { COLOR_PALETTE, CONTRAST_RATIOS } from '@/constants/ui-ux';

/**
 * Converts a hex color to RGB values
 * @param hex - Hex color string (e.g., '#FF0000')
 * @returns Object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Converts RGB values to hex color
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string (e.g., '#FF0000')
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}

/**
 * Converts RGB to HSL (Hue, Saturation, Lightness)
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Object with h (0-360), s (0-100), l (0-100)
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

/**
 * Converts HSL to RGB
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Object with r, g, b values (0-255)
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

/**
 * Lightens a color by a specified amount
 * @param hex - Hex color string
 * @param amount - Amount to lighten (0-100, where 50 is 50% lighter)
 * @returns Lightened hex color
 */
export function lighten(hex: string, amount: number = 20): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.min(100, hsl.l + amount);

    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Darkens a color by a specified amount
 * @param hex - Hex color string
 * @param amount - Amount to darken (0-100, where 50 is 50% darker)
 * @returns Darkened hex color
 */
export function darken(hex: string, amount: number = 20): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.max(0, hsl.l - amount);

    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Calculates the relative luminance of a color
 * Used for WCAG contrast ratio calculation
 * @param hex - Hex color string
 * @returns Relative luminance (0-1)
 */
export function getRelativeLuminance(hex: string): number {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the WCAG contrast ratio between two colors
 * @param hex1 - First hex color
 * @param hex2 - Second hex color
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
    const lum1 = getRelativeLuminance(hex1);
    const lum2 = getRelativeLuminance(hex2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a color pair meets WCAG AA contrast requirements
 * @param hex1 - First hex color
 * @param hex2 - Second hex color
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns True if contrast ratio meets WCAG AA standards
 */
export function meetsWCAGAA(hex1: string, hex2: string, isLargeText: boolean = false): boolean {
    const ratio = getContrastRatio(hex1, hex2);
    const required = isLargeText ? CONTRAST_RATIOS.wcagAALarge : CONTRAST_RATIOS.wcagAA;
    return ratio >= required;
}

/**
 * Checks if a color pair meets WCAG AAA contrast requirements
 * @param hex1 - First hex color
 * @param hex2 - Second hex color
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 * @returns True if contrast ratio meets WCAG AAA standards
 */
export function meetsWCAGAAA(hex1: string, hex2: string, isLargeText: boolean = false): boolean {
    const ratio = getContrastRatio(hex1, hex2);
    const required = isLargeText ? CONTRAST_RATIOS.wcagAAA : CONTRAST_RATIOS.wcagAAA;
    return ratio >= required;
}

/**
 * Finds the best text color (light or dark) for a given background color
 * @param bgHex - Background hex color
 * @returns '#FFFFFF' for light text or '#000000' for dark text
 */
export function getContrastingTextColor(bgHex: string): string {
    const lum = getRelativeLuminance(bgHex);
    // If luminance is greater than 0.5, use dark text, otherwise use light text
    return lum > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Blends two colors together
 * @param hex1 - First hex color
 * @param hex2 - Second hex color
 * @param ratio - Blend ratio (0-1, where 0 is 100% hex1 and 1 is 100% hex2)
 * @returns Blended hex color
 */
export function blendColors(hex1: string, hex2: string, ratio: number = 0.5): string {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    if (!rgb1 || !rgb2) return hex1;

    const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
    const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
    const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

    return rgbToHex(r, g, b);
}

/**
 * Adjusts the saturation of a color
 * @param hex - Hex color string
 * @param amount - Amount to adjust saturation (-100 to 100)
 * @returns Adjusted hex color
 */
export function adjustSaturation(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.s = Math.max(0, Math.min(100, hsl.s + amount));

    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Adjusts the hue of a color
 * @param hex - Hex color string
 * @param degrees - Degrees to rotate hue (0-360)
 * @returns Adjusted hex color
 */
export function rotateHue(hex: string, degrees: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h = (hsl.h + degrees) % 360;

    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Validates if a string is a valid hex color
 * @param hex - String to validate
 * @returns True if valid hex color
 */
export function isValidHexColor(hex: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(hex);
}

/**
 * Gets a color from the palette with optional modifications
 * @param colorPath - Path to color in palette (e.g., 'primary.blue')
 * @param modification - Optional modification ('lighten', 'darken', or amount)
 * @returns Hex color string
 */
export function getPaletteColor(
    colorPath: string,
    modification?: 'lighten' | 'darken' | number
): string {
    const parts = colorPath.split('.');
    let color: any = COLOR_PALETTE;

    for (const part of parts) {
        color = color[part];
        if (!color) return '#000000';
    }

    if (!modification) return color;

    if (modification === 'lighten') return lighten(color, 20);
    if (modification === 'darken') return darken(color, 20);
    if (typeof modification === 'number') {
        return modification > 0 ? lighten(color, modification) : darken(color, Math.abs(modification));
    }

    return color;
}

/**
 * Generates a color palette from a base color
 * @param baseHex - Base hex color
 * @returns Object with variations of the color
 */
export function generateColorPalette(baseHex: string) {
    return {
        base: baseHex,
        light: lighten(baseHex, 30),
        lighter: lighten(baseHex, 60),
        dark: darken(baseHex, 30),
        darker: darken(baseHex, 60),
        saturated: adjustSaturation(baseHex, 20),
        desaturated: adjustSaturation(baseHex, -20),
    };
}

/**
 * Checks if a color is considered "light" or "dark"
 * @param hex - Hex color string
 * @returns 'light' or 'dark'
 */
export function getColorBrightness(hex: string): 'light' | 'dark' {
    const lum = getRelativeLuminance(hex);
    return lum > 0.5 ? 'light' : 'dark';
}

/**
 * Creates a CSS variable string for a color
 * @param name - Variable name (e.g., 'primary-blue')
 * @param hex - Hex color value
 * @returns CSS variable declaration
 */
export function createCSSVariable(name: string, hex: string): string {
    return `--color-${name}: ${hex};`;
}

/**
 * Generates all CSS variables for the color palette
 * @returns String of all CSS variable declarations
 */
export function generateColorCSSVariables(): string {
    const variables: string[] = [];

    // Primary colors
    variables.push(createCSSVariable('primary-blue', COLOR_PALETTE.primary.blue));
    variables.push(createCSSVariable('primary-green', COLOR_PALETTE.primary.green));
    variables.push(createCSSVariable('primary-orange', COLOR_PALETTE.primary.orange));
    variables.push(createCSSVariable('primary-red', COLOR_PALETTE.primary.red));
    variables.push(createCSSVariable('primary-purple', COLOR_PALETTE.primary.purple));

    // Secondary colors
    variables.push(createCSSVariable('secondary-light-blue', COLOR_PALETTE.secondary.lightBlue));
    variables.push(createCSSVariable('secondary-light-green', COLOR_PALETTE.secondary.lightGreen));
    variables.push(createCSSVariable('secondary-light-orange', COLOR_PALETTE.secondary.lightOrange));
    variables.push(createCSSVariable('secondary-light-red', COLOR_PALETTE.secondary.lightRed));
    variables.push(createCSSVariable('secondary-light-purple', COLOR_PALETTE.secondary.lightPurple));

    // Neutral colors
    variables.push(createCSSVariable('neutral-dark-gray', COLOR_PALETTE.neutral.darkGray));
    variables.push(createCSSVariable('neutral-medium-gray', COLOR_PALETTE.neutral.mediumGray));
    variables.push(createCSSVariable('neutral-light-gray', COLOR_PALETTE.neutral.lightGray));
    variables.push(createCSSVariable('neutral-white', COLOR_PALETTE.neutral.white));
    variables.push(createCSSVariable('neutral-black', COLOR_PALETTE.neutral.black));

    // High contrast colors
    if (COLOR_PALETTE.highContrast) {
        variables.push(createCSSVariable('high-contrast-text', COLOR_PALETTE.highContrast.text));
        variables.push(createCSSVariable('high-contrast-background', COLOR_PALETTE.highContrast.background));
        variables.push(createCSSVariable('high-contrast-border', COLOR_PALETTE.highContrast.border));
    }

    return variables.join('\n  ');
}
