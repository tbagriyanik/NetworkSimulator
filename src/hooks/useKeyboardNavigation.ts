/**
 * Keyboard Navigation Hook
 * Provides comprehensive keyboard navigation support
 *
 * **Validates: Requirements 7.3, 7.4**
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardNavigationOptions {
    containerRef: React.RefObject<HTMLElement | null>;
    selector?: string;
    arrowKeyNavigation?: boolean;
    escapeKeyEnabled?: boolean;
    focusOnMount?: boolean;
    onEscape?: () => void;
    onEnter?: (element: HTMLElement) => void;
    onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right', currentIndex: number) => void;
}

export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    handler: (event: KeyboardEvent) => void;
    description: string;
}

export interface UseKeyboardNavigationReturn {
    focusedIndex: number;
    setFocusedIndex: (index: number) => void;
    focusNext: () => void;
    focusPrevious: () => void;
    focusFirst: () => void;
    focusLast: () => void;
    getFocusableElements: () => HTMLElement[];
}

// ============================================================================
// Hook: Keyboard Navigation
// ============================================================================

export function useKeyboardNavigation(options: KeyboardNavigationOptions): UseKeyboardNavigationReturn {
    const {
        containerRef,
        selector = '[data-focusable="true"], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        arrowKeyNavigation = false,
        escapeKeyEnabled = false,
        focusOnMount = false,
        onEscape,
        onEnter,
        onArrowKey,
    } = options;

    const [focusedIndex, setFocusedIndex] = useState(-1);
    const elementsRef = useRef<HTMLElement[]>([]);

    const getFocusableElements = useCallback((): HTMLElement[] => {
        if (!containerRef.current) return [];
        return Array.from(containerRef.current.querySelectorAll(selector));
    }, [containerRef, selector]);

    const updateElements = useCallback(() => {
        elementsRef.current = getFocusableElements();
    }, [getFocusableElements]);

    const focusElement = useCallback((index: number) => {
        if (index >= 0 && index < elementsRef.current.length) {
            elementsRef.current[index].focus();
            setFocusedIndex(index);
        }
    }, []);

    const focusNext = useCallback(() => {
        updateElements();
        const nextIndex = focusedIndex + 1;
        if (nextIndex < elementsRef.current.length) {
            focusElement(nextIndex);
        } else {
            focusElement(0); // Wrap to first
        }
    }, [focusedIndex, focusElement, updateElements]);

    const focusPrevious = useCallback(() => {
        updateElements();
        const prevIndex = focusedIndex - 1;
        if (prevIndex >= 0) {
            focusElement(prevIndex);
        } else {
            focusElement(elementsRef.current.length - 1); // Wrap to last
        }
    }, [focusedIndex, focusElement, updateElements]);

    const focusFirst = useCallback(() => {
        updateElements();
        focusElement(0);
    }, [focusElement, updateElements]);

    const focusLast = useCallback(() => {
        updateElements();
        focusElement(elementsRef.current.length - 1);
    }, [focusElement, updateElements]);

    // Handle keyboard events
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            updateElements();

            switch (event.key) {
                case 'Tab':
                    // Let default Tab behavior work, but update focused index
                    setTimeout(() => {
                        const activeElement = document.activeElement as HTMLElement;
                        const index = elementsRef.current.indexOf(activeElement);
                        if (index !== -1) {
                            setFocusedIndex(index);
                        }
                    }, 0);
                    break;

                case 'ArrowDown':
                case 'ArrowRight':
                    if (arrowKeyNavigation) {
                        event.preventDefault();
                        focusNext();
                        onArrowKey?.(event.key === 'ArrowDown' ? 'down' : 'right', focusedIndex);
                    }
                    break;

                case 'ArrowUp':
                case 'ArrowLeft':
                    if (arrowKeyNavigation) {
                        event.preventDefault();
                        focusPrevious();
                        onArrowKey?.(event.key === 'ArrowUp' ? 'up' : 'left', focusedIndex);
                    }
                    break;

                case 'Enter':
                case ' ': // Space
                    {
                        const activeElement = document.activeElement as HTMLElement;
                        if (activeElement && elementsRef.current.includes(activeElement)) {
                            event.preventDefault();
                            onEnter?.(activeElement);
                            // Also trigger default click behavior
                            activeElement.click();
                        }
                    }
                    break;

                case 'Escape':
                    if (escapeKeyEnabled) {
                        event.preventDefault();
                        onEscape?.();
                    }
                    break;

                case 'Home':
                    event.preventDefault();
                    focusFirst();
                    break;

                case 'End':
                    event.preventDefault();
                    focusLast();
                    break;
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [containerRef, arrowKeyNavigation, escapeKeyEnabled, focusNext, focusPrevious, focusFirst, focusLast, focusedIndex, onArrowKey, onEnter, onEscape, updateElements]);

    // Focus on mount
    useEffect(() => {
        if (focusOnMount) {
            updateElements();
            if (elementsRef.current.length > 0) {
                focusElement(0);
            }
        }
    }, [focusOnMount, focusElement, updateElements]);

    return {
        focusedIndex,
        setFocusedIndex,
        focusNext,
        focusPrevious,
        focusFirst,
        focusLast,
        getFocusableElements,
    };
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

// ============================================================================
// Hook: Focus Trap (for modals/dialogs)
// ============================================================================

export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement | null>) {
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive) return;

        // Store previously focused element
        previousFocusRef.current = document.activeElement as HTMLElement;

        const container = containerRef.current;
        if (!container) return;

        // Find all focusable elements
        const focusableElements = Array.from(
            container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ) as HTMLElement[];

        if (focusableElements.length > 0) {
            // Focus first element
            focusableElements[0].focus();
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Trap focus
            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            // Restore previous focus
            previousFocusRef.current?.focus();
        };
    }, [isActive, containerRef]);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isFocusable(element: Element): boolean {
    const focusableSelectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]',
    ];

    return focusableSelectors.some(selector => element.matches(selector));
}

export function getNextFocusableElement(
    currentElement: Element,
    direction: 'next' | 'previous' = 'next',
    container: Element = document.body
): HTMLElement | null {
    const focusableElements = Array.from(container.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )) as HTMLElement[];

    const currentIndex = focusableElements.indexOf(currentElement as HTMLElement);
    if (currentIndex === -1) return null;

    if (direction === 'next') {
        return focusableElements[currentIndex + 1] || focusableElements[0] || null;
    } else {
        return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1] || null;
    }
}

export function createKeyboardShortcut(
    key: string,
    handler: () => void,
    options: Partial<Omit<KeyboardShortcut, 'key' | 'handler'>> = {}
): KeyboardShortcut {
    return {
        key,
        handler,
        description: options.description || `${key} shortcut`,
        ctrlKey: options.ctrlKey,
        altKey: options.altKey,
        shiftKey: options.shiftKey,
        metaKey: options.metaKey,
    };
}

// Common keyboard shortcuts
export const COMMON_SHORTCUTS = {
    save: (handler: () => void) => createKeyboardShortcut('s', handler, {
        ctrlKey: true,
        description: 'Save configuration (Ctrl+S)',
    }),
    undo: (handler: () => void) => createKeyboardShortcut('z', handler, {
        ctrlKey: true,
        description: 'Undo last action (Ctrl+Z)',
    }),
    redo: (handler: () => void) => createKeyboardShortcut('y', handler, {
        ctrlKey: true,
        description: 'Redo last action (Ctrl+Y)',
    }),
    delete: (handler: () => void) => createKeyboardShortcut('Delete', handler, {
        description: 'Delete selected item',
    }),
    escape: (handler: () => void) => createKeyboardShortcut('Escape', handler, {
        description: 'Close modal/cancel action',
    }),
    help: (handler: () => void) => createKeyboardShortcut('F1', handler, {
        description: 'Open help',
    }),
    focusSearch: (handler: () => void) => createKeyboardShortcut('f', handler, {
        ctrlKey: true,
        description: 'Focus search (Ctrl+F)',
    }),
    newDevice: (handler: () => void) => createKeyboardShortcut('n', handler, {
        ctrlKey: true,
        description: 'Add new device (Ctrl+N)',
    }),
};


