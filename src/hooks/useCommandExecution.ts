import { useCallback } from 'react';
import type { SwitchState, CommandResult } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { TabType } from '@/app/page.types';

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

function mapDeviceAccessedType(deviceType?: DeviceType | string | null): 'switch' | 'router' | 'pc' | null {
  if (!deviceType) return null;
  if (deviceType === 'switchL2' || deviceType === 'switchL3' || deviceType === 'switch') return 'switch';
  if (deviceType === 'router') return 'router';
  if (deviceType === 'pc') return 'pc';
  return null;
}

export interface UseCommandExecutionParams {
  activeDeviceId: string;
  activeDeviceType: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  state: SwitchState;
  isGuidedModeActive: boolean;
  showUnifiedDeviceModal: boolean;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: DeviceType) => void;
  setActiveTab: (tab: TabType) => void;
  setLastCommand: (command: string) => void;
  setLastOutput: (output: string) => void;
  commitAction: (desc: string) => void;
  checkStepCompletionWithContext: (context: GuidedModeContext) => void;
  handleCommandForDevice: (
    deviceId: string,
    command: string,
    devices: CanvasDevice[],
    setActiveId: (id: string) => void,
    setActiveType: (type: DeviceType) => void,
    connections: CanvasConnection[]
  ) => Promise<unknown>;
}

export function useCommandExecution({
  activeDeviceId,
  activeDeviceType,
  topologyDevices,
  topologyConnections,
  deviceStates,
  state,
  isGuidedModeActive,
  showUnifiedDeviceModal,
  setActiveDeviceId,
  setActiveDeviceType,
  setActiveTab,
  setLastCommand,
  setLastOutput,
  commitAction,
  checkStepCompletionWithContext,
  handleCommandForDevice
}: UseCommandExecutionParams) {

  const handleCommand = useCallback(async (command: string) => {
    const result = await handleCommandForDevice(
      activeDeviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    ) as CommandResult;

    const currentOutput = (result && typeof result === 'object')
      ? String(result.output || result.error || '')
      : '';

    setLastCommand(command);
    setLastOutput(currentOutput);

    if (command && command.trim() !== '') {
      const deviceName = topologyDevices?.find(d => d.id === activeDeviceId)?.name || activeDeviceId;
      commitAction(`${deviceName} CLI: ${command}`);
    }

    // Immediate check for guided mode progress
    if (isGuidedModeActive) {
      const currentDeviceState = result && result.newState ? { ...state, ...result.newState } : state;
      let finalDeviceStates = result.deviceStates || result.updatedDeviceStates || deviceStates;

      // If we have a local state change but not a full deviceStates map from the result,
      // merge the local change into a fresh map for validation.
      if (result?.newState && !result.deviceStates && !result.updatedDeviceStates) {
        finalDeviceStates = new Map(deviceStates);
        finalDeviceStates.set(activeDeviceId, { ...state, ...result.newState } as SwitchState);
      }

      checkStepCompletionWithContext({
        lastCommand: command,
        lastOutput: currentOutput,
        deviceAccessed: showUnifiedDeviceModal ? mapDeviceAccessedType(activeDeviceType) : null,
        deviceAccessedId: showUnifiedDeviceModal ? activeDeviceId : null,
        deviceState: currentDeviceState,
        deviceStates: finalDeviceStates,
        topologyConnections: topologyConnections,
        topologyDevices: topologyDevices
      });
    }

    if (result?.exitSession) {
      setActiveTab('topology');
    }
    return result;
  }, [
    activeDeviceId, handleCommandForDevice, topologyDevices, topologyConnections,
    setActiveDeviceId, setActiveDeviceType, setActiveTab, setLastCommand, setLastOutput,
    commitAction, isGuidedModeActive, checkStepCompletionWithContext, showUnifiedDeviceModal,
    activeDeviceType, state, deviceStates
  ]);

  const handleExecuteCommand = useCallback(async (deviceId: string, command: string) => {
    const result = await handleCommandForDevice(
      deviceId,
      command,
      topologyDevices,
      setActiveDeviceId,
      setActiveDeviceType,
      topologyConnections
    ) as CommandResult;

    const currentOutput = (result && typeof result === 'object')
      ? String(result.output || result.error || '')
      : '';

    setLastCommand(command);
    setLastOutput(currentOutput);

    if (command && command.trim() !== '') {
      const deviceName = topologyDevices?.find(d => d.id === deviceId)?.name || deviceId;
      commitAction(`${deviceName} CLI: ${command}`);
    }

    // Immediate check for guided mode progress
    if (isGuidedModeActive) {
      const deviceObj = topologyDevices?.find(d => d.id === deviceId);
      const devType = deviceObj?.type;
      const currentState = deviceStates.get(deviceId);
      const currentDeviceState = result && result.newState ? { ...currentState, ...result.newState } : currentState;

      if (!currentDeviceState) return result;

      let finalDeviceStates = result.deviceStates || result.updatedDeviceStates || deviceStates;
      if (result?.newState && !result.deviceStates && !result.updatedDeviceStates) {
        finalDeviceStates = new Map(deviceStates);
        finalDeviceStates.set(deviceId, { ...currentState, ...result.newState } as SwitchState);
      }

      checkStepCompletionWithContext({
        lastCommand: command,
        lastOutput: currentOutput,
        deviceAccessed: mapDeviceAccessedType(devType),
        deviceAccessedId: deviceId,
        deviceState: currentDeviceState,
        deviceStates: finalDeviceStates,
        topologyConnections: topologyConnections,
        topologyDevices: topologyDevices
      });
    }

    return result;
  }, [
    handleCommandForDevice, topologyDevices, topologyConnections, setActiveDeviceId,
    setActiveDeviceType, setLastCommand, setLastOutput, commitAction,
    isGuidedModeActive, checkStepCompletionWithContext, deviceStates
  ]);

  return { handleCommand, handleExecuteCommand };
}



