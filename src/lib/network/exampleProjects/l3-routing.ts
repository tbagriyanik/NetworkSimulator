import { createInitialState } from '../initialState';
import { createL3SwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
;

const example = (isTr: boolean): ExampleProject => {
  const l3RoutingDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10, '192.168.10.1'),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20, '192.168.20.1'),
    createPcDevice('pc-3', 'PC-3', 40, 400, '192.168.30.10', 30, '192.168.30.1'),
    createPcDevice('pc-4', 'PC-4', 40, 540, '192.168.40.10', 40, '192.168.40.1'),
    createL3SwitchDevice('switch-1', 'L3SW1', 260, 330)
  ];
  const l3RoutingConnections: CanvasConnection[] = [];
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-1', 'eth0', 'switch-1', 'gi1/0/1');
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-2', 'eth0', 'switch-1', 'gi1/0/2');
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-3', 'eth0', 'switch-1', 'gi1/0/3');
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-4', 'eth0', 'switch-1', 'gi1/0/4');
  const l3RoutingNotes: CanvasNote[] = [
    {
      id: 'l3-routing-note',
      text: isTr
        ? 'Amaç: L3 Switch üzerinde SVI interface\'leri kullanarak farklı VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet L3 Switch (L3SW1) ekle\n   - 4 adet PC ekle (PC-1, PC-2, PC-3, PC-4)\n   - PC-1 Eth0 -> L3SW1 Gig1/0/1 (Straight kablo)\n   - PC-2 Eth0 -> L3SW1 Gig1/0/2 (Straight kablo)\n   - PC-3 Eth0 -> L3SW1 Gi1/0/3 (Straight kablo)\n   - PC-4 Eth0 -> L3SW1 Gi1/0/4 (Straight kablo)\n\n2) L3 SWITCH KONFİGÜRASYONU:\n   - L3SW1 terminaline gir: enable, conf t\n   - ip routing\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - vlan 30\n     name VLAN30\n   - exit\n   - vlan 40\n     name VLAN40\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 30\n     ip address 192.168.30.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 40\n     ip address 192.168.40.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi1/0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi1/0/3\n     switchport mode access\n     switchport access vlan 30\n   - exit\n   - interface gi1/0/4\n     switchport mode access\n     switchport access vlan 40\n   - exit\n\n3) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n   - PC-3: IP 192.168.30.10, GW 192.168.30.1, VLAN 30\n   - PC-4: IP 192.168.40.10, GW 192.168.40.1, VLAN 40\n\n4) TEST:\n   - show ip route (routing tablosunu gör)\n   - Tüm PC\'ler birbirine ping atabilir'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 L3 Switch (L3SW1)\n   - Add 4 PCs (PC-1, PC-2, PC-3, PC-4)\n   - Connect PC-1 Eth0 -> L3SW1 Gig1/0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> L3SW1 Gig1/0/2 (Straight cable)\n   - Connect PC-3 Eth0 -> L3SW1 Gi1/0/3 (Straight cable)\n   - Connect PC-4 Eth0 -> L3SW1 Gi1/0/4 (Straight cable)\n\n2) L3 SWITCH CONFIGURATION:\n   - Enter L3SW1 terminal: enable, conf t\n   - ip routing\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - vlan 30\n     name VLAN30\n   - exit\n   - vlan 40\n     name VLAN40\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 30\n     ip address 192.168.30.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 40\n     ip address 192.168.40.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi1/0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi1/0/3\n     switchport mode access\n     switchport access vlan 30\n   - exit\n   - interface gi1/0/4\n     switchport mode access\n     switchport access vlan 40\n   - exit\n\n3) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n   - PC-3: IP 192.168.30.10, GW 192.168.30.1, VLAN 30\n   - PC-4: IP 192.168.40.10, GW 192.168.40.1, VLAN 40\n\n4) TEST:\n   - show ip route (view routing table)\n   - All PCs can ping each other',
      x: 600,
      y: 40,
      width: 500,
      height: 400,
      color: 'var(--color-success-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const l3RoutingState = createInitialState(undefined, 'WS-C3650-24PS');
  l3RoutingState.hostname = 'L3SW1';
  l3RoutingState.ipRouting = true;
  l3RoutingState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI1/0/1'] };
  l3RoutingState.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI1/0/2'] };
  l3RoutingState.vlans[30] = { id: 30, name: 'VLAN30', status: 'active', ports: ['GI1/0/3'] };
  l3RoutingState.vlans[40] = { id: 40, name: 'VLAN40', status: 'active', ports: ['GI1/0/4'] };
  l3RoutingState.ports['vlan1'] = { id: 'vlan1', name: '', status: 'connected', vlan: 1, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan10'] = { id: 'vlan10', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan20'] = { id: 'vlan20', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.20.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan30'] = { id: 'vlan30', name: '', status: 'connected', vlan: 30, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.30.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan40'] = { id: 'vlan40', name: '', status: 'connected', vlan: 40, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.40.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['gi1/0/1'] = { ...l3RoutingState.ports['gi1/0/1'], vlan: 10, mode: 'access', status: 'connected' };
  l3RoutingState.ports['gi1/0/2'] = { ...l3RoutingState.ports['gi1/0/2'], vlan: 20, mode: 'access', status: 'connected' };
  l3RoutingState.ports['gi1/0/3'] = { ...l3RoutingState.ports['gi1/0/3'], vlan: 30, mode: 'access', status: 'connected' };
  l3RoutingState.ports['gi1/0/4'] = { ...l3RoutingState.ports['gi1/0/4'], vlan: 40, mode: 'access', status: 'connected' };

  return {
    id: 'l3-routing',
    tag: isTr ? 'L3 ROUTING' : 'L3 ROUTING',
    title: isTr ? 'Inter-VLAN Routing (L3 Switch)' : 'Inter-VLAN Routing (L3 Switch)',
    description: isTr
      ? 'L3 switch üzerinde dört VLAN arası routing aktiftir.'
      : 'Inter-VLAN routing is enabled on L3 switch for four VLANs.',
    detail: isTr
      ? 'VLAN 10: 192.168.10.1, VLAN 20: 192.168.20.1, VLAN 30: 192.168.30.1, VLAN 40: 192.168.40.1'
      : 'VLAN 10: 192.168.10.1, VLAN 20: 192.168.20.1, VLAN 30: 192.168.30.1, VLAN 40: 192.168.40.1',
    level: 'advanced',
    data: baseProjectData(l3RoutingDevices, l3RoutingConnections, l3RoutingNotes, [{ id: 'switch-1', state: l3RoutingState }])
  };
};

export default example;


