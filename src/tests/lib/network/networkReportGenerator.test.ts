import { describe, it, expect } from 'vitest';
import { generateNetworkReport } from '../../../lib/network/networkReportGenerator';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '../../../lib/network/types';

describe('networkReportGenerator', () => {
  it('generates a clean network report markdown document', () => {
    const devices: CanvasDevice[] = [
      { id: 'r1', name: 'Router-1', type: 'router', x: 100, y: 100, status: 'online', ports: [], ip: '192.168.1.1' },
      { id: 'sw1', name: 'Switch-1', type: 'switchL2', x: 200, y: 200, status: 'online', ports: [], ip: '0.0.0.0' },
      { id: 'pc1', name: 'PC-1', type: 'pc', x: 300, y: 300, status: 'online', ports: [], ip: '192.168.1.10' }
    ];

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'r1', sourcePort: 'Gi0/0', targetDeviceId: 'sw1', targetPort: 'Gi0/1', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'sw1', sourcePort: 'Fa0/1', targetDeviceId: 'pc1', targetPort: 'Eth0', cableType: 'straight', active: true }
    ];

    const deviceStates = new Map<string, SwitchState>();
    deviceStates.set('r1', {
      hostname: 'Router-1',
      macAddress: '0000.0000.0001',
      switchModel: 'router-standard',
      switchLayer: 3,
      bootTime: Date.now(),
      ports: {
        'Gi0/0': {
          id: 'Gi0/0',
          name: 'GigabitEthernet0/0',
          type: 'gigabitethernet',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          ipAddress: '192.168.1.1',
          subnetMask: '255.255.255.0'
        }
      },
      staticRoutes: [
        { destination: '10.0.0.0', network: '10.0.0.0', mask: '255.0.0.0', nextHop: '192.168.1.254', metric: 1, type: 'static' }
      ]
    } as unknown as SwitchState);

    deviceStates.set('sw1', {
      hostname: 'Switch-1',
      macAddress: '0000.0000.0002',
      switchModel: '2960-24tt',
      switchLayer: 2,
      bootTime: Date.now(),
      vlans: {
        '10': { id: 10, name: 'VLAN0010', ports: ['Fa0/1'], status: 'active' }
      },
      ports: {
        'Fa0/1': {
          id: 'Fa0/1',
          name: 'FastEthernet0/1',
          type: 'fastethernet',
          status: 'connected',
          mode: 'access',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          vlan: 10
        }
      }
    } as unknown as SwitchState);

    const report = generateNetworkReport(devices, connections, deviceStates, { title: 'Test Ağ Raporu' });

    expect(report).toContain('# Test Ağ Raporu');
    expect(report).toContain('Router-1');
    expect(report).toContain('192.168.1.1');
    expect(report).toContain('VLAN 10');
    expect(report).toContain('10.0.0.0/255.0.0.0');
  });
});
