/**
 * useAnimation Hook
 * Provides animation utilities and state management
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '@/constants/ui-ux';
import {
    prefersReducedMotion,
    getSafeAnimationDuration,
    debounceAnimationFrame,
    throttleAnimationFrame,
} from '@/lib/animations';

/**
 * Hook to manage animation state
 */
export function useAnimationState(initialState: boolean = false) {
    const [isAnimating, setIsAnimating] = useState(initialState);

    const startAnimation = useCallback(() => {
        setIsAnimating(true);
    }, []);

    const stopAnimation = useCallback(() => {
        setIsAnimating(false);
    }, []);

    const toggleAnimation = useCallback(() => {
        setIsAnimating((prev) => !prev);
    }, []);

    return {
        isAnimating,
        startAnimation,
        stopAnimation,
        toggleAnimation,
    };
}

/**
 * Hook to handle animation completion
 */
export function useAnimationComplete(
    duration: keyof typeof ANIMATION_DURATIONS | number = 'normal',
    onComplete?: () => void
) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (onComplete) {
            const durationMs = typeof duration === 'number' ? duration : ANIMATION_DURATIONS[duration];
            timeoutRef.current = setTimeout(onComplete, durationMs);
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [duration, onComplete]);

    return {
        cancel: () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        },
    };
}

/**
 * Hook to check if animations are reduced
 */
export function useReducedMotion() {
    const [prefersReduced, setPrefersReduced] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReduced(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReduced(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReduced;
}

/**
 * Hook to get safe animation duration
 */
export function useSafeAnimationDuration(
    duration: keyof typeof ANIMATION_DURATIONS | number = 'normal'
): number {
    const prefersReduced = useReducedMotion();

    return prefersReduced ? 0 : getSafeAnimationDuration(duration);
}

/**
 * Hook to debounce animation frame
 */
export function useDebouncedAnimationFrame(callback: () => void) {
    return useMemo(() => debounceAnimationFrame(callback), [callback]);
}

/**
 * Hook to throttle animation frame
 */
export function useThrottledAnimationFrame(callback: () => void) {
    return useMemo(() => throttleAnimationFrame(callback), [callback]);
}

/**
 * Hook to manage animation frame
 */
export function useAnimationFrame(callback: (deltaTime: number) => void) {
    const frameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    useEffect(() => {
        const animate = (currentTime: number) => {
            const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 0;
            lastTimeRef.current = currentTime;

            callback(deltaTime);
            frameIdRef.current = requestAnimationFrame(animate);
        };

        frameIdRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
            }
        };
    }, [callback]);

    return {
        stop: () => {
            if (frameIdRef.current !== null) {
                cancelAnimationFrame(frameIdRef.current);
                frameIdRef.current = null;
            }
        },
    };
}

/**
 * Hook to manage animation sequence
 */
export function useAnimationSequence(
    animations: Array<{
        duration: number;
        onStart?: () => void;
        onComplete?: () => void;
    }>,
    autoStart: boolean = true
) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(autoStart);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isRunning || currentIndex >= animations.length) {
            return;
        }

        const animation = animations[currentIndex];
        animation.onStart?.();

        timeoutRef.current = setTimeout(() => {
            animation.onComplete?.();
            setCurrentIndex((prev) => prev + 1);
        }, animation.duration);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isRunning, currentIndex, animations]);

    return {
        currentIndex,
        isRunning,
        isComplete: currentIndex >= animations.length,
        start: () => setIsRunning(true),
        stop: () => setIsRunning(false),
        reset: () => {
            setCurrentIndex(0);
            setIsRunning(autoStart);
        },
    };
}

/**
 * Hook to manage hover animation
 */
export function useHoverAnimation(
    onHoverStart?: () => void,
    onHoverEnd?: () => void
) {
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        onHoverStart?.();
    }, [onHoverStart]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        onHoverEnd?.();
    }, [onHoverEnd]);

    return {
        isHovered,
        handlers: {
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
        },
    };
}

/**
 * Hook to manage focus animation
 */
export function useFocusAnimation(
    onFocusStart?: () => void,
    onFocusEnd?: () => void
) {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onFocusStart?.();
    }, [onFocusStart]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        onFocusEnd?.();
    }, [onFocusEnd]);

    return {
        isFocused,
        handlers: {
            onFocus: handleFocus,
            onBlur: handleBlur,
        },
    };
}

/**
 * Hook to manage scroll animation
 */
export function useScrollAnimation(
    onScroll?: (scrollY: number) => void,
    throttle: boolean = true
) {
    const [scrollY, setScrollY] = useState(0);
    const callbackRef = useRef(onScroll);

    useEffect(() => {
        callbackRef.current = onScroll;
    }, [onScroll]);

    useEffect(() => {
        const handleScroll = throttle
            ? throttleAnimationFrame(() => {
                setScrollY(window.scrollY);
                callbackRef.current?.(window.scrollY);
            })
            : () => {
                setScrollY(window.scrollY);
                callbackRef.current?.(window.scrollY);
            };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [throttle]);

    return scrollY;
}

/**
 * Hook to manage resize animation
 */
export function useResizeAnimation(
    onResize?: (width: number, height: number) => void,
    throttle: boolean = true
) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    const callbackRef = useRef(onResize);

    useEffect(() => {
        callbackRef.current = onResize;
    }, [onResize]);

    useEffect(() => {
        const handleResize = throttle
            ? throttleAnimationFrame(() => {
                const newSize = {
                    width: window.innerWidth,
                    height: window.innerHeight,
                };
                setSize(newSize);
                callbackRef.current?.(newSize.width, newSize.height);
            })
            : () => {
                const newSize = {
                    width: window.innerWidth,
                    height: window.innerHeight,
                };
                setSize(newSize);
                callbackRef.current?.(newSize.width, newSize.height);
            };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [throttle]);

    return size;
}

/**
 * Hook to manage transition
 */
export function useTransition(
    property: string = 'all',
    duration: keyof typeof ANIMATION_DURATIONS | number = 'normal',
    easing: keyof typeof ANIMATION_EASING | string = 'easeInOut'
) {
    const durationMs = typeof duration === 'number' ? duration : ANIMATION_DURATIONS[duration];
    const easingFunc =
        typeof easing === 'string' && easing in ANIMATION_EASING
            ? ANIMATION_EASING[easing as keyof typeof ANIMATION_EASING]
            : easing;

    return {
        transition: `${property} ${durationMs}ms ${easingFunc}`,
        duration: durationMs,
        easing: easingFunc,
    };
}
