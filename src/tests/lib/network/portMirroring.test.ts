import { describe, it, expect } from 'vitest';
import { setSpanSourceInterface, setSpanDestinationInterface, setSpanRemoteVlan, isSpanActive, getSpanMirrorDestinations } from '@/lib/network/portMirroring';
import type { SwitchState } from '@/lib/network/types';
import { cmdMonitorSession, cmdNoMonitorSession } from '@/lib/network/core/interface/cmd.misc';
import { cmdShowMonitor } from '@/lib/network/core/showCommands';
import { buildRunningConfig } from '@/lib/network/core/configBuilder';
import { runHopPipeline } from '@/lib/network/forwarding/packetPipeline';
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
    const state: SwitchState = {
      currentMode: 'config',
      hostname: 'Switch1',
      deviceType: 'switchL2',
      ports: {},
      spanSessions: {},
    } as any;
    const ctx = { currentMode: 'config', hostname: 'Switch1' } as any;

    const res1 = cmdMonitorSession(state, 'monitor session 1 source interface GigabitEthernet0/1', ctx);
    expect(res1.success).toBe(true);

    const res2 = cmdMonitorSession(state, 'monitor session 1 destination interface GigabitEthernet0/2', ctx);
    expect(res2.success).toBe(true);

    const showRes = cmdShowMonitor(state, 'show monitor', ctx);
    expect(showRes.output).toContain('Session 1');
    expect(showRes.output).toContain('Destination Port       : gigabitethernet0/2');

    const configLines = buildRunningConfig(state);
    expect(configLines).toContain('monitor session 1 source interface gigabitethernet0/1');
    expect(configLines).toContain('monitor session 1 destination interface gigabitethernet0/2');

    const noRes = cmdNoMonitorSession(state, 'no monitor session 1', ctx);
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
    } as any;

    setSpanSourceInterface(state, 1, port1);
    setSpanDestinationInterface(state, 1, port3);

    const frame: any = {
      id: 'frame-1',
      timestamp: Date.now(),
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      srcIp: '10.0.0.1',
      dstIp: '10.0.0.2',
      protocol: 'IP',
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
});

