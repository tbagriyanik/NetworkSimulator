'use client';

import React, { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveGridValue } from '@/lib/layout/grid';

export interface ContainerProps {
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    padding?: ResponsiveGridValue<number>;
    margin?: ResponsiveGridValue<number>;
    className?: string;
    style?: CSSProperties;
    fluid?: boolean;
}

const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
};

const paddingClasses = {
    0: 'p-0',
    4: 'p-1',
    8: 'p-2',
    12: 'p-3',
    16: 'p-4',
    24: 'p-6',
    32: 'p-8',
};

const marginClasses = {
    0: 'm-0',
    4: 'm-1',
    8: 'm-2',
    12: 'm-3',
    16: 'm-4',
    24: 'm-6',
    32: 'm-8',
};

/**
 * Container Component
 * 
 * A responsive container that constrains content width and provides consistent padding.
 * Supports mobile, tablet, and desktop breakpoints.
 * 
 * @example
 * ```tsx
 * <Container maxWidth="lg" padding={{ mobile: 16, tablet: 24, desktop: 32 }}>
 *   <h1>Content</h1>
 * </Container>
 * ```
 */
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
    (
        {
            children,
            maxWidth = 'lg',
            padding,
            margin,
            className,
            style,
            fluid = false,
        },
        ref
    ) => {
        // Build responsive padding classes
        let paddingClass = '';
        if (padding) {
            if (padding.mobile) {
                paddingClass += `p-${padding.mobile / 4} `;
            }
            if (padding.tablet) {
                paddingClass += `md:p-${padding.tablet / 4} `;
            }
            if (padding.desktop) {
                paddingClass += `lg:p-${padding.desktop / 4} `;
            }
        }

        // Build responsive margin classes
        let marginClass = '';
        if (margin) {
            if (margin.mobile) {
                marginClass += `m-${margin.mobile / 4} `;
            }
            if (margin.tablet) {
                marginClass += `md:m-${margin.tablet / 4} `;
            }
            if (margin.desktop) {
                marginClass += `lg:m-${margin.desktop / 4} `;
            }
        }

        const containerClasses = cn(
            'mx-auto w-full',
            !fluid && maxWidthClasses[maxWidth],
            paddingClass,
            marginClass,
            className
        );

        return (
            <div ref={ref} className={containerClasses} style={style}>
                {children}
            </div>
        );
    }
);

Container.displayName = 'Container';
