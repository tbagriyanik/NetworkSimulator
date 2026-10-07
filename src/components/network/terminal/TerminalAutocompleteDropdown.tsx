'use client';

import { cn } from '@/lib/utils';

interface TerminalAutocompleteDropdownProps {
  suggestions: string[];
  activeIndex: number;
  isDark: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (cmd: string) => void;
}

export function TerminalAutocompleteDropdown({
  suggestions,
  activeIndex,
  isDark,
  containerRef,
  listRef,
  onSelect,
}: TerminalAutocompleteDropdownProps) {
  if (suggestions.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-14 sm:bottom-16 left-2 sm:left-3 z-20 w-[min(320px,calc(100%-1rem))]"
    >
      <div className={cn(
        "rounded-lg border shadow-lg overflow-hidden",
        isDark ? "bg-secondary-800 border-secondary-700" : "bg-white border-secondary-200"
      )}>
        <div ref={listRef} className="max-h-32 overflow-y-auto overflow-x-hidden font-geist-mono flex flex-col">
          {suggestions.map((cmd, idx) => (
            <button
              key={`ac-${cmd}-${idx}`}
              type="button"
              data-autocomplete-index={idx}
              onClick={() => onSelect(cmd)}
              className={cn(
                "w-full text-left px-2.5 py-1 text-[11px] font-geist-mono transition-colors",
                activeIndex >= 0 && idx === activeIndex
                  ? (isDark ? "bg-accent-500/20 text-accent-200" : "bg-accent-50 text-accent-900")
                  : (isDark ? "text-secondary-300 hover:bg-primary/10" : "text-secondary-700 hover:bg-primary/10")
              )}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}