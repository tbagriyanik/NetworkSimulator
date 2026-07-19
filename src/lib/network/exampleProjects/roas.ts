import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const roasDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20),
    createSwitchDevice('switch-1', 'SW1', 260, 190),
    createRouterDevice('router-1', 'R1', 520, 190)
  ];
  const roasConnections: CanvasConnection[] = [];
  connectPorts(roasDevices, roasConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(roasDevices, roasConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(roasDevices, roasConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');
  const roasSw = createInitialState();
  roasSw.hostname = 'SW1';
  roasSw.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  roasSw.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/2'] };
  roasSw.ports['fa0/1'] = { ...roasSw.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  roasSw.ports['fa0/2'] = { ...roasSw.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };
  roasSw.ports['gi0/1'] = { ...roasSw.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected' };
  const roasRouter = createInitialRouterState('00:50:00:00:00:05');
  roasRouter.hostname = 'R1';
  roasRouter.ports['gi0/0'] = { ...roasRouter.ports['gi0/0'], status: 'connected', shutdown: false };
  roasRouter.ports['gi0/0.10'] = {
    ...roasRouter.ports['gi0/0'],
    id: 'gi0/0.10',
    vlan: 10,
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    isSubinterface: true,
    parentInterface: 'gi0/0'
  };
  roasRouter.ports['gi0/0.20'] = {
    ...roasRouter.ports['gi0/0'],
    id: 'gi0/0.20',
    vlan: 20,
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0',
    isSubinterface: true,
    parentInterface: 'gi0/0'
  };
  const roasNotes: CanvasNote[] = [
    {
      id: 'roas-note',
      text: isTr
        ? 'Amaç: Router-on-a-Stick kullanarak tek bir router interface\'i üzerinden farklı VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet Router (R1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)\n   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n\n3) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - interface gi0/0\n     no shutdown\n   - exit\n   - interface gi0/0.10\n     encapsulation dot1q 10\n     ip address 192.168.10.1 255.255.255.0\n   - exit\n   - interface gi0/0.20\n     encapsulation dot1q 20\n     ip address 192.168.20.1 255.255.255.0\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, Gateway 192.168.20.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2) - Başarılı (inter-VLAN routing)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 Router (R1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/2 (Straight cable)\n   - Connect SW1 Gi0/1 -> R1 Gi0/0 (Crossover cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n\n3) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - interface gi0/0\n     no shutdown\n   - exit\n   - interface gi0/0.10\n     encapsulation dot1q 10\n     ip address 192.168.10.1 255.255.255.0\n   - exit\n   - interface gi0/0.20\n     encapsulation dot1q 20\n     ip address 192.168.20.1 255.255.255.0\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, Gateway 192.168.20.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2) - Success (inter-VLAN routing)',
      x: 600,
      y: 40,
      width: 500,
      height: 340,
      color: 'var(--color-primary-400)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'roas',
    tag: isTr ? 'ROAS' : 'ROAS',
    title: isTr ? 'ROAS (Router-on-a-Stick)' : 'ROAS (Router-on-a-Stick)',
    description: isTr
      ? 'Router-on-a-Stick ile tek trunk interface üzerinden inter-VLAN routing.'
      : 'Router-on-a-Stick inter-VLAN routing via single trunk interface.',
    detail: isTr
      ? 'Router subinterface: Gi0/0.10 (VLAN 10), Gi0/0.20 (VLAN 20)'
      : 'Router subinterface: Gi0/0.10 (VLAN 10), Gi0/0.20 (VLAN 20)',
    level: 'intermediate',
    data: baseProjectData(roasDevices, roasConnections, roasNotes, [
      { id: 'switch-1', state: roasSw },
      { id: 'router-1', state: roasRouter }
    ])
  };
};

export default example;

