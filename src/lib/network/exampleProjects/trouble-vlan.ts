import { createPcDevice, createSwitchDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import { createInitialState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const troubleVlanDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 10),
    createPcDevice('pc-2', 'PC-2', 100, 250, '192.168.1.20', 10),
    createSwitchDevice('switch-1', 'SW1', 300, 175)
  ];
  const troubleVlanConnections: CanvasConnection[] = [];
  connectPorts(troubleVlanDevices, troubleVlanConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(troubleVlanDevices, troubleVlanConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');

  const troubleVlanSwState = createInitialState();
  troubleVlanSwState.hostname = 'SW1';
  troubleVlanSwState.vlans[10] = { id: 10, name: 'SALES', status: 'active', ports: ['FA0/1', 'FA0/2'] };
  troubleVlanSwState.ports['fa0/1'] = { ...troubleVlanSwState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  troubleVlanSwState.ports['fa0/2'] = { ...troubleVlanSwState.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };
  troubleVlanSwState.vlans[20] = { id: 20, name: 'FAULT', status: 'active', ports: ['FA0/2'] };

  return {
    id: 'trouble-vlan',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Yanlış VLAN Ataması' : 'Wrong VLAN Assignment',
    description: isTr ? 'PC2 neden PC1\'e ping atamıyor? Switch portlarını kontrol edin.' : 'Why can\'t PC2 ping PC1? Check the switch ports.',
    level: 'intermediate',
    injectedFaults: [
      {
        id: 'fault-vlan-2',
        deviceId: 'switch-1',
        faultType: 'wrongVlan',
        description: { tr: 'Fa0/2 portu yanlışlıkla VLAN 20\'ye atanmış.', en: 'Port Fa0/2 is mistakenly assigned to VLAN 20.' },
        configKey: 'ports.fa0/2.vlan',
        faultValue: 20,
        correctValue: 10
      }
    ],
    data: baseProjectData(troubleVlanDevices, troubleVlanConnections, [], [{ id: 'switch-1', state: troubleVlanSwState }])
  };
};

export default example;
