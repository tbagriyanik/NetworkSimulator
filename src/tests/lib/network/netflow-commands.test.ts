import { describe, it, expect } from 'vitest';
import { executeCommand } from '@/lib/network/executor';
import { SwitchState } from '@/lib/network/types';
import { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import { captureNetFlow } from '@/lib/network/forwarding/netflowEngine';

function createMockState(overrides?: Partial<SwitchState>): SwitchState {
  return {
    hostname: 'Router1',
    macAddress: '0001.0002.0003',
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    deviceType: 'router',
    currentMode: 'privileged',
    ports: {
      'gi0/0': {
        id: 'gi0/0', name: 'GigabitEthernet0/0', status: 'connected', vlan: 1, mode: 'routed',
        duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        ipAddress: '10.0.0.1', subnetMask: '255.255.255.0'
      },
      'gi0/1': {
        id: 'gi0/1', name: 'GigabitEthernet0/1', status: 'connected', vlan: 1, mode: 'routed',
        duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        ipAddress: '192.168.1.1', subnetMask: '255.255.255.0'
      }
    },
    vlans: {},
    security: {},
    ...overrides
  } as SwitchState;
}

function baseFrame(overrides?: Partial<NetworkPacketFrame>): NetworkPacketFrame {
  return {
    id: 'f1', protocol: 'ICMP', timestamp: 1000,
    srcMac: '00:11:22:33:44:55', dstMac: '66:77:88:99:aa:bb', etherType: '0800',
    srcIp: '10.0.0.10', dstIp: '192.168.1.200', ipProtocol: 1, length: 84,
    info: 'ICMP echo', ...overrides
  } as NetworkPacketFrame;
}

describe('NetFlow Item 10 CLI: Flexible NetFlow', () => {
  it('configures a flow record with match/collect fields and exits the submode', () => {
    let state = createMockState();
    state = { ...state, ...executeCommand(state, 'configure terminal').newState };

    let res = executeCommand(state, 'flow record FLOW_REC');
    expect(res.success).toBe(true);
    state = { ...state, ...res.newState };
    expect(state.currentMode).toBe('config-flow-record');

    state = { ...state, ...executeCommand(state, 'match ipv4 source address').newState };
    state = { ...state, ...executeCommand(state, 'match ipv4 destination address').newState };
    state = { ...state, ...executeCommand(state, 'match ipv4 protocol').newState };
    state = { ...state, ...executeCommand(state, 'match transport source-port').newState };
    state = { ...state, ...executeCommand(state, 'match transport destination-port').newState };
    state = { ...state, ...executeCommand(state, 'collect counter bytes').newState };
    state = { ...state, ...executeCommand(state, 'collect counter packets').newState };

    expect(state.flowRecords?.['FLOW_REC']?.matchFields).toEqual([
      'match ipv4 source address', 'match ipv4 destination address', 'match ipv4 protocol',
      'match transport source-port', 'match transport destination-port'
    ]);
    expect(state.flowRecords?.['FLOW_REC']?.collectFields).toEqual(['collect counter bytes', 'collect counter packets']);

    res = executeCommand(state, 'exit');
    state = { ...state, ...res.newState };
    expect(state.currentMode).toBe('config');
    expect(state.currentFlowRecordName).toBeUndefined();
  });

  it('configures flow exporter and flow monitor submodes', () => {
    let state = createMockState();
    state = { ...state, ...executeCommand(state, 'configure terminal').newState };

    let res = executeCommand(state, 'flow exporter NET_EXP');
    state = { ...state, ...res.newState };
    expect(state.currentMode).toBe('config-flow-exporter');
    state = { ...state, ...executeCommand(state, 'destination 192.168.1.100').newState };
    state = { ...state, ...executeCommand(state, 'transport udp 9995').newState };
    state = { ...state, ...executeCommand(state, 'version 9').newState };
    state = { ...state, ...executeCommand(state, 'template data timeout 300').newState };
    expect(state.flowExporters?.['NET_EXP']).toMatchObject({
      destination: '192.168.1.100', transportPort: 9995, version: 9, templateDataTimeout: 300, transportProtocol: 'udp'
    });

    state = { ...state, ...executeCommand(state, 'exit').newState };
    expect(state.currentMode).toBe('config');

    res = executeCommand(state, 'flow monitor MYMON');
    state = { ...state, ...res.newState };
    expect(state.currentMode).toBe('config-flow-monitor');
    state = { ...state, ...executeCommand(state, 'record FLOW_REC').newState };
    state = { ...state, ...executeCommand(state, 'exporter NET_EXP').newState };
    state = { ...state, ...executeCommand(state, 'cache timeout active 600').newState };
    state = { ...state, ...executeCommand(state, 'cache timeout inactive 30').newState };
    expect(state.flowMonitors?.['MYMON']).toMatchObject({
      record: 'FLOW_REC', exporter: 'NET_EXP', cacheTimeoutActive: 600, cacheTimeoutInactive: 30
    });

    state = { ...state, ...executeCommand(state, 'exit').newState };
    expect(state.currentMode).toBe('config');
  });

  it('removes flow record/exporter/monitor with no commands', () => {
    let state = createMockState();
    state = { ...state, ...executeCommand(state, 'configure terminal').newState };
    state = { ...state, ...executeCommand(state, 'flow record FLOW_REC').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };
    state = { ...state, ...executeCommand(state, 'flow exporter NET_EXP').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };
    state = { ...state, ...executeCommand(state, 'flow monitor MYMON').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };

    state = { ...state, ...executeCommand(state, 'no flow record FLOW_REC').newState };
    expect(state.flowRecords?.['FLOW_REC']).toBeUndefined();
    state = { ...state, ...executeCommand(state, 'no flow exporter NET_EXP').newState };
    expect(state.flowExporters?.['NET_EXP']).toBeUndefined();
    state = { ...state, ...executeCommand(state, 'no flow monitor MYMON').newState };
    expect(state.flowMonitors?.['MYMON']).toBeUndefined();
  });

  it('applies a flexible monitor on the interface with ip flow monitor', () => {
    let state = createMockState();
    state = { ...state, ...executeCommand(state, 'configure terminal').newState };
    state = { ...state, ...executeCommand(state, 'flow monitor MYMON').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };

    let res = executeCommand(state, 'interface gi0/0');
    state = { ...state, ...res.newState };
    res = executeCommand(state, 'ip flow monitor MYMON');
    expect(res.success).toBe(true);
    state = { ...state, ...res.newState };
    expect(state.ports['gi0/0'].flowMonitor).toBe('MYMON');

    res = executeCommand(state, 'no ip flow monitor MYMON');
    state = { ...state, ...res.newState };
    expect(state.ports['gi0/0'].flowMonitor).toBeUndefined();
  });

  it('emits flexible NetFlow configuration into running-config', () => {
    let state = createMockState();
    state = { ...state, ...executeCommand(state, 'configure terminal').newState };
    state = { ...state, ...executeCommand(state, 'flow record FLOW_REC').newState };
    state = { ...state, ...executeCommand(state, 'match ipv4 source address').newState };
    state = { ...state, ...executeCommand(state, 'collect counter bytes').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };
    state = { ...state, ...executeCommand(state, 'flow exporter NET_EXP').newState };
    state = { ...state, ...executeCommand(state, 'destination 192.168.1.100').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };
    state = { ...state, ...executeCommand(state, 'flow monitor MYMON').newState };
    state = { ...state, ...executeCommand(state, 'exporter NET_EXP').newState };
    state = { ...state, ...executeCommand(state, 'exit').newState };

    const res = executeCommand(state, 'do show running-config');
    expect(res.output).toContain('flow record FLOW_REC');
    expect(res.output).toContain(' match ipv4 source address');
    expect(res.output).toContain(' collect counter bytes');
    expect(res.output).toContain('flow exporter NET_EXP');
    expect(res.output).toContain(' destination 192.168.1.100');
    expect(res.output).toContain('flow monitor MYMON');
    expect(res.output).toContain(' exporter NET_EXP');
  });

  it('cmdShowIpFlowExport shows configured exporter and increments counters', () => {
    const state = createMockState();
    state.ports['gi0/0'].netflowIngress = true;
    state.netflowConfig = { exportDestination: '192.168.1.100', exportPort: 2055, version: 5 };
    captureNetFlow(state, baseFrame(), 'gi0/0', ['gi0/1'], 100_000);

    const res = executeCommand(state, 'show ip flow export');
    expect(res.success).toBe(true);
    expect(res.output).toContain('192.168.1.100');
    expect(res.output).toContain('Version 5');
  });

  it('cmdShowIpCacheFlow renders real cached flows', () => {
    const state = createMockState();
    state.currentMode = 'config';
    state.netflowCache = [
      { srcIp: '10.0.0.10', dstIp: '192.168.1.1', proto: '06', srcPort: 5000, dstPort: 443, pkts: 5, bytes: 600, active: 0, lastSeen: Date.now(), srcIf: 'gi0/0', dstIf: 'gi0/1' }
    ];

    const res = executeCommand(state, 'do show ip cache flow');
    expect(res.success).toBe(true);
    expect(res.output).toContain('IP packet size distribution');
    expect(res.output).toContain('10.0.0.10');
    expect(res.output).toContain('192.168.1.1');
    expect(res.output).toContain('5000');
    expect(res.output).toContain('443');
  });
});