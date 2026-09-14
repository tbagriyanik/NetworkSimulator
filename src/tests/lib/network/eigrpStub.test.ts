import { describe, it, expect } from 'vitest';
import { SwitchState } from '../../../lib/network/types';
import { buildEigrpTopologyTable } from '../../../lib/network/eigrp-dual';
import { routerConfigHandlers } from '../../../lib/network/core/routerConfigCommands';

function runRouterCmd(state: SwitchState, input: string) {
  const cmd = input.trim().toLowerCase().startsWith('no') ? 'no eigrp stub' : 'eigrp stub';
  return routerConfigHandlers[cmd](state, input, {} as never);
}

function router(as: string, stubConfig: SwitchState['eigrpStub'] = null) {
  return {
    routingProtocol: 'eigrp',
    eigrpAs: as,
    eigrpStub: stubConfig,
    ports: {} as Record<string, unknown>,
    dynamicRoutes: [] as unknown[],
  } as unknown as SwitchState;
}

function mkPort(id: string, ip: string, mask: string) {
  return {
    id,
    name: id,
    status: 'connected',
    shutdown: false,
    vlan: 1,
    mode: 'access',
    duplex: 'full',
    speed: '100',
    type: 'gigabitethernet',
    ipAddress: ip,
    subnetMask: mask,
  } as unknown as SwitchState['ports'][string];
}

describe('EIGRP Stub Routing', () => {
  it('cmdEigrpStub with no keywords enables connected+summary (Cisco default)', () => {
    const state = router('100');
    const res = runRouterCmd(state, 'eigrp stub');
    expect(res.success).toBe(true);
    expect(res.newState?.eigrpStub).toEqual({ connected: true, summary: true, static: false, redistributed: false, receiveOnly: false });
    expect(res.output).toContain('connected, summary');
  });

  it('cmdEigrpStub accepts connected, summary and receive-only keywords', () => {
    const res = runRouterCmd(router('100'), 'eigrp stub connected summary');
    expect(res.success).toBe(true);
    expect(res.newState?.eigrpStub).toMatchObject({ connected: true, summary: true, receiveOnly: false });

    const resRo = runRouterCmd(router('100'), 'eigrp stub receive-only');
    expect(resRo.success).toBe(true);
    expect(resRo.newState?.eigrpStub).toMatchObject({ receiveOnly: true, connected: false, summary: false });
  });

  it('cmdEigrpStub rejects invalid keywords and no eigrp stub disables it', () => {
    const bad = runRouterCmd(router('100'), 'eigrp stub bogus');
    expect(bad.success).toBe(false);

    const state = router('100');
    runRouterCmd(state, 'eigrp stub connected');
    const disabled = runRouterCmd(state, 'no eigrp stub');
    expect(disabled.success).toBe(true);
    expect(disabled.newState?.eigrpStub).toBeNull();
  });

  it('a stub router (non receive-only) accepts no routes from its neighbors', () => {
    const r1 = router('100');
    r1.ports = { 'gi0/0': mkPort('gi0/0', '10.0.0.1', '255.255.255.252') };

    const r2 = router('100');
    r2.ports = { 'gi0/0': mkPort('gi0/0', '10.0.0.2', '255.255.255.252') };
    r2.dynamicRoutes = [
      { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1', type: 'dynamic', metric: 5000 }
    ];

    const states = new Map<string, SwitchState>([['r1', r1], ['r2', r2]]);
    r1.eigrpStub = { connected: true, summary: true, static: false, redistributed: false, receiveOnly: false };

    // Stub r1 must NOT learn 192.168.1.0 from r2
    const table = buildEigrpTopologyTable('r1', states);
    expect(table.filter(e => e.destination === '192.168.1.0')).toHaveLength(0);
  });

  it("a non-stub neighbor learns the stub's connected networks but not its transit routes", () => {
    const r1 = router('100'); // non-stub
    r1.ports = { 'gi0/0': mkPort('gi0/0', '10.0.0.1', '255.255.255.252') };

    const stubS = router('100');
    stubS.eigrpStub = { connected: true, summary: true, static: false, redistributed: false, receiveOnly: false };
    stubS.ports = {
      'gi0/0': mkPort('gi0/0', '10.0.0.2', '255.255.255.252'),
      'gi0/1': mkPort('gi0/1', '192.168.5.1', '255.255.255.0'),
    };
    stubS.dynamicRoutes = [
      // Stub's own connected network (via network statement) -> advertised
      { destination: '192.168.5.0', subnetMask: '255.255.255.0', nextHop: 'directly connected', type: 'dynamic', metric: 1 },
      // Transit route the stub learned from elsewhere -> MUST NOT be advertised
      { destination: '172.16.0.0', subnetMask: '255.255.0.0', nextHop: '10.9.9.9', type: 'dynamic', metric: 156160 },
    ];

    const states = new Map<string, SwitchState>([['r1', r1], ['stubS', stubS]]);

    const table = buildEigrpTopologyTable('r1', states);
    const dests = table.map(e => e.destination);
    expect(dests).toContain('192.168.5.0');   // stub's own connected network learned
    expect(dests).not.toContain('172.16.0.0'); // transit route filtered
  });

  it('a receive-only stub advertises nothing to its neighbor', () => {
    const r1 = router('100'); // non-stub
    r1.ports = { 'gi0/0': mkPort('gi0/0', '10.0.0.1', '255.255.255.252') };

    const roS = router('100');
    roS.eigrpStub = { connected: false, summary: false, static: false, redistributed: false, receiveOnly: true };
    roS.ports = { 'gi0/0': mkPort('gi0/0', '10.0.0.2', '255.255.255.252') };
    roS.dynamicRoutes = [
      { destination: '192.168.5.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2', type: 'dynamic', metric: 100 } as never,
    ];

    const states = new Map<string, SwitchState>([['r1', r1], ['roS', roS]]);

    const table = buildEigrpTopologyTable('r1', states);
    expect(table).toHaveLength(0);

    // But the receive-only stub itself still learns from its neighbor
    states.set('roS', roS);
    const roTable = buildEigrpTopologyTable('roS', states);
    expect(roTable.some(e => e.destination === '192.168.5.0')).toBe(false);
    // r1 has no dynamic routes; roS still learns r1's connected network 10.0.0.0/30
    expect(roTable.map(e => e.destination)).toContain('10.0.0.0');
    expect(roTable.some(e => e.destination === '192.168.5.0')).toBe(false);
  });
});