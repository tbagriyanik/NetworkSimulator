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

export function validateTopologyCheckpoint(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'JSON verisi geçerli bir nesne değil.' };
  }

  const obj = data as Record<string, unknown>;

  // Must contain devices array
  if (!('devices' in obj) || !Array.isArray(obj.devices)) {
    return { valid: false, error: 'Topoloji verisinde "devices" dizisi bulunamadı.' };
  }

  // Validate devices structure if not empty
  for (let i = 0; i < obj.devices.length; i++) {
    const dev = obj.devices[i];
    if (!dev || typeof dev !== 'object' || Array.isArray(dev)) {
      return { valid: false, error: `Cihaz #${i + 1} geçerli bir nesne değil.` };
    }
    const dObj = dev as Record<string, unknown>;
    if (typeof dObj.id !== 'string' || !dObj.id) {
      return { valid: false, error: `Cihaz #${i + 1} için zorunlu "id" alanı eksik veya geçersiz.` };
    }
    if (typeof dObj.name !== 'string' || !dObj.name) {
      return { valid: false, error: `Cihaz "${dObj.id}" için zorunlu "name" alanı eksik veya geçersiz.` };
    }
    if (typeof dObj.type !== 'string' || !dObj.type) {
      return { valid: false, error: `Cihaz "${dObj.id}" için zorunlu "type" alanı eksik veya geçersiz.` };
    }
  }

  // Validate connections structure if provided
  if ('connections' in obj && obj.connections !== undefined) {
    if (!Array.isArray(obj.connections)) {
      return { valid: false, error: '"connections" alanı dizi türünde olmalıdır.' };
    }
    for (let i = 0; i < obj.connections.length; i++) {
      const conn = obj.connections[i];
      if (!conn || typeof conn !== 'object' || Array.isArray(conn)) {
        return { valid: false, error: `Bağlantı #${i + 1} geçerli bir nesne değil.` };
      }
      const cObj = conn as Record<string, unknown>;
      if (typeof cObj.id !== 'string' || typeof cObj.sourceDeviceId !== 'string' || typeof cObj.targetDeviceId !== 'string') {
        return { valid: false, error: `Bağlantı #${i + 1} eksik veya geçersiz kaynak/hedef cihaz bilgilerine sahip.` };
      }
    }
  }

  return { valid: true };
}

export function deleteCheckpointFromList(
  checkpoints: TopologyCheckpoint[],
  checkpointId: string
): TopologyCheckpoint[] {
  const updated = checkpoints.filter((c) => c.id !== checkpointId);
  saveCheckpointsToStorage(updated);
  return updated;
}

