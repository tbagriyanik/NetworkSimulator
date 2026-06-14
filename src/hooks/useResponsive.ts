/**
 * Responsive Breakpoints Hook
 * Provides responsive layout management with breakpoint detection
 *
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';
export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveState {
    breakpoint: Breakpoint;
    width: number;
    height: number;
    orientation: Orientation;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTouchDevice: boolean;
    aspectRatio: number;
}

export interface ResponsiveOptions {
    mobileBreakpoint?: number;
    tabletBreakpoint?: number;
    desktopBreakpoint?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BREAKPOINTS = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
};

// ============================================================================
// Hook: Responsive
// ============================================================================

export function useResponsive(options: ResponsiveOptions = {}): ResponsiveState {
    const {
        mobileBreakpoint = DEFAULT_BREAKPOINTS.mobile,
        tabletBreakpoint = DEFAULT_BREAKPOINTS.tablet,
        desktopBreakpoint = DEFAULT_BREAKPOINTS.desktop,
    } = options;

    const [width, setWidth] = useState(0);
    const [height, setHeight] = useState(0);
    const [orientation, setOrientation] = useState<Orientation>('portrait');
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        // Set initial dimensions
        setWidth(window.innerWidth);
        setHeight(window.innerHeight);
        setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
        setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);

        const handleResize = () => {
            setWidth(window.innerWidth);
            setHeight(window.innerHeight);
            setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
        };

        const handleOrientationChange = () => {
            setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    const breakpoint = useMemo((): Breakpoint => {
        if (width < mobileBreakpoint) return 'mobile';
        if (width < tabletBreakpoint) return 'tablet';
        if (width < desktopBreakpoint) return 'desktop';
        return 'wide';
    }, [width, mobileBreakpoint, tabletBreakpoint, desktopBreakpoint]);

    const aspectRatio = useMemo(() => {
        if (height === 0) return 0;
        return width / height;
    }, [width, height]);

    return {
        breakpoint,
        width,
        height,
        orientation,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
        isTouchDevice,
        aspectRatio,
    };
}

// ============================================================================
// Hook: Media Query
// ============================================================================

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [query]);

    return matches;
}

// ============================================================================
// Responsive Component Helpers
// ============================================================================

export function useResponsiveValue<T>(
    values: { mobile: T; tablet?: T; desktop?: T; wide?: T },
    defaultValue: T
): T {
    const { isMobile, isTablet, isDesktop } = useResponsive();

    return useMemo(() => {
        if (isMobile) return values.mobile;
        if (isTablet && values.tablet !== undefined) return values.tablet;
        if (isDesktop && values.desktop !== undefined) return values.desktop;
        if (values.wide !== undefined) return values.wide;
        return defaultValue;
    }, [values, isMobile, isTablet, isDesktop, defaultValue]);
}

// ============================================================================
// Responsive Style Generators
// ============================================================================

export function getResponsiveClasses(
    mobile: string,
    tablet?: string,
    desktop?: string
): string {
    const classes = [mobile];

    if (tablet) {
        classes.push(`md:${tablet}`);
    }

    if (desktop) {
        classes.push(`lg:${desktop}`);
    }

    return classes.join(' ');
}

export function getResponsiveGridClasses(columns: { mobile: number; tablet?: number; desktop?: number }): string {
    const { mobile, tablet = mobile, desktop = tablet } = columns;

    return `grid-cols-${mobile} md:grid-cols-${tablet} lg:grid-cols-${desktop}`;
}

export function getResponsivePadding(size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string {
    const paddingMap = {
        xs: 'p-2 md:p-3 lg:p-4',
        sm: 'p-3 md:p-4 lg:p-6',
        md: 'p-4 md:p-6 lg:p-8',
        lg: 'p-6 md:p-8 lg:p-12',
        xl: 'p-8 md:p-12 lg:p-16',
    };

    return paddingMap[size];
}

export function getResponsiveFontSize(size: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'): string {
    const fontSizeMap: Record<string, string> = {
        xs: 'text-xs md:text-sm',
        sm: 'text-sm md:text-base',
        base: 'text-sm md:text-base lg:text-lg',
        lg: 'text-base md:text-lg lg:text-xl',
        xl: 'text-lg md:text-xl lg:text-2xl',
        '2xl': 'text-xl md:text-2xl lg:text-3xl',
        '3xl': 'text-2xl md:text-3xl lg:text-4xl',
    };

    return fontSizeMap[size] || fontSizeMap.base;
}

// ============================================================================
// Responsive Container
// ============================================================================

export interface ResponsiveContainerProps {
    children: React.ReactNode;
    className?: string;
    mobileClassName?: string;
    tabletClassName?: string;
    desktopClassName?: string;
}

export function getContainerClasses(props: ResponsiveContainerProps): string {
    const {
        className,
        mobileClassName,
        tabletClassName,
        desktopClassName,
    } = props;

    return cn(
        className,
        mobileClassName,
        tabletClassName && `md:${tabletClassName}`,
        desktopClassName && `lg:${desktopClassName}`
    );
}

// ============================================================================
// Responsive Layout Components
// ============================================================================

export function createResponsiveLayout(
    config: {
        mobile: string;
        tablet?: string;
        desktop?: string;
    }
): string {
    return cn(
        config.mobile,
        config.tablet && `md:${config.tablet}`,
        config.desktop && `lg:${config.desktop}`
    );
}

// Common responsive layouts
export const RESPONSIVE_LAYOUTS = {
    // Single column on mobile, side-by-side on desktop
    sidebarContent: createResponsiveLayout({
        mobile: 'flex flex-col',
        tablet: 'flex flex-row',
        desktop: 'flex flex-row',
    }),

    // Card grid
    cardGrid: createResponsiveLayout({
        mobile: 'grid grid-cols-1',
        tablet: 'grid grid-cols-2',
        desktop: 'grid grid-cols-3',
    }),

    // Full width on mobile, constrained on desktop
    constrained: createResponsiveLayout({
        mobile: 'w-full px-4',
        tablet: 'w-full px-6',
        desktop: 'max-w-6xl mx-auto px-8',
    }),

    // Hide on mobile, show on desktop
    desktopOnly: createResponsiveLayout({
        mobile: 'hidden',
        tablet: 'hidden',
        desktop: 'block',
    }),

    // Show on mobile, hide on desktop
    mobileOnly: createResponsiveLayout({
        mobile: 'block',
        tablet: 'hidden',
        desktop: 'hidden',
    }),
};

// ============================================================================
// Zoom Level Detection
// ============================================================================

export function useZoomLevel(): number {
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        const detectZoom = () => {
            // Calculate zoom level from device pixel ratio and window dimensions
            const zoomLevel = window.outerWidth / window.innerWidth;
            setZoom(Math.round(zoomLevel * 100) / 100);
        };

        detectZoom();
        window.addEventListener('resize', detectZoom);
        return () => window.removeEventListener('resize', detectZoom);
    }, []);

    return zoom;
}

// ============================================================================
// Responsive Utilities
// ============================================================================

export function useResponsiveFontSize(
    baseSize: number,
    scaleFactor: number = 1
): number {
    const { breakpoint } = useResponsive();

    return useMemo(() => {
        const scale = {
            mobile: 0.875,
            tablet: 1,
            desktop: 1.125,
            wide: 1.25,
        };

        return baseSize * scale[breakpoint] * scaleFactor;
    }, [breakpoint, baseSize, scaleFactor]);
}

export function useResponsiveSpacing(
    baseSpacing: number
): number {
    const { breakpoint } = useResponsive();

    return useMemo(() => {
        const scale = {
            mobile: 0.75,
            tablet: 1,
            desktop: 1.25,
            wide: 1.5,
        };

        return baseSpacing * scale[breakpoint];
    }, [breakpoint, baseSpacing]);
}

// ============================================================================
// Export
// ============================================================================

export default useResponsive;
