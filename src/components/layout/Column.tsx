'use client';

import React, { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveGridValue, GridSpan } from '@/lib/layout/grid';

export interface ColumnProps {
    children: ReactNode;
    span?: ResponsiveGridValue<GridSpan>;
    offset?: ResponsiveGridValue<GridSpan>;
    className?: string;
    style?: CSSProperties;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
    order?: ResponsiveGridValue<number>;
}

const spanClasses: Record<GridSpan, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
};

const offsetClasses: Record<GridSpan, string> = {
    1: 'col-start-2',
    2: 'col-start-3',
    3: 'col-start-4',
    4: 'col-start-5',
    5: 'col-start-6',
    6: 'col-start-7',
    7: 'col-start-8',
    8: 'col-start-9',
    9: 'col-start-10',
    10: 'col-start-11',
    11: 'col-start-12',
    12: 'col-start-13',
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
 * Column Component
 * 
 * A responsive grid column that can span multiple columns and be offset.
 * Supports mobile, tablet, and desktop breakpoints.
 * 
 * @example
 * ```tsx
 * <Column span={{ mobile: 1, tablet: 1, desktop: 6 }}>
 *   Half width on desktop, full width on mobile
 * </Column>
 * ```
 */
export const Column = React.forwardRef<HTMLDivElement, ColumnProps>(
    (
        {
            children,
            span = { mobile: 1, tablet: 1, desktop: 1 },
            offset,
            className,
            style,
            align = 'stretch',
            justify = 'start',
            order,
        },
        ref
    ) => {
        // Build responsive span classes
        let spanClass = '';
        if (span.mobile) {
            spanClass += `${spanClasses[span.mobile]} `;
        }
        if (span.tablet) {
            spanClass += `md:${spanClasses[span.tablet]} `;
        }
        if (span.desktop) {
            spanClass += `lg:${spanClasses[span.desktop]} `;
        }

        // Build responsive offset classes
        let offsetClass = '';
        if (offset) {
            if (offset.mobile) {
                offsetClass += `${offsetClasses[offset.mobile]} `;
            }
            if (offset.tablet) {
                offsetClass += `md:${offsetClasses[offset.tablet]} `;
            }
            if (offset.desktop) {
                offsetClass += `lg:${offsetClasses[offset.desktop]} `;
            }
        }

        // Build responsive order classes
        let orderClass = '';
        if (order) {
            if (order.mobile !== undefined) {
                orderClass += `order-${order.mobile} `;
            }
            if (order.tablet !== undefined) {
                orderClass += `md:order-${order.tablet} `;
            }
            if (order.desktop !== undefined) {
                orderClass += `lg:order-${order.desktop} `;
            }
        }

        const columnClasses = cn(
            'flex flex-col',
            spanClass,
            offsetClass,
            orderClass,
            alignClasses[align],
            justifyClasses[justify],
            className
        );

        return (
            <div ref={ref} className={columnClasses} style={style}>
                {children}
            </div>
        );
    }
);

Column.displayName = 'Column';
