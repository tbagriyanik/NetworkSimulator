import { describe, it, expect } from 'vitest';
import { executeCommand } from '../../../lib/network/executor';
import type { SwitchState, Port } from '../../../lib/network/types';

function createMockState(overrides?: any): SwitchState {
  return {
    hostname: 'Switch1',
    macAddress: '0001.0002.0003',
    switchModel: 'NS-L2-24TT-L',
    switchLayer: 'L2',
    deviceType: 'switch',
    currentMode: 'privileged',
    ports: {
      'FastEthernet0/1': {
        id: 'FastEthernet0/1',
        name: 'FastEthernet0/1',
        status: 'connected',
        vlan: 1,
      },
    },
    vlans: {
      1: { id: 1, name: 'default', status: 'active', ports: ['FastEthernet0/1'] },
    },
    security: {
      servicePasswordEncryption: false,
      users: [],
    },
    ...overrides,
  } as SwitchState;
}

function mergeState(state: SwitchState, newState?: Partial<SwitchState>): SwitchState {
  if (!newState) return state;
  const mergedPorts = { ...state.ports };
  if (newState.ports) {
    for (const [k, v] of Object.entries(newState.ports)) {
      mergedPorts[k] = { ...mergedPorts[k], ...v };
    }
  }
  return {
    ...state,
    ...newState,
    ports: mergedPorts,
  };
}

describe('CLI Stubs & Feature Enhancements', () => {
  it('should configure port security aging time, aging type, and static MACs', () => {
    let state = createMockState({
      currentMode: 'interface',
      currentInterface: 'FastEthernet0/1',
    });

    const r1 = executeCommand(state, 'switchport port-security aging time 15');
    expect(r1.success).toBe(true);
    state = mergeState(state, r1.newState);

    const r2 = executeCommand(state, 'switchport port-security aging type inactivity');
    expect(r2.success).toBe(true);
    state = mergeState(state, r2.newState);

    const r3 = executeCommand(state, 'switchport port-security mac-address 0011.2233.4455');
    expect(r3.success).toBe(true);
    state = mergeState(state, r3.newState);

    const r4 = executeCommand(state, 'switchport port-security mac-address sticky 00aa.bbcc.ddee');
    expect(r4.success).toBe(true);
    state = mergeState(state, r4.newState);

    const port = state.ports['FastEthernet0/1'];
    expect(port?.portSecurity?.aging?.time).toBe(15);
    expect(port?.portSecurity?.aging?.type).toBe('inactivity');
    expect(port?.staticMacs).toContain('0011.2233.4455');
    expect(port?.stickyMacs).toContain('00aa.bbcc.ddee');
  });

  it('should configure switchport protected and switchport block', () => {
    let state = createMockState({
      currentMode: 'interface',
      currentInterface: 'FastEthernet0/1',
    });

    const r1 = executeCommand(state, 'switchport protected');
    expect(r1.success).toBe(true);
    state = mergeState(state, r1.newState);
    expect(state.ports['FastEthernet0/1']?.protected).toBe(true);

    const r2 = executeCommand(state, 'switchport block unicast');
    expect(r2.success).toBe(true);
    state = mergeState(state, r2.newState);
    expect((state.ports['FastEthernet0/1'] as Port & { blockUnicast?: boolean })?.blockUnicast).toBe(true);

    const r3 = executeCommand(state, 'no switchport protected');
    expect(r3.success).toBe(true);
    state = mergeState(state, r3.newState);
    expect(state.ports['FastEthernet0/1']?.protected).toBe(false);
  });

  it('should handle clear line and clear interface commands', () => {
    const state = createMockState({ currentMode: 'privileged' });

    const r1 = executeCommand(state, 'clear line 0');
    expect(r1.success).toBe(true);

    const r2 = executeCommand(state, 'clear interface FastEthernet0/1');
    expect(r2.success).toBe(true);
  });

  it('should handle more command reading configs and files', () => {
    const state = createMockState({ currentMode: 'privileged' });

    const r1 = executeCommand(state, 'more system:running-config');
    expect(r1.success).toBe(true);
    expect(r1.output).toContain('hostname');

    const r2 = executeCommand(state, 'more flash:vlan.dat');
    expect(r2.success).toBe(true);
    expect(r2.output).toContain('vlan.dat');
  });

  it('should configure ip dhcp snooping information option and limit rate', () => {
    let state = createMockState({ currentMode: 'config' });

    // Enable Option 82 globally
    const r1 = executeCommand(state, 'ip dhcp snooping information option');
    expect(r1.success).toBe(true);
    state = mergeState(state, r1.newState);
    expect(state.dhcpOption82).toBe(true);

    // Disable Option 82
    const r2 = executeCommand(state, 'no ip dhcp snooping information option');
    expect(r2.success).toBe(true);
    state = mergeState(state, r2.newState);
    expect(state.dhcpOption82).toBe(false);

    // Set rate limit on interface
    state.currentMode = 'interface';
    state.currentInterface = 'FastEthernet0/1';
    const r3 = executeCommand(state, 'ip dhcp snooping limit rate 25');
    expect(r3.success).toBe(true);
    state = mergeState(state, r3.newState);
    expect(state.ports['FastEthernet0/1']?.dhcpSnoopingLimitRate).toBe(25);

    // Check show output
    state.currentMode = 'privileged';
    const r4 = executeCommand(state, 'show ip dhcp snooping');
    expect(r4.success).toBe(true);
    expect(r4.output).toContain('Insertion of option 82 is disabled');
    expect(r4.output).toContain('25');
  });
});

