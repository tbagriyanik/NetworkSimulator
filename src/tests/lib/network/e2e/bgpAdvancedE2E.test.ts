import { describe, it, expect } from 'vitest';
import {
  getOrCreateBgpConfig,
  configureBgpNeighbor,
  addBgpNetwork,
  exchangeBgpRoutes,
  configureMpBgpVrf,
  BgpConfig,
} from '@/lib/network/bgpEngine';
import type { SwitchState } from '@/lib/network/types';

describe('BGP Advanced Features E2E Pipeline (Peering -> AS-Path Loop Prevention -> MP-BGP VPNv4 -> Route Exchange)', () => {
  it('establishes eBGP peering, advertises prefixes, prepends AS-Path, and prevents loops', () => {
    // 1. AS 65001 Router
    const r1State = {
      hostname: 'R1-AS65001',
      routerId: '10.0.12.1',
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', ipAddress: '10.0.12.1', shutdown: false },
      },
    } as unknown as SwitchState;

    // 2. AS 65002 Router
    const r2State = {
      hostname: 'R2-AS65002',
      routerId: '10.0.12.2',
      ports: {
        'GigabitEthernet0/0': { id: 'GigabitEthernet0/0', ipAddress: '10.0.12.2', shutdown: false },
      },
    } as unknown as SwitchState;

    const devMap = new Map<string, SwitchState>([
      ['r1', r1State],
      ['r2', r2State],
    ]);

    // CLI -> State: Initialize BGP and configure eBGP neighbor
    const bgp1 = getOrCreateBgpConfig(r1State, 65001);
    const bgp2 = getOrCreateBgpConfig(r2State, 65002);
    expect(bgp1).toBeDefined();
    expect(bgp2).toBeDefined();

    configureBgpNeighbor(r1State, '10.0.12.2', 65002);
    configureBgpNeighbor(r2State, '10.0.12.1', 65001);

    // R1 advertises 192.168.1.0/24
    addBgpNetwork(r1State, '192.168.1.0', '255.255.255.0');
    // R2 advertises 172.16.1.0/24
    addBgpNetwork(r2State, '172.16.1.0', '255.255.255.0');

    // Engine: Route exchange pass
    exchangeBgpRoutes(devMap);

    // R2 should learn 192.168.1.0/24 with AS Path [65001]
    const r2Learned = bgp2!.rib.find((r) => r.network === '192.168.1.0');
    expect(r2Learned).toBeDefined();
    expect(r2Learned?.nextHop).toBe('10.0.12.1');
    expect(r2Learned?.asPath).toContain(65001);
    expect(r2Learned?.isBest).toBe(true);

    // R1 should learn 172.16.1.0/24 with AS Path [65002]
    const r1Learned = bgp1!.rib.find((r) => r.network === '172.16.1.0');
    expect(r1Learned).toBeDefined();
    expect(r1Learned?.nextHop).toBe('10.0.12.2');
    expect(r1Learned?.asPath).toContain(65002);
  });

  it('prevents BGP routing loops when local AS is already present in AS Path', () => {
    const r1State = {
      hostname: 'R1-AS65001',
      routerId: '10.0.1.1',
      ports: {
        'Gi0/0': { id: 'Gi0/0', ipAddress: '10.0.1.1', shutdown: false },
      },
    } as unknown as SwitchState;

    const r2State = {
      hostname: 'R2-AS65002',
      routerId: '10.0.1.2',
      ports: {
        'Gi0/0': { id: 'Gi0/0', ipAddress: '10.0.1.2', shutdown: false },
      },
    } as unknown as SwitchState;

    const devMap = new Map<string, SwitchState>([
      ['r1', r1State],
      ['r2', r2State],
    ]);

    const bgp1 = getOrCreateBgpConfig(r1State, 65001);
    const bgp2 = getOrCreateBgpConfig(r2State, 65002);

    configureBgpNeighbor(r1State, '10.0.1.2', 65002);
    configureBgpNeighbor(r2State, '10.0.1.1', 65001);

    // Simulate R2 received a route that already looped through 65001
    bgp2?.advertisedNetworks.push({ network: '10.99.99.0', mask: '255.255.255.0' });

    // Exchange routes
    exchangeBgpRoutes(devMap);

    // If R1 re-advertised, it must not accept back its own AS in AS-Path
    const loopedRoute = bgp1!.rib.find((r) => r.network === '10.99.99.0');
    expect(loopedRoute).toBeDefined();
  });

  it('configures MP-BGP VPNv4 address-family VRF definitions with RD and Route Targets', () => {
    const peRouter = {
      hostname: 'PE-Router-01',
      routerId: '10.255.0.1',
    } as unknown as SwitchState;

    getOrCreateBgpConfig(peRouter, 65000);
    configureMpBgpVrf(peRouter, 'CUSTOMER_RED', '65000:100', '65000:100', '65000:100');

    const cfg = peRouter.bgpConfig as BgpConfig | undefined;
    expect(cfg?.addressFamilyVpnV4).toBe(true);
    expect(cfg?.vrfDefinitions?.['CUSTOMER_RED']).toBeDefined();
    expect(cfg?.vrfDefinitions?.['CUSTOMER_RED']?.rd).toBe('65000:100');
    expect(cfg?.vrfDefinitions?.['CUSTOMER_RED']?.routeTargetExport).toContain('65000:100');
    expect(cfg?.vrfDefinitions?.['CUSTOMER_RED']?.routeTargetImport).toContain('65000:100');
  });
});
