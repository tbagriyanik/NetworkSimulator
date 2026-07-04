import { describe, it, expect, beforeEach } from 'vitest';
import { SwitchState } from '../../../lib/network/types';
import { calculatePVST } from '../../../lib/network/stp';
import { CanvasConnection } from '@/components/network/networkTopology.types';

describe('STP Realistic BPDU Convergence', () => {
  let deviceStates: Map<string, SwitchState>;
  let connections: CanvasConnection[];

  beforeEach(() => {
    deviceStates = new Map();
    connections = [];
  });

  it('should elect root bridge based on priority and MAC', () => {
    // S1 (32768, 00:11:22:33:44:55) --- S2 (4096, AA:BB:CC:DD:EE:FF)
    const s1: any = {
      id: 's1',
      macAddress: '0011.2233.4455',
      spanningTreePriority: 32768,
      ports: {
        'fa0/1': { id: 'fa0/1', status: 'connected', speed: '100', type: 'fastethernet' }
      },
      vlans: { '1': { id: 1, name: 'default', status: 'active', ports: ['fa0/1'] } }
    };
    const s2: any = {
      id: 's2',
      macAddress: 'aabb.ccdd.eeff',
      spanningTreePriority: 4096,
      ports: {
        'fa0/1': { id: 'fa0/1', status: 'connected', speed: '100', type: 'fastethernet' }
      },
      vlans: { '1': { id: 1, name: 'default', status: 'active', ports: ['fa0/1'] } }
    };

    deviceStates.set('s1', s1);
    deviceStates.set('s2', s2);
    connections.push({ id: 'c1', sourceDeviceId: 's1', sourcePort: 'fa0/1', targetDeviceId: 's2', targetPort: 'fa0/1', cableType: 'straight', active: true });

    const results = calculatePVST(deviceStates, connections);

    const s1State = results.get('s1');
    const s2State = results.get('s2');

    // S2 should be root (lower priority)
    expect(s2State?.ports['fa0/1'].spanningTree?.role).toBe('designated');
    expect(s1State?.ports['fa0/1'].spanningTree?.role).toBe('root');
    expect(s1State?.ports['fa0/1'].spanningTree?.state).toBe('forwarding');
  });

  it('should block a port in a loop', () => {
    // S1 --- S2
    //  |     |
    // S3 --- S4
    // Assume S1 is root. One of the links should be blocked.

    const createSwitch = (id: string, mac: string, prio: number) => ({
      id,
      macAddress: mac,
      spanningTreePriority: prio,
      ports: {
        'fa0/1': { id: 'fa0/1', status: 'connected', speed: '100', type: 'fastethernet' },
        'fa0/2': { id: 'fa0/2', status: 'connected', speed: '100', type: 'fastethernet' }
      },
      vlans: { '1': { id: 1, name: 'default', status: 'active', ports: ['fa0/1', 'fa0/2'] } }
    });

    deviceStates.set('s1', createSwitch('s1', '0000.0000.0001', 4096) as any);
    deviceStates.set('s2', createSwitch('s2', '0000.0000.0002', 32768) as any);
    deviceStates.set('s3', createSwitch('s3', '0000.0000.0003', 32768) as any);
    deviceStates.set('s4', createSwitch('s4', '0000.0000.0004', 32768) as any);

    connections.push(
      { id: 'c1', sourceDeviceId: 's1', sourcePort: 'fa0/1', targetDeviceId: 's2', targetPort: 'fa0/1', active: true, cableType: 'straight' },
      { id: 'c2', sourceDeviceId: 's2', sourcePort: 'fa0/2', targetDeviceId: 's4', targetPort: 'fa0/2', active: true, cableType: 'straight' },
      { id: 'c3', sourceDeviceId: 's4', sourcePort: 'fa0/1', targetDeviceId: 's3', targetPort: 'fa0/1', active: true, cableType: 'straight' },
      { id: 'c4', sourceDeviceId: 's3', sourcePort: 'fa0/2', targetDeviceId: 's1', targetPort: 'fa0/2', active: true, cableType: 'straight' }
    );

    const results = calculatePVST(deviceStates, connections);

    let blockedCount = 0;
    results.forEach(state => {
      Object.values(state.ports).forEach(p => {
        if (p.spanningTree?.state === 'blocking') blockedCount++;
      });
    });

    // In a 4-switch loop, at least one link (2 ports) should be blocked (actually one port per segment if we consider roles)
    // In STP, for each segment one port is designated, and for the whole loop one port becomes alternate (blocking)
    expect(blockedCount).toBeGreaterThan(0);
  });
});
