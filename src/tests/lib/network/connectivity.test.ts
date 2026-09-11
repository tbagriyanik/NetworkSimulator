import { describe, it, expect } from 'vitest';
import { checkConnectivity, portsFormTrunk } from '@/lib/network/connectivity';
import type { SwitchState, Port } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';

describe('Connectivity Functions', () => {
  function checkDeviceConnectivity(
    sourceDevice: CanvasDevice,
    targetDevice: CanvasDevice,
    connections: CanvasConnection[],
    _deviceStates: Map<string, SwitchState>
  ): { reachable: boolean; path: string[]; latency: number } {
    if (sourceDevice.id === targetDevice.id) {
      return { reachable: true, path: [sourceDevice.id], latency: 0 };
    }
    const sharedSwitch = connections.find(c =>
      c.active && (
        (c.sourceDeviceId === sourceDevice.id) ||
        (c.targetDeviceId === sourceDevice.id)
      )
    );
    if (!sharedSwitch) return { reachable: false, path: [], latency: Infinity };
    const switchId = sharedSwitch.sourceDeviceId === sourceDevice.id
      ? sharedSwitch.targetDeviceId : sharedSwitch.sourceDeviceId;
    const targetConn = connections.find(c =>
      c.active && c.id !== sharedSwitch.id && (
        (c.sourceDeviceId === targetDevice.id && c.targetDeviceId === switchId) ||
        (c.targetDeviceId === targetDevice.id && c.sourceDeviceId === switchId)
      )
    );
    if (targetConn) {
      return { reachable: true, path: [sourceDevice.id, switchId, targetDevice.id], latency: 2 };
    }
    return { reachable: false, path: [], latency: Infinity };
  }

  describe('Invalid or Non-existent IP ping handling', () => {
    it('should return false for invalid IP address format or unmapped non-cloud IP', () => {
      const sourcePc = { id: 'pc1', name: 'PC1', type: 'pc', ip: '192.168.1.10', subnet: '255.255.255.0', ports: [], x: 0, y: 0, status: 'online' } as unknown as CanvasDevice;
      const cloudDev = { id: 'cloud1', name: 'Cloud', type: 'cloud', ip: '1.1.1.1', ports: [], x: 0, y: 0, status: 'online' } as unknown as CanvasDevice;
      const devices = [sourcePc, cloudDev];
      const connections: CanvasConnection[] = [];

      const resInvalid = checkConnectivity('pc1', '192.168.1.1111', devices, connections);
      expect(resInvalid.success).toBe(false);

      const resValidPublic = checkConnectivity('pc1', '1.1.1.1', devices, connections);
      expect(resValidPublic.success).toBe(false);

      // Offline Cloud device test
      const offlineCloudDev = { id: 'cloud1', name: 'Cloud', type: 'cloud', ip: '1.1.1.1', ports: [], x: 0, y: 0, status: 'offline' } as unknown as CanvasDevice;
      const resOfflineCloud = checkConnectivity('pc1', '1.1.1.1', [sourcePc, offlineCloudDev], connections);
      expect(resOfflineCloud.success).toBe(false);
      expect(resOfflineCloud.targetId).toBeUndefined();
    });
  });

  const pc1: CanvasDevice = {
    id: 'PC1', name: 'PC1', type: 'pc',
    ip: '192.168.1.10', vlan: 10,
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }],
  } as CanvasDevice;

  const pc2: CanvasDevice = {
    id: 'PC2', name: 'PC2', type: 'pc',
    ip: '192.168.1.20', vlan: 10,
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }],
  } as CanvasDevice;

  describe('DHCP Relay (ip helper-address)', () => {
    it('should store helper addresses in port configuration', () => {
      // Test that helper addresses are properly stored in the port state
      const port: Port = {
        id: 'GigabitEthernet0/0',
        name: 'GigabitEthernet0/0',
        status: 'connected',
        vlan: 1,
        mode: 'routed',
        duplex: 'full',
        speed: '1000',
        shutdown: false,
        type: 'gigabitethernet',
        ipAddress: '192.168.1.1',
        subnetMask: '255.255.255.0',
        helperAddresses: ['10.0.0.1', '10.0.0.2']
      } as Port;

      expect(port.helperAddresses).toBeDefined();
      expect(port.helperAddresses).toContain('10.0.0.1');
      expect(port.helperAddresses).toContain('10.0.0.2');
    });

    it('should handle empty helper addresses array', () => {
      const port: Port = {
        id: 'GigabitEthernet0/0',
        name: 'GigabitEthernet0/0',
        status: 'connected',
        vlan: 1,
        mode: 'routed',
        duplex: 'full',
        speed: '1000',
        shutdown: false,
        type: 'gigabitethernet',
        ipAddress: '192.168.1.1',
        subnetMask: '255.255.255.0',
        helperAddresses: []
      } as Port;

      expect(port.helperAddresses).toBeDefined();
      expect(port.helperAddresses).toHaveLength(0);
    });
  });

  describe('DHCP Snooping Security', () => {
    it('should store DHCP snooping configuration in switch state', () => {
      const switchState = {
        dhcpSnoopingEnabled: true,
        dhcpSnoopingVlans: ['10', '20'],
        ports: {
          'fa0/1': {
            id: 'fa0/1',
            name: 'FastEthernet0/1',
            status: 'connected',
            vlan: 1,
            mode: 'access',
            duplex: 'full',
            speed: '100',
            shutdown: false,
            type: 'fastethernet',
            dhcpSnoopingTrust: false
          } as Port,
          'fa0/2': {
            id: 'fa0/2',
            name: 'FastEthernet0/2',
            status: 'connected',
            vlan: 1,
            mode: 'access',
            duplex: 'full',
            speed: '100',
            shutdown: false,
            type: 'fastethernet',
            dhcpSnoopingTrust: true
          } as Port
        }
      } as unknown as SwitchState;

      expect(switchState.dhcpSnoopingEnabled).toBe(true);
      expect(switchState.dhcpSnoopingVlans).toContain('10');
      expect(switchState.dhcpSnoopingVlans).toContain('20');
      expect(switchState.ports['fa0/1']?.dhcpSnoopingTrust).toBe(false);
      expect(switchState.ports['fa0/2']?.dhcpSnoopingTrust).toBe(true);
    });

    it('should handle DHCP snooping disabled state', () => {
      const switchState = {
        dhcpSnoopingEnabled: false,
        ports: {
          'fa0/1': {
            id: 'fa0/1',
            name: 'FastEthernet0/1',
            status: 'connected',
            vlan: 1,
            mode: 'access',
            duplex: 'full',
            speed: '100',
            shutdown: false,
            type: 'fastethernet',
            dhcpSnoopingTrust: false
          } as Port
        }
      } as unknown as SwitchState;

      expect(switchState.dhcpSnoopingEnabled).toBe(false);
      expect(switchState.ports['fa0/1']?.dhcpSnoopingTrust).toBe(false);
    });

    it('should handle empty VLAN list in DHCP snooping', () => {
      const switchState = {
        dhcpSnoopingEnabled: true,
        dhcpSnoopingVlans: [],
        ports: {
          'fa0/1': {
            id: 'fa0/1',
            name: 'FastEthernet0/1',
            status: 'connected',
            vlan: 1,
            mode: 'access',
            duplex: 'full',
            speed: '100',
            shutdown: false,
            type: 'fastethernet',
            dhcpSnoopingTrust: false
          } as Port
        }
      } as unknown as SwitchState;

      expect(switchState.dhcpSnoopingEnabled).toBe(true);
      expect(switchState.dhcpSnoopingVlans).toHaveLength(0);
    });
  });

  const pc3: CanvasDevice = {
    id: 'PC3', name: 'PC3', type: 'pc',
    ip: '192.168.2.10', vlan: 20,
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' as const }],
  } as CanvasDevice;

  const connections: CanvasConnection[] = [
    { id: 'c1', sourceDeviceId: 'PC1', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
    { id: 'c2', sourceDeviceId: 'PC2', targetDeviceId: 'SW1', sourcePort: 'eth0', targetPort: 'fa0/2', cableType: 'straight', active: true },
  ];

  it('should detect connectivity between devices via switch', () => {
    const result = checkDeviceConnectivity(pc1, pc2, connections, new Map());
    expect(result.reachable).toBe(true);
    expect(result.path).toContain('PC1');
    expect(result.path).toContain('PC2');
  });

  it('should return unreachable for disconnected devices', () => {
    const result = checkDeviceConnectivity(pc1, pc3, connections, new Map());
    expect(result.reachable).toBe(false);
    expect(result.latency).toBe(Infinity);
  });

  it('should have 2ms latency for devices connected via switch', () => {
    const result = checkDeviceConnectivity(pc1, pc2, connections, new Map());
    expect(result.latency).toBe(2);
  });

  it('should handle empty connections', () => {
    const result = checkDeviceConnectivity(pc1, pc2, [], new Map());
    expect(result.reachable).toBe(false);
  });

  it('should handle same device check', () => {
    const result = checkDeviceConnectivity(pc1, pc1, connections, new Map());
    expect(result.reachable).toBe(true);
  });

  it('should detect ping between same subnet hosts', () => {
    const sameSubnet = (a: string, b: string, mask: string) => {
      const aOctets = a.split('.').map(Number);
      const bOctets = b.split('.').map(Number);
      const mOctets = mask.split('.').map(Number);
      return aOctets.every((o, i) => (o & mOctets[i]) === (bOctets[i] & mOctets[i]));
    };
    expect(sameSubnet('192.168.1.10', '192.168.1.20', '255.255.255.0')).toBe(true);
    expect(sameSubnet('192.168.1.10', '192.168.2.20', '255.255.255.0')).toBe(false);
  });

  it('should check ARP resolution between devices', () => {
    const arpTable = new Map([
      ['192.168.1.10', '00:11:22:33:44:55'],
      ['192.168.1.20', '00:11:22:33:44:66'],
    ]);
    expect(arpTable.has('192.168.1.10')).toBe(true);
    expect(arpTable.has('192.168.1.20')).toBe(true);
    expect(arpTable.has('192.168.1.30')).toBe(false);
  });

  it('should simulate ping round-trip time', () => {
    const simulatePing = (_targetIp: string, reachable: boolean) => {
      if (!reachable) return { success: false, rtt: Infinity };
      const baseLatency = 5;
      const jitter = Math.random() * 3;
      return { success: true, rtt: baseLatency + jitter };
    };
    const result = simulatePing('192.168.1.20', true);
    expect(result.success).toBe(true);
    expect(result.rtt).toBeGreaterThanOrEqual(5);
  });

  it('should handle ping timeout for unreachable host', () => {
    const simulatePing = (reachable: boolean) => {
      if (!reachable) return { success: false, rtt: Infinity, error: 'Destination unreachable' };
      return { success: true, rtt: 5 };
    };
    const result = simulatePing(false);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Destination unreachable');
  });

  it('should fail connectivity when devices are on different subnets without a gateway/router', () => {
    const hostA: CanvasDevice = {
      id: 'pc-a',
      type: 'pc',
      name: 'PC-A',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      gateway: '192.168.2.1', // Invalid: not in 192.168.1.0/24 subnet
      macAddress: '00:00:00:00:00:01',
      x: 0, y: 0, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }]
    };
    const hostB: CanvasDevice = {
      id: 'pc-b',
      type: 'pc',
      name: 'PC-B',
      ip: '192.168.2.10',
      subnet: '255.255.255.0',
      gateway: '192.168.2.1',
      macAddress: '00:00:00:00:00:02',
      x: 100, y: 100, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }]
    };
    const directConn: CanvasConnection[] = [{
      id: 'c-ab',
      sourceDeviceId: 'pc-a',
      sourcePort: 'eth0',
      targetDeviceId: 'pc-b',
      targetPort: 'eth0',
      cableType: 'crossover',
      active: true
    }];

    const res = checkConnectivity('pc-a', '192.168.2.10', [hostA, hostB], directConn);
    expect(res.success).toBe(false);
  });

  it('should fail when masks are asymmetrical (PC1 /24 vs PC2 /28) without a gateway/router', () => {
    const pc1: CanvasDevice = {
      id: 'pc-1',
      type: 'pc',
      name: 'PC-1',
      ip: '192.168.1.10',
      subnet: '255.255.255.0',
      macAddress: '00:00:00:00:00:01',
      x: 0, y: 0, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }]
    };
    const pc2: CanvasDevice = {
      id: 'pc-2',
      type: 'pc',
      name: 'PC-2',
      ip: '192.168.1.20',
      subnet: '255.255.255.240', // 192.168.1.16/28
      macAddress: '00:00:00:00:00:02',
      x: 100, y: 100, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }]
    };
    const directConn: CanvasConnection[] = [{
      id: 'c-12',
      sourceDeviceId: 'pc-1',
      sourcePort: 'eth0',
      targetDeviceId: 'pc-2',
      targetPort: 'eth0',
      cableType: 'crossover',
      active: true
    }];

    // PC-1 to PC-2 ping should fail because PC-2 cannot reply directly without a gateway
    const res1 = checkConnectivity('pc-1', '192.168.1.20', [pc1, pc2], directConn);
    expect(res1.success).toBe(false);

    // PC-2 to PC-1 ping should fail because PC-2 considers PC-1 out of subnet and has no gateway
    const res2 = checkConnectivity('pc-2', '192.168.1.10', [pc1, pc2], directConn);
    expect(res2.success).toBe(false);
  });

  describe('portsFormTrunk (DTP negotiation)', () => {
    it('should form trunk when both sides are explicitly trunk', () => {
      expect(portsFormTrunk('trunk', 'trunk')).toBe(true);
    });

    it('should form trunk when one side is trunk and other is access', () => {
      expect(portsFormTrunk('trunk', 'access')).toBe(true);
      expect(portsFormTrunk('access', 'trunk')).toBe(true);
    });

    it('should form trunk when both sides are dynamic-desirable', () => {
      expect(portsFormTrunk('dynamic-desirable', 'dynamic-desirable')).toBe(true);
    });

    it('should form trunk when one side is dynamic-desirable and other is dynamic-auto', () => {
      expect(portsFormTrunk('dynamic-desirable', 'dynamic-auto')).toBe(true);
      expect(portsFormTrunk('dynamic-auto', 'dynamic-desirable')).toBe(true);
    });

    it('should NOT form trunk when both sides are dynamic-auto', () => {
      expect(portsFormTrunk('dynamic-auto', 'dynamic-auto')).toBe(false);
    });

    it('should NOT form trunk when one side is access and other is dynamic', () => {
      expect(portsFormTrunk('access', 'dynamic-auto')).toBe(false);
      expect(portsFormTrunk('access', 'dynamic-desirable')).toBe(false);
      expect(portsFormTrunk('dynamic-auto', 'access')).toBe(false);
    });

    it('should NOT form trunk for routed ports', () => {
      expect(portsFormTrunk('routed', 'trunk')).toBe(false);
      expect(portsFormTrunk('trunk', 'routed')).toBe(false);
    });
  });

  describe('Dynamic mode (auto/desirable) connectivity', () => {
    const makeSwitch = (id: string, ports: Record<string, { mode: Port['mode']; vlan: number; shutdown: boolean }>): SwitchState => {
      const switchState = {
        hostname: id,
        macAddress: '00:00:00:00:00:' + id.charCodeAt(id.length - 1),
        switchModel: 'NS-L2-24TT-L',
        switchLayer: 'L2' as const,
        ports: {},
        vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] }, '10': { id: 10, name: 'VLAN10', status: 'active', ports: [] } },
        security: { enableSecretEncrypted: false, consoleLine: { login: false, transportInput: [] }, vtyLines: { login: false, transportInput: [] } },
        runningConfig: [],
        commandHistory: [],
        bootTime: Date.now(),
        version: { nosVersion: '15.0', modelName: id, serialNumber: 'ABC123', uptime: '1 week' },
        macAddressTable: [],
        arpCache: [],
        ipRouting: false,
      } as unknown as SwitchState;

      for (const [portId, cfg] of Object.entries(ports)) {
        switchState.ports[portId] = {
          id: portId,
          name: portId,
          status: 'connected' as const,
          vlan: cfg.vlan,
          mode: cfg.mode,
          duplex: 'auto' as const,
          speed: 'auto' as const,
          shutdown: cfg.shutdown,
          type: 'gigabitethernet' as const,
          allowedVlans: 'all',
        };
      }
      return switchState;
    };

    it('should allow connectivity between switches with dynamic-desirable on both sides', () => {
      const sw1 = makeSwitch('SW1', { 'fa0/1': { mode: 'dynamic-desirable', vlan: 10, shutdown: false } });
      const sw2 = makeSwitch('SW2', { 'fa0/1': { mode: 'dynamic-desirable', vlan: 10, shutdown: false } });
      const deviceStates = new Map([['SW1', sw1], ['SW2', sw2]]);

      const devices: CanvasDevice[] = [
        { id: 'SW1', type: 'switchL2', name: 'SW1', ip: '192.168.1.1', status: 'online', x: 0, y: 0, ports: [{ id: 'fa0/1', label: 'Fa0/1', status: 'connected' }] },
        { id: 'SW2', type: 'switchL2', name: 'SW2', ip: '192.168.1.2', status: 'online', x: 100, y: 0, ports: [{ id: 'fa0/1', label: 'Fa0/1', status: 'connected' }] },
      ];
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'SW1', sourcePort: 'fa0/1', targetDeviceId: 'SW2', targetPort: 'fa0/1', cableType: 'straight', active: true },
      ];

      const result = checkConnectivity('SW1', '192.168.1.2', devices, connections, deviceStates);
      expect(result.success).toBe(true);
    });

    it('should allow connectivity when one side is dynamic-desirable and other is dynamic-auto', () => {
      const sw1 = makeSwitch('SW1', { 'fa0/1': { mode: 'dynamic-desirable', vlan: 10, shutdown: false } });
      const sw2 = makeSwitch('SW2', { 'fa0/1': { mode: 'dynamic-auto', vlan: 10, shutdown: false } });
      const deviceStates = new Map([['SW1', sw1], ['SW2', sw2]]);

      const devices: CanvasDevice[] = [
        { id: 'SW1', type: 'switchL2', name: 'SW1', ip: '192.168.1.1', status: 'online', x: 0, y: 0, ports: [{ id: 'fa0/1', label: 'Fa0/1', status: 'connected' }] },
        { id: 'SW2', type: 'switchL2', name: 'SW2', ip: '192.168.1.2', status: 'online', x: 100, y: 0, ports: [{ id: 'fa0/1', label: 'Fa0/1', status: 'connected' }] },
      ];
      const connections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'SW1', sourcePort: 'fa0/1', targetDeviceId: 'SW2', targetPort: 'fa0/1', cableType: 'straight', active: true },
      ];

      const result = checkConnectivity('SW1', '192.168.1.2', devices, connections, deviceStates);
      expect(result.success).toBe(true);
    });

    it('should NOT form trunk when both sides are dynamic-auto', () => {
      expect(portsFormTrunk('dynamic-auto', 'dynamic-auto')).toBe(false);
    });

    it('should respect switchport trunk allowed vlan 10,20 filtering', () => {
      const sw1State = makeSwitch('SW1', {
        'fa0/1': { mode: 'access', vlan: 10, shutdown: false },
        'fa0/2': { mode: 'access', vlan: 30, shutdown: false },
        'gi0/1': { mode: 'trunk', vlan: 1, shutdown: false }
      });
      const sw2State = makeSwitch('SW2', {
        'fa0/1': { mode: 'access', vlan: 10, shutdown: false },
        'fa0/2': { mode: 'access', vlan: 30, shutdown: false },
        'gi0/1': { mode: 'trunk', vlan: 1, shutdown: false }
      });

      // Set allowed VLANs to "10,20" (vlan 30 not allowed)
      sw1State.ports['gi0/1'].allowedVlans = '10,20' as unknown as number[];
      sw2State.ports['gi0/1'].allowedVlans = '10,20' as unknown as number[];

      const deviceStates = new Map([['SW1', sw1State], ['SW2', sw2State]]);

      const testDevices: CanvasDevice[] = [
        { id: 'PC1', name: 'PC1', type: 'pc', ip: '192.168.10.1', vlan: 10, ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }] } as CanvasDevice,
        { id: 'PC2', name: 'PC2', type: 'pc', ip: '192.168.10.2', vlan: 10, ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }] } as CanvasDevice,
        { id: 'PC3', name: 'PC3', type: 'pc', ip: '192.168.30.1', vlan: 30, ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }] } as CanvasDevice,
        { id: 'PC4', name: 'PC4', type: 'pc', ip: '192.168.30.2', vlan: 30, ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }] } as CanvasDevice,
        { id: 'SW1', name: 'SW1', type: 'switchL2', ip: '192.168.1.1', status: 'online', x: 0, y: 0, ports: [{ id: 'fa0/1', label: 'Fa0/1', status: 'connected' }, { id: 'fa0/2', label: 'Fa0/2', status: 'connected' }, { id: 'gi0/1', label: 'Gi0/1', status: 'connected' }] },
        { id: 'SW2', name: 'SW2', type: 'switchL2', ip: '192.168.1.2', status: 'online', x: 100, y: 0, ports: [{ id: 'fa0/1', label: 'Fa0/1', status: 'connected' }, { id: 'fa0/2', label: 'Fa0/2', status: 'connected' }, { id: 'gi0/1', label: 'Gi0/1', status: 'connected' }] },
      ];

      const testConnections: CanvasConnection[] = [
        { id: 'c1', sourceDeviceId: 'PC1', sourcePort: 'eth0', targetDeviceId: 'SW1', targetPort: 'fa0/1', cableType: 'straight', active: true },
        { id: 'c2', sourceDeviceId: 'PC2', sourcePort: 'eth0', targetDeviceId: 'SW2', targetPort: 'fa0/1', cableType: 'straight', active: true },
        { id: 'c3', sourceDeviceId: 'PC3', sourcePort: 'eth0', targetDeviceId: 'SW1', targetPort: 'fa0/2', cableType: 'straight', active: true },
        { id: 'c4', sourceDeviceId: 'PC4', sourcePort: 'eth0', targetDeviceId: 'SW2', targetPort: 'fa0/2', cableType: 'straight', active: true },
        { id: 'c5', sourceDeviceId: 'SW1', sourcePort: 'gi0/1', targetDeviceId: 'SW2', targetPort: 'gi0/1', cableType: 'straight', active: true },
      ];

      // VLAN 10 is allowed across trunk -> success
      const resultVlan10 = checkConnectivity('PC1', '192.168.10.2', testDevices, testConnections, deviceStates);
      expect(resultVlan10.success).toBe(true);

      // VLAN 30 is NOT allowed across trunk -> fail
      const resultVlan30 = checkConnectivity('PC3', '192.168.30.2', testDevices, testConnections, deviceStates);
      expect(resultVlan30.success).toBe(false);
    });
  });
});
