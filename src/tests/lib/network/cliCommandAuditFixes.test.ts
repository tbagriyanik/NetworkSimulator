import { describe, it, expect } from 'vitest';
import { parseCommand, validateCommand } from '../../../lib/network/parser';
import { executeCommand } from '../../../lib/network/executor';
import { createInitialState } from '../../../lib/network/initialState';
import { SwitchState } from '../../../lib/network/types';

describe('CLI Command Audit Fixes Tests', () => {
  const createBaseState = (): SwitchState => {
    const base = createInitialState('Router-Test', 'NS-L3-24PS');
    return {
      ...base,
      currentMode: 'privileged',
      ipRouting: true,
      routingProtocol: 'ospf',
      ospfProcessId: '1',
      ospfRouterId: '10.0.0.1',
      ports: {
        ...base.ports,
        'GigabitEthernet0/0': {
          id: 'gigabitethernet0/0',
          name: 'GigabitEthernet0/0',
          status: 'connected',
          vlan: 1,
          mode: 'routed',
          duplex: 'auto',
          speed: 'auto',
          shutdown: false,
          type: 'gigabitethernet',
          ipAddress: '192.168.1.1',
          subnetMask: '255.255.255.0',
          ospfArea: '0'
        }
      }
    };
  };

  describe('1. EIGRP bandwidth-percent', () => {
    it('should parse and execute ip bandwidth-percent eigrp', () => {
      const state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gigabitethernet0/0';

      const parsed = parseCommand('ip bandwidth-percent eigrp 100 50', 'interface');
      expect(parsed).not.toBeNull();
      if (parsed) {
        const validation = validateCommand(parsed, 'interface');
        expect(validation.valid).toBe(true);
      }

      const res = executeCommand(state, 'ip bandwidth-percent eigrp 100 50');
      expect(res.success).toBe(true);
      const portKey = Object.keys(res.newState?.ports || {}).find(k => k.toLowerCase() === 'gigabitethernet0/0') || 'GigabitEthernet0/0';
      expect(res.newState?.ports?.[portKey]?.eigrpBandwidthPercent?.['100']).toBe(50);
    });

    it('should parse and execute no ip bandwidth-percent eigrp', () => {
      const state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gigabitethernet0/0';

      const res = executeCommand(state, 'no ip bandwidth-percent eigrp 100');
      expect(res.success).toBe(true);
    });
  });

  describe('2. EIGRP summary-address', () => {
    it('should parse and execute ip summary-address eigrp', () => {
      const state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gigabitethernet0/0';

      const parsed = parseCommand('ip summary-address eigrp 100 10.0.0.0 255.0.0.0 50', 'interface');
      expect(parsed).not.toBeNull();
      if (parsed) {
        const validation = validateCommand(parsed, 'interface');
        expect(validation.valid).toBe(true);
      }

      const res = executeCommand(state, 'ip summary-address eigrp 100 10.0.0.0 255.0.0.0 50');
      expect(res.success).toBe(true);
      const portKey = Object.keys(res.newState?.ports || {}).find(k => k.toLowerCase() === 'gigabitethernet0/0') || 'GigabitEthernet0/0';
      expect(res.newState?.ports?.[portKey]?.eigrpSummaryAddresses?.length).toBe(1);
      expect(res.newState?.ports?.[portKey]?.eigrpSummaryAddresses?.[0]).toEqual({
        as: 100,
        ip: '10.0.0.0',
        mask: '255.0.0.0',
        distance: 50
      });
    });

    it('should parse and execute no ip summary-address eigrp', () => {
      const state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gigabitethernet0/0';

      const res = executeCommand(state, 'no ip summary-address eigrp 100 10.0.0.0 255.0.0.0');
      expect(res.success).toBe(true);
    });
  });

  describe('3. clear ip ospf process', () => {
    it('should parse and execute clear ip ospf process', () => {
      const state = createBaseState();
      state.dynamicRoutes = [
        { destination: '10.1.1.0', network: '10.1.1.0', subnetMask: '255.255.255.0', nextHop: '192.168.1.2', type: 'dynamic', code: 'O' }
      ];

      const parsed = parseCommand('clear ip ospf process', 'privileged');
      expect(parsed).not.toBeNull();
      if (parsed) {
        const validation = validateCommand(parsed, 'privileged');
        expect(validation.valid).toBe(true);
      }

      const res = executeCommand(state, 'clear ip ospf process');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Reset OSPF process');
      expect(res.newState?.dynamicRoutes?.length).toBe(0);
    });
  });

  describe('4 & 5. OSPF authentication & area authentication', () => {
    it('should configure ip ospf authentication-key on interface', () => {
      const state = createBaseState();
      state.currentMode = 'interface';
      state.currentInterface = 'gigabitethernet0/0';

      const res = executeCommand(state, 'ip ospf authentication-key secret123');
      expect(res.success).toBe(true);
      const portKey = Object.keys(res.newState?.ports || {}).find(k => k.toLowerCase() === 'gigabitethernet0/0') || 'GigabitEthernet0/0';
      expect(res.newState?.ports?.[portKey]?.ospfAuthKey).toBe('secret123');
    });

    it('should configure area authentication in router ospf mode', () => {
      const state = createBaseState();
      state.currentMode = 'router-config';

      const parsed = parseCommand('area 0 authentication message-digest', 'router-config');
      expect(parsed).not.toBeNull();
      if (parsed) {
        const validation = validateCommand(parsed, 'router-config');
        expect(validation.valid).toBe(true);
      }

      const res = executeCommand(state, 'area 0 authentication message-digest');
      expect(res.success).toBe(true);
      expect(res.newState?.ospfAreaAuth?.['0']).toBe('md5');
    });
  });

  describe('6, 7 & 8. show ip ospf commands', () => {
    it('should run show ip ospf interface', () => {
      const state = createBaseState();
      const res = executeCommand(state, 'show ip ospf interface gigabitethernet0/0');
      expect(res.success).toBe(true);
      expect((res.output || '').toLowerCase()).toContain('gigabitethernet0/0 is up');
      expect(res.output).toContain('Internet Address 192.168.1.1/24');
    });

    it('should run show ip ospf overview', () => {
      const state = createBaseState();
      const res = executeCommand(state, 'show ip ospf');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Routing Process "ospf 1" with ID 10.0.0.1');
    });

    it('should run show ip ospf neighbor detail', () => {
      const state = createBaseState();
      state.dynamicRoutes = [{ destination: '10.0.0.0', subnetMask: '255.0.0.0', nextHop: '192.168.1.2', interface: 'gigabitethernet0/0', type: 'dynamic', code: 'O', area: 0 }];

      const res = executeCommand(state, 'show ip ospf neighbor detail');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Neighbor 10.0.0.2, interface address 192.168.1.2');
      expect(res.output).toContain('State is FULL');
    });
  });

  describe('9. show environment', () => {
    it('should display realistic device environment monitoring table', () => {
      const state = createBaseState();
      const res = executeCommand(state, 'show environment');
      expect(res.success).toBe(true);
      expect(res.output).toContain('Power Supply 1');
      expect(res.output).toContain('System Fan 1');
      expect(res.output).toContain('Chassis Temp');
      expect(res.output).toContain('Normal');
    });
  });
});
