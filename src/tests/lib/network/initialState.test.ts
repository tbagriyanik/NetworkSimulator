import { describe, it, expect } from 'vitest';
import {
  getModePrompt,
  normalizePortId,
  createInitialState,
  createInitialRouterState,
  createInitialFirewallState,
  createInitialWLCState,
} from '@/lib/network/initialState';

describe('getModePrompt', () => {
  it('should return user EXEC prompt', () => {
    expect(getModePrompt('user', 'Switch')).toBe('Switch>');
  });

  it('should return privileged EXEC prompt', () => {
    expect(getModePrompt('privileged', 'Switch')).toBe('Switch#');
  });

  it('should return global config prompt', () => {
    expect(getModePrompt('config', 'Router')).toBe('Router(config)#');
  });

  it('should return interface config prompt', () => {
    expect(getModePrompt('interface', 'Switch')).toBe('Switch(config-if)#');
  });

  it('should return interface range prompt', () => {
    expect(getModePrompt('config-if-range', 'Switch')).toBe('Switch(config-if-range)#');
  });

  it('should return VLAN config prompt', () => {
    expect(getModePrompt('vlan', 'Switch')).toBe('Switch(config-vlan)#');
  });

  it('should return line config prompt', () => {
    expect(getModePrompt('line', 'Router')).toBe('Router(config-line)#');
  });

  it('should return standard NACL prompt', () => {
    expect(getModePrompt('config-std-nacl', 'Router')).toBe('Router(config-std-nacl)#');
  });

  it('should return extended NACL prompt', () => {
    expect(getModePrompt('config-ext-nacl', 'Router')).toBe('Router(config-ext-nacl)#');
  });

  it('should return router config prompt', () => {
    expect(getModePrompt('router-config', 'Router')).toBe('Router(config-router)#');
  });

  it('should return AP config prompt', () => {
    expect(getModePrompt('ap-config', 'AP')).toBe('AP(config-ap)#');
  });

  it('should default to user prompt for unknown modes', () => {
    expect(getModePrompt('unknown-mode' as never, 'Switch')).toBe('Switch>');
  });
});

describe('normalizePortId', () => {
  it('should normalize GigabitEthernet long form', () => {
    expect(normalizePortId('GigabitEthernet0/1')).toBe('gi0/1');
  });

  it('should normalize "gig 0/1" shorthand', () => {
    expect(normalizePortId('gig 0/1')).toBe('gi0/1');
  });

  it('should normalize FastEthernet long form', () => {
    expect(normalizePortId('FastEthernet0/1')).toBe('fa0/1');
  });

  it('should normalize "fa0/1" shorthand', () => {
    expect(normalizePortId('FA0/1')).toBe('fa0/1');
  });

  it('should normalize "f0/1" single letter prefix', () => {
    expect(normalizePortId('f0/1')).toBe('fa0/1');
  });

  it('should normalize "g0/1" single letter prefix', () => {
    expect(normalizePortId('g0/1')).toBe('gi0/1');
  });

  it('should normalize three-part port GigabitEthernet1/0/1', () => {
    expect(normalizePortId('GigabitEthernet1/0/1')).toBe('gi1/0/1');
  });

  it('should normalize three-part serial port with "Se" prefix', () => {
    expect(normalizePortId('Se0/0/0')).toBe('s0/0/0');
  });

  it('should normalize two-part serial to three-part', () => {
    expect(normalizePortId('S0/0')).toBe('s0/0/0');
  });

  it('should normalize subinterface Gi0/1.10', () => {
    expect(normalizePortId('Gi0/1.10')).toBe('gi0/1.10');
  });

  it('should normalize subinterface with "g" prefix', () => {
    expect(normalizePortId('g0/1.100')).toBe('gi0/1.100');
  });

  it('should normalize loopback 0', () => {
    expect(normalizePortId('loopback0')).toBe('loopback0');
  });

  it('should normalize "lo 0" as loopback', () => {
    expect(normalizePortId('lo 0')).toBe('loopback0');
  });

  it('should accept wlan0', () => {
    expect(normalizePortId('wlan0')).toBe('wlan0');
  });

  it('should return null for unknown format', () => {
    expect(normalizePortId('xyz123')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(normalizePortId('')).toBeNull();
  });

  it('should handle firewall format GigabitEthernet1/1', () => {
    expect(normalizePortId('GigabitEthernet1/1')).toBe('gi1/1');
  });
});

describe('device state factories (unified contract)', () => {
  const factories = [
    { name: 'createInitialState', make: () => createInitialState(), deviceType: 'switchL2', layer: 'L2', hostname: 'Switch' },
    { name: 'createInitialRouterState', make: () => createInitialRouterState(), deviceType: 'router', layer: 'L3', hostname: 'Router' },
    { name: 'createInitialFirewallState', make: () => createInitialFirewallState(), deviceType: 'firewall', layer: 'FW', hostname: 'asa' },
    { name: 'createInitialWLCState', make: () => createInitialWLCState(), deviceType: 'wlc', layer: 'WLC', hostname: 'WLC' },
  ];

  for (const { name, make, deviceType, layer, hostname } of factories) {
    it(`${name} produces a well-formed, deterministic state`, () => {
      const a = make();
      const b = make();
      expect(a.deviceType).toBe(deviceType);
      expect(a.switchLayer).toBe(layer);
      expect(a.hostname).toBe(hostname);
      expect(a.currentMode).toBe('user');
      expect(a.consoleAuthenticated).toBe(false);
      expect(Object.keys(a.ports).length).toBeGreaterThan(0);
      expect(a.security?.vtyLines?.transportInput).toBeDefined();
      expect(a.bootTime).toBe(1715600000000);
      expect(a.macAddress).toEqual(b.macAddress);
    });

    it(`${name} honors the shared options bag (bootTime)`, () => {
      const state = name === 'createInitialState'
        ? createInitialState(undefined, 'NS-L2-24TT-L', { bootTime: 12345 })
        : name === 'createInitialRouterState'
          ? createInitialRouterState(undefined, { bootTime: 12345 })
          : name === 'createInitialFirewallState'
            ? createInitialFirewallState(undefined, { bootTime: 12345 })
            : createInitialWLCState(undefined, { bootTime: 12345 });
      expect(state.bootTime).toBe(12345);
    });
  }

  it('creates a deterministic physical address per device family when no MAC is given', () => {
    expect(createInitialRouterState().macAddress).not.toBe(createInitialFirewallState().macAddress);
    expect(createInitialFirewallState().macAddress).not.toBe(createInitialWLCState().macAddress);
    expect(createInitialState().macAddress).not.toBe(createInitialRouterState().macAddress);
  });
});
