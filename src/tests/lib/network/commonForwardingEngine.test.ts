import { describe, it, expect } from 'vitest';
import { runNetworkEventPipeline } from '@/lib/network/forwarding/eventPipeline';
import { processControlPlaneProtocols } from '@/lib/network/forwarding/commonForwardingEngine';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('Common Forwarding Engine & Event Pipeline', () => {
  it('should process ARP Request and generate ARP Reply PDU via CFE Control Plane Trap', () => {
    const device: CanvasDevice = {
      id: 'r1',
      name: 'R1',
      type: 'router',
      x: 0,
      y: 0,
      ip: '192.168.1.1',
      macAddress: '00:11:22:33:44:55',
      status: 'online',
      ports: []
    };

    const state: SwitchState = {
      hostname: 'R1',
      macAddress: '00:11:22:33:44:55',
      ports: {
        gi0_0: { id: 'gi0_0', name: 'Gi0/0', type: 'gigabitethernet', status: 'connected', shutdown: false, ipAddress: '192.168.1.1', duplex: 'auto', speed: 'auto', mode: 'access', vlan: 1 }
      }
    } as unknown as SwitchState;

    const arpFrame: NetworkPacketFrame = {
      id: 'arp-1',
      protocol: 'ARP',
      timestamp: Date.now(),
      srcMac: 'AA:BB:CC:DD:EE:FF',
      dstMac: 'FF:FF:FF:FF:FF:FF',
      etherType: '0x0806',
      srcIp: '192.168.1.100',
      dstIp: '192.168.1.1',
      arpPayload: {
        operation: 'request',
        senderIp: '192.168.1.100',
        senderMac: 'AA:BB:CC:DD:EE:FF',
        targetIp: '192.168.1.1'
      },
      length: 42,
      info: 'Who has 192.168.1.1?'
    };

    const trapRes = processControlPlaneProtocols(arpFrame, device, state);
    expect(trapRes.handled).toBe(true);
    expect(trapRes.responseFrame).toBeDefined();
    expect(trapRes.responseFrame?.protocol).toBe('ARP');
    expect(trapRes.responseFrame?.arpPayload?.operation).toBe('reply');
    expect(trapRes.responseFrame?.arpPayload?.senderMac).toBe('00:11:22:33:44:55');
  });

  it('should run network event pipeline and process OSPF & EIGRP hellos', () => {
    const devices: CanvasDevice[] = [
      { id: 'r1', name: 'R1', type: 'router', x: 0, y: 0, ip: '10.0.0.1', status: 'online', ports: [] },
      { id: 'r2', name: 'R2', type: 'router', x: 100, y: 0, ip: '10.0.0.2', status: 'online', ports: [] }
    ];

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'r1', targetDeviceId: 'r2', sourcePort: 'Gi0/0', targetPort: 'Gi0/0', cableType: 'straight', active: true }
    ];

    const states = new Map<string, SwitchState>([
      ['r1', { hostname: 'R1', ospfRouterId: '1.1.1.1', routingProtocol: 'ospf', eigrpAs: '100', ports: { 'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', type: 'gigabitethernet', status: 'connected', shutdown: false, duplex: 'auto', speed: 'auto', mode: 'access', vlan: 1 } } } as unknown as SwitchState],
      ['r2', { hostname: 'R2', ospfRouterId: '2.2.2.2', routingProtocol: 'ospf', ports: { 'Gi0/0': { id: 'Gi0/0', name: 'Gi0/0', type: 'gigabitethernet', status: 'connected', shutdown: false, duplex: 'auto', speed: 'auto', mode: 'access', vlan: 1 } } } as unknown as SwitchState]
    ]);


    const pipelineRes = runNetworkEventPipeline(states, devices, connections, Date.now());
    expect(pipelineRes.processedFrames.length).toBeGreaterThan(0);
    const ospfHello = pipelineRes.processedFrames.find(f => f.protocol === 'OSPF');
    expect(ospfHello).toBeDefined();
    expect(ospfHello?.ospfPayload?.routerId).toBe('1.1.1.1');
  });
});
