import { describe, it, expect } from 'vitest';
import { detectEtherChannelBundles } from '@/lib/network/etherchannel';
import { CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState, Port, SwitchModel, SwitchLayer, SecurityConfig, Vlan, CableType } from '@/lib/network/types';
import type { CommandContext } from '@/lib/network/core/commandTypes';
import { cmdNoSwitchport } from '@/lib/network/core/interface/cmd.switchport';
import { cmdIpAddress } from '@/lib/network/core/interface/cmd.ipAddress';

describe('EtherChannel Detection', () => {
  const createMockSwitchState = (ports: Record<string, Partial<Port>>, overrides: Partial<SwitchState> = {}): SwitchState => {
    const baseState: SwitchState = {
      hostname: 'sw',
      macAddress: '00:00:00:00:00:00',
      switchModel: 'NS-L2-24TT-L' as SwitchModel,
      switchLayer: 'L2' as SwitchLayer,
      currentMode: 'privileged',
      commandHistory: [],
      ports: Object.fromEntries(
        Object.entries(ports).map(([id, config]) => [
          id,
          {
            id,
            name: id,
            status: 'connected',
            ...config,
          } as Port,
        ])
      ),
      vlans: {} as Record<string, Vlan>,
      security: {} as SecurityConfig,
      runningConfig: [],
      historyIndex: 0,
      bootTime: Date.now(),
      ipRouting: false,
      macAddressTable: [],
      arpCache: [],
      version: { nosVersion: '', modelName: '', serialNumber: '', uptime: '' },
      ...overrides,
    };
    return baseState;
  };

  const createMockConnection = (id: string, srcDev: string, srcPort: string, tgtDev: string, tgtPort: string): CanvasConnection => ({
    id,
    sourceDeviceId: srcDev,
    sourcePort: srcPort,
    targetDeviceId: tgtDev,
    targetPort: tgtPort,
    cableType: 'straight' as CableType,
    active: true,
  });

  it('should detect a basic LACP bundle (active/active)', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
      'Fa0/2': { channelGroup: 1, channelMode: 'active' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
      'Fa0/2': { channelGroup: 1, channelMode: 'active' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundled).toBe(true);
    expect(bundles[0].protocol).toBe('lacp');
    expect(bundles[0].groupId).toBe(1);
    expect(bundles[0].memberConnections).toHaveLength(2);
  });

  it('should detect LACP bundle (active/passive)', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
      'Fa0/2': { channelGroup: 1, channelMode: 'active' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'passive' },
      'Fa0/2': { channelGroup: 1, channelMode: 'passive' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundled).toBe(true);
    expect(bundles[0].protocol).toBe('lacp');
  });

  it('should NOT bundle LACP passive/passive', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'passive' },
      'Fa0/2': { channelGroup: 1, channelMode: 'passive' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'passive' },
      'Fa0/2': { channelGroup: 1, channelMode: 'passive' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundled).toBe(false);
    expect(bundles[0].reason).toContain('Incompatible modes');
  });

  it('should detect a PAgP bundle (desirable/auto)', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'desirable' },
      'Fa0/2': { channelGroup: 1, channelMode: 'desirable' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'auto' },
      'Fa0/2': { channelGroup: 1, channelMode: 'auto' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundled).toBe(true);
    expect(bundles[0].protocol).toBe('pagp');
  });

  it('should detect a static bundle (on/on)', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'on' },
      'Fa0/2': { channelGroup: 1, channelMode: 'on' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'on' },
      'Fa0/2': { channelGroup: 1, channelMode: 'on' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundled).toBe(true);
    expect(bundles[0].protocol).toBe('static');
  });

  it('should NOT bundle if group IDs mismatch', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'on' },
      'Fa0/2': { channelGroup: 1, channelMode: 'on' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 2, channelMode: 'on' },
      'Fa0/2': { channelGroup: 2, channelMode: 'on' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(0);
  });

  it('should NOT bundle if mode mismatch within the bundle on one side', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
      'Fa0/2': { channelGroup: 1, channelMode: 'on' }, // Mode mismatch on sw1
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
      'Fa0/2': { channelGroup: 1, channelMode: 'active' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
      createMockConnection('c2', 'sw1', 'Fa0/2', 'sw2', 'Fa0/2'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].bundled).toBe(false);
    expect(bundles[0].reason).toBe('Mode mismatch within bundle');
  });

  it('should NOT detect a bundle for a single connection', () => {
    const sw1State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
    });
    const sw2State = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'active' },
    });

    const connections = [
      createMockConnection('c1', 'sw1', 'Fa0/1', 'sw2', 'Fa0/1'),
    ];

    const deviceStates = new Map<string, SwitchState>([
      ['sw1', sw1State],
      ['sw2', sw2State],
    ]);

    const bundles = detectEtherChannelBundles(connections, deviceStates);
    expect(bundles).toHaveLength(0);
  });

  it('should support Routed EtherChannel (no switchport & IP assignment) on L3 Switch', () => {
    const l3SwState = createMockSwitchState({
      'Fa0/1': { channelGroup: 1, channelMode: 'on' },
      'Fa0/2': { channelGroup: 1, channelMode: 'on' },
    }, {
      switchModel: 'NS-L3-24PS' as SwitchModel,
      switchLayer: 'L3' as SwitchLayer,
      currentMode: 'interface',
      currentInterface: 'po1',
    });

    // Execute "no switchport" on interface port-channel 1
    const noSwResult = cmdNoSwitchport(l3SwState, 'no switchport', {} as CommandContext);
    expect(noSwResult.success).toBe(true);
    expect(noSwResult.newState?.ports?.po1?.mode).toBe('routed');
    expect(noSwResult.newState?.ports?.['Fa0/1']?.mode).toBe('routed');

    // Execute "ip address 10.1.1.1 255.255.255.0" on interface port-channel 1
    const stateWithRoutedPo = { ...l3SwState, ports: { ...l3SwState.ports, ...noSwResult.newState?.ports } };
    const ipResult = cmdIpAddress(stateWithRoutedPo, 'ip address 10.1.1.1 255.255.255.0', {} as CommandContext);
    expect(ipResult.success).toBe(true);
    expect(ipResult.newState?.ports?.po1?.ipAddress).toBe('10.1.1.1');
    expect(ipResult.newState?.ports?.po1?.subnetMask).toBe('255.255.255.0');
  });
});
