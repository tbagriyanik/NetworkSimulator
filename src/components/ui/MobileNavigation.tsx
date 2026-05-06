/**
 * Mobile Navigation Component
 * Provides mobile-optimized navigation with hamburger menu, bottom sheet, and FAB
 *
 * **Validates: Requirements 6.1, 6.4, 6.5**
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Icon } from './icon';
import { FocusIndicator } from './FocusIndicator';

// ============================================================================
// Types
// ============================================================================

export interface MobileTopBarProps {
    logo?: React.ReactNode;
    modeSelector?: React.ReactNode;
    onMenuToggle?: () => void;
    className?: string;
}

export interface HamburgerMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    className?: string;
}

export interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export interface FloatingActionButtonProps {
    icon: string;
    label: string;
    onClick: () => void;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    color?: 'blue' | 'green' | 'purple' | 'orange';
    className?: string;
}

export interface MobileNavigationProps {
    topBar: MobileTopBarProps;
    menuItems: { icon: string; label: string; onClick: () => void }[];
    floatingActions?: FloatingActionButtonProps[];
    children: React.ReactNode;
    className?: string;
}

// ============================================================================
// Component: Mobile Top Bar
// ============================================================================

export function MobileTopBar({
    logo,
    modeSelector,
    onMenuToggle,
    className,
}: MobileTopBarProps) {
    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-50',
                'h-14 bg-white shadow-md',
                'flex items-center justify-between',
                'px-4',
                className
            )}
        >
            {/* Menu Button */}
            <FocusIndicator>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuToggle}
                    className="w-10 h-10"
                    aria-label="Open menu"
                >
                    <Icon name="menu" size={24} />
                </Button>
            </FocusIndicator>

            {/* Logo */}
            <div className="flex-1 flex items-center justify-center">
                {logo || (
                    <span className="text-lg font-bold text-blue-600">
                        NetSim
                    </span>
                )}
            </div>

            {/* Mode Selector */}
            <div className="w-10 flex items-center justify-end">
                {modeSelector}
            </div>
        </header>
    );
}

// ============================================================================
// Component: Hamburger Menu
// ============================================================================

export function HamburgerMenu({
    isOpen,
    onToggle,
    children,
    className,
}: HamburgerMenuProps) {
    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}

            {/* Menu Panel */}
            <div
                className={cn(
                    'fixed top-0 left-0 bottom-0 w-64 z-50',
                    'bg-white shadow-xl',
                    'transform transition-transform duration-300 ease-in-out',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                    className
                )}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
            >
                {/* Menu Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="font-semibold text-lg">Menu</span>
                    <FocusIndicator>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onToggle}
                            className="w-10 h-10"
                            aria-label="Close menu"
                        >
                            <Icon name="x" size={24} />
                        </Button>
                    </FocusIndicator>
                </div>

                {/* Menu Content */}
                <div className="p-4 space-y-2 overflow-y-auto">
                    {children}
                </div>
            </div>
        </>
    );
}

// ============================================================================
// Component: Bottom Sheet
// ============================================================================

export function BottomSheet({
    isOpen,
    onClose,
    title,
    children,
    className,
}: BottomSheetProps) {
    // Handle swipe to close
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [translateY, setTranslateY] = useState(0);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientY);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStart === null) return;

        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStart;

        if (diff > 0) {
            setTranslateY(diff);
        }
    }, [touchStart]);

    const handleTouchEnd = useCallback(() => {
        if (translateY > 100) {
            onClose();
        }
        setTranslateY(0);
        setTouchStart(null);
    }, [translateY, onClose]);

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sheet */}
            <div
                className={cn(
                    'fixed left-0 right-0 bottom-0 z-50',
                    'bg-white rounded-t-2xl shadow-2xl',
                    'transform transition-transform duration-300 ease-out',
                    isOpen ? 'translate-y-0' : 'translate-y-full',
                    className
                )}
                style={{
                    transform: isOpen ? `translateY(${translateY}px)` : 'translateY(100%)',
                    maxHeight: '80vh',
                }}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="flex items-center justify-center pt-3 pb-2">
                    <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <FocusIndicator>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="w-10 h-10"
                            aria-label="Close"
                        >
                            <Icon name="x" size={24} />
                        </Button>
                    </FocusIndicator>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {children}
                </div>
            </div>
        </>
    );
}

// ============================================================================
// Component: Floating Action Button
// ============================================================================

export function FloatingActionButton({
    icon,
    label,
    onClick,
    position = 'bottom-right',
    color = 'blue',
    className,
}: FloatingActionButtonProps) {
    const positionClasses = {
        'bottom-right': 'bottom-20 right-4',
        'bottom-left': 'bottom-20 left-4',
        'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
    };

    const colorClasses = {
        blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30',
        green: 'bg-green-600 hover:bg-green-700 shadow-green-500/30',
        purple: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30',
        orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30',
    };

    return (
        <FocusIndicator variant="glow" color={color}>
            <button
                onClick={onClick}
                className={cn(
                    'fixed z-40',
                    'w-14 h-14 rounded-full',
                    'flex items-center justify-center',
                    'text-white shadow-lg',
                    'transform transition-all duration-200',
                    'active:scale-95',
                    'hover:scale-105',
                    positionClasses[position],
                    colorClasses[color],
                    className
                )}
                aria-label={label}
                title={label}
            >
                <Icon name={icon} size={24} />
            </button>
        </FocusIndicator>
    );
}

// ============================================================================
// Component: Mobile Navigation (Main)
// ============================================================================

export function MobileNavigation({
    topBar,
    menuItems,
    floatingActions,
    children,
    className,
}: MobileNavigationProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const handleMenuToggle = useCallback(() => {
        setMenuOpen(prev => !prev);
    }, []);

    const handleMenuClose = useCallback(() => {
        setMenuOpen(false);
    }, []);

    return (
        <div className={cn('min-h-screen bg-gray-50', className)}>
            {/* Top Bar */}
            <MobileTopBar
                {...topBar}
                onMenuToggle={handleMenuToggle}
            />

            {/* Hamburger Menu */}
            <HamburgerMenu
                isOpen={menuOpen}
                onToggle={handleMenuToggle}
            >
                {menuItems.map((item, index) => (
                    <FocusIndicator key={index} className="w-full">
                        <button
                            onClick={() => {
                                item.onClick();
                                handleMenuClose();
                            }}
                            className={cn(
                                'w-full flex items-center gap-3',
                                'px-4 py-3 rounded-lg',
                                'text-gray-700 hover:bg-gray-100',
                                'transition-colors'
                            )}
                        >
                            <Icon name={item.icon} size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    </FocusIndicator>
                ))}
            </HamburgerMenu>

            {/* Main Content */}
            <main className="pt-14 pb-20">
                {children}
            </main>

            {/* Floating Action Buttons */}
            {floatingActions?.map((action, index) => (
                <FloatingActionButton
                    key={index}
                    {...action}
                />
            ))}
        </div>
    );
}

// ============================================================================
// Hook: Mobile Gestures
// ============================================================================

export function useMobileGestures(options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onPinch?: (scale: number) => void;
    onLongPress?: () => void;
    longPressDelay?: number;
    swipeThreshold?: number;
}) {
    const {
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        onPinch,
        onLongPress,
        longPressDelay = 500,
        swipeThreshold = 50,
    } = options;

    const touchStart = React.useRef<{ x: number; y: number; time: number } | null>(null);
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const initialPinchDistance = React.useRef<number | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

        // Handle pinch start
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
        }

        // Start long press timer
        if (onLongPress) {
            longPressTimer.current = setTimeout(() => {
                onLongPress();
                touchStart.current = null;
            }, longPressDelay);
        }
    }, [onLongPress, longPressDelay]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        // Clear long press on move
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // Handle pinch
        if (e.touches.length === 2 && initialPinchDistance.current && onPinch) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const scale = distance / initialPinchDistance.current;
            onPinch(scale);
        }
    }, [onPinch]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        // Clear long press timer
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // Handle swipe
        if (touchStart.current) {
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStart.current.x;
            const deltaY = touch.clientY - touchStart.current.y;
            const time = Date.now() - touchStart.current.time;

            // Only process if swipe was fast enough
            if (time < 500) {
                // Horizontal swipe
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (Math.abs(deltaX) > swipeThreshold) {
                        if (deltaX > 0) {
                            onSwipeRight?.();
                        } else {
                            onSwipeLeft?.();
                        }
                    }
                }
                // Vertical swipe
                else {
                    if (Math.abs(deltaY) > swipeThreshold) {
                        if (deltaY > 0) {
                            onSwipeDown?.();
                        } else {
                            onSwipeUp?.();
                        }
                    }
                }
            }

            touchStart.current = null;
        }

        initialPinchDistance.current = null;
    }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold]);

    return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    };
}

// ============================================================================
// Touch Feedback Component
// ============================================================================

export interface TouchFeedbackProps {
    children: React.ReactNode;
    className?: string;
    feedbackColor?: string;
}

export function TouchFeedback({
    children,
    className,
    feedbackColor = 'rgba(59, 130, 246, 0.2)',
}: TouchFeedbackProps) {
    return (
        <span
            className={cn(
                'relative overflow-hidden',
                'active:bg-blue-100',
                'transition-colors duration-150',
                'touch-manipulation',
                className
            )}
            style={{
                WebkitTapHighlightColor: feedbackColor,
            }}
        >
            {children}
        </span>
    );
}

export default MobileNavigation;
