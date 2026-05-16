/**
 * Modern Theme Engine
 * 
 * Enhanced theme management system with support for multiple theme variants,
 * smooth transitions, system theme detection, and accessibility preferences.
 */

import { logger } from '@/lib/logger';
import type { ThemeVariant, ThemeDefinition } from '../design-tokens/types';
import { themeConfig, getTheme } from '../design-tokens';

export interface ThemeState {
    current: ThemeVariant;
    systemPreference: ThemeVariant | null;
    followSystem: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    customizations: Record<string, string>;
}

export interface ThemeEngineConfig {
    enableTransitions: boolean;
    transitionDuration: string;
    persistPreferences: boolean;
    storageKey: string;
    detectSystemTheme: boolean;
    detectReducedMotion: boolean;
    detectHighContrast: boolean;
}

export class ThemeEngine {
    private state: ThemeState;
    private config: ThemeEngineConfig;
    private listeners: Set<(state: ThemeState) => void> = new Set();
    private mediaQueries: {
        darkMode?: MediaQueryList;
        reducedMotion?: MediaQueryList;
        highContrast?: MediaQueryList;
    } = {};

    constructor(config: Partial<ThemeEngineConfig> = {}) {
        this.config = {
            enableTransitions: true,
            transitionDuration: themeConfig.transitionDuration,
            persistPreferences: true,
            storageKey: 'theme-preferences',
            detectSystemTheme: true,
            detectReducedMotion: true,
            detectHighContrast: true,
            ...config,
        };

        this.state = {
            current: themeConfig.defaultTheme,
            systemPreference: null,
            followSystem: false,
            reducedMotion: false,
            highContrast: false,
            customizations: {},
        };

        this.initialize();
    }

    private initialize(): void {
        // Load persisted preferences
        if (this.config.persistPreferences) {
            this.loadPersistedState();
        }

        // Setup system preference detection
        if (typeof window !== 'undefined') {
            this.setupMediaQueryListeners();
            this.detectSystemPreferences();
        }

        // Apply initial theme
        this.applyTheme(this.state.current);
    }

    private setupMediaQueryListeners(): void {
        if (!this.config.detectSystemTheme && !this.config.detectReducedMotion && !this.config.detectHighContrast) {
            return;
        }

        try {
            // Dark mode detection
            if (this.config.detectSystemTheme) {
                this.mediaQueries.darkMode = window.matchMedia('(prefers-color-scheme: dark)');
                this.mediaQueries.darkMode.addEventListener('change', this.handleSystemThemeChange.bind(this));
            }

            // Reduced motion detection
            if (this.config.detectReducedMotion) {
                this.mediaQueries.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
                this.mediaQueries.reducedMotion.addEventListener('change', this.handleReducedMotionChange.bind(this));
            }

            // High contrast detection
            if (this.config.detectHighContrast) {
                this.mediaQueries.highContrast = window.matchMedia('(prefers-contrast: high)');
                this.mediaQueries.highContrast.addEventListener('change', this.handleHighContrastChange.bind(this));
            }
        } catch (error) {
            logger.warn('Failed to setup media query listeners:', error);
        }
    }

    private detectSystemPreferences(): void {
        const updates: Partial<ThemeState> = {};

        // Detect system theme preference
        if (this.mediaQueries.darkMode) {
            updates.systemPreference = this.mediaQueries.darkMode.matches ? 'dark' : 'light';
        }

        // Detect reduced motion preference
        if (this.mediaQueries.reducedMotion) {
            updates.reducedMotion = this.mediaQueries.reducedMotion.matches;
        }

        // Detect high contrast preference
        if (this.mediaQueries.highContrast) {
            updates.highContrast = this.mediaQueries.highContrast.matches;
            if (updates.highContrast && this.state.followSystem) {
                updates.current = 'high-contrast';
            }
        }

        // Apply system theme if following system
        if (this.state.followSystem && updates.systemPreference) {
            updates.current = updates.highContrast ? 'high-contrast' : updates.systemPreference;
        }

        this.updateState(updates);
    }

    private handleSystemThemeChange(event: MediaQueryListEvent): void {
        const systemPreference: ThemeVariant = event.matches ? 'dark' : 'light';
        const updates: Partial<ThemeState> = { systemPreference };

        if (this.state.followSystem) {
            updates.current = this.state.highContrast ? 'high-contrast' : systemPreference;
        }

        this.updateState(updates);
    }

    private handleReducedMotionChange(event: MediaQueryListEvent): void {
        this.updateState({ reducedMotion: event.matches });
    }

    private handleHighContrastChange(event: MediaQueryListEvent): void {
        const updates: Partial<ThemeState> = { highContrast: event.matches };

        if (this.state.followSystem) {
            if (event.matches) {
                updates.current = 'high-contrast';
            } else {
                updates.current = this.state.systemPreference || 'light';
            }
        }

        this.updateState(updates);
    }

    private updateState(updates: Partial<ThemeState>): void {
        const previousTheme = this.state.current;
        this.state = { ...this.state, ...updates };

        // Apply theme if it changed
        if (updates.current && updates.current !== previousTheme) {
            this.applyTheme(updates.current);
        }

        // Persist state
        if (this.config.persistPreferences) {
            this.persistState();
        }

        // Notify listeners
        this.notifyListeners();
    }

    private applyTheme(variant: ThemeVariant): void {
        if (typeof document === 'undefined') return;

        const theme = getTheme(variant);
        const root = document.documentElement;

        // Remove existing theme classes
        root.classList.remove('light', 'dark', 'high-contrast');

        // Add new theme class
        root.classList.add(variant);

        // Apply CSS custom properties
        Object.entries(theme.cssVariables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Handle transitions
        if (this.config.enableTransitions && !this.state.reducedMotion) {
            this.enableThemeTransition();
        }
    }

    private enableThemeTransition(): void {
        if (typeof document === 'undefined') return;

        const root = document.documentElement;
        const transitionProperty = 'background-color, color, border-color, box-shadow';

        root.style.setProperty('transition', `${transitionProperty} ${this.config.transitionDuration} ease`);

        // Remove transition after completion to avoid interfering with other animations
        setTimeout(() => {
            root.style.removeProperty('transition');
        }, parseInt(this.config.transitionDuration) + 50);
    }

    private loadPersistedState(): void {
        if (typeof localStorage === 'undefined') return;

        try {
            const stored = localStorage.getItem(this.config.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.state = { ...this.state, ...parsed };
            }
        } catch (error) {
            logger.warn('Failed to load persisted theme state:', error);
        }
    }

    private persistState(): void {
        if (typeof localStorage === 'undefined') return;

        try {
            const toStore = {
                current: this.state.current,
                followSystem: this.state.followSystem,
                customizations: this.state.customizations,
            };
            localStorage.setItem(this.config.storageKey, JSON.stringify(toStore));
        } catch (error) {
            logger.warn('Failed to persist theme state:', error);
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                logger.error('Theme listener error:', error);
            }
        });
    }

    // Public API
    public getState(): ThemeState {
        return { ...this.state };
    }

    public getCurrentTheme(): ThemeDefinition {
        return getTheme(this.state.current);
    }

    public setTheme(variant: ThemeVariant): void {
        this.updateState({
            current: variant,
            followSystem: false
        });
    }

    public toggleTheme(): void {
        const current = this.state.current;
        let next: ThemeVariant;

        if (current === 'light') {
            next = 'dark';
        } else if (current === 'dark') {
            next = 'high-contrast';
        } else {
            next = 'light';
        }

        this.setTheme(next);
    }

    public setFollowSystem(follow: boolean): void {
        const updates: Partial<ThemeState> = { followSystem: follow };

        if (follow && this.state.systemPreference) {
            updates.current = this.state.highContrast ? 'high-contrast' : this.state.systemPreference;
        }

        this.updateState(updates);
    }

    public setCustomization(property: string, value: string): void {
        const customizations = { ...this.state.customizations, [property]: value };
        this.updateState({ customizations });

        // Apply custom property immediately
        if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty(property, value);
        }
    }

    public removeCustomization(property: string): void {
        const customizations = { ...this.state.customizations };
        delete customizations[property];
        this.updateState({ customizations });

        // Remove custom property
        if (typeof document !== 'undefined') {
            document.documentElement.style.removeProperty(property);
        }
    }

    public clearCustomizations(): void {
        // Remove all custom properties
        if (typeof document !== 'undefined') {
            Object.keys(this.state.customizations).forEach(property => {
                document.documentElement.style.removeProperty(property);
            });
        }

        this.updateState({ customizations: {} });
    }

    public subscribe(listener: (state: ThemeState) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    public destroy(): void {
        // Remove media query listeners
        Object.values(this.mediaQueries).forEach(mq => {
            if (mq) {
                mq.removeEventListener('change', this.handleSystemThemeChange.bind(this));
                mq.removeEventListener('change', this.handleReducedMotionChange.bind(this));
                mq.removeEventListener('change', this.handleHighContrastChange.bind(this));
            }
        });

        // Clear listeners
        this.listeners.clear();

        // Remove transition styles
        if (typeof document !== 'undefined') {
            document.documentElement.style.removeProperty('transition');
        }
    }
}

// Singleton instance for global use
let globalThemeEngine: ThemeEngine | null = null;

export function getThemeEngine(config?: Partial<ThemeEngineConfig>): ThemeEngine {
    if (!globalThemeEngine) {
        globalThemeEngine = new ThemeEngine(config);
    }
    return globalThemeEngine;
}

export function destroyThemeEngine(): void {
    if (globalThemeEngine) {
        globalThemeEngine.destroy();
        globalThemeEngine = null;
    }
}