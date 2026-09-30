import { describe, it, expect } from 'vitest';
import { explainBgpBestPath } from '../../../lib/network/bgpBestPathExplainer';
import type { BgpRoute } from '../../../lib/network/bgpEngine';

describe('bgpBestPathExplainer', () => {
  it('prefers route with higher Weight', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 32768,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.2');
    expect(res.stepName).toBe('Highest Weight');
  });

  it('prefers route with shorter AS-Path when weight and localPref are equal', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 0,
      localPref: 100,
      asPath: [65001, 65002],
      origin: 'IGP',
      originAs: 65001
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65003],
      origin: 'IGP',
      originAs: 65003
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.3');
    expect(res.stepName).toBe('Shortest AS-Path');
  });
});
