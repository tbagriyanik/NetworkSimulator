import { describe, expect, it } from 'vitest';
import { parseYangModule, SdnController } from '@/lib/network/sdnController';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

const yang = `module network-device { namespace "urn:test"; leaf hostname { type string; } leaf enabled { type boolean; } leaf state { config false; type string; } }`;

describe('SDN YANG & Controller Interactive Engine', () => {
  it('parses a YANG module and leaves', () => {
    const m = parseYangModule(yang);
    expect(m.name).toBe('network-device');
    expect(m.leaves).toHaveLength(3);
    expect(m.leaves.find(x => x.name === 'state')?.config).toBe(false);
  });

  it('supports NETCONF/RESTCONF-style datastore access', () => {
    const c = new SdnController([parseYangModule(yang)]);
    c.editConfig('/devices/R1', { hostname: 'R1', enabled: true });
    expect(c.restconfGet('/devices/R1')).toEqual({ hostname: 'R1', enabled: true });
    expect(c.netconfGet('/devices/R1')).toContain('R1');
    expect(() => c.restconfPatch('/devices/R1', { enabled: 'yes' })).toThrow();
  });

  it('discovers network topology inventory and active VLANs', () => {
    const c = new SdnController();
    const mockDevices: CanvasDevice[] = [
      { id: 'PC1', name: 'PC1', type: 'pc', ip: '10.0.0.10', status: 'online', ports: [], x: 0, y: 0, vlan: 10 },
      { id: 'SW1', name: 'SW1', type: 'switchL2', ip: '', status: 'online', ports: [], x: 0, y: 0, vlan: 10 },
      { id: 'R1', name: 'R1', type: 'router', ip: '10.0.0.1', status: 'online', ports: [], x: 0, y: 0, vlan: 20 },
    ];
    const mockConnections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'PC1', sourcePort: 'Eth0', targetDeviceId: 'SW1', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
      { id: 'c2', sourceDeviceId: 'SW1', sourcePort: 'Fa0/24', targetDeviceId: 'R1', targetPort: 'Gi0/0', active: true, cableType: 'straight' },
    ];

    const inventory = c.discoverInventory(mockDevices, mockConnections);
    expect(inventory.totalDevices).toBe(3);
    expect(inventory.pcsCount).toBe(1);
    expect(inventory.switchesCount).toBe(1);
    expect(inventory.routersCount).toBe(1);
    expect(inventory.activeLinksCount).toBe(2);
    expect(inventory.discoveredVlans).toEqual([10, 20]);
  });

  it('computes hop-by-hop APIC-EM-style path trace between endpoints', () => {
    const c = new SdnController();
    const mockDevices: CanvasDevice[] = [
      { id: 'pc-src', name: 'PC-A', type: 'pc', ip: '192.168.1.10', status: 'online', ports: [], x: 0, y: 0 },
      { id: 'sw-access', name: 'Switch-Acc', type: 'switchL2', ip: '', status: 'online', ports: [], x: 0, y: 0 },
      { id: 'pc-dst', name: 'PC-B', type: 'pc', ip: '192.168.1.20', status: 'online', ports: [], x: 0, y: 0 },
    ];
    const mockConnections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'pc-src', sourcePort: 'Eth0', targetDeviceId: 'sw-access', targetPort: 'Fa0/1', active: true, cableType: 'straight' },
      { id: 'c2', sourceDeviceId: 'sw-access', sourcePort: 'Fa0/2', targetDeviceId: 'pc-dst', targetPort: 'Eth0', active: true, cableType: 'straight' },
    ];

    const trace = c.computePathTrace('192.168.1.10', '192.168.1.20', mockDevices, mockConnections);
    expect(trace.pathFound).toBe(true);
    expect(trace.healthStatus).toBe('HEALTHY');
    expect(trace.totalHops).toBe(3);
    expect(trace.pathHops[0].deviceName).toBe('PC-A');
    expect(trace.pathHops[1].deviceName).toBe('Switch-Acc');
    expect(trace.pathHops[2].deviceName).toBe('PC-B');
    expect(trace.pathHops[1].ingressPort).toBe('Fa0/1');
    expect(trace.pathHops[1].egressPort).toBe('Fa0/2');
  });

  it('provisions Intent-Based Networking (IBN) QoS and VLAN isolation policies', () => {
    const c = new SdnController();
    const mockDevices: CanvasDevice[] = [
      { id: 'SW1', name: 'SW1', type: 'switchL2', ip: '', status: 'online', ports: [], x: 0, y: 0, vlan: 1 },
    ];
    const mockStates = new Map<string, SwitchState>();
    mockStates.set('SW1', { hostname: 'SW1', ports: {} } as SwitchState);

    const qosRes = c.applyIntentPolicy(
      { id: 'p1', name: 'VoIP Priority', type: 'qos-voip', targetDeviceIds: ['SW1'], parameters: {} },
      mockDevices,
      mockStates
    );
    expect(qosRes.success).toBe(true);
    expect(mockStates.get('SW1')?.mlsQosEnabled).toBe(true);

    const vlanRes = c.applyIntentPolicy(
      { id: 'p2', name: 'IoT Segment Isolation', type: 'isolate-vlan', targetDeviceIds: ['SW1'], parameters: { vlanId: 99 } },
      mockDevices,
      mockStates
    );
    expect(vlanRes.success).toBe(true);
    expect(mockDevices[0].vlan).toBe(99);
    expect(mockStates.get('SW1')?.vlans?.['99']).toBeDefined();
  });

  it('manages OpenFlow / RESTCONF flow entry priority ordering', () => {
    const c = new SdnController();
    c.pushFlowRule({ id: 'r-low', priority: 10, match: { dstIp: '10.0.0.0/24' }, action: 'FORWARD', egressPort: 'Fa0/1' });
    c.pushFlowRule({ id: 'r-high', priority: 100, match: { dstIp: '10.0.0.5' }, action: 'PRIORTIZE', egressPort: 'Fa0/2' });

    const rules = c.getFlowRules();
    expect(rules).toHaveLength(2);
    expect(rules[0].id).toBe('r-high'); // Higher priority rule first
    expect(rules[1].id).toBe('r-low');
  });
});
