'use client';

import React, { createContext, useEffect, useMemo, useState } from 'react';

export type LearningMode = 'beginner' | 'intermediate' | 'advanced';

interface ModeContextType {
    mode: LearningMode;
    setMode: (mode: LearningMode) => void;
}

const STORAGE_KEY = 'netsim_learning_mode';
const DEFAULT_MODE: LearningMode = 'beginner';

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setModeState] = useState<LearningMode>(DEFAULT_MODE);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load mode from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && isValidMode(saved)) {
                setTimeout(() => setModeState(saved as LearningMode), 0);
            }
        } catch {
            // ignore persistence failures
        }
        setTimeout(() => setIsHydrated(true), 0);
    }, []);

    // Persist mode to localStorage when it changes
    useEffect(() => {
        if (!isHydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // ignore persistence failures
        }
    }, [mode, isHydrated]);

    const setMode = (newMode: LearningMode) => {
        if (isValidMode(newMode)) {
            setModeState(newMode);
        }
    };

    const value = useMemo(() => ({
        mode,
        setMode,
    }), [mode]);

    return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

function isValidMode(value: unknown): value is LearningMode {
    return value === 'beginner' || value === 'intermediate' || value === 'advanced';
}
