'use client';

import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip';

interface TooltipWrapperProps {
    title?: React.ReactNode;
    ariaLabel?: string;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    delayDuration?: number;
}

/**
 * Wrapper component that converts title attribute to Tooltip component
 * Usage: <TooltipWrapper title="My tooltip">
 *          <button>Hover me</button>
 *        </TooltipWrapper>
 */
export function TooltipWrapper({
    title,
    ariaLabel,
    children,
    side = 'bottom',
    delayDuration = 200
}: TooltipWrapperProps) {
    if (!title) {
        return <>{children}</>;
    }

    const effectiveAriaLabel = ariaLabel || (typeof title === 'string' ? title : undefined);

    const child = React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ 'aria-label'?: string }>, { 'aria-label': effectiveAriaLabel })
        : children;

    return (
        <Tooltip delayDuration={delayDuration}>
            <TooltipTrigger asChild>
                {child}
            </TooltipTrigger>
            <TooltipContent side={side}>
                {title}
            </TooltipContent>
        </Tooltip>
    );
}
