import { createPcDevice, createSwitchDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import { createInitialState, createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const ivrDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 100, '192.168.10.10', 10, '192.168.10.1'),
    createPcDevice('pc-2', 'PC-2', 50, 250, '192.168.20.10', 20, '192.168.20.1'),
    createSwitchDevice('switch-1', 'SW1', 250, 175),
    createRouterDevice('router-1', 'R1', 500, 175)
  ];
  const ivrConnections: CanvasConnection[] = [];
  connectPorts(ivrDevices, ivrConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(ivrDevices, ivrConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(ivrDevices, ivrConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');

  const ivrSwState = createInitialState();
  ivrSwState.hostname = 'SW1';
  ivrSwState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  ivrSwState.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/2'] };
  ivrSwState.ports['fa0/1'] = { ...ivrSwState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  ivrSwState.ports['fa0/2'] = { ...ivrSwState.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };
  ivrSwState.ports['gi0/1'] = { ...ivrSwState.ports['gi0/1'], mode: 'access', vlan: 1, status: 'connected' };

  const ivrR1State = createInitialRouterState();
  ivrR1State.hostname = 'R1';
  ivrR1State.ports['gi0/0.10'] = { ...ivrR1State.ports['gi0/0'], id: 'gi0/0.10', vlan: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', isSubinterface: true, parentInterface: 'gi0/0', status: 'connected' };
  ivrR1State.ports['gi0/0.20'] = { ...ivrR1State.ports['gi0/0'], id: 'gi0/0.20', vlan: 20, ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', isSubinterface: true, parentInterface: 'gi0/0', status: 'connected' };

  return {
    id: 'trouble-ivr',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Bozuk Inter-VLAN' : 'Broken Inter-VLAN',
    description: isTr ? 'VLANlar arası iletişim sağlanamıyor. Trunk hattını kontrol edin.' : 'Inter-VLAN communication is failing. Check the trunk line.',
    level: 'intermediate',
    injectedFaults: [
      {
        id: 'fault-ivr-trunk',
        deviceId: 'switch-1',
        faultType: 'wrongVlan',
        description: { tr: 'Gi0/1 portu trunk modunda değil.', en: 'Port Gi0/1 is not in trunk mode.' },
        configKey: 'ports.gi0/1.mode',
        faultValue: 'access',
        correctValue: 'trunk',
        hint: { tr: 'Switch-Router arası bağlantı trunk olmalıdır.', en: 'Connection between Switch and Router must be trunk.' }
      }
    ],
    data: baseProjectData(ivrDevices, ivrConnections, [], [
      { id: 'switch-1', state: ivrSwState },
      { id: 'router-1', state: ivrR1State }
    ])
  };
};

export default example;
