/**
 * Animation Utilities
 * Helper functions for animation management and timing
 */

import { ANIMATION_DURATIONS, ANIMATION_EASING } from '@/constants/ui-ux';

/**
 * Get animation duration in milliseconds
 */
export function getAnimationDuration(
    duration: keyof typeof ANIMATION_DURATIONS | number
): number {
    if (typeof duration === 'number') {
        return duration;
    }
    return ANIMATION_DURATIONS[duration];
}

/**
 * Get animation easing function
 */
export function getAnimationEasing(
    easing: keyof typeof ANIMATION_EASING | string
): string {
    if (typeof easing === 'string' && easing in ANIMATION_EASING) {
        return ANIMATION_EASING[easing as keyof typeof ANIMATION_EASING];
    }
    return easing;
}

/**
 * Create CSS animation string
 */
export function createAnimationCSS(
    name: string,
    duration: keyof typeof ANIMATION_DURATIONS | number = 'normal',
    easing: keyof typeof ANIMATION_EASING | string = 'easeInOut',
    delay: number = 0,
    iterationCount: number | string = 1
): string {
    const durationMs = getAnimationDuration(duration);
    const easingFunc = getAnimationEasing(easing);
    return `${name} ${durationMs}ms ${easingFunc} ${delay}ms ${iterationCount}`;
}

/**
 * Create CSS transition string
 */
export function createTransitionCSS(
    property: string = 'all',
    duration: keyof typeof ANIMATION_DURATIONS | number = 'normal',
    easing: keyof typeof ANIMATION_EASING | string = 'easeInOut',
    delay: number = 0
): string {
    const durationMs = getAnimationDuration(duration);
    const easingFunc = getAnimationEasing(easing);
    return `${property} ${durationMs}ms ${easingFunc} ${delay}ms`;
}

/**
 * Check if prefers-reduced-motion is enabled
 */
export function prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get safe animation duration (respects prefers-reduced-motion)
 */
export function getSafeAnimationDuration(
    duration: keyof typeof ANIMATION_DURATIONS | number
): number {
    if (prefersReducedMotion()) {
        return 0;
    }
    return getAnimationDuration(duration);
}

/**
 * Get safe animation CSS (respects prefers-reduced-motion)
 */
export function getSafeAnimationCSS(
    name: string,
    duration: keyof typeof ANIMATION_DURATIONS | number = 'normal',
    easing: keyof typeof ANIMATION_EASING | string = 'easeInOut',
    delay: number = 0,
    iterationCount: number | string = 1
): string {
    if (prefersReducedMotion()) {
        return 'none';
    }
    return createAnimationCSS(name, duration, easing, delay, iterationCount);
}

/**
 * Delay execution with animation frame
 */
export function animationFrameDelay(callback: () => void, frames: number = 1): number {
    if (frames <= 0) {
        callback();
        return 0;
    }

    let frameCount = 0;
    const frameId = requestAnimationFrame(() => {
        frameCount++;
        if (frameCount >= frames) {
            callback();
        } else {
            animationFrameDelay(callback, frames - frameCount);
        }
    });

    return frameId;
}

/**
 * Cancel animation frame
 */
export function cancelAnimationFrameDelay(id: number): void {
    cancelAnimationFrame(id);
}

/**
 * Stagger animation delays
 */
export function getStaggerDelay(index: number, staggerDelay: number = 50): number {
    return index * staggerDelay;
}

/**
 * Get animation class names
 */
export function getAnimationClasses(
    animation: string,
    duration: keyof typeof ANIMATION_DURATIONS = 'normal',
    easing: keyof typeof ANIMATION_EASING = 'easeInOut'
): string {
    const durationClass = `duration-${ANIMATION_DURATIONS[duration]}`;
    const easingClass = `ease-${easing}`;
    return `animate-${animation} ${durationClass} ${easingClass}`;
}

/**
 * Create keyframe animation
 */
export function createKeyframeAnimation(
    name: string,
    keyframes: Record<string, Record<string, string>>
): string {
    const keyframeRules = Object.entries(keyframes)
        .map(([key, styles]) => {
            const styleString = Object.entries(styles)
                .map(([prop, value]) => `${prop}: ${value};`)
                .join(' ');
            return `${key} { ${styleString} }`;
        })
        .join('\n');

    return `@keyframes ${name} {\n${keyframeRules}\n}`;
}

/**
 * Animate element to value
 */
export async function animateValue(
    element: HTMLElement,
    property: string,
    startValue: number,
    endValue: number,
    duration: number = 300
): Promise<void> {
    return new Promise((resolve) => {
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const value = startValue + (endValue - startValue) * progress;
            element.style.setProperty(property, `${value}`);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        };

        requestAnimationFrame(animate);
    });
}

/**
 * Get animation timing function
 */
export function getTimingFunction(
    easing: keyof typeof ANIMATION_EASING
): (t: number) => number {
    const timingFunctions: Record<keyof typeof ANIMATION_EASING, (t: number) => number> = {
        easeIn: (t) => t * t,
        easeOut: (t) => t * (2 - t),
        easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
        linear: (t) => t,
    };

    return timingFunctions[easing] || timingFunctions.linear;
}

/**
 * Debounce animation frame
 */
export function debounceAnimationFrame(callback: () => void): () => void {
    let frameId: number | null = null;

    return () => {
        if (frameId !== null) {
            cancelAnimationFrame(frameId);
        }
        frameId = requestAnimationFrame(callback);
    };
}

/**
 * Throttle animation frame
 */
export function throttleAnimationFrame(callback: () => void): () => void {
    let frameId: number | null = null;
    let lastTime = 0;

    return () => {
        const now = performance.now();
        if (now - lastTime >= 16) {
            // ~60fps
            lastTime = now;
            callback();
        } else if (frameId === null) {
            frameId = requestAnimationFrame(() => {
                frameId = null;
                callback();
            });
        }
    };
}

/**
 * Get animation delay for staggered animations
 */
export function getStaggeredDelay(
    index: number,
    baseDelay: number = 0,
    staggerAmount: number = 50
): number {
    return baseDelay + index * staggerAmount;
}

/**
 * Create animation sequence
 */
export async function animateSequence(
    animations: Array<{
        element: HTMLElement;
        animation: string;
        duration: number;
    }>
): Promise<void> {
    for (const { element, animation, duration } of animations) {
        element.style.animation = animation;
        await new Promise((resolve) => setTimeout(resolve, duration));
    }
}

/**
 * Create parallel animations
 */
export async function animateParallel(
    animations: Array<{
        element: HTMLElement;
        animation: string;
        duration: number;
    }>
): Promise<void> {
    const promises = animations.map(
        ({ element, animation, duration }) =>
            new Promise<void>((resolve) => {
                element.style.animation = animation;
                setTimeout(resolve, duration);
            })
    );

    await Promise.all(promises);
}
