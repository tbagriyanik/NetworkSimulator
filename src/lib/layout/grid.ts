/**
 * 12-Column Responsive Grid System
 * 
 * Provides utilities for creating responsive grid layouts with a 12-column system.
 * Supports mobile, tablet, and desktop breakpoints.
 */

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type GridSpan = GridColumns;

export interface ResponsiveGridValue<T> {
    mobile?: T;
    tablet?: T;
    desktop?: T;
}

export interface GridItemConfig {
    span?: ResponsiveGridValue<GridSpan>;
    offset?: ResponsiveGridValue<GridColumns>;
    order?: ResponsiveGridValue<number>;
}

export interface GridConfig {
    columns?: ResponsiveGridValue<GridColumns>;
    gap?: ResponsiveGridValue<number>;
    autoFlow?: 'row' | 'column' | 'dense';
    autoRows?: string;
}

/**
 * Calculate grid column span width percentage
 */
export function getGridColumnWidth(span: GridSpan, totalColumns: GridColumns = 12): number {
    return (span / totalColumns) * 100;
}

/**
 * Calculate grid column offset percentage
 */
export function getGridColumnOffset(offset: GridColumns, totalColumns: GridColumns = 12): number {
    return (offset / totalColumns) * 100;
}

/**
 * Get responsive grid CSS class names
 */
export function getResponsiveGridClasses(config: GridItemConfig): string {
    const classes: string[] = [];

    if (config.span?.mobile) {
        classes.push(`col-span-${config.span.mobile}`);
    }
    if (config.span?.tablet) {
        classes.push(`md:col-span-${config.span.tablet}`);
    }
    if (config.span?.desktop) {
        classes.push(`lg:col-span-${config.span.desktop}`);
    }

    if (config.offset?.mobile) {
        classes.push(`col-offset-${config.offset.mobile}`);
    }
    if (config.offset?.tablet) {
        classes.push(`md:col-offset-${config.offset.tablet}`);
    }
    if (config.offset?.desktop) {
        classes.push(`lg:col-offset-${config.offset.desktop}`);
    }

    if (config.order?.mobile !== undefined) {
        classes.push(`order-${config.order.mobile}`);
    }
    if (config.order?.tablet !== undefined) {
        classes.push(`md:order-${config.order.tablet}`);
    }
    if (config.order?.desktop !== undefined) {
        classes.push(`lg:order-${config.order.desktop}`);
    }

    return classes.join(' ');
}

/**
 * Get responsive grid container CSS class names
 */
export function getResponsiveGridContainerClasses(config: GridConfig): string {
    const classes: string[] = ['grid'];

    if (config.columns?.mobile) {
        classes.push(`grid-cols-${config.columns.mobile}`);
    }
    if (config.columns?.tablet) {
        classes.push(`md:grid-cols-${config.columns.tablet}`);
    }
    if (config.columns?.desktop) {
        classes.push(`lg:grid-cols-${config.columns.desktop}`);
    }

    if (config.gap?.mobile) {
        classes.push(`gap-${config.gap.mobile}`);
    }
    if (config.gap?.tablet) {
        classes.push(`md:gap-${config.gap.tablet}`);
    }
    if (config.gap?.desktop) {
        classes.push(`lg:gap-${config.gap.desktop}`);
    }

    if (config.autoFlow) {
        classes.push(`auto-flow-${config.autoFlow}`);
    }

    return classes.join(' ');
}

/**
 * Common grid configurations
 */
export const GRID_PRESETS = {
    // Full width single column
    fullWidth: {
        columns: { mobile: 1, tablet: 1, desktop: 1 },
        gap: { mobile: 16, tablet: 16, desktop: 16 },
    },

    // Two column layout
    twoColumn: {
        columns: { mobile: 1, tablet: 2, desktop: 2 },
        gap: { mobile: 16, tablet: 24, desktop: 32 },
    },

    // Three column layout
    threeColumn: {
        columns: { mobile: 1, tablet: 2, desktop: 3 },
        gap: { mobile: 16, tablet: 24, desktop: 32 },
    },

    // Four column layout
    fourColumn: {
        columns: { mobile: 2, tablet: 3, desktop: 4 },
        gap: { mobile: 12, tablet: 16, desktop: 24 },
    },

    // Twelve column grid (full control)
    twelveColumn: {
        columns: { mobile: 4, tablet: 8, desktop: 12 },
        gap: { mobile: 8, tablet: 12, desktop: 16 },
    },

    // Sidebar + main content
    sidebarLayout: {
        columns: { mobile: 1, tablet: 1, desktop: 12 },
        gap: { mobile: 16, tablet: 24, desktop: 32 },
    },
} as const;

/**
 * Common item span configurations
 */
export const GRID_ITEM_PRESETS = {
    // Full width
    fullWidth: {
        span: { mobile: 1, tablet: 1, desktop: 12 },
    },

    // Half width
    half: {
        span: { mobile: 1, tablet: 1, desktop: 6 },
    },

    // Third width
    third: {
        span: { mobile: 1, tablet: 1, desktop: 4 },
    },

    // Quarter width
    quarter: {
        span: { mobile: 1, tablet: 1, desktop: 3 },
    },

    // Two-thirds width
    twoThirds: {
        span: { mobile: 1, tablet: 1, desktop: 8 },
    },

    // Three-quarters width
    threeQuarters: {
        span: { mobile: 1, tablet: 1, desktop: 9 },
    },

    // Sidebar (3 columns)
    sidebar: {
        span: { mobile: 1, tablet: 1, desktop: 3 },
    },

    // Main content (9 columns)
    main: {
        span: { mobile: 1, tablet: 1, desktop: 9 },
    },
} as const;
