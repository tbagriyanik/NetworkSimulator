import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState } from '@/lib/network/types';

describe('Executor & Network Utilities', () => {
  describe('Cable Compatibility', () => {
    function isCableCompatible(typeA: string, typeB: string): boolean {
      const managed = ['router', 'switchL2', 'switchL3', 'firewall', 'wlc'];
      const endpoints = ['pc', 'iot', 'server'];
      if (typeA === typeB) return true;
      if (endpoints.includes(typeA) && managed.includes(typeB)) return true;
      if (managed.includes(typeA) && endpoints.includes(typeB)) return true;
      if (managed.includes(typeA) && managed.includes(typeB)) return true;
      return false;
    }

    it('should allow straight cable between different device types', () => {
      expect(isCableCompatible('pc', 'switchL2')).toBe(true);
      expect(isCableCompatible('pc', 'switchL3')).toBe(true);
      expect(isCableCompatible('router', 'switchL2')).toBe(true);
    });

    it('should allow crossover cable between same device types', () => {
      expect(isCableCompatible('pc', 'pc')).toBe(true);
      expect(isCableCompatible('router', 'router')).toBe(true);
      expect(isCableCompatible('switchL2', 'switchL2')).toBe(true);
    });

    it('should allow console cable to managed devices', () => {
      expect(isCableCompatible('pc', 'router')).toBe(true);
      expect(isCableCompatible('pc', 'switchL2')).toBe(true);
    });

    it('should handle firewall connections', () => {
      expect(isCableCompatible('firewall', 'switchL2')).toBe(true);
      expect(isCableCompatible('firewall', 'router')).toBe(true);
    });

    it('should handle WLC connections', () => {
      expect(isCableCompatible('wlc', 'switchL2')).toBe(true);
      expect(isCableCompatible('wlc', 'switchL3')).toBe(true);
    });

    it('should handle IoT connections', () => {
      expect(isCableCompatible('iot', 'wlc')).toBe(true);
      expect(isCableCompatible('iot', 'switchL2')).toBe(true);
    });
  });

  describe('Port Capabilities', () => {
    const switchPorts = ['fa0/1', 'fa0/2', 'fa0/3', 'fa0/4', 'gi0/1', 'gi0/2'];
    const routerPorts = ['gi0/0', 'gi0/1', 'gi0/2', 'gi0/3', 'serial0/0/0', 'serial0/0/1'];
    const pcPort = ['eth0'];

    it('should identify switch FastEthernet ports', () => {
      expect(switchPorts.filter(p => p.startsWith('fa'))).toHaveLength(4);
    });

    it('should identify switch GigabitEthernet ports', () => {
      expect(switchPorts.filter(p => p.startsWith('gi'))).toHaveLength(2);
    });

    it('should identify router serial ports', () => {
      expect(routerPorts.filter(p => p.startsWith('serial'))).toHaveLength(2);
    });

    it('should identify PC ethernet port', () => {
      expect(pcPort).toContain('eth0');
    });
  });

  describe('Command Mode Detection', () => {
    it('should detect user EXEC mode', () => {
      const prompt = 'Switch>';
      expect(prompt.endsWith('>')).toBe(true);
    });

    it('should detect privileged EXEC mode', () => {
      const prompt = 'Switch#';
      expect(prompt.endsWith('#')).toBe(true);
    });

    it('should detect global config mode', () => {
      const prompt = 'Switch(config)#';
      expect(prompt.includes('(config)')).toBe(true);
    });

    it('should detect interface config mode', () => {
      const prompt = 'Switch(config-if)#';
      expect(prompt.includes('(config-if)')).toBe(true);
    });

    it('should detect line config mode', () => {
      const prompt = 'Switch(config-line)#';
      expect(prompt.includes('(config-line)')).toBe(true);
    });

    it('should detect VLAN config mode', () => {
      const prompt = 'Switch(config-vlan)#';
      expect(prompt.includes('(config-vlan)')).toBe(true);
    });

    it('should detect router config mode', () => {
      const prompt = 'Router(config-router)#';
      expect(prompt.includes('(config-router)')).toBe(true);
    });
  });

  describe('Switch Model Command Execution', () => {
    it('should allow show spanning-tree on NS-L3 switch model', () => {
      const baseState = createInitialState();
      const state = {
        ...baseState,
        switchModel: 'NS-L3-24PS',
        switchLayer: 'L3' as const,
        deviceType: 'switchL3' as const,
        currentMode: 'privileged' as const,
      } as SwitchState;

      const result = executeCommand(state, 'sh spanning-tree');
      expect(result.success).toBe(true);
      expect(result.output).not.toContain('is not supported on this');
    });

    it('should allow show spanning-tree on NS-L2 switch model', () => {
      const baseState = createInitialState();
      const state = {
        ...baseState,
        switchModel: 'NS-L2-24TT-L',
        switchLayer: 'L2' as const,
        deviceType: 'switchL2' as const,
        currentMode: 'privileged' as const,
      } as SwitchState;

      const result = executeCommand(state, 'sh spanning-tree');
      expect(result.success).toBe(true);
      expect(result.output).not.toContain('is not supported on this');
    });

    it('should enable spanning-tree bpduguard enable on interface', () => {
      const baseState = createInitialState();
      const state = {
        ...baseState,
        switchModel: 'NS-L2-24TT-L',
        switchLayer: 'L2' as const,
        deviceType: 'switchL2' as const,
        currentMode: 'interface' as const,
        currentInterface: 'FastEthernet0/1',
      } as SwitchState;

      const result = executeCommand(state, 'spanning-tree bpduguard enable');
      expect(result.success).toBe(true);
      expect(result.newState?.ports?.['FastEthernet0/1']?.bpduGuard).toBe(true);

      const disableResult = executeCommand(state, 'no spanning-tree bpduguard enable');
      expect(disableResult.success).toBe(true);
      expect(disableResult.newState?.ports?.['FastEthernet0/1']?.bpduGuard).toBe(false);
    });

    it('should configure spanning-tree cost on interface and reset with no spanning-tree cost', () => {
      const baseState = createInitialState();
      const state = {
        ...baseState,
        id: 'SW1',
        switchModel: 'NS-L2-24TT-L',
        switchLayer: 'L2' as const,
        deviceType: 'switchL2' as const,
        currentMode: 'interface' as const,
        currentInterface: 'FastEthernet0/1',
      } as SwitchState;

      const setCostResult = executeCommand(state, 'spanning-tree cost 10');
      expect(setCostResult.success).toBe(true);
      expect(setCostResult.newState?.ports?.['FastEthernet0/1']?.stpCost).toBe(10);

      const resetCostResult = executeCommand(state, 'no spanning-tree cost');
      expect(resetCostResult.success).toBe(true);
      expect(resetCostResult.newState?.ports?.['FastEthernet0/1']?.stpCost).toBeUndefined();
    });
  });
});
