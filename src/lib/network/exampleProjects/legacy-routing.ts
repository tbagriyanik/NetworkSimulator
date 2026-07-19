import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const legacyRoutingDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.0.2', 10, '192.168.0.1'),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.1.2', 20, '192.168.1.1'),
    createSwitchDevice('switch-1', 'SW1', 260, 190),
    createRouterDevice('router-1', 'R1', 520, 190)
  ];
  const legacyRoutingConnections: CanvasConnection[] = [];
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/12');
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'router-1', 'gi0/1', 'switch-1', 'fa0/11', 'crossover');
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'router-1', 'gi0/0', 'switch-1', 'fa0/1', 'crossover');
  const legacyRoutingSw = createInitialState();
  legacyRoutingSw.hostname = 'SW1';
  legacyRoutingSw.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/2', 'FA0/11'] };
  legacyRoutingSw.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/12', 'FA0/1'] };
  legacyRoutingSw.ports['fa0/2'] = { ...legacyRoutingSw.ports['fa0/2'], vlan: 10, mode: 'access', status: 'connected' };
  legacyRoutingSw.ports['fa0/12'] = { ...legacyRoutingSw.ports['fa0/12'], vlan: 20, mode: 'access', status: 'connected' };
  legacyRoutingSw.ports['fa0/11'] = { ...legacyRoutingSw.ports['fa0/11'], vlan: 10, mode: 'access', status: 'connected' };
  legacyRoutingSw.ports['fa0/1'] = { ...legacyRoutingSw.ports['fa0/1'], vlan: 20, mode: 'access', status: 'connected' };
  const legacyRoutingRouter = createInitialRouterState('00:50:00:00:00:06');
  legacyRoutingRouter.hostname = 'R1';
  legacyRoutingRouter.ipRouting = true;
  legacyRoutingRouter.ports['gi0/1'] = { ...legacyRoutingRouter.ports['gi0/1'], ipAddress: '192.168.0.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  legacyRoutingRouter.ports['gi0/0'] = { ...legacyRoutingRouter.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  const legacyRoutingNotes: CanvasNote[] = [
    {
      id: 'legacy-routing-note',
      text: isTr
        ? 'Amaç: Router üzerinde ayrı fiziksel interface\'ler kullanarak VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet Router (R1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/2 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/12 (Straight kablo)\n   - R1 Gi0/1 -> SW1 Fa0/11 (Crossover kablo)\n   - R1 Gi0/0 -> SW1 Fa0/1 (Crossover kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/12\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface fa0/11\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - interface gi0/1\n     ip address 192.168.0.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/0\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing (otomatik aktiftir)\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.0.2, Subnet 255.255.255.0, Gateway 192.168.0.1, VLAN 10\n   - PC-2: IP 192.168.1.2, Subnet 255.255.255.0, Gateway 192.168.1.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.1.2 (PC-2) - Başarılı (inter-VLAN routing)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 Router (R1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/2 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/12 (Straight cable)\n   - Connect R1 Gi0/1 -> SW1 Fa0/11 (Crossover cable)\n   - Connect R1 Gi0/0 -> SW1 Fa0/1 (Crossover cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/12\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface fa0/11\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - interface gi0/1\n     ip address 192.168.0.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/0\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing (auto-enabled)\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.0.2, Subnet 255.255.255.0, Gateway 192.168.0.1, VLAN 10\n   - PC-2: IP 192.168.1.2, Subnet 255.255.255.0, Gateway 192.168.1.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.1.2 (PC-2) - Success (inter-VLAN routing)',
      x: 600,
      y: 40,
      width: 500,
      height: 340,
      color: 'var(--color-warning-600)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'legacy-routing',
    tag: isTr ? 'LEGACY ROUTING' : 'LEGACY ROUTING',
    title: isTr ? 'Legacy Inter-VLAN Routing' : 'Legacy Inter-VLAN Routing',
    description: isTr
      ? 'Router iki fiziksel interface ile VLANlara bağlanır, trunk kullanılmaz.'
      : 'Router connects to VLANs using two physical interfaces without trunk.',
    detail: isTr
      ? 'Router Gi0/1: VLAN 10 (192.168.0.1), Gi0/0: VLAN 20 (192.168.1.1)'
      : 'Router Gi0/1: VLAN 10 (192.168.0.1), Gi0/0: VLAN 20 (192.168.1.1)',
    level: 'intermediate',
    data: baseProjectData(legacyRoutingDevices, legacyRoutingConnections, legacyRoutingNotes, [
      { id: 'switch-1', state: legacyRoutingSw },
      { id: 'router-1', state: legacyRoutingRouter }
    ])
  };
};

export default example;

