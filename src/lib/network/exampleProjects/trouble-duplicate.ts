import { createPcDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const troubleDuplicateDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1),
    createPcDevice('pc-2', 'PC-2', 300, 100, '192.168.1.10', 1)
  ];
  const troubleDuplicateConnections: CanvasConnection[] = [];
  connectPorts(troubleDuplicateDevices, troubleDuplicateConnections, 'pc-1', 'eth0', 'pc-2', 'eth0', 'crossover');
  troubleDuplicateDevices[1].ip = '192.168.1.10';

  return {
    id: 'trouble-duplicate',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Çakışan IP Adresi' : 'Duplicate IP Address',
    description: isTr ? 'Ağda iki cihaz aynı IP adresini kullanıyor. Çakışmayı giderin.' : 'Two devices in the network use the same IP. Resolve the conflict.',
    level: 'basic',
    injectedFaults: [
      {
        id: 'fault-dup-pc2',
        deviceId: 'pc-2',
        faultType: 'duplicateIp',
        description: { tr: 'PC-2, PC-1 ile aynı IP\'ye (192.168.1.10) sahip.', en: 'PC-2 has the same IP (192.168.1.10) as PC-1.' },
        configKey: 'pc.pc-2.ip',
        faultValue: '192.168.1.10',
        correctValue: '192.168.1.11'
      }
    ],
    data: baseProjectData(troubleDuplicateDevices, troubleDuplicateConnections, [], [])
  };
};

export default example;
