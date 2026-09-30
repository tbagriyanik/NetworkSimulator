import { describe, it, expect } from 'vitest';
import { bgpBestPath } from './bgpRouting';
import type { Route } from './routingTypes';

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    destination: '10.0.0.0',
    subnetMask: '255.255.255.0',
    nextHop: '1.1.1.1',
    metric: 0,
    type: 'dynamic',
    code: 'B',
    administrativeDistance: 200,
    asPath: '65001',
    localPreference: 100,
    weight: 0,
    ...overrides,
  } as any;
}

describe('bgpBestPath algorithm', () => {
  it('prefers higher weight', () => {
    const r1 = makeRoute({ weight: 10 });
    const r2 = makeRoute({ weight: 5 });
    expect(bgpBestPath(r1, r2, {})).toBe(true);
  });

  it('prefers higher local‑preference', () => {
    const r1 = makeRoute({ localPreference: 200 });
    const r2 = makeRoute({ localPreference: 100 });
    expect(bgpBestPath(r1, r2, {})).toBe(true);
  });

  it('prefers shorter AS‑path when not ignored', () => {
    const r1 = makeRoute({ asPath: '65001 65002' });
    const r2 = makeRoute({ asPath: '65001' });
    expect(bgpBestPath(r1, r2, {})).toBe(false);
  });

  it('ignores AS‑path length when asPathIgnore is true', () => {
    const r1 = makeRoute({ asPath: '65001 65002', weight: 10 });
    const r2 = makeRoute({ asPath: '65001', weight: 5 });
    expect(bgpBestPath(r1, r2, { asPathIgnore: true })).toBe(true);
  });

  it('uses compare‑router‑id as tie‑breaker', () => {
    const r1 = makeRoute({ routerId: '1.1.1.1' });
    const r2 = makeRoute({ routerId: '2.2.2.2' });
    expect(bgpBestPath(r1, r2, { compareRouterId: true })).toBe(true);
  });
});
