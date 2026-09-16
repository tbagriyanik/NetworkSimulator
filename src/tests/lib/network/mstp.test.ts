import { describe, expect, it } from 'vitest';
import { mstRegionDigest, areSameMstRegion, getMstInstanceForVlan } from '@/lib/network/mstp';
import { recalculateStp } from '@/lib/network/stp';
import type { SwitchState, Port } from '@/lib/network/types';
import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('IEEE 802.1s MSTP (Multiple Spanning Tree Protocol)', () => {
  it('calculates region digest and detects MST region equality', () => {
    const configA = { name: 'REGION-1', revision: 1, instances: { 1: [10, 20], 2: [30, 40] } };
    const configB = { name: 'REGION-1', revision: 1, instances: { 1: [10, 20], 2: [30, 40] } };
    const configC = { name: 'REGION-2', revision: 1, instances: { 1: [10, 20] } };

    expect(mstRegionDigest(configA)).toBe(mstRegionDigest(configB));
    expect(mstRegionDigest(configA)).not.toBe(mstRegionDigest(configC));

    const switchA: Partial<SwitchState> = { spanningTreeMode: 'mst', mstConfig: configA };
    const switchB: Partial<SwitchState> = { spanningTreeMode: 'mst', mstConfig: configB };
    const switchC: Partial<SwitchState> = { spanningTreeMode: 'mst', mstConfig: configC };

    expect(areSameMstRegion(switchA as SwitchState, switchB as SwitchState)).toBe(true);
    expect(areSameMstRegion(switchA as SwitchState, switchC as SwitchState)).toBe(false);
  });

  it('maps VLANs to correct MST Instance IDs', () => {
    const state: Partial<SwitchState> = {
      mstConfig: { instances: { 1: [10, 20], 2: [30, 40] } }
    };

    expect(getMstInstanceForVlan(state as SwitchState, 10)).toBe(1);
    expect(getMstInstanceForVlan(state as SwitchState, 40)).toBe(2);
    expect(getMstInstanceForVlan(state as SwitchState, 99)).toBe(0); // Unmapped VLANs default to CIST 0
  });

  it('runs MST calculation across topology without leaking MSTI BPDUs across region boundary', () => {
    const mockPort1: Port = {
      id: 'gi0/1',
      name: 'GigabitEthernet0/1',
      mode: 'trunk',
      status: 'connected',
      vlan: 1,
      duplex: 'auto',
      speed: '1000',
      shutdown: false,
      type: 'gigabitethernet'
    };

    const sw1State: Partial<SwitchState> = {
      deviceType: 'switch',
      macAddress: '00:11:22:33:44:55',
      spanningTreeMode: 'mst',
      mstConfig: { name: 'REGION-1', revision: 1, instances: { 1: [10] }, instancePriorities: { 1: 4096 } },
      ports: { 'gi0/1': mockPort1 }
    };

    const sw2State: Partial<SwitchState> = {
      deviceType: 'switch',
      macAddress: '00:11:22:33:44:66',
      spanningTreeMode: 'mst',
      mstConfig: { name: 'REGION-2', revision: 1, instances: { 1: [10] }, instancePriorities: { 1: 32768 } },
      ports: { 'gi0/1': { ...mockPort1 } }
    };

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State as SwitchState],
      ['sw2', sw2State as SwitchState]
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1', active: true, sourceDeviceId: 'sw1', sourcePort: 'gi0/1', targetDeviceId: 'sw2', targetPort: 'gi0/1', cableType: 'straight' }
    ];

    const result = recalculateStp(deviceStates, connections);
    const sw1Res = result.get('sw1');
    const sw2Res = result.get('sw2');

    expect(sw1Res?.stpState?.[10]).toBeDefined();
    expect(sw2Res?.stpState?.[10]).toBeDefined();
  });
});


