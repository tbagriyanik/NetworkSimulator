/**
 * Touch Optimization Hook
 * Provides touch-friendly interactions for mobile devices
 *
 * **Validates: Requirements 6.4, 6.5**
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TouchTargetProps {
    minSize?: number;
    className?: string;
    children: React.ReactNode;
}

export interface RippleEffectProps {
    color?: string;
    duration?: number;
    className?: string;
}

export interface TouchFeedbackProps {
    feedback?: 'ripple' | 'scale' | 'highlight';
    className?: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export interface TouchDragOptions {
    onDragStart?: (x: number, y: number) => void;
    onDragMove?: (x: number, y: number, deltaX: number, deltaY: number) => void;
    onDragEnd?: (x: number, y: number) => void;
    threshold?: number;
}

export interface PinchZoomOptions {
    onPinchStart?: (scale: number) => void;
    onPinchMove?: (scale: number, centerX: number, centerY: number) => void;
    onPinchEnd?: (scale: number) => void;
    minScale?: number;
    maxScale?: number;
}

// ============================================================================
// Constants
// ============================================================================

export const MIN_TOUCH_TARGET_SIZE = 44; // WCAG 2.5.5 Level AAA
const TOUCH_FEEDBACK_DURATION = 200;

// ============================================================================
// Hook: Touch Detection
// ============================================================================

export function useTouchDevice(): boolean {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const checkTouch = () => {
            setIsTouchDevice(
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                window.matchMedia('(pointer: coarse)').matches
            );
        };

        checkTouch();
    }, []);

    return isTouchDevice;
}

// ============================================================================
// Component: Touch Target (44px minimum)
// ============================================================================

export function TouchTarget({ minSize = MIN_TOUCH_TARGET_SIZE, className, children }: TouchTargetProps) {
    return (
        <div
            className={cn(
                'relative inline-flex items-center justify-center',
                'touch-manipulation', // Disable double-tap zoom
                className
            )}
            style={{
                minWidth: minSize,
                minHeight: minSize,
            }}
            data-touch-target="true"
        >
            {children}
        </div>
    );
}

// ============================================================================
// Component: Touch Feedback
// ============================================================================

export function TouchFeedback({
    feedback = 'ripple',
    className,
    children,
    disabled = false,
}: TouchFeedbackProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    const rippleId = useRef(0);

    const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
        if (disabled) return;

        if (feedback === 'ripple' && elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const id = ++rippleId.current;
            setRipples((prev) => [...prev, { id, x, y }]);

            // Remove ripple after animation
            setTimeout(() => {
                setRipples((prev) => prev.filter((r) => r.id !== id));
            }, TOUCH_FEEDBACK_DURATION);
        }
    }, [feedback, disabled]);

    const feedbackClasses = {
        ripple: '',
        scale: 'active:scale-95 transition-transform duration-100',
        highlight: 'active:bg-gray-100 dark:active:bg-gray-800 transition-colors duration-100',
    };

    return (
        <div
            ref={elementRef}
            onTouchStart={handleTouchStart}
            onMouseDown={handleTouchStart}
            className={cn(
                'relative overflow-hidden',
                'cursor-pointer',
                'select-none', // Prevent text selection
                'touch-manipulation',
                feedbackClasses[feedback],
                className
            )}
            style={{
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            {children}

            {/* Ripple Effects */}
            {feedback === 'ripple' &&
                ripples.map((ripple) => (
                    <span
                        key={ripple.id}
                        className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
                        style={{
                            left: ripple.x - 50,
                            top: ripple.y - 50,
                            width: 100,
                            height: 100,
                        }}
                    />
                ))}
        </div>
    );
}

// ============================================================================
// Hook: Touch Drag
// ============================================================================

export function useTouchDrag(options: TouchDragOptions) {
    const { onDragStart, onDragMove, onDragEnd, threshold = 10 } = options;
    const [isDragging, setIsDragging] = useState(false);
    const [hasMoved, setHasMoved] = useState(false);
    const startPos = useRef({ x: 0, y: 0 });
    const currentPos = useRef({ x: 0, y: 0 });

    const handleTouchStart = useCallback(
        (e: React.TouchEvent | React.MouseEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            startPos.current = { x: clientX, y: clientY };
            currentPos.current = { x: clientX, y: clientY };
            setHasMoved(false);
            setIsDragging(true);

            onDragStart?.(clientX, clientY);
        },
        [onDragStart]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent | React.MouseEvent) => {
            if (!isDragging) return;

            const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;

            const deltaX = clientX - currentPos.current.x;
            const deltaY = clientY - currentPos.current.y;

            const totalDeltaX = Math.abs(clientX - startPos.current.x);
            const totalDeltaY = Math.abs(clientY - startPos.current.y);

            // Check if moved beyond threshold
            if (totalDeltaX > threshold || totalDeltaY > threshold) {
                setHasMoved(true);
            }

            currentPos.current = { x: clientX, y: clientY };
            onDragMove?.(clientX, clientY, deltaX, deltaY);
        },
        [isDragging, onDragMove, threshold]
    );

    const handleTouchEnd = useCallback(
        (_e: React.TouchEvent | React.MouseEvent) => {
            if (!isDragging) return;

            setIsDragging(false);
            onDragEnd?.(currentPos.current.x, currentPos.current.y);
        },
        [isDragging, onDragEnd]
    );

    return {
        isDragging,
        hasMoved,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onMouseDown: handleTouchStart,
            onMouseMove: handleTouchMove,
            onMouseUp: handleTouchEnd,
            onMouseLeave: handleTouchEnd,
        },
    };
}

// ============================================================================
// Hook: Pinch Zoom
// ============================================================================

export function usePinchZoom(options: PinchZoomOptions) {
    const { onPinchStart, onPinchMove, onPinchEnd, minScale = 0.5, maxScale = 3 } = options;
    const [scale, setScale] = useState(1);
    const [isPinching, setIsPinching] = useState(false);
    const initialDistance = useRef(0);
    const initialScale = useRef(1);
    const center = useRef({ x: 0, y: 0 });

    const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (touch1: React.Touch, touch2: React.Touch) => ({
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    });

    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 2) {
                const distance = getDistance(e.touches[0], e.touches[1]);
                initialDistance.current = distance;
                initialScale.current = scale;
                center.current = getCenter(e.touches[0], e.touches[1]);
                setIsPinching(true);
                onPinchStart?.(scale);
            }
        },
        [scale, onPinchStart]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 2 && isPinching) {
                e.preventDefault(); // Prevent page zoom

                const distance = getDistance(e.touches[0], e.touches[1]);
                const scaleRatio = distance / initialDistance.current;
                let newScale = initialScale.current * scaleRatio;

                // Clamp scale
                newScale = Math.max(minScale, Math.min(maxScale, newScale));

                setScale(newScale);
                onPinchMove?.(newScale, center.current.x, center.current.y);
            }
        },
        [isPinching, minScale, maxScale, onPinchMove]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length < 2 && isPinching) {
                setIsPinching(false);
                onPinchEnd?.(scale);
            }
        },
        [isPinching, scale, onPinchEnd]
    );

    return {
        scale,
        isPinching,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
            onTouchCancel: handleTouchEnd,
        },
    };
}

// ============================================================================
// Component: Touch Spacer
// ============================================================================

export interface TouchSpacerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function TouchSpacer({ size = 'md', className }: TouchSpacerProps) {
    const sizeClasses = {
        sm: 'h-2 w-2',
        md: 'h-4 w-4',
        lg: 'h-6 w-6',
    };

    return <div className={cn(sizeClasses[size], className)} aria-hidden="true" />;
}

// ============================================================================
// Utility: Touch Target Validation
// ============================================================================

export function validateTouchTarget(element: Element): { valid: boolean; size: { width: number; height: number } } {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    // Check for explicit sizing
    const minWidth = parseInt(computedStyle.minWidth, 10) || rect.width;
    const minHeight = parseInt(computedStyle.minHeight, 10) || rect.height;

    return {
        valid: minWidth >= MIN_TOUCH_TARGET_SIZE && minHeight >= MIN_TOUCH_TARGET_SIZE,
        size: { width: minWidth, height: minHeight },
    };
}

// ============================================================================
// Touch-Optimized Button
// ============================================================================

export interface TouchButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'feedback'> {
    feedback?: 'ripple' | 'scale' | 'highlight';
    touchSize?: number;
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
    ({ children, feedback = 'ripple', touchSize = MIN_TOUCH_TARGET_SIZE, className, ...props }, ref) => {
        return (
            <TouchTarget minSize={touchSize}>
                <TouchFeedback feedback={feedback} disabled={props.disabled}>
                    <button
                        ref={ref}
                        className={cn(
                            'relative overflow-hidden',
                            'flex items-center justify-center',
                            'font-medium',
                            'transition-all duration-200',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </button>
                </TouchFeedback>
            </TouchTarget>
        );
    }
);

TouchButton.displayName = 'TouchButton';

// ============================================================================
// Touch Gesture Hook (Swipe)
// ============================================================================

export interface SwipeOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    threshold?: number;
    preventDefault?: boolean;
}

export function useSwipe(options: SwipeOptions) {
    const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50, preventDefault = false } = options;
    const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    }, []);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (preventDefault && touchStart.current) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStart.current.x);
                const deltaY = Math.abs(touch.clientY - touchStart.current.y);

                if (deltaX > 10 || deltaY > 10) {
                    e.preventDefault();
                }
            }
        },
        [preventDefault]
    );

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            if (!touchStart.current) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStart.current.x;
            const deltaY = touch.clientY - touchStart.current.y;
            const time = Date.now() - touchStart.current.time;

            // Only process if swipe was fast enough
            if (time < 500) {
                // Horizontal swipe
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    if (Math.abs(deltaX) > threshold) {
                        if (deltaX > 0) {
                            onSwipeRight?.();
                        } else {
                            onSwipeLeft?.();
                        }
                    }
                }
                // Vertical swipe
                else {
                    if (Math.abs(deltaY) > threshold) {
                        if (deltaY > 0) {
                            onSwipeDown?.();
                        } else {
                            onSwipeUp?.();
                        }
                    }
                }
            }

            touchStart.current = null;
        },
        [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]
    );

    return {
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    };
}

// ============================================================================
// Export
// ============================================================================

export default useTouchDrag;
