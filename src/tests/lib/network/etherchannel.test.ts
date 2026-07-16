import { describe, it, expect } from 'vitest';
import { detectEtherChannelBundles } from '@/lib/network/etherchannel';
import { CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';

describe('EtherChannel Detection', () => {
  const createMockSwitchState = (ports: Record<string, any>): SwitchState => ({
    deviceId: 'sw',
    deviceName: 'sw',
    currentMode: 'privileged',
    commandHistory: [],
    ports: Object.fromEntries(
      Object.entries(ports).map(([id, config]) => [
        id,
        {
          id,
          name: id,
          status: 'online',
          ...config,
        },
      ])
    ),
    vlanTable: {},
    routingProtocol: 'none',
    ipRouting: false,
  } as any);

  const createMockConnection = (id: string, srcDev: string, srcPort: string, tgtDev: string, tgtPort: string): CanvasConnection => ({
    id,
    sourceDeviceId: srcDev,
    sourcePort: srcPort,
    targetDeviceId: tgtDev,
    targetPort: tgtPort,
    active: true,
  } as any);

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
});
