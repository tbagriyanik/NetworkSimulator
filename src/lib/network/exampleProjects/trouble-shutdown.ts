import { createPcDevice, createSwitchDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection } from '@/components/network/networkTopology.types';
import { createInitialState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const troubleShutDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1),
    createSwitchDevice('switch-1', 'SW1', 300, 100)
  ];
  const troubleShutConnections: CanvasConnection[] = [];
  connectPorts(troubleShutDevices, troubleShutConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');

  const troubleShutSwState = createInitialState();
  troubleShutSwState.hostname = 'SW1';
  troubleShutSwState.ports['fa0/1'] = { ...troubleShutSwState.ports['fa0/1'], shutdown: true, status: 'notconnect' };

  return {
    id: 'trouble-shutdown',
    tag: isTr ? 'ARIZA' : 'TROUBLE',
    title: isTr ? 'Kapalı Arayüz' : 'Shutdown Interface',
    description: isTr ? 'Fiziksel bağlantı var ama LED\'ler sönük. Sorunu bulun.' : 'Physical connection exists but LEDs are off. Find the issue.',
    level: 'basic',
    injectedFaults: [
      {
        id: 'fault-shut-fa01',
        deviceId: 'switch-1',
        faultType: 'shutdownInterface',
        description: { tr: 'Switch Fa0/1 portu shutdown durumunda.', en: 'Switch port Fa0/1 is shutdown.' },
        configKey: 'ports.fa0/1.shutdown',
        faultValue: true,
        correctValue: false
      }
    ],
    data: baseProjectData(troubleShutDevices, troubleShutConnections, [], [{ id: 'switch-1', state: troubleShutSwState }])
  };
};

export default example;
