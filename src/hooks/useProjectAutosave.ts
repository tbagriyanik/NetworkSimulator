import { useEffect, useRef } from 'react';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { TerminalOutput } from '@/components/network/Terminal';
import type { TabType } from '@/app/page.types';
import { safeStringify } from '@/lib/network/serialization';

export interface UseProjectAutosaveParams {
  isAppLoading: boolean;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  topologyNotes: CanvasNote[];
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, unknown[]>;
  pcHistories: Map<string, string[]>;
  cableInfo: CableInfo;
  activeDeviceId: string;
  activeDeviceType: string;
  activeTab: TabType;
  zoom: number;
  pan: { x: number; y: number };
  setLastSaveTime: (time: string) => void;
  setHasUnsavedChanges: (hasUnsaved: boolean) => void;
}

export function useProjectAutosave({
  isAppLoading,
  topologyDevices,
  topologyConnections,
  topologyNotes,
  deviceStates,
  deviceOutputs,
  pcOutputs,
  pcHistories,
  cableInfo,
  activeDeviceId,
  activeDeviceType,
  activeTab,
  zoom,
  pan,
  setLastSaveTime,
  setHasUnsavedChanges
}: UseProjectAutosaveParams) {
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAppLoading) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      // Get PC and IoT device IDs to filter them out from deviceStates
      // These device types don't need full SwitchState with 24 ports
      const excludedDeviceIds = new Set(
        topologyDevices.filter(d => d.type === 'pc' || d.type === 'iot').map(d => d.id)
      );

      const projectData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        // Filter out PC/IoT device states - they don't need SwitchState with ports
        devices: Array.from(deviceStates.entries())
          .filter(([id]) => !excludedDeviceIds.has(id))
          .map(([id, state]) => ({ id, state })),
        // Filter out entries with empty/invalid IDs
        deviceOutputs: Array.from(deviceOutputs.entries())
          .filter(([id]) => id && id.trim() !== '')
          .map(([id, outputs]) => ({ id, outputs })),
        pcOutputs: Array.from(pcOutputs.entries())
          .filter(([id]) => id && id.trim() !== '')
          .map(([id, outputs]) => ({ id, outputs })),
        pcHistories: Array.from(pcHistories.entries())
          .filter(([id]) => id && id.trim() !== '')
          .map(([id, history]) => ({ id, history })),
        topology: {
          // Filter out devices with empty/invalid IDs
          devices: topologyDevices.filter(d => d.id && d.id.trim() !== ''),
          connections: topologyConnections,
          notes: topologyNotes,
          zoom,
          pan,
        },
        // Reset cableInfo if no valid devices exist
        cableInfo: topologyDevices.length > 0 ? cableInfo : { connected: false, cableType: 'straight', sourceDevice: 'pc', targetDevice: 'switchL2' },
        activeDeviceId: topologyDevices.find(d => d.id === activeDeviceId)?.id || '',
        activeDeviceType,
        activeTab
      };

      try { localStorage.setItem('netsim_autosave', safeStringify(projectData)); } catch { /* storage unavailable */ }
      autosaveTimerRef.current = null;
      setLastSaveTime(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
    }, 800);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    deviceStates, deviceOutputs, pcOutputs, pcHistories,
    topologyDevices, topologyConnections, topologyNotes,
    cableInfo, activeDeviceId, activeDeviceType, activeTab,
    isAppLoading, zoom, pan, setLastSaveTime, setHasUnsavedChanges
  ]);
}


