'use client';

import React from 'react';
import { useMode, LearningMode } from '@/contexts/ModeContext';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ModeSelectorProps {
    className?: string;
    showLabel?: boolean;
}

const MODES: Array<{ value: LearningMode; label: string; description: string }> = [
    {
        value: 'beginner',
        label: 'Beginner',
        description: 'Limited devices, simplified interface',
    },
    {
        value: 'intermediate',
        label: 'Intermediate',
        description: 'All devices, standard features',
    },
    {
        value: 'advanced',
        label: 'Advanced',
        description: 'All features, compact interface',
    },
];

export function ModeSelector({ className, showLabel = true }: ModeSelectorProps) {
    const { mode, setMode } = useMode();

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            {showLabel && (
                <Label className="text-sm font-semibold">Learning Mode</Label>
            )}
            <div className="flex gap-2">
                {MODES.map((m) => (
                    <label
                        key={m.value}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <input
                            type="radio"
                            name="learning-mode"
                            value={m.value}
                            checked={mode === m.value}
                            onChange={(e) => setMode(e.target.value as LearningMode)}
                            className="w-4 h-4 cursor-pointer"
                            aria-label={`${m.label} mode: ${m.description}`}
                        />
                        <span className="text-sm font-medium">{m.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}
