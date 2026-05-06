import { Breakpoint, breakpoints as CENTRAL_BREAKPOINTS } from '@/lib/design-tokens';
import { ResponsiveGridValue } from './grid';

export interface ResponsiveValue<T> {
    mobile?: T;
    tablet?: T;
    desktop?: T;
}

// Re-export ResponsiveGridValue for convenience
export type { ResponsiveGridValue } from './grid';

export interface LayoutRegion {
    height?: ResponsiveValue<number>;
    width?: ResponsiveValue<number>;
    padding?: ResponsiveValue<number>;
    margin?: ResponsiveValue<number>;
    sticky?: boolean;
    zIndex?: number;
}

export interface LayoutConfig {
    breakpoints: {
        mobile: { max: number };
        tablet: { min: number; max: number };
        desktop: { min: number };
    };
    regions: {
        header: LayoutRegion;
        sidebar: LayoutRegion;
        main: LayoutRegion;
        footer: LayoutRegion;
    };
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    breakpoints: CENTRAL_BREAKPOINTS,
    regions: {
        header: {
            height: { mobile: 60, tablet: 70, desktop: 80 },
            sticky: true,
            zIndex: 100,
        },
        sidebar: {
            width: { mobile: 0, tablet: 280, desktop: 320 },
            padding: { mobile: 0, tablet: 16, desktop: 16 },
        },
        main: {
            padding: { mobile: 16, tablet: 24, desktop: 32 },
        },
        footer: {
            height: { mobile: 60, tablet: 70, desktop: 80 },
            sticky: false,
            zIndex: 50,
        },
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
};

export function getResponsiveValue<T>(
    value: ResponsiveValue<T> | T,
    breakpoint: Breakpoint
): T | undefined {
    if (typeof value === 'object' && value !== null && 'mobile' in value) {
        const responsiveValue = value as ResponsiveValue<T>;
        if (breakpoint === 'mobile' && responsiveValue.mobile !== undefined) {
            return responsiveValue.mobile;
        }
        if (breakpoint === 'tablet' && responsiveValue.tablet !== undefined) {
            return responsiveValue.tablet;
        }
        if (breakpoint === 'desktop' && responsiveValue.desktop !== undefined) {
            return responsiveValue.desktop;
        }
        // Fallback to desktop value if available
        return responsiveValue.desktop;
    }
    return value as T;
}

export function calculateLayoutDimensions(
    config: LayoutConfig,
    breakpoint: Breakpoint,
    viewportWidth: number,
    viewportHeight: number
) {
    const headerHeight = getResponsiveValue(config.regions.header.height, breakpoint) || 60;
    const sidebarWidth = getResponsiveValue(config.regions.sidebar.width, breakpoint) || 0;
    const mainPadding = getResponsiveValue(config.regions.main.padding, breakpoint) || 16;
    const footerHeight = getResponsiveValue(config.regions.footer.height, breakpoint) || 60;

    const mainWidth = viewportWidth - sidebarWidth - mainPadding * 2;
    const mainHeight = viewportHeight - headerHeight - footerHeight - mainPadding * 2;

    return {
        header: { width: viewportWidth, height: headerHeight },
        sidebar: { width: sidebarWidth, height: viewportHeight - headerHeight - footerHeight },
        main: { width: mainWidth, height: mainHeight, padding: mainPadding },
        footer: { width: viewportWidth, height: footerHeight },
    };
}
