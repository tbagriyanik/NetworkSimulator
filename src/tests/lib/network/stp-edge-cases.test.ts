import { describe, it, expect } from 'vitest';
import { recalculateStp } from '@/lib/network/stp';
import { SwitchState } from '@/lib/network/types';
import { CanvasConnection } from '@/components/network/networkTopology.types';

describe('STP Edge Cases', () => {
  const createMockSwitch = (id: string, mac: string, priority: number = 32768): SwitchState => ({
    hostname: id,
    macAddress: mac,
    switchModel: 'WS-C2960-24TT-L',
    switchLayer: 'L2',
    deviceType: 'switch',
    currentMode: 'user',
    ports: {
      'fa0/1': { id: 'fa0/1', name: 'Fa0/1', status: 'notconnect', vlan: 1, mode: 'access', duplex: 'auto', speed: '100', shutdown: false, type: 'fastethernet' },
      'fa0/2': { id: 'fa0/2', name: 'Fa0/2', status: 'notconnect', vlan: 1, mode: 'access', duplex: 'auto', speed: '100', shutdown: false, type: 'fastethernet' },
      'fa0/3': { id: 'fa0/3', name: 'Fa0/3', status: 'notconnect', vlan: 1, mode: 'access', duplex: 'auto', speed: '100', shutdown: false, type: 'fastethernet' },
    },
    vlans: { 1: { id: 1, name: 'default', status: 'active', ports: ['fa0/1', 'fa0/2', 'fa0/3'] } },
    security: { enableSecretEncrypted: false, servicePasswordEncryption: false, users: [], consoleLine: { login: false, transportInput: [] }, vtyLines: { login: false, transportInput: [] } },
    runningConfig: [],
    commandHistory: [],
    historyIndex: -1,
    version: { nosVersion: '1.0', modelName: 'Mock', serialNumber: 'SN', uptime: '1d' },
    macAddressTable: [],
    arpCache: [],
    bootTime: Date.now(),
    ipRouting: false,
    spanningTreePriority: priority,
  });

  it('should NOT block any ports with a single switch and no connections', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001');
    const deviceStates = new Map<string, SwitchState>([['sw1', sw1]]);
    const connections: CanvasConnection[] = [];

    const updated = recalculateStp(deviceStates, connections);
    const stp = updated.get('sw1')?.stpState?.[1];

    expect(stp).toBeDefined();
    expect(stp?.isRoot).toBe(true);
    if (stp) {
      Object.entries(stp.ports).forEach(([portId, info]) => {
        expect(info.state, `Port ${portId} should be forwarding, got ${info.state}`).toBe('forwarding');
        expect(info.role).not.toBe('alternate');
      });
    }
  });

  it('should NOT block any ports with a single switch connected to PCs only', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001');
    const deviceStates = new Map<string, SwitchState>([['sw1', sw1]]);
    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'pc1', targetPort: 'eth0', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'sw1', sourcePort: 'fa0/2', targetDeviceId: 'pc2', targetPort: 'eth0', cableType: 'straight', active: true },
    ];

    const updated = recalculateStp(deviceStates, connections);
    const stp = updated.get('sw1')?.stpState?.[1];

    expect(stp).toBeDefined();
    if (stp) {
      Object.entries(stp.ports).forEach(([portId, info]) => {
        expect(info.state, `Port ${portId} should be forwarding, got ${info.state}`).toBe('forwarding');
      });
    }
  });

  it('should NOT block any ports with multiple switches but no inter-switch connections', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001');
    const sw2 = createMockSwitch('SW2', '0000.0000.0002');
    const sw3 = createMockSwitch('SW3', '0000.0000.0003');

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
      ['sw3', sw3],
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'pc1', targetPort: 'eth0', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'sw2', sourcePort: 'fa0/1', targetDeviceId: 'pc2', targetPort: 'eth0', cableType: 'straight', active: true },
      { id: 'c3', sourceDeviceId: 'sw3', sourcePort: 'fa0/1', targetDeviceId: 'pc3', targetPort: 'eth0', cableType: 'straight', active: true },
    ];

    const updated = recalculateStp(deviceStates, connections);

    ['sw1', 'sw2', 'sw3'].forEach(id => {
      const stp = updated.get(id)?.stpState?.[1];
      expect(stp, `${id} should have STP state`).toBeDefined();
      if (stp) {
        Object.entries(stp.ports).forEach(([portId, info]) => {
          expect(info.state, `${id} ${portId} should be forwarding, got ${info.state}`).toBe('forwarding');
          expect(info.role, `${id} ${portId} role should not be alternate`).not.toBe('alternate');
        });
      }
    });
  });

  it('should NOT block ports on a switch that has no switch-to-switch links even if other switches have redundant links', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001');
    const sw2 = createMockSwitch('SW2', '0000.0000.0002');
    const sw3 = createMockSwitch('SW3', '0000.0000.0003');

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
      ['sw3', sw3],
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'sw2', sourcePort: 'fa0/1', targetDeviceId: 'sw3', targetPort: 'fa0/1', cableType: 'crossover', active: true },
      { id: 'c2', sourceDeviceId: 'sw2', sourcePort: 'fa0/2', targetDeviceId: 'sw3', targetPort: 'fa0/2', cableType: 'crossover', active: true },
      { id: 'c3', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'pc1', targetPort: 'eth0', cableType: 'straight', active: true },
    ];

    const updated = recalculateStp(deviceStates, connections);

    const stp1 = updated.get('sw1')?.stpState?.[1];
    expect(stp1).toBeDefined();
    if (stp1) {
      Object.entries(stp1.ports).forEach(([portId, info]) => {
        expect(info.state, `SW1 ${portId} should be forwarding, got ${info.state}`).toBe('forwarding');
        expect(info.role, `SW1 ${portId} role should not be alternate`).not.toBe('alternate');
      });
    }

    const stp2 = updated.get('sw2')?.stpState?.[1];
    const stp3 = updated.get('sw3')?.stpState?.[1];
    const ports2 = stp2?.ports ?? {};
    const ports3 = stp3?.ports ?? {};
    const blockCount2 = Object.values(ports2).filter(p => p.state === 'blocking').length;
    const blockCount3 = Object.values(ports3).filter(p => p.state === 'blocking').length;
    expect(blockCount2 + blockCount3).toBe(1);
  });
});
