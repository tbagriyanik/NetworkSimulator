'use client';

import React, { useRef, useEffect } from 'react';
import { Laptop, CornerDownLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TerminalOutput } from '../Terminal';
import type { CanvasDevice } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';

interface ConsoleTerminalTabProps {
  isDark: boolean;
  language: string;
  isPcPoweredOff: boolean;
  isConsoleInputDisabled: boolean;
  fontSize: number;
  terminalBg: string;
  textColor: string;
  mobileVerticalScrollStyle?: React.CSSProperties;
  activeConsoleOutput: TerminalOutput[];
  isConsoleConnected: boolean;
  connectedDeviceId: string | null;
  topologyDevices: CanvasDevice[];
  handleConnect: () => void;
  consoleDevice: CanvasDevice | null;
  setIsConsoleConnected: (val: boolean) => void;
  setConnectedDeviceId: (id: string | null) => void;
  setConsoleConnectionTime: (time: number) => void;
  showCmdSettings: boolean;
  t: Record<string, string>;
  highlightText: (text: string) => React.ReactNode;
  input: string;
  setInput: (val: string) => void;
  handleInputChange: (val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  executeCommand: (cmdToExecute?: string) => Promise<void>;
  consoleNeedsPassword: boolean;
  consoleConfirmDialog: { show: boolean; message: string } | null;
  consoleReloadPending: boolean;
  shouldShowAutocomplete?: boolean;
  renderAutocompleteSuggestions?: string[];
  autocompleteIndex?: number;
  completeAutocompleteSelection?: (selected: string) => void;
  deviceStates?: Map<string, SwitchState> | Record<string, SwitchState> | null;
  isMobile: boolean;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  setConsolePasswordAttempted: (val: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  outputRef?: React.RefObject<HTMLDivElement | null>;
  handleFontSizeChange?: (val: number) => void;
  handleResizeStart?: (e: React.PointerEvent, direction: string, id: string) => void;
}

export function ConsoleTerminalTab({
  isDark,
  isPcPoweredOff,
  isConsoleInputDisabled,
  fontSize,
  terminalBg,
  textColor,
  mobileVerticalScrollStyle,
  activeConsoleOutput,
  isConsoleConnected,
  connectedDeviceId,
  topologyDevices,
  handleConnect,
  consoleDevice,
  setIsConsoleConnected,
  setConnectedDeviceId,
  t,
  highlightText,
  input,
  setInput,
  handleInputChange,
  handleKeyDown,
  executeCommand,
  consoleNeedsPassword,
  consoleConfirmDialog,
  consoleReloadPending,
  shouldShowAutocomplete,
  renderAutocompleteSuggestions,
  autocompleteIndex,
  completeAutocompleteSelection,
  deviceStates,
  isMobile,
  onExecuteDeviceCommand,
  setConsolePasswordAttempted,
}: ConsoleTerminalTabProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output area
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeConsoleOutput]);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <div className={cn(
        "px-3 md:px-4 py-2 border-b shrink-0 flex items-center justify-between gap-3",
        isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-secondary-50'
      )}>
        <div className="flex flex-col gap-1">
          <div className="text-xs">
            {isConsoleConnected && connectedDeviceId ? (
              <span className="text-success-500 font-medium">
                {t.physicalConnectionDetected} {topologyDevices.find((d: CanvasDevice) => d.id === connectedDeviceId)?.name || connectedDeviceId}
              </span>
            ) : (
              <span className={isDark ? 'text-secondary-200' : 'text-secondary-600'}>{t.noConsoleCableDetected}</span>
            )}
          </div>
          <div className={cn("text-[10px] opacity-70", isDark ? 'text-secondary-200' : 'text-secondary-400')}>
            {t.consoleConfiguration}
          </div>
        </div>
        <Button
          size="sm"
          onClick={isConsoleConnected ? () => { setIsConsoleConnected(false); setConnectedDeviceId(null); } : handleConnect}
          disabled={isPcPoweredOff || (!consoleDevice && !isConsoleConnected)}
          className={isConsoleConnected ? 'bg-error-600 hover:bg-error-700 text-white' : 'bg-success-600 hover:bg-success-700 text-white'}
        >
          {isConsoleConnected ? t.disconnect : t.connect}
        </Button>
      </div>

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
          activeConsoleOutput.map((line) => (
            <div key={line.id} className="break-all animate-in fade-in slide-in-from-left-1 duration-200">
              {line.type === 'command' && (
                <div className="flex items-start gap-2 text-accent-500 font-bold">
                  <span className="shrink-0 text-success-400">
                    <Laptop className="w-4 h-4" />
                  </span>
                  <span className="shrink-0 opacity-40 select-none font-geist-mono">
                    {line.prompt || '>'}
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
        {!isPcPoweredOff && !isConsoleConnected && (
          <div className={cn("mt-auto text-xs", isDark ? 'text-secondary-200' : 'text-secondary-500')}>
            {t.waitingForConnection}
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      {!isPcPoweredOff && (
        <div onClick={handleContainerClick} className={cn("shrink-0 border-t bg-muted/95 backdrop-blur-sm", isMobile ? "p-2" : "p-3")}>
          <form onSubmit={(e) => { e.preventDefault(); void executeCommand(); }} className="flex items-center gap-3 relative">
            {isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending) && (
              <div className="absolute -top-7 left-4 right-4 text-[10px] font-black tracking-widest text-warning-400 animate-pulse">
                {consoleNeedsPassword
                  ? (t.language === 'tr' ? 'Parola girin ve Enter\'a basın' : 'Enter password and press Enter')
                  : (t.language === 'tr' ? 'Onaylamak için Enter\'a basın' : 'Press Enter to confirm')}
              </div>
            )}
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-background rounded-lg border flex-1 group focus-within:ring-1 transition-all shadow-inner overflow-hidden",
                isMobile && "px-3 py-2",
                isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                  ? 'border-warning-500/50 focus-within:ring-warning-500/50'
                  : 'border-input focus-within:ring-primary/50'
              )}
            >
              <span className={cn(
                "font-geist-mono font-bold text-[10px] sm:text-xs select-none opacity-40 group-focus-within:opacity-100 transition-opacity shrink-0 truncate max-w-[80px] sm:max-w-none md:max-w-[150px]",
                isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                  ? 'text-warning-400'
                  : 'text-primary'
              )}>
                {(() => {
                  if (consoleNeedsPassword) return 'Password:';
                  if (!connectedDeviceId || !deviceStates) return '>';
                  const state = ensureDeviceStatesMap(deviceStates).get(connectedDeviceId);
                  const hostname = state?.hostname || 'Device';
                  const mode = state?.currentMode || 'user';
                  const modeSuffix: Record<string, string> = {
                    'user': '>',
                    'privileged': '#',
                    'config': '(config)#',
                    'interface': '(config-if)#',
                    'line': '(config-line)#',
                    'vlan': '(config-vlan)#',
                    'router-config': '(config)#'
                  };
                  const suffix = modeSuffix[mode] || '>';
                  return `${hostname}${suffix}`;
                })()}
              </span>
              <input
                ref={inputRef}
                type={isConsoleConnected && consoleNeedsPassword ? 'password' : 'text'}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none outline-none font-geist-mono text-[16px] sm:text-[13px] placeholder:text-muted-foreground/50 min-w-0"
                placeholder={
                  isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                    ? (consoleNeedsPassword
                      ? (t.language === 'tr' ? 'Parolayı girin...' : 'Enter password...')
                      : (t.language === 'tr' ? 'Enter\'a basın veya yazın...' : 'Press Enter or type...'))
                    : t.typeCommand
                }
                autoComplete="off"
                spellCheck={false}
                disabled={isConsoleInputDisabled}
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
                    {renderAutocompleteSuggestions?.map((cmd, idx) => (
                      <button
                        key={`${cmd}-${idx}`}
                        type="button"
                        onClick={() => {
                          completeAutocompleteSelection?.(cmd);
                          inputRef.current?.focus();
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1 text-[11px] font-geist-mono transition-colors",
                          (autocompleteIndex ?? -1) >= 0 && idx === autocompleteIndex
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

            {isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending) && (
              <Button
                type="button"
                disabled={isConsoleInputDisabled}
                variant="ghost"
                className="shrink-0 rounded-xl hover:bg-error-500/20 text-error-500 px-2 h-9 text-xs"
                onClick={() => {
                  if (onExecuteDeviceCommand && connectedDeviceId) {
                    if (consoleNeedsPassword) {
                      onExecuteDeviceCommand(connectedDeviceId, '__PASSWORD_CANCELLED__');
                    } else if (consoleReloadPending) {
                      onExecuteDeviceCommand(connectedDeviceId, 'n');
                    }
                  }
                  setConsolePasswordAttempted(false);
                  setIsConsoleConnected(false);
                  setConnectedDeviceId(null);
                  setInput('');
                }}
                title={t.language === 'tr' ? 'İptal' : 'Cancel'}
              >
                <X className={cn("w-4 h-4 mr-1", isMobile && "w-3 h-3")} />
                <span className="text-error-600 dark:text-error-400 font-medium">{t.language === 'tr' ? 'İptal' : 'Cancel'}</span>
              </Button>
            )}

            <Button
              type="submit"
              disabled={isConsoleInputDisabled}
              className={cn(
                "shrink-0 rounded-xl shadow-lg px-3 bg-secondary-800 text-white hover:bg-secondary-700 dark:bg-white dark:text-secondary-900 dark:hover:bg-secondary-200",
                isMobile ? "h-9 text-xs" : "h-11 text-sm",
                isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                  && "bg-warning-500 hover:bg-warning-600 text-white"
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
