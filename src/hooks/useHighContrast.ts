/**
 * High Contrast Mode Hook
 * Provides high contrast mode support for accessibility
 *
 * **Validates: Requirement 7.1**
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'netsim_high_contrast';

// High contrast color palette (7:1 contrast ratio minimum)
export const HIGH_CONTRAST_COLORS = {
    // Backgrounds
    background: '#000000',
    surface: '#000000',
    elevated: '#1a1a1a',

    // Text
    text: '#ffffff',
    textSecondary: '#e0e0e0',
    textDisabled: '#a0a0a0',

    // Borders (thick for visibility)
    border: '#ffffff',
    borderFocus: '#ffff00',

    // Interactive elements
    primary: '#ffff00',
    secondary: '#00ffff',
    success: '#00ff00',
    warning: '#ff9900',
    error: '#ff0000',

    // States
    hover: '#333333',
    selected: '#444444',
    focus: '#ffff00',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface HighContrastState {
    enabled: boolean;
    colors: typeof HIGH_CONTRAST_COLORS;
    borderThickness: number;
}

// ============================================================================
// Hook: High Contrast Mode
// ============================================================================

export function useHighContrast(): HighContrastState & {
    toggle: () => void;
    enable: () => void;
    disable: () => void;
} {
    const [enabled, setEnabled] = useState(false);

    // Load saved preference
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setEnabled(saved === 'true');
            } else {
                // Check system preference
                const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
                setEnabled(prefersHighContrast);
            }
        } catch {
            // Ignore storage errors
        }
    }, []);

    // Save preference when changed
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(enabled));
        } catch {
            // Ignore storage errors
        }

        // Apply high contrast class to document
        if (enabled) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
    }, [enabled]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');

        const handleChange = (event: MediaQueryListEvent) => {
            // Only auto-enable if user hasn't manually set preference
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === null) {
                setEnabled(event.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggle = useCallback(() => {
        setEnabled(prev => !prev);
    }, []);

    const enable = useCallback(() => {
        setEnabled(true);
    }, []);

    const disable = useCallback(() => {
        setEnabled(false);
    }, []);

    return {
        enabled,
        colors: HIGH_CONTRAST_COLORS,
        borderThickness: 2,
        toggle,
        enable,
        disable,
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getHighContrastClass(enabled: boolean): string {
    return enabled ? 'high-contrast' : '';
}

export function getContrastBorder(thickness: number = 2): string {
    return `${thickness}px solid ${HIGH_CONTRAST_COLORS.border}`;
}

export function getContrastTextColor(backgroundColor: string): string {
    // Simple luminance calculation
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Return white for dark backgrounds, black for light
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ============================================================================
// CSS Generator
// ============================================================================

export function generateHighContrastCSS(): string {
    return `
        .high-contrast {
            --color-background: ${HIGH_CONTRAST_COLORS.background};
            --color-surface: ${HIGH_CONTRAST_COLORS.surface};
            --color-text: ${HIGH_CONTRAST_COLORS.text};
            --color-text-secondary: ${HIGH_CONTRAST_COLORS.textSecondary};
            --color-border: ${HIGH_CONTRAST_COLORS.border};
            --color-primary: ${HIGH_CONTRAST_COLORS.primary};
            --color-secondary: ${HIGH_CONTRAST_COLORS.secondary};
            --color-success: ${HIGH_CONTRAST_COLORS.success};
            --color-warning: ${HIGH_CONTRAST_COLORS.warning};
            --color-error: ${HIGH_CONTRAST_COLORS.error};
            --border-thickness: 2px;

            background-color: var(--color-background);
            color: var(--color-text);
        }

        .high-contrast * {
            border-color: var(--color-border) !important;
        }

        .high-contrast button,
        .high-contrast [role="button"],
        .high-contrast a {
            border: 2px solid var(--color-border) !important;
        }

        .high-contrast button:focus,
        .high-contrast [role="button"]:focus,
        .high-contrast a:focus {
            outline: 3px solid var(--color-primary) !important;
            outline-offset: 2px !important;
        }

        .high-contrast input,
        .high-contrast select,
        .high-contrast textarea {
            border: 2px solid var(--color-border) !important;
            background-color: var(--color-surface) !important;
            color: var(--color-text) !important;
        }

        .high-contrast .border,
        .high-contrast .border-b,
        .high-contrast .border-t,
        .high-contrast .border-l,
        .high-contrast .border-r {
            border-width: 2px !important;
        }
    `;
}

export default useHighContrast;
