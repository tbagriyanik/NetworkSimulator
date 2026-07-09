import React, { useEffect, useState, type MutableRefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BrowserWindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

type ResizeSide = 'left' | 'right' | 'top' | 'bottom' | 'nw' | 'ne' | 'sw' | 'se';

type ResizeState = {
  side: ResizeSide;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  originW: number;
  originH: number;
};

interface HttpBrowserWindowProps {
  isOpen: boolean;
  isMobile: boolean;
  isDark: boolean;
  language: string;
  browserWindow: BrowserWindowState;
  title: string;
  url: string;
  srcDoc: string;
  suggestions: string[];
  showSuggestions: boolean;
  selectedSuggestionIndex: number;
  urlInputRef: React.RefObject<HTMLInputElement | null>;
  dragStateRef: MutableRefObject<DragState | null>;
  resizeStateRef: MutableRefObject<ResizeState | null>;
  onClose: () => void;
  onUrlChange: (url: string) => void;
  onSetShowSuggestions: (show: boolean) => void;
  onSetSelectedSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
  onOpenWebPage: (target?: string, url?: string) => void;
  onBrowserWindowChange?: (newState: BrowserWindowState) => void;
}

export function HttpBrowserWindow({
  isOpen,
  isMobile,
  isDark,
  language,
  browserWindow,
  title,
  url,
  srcDoc,
  suggestions,
  showSuggestions,
  selectedSuggestionIndex,
  urlInputRef,
  dragStateRef: _dragStateRef,
  resizeStateRef: _resizeStateRef,
  onClose,
  onUrlChange,
  onSetShowSuggestions,
  onSetSelectedSuggestionIndex,
  onOpenWebPage,
  onBrowserWindowChange,
}: HttpBrowserWindowProps) {
  const [mounted, setMounted] = useState(false);
  const [localWindow, setLocalWindow] = useState(browserWindow);

  const localDragRef = React.useRef<DragState | null>(null);
  const localResizeRef = React.useRef<ResizeState | null>(null);
  const localWindowRef = React.useRef<BrowserWindowState>(browserWindow);
  const windowRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required: Next.js hydration guard for createPortal
    setMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Required: sync local state with parent prop during drag/resize
    setLocalWindow(browserWindow);
    localWindowRef.current = browserWindow;
  }, [browserWindow.x, browserWindow.y, browserWindow.width, browserWindow.height]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (localDragRef.current) {
        const state = localDragRef.current;
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        localWindowRef.current = {
          ...localWindowRef.current,
          x: state.originX + dx,
          y: state.originY + dy,
        };
        if (windowRef.current) {
          windowRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      } else if (localResizeRef.current) {
        const state = localResizeRef.current;
        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        
        const minW = 420, minH = 260;
        const next = { ...localWindowRef.current };
        if (state.side === 'bottom') next.height = Math.max(minH, state.originH + dy);
        else if (state.side === 'right') next.width = Math.max(minW, state.originW + dx);
        else if (state.side === 'top') {
          const nh = Math.max(minH, state.originH - dy);
          next.height = nh;
          next.y = Math.max(0, state.originY - (nh - state.originH));
        }
        else if (state.side === 'left') {
          const nw = Math.max(minW, state.originW - dx);
          next.width = nw;
          next.x = Math.max(0, state.originX - (nw - state.originW));
        }
        else if (state.side === 'se') {
          next.width = Math.max(minW, state.originW + dx);
          next.height = Math.max(minH, state.originH + dy);
        }
        else if (state.side === 'sw') {
          const nw = Math.max(minW, state.originW - dx);
          next.width = nw;
          next.x = Math.max(0, state.originX - (nw - state.originW));
          next.height = Math.max(minH, state.originH + dy);
        }
        else if (state.side === 'ne') {
          const nh = Math.max(minH, state.originH - dy);
          next.width = Math.max(minW, state.originW + dx);
          next.height = nh;
          next.y = Math.max(0, state.originY - (nh - state.originH));
        }
        else if (state.side === 'nw') {
          const nwW = Math.max(minW, state.originW - dx);
          const nwH = Math.max(minH, state.originH - dy);
          next.width = nwW;
          next.x = Math.max(0, state.originX - (nwW - state.originW));
          next.height = nwH;
          next.y = Math.max(0, state.originY - (nwH - state.originH));
        }
        
        localWindowRef.current = next;
        if (windowRef.current) {
          windowRef.current.style.width = `${next.width}px`;
          windowRef.current.style.height = `${next.height}px`;
          windowRef.current.style.left = `${next.x}px`;
          windowRef.current.style.top = `${next.y}px`;
        }
      }
    };
    
    const handleUp = () => {
      if (localDragRef.current) {
        localDragRef.current = null;
        if (windowRef.current) {
          windowRef.current.style.left = `${localWindowRef.current.x}px`;
          windowRef.current.style.top = `${localWindowRef.current.y}px`;
          windowRef.current.style.transform = '';
        }
        setLocalWindow(prev => ({
          ...prev,
          x: localWindowRef.current.x,
          y: localWindowRef.current.y,
        }));
      }
      if (localResizeRef.current) {
        localResizeRef.current = null;
      }
      onBrowserWindowChange?.(localWindowRef.current);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [onBrowserWindowChange]);

  if (!isOpen || !mounted) return null;

  const startResize = (side: ResizeSide, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    localResizeRef.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      originX: localWindow.x,
      originY: localWindow.y,
      originW: localWindow.width,
      originH: localWindow.height,
    };
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-auto bg-black/20"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        ref={windowRef}
        className="absolute"
        style={{
          left: localWindow.x,
          top: localWindow.y,
          width: localWindow.width,
          maxWidth: isMobile ? 'calc(100vw - 16px)' : 'none',
          height: localWindow.height,
          willChange: 'transform',
          contain: 'layout style paint',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }
        }}
        tabIndex={-1}
      >
        <div
          className={`h-full w-full rounded-2xl shadow-2xl border ${isDark ? 'border-success-500/30 bg-secondary-900' : 'border-success-500 bg-white'} flex flex-col overflow-hidden`}
          style={{ borderWidth: 3, willChange: 'auto', contain: 'layout style paint' }}
        >
          <div
            className={`flex items-center justify-between px-4 py-2 border-b cursor-grab active:cursor-grabbing select-none touch-none ${isDark ? 'border-success-500/30 bg-secondary-950' : 'border-success-500/50'}`}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('input, textarea, select, button')) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              localDragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                originX: localWindow.x,
                originY: localWindow.y,
              };
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-success-500 animate-pulse shrink-0" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenWebPage(url);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="flex flex-col flex-1 min-w-0 relative">
                  <span className="text-[10px] sm:text-sm font-semibold truncate">{title}</span>
                  <input
                    ref={urlInputRef}
                    value={url || ''}
                    onChange={(e) => {
                      onUrlChange(e.target.value);
                      onSetSelectedSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      onSetShowSuggestions(true);
                      onSetSelectedSuggestionIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      const visibleSuggestions = suggestions.slice(0, 10);

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        onSetSelectedSuggestionIndex(prev =>
                          prev < visibleSuggestions.length - 1 ? prev + 1 : prev
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        onSetSelectedSuggestionIndex(prev =>
                          prev > 0 ? prev - 1 : -1
                        );
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedSuggestionIndex >= 0 && visibleSuggestions[selectedSuggestionIndex]) {
                          onUrlChange(visibleSuggestions[selectedSuggestionIndex]);
                          onSetShowSuggestions(false);
                          onOpenWebPage(visibleSuggestions[selectedSuggestionIndex]);
                        } else {
                          onSetShowSuggestions(false);
                          onOpenWebPage(url);
                        }
                      }
                    }}
                    placeholder="http://"
                    className={`mt-1 w-full text-[16px] sm:text-xs rounded-md px-2 py-1 border ${isDark ? 'bg-secondary-900 border-secondary-700 text-secondary-200' : 'bg-white border-secondary-300 text-secondary-700'}`}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 mt-1 rounded-md border shadow-lg max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar z-50 ${isDark ? 'bg-secondary-900 border-secondary-700' : 'bg-white border-secondary-300'}`}>
                      {suggestions.slice(0, 10).map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            onUrlChange(suggestion);
                            onSetShowSuggestions(false);
                            onOpenWebPage(suggestion);
                          }}
                          onMouseEnter={() => onSetSelectedSuggestionIndex(index)}
                          className={`w-full text-left px-2 py-1.5 text-xs cursor-pointer ${index === selectedSuggestionIndex ? (isDark ? 'bg-secondary-700' : 'bg-secondary-200') : 'hover:bg-secondary-100 dark:hover:bg-secondary-800'} ${isDark ? 'text-secondary-200' : 'text-secondary-700'}`}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  type="submit"
                  variant="default"
                  className="shrink-0 bg-primary-600 hover:bg-primary-700 text-white"
                >
                  {language === 'tr' ? 'Git' : 'Go'}
                </Button>
              </form>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={onClose}
              className="ml-3 shrink-0"
              aria-label={language === 'tr' ? 'Kapat' : 'Close'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-secondary-50 dark:to-secondary-900" style={{ contain: 'layout style paint' }}>
            <iframe
              title={title}
              srcDoc={srcDoc}
              sandbox="allow-forms allow-scripts allow-same-origin allow-modals"
              className="h-full w-full border-0 bg-white"
              style={{ display: 'block' }}
            />
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize select-none touch-none" onPointerDown={(e) => startResize('left', e)} />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize select-none touch-none" onPointerDown={(e) => startResize('right', e)} />
          <div className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize select-none touch-none" onPointerDown={(e) => startResize('top', e)} />
          <div className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize select-none touch-none" onPointerDown={(e) => startResize('bottom', e)} />
          <div className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize select-none touch-none" onPointerDown={(e) => startResize('nw', e)} />
          <div className="absolute right-0 top-0 w-4 h-4 cursor-ne-resize select-none touch-none" onPointerDown={(e) => startResize('ne', e)} />
          <div className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize select-none touch-none" onPointerDown={(e) => startResize('sw', e)} />
          <div className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize select-none touch-none" onPointerDown={(e) => startResize('se', e)} />
        </div>
      </div>
    </div>,
    document.body
  );
}
