'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface UseTerminalCommandQueueOptions {
  deviceId: string;
  history: string[];
  addHistoryCommand: (command: string) => string[];
  onCommand: (command: string) => Promise<unknown>;
  onUpdateHistory?: (deviceId: string, history: string[]) => void;
  isLoading: boolean;
  awaitingPassword: boolean;
  awaitingConfigSource: boolean;
  confirmDialogOpen: boolean;
  setTabCycleIndex: Dispatch<SetStateAction<number>>;
  setShowAutocomplete: Dispatch<SetStateAction<boolean>>;
  setAutocompleteIndex: Dispatch<SetStateAction<number>>;
}

export interface BatchQueueProgress {
  current: number;
  total: number;
}

export function useTerminalCommandQueue({
  deviceId,
  history,
  addHistoryCommand,
  onCommand,
  onUpdateHistory,
  isLoading,
  awaitingPassword,
  awaitingConfigSource,
  confirmDialogOpen,
  setTabCycleIndex,
  setShowAutocomplete,
  setAutocompleteIndex,
}: UseTerminalCommandQueueOptions) {
  const commandQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
  const isLoadingRef = useRef<boolean>(isLoading);
  const awaitingPasswordRef = useRef<boolean>(awaitingPassword);
  const awaitingConfigSourceRef = useRef<boolean>(awaitingConfigSource);
  const confirmDialogOpenRef = useRef<boolean>(confirmDialogOpen);
  const [queueProgress, setQueueProgress] = useState<BatchQueueProgress | null>(null);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    awaitingPasswordRef.current = awaitingPassword;
  }, [awaitingPassword]);

  useEffect(() => {
    awaitingConfigSourceRef.current = awaitingConfigSource;
  }, [awaitingConfigSource]);

  useEffect(() => {
    confirmDialogOpenRef.current = confirmDialogOpen;
  }, [confirmDialogOpen]);

  useEffect(() => {
    commandQueueRef.current = [];
    isProcessingQueueRef.current = false;
    setQueueProgress(null);
  }, [deviceId]);

  const queueCommands = useCallback((commands: string[]) => {
    const sanitized = commands
      .map((line) => line.replace(/\r/g, '').trim())
      .filter((line) => line.length > 0);

    if (sanitized.length === 0) return;
    commandQueueRef.current.push(...sanitized);
  }, []);

  const cancelQueue = useCallback(() => {
    commandQueueRef.current = [];
    setQueueProgress(null);
  }, []);

  const processCommandQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    const initialTotal = commandQueueRef.current.length;
    let executedCount = 0;

    if (initialTotal > 1) {
      setQueueProgress({ current: 0, total: initialTotal });
    }

    try {
      let currentHistory = history;
      while (commandQueueRef.current.length > 0) {
        const nextCommand = commandQueueRef.current.shift();
        if (!nextCommand) continue;

        executedCount++;
        if (initialTotal > 1) {
          setQueueProgress({ current: executedCount, total: initialTotal });
        }

        const updatedHistory = addHistoryCommand(nextCommand);
        if (updatedHistory !== currentHistory) {
          currentHistory = updatedHistory;
          if (onUpdateHistory) onUpdateHistory(deviceId, currentHistory);
        }
        setTabCycleIndex(-1);
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);

        await onCommand(nextCommand);

        // Wait until the command lifecycle is fully settled before next command.
        // This prevents pasted commands from overlapping.
        await new Promise((resolve) => setTimeout(resolve, 20));
        let guard = 0;
        while (isLoadingRef.current && guard < 600) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          guard += 1;
        }

        // If command triggered an interactive mode, pause the queue.
        if (awaitingPasswordRef.current || awaitingConfigSourceRef.current || confirmDialogOpenRef.current) {
          break;
        }
      }
    } finally {
      isProcessingQueueRef.current = false;
      setQueueProgress(null);
    }
  }, [history, addHistoryCommand, deviceId, onCommand, onUpdateHistory, setTabCycleIndex, setShowAutocomplete, setAutocompleteIndex]);

  return { queueCommands, processCommandQueue, queueProgress, cancelQueue };
}