'use client';

import { useCallback, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import type { PCActiveTab, OutputLine } from './PCPanel.types';
import { expandCommandContext, DESKTOP_COMMANDS } from '../pcPanel.utils';

export interface UsePCPanelInputParams {
  input: string;
  setInput: (value: string) => void;
  activeTab: PCActiveTab;
  tabCycleIndex: number;
  setTabCycleIndex: (value: number) => void;
  lastTabInput: string;
  setLastTabInput: (value: string) => void;
  undoStack: string[];
  setUndoStack: (value: string[] | ((prev: string[]) => string[])) => void;
  redoStack: string[];
  setRedoStack: (value: string[] | ((prev: string[]) => string[])) => void;
  showAutocomplete: boolean;
  setShowAutocomplete: (value: boolean) => void;
  autocompleteIndex: number;
  setAutocompleteIndex: (value: number | ((prev: number) => number)) => void;
  autocompleteNavigated: boolean;
  setAutocompleteNavigated: (value: boolean) => void;
  setSearchOpen: (value: boolean) => void;
  autocompleteRef: React.RefObject<HTMLDivElement | null>;
  getCommandMode: () => string;
  executeCommand: (cmd?: string) => Promise<void>;
  getAutocompleteSuggestionsCallback: (value: string) => string[];
  isConsoleConnected: boolean;
  consoleNeedsPassword: boolean;
  consoleConfirmDialog: { show: boolean; message: string } | null;
  consoleReloadPending: boolean;
  connectedDeviceId: string | null;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  setConsolePasswordAttempted: (value: boolean) => void;
  setIsConsoleConnected: (value: boolean) => void;
  setConnectedDeviceId: (value: string | null) => void;
  desktopHistory: string[];
  desktopHistoryIndex: number;
  setDesktopHistoryIndex: (value: number | ((prev: number) => number)) => void;
  consoleHistory: string[];
  consoleHistoryIndex: number;
  setConsoleHistoryIndex: (value: number | ((prev: number) => number)) => void;
  setPcOutput: (value: OutputLine[] | ((prev: OutputLine[]) => OutputLine[])) => void;
  setConsoleConnectionTime: (value: number | ((prev: number) => number)) => void;
  renderAutocompleteSuggestions: string[];
}

export function usePCPanelInput(params: UsePCPanelInputParams) {
  const {
    input,
    setInput,
    activeTab,
    tabCycleIndex,
    setTabCycleIndex,
    lastTabInput,
    setLastTabInput,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    showAutocomplete,
    setShowAutocomplete,
    autocompleteIndex,
    setAutocompleteIndex,
    autocompleteNavigated,
    setAutocompleteNavigated,
    setSearchOpen,
    autocompleteRef,
    getCommandMode,
    executeCommand,
    getAutocompleteSuggestionsCallback,
    isConsoleConnected,
    consoleNeedsPassword,
    consoleConfirmDialog,
    consoleReloadPending,
    connectedDeviceId,
    onExecuteDeviceCommand,
    setConsolePasswordAttempted,
    setIsConsoleConnected,
    setConnectedDeviceId,
    desktopHistory,
    desktopHistoryIndex,
    setDesktopHistoryIndex,
    consoleHistory,
    consoleHistoryIndex,
    setConsoleHistoryIndex,
    setPcOutput,
    setConsoleConnectionTime,
    renderAutocompleteSuggestions,
  } = params;

  const buildCompletedInput = useCallback((selected: string) => {
    const mode = getCommandMode();
    const { contextTokens } = expandCommandContext(mode, input);
    const prefix = contextTokens.join(' ');
    return prefix ? `${prefix} ${selected}` : selected;
  }, [input, getCommandMode]);

  const completeAutocompleteSelection = useCallback((selected: string) => {
    const completed = buildCompletedInput(selected);
    setInput(completed);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    setAutocompleteNavigated(false);
    return completed;
  }, [buildCompletedInput, setInput, setShowAutocomplete, setAutocompleteIndex, setAutocompleteNavigated]);

  useEffect(() => {
    if (!showAutocomplete) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (autocompleteRef.current && target && !autocompleteRef.current.contains(target)) {
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        setAutocompleteNavigated(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAutocomplete, autocompleteRef, setShowAutocomplete, setAutocompleteIndex, setAutocompleteNavigated]);

  const handleTabComplete = useCallback(() => {
    const value = input;
    if (!value && tabCycleIndex === -1) return;

    const isIpv4 = (raw: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(raw);
    const trimmed = value.trim();
    const hasTrailingSpace = /\s$/.test(value);

    const ipAddressMatch = trimmed.match(/^ip\s+address\s+(\S+)(?:\s+(\S+))?$/i);
    if (ipAddressMatch) {
      const ip = ipAddressMatch[1];
      const mask = ipAddressMatch[2];
      if (isIpv4(ip) && !mask) {
        setInput(`ip address ${ip} 255.255.255.0`);
        setTabCycleIndex(-1);
        return;
      }
      if (isIpv4(ip) && mask && isIpv4(mask) && !hasTrailingSpace) {
        setInput(`${trimmed} `);
        setTabCycleIndex(-1);
        return;
      }
    }

    const singleIpArgMatch = trimmed.match(/^(?:ip\s+default-gateway|ping|http|telnet|ssh)\s+(\S+)$/i);
    if (singleIpArgMatch && isIpv4(singleIpArgMatch[1]) && !hasTrailingSpace) {
      setInput(`${trimmed} `);
      setTabCycleIndex(-1);
      return;
    }

    const networkMatch = trimmed.match(/^network\s+(\S+)(?:\s+(\S+))?$/i);
    if (networkMatch) {
      const netIp = networkMatch[1];
      const mask = networkMatch[2];
      if (isIpv4(netIp) && !mask) {
        setInput(`network ${netIp} 255.255.255.0`);
        setTabCycleIndex(-1);
        return;
      }
      if (isIpv4(netIp) && mask && isIpv4(mask) && !hasTrailingSpace) {
        setInput(`${trimmed} `);
        setTabCycleIndex(-1);
        return;
      }
    }

    const dhcpSingleIpArgMatch = trimmed.match(/^(?:default-router|dns-server)\s+(\S+)$/i);
    if (dhcpSingleIpArgMatch && isIpv4(dhcpSingleIpArgMatch[1]) && !hasTrailingSpace) {
      setInput(`${trimmed} `);
      setTabCycleIndex(-1);
      return;
    }

    let matches: string[] = [];
    let contextTokens: string[] = [];

    if (activeTab === 'desktop') {
      const tokens = value.trim().split(/\s+/).filter(Boolean);
      const currentWord = value.endsWith(' ') ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
      contextTokens = [];
      matches = DESKTOP_COMMANDS.filter(opt => opt !== '?' && opt.toLowerCase().startsWith(currentWord));
    } else {
      const mode = getCommandMode();
      const context = expandCommandContext(mode, value);
      contextTokens = context.contextTokens;
      matches = context.candidates.filter(opt => opt !== '?' && opt.toLowerCase().startsWith(context.currentWord));
    }

    if (matches.length > 0) {
      if (tabCycleIndex === -1) {
        setLastTabInput(value);
        setTabCycleIndex(0);
        const completion = matches[0];
        const prefix = contextTokens.join(' ');
        setInput(prefix ? `${prefix} ${completion}` : completion);
      } else {
        const nextIndex = (tabCycleIndex + 1) % matches.length;
        setTabCycleIndex(nextIndex);
        const originalParts = lastTabInput.split(/\s+/);
        const originalContext = lastTabInput.endsWith(' ') ? lastTabInput.trim() : originalParts.slice(0, -1).join(' ');
        const completion = matches[nextIndex];
        setInput(originalContext ? `${originalContext} ${completion}` : completion);
      }
    } else if (value.trim() && activeTab === 'terminal' && isConsoleConnected) {
      void executeCommand(value.trim() + ' ?');
    }
  }, [input, tabCycleIndex, lastTabInput, getCommandMode, executeCommand, isConsoleConnected, activeTab, setTabCycleIndex, setLastTabInput, setInput]);

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const newUndoStack = [...undoStack];
      const previousInput = newUndoStack.pop() || '';
      setRedoStack([input, ...redoStack]);
      setInput(previousInput);
      setUndoStack(newUndoStack);
    }
  }, [input, undoStack, redoStack, setRedoStack, setInput, setUndoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const nextInput = newRedoStack.shift() || '';
      setUndoStack([...undoStack, input]);
      setInput(nextInput);
      setRedoStack(newRedoStack);
    }
  }, [input, undoStack, redoStack, setUndoStack, setInput, setRedoStack]);

  const handleInputChange = useCallback((newValue: string) => {
    if (activeTab === 'terminal' && isConsoleConnected && newValue.endsWith('?') && !consoleNeedsPassword && !consoleConfirmDialog?.show) {
      const partialCommand = newValue.slice(0, -1);
      setUndoStack([...undoStack, input]);
      setRedoStack([]);
      setInput(partialCommand);
      void executeCommand(newValue);
      return;
    }

    setUndoStack([...undoStack, input]);
    setRedoStack([]);
    setInput(newValue);
    setAutocompleteNavigated(false);

    if (newValue.trim().length > 0) {
      const suggestions = getAutocompleteSuggestionsCallback(newValue);
      if (suggestions.length > 0) {
        setShowAutocomplete(true);
        setAutocompleteIndex(-1);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [activeTab, isConsoleConnected, consoleNeedsPassword, consoleConfirmDialog, undoStack, input, setUndoStack, setRedoStack, setInput, setAutocompleteNavigated, getAutocompleteSuggestionsCallback, setShowAutocomplete, setAutocompleteIndex, executeCommand]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (activeTab === 'desktop') setPcOutput([]);
      else if (activeTab === 'terminal') setConsoleConnectionTime(Date.now());
      setInput('');
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
      setAutocompleteNavigated(false);
      return;
    }

    const canUseAutocomplete = showAutocomplete && renderAutocompleteSuggestions.length > 0;

    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (activeTab === 'desktop') {
        setPcOutput([]);
      } else if (activeTab === 'terminal') {
        setConsoleConnectionTime(Date.now());
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (e.key === 'Escape') {
      if (showAutocomplete) {
        e.preventDefault();
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        setAutocompleteNavigated(false);
        return;
      }
      if (activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)) {
        e.preventDefault();
        if (onExecuteDeviceCommand && connectedDeviceId) {
          if (consoleNeedsPassword) {
            onExecuteDeviceCommand(connectedDeviceId, '__PASSWORD_CANCELLED__');
          } else if (consoleReloadPending) {
            onExecuteDeviceCommand(connectedDeviceId, 'n');
          }
        }
        if (consoleNeedsPassword) {
          setConsolePasswordAttempted(false);
          setIsConsoleConnected(false);
          setConnectedDeviceId(null);
        }
        setInput('');
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      const inputElement = e.currentTarget as HTMLInputElement;
      if (input) {
        const start = inputElement.selectionStart || 0;
        const end = inputElement.selectionEnd || 0;
        if (start !== end) {
          const selectedText = input.substring(start, end);
          navigator.clipboard.writeText(selectedText).then(() => {
            const newInput = input.substring(0, start) + input.substring(end);
            setInput(newInput);
          });
        }
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const inputElement = e.currentTarget as HTMLInputElement;
      if (input) {
        const start = inputElement.selectionStart || 0;
        const end = inputElement.selectionEnd || 0;
        if (start !== end) {
          const selectedText = input.substring(start, end);
          navigator.clipboard.writeText(selectedText);
        } else if (input) {
          navigator.clipboard.writeText(input);
        }
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      return;
    }

    if (e.key === 'Enter') {
      if (canUseAutocomplete && autocompleteNavigated) {
        e.preventDefault();
        const completed = completeAutocompleteSelection(renderAutocompleteSuggestions[autocompleteIndex] || renderAutocompleteSuggestions[0]);
        void executeCommand(completed);
        return;
      }
      void executeCommand();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (canUseAutocomplete) {
        completeAutocompleteSelection(renderAutocompleteSuggestions[autocompleteIndex] || renderAutocompleteSuggestions[0]);
        return;
      }
      handleTabComplete();
    } else if (e.key === 'ArrowUp') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return renderAutocompleteSuggestions.length - 1;
          return prev <= 0 ? renderAutocompleteSuggestions.length - 1 : prev - 1;
        });
        setAutocompleteNavigated(true);
        return;
      }
      e.preventDefault();
      if (activeTab === 'desktop') {
        if (desktopHistory.length > 0 && desktopHistoryIndex < desktopHistory.length - 1) {
          const ni = desktopHistoryIndex + 1;
          setDesktopHistoryIndex(ni);
          setInput(desktopHistory[ni]);
        }
      } else if (activeTab === 'terminal') {
        if (consoleHistory.length > 0 && consoleHistoryIndex < consoleHistory.length - 1) {
          const ni = consoleHistoryIndex + 1;
          setConsoleHistoryIndex(ni);
          setInput(consoleHistory[ni]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return 0;
          return (prev + 1) % renderAutocompleteSuggestions.length;
        });
        setAutocompleteNavigated(true);
        return;
      }
      e.preventDefault();
      if (activeTab === 'desktop') {
        if (desktopHistoryIndex > 0) {
          const ni = desktopHistoryIndex - 1;
          setDesktopHistoryIndex(ni);
          setInput(desktopHistory[ni]);
        } else if (desktopHistoryIndex === 0) {
          setDesktopHistoryIndex(-1);
          setInput('');
        }
      } else if (activeTab === 'terminal') {
        if (consoleHistoryIndex > 0) {
          const ni = consoleHistoryIndex - 1;
          setConsoleHistoryIndex(ni);
          setInput(consoleHistory[ni]);
        } else if (consoleHistoryIndex === 0) {
          setConsoleHistoryIndex(-1);
          setInput('');
        }
      }
    }
  }, [
    activeTab, autocompleteIndex, autocompleteNavigated, completeAutocompleteSelection,
    connectedDeviceId, consoleConfirmDialog, consoleHistory, consoleHistoryIndex,
    consoleNeedsPassword, consoleReloadPending, desktopHistory, desktopHistoryIndex,
    executeCommand, handleRedo, handleTabComplete, handleUndo, input,
    isConsoleConnected, onExecuteDeviceCommand, renderAutocompleteSuggestions,
    setAutocompleteIndex, setAutocompleteNavigated, setConnectedDeviceId,
    setConsoleConnectionTime, setConsolePasswordAttempted, setDesktopHistoryIndex,
    setConsoleHistoryIndex, setInput, setIsConsoleConnected, setPcOutput,
    setSearchOpen, setShowAutocomplete, showAutocomplete,
  ]);

  return {
    buildCompletedInput,
    completeAutocompleteSelection,
    handleTabComplete,
    handleUndo,
    handleRedo,
    handleInputChange,
    handleKeyDown,
  };
}
