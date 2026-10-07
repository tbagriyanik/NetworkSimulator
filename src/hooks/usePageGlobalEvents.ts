import { useEffect } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
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
  setIsTimelineMinimized?: (minimized: boolean) => void;
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
  setActiveTab,
  setIsTimelineMinimized
}: UsePageGlobalEventsParams) {

  useEffect(() => {
    const handleCommitActionEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (customEv.detail?.action) {
        commitAction(customEv.detail.action);
      }
    };

    const handleSetTimelineMinimized = (e: Event) => {
      const customEv = e as CustomEvent<{ minimized: boolean }>;
      if (typeof customEv.detail?.minimized === 'boolean' && setIsTimelineMinimized) {
        setIsTimelineMinimized(customEv.detail.minimized);
      }
    };

    window.addEventListener('commit-action-event', handleCommitActionEvent);
    window.addEventListener('set-timeline-minimized', handleSetTimelineMinimized);

    return () => {
      window.removeEventListener('commit-action-event', handleCommitActionEvent);
      window.removeEventListener('set-timeline-minimized', handleSetTimelineMinimized);
    };
  }, [commitAction, setIsTimelineMinimized]);

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

      // Extract command line: ignore prompt/mode lines (e.g. "S-Lab(config)#", "S-Lab>", "R-Lab#", "PC-1>", "C:\>")
      const rawLines = rawStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const isPromptOrModeLine = (line: string): boolean => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        if (/^([a-zA-Z0-9_.-]+(\([^)]+\))?|[A-Z]:\\[^>]*)[>#]\s*$/i.test(trimmed)) return true;
        if (/^\(?(örnek|ornek|example|mod|mode|prompt)\s*:\s*[a-zA-Z0-9_.-]+(\([^)]+\))?[>#]\)?\s*$/i.test(trimmed)) return true;
        return false;
      };
      const contentLines = rawLines.filter(l => !isPromptOrModeLine(l));
      const targetLine = contentLines.length > 0 ? contentLines[0] : (rawLines[0] || '');

      // Check if targetLine contains a quoted command like "ipconfig" or "show ip int brief"
      const quoteMatch = targetLine.match(/["'“”`]([^"'“”`]+)["'“”`]/);
      if (quoteMatch && quoteMatch[1].trim()) {
        cleanCommand = quoteMatch[1].trim();
      } else {
        cleanCommand = targetLine;
      }

      // Clean device prefixes (e.g. "switch-1: ...") and prompt prefixes (e.g. "Switch# ", "Switch(config)# ", "Switch> ")
      cleanCommand = cleanCommand
        .replace(/^[^:]{1,40}:\s*/i, '')
        .replace(/^PC\d*\s+CMD\s*>\s*/i, '')
        .replace(/^[a-zA-Z0-9_.-]+(\([^)]+\))?[>#]\s*/, '')
        .replace(/^(type|yazın|yazin|run|enter)\s+/i, '')
        .replace(/\s+(yazın|yazin|yazınız|yaziniz)\.?$/i, '')
        .replace(/\s+(and press enter|press enter|yazıp enter'a basın|yazip enter'a basin|yazıp enter tuşuna basın)\.?$/i, '')
        .replace(/^["'“”`]+|["'“”`.,!?]+$/g, '')
        .trim();

      if (!cleanCommand && commandPattern) {
        cleanCommand = String(commandPattern).split('|')[0].replace(/[\^$()]/g, '').trim();
      }

      // Resolve device object from topology
      let targetDevice = null;

      // 1. If explicit deviceId was passed or matched:
      if (deviceId) {
        targetDevice = topologyDevices.find(
          d => d.id === deviceId || d.id.toLowerCase() === deviceId.toLowerCase() || d.name.toLowerCase() === deviceId.toLowerCase()
        );
      }

      // 2. If deviceType was explicitly provided ('switch', 'router', 'pc'):
      if (!targetDevice && deviceType) {
        if (deviceType === 'switch') {
          targetDevice = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3');
        } else if (deviceType === 'router') {
          targetDevice = topologyDevices.find(d => d.type === 'router');
        } else if (deviceType === 'pc') {
          targetDevice = topologyDevices.find(d => d.type === 'pc');
        }
      }

      // 3. Fallback heuristics if neither resolved a device:
      if (!targetDevice) {
        if (
          (stepId && (String(stepId).includes('pc') || String(stepId).startsWith('run-') || String(stepId).startsWith('pc-'))) ||
          cleanCommand.startsWith('ipconfig') ||
          cleanCommand.startsWith('tracert') ||
          cleanCommand.startsWith('cls') ||
          cleanCommand.startsWith('nslookup')
        ) {
          targetDevice = topologyDevices.find(d => d.type === 'pc');
        } else if (
          stepId && (String(stepId).includes('router') || String(stepId).startsWith('r-') || String(stepId).includes('route'))
        ) {
          targetDevice = topologyDevices.find(d => d.type === 'router');
        } else if (
          stepId && (String(stepId).includes('switch') || String(stepId).startsWith('sw-') || String(stepId).includes('vlan') || String(stepId).includes('stp'))
        ) {
          targetDevice = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3');
        } else {
          const hintStr = rawStr.toLowerCase();
          if (hintStr.includes('s-lab') || hintStr.includes('sw-') || hintStr.includes('switch')) {
            targetDevice = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3');
          } else if (hintStr.includes('r-lab') || hintStr.includes('router')) {
            targetDevice = topologyDevices.find(d => d.type === 'router');
          } else if (hintStr.includes('pc-') || hintStr.includes('pc')) {
            targetDevice = topologyDevices.find(d => d.type === 'pc');
          } else {
            targetDevice = topologyDevices.find(d => d.type === 'switchL2' || d.type === 'switchL3' || d.type === 'router') || topologyDevices.find(d => d.type === 'pc');
          }
        }
      }

      if (targetDevice && cleanCommand) {
        const resolvedId = targetDevice.id;
        // "Show Me" must focus the lesson target exclusively. Remove all
        // previously open floating device windows before presenting it.
        useMultiWindowStore.getState().closeAllDeviceWindows();
        if (targetDevice.type === 'pc') {
          setShowPCDeviceId(resolvedId);
          setPcPanelInitialTab('desktop');
          if (window.innerWidth >= 641 && window.innerWidth <= 1024) {
            setShowPCPanel(true);
          } else {
            useMultiWindowStore.getState().openDeviceWindow(resolvedId, 'pc', 'desktop');
          }
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('pc-auto-type', { detail: { deviceId: resolvedId, command: cleanCommand } }));
          }, 600);
        } else {
          setActiveDeviceId(resolvedId);
          setActiveDeviceType(targetDevice.type);
          setUnifiedDeviceActiveTab('console');
          setShowUnifiedDeviceModal(true);
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('terminal-auto-type', { detail: { deviceId: resolvedId, command: cleanCommand } }));
          }, 600);
        }
      }
    };

    const handleOpenDeviceCli = (e: Event) => {
      const customEv = e as CustomEvent<{ deviceId: string }>;
      const deviceId = customEv.detail?.deviceId;
      if (!deviceId) return;
      const device = topologyDevices.find(d => d.id === deviceId);
      if (!device) return;

      const { openDeviceWindow, restoreWindow } = useMultiWindowStore.getState();

      if (device.type === 'pc') {
        setShowPCDeviceId(deviceId);
        setPcPanelInitialTab('desktop');
        if (window.innerWidth >= 641 && window.innerWidth <= 1024) {
          setShowPCPanel(true);
        } else {
          openDeviceWindow(deviceId, 'pc', 'desktop');
        }
      } else {
        setActiveDeviceId(deviceId);
        setActiveDeviceType(device.type);
        setUnifiedDeviceActiveTab('console');
        openDeviceWindow(deviceId, device.type, 'console');
      }

      restoreWindow(deviceId);
    };

    window.addEventListener('request-show-me', handleShowMe);
    window.addEventListener('open-device-cli', handleOpenDeviceCli);
    return () => {
      window.removeEventListener('request-show-me', handleShowMe);
      window.removeEventListener('open-device-cli', handleOpenDeviceCli);
    };
  }, [
    topologyDevices, setActiveDeviceId, setActiveDeviceType,
    setShowUnifiedDeviceModal, setActiveTab, setShowPCDeviceId,
    setPcPanelInitialTab, setShowPCPanel, setUnifiedDeviceActiveTab
  ]);
}


