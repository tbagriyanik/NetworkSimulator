'use client';

import React, { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveGridValue, GridColumns } from '@/lib/layout/grid';

export interface RowProps {
    children: ReactNode;
    columns?: ResponsiveGridValue<GridColumns>;
    gap?: ResponsiveGridValue<number>;
    className?: string;
    style?: CSSProperties;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    wrap?: boolean;
}

const columnClasses: Record<GridColumns, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
};

const gapClasses: Record<number, string> = {
    0: 'gap-0',
    4: 'gap-1',
    8: 'gap-2',
    12: 'gap-3',
    16: 'gap-4',
    20: 'gap-5',
    24: 'gap-6',
    28: 'gap-7',
    32: 'gap-8',
    36: 'gap-9',
    40: 'gap-10',
};

const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
};

const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
};

/**
 * Row Component
 * 
 * A responsive grid row that arranges children in columns.
 * Supports mobile, tablet, and desktop breakpoints.
 * 
 * @example
 * ```tsx
 * <Row columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap={{ mobile: 16, tablet: 24, desktop: 32 }}>
 *   <Column>Item 1</Column>
 *   <Column>Item 2</Column>
 *   <Column>Item 3</Column>
 * </Row>
 * ```
 */
export const Row = React.forwardRef<HTMLDivElement, RowProps>(
    (
        {
            children,
            columns = { mobile: 1, tablet: 1, desktop: 1 },
            gap = { mobile: 16, tablet: 16, desktop: 16 },
            className,
            style,
            align = 'stretch',
            justify = 'start',
            wrap = true,
        },
        ref
    ) => {
        // Build responsive column classes
        let columnClass = '';
        if (columns.mobile) {
            columnClass += `${columnClasses[columns.mobile]} `;
        }
        if (columns.tablet) {
            columnClass += `md:${columnClasses[columns.tablet]} `;
        }
        if (columns.desktop) {
            columnClass += `lg:${columnClasses[columns.desktop]} `;
        }

        // Build responsive gap classes
        let gapClass = '';
        if (gap.mobile) {
            const gapKey = Object.keys(gapClasses).find(k => parseInt(k) === gap.mobile);
            if (gapKey) {
                gapClass += `${gapClasses[parseInt(gapKey)]} `;
            }
        }
        if (gap.tablet) {
            const gapKey = Object.keys(gapClasses).find(k => parseInt(k) === gap.tablet);
            if (gapKey) {
                gapClass += `md:${gapClasses[parseInt(gapKey)]} `;
            }
        }
        if (gap.desktop) {
            const gapKey = Object.keys(gapClasses).find(k => parseInt(k) === gap.desktop);
            if (gapKey) {
                gapClass += `lg:${gapClasses[parseInt(gapKey)]} `;
            }
        }

        const rowClasses = cn(
            'grid',
            columnClass,
            gapClass,
            alignClasses[align],
            justifyClasses[justify],
            !wrap && 'flex-nowrap',
            className
        );

        return (
            <div ref={ref} className={rowClasses} style={style}>
                {children}
            </div>
        );
    }
);

Row.displayName = 'Row';
