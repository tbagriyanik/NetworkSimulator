'use client';

import React from 'react';
import { useMode } from '@/contexts/ModeContext';
import { getModeName, getModeDescription } from '@/utils/modeFiltering';
import { cn } from '@/lib/utils';

export interface ModeIndicatorProps {
    className?: string;
    showDescription?: boolean;
    compact?: boolean;
}

const MODE_COLORS: Record<string, string> = {
    beginner: 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
    intermediate: 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100',
    advanced: 'bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100',
};

export function ModeIndicator({
    className,
    showDescription = false,
    compact = false,
}: ModeIndicatorProps) {
    const { mode } = useMode();
    const modeName = getModeName(mode);
    const modeDescription = getModeDescription(mode);
    const colorClass = MODE_COLORS[mode];

    if (compact) {
        return (
            <div
                className={cn(
                    'inline-flex items-center px-2 py-1 rounded text-xs font-semibold',
                    colorClass,
                    className
                )}
                title={modeDescription}
            >
                {modeName}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col gap-1 px-3 py-2 rounded-lg',
                colorClass,
                className
            )}
        >
            <div className="text-sm font-semibold">{modeName} Mode</div>
            {showDescription && (
                <div className="text-xs opacity-90">{modeDescription}</div>
            )}
        </div>
    );
}
