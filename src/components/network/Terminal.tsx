'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo } from 'react';
import { SwitchState } from '@/lib/network/types';
import { getModePrompt } from '@/lib/network/initialState';
import { Translations } from '@/contexts/LanguageContext';
import { getDeviceWifiConfig, getWirelessSignalStrength } from '@/lib/network/connectivity';
import { Button } from '@/components/ui/button';
import { CornerDownLeft, X } from 'lucide-react';
import { SearchOutputDialog } from './pc-panel/SearchOutputDialog';
import { toast } from "@/hooks/use-toast";
import { useOutputSearch } from '@/hooks/useOutputSearch';
import { ModernPanel } from '@/components/ui/ModernPanel';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-breakpoint';
import type { CanvasDevice } from './NetworkTopology/types/networkTopology.types';
import { RouterIcon, SwitchIcon, WlcIcon } from './PCPanelWidgets';
import { Laptop } from 'lucide-react';

import { completedBootIds, BOOT_PROGRESS_MARKER } from './terminal/BootProgressBar';
import { TerminalHeaderActions } from './terminal/TerminalHeaderActions';
import { useTerminalHistory } from './terminal/useTerminalHistory';
import { handleTerminalShortcuts } from './terminal/useTerminalKeybindings';
import { useTerminalOutputSync } from './terminal/useTerminalOutputSync';
import { useTerminalCommandQueue } from './terminal/useTerminalCommandQueue';
import { useTerminalUndoRedo } from './terminal/useTerminalUndoRedo';
import { useTerminalAutocomplete } from './terminal/useTerminalAutocomplete';
import { TerminalOutputLines, type DeviceIconInfo } from './terminal/TerminalOutputLines';
import { QuickCommandsBar } from './terminal/QuickCommandsBar';
import { TerminalAutocompleteDropdown } from './terminal/TerminalAutocompleteDropdown';
import { TerminalSettingsBar } from './terminal/TerminalSettingsBar';

export interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'password-prompt';
  content: string;
  prompt?: string;
  realismLevel?: 'real' | 'stub' | 'sim-only';
  hint?: string | { tr: string; en: string };
  timestamp?: number;
}

export { BOOT_PROGRESS_MARKER };

interface TerminalProps {
  deviceId: string;
  deviceName: string;
  prompt: string;
  state: SwitchState;
  onCommand: (command: string) => Promise<unknown>;
  onClear: () => void;
  output: TerminalOutput[];
  isLoading: boolean;
  isConnectionError?: boolean;
  connectionErrorMessage?: string;
  isPoweredOff?: boolean;
  onTogglePower?: (deviceId: string) => void;
  showPowerButton?: boolean;
  onClose?: () => void;
  onQuickSettings?: () => void;
  t: Translations;
  theme: string;
  language: string;
  helpLevel?: 'beginner' | 'intermediate' | 'exam';
  onUpdateHistory?: (deviceId: string, history: string[]) => void;
  confirmDialog?: { show: boolean; message?: string; onConfirm: () => void } | null;
  setConfirmDialog?: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  onRequestFocus?: () => void;
  className?: string;
  title?: string;
  device?: CanvasDevice;
  devices?: CanvasDevice[];
  deviceStates?: Map<string, SwitchState>;
}

export type { TerminalProps };

export function Terminal({
  deviceId,
  deviceName,
  prompt,
  state,
  onCommand,
  onClear,
  output,
  isLoading,
  isConnectionError = false,
  isPoweredOff = false,
  onTogglePower,
  showPowerButton = true,
  onClose,
  onQuickSettings,
  t,
  theme,
  language,
  helpLevel = 'beginner',
  onUpdateHistory,
  confirmDialog,
  setConfirmDialog,
  className,
  title,
  device,
  devices = [],
  deviceStates
}: TerminalProps) {
  const [input, setInput] = useState('');
  const { history, addHistoryCommand, navigateUp, navigateDown } = useTerminalHistory(deviceId, state.commandHistory);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('terminal-font-size') || '13', 10); } catch { return 13; }
  });
  const currentPrompt = state
    ? getModePrompt(state.currentMode, state.hostname || 'Switch')
    : prompt;

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      if (!window.visualViewport) return;
      const height = window.innerHeight - window.visualViewport.height;
      setKeyboardHeight(Math.max(0, height));
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  const { displayedLines, clearTerminalLines } = useTerminalOutputSync({ output, deviceId });

  const [localPasswordPrompt, setLocalPasswordPrompt] = useState(false);

  const isDark = theme === 'dark';
  const isMobile = useIsMobile();

  const deviceIconInfo = useMemo<DeviceIconInfo | null>(() => {
    const deviceType = device?.type;
    const switchModel = state.switchModel;

    if (deviceType === 'router') {
      return { icon: RouterIcon, color: 'text-purple-400' };
    } else if (deviceType === 'switchL3' || switchModel === 'NS-L3-24PS') {
      return { icon: SwitchIcon, color: 'text-purple-400', isL3: true };
    } else if (deviceType === 'switchL2' || switchModel === 'NS-L2-24TT-L') {
      return { icon: SwitchIcon, color: 'text-success-400', isL3: false };
    } else if (deviceType === 'pc') {
      return { icon: Laptop, color: 'text-primary-400' };
    } else if (deviceType === 'wlc') {
      return { icon: WlcIcon, color: 'text-warning-400' };
    }
    return null;
  }, [device?.type, state.switchModel]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasWifiConnectedRef = useRef<boolean>(true);

  const {
    matchIndex: searchMatchIndex,
    matchCount: searchMatchCount,
    goToNext: goToNextMatch,
    goToPrev: goToPrevMatch,
  } = useOutputSearch({ searchQuery, containerRef: terminalRef });

  const [bootVersion, setBootVersion] = useState(0);
  const isBooted = useMemo(() => {
    const bootMarkers = output.filter(o => o.content === BOOT_PROGRESS_MARKER);
    return bootMarkers.every(m => completedBootIds.has(m.id));
  }, [output, bootVersion]);
  const isInputDisabled = isLoading || isConnectionError;

  useEffect(() => {
    if (isBooted && !isInputDisabled) {
      inputRef.current?.focus();
    }
  }, [isBooted]);

  useEffect(() => {
    if (!searchOpen && isBooted && !isInputDisabled) {
      inputRef.current?.focus();
    }
  }, [searchOpen, isBooted, isInputDisabled]);

  // Yeni komut / çıktı geldiğinde terminali en alta scroll et
  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;
    const scroll = () => {
      el.scrollTop = el.scrollHeight;
    };
    scroll();
    // DOM'un tam olarak render edilip layout'un hesaplanması için requestAnimationFrame
    const frameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frameId);
  }, [displayedLines, output]);

  useEffect(() => {
    if (!device || !devices || !deviceStates) return;
    if (device.type !== 'pc') return;
    const signalStrength = getWirelessSignalStrength(device, devices, deviceStates);
    const isCurrentlyConnected = signalStrength > 0;
    wasWifiConnectedRef.current = isCurrentlyConnected;
  }, [device, devices, deviceStates]);

  const clearTerminalView = useCallback(() => {
    clearTerminalLines();
    onClear();
  }, [clearTerminalLines, onClear]);

  const {
    showAutocomplete,
    setShowAutocomplete,
    autocompleteIndex,
    setAutocompleteIndex,
    setTabCycleIndex,
    suggestions: autocompleteSuggestions,
    shouldShowAutocomplete,
    autocompleteRef,
    autocompleteListRef,
    refreshAutocomplete,
    handleTabComplete,
    completeAutocompleteSelection,
  } = useTerminalAutocomplete({ input, setInput, state, devices, deviceStates, onCommand, t, inputRef });

  const { handleUndo, handleRedo, pushUndo } = useTerminalUndoRedo(input, setInput);

  const { queueCommands, processCommandQueue, queueProgress, cancelQueue } = useTerminalCommandQueue({
    deviceId,
    history,
    addHistoryCommand,
    onCommand,
    onUpdateHistory,
    isLoading,
    awaitingPassword: !!state.awaitingPassword,
    awaitingConfigSource: !!state.awaitingConfigSource,
    confirmDialogOpen: !!confirmDialog?.show,
    setTabCycleIndex,
    setShowAutocomplete,
    setAutocompleteIndex,
  });

  const isReloadConfirmationPending = false;

  const handleSubmitRef = useRef<((cmd?: string) => Promise<void>) | null>(null);

  useEffect(() => {
    const handleAutoType = (e: Event) => {
      const { deviceId: eventDeviceId, command } = (e as CustomEvent).detail;
      if (eventDeviceId !== deviceId) return;

      let i = 0;
      setInput('');
      const typeInterval = setInterval(() => {
        if (i < command.length) {
          const char = command.charAt(i);
          setInput(prev => prev + char);
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            if (handleSubmitRef.current) {
              handleSubmitRef.current(command);
            }
          }, 300);
        }
      }, 70);
    };
    window.addEventListener('terminal-auto-type', handleAutoType);
    return () => window.removeEventListener('terminal-auto-type', handleAutoType);
  }, [deviceId]);

  const handleSubmit = async (cmdToExecute?: string) => {
    if (state.awaitingConfigSource) {
      const answer = (cmdToExecute ?? input).trim();
      setInput('');
      await onCommand(answer === '' ? 'terminal' : answer);
      return;
    }

    if (state.awaitingPassword || localPasswordPrompt) {
      const pwd = cmdToExecute ?? input;
      setInput('');
      await onCommand(pwd);
      return;
    }

    if (confirmDialog?.show) {
      const trimmedInput = (cmdToExecute || input).trim().toLowerCase();
      setInput('');
      if (trimmedInput === 'n' || trimmedInput === 'no') {
        if (setConfirmDialog) {
          setConfirmDialog(null);
        }
        return;
      }
      if (confirmDialog.onConfirm) {
        confirmDialog.onConfirm();
      }
      return;
    }

    const command = (cmdToExecute || input).trim();
    if (!command || isInputDisabled) return;

    const updatedHistory = addHistoryCommand(command);
    if (onUpdateHistory && updatedHistory !== history) {
      onUpdateHistory(deviceId, updatedHistory);
    }
    setTabCycleIndex(-1);
    setInput('');
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    await onCommand(command);
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleSubmit();
  };

  const handleQuickCommand = (cmd: string) => {
    handleInputChange(cmd);
    inputRef.current?.focus();
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText || !pastedText.includes('\n')) return;

    e.preventDefault();
    queueCommands(pastedText.split('\n'));
    setInput('');
    void processCommandQueue();
  }, [processCommandQueue, queueCommands]);

  const handleInputChange = useCallback((newValue: string) => {
    pushUndo();
    setInput(newValue);
    refreshAutocomplete(newValue);
  }, [pushUndo, refreshAutocomplete, setInput]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const suggestions = autocompleteSuggestions;
    const canUseAutocomplete = showAutocomplete && suggestions.length > 0;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      setInput('');
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
      clearTerminalView();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }

    if (e.key === '?' && !state.awaitingPassword && !state.awaitingConfigSource && !confirmDialog?.show) {
      e.preventDefault();
      void onCommand(input + '?');
      return;
    }

    if (e.key === 'Enter') {
      if (canUseAutocomplete && autocompleteIndex >= 0) {
        e.preventDefault();
        const completed = completeAutocompleteSelection(autocompleteSuggestions[autocompleteIndex] || autocompleteSuggestions[0]);
        void handleSubmit(completed);
        return;
      }
      e.preventDefault();
      void handleSubmit();
      return;
    }

    if (e.key === 'Escape') {
      if (shouldShowAutocomplete) {
        e.preventDefault();
        e.stopPropagation();
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        return;
      }
      if (state.awaitingPassword || state.awaitingConfigSource || confirmDialog?.show || isReloadConfirmationPending) {
        e.preventDefault();
        if (onCommand) {
          if (state.awaitingPassword) {
            onCommand('__PASSWORD_CANCELLED__');
          } else if (state.awaitingConfigSource) {
            onCommand('__CONFIG_SOURCE_CANCEL__');
          } else if (isReloadConfirmationPending) {
            onCommand('n');
          }
        }
        if (state.awaitingPassword || localPasswordPrompt) {
          setLocalPasswordPrompt(false);
        }
        setInput('');
        return;
      }
      if (searchOpen) {
        e.preventDefault();
        setSearchOpen(false);
        setSearchQuery('');
        return;
      }
      if (showSettings) {
        e.preventDefault();
        setShowSettings(false);
        return;
      }
      if (onClose) {
        e.preventDefault();
        onClose();
        return;
      }
    }

    if (state.awaitingPassword || localPasswordPrompt || state.awaitingConfigSource || confirmDialog?.show) return;

    if (handleTerminalShortcuts(e, {
      input,
      setInput,
      inputRef,
      onUndo: handleUndo,
      onRedo: handleRedo,
      queueCommands,
      processCommandQueue,
    })) {
      return;
    }

    if (e.key === 'ArrowUp') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return autocompleteSuggestions.length - 1;
          return prev <= 0 ? autocompleteSuggestions.length - 1 : prev - 1;
        });
        return;
      }
      e.preventDefault();
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
      const prevCmd = navigateUp();
      if (prevCmd !== null) {
        setInput(prevCmd);
      }
    } else if (e.key === 'ArrowDown') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return 0;
          return (prev + 1) % autocompleteSuggestions.length;
        });
        return;
      }
      e.preventDefault();
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
      const nextCmd = navigateDown();
      if (nextCmd !== null) {
        setInput(nextCmd);
      }
    } else if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (canUseAutocomplete) {
        completeAutocompleteSelection(autocompleteSuggestions[autocompleteIndex] || autocompleteSuggestions[0]);
        return;
      }
      handleTabComplete();
    } else if (e.key === 'Escape') {
      if (showAutocomplete) {
        e.preventDefault();
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        return;
      }
      e.preventDefault();
      clearTerminalView();
    } else {
      setTabCycleIndex(-1);
    }
  };

  const handleCopyAll = useCallback(async () => {
    try {
      const allText = output.map(line => line.type === 'command' ? `${line.prompt || prompt}${line.content}` : line.content).join('\n');
      await navigator.clipboard.writeText(allText);
      toast({ title: t.copyToastSuccessTitle || t.copy, description: t.copyToastSuccessDescription });
    } catch {
      toast({ title: t.copyToastFailureTitle || t.copy, description: t.copyToastFailureDescription, variant: "destructive" });
    }
  }, [output, prompt, t]);

  const exportTerminal = () => {
    const text = output.map(line => `${line.prompt || (line.type === 'command' ? prompt : '')}${line.content}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deviceName}-cli-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const wifiSignalStrength = useMemo(() => {
    if (!device) return null;
    const wifi = getDeviceWifiConfig(device, deviceStates);
    if (!wifi || !wifi.enabled) return null;
    if (wifi.mode === 'ap') return 5;
    if (device.type === 'pc' && (wifi.mode === 'client' || wifi.mode === 'sta')) {
      return getWirelessSignalStrength(device, devices, deviceStates);
    }
    return null;
  }, [device, devices, deviceStates]);

  const headerAction = (
    <TerminalHeaderActions
      isDark={isDark}
      isMobile={isMobile}
      language={language}
      t={t}
      fontSize={fontSize}
      setFontSize={setFontSize}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      searchOpen={searchOpen}
      setSearchOpen={setSearchOpen}
      handleCopyAll={handleCopyAll}
      exportTerminal={exportTerminal}
      clearTerminalView={clearTerminalView}
      wifiSignalStrength={wifiSignalStrength}
      showPowerButton={showPowerButton}
      isPoweredOff={isPoweredOff}
      onTogglePower={onTogglePower}
      deviceId={deviceId}
      onQuickSettings={onQuickSettings}
      onClose={onClose}
      device={device}
    />
  );

  return (
    <ModernPanel
      id={`terminal-${deviceId}`}
      title={title || deviceName}
      headerStart={
        deviceIconInfo && (
          <span className={`shrink-0 ${deviceIconInfo.color}`}>
            {deviceIconInfo.icon === RouterIcon ? (
              <RouterIcon className="w-4 h-4" />
            ) : deviceIconInfo.icon === SwitchIcon ? (
              <SwitchIcon className="w-4 h-4" isL3={deviceIconInfo.isL3} />
            ) : (
              <deviceIconInfo.icon className="w-4 h-4" />
            )}
          </span>
        )
      }
      onClose={onClose}
      headerAction={headerAction}
      collapsible={false}
      noPadding
      mobileOnlyClose
      className={cn("flex flex-col h-full max-h-[85vh] sm:max-h-none", className)}
      style={{ height: '100%' }}
    >
      <div className={cn("flex flex-col flex-1 min-h-0 h-full overflow-hidden relative", isDark ? "bg-black" : "bg-secondary-50")}>
        {showSettings && (
          <TerminalSettingsBar t={t} fontSize={fontSize} setFontSize={setFontSize} onClear={clearTerminalView} />
        )}

        <div
          ref={terminalRef}
          role="log"
          aria-live="polite"
          aria-label={t.typeCommand}
          onClick={() => inputRef.current?.focus()}
          onContextMenu={async (e) => {
            e.preventDefault();
            try {
              if (navigator.clipboard?.readText) {
                const text = await navigator.clipboard.readText();
                if (text) {
                  if (text.includes('\n')) {
                    queueCommands(text.split('\n'));
                    setInput('');
                    void processCommandQueue();
                  } else {
                    handleInputChange(input + text);
                    inputRef.current?.focus();
                  }
                }
              }
            } catch {
              // Ignore clipboard permissions denial
            }
          }}
          onMouseUp={() => {
            const selectedText = window.getSelection()?.toString();
            if (selectedText && selectedText.trim().length > 0) {
              navigator.clipboard?.writeText(selectedText)?.catch?.(() => {});
            }
          }}
          onWheel={(event) => {
            event.stopPropagation();
            event.currentTarget.scrollTop += event.deltaY;
          }}
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y scroll-smooth font-geist-mono leading-relaxed custom-scrollbar min-h-0 cursor-text",
            isMobile ? "mobile-scroll p-3" : "p-6",
            isPoweredOff ? "bg-black" : (isDark ? "bg-black" : "bg-secondary-50")
          )}
          style={{
            fontSize: `${fontSize}px`,
            paddingBottom: isMobile && keyboardHeight > 0 ? `${keyboardHeight + 20}px` : undefined,
            contain: 'layout style paint'
          }}
        >
          <TerminalOutputLines
            lines={displayedLines}
            isPoweredOff={isPoweredOff}
            isLoading={isLoading}
            isDark={isDark}
            deviceIconInfo={deviceIconInfo}
            currentPrompt={currentPrompt}
            helpLevel={helpLevel}
            language={language}
            t={t}
            searchQuery={searchQuery}
            onBootDone={(id) => { completedBootIds.add(id); setBootVersion(v => v + 1); }}
          />
        </div>

        {!isPoweredOff && (
          <div onClick={() => inputRef.current?.focus()} className={cn("shrink-0 border-t bg-muted/95 backdrop-blur-sm z-20", isMobile ? "p-2 pb-safe" : "p-2.5")}>
            {!state.awaitingPassword && !confirmDialog?.show && helpLevel !== 'exam' && (
              <QuickCommandsBar
                deviceType={device?.type}
                mode={state.currentMode}
                isDark={isDark}
                onRun={handleQuickCommand}
              />
            )}
            <form onSubmit={handleFormSubmit} className="flex items-center gap-3 relative">
              {queueProgress && (
                <div className="absolute -top-8 left-2 right-2 flex items-center justify-between px-3 py-1 rounded-md bg-secondary-900/90 text-white text-xs border border-secondary-700 shadow-md backdrop-blur-sm z-30 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {language === 'tr'
                        ? `Toplu komut işleniyor: ${queueProgress.current} / ${queueProgress.total}`
                        : `Processing batch commands: ${queueProgress.current} / ${queueProgress.total}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelQueue}
                    className="text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    {language === 'tr' ? 'İptal Et' : 'Cancel'}
                  </button>
                </div>
              )}
              {(confirmDialog?.show || isReloadConfirmationPending) && helpLevel !== 'exam' && (
                <div className="absolute -top-7 left-4 right-4 text-[10px] font-black tracking-widest text-warning-400 animate-pulse">
                  {confirmDialog?.show
                    ? (confirmDialog.message || t.pressEnterToConfirm)
                    : `${t.pressEnterToConfirm} [confirm]`}
                </div>
              )}
              <div
                onClick={() => inputRef.current?.focus()}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-background rounded-lg border flex-1 group focus-within:ring-1 transition-all shadow-inner overflow-hidden",
                  state.awaitingPassword || localPasswordPrompt
                    ? "border-warning-500/50 focus-within:ring-warning-500/50"
                    : confirmDialog?.show || isReloadConfirmationPending
                      ? "border-warning-500/50 focus-within:ring-warning-500/50"
                      : "border-input focus-within:ring-primary/50",
                  isMobile && "px-3 py-2"
                )}
              >
                {deviceIconInfo && (
                  <span className={`shrink-0 ${deviceIconInfo.color}`}>
                    {deviceIconInfo.icon === RouterIcon ? (
                      <RouterIcon className="w-4 h-4" />
                    ) : deviceIconInfo.icon === SwitchIcon ? (
                      <SwitchIcon className="w-4 h-4" isL3={deviceIconInfo.isL3} />
                    ) : (
                      <deviceIconInfo.icon className="w-4 h-4" />
                    )}
                  </span>
                )}
                <span className={cn(
                  "font-geist-mono font-bold text-xs sm:text-sm select-none shrink-0 text-primary whitespace-nowrap",
                  (state?.awaitingPassword || localPasswordPrompt || confirmDialog?.show || isReloadConfirmationPending) && "text-warning-400"
                )}>
                  {state?.awaitingPassword || localPasswordPrompt
                    ? t.passwordLabel
                    : confirmDialog?.show || isReloadConfirmationPending
                      ? '[confirm]'
                      : currentPrompt}
                </span>
                <input
                  ref={inputRef}
                  data-terminal-input
                  type={state.awaitingPassword || localPasswordPrompt ? 'password' : 'text'}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (isMobile) {
                      setTimeout(() => {
                        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 400);
                    }
                  }}
                  disabled={isInputDisabled}
                  className="flex-1 bg-transparent border-none outline-none font-geist-mono text-[16px] sm:text-[13px] placeholder:text-muted-foreground/50 min-w-0"
                  placeholder={
                    state.awaitingPassword || localPasswordPrompt
                      ? t.enterPassword
                      : confirmDialog?.show || isReloadConfirmationPending
                        ? t.typeCommandPlaceholder
                        : t.typeCommand
                  }
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              {(state.awaitingPassword || localPasswordPrompt || confirmDialog?.show || isReloadConfirmationPending) && (
                <Button
                  type="button"
                  disabled={isInputDisabled}
                  variant="ghost"
                  className="shrink-0 rounded-xl hover:bg-error-500/20 text-error-500 px-2 h-9 text-xs"
                  onClick={() => {
                    if (onCommand) {
                      if (state.awaitingPassword || localPasswordPrompt) {
                        onCommand('__PASSWORD_CANCELLED__');
                      } else if (isReloadConfirmationPending) {
                        onCommand('n');
                      }
                    }
                    if (state.awaitingPassword || localPasswordPrompt) {
                      setLocalPasswordPrompt(false);
                    }
                    setInput('');
                  }}
                  title={t.cancel}
                >
                  <X className={cn("w-4 h-4 mr-1", isMobile && "w-3 h-3")} />
                  <span className="text-error-600 dark:text-error-400 font-medium">{t.cancel}</span>
                </Button>
              )}
              <Button
                type="submit"
                disabled={isInputDisabled}
                aria-label={t.typeCommand}
                className={cn(
                  "shrink-0 rounded-xl shadow-lg px-3 bg-secondary-800 text-white hover:bg-secondary-700 dark:bg-white dark:text-secondary-900 dark:hover:bg-secondary-200",
                  isMobile ? "h-9 text-xs" : "h-11 text-sm",
                  (state.awaitingPassword || localPasswordPrompt || confirmDialog?.show || isReloadConfirmationPending) && "bg-warning-500 hover:bg-warning-600 text-white"
                )}
              >
                <span className="rounded-md p-1"><CornerDownLeft className={cn("w-4 h-4 text-white dark:text-secondary-900", isMobile && "w-3 h-3")} /></span>
              </Button>
            </form>

            {shouldShowAutocomplete && (
              <TerminalAutocompleteDropdown
                suggestions={autocompleteSuggestions}
                activeIndex={autocompleteIndex}
                isDark={isDark}
                containerRef={autocompleteRef}
                listRef={autocompleteListRef}
                onSelect={(cmd) => {
                  completeAutocompleteSelection(cmd);
                  inputRef.current?.focus();
                }}
              />
            )}
          </div>
        )}
      </div>

      <SearchOutputDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        isDark={isDark}
        labels={{
          searchOutputTitle: t.search,
          searchOutputDescription: t.searchTerminal,
          searchPlaceholder: t.search + '...',
          close: t.close,
          noResultsFound: t.noResultsFound,
        }}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onNext={goToNextMatch}
        onPrev={goToPrevMatch}
        matchIndex={searchMatchIndex}
        matchCount={searchMatchCount}
      />
    </ModernPanel>
  );
}
