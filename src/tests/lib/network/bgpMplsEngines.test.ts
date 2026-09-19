import { describe, it, expect } from 'vitest';
import { getOrCreateBgpConfig, configureBgpNeighbor, addBgpNetwork, exchangeBgpRoutes } from '@/lib/network/bgpEngine';
import { getOrCreateMplsConfig, enableMplsOnInterface, generateLfib, generateLib, establishLdpSession, discoverLdpNeighbors, forwardMplsPacket } from '@/lib/network/mplsLdpEngine';
import type { SwitchState } from '@/lib/network/types';

describe('BGP & MP-BGP Engine', () => {
  it('should configure BGP instance, AS number and peers', () => {
    const state = {
      routerId: '10.0.0.1',
      ports: {}
    } as unknown as SwitchState;

    const cfg = getOrCreateBgpConfig(state, 65001);
    expect(cfg).toBeDefined();
    expect(cfg?.asNumber).toBe(65001);

    const neighbor = configureBgpNeighbor(state, '10.0.0.2', 65002);
    expect(neighbor).toBeDefined();
    expect(neighbor?.isIbgp).toBe(false);
    expect(neighbor?.state).toBe('Established');
  });

  it('should advertise BGP networks and exchange routes with loop prevention', () => {
    const r1State = {
      routerId: '10.0.0.1',
      ports: {
        'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false }
      }
    } as unknown as SwitchState;

    getOrCreateBgpConfig(r1State, 65001);
    configureBgpNeighbor(r1State, '10.0.0.2', 65002);
    addBgpNetwork(r1State, '192.168.1.0', '255.255.255.0');

    const r2State = {
      routerId: '10.0.0.2',
      ports: {
        'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.0', status: 'connected', shutdown: false }
      }
    } as unknown as SwitchState;

    getOrCreateBgpConfig(r2State, 65002);
    configureBgpNeighbor(r2State, '10.0.0.1', 65001);

    const states = new Map<string, SwitchState>();
    states.set('r1', r1State);
    states.set('r2', r2State);

    exchangeBgpRoutes(states);

    const r2Cfg = getOrCreateBgpConfig(r2State);
    expect(r2Cfg?.rib.some(r => r.network === '192.168.1.0')).toBe(true);
  });
});

describe('MPLS & LDP Core Engine', () => {
  it('should enable MPLS LDP and build LFIB table', () => {
    const state = {
      routerId: '10.1.1.1',
      ports: {
        'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', ipAddress: '10.1.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false }
      }
    } as unknown as SwitchState;

    const mpls = getOrCreateMplsConfig(state);
    expect(mpls.enabled).toBe(true);

    const enabled = enableMplsOnInterface(state, 'Gi0/0');
    expect(enabled).toBe(true);
    expect(state.ports['Gi0/0'].mplsEnabled).toBe(true);

    const lfib = generateLfib(state);
    expect(lfib.length).toBeGreaterThan(0);
    expect(lfib[0].outLabel).toBe('Implicit-Null');

    const ldpPeer = establishLdpSession(state, '2.2.2.2', '10.1.1.2', 'Gi0/0');
    expect(ldpPeer.tcpState).toBe('Operational');
  });

  it('discovers only real connected MPLS peers and creates a reciprocal session', () => {
    const r1 = { routerId: '1.1.1.1', ports: { 'Gi0/0': { id: 'Gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', shutdown: false } } } as unknown as SwitchState;
    const r2 = { routerId: '2.2.2.2', ports: { 'Gi0/0': { id: 'Gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.0', shutdown: false } } } as unknown as SwitchState;
    enableMplsOnInterface(r1, 'Gi0/0');
    enableMplsOnInterface(r2, 'Gi0/0');
    const states = new Map([['r1', r1], ['r2', r2]]);
    discoverLdpNeighbors(r1, states, [{ id: 'c1', sourceDeviceId: 'r1', sourcePort: 'Gi0/0', targetDeviceId: 'r2', targetPort: 'Gi0/0', cableType: 'ethernet', active: true }] as never);
    expect(getOrCreateMplsConfig(r1).neighbors['10.0.0.2']?.peerLdpId).toBe('2.2.2.2:0');
    expect(getOrCreateMplsConfig(r2).neighbors['10.0.0.1']?.peerLdpId).toBe('1.1.1.1:0');
  });

  it('forwards a labeled packet using the LFIB and counts switched packets', () => {
    const state = { routerId: '1.1.1.1', ports: {} } as unknown as SwitchState;
    getOrCreateMplsConfig(state).lfib = [{ inLabel: 16000, outLabel: 17000, prefix: '10.10.0.0/16', outInterface: 'Gi0/0', nextHop: '10.0.0.2' }];
    const result = forwardMplsPacket(state, { label: 16000, destinationPrefix: '10.10.0.0/16', payload: 'packet' });
    expect(result).toMatchObject({ action: 'forward', outLabel: 17000, nextHop: '10.0.0.2', payload: 'packet' });
    expect(getOrCreateMplsConfig(state).lfib[0].packetsSwitched).toBe(1);
  });

  it('advertises connected prefixes from the real LDP peer', () => {
    const r1 = { routerId: '1.1.1.1', ports: { 'Gi0/0': { id: 'Gi0/0', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', mplsEnabled: true, shutdown: false } } } as unknown as SwitchState;
    const r2 = { routerId: '2.2.2.2', ports: {
      'Gi0/0': { id: 'Gi0/0', ipAddress: '10.0.0.2', subnetMask: '255.255.255.0', mplsEnabled: true, shutdown: false },
      'Gi0/1': { id: 'Gi0/1', ipAddress: '192.0.2.1', subnetMask: '255.255.255.0', mplsEnabled: true, shutdown: false }
    } } as unknown as SwitchState;
    enableMplsOnInterface(r1, 'Gi0/0');
    getOrCreateMplsConfig(r1).neighbors['10.0.0.2'] = { peerLdpId: '2.2.2.2:0', peerIp: '10.0.0.2', tcpState: 'Operational', uptimeSeconds: 1, addresses: ['10.0.0.2'], discoverySource: 'Gi0/0', holdTime: 180, labelsReceived: 0, labelsAdvertised: 0 };
    const lib = generateLib(r1, new Map([['r1', r1], ['r2', r2]]));
    expect(lib.some(entry => entry.prefix === '192.0.2.1/255.255.255.0')).toBe(true);
  });
});
