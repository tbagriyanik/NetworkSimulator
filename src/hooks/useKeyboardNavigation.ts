/**
 * Keyboard Navigation Hook
 * Provides comprehensive keyboard navigation support
 *
 * **Validates: Requirements 7.3, 7.4**
 */

'use client';

import { useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    handler: (event: KeyboardEvent) => void;
    description: string;
}

// ============================================================================
// Hook: Keyboard Shortcuts
// ============================================================================

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore shortcuts when typing in input fields
            if (event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement) {
                return;
            }

            const matched = shortcuts.find(shortcut => {
                const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
                const altMatches = !!shortcut.altKey === event.altKey;
                const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
                const metaMatches = !!shortcut.metaKey === event.metaKey;

                return keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches;
            });

            if (matched) {
                event.preventDefault();
                matched.handler(event);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, enabled]);
}




