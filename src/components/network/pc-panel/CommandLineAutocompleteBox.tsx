import React from 'react';
import { cn } from '@/lib/utils';

interface CommandLineAutocompleteBoxProps {
  isDark: boolean;
  language: string;
  activeTerminalTab: 'cmd' | 'linux';
  autocompleteRef: React.RefObject<HTMLDivElement | null>;
  renderAutocompleteSuggestions: React.ReactNode;
  autocompleteIndex: number;
  completeAutocompleteSelection: (selected: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  linuxFilteredSuggestions: string[];
  linuxAutocompleteIndex: number;
  setLinuxAutocompleteIndex: (idx: number) => void;
  setInput: (val: string) => void;
  setIsLinuxAutocompleteDismissed: (dismissed: boolean) => void;
  input: string;
  t: Record<string, string>;
}

export const CommandLineAutocompleteBox: React.FC<CommandLineAutocompleteBoxProps> = ({
  isDark,
  language,
  activeTerminalTab,
  autocompleteRef,
  renderAutocompleteSuggestions,
  autocompleteIndex,
  completeAutocompleteSelection,
  inputRef,
  linuxFilteredSuggestions,
  linuxAutocompleteIndex,
  setLinuxAutocompleteIndex,
  setInput,
  setIsLinuxAutocompleteDismissed,
  input,
  t
}) => {
  return (
    <div
      ref={autocompleteRef}
      className="absolute bottom-20 left-4 z-20 w-[min(420px,calc(100%-2rem))]"
    >
      <div className={cn(
        "rounded-lg border shadow-xl overflow-hidden",
        isDark ? "bg-secondary-800 border-secondary-700" : "bg-white border-secondary-200"
      )}>
        <div className={cn(
          "flex items-center justify-between px-3 py-2 text-[11px] font-geist-mono font-semibold",
          isDark ? 'text-secondary-200 bg-secondary-900/60' : 'text-secondary-700 bg-secondary-50'
        )}>
          <span>{activeTerminalTab === 'cmd' ? t.cmdSuggestions : (language === 'tr' ? 'Linux Komut ve Dosya Önerileri' : 'Linux Suggestions')}</span>
          <span className={cn("text-[10px] font-bold", isDark ? 'text-accent-300' : 'text-accent-700')}>
            ↑↓ {language === 'tr' ? 'Seç' : 'Navigate'} | Tab ↹ {t.completeWithTab}
          </span>
        </div>
        <div className="max-h-40 overflow-y-auto overflow-x-hidden mobile-scroll custom-scrollbar font-geist-mono flex flex-col">
          {activeTerminalTab === 'cmd' ? (
            Array.isArray(renderAutocompleteSuggestions) ? (
              (renderAutocompleteSuggestions as string[]).map((cmd, idx) => (
                <button
                  key={`${cmd}-${idx}`}
                  type="button"
                  data-autocomplete-index={idx}
                  onClick={() => {
                    completeAutocompleteSelection(cmd);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between font-geist-mono",
                    idx === autocompleteIndex
                      ? (isDark ? "bg-accent-500/20 text-accent-300 font-semibold" : "bg-accent-50 text-accent-700 font-semibold")
                      : (isDark ? "text-secondary-300 hover:bg-secondary-700/50" : "text-secondary-700 hover:bg-secondary-100")
                  )}
                >
                  <span>{cmd}</span>
                  {idx === autocompleteIndex && (
                    <span className="text-[10px] opacity-75">{language === 'tr' ? 'Seçildi' : 'Selected'}</span>
                  )}
                </button>
              ))
            ) : (
              renderAutocompleteSuggestions
            )
          ) : (
            linuxFilteredSuggestions.map((cmd, idx) => (
              <button
                key={`${cmd}-${idx}`}
                type="button"
                data-autocomplete-index={idx}
                onMouseEnter={() => setLinuxAutocompleteIndex(idx)}
                onClick={() => {
                  let completedText = cmd;
                  if (cmd.includes(' ')) {
                    const parts = input.trim().split(/\s+/);
                    parts[parts.length - 1] = cmd;
                    completedText = parts.join(' ');
                  }
                  setInput(completedText + ' ');
                  setIsLinuxAutocompleteDismissed(true);
                  setLinuxAutocompleteIndex(-1);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between font-geist-mono",
                  idx === linuxAutocompleteIndex
                    ? (isDark ? "bg-accent-500/20 text-accent-300 font-semibold" : "bg-accent-50 text-accent-700 font-semibold")
                    : (isDark ? "text-secondary-300 hover:bg-secondary-700/50" : "text-secondary-700 hover:bg-secondary-100")
                )}
              >
                <span>{cmd}</span>
                {idx === linuxAutocompleteIndex && (
                  <span className="text-[10px] opacity-75">{language === 'tr' ? 'Seçildi' : 'Selected'}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

