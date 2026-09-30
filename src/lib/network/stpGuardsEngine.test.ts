// src/lib/network/stpGuardsEngine.test.ts
import { describe, it, expect } from 'vitest';
import type { Port } from './types';
import { evaluateStpGuards } from './stpGuardsEngine';

function makePort(overrides?: Partial<Port>): Port {
  return {
    id: '1',
    shutdown: false,
    bpduFilter: false,
    portfast: false,
    bpduGuard: false,
    rootGuard: false,
    loopGuard: false,
    ...overrides,
  } as Port;
}

describe('STP Guard Engine - Loop Guard', () => {
  it('blocks port when loopGuard enabled and no BPDU received', () => {
    const port = makePort({ loopGuard: true });
    const result = evaluateStpGuards(port, undefined);
    expect(result.action).toBe('BLOCK_LOOP');
    expect(result.reason).toContain('No BPDU received');
  });

  it('does nothing when loopGuard disabled even if no BPDU', () => {
    const port = makePort({ loopGuard: false });
    const result = evaluateStpGuards(port, undefined);
    expect(result.action).toBe('NONE');
  });

  it('does nothing when loopGuard enabled but BPDU present', () => {
    const port = makePort({ loopGuard: true });
    const incoming = { rootBridgeId: '00:00:00:00:00:01', rootPathCost: 0, isSuperior: false };
    const result = evaluateStpGuards(port, incoming);
    expect(result.action).toBe('NONE');
  });
});
