import { createRouterDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import { createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const ospfTroubleDevices = [
    createRouterDevice('router-1', 'R1', 200, 150),
    createRouterDevice('router-2', 'R2', 500, 150)
  ];
  const ospfTroubleConnections: CanvasConnection[] = [];
  connectPorts(ospfTroubleDevices, ospfTroubleConnections, 'router-1', 'gi0/0', 'router-2', 'gi0/0', 'crossover');

  const ospfR1State = createInitialRouterState();
  ospfR1State.hostname = 'R1';
  ospfR1State.routingProtocol = 'ospf';
  ospfR1State.ports['gi0/0'] = { ...ospfR1State.ports['gi0/0'], ipAddress: '10.0.0.1', subnetMask: '255.255.255.252', status: 'connected', shutdown: false };
  ospfR1State.dynamicRoutes = [{ destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2', metric: 1, type: 'dynamic', area: 0 }];

  const ospfR2State = createInitialRouterState();
  ospfR2State.hostname = 'R2';
  ospfR2State.routingProtocol = 'ospf';
  ospfR2State.ports['gi0/0'] = { ...ospfR2State.ports['gi0/0'], ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', status: 'connected', shutdown: false };
  ospfR2State.dynamicRoutes = [{ destination: '172.16.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1', metric: 1, type: 'dynamic', area: 1 }];

  return {
    id: 'trouble-ospf-area',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'OSPF Alan Hatası' : 'OSPF Area Mismatch',
    description: isTr ? 'Routerlar komşuluk kuramıyor. OSPF alanlarını (area) kontrol edin.' : 'Routers cannot establish adjacency. Check OSPF areas.',
    level: 'intermediate',
    injectedFaults: [
      {
        id: 'fault-ospf-area',
        deviceId: 'router-2',
        faultType: 'wrongVlan',
        description: { tr: 'R2 OSPF alanı 1 olarak ayarlanmış (0 olmalı).', en: 'R2 OSPF area is set to 1 (should be 0).' },
        configKey: 'dynamicRoutes.0.area',
        faultValue: 1,
        correctValue: 0,
        hint: { tr: 'İki router da aynı OSPF alanında (Area 0) olmalıdır.', en: 'Both routers must be in the same OSPF area (Area 0).' }
      }
    ],
    data: baseProjectData(ospfTroubleDevices, ospfTroubleConnections, [], [
      { id: 'router-1', state: ospfR1State },
      { id: 'router-2', state: ospfR2State }
    ])
  };
};

export default example;
