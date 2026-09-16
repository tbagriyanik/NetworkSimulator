import { describe, it, expect } from 'vitest';
import { setSpanSourceInterface, setSpanDestinationInterface, setSpanRemoteVlan, isSpanActive, getSpanMirrorDestinations, getRspanDestinationSessions, getRspanSourceVlans } from '@/lib/network/portMirroring';
import type { SwitchState } from '@/lib/network/types';
import { cmdMonitorSession, cmdNoMonitorSession } from '@/lib/network/core/interface/cmd.misc';
import { cmdShowMonitor } from '@/lib/network/core/showCommands';
import type { CommandContext } from '@/lib/network/core/commandTypes';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { runHopPipeline } from '@/lib/network/forwarding/packetPipeline';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('portMirroring (SPAN / RSPAN)', () => {
  it('should register SPAN source and destination interfaces correctly', () => {
    const mockState = {} as SwitchState;

    setSpanSourceInterface(mockState, 1, 'GigabitEthernet0/1');
    setSpanDestinationInterface(mockState, 1, 'GigabitEthernet0/2');

    expect(isSpanActive(mockState, 'GigabitEthernet0/1')).toBe(true);
    expect(isSpanActive(mockState, 'GigabitEthernet0/3')).toBe(false);
    expect(getSpanMirrorDestinations(mockState, 'GigabitEthernet0/1')).toEqual([
      { destinationInterface: 'gigabitethernet0/2', remoteVlan: undefined, type: 'local' }
    ]);
  });

  it('should configure RSPAN source and destination VLANs', () => {
    const mockState = {} as SwitchState;

    setSpanSourceInterface(mockState, 2, 'GigabitEthernet0/1');
    setSpanRemoteVlan(mockState, 2, 99, false);

    expect(isSpanActive(mockState, 'GigabitEthernet0/1')).toBe(true);
    expect(getSpanMirrorDestinations(mockState, 'GigabitEthernet0/1')).toEqual([
      { destinationInterface: undefined, remoteVlan: 99, type: 'rspan-source' }
    ]);
  });

  it('should execute CLI monitor session commands and show monitor output', () => {
    const state: Partial<SwitchState> = {
      currentMode: 'config',
      hostname: 'Switch1',
      deviceType: 'switchL2',
      ports: {},
      spanSessions: {},
    };
    const ctx: CommandContext = { language: 'tr', deviceStates: new Map([[ 'Switch1', state as SwitchState ]]) };

    const res1 = cmdMonitorSession(state as SwitchState, 'monitor session 1 source interface GigabitEthernet0/1', ctx);
    expect(res1.success).toBe(true);

    const res2 = cmdMonitorSession(state as SwitchState, 'monitor session 1 destination interface GigabitEthernet0/2', ctx);
    expect(res2.success).toBe(true);

    const showRes = cmdShowMonitor(state as SwitchState, 'show monitor', ctx);
    expect(showRes.output).toContain('Session 1');
    expect(showRes.output).toContain('Destination Port       : gigabitethernet0/2');

    const configLines = buildRunningConfig(state as SwitchState);
    expect(configLines).toContain('monitor session 1 source interface gigabitethernet0/1');
    expect(configLines).toContain('monitor session 1 destination interface gigabitethernet0/2');

    const noRes = cmdNoMonitorSession(state as SwitchState, 'no monitor session 1', ctx);
    expect(noRes.success).toBe(true);
    expect(state.spanSessions?.[1]).toBeUndefined();
  });

  it('should mirror packets in packetPipeline when SPAN is active', () => {
    const device: CanvasDevice = {
      id: 'sw1',
      name: 'Switch1',
      type: 'switchL2',
      status: 'online',
      ip: '10.0.0.254',
      x: 0,
      y: 0,
      ports: [
        { id: 'gigabitethernet0/1', label: 'Gi0/1', status: 'connected' },
        { id: 'gigabitethernet0/2', label: 'Gi0/2', status: 'connected' },
        { id: 'gigabitethernet0/3', label: 'Gi0/3', status: 'connected' },
      ],
    };
    const port1 = 'gigabitethernet0/1';
    const port2 = 'gigabitethernet0/2';
    const port3 = 'gigabitethernet0/3';

    const state: SwitchState = {
      hostname: 'Switch1',
      deviceType: 'switchL2',
      ports: {
        [port1]: { id: port1, name: port1, type: 'gigabit', shutdown: false, mode: 'access', vlan: 1, status: 'connected' },
        [port2]: { id: port2, name: port2, type: 'gigabit', shutdown: false, mode: 'access', vlan: 1, status: 'connected' },
        [port3]: { id: port3, name: port3, type: 'gigabit', shutdown: false, mode: 'access', vlan: 1, status: 'connected' },
      },
      macAddressTable: [
        { mac: '00:00:00:00:00:02', port: port2, vlan: 1, type: 'dynamic' },
      ],
      spanSessions: {},
    } as unknown as SwitchState;

    setSpanSourceInterface(state, 1, port1);
    setSpanDestinationInterface(state, 1, port3);

    const frame: NetworkPacketFrame = {
      id: 'frame-1',
      timestamp: Date.now(),
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      protocol: 'IPV4',
      etherType: '0x0800',
      length: 64,
      info: 'IP packet',
      vlanId: 1,
      ingressPortId: port1,
    };

    const connections: CanvasConnection[] = [];

    const result = runHopPipeline(0, frame, device, state, [device], connections);
    expect(result.accepted).toBe(true);
    expect(result.egressPorts).toContain(port2);
    expect(result.egressPorts).toContain(port3);

    const mirrorTrace = result.traces.find(t => t.stage === 'span-mirror');
    expect(mirrorTrace).toBeDefined();
    expect(mirrorTrace?.action).toBe('forward');
  });

  it('should resolve RSPAN source VLANs and destination sessions', () => {
    const mockState = {} as SwitchState;

    setSpanSourceInterface(mockState, 1, 'Gi0/1');
    setSpanRemoteVlan(mockState, 1, 100, false);

    setSpanRemoteVlan(mockState, 2, 100, true);
    setSpanDestinationInterface(mockState, 2, 'Gi0/2');

    expect(getRspanSourceVlans(mockState, 'gi0/1')).toEqual([100]);
    expect(getRspanSourceVlans(mockState, 'gi0/9')).toEqual([]);
    expect(getRspanDestinationSessions(mockState, 100)).toEqual([
      { destinationInterface: 'gi0/2', remoteVlan: 100 }
    ]);
    expect(getRspanDestinationSessions(mockState, 200)).toEqual([]);
  });

  it('should forward RSPAN source traffic onto trunk ports carrying the remote VLAN', () => {
    const device: CanvasDevice = {
      id: 'sw1',
      name: 'Switch1',
      type: 'switchL2',
      status: 'online',
      ip: '10.0.0.254',
      x: 0,
      y: 0,
      ports: [
        { id: 'gigabitethernet0/1', label: 'Gi0/1', status: 'connected' },
        { id: 'gigabitethernet0/2', label: 'Gi0/2', status: 'connected' },
        { id: 'gigabitethernet0/3', label: 'Gi0/3', status: 'connected' },
      ],
    };
    const port1 = 'gigabitethernet0/1';
    const port2 = 'gigabitethernet0/2';
    const port3 = 'gigabitethernet0/3';

    const state: SwitchState = {
      hostname: 'Switch1',
      deviceType: 'switchL2',
      ports: {
        [port1]: { id: port1, name: port1, type: 'gigabit', shutdown: false, mode: 'access', vlan: 1, status: 'connected' },
        [port2]: { id: port2, name: port2, type: 'gigabit', shutdown: false, mode: 'trunk', allowedVlans: [100], status: 'connected' },
        [port3]: { id: port3, name: port3, type: 'gigabit', shutdown: false, mode: 'access', vlan: 1, status: 'connected' },
      },
      macAddressTable: [
        { mac: '00:00:00:00:00:02', port: port3, vlan: 1, type: 'dynamic' },
      ],
      spanSessions: {},
    } as unknown as SwitchState;

    setSpanSourceInterface(state, 1, port1);
    setSpanRemoteVlan(state, 1, 100, false);

    const frame: NetworkPacketFrame = {
      id: 'frame-rspan',
      timestamp: Date.now(),
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      protocol: 'IPV4',
      etherType: '0x0800',
      length: 64,
      info: 'IP packet',
      vlanId: 1,
      ingressPortId: port1,
    };

    const result = runHopPipeline(0, frame, device, state, [device], []);
    expect(result.accepted).toBe(true);
    expect(result.egressPorts).toContain(port2);
    const rspanTrace = result.traces.find(t => t.stage === 'span-mirror');
    expect(rspanTrace).toBeDefined();
    expect(rspanTrace?.reason).toContain('remote VLAN 100');
  });

  it('should deliver frames tagged with the RSPAN VLAN to the analyzer port on the destination switch', () => {
    const device: CanvasDevice = {
      id: 'sw2',
      name: 'Switch2',
      type: 'switchL2',
      status: 'online',
      ip: '10.0.0.253',
      x: 0,
      y: 0,
      ports: [
        { id: 'gigabitethernet0/1', label: 'Gi0/1', status: 'connected' },
        { id: 'gigabitethernet0/2', label: 'Gi0/2', status: 'connected' },
      ],
    };
    const port1 = 'gigabitethernet0/1';
    const port2 = 'gigabitethernet0/2';

    const state: SwitchState = {
      hostname: 'Switch2',
      deviceType: 'switchL2',
      ports: {
        [port1]: { id: port1, name: port1, type: 'gigabit', shutdown: false, mode: 'trunk', allowedVlans: [100], status: 'connected' },
        [port2]: { id: port2, name: port2, type: 'gigabit', shutdown: false, mode: 'access', vlan: 1, status: 'connected' },
      },
      spanSessions: {},
    } as unknown as SwitchState;

    setSpanRemoteVlan(state, 1, 100, true);
    setSpanDestinationInterface(state, 1, port2);

    const frame: NetworkPacketFrame = {
      id: 'frame-rspan-dst',
      timestamp: Date.now(),
      srcMac: '00:00:00:00:00:01',
      dstMac: 'ff:ff:ff:ff:ff:ff',
      srcIp: '10.0.1.1',
      dstIp: '10.0.1.2',
      protocol: 'IPV4',
      etherType: '0x0800',
      length: 64,
      info: 'RSPAN mirrored frame',
      vlanId: 100,
      ingressPortId: port1,
    };

    const result = runHopPipeline(0, frame, device, state, [device], []);
    expect(result.accepted).toBe(true);
    expect(result.egressPorts).toContain(port2);
    const rspanTrace = result.traces.find(t => t.stage === 'span-mirror');
    expect(rspanTrace).toBeDefined();
    expect(rspanTrace?.reason).toContain('remote VLAN 100');
  });

  it('should emit RSPAN monitor session lines in running-config', () => {
    const state: Partial<SwitchState> = {
      currentMode: 'config',
      hostname: 'Switch1',
      deviceType: 'switchL2',
      ports: {},
      spanSessions: {},
    };
    const ctx: CommandContext = { language: 'tr', deviceStates: new Map([[ 'Switch1', state as SwitchState ]]) };

    cmdMonitorSession(state as SwitchState, 'monitor session 1 source interface GigabitEthernet0/1', ctx);
    cmdMonitorSession(state as SwitchState, 'monitor session 1 source remote vlan 100', ctx);
    cmdMonitorSession(state as SwitchState, 'monitor session 2 destination remote vlan 100', ctx);
    cmdMonitorSession(state as SwitchState, 'monitor session 2 destination interface GigabitEthernet0/24', ctx);

    const configLines = buildRunningConfig(state as SwitchState);
    expect(configLines).toContain('monitor session 1 source interface gigabitethernet0/1');
    expect(configLines).toContain('monitor session 1 source remote vlan 100');
    expect(configLines).toContain('monitor session 2 destination remote vlan 100');
    expect(configLines).toContain('monitor session 2 destination interface gigabitethernet0/24');
  });
});

