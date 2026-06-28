import { expect, test, describe } from 'vitest';
import { checkConnectivity } from '@/lib/network/connectivity';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';

describe('Packet Capture Backend', () => {
  const devices: CanvasDevice[] = [
    {
      id: 'pc-1',
      type: 'pc',
      name: 'PC-1',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      gateway: '192.168.1.1',
      macAddress: '00:00:00:00:00:01',
      x: 0, y: 0, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }]
    },
    {
      id: 'pc-2',
      type: 'pc',
      name: 'PC-2',
      ip: '192.168.1.20',
      subnet: '255.255.255.0',
      gateway: '192.168.1.1',
      macAddress: '00:00:00:00:00:02',
      x: 100, y: 100, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }]
    }
  ];

  const connections: CanvasConnection[] = [
    {
      id: 'conn-1',
      sourceDeviceId: 'pc-1',
      sourcePort: 'eth0',
      targetDeviceId: 'pc-2',
      targetPort: 'eth0',
      cableType: 'crossover', // PC to PC needs crossover
      active: true
    }
  ];

  const deviceStates = new Map<string, SwitchState>();
  deviceStates.set('pc-1', {
    hostname: 'PC-1',
    macAddress: '00:00:00:00:00:01',
    ports: {
      'eth0': { id: 'eth0', label: 'Eth0', status: 'connected', shutdown: false }
    },
    arpCache: []
  } as unknown as SwitchState);
  deviceStates.set('pc-2', {
    hostname: 'PC-2',
    macAddress: '00:00:00:00:00:02',
    ports: {
      'eth0': { id: 'eth0', label: 'Eth0', status: 'connected', shutdown: false }
    },
    arpCache: []
  } as unknown as SwitchState);

  test('captures ICMP and ARP packets between two PCs', () => {
    const result = checkConnectivity(
      'pc-1',
      '192.168.1.20',
      devices,
      connections,
      deviceStates,
      'en',
      { protocol: 'icmp' }
    );

    // Connectivity error handled via the success check below

    expect(result.success).toBe(true);
    expect(result.capturedPackets).toBeDefined();
    expect(result.capturedPackets?.length).toBeGreaterThan(0);

    // Should have ARP if no MAC known (simulated)
    const hasArp = result.capturedPackets?.some(p => p.protocol === 'ARP');
    const hasIcmp = result.capturedPackets?.some(p => p.protocol === 'ICMP');

    expect(hasArp).toBe(true);
    expect(hasIcmp).toBe(true);

    // Verify packet fields
    const icmpPacket = result.capturedPackets?.find(p => p.protocol === 'ICMP');
    expect(icmpPacket?.sourceIp).toBe('192.168.1.10');
    expect(icmpPacket?.targetIp).toBe('192.168.1.20');
    expect(icmpPacket?.connectionId).toBe('conn-1');
  });

  test('does not capture packets if connection is inactive', () => {
    const inactiveConnections = connections.map(c => ({ ...c, active: false }));
    const result = checkConnectivity(
      'pc-1',
      '192.168.1.20',
      devices,
      inactiveConnections,
      deviceStates,
      'en',
      { protocol: 'icmp' }
    );

    expect(result.success).toBe(false);
    expect(result.capturedPackets || []).toHaveLength(0);
  });
});
