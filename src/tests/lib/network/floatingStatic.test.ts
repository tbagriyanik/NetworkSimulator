import { describe, it, expect } from 'vitest';
import { cmdIpRoute, cmdNoIpRoute } from '@/lib/network/core/globalConfigCommands';
import { cmdIpSla, cmdTrack } from '@/lib/network/core/globalConfigNetworkCommands';
import { cmdShowTrack } from '@/lib/network/core/showRoutingDisplay';
import { getRoutingTable, findRoute, isTrackedRouteActive } from '@/lib/network/routing';
import { evaluateIpSlaOperations } from '@/lib/network/ipSlaEngine';
import type { SwitchState } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

function makeBaseState(): SwitchState {
  return {
    hostname: 'R1',
    currentMode: 'config',
    deviceType: 'router',
    ports: {},
  } as unknown as SwitchState;
}

function makeTopology() {
  const devices: CanvasDevice[] = [
    { id: 'r1', name: 'R1', type: 'router', x: 0, y: 0, ip: '192.168.1.1', status: 'online', ports: [] },
    { id: 'r2', name: 'R2', type: 'router', x: 100, y: 0, ip: '192.168.1.2', status: 'online', ports: [] },
  ];
  const connections: CanvasConnection[] = [
    {
      id: 'conn1',
      sourceDeviceId: 'r1',
      sourcePort: 'gi0_0',
      targetDeviceId: 'r2',
      targetPort: 'gi0_0',
      cableType: 'straight',
      active: true,
    },
  ];
  return { devices, connections };
}

describe('Floating Static Routes (IP SLA -> Track -> ip route track)', () => {
  it('cmdIpRoute parses track suffix and stores trackId', () => {
    const ctx = { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext;
    const res = cmdIpRoute(makeBaseState(), 'ip route 0.0.0.0 0.0.0.0 203.0.113.1 track 1', ctx);
    expect(res.success).toBe(true);
    const route = (res.newState?.staticRoutes || [])[0];
    expect(route.destination).toBe('0.0.0.0');
    expect(route.nextHop).toBe('203.0.113.1');
    expect(route.trackId).toBe(1);
    expect(route.type).toBe('static');
  });

  it('cmdIpRoute keeps trackId when combined with administrative distance', () => {
    const ctx = { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext;
    const res = cmdIpRoute(makeBaseState(), 'ip route 10.0.0.0 255.0.0.0 203.0.113.1 250 track 2', ctx);
    expect(res.success).toBe(true);
    const route = (res.newState?.staticRoutes || [])[0];
    expect(route.metric).toBe(250);
    expect(route.trackId).toBe(2);
  });

  it('route with a track object is not installed in the routing table while the track is down or missing', () => {
    let state = makeBaseState();

    // Track 1 will exist but is 'down' initially
    state = { ...state, ...cmdIpRoute(state, 'ip route 0.0.0.0 0.0.0.0 203.0.113.1 track 1', { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext).newState };
    // Track 2 does not exist at all
    state = { ...state, ...cmdIpRoute(state, 'ip route 172.16.0.0 255.255.0.0 203.0.113.1 track 2', { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext).newState };
    // Untracked static route (normal static route, always installed)
    state = { ...state, ...cmdIpRoute(state, 'ip route 10.0.0.0 255.0.0.0 203.0.113.1', { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext).newState };

    // Create track 1 binding an IP SLA that has never succeeded -> 'down'
    state = { ...state, ...cmdTrack(state, 'track 1 ip sla 10 reachability', {} as CommandContext).newState };

    const { devices, connections } = makeTopology();
    const states = new Map<string, SwitchState>([
      ['r1', state],
      ['r2', { hostname: 'R2', currentMode: 'config', ports: {} } as unknown as SwitchState],
    ]);

    const table = getRoutingTable('r1', states, devices, connections);
    const prefixes = table.map(r => r.destination);
    expect(prefixes).not.toContain('0.0.0.0');     // track 1 down -> floating default removed
    expect(prefixes).not.toContain('172.16.0.0');  // track 2 missing -> never installed
    expect(prefixes).toContain('10.0.0.0');        // normal static route unaffected

    // No forwarding decision via the floating default while down
    expect(findRoute('8.8.8.8', table)).toBeNull();
  });

  it('floating static route is installed once the tracked IP SLA becomes reachable (track up)', () => {
    let state = makeBaseState();
    state = { ...state, ...cmdIpRoute(state, 'ip route 0.0.0.0 0.0.0.0 203.0.113.1 track 1', { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext).newState };

    // Configure IP SLA 10 icmp-echo 192.168.1.2 + schedule
    state = { ...state, ...cmdIpSla(state, 'ip sla 10 icmp-echo 192.168.1.2 frequency 10', {} as CommandContext).newState };
    state = { ...state, ...cmdIpSla(state, 'ip sla schedule 10 life forever start-time now', {} as CommandContext).newState };

    state = { ...state, ...cmdTrack(state, 'track 1 ip sla 10 reachability', {} as CommandContext).newState };
    expect(state.ipSlaTracks?.['1']?.state).toBe('down');

    const { devices, connections } = makeTopology();
    const states = new Map<string, SwitchState>([
      ['r1', state],
      ['r2', { hostname: 'R2', currentMode: 'config', ports: {} } as unknown as SwitchState],
    ]);

    // Before probe runs: default route absent
    expect(getRoutingTable('r1', states, devices, connections).some(r => r.destination === '0.0.0.0')).toBe(false);

    // Run the automated IP SLA probe (reachable via R2) -> track flips to up
    const evalRes = evaluateIpSlaOperations(states, devices, connections, Date.now());
    const updated = evalRes.updatedStates.get('r1');
    expect(updated?.ipSlaTracks?.['1']?.state).toBe('up');

    const table = getRoutingTable('r1', evalRes.updatedStates, devices, connections);
    const floating = table.find(r => r.destination === '0.0.0.0');
    expect(floating).toBeDefined();
    expect(floating?.nextHop).toBe('203.0.113.1');
    expect(floating?.trackId).toBe(1);

    // Forwarding decision now resolves via the floating default
    expect(findRoute('8.8.8.8', table)?.nextHop).toBe('203.0.113.1');

    // show track lists the real tracked route
    expect(isTrackedRouteActive(updated!, (table.find(r => r.destination === '0.0.0.0'))!)).toBe(true);
    const showRes = cmdShowTrack(updated!, 'show track 1', {} as CommandContext);
    expect(showRes.success).toBe(true);
    expect(showRes.output).toContain('Reachability is Up');
    expect(showRes.output).toContain('Static IP Route 0.0.0.0/0 via 203.0.113.1');
  });

  it('route is removed again when the tracked object goes down', () => {
    const ctx = { devices: [{ id: 'r1', type: 'router' }], sourceDeviceId: 'r1' } as unknown as CommandContext;
    let state = makeBaseState();
    state = { ...state, ...cmdIpRoute(state, 'ip route 0.0.0.0 0.0.0.0 203.0.113.1 track 1', ctx).newState };
    state = { ...state, ...cmdTrack(state, 'track 1 ip sla 10 reachability', {} as CommandContext).newState };

    const { devices, connections } = makeTopology();
    const states = new Map<string, SwitchState>([['r1', state]]);

    // Simulate the track object going down
    const downState = {
      ...state,
      ipSlaTracks: { '1': { operationId: '10', state: 'down' as const, lastChange: Date.now() } },
    };
    states.set('r1', downState);

    expect(getRoutingTable('r1', states, devices, connections).some(r => r.destination === '0.0.0.0')).toBe(false);

    // no ip route removal still works regardless of track marker
    const noRes = cmdNoIpRoute(state, 'no ip route 0.0.0.0 0.0.0.0', ctx);
    expect(noRes.success).toBe(true);
    expect((noRes.newState?.staticRoutes || []).length).toBe(0);
  });
});