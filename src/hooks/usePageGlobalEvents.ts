import { useEffect } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/networkTopology.types';
import type { TabType } from '@/app/page.types';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';

type GuidedModeContext = {
  lastCommand?: string;
  lastOutput?: string;
  deviceAccessed?: 'switch' | 'router' | 'pc' | null;
  deviceAccessedId?: string | null;
  deviceState?: unknown;
  deviceStates?: Map<string, unknown>;
  topologyConnections?: unknown[];
  topologyDevices?: unknown[];
};

type PcPanelTab = 'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot';
type UnifiedDeviceTab = 'console' | 'settings' | 'stp' | 'physical';

export interface UsePageGlobalEventsParams {
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  state: SwitchState;
  isGuidedModeActive: boolean;
  setLastCommand: (command: string) => void;
  setLastOutput: (output: string) => void;
  commitAction: (desc: string) => void;
  checkStepCompletionWithContext: (context: GuidedModeContext) => void;
  setShowPCDeviceId: (id: string) => void;
  setPcPanelInitialTab: (tab: PcPanelTab) => void;
  setShowPCPanel: (show: boolean) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setUnifiedDeviceActiveTab: (tab: UnifiedDeviceTab) => void;
  setShowUnifiedDeviceModal: (show: boolean) => void;
  setActiveTab: (tab: TabType) => void;
}

export function usePageGlobalEvents({
  topologyDevices,
  topologyConnections,
  deviceStates,
  state,
  isGuidedModeActive,
  setLastCommand,
  setLastOutput,
  commitAction,
  checkStepCompletionWithContext,
  setShowPCDeviceId,
  setPcPanelInitialTab,
  setShowPCPanel,
  setActiveDeviceId,
  setActiveDeviceType,
  setUnifiedDeviceActiveTab,
  setShowUnifiedDeviceModal,
  setActiveTab
}: UsePageGlobalEventsParams) {

  useEffect(() => {
    const handlePcCommandExecuted = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId: string; command: string; output?: string }>;
      const { deviceId, command, output } = customEvent.detail;

      setLastCommand(command);
      setLastOutput(output || '');

      if (command && command.trim() !== '') {
        const deviceName = topologyDevices?.find(d => d.id === deviceId)?.name || deviceId;
        commitAction(`${deviceName} CMD: ${command}`);
      }

      if (isGuidedModeActive) {
        checkStepCompletionWithContext({
          lastCommand: command,
          lastOutput: output || '',
          deviceAccessed: 'pc',
          deviceAccessedId: deviceId,
          deviceState: state,
          deviceStates: deviceStates,
          topologyConnections: topologyConnections,
          topologyDevices: topologyDevices
        });
      }
    };

    window.addEventListener('pc-command-executed', handlePcCommandExecuted);
    return () => window.removeEventListener('pc-command-executed', handlePcCommandExecuted);
  }, [
    topologyDevices, setLastCommand, setLastOutput, commitAction,
    isGuidedModeActive, checkStepCompletionWithContext, state,
    deviceStates, topologyConnections
  ]);

  useEffect(() => {
    const handleShowMe = (e: Event) => {
      const { targetDeviceId, deviceType, stepId, hintCommand, commandPattern, checkType, toIp } = (e as CustomEvent).detail;
      let deviceId = targetDeviceId;

      let rawStr = '';
      if (checkType === 'ping' && toIp) {
        rawStr = `ping ${toIp}`;
      } else if (hintCommand) {
        rawStr = String(hintCommand);
      } else if (commandPattern) {
        rawStr = String(commandPattern).split('|')[0];
      }

      // Try resolving target device from hint prefix (e.g. "router-1: ...") if not specified
      if (!deviceId && rawStr) {
        const colonMatch = rawStr.match(/^([^:]{1,40}):\s*/);
        if (colonMatch) {
          const targetName = colonMatch[1].trim().toLowerCase();
          const found = topologyDevices.find(
            d => d.name.toLowerCase() === targetName || d.id.toLowerCase() === targetName
          );
          if (found) {
            deviceId = found.id;
          }
        }
      }

      let cleanCommand = '';

      // Check if rawStr contains a quoted command like "ipconfig" or "show ip int brief"
      const quoteMatch = rawStr.match(/["'“”]([^"'“”]+)["'“”]/);
      if (quoteMatch && quoteMatch[1].trim()) {
        cleanCommand = quoteMatch[1].trim();
      } else {
        cleanCommand = rawStr;
      }

      // Clean device prefixes (e.g. "switch-1: ...") and prompt prefixes (e.g. "Switch# ", "Switch(config)# ", "Switch> ")
      cleanCommand = cleanCommand
        .replace(/[\^$()]/g, '')
        .replace(/^[^:]{1,40}:\s*/i, '')
        .replace(/^[a-zA-Z0-9_-]+(\([^)]+\))?[>#]\s*/, '')
        .replace(/^(type|yazın|yazin)\s+/i, '')
        .replace(/\s+(yazın|yazin)\.?$/i, '')
        .replace(/\s+(and press enter|press enter)\.?$/i, '')
        .replace(/^["'“”]+|["'“”.,!?]+$/g, '')
        .trim();

      if (!cleanCommand && commandPattern) {
        cleanCommand = String(commandPattern).split('|')[0].replace(/[\^$()]/g, '').trim();
      }

      if (!deviceId) {
        if (
          deviceType === 'pc' ||
          (stepId && (String(stepId).includes('pc') || String(stepId).startsWith('run-'))) ||
          cleanCommand === 'help' ||
          cleanCommand.includes('ipconfig') ||
          cleanCommand.includes('ping') ||
          cleanCommand.includes('ftp') ||
          cleanCommand.includes('tracert') ||
          cleanCommand.includes('cls') ||
          cleanCommand.includes('dir') ||
          cleanCommand.includes('nslookup')
        ) {
          deviceId = topologyDevices.find(d => d.type === 'pc')?.id;
        } else if (deviceType === 'switch') {
          deviceId = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3')?.id;
        } else if (deviceType === 'router') {
          deviceId = topologyDevices.find(d => d.type === 'router')?.id;
        } else {
          deviceId = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3' || d.type === 'router')?.id;
        }
      }

      if (deviceId) {
        const device = topologyDevices.find(d => d.id === deviceId);
        if (device) {
          // "Show Me" must focus the lesson target exclusively. Remove all
          // previously open floating device windows before presenting it.
          useMultiWindowStore.getState().closeAllDeviceWindows();
          if (device.type === 'pc') {
            setShowPCDeviceId(deviceId);
            setPcPanelInitialTab('desktop');
            if (window.innerWidth >= 641 && window.innerWidth <= 1024) {
              setShowPCPanel(true);
            } else {
              useMultiWindowStore.getState().openDeviceWindow(deviceId, 'pc', 'desktop');
            }
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('pc-auto-type', { detail: { deviceId, command: cleanCommand } }));
            }, 600);
          } else {
            setActiveDeviceId(deviceId);
            setActiveDeviceType(device.type);
            setUnifiedDeviceActiveTab('console');
            setShowUnifiedDeviceModal(true);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('terminal-auto-type', { detail: { deviceId, command: cleanCommand } }));
            }, 600);
          }
        }
      }
    };
    window.addEventListener('request-show-me', handleShowMe);
    return () => window.removeEventListener('request-show-me', handleShowMe);
  }, [
    topologyDevices, setActiveDeviceId, setActiveDeviceType,
    setShowUnifiedDeviceModal, setActiveTab, setShowPCDeviceId,
    setPcPanelInitialTab, setShowPCPanel, setUnifiedDeviceActiveTab
  ]);
}
