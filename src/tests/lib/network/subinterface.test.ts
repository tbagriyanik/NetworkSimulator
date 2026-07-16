import { describe, it, expect } from 'vitest';
import { createInitialRouterState, createInitialState } from '../../../lib/network/initialState';
import { interfaceHandlers } from '../../../lib/network/core/interfaceCommands';
import { CommandContext } from '../../../lib/network/core/commandTypes';

const mockCtx: CommandContext = {
  language: 'en',
  deviceStates: new Map(),
  connections: [],
  sourceDeviceId: 'test-device'
};

describe('Router Subinterfaces', () => {
  it('should create a subinterface', () => {
    const state = createInitialRouterState();
    state.currentMode = 'config';

    const result = interfaceHandlers['interface'](state, 'interface gi0/1.10', mockCtx);
    expect(result.success).toBe(true);
    expect(result.newState?.ports?.['gi0/1.10']).toBeDefined();
    const subPort = result.newState?.ports?.['gi0/1.10'];
    expect(subPort?.isSubinterface).toBe(true);
    expect(subPort?.parentInterface).toBe('gi0/1');
  });

  it('should configure encapsulation dot1q on subinterface', () => {
    let state = createInitialRouterState();
    state.currentMode = 'config';

    // Create subinterface
    let result = interfaceHandlers['interface'](state, 'interface gi0/1.10', mockCtx);
    state = { ...state, ...result.newState, currentMode: 'interface', currentInterface: 'gi0/1.10' };

    result = interfaceHandlers['encapsulation dot1q'](state, 'encapsulation dot1q 10', mockCtx);
    expect(result.success).toBe(true);
    expect(result.newState?.ports?.['gi0/1.10'].dot1qVlan).toBe(10);
  });

  it('should allow IP address on subinterface after encapsulation', () => {
    let state = createInitialRouterState();
    state.currentMode = 'config';

    // Create and configure subinterface
    let result = interfaceHandlers['interface'](state, 'interface gi0/1.10', mockCtx);
    state = { ...state, ...result.newState, currentMode: 'interface', currentInterface: 'gi0/1.10' };
    result = interfaceHandlers['encapsulation dot1q'](state, 'encapsulation dot1q 10', mockCtx);
    state = { ...state, ...result.newState };

    result = interfaceHandlers['ip address'](state, 'ip address 192.168.10.1 255.255.255.0', mockCtx);
    expect(result.success).toBe(true);
    expect(result.newState?.ports?.['gi0/1.10'].ipAddress).toBe('192.168.10.1');
  });

  it('should handle multiple subinterfaces on the same physical port', () => {
    let state = createInitialRouterState();
    state.currentMode = 'config';

    // Subinterface .10
    let result = interfaceHandlers['interface'](state, 'interface gi0/1.10', mockCtx);
    expect(result.success).toBe(true);
    state = { ...state, ...result.newState };

    // Reset mode to config as required by current cmdInterface implementation
    state.currentMode = 'config';

    // Subinterface .20
    result = interfaceHandlers['interface'](state, 'interface gi0/1.20', mockCtx);
    expect(result.success).toBe(true);
    state = { ...state, ...result.newState };

    expect(state.ports['gi0/1.10']).toBeDefined();
    expect(state.ports['gi0/1.20']).toBeDefined();
    expect(state.ports['gi0/1.10'].parentInterface).toBe('gi0/1');
    expect(state.ports['gi0/1.20'].parentInterface).toBe('gi0/1');
  });
});

describe('L3 Switch Trunking', () => {
  it('should require dot1q encapsulation for trunking on L3 switch', () => {
    let state = createInitialState(undefined, 'WS-C3650-24PS');
    state.currentMode = 'config';

    // Select a port
    let result = interfaceHandlers['interface'](state, 'interface gi1/0/1', mockCtx);
    state = { ...state, ...result.newState, currentMode: 'interface', currentInterface: 'gi1/0/1', selectedInterfaces: ['gi1/0/1'] };

    // Try switchport mode trunk without encapsulation
    result = interfaceHandlers['switchport mode'](state, 'switchport mode trunk', mockCtx);
    expect(result.success).toBe(false);
    expect(result.error).toContain('encapsulation is \'Auto\'');
  });

  it('should allow trunk mode after setting encapsulation on L3 switch', () => {
    let state = createInitialState(undefined, 'WS-C3650-24PS');
    state.currentMode = 'config';

    // Select a port
    let result = interfaceHandlers['interface'](state, 'interface gi1/0/1', mockCtx);
    state = { ...state, ...result.newState, currentMode: 'interface', currentInterface: 'gi1/0/1', selectedInterfaces: ['gi1/0/1'] };

    // Set encapsulation
    result = interfaceHandlers['switchport trunk encapsulation'](state, 'switchport trunk encapsulation dot1q', mockCtx);
    expect(result.success).toBe(true);
    // newState contains { ports: ... }
    state = { ...state, ...result.newState };

    // Now try trunk mode
    result = interfaceHandlers['switchport mode'](state, 'switchport mode trunk', mockCtx);
    expect(result.success).toBe(true);
    expect(state.ports['gi1/0/1'].trunkEncapsulation).toBe('dot1q');
    expect(result.newState?.ports?.['gi1/0/1'].mode).toBe('trunk');
  });
});
