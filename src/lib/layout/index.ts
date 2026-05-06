/**
 * Layout Library
 * 
 * Responsive layout utilities, grid system, and media query helpers.
 */

// Grid system
export {
    type GridColumns,
    type GridSpan,
    type ResponsiveGridValue,
    type GridItemConfig,
    type GridConfig,
    getGridColumnWidth,
    getGridColumnOffset,
    getResponsiveGridClasses,
    getResponsiveGridContainerClasses,
    GRID_PRESETS,
    GRID_ITEM_PRESETS,
} from './grid';

// Media queries
export {
    type MediaQueryOperator,
    mq,
    createMediaQuery,
    createBreakpointQuery,
    type ResponsiveStyles,
    createResponsiveStyles,
    mediaQueries,
    matchesMediaQuery,
    onMediaQueryChange,
} from './media-queries';

// Responsive layout
export {
    type ResponsiveValue,
    type LayoutRegion,
    type LayoutConfig,
    DEFAULT_LAYOUT_CONFIG,
    getResponsiveValue,
    calculateLayoutDimensions,
} from './responsive';
