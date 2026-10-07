import { useCallback } from 'react';
import type { CanvasDevice, CanvasConnection, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';

type DeviceSelector = (device: DeviceType, deviceId?: string, switchModel?: string, deviceName?: string, isNew?: boolean, deviceData?: CanvasDevice) => void;
type GuidedCheck = (context: { deviceAccessed: 'switch' | 'router' | 'pc' | null; deviceAccessedId: string; deviceStates: Map<string, unknown>; topologyConnections: CanvasConnection[]; topologyDevices: CanvasDevice[] }) => void;

interface PageTopologyCallbackOptions {
  selectFromCanvas: DeviceSelector;
  selectFromMenu: DeviceSelector;
  restoreSelectedWindow?: (deviceId: string) => void;
  closeUnified: (value: boolean) => void;
  closeRouter: (value: boolean) => void;
  closeFirewall: (value: boolean) => void;
  closePC: (value: boolean) => void;
  setActiveDeviceId: (id: string) => void;
  checkStepCompletion: GuidedCheck;
  deviceStates: Map<string, unknown>;
  topologyConnections: CanvasConnection[];
  topologyDevices: CanvasDevice[];
}

function getAccessedType(device: DeviceType): 'switch' | 'router' | 'pc' | null {
  if (device === 'switchL2' || device === 'switchL3') return 'switch';
  if (device === 'router') return 'router';
  if (device === 'pc') return 'pc';
  return null;
}

export function usePageTopologyCallbacks(options: PageTopologyCallbackOptions) {
  const { selectFromCanvas, selectFromMenu, restoreSelectedWindow, checkStepCompletion, deviceStates, topologyConnections, topologyDevices } = options;

  const handleDeviceSelectFromCanvas = useCallback<DeviceSelector>((device, deviceId, switchModel, deviceName, isNew, deviceData) => {
    selectFromCanvas(device, deviceId, switchModel, deviceName, isNew, deviceData);
    if (deviceId) checkStepCompletion({ deviceAccessed: getAccessedType(device), deviceAccessedId: deviceId, deviceStates, topologyConnections, topologyDevices });
  }, [selectFromCanvas, checkStepCompletion, deviceStates, topologyConnections, topologyDevices]);

  const handleDeviceSelectFromMenu = useCallback<DeviceSelector>((device, deviceId, switchModel, deviceName) => {
    selectFromMenu(device, deviceId, switchModel, deviceName);
    if (deviceId) restoreSelectedWindow?.(deviceId);
    if (deviceId) checkStepCompletion({ deviceAccessed: getAccessedType(device), deviceAccessedId: deviceId, deviceStates, topologyConnections, topologyDevices });
  }, [selectFromMenu, restoreSelectedWindow, checkStepCompletion, deviceStates, topologyConnections, topologyDevices]);

  return { handleDeviceSelectFromCanvas, handleDeviceSelectFromMenu };
}


