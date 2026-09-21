import { describe, it, expect } from 'vitest';
import {
  areSameMstRegion,
  getMstInstanceForVlan,
  electCistRoot,
  buildMstBpdu,
  isMstRegionBoundary,
  type MstBridge,
} from '@/lib/network/mstp';
import { recalculateStp } from '@/lib/network/stp';
import type { SwitchState, StpVlanState } from '@/lib/network/types';
import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('MSTP (IEEE 802.1s Multiple Spanning Tree) E2E Pipeline', () => {
  it('computes consistent MST region digest for matching instance mappings and detects region equality', () => {
    const swA = {
      spanningTreeMode: 'mst',
      mstConfig: {
        name: 'CAMPUS-REGION',
        revision: 1,
        instances: {
          1: [10, 20],
          2: [30, 40],
        },
      },
    } as unknown as SwitchState;

    const swB = {
      spanningTreeMode: 'mst',
      mstConfig: {
        name: 'CAMPUS-REGION',
        revision: 1,
        instances: {
          2: [30, 40],
          1: [20, 10], // Order-independent
        },
      },
    } as unknown as SwitchState;

    const swDiff = {
      spanningTreeMode: 'mst',
      mstConfig: {
        name: 'DATACENTER-REGION',
        revision: 1,
        instances: { 1: [10, 20] },
      },
    } as unknown as SwitchState;

    expect(areSameMstRegion(swA, swB)).toBe(true);
    expect(areSameMstRegion(swA, swDiff)).toBe(false);

    expect(getMstInstanceForVlan(swA, 10)).toBe(1);
    expect(getMstInstanceForVlan(swA, 20)).toBe(1);
    expect(getMstInstanceForVlan(swA, 30)).toBe(2);
    expect(getMstInstanceForVlan(swA, 99)).toBe(0); // Unmapped VLANs default to CIST Instance 0
  });

  it('builds authentic 802.1s MST BPDU with MSTI records and detects boundary ports', () => {
    const bridgeA: MstBridge = {
      id: 'sw-1',
      priority: 4096,
      mac: '00:11:22:33:44:55',
      config: {
        name: 'REGION_1',
        revision: 2,
        instances: { 1: [10, 20], 2: [30, 40] },
      },
    };

    const bridgeB: MstBridge = {
      id: 'sw-2',
      priority: 32768,
      mac: '00:aa:bb:cc:dd:ee',
      config: {
        name: 'REGION_1',
        revision: 2,
        instances: { 1: [10, 20], 2: [30, 40] },
      },
    };

    const root = electCistRoot([bridgeA, bridgeB]);
    expect(root?.id).toBe('sw-1');

    const bpduA = buildMstBpdu(bridgeA, [bridgeB]);
    expect(bpduA.protocol).toBe('MSTP');
    expect(bpduA.regionName).toBe('REGION_1');
    expect(bpduA.revision).toBe(2);
    expect(bpduA.records.length).toBe(2);
    expect(bpduA.boundary).toBe(false);

    const externalBridge: MstBridge = {
      id: 'sw-ext',
      priority: 32768,
      mac: '00:ff:ff:ff:ff:ff',
      config: { name: 'OTHER_REGION', revision: 1, instances: {} },
    };

    const bpduExt = buildMstBpdu(externalBridge);
    expect(isMstRegionBoundary(bpduA, bpduExt)).toBe(true);
  });

  it('runs topology MST calculations across VLAN instances in calculateSpanningTree', () => {
    const sw1 = {
      id: 'sw1',
      deviceType: 'switchL2',
      macAddress: '0011.2233.4401',
      spanningTreeMode: 'mst',
      spanningTreePriority: 4096,
      mstConfig: {
        name: 'REGION-A',
        revision: 1,
        instances: { 1: [10] },
        instancePriorities: { 1: 4096 },
      },
      ports: {
        'Fa0/1': { id: 'Fa0/1', mode: 'trunk', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', mode: 'trunk', status: 'connected', shutdown: false },
      },
      vlans: { 1: { id: 1, name: 'default' }, 10: { id: 10, name: 'VLAN10' } },
    } as unknown as SwitchState;

    const sw2 = {
      id: 'sw2',
      deviceType: 'switchL2',
      macAddress: '0011.2233.4402',
      spanningTreeMode: 'mst',
      spanningTreePriority: 32768,
      mstConfig: {
        name: 'REGION-A',
        revision: 1,
        instances: { 1: [10] },
        instancePriorities: { 1: 32768 },
      },
      ports: {
        'Fa0/1': { id: 'Fa0/1', mode: 'trunk', status: 'connected', shutdown: false },
        'Fa0/2': { id: 'Fa0/2', mode: 'trunk', status: 'connected', shutdown: false },
      },
      vlans: { 1: { id: 1, name: 'default' }, 10: { id: 10, name: 'VLAN10' } },
    } as unknown as SwitchState;

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1],
      ['sw2', sw2],
    ]);

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'Fa0/1', targetDeviceId: 'sw2', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
      { id: 'c2', sourceDeviceId: 'sw1', sourcePort: 'Fa0/2', targetDeviceId: 'sw2', targetPort: 'Fa0/2', active: true, cableType: 'straight' },
    ];

    const resultStates = recalculateStp(deviceStates, connections);
    const calculatedSw1 = resultStates.get('sw1');
    const calculatedSw2 = resultStates.get('sw2');

    expect(calculatedSw1?.stpState?.[10]?.isRoot).toBe(true);
    expect(calculatedSw2?.stpState?.[10]?.isRoot).toBe(false);

    // One of sw2's ports should be in blocking/alternate state to break loop
    const sw2Ports: StpVlanState['ports'] = calculatedSw2?.stpState?.[10]?.ports || {};
    const roles = Object.values(sw2Ports).map((p) => p.role);
    expect(roles).toContain('root');
    expect(roles).toContain('alternate');
  });
});
