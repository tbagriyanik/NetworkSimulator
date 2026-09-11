import { describe, it, expect, beforeEach } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { createInitialState } from '@/lib/network/initialState';
import type { SwitchState } from '@/lib/network/types';
import { cmdShowLldp } from '@/lib/network/core/showSwitchingDisplay';

describe('LLDP Protocol Implementation', () => {
  let state: SwitchState;

  beforeEach(() => {
    state = createInitialState('TestSwitch', 'NS-L2-24TT-L');
  });

  it('should enable and disable LLDP globally', () => {
    state.currentMode = 'config';

    // Enable LLDP
    let result = executeCommand(state, 'lldp run', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.lldpEnabled).toBe(true);

    // Disable LLDP
    result = executeCommand(state, 'no lldp run', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.lldpEnabled).toBe(false);
  });

  it('should set LLDP timer', () => {
    state.currentMode = 'config';
    let result = executeCommand(state, 'lldp timer 45', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.lldpTimer).toBe(45);
  });

  it('should set LLDP holdtime', () => {
    state.currentMode = 'config';
    let result = executeCommand(state, 'lldp holdtime 150', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.lldpHoldtime).toBe(150);
  });

  it('should set LLDP reinit', () => {
    state.currentMode = 'config';
    let result = executeCommand(state, 'lldp reinit 4', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.lldpReinit).toBe(4);
  });

  it('should configure LLDP transmit and receive on interface', () => {
    state.currentMode = 'interface';
    state.currentInterface = 'fa0/1';

    let result = executeCommand(state, 'lldp transmit', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.ports['fa0/1'].lldpTransmit).toBe(true);

    result = executeCommand(state, 'no lldp transmit', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.ports['fa0/1'].lldpTransmit).toBe(false);

    result = executeCommand(state, 'lldp receive', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.ports['fa0/1'].lldpReceive).toBe(true);

    result = executeCommand(state, 'no lldp receive', 'en', [], []);
    expect(result.success).toBe(true);
    if (result.newState) {
      state = { ...state, ...result.newState };
    }
    expect(state.ports['fa0/1'].lldpReceive).toBe(false);
  });

  it('should render neighbor chassis ID and management IP from topology data', () => {
    const result = cmdShowLldp({ ...state, lldpEnabled: true }, 'show lldp neighbors detail', {
      language: 'en', sourceDeviceId: 'sw1', deviceStates: new Map(),
      devices: [
        { id: 'sw1', type: 'switchL2', name: 'SW1', ports: [], macAddress: '0000.0000.0001' },
        { id: 'r1', type: 'router', name: 'R1', ip: '10.0.0.2', macAddress: '00AA.BBCC.DDEE', ports: [] },
      ] as never,
      connections: [{ id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'r1', targetPort: 'gi0/0' }] as never,
    });
    expect(result.output).toContain('Chassis id: 00AA.BBCC.DDEE');
    expect(result.output).toContain('IP: 10.0.0.2');
    expect(result.output).toContain('System Capabilities: B,R');
    expect(result.output).toContain('NetSim NOS, Router Series Software');
  });

  it('should show device-specific system descriptions', () => {
    const switchResult = cmdShowLldp({ ...state, lldpEnabled: true }, 'show lldp neighbors detail', {
      language: 'en', sourceDeviceId: 'r1', deviceStates: new Map(),
      devices: [
        { id: 'r1', type: 'router', name: 'R1', ports: [], macAddress: '0000.0000.0001' },
        { id: 'sw1', type: 'switchL2', name: 'SW1', ip: '192.168.1.1', macAddress: '00AA.BBCC.DDEE', ports: [] },
      ] as never,
      connections: [{ id: 'c1', sourceDeviceId: 'r1', sourcePort: 'gi0/0', targetDeviceId: 'sw1', targetPort: 'fa0/1' }] as never,
    });
    expect(switchResult.output).toContain('System Capabilities: B');
    expect(switchResult.output).toContain('NetSim NOS, NS-L2 Software');

    const pcResult = cmdShowLldp({ ...state, lldpEnabled: true }, 'show lldp neighbors detail', {
      language: 'en', sourceDeviceId: 'sw1', deviceStates: new Map(),
      devices: [
        { id: 'sw1', type: 'switchL2', name: 'SW1', ports: [], macAddress: '0000.0000.0001' },
        { id: 'pc1', type: 'pc', name: 'PC1', ip: '192.168.1.10', macAddress: '00AA.BBCC.DDEE', ports: [] },
      ] as never,
      connections: [{ id: 'c1', sourceDeviceId: 'sw1', sourcePort: 'fa0/1', targetDeviceId: 'pc1', targetPort: 'eth0' }] as never,
    });
    expect(pcResult.output).toContain('System Capabilities: S');
    expect(pcResult.output).toContain('PC, Generic Workstation');
  });
});
