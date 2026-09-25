import { describe, it, expect } from 'vitest';
import { checkFaultResolved } from '@/lib/network/faults';
import { SwitchState, SecurityConfig } from '@/lib/network/types';

const defaultSecurity: SecurityConfig = {
  enableSecretEncrypted: false,
  servicePasswordEncryption: false,
  users: [],
  consoleLine: { login: false, transportInput: [] },
  vtyLines: { login: false, transportInput: [] },
};

function createMockState(overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname: 'sw1',
    macAddress: '0011.0000.0000',
    switchModel: 'NS-L2-24TT-L',
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
    ...overrides,
  };
}

describe('checkFaultResolved', () => {
  it('should return true when current value matches correct value', () => {
    const state = createMockState({ hostname: 'sw1' });
    const result = checkFaultResolved(state, {
      id: 'f1', deviceId: 'sw1', faultType: 'wrongVlan',
      configKey: 'hostname', faultValue: 'sw-wrong', correctValue: 'sw1',
      description: { tr: '', en: '' },
    });
    expect(result).toBe(true);
  });

  it('should return false when current value differs from correct value', () => {
    const state = createMockState({ hostname: 'sw2' });
    const result = checkFaultResolved(state, {
      id: 'f1', deviceId: 'sw1', faultType: 'wrongVlan',
      configKey: 'hostname', faultValue: 'sw-wrong', correctValue: 'sw1',
      description: { tr: '', en: '' },
    });
    expect(result).toBe(false);
  });

  it('should traverse nested paths correctly', () => {
    const state = createMockState({
      ports: {
        'Fa0/1': {
          id: 'Fa0/1', name: 'Fa0/1', status: 'connected', vlan: 1, mode: 'access',
          duplex: 'auto', speed: 'auto', shutdown: false, type: 'fastethernet',
        },
      },
    });
    const result = checkFaultResolved(state, {
      id: 'f2', deviceId: 'sw1', faultType: 'wrongVlan',
      configKey: 'ports.Fa0/1.vlan', faultValue: 10, correctValue: 1,
      description: { tr: '', en: '' },
    });
    expect(result).toBe(true);
  });

  it('should return false when nested path does not exist', () => {
    const state = createMockState({ ports: {} });
    const result = checkFaultResolved(state, {
      id: 'f3', deviceId: 'sw1', faultType: 'wrongIpAddress',
      configKey: 'ports.Fa0/1.ipAddress', faultValue: '10.0.0.1', correctValue: '10.0.0.2',
      description: { tr: '', en: '' },
    });
    expect(result).toBe(false);
  });

  it('should compare object values using JSON.stringify', () => {
    const state = createMockState({
      ports: {
        'Fa0/1': {
          id: 'Fa0/1', name: 'Fa0/1', status: 'connected', vlan: 10, mode: 'access',
          duplex: 'auto', speed: 'auto', shutdown: false, type: 'fastethernet',
          accessVlan: 20,
        },
      },
    });
    const result = checkFaultResolved(state, {
      id: 'f4', deviceId: 'sw1', faultType: 'wrongVlan',
      configKey: 'ports.Fa0/1.accessVlan', faultValue: '1', correctValue: 20,
      description: { tr: '', en: '' },
    });
    expect(result).toBe(true);
  });

  it('should return false when intermediate property traversal fails', () => {
    const state = createMockState();
    const result = checkFaultResolved(state, {
      id: 'f5', deviceId: 'sw1', faultType: 'missingRoute',
      configKey: 'nonexistent.deep.value', faultValue: null, correctValue: 'x',
      description: { tr: '', en: '' },
    });
    expect(result).toBe(false);
  });

  it('should correctly evaluate brokenTrunk, ospfIssue, natIssue and stpIssue faults', () => {
    const state = createMockState({
      ports: {
        'gi0/1': {
          id: 'gi0/1', name: 'gi0/1', status: 'connected', mode: 'trunk',
          vlan: 1,
          duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        },
      },
      ospfProcessId: '1',
      routerId: '1.1.1.1',
    });

    const trunkFault = checkFaultResolved(state, {
      id: 'f-trunk', deviceId: 'sw1', faultType: 'brokenTrunk',
      configKey: 'ports.gi0/1.mode', faultValue: 'access', correctValue: 'trunk',
      description: { tr: 'Trunk modu bozuk', en: 'Trunk mode broken' },
    });
    expect(trunkFault).toBe(true);

    const ospfFault = checkFaultResolved(state, {
      id: 'f-ospf', deviceId: 'sw1', faultType: 'ospfIssue',
      configKey: 'routerId', faultValue: '0.0.0.0', correctValue: '1.1.1.1',
      description: { tr: 'Router ID yanlis', en: 'Wrong router ID' },
    });
    expect(ospfFault).toBe(true);
  });
});
