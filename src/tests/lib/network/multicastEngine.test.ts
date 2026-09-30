// © Network Simulator – test suite for multicastEngine (v7.1)
// ------------------------------------------------------------
// The suite validates RP fail‑over, IGMP join/leave, source‑tree handling
// and error conditions using Vitest.

import { createMulticastEngine, MulticastEngine, IGMPMessage, RPMessage } from '@/lib/network/multicastEngineFacade';
import type { SwitchState } from '@/lib/network/types/switchState';
import type { Port } from '@/lib/network/types/ports';
import { expect, describe, it, beforeEach } from 'vitest';

// Helper to build a minimal SwitchState with required ports
function buildState(portOverrides?: Partial<Port>[]): SwitchState {
  const basePort: Port = {
    id: 'eth0',
    name: 'eth0',
    status: 'connected',
    vlan: 1,
    mode: 'access',
    duplex: 'full',
    speed: '1000',
    shutdown: false,
    type: 'fastethernet',
    ipAddress: '192.168.1.1',
  };
  const portsArray = portOverrides?.map((o, i) => ({ ...basePort, id: `eth${i}`, name: `eth${i}`, ...o })) ?? [basePort];
  const portsMap: Record<string, Port> = {};
  portsArray.forEach(p => { portsMap[p.name] = p; });
  // Cast to SwitchState – other fields are ignored for the test
  return { ports: portsMap } as unknown as SwitchState;
}

describe('multicastEngine – core behaviours', () => {
  let engine: MulticastEngine;
  beforeEach(() => {
    const state = buildState();
    engine = createMulticastEngine(state);
  });

  it('should join a group on IGMPv2 membership request', () => {
    const join: IGMPMessage = { type: 'join', group: '239.1.1.1', source: '192.168.1.100' };
    const result = engine.processIGMP(join);
    expect(result.success).toBe(true);
    expect(engine.groupMembers('239.1.1.1')).toContain('192.168.1.100');
  });

  it('should leave a group on IGMPv2 leave request', () => {
    const join: IGMPMessage = { type: 'join', group: '239.1.1.2', source: '192.168.1.101' };
    engine.processIGMP(join);
    const leave: IGMPMessage = { type: 'leave', group: '239.1.1.2', source: '192.168.1.101' };
    const result = engine.processIGMP(leave);
    expect(result.success).toBe(true);
    expect(engine.groupMembers('239.1.1.2')).not.toContain('192.168.1.101');
  });

  it('should handle RP fail‑over when primary RP becomes unreachable', () => {
    const primary: RPMessage = { type: 'announce', rp: '10.0.0.1', group: '239.0.0.0' };
    const secondary: RPMessage = { type: 'announce', rp: '10.0.0.2', group: '239.0.0.0' };
    engine.processRP(primary);
    engine.processRP(secondary);
    engine.markRPUnreachable('10.0.0.1');
    const active = engine.activeRP('239.0.0.0');
    expect(active).toBe('10.0.0.2');
  });

  it('should ignore malformed IGMP messages without throwing', () => {

    const badMsg = { foo: 'bar' } as unknown as IGMPMessage;
    const result = engine.processIGMP(badMsg);
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe('string');
  });

  it('should correctly update source‑tree when a new source joins an existing group', () => {
    const join1: IGMPMessage = { type: 'join', group: '239.2.2.2', source: '10.1.1.1' };
    const join2: IGMPMessage = { type: 'join', group: '239.2.2.2', source: '10.1.1.2' };
    engine.processIGMP(join1);
    engine.processIGMP(join2);
    const tree = engine.sourceTree('239.2.2.2');
    expect(tree).toEqual(expect.arrayContaining(['10.1.1.1', '10.1.1.2']));
  });

  it('should prune source‑tree entry when the last member leaves', () => {
    const join: IGMPMessage = { type: 'join', group: '239.3.3.3', source: '10.2.2.2' };
    engine.processIGMP(join);
    const leave: IGMPMessage = { type: 'leave', group: '239.3.3.3', source: '10.2.2.2' };
    engine.processIGMP(leave);
    const tree = engine.sourceTree('239.3.3.3');
    expect(tree).toHaveLength(0);
  });

  it('should fallback to the default RP when no specific RP is advertised', () => {
    const result = engine.activeRP('239.4.4.4');
    expect(result).toBe(engine.defaultRP());
  });

  it('should reject duplicate join requests for the same source/group pair', () => {
    const join: IGMPMessage = { type: 'join', group: '239.5.5.5', source: '10.3.3.3' };
    engine.processIGMP(join);
    const dup = engine.processIGMP(join);
    expect(dup.success).toBe(false);
    expect(dup.error).toContain('duplicate');
  });

  it('should handle rapid join/leave bursts without state corruption', () => {
    const group = '239.6.6.6';
    for (let i = 1; i <= 20; i++) {
      const src = `10.0.0.${i}`;
      engine.processIGMP({ type: 'join', group, source: src });
    }
    for (let i = 1; i <= 20; i++) {
      const src = `10.0.0.${i}`;
      engine.processIGMP({ type: 'leave', group, source: src });
    }
    expect(engine.groupMembers(group)).toHaveLength(0);
  });
});
