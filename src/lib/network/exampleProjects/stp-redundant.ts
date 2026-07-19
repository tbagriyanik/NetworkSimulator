import { createInitialState } from '../initialState';
import { createSwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const stpDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.10.11', 10),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createSwitchDevice('switch-2', 'SW2', 440, 190)
  ];
  const stpConnections: CanvasConnection[] = [];
  connectPorts(stpDevices, stpConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(stpDevices, stpConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(stpDevices, stpConnections, 'switch-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  connectPorts(stpDevices, stpConnections, 'switch-1', 'gi0/2', 'switch-2', 'gi0/2', 'crossover');
  const stpNotes: CanvasNote[] = [
    {
      id: 'stp-note',
      text: isTr
        ? 'Amaç: STP kullanarak redundant link\'lerde loop önlemek ve path sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Switch (SW1, SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)\n   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)\n   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)\n\n2) SW1 KONFİGÜRASYONU (ROOT BRIDGE):\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - spanning-tree vlan 10 priority 28672\n   - exit\n\n3) SW2 KONFİGÜRASYONU:\n   - SW2 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show spanning-tree (STP durumunu gör)\n   - SW1 Gi0/2 bloke olmalı (BLK)\n   - Gi0/1 kablo kesilirse Gi0/2 otomatik aktif olur\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Fa0/1 (Straight cable)\n   - Connect SW1 Gi0/1 -> SW2 Gi0/1 (Crossover cable)\n   - Connect SW1 Gi0/2 -> SW2 Gi0/2 (Crossover cable)\n\n2) SW1 CONFIGURATION (ROOT BRIDGE):\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - spanning-tree vlan 10 priority 28672\n   - exit\n\n3) SW2 CONFIGURATION:\n   - Enter SW2 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show spanning-tree (view STP status)\n   - SW1 Gi0/2 should be blocked (BLK)\n   - If Gi0/1 fails, Gi0/2 automatically becomes active\n\n⚠️ Note: Refresh Network (F5)',
      x: 600,
      y: 40,
      width: 500,
      height: 360,
      color: 'var(--color-warning-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const stpSw1 = createInitialState('00:1A:2B:3C:4D:65');
  stpSw1.hostname = 'SW1';
  stpSw1.spanningTreeMode = 'rapid-pvst';
  stpSw1.spanningTreePriority = 28672;
  stpSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  stpSw1.ports['fa0/1'] = {
    ...stpSw1.ports['fa0/1'],
    vlan: 10,
    mode: 'access',
    status: 'connected',
    spanningTree: { role: 'root', state: 'forwarding' }
  };
  stpSw1.ports['gi0/1'] = {
    ...stpSw1.ports['gi0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'designated', state: 'forwarding' }
  };
  stpSw1.ports['gi0/2'] = {
    ...stpSw1.ports['gi0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'alternate', state: 'blocking' }
  };

  const stpSw2 = createInitialState('00:1A:2B:3C:4D:66');
  stpSw2.hostname = 'SW2';
  stpSw2.spanningTreeMode = 'rapid-pvst';
  stpSw2.spanningTreePriority = 32768;
  stpSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  stpSw2.ports['fa0/1'] = {
    ...stpSw2.ports['fa0/1'],
    vlan: 10,
    mode: 'access',
    status: 'connected',
    spanningTree: { role: 'designated', state: 'forwarding' }
  };
  stpSw2.ports['gi0/1'] = {
    ...stpSw2.ports['gi0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'root', state: 'forwarding' }
  };
  stpSw2.ports['gi0/2'] = {
    ...stpSw2.ports['gi0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'alternate', state: 'blocking' }
  };

  return {
    id: 'stp-redundant',
    tag: isTr ? 'STP' : 'STP',
    title: isTr ? 'STP Redundant Links' : 'STP Redundant Links',
    description: isTr
      ? 'Rapid-PVST redundant linklerde loop önlemek için STP kullanır.'
      : 'Rapid-PVST uses STP to prevent loops on redundant links.',
    detail: isTr
      ? 'SW1: spanning-tree priority 28672 (root)'
      : 'SW1: spanning-tree priority 28672 (root)',
    level: 'advanced',
    data: baseProjectData(stpDevices, stpConnections, stpNotes, [
      { id: 'switch-1', state: stpSw1 },
      { id: 'switch-2', state: stpSw2 }
    ])
  };
};

export default example;


