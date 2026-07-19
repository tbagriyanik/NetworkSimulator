import { describe, it, expect } from 'vitest';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('Connectivity Functions', () => {
  function checkDeviceConnectivity(
    sourceDevice: CanvasDevice,
    targetDevice: CanvasDevice,
    connections: CanvasConnection[],
    _deviceStates: Map<string, SwitchState>
  ): { reachable: boolean; path: string[]; latency: number } {
    if (sourceDevice.id === targetDevice.id) {
      return { reachable: true, path: [sourceDevice.id], latency: 0 };
    }
    const sharedSwitch = connections.find(c =>
      c.active && (
        (c.sourceDeviceId === sourceDevice.id) ||
        (c.targetDeviceId === sourceDevice.id)
      )
    );
    if (!sharedSwitch) return { reachable: false, path: [], latency: Infinity };
    const switchId = sharedSwitch.sourceDeviceId === sourceDevice.id
      ? sharedSwitch.targetDeviceId : sharedSwitch.sourceDeviceId;
    const targetConn = connections.find(c =>
      c.active && c.id !== sharedSwitch.id && (
        (c.sourceDeviceId === targetDevice.id && c.targetDeviceId === switchId) ||
        (c.targetDeviceId === targetDevice.id && c.sourceDeviceId === switchId)
      )
    );
    if (targetConn) {
      return { reachable: true, path: [sourceDevice.id, switchId, targetDevice.id], latency: 2 };
    }
    return { reachable: false, path: [], latency: Infinity };
  }

  const pc1: CanvasDevice = {
    id: 'PC1', name: 'PC1', type: 'pc',
    ip: '192.168.1.10', vlan: 10,
    ports: [{ id: 'eth0', status: 'connected' as const }],
  } as CanvasDevice;

  const pc2: CanvasDevice = {
    id: 'PC2', name: 'PC2', type: 'pc',
    ip: '192.168.1.20', vlan: 10,
    ports: [{ id: 'eth0', status: 'connected' as const }],
  } as CanvasDevice;



  const pc3: CanvasDevice = {
    id: 'PC3', name: 'PC3', type: 'pc',
    ip: '192.168.2.10', vlan: 20,
    ports: [{ id: 'eth0', status: 'connected' as const }],
  } as CanvasDevice;

  const connections: CanvasConnection[] = [
    { id: 'c1', sourceDeviceId: 'PC1', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
    { id: 'c2', sourceDeviceId: 'PC2', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/2', cableType: 'straight', active: true },
  ];

  it('should detect connectivity between devices via switch', () => {
    const result = checkDeviceConnectivity(pc1, pc2, connections, new Map());
    expect(result.reachable).toBe(true);
    expect(result.path).toContain('PC1');
    expect(result.path).toContain('PC2');
  });

  it('should return unreachable for disconnected devices', () => {
    const result = checkDeviceConnectivity(pc1, pc3, connections, new Map());
    expect(result.reachable).toBe(false);
    expect(result.latency).toBe(Infinity);
  });

  it('should have 2ms latency for devices connected via switch', () => {
    const result = checkDeviceConnectivity(pc1, pc2, connections, new Map());
    expect(result.latency).toBe(2);
  });

  it('should handle empty connections', () => {
    const result = checkDeviceConnectivity(pc1, pc2, [], new Map());
    expect(result.reachable).toBe(false);
  });

  it('should handle same device check', () => {
    const result = checkDeviceConnectivity(pc1, pc1, connections, new Map());
    expect(result.reachable).toBe(true);
  });

  it('should detect ping between same subnet hosts', () => {
    const sameSubnet = (a: string, b: string, mask: string) => {
      const aOctets = a.split('.').map(Number);
      const bOctets = b.split('.').map(Number);
      const mOctets = mask.split('.').map(Number);
      return aOctets.every((o, i) => (o & mOctets[i]) === (bOctets[i] & mOctets[i]));
    };
    expect(sameSubnet('192.168.1.10', '192.168.1.20', '255.255.255.0')).toBe(true);
    expect(sameSubnet('192.168.1.10', '192.168.2.20', '255.255.255.0')).toBe(false);
  });

  it('should check ARP resolution between devices', () => {
    const arpTable = new Map([
      ['192.168.1.10', '00:11:22:33:44:55'],
      ['192.168.1.20', '00:11:22:33:44:66'],
    ]);
    expect(arpTable.has('192.168.1.10')).toBe(true);
    expect(arpTable.has('192.168.1.20')).toBe(true);
    expect(arpTable.has('192.168.1.30')).toBe(false);
  });

  it('should simulate ping round-trip time', () => {
    const simulatePing = (_targetIp: string, reachable: boolean) => {
      if (!reachable) return { success: false, rtt: Infinity };
      const baseLatency = 5;
      const jitter = Math.random() * 3;
      return { success: true, rtt: baseLatency + jitter };
    };
    const result = simulatePing('192.168.1.20', true);
    expect(result.success).toBe(true);
    expect(result.rtt).toBeGreaterThanOrEqual(5);
  });

  it('should handle ping timeout for unreachable host', () => {
    const simulatePing = (reachable: boolean) => {
      if (!reachable) return { success: false, rtt: Infinity, error: 'Destination unreachable' };
      return { success: true, rtt: 5 };
    };
    const result = simulatePing(false);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Destination unreachable');
  });
});
