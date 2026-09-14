import { describe, it, expect } from 'vitest';
import { calculateBgpRoutes, recalculateBgpNeighbors } from '../../../lib/network/routing';
import { createInitialRouterState } from '../../../lib/network/initialState';
import type { SwitchState } from '../../../lib/network/types';

function makeRouter(hostname: string, as: string | number, portIp: string): SwitchState {
  const r = createInitialRouterState();
  r.hostname = hostname;
  r.bgpAs = String(as);
  r.routingProtocol = 'bgp';
  r.routerId = hostname === 'R1' ? '1.1.1.1' : hostname === 'R2' ? '2.2.2.2' : hostname === 'RR' ? '4.4.4.4' : '3.3.3.3';
  r.bgpNetworks = [];
  r.bgpNeighbors = [];
  r.ports['gi0/0'] = { ...r.ports['gi0/0'], ipAddress: portIp, shutdown: false };
  return r;
}

function addPort(r: SwitchState, portId: string, ip: string): SwitchState {
  r.ports[portId] = { ...r.ports[portId], ipAddress: ip, shutdown: false };
  return r;
}

function peerStates(a: SwitchState, b: SwitchState): Map<string, SwitchState> {
  return new Map([['R1', a], ['R2', b]]);
}

describe('BGP next-hop-self', () => {
  it('eBGP learned route next-hop defaults to peer session IP', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established' }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    const learned = calculateBgpRoutes('R1', states);
    expect(learned.find(r => r.destination === '10.0.0.0')?.nextHop).toBe('10.0.0.2');
  });

  it('iBGP without next-hop-self uses peer router-id as original next-hop', () => {
    const r2 = makeRouter('R2', 65000, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65000, state: 'Established' }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    const route = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(route).toBeDefined();
    expect(route!.nextHop).toBe('2.2.2.2');
    expect(route!.administrativeDistance).toBe(200);
  });

  it('iBGP with next-hop-self uses peer session IP', () => {
    const r2 = makeRouter('R2', 65000, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65000, state: 'Established', nextHopSelf: true }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    const learned = calculateBgpRoutes('R1', states);
    expect(learned.find(r => r.destination === '10.0.0.0')?.nextHop).toBe('10.0.0.2');
  });
});

describe('BGP weight', () => {
  it('applies weight from neighbor config', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established', weight: 200 }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    expect(calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0')?.weight).toBe(200);
  });

  it('higher weight wins best-path selection', () => {
    const r3 = makeRouter('R3', 65002, '10.0.1.3');
    r3.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r3.bgpNeighbors = [{ ip: '10.0.1.1', as: 65000, state: 'Established' }];

    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [
      { ip: '10.0.0.2', as: 65001, state: 'Established', weight: 100 },
      { ip: '10.0.1.3', as: 65002, state: 'Established', weight: 300 },
    ];
    addPort(r1, 'gi0/1', '10.0.1.1');

    const states = new Map([['R1', r1], ['R2', r2], ['R3', r3]]);
    recalculateBgpNeighbors(states);
    const best = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(best?.nextHop).toBe('10.0.1.3');
    expect(best?.weight).toBe(300);
  });
});

describe('BGP local-preference', () => {
  it('default local-pref is 100', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established' }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    expect(calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0')?.localPreference).toBe(100);
  });

  it('bgp default local-preference is applied', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpLocalPreference = 200;
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established' }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    expect(calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0')?.localPreference).toBe(200);
  });

  it('higher local-pref wins over lower', () => {
    const r3 = makeRouter('R3', 65002, '10.0.1.3');
    r3.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r3.bgpNeighbors = [{ ip: '10.0.1.1', as: 65000, state: 'Established' }];

    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [
      { ip: '10.0.0.2', as: 65001, state: 'Established', routeMapIn: 'PREF-200' },
      { ip: '10.0.1.3', as: 65002, state: 'Established', routeMapIn: 'PREF-300' },
    ];
    r1.routeMaps = {
      'PREF-200': [{ seq: 10, action: 'permit', matchRules: {}, setRules: { localPreference: 200 } }],
      'PREF-300': [{ seq: 10, action: 'permit', matchRules: {}, setRules: { localPreference: 300 } }],
    };
    addPort(r1, 'gi0/1', '10.0.1.1');

    const states = new Map([['R1', r1], ['R2', r2], ['R3', r3]]);
    recalculateBgpNeighbors(states);
    const best = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(best?.nextHop).toBe('10.0.1.3');
    expect(best?.localPreference).toBe(300);
  });
});

describe('BGP MED', () => {
  it('MED from peer neighbor config is applied', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established', med: 50 }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established' }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    expect(calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0')?.metric).toBe(50);
  });

  it('route-map set metric overrides peer MED', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established', med: 50 }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established', routeMapIn: 'SET-MED' }];
    r1.routeMaps = {
      'SET-MED': [{ seq: 10, action: 'permit', matchRules: {}, setRules: { metric: 10 } }],
    };

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    expect(calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0')?.metric).toBe(10);
  });

  it('lower MED wins best-path selection', () => {
    const r3 = makeRouter('R3', 65002, '10.0.1.3');
    r3.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r3.bgpNeighbors = [{ ip: '10.0.1.1', as: 65000, state: 'Established', med: 5 }];

    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established', med: 100 }];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [
      { ip: '10.0.0.2', as: 65001, state: 'Established' },
      { ip: '10.0.1.3', as: 65002, state: 'Established' },
    ];
    addPort(r1, 'gi0/1', '10.0.1.1');

    const states = new Map([['R1', r1], ['R2', r2], ['R3', r3]]);
    recalculateBgpNeighbors(states);
    const best = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(best?.nextHop).toBe('10.0.1.3');
    expect(best?.metric).toBe(5);
  });
});

describe('BGP as-path prepend', () => {
  it('prepends ASN from outbound route-map', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [
      { ip: '10.0.0.1', as: 65000, state: 'Established', routeMapOut: 'PREPEND' },
    ];
    r2.routeMaps = {
      'PREPEND': [{ seq: 10, action: 'permit', matchRules: {}, setRules: { asPathPrepend: ['65001'] } }],
    };

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established' }];

    const states = peerStates(r1, r2);
    recalculateBgpNeighbors(states);
    const route = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(route?.asPath).toBe('65001 65001 i');
  });
});

describe('BGP best-path selection', () => {
  it('shorter AS path wins over higher metric', () => {
    const r3 = makeRouter('R3', 65002, '10.0.1.3');
    r3.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r3.bgpNeighbors = [{ ip: '10.0.1.1', as: 65000, state: 'Established' }];

    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established', routeMapOut: 'PREPEND2' }];
    r2.routeMaps = {
      'PREPEND2': [{ seq: 10, action: 'permit', matchRules: {}, setRules: { asPathPrepend: ['65001', '65001'] } }],
    };

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [
      { ip: '10.0.0.2', as: 65001, state: 'Established' },
      { ip: '10.0.1.3', as: 65002, state: 'Established' },
    ];
    addPort(r1, 'gi0/1', '10.0.1.1');

    const states = new Map([['R1', r1], ['R2', r2], ['R3', r3]]);
    recalculateBgpNeighbors(states);
    const best = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(best?.nextHop).toBe('10.0.1.3');
  });

  it('eBGP preferred over iBGP at same priority (equal AS path)', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.1', as: 65000, state: 'Established' }];

    const rr = makeRouter('RR', 65000, '10.0.1.4');
    rr.bgpNeighbors = [{ ip: '10.0.1.1', as: 65000, state: 'Established', routeReflectorClient: true }];
    rr.dynamicRoutes = [
      { destination: '10.0.0.0', subnetMask: '255.0.0.0', nextHop: '10.0.0.2', metric: 0, type: 'dynamic', code: 'B', administrativeDistance: 20, asPath: '65001 i' },
    ];

    const r1 = makeRouter('R1', 65000, '10.0.0.1');
    r1.bgpNeighbors = [
      { ip: '10.0.0.2', as: 65001, state: 'Established' },
      { ip: '10.0.1.4', as: 65000, state: 'Established' },
    ];
    addPort(r1, 'gi0/1', '10.0.1.1');

    const states = new Map([['R1', r1], ['R2', r2], ['RR', rr]]);
    recalculateBgpNeighbors(states);
    const best = calculateBgpRoutes('R1', states).find(r => r.destination === '10.0.0.0');
    expect(best?.nextHop).toBe('10.0.0.2');
    expect(best?.administrativeDistance).toBe(20);
  });
});

describe('BGP route-reflector', () => {
  it('RR reflects iBGP-learned routes to clients', () => {
    const r2 = makeRouter('R2', 65000, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.4', as: 65000, state: 'Established' }];

    const rr = makeRouter('RR', 65000, '10.0.0.4');
    rr.bgpNeighbors = [
      { ip: '10.0.0.2', as: 65000, state: 'Established' },
    ];
    addPort(rr, 'gi0/1', '10.0.1.4');
    rr.bgpNeighbors.push({ ip: '10.0.1.1', as: 65000, state: 'Established', routeReflectorClient: true });
    rr.dynamicRoutes = [
      { destination: '10.0.0.0', subnetMask: '255.0.0.0', nextHop: '10.0.0.2', metric: 0, type: 'dynamic', code: 'B', administrativeDistance: 200, asPath: 'i' },
    ];

    const r1 = makeRouter('R1', 65000, '10.0.1.1');
    r1.bgpNeighbors = [{ ip: '10.0.1.4', as: 65000, state: 'Established' }];

    const states = new Map([['R1', r1], ['R2', r2], ['RR', rr]]);
    recalculateBgpNeighbors(states);
    const learned = calculateBgpRoutes('R1', states);
    expect(learned.find(r => r.destination === '10.0.0.0')).toBeDefined();
  });

  it('non-client iBGP peer does not receive reflected iBGP-learned routes', () => {
    const r2 = makeRouter('R2', 65000, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.4', as: 65000, state: 'Established' }];

    const rr = makeRouter('RR', 65000, '10.0.0.4');
    rr.bgpNeighbors = [{ ip: '10.0.0.2', as: 65000, state: 'Established' }];
    addPort(rr, 'gi0/1', '10.0.1.4');
    rr.bgpNeighbors.push({ ip: '10.0.1.1', as: 65000, state: 'Established' });
    rr.dynamicRoutes = [
      { destination: '10.0.0.0', subnetMask: '255.0.0.0', nextHop: '10.0.0.2', metric: 0, type: 'dynamic', code: 'B', administrativeDistance: 200, asPath: 'i' },
    ];

    const r1 = makeRouter('R1', 65000, '10.0.1.1');
    r1.bgpNeighbors = [{ ip: '10.0.1.4', as: 65000, state: 'Established' }];

    const states = new Map([['R1', r1], ['R2', r2], ['RR', rr]]);
    recalculateBgpNeighbors(states);
    const learned = calculateBgpRoutes('R1', states);
    expect(learned.find(r => r.destination === '10.0.0.0')).toBeUndefined();
  });

  it('eBGP-learned routes are reflected to iBGP non-clients', () => {
    const r2 = makeRouter('R2', 65001, '10.0.0.2');
    r2.bgpNetworks = [{ network: '10.0.0.0', mask: '255.0.0.0' }];
    r2.bgpNeighbors = [{ ip: '10.0.0.4', as: 65000, state: 'Established' }];

    const rr = makeRouter('RR', 65000, '10.0.0.4');
    rr.bgpNeighbors = [{ ip: '10.0.0.2', as: 65001, state: 'Established' }];
    addPort(rr, 'gi0/1', '10.0.1.4');
    rr.bgpNeighbors.push({ ip: '10.0.1.1', as: 65000, state: 'Established' });
    rr.dynamicRoutes = [
      { destination: '10.0.0.0', subnetMask: '255.0.0.0', nextHop: '10.0.0.2', metric: 0, type: 'dynamic', code: 'B', administrativeDistance: 20, asPath: '65001 i' },
    ];

    const r1 = makeRouter('R1', 65000, '10.0.1.1');
    r1.bgpNeighbors = [{ ip: '10.0.1.4', as: 65000, state: 'Established' }];

    const states = new Map([['R1', r1], ['R2', r2], ['RR', rr]]);
    recalculateBgpNeighbors(states);
    const learned = calculateBgpRoutes('R1', states);
    expect(learned.find(r => r.destination === '10.0.0.0')).toBeDefined();
  });
});