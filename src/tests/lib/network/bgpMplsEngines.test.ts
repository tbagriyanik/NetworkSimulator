import { describe, it, expect } from 'vitest';
import { getOrCreateBgpConfig, configureBgpNeighbor, addBgpNetwork, exchangeBgpRoutes } from '@/lib/network/bgpEngine';
import { getOrCreateMplsConfig, enableMplsOnInterface, generateLfib, establishLdpSession } from '@/lib/network/mplsLdpEngine';
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

    const ldpPeer = establishLdpSession(state, '2.2.2.2', '10.1.1.2');
    expect(ldpPeer.tcpState).toBe('Operational');
  });
});
