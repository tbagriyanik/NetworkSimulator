import { useMemo, useCallback } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '../Terminal';
import type { OutputLine, PCActiveTab } from './PCPanel.types';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { toast } from '@/hooks/use-toast';
import { errorHandler, CLIPBOARD_ERRORS } from '@/lib/errors/errorHandler';
import { getAutocompleteSuggestions } from './pcTerminal.utils';

export interface UsePCPanelTerminalSyncParams {
  isConsoleConnected: boolean;
  connectedDeviceId: string | null;
  deviceId?: string;
  currentPath?: string;
  deviceOutputs: Map<string, TerminalOutput[]>;
  consoleConnectionTime: number;
  activeTab: PCActiveTab;
  pcOutput: OutputLine[];
  t: Record<string, string>;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  input: string;
  showAutocomplete: boolean;
}

export function usePCPanelTerminalSync({
  isConsoleConnected,
  connectedDeviceId,
  deviceId,
  currentPath,
  deviceOutputs,
  consoleConnectionTime,
  activeTab,
  pcOutput,
  t,
  topologyDevices,
  deviceStates,
  input,
  showAutocomplete
}: UsePCPanelTerminalSyncParams) {

  // Synchronized Console Output from Global State
  const activeConsoleOutput = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return [];
    const allOutput = deviceOutputs?.get(connectedDeviceId) || [];
    return allOutput.filter((line: TerminalOutput) => (line.timestamp || 0) >= consoleConnectionTime);
  }, [isConsoleConnected, connectedDeviceId, deviceOutputs, consoleConnectionTime]);

  const handleCopyAll = useCallback(async () => {
    try {
      const lines = (activeTab === 'desktop' ? pcOutput : activeConsoleOutput).map((line: OutputLine | TerminalOutput) => {
        if (line.type === 'command') return `${activeTab === 'desktop' ? 'C:\\>' : (line.prompt || '>')}${line.content}`;
        return line.content;
      });
      await navigator.clipboard.writeText(lines.join('\n'));
      toast({
        title: t.copyToastSuccessTitle || 'Copied',
        description: t.copyToastSuccessDescription || 'Terminal output copied to clipboard',
      });
    } catch {
      errorHandler.logError(CLIPBOARD_ERRORS.COPY_FAILED({ contentLength: pcOutput.length, activeTab }));
      toast({
        title: t.copyToastFailureTitle || 'Copy Failed',
        description: t.copyToastFailureDescription || 'Could not copy terminal output',
        variant: "destructive",
      });
    }
  }, [activeTab, pcOutput, activeConsoleOutput, t]);

  const getCommandMode = useCallback((): string => {
    if (activeTab === 'terminal' && isConsoleConnected && connectedDeviceId && deviceStates) {
      const state = deviceStates.get(connectedDeviceId);
      const mode = state?.currentMode || 'user';
      if (mode === 'config-if-range') return 'interface';
      return mode;
    }
    return 'user';
  }, [activeTab, isConsoleConnected, connectedDeviceId, deviceStates]);

  const getAutocompleteSuggestionsCallback = useCallback((value: string) => {
    return getAutocompleteSuggestions({
      value,
      activeTab,
      topologyDevices,
      deviceStates,
      getCommandMode,
      deviceId: connectedDeviceId || deviceId,
      currentPath,
    });
  }, [activeTab, getCommandMode, topologyDevices, deviceStates, connectedDeviceId, deviceId, currentPath]);

  const renderAutocompleteSuggestions = useMemo(
    () => getAutocompleteSuggestionsCallback(input),
    [getAutocompleteSuggestionsCallback, input]
  );

  const shouldShowAutocomplete = useMemo(
    () => showAutocomplete && input.trim().length > 0 && renderAutocompleteSuggestions.length > 0,
    [showAutocomplete, input, renderAutocompleteSuggestions]
  );

  return {
    activeConsoleOutput,
    handleCopyAll,
    getCommandMode,
    getAutocompleteSuggestionsCallback,
    renderAutocompleteSuggestions,
    shouldShowAutocomplete
  };
}


