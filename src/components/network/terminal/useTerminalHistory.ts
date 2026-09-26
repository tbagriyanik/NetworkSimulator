'use client';

import { useState, useCallback } from 'react';

export interface UseTerminalHistoryOptions {
  deviceId: string;
  initialHistory?: string[];
}

export interface UseTerminalHistoryReturn {
  history: string[];
  historyIndex: number;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  addHistoryCommand: (command: string) => string[];
  navigateUp: () => string | null;
  navigateDown: () => string | null;
  resetHistoryIndex: () => void;
}

export function useTerminalHistory(
  deviceId: string,
  globalCommandHistory?: string[],
  historySize?: number
): UseTerminalHistoryReturn {
  const cap = historySize && historySize > 0 ? historySize : 50;
  const [history, setHistory] = useState<string[]>(() => (globalCommandHistory || []).slice(0, cap));
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Synchronize history with global device state during render when device or history changes
  const [prevSync, setPrevSync] = useState<{
    deviceId: string | null;
    history: string[] | undefined;
    historySize: number | null;
  }>({ deviceId: null, history: undefined, historySize: null });

  if (prevSync.deviceId !== deviceId || prevSync.history !== globalCommandHistory || prevSync.historySize !== cap) {
    const deviceChanged = prevSync.deviceId !== deviceId;
    setPrevSync({ deviceId, history: globalCommandHistory, historySize: cap });
    setHistory((globalCommandHistory || []).slice(0, cap));
    if (deviceChanged) {
      setHistoryIndex(-1);
    }
  }

  const resetHistoryIndex = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  const addHistoryCommand = useCallback((command: string): string[] => {
    if (!command || !command.trim()) return history;
    const trimmed = command;
    let nextHistory = history;
    if (history[0] !== trimmed) {
      nextHistory = [trimmed, ...history].slice(0, cap);
      setHistory(nextHistory);
    }
    setHistoryIndex(-1);
    return nextHistory;
  }, [history, cap]);

  const navigateUp = useCallback((): string | null => {
    if (history.length > 0 && historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      return history[nextIndex] ?? null;
    }
    return null;
  }, [history, historyIndex]);

  const navigateDown = useCallback((): string | null => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      return history[nextIndex] ?? null;
    }
    if (historyIndex === 0) {
      setHistoryIndex(-1);
      return '';
    }
    return null;
  }, [history, historyIndex]);

  return {
    history,
    historyIndex,
    setHistoryIndex,
    addHistoryCommand,
    navigateUp,
    navigateDown,
    resetHistoryIndex,
  };
}
