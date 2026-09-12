import { describe, it, expect } from 'vitest';
import { handleRestApiRequest } from '@/lib/network/restApiMock';
import { createInitialState } from '@/lib/network/initialState';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

describe('restApiMock (Controller Intent APIs & RESTCONF Explorer)', () => {
  const mockDevices: CanvasDevice[] = [
    {
      id: 'R1',
      name: 'HQ-Router',
      type: 'router',
      x: 100,
      y: 100,
      ip: '192.168.1.1',
      status: 'online',
      ports: [],
    },
    {
      id: 'SW1',
      name: 'HQ-Core-Switch',
      type: 'switchL3',
      x: 200,
      y: 100,
      ip: '192.168.1.2',
      status: 'online',
      ports: [],
    },
  ];

  const mockConnections: CanvasConnection[] = [
    {
      id: 'conn-1',
      sourceDeviceId: 'R1',
      sourcePort: 'Gi0/0',
      targetDeviceId: 'SW1',
      targetPort: 'Gi0/1',
      active: true,
      cableType: 'straight',
    },
  ];

  it('handles Controller Auth Token POST endpoint', () => {
    const res = handleRestApiRequest('POST', 'https://controller/dna/system/api/v1/auth/token', {}, '{}', mockDevices);
    expect(res.status).toBe(200);
    const data = res.data as Record<string, unknown>;
    expect(data.Token).toBeDefined();
    expect(data.role).toBe('SUPER-ADMIN');
  });

  it('serves live network device inventory via GET /dna/intent/api/v1/network-device', () => {
    const states = new Map<string, SwitchState>();
    const r1State = createInitialState();
    r1State.hostname = 'HQ-Router-01';
    states.set('R1', r1State);

    const res = handleRestApiRequest(
      'GET',
      'https://controller/dna/intent/api/v1/network-device',
      {},
      undefined,
      mockDevices,
      states
    );

    expect(res.status).toBe(200);
    const data = res.data as { response: Array<Record<string, unknown>>; count: number };
    expect(data.count).toBe(2);
    expect(data.response[0].hostname).toBe('HQ-Router-01');
    expect(data.response[0].managementIpAddress).toBe('192.168.1.1');
  });

  it('serves device count via GET /dna/intent/api/v1/network-device/count', () => {
    const res = handleRestApiRequest('GET', 'https://controller/dna/intent/api/v1/network-device/count', {}, undefined, mockDevices);
    expect(res.status).toBe(200);
    const data = res.data as { response: number };
    expect(data.response).toBe(2);
  });

  it('serves interfaces inventory via GET /dna/intent/api/v1/interface', () => {
    const states = new Map<string, SwitchState>();
    const r1State = createInitialState();
    r1State.ports['Gi0/0'] = {
      id: 'Gi0/0',
      name: 'GigabitEthernet0/0',
      status: 'connected',
      vlan: 1,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      type: 'gigabitethernet',
      ipAddress: '10.0.0.1',
      subnetMask: '255.255.255.0',
    };
    states.set('R1', r1State);

    const res = handleRestApiRequest('GET', 'https://controller/dna/intent/api/v1/interface', {}, undefined, mockDevices, states);
    expect(res.status).toBe(200);
    const data = res.data as { response: Array<Record<string, unknown>> };
    expect(data.response.some((iface) => iface.ipAddress === '10.0.0.1')).toBe(true);
  });

  it('serves physical and site topology graph via GET /dna/intent/api/v1/topology/site-topology', () => {
    const res = handleRestApiRequest(
      'GET',
      'https://controller/dna/intent/api/v1/topology/site-topology',
      {},
      undefined,
      mockDevices,
      new Map(),
      mockConnections
    );

    expect(res.status).toBe(200);
    const data = res.data as { response: { nodes: Array<unknown>; links: Array<unknown> } };
    expect(data.response.nodes.length).toBe(2);
    expect(data.response.links.length).toBe(1);
  });

  it('serves network and client health metrics', () => {
    const res = handleRestApiRequest('GET', 'https://controller/dna/intent/api/v1/network-health', {}, undefined, mockDevices);
    expect(res.status).toBe(200);
    const data = res.data as { response: Array<{ networkHealthAverage: number }> };
    expect(data.response[0].networkHealthAverage).toBe(100);
  });

  it('dispatches RESTCONF PATCH and mutates device state', () => {
    const states = new Map<string, SwitchState>();
    const r1State = createInitialState();
    r1State.ports['Gi0/0'] = {
      id: 'Gi0/0',
      name: 'GigabitEthernet0/0',
      status: 'connected',
      vlan: 1,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      type: 'gigabitethernet',
    };
    states.set('R1', r1State);

    const patchBody = JSON.stringify({
      'ietf-interfaces:interface': {
        name: 'GigabitEthernet0/0',
        description: 'Provisioned via RESTCONF in PC Explorer',
        enabled: true,
        'ietf-ip:ipv4': {
          address: [{ ip: '10.99.1.1', netmask: '255.255.255.0' }],
        },
      },
    });

    const res = handleRestApiRequest(
      'PATCH',
      'https://R1/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
      {},
      patchBody,
      mockDevices,
      states
    );

    expect(res.status).toBe(204);
    expect(res.updatedState).toBeDefined();
    expect(res.updatedState?.ports['Gi0/0'].ipAddress).toBe('10.99.1.1');
  });
});
