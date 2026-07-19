import { createPcDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const troubleMaskDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1),
    createPcDevice('pc-2', 'PC-2', 300, 100, '192.168.1.20', 1)
  ];
  const troubleMaskConnections: CanvasConnection[] = [];
  connectPorts(troubleMaskDevices, troubleMaskConnections, 'pc-1', 'eth0', 'pc-2', 'eth0', 'crossover');
  troubleMaskDevices[1].subnet = '255.255.255.240';

  return {
    id: 'trouble-mask',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Yanlış Alt Ağ Maskesi' : 'Incorrect Subnet Mask',
    description: isTr ? 'PC1 ve PC2 aynı ağda olmasına rağmen iletişim kuramıyor.' : 'PC1 and PC2 are on the same network but cannot communicate.',
    level: 'basic',
    injectedFaults: [
      {
        id: 'fault-mask-pc2',
        deviceId: 'pc-2',
        faultType: 'wrongSubnetMask',
        description: { tr: 'PC2\'nin maskesi 255.255.255.240 olarak ayarlanmış.', en: 'PC2 mask is set to 255.255.255.240.' },
        configKey: 'pc.pc-2.subnet',
        faultValue: '255.255.255.240',
        correctValue: '255.255.255.0'
      }
    ],
    data: baseProjectData(troubleMaskDevices, troubleMaskConnections, [], [])
  };
};

export default example;
