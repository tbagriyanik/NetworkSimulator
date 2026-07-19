import { createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import { createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const troubleAclDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1, '192.168.1.1'),
    createRouterDevice('router-1', 'R1', 300, 100),
    createPcDevice('pc-2', 'PC-2', 500, 100, '192.168.2.10', 1, '192.168.2.1')
  ];
  const troubleAclConnections: CanvasConnection[] = [];
  connectPorts(troubleAclDevices, troubleAclConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0', 'crossover');
  connectPorts(troubleAclDevices, troubleAclConnections, 'router-1', 'gi0/1', 'pc-2', 'eth0', 'crossover');

  const troubleAclR1State = createInitialRouterState();
  troubleAclR1State.hostname = 'R1';
  troubleAclR1State.ports['gi0/0'] = { ...troubleAclR1State.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' };
  troubleAclR1State.ports['gi0/1'] = { ...troubleAclR1State.ports['gi0/1'], ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' };
  troubleAclR1State.accessLists = {
    '101': [
      'access-list 101 deny ip any any'
    ]
  };
  troubleAclR1State.ports['gi0/0'].accessGroupIn = '101';

  return {
    id: 'trouble-acl',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Hatalı ACL Kısıtlaması' : 'Incorrect ACL Restriction',
    description: isTr ? 'Router üzerindeki bir ACL trafiği engelliyor. Kuralı düzeltin.' : 'An ACL on the router is blocking traffic. Fix the rule.',
    level: 'intermediate',
    injectedFaults: [
      {
        id: 'fault-acl-r1',
        deviceId: 'router-1',
        faultType: 'aclBlocking',
        description: { tr: 'R1 Gi0/0 arayüzünde tüm trafiği engelleyen ACL 101 uygulanmış.', en: 'ACL 101 blocking all traffic is applied on R1 Gi0/0.' },
        configKey: 'ports.gi0/0.accessGroupIn',
        faultValue: '101',
        correctValue: undefined
      }
    ],
    data: baseProjectData(troubleAclDevices, troubleAclConnections, [], [{ id: 'router-1', state: troubleAclR1State }])
  };
};

export default example;
