import { createInitialState } from '../initialState';
import { createSwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const stpTriangleDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.1.10', 1),
    createPcDevice('pc-2', 'PC-2', 40, 400, '192.168.1.11', 1),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createSwitchDevice('switch-2', 'SW2', 440, 190),
    createSwitchDevice('switch-3', 'SW3', 340, 350)
  ];
  const stpTriangleConnections: CanvasConnection[] = [];
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/24');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/24');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'switch-1', 'fa0/1', 'switch-3', 'fa0/1', 'crossover');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'switch-1', 'fa0/2', 'switch-2', 'fa0/1', 'crossover');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'switch-2', 'fa0/2', 'switch-3', 'fa0/2', 'crossover');
  const stpTriangleNotes: CanvasNote[] = [
    {
      id: 'stp-triangle-note',
      text: isTr
        ? 'Amaç: Üç switch arasında triangle topolojide STP kullanarak loop önlemek ve path sağlamak.\n\n🔄 STP Triangle Topology (3 Switch):\n\nSW1, SW2, SW3 üçgen topolojide bağlı.\n\nÜçgen bağlantı:\n- SW1 Fa0/1 ↔ SW3 Fa0/1: Altn BLK\n- SW1 Fa0/2 ↔ SW2 Fa0/1: Desg FWD\n- SW2 Fa0/2 ↔ SW3 Fa0/2: Desg FWD\n\nGörevler:\n1) show spanning-tree ile STP durumunu kontrol et\n2) Bloke port (SW1 Fa0/1)\n3) SW1 Fa0/1 kablo kesilirse otomatik aktif olur\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔄 STP Triangle Topology (3 Switches):\n\nSW1, SW2, SW3 connected in triangle topology.\n\nTriangle connections:\n- SW1 Fa0/1 ↔ SW3 Fa0/1: Altn BLK\n- SW1 Fa0/2 ↔ SW2 Fa0/1: Desg FWD\n- SW2 Fa0/2 ↔ SW3 Fa0/2: Desg FWD\n\nTasks:\n1) Verify STP state with show spanning-tree\n2) Blocked port (SW1 Fa0/1) \n3) If SW1 Fa0/1 fails, it automatically becomes active\n\n⚠️ Note: Refresh Network (F5)',
      x: 600,
      y: 40,
      width: 500,
      height: 260,
      color: 'var(--color-warning-400)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const stpTriangleSw1 = createInitialState('00-1a-2b-3c-4d-5e');
  stpTriangleSw1.hostname = 'SW1';
  stpTriangleSw1.spanningTreeMode = 'rapid-pvst';
  stpTriangleSw1.spanningTreePriority = 32768;
  stpTriangleSw1.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/24', 'FA0/1', 'FA0/2'] };
  stpTriangleSw1.ports['fa0/24'] = {
    ...stpTriangleSw1.ports['fa0/24'],
    vlan: 1,
    mode: 'access',
    status: 'connected'
  };
  stpTriangleSw1.ports['fa0/1'] = {
    ...stpTriangleSw1.ports['fa0/1'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  stpTriangleSw1.ports['fa0/2'] = {
    ...stpTriangleSw1.ports['fa0/2'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };

  const stpTriangleSw2 = createInitialState('00:1A:2B:3C:4D:5F');
  stpTriangleSw2.hostname = 'SW2';
  stpTriangleSw2.spanningTreeMode = 'rapid-pvst';
  stpTriangleSw2.spanningTreePriority = 28672;
  stpTriangleSw2.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/24', 'FA0/1', 'FA0/2'] };
  stpTriangleSw2.ports['fa0/24'] = {
    ...stpTriangleSw2.ports['fa0/24'],
    vlan: 1,
    mode: 'access',
    status: 'connected'
  };
  stpTriangleSw2.ports['fa0/1'] = {
    ...stpTriangleSw2.ports['fa0/1'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  stpTriangleSw2.ports['fa0/2'] = {
    ...stpTriangleSw2.ports['fa0/2'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };

  const stpTriangleSw3 = createInitialState('00:1A:2B:3C:4D:60');
  stpTriangleSw3.hostname = 'SW3';
  stpTriangleSw3.spanningTreeMode = 'rapid-pvst';
  stpTriangleSw3.spanningTreePriority = 32768;
  stpTriangleSw3.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/1', 'FA0/2'] };
  stpTriangleSw3.ports['fa0/1'] = {
    ...stpTriangleSw3.ports['fa0/1'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  stpTriangleSw3.ports['fa0/2'] = {
    ...stpTriangleSw3.ports['fa0/2'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };

  return {
    id: 'stp-triangle',
    tag: isTr ? 'STP' : 'STP',
    title: isTr ? 'STP Triangle Topology' : 'STP Triangle Topology',
    description: isTr
      ? 'Üç switch triangle topolojisinde STP bir portu bloke eder.'
      : 'Three switches in triangle topology with STP blocking one port.',
    detail: isTr
      ? 'SW1 Fa0/1 bloke (STP), SW2 root'
      : 'SW1 Fa0/1 blocked (STP), SW2 root',
    level: 'advanced',
    data: baseProjectData(stpTriangleDevices, stpTriangleConnections, stpTriangleNotes, [
      { id: 'switch-1', state: stpTriangleSw1 },
      { id: 'switch-2', state: stpTriangleSw2 },
      { id: 'switch-3', state: stpTriangleSw3 }
    ])
  };
};

export default example;


