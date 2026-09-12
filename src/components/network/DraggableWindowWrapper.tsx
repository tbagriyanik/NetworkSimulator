'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/hooks/useWindowStore';
import { DragPosition as ModalPosition, DragSize as ModalSize } from '@/hooks/useDrag';
import { useLanguage } from '@/contexts/LanguageContext';

interface DraggableWindowWrapperProps {
  id: string;
  title: string | React.ReactNode;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  modalPosition: ModalPosition;
  modalSize: ModalSize;
  handlePointerDown?: (e: React.PointerEvent, id: string) => void;
  handleResizeStart?: (e: React.PointerEvent, direction: string, id: string) => void;
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
  contentClassName?: string;
  onEscapeKeyDown?: () => void;
  mobileFullScreen?: boolean;
  headerActions?: React.ReactNode;
  collapsible?: boolean;
  disableResize?: boolean;
  onHeaderDoubleClick?: () => void;
  restoreRequest?: number;
  contentInset?: boolean;
}

export function DraggableWindowWrapper({
  id,
  title,
  icon,
  isOpen,
  onClose,
  isDark = false,
  modalPosition,
  modalSize,
  handlePointerDown,
  handleResizeStart,
  children,
  className,
  hideCloseButton = false,
  contentClassName,
  onEscapeKeyDown,
  mobileFullScreen = true,
  headerActions,
  collapsible = false,
  disableResize = false,
  onHeaderDoubleClick,
  restoreRequest,
  contentInset = false,
}: DraggableWindowWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, language } = useLanguage();

  const activeWindowId = useWindowStore(state => state.activeWindowId);
  const setActiveWindow = useWindowStore(state => state.setActiveWindow);
  const zIndex = useWindowStore(state => state.windowZIndices[id] || 100);

  const isActive = activeWindowId === id;

  useEffect(() => {
    if (restoreRequest !== undefined) {
      setIsCollapsed(false);
    }
  }, [restoreRequest]);

  // Bring to front on mount and when opened
  useEffect(() => {
    if (isOpen) {
      setActiveWindow(id);
    }
  }, [isOpen, id, setActiveWindow]);

  // Handle focus when clicking anywhere inside the window
  const handleFocus = () => {
    setActiveWindow(id);
  };

  // Handle escape key and mobile back button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (onEscapeKeyDown) {
          onEscapeKeyDown();
        } else {
          onClose();
        }
      }
    };

    const handleMobileBack = () => {
      if (isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mobile-back-pressed', handleMobileBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mobile-back-pressed', handleMobileBack);
    };
  }, [isOpen, onClose, onEscapeKeyDown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMinimizeShortcut = (e.ctrlKey || e.metaKey)
        && (e.key.toLowerCase() === 'm' || e.code === 'KeyM');

      if (isMinimizeShortcut && collapsible && isOpen && isActive) {
        e.preventDefault();
        e.stopPropagation();
        setIsCollapsed(prev => !prev);
      }
    };

    // Capture the shortcut before a focused CLI/editor can consume it.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [collapsible, isOpen, isActive]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isOpen) return null;

  const isMobileFullScreen = isMobile && mobileFullScreen;

  const handleResizePointerDown = (e: React.PointerEvent, direction: string) => {
    e.stopPropagation();
    handleResizeStart?.(e, direction, id);
  };

  // Desktop or floating mobile styles
  const wrapperStyle: React.CSSProperties = isMobileFullScreen
    ? {
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      zIndex,
    }
    : {
      position: 'fixed',
      left: isMobile ? Math.max(8, Math.min(modalPosition.x, (typeof window !== 'undefined' ? window.innerWidth : 360) - 300)) : modalPosition.x,
      top: isMobile ? Math.max(8, Math.min(modalPosition.y, (typeof window !== 'undefined' ? window.innerHeight : 600) - 200)) : modalPosition.y,
      width: isMobile ? 'calc(100vw - 16px)' : modalSize.width,
      maxWidth: '100vw',
      maxHeight: isMobile ? 'calc(100vh - 32px)' : '100vh',
      height: isCollapsed ? 'auto' : (isMobile ? Math.min(modalSize.height, (typeof window !== 'undefined' ? window.innerHeight - 32 : 400)) : modalSize.height),
      zIndex,
      touchAction: 'none',
    };

  return (
    <div
      ref={containerRef}
      data-modal-id={id}
      data-modal-content="true"
      style={wrapperStyle}
      className={cn(
        'flex flex-col overflow-hidden shadow-2xl transition-shadow',
        isMobileFullScreen ? 'rounded-none' : 'rounded-xl border',
        isDark ? 'bg-secondary-900' : 'bg-white',
        // Green border when active (on desktop or floating on mobile)
        isActive && (!isMobile || !isMobileFullScreen)
          ? (isDark ? 'border-success-500/70 shadow-success-500/20' : 'border-success-500/80 shadow-success-500/30')
          : (isDark ? 'border-secondary-700' : 'border-secondary-200'),
        className
      )}
      onPointerDownCapture={handleFocus}
      onMouseDownCapture={handleFocus}
      onTouchStartCapture={handleFocus}
      onFocusCapture={handleFocus}
    >
      {/* Header */}
      <div
        data-modal-header="true"
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button, [role="tab"], input, select, textarea, .no-drag')) return;
          handlePointerDown?.(e, id);
        }}
        onDoubleClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('button, [role="tab"], input, select, textarea, .no-drag')) return;
          if (collapsible && !isMobile) {
            setIsCollapsed(prev => !prev);
          } else if (onHeaderDoubleClick) {
            onHeaderDoubleClick();
          }
        }}
        className={cn(
          'flex items-center justify-between px-3 py-2 select-none shrink-0 group',
          // Every window title is a drag handle, including title text and
          // mobile layouts; action controls stop propagation below.
          'cursor-grab active:cursor-grabbing',
          isDark
            ? 'bg-secondary-700 border-b-2 border-secondary-500/60'
            : 'bg-secondary-100 border-b-2 border-secondary-300',
          isActive && !isMobile && (isDark ? 'bg-success-900/20' : 'bg-success-100/50')
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden w-full">
          {icon && (
            <div className={cn("flex-shrink-0 pointer-events-none", isDark ? "text-secondary-400" : "text-secondary-500", isActive && "text-success-500")}>
              {icon}
            </div>
          )}
          {typeof title === 'string' ? (
            <h2 className={cn(
              "text-sm font-semibold truncate pointer-events-none cursor-grab active:cursor-grabbing",
              isDark ? "text-secondary-100" : "text-secondary-900"
            )}>
              {title}
            </h2>
          ) : (
            <div className={cn("text-sm font-semibold flex-1 min-w-0 flex items-center cursor-grab active:cursor-grabbing", isDark ? "text-secondary-100" : "text-secondary-900")}>
              {title}
            </div>
          )}
        </div>

        {headerActions && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {headerActions}
          </div>
        )}

        {collapsible && !isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className={cn(
              "flex items-center justify-center p-1.5 ml-2 rounded transition-colors shrink-0",
              isDark
                ? "text-secondary-400 hover:text-white hover:bg-secondary-700"
                : "text-secondary-500 hover:text-secondary-900 hover:bg-secondary-200"
            )}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? t.expand : (language === 'tr' ? 'Küçült' : 'Collapse')}
            title={isCollapsed ? t.expand : (language === 'tr' ? 'Küçült' : 'Collapse')}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}

        {!hideCloseButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "flex items-center justify-center w-6 h-6 ml-2 rounded-md bg-error-500 text-white hover:bg-error-600 active:scale-95 transition-all shrink-0 shadow-sm border border-error-600/30",
            )}
            aria-label={t.close}
            title={t.close}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className={cn("flex-1 min-h-0 flex flex-col relative overflow-hidden", contentInset && "pb-2 pr-2", contentClassName)}>
          {children}
        </div>
      )}

      {/* Resize Handles (Desktop and Mobile non-fullscreen) */}
      {(!isMobile || !isMobileFullScreen) && !isCollapsed && !disableResize && (
        <>
          {/* Corners */}
          <div className={cn("absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize z-50 flex items-end justify-end opacity-60 hover:opacity-100 transition-opacity select-none")} onPointerDown={(e) => handleResizePointerDown(e, 'se')}>
            <div className={cn("w-2 h-2 rounded-br-sm border-b-2 border-r-2 bg-transparent mr-0.5 mb-0.5", isDark ? "border-secondary-400" : "border-secondary-600", isActive && "border-success-500")} />
          </div>
          <div className="absolute left-0 bottom-0 w-2.5 h-2.5 cursor-sw-resize z-50 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 'sw')} />
          <div className="absolute right-0 top-0 w-2.5 h-2.5 cursor-ne-resize z-50 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 'ne')} />
          <div className="absolute left-0 top-0 w-2.5 h-2.5 cursor-nw-resize z-50 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 'nw')} />

          {/* Edges */}
          <div className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 'e')} />
          <div className="absolute left-3 bottom-0 right-3 h-1 cursor-s-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 's')} />
          <div className="absolute left-0 top-3 bottom-3 w-1.5 cursor-w-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 'w')} />
          <div className="absolute left-3 top-0 right-3 h-1.5 cursor-n-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizePointerDown(e, 'n')} />
        </>
      )}
    </div>
  );
}
