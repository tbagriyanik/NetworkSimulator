import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const campusDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20),
    createSwitchDevice('switch-1', 'ACC-SW1', 240, 190),
    createRouterDevice('router-1', 'CORE-R1', 440, 190),
    createSwitchDevice('switch-2', 'ACC-SW2', 640, 190)
  ];
  const campusConnections: CanvasConnection[] = [];
  connectPorts(campusDevices, campusConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(campusDevices, campusConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(campusDevices, campusConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');
  connectPorts(campusDevices, campusConnections, 'router-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  const campusNotes: CanvasNote[] = [
    {
      id: 'campus-note',
      text: isTr
        ? 'Amaç: Campus ağ topolojisinde core router ve access switch\'ler kullanarak VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Router (CORE-R1) ekle\n   - 2 adet Switch (ACC-SW1, ACC-SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> ACC-SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> ACC-SW2 Fa0/1 (Straight kablo)\n   - ACC-SW1 Gi0/1 -> CORE-R1 Gi0/0 (Crossover kablo)\n   - ACC-SW2 Gi0/1 -> CORE-R1 Gi0/1 (Crossover kablo)\n\n2) CORE-R1 KONFİGÜRASYONU:\n   - CORE-R1 terminaline gir: enable, conf t\n   - interface gi0/0\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/1\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing\n   - exit\n\n3) ACC-SW1 KONFİGÜRASYONU:\n   - ACC-SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n4) ACC-SW2 KONFİGÜRASYONU:\n   - ACC-SW2 terminaline gir: enable, conf t\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n5) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n\n6) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Router (CORE-R1)\n   - Add 2 Switches (ACC-SW1, ACC-SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> ACC-SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> ACC-SW2 Fa0/1 (Straight cable)\n   - Connect ACC-SW1 Gi0/1 -> CORE-R1 Gi0/0 (Crossover cable)\n   - Connect ACC-SW2 Gi0/1 -> CORE-R1 Gi0/1 (Crossover cable)\n\n2) CORE-R1 CONFIGURATION:\n   - Enter CORE-R1 terminal: enable, conf t\n   - interface gi0/0\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/1\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing\n   - exit\n\n3) ACC-SW1 CONFIGURATION:\n   - Enter ACC-SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n4) ACC-SW2 CONFIGURATION:\n   - Enter ACC-SW2 terminal: enable, conf t\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n5) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n\n6) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2)',
      x: 600,
      y: 40,
      width: 500,
      height: 380,
      color: 'var(--color-warning-600)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const campusAcc1 = createInitialState('00:1A:2B:3C:4D:69');
  campusAcc1.hostname = 'ACC-SW1';
  campusAcc1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  campusAcc1.ports['fa0/1'] = { ...campusAcc1.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  campusAcc1.ports['gi0/1'] = { ...campusAcc1.ports['gi0/1'], mode: 'access', vlan: 10, status: 'connected' };

  const campusCore = createInitialRouterState('00:50:00:00:00:03');
  campusCore.hostname = 'CORE-R1';
  campusCore.ipRouting = true;
  campusCore.ports['gi0/0'] = { ...campusCore.ports['gi0/0'], ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  campusCore.ports['gi0/1'] = { ...campusCore.ports['gi0/1'], ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  campusCore.staticRoutes = [
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.10.254', metric: 1, type: 'static' },
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.20.254', metric: 1, type: 'static' }
  ];

  const campusAcc2 = createInitialState('00:1A:2B:3C:4D:6A');
  campusAcc2.hostname = 'ACC-SW2';
  campusAcc2.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/1'] };
  campusAcc2.ports['fa0/1'] = { ...campusAcc2.ports['fa0/1'], vlan: 20, mode: 'access', status: 'connected' };
  campusAcc2.ports['gi0/1'] = { ...campusAcc2.ports['gi0/1'], mode: 'access', vlan: 20, status: 'connected' };

  return {
    id: 'campus-network',
    tag: isTr ? 'CAMPUS' : 'CAMPUS',
    title: isTr ? 'Campus Network' : 'Campus Network',
    description: isTr
      ? 'Core router iki access switch arası routing sağlar.'
      : 'Core router provides routing between two access switches.',
    detail: isTr
      ? 'CORE-R1: Gi0/0 VLAN 10, Gi0/1 VLAN 20, ip routing'
      : 'CORE-R1: Gi0/0 VLAN 10, Gi0/1 VLAN 20, ip routing',
    level: 'advanced',
    data: baseProjectData(campusDevices, campusConnections, campusNotes, [
      { id: 'switch-1', state: campusAcc1 },
      { id: 'router-1', state: campusCore },
      { id: 'switch-2', state: campusAcc2 }
    ])
  };
};

export default example;

