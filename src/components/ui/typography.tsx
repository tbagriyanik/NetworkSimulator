/**
 * Typography Components
 * Provides semantic typography components for consistent text styling throughout the application
 * Implements the typography scale defined in the design system
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY_SCALE, FONT_FAMILIES } from '@/constants/ui-ux';

/**
 * Heading 1 Component
 * Used for page titles and main headings
 */
export const Heading1 = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h1
        ref={ref}
        className={cn(
            'font-bold',
            'text-3xl',
            'leading-tight',
            'tracking-tight',
            className
        )}
        style={{
            fontSize: `${TYPOGRAPHY_SCALE.h1.size}px`,
            fontWeight: TYPOGRAPHY_SCALE.h1.weight,
            lineHeight: TYPOGRAPHY_SCALE.h1.lineHeight,
            fontFamily: FONT_FAMILIES.primary,
        }}
        {...props}
    />
));
Heading1.displayName = 'Heading1';

/**
 * Heading 2 Component
 * Used for section titles
 */
export const Heading2 = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            'font-bold',
            'text-2xl',
            'leading-snug',
            'tracking-tight',
            className
        )}
        style={{
            fontSize: `${TYPOGRAPHY_SCALE.h2.size}px`,
            fontWeight: TYPOGRAPHY_SCALE.h2.weight,
            lineHeight: TYPOGRAPHY_SCALE.h2.lineHeight,
            fontFamily: FONT_FAMILIES.primary,
        }}
        {...props}
    />
));
Heading2.displayName = 'Heading2';

/**
 * Heading 3 Component
 * Used for subsection titles
 */
export const Heading3 = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            'font-semibold',
            'text-lg',
            'leading-relaxed',
            'tracking-tight',
            className
        )}
        style={{
            fontSize: `${TYPOGRAPHY_SCALE.h3.size}px`,
            fontWeight: TYPOGRAPHY_SCALE.h3.weight,
            lineHeight: TYPOGRAPHY_SCALE.h3.lineHeight,
            fontFamily: FONT_FAMILIES.primary,
        }}
        {...props}
    />
));
Heading3.displayName = 'Heading3';

/**
 * Body Component
 * Used for main body text
 */
export const Body = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn(
            'font-normal',
            'text-base',
            'leading-relaxed',
            className
        )}
        style={{
            fontSize: `${TYPOGRAPHY_SCALE.body.size}px`,
            fontWeight: TYPOGRAPHY_SCALE.body.weight,
            lineHeight: TYPOGRAPHY_SCALE.body.lineHeight,
            fontFamily: FONT_FAMILIES.primary,
        }}
        {...props}
    />
));
Body.displayName = 'Body';

/**
 * Small Component
 * Used for secondary text and labels
 */
export const Small = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn(
            'font-normal',
            'text-sm',
            'leading-relaxed',
            className
        )}
        style={{
            fontSize: `${TYPOGRAPHY_SCALE.small.size}px`,
            fontWeight: TYPOGRAPHY_SCALE.small.weight,
            lineHeight: TYPOGRAPHY_SCALE.small.lineHeight,
            fontFamily: FONT_FAMILIES.primary,
        }}
        {...props}
    />
));
Small.displayName = 'Small';

/**
 * Caption Component
 * Used for captions, hints, and very small text
 */
export const Caption = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn(
            'font-normal',
            'text-xs',
            'leading-relaxed',
            'text-gray-600',
            className
        )}
        style={{
            fontSize: `${TYPOGRAPHY_SCALE.tiny.size}px`,
            fontWeight: TYPOGRAPHY_SCALE.tiny.weight,
            lineHeight: TYPOGRAPHY_SCALE.tiny.lineHeight,
            fontFamily: FONT_FAMILIES.primary,
        }}
        {...props}
    />
));
Caption.displayName = 'Caption';

/**
 * Monospace Component
 * Used for code, IP addresses, and technical text
 */
export const Monospace = React.forwardRef<
    HTMLElement,
    React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
    <code
        ref={ref}
        className={cn(
            'font-mono',
            'text-sm',
            'bg-gray-100',
            'px-2',
            'py-1',
            'rounded',
            className
        )}
        style={{
            fontFamily: FONT_FAMILIES.monospace,
        }}
        {...props}
    />
));
Monospace.displayName = 'Monospace';

/**
 * Text Component
 * Generic text component with size variants
 */
interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
    as?: 'span' | 'div' | 'p';
}

export const Text = React.forwardRef<HTMLElement, TextProps>(
    ({ className, variant = 'body', as: Component = 'span', ...props }, ref) => {
        const variantStyles = {
            h1: 'font-bold text-3xl leading-tight',
            h2: 'font-bold text-2xl leading-snug',
            h3: 'font-semibold text-lg leading-relaxed',
            body: 'font-normal text-base leading-relaxed',
            small: 'font-normal text-sm leading-relaxed',
            caption: 'font-normal text-xs leading-relaxed text-gray-600',
        };

        return (
            <Component
                ref={ref as any}
                className={cn(variantStyles[variant], className)}
                {...props}
            />
        );
    }
);
Text.displayName = 'Text';

/**
 * Responsive Typography Component
 * Automatically adjusts font size based on screen size
 */
interface ResponsiveTypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
    as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';
    mobileSize?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
    tabletSize?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
    desktopSize?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
}

export const ResponsiveTypography = React.forwardRef<
    HTMLElement,
    ResponsiveTypographyProps
>(
    (
        {
            className,
            variant = 'body',
            as: Component = 'p',
            mobileSize,
            tabletSize,
            desktopSize,
            ...props
        },
        ref
    ) => {
        const variantStyles = {
            h1: 'font-bold text-3xl leading-tight',
            h2: 'font-bold text-2xl leading-snug',
            h3: 'font-semibold text-lg leading-relaxed',
            body: 'font-normal text-base leading-relaxed',
            small: 'font-normal text-sm leading-relaxed',
            caption: 'font-normal text-xs leading-relaxed text-gray-600',
        };

        const mobileClass = mobileSize ? variantStyles[mobileSize] : '';
        const tabletClass = tabletSize ? `md:${variantStyles[tabletSize]}` : '';
        const desktopClass = desktopSize ? `lg:${variantStyles[desktopSize]}` : '';

        return (
            <Component
                ref={ref as any}
                className={cn(
                    variantStyles[variant],
                    mobileClass,
                    tabletClass,
                    desktopClass,
                    className
                )}
                {...props}
            />
        );
    }
);
ResponsiveTypography.displayName = 'ResponsiveTypography';
