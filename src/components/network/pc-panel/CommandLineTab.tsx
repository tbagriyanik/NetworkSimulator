'use client';

import React, { useRef, useEffect } from 'react';
import { Laptop, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { OutputLine, FtpSession } from './PCPanel.types';

interface CommandLineTabProps {
  isDark: boolean;
  language: string;
  isPcPoweredOff: boolean;
  isCmdInputDisabled: boolean;
  fontSize: number;
  terminalBg: string;
  textColor: string;
  mobileVerticalScrollStyle?: React.CSSProperties;
  pcOutput: OutputLine[];
  setPcOutput: (output: OutputLine[]) => void;
  internalPcHostname: string;
  ftpSession: FtpSession | null;
  input: string;
  setInput: (val: string) => void;
  shouldShowAutocomplete: boolean;
  renderAutocompleteSuggestions: string[];
  autocompleteIndex: number;
  autocompleteRef: React.RefObject<HTMLDivElement | null>;
  completeAutocompleteSelection: (selected: string) => void;
  executeCommand: (cmdToExecute?: string) => Promise<void>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  outputRef: React.RefObject<HTMLDivElement | null>;
  handleInputChange: (val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showCmdSettings: boolean;
  handleFontSizeChange: (val: number) => void;
  handleResizeStart?: (e: React.PointerEvent, direction: string, id: string) => void;
  highlightText: (text: string) => React.ReactNode;
  isMobile: boolean;
  t: Record<string, string>;
}

export function CommandLineTab({
  isDark,
  isPcPoweredOff,
  isCmdInputDisabled,
  fontSize,
  terminalBg,
  textColor,
  mobileVerticalScrollStyle,
  pcOutput,
  internalPcHostname,
  ftpSession,
  input,
  shouldShowAutocomplete,
  renderAutocompleteSuggestions,
  autocompleteIndex,
  completeAutocompleteSelection,
  executeCommand,
  handleInputChange,
  handleKeyDown,
  highlightText,
  isMobile,
  t,
}: CommandLineTabProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output area
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [pcOutput]);

  // Focus input when clicked
  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      {/* Output Area - Scrollable */}
      <div
        ref={outputRef}
        onClick={handleContainerClick}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-3 md:p-6 space-y-1.5 font-geist-mono leading-relaxed custom-scrollbar min-h-0",
          isMobile && "mobile-scroll",
          isPcPoweredOff ? "bg-black" : terminalBg
        )}
        style={{ ...mobileVerticalScrollStyle, fontSize: `${fontSize}px`, contain: 'layout style paint' }}
      >
        {isPcPoweredOff ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <svg className="w-16 h-16 text-error-600 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 5.64a9 9 0 1 1-12.73 0" />
            </svg>
          </div>
        ) : (
          pcOutput.map((line) => (
            <div key={line.id} className="break-all animate-in fade-in slide-in-from-left-1 duration-200">
              {line.type === 'command' && (
                <div className="flex items-start gap-2 text-accent-500 font-bold">
                  <Laptop className="w-4 h-4 shrink-0 text-primary-400" />
                  <span className="shrink-0 opacity-40 select-none font-geist-mono">
                    {line.prompt || `${internalPcHostname} C:\\>`}
                  </span>
                  <span className={isDark ? "text-secondary-100" : "text-secondary-900"}>{highlightText(line.content)}</span>
                </div>
              )}
              {line.type === 'output' && (
                <div className={cn(textColor, "whitespace-pre-wrap")}>
                  <span>{highlightText(line.content)}</span>
                </div>
              )}
              {line.type === 'error' && <span className="text-error-500 font-bold italic">{highlightText(line.content)}</span>}
              {line.type === 'success' && <span className="text-accent-500 font-bold text-xs tracking-widest opacity-80">{highlightText(line.content)}</span>}
            </div>
          ))
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      {!isPcPoweredOff && (
        <div onClick={handleContainerClick} className={cn("shrink-0 border-t bg-muted/95 backdrop-blur-sm", isMobile ? "p-2" : "p-3")}>
          <form onSubmit={(e) => { e.preventDefault(); void executeCommand(); }} className="flex items-center gap-3 relative">
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-background rounded-lg border flex-1 group focus-within:ring-1 transition-all shadow-inner overflow-hidden",
                isMobile && "px-3 py-2",
                "border-input focus-within:ring-primary/50"
              )}
            >
              <span className="font-geist-mono font-bold text-[10px] sm:text-xs select-none opacity-40 group-focus-within:opacity-100 transition-opacity shrink-0 truncate max-w-[80px] sm:max-w-none md:max-w-[150px] text-primary">
                {ftpSession ? 'ftp>' : `${internalPcHostname} C:\\>`}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none font-geist-mono text-[16px] sm:text-[13px] placeholder:text-muted-foreground/50 min-w-0"
                placeholder={t.typeCommand}
                autoComplete="off"
                spellCheck={false}
                disabled={isCmdInputDisabled}
              />
            </div>

            {shouldShowAutocomplete && (
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
                    <span>{t.cmdSuggestions}</span>
                    <span className={cn("text-[10px] font-bold", isDark ? 'text-accent-300' : 'text-accent-700')}>
                      Tab ↹ {t.completeWithTab}
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto overflow-x-hidden mobile-scroll custom-scrollbar font-geist-mono">
                    {renderAutocompleteSuggestions.map((cmd, idx) => (
                      <button
                        key={`${cmd}-${idx}`}
                        type="button"
                        onClick={() => {
                          completeAutocompleteSelection(cmd);
                          inputRef.current?.focus();
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1 text-[11px] font-geist-mono transition-colors",
                          autocompleteIndex >= 0 && idx === autocompleteIndex
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
            )}

            <Button
              type="submit"
              disabled={!input.trim() || isCmdInputDisabled}
              className={cn(
                "shrink-0 rounded-xl shadow-lg px-3 bg-secondary-800 text-white hover:bg-secondary-700 dark:bg-white dark:text-secondary-900 dark:hover:bg-secondary-200",
                isMobile ? "h-9 text-xs" : "h-11 text-sm"
              )}
            >
              <span className="rounded-md p-1">
                <CornerDownLeft className={cn("w-4 h-4 text-white dark:text-secondary-900", isMobile && "w-3 h-3")} />
              </span>
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
