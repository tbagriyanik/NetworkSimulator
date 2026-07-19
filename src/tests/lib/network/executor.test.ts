import { describe, it, expect, vi } from 'vitest';
import { SwitchState, CommandMode } from '@/lib/network/types';
import { getPrompt } from '@/lib/network/executor';

vi.mock('@/lib/network/capabilities', () => ({
  getDeviceCapabilities: vi.fn(() => ({ switching: true, routing: false, firewall: false })),
}));

vi.mock('@/lib/network/switchModels', () => ({
  isRouterModel: vi.fn(() => false),
}));

vi.mock('@/lib/network/initialState', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    getModePrompt: vi.fn(() => ''),
  };
});

vi.mock('@/lib/network/networkUtils', () => ({
  ensureDeviceStatesMap: vi.fn((deviceStates) => deviceStates || new Map()),
}));

vi.mock('@/lib/network/core/iosErrors', () => ({
  IOS_ERRORS: { unknown: 'Unknown command' },
  iosModeError: vi.fn(() => 'Mode error'),
}));

vi.mock('@/components/network/networkTopology.types', () => ({
  CanvasDevice: vi.fn(),
  CanvasConnection: vi.fn(),
}));

describe('Executor Core Functions', () => {
  describe('getPrompt', () => {
    const baseState = {
      hostname: 'SW1',
      macAddress: '00:11:22:33:44:55',
      switchModel: 'WS-C2960-24TT-L' as const,
      switchLayer: 'L2' as const,
      currentMode: 'user' as const,
      ports: {}
    } as const;

    it('should generate user EXEC mode prompt', () => {
      const state = { ...baseState, currentMode: 'user' } as unknown as SwitchState;
      const result = getPrompt(state);
      expect(result).toBe('SW1>');
    });

    it('should generate privileged EXEC mode prompt', () => {
      const state = { ...baseState, currentMode: 'privileged' } as unknown as SwitchState;
      const result = getPrompt(state);
      expect(result).toBe('SW1#');
    });

    it('should generate configuration mode prompt', () => {
      const state = { ...baseState, currentMode: 'config' } as unknown as SwitchState;
      const result = getPrompt(state);
      expect(result).toBe('SW1(config)#');
    });

    it('should generate interface configuration mode prompt', () => {
      const state = { ...baseState, currentMode: 'interface' } as unknown as SwitchState;
      const result = getPrompt(state);
      expect(result).toBe('SW1(config-if)#');
    });

    it('should use default hostname when not set', () => {
      const state = { ...baseState, hostname: '' } as unknown as SwitchState;
      const result = getPrompt(state);
      expect(result).toBe('Switch>');
    });

    it('should handle all command modes', () => {
      const modes: CommandMode[] = ['user', 'privileged', 'config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config', 'dhcp-config', 'ssid-config', 'dot11-config'];
      const expectedPrompts = [
        'SW1>', 'SW1#', 'SW1(config)#', 'SW1(config-if)#', 'SW1(config-if-range)#',
        'SW1(config-line)#', 'SW1(config-vlan)#', 'SW1(config-router)#', 'SW1(dhcp-config)#',
        'SW1(config-ssid)#', 'SW1(config-if)#'
      ];

      modes.forEach((mode, index) => {
        const state = { ...baseState, currentMode: mode } as unknown as SwitchState;
        const result = getPrompt(state);
        expect(result).toBe(expectedPrompts[index]);
      });
    });
  });
});
