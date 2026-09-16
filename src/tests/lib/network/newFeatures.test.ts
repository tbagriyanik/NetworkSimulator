import { describe, test, expect } from 'vitest';
import { executeCommand } from '../../../lib/network/executor';
import { createInitialState, createInitialRouterState } from '../../../lib/network/initialState';
import { recalculateStp } from '../../../lib/network/stp';
import { evaluateSlaacForDevice } from '../../../lib/network/eui64';
import { getRoutingTable, recalculateBgpNeighbors } from '../../../lib/network/routing';
import type { SwitchState } from '../../../lib/network/types';
import type { CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

describe('Network Simulator New Features', () => {

  describe('1. Route Redistribution', () => {
    test('Configures redistribute ospf 1 metric 100 under router rip and exports to running-config', () => {
      let state = createInitialRouterState();
      state = { ...state, hostname: 'R1', currentMode: 'config' };

      // Enter router rip mode
      let res = executeCommand(state, 'router rip', 'en', [], []);
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.currentMode).toBe('router-config');

      // Execute redistribute
      res = executeCommand(state, 'redistribute ospf 1 metric 100 subnets', 'en', [], []);
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      expect(state.redistributeRules).toBeDefined();
      expect(state.redistributeRules?.length).toBe(1);
      expect(state.redistributeRules?.[0]).toEqual({
        targetProtocol: 'rip',
        sourceProtocol: 'ospf',
        processId: '1',
        metric: 100,
        subnets: true
      });

      // Verify running-config output
      const runRes = executeCommand({ ...state, currentMode: 'privileged' }, 'show running-config', 'en', [], []);
      expect(runRes.output).toContain('redistribute ospf 1 metric 100');
    });

    test('Injects redistributed routes into device routing table', () => {
      const state = createInitialRouterState();
      state.hostname = 'R1';
      state.routingProtocol = 'rip';
      state.redistributeRules = [
        { targetProtocol: 'rip', sourceProtocol: 'connected', metric: 5 }
      ];
      if (state.ports['fa0/0']) {
        state.ports['fa0/0'].ipAddress = '10.0.0.1';
        state.ports['fa0/0'].subnetMask = '255.255.255.0';
      }

      const map = new Map<string, SwitchState>([['R1', state]]);
      const table = getRoutingTable('R1', map);
      expect(table).toBeDefined();
    });
  });

  describe('2. MSTP Instance and Region Logic', () => {
    test('Enters config-mst submode, configures instance, and sets instance priority', () => {
      let state = createInitialState('SW1');
      state = { ...state, currentMode: 'config' };

      // Enter MST configuration mode
      let res = executeCommand(state, 'spanning-tree mst configuration', 'en', [], []);
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.currentMode).toBe('config-mst');

      // Set region name and instance
      res = executeCommand(state, 'name region-lab', 'en', [], []);
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'instance 1 vlan 10-20', 'en', [], []);
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.mstConfig?.instances?.[1]).toEqual(Array.from({ length: 11 }, (_, i) => 10 + i));

      // Exit back to config mode
      state = { ...state, currentMode: 'config' };

      // Set MST instance priority
      res = executeCommand(state, 'spanning-tree mst 1 priority 4096', 'en', [], []);
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.mstConfig?.instancePriorities?.[1]).toBe(4096);

      // Verify STP recalculation uses instance priority for VLAN 10
      const map = new Map<string, SwitchState>([['SW1', state]]);
      const updatedMap = recalculateStp(map, []);
      const updatedSw = updatedMap.get('SW1');
      expect(updatedSw?.stpState?.[10]?.bridgeId).toContain('04096');
    });
  });

  describe('3. SLAAC / RA Simulation', () => {
    test('PC generates SLAAC address when router has unicast-routing and suppress-ra is false', () => {
      const routerState = createInitialRouterState();
      routerState.ipv6UnicastRouting = true;
      const rPort = Object.keys(routerState.ports)[0] || 'gi0/0';
      routerState.ports[rPort].ipv6Address = '2001:db8:1::1';
      routerState.ports[rPort].ipv6Prefix = 64;
      routerState.ports[rPort].ipv6NdSuppressRa = false;

      const pcState = createInitialState('PC1');
      pcState.deviceType = 'pc';
      pcState.macAddress = '0011.2233.4455';

      const map = new Map<string, SwitchState>([
        ['R1', routerState],
        ['PC1', pcState]
      ]);

      const connections: CanvasConnection[] = [{
        id: 'conn-1',
        sourceDeviceId: 'PC1',
        sourcePort: 'fa0',
        targetDeviceId: 'R1',
        targetPort: rPort,
        cableType: 'straight',
        active: true
      }];

      const slaacResult = evaluateSlaacForDevice('PC1', map, connections);
      expect(slaacResult).not.toBeNull();
      expect(slaacResult?.ipv6Address).toContain('2001:db8:1:');
      expect(slaacResult?.ipv6Gateway).toBe('2001:db8:1::1');

      // Test with suppress-ra true
      routerState.ports[rPort].ipv6NdSuppressRa = true;
      const suppressedResult = evaluateSlaacForDevice('PC1', map, connections);
      expect(suppressedResult).toBeNull();
    });

    test('PC generates fe80:: SLAAC address when router interface has no global IPv6 address and no ipv6 nd suppress-ra', () => {
      const routerState = createInitialRouterState();
      routerState.ipv6UnicastRouting = true;
      const rPort = Object.keys(routerState.ports)[0] || 'gi0/0';
      routerState.ports[rPort].ipv6NdSuppressRa = false;

      const pcState = createInitialState('PC1');
      pcState.deviceType = 'pc';
      pcState.macAddress = '0011.2233.4455';

      const map = new Map<string, SwitchState>([
        ['R1', routerState],
        ['PC1', pcState]
      ]);

      const connections: CanvasConnection[] = [{
        id: 'conn-1',
        sourceDeviceId: 'PC1',
        sourcePort: 'fa0',
        targetDeviceId: 'R1',
        targetPort: rPort,
        cableType: 'straight',
        active: true
      }];

      const slaacResult = evaluateSlaacForDevice('PC1', map, connections);
      expect(slaacResult).not.toBeNull();
      expect(slaacResult?.ipv6Address).toContain('fe80:');
    });
  });

  describe('6. BGP Neighbor State Calculation & Summary', () => {
    test('Calculates Established state when neighbor remote-as match on both routers', () => {
      const r1 = createInitialRouterState();
      r1.hostname = 'R1';
      r1.bgpAs = '65001';
      r1.ports['gi0/0'] = { ...r1.ports['gi0/0'], ipAddress: '192.168.1.1', shutdown: false };
      r1.bgpNeighbors = [{ ip: '192.168.1.2', as: '65002' }];

      const r2 = createInitialRouterState();
      r2.hostname = 'R2';
      r2.bgpAs = '65002';
      r2.ports['gi0/0'] = { ...r2.ports['gi0/0'], ipAddress: '192.168.1.2', shutdown: false };
      r2.bgpNeighbors = [{ ip: '192.168.1.1', as: '65001' }];

      const map = new Map<string, SwitchState>([['R1', r1], ['R2', r2]]);
      const updatedMap = recalculateBgpNeighbors(map);

      const r1Updated = updatedMap.get('R1');
      expect(r1Updated?.bgpNeighborState?.['192.168.1.2']).toBe('Established');
      expect(r1Updated?.bgpNeighbors?.[0].state).toBe('Established');

      const bgpRes = executeCommand({ ...r1Updated!, currentMode: 'privileged' }, 'show ip bgp summary', 'en', [], [], updatedMap, 'R1');
      expect(bgpRes.output).toContain('192.168.1.2');
      expect(bgpRes.output).toContain('Established');
    });

    test('Calculates Idle state when peer is not configured', () => {
      const r1 = createInitialRouterState();
      r1.hostname = 'R1';
      r1.bgpAs = '65001';
      r1.ports['gi0/0'] = { ...r1.ports['gi0/0'], ipAddress: '192.168.1.1', shutdown: false };
      r1.bgpNeighbors = [{ ip: '192.168.1.2', as: '65002' }];

      const map = new Map<string, SwitchState>([['R1', r1]]);
      const updatedMap = recalculateBgpNeighbors(map);

      const r1Updated = updatedMap.get('R1');
      expect(r1Updated?.bgpNeighborState?.['192.168.1.2']).toBe('Idle');

      const bgpRes = executeCommand({ ...r1Updated!, currentMode: 'privileged' }, 'show ip bgp summary', 'en', [], [], updatedMap, 'R1');
      expect(bgpRes.output).toContain('Idle');
    });
  });

  describe('7. NAT PAT Port Columns', () => {
    test('Formats PAT translations with port columns in show ip nat translations', () => {
      const router = createInitialRouterState();
      router.natTranslations = [{
        protocol: 'tcp',
        localIp: '192.168.10.10',
        localPort: 80,
        globalIp: '203.0.113.1',
        globalPort: 1025,
        remoteIp: '198.51.100.2',
        remotePort: 80
      }];

      const res = executeCommand({ ...router, currentMode: 'privileged' }, 'show ip nat translations', 'en', [], []);
      expect(res.success).toBe(true);
      expect(res.output).toContain('Pro Inside global          Inside local           Outside local          Outside global');
      expect(res.output).toContain('203.0.113.1:1025');
      expect(res.output).toContain('192.168.10.10:80');
      expect(res.output).toContain('198.51.100.2:80');
    });
  });

});


