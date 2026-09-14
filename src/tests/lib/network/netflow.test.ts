import { describe, it, expect } from 'vitest';
import { SwitchState } from '@/lib/network/types';
import { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import { captureNetFlow, ageOutNetflowCache, resolveFramePorts, ipProtocolToProtoString, interfaceTracksFlows } from '@/lib/network/forwarding/netflowEngine';
import { runFullPacketPipeline } from '@/lib/network/forwarding/packetPipeline';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

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

describe('NetFlow Item 10 engine: flow cache capture', () => {
  it('captureNetFlow aggregates consecutive packets into one cache entry', () => {
    const state = createMockState();
    state.ports['gi0/0'].netflowIngress = true;
    state.ports['gi0/0'].netflowEgress = true;
    state.ports['gi0/1'].netflowEgress = true;
    state.netflowConfig = { exportDestination: '192.168.1.100', exportPort: 2055, version: 9 };

    const frame = baseFrame({ srcIp: '10.0.0.10', dstIp: '192.168.1.1', ipProtocol: 6, srcPort: 5000, dstPort: 443, length: 120 });

    captureNetFlow(state, frame, 'gi0/0', ['gi0/1'], 100_000);
    captureNetFlow(state, frame, 'gi0/0', ['gi0/1'], 100_010);

    expect(state.netflowCache?.length).toBe(1);
    const entry = state.netflowCache![0];
    expect(entry.srcIp).toBe('10.0.0.10');
    expect(entry.dstIp).toBe('192.168.1.1');
    expect(entry.proto).toBe('06');
    expect(entry.srcPort).toBe(5000);
    expect(entry.dstPort).toBe(443);
    expect(entry.pkts).toBe(2);
    expect(entry.bytes).toBe(240);
    expect(entry.srcIf).toBe('gi0/0');
    expect(entry.dstIf).toBe('gi0/1');
  });

  it('creates separate cache entries for different 5-tuples', () => {
    const state = createMockState();
    state.ports['gi0/0'].netflowIngress = true;
    state.netflowConfig = { exportDestination: '192.168.1.100' };

    captureNetFlow(state, baseFrame({ srcIp: '10.0.0.10', dstIp: '192.168.1.1', ipProtocol: 6, srcPort: 5000, dstPort: 443 }), 'gi0/0', ['gi0/1'], 100_000);
    captureNetFlow(state, baseFrame({ srcIp: '10.0.0.10', dstIp: '192.168.1.1', ipProtocol: 6, srcPort: 5000, dstPort: 80 }), 'gi0/0', ['gi0/1'], 100_010);
    captureNetFlow(state, baseFrame({ srcIp: '10.0.0.10', dstIp: '192.168.1.1', ipProtocol: 1 }), 'gi0/0', ['gi0/1'], 100_020);

    expect(state.netflowCache?.length).toBe(3);
  });

  it('does not capture when no interface tracks flows', () => {
    const state = createMockState();
    captureNetFlow(state, baseFrame(), 'gi0/0', ['gi0/1'], 100_000);
    expect(state.netflowCache).toBeUndefined();
  });

  it('captures via flexible interfaceTracksFlows when flowMonitor is applied', () => {
    const state = createMockState();
    state.ports['gi0/0'].flowMonitor = 'MYMON';
    const tracking = interfaceTracksFlows(state.ports['gi0/0']);
    expect(tracking.ingress).toBe(true);
    expect(tracking.egress).toBe(true);

    captureNetFlow(state, baseFrame({ ipProtocol: 17, srcPort: 1234, dstPort: 53 }), 'gi0/0', ['gi0/1'], 100_000);
    expect(state.netflowCache?.length).toBe(1);
  });

  it('ageOutNetflowCache drops entries idle longer than the timeout', () => {
    const state = createMockState();
    state.ports['gi0/0'].netflowIngress = true;
    state.netflowConfig = { exportDestination: '192.168.1.100' };
    captureNetFlow(state, baseFrame(), 'gi0/0', ['gi0/1'], 100_000);

    const removed = ageOutNetflowCache(state, 100_000 + 60_000);
    expect(removed).toBe(1);
    expect(state.netflowCache?.length).toBe(0);
    expect(state.netflowConfig?.exportedFlows).toBe(1);
  });
});

describe('NetFlow Item 10 engine: helpers', () => {
  it('maps ip protocol numbers to hex strings', () => {
    expect(ipProtocolToProtoString(1)).toBe('01');
    expect(ipProtocolToProtoString(6)).toBe('06');
    expect(ipProtocolToProtoString(17)).toBe('11');
    expect(ipProtocolToProtoString(89)).toBe('59');
    expect(ipProtocolToProtoString(undefined)).toBe('00');
  });

  it('resolveFramePorts prefers L4 ports and falls back to payload defaults', () => {
    expect(resolveFramePorts(baseFrame({ srcPort: 1000, dstPort: 2000 }))).toEqual({ srcPort: 1000, dstPort: 2000 });
    const dhcp = baseFrame({ dhcpPayload: { messageType: 'discover', clientMac: '00:11:22:33:44:55' } });
    expect(resolveFramePorts(dhcp)).toEqual({ srcPort: 68, dstPort: 67 });
  });
});

describe('NetFlow Item 10 integration: runFullPacketPipeline', () => {
  it('captures flows on routers with ip flow ingress during real forwarding', () => {
    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'SW1', sourcePort: 'Fa0/2', targetDeviceId: 'R1', targetPort: 'Gi0/0' },
      { id: 'c2', sourceDeviceId: 'R1', sourcePort: 'Gi0/1', targetDeviceId: 'R2', targetPort: 'Gi0/0' },
      { id: 'c3', sourceDeviceId: 'R2', sourcePort: 'Gi0/1', targetDeviceId: 'PC2', targetPort: 'Eth0' },
    ] as unknown as CanvasConnection[];

    const devices = [
      { id: 'SW1', name: 'SW1', type: 'switchL2', x: 100, y: 100 },
      { id: 'R1', name: 'R1', type: 'router', x: 200, y: 100 },
      { id: 'R2', name: 'R2', type: 'router', x: 300, y: 100 },
      { id: 'PC2', name: 'PC2', type: 'pc', x: 400, y: 100, ip: '192.168.1.2', subnetMask: '255.255.255.0', macAddress: 'AA:BB:CC:DD:EE:FF' },
    ] as unknown as CanvasDevice[];

    const deviceStates = new Map<string, SwitchState>([
      [
        'SW1',
        {
          macAddressTable: [
            { mac: '00:11:22:33:44:55', vlan: 1, port: 'Fa0/1', type: 'DYNAMIC', timestamp: Date.now() },
            { mac: 'AA:BB:CC:DD:EE:FF', vlan: 1, port: 'Fa0/2', type: 'DYNAMIC', timestamp: Date.now() },
          ],
          ports: {
            'Fa0/1': { id: 'Fa0/1', name: 'FastEthernet0/1', status: 'connected', shutdown: false, vlan: 1, mode: 'access', duplex: 'full', speed: '100', type: 'fastethernet' },
            'Fa0/2': { id: 'Fa0/2', name: 'FastEthernet0/2', status: 'connected', shutdown: false, vlan: 1, mode: 'access', duplex: 'full', speed: '100', type: 'fastethernet' },
          },
        } as unknown as SwitchState,
      ],
      [
        'R1',
        {
          ports: {
            'Gi0/0': { id: 'Gi0/0', name: 'GigabitEthernet0/0', status: 'connected', shutdown: false, vlan: 1, mode: 'routed', duplex: 'full', speed: '1000', type: 'gigabitethernet', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', netflowIngress: true },
            'Gi0/1': { id: 'Gi0/1', name: 'GigabitEthernet0/1', status: 'connected', shutdown: false, vlan: 1, mode: 'routed', duplex: 'full', speed: '1000', type: 'gigabitethernet', ipAddress: '172.16.0.1', subnetMask: '255.255.255.0' },
          },
          staticRoutes: [
            { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: 'Gi0/1', type: 'static', metric: 1 },
          ],
          netflowConfig: { exportDestination: '10.0.0.254', exportPort: 2055, version: 9 },
          vlans: {},
          security: {},
        } as unknown as SwitchState,
      ],
      [
        'R2',
        {
          ports: {
            'Gi0/0': { id: 'Gi0/0', name: 'GigabitEthernet0/0', status: 'connected', shutdown: false, vlan: 1, mode: 'routed', duplex: 'full', speed: '1000', type: 'gigabitethernet', ipAddress: '172.16.0.2', subnetMask: '255.255.255.0' },
            'Gi0/1': { id: 'Gi0/1', name: 'GigabitEthernet0/1', status: 'connected', shutdown: false, vlan: 1, mode: 'routed', duplex: 'full', speed: '1000', type: 'gigabitethernet', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0' },
          },
          staticRoutes: [
            { destination: '10.0.0.0', subnetMask: '255.255.255.0', nextHop: 'Gi0/0', type: 'static', metric: 1 },
          ],
        } as unknown as SwitchState,
      ],
      [
        'PC2',
        { ports: { Eth0: { id: 'Eth0', name: 'Ethernet0', status: 'connected', shutdown: false, vlan: 1, mode: 'access', duplex: 'full', speed: '1000', type: 'fastethernet', ipAddress: '192.168.1.2', subnetMask: '255.255.255.0' } } } as unknown as SwitchState,
      ],
    ]);

    const frame: NetworkPacketFrame = {
      id: 'f1', srcMac: '00:11:22:33:44:55', dstMac: 'AA:BB:CC:DD:EE:FF',
      srcIp: '10.0.0.2', dstIp: '192.168.1.2', protocol: 'ICMP', ttl: 64, vlanId: 1,
      ingressPortId: 'Fa0/1', timestamp: Date.now(), etherType: '0x0800', length: 74,
      info: 'ICMP Echo Request', ipProtocol: 1,
    };

    const res = runFullPacketPipeline(frame, 'SW1', devices, deviceStates, connections);
    expect(res.allTraces.map(t => `${t.deviceId}:${t.stage}`).join(',')).toContain('R1:netflow');

    const r1State = deviceStates.get('R1')!;
    expect(r1State.netflowCache?.length).toBe(1);
    const entry = r1State.netflowCache![0];
    expect(entry.srcIp).toBe('10.0.0.2');
    expect(entry.dstIp).toBe('192.168.1.2');
    expect(entry.proto).toBe('01');
    expect(entry.srcIf).toBe('Gi0/0');
    expect(entry.dstIf).toBe('Gi0/1');
    expect(entry.pkts).toBe(1);

    const netflowTrace = res.allTraces.find(t => t.stage === 'netflow' && t.deviceId === 'R1');
    expect(netflowTrace).toBeDefined();
    expect(netflowTrace?.reason).toContain('10.0.0.2');
  });
});