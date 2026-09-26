import { describe, it, expect } from 'vitest';
import { propagateLinkStateChange } from '@/lib/network/linkStateEngine';
import { createInitialState } from '@/lib/network/initialState';
import { SwitchState } from '@/lib/network/types';

describe('Link State Engine (L2/OSPF/EIGRP/BGP Propagation)', () => {
  const switchBase = createInitialState('00:50:79:66:68:01', 'NS-L2-24TT-L');

  it('1. Flushes ARP and MAC tables when port goes down', () => {
    const stateWithL2: SwitchState = {
      ...switchBase,
      arpCache: [
        { ip: '10.0.0.2', mac: '00:aa:bb:cc:dd:02', interface: 'Gi0/1', timestamp: 0 },
        { ip: '10.0.0.3', mac: '00:aa:bb:cc:dd:03', interface: 'Gi0/2', timestamp: 0 }
      ],
      macAddressTable: [
        { vlan: 1, mac: '00:aa:bb:cc:dd:02', type: 'DYNAMIC', port: 'Gi0/1' },
        { vlan: 1, mac: '00:aa:bb:cc:dd:03', type: 'DYNAMIC', port: 'Gi0/2' }
      ]
    };

    const deviceStates = new Map<string, SwitchState>([['sw1', stateWithL2]]);

    const result = propagateLinkStateChange(
      deviceStates,
      [],
      'sw1',
      ['Gi0/1'],
      'down',
      Date.now()
    );

    const updated = result.deviceStates.get('sw1')!;
    expect(updated.arpCache?.length).toBe(1);
    expect(updated.arpCache?.[0].ip).toBe('10.0.0.3');

    expect(updated.macAddressTable?.length).toBe(1);
    expect(updated.macAddressTable?.[0].port).toBe('Gi0/2');
  });

  it('2. Brings OSPF neighbors down on interface link down', () => {
    const stateWithOspf: SwitchState = {
      ...switchBase,
      ospfProcessId: 1,
      ospfNeighborStates: {
        '2.2.2.2': {
          neighborId: '2.2.2.2',
          neighborIp: '10.0.0.2',
          interfaceId: 'Gi0/1',
          areaId: '0',
          state: 'Full',
          priority: 1,
          deadTimer: 40,
          helloInterval: 10,
          deadInterval: 40,
          lastHelloAt: 0
        },
        '3.3.3.3': {
          neighborId: '3.3.3.3',
          neighborIp: '10.0.0.3',
          interfaceId: 'Gi0/2',
          areaId: '0',
          state: 'Full',
          priority: 1,
          deadTimer: 40,
          helloInterval: 10,
          deadInterval: 40,
          lastHelloAt: 0
        }
      },
      ospfNeighbors: ['2.2.2.2', '3.3.3.3']
    };

    const deviceStates = new Map<string, SwitchState>([['r1', stateWithOspf]]);

    const result = propagateLinkStateChange(
      deviceStates,
      [],
      'r1',
      ['Gi0/1'],
      'down',
      Date.now()
    );

    const updated = result.deviceStates.get('r1')!;
    expect(updated.ospfNeighborStates?.['2.2.2.2'].state).toBe('Down');
    expect(updated.ospfNeighborStates?.['3.3.3.3'].state).toBe('Full');
    expect(updated.ospfNeighbors).toEqual(['3.3.3.3']);

    // Verifies OSPF adjacency change event log
    const ospfLog = result.events.find(e => e.message.includes('%OSPF-5-ADJCHG'));
    expect(ospfLog).toBeDefined();
    expect(ospfLog?.message).toContain('Nbr 2.2.2.2 on Gi0/1 from FULL to DOWN');
  });

  it('3. Resets EIGRP neighbor states when interface goes down', () => {
    const stateWithEigrp: SwitchState = {
      ...switchBase,
      eigrpAs: '100',
      eigrpNeighborStates: {
        '10.0.1.2': {
          neighborIp: '10.0.1.2',
          interfaceId: 'Gi0/1',
          asNumber: 100,
          state: 'Up',
          holdTime: 15,
          holdTimer: 15,
          kValues: [1, 0, 1, 0, 0],
          srtt: 20,
          rto: 200,
          seqNumber: 5,
          lastHelloAt: 0
        }
      }
    };

    const deviceStates = new Map<string, SwitchState>([['r1', stateWithEigrp]]);

    const result = propagateLinkStateChange(
      deviceStates,
      [],
      'r1',
      ['Gi0/1'],
      'down',
      Date.now()
    );

    const updated = result.deviceStates.get('r1')!;
    expect(updated.eigrpNeighborStates?.['10.0.1.2'].state).toBe('Down');
    expect(updated.eigrpNeighborStates?.['10.0.1.2'].holdTimer).toBe(0);
  });
});
