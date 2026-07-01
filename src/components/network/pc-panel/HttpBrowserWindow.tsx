import type { MutableRefObject } from 'react';
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
  dragStateRef,
  resizeStateRef,
  onClose,
  onUrlChange,
  onSetShowSuggestions,
  onSetSelectedSuggestionIndex,
  onOpenWebPage,
}: HttpBrowserWindowProps) {
  if (!isOpen) return null;

  const startResize = (side: ResizeSide, e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeStateRef.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      originX: browserWindow.x,
      originY: browserWindow.y,
      originW: browserWindow.width,
      originH: browserWindow.height,
    };
  };

  return (
    <div
      className="fixed inset-0 z-[999] pointer-events-auto bg-black/20"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="absolute"
        style={isMobile
          ? {
            left: 8,
            right: 8,
            top: browserWindow.y,
            width: 'auto',
            height: browserWindow.height,
            willChange: 'transform',
            contain: 'layout style paint',
          }
          : {
            left: browserWindow.x,
            top: browserWindow.y,
            width: browserWindow.width,
            height: browserWindow.height,
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
          className={`h-full w-full rounded-2xl shadow-2xl border ${isDark ? 'border-emerald-500/30 bg-secondary-900' : 'border-emerald-500 bg-white'} flex flex-col overflow-hidden`}
          style={{ borderWidth: 3, willChange: 'auto', contain: 'layout style paint' }}
        >
          <div
            className={`flex items-center justify-between px-4 py-2 border-b cursor-grab active:cursor-grabbing select-none touch-none ${isDark ? 'border-emerald-500/30 bg-secondary-950' : 'border-emerald-500/50'}`}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('input, textarea, select, button')) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              dragStateRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                originX: browserWindow.x,
                originY: browserWindow.y,
              };
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
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
    </div>
  );
}
