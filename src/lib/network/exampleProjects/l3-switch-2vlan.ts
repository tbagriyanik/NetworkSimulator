import { createInitialState } from '../initialState';
import { createL3SwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
;
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const l3Switch2VlanDevices = [
    createL3SwitchDevice('switch2', 'Switch2', 300, 200),
    createPcDevice('pc4', 'PC4', 50, 100, '192.168.10.10', 10, '192.168.10.1'),
    createPcDevice('pc5', 'PC5', 50, 180, '192.168.10.15', 10, '192.168.10.1'),
    createPcDevice('pc6', 'PC6', 50, 260, '192.168.20.10', 20, '192.168.20.1'),
    createPcDevice('pc7', 'PC7', 50, 340, '192.168.20.15', 20, '192.168.20.1'),
    createL3SwitchDevice('switch4', 'Switch4', 700, 200),
    createPcDevice('pc8', 'PC8', 950, 100, '192.168.10.20', 10, '192.168.10.1'),
    createPcDevice('pc9', 'PC9', 950, 180, '192.168.10.30', 10, '192.168.10.1'),
    createPcDevice('pc10', 'PC10', 950, 260, '192.168.20.20', 20, '192.168.20.1'),
    createPcDevice('pc11', 'PC11', 950, 340, '192.168.20.30', 20, '192.168.20.1')
  ];

  const l3Switch2VlanConnections: CanvasConnection[] = [];
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'switch2', 'gi1/0/5', 'switch4', 'gi1/0/5', 'crossover');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc4', 'eth0', 'switch2', 'gi1/0/1');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc5', 'eth0', 'switch2', 'gi1/0/2');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc6', 'eth0', 'switch2', 'gi1/0/3');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc7', 'eth0', 'switch2', 'gi1/0/4');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc8', 'eth0', 'switch4', 'gi1/0/1');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc9', 'eth0', 'switch4', 'gi1/0/2');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc10', 'eth0', 'switch4', 'gi1/0/3');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc11', 'eth0', 'switch4', 'gi1/0/4');

  const l3Switch2VlanNotes: CanvasNote[] = [
    {
      id: 'l3-switch2-vlan-note',
      text: isTr
        ? 'Amaç: İki L3 switch arasında trunk bağlantısı ile VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet L3 Switch (Switch2, Switch4) ekle\n   - 8 adet PC ekle (PC4-PC11)\n   - Switch2 Gi1/0/5 -> Switch4 Gi1/0/5 (Crossover kablo)\n   - PC4-PC5 -> Switch2 Gi1/0/1-2 (VLAN 10)\n   - PC6-PC7 -> Switch2 Gi1/0/3-4 (VLAN 20)\n   - PC8-PC9 -> Switch4 Gi1/0/1-2 (VLAN 10)\n   - PC10-PC11 -> Switch4 Gi1/0/3-4 (VLAN 20)\n\n2) SWITCH2 KONFİGÜRASYONU:\n   - Switch2 terminaline gir: enable, conf t\n   - vlan 10\n     name AG1\n   - exit\n   - vlan 20\n     name AG2\n   - exit\n   - ip routing\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/5\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n   - interface range gi1/0/1-2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi1/0/3-4\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) SWITCH4 KONFİGÜRASYONU:\n   - Switch4 terminaline gir: enable, conf t\n   - Aynı yapılandırma Switch2 ile aynı\n\n4) PC KONFİGÜRASYONU:\n   - VLAN 10 PC\'ler: IP 192.168.10.x, GW 192.168.10.1\n   - VLAN 20 PC\'ler: IP 192.168.20.x, GW 192.168.20.1\n\n5) TEST:\n   - Tüm PC\'ler birbirine ping atabilir'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 L3 Switches (Switch2, Switch4)\n   - Add 8 PCs (PC4-PC11)\n   - Connect Switch2 Gi1/0/5 -> Switch4 Gi1/0/5 (Crossover cable)\n   - Connect PC4-PC5 -> Switch2 Gi1/0/1-2 (VLAN 10)\n   - Connect PC6-PC7 -> Switch2 Gi1/0/3-4 (VLAN 20)\n   - Connect PC8-PC9 -> Switch4 Gi1/0/1-2 (VLAN 10)\n   - Connect PC10-PC11 -> Switch4 Gi1/0/3-4 (VLAN 20)\n\n2) SWITCH2 CONFIGURATION:\n   - Enter Switch2 terminal: enable, conf t\n   - vlan 10\n     name AG1\n   - exit\n   - vlan 20\n     name AG2\n   - exit\n   - ip routing\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/5\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n   - interface range gi1/0/1-2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi1/0/3-4\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) SWITCH4 CONFIGURATION:\n   - Enter Switch4 terminal: enable, conf t\n   - Same configuration as Switch2\n\n4) PC CONFIGURATION:\n   - VLAN 10 PCs: IP 192.168.10.x, GW 192.168.10.1\n   - VLAN 20 PCs: IP 192.168.20.x, GW 192.168.20.1\n\n5) TEST:\n   - All PCs can ping each other',
      x: 400,
      y: 400,
      width: 520,
      height: 380,
      color: 'var(--color-warning-600)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const l3Switch2State = createInitialState('00:1A:2B:3C:4D:70', 'WS-C3650-24PS');
  l3Switch2State.hostname = 'Switch2';
  l3Switch2State.switchModel = 'WS-C3650-24PS';
  l3Switch2State.switchLayer = 'L3';
  l3Switch2State.ipRouting = true;
  l3Switch2State.vlans[10] = { id: 10, name: 'AG1', status: 'active', ports: ['GI1/0/1', 'GI1/0/2', 'GI1/0/5'] };
  l3Switch2State.vlans[20] = { id: 20, name: 'AG2', status: 'active', ports: ['GI1/0/3', 'GI1/0/4', 'GI1/0/5'] };
  l3Switch2State.ports['vlan10'] = {
    id: 'vlan10',
    name: 'VLAN10',
    status: 'connected',
    vlan: 10,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch2State.ports['vlan20'] = {
    id: 'vlan20',
    name: 'VLAN20',
    status: 'connected',
    vlan: 20,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch2State.ports['gi1/0/1'] = { id: 'gi1/0/1', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/2'] = { id: 'gi1/0/2', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/3'] = { id: 'gi1/0/3', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/4'] = { id: 'gi1/0/4', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/5'] = { id: 'gi1/0/5', name: '', status: 'connected', vlan: 1, mode: 'trunk', allowedVlans: 'all', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.runningConfig = [
    '!',
    'hostname Switch2',
    '!',
    'vlan 10',
    ' name AG1',
    '!',
    'vlan 20',
    ' name AG2',
    '!',
    'ip routing',
    '!',
    'interface vlan 10',
    ' ip address 192.168.10.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface vlan 20',
    ' ip address 192.168.20.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface range gi1/0/1-2',
    ' switchport access vlan 10',
    ' switchport mode access',
    '!',
    'interface range gi1/0/3 - 4',
    ' switchport access vlan 20',
    ' switchport mode access',
    '!',
    'interface gi1/0/5',
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    ' switchport trunk allowed vlan all',
    '!',
    'end'
  ];

  const l3Switch4State = createInitialState('00:1A:2B:3C:4D:71', 'WS-C3650-24PS');
  l3Switch4State.hostname = 'Switch4';
  l3Switch4State.switchModel = 'WS-C3650-24PS';
  l3Switch4State.switchLayer = 'L3';
  l3Switch4State.ipRouting = true;
  l3Switch4State.vlans[10] = { id: 10, name: 'AG1', status: 'active', ports: ['GI1/0/1', 'GI1/0/2', 'GI1/0/5'] };
  l3Switch4State.vlans[20] = { id: 20, name: 'AG2', status: 'active', ports: ['GI1/0/3', 'GI1/0/4', 'GI1/0/5'] };
  l3Switch4State.ports['vlan10'] = {
    id: 'vlan10',
    name: 'VLAN10',
    status: 'connected',
    vlan: 10,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch4State.ports['vlan20'] = {
    id: 'vlan20',
    name: 'VLAN20',
    status: 'connected',
    vlan: 20,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch4State.ports['gi1/0/1'] = { id: 'gi1/0/1', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/2'] = { id: 'gi1/0/2', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/3'] = { id: 'gi1/0/3', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/4'] = { id: 'gi1/0/4', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/5'] = { id: 'gi1/0/5', name: '', status: 'connected', vlan: 1, mode: 'trunk', allowedVlans: 'all', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.runningConfig = [
    '!',
    'hostname Switch4',
    '!',
    'vlan 10',
    ' name AG1',
    '!',
    'vlan 20',
    ' name AG2',
    '!',
    'ip routing',
    '!',
    'interface vlan 10',
    ' ip address 192.168.10.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface vlan 20',
    ' ip address 192.168.20.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface range gi1/0/1-2',
    ' switchport access vlan 10',
    ' switchport mode access',
    '!',
    'interface range gi1/0/3 - 4',
    ' switchport access vlan 20',
    ' switchport mode access',
    '!',
    'interface gi1/0/5',
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    ' switchport trunk allowed vlan all',
    '!',
    'end'
  ];

  return {
    id: 'l3-switch-2vlan',
    tag: isTr ? 'L3 VLAN' : 'L3 VLAN',
    title: isTr ? '2 L3 Switch VLAN (AG1/AG2)' : '2 L3 Switch VLAN (AG1/AG2)',
    description: isTr
      ? 'İki L3 switch SVI gateway ile VLAN 10 ve 20 arası routing sağlar.'
      : 'Two L3 switches provide routing between VLAN 10 and 20 via SVI gateways.',
    detail: isTr
      ? 'Switch2/4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1'
      : 'Switch2/4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1',
    level: 'advanced',
    data: baseProjectData(l3Switch2VlanDevices, l3Switch2VlanConnections, l3Switch2VlanNotes, [
      { id: 'switch2', state: l3Switch2State },
      { id: 'switch4', state: l3Switch4State }
    ])
  };
};

export default example;


