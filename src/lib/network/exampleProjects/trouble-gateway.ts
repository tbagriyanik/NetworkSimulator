import { createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import { createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const troubleGwDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1, '192.168.1.254'),
    createRouterDevice('router-1', 'R1', 300, 100)
  ];
  const troubleGwConnections: CanvasConnection[] = [];
  connectPorts(troubleGwDevices, troubleGwConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0', 'crossover');

  const troubleGwR1State = createInitialRouterState();
  troubleGwR1State.hostname = 'R1';
  troubleGwR1State.ports['gi0/0'] = { ...troubleGwR1State.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' };
  troubleGwDevices[0].gateway = '192.168.1.254';

  return {
    id: 'trouble-gateway',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Yanlış Ağ Geçidi' : 'Wrong Default Gateway',
    description: isTr ? 'PC1 router\'a ulaşamıyor. Gateway ayarlarını kontrol edin.' : 'PC1 cannot reach the router. Check gateway settings.',
    level: 'basic',
    injectedFaults: [
      {
        id: 'fault-gw-pc1',
        deviceId: 'pc-1',
        faultType: 'wrongDefaultGateway',
        description: { tr: 'PC1\'in gateway adresi yanlış (192.168.1.254).', en: 'PC1 gateway address is wrong (192.168.1.254).' },
        configKey: 'pc.pc-1.gateway',
        faultValue: '192.168.1.254',
        correctValue: '192.168.1.1'
      }
    ],
    data: baseProjectData(troubleGwDevices, troubleGwConnections, [], [{ id: 'router-1', state: troubleGwR1State }])
  };
};

export default example;
