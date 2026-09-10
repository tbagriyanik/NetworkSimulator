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
  globalCommandHistory?: string[]
): UseTerminalHistoryReturn {
  const [history, setHistory] = useState<string[]>(() => globalCommandHistory || []);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Synchronize history with global device state during render when device or history changes
  const [prevSync, setPrevSync] = useState<{
    deviceId: string | null;
    history: string[] | undefined;
  }>({ deviceId: null, history: undefined });

  if (prevSync.deviceId !== deviceId || prevSync.history !== globalCommandHistory) {
    const deviceChanged = prevSync.deviceId !== deviceId;
    setPrevSync({ deviceId, history: globalCommandHistory });
    setHistory(globalCommandHistory || []);
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
      nextHistory = [trimmed, ...history].slice(0, 50);
      setHistory(nextHistory);
    }
    setHistoryIndex(-1);
    return nextHistory;
  }, [history]);

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
