import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/hooks/useWindowStore';
import { DragPosition as ModalPosition, DragSize as ModalSize } from '@/hooks/useDrag';

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
}: DraggableWindowWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Local z-index state initialized from store
  const [zIndex, setZIndex] = useState(100);
  
  const activeWindowId = useWindowStore(state => state.activeWindowId);
  const setActiveWindow = useWindowStore(state => state.setActiveWindow);
  
  const isActive = activeWindowId === id;

  // Bring to front on mount and when opened
  useEffect(() => {
    if (isOpen) {
      const newZ = setActiveWindow(id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setZIndex(newZ);
    }
  }, [isOpen, id, setActiveWindow]);

  // Handle focus when clicking anywhere inside the window
  const handleFocus = (_e: React.MouseEvent | React.PointerEvent | React.TouchEvent) => {
    if (!isActive) {
      const newZ = setActiveWindow(id);
      setZIndex(newZ);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscapeKeyDown?.();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onEscapeKeyDown]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isMobileFullScreen = isMobile && mobileFullScreen;

  const wrapperStyle: React.CSSProperties = isMobileFullScreen
    ? {
        position: 'fixed',
        inset: 0,
        zIndex: 9999, // Always top on mobile when fullscreen
      }
    : {
        position: 'fixed',
        left: modalPosition.x,
        top: modalPosition.y,
        width: modalSize.width,
        height: modalSize.height,
        maxWidth: isMobile ? '100vw' : undefined,
        maxHeight: isMobile ? 'calc(100vh - 40px)' : undefined,
        zIndex: isMobile ? 9999 : zIndex,
      };

  return (
    <div
      ref={containerRef}
      id={`window-${id}`}
      data-draggable-id={id}
      data-modal-content="true"
      style={wrapperStyle}
      className={cn(
        'flex flex-col overflow-hidden shadow-2xl transition-shadow',
        isMobileFullScreen ? 'rounded-none' : 'rounded-lg border',
        isDark ? 'bg-secondary-900' : 'bg-white',
        // Green border when active (on desktop or floating on mobile)
        isActive && (!isMobile || !isMobileFullScreen)
            ? (isDark ? 'border-success-500/70 shadow-success-500/20' : 'border-success-500/80 shadow-success-500/30')
            : (isDark ? 'border-secondary-700' : 'border-secondary-200'),
        className
      )}
      onPointerDownCapture={handleFocus}
    >
      {/* Header */}
      <div
        data-modal-header="true"
        onPointerDown={(e) => handlePointerDown?.(e, id)}
        className={cn(
          'flex items-center justify-between px-3 py-2 select-none shrink-0 group',
          (!isMobile || !isMobileFullScreen) && 'cursor-grab active:cursor-grabbing',
          isDark
            ? 'bg-secondary-800/80 border-b border-secondary-700'
            : 'bg-secondary-50/80 border-b border-secondary-200',
          isActive && !isMobile && (isDark ? 'bg-success-900/10' : 'bg-success-50/30')
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden cursor-grab active:cursor-grabbing">
          {icon && (
            <div className={cn("flex-shrink-0 pointer-events-none", isDark ? "text-secondary-400" : "text-secondary-500", isActive && "text-success-500")}>
              {icon}
            </div>
          )}
          <h2 className={cn(
            "text-sm font-semibold truncate pointer-events-none",
            isDark ? "text-secondary-100" : "text-secondary-900"
          )}>
            {title}
          </h2>
        </div>
        
        {!hideCloseButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "flex items-center justify-center p-1.5 ml-2 rounded transition-colors shrink-0",
              isDark 
                ? "text-secondary-400 hover:text-white hover:bg-error-500/80" 
                : "text-secondary-500 hover:text-white hover:bg-error-500"
            )}
            aria-label="Kapat"
            title="Kapat"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-h-0 flex flex-col relative", contentClassName)}>
        {children}
      </div>

      {/* Resize Handles (Desktop and Mobile non-fullscreen) */}
      {(!isMobile || !isMobileFullScreen) && (
        <>
          <div className="absolute right-1 bottom-1 w-4 h-4 cursor-se-resize z-50 flex items-end justify-end select-none" onPointerDown={(e) => handleResizeStart?.(e, 'se', id)}>
            <svg className={cn("h-3 w-3", isDark ? "text-secondary-500" : "text-secondary-400", isActive && "text-success-500")} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 13L13 6" />
              <path d="M9.5 13L13 9.5" />
              <path d="M12.5 13L13 12.5" />
            </svg>
          </div>
          <div className="absolute right-0 top-0 bottom-4 w-2 cursor-e-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizeStart?.(e, 'e', id)} />
          <div className="absolute left-0 bottom-0 right-4 h-2 cursor-s-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizeStart?.(e, 's', id)} />
          <div className="absolute left-0 top-0 bottom-4 w-2 cursor-w-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizeStart?.(e, 'w', id)} />
          <div className="absolute left-0 top-0 right-4 h-2 cursor-n-resize z-40 hover:bg-success-500/20" onPointerDown={(e) => handleResizeStart?.(e, 'n', id)} />
        </>
      )}
    </div>
  );
}
