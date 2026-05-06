/**
 * Animation and Transition Components
 * Provides reusable animation components and utilities
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '@/constants/ui-ux';

/**
 * Fade In Animation Component
 */
interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
    ({ duration = ANIMATION_DURATIONS.normal, delay = 0, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-fade-in', className)}
            style={{
                animation: `fadeIn ${duration}ms ${ANIMATION_EASING.easeInOut} ${delay}ms forwards`,
                opacity: 0,
            }}
            {...props}
        >
            {children}
        </div>
    )
);
FadeIn.displayName = 'FadeIn';

/**
 * Fade Out Animation Component
 */
interface FadeOutProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const FadeOut = React.forwardRef<HTMLDivElement, FadeOutProps>(
    ({ duration = ANIMATION_DURATIONS.normal, delay = 0, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-fade-out', className)}
            style={{
                animation: `fadeOut ${duration}ms ${ANIMATION_EASING.easeInOut} ${delay}ms forwards`,
            }}
            {...props}
        >
            {children}
        </div>
    )
);
FadeOut.displayName = 'FadeOut';

/**
 * Slide In Animation Component
 */
interface SlideInProps extends React.HTMLAttributes<HTMLDivElement> {
    direction?: 'up' | 'down' | 'left' | 'right';
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const SlideIn = React.forwardRef<HTMLDivElement, SlideInProps>(
    (
        {
            direction = 'up',
            duration = ANIMATION_DURATIONS.normal,
            delay = 0,
            className,
            children,
            ...props
        },
        ref
    ) => {
        const directionMap = {
            up: 'slideInUp',
            down: 'slideInDown',
            left: 'slideInLeft',
            right: 'slideInRight',
        };

        return (
            <div
                ref={ref}
                className={cn(`animate-${directionMap[direction]}`, className)}
                style={{
                    animation: `${directionMap[direction]} ${duration}ms ${ANIMATION_EASING.easeOut} ${delay}ms forwards`,
                    opacity: 0,
                }}
                {...props}
            >
                {children}
            </div>
        );
    }
);
SlideIn.displayName = 'SlideIn';

/**
 * Scale Animation Component
 */
interface ScaleProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const Scale = React.forwardRef<HTMLDivElement, ScaleProps>(
    ({ duration = ANIMATION_DURATIONS.fast, delay = 0, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-scale', className)}
            style={{
                animation: `scale ${duration}ms ${ANIMATION_EASING.easeOut} ${delay}ms forwards`,
                transform: 'scale(0.95)',
            }}
            {...props}
        >
            {children}
        </div>
    )
);
Scale.displayName = 'Scale';

/**
 * Bounce Animation Component
 */
interface BounceProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const Bounce = React.forwardRef<HTMLDivElement, BounceProps>(
    ({ duration = ANIMATION_DURATIONS.slow, delay = 0, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-bounce', className)}
            style={{
                animation: `bounce ${duration}ms ${ANIMATION_EASING.easeInOut} ${delay}ms infinite`,
            }}
            {...props}
        >
            {children}
        </div>
    )
);
Bounce.displayName = 'Bounce';

/**
 * Pulse Animation Component
 */
interface PulseProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const Pulse = React.forwardRef<HTMLDivElement, PulseProps>(
    ({ duration = ANIMATION_DURATIONS.slow, delay = 0, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-pulse', className)}
            style={{
                animation: `pulse ${duration}ms ${ANIMATION_EASING.easeInOut} ${delay}ms infinite`,
            }}
            {...props}
        >
            {children}
        </div>
    )
);
Pulse.displayName = 'Pulse';

/**
 * Spin Animation Component
 */
interface SpinProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    delay?: number;
    children: React.ReactNode;
}

export const Spin = React.forwardRef<HTMLDivElement, SpinProps>(
    ({ duration = ANIMATION_DURATIONS.verySlow, delay = 0, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-spin', className)}
            style={{
                animation: `spin ${duration}ms ${ANIMATION_EASING.linear} ${delay}ms infinite`,
            }}
            {...props}
        >
            {children}
        </div>
    )
);
Spin.displayName = 'Spin';

/**
 * Shimmer Animation Component (skeleton loading)
 */
interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    children: React.ReactNode;
}

export const Shimmer = React.forwardRef<HTMLDivElement, ShimmerProps>(
    ({ duration = ANIMATION_DURATIONS.verySlow, className, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('animate-shimmer', className)}
            style={{
                animation: `shimmer ${duration}ms ${ANIMATION_EASING.linear} infinite`,
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                backgroundSize: '200% 100%',
            }}
            {...props}
        >
            {children}
        </div>
    )
);
Shimmer.displayName = 'Shimmer';

/**
 * Transition Component
 * Wraps content with CSS transitions
 */
interface TransitionProps extends React.HTMLAttributes<HTMLDivElement> {
    property?: string;
    duration?: number;
    easing?: string;
    children: React.ReactNode;
}

export const Transition = React.forwardRef<HTMLDivElement, TransitionProps>(
    (
        {
            property = 'all',
            duration = ANIMATION_DURATIONS.normal,
            easing = ANIMATION_EASING.easeInOut,
            className,
            children,
            ...props
        },
        ref
    ) => (
        <div
            ref={ref}
            className={className}
            style={{
                transition: `${property} ${duration}ms ${easing}`,
            }}
            {...props}
        >
            {children}
        </div>
    )
);
Transition.displayName = 'Transition';

/**
 * Stagger Animation Component
 * Animates children with staggered delays
 */
interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
    staggerDelay?: number;
    children: React.ReactNode;
}

export const Stagger = React.forwardRef<HTMLDivElement, StaggerProps>(
    ({ staggerDelay = 50, className, children, ...props }, ref) => {
        const childrenArray = React.Children.toArray(children);

        return (
            <div ref={ref} className={className} {...props}>
                {childrenArray.map((child, index) => (
                    <div
                        key={index}
                        style={{
                            animation: `fadeIn ${ANIMATION_DURATIONS.normal}ms ${ANIMATION_EASING.easeInOut} ${index * staggerDelay
                                }ms forwards`,
                            opacity: 0,
                        }}
                    >
                        {child}
                    </div>
                ))}
            </div>
        );
    }
);
Stagger.displayName = 'Stagger';

/**
 * Confetti Animation Component
 * Celebratory confetti effect
 */
interface ConfettiProps extends React.HTMLAttributes<HTMLDivElement> {
    duration?: number;
    particleCount?: number;
}

export const Confetti = React.forwardRef<HTMLDivElement, ConfettiProps>(
    ({ duration = ANIMATION_DURATIONS.slow, particleCount = 50, className, ...props }, ref) => {
        const particles = Array.from({ length: particleCount });

        return (
            <div ref={ref} className={cn('relative', className)} {...props}>
                {particles.map((_, index) => (
                    <div
                        key={index}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: '-10px',
                            backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][
                                Math.floor(Math.random() * 5)
                            ],
                            animation: `confetti ${duration}ms ease-in forwards`,
                            animationDelay: `${Math.random() * 200}ms`,
                        }}
                    />
                ))}
            </div>
        );
    }
);
Confetti.displayName = 'Confetti';

/**
 * Reduced Motion Wrapper
 * Respects prefers-reduced-motion preference
 */
interface ReducedMotionProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const ReducedMotion = React.forwardRef<HTMLDivElement, ReducedMotionProps>(
    ({ className, children, ...props }, ref) => {
        const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

        React.useEffect(() => {
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            setPrefersReducedMotion(mediaQuery.matches);

            const handleChange = (e: MediaQueryListEvent) => {
                setPrefersReducedMotion(e.matches);
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }, []);

        return (
            <div
                ref={ref}
                className={cn(prefersReducedMotion && 'motion-safe:animate-none', className)}
                style={{
                    animation: prefersReducedMotion ? 'none' : undefined,
                }}
                {...props}
            >
                {children}
            </div>
        );
    }
);
ReducedMotion.displayName = 'ReducedMotion';
