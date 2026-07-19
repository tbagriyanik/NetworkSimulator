import { createInitialState } from '../initialState';
import { createSwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
;
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const nativeVlanDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 180, '192.168.99.10', 99),
    createPcDevice('pc-2', 'PC-2', 40, 320, '192.168.99.11', 99),
    createSwitchDevice('switch-1', 'SW1', 240, 180),
    createSwitchDevice('switch-2', 'SW2', 440, 320)
  ];
  const nativeVlanConnections: CanvasConnection[] = [];
  connectPorts(nativeVlanDevices, nativeVlanConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(nativeVlanDevices, nativeVlanConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(nativeVlanDevices, nativeVlanConnections, 'switch-1', 'fa0/24', 'switch-2', 'fa0/24', 'crossover');

  const nativeVlanSw1 = createInitialState();
  nativeVlanSw1.hostname = 'SW1';
  nativeVlanSw1.vlans[99] = { id: 99, name: 'NativeVLAN', status: 'active', ports: ['FA0/1', 'FA0/24'] };
  nativeVlanSw1.ports['fa0/1'] = { ...nativeVlanSw1.ports['fa0/1'], vlan: 99, mode: 'access', status: 'connected' };
  nativeVlanSw1.ports['fa0/24'] = { ...nativeVlanSw1.ports['fa0/24'], mode: 'trunk', nativeVlan: 99, allowedVlans: [99], status: 'connected' };

  const nativeVlanSw2 = createInitialState('00:1A:2B:3C:4D:65');
  nativeVlanSw2.hostname = 'SW2';
  nativeVlanSw2.vlans[99] = { id: 99, name: 'NativeVLAN', status: 'active', ports: ['FA0/1', 'FA0/24'] };
  nativeVlanSw2.ports['fa0/1'] = { ...nativeVlanSw2.ports['fa0/1'], vlan: 99, mode: 'access', status: 'connected' };
  nativeVlanSw2.ports['fa0/24'] = { ...nativeVlanSw2.ports['fa0/24'], mode: 'trunk', nativeVlan: 99, allowedVlans: [99], status: 'connected' };

  const nativeVlanNotes: CanvasNote[] = [
    {
      id: 'native-vlan-note',
      text: isTr
        ? 'Amaç: Trunk bağlantısında native VLAN yapılandırarak etiketsiz trafiğin belirli bir VLAN üzerinden geçmesini sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Switch ekle (SW1, SW2)\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)\n   - SW1 Fa0/24 -> SW2 Fa0/24 (Crossover kablo)\n\n2) SW1 KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n3) SW2 KONFİGÜRASYONU:\n   - SW2 terminaline gir: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99\n   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99\n\n5) TEST:\n   - show interfaces trunk (trunk ve native VLAN\'ı gör)\n   - PC-1 ping 192.168.99.11 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Fa0/1 (Straight cable)\n   - Connect SW1 Fa0/24 -> SW2 Fa0/24 (Crossover cable)\n\n2) SW1 CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n3) SW2 CONFIGURATION:\n   - Enter SW2 terminal: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99\n   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99\n\n5) TEST:\n   - show interfaces trunk (view trunk and native VLAN)\n   - PC-1 ping 192.168.99.11 (PC-2)',
      x: 500,
      y: 80,
      width: 480,
      height: 320,
      color: 'var(--color-warning-600)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  return {
    id: 'native-vlan-basic',
    tag: isTr ? 'NATIVE' : 'NATIVE',
    title: isTr ? 'Native VLAN Yapılandırması' : 'Native VLAN Configuration',
    description: isTr
      ? 'İki switch arası native VLAN 99 trunk bağlantısı yapılandırılır.'
      : 'Native VLAN 99 trunk connection is configured between two switches.',
    detail: isTr
      ? 'SW1/SW2: vlan 99, Fa0/24 trunk, switchport trunk native vlan 99'
      : 'SW1/SW2: vlan 99, Fa0/24 trunk, switchport trunk native vlan 99',
    level: 'basic',
    data: baseProjectData(nativeVlanDevices, nativeVlanConnections, nativeVlanNotes, [
      { id: 'switch-1', state: nativeVlanSw1 },
      { id: 'switch-2', state: nativeVlanSw2 }
    ])
  };
};

export default example;


