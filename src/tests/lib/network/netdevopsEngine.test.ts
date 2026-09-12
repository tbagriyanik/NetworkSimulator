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

  it('serves single interface via RESTCONF GET /ietf-interfaces:interfaces/interface={name}', () => {
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
      ipAddress: '10.0.0.1',
      subnetMask: '255.255.255.0',
      description: 'WAN Gateway',
    };

    const res = handleRestconfRequest('GET', '/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0', mockDevice, state);
    expect(res.status).toBe(200);
    const iface = (res.data['ietf-interfaces:interface'] as Record<string, unknown>);
    expect(iface.name).toBe('GigabitEthernet0/0');
    expect(iface.description).toBe('WAN Gateway');
  });

  it('updates interface IP and description via RESTCONF PATCH', () => {
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
    };

    const patchPayload = {
      'ietf-interfaces:interface': {
        name: 'GigabitEthernet0/0',
        description: 'Updated via YANG RESTCONF',
        enabled: true,
        'ietf-ip:ipv4': {
          address: [{ ip: '172.16.0.1', netmask: '255.255.0.0' }],
        },
      },
    };

    const res = handleRestconfRequest(
      'PATCH',
      '/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
      mockDevice,
      state,
      patchPayload
    );

    expect(res.status).toBe(204);
    expect(res.updatedState).toBeDefined();
    const updatedPort = res.updatedState?.ports['Gi0/0'];
    expect(updatedPort?.ipAddress).toBe('172.16.0.1');
    expect(updatedPort?.subnetMask).toBe('255.255.0.0');
    expect(updatedPort?.description).toBe('Updated via YANG RESTCONF');
    expect(updatedPort?.shutdown).toBe(false);
  });

  it('deletes interface IP configuration via RESTCONF DELETE', () => {
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

    const res = handleRestconfRequest(
      'DELETE',
      '/restconf/data/ietf-interfaces:interfaces/interface=GigabitEthernet0/0',
      mockDevice,
      state
    );

    expect(res.status).toBe(204);
    expect(res.updatedState?.ports['Gi0/0'].ipAddress).toBeUndefined();
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

  it('updates hostname and VLANs via RESTCONF PUT on netsim-native', () => {
    const state: SwitchState = createInitialState();
    const putPayload = {
      'netsim-native:native': {
        hostname: 'Distribution-01',
        vlan: {
          vlanList: [
            { id: 10, name: 'Management' },
            { id: 20, name: 'Servers' },
          ],
        },
      },
    };

    const res = handleRestconfRequest('PUT', '/restconf/data/netsim-native:native', mockDevice, state, putPayload);
    expect(res.status).toBe(204);
    expect(res.updatedState?.hostname).toBe('Distribution-01');
    expect(res.updatedState?.vlans[10]?.name).toBe('Management');
    expect(res.updatedState?.vlans[20]?.name).toBe('Servers');
  });

  it('executes Netmiko Python script with send_command and captures CLI output', () => {
    const stateMap = new Map<string, SwitchState>();
    const r1State = createInitialState();
    r1State.hostname = 'Router1';
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
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
    };
    stateMap.set('R1', r1State);

    const script = `
from netmiko import ConnectHandler
dev = {'host': 'R1'}
net_connect = ConnectHandler(**dev)
net_connect.send_command("show ip int brief")
    `;

    const res = executeNetDevOpsPythonScript(script, [mockDevice], stateMap);
    expect(res.success).toBe(true);
    expect(res.affectedDevices).toContain('R1');
    expect(res.logs.some((l) => l.includes('GigabitEthernet0/0') || l.includes('192.168.1.1'))).toBe(true);
  });

  it('executes Netmiko Python script with send_config_set and updates device state', () => {
    const stateMap = new Map<string, SwitchState>();
    const r1State = createInitialState();
    r1State.deviceType = 'router';
    r1State.switchLayer = 'L3';
    stateMap.set('R1', r1State);

    const script = `
from netmiko import ConnectHandler
dev = {'host': 'R1'}
net_connect = ConnectHandler(**dev)
commands = [
    "hostname Branch-Gateway",
    "interface GigabitEthernet0/0",
    "ip address 10.50.0.1 255.255.255.0",
    "no shutdown"
]
net_connect.send_config_set(commands)
    `;

    const res = executeNetDevOpsPythonScript(script, [mockDevice], stateMap);
    expect(res.success).toBe(true);
    const updatedR1 = res.updatedDeviceStates?.get('R1');
    expect(updatedR1?.hostname).toBe('Branch-Gateway');
    const port = updatedR1?.ports['Gi0/0'] || updatedR1?.ports['gi0/0'];
    expect(port?.ipAddress).toBe('10.50.0.1');
  });

  it('executes Python Requests RESTCONF automation in script', () => {
    const stateMap = new Map<string, SwitchState>();
    stateMap.set('R1', createInitialState());

    const script = `
import requests
res = requests.get("https://R1/restconf/data/ietf-interfaces:interfaces")
print(res.status_code)
    `;

    const res = executeNetDevOpsPythonScript(script, [mockDevice], stateMap);
    expect(res.success).toBe(true);
    expect(res.logs.some((l) => l.includes('HTTP/200 OK'))).toBe(true);
  });
});

