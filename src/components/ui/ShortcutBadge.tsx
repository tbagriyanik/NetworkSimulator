'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface ShortcutBadgeProps {
    shortcut: string;
    className?: string;
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

/**
 * ShortcutBadge - Displays keyboard shortcuts with attractive styling
 * Examples: "Ctrl+S", "Shift+Alt+N", "⌘+Z"
 */
export function ShortcutBadge({
    shortcut,
    className,
    variant = 'primary'
}: ShortcutBadgeProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Parse shortcut into individual keys
    const keys = shortcut.split('+').map(k => k.trim());

    // Color variants
    const variantStyles = {
        default: isDark
            ? 'bg-secondary-700 text-secondary-200 border-secondary-600'
            : 'bg-secondary-200 text-secondary-700 border-secondary-300',
        primary: isDark
            ? 'bg-primary-900/60 text-primary-200 border-primary-700/60'
            : 'bg-primary-100 text-primary-700 border-primary-300',
        success: isDark
            ? 'bg-success-900/60 text-success-200 border-success-700/60'
            : 'bg-success-100 text-success-700 border-success-300',
        warning: isDark
            ? 'bg-warning-900/60 text-warning-200 border-warning-700/60'
            : 'bg-warning-100 text-warning-700 border-warning-300',
        danger: isDark
            ? 'bg-error-900/60 text-error-200 border-error-700/60'
            : 'bg-error-100 text-error-700 border-error-300',
    };

    return (
        <kbd
            className={cn(
                'inline-flex items-center gap-0.5 px-2 py-1 rounded text-xs font-mono font-semibold',
                'border border-current/30 shadow-sm',
                'transition-all duration-200',
                'hover:shadow-md hover:scale-105',
                variantStyles[variant],
                className
            )}
            title={`Keyboard shortcut: ${shortcut}`}
        >
            {keys.map((key, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <span className="opacity-60 mx-0.5">+</span>
                    )}
                    <span className="inline-block min-w-[1.2em] text-center">
                        {key}
                    </span>
                </React.Fragment>
            ))}
        </kbd>
    );
}


