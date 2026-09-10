'use client';

import { useState, useCallback } from 'react';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface TopologySnapshot {
  id: string;
  name: string;
  timestamp: number;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
}

export function useTopologySnapshots(
  currentDevices: CanvasDevice[],
  currentConnections: CanvasConnection[],
  currentDeviceStates: Map<string, SwitchState>,
  onRestoreState?: (devices: CanvasDevice[], connections: CanvasConnection[], states: Map<string, SwitchState>) => void
) {
  const [snapshots, setSnapshots] = useState<TopologySnapshot[]>([]);

  const takeSnapshot = useCallback((customName?: string): TopologySnapshot => {
    const newSnapshot: TopologySnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: customName || `Snapshot ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      devices: JSON.parse(JSON.stringify(currentDevices)),
      connections: JSON.parse(JSON.stringify(currentConnections)),
      deviceStates: new Map(currentDeviceStates),
    };

    setSnapshots((prev) => [newSnapshot, ...prev].slice(0, 10)); // Keep last 10 snapshots
    return newSnapshot;
  }, [currentDevices, currentConnections, currentDeviceStates]);

  const restoreSnapshot = useCallback((id: string): boolean => {
    const snap = snapshots.find((s) => s.id === id);
    if (!snap) return false;

    if (onRestoreState) {
      onRestoreState(
        JSON.parse(JSON.stringify(snap.devices)),
        JSON.parse(JSON.stringify(snap.connections)),
        new Map(snap.deviceStates)
      );
    }
    return true;
  }, [snapshots, onRestoreState]);

  const deleteSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    snapshots,
    takeSnapshot,
    restoreSnapshot,
    deleteSnapshot,
  };
}
