 
import { describe, it, expect } from 'vitest';
import { firewallHandlers } from '@/lib/network/core/firewallCommands';
import { SwitchState, SecurityConfig } from '@/lib/network/types';
import { CommandContext } from '@/lib/network/core/commandTypes';

const mockCtx: CommandContext = {
  language: 'en',
  deviceStates: new Map(),
};

function makeBaseState(overrides: Record<string, any> = {}): SwitchState {
  return {
    hostname: 'NS-FW',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L' as const,
    switchLayer: 'L2' as const,
    currentMode: 'config' as const,
    currentInterface: 'gi0/1',
    ports: {
      'gi0/1': {
        id: 'gi0/1', name: 'GigabitEthernet0/1', status: 'connected' as const,
        vlan: 1, mode: 'access' as const, duplex: 'auto' as const,
        speed: 'auto' as const, shutdown: false, type: 'gigabitethernet' as const,
      },
    },
    vlans: {},
    security: {
      enableSecretEncrypted: false, servicePasswordEncryption: false,
      users: [], consoleLine: { login: false, transportInput: [] },
      vtyLines: { login: false, transportInput: [] },
    } as SecurityConfig,
    runningConfig: [],
    commandHistory: [],
    historyIndex: -1,
    version: { nosVersion: '', modelName: '', serialNumber: '', uptime: '' },
    macAddressTable: [],
    arpCache: [],
    bootTime: Date.now(),
    ipRouting: false,
    ...overrides,
  } as SwitchState;
}

describe('firewallHandlers', () => {
  describe('same-security-traffic', () => {
    it('should permit same-security traffic', () => {
      const state = makeBaseState();
      const result = firewallHandlers['same-security-traffic'](state, 'same-security-traffic permit inter-interface', mockCtx);
      expect(result.success).toBe(true);
      expect(result.output).toContain('permitted');
    });
  });

  describe('no same-security-traffic', () => {
    it('should deny same-security traffic', () => {
      const state = makeBaseState();
      const result = firewallHandlers['no same-security-traffic'](state, 'no same-security-traffic permit inter-interface', mockCtx);
      expect(result.success).toBe(true);
      expect(result.output).toContain('denied');
    });
  });

  describe('no nameif', () => {
    it('should remove nameif from current interface', () => {
      const state = makeBaseState({
        ports: {
          'gi0/1': {
            id: 'gi0/1', name: 'GigabitEthernet0/1', status: 'connected' as const,
            vlan: 1, mode: 'access' as const, duplex: 'auto' as const,
            speed: 'auto' as const, shutdown: false, type: 'gigabitethernet' as const,
            nameif: 'inside', securityLevel: 100,
          },
        },
      });
      const result = firewallHandlers['no nameif'](state, 'no nameif', mockCtx);
      expect(result.success).toBe(true);
      const updatedPort = result.newState?.ports?.['gi0/1'];
      expect(updatedPort?.nameif).toBeUndefined();
    });

    it('should return error when no interface selected', () => {
      const state = makeBaseState({ currentInterface: undefined });
      const result = firewallHandlers['no nameif'](state, 'no nameif', mockCtx);
      expect(result.success).toBe(false);
    });
  });

  describe('nameif', () => {
    it('should set nameif on current interface', () => {
      const state = makeBaseState();
      const result = firewallHandlers['nameif'](state, 'nameif inside', mockCtx);
      expect(result.success).toBe(true);
      const updatedPort = result.newState?.ports?.['gi0/1'];
      expect(updatedPort?.nameif).toBe('inside');
    });

    it('should auto-set security level 100 for inside', () => {
      const state = makeBaseState();
      const result = firewallHandlers['nameif'](state, 'nameif inside', mockCtx);
      const updatedPort = result.newState?.ports?.['gi0/1'];
      expect(updatedPort?.securityLevel).toBe(100);
    });

    it('should return error when no interface selected', () => {
      const state = makeBaseState({ currentInterface: undefined });
      const result = firewallHandlers['nameif'](state, 'nameif outside', mockCtx);
      expect(result.success).toBe(false);
    });
  });

  describe('security-level', () => {
    it('should set security level', () => {
      const state = makeBaseState();
      const result = firewallHandlers['security-level'](state, 'security-level 50', mockCtx);
      expect(result.success).toBe(true);
      const updatedPort = result.newState?.ports?.['gi0/1'];
      expect(updatedPort?.securityLevel).toBe(50);
    });

    it('should reject invalid security level', () => {
      const state = makeBaseState();
      const result = firewallHandlers['security-level'](state, 'security-level 999', mockCtx);
      expect(result.success).toBe(false);
    });
  });
});
