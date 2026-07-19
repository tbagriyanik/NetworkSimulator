import { createPcDevice, createSwitchDevice, connectPorts, baseProjectData } from './helpers';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import { createInitialState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const vtpDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 220, '192.168.10.10', 10),
    createSwitchDevice('switch-1', 'SW1', 240, 140),
    createSwitchDevice('switch-2', 'SW2', 440, 260)
  ];
  const vtpConnections: CanvasConnection[] = [];
  connectPorts(vtpDevices, vtpConnections, 'pc-1', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(vtpDevices, vtpConnections, 'switch-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  const vtpNotes: CanvasNote[] = [
    {
      id: 'vtp-note-1',
      text: isTr
        ? 'Amaç: İki switch arasında VTP kullanarak VLAN bilgilerinin otomatik yayılımını sağlamak.\n\nTrunk + VTP:\nSW1 (server): vtp mode server, vtp domain LAB\nSW2 (client): vtp mode client, vtp domain LAB\nGi0/1 trunk olmalı.\nSW1\'de VLAN 10/20 aç -> SW2\'ye otomatik gelmeli.\nshow interface trunk ve show vlan brief ile doğrula.'
        : 'Goal: Automate VLAN propagation between two switches using VTP.\n\nTrunk + VTP:\nSW1 (server): vtp mode server, vtp domain LAB\nSW2 (client): vtp mode client, vtp domain LAB\nGi0/1 must be trunk.\nCreate VLAN 10/20 on SW1 -> should appear on SW2.\nVerify with show interface trunk and show vlan brief.',
      x: 600,
      y: 40,
      width: 420,
      height: 190,
      color: 'var(--color-warning-500)',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];
  const vtpSw1 = createInitialState('00:1A:2B:3C:4D:61');
  vtpSw1.hostname = 'SW1';
  vtpSw1.vtpMode = 'server';
  vtpSw1.vtpDomain = 'LAB';
  vtpSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI0/1'] };
  vtpSw1.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI0/1'] };
  vtpSw1.ports['gi0/1'] = { ...vtpSw1.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected' };
  const vtpSw2 = createInitialState('00:1A:2B:3C:4D:62');
  vtpSw2.hostname = 'SW2';
  vtpSw2.vtpMode = 'client';
  vtpSw2.vtpDomain = 'LAB';
  vtpSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1', 'GI0/1'] };
  vtpSw2.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI0/1'] };
  vtpSw2.ports['gi0/1'] = { ...vtpSw2.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected' };
  vtpSw2.ports['fa0/1'] = { ...vtpSw2.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };

  return {
    id: 'trunk-vtp',
    tag: isTr ? 'TRUNK/VTP' : 'TRUNK/VTP',
    title: isTr ? '2 Switch Trunk + VTP' : 'Two Switch Trunk + VTP',
    description: isTr
      ? 'İki switch arası trunk bağlantısı ve VTP domain ile VLAN yayılımı sağlanır.'
      : 'Trunk connection between two switches with VTP domain for VLAN propagation.',
    detail: isTr
      ? 'VTP domain: LAB, Gi0/1 trunk, VLAN 10/20 otomatik yayılır'
      : 'VTP domain: LAB, Gi0/1 trunk, VLAN 10/20 auto-propagated',
    level: 'intermediate',
    data: baseProjectData(vtpDevices, vtpConnections, vtpNotes, [
      { id: 'switch-1', state: vtpSw1 },
      { id: 'switch-2', state: vtpSw2 }
    ])
  };
};

export default example;
