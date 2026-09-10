import { describe, it, expect } from 'vitest';
import { handleRestconfRequest, executeNetDevOpsPythonScript } from '@/lib/network/netdevopsEngine';
import { createInitialState } from '@/lib/network/initialState';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

describe('netdevopsEngine (RESTCONF YANG API & Python Script Runner)', () => {
  const mockDevice: CanvasDevice = {
    id: 'R1',
    name: 'Router1',
    type: 'router',
    x: 100,
    y: 100,
    ip: '192.168.1.1',
    status: 'online',
    ports: [],
  };

  it('serves ietf-interfaces YANG JSON via RESTCONF GET', () => {
    const state: SwitchState = createInitialState();
    state.ports['Gi0/0'] = {
      id: 'Gi0/0',
      name: 'GigabitEthernet0/0',
      status: 'connected',
      vlan: 1,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      type: 'gigabitethernet',
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
    };

    const res = handleRestconfRequest('GET', '/restconf/data/ietf-interfaces:interfaces', mockDevice, state);
    expect(res.status).toBe(200);
    expect(res.data['ietf-interfaces:interfaces']).toBeDefined();
  });

  it('serves netsim-native YANG JSON via RESTCONF GET', () => {
    const state: SwitchState = createInitialState();
    state.hostname = 'Core-Router-1';
    state.ospfProcessId = '1';
    state.ospfRouterId = '1.1.1.1';


    const res = handleRestconfRequest('GET', '/restconf/data/netsim-native:native', mockDevice, state);
    expect(res.status).toBe(200);
    expect(res.data['netsim-native:native']).toBeDefined();
  });

  it('executes Netmiko Python script and produces interactive logs', () => {
    const stateMap = new Map<string, SwitchState>();
    stateMap.set('R1', createInitialState());

    const script = `
from netmiko import ConnectHandler
dev = {'host': 'R1'}
net_connect = ConnectHandler(**dev)
net_connect.send_command("show ip int brief")
    `;

    const res = executeNetDevOpsPythonScript(script, [mockDevice], stateMap);
    expect(res.success).toBe(true);
    expect(res.affectedDevices).toContain('R1');
    expect(res.logs.some((l) => l.includes('Connecting to device "R1"'))).toBe(true);
  });
});
