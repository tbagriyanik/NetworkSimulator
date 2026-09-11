import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCheckpoint,
  saveCheckpointsToStorage,
  loadCheckpointsFromStorage,
  deleteCheckpointFromList,
  validateTopologyCheckpoint,
  TopologyCheckpoint,
} from '@/lib/network/snapshotManager';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('snapshotManager (Topology Checkpoint & Rollback System)', () => {
  const mockDevices: CanvasDevice[] = [
    { id: 'R1', name: 'Router1', type: 'router', x: 100, y: 150, ip: '192.168.1.1', status: 'online', ports: [] },
    { id: 'SW1', name: 'Switch1', type: 'switchL2', x: 200, y: 250, ip: '192.168.1.2', status: 'online', ports: [] },
  ];

  const mockConnections: CanvasConnection[] = [
    {
      id: 'conn-1',
      sourceDeviceId: 'R1',
      sourcePort: 'Gi0/0',
      targetDeviceId: 'SW1',
      targetPort: 'fa0/1',
      cableType: 'straight',
      active: true,
    },
  ];


  beforeEach(() => {
    // Mock localStorage
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
    });
  });

  it('creates an immutable snapshot checkpoint with deep copies', () => {
    const cp = createCheckpoint('Pre-OSPF', mockDevices, mockConnections, [], {}, 'Before running OSPF commands');

    expect(cp.id).toBeDefined();
    expect(cp.name).toBe('Pre-OSPF');
    expect(cp.description).toBe('Before running OSPF commands');
    expect(cp.deviceCount).toBe(2);
    expect(cp.connectionCount).toBe(1);
    expect(cp.devices).toHaveLength(2);
    expect(cp.connections).toHaveLength(1);

    // Verify immutability / deep cloning
    mockDevices[0].x = 999;
    expect(cp.devices[0].x).toBe(100);
  });

  it('persists and retrieves checkpoints from storage', () => {
    const cp1 = createCheckpoint('CP1', mockDevices, mockConnections);
    const cp2 = createCheckpoint('CP2', mockDevices, []);

    const saved = saveCheckpointsToStorage([cp1, cp2]);
    expect(saved).toBe(true);

    const loaded = loadCheckpointsFromStorage();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].name).toBe('CP1');
    expect(loaded[1].name).toBe('CP2');
  });

  it('deletes a checkpoint from the list and saves updated storage', () => {
    const cp1 = createCheckpoint('CP1', mockDevices, mockConnections);
    const cp2 = createCheckpoint('CP2', mockDevices, []);
    const initialList: TopologyCheckpoint[] = [cp1, cp2];

    const updated = deleteCheckpointFromList(initialList, cp1.id);
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(cp2.id);

    const reloaded = loadCheckpointsFromStorage();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].id).toBe(cp2.id);
  });

  describe('validateTopologyCheckpoint', () => {
    it('validates a correct topology object successfully', () => {
      const validObj = {
        name: 'Test Topology',
        devices: [
          { id: 'R1', name: 'Router1', type: 'router' },
        ],
        connections: [
          { id: 'conn-1', sourceDeviceId: 'R1', targetDeviceId: 'SW1' },
        ],
      };
      const res = validateTopologyCheckpoint(validObj);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects non-object or null input', () => {
      expect(validateTopologyCheckpoint(null).valid).toBe(false);
      expect(validateTopologyCheckpoint('invalid json').valid).toBe(false);
      expect(validateTopologyCheckpoint([]).valid).toBe(false);
    });

    it('rejects JSON missing devices array', () => {
      const res = validateTopologyCheckpoint({ name: 'No Devices' });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('devices');
    });

    it('rejects JSON with invalid device structure', () => {
      const res = validateTopologyCheckpoint({
        devices: [{ name: 'Missing ID' }],
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('id');
    });

    it('rejects JSON with invalid connection structure', () => {
      const res = validateTopologyCheckpoint({
        devices: [{ id: 'R1', name: 'Router1', type: 'router' }],
        connections: [{ id: 'c1' }], // missing sourceDeviceId & targetDeviceId
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('kaynak/hedef');
    });
  });
});
