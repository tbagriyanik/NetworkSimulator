import { describe, expect, it } from 'vitest';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import {
  assignInterfaceToVrf,
  setVrfRouteDistinguisher,
  setVrfRouteTarget,
  addVrfStaticRoute,
  getVrfForInterface,
  filterRoutesByVrf,
} from '@/lib/network/vrfLite';
import { getRoutingTable } from '@/lib/network/routing';
import { forwardPacketFrame } from '@/lib/network/forwarding/commonForwardingEngine';

describe('VRF-Lite Routing Table Isolation & RT Route Leaking', () => {
  const routerDevice: CanvasDevice = {
    id: 'r1',
    name: 'PE-Router',
    type: 'router',
    ip: '10.0.0.1',
    status: 'online',
    ports: [],
    x: 0,
    y: 0,
  };

  const routerState: SwitchState = {
    hostname: 'PE-Router',
    ipRouting: true,
    ports: {
      'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', ipAddress: '10.1.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
      'Gi0/1': { id: 'Gi0/1', name: 'Gi0/1', ipAddress: '10.2.2.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
      'Gi0/2': { id: 'Gi0/2', name: 'Gi0/2', ipAddress: '172.16.0.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' },
    },
    vrfInstances: {},
  } as unknown as SwitchState;

  // Bind interfaces to VRFs: Gi0/0 -> RED, Gi0/1 -> BLUE, Gi0/2 -> GLOBAL
  assignInterfaceToVrf(routerState, 'RED', 'Gi0/0');
  setVrfRouteDistinguisher(routerState, 'RED', '65000:100');

  assignInterfaceToVrf(routerState, 'BLUE', 'Gi0/1');
  setVrfRouteDistinguisher(routerState, 'BLUE', '65000:200');

  // Add VRF-specific static routes
  addVrfStaticRoute(routerState, 'RED', {
    destination: '10.100.0.0',
    subnetMask: '255.255.0.0',
    nextHop: 'Gi0/0',
    type: 'static',
  });

  addVrfStaticRoute(routerState, 'BLUE', {
    destination: '10.200.0.0',
    subnetMask: '255.255.0.0',
    nextHop: 'Gi0/1',
    type: 'static',
  });

  const stateMap = new Map<string, SwitchState>([['r1', routerState]]);

  it('correctly maps interfaces to VRF instances', () => {
    expect(getVrfForInterface(routerState, 'Gi0/0')).toBe('RED');
    expect(getVrfForInterface(routerState, 'Gi0/1')).toBe('BLUE');
    expect(getVrfForInterface(routerState, 'Gi0/2')).toBeUndefined();
  });

  it('isolates routing tables between VRF RED, VRF BLUE, and Global', () => {
    const redTable = getRoutingTable('r1', stateMap, undefined, undefined, 'RED');
    const blueTable = getRoutingTable('r1', stateMap, undefined, undefined, 'BLUE');
    const globalTable = getRoutingTable('r1', stateMap, undefined, undefined, undefined);

    // VRF RED table only contains Gi0/0 & 10.100.0.0/16
    expect(redTable.some(r => r.destination === '10.1.1.0')).toBe(true);
    expect(redTable.some(r => r.destination === '10.100.0.0')).toBe(true);
    expect(redTable.some(r => r.destination === '10.2.2.0')).toBe(false);

    // VRF BLUE table only contains Gi0/1 & 10.200.0.0/16
    expect(blueTable.some(r => r.destination === '10.2.2.0')).toBe(true);
    expect(blueTable.some(r => r.destination === '10.200.0.0')).toBe(true);
    expect(blueTable.some(r => r.destination === '10.1.1.0')).toBe(false);

    // Global table only contains Gi0/2 (172.16.0.0/24)
    expect(globalTable.some(r => r.destination === '172.16.0.0')).toBe(true);
    expect(globalTable.some(r => r.destination === '10.1.1.0')).toBe(false);
  });

  it('prevents cross-VRF traffic leaks during forwarding pipeline execution', () => {
    // Packet arriving on Gi0/0 (VRF RED) trying to reach 10.200.0.1 (VRF BLUE destination)
    const crossVrfFrame: NetworkPacketFrame = {
      id: 'leak-test-1',
      protocol: 'IPV4',
      timestamp: Date.now(),
      ingressPortId: 'Gi0/0',
      srcMac: '00:11:22:33:44:55',
      dstMac: '00:99:88:77:66:55',
      etherType: '0x0800',
      srcIp: '10.1.1.10',
      dstIp: '10.200.0.1',
      length: 64,
      info: 'Cross VRF Leak Attempt',
    };

    const res = forwardPacketFrame(crossVrfFrame, routerDevice, routerState);
    // Should NOT forward to Gi0/1 because route is isolated inside VRF BLUE
    expect(res.egressPorts).not.toContain('Gi0/1');
  });

  it('supports MP-BGP Route Target (RT) leaking between VRFs when configured', () => {
    // Export RT 65000:999 from BLUE, Import RT 65000:999 into RED
    setVrfRouteTarget(routerState, 'BLUE', 'export', '65000:999');
    setVrfRouteTarget(routerState, 'RED', 'import', '65000:999');

    const redTableLeaked = filterRoutesByVrf(routerState, 'RED', [
      { destination: '10.2.2.0', subnetMask: '255.255.255.0', nextHop: 'Gi0/1', type: 'connected', vrf: 'BLUE' },
    ]);

    expect(redTableLeaked.some(r => r.destination === '10.2.2.0' && r.code?.includes('VLeaked'))).toBe(true);
  });
});
