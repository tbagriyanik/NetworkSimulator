import React, { useRef } from 'react';
import { RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';

interface RefreshHeaderProps {
  title: string;
  isDark: boolean;
  isCollapsed: boolean;
  isMobile?: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onToggleCollapse: () => void;
  setFocusedOverlay: (overlay: 'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info') => void;
  language: 'tr' | 'en';
}

export const RefreshHeader: React.FC<RefreshHeaderProps> = ({
  title,
  isDark,
  isCollapsed,
  isMobile = false,
  onRefresh,
  onClose,
  onToggleCollapse,
  setFocusedOverlay: _setFocusedOverlay,
  language,
}) => {
  const headerRef = useRef<HTMLDivElement>(null);

  const refreshTitle = language === 'tr' ? 'Ağı Yenile' : 'Refresh Network';
  const closeTitle = language === 'tr' ? 'Kapat' : 'Close';
  const collapseTitle = isCollapsed ? (language === 'tr' ? 'Genişlet' : 'Expand') : (language === 'tr' ? 'Daralt' : 'Collapse');

  return (
    <div
      className={`flex items-center justify-between px-3 py-2 select-none ${
        isMobile ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } transition-colors ${
        isCollapsed ? 'rounded-xl border-b-0' : 'rounded-t-xl border-b'
      } ${isDark ? 'bg-white/5 border-success-500/20' : 'bg-black/5 border-success-500/30'}`}
      ref={headerRef}
      data-drag-handle={!isMobile ? "true" : undefined}
      onDoubleClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, select, textarea, .no-drag')) return;
        onToggleCollapse();
      }}
    >
      <h3 className="text-sm font-bold flex items-center gap-2 pointer-events-none truncate pr-2" aria-live="polite">
        {title}
      </h3>
      <div className="flex items-center gap-1.5 shrink-0 no-drag">
        <button
          type="button"
          aria-label={refreshTitle}
          title={refreshTitle}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          className="no-drag w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-primary-500 hover:bg-primary-600 active:bg-primary-700 cursor-pointer transition-all inline-flex items-center justify-center shrink-0 touch-manipulation active:scale-95 shadow-sm text-white"
        >
          <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5 pointer-events-none" />
        </button>

        <button
          type="button"
          aria-label={collapseTitle}
          title={collapseTitle}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="no-drag w-9 h-9 sm:w-7 sm:h-7 rounded-lg hover:bg-secondary-100/70 dark:hover:bg-secondary-800/70 active:bg-secondary-200/70 transition-all inline-flex items-center justify-center shrink-0 touch-manipulation active:scale-95 text-secondary-600 dark:text-secondary-300 border border-secondary-200/50 dark:border-secondary-700/50"
        >
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 sm:w-4 sm:h-4 pointer-events-none" />
          ) : (
            <ChevronUp className="w-5 h-5 sm:w-4 sm:h-4 pointer-events-none" />
          )}
        </button>

        <button
          type="button"
          aria-label={closeTitle}
          title={closeTitle}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="no-drag w-9 h-9 sm:w-7 sm:h-7 rounded-lg bg-error-500 hover:bg-error-600 active:bg-error-700 cursor-pointer transition-all inline-flex items-center justify-center shrink-0 touch-manipulation active:scale-95 shadow-sm text-white"
        >
          <X className="w-4 h-4 sm:w-3.5 sm:h-3.5 pointer-events-none" />
        </button>
      </div>
    </div>
  );
};
