'use client';

import { safeGetJSON, safeSetJSON } from '@/lib/storage/safeStorage';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Breakpoint, getBreakpointFromWidth } from '@/lib/design-tokens';
import { LayoutConfig, DEFAULT_LAYOUT_CONFIG } from '@/lib/layout/responsive';

interface LayoutPreferences {
    sidebarCollapsed?: boolean;
    panelLayout?: 'overlay' | 'docked' | 'stacked';
}

interface LayoutContextType {
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
            setTimeout(() => setPanelLayout('overlay'), 0);
        } else if (breakpoint === 'tablet') {
            setTimeout(() => setPanelLayout('stacked'), 0);
        } else {
            setTimeout(() => setPanelLayout('docked'), 0);
        }
    }, [breakpoint]);

    // Load preferences from safeStorage
    useEffect(() => {
        const prefs = safeGetJSON<LayoutPreferences | null>('layoutPreferences', null);
        if (prefs && prefs.sidebarCollapsed !== undefined) {
            setTimeout(() => setSidebarCollapsed(prefs.sidebarCollapsed ?? false), 0);
        }
    }, []);

    const saveLayoutPreferences = () => {
        safeSetJSON('layoutPreferences', {
            sidebarCollapsed,
            panelLayout,
        });
    };

    const restoreLayoutPreferences = () => {
        const prefs = safeGetJSON<LayoutPreferences | null>('layoutPreferences', null);
        if (prefs) {
            if (prefs.sidebarCollapsed !== undefined) setSidebarCollapsed(prefs.sidebarCollapsed);
            if (prefs.panelLayout !== undefined) setPanelLayout(prefs.panelLayout);
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
