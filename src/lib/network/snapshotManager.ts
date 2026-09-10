import type { CanvasDevice, CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface TopologyCheckpoint {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  deviceCount: number;
  connectionCount: number;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  notes: CanvasNote[];
  deviceStates: Record<string, SwitchState>;
}

const STORAGE_KEY = 'network_simulator_checkpoints_v1';

export function createCheckpoint(
  name: string,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  notes: CanvasNote[] = [],
  deviceStates: Record<string, SwitchState> = {},
  description?: string
): TopologyCheckpoint {
  return {
    id: `checkpoint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || `Checkpoint ${new Date().toLocaleTimeString()}`,
    description: description?.trim(),
    createdAt: Date.now(),
    deviceCount: devices.length,
    connectionCount: connections.length,
    devices: structuredClone(devices),
    connections: structuredClone(connections),
    notes: structuredClone(notes),
    deviceStates: structuredClone(deviceStates),
  };
}

export function saveCheckpointsToStorage(checkpoints: TopologyCheckpoint[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checkpoints));
    return true;
  } catch (err) {
    console.warn('Failed to persist checkpoints to storage:', err);
    return false;
  }
}

export function loadCheckpointsFromStorage(): TopologyCheckpoint[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load checkpoints from storage:', err);
    return [];
  }
}

export function deleteCheckpointFromList(
  checkpoints: TopologyCheckpoint[],
  checkpointId: string
): TopologyCheckpoint[] {
  const updated = checkpoints.filter((c) => c.id !== checkpointId);
  saveCheckpointsToStorage(updated);
  return updated;
}
