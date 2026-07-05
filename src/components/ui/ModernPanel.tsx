'use client';

import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useLayout } from '@/contexts/LayoutContext';
import { useTheme } from '@/contexts/ThemeContext';

export interface ModernPanelProps {
    id: string;
    title: string;
    children: ReactNode;
    onClose?: () => void;
    resizable?: boolean;
    collapsible?: boolean;
    defaultWidth?: number;
    defaultHeight?: number;
    minWidth?: number;
    minHeight?: number;
    className?: string;
    style?: React.CSSProperties;
    headerAction?: ReactNode;
    noPadding?: boolean;
    headerStart?: ReactNode;
    footer?: ReactNode;
    mobileAutoHeight?: boolean;
    hideTitle?: boolean;
    hideHeader?: boolean;
    mobileOnlyClose?: boolean;
    showHeaderOnMobile?: boolean;
}

export function ModernPanel({
    title,
    children,
    onClose,
    resizable = true,
    collapsible: _collapsible = true,
    defaultWidth = 400,
    defaultHeight = 600,
    minWidth = 250,
    minHeight = 300,
    className,
    style,
    headerAction,
    headerStart,
    footer,
    noPadding = false,
    hideTitle = false,
    hideHeader = false,
    mobileOnlyClose = false,
    showHeaderOnMobile = false,
}: ModernPanelProps) {
    const { panelLayout } = useLayout();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [width, setWidth] = useState(defaultWidth);
    const [height, setHeight] = useState(defaultHeight);
    const [isMobile, setIsMobile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia('(max-width: 639px)');
        const updateIsMobile = () => setIsMobile(mediaQuery.matches);

        updateIsMobile();
        mediaQuery.addEventListener('change', updateIsMobile);

        return () => {
            mediaQuery.removeEventListener('change', updateIsMobile);
        };
    }, []);

    // Use ref for resize to avoid React re-renders during resize
    const panelRef = useRef<HTMLDivElement>(null);
    const isResizingRef = useRef(false);
    const resizeStateRef = useRef({
        startX: 0,
        startY: 0,
        startWidth: defaultWidth,
        startHeight: defaultHeight,
    });

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizingRef.current = true;

        if (!panelRef.current) return;

        // Set cursor immediately via class on body or parent
        document.body.style.cursor = 'se-resize';
        document.body.style.userSelect = 'none';

        // Implement pointer capture for smooth tracking during fast movements
        if ('setPointerCapture' in panelRef.current && e instanceof PointerEvent) {
            try {
                panelRef.current.setPointerCapture((e as PointerEvent).pointerId);
            } catch (_err) {
                // Ignore if not a PointerEvent
            }
        }

        resizeStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startWidth: panelRef.current.offsetWidth,
            startHeight: panelRef.current.offsetHeight,
        };

        let animationFrameId: number | null = null;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!panelRef.current || !isResizingRef.current) return;

            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!panelRef.current || !isResizingRef.current) return;

                const deltaX = moveEvent.clientX - resizeStateRef.current.startX;
                const deltaY = moveEvent.clientY - resizeStateRef.current.startY;

                const newWidth = Math.max(minWidth, resizeStateRef.current.startWidth + deltaX);
                const newHeight = Math.max(minHeight, resizeStateRef.current.startHeight + deltaY);

                // Direct DOM update with batched style changes
                panelRef.current.style.width = `${newWidth}px`;
                panelRef.current.style.height = `${newHeight}px`;
                panelRef.current.style.willChange = 'width, height';
                panelRef.current.style.contain = 'layout style paint';
            });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Release pointer capture
            if (panelRef.current && 'releasePointerCapture' in panelRef.current && upEvent instanceof PointerEvent) {
                try {
                    panelRef.current.releasePointerCapture((upEvent as PointerEvent).pointerId);
                } catch (_err) {
                    // Ignore if not a PointerEvent
                }
            }

            if (panelRef.current) {
                const finalWidth = panelRef.current.offsetWidth;
                const finalHeight = panelRef.current.offsetHeight;
                setWidth(finalWidth);
                setHeight(finalHeight);
                panelRef.current.style.willChange = '';
                panelRef.current.style.contain = '';
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    const isOverlay = panelLayout === 'overlay';
    const isStacked = panelLayout === 'stacked';
    const canResize = resizable && isOverlay && !isMobile;
    const overlayMobileStyle: React.CSSProperties = {};
    if (isOverlay && isMobile) {
        overlayMobileStyle.width = 'calc(100vw - 10px)';
        overlayMobileStyle.left = "5px";
        overlayMobileStyle.right = "5px";
        overlayMobileStyle.top = "5px";
        overlayMobileStyle.bottom = "5px";
        overlayMobileStyle.maxHeight = 'calc(100vh - 10px)';
    }

    // Drag handling with performance optimization - uses top/left instead of transform
    const dragStateRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });

    const handleDragStart = (e: React.MouseEvent) => {
        if (!isOverlay || isMobile) return;
        const target = e.target as HTMLElement;
        const isHeader = target.closest('[data-drag-handle]') || target.closest('[data-drag-header]');
        if (!isHeader) return;

        e.preventDefault();
        setIsDragging(true);

        // Set cursor immediately
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        if (!panelRef.current) return;

        // Implement pointer capture for smooth tracking during fast movements
        if ('setPointerCapture' in panelRef.current && e instanceof PointerEvent) {
            try {
                panelRef.current.setPointerCapture((e as PointerEvent).pointerId);
            } catch (_err) {
                // Ignore if not a PointerEvent
            }
        }

        const rect = panelRef.current.getBoundingClientRect();
        dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: rect.left,
            startTop: rect.top,
        };

        let animationFrameId: number | null = null;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!panelRef.current || !isDragging) return;

            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(() => {
                if (!panelRef.current || !isDragging) return;

                const deltaX = moveEvent.clientX - dragStateRef.current.startX;
                const deltaY = moveEvent.clientY - dragStateRef.current.startY;

                // Use GPU-accelerated transform for smooth drag
                panelRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
                panelRef.current.style.willChange = 'transform';
                panelRef.current.style.contain = 'layout style paint';
            });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
            setIsDragging(false);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Release pointer capture
            if (panelRef.current && 'releasePointerCapture' in panelRef.current && upEvent instanceof PointerEvent) {
                try {
                    panelRef.current.releasePointerCapture((upEvent as PointerEvent).pointerId);
                } catch (_err) {
                    // Ignore if not a PointerEvent
                }
            }

            if (panelRef.current) {
                panelRef.current.style.willChange = '';
                panelRef.current.style.contain = '';
                const el = panelRef.current;
                const startLeft = dragStateRef.current.startLeft;
                const startTop = dragStateRef.current.startTop;
                const finalLeft = startLeft + (upEvent.clientX - dragStateRef.current.startX);
                const finalTop = startTop + (upEvent.clientY - dragStateRef.current.startY);
                // Smooth settle: animate transform to final offset, then commit left/top
                const settleDx = finalLeft - startLeft;
                const settleDy = finalTop - startTop;
                el.style.transition = 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                el.style.transform = `translate3d(${settleDx}px, ${settleDy}px, 0)`;
                setTimeout(() => {
                    el.style.left = `${finalLeft}px`;
                    el.style.top = `${finalTop}px`;
                    el.style.transform = '';
                    el.style.transition = '';
                }, 200);
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove, { passive: true });
        document.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    // Touch handling for mobile - drag not supported on mobile
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isOverlay) return;
        e.preventDefault();
    };

    return (
        <div
            ref={panelRef}
            className={cn(
                'flex flex-col border rounded-lg shadow-sm overflow-hidden transition-shadow duration-200',
                isDark ? 'bg-secondary-950/95 border-success-500/30' : 'bg-white/95 border-success-500 border-dashed',
                isOverlay && 'fixed z-40',
                isStacked && 'relative',
                isDragging && 'shadow-xl ring-1 ring-primary/10',
                className
            )}
            style={{
                width: isOverlay ? (isMobile ? 'calc(100vw - 10px)' : width) : '100%',
                height: isMobile ? 'calc(100vh - 10px)' : height,
                maxHeight: isMobile ? 'calc(100vh - 10px)' : undefined,
                ...overlayMobileStyle,
                ...style
            }}
            onMouseDown={handleDragStart}
            onTouchMove={handleTouchMove}
        >
            {/* Header - Simple, clean */}
            {(!hideHeader || (isMobile && showHeaderOnMobile)) && (
                <div
                    data-drag-header
                    className={cn(
                        "flex items-center justify-between gap-1.5 p-2 border-b select-none",
                        isDark ? "bg-secondary-900 border-success-500/30" : "bg-secondary-50 border-success-500/50",
                        isMobile && "p-1.5 min-h-[40px] touch-manipulation",
                    )}
                    style={{ touchAction: 'none' }}
                >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        {headerStart}
                        {!hideTitle && (
                            <h3 className={cn(
                                "text-sm font-semibold truncate",
                                isDark ? "text-secondary-200" : "text-secondary-800"
                            )}>
                                {title}
                            </h3>
                        )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {headerAction}
                        {onClose && (!mobileOnlyClose || isMobile) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    isDark
                                        ? "hover:bg-secondary-800 text-secondary-400 hover:text-secondary-100"
                                        : "hover:bg-secondary-200 text-secondary-500 hover:text-secondary-900"
                                )}
                                aria-label="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content - No extra effects */}
            <div className={cn(
                "flex-1 overflow-auto",
                !noPadding && "p-4",
                isMobile && !noPadding && "p-3"
            )}>
                {children}
            </div>

            {/* Footer - Optional */}
            {footer && (
                <div className={cn(
                    "p-3 border-t",
                    isDark ? "bg-secondary-900/50 border-success-500/30" : "bg-secondary-50/50 border-success-500/50"
                )}>
                    {footer}
                </div>
            )}

            {/* Resize Handle - Minimal */}
            {canResize && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 opacity-30 hover:opacity-100 transition-opacity"
                    onMouseDown={handleResizeStart}
                >
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isDark ? "bg-secondary-600" : "bg-secondary-400"
                    )} />
                </div>
            )}
        </div>
    );
}


