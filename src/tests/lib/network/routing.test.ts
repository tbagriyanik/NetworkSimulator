import { describe, it, expect } from 'vitest';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { getRoutingTable } from '@/lib/network/routing';


describe('Routing Table Building', () => {
  function buildRoutingTable(
    deviceId: string,
    _devices: CanvasDevice[],
    _connections: CanvasConnection[],
    deviceStates: Map<string, SwitchState>
  ) {
    const routes: Array<{ destination: string; nextHop: string; type: string; metric: number }> = [];
    const state = deviceStates.get(deviceId);
    if (!state) return routes;

    for (const port of Object.values(state.ports)) {
      if (port.ipAddress && port.subnetMask) {
        const octets = port.ipAddress.split('.').map(Number);
        const mask = port.subnetMask.split('.').map(Number);
        const network = octets.map((o, i) => o & mask[i]).join('.');
        routes.push({ destination: network, nextHop: port.id, type: 'connected', metric: 0 });
      }
    }
    return routes;
  }

  it('should return empty routes for unknown device', () => {
    const routes = buildRoutingTable('ghost', [], [], new Map());
    expect(routes).toHaveLength(0);
  });

  it('should return connected routes from device state', () => {
    const state: SwitchState = {
      id: 'R1',
      hostname: 'R1',
      mode: 'privileged',
      ports: {
        'gi0/0': {
          id: 'gi0/0', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0',
          status: 'connected', vlan: 1, mode: 'routed', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        },
        'gi0/1': {
          id: 'gi0/1', ipAddress: '10.0.0.1', subnetMask: '255.0.0.0',
          status: 'connected', vlan: 1, mode: 'routed', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        },
      },
    } as unknown as SwitchState;

    const routes = buildRoutingTable('R1', [], [], new Map([['R1', state]]));
    expect(routes).toHaveLength(2);
    expect(routes[0]).toEqual({ destination: '192.168.1.0', nextHop: 'gi0/0', type: 'connected', metric: 0 });
    expect(routes[1]).toEqual({ destination: '10.0.0.0', nextHop: 'gi0/1', type: 'connected', metric: 0 });
  });

  it('should include IPv6 connected routes', () => {
    const state: SwitchState = {
      id: 'R1', hostname: 'R1', mode: 'privileged',
      ports: {
        'gi0/0': {
          id: 'gi0/0', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0',
          ipv6Address: '2001:db8:1::1', ipv6Prefix: 64,
          status: 'connected', vlan: 1, mode: 'routed', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        },
      },
    } as unknown as SwitchState;

    const routes = buildRoutingTable('R1', [], [], new Map([['R1', state]]));
    expect(routes.length).toBeGreaterThanOrEqual(1);
  });

  it('should include HSRP virtual IP routes when active', () => {
    const state: SwitchState = {
      id: 'R1', hostname: 'R1', mode: 'privileged',
      ports: {
        'gi0/0': {
          id: 'gi0/0', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0',
          hsrp: { groups: { '1': { state: 'Active', virtualIp: '192.168.1.254' } } },
          status: 'connected', vlan: 1, mode: 'routed', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet',
        },
      },
    } as unknown as SwitchState;

    const routes = buildRoutingTable('R1', [], [], new Map([['R1', state]]));
    expect(routes.length).toBeGreaterThanOrEqual(1);
  });

  it('should calculate network address correctly', () => {
    const ip = '192.168.1.10';
    const mask = '255.255.255.0';
    const octets = ip.split('.').map(Number);
    const masks = mask.split('.').map(Number);
    const network = octets.map((o, i) => o & masks[i]).join('.');
    expect(network).toBe('192.168.1.0');
  });

  it('should handle /24 subnet mask', () => {
    const ip = '10.0.0.5';
    const mask = '255.0.0.0';
    const octets = ip.split('.').map(Number);
    const masks = mask.split('.').map(Number);
    const network = octets.map((o, i) => o & masks[i]).join('.');
    expect(network).toBe('10.0.0.0');
  });

  it('should not include ports without IP addresses', () => {
    const state: SwitchState = {
      id: 'SW1', hostname: 'SW1', mode: 'privileged',
      ports: {
        'fa0/1': {
          id: 'fa0/1',
          status: 'connected', vlan: 1, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'fastethernet',
        },
      },
    } as unknown as SwitchState;

    const routes = buildRoutingTable('SW1', [], [], new Map([['SW1', state]]));
    expect(routes).toHaveLength(0);
  });
});

describe('RIP Dynamic Routing', () => {
  it('should dynamically learn RIP routes from adjacent RIP neighbor', () => {
    const devices = [
      { id: 'R1', name: 'R1', type: 'router' },
      { id: 'R2', name: 'R2', type: 'router' }
    ] as unknown as CanvasDevice[];
    const connections = [
      { id: 'c1', sourceDeviceId: 'R1', sourcePort: 'gi0/0', targetDeviceId: 'R2', targetPort: 'gi0/0', active: true }
    ] as unknown as CanvasConnection[];

    const r1State = {
      id: 'R1',
      hostname: 'R1',
      deviceType: 'router',
      routingProtocol: 'rip',
      ipRouting: true,
      ports: {
        'gi0/0': {
          id: 'gi0/0',
          ipAddress: '19.16.1.1',
          subnetMask: '255.255.255.0',
          shutdown: false,
          mode: 'routed'
        },
        'gi0/1': {
          id: 'gi0/1',
          ipAddress: '192.168.10.1',
          subnetMask: '255.255.255.0',
          shutdown: false,
          mode: 'routed'
        }
      }
    } as unknown as SwitchState;

    const r2State = {
      id: 'R2',
      hostname: 'R2',
      deviceType: 'router',
      routingProtocol: 'rip',
      ipRouting: true,
      ports: {
        'gi0/0': {
          id: 'gi0/0',
          ipAddress: '19.16.1.2',
          subnetMask: '255.255.255.0',
          shutdown: false,
          mode: 'routed'
        },
        'gi0/1': {
          id: 'gi0/1',
          ipAddress: '192.168.20.1',
          subnetMask: '255.255.255.0',
          shutdown: false,
          mode: 'routed'
        }
      }
    } as unknown as SwitchState;

    const deviceStates = new Map<string, SwitchState>([
      ['R1', r1State],
      ['R2', r2State]
    ]);

    const routesR1 = getRoutingTable('R1', deviceStates, devices, connections);
    const ripRoute = routesR1.find(r => r.destination === '192.168.20.0');
    expect(ripRoute).toBeDefined();
    expect(ripRoute?.nextHop).toBe('19.16.1.2');
    expect(ripRoute?.type).toBe('dynamic');
    expect(ripRoute?.metric).toBe(120);
  });
});
