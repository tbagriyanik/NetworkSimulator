 
import { describe, it, expect } from 'vitest';
import { interfaceHandlers } from '@/lib/network/core/interfaceCommands';
import { SwitchState } from '@/lib/network/types';
import { CommandContext } from '@/lib/network/core/commandTypes';

const mockCtx: CommandContext = {
  language: 'en',
  deviceStates: new Map(),
};

function makeBaseState(overrides: Record<string, any> = {}): SwitchState {
  return {
    hostname: 'SW1',
    macAddress: '00:11:22:33:44:55',
    switchModel: 'NS-L2-24TT-L' as const,
    switchLayer: 'L2' as const,
    currentMode: 'config' as const,
    ports: {
      wlan0: {
        id: 'wlan0', name: 'wlan0', status: 'connected' as const,
        vlan: 1, mode: 'access' as const, duplex: 'auto' as const,
        speed: 'auto' as const, shutdown: false, type: 'fastethernet' as const,
      },
    },
    vlans: {},
    security: {
      enableSecretEncrypted: false, servicePasswordEncryption: false,
      users: [], consoleLine: { login: false, transportInput: [] },
      vtyLines: { login: false, transportInput: [] },
    },
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

describe('interfaceHandlers - WLAN commands', () => {
  describe('cmdWlan', () => {
    it('should create a WLAN and store it in state', () => {
      const state = makeBaseState();
      const result = interfaceHandlers['wlan'](state, 'wlan MyWLAN 1 MySSID', mockCtx);
      expect(result.success).toBe(true);
      const newWlans = result.newState?.wlans;
      expect(newWlans).toBeDefined();
      expect(newWlans!['1']).toEqual({ name: 'MyWLAN', ssid: 'MySSID' });
    });

    it('should update wlan0 interface with the ssid', () => {
      const state = makeBaseState();
      const result = interfaceHandlers['wlan'](state, 'wlan CorpNet 2 CorpSSID', mockCtx);
      expect(result.success).toBe(true);
      const newPorts = result.newState?.ports;
      expect(newPorts).toBeDefined();
      expect(newPorts!['wlan0'].wifi).toBeDefined();
    });

    it('should return error for invalid syntax', () => {
      const state = makeBaseState();
      const result = interfaceHandlers['wlan'](state, 'wlan incomplete', mockCtx);
      expect(result.success).toBe(false);
    });
  });

  describe('cmdNoWlan', () => {
    it('should delete an existing WLAN', () => {
      const state = makeBaseState();
      state.wlans = { '1': { name: 'MyWLAN', ssid: 'MySSID' } };
      const result = interfaceHandlers['no wlan'](state, 'no wlan 1', mockCtx);
      expect(result.success).toBe(true);
      const newWlans = result.newState?.wlans;
      expect(newWlans).toBeDefined();
      expect(newWlans!['1']).toBeUndefined();
    });

    it('should return error when WLAN does not exist', () => {
      const state = makeBaseState();
      state.wlans = {};
      const result = interfaceHandlers['no wlan'](state, 'no wlan 99', mockCtx);
      expect(result.success).toBe(false);
    });

    it('should return error for missing ID', () => {
      const state = makeBaseState();
      const result = interfaceHandlers['no wlan'](state, 'no wlan', mockCtx);
      expect(result.success).toBe(false);
    });
  });
});

describe('interfaceHandlers - previously stubbed interface commands', () => {
  const stateWithInterface = () => makeBaseState({
    currentMode: 'interface' as const,
    currentInterface: 'gi0/1',
    ports: {
      'gi0/1': {
        id: 'gi0/1', name: 'Gi0/1', status: 'connected' as const,
        vlan: 1, mode: 'access' as const, duplex: 'auto' as const,
        speed: 'auto' as const, shutdown: false, type: 'gigabitethernet' as const,
      },
    },
  });

  it('persists EtherChannel protocol and interface timing settings', () => {
    const state = stateWithInterface();
    const protocol = interfaceHandlers['channel-protocol'](state, 'channel-protocol lacp', mockCtx);
    expect(protocol.newState?.ports?.['gi0/1'].channelProtocol).toBe('lacp');

    const carrier = interfaceHandlers['carrier-delay'](state, 'carrier-delay 20', mockCtx);
    expect(carrier.newState?.ports?.['gi0/1'].carrierDelay).toBe(20);

    const interval = interfaceHandlers['load-interval'](state, 'load-interval 60', mockCtx);
    expect(interval.newState?.ports?.['gi0/1'].loadInterval).toBe(60);
  });

  it('persists directed-broadcast and PoE configuration', () => {
    const state = stateWithInterface();
    const broadcast = interfaceHandlers['ip directed-broadcast'](state, 'ip directed-broadcast', mockCtx);
    expect(broadcast.newState?.ports?.['gi0/1'].directedBroadcast).toBe(true);

    const power = interfaceHandlers['power inline consumption'](state, 'power inline consumption 15400', mockCtx);
    expect(power.newState?.ports?.['gi0/1'].powerInline).toEqual({ enabled: true, consumption: 15400 });
  });

  it('persists interface-level OSPF activation: ip ospf <process> area <area>', () => {
    const state = stateWithInterface();
    const ospf = interfaceHandlers['ip ospf area'](state, 'ip ospf 1 area 0', mockCtx);
    expect(ospf.success).toBe(true);
    expect(ospf.newState?.ports?.['gi0/1'].ospfEnabled).toBe(true);
    expect(ospf.newState?.ports?.['gi0/1'].ospfProcessId).toBe('1');
    expect(ospf.newState?.ports?.['gi0/1'].ospfArea).toBe('0');
    expect(ospf.newState?.routingProtocol).toBe('ospf');
    expect(ospf.newState?.ospfAreas).toContain(0);

    const noOspf = interfaceHandlers['no ip ospf area']({ ...makeBaseState(), ...ospf.newState }, 'no ip ospf 1 area 0', mockCtx);
    expect(noOspf.success).toBe(true);
    expect(noOspf.newState?.ports?.['gi0/1'].ospfEnabled).toBe(false);
    expect(noOspf.newState?.ports?.['gi0/1'].ospfArea).toBeUndefined();
  });
});
