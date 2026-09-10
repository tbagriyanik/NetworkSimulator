import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateZbf, clearZbfSessions } from '@/lib/network/forwarding/zbfEngine';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState, Port } from '@/lib/network/types';

function createMockPort(id: string, zoneMember?: string): Port {
  return {
    id,
    name: id,
    status: 'connected',
    vlan: 1,
    mode: 'routed',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    zoneMember,
  };
}

describe('zbfEngine (NetSim Zone-Based Policy Firewall & Stateful Inspection)', () => {
  beforeEach(() => {
    clearZbfSessions();
  });

  it('skips ZBF check if ports have no security zones assigned', () => {
    const state: SwitchState = createInitialState();
    const p1 = createMockPort('Gi0/0');
    const p2 = createMockPort('Gi0/1');

    const res = evaluateZbf(state, p1, p2, '10.0.0.1', '10.0.0.2', 'tcp');
    expect(res.action).toBe('skip');
    expect(res.permitted).toBe(true);
  });

  it('permits intra-zone traffic between interfaces in the same zone', () => {
    const state: SwitchState = createInitialState();
    const p1 = createMockPort('Gi0/0', 'INSIDE');
    const p2 = createMockPort('Gi0/1', 'INSIDE');

    const res = evaluateZbf(state, p1, p2, '10.0.0.1', '10.0.0.2', 'tcp');
    expect(res.action).toBe('pass');
    expect(res.permitted).toBe(true);
  });

  it('drops inter-zone traffic by default when no zone-pair is configured', () => {
    const state: SwitchState = createInitialState();
    const pInside = createMockPort('Gi0/0', 'INSIDE');
    const pOutside = createMockPort('Gi0/1', 'OUTSIDE');

    const res = evaluateZbf(state, pInside, pOutside, '10.0.0.50', '8.8.8.8', 'tcp');
    expect(res.action).toBe('drop');
    expect(res.permitted).toBe(false);
  });

  it('permits forward traffic and statefully allows return traffic with inspect policy', () => {
    const state: SwitchState = createInitialState();
    state.zones = ['INSIDE', 'OUTSIDE'];
    state.zonePairs = [
      {
        name: 'ZP_IN_OUT',
        sourceZone: 'INSIDE',
        destinationZone: 'OUTSIDE',
        action: 'inspect',
      },
    ];

    const pInside = createMockPort('Gi0/0', 'INSIDE');
    const pOutside = createMockPort('Gi0/1', 'OUTSIDE');

    // 1. Forward Packet (Inside -> Outside)
    const forwardRes = evaluateZbf(state, pInside, pOutside, '192.168.1.10', '93.184.216.34', 'tcp', 49152, 80);
    expect(forwardRes.permitted).toBe(true);
    expect(forwardRes.action).toBe('inspect');
    expect(forwardRes.sessionCreated).toBe(true);

    // 2. Return Packet (Outside -> Inside) without reverse zone-pair
    const returnRes = evaluateZbf(state, pOutside, pInside, '93.184.216.34', '192.168.1.10', 'tcp', 80, 49152);
    expect(returnRes.permitted).toBe(true);
    expect(returnRes.action).toBe('inspect');
    expect(returnRes.reason).toContain('Stateful Return Traffic');
  });
});
