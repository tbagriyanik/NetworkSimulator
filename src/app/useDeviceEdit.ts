'use client';

import { useCallback } from 'react';
import type { DeviceType, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';

export function useDeviceEdit({ topologyDevices, setActiveDeviceId, setActiveDeviceType, setShowPCDeviceId, setPcPanelInitialTab, setUnifiedDeviceActiveTab, setDeviceStates, setPcHistories, getOrCreatePCOutputs, getOrCreateDeviceState, getOrCreateDeviceOutputs }: {
  topologyDevices: CanvasDevice[]; setActiveDeviceId: (id: string) => void; setActiveDeviceType: (type: DeviceType) => void;
  setShowPCDeviceId: (id: string) => void; setPcPanelInitialTab: (tab: any) => void; setUnifiedDeviceActiveTab: (tab: any) => void;
  setDeviceStates: React.Dispatch<React.SetStateAction<Map<string, SwitchState>>>; setPcHistories: React.Dispatch<React.SetStateAction<Map<string, string[]>>>;
  getOrCreatePCOutputs: (id: string, devices?: CanvasDevice[]) => unknown; getOrCreateDeviceState: (...args: any[]) => SwitchState; getOrCreateDeviceOutputs: (...args: any[]) => unknown;
}) {
  const handleDeviceDoubleClick = useCallback((device: DeviceType, deviceId: string) => {
    const { openDeviceWindow, restoreWindow } = useMultiWindowStore.getState();
    if (device === 'pc') {
      setShowPCDeviceId(deviceId); getOrCreatePCOutputs(deviceId, topologyDevices); setPcPanelInitialTab('home'); openDeviceWindow(deviceId, 'pc', 'home');
    } else {
      const deviceObj = topologyDevices.find((item) => item.id === deviceId);
      const deviceState = getOrCreateDeviceState(deviceId, device, deviceObj?.name, deviceObj?.macAddress, deviceObj?.switchModel, deviceObj?.services);
      getOrCreateDeviceOutputs(deviceId, deviceState); setActiveDeviceId(deviceId); setActiveDeviceType(device); setUnifiedDeviceActiveTab('console'); openDeviceWindow(deviceId, device, 'console');
    }
    restoreWindow(deviceId); useWindowStore.getState().setActiveWindow(deviceId);
  }, [getOrCreateDeviceOutputs, getOrCreateDeviceState, getOrCreatePCOutputs, setActiveDeviceId, setActiveDeviceType, setPcPanelInitialTab, setShowPCDeviceId, setUnifiedDeviceActiveTab, topologyDevices]);

  const handleDeviceRename = useCallback((deviceId: string, newName: string) => {
    setDeviceStates((previous) => { const state = previous.get(deviceId); if (!state) return previous; const updated = { ...state, hostname: newName }; updated.runningConfig = buildRunningConfig(updated); return new Map(previous).set(deviceId, updated); });
  }, [setDeviceStates]);
  const handleUpdateHistory = useCallback((deviceId: string, history: string[]) => setDeviceStates((previous) => { const state = previous.get(deviceId); return state ? new Map(previous).set(deviceId, { ...state, commandHistory: history }) : previous; }), [setDeviceStates]);
  const handleUpdatePCHistory = useCallback((deviceId: string, history: string[]) => setPcHistories((previous) => new Map(previous).set(deviceId, history)), [setPcHistories]);
  return { handleDeviceDoubleClick, handleDeviceRename, handleUpdateHistory, handleUpdatePCHistory };
}
