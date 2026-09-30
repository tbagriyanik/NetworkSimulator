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

  it('prefers eBGP over iBGP when all previous attributes are equal', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 0,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001,
      isIbgp: true
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65002],
      origin: 'IGP',
      originAs: 65002,
      isIbgp: false
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.3');
    expect(res.stepName).toBe('Prefer eBGP over iBGP');
  });

  it('prefers route with lower IGP metric to next-hop', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 0,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001,
      isIbgp: false,
      igpMetric: 100
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65002],
      origin: 'IGP',
      originAs: 65002,
      isIbgp: false,
      igpMetric: 50
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.3');
    expect(res.stepName).toBe('Lowest IGP Metric to Next-Hop');
  });

  it('prefers oldest path (longest-established)', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 0,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001,
      isIbgp: false,
      igpMetric: 50,
      receivedTime: 1000000
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65002],
      origin: 'IGP',
      originAs: 65002,
      isIbgp: false,
      igpMetric: 50,
      receivedTime: 500000
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.3');
    expect(res.stepName).toBe('Oldest Path (Longest-Established)');
  });

  it('prefers route with lower Router ID', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 0,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001,
      isIbgp: false,
      igpMetric: 50,
      receivedTime: 500000,
      routerId: '2.2.2.2'
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65002],
      origin: 'IGP',
      originAs: 65002,
      isIbgp: false,
      igpMetric: 50,
      receivedTime: 500000,
      routerId: '1.1.1.1'
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.3');
    expect(res.stepName).toBe('Lowest Router ID');
  });

  it('uses lowest Neighbor IP as final tie-breaker', () => {
    const routeA: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.3',
      weight: 0,
      localPref: 100,
      asPath: [65001],
      origin: 'IGP',
      originAs: 65001,
      isIbgp: false,
      igpMetric: 50,
      receivedTime: 500000,
      routerId: '1.1.1.1'
    };

    const routeB: BgpRoute = {
      prefix: '10.0.0.0/8',
      network: '10.0.0.0',
      netmask: '255.0.0.0',
      nextHop: '1.1.1.2',
      weight: 0,
      localPref: 100,
      asPath: [65002],
      origin: 'IGP',
      originAs: 65002,
      isIbgp: false,
      igpMetric: 50,
      receivedTime: 500000,
      routerId: '1.1.1.1'
    };

    const res = explainBgpBestPath(routeA, routeB);
    expect(res.bestRoute.nextHop).toBe('1.1.1.2');
    expect(res.stepName).toBe('Lowest Neighbor IP (Tie-Breaker)');
  });
});
