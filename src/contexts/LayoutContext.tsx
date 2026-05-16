'use client';

import { logger } from '@/lib/logger';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Breakpoint, getBreakpointFromWidth } from '@/lib/design-tokens';
import { LayoutConfig, DEFAULT_LAYOUT_CONFIG } from '@/lib/layout/responsive';

export interface LayoutContextType {
    breakpoint: Breakpoint;
    layoutConfig: LayoutConfig;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    panelLayout: 'overlay' | 'docked' | 'stacked';
    setPanelLayout: (layout: 'overlay' | 'docked' | 'stacked') => void;
    saveLayoutPreferences: () => void;
    restoreLayoutPreferences: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [panelLayout, setPanelLayout] = useState<'overlay' | 'docked' | 'stacked'>('docked');

    // Determine breakpoint on mount and resize
    useEffect(() => {
        const handleResize = () => {
            setBreakpoint(getBreakpointFromWidth(window.innerWidth));
        };

        handleResize();
        window.addEventListener('resize', handleResize, { passive: true });
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-adjust panel layout based on breakpoint
    useEffect(() => {
        if (breakpoint === 'mobile') {
            setPanelLayout('overlay');
        } else if (breakpoint === 'tablet') {
            setPanelLayout('stacked');
        } else {
            setPanelLayout('docked');
        }
    }, [breakpoint]);

    // Load preferences from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem('layoutPreferences');
            if (saved) {
                try {
                    const prefs = JSON.parse(saved);
                    if (prefs.sidebarCollapsed !== undefined) setSidebarCollapsed(prefs.sidebarCollapsed);
                } catch (e) {
                    logger.error('Failed to restore layout preferences:', e);
                }
            }
        }
    }, []);

    const saveLayoutPreferences = () => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(
                'layoutPreferences',
                JSON.stringify({
                    sidebarCollapsed,
                    panelLayout,
                })
            );
        }
    };

    const restoreLayoutPreferences = () => {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = localStorage.getItem('layoutPreferences');
            if (saved) {
                try {
                    const prefs = JSON.parse(saved);
                    if (prefs.sidebarCollapsed !== undefined) setSidebarCollapsed(prefs.sidebarCollapsed);
                    if (prefs.panelLayout !== undefined) setPanelLayout(prefs.panelLayout);
                } catch (e) {
                    logger.error('Failed to restore layout preferences:', e);
                }
            }
        }
    };

    return (
        <LayoutContext.Provider
            value={{
                breakpoint,
                layoutConfig: DEFAULT_LAYOUT_CONFIG,
                sidebarCollapsed,
                setSidebarCollapsed,
                panelLayout,
                setPanelLayout,
                saveLayoutPreferences,
                restoreLayoutPreferences,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error('useLayout must be used within LayoutProvider');
    }
    return context;
}
