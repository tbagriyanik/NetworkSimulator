/**
 * useTypography Hook
 * Provides typography utilities and responsive sizing
 */

import { useEffect, useState } from 'react';
import { TYPOGRAPHY_SCALE, BREAKPOINTS } from '@/constants/ui-ux';
import { getResponsiveFontSize } from '@/lib/typography';

/**
 * Hook to get responsive font size
 */
export function useResponsiveFontSize(
    mobileSize: number,
    desktopSize: number
): number {
    const [fontSize, setFontSize] = useState(mobileSize);

    useEffect(() => {
        const handleResize = () => {
            const newSize = getResponsiveFontSize(
                mobileSize,
                desktopSize,
                window.innerWidth
            );
            setFontSize(newSize);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileSize, desktopSize]);

    return fontSize;
}

/**
 * Hook to get current breakpoint
 */
export function useBreakpointTypography() {
    const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>(
        'desktop'
    );

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < BREAKPOINTS.mobile) {
                setBreakpoint('mobile');
            } else if (width < BREAKPOINTS.tablet) {
                setBreakpoint('tablet');
            } else {
                setBreakpoint('desktop');
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
}

/**
 * Hook to get typography scale for current breakpoint
 */
export function useTypographyScale() {
    const breakpoint = useBreakpointTypography();

    const getScale = (variant: keyof typeof TYPOGRAPHY_SCALE) => {
        const scale = TYPOGRAPHY_SCALE[variant];

        // Adjust sizes for mobile
        if (breakpoint === 'mobile') {
            return {
                ...scale,
                size: Math.max(scale.size * 0.85, 12), // Minimum 12px
            };
        }

        // Adjust sizes for tablet
        if (breakpoint === 'tablet') {
            return {
                ...scale,
                size: Math.max(scale.size * 0.95, 12),
            };
        }

        // Desktop sizes are default
        return scale;
    };

    return { getScale, breakpoint };
}

/**
 * Hook to get typography styles as CSS object
 */
export function useTypographyStyles(
    variant: keyof typeof TYPOGRAPHY_SCALE
): React.CSSProperties {
    const { getScale } = useTypographyScale();
    const scale = getScale(variant);

    return {
        fontSize: `${scale.size}px`,
        fontWeight: scale.weight,
        lineHeight: scale.lineHeight,
        fontFamily: 'Inter, Segoe UI, sans-serif',
    };
}

/**
 * Hook to get responsive typography classes
 */
export function useResponsiveTypographyClasses(
    mobileVariant: keyof typeof TYPOGRAPHY_SCALE,
    tabletVariant?: keyof typeof TYPOGRAPHY_SCALE,
    desktopVariant?: keyof typeof TYPOGRAPHY_SCALE
): string {
    const breakpoint = useBreakpointTypography();

    if (breakpoint === 'mobile' && mobileVariant) {
        return `text-${mobileVariant}`;
    }

    if (breakpoint === 'tablet' && tabletVariant) {
        return `text-${tabletVariant}`;
    }

    if (breakpoint === 'desktop' && desktopVariant) {
        return `text-${desktopVariant}`;
    }

    return `text-${mobileVariant}`;
}
