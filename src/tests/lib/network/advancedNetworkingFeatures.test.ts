import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { runFhrpElection, getGlbpVirtualMac } from '@/lib/network/fhrp';
import { calculateEigrp6Routes } from '@/lib/network/eigrp-dual';
import { SwitchState } from '@/lib/network/types';

function createMockState(overrides?: Partial<SwitchState>): SwitchState {
  return {
    hostname: 'Router1',
    macAddress: '0001.0002.0003',
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    deviceType: 'router',
    currentMode: 'privileged',
    ports: {
      'gi0/0': {
        id: 'gi0/0',
        name: 'GigabitEthernet0/0',
        status: 'connected',
        vlan: 1,
        mode: 'routed',
        duplex: 'auto',
        speed: 'auto',
        shutdown: false,
        type: 'gigabitethernet',
        ipAddress: '10.0.0.1',
        subnetMask: '255.255.255.0',
        ipv6Address: '2001:db8:1::1/64'
      },
      'gi0/1': {
        id: 'gi0/1',
        name: 'GigabitEthernet0/1',
        status: 'connected',
        vlan: 1,
        mode: 'routed',
        duplex: 'auto',
        speed: 'auto',
        shutdown: false,
        type: 'gigabitethernet',
        ipAddress: '192.168.1.1',
        subnetMask: '255.255.255.0'
      }
    },
    vlans: {},
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'] },
      vtyLines: { login: false, transportInput: ['all'] }
    },
    runningConfig: [],
    commandHistory: [],
    historyIndex: 0,
    version: {
      nosVersion: '15.2',
      modelName: 'NS-R-4331',
      serialNumber: 'SN12345',
      uptime: '1 hour'
    },
    macAddressTable: [],
    arpCache: [],
    bootTime: Date.now(),
    ipRouting: true,
    ...overrides
  };
}

describe('Advanced Networking Features', () => {
  describe('EIGRP for IPv6', () => {
    it('configures ipv6 router eigrp globally and on interface', () => {
      let state = createMockState();
      let res = executeCommand(state, 'configure terminal');
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'ipv6 router eigrp 100');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.eigrp6Config?.as).toBe('100');

      res = executeCommand(state, 'exit');
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'interface gi0/0');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.currentMode).toBe('interface');
      expect(state.currentInterface).toBe('gi0/0');

      res = executeCommand(state, 'ipv6 eigrp 100');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.ports['gi0/0'].ipv6Eigrp?.enabled).toBe(true);
    });

    it('calculates IPv6 EIGRP routes', () => {
      const state1 = createMockState({
        eigrp6Config: { as: '100' },
        ports: {
          'gi0/0': {
            id: 'gi0/0',
            name: 'GigabitEthernet0/0',
            status: 'connected',
            vlan: 1,
            mode: 'routed',
            duplex: 'auto',
            speed: 'auto',
            shutdown: false,
            type: 'gigabitethernet',
            ipv6Address: '2001:db8:1::1/64',
            ipv6LinkLocal: 'FE80::1',
            ipv6Eigrp: { enabled: true, as: '100' }
          }
        }
      });

      const state2 = createMockState({
        hostname: 'Router2',
        eigrp6Config: { as: '100' },
        ports: {
          'gi0/0': {
            id: 'gi0/0',
            name: 'GigabitEthernet0/0',
            status: 'connected',
            vlan: 1,
            mode: 'routed',
            duplex: 'auto',
            speed: 'auto',
            shutdown: false,
            type: 'gigabitethernet',
            ipv6Address: '2001:db8:1::2/64',
            ipv6LinkLocal: 'FE80::2',
            ipv6Eigrp: { enabled: true, as: '100' }
          },
          'gi0/1': {
            id: 'gi0/1',
            name: 'GigabitEthernet0/1',
            status: 'connected',
            vlan: 1,
            mode: 'routed',
            duplex: 'auto',
            speed: 'auto',
            shutdown: false,
            type: 'gigabitethernet',
            ipv6Address: '2001:db8:2::1/64'
          }
        }
      });

      const deviceMap = new Map<string, SwitchState>([
        ['r1', state1],
        ['r2', state2]
      ]);

      const routes = calculateEigrp6Routes('r1', deviceMap);
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.some(r => r.destination.includes('2001:db8:2::1'))).toBe(true);
    });
  });

  describe('Prefix-list & Route-map', () => {
    it('configures ip prefix-list and displays it', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      let res = executeCommand(state, 'ip prefix-list MYLIST seq 10 permit 10.0.0.0/8 ge 16 le 24');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      expect(state.prefixLists?.['MYLIST']).toBeDefined();
      expect(state.prefixLists?.['MYLIST'][0].prefix).toBe('10.0.0.0/8');
      expect(state.prefixLists?.['MYLIST'][0].ge).toBe(16);

      res = executeCommand(state, 'do show ip prefix-list');
      expect(res.success).toBe(true);
      expect(res.output).toContain('MYLIST');
      expect(res.output).toContain('10.0.0.0/8');
    });

    it('configures route-map with match and set subcommands', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      let res = executeCommand(state, 'route-map PBR_MAP permit 10');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.currentMode).toBe('config-route-map');

      res = executeCommand(state, 'match ip address prefix-list MYLIST');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'set metric 100');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'do show route-map');
      expect(res.success).toBe(true);
      expect(res.output).toContain('PBR_MAP');
      expect(res.output).toContain('prefix-list MYLIST');
      expect(res.output).toContain('metric 100');
    });
  });

  describe('GLBP (Gateway Load Balancing Protocol)', () => {
    it('generates virtual MACs correctly', () => {
      const mac1 = getGlbpVirtualMac(1, 1);
      expect(mac1).toBe('0007.b400.0101');
      const mac2 = getGlbpVirtualMac(10, 2);
      expect(mac2).toBe('0007.b400.0a02');
    });

    it('configures GLBP on interface and runs election', () => {
      let state1 = createMockState();
      state1 = { ...state1, ...executeCommand(state1, 'configure terminal').newState };
      state1 = { ...state1, ...executeCommand(state1, 'interface gi0/0').newState };
      state1 = { ...state1, ...executeCommand(state1, 'glbp 1 ip 192.168.1.254').newState };
      state1 = { ...state1, ...executeCommand(state1, 'glbp 1 priority 120').newState };

      let state2 = createMockState({
        hostname: 'Router2',
        ports: {
          'gi0/0': {
            id: 'gi0/0',
            name: 'GigabitEthernet0/0',
            status: 'connected',
            vlan: 1,
            mode: 'routed',
            duplex: 'auto',
            speed: 'auto',
            shutdown: false,
            type: 'gigabitethernet',
            ipAddress: '10.0.0.2',
            subnetMask: '255.255.255.0'
          }
        }
      });
      state2 = { ...state2, ...executeCommand(state2, 'configure terminal').newState };
      state2 = { ...state2, ...executeCommand(state2, 'interface gi0/0').newState };
      state2 = { ...state2, ...executeCommand(state2, 'glbp 1 ip 192.168.1.254').newState };
      state2 = { ...state2, ...executeCommand(state2, 'glbp 1 priority 100').newState };

      const map = new Map<string, SwitchState>([
        ['r1', state1],
        ['r2', state2]
      ]);

      const result = runFhrpElection(map);
      const resState1 = result.get('r1');
      const resState2 = result.get('r2');

      expect(resState1?.ports['gi0/0'].glbp?.groups?.[1].state).toBe('Active');
      expect(resState2?.ports['gi0/0'].glbp?.groups?.[1].state).toBe('Standby');
      expect(resState1?.ports['gi0/0'].glbp?.groups?.[1].avgMac).toBe('0007.b400.0101');
    });
  });

  describe('Loop Guard & NetFlow', () => {
    it('configures STP loopguard globally and per interface', () => {
      let state = createMockState({ switchLayer: 'L3', deviceType: 'switchL3', switchModel: 'NS-L3-24PS' });
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      let res = executeCommand(state, 'spanning-tree loopguard default');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.loopguardDefault).toBe(true);

      res = executeCommand(state, 'interface gi0/0');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'spanning-tree guard loop');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.ports['gi0/0'].spanningTree?.loopguard).toBe('enable');
    });

    it('configures NetFlow export and interface monitoring', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      let res = executeCommand(state, 'ip flow-export destination 10.0.0.100 2055');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.netflowConfig?.exportDestination).toBe('10.0.0.100');

      res = executeCommand(state, 'interface gi0/0');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };

      res = executeCommand(state, 'ip flow ingress');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.ports['gi0/0'].netflowIngress).toBe(true);

      res = executeCommand(state, 'do show ip flow export');
      expect(res.success).toBe(true);
      expect(res.output).toContain('10.0.0.100');

      res = executeCommand(state, 'do show ip cache flow');
      expect(res.success).toBe(true);
      expect(res.output).toContain('IP packet size distribution');
    });

    it('disables NetFlow per-interface with no command', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };
      state = { ...state, ...executeCommand(state, 'interface gi0/0').newState };

      let res = executeCommand(state, 'ip flow ingress');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.ports['gi0/0'].netflowIngress).toBe(true);

      res = executeCommand(state, 'no ip flow ingress');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.ports['gi0/0'].netflowIngress).toBe(false);
    });

    it('removes route-map and prefix-list with no commands', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      let res = executeCommand(state, 'ip prefix-list MYLIST seq 10 permit 10.0.0.0/8');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      res = executeCommand(state, 'no ip prefix-list MYLIST');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.prefixLists?.['MYLIST']).toBeUndefined();

      res = executeCommand(state, 'route-map RM permit 10');
      state = { ...state, ...res.newState };
      state = { ...state, ...executeCommand(state, 'exit').newState };
      res = executeCommand(state, 'no route-map RM');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.routeMaps?.['RM']).toBeUndefined();
    });
  });

  describe('QoS MQC (class-map / policy-map / set / police)', () => {
    it('creates class-map and policy-map', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      let res = executeCommand(state, 'class-map match-any VOICE');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.qosClassMaps?.['VOICE']?.match).toBe('any');

      res = executeCommand(state, 'policy-map QOS');
      expect(res.success).toBe(true);
      state = { ...state, ...res.newState };
      expect(state.qosPolicyMaps?.['QOS']).toBeDefined();
    });

    it('associates class with policy and applies set dscp / police', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };

      executeCommand(state, 'class-map match-any VOICE');
      state = { ...state, ...executeCommand(state, 'class-map match-any VOICE').newState };
      state = { ...state, ...executeCommand(state, 'policy-map QOS').newState };

      const resClass = executeCommand(state, 'class VOICE');
      expect(resClass.success).toBe(true);
      state = { ...state, ...resClass.newState };

      const resSet = executeCommand(state, 'set dscp ef');
      expect(resSet.success).toBe(true);
      state = { ...state, ...resSet.newState };

      const resPolice = executeCommand(state, 'police rate 1000000');
      expect(resPolice.success).toBe(true);
      state = { ...state, ...resPolice.newState };

      const policy = state.qosPolicyMaps?.['QOS'];
      expect(policy?.classes?.['VOICE']?.setDscp).toBe('ef');
      expect(policy?.classes?.['VOICE']?.policeRate).toBe(1000000);
    });

    it('shows policy-map and class-map details', () => {
      let state = createMockState();
      state = { ...state, ...executeCommand(state, 'configure terminal').newState };
      state = { ...state, ...executeCommand(state, 'class-map match-any VOICE').newState };
      state = { ...state, ...executeCommand(state, 'policy-map QOS').newState };
      state = { ...state, ...executeCommand(state, 'class VOICE').newState };
      state = { ...state, ...executeCommand(state, 'set dscp ef').newState };

      const resShow = executeCommand(state, 'do show policy-map');
      expect(resShow.success).toBe(true);
      expect(resShow.output).toContain('QOS');
      expect(resShow.output).toContain('VOICE');
      expect(resShow.output).toContain('ef');

      const resShowClass = executeCommand(state, 'do show class-map');
      expect(resShowClass.success).toBe(true);
      expect(resShowClass.output).toContain('VOICE');
    });
  });
});
