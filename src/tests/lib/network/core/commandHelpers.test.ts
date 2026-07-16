import { describe, it, expect, vi } from 'vitest';
import { getPvstUpdate } from '@/lib/network/core/commandHelpers';
import { SwitchState, SecurityConfig } from '@/lib/network/types';
import { CommandContext } from '@/lib/network/core/commandTypes';

vi.mock('@/lib/network/stp', () => ({
  recalculateStp: vi.fn((states: Map<string, SwitchState>) => states),
}));

const defaultSecurity: SecurityConfig = {
  enableSecretEncrypted: false,
  servicePasswordEncryption: false,
  users: [],
  consoleLine: { login: false, transportInput: [] },
  vtyLines: { login: false, transportInput: [] },
};

function mockState(): SwitchState {
  return {
    hostname: 'sw1',
    macAddress: '0011.0000.0000',
    switchModel: 'WS-C2960-24TT-L',
    switchLayer: 'L2',
    currentMode: 'privileged',
    commandHistory: [],
    ports: {},
    vlans: {},
    security: defaultSecurity,
    runningConfig: [],
    historyIndex: 0,
    bootTime: Date.now(),
    ipRouting: false,
    macAddressTable: [],
    arpCache: [],
    version: { nosVersion: '', modelName: '', serialNumber: '', uptime: '' },
  };
}

describe('getPvstUpdate', () => {
  it('should return error when sourceDeviceId is missing', () => {
    const ctx: CommandContext = { deviceStates: new Map(), language: 'en' };
    const result = getPvstUpdate(mockState(), ctx);
    if ('error' in result) {
      expect(result.error.success).toBe(false);
      expect(result.error.error).toContain('Internal error');
    } else {
      expect.fail('Expected error result');
    }
  });

  it('should recalculate STP when sourceDeviceId is present', () => {
    const state = mockState();
    const ctx: CommandContext = {
      deviceStates: new Map([['sw1', state]]),
      sourceDeviceId: 'sw1',
      language: 'en',
      connections: [],
    };
    const result = getPvstUpdate(state, ctx);
    if ('allUpdatedStates' in result) {
      expect(result.allUpdatedStates.get('sw1')).toBeDefined();
      expect(result.myUpdatedState).toBeDefined();
    } else {
      expect.fail('Expected success result');
    }
  });

  it('should return myUpdatedState from the recalculated map', () => {
    const state = mockState();
    const updatedState = mockState();
    updatedState.hostname = 'sw1-updated';
    const ctx: CommandContext = {
      deviceStates: new Map([['sw1', state]]),
      sourceDeviceId: 'sw1',
      language: 'en',
    };
    const result = getPvstUpdate(updatedState, ctx);
    if ('allUpdatedStates' in result) {
      expect(result.allUpdatedStates.size).toBe(1);
      expect(result.myUpdatedState).toBe(result.allUpdatedStates.get('sw1'));
    } else {
      expect.fail('Expected success result');
    }
  });
});
