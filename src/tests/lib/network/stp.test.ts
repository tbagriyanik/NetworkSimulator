import { describe, it, expect } from 'vitest';
import { recalculateStp, calculateBridgeId } from '@/lib/network/stp';
import { SwitchState } from '@/lib/network/types';
import { CanvasConnection } from '@/components/network/networkTopology.types';

describe('STP Algorithm', () => {
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
    },
    vlans: { 1: { id: 1, name: 'default', status: 'active', ports: ['fa0/1', 'fa0/2'] } },
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

  it('should elect the switch with the lowest priority as root', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001', 32768);
    const sw2 = createMockSwitch('SW2', '0000.0000.0002', 4096); // Lowest priority
    const sw3 = createMockSwitch('SW3', '0000.0000.0003', 32768);

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
      ['sw3', sw3],
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'sw2', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'sw2', sourcePort: 'fa0/2', targetDeviceId: 'sw3', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c3', sourceDeviceId: 'sw3', sourcePort: 'fa0/2', targetDeviceId: 'sw1', targetPort: 'fa0/2', cableType: 'straight', active: true },
    ];

    const updatedStates = recalculateStp(deviceStates, connections);

    expect(updatedStates.get('sw2')?.stpState?.[1].isRoot).toBe(true);
    expect(updatedStates.get('sw1')?.stpState?.[1].isRoot).toBe(false);
    expect(updatedStates.get('sw3')?.stpState?.[1].isRoot).toBe(false);
  });

  it('should elect the switch with the lowest MAC as root when priorities are equal', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0003');
    const sw2 = createMockSwitch('SW2', '0000.0000.0001'); // Lowest MAC
    const sw3 = createMockSwitch('SW3', '0000.0000.0002');

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
      ['sw3', sw3],
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'sw2', targetPort: 'fa0/1', cableType: 'straight', active: true },
    ];

    const updatedStates = recalculateStp(deviceStates, connections);

    expect(updatedStates.get('sw2')?.stpState?.[1].isRoot).toBe(true);
  });

  it('should block one port in a triangle topology to prevent loops', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001', 4096); // Root
    const sw2 = createMockSwitch('SW2', '0000.0000.0002', 32768);
    const sw3 = createMockSwitch('SW3', '0000.0000.0003', 32768);

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
      ['sw3', sw3],
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1-2', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'sw2', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c1-3', sourceDeviceId: 'sw1', sourcePort: 'fa0/2', targetDeviceId: 'sw3', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c2-3', sourceDeviceId: 'sw2', sourcePort: 'fa0/2', targetDeviceId: 'sw3', targetPort: 'fa0/2', cableType: 'straight', active: true },
    ];

    const updatedStates = recalculateStp(deviceStates, connections);

    // SW1 is root, all ports should be designated/forwarding
    const stp1 = updatedStates.get('sw1')?.stpState?.[1];
    expect(stp1?.ports['fa0/1'].role).toBe('designated');
    expect(stp1?.ports['fa0/2'].role).toBe('designated');

    // SW2 and SW3 should have one root port each
    const stp2 = updatedStates.get('sw2')?.stpState?.[1];
    const stp3 = updatedStates.get('sw3')?.stpState?.[1];

    expect(stp2?.ports['fa0/1'].role).toBe('root');
    expect(stp3?.ports['fa0/1'].role).toBe('root');

    // The link between SW2 and SW3 should have one Designated and one Alternate (Blocking) port
    // SW2 has lower MAC than SW3, so SW2 fa0/2 should be Designated, SW3 fa0/2 should be Alternate
    expect(stp2?.ports['fa0/2'].role).toBe('designated');
    expect(stp2?.ports['fa0/2'].state).toBe('forwarding');

    expect(stp3?.ports['fa0/2'].role).toBe('alternate');
    expect(stp3?.ports['fa0/2'].state).toBe('blocking');
  });

  it('should handle port speed and path costs correctly', () => {
    const sw1 = createMockSwitch('SW1', '0000.0000.0001', 4096); // Root
    const sw2 = createMockSwitch('SW2', '0000.0000.0002', 32768);

    // Add a Gig port to sw1 and sw2
    sw1.ports['gi0/1'] = { id: 'gi0/1', name: 'Gi0/1', status: 'notconnect', vlan: 1, mode: 'access', duplex: 'auto', speed: '1000', shutdown: false, type: 'gigabitethernet' };
    sw2.ports['gi0/1'] = { id: 'gi0/1', name: 'Gi0/1', status: 'notconnect', vlan: 1, mode: 'access', duplex: 'auto', speed: '1000', shutdown: false, type: 'gigabitethernet' };

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
    ]);

    // Connect via FastEthernet (Cost 19) AND GigabitEthernet (Cost 4)
    const connections: CanvasConnection[] = [
      { id: 'c-fa', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'sw2', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c-gi', sourceDeviceId: 'sw1', sourcePort: 'gi0/1', targetDeviceId: 'sw2', targetPort: 'gi0/1', cableType: 'straight', active: true },
    ];

    const updatedStates = recalculateStp(deviceStates, connections);
    const stp2 = updatedStates.get('sw2')?.stpState?.[1];

    // SW2 should pick Gigabit port as root port because cost is 4 vs 19
    expect(stp2?.ports['gi0/1'].role).toBe('root');
    expect(stp2?.ports['fa0/1'].role).toBe('alternate');
    expect(stp2?.rootCost).toBe(4);
  });
});
