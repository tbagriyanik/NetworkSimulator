/**
 * Focus Indicator Component
 * Provides visible focus indicators for all interactive elements
 *
 * **Validates: Requirement 7.4**
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface FocusIndicatorProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'ring' | 'glow' | 'underline';
    color?: 'blue' | 'green' | 'purple' | 'orange';
    thickness?: number;
    offset?: number;
    disabled?: boolean;
}

export interface FocusRingProps {
    isFocused: boolean;
    className?: string;
    color?: 'blue' | 'green' | 'purple' | 'orange';
    thickness?: number;
    offset?: number;
}

// ============================================================================
// Color Maps
// ============================================================================

const COLOR_MAPS = {
    blue: {
        ring: 'focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        glow: 'focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.5)]',
        underline: 'focus-visible:border-b-blue-500',
        bg: 'bg-blue-500',
        text: 'text-blue-600',
    },
    green: {
        ring: 'focus-visible:ring-green-500 focus-visible:ring-offset-2',
        glow: 'focus-visible:shadow-[0_0_0_4px_rgba(34,197,94,0.5)]',
        underline: 'focus-visible:border-b-green-500',
        bg: 'bg-green-500',
        text: 'text-green-600',
    },
    purple: {
        ring: 'focus-visible:ring-purple-500 focus-visible:ring-offset-2',
        glow: 'focus-visible:shadow-[0_0_0_4px_rgba(168,85,247,0.5)]',
        underline: 'focus-visible:border-b-purple-500',
        bg: 'bg-purple-500',
        text: 'text-purple-600',
    },
    orange: {
        ring: 'focus-visible:ring-orange-500 focus-visible:ring-offset-2',
        glow: 'focus-visible:shadow-[0_0_0_4px_rgba(249,115,22,0.5)]',
        underline: 'focus-visible:border-b-orange-500',
        bg: 'bg-orange-500',
        text: 'text-orange-600',
    },
};

// ============================================================================
// Component: Focus Ring
// ============================================================================

export function FocusRing({
    isFocused,
    className,
    color = 'blue',
    thickness = 2,
    offset = 2,
}: FocusRingProps) {
    if (!isFocused) return null;

    const colors = COLOR_MAPS[color];

    return (
        <span
            className={cn(
                'absolute inset-0 pointer-events-none rounded-inherit',
                colors.bg,
                'transition-all duration-150',
                className
            )}
            style={{
                boxShadow: `0 0 0 ${offset}px white, 0 0 0 ${offset + thickness}px currentColor`,
                opacity: 0.5,
            }}
            aria-hidden="true"
        />
    );
}

// ============================================================================
// Component: Focus Indicator
// ============================================================================

export function FocusIndicator({
    children,
    className,
    variant = 'default',
    color = 'blue',
    disabled = false,
}: FocusIndicatorProps) {
    const colors = COLOR_MAPS[color];

    const variantClasses = {
        default: cn(
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            colors.ring,
            'rounded-md'
        ),
        ring: cn(
            'focus-visible:outline-none',
            'focus-visible:ring-2',
            colors.ring,
            'rounded-md'
        ),
        glow: cn(
            'focus-visible:outline-none',
            'transition-shadow duration-200',
            colors.glow,
            'rounded-md'
        ),
        underline: cn(
            'focus-visible:outline-none',
            'border-b-2 border-transparent',
            'focus-visible:border-b-2',
            colors.underline,
            'rounded-none'
        ),
    };

    return (
        <span
            className={cn(
                'relative inline-block',
                !disabled && variantClasses[variant],
                className
            )}
            data-focus-indicator="true"
        >
            {children}
        </span>
    );
}

// ============================================================================
// Hook: Focus Management
// ============================================================================

export function useFocusManager<T extends HTMLElement>() {
    const elementRef = useRef<T>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const handleFocus = () => setIsFocused(true);
        const handleBlur = () => setIsFocused(false);

        element.addEventListener('focus', handleFocus);
        element.addEventListener('blur', handleBlur);

        return () => {
            element.removeEventListener('focus', handleFocus);
            element.removeEventListener('blur', handleBlur);
        };
    }, []);

    const focus = () => {
        elementRef.current?.focus();
    };

    const blur = () => {
        elementRef.current?.blur();
    };

    return {
        ref: elementRef,
        isFocused,
        focus,
        blur,
    };
}

// ============================================================================
// Component: Focusable Container
// ============================================================================

export interface FocusableContainerProps {
    children: React.ReactNode;
    className?: string;
    onFocusChange?: (focusedElement: Element | null) => void;
    trapFocus?: boolean;
}

export function FocusableContainer({
    children,
    className,
    onFocusChange,
    trapFocus = false,
}: FocusableContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleFocus = (event: FocusEvent) => {
            const target = event.target as Element;
            onFocusChange?.(target);
        };

        const handleBlur = (event: FocusEvent) => {
            // If focus is leaving the container
            if (trapFocus && !container.contains(event.relatedTarget as Node)) {
                // Restore focus to previous element
                const focusableElements = getFocusableElements(container);
                if (focusableElements.length > 0) {
                    event.preventDefault();
                    (focusableElements[0] as HTMLElement).focus();
                }
            }
        };

        // Store initial focus
        if (document.activeElement) {
            previousFocusRef.current = document.activeElement;
        }

        container.addEventListener('focusin', handleFocus);
        container.addEventListener('focusout', handleBlur);

        return () => {
            container.removeEventListener('focusin', handleFocus);
            container.removeEventListener('focusout', handleBlur);
            // Restore previous focus on unmount
            if (previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus();
            }
        };
    }, [onFocusChange, trapFocus]);

    return (
        <div
            ref={containerRef}
            className={cn('focus-within:outline-none', className)}
        >
            {children}
        </div>
    );
}

// ============================================================================
// Utility: Get Focusable Elements
// ============================================================================

export function getFocusableElements(container: Element): Element[] {
    const selector = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]:not([contenteditable="false"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(selector));
}

// ============================================================================
// Component: Focus Trap
// ============================================================================

export interface FocusTrapProps {
    children: React.ReactNode;
    isActive: boolean;
    className?: string;
    onEscape?: () => void;
}

export function FocusTrap({
    children,
    isActive,
    className,
    onEscape,
}: FocusTrapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const firstFocusableRef = useRef<HTMLElement | null>(null);
    const lastFocusableRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const container = containerRef.current;
        if (!container) return;

        // Find focusable elements
        const focusableElements = getFocusableElements(container) as HTMLElement[];
        if (focusableElements.length === 0) return;

        firstFocusableRef.current = focusableElements[0];
        lastFocusableRef.current = focusableElements[focusableElements.length - 1];

        // Focus first element
        firstFocusableRef.current.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') {
                if (event.key === 'Escape') {
                    onEscape?.();
                }
                return;
            }

            // Handle focus trapping
            if (event.shiftKey) {
                // Shift+Tab: If at first element, go to last
                if (document.activeElement === firstFocusableRef.current) {
                    event.preventDefault();
                    lastFocusableRef.current?.focus();
                }
            } else {
                // Tab: If at last element, go to first
                if (document.activeElement === lastFocusableRef.current) {
                    event.preventDefault();
                    firstFocusableRef.current?.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [isActive, onEscape]);

    if (!isActive) {
        return <>{children}</>;
    }

    return (
        <div
            ref={containerRef}
            className={cn('outline-none', className)}
            tabIndex={-1}
        >
            {children}
        </div>
    );
}

// ============================================================================
// Component: Skip Link
// ============================================================================

export interface SkipLinkProps {
    targetId: string;
    children?: React.ReactNode;
    className?: string;
}

export function SkipLink({ targetId, children = 'Skip to main content', className }: SkipLinkProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className={cn(
                'sr-only focus:not-sr-only',
                'focus:fixed focus:top-4 focus:left-4',
                'focus:z-50 focus:px-4 focus:py-2',
                'focus:bg-blue-600 focus:text-white',
                'focus:rounded-md focus:shadow-lg',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'transition-all duration-200',
                className
            )}
        >
            {children}
        </a>
    );
}

// ============================================================================
// Component: Focus Outline Style
// ============================================================================

export function getFocusOutlineClasses(color: 'blue' | 'green' | 'purple' | 'orange' = 'blue'): string {
    const colors = COLOR_MAPS[color];
    return cn(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        colors.ring,
        'rounded-md'
    );
}

// ============================================================================
// Global Focus Style Component
// ============================================================================

export function GlobalFocusStyles() {
    return (
        <style jsx global>{`
            /* High contrast focus outline */
            :focus-visible {
                outline: 2px solid currentColor;
                outline-offset: 2px;
            }

            /* Remove default focus for mouse users */
            :focus:not(:focus-visible) {
                outline: none;
            }

            /* Ensure focus is visible on all interactive elements */
            button:focus-visible,
            a:focus-visible,
            input:focus-visible,
            select:focus-visible,
            textarea:focus-visible,
            [tabindex]:not([tabindex="-1"]):focus-visible {
                outline: 2px solid #3b82f6;
                outline-offset: 2px;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
            }

            /* Dark mode adjustments */
            @media (prefers-color-scheme: dark) {
                button:focus-visible,
                a:focus-visible,
                input:focus-visible,
                select:focus-visible,
                textarea:focus-visible,
                [tabindex]:not([tabindex="-1"]):focus-visible {
                    outline-color: #60a5fa;
                    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.3);
                }
            }

            /* Reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                :focus-visible {
                    transition: none;
                }
            }
        `}</style>
    );
}

export default FocusIndicator;
