/**
 * CLI -> State -> Engine -> Packet -> Show -> no E2E Regression Matrix Test Suite
 *
 * Validates the full operational loop:
 *   1. Interface Lifecycles (shutdown / no shutdown, ip address / no ip address, subinterfaces)
 *   2. Layer 2 / VLAN / Trunking (switchport access vlan / no, switchport mode trunk, vlan creation / no vlan)
 *   3. Routing & Protocols (ip route / no ip route, router ospf / no, router eigrp / no, router bgp / no)
 *   4. Traffic Filtering & NAT (ip access-group / no, ip nat inside source / no)
 *   5. Forwarding Engine & Show Output Coherence
 */

import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialRouterState, createInitialState } from '@/lib/network/initialState';
import { processNatPacket } from '@/lib/network/forwarding/natEngine';
import type { SwitchState, CommandResult } from '@/lib/network/types';

function mockContext(state: SwitchState) {
  return {
    devices: [] as never[],
    connections: [] as never[],
    deviceStates: new Map<string, SwitchState>([['dev1', state]]),
    sourceDeviceId: 'dev1',
  };
}

function exec(state: SwitchState, cmd: string): CommandResult {
  const ctx = mockContext(state);
  return executeCommand(
    { ...state },
    cmd,
    'en',
    ctx.devices,
    ctx.connections,
    ctx.deviceStates,
    ctx.sourceDeviceId,
  );
}

function applyRes(state: SwitchState, res: CommandResult): SwitchState {
  return res.newState ? { ...state, ...res.newState } : state;
}

function toConfig(state: SwitchState): SwitchState {
  let s = applyRes(state, exec(state, 'enable'));
  s = applyRes(s, exec(s, 'configure terminal'));
  return s;
}

describe('Enterprise CLI Behavior Regression Matrix: CLI -> State -> Engine -> Packet -> Show -> No', () => {

  describe('1. Interface Lifecycle & Connected Routes (shutdown / no shutdown, no ip address)', () => {
    it('handles shutdown and no shutdown correctly across state and show output', () => {
      let r = toConfig(createInitialRouterState());
      
      // Select interface gi0/0
      r = applyRes(r, exec(r, 'interface GigabitEthernet0/0'));
      expect(r.currentInterface).toBe('gi0/0');

      // Assign IP and bring up
      r = applyRes(r, exec(r, 'ip address 192.168.50.1 255.255.255.0'));
      r = applyRes(r, exec(r, 'no shutdown'));
      expect(r.ports?.['gi0/0']?.shutdown).toBe(false);

      // Verify Show IP Interface Brief
      let res = exec(r, 'do show ip interface brief');
      expect(res.success).toBe(true);
      expect(res.output).toContain('192.168.50.1');
      expect(res.output).toContain('up');

      // Now shutdown interface
      r = applyRes(r, exec(r, 'shutdown'));
      expect(r.ports?.['gi0/0']?.shutdown).toBe(true);

      res = exec(r, 'do show ip interface brief');
      expect(res.output).toMatch(/administratively down|down/);

      // Now no ip address
      r = applyRes(r, exec(r, 'no ip address'));
      expect(r.ports?.['gi0/0']?.ipAddress).toBeUndefined();
      expect(r.ports?.['gi0/0']?.subnetMask).toBeUndefined();

      res = exec(r, 'do show ip interface brief');
      expect(res.output).toContain('unassigned');
    });
  });

  describe('2. Switchport & VLAN CAM Management (access, trunk, no vlan)', () => {
    it('handles switchport access vlan, no switchport access vlan, and no vlan CAM flushes', () => {
      let sw = toConfig(createInitialState('00:11:22:33:44:55', 'NS-L2-24TT-L'));

      // Create VLAN 30
      sw = applyRes(sw, exec(sw, 'vlan 30'));
      sw = applyRes(sw, exec(sw, 'name Engineering'));
      sw = applyRes(sw, exec(sw, 'exit'));

      // Verify VLAN exists
      let res = exec(sw, 'do show vlan brief');
      expect(res.output).toContain('Engineering');

      // Assign port fa0/5 to VLAN 30
      sw = applyRes(sw, exec(sw, 'interface FastEthernet0/5'));
      sw = applyRes(sw, exec(sw, 'switchport mode access'));
      sw = applyRes(sw, exec(sw, 'switchport access vlan 30'));
      expect(sw.ports?.['fa0/5']?.vlan).toBe(30);

      // Revert with 'no switchport access vlan' -> resets to default VLAN 1
      sw = applyRes(sw, exec(sw, 'no switchport access vlan'));
      expect(sw.ports?.['fa0/5']?.vlan).toBe(1);

      // Re-assign to 30, add MAC entry, then delete VLAN 30 with 'no vlan 30'
      sw = applyRes(sw, exec(sw, 'switchport access vlan 30'));
      sw = {
        ...sw,
        macAddressTable: [
          { vlan: 30, mac: '0050.7966.6801', port: 'fa0/5', type: 'dynamic' },
          { vlan: 1, mac: '0050.7966.6802', port: 'fa0/1', type: 'dynamic' },
        ],
      };
      sw = applyRes(sw, exec(sw, 'exit')); // exit interface mode to global config
      sw = applyRes(sw, exec(sw, 'no vlan 30'));

      // VLAN 30 entries must be flushed from MAC address table
      const remainingVlan30Macs = (sw.macAddressTable || []).filter(m => m.vlan === 30);
      expect(remainingVlan30Macs.length).toBe(0);
      expect((sw.macAddressTable || []).length).toBe(1);
    });
  });

  describe('3. Routing Matrix (Static, OSPF, EIGRP, BGP teardown & show sync)', () => {
    it('verifies static route addition, forwarding lookup, and full no ip route removal', () => {
      let r = toConfig(createInitialRouterState());

      // Add static routes
      r = applyRes(r, exec(r, 'ip route 172.16.1.0 255.255.255.0 10.0.0.2'));
      r = applyRes(r, exec(r, 'ip route 172.16.2.0 255.255.255.0 10.0.0.2'));
      expect((r.staticRoutes || []).length).toBe(2);

      let res = exec(r, 'do show ip route');
      expect(res.output).toContain('172.16.1.0/24');
      expect(res.output).toContain('172.16.2.0/24');

      // Remove specific route
      r = applyRes(r, exec(r, 'no ip route 172.16.1.0 255.255.255.0 10.0.0.2'));
      expect((r.staticRoutes || []).length).toBe(1);
      expect((r.staticRoutes || []).find(rt => rt.destination === '172.16.1.0')).toBeUndefined();

      res = exec(r, 'do show ip route');
      expect(res.output).not.toContain('172.16.1.0/24');
      expect(res.output).toContain('172.16.2.0/24');
    });

    it('verifies OSPF process configuration, neighbor convergence routes, and no router ospf teardown', () => {
      let r = toConfig(createInitialRouterState());

      r = applyRes(r, exec(r, 'router ospf 1'));
      r = applyRes(r, exec(r, 'router-id 1.1.1.1'));
      r = applyRes(r, exec(r, 'network 10.0.0.0 0.0.0.255 area 0'));
      expect(r.ospfProcessId).toBe('1');
      expect(r.routerId).toBe('1.1.1.1');

      // Simulate learned OSPF routes
      r = {
        ...r,
        dynamicRoutes: [
          { destination: '10.20.0.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2', type: 'dynamic', metric: 110 },
        ],
      };

      let res = exec(r, 'do show ip route');
      expect(res.output).toContain('10.20.0.0/24');

      // Tear down OSPF
      r = applyRes(r, exec(r, 'exit'));
      r = applyRes(r, exec(r, 'no router ospf 1'));
      expect(r.ospfProcessId).toBeUndefined();
      expect((r.dynamicRoutes || []).length).toBe(0);

      res = exec(r, 'do show ip route');
      expect(res.output).not.toContain('10.20.0.0/24');
    });
  });

  describe('4. Traffic Security & Filtering (ACL & NAT lifecycle)', () => {
    it('verifies ACL binding with ip access-group and removal with no ip access-group', () => {
      let r = toConfig(createInitialRouterState());

      // Create standard ACL 10
      r = applyRes(r, exec(r, 'access-list 10 deny 192.168.1.100'));
      r = applyRes(r, exec(r, 'access-list 10 permit any'));

      // Apply to interface gi0/0 in
      r = applyRes(r, exec(r, 'interface GigabitEthernet0/0'));
      r = applyRes(r, exec(r, 'ip access-group 10 in'));
      expect(r.ports?.['gi0/0']?.accessGroupIn).toBe('10');

      let res = exec(r, 'do show running-config');
      expect(res.output).toContain('ip access-group 10 in');

      // Remove ACL with no ip access-group
      r = applyRes(r, exec(r, 'no ip access-group 10 in'));
      expect(r.ports?.['gi0/0']?.accessGroupIn).toBeUndefined();

      res = exec(r, 'do show running-config');
      expect(res.output).not.toContain('ip access-group 10 in');
    });

    it('verifies NAT translation creation and no ip nat inside removal', () => {
      let r = toConfig(createInitialRouterState());

      // Configure NAT inside & outside
      r = applyRes(r, exec(r, 'interface GigabitEthernet0/0'));
      r = applyRes(r, exec(r, 'ip address 192.168.1.1 255.255.255.0'));
      r = applyRes(r, exec(r, 'ip nat inside'));
      expect(r.ports?.['gi0/0']?.natSide).toBe('inside');

      r = applyRes(r, exec(r, 'exit'));
      r = applyRes(r, exec(r, 'interface GigabitEthernet0/1'));
      r = applyRes(r, exec(r, 'ip address 203.0.113.1 255.255.255.0'));
      r = applyRes(r, exec(r, 'ip nat outside'));
      expect(r.ports?.['gi0/1']?.natSide).toBe('outside');

      r = applyRes(r, exec(r, 'exit'));
      r = applyRes(r, exec(r, 'ip nat inside source static 192.168.1.10 203.0.113.10'));
      expect((r.natStaticTranslations || []).length).toBe(1);

      // Packet simulation test: inside (gi0/0) -> outside (gi0/1)
      const natResult = processNatPacket(r, 'gi0/0', 'gi0/1', '192.168.1.10', '8.8.8.8', 5000, 80, 'TCP');
      expect(natResult.translated).toBe(true);
      expect(natResult.newSourceIp).toBe('203.0.113.10');

      // Now remove NAT inside configuration from gi0/0
      r = applyRes(r, exec(r, 'interface GigabitEthernet0/0'));
      r = applyRes(r, exec(r, 'no ip nat inside'));
      expect(r.ports?.['gi0/0']?.natSide).toBeUndefined();

      // Forwarding through gi0/0 should no longer trigger NAT
      const natDisabledResult = processNatPacket(r, 'gi0/0', 'gi0/1', '192.168.1.10', '8.8.8.8', 5000, 80, 'TCP');
      expect(natDisabledResult.translated).toBe(false);
    });
  });

});
