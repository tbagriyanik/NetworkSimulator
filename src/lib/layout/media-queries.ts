/**
 * Media Query Utilities
 * 
 * Provides utilities for creating responsive media queries and CSS-in-JS styles.
 */

import { breakpoints, mediaQueries as designTokenMediaQueries } from '@/lib/design-tokens/breakpoints';

export type MediaQueryOperator = 'up' | 'down' | 'only';

/**
 * Media query builder for CSS-in-JS
 */
export const mq = {
    /**
     * Mobile-first: min-width query
     * Usage: mq.up('tablet') => "(min-width: 641px)"
     */
    up: (breakpoint: 'mobile' | 'tablet' | 'desktop'): string => {
        switch (breakpoint) {
            case 'mobile':
                return `(min-width: ${breakpoints.mobile.max + 1}px)`;
            case 'tablet':
                return `(min-width: ${breakpoints.tablet.min}px)`;
            case 'desktop':
                return `(min-width: ${breakpoints.desktop.min}px)`;
            default:
                return '';
        }
    },

    /**
     * Max-width query
     * Usage: mq.down('tablet') => "(max-width: 1024px)"
     */
    down: (breakpoint: 'mobile' | 'tablet' | 'desktop'): string => {
        switch (breakpoint) {
            case 'mobile':
                return `(max-width: ${breakpoints.mobile.max}px)`;
            case 'tablet':
                return `(max-width: ${breakpoints.tablet.max}px)`;
            case 'desktop':
                return `(max-width: 9999px)`;
            default:
                return '';
        }
    },

    /**
     * Exact breakpoint range
     * Usage: mq.only('tablet') => "(min-width: 641px) and (max-width: 1024px)"
     */
    only: (breakpoint: 'mobile' | 'tablet' | 'desktop'): string => {
        switch (breakpoint) {
            case 'mobile':
                return `(max-width: ${breakpoints.mobile.max}px)`;
            case 'tablet':
                return `(min-width: ${breakpoints.tablet.min}px) and (max-width: ${breakpoints.tablet.max}px)`;
            case 'desktop':
                return `(min-width: ${breakpoints.desktop.min}px)`;
            default:
                return '';
        }
    },

    /**
     * Between two breakpoints
     * Usage: mq.between('mobile', 'tablet') => "(min-width: 0px) and (max-width: 1024px)"
     */
    between: (min: 'mobile' | 'tablet' | 'desktop', max: 'mobile' | 'tablet' | 'desktop'): string => {
        const minValue = min === 'mobile' ? 0 : min === 'tablet' ? breakpoints.tablet.min : breakpoints.desktop.min;
        const maxValue = max === 'mobile' ? breakpoints.mobile.max : max === 'tablet' ? breakpoints.tablet.max : 9999;
        return `(min-width: ${minValue}px) and (max-width: ${maxValue}px)`;
    },

    /**
     * Landscape orientation
     */
    landscape: (): string => '(orientation: landscape)',

    /**
     * Portrait orientation
     */
    portrait: (): string => '(orientation: portrait)',

    /**
     * High DPI (retina) displays
     */
    highDpi: (): string => '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',

    /**
     * Prefers reduced motion (accessibility)
     */
    prefersReducedMotion: (): string => '(prefers-reduced-motion: reduce)',

    /**
     * Prefers dark mode
     */
    prefersDarkMode: (): string => '(prefers-color-scheme: dark)',

    /**
     * Prefers light mode
     */
    prefersLightMode: (): string => '(prefers-color-scheme: light)',

    /**
     * Touch device
     */
    touchDevice: (): string => '(hover: none) and (pointer: coarse)',

    /**
     * Hover capable device
     */
    hoverCapable: (): string => '(hover: hover) and (pointer: fine)',
} as const;

/**
 * CSS media query string builder
 */
export function createMediaQuery(...queries: string[]): string {
    return `@media ${queries.join(' and ')}`;
}

/**
 * Create a media query with a specific breakpoint
 */
export function createBreakpointQuery(breakpoint: 'mobile' | 'tablet' | 'desktop', operator: MediaQueryOperator = 'only'): string {
    const query = mq[operator](breakpoint);
    return `@media ${query}`;
}

/**
 * Responsive style object for CSS-in-JS
 */
export interface ResponsiveStyles {
    mobile?: Record<string, any>;
    tablet?: Record<string, any>;
    desktop?: Record<string, any>;
}

/**
 * Convert responsive styles to CSS-in-JS object with media queries
 */
export function createResponsiveStyles(styles: ResponsiveStyles): Record<string, any> {
    const result: Record<string, any> = {};

    if (styles.mobile) {
        Object.assign(result, styles.mobile);
    }

    if (styles.tablet) {
        result[createBreakpointQuery('tablet', 'only')] = styles.tablet;
    }

    if (styles.desktop) {
        result[createBreakpointQuery('desktop', 'only')] = styles.desktop;
    }

    return result;
}

/**
 * Get all media query constants from design tokens
 */
export const mediaQueries = designTokenMediaQueries;

/**
 * Utility to check if a media query matches (client-side only)
 */
export function matchesMediaQuery(query: string): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
}

/**
 * Hook-like utility to listen to media query changes (client-side only)
 */
export function onMediaQueryChange(query: string, callback: (matches: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => { };

    const mediaQueryList = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => callback(e.matches);

    mediaQueryList.addEventListener('change', listener);

    return () => {
        mediaQueryList.removeEventListener('change', listener);
    };
}
