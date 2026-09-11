import { describe, it, expect, vi } from 'vitest';
import {
  validateNoSwitchportSupport,
  validateIpRoutingSupport,
  validateSviStatus,
  validateIpRoutingEnabled,
  getIpAddressPurpose,
  validateL3SwitchPrerequisites,
} from '@/lib/network/core/L3Validation';
import type { SwitchState } from '@/lib/network/types';

vi.mock('@/lib/network/switchModels', () => ({
  isLayer3Switch: vi.fn((model?: string) => {
    if (!model) return false;
    return model === 'NS-L3-24PS' || model?.toUpperCase().includes('NS-R');
  }),
  isLayer2Switch: vi.fn((model?: string) => {
    if (!model) return false;
    return model === 'NS-L2-24TT-L';
  }),
  isRouterModel: vi.fn((model?: string) => {
    if (!model) return false;
    return model?.toUpperCase().includes('NS-R');
  }),
}));

function makeState(overrides?: Partial<SwitchState>): SwitchState {
  return {
    id: 'SW1',
    hostname: 'SW1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L',
    switchLayer: 'L2',
    currentMode: 'privileged',
    ports: {},
    ...overrides,
  } as SwitchState;
}

describe('validateNoSwitchportSupport', () => {
  it('should allow routed ports on L3 switches', () => {
    const result = validateNoSwitchportSupport('NS-L3-24PS');
    expect(result.valid).toBe(true);
  });

  it('should reject routed ports on L2 switches', () => {
    const result = validateNoSwitchportSupport('NS-L2-24TT-L');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Layer 2 switch');
  });

  it('should allow when model is missing but device is L3 type', () => {
    const result = validateNoSwitchportSupport(undefined, 'switchL3');
    expect(result.valid).toBe(true);
  });

  it('should reject when model is missing and device is not L3', () => {
    const result = validateNoSwitchportSupport(undefined, 'pc');
    expect(result.valid).toBe(false);
  });
});

describe('validateIpRoutingSupport', () => {
  it('should allow ip routing on L3 switches', () => {
    const state = makeState({ switchModel: 'NS-L3-24PS' });
    const result = validateIpRoutingSupport('NS-L3-24PS', state);
    expect(result.valid).toBe(true);
  });

  it('should reject ip routing on L2 switches', () => {
    const state = makeState({ switchModel: 'NS-L2-24TT-L' });
    const result = validateIpRoutingSupport('NS-L2-24TT-L', state);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not support IP routing');
  });

  it('should require reload when sdm prefer configured', () => {
    const state = makeState({ switchModel: 'NS-L3-24PS', sdmPreferConfigured: true, reloaded: false });
    const result = validateIpRoutingSupport('NS-L3-24PS', state);
    expect(result.valid).toBe(false);
    expect(result.requiresReload).toBe(true);
  });

  it('should allow after reload', () => {
    const state = makeState({ switchModel: 'NS-L3-24PS', sdmPreferConfigured: true, reloaded: true });
    const result = validateIpRoutingSupport('NS-L3-24PS', state);
    expect(result.valid).toBe(true);
  });

  it('should allow routers without model', () => {
    const state = makeState({ deviceType: 'router' });
    const result = validateIpRoutingSupport(undefined, state);
    expect(result.valid).toBe(true);
  });
});

describe('validateSviStatus', () => {
  it('should report VLAN not found for missing VLAN', () => {
    const state = makeState({ vlans: {} });
    const result = validateSviStatus(state, 10);
    expect(result.status).toBe('down');
    expect(result.error).toContain('does not exist');
  });

  it('should report no physical ports for VLAN without ports', () => {
    const state = makeState({
      vlans: { '10': { id: 10, name: 'VLAN10', status: 'active', ports: [] } },
      ports: {},
    });
    const result = validateSviStatus(state, 10);
    expect(result.status).toBe('down');
    expect(result.error).toContain('no physical ports');
  });

  it('should report up when active ports exist in VLAN', () => {
    const state = makeState({
      vlans: { '10': { id: 10, name: 'VLAN10', status: 'active', ports: [] } },
      ports: {
        'fa0/1': { id: 'fa0/1', name: 'Port1', accessVlan: 10, shutdown: false, status: 'connected', mode: 'access', vlan: 10, duplex: 'auto', speed: 'auto', type: 'fastethernet' },
      },
    });
    const result = validateSviStatus(state, 10);
    expect(result.status).toBe('up');
    expect(result.activePorts).toEqual(['fa0/1']);
  });

  it('should report down when all ports in VLAN are shutdown', () => {
    const state = makeState({
      vlans: { '10': { id: 10, name: 'VLAN10', status: 'active', ports: [] } },
      ports: {
        'fa0/1': { id: 'fa0/1', name: 'Port1', accessVlan: 10, shutdown: true, status: 'disabled', mode: 'access', vlan: 10, duplex: 'auto', speed: 'auto', type: 'fastethernet' },
      },
    });
    const result = validateSviStatus(state, 10);
    expect(result.status).toBe('down');
    expect(result.error).toContain('No active ports');
  });

  it('should check trunk ports', () => {
    const state = makeState({
      vlans: { '20': { id: 20, name: 'VLAN20', status: 'active', ports: [] } },
      ports: {
        'gi0/1': { id: 'gi0/1', name: 'Trunk', mode: 'trunk', allowedVlans: [20], shutdown: false, status: 'connected', vlan: 1, duplex: 'auto', speed: 'auto', type: 'gigabitethernet' },
      },
    });
    const result = validateSviStatus(state, 20);
    expect(result.status).toBe('up');
    expect(result.activePorts).toEqual(['gi0/1']);
  });

  it('should skip VLAN interfaces in port check', () => {
    const state = makeState({
      vlans: { '10': { id: 10, name: 'VLAN10', status: 'active', ports: [] } },
      ports: {
        'vlan10': { id: 'vlan10', name: 'SVI', type: 'vlan', accessVlan: 10, shutdown: false, vlan: 10, status: 'connected', mode: 'access', duplex: 'auto', speed: 'auto' },
      },
    });
    const result = validateSviStatus(state, 10);
    expect(result.status).toBe('down');
    expect(result.error).toContain('no physical ports');
  });
});

describe('validateIpRoutingEnabled', () => {
  it('should return valid when ip routing is enabled', () => {
    const state = makeState({ ipRouting: true });
    const result = validateIpRoutingEnabled(state);
    expect(result.valid).toBe(true);
  });

  it('should return error when ip routing is not enabled', () => {
    const state = makeState({ ipRouting: false });
    const result = validateIpRoutingEnabled(state);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not enabled');
  });
});

describe('getIpAddressPurpose', () => {
  it('should return unknown for no interface', () => {
    const state = makeState({ switchModel: 'NS-L3-24PS' });
    const result = getIpAddressPurpose(state, undefined);
    expect(result.purpose).toBe('unknown');
  });

  it('should return management for VLAN interface on L2 switch', () => {
    const state = makeState({ switchModel: 'NS-L2-24TT-L' });
    const result = getIpAddressPurpose(state, 'Vlan1');
    expect(result.purpose).toBe('management');
  });

  it('should return both for VLAN interface on L3 switch', () => {
    const state = makeState({ switchModel: 'NS-L3-24PS' });
    const result = getIpAddressPurpose(state, 'Vlan1');
    expect(result.purpose).toBe('both');
  });

  it('should return routing for routed port on L3 switch', () => {
    const state = makeState({
      switchModel: 'NS-L3-24PS',
      ports: {
        'gi0/1': { id: 'gi0/1', name: 'Routed Port', mode: 'routed', vlan: 1, status: 'connected', shutdown: false, duplex: 'auto', speed: 'auto', type: 'gigabitethernet' },
      },
    });
    const result = getIpAddressPurpose(state, 'gi0/1');
    expect(result.purpose).toBe('routing');
  });
});

describe('validateL3SwitchPrerequisites', () => {
  it('should pass all prerequisites for well-configured L3 switch', () => {
    const state = makeState({
      switchModel: 'NS-L3-24PS',
      ipRouting: true,
      ports: {
        'gi0/1': { id: 'gi0/1', name: 'Port1', shutdown: false, type: 'gigabitethernet', vlan: 1, status: 'connected', mode: 'access', duplex: 'auto', speed: 'auto' },
      },
    });
    const result = validateL3SwitchPrerequisites(state);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report errors for missing prerequisites', () => {
    const state = makeState({ switchModel: 'NS-L2-24TT-L' });
    const result = validateL3SwitchPrerequisites(state);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
