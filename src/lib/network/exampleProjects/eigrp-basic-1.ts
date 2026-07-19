import { createSwitchDevice, createL3SwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import { createInitialState } from '../initialState';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const eigrpRoutingNotes: CanvasNote[] = [
    {
      id: 'eigrp-routing-note',
      text: isTr
        ? 'Amaç: L3 switch\'ler arasında EIGRP dynamic routing yapılandırarak otomatik route öğrenimi sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet L3 Switch (ML0, ML1) ekle\n   - 2 adet L2 Switch (Switch0-L2, Switch3-L2) ekle\n   - 4 adet PC (PC0-PC3) ekle\n   - PC0-PC1 -> Switch0-L2 Fa0/1-2\n   - Switch0-L2 Fa0/24 -> ML0 Gi1/0/23\n   - ML0 Gi1/0/24 -> ML1 Gi1/0/24 (Crossover)\n   - ML1 Gi1/0/23 -> Switch3-L2 Fa0/24\n   - Switch3-L2 Fa0/1-2 -> PC2-PC3\n\n2) ML0 KONFİGÜRASYONU:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.1 255.255.255.0\n     no shutdown\n   - exit\n   - router eigrp 100\n     network 192.168.1.0 0.0.0.255\n     network 192.168.2.0 0.0.0.255\n     no auto-summary\n   - exit\n\n3) ML1 KONFİGÜRASYONU:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.3.1 255.255.255.0\n     no shutdown\n   - exit\n   - router eigrp 100\n     network 192.168.2.0 0.0.0.255\n     network 192.168.3.0 0.0.0.255\n     no auto-summary\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC0-PC1: IP 192.168.1.x, GW 192.168.1.1\n   - PC2-PC3: IP 192.168.3.x, GW 192.168.3.1\n\n5) TEST:\n   - show ip route (dinamik rotaları gör)\n   - show ip eigrp neighbors\n   - PC0 ping 192.168.3.10 (PC2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 L3 Switches (ML0, ML1)\n   - Add 2 L2 Switches (Switch0-L2, Switch3-L2)\n   - Add 4 PCs (PC0-PC3)\n   - Connect PC0-PC1 -> Switch0-L2 Fa0/1-2\n   - Connect Switch0-L2 Fa0/24 -> ML0 Gi1/0/23\n   - Connect ML0 Gi1/0/24 -> ML1 Fa0/24 (Crossover)\n   - Connect ML1 Gi1/0/23 -> Switch3-L2 Fa0/24\n   - Connect Switch3-L2 Fa0/1-2 -> PC2-PC3\n\n2) ML0 CONFIGURATION:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.1 255.255.255.0\n     no shutdown\n   - exit\n   - router eigrp 100\n     network 192.168.1.0 0.0.0.255\n     network 192.168.2.0 0.0.0.255\n     no auto-summary\n   - exit\n\n3) ML1 CONFIGURATION:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.3.1 255.255.255.0\n     no shutdown\n   - exit\n   - router eigrp 100\n     network 192.168.2.0 0.0.0.255\n     network 192.168.3.0 0.0.0.255\n     no auto-summary\n   - exit\n\n4) PC CONFIGURATION:\n   - PC0-PC1: IP 192.168.1.x, GW 192.168.1.1\n   - PC2-PC3: IP 192.168.3.x, GW 192.168.3.1\n\n5) TEST:\n   - show ip route (view dynamic routes)\n   - show ip eigrp neighbors\n   - PC0 ping 192.168.3.10 (PC2)',
      x: 450,
      y: 80,
      width: 520,
      height: 380,
      color: 'var(--color-success-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const ripRoutingDevices = [
    createPcDevice('pc0', 'PC0', 100, 500, '192.168.1.10', 1, '192.168.1.1'),
    createPcDevice('pc1', 'PC1', 300, 500, '192.168.1.11', 1, '192.168.1.1'),
    createSwitchDevice('switch0-l2', 'Switch0-L2', 200, 400),
    createL3SwitchDevice('mlswitch0', 'MultilayerSwitch0', 300, 250),
    createL3SwitchDevice('mlswitch1', 'MultilayerSwitch1', 700, 250),
    createSwitchDevice('switch3-l2', 'Switch3-L2', 800, 400),
    createPcDevice('pc2', 'PC2', 700, 500, '192.168.3.10', 1, '192.168.3.1'),
    createPcDevice('pc3', 'PC3', 900, 500, '192.168.3.20', 1, '192.168.3.1')
  ];

  const ripRoutingConnections: CanvasConnection[] = [];
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'pc0', 'eth0', 'switch0-l2', 'fa0/1');
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'pc1', 'eth0', 'switch0-l2', 'fa0/2');
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'switch0-l2', 'fa0/24', 'mlswitch0', 'gi1/0/23');
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'mlswitch0', 'gi1/0/24', 'mlswitch1', 'gi1/0/24', 'crossover');
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'mlswitch1', 'gi1/0/23', 'switch3-l2', 'fa0/24');
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'switch3-l2', 'fa0/1', 'pc2', 'eth0');
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'switch3-l2', 'fa0/2', 'pc3', 'eth0');

  const switch0L2State = createInitialState('00:1A:2B:3C:4D:92', 'WS-C2960-24TT-L');
  switch0L2State.hostname = 'Switch0-L2';
  switch0L2State.ports['fa0/1'] = { ...switch0L2State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch0L2State.ports['fa0/2'] = { ...switch0L2State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  switch0L2State.ports['fa0/24'] = { ...switch0L2State.ports['fa0/24'], vlan: 1, mode: 'access', status: 'connected' };

  const eigrpMlswitch0State = createInitialState('00:1A:2B:3C:4D:E0', 'WS-C3650-24PS');
  eigrpMlswitch0State.hostname = 'MultilayerSwitch0';
  eigrpMlswitch0State.switchModel = 'WS-C3650-24PS';
  eigrpMlswitch0State.switchLayer = 'L3';
  eigrpMlswitch0State.ipRouting = true;
  eigrpMlswitch0State.routingProtocol = 'eigrp';
  eigrpMlswitch0State.eigrpAs = '100';
  eigrpMlswitch0State.ports['gi1/0/23'] = { ...eigrpMlswitch0State.ports['gi1/0/23'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  eigrpMlswitch0State.ports['gi1/0/24'] = { ...eigrpMlswitch0State.ports['gi1/0/24'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  eigrpMlswitch0State.dynamicRoutes = [
    { destination: '192.168.3.0', subnetMask: '255.255.255.0', nextHop: '192.168.2.2', metric: 90, type: 'dynamic' }
  ];
  eigrpMlswitch0State.runningConfig = [
    '!',
    'hostname MultilayerSwitch0',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/23',
    ' no switchport',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface gi1/0/24',
    ' no switchport',
    ' ip address 192.168.2.1 255.255.255.0',
    ' no shutdown',
    '!',
    'router eigrp 100',
    ' network 192.168.1.0 0.0.0.255',
    ' network 192.168.2.0 0.0.0.255',
    ' no auto-summary',
    '!',
    'end'
  ];

  const eigrpMlswitch1State = createInitialState('00:1A:2B:3C:4D:E1', 'WS-C3650-24PS');
  eigrpMlswitch1State.hostname = 'MultilayerSwitch1';
  eigrpMlswitch1State.switchModel = 'WS-C3650-24PS';
  eigrpMlswitch1State.switchLayer = 'L3';
  eigrpMlswitch1State.ipRouting = true;
  eigrpMlswitch1State.routingProtocol = 'eigrp';
  eigrpMlswitch1State.eigrpAs = '100';
  eigrpMlswitch1State.ports['gi1/0/24'] = { ...eigrpMlswitch1State.ports['gi1/0/24'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.2.2', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  eigrpMlswitch1State.ports['gi1/0/23'] = { ...eigrpMlswitch1State.ports['gi1/0/23'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.3.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  eigrpMlswitch1State.dynamicRoutes = [
    { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '192.168.2.1', metric: 90, type: 'dynamic' }
  ];
  eigrpMlswitch1State.runningConfig = [
    '!',
    'hostname MultilayerSwitch1',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/24',
    ' no switchport',
    ' ip address 192.168.2.2 255.255.255.0',
    ' no shutdown',
    '!',
    'interface gi1/0/23',
    ' no switchport',
    ' ip address 192.168.3.1 255.255.255.0',
    ' no shutdown',
    '!',
    'router eigrp 100',
    ' network 192.168.2.0 0.0.0.255',
    ' network 192.168.3.0 0.0.0.255',
    ' no auto-summary',
    '!',
    'end'
  ];

  const switch3L2State = createInitialState('00:1A:2B:3C:4D:93', 'WS-C2960-24TT-L');
  switch3L2State.hostname = 'Switch3-L2';
  switch3L2State.ports['fa0/1'] = { ...switch3L2State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch3L2State.ports['fa0/2'] = { ...switch3L2State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  switch3L2State.ports['fa0/24'] = { ...switch3L2State.ports['fa0/24'], vlan: 1, mode: 'access', status: 'connected' };

  return {
    id: 'eigrp-basic-1',
    tag: 'EIGRP',
    title: isTr ? 'EIGRP Basic' : 'EIGRP Basic',
    description: isTr ? 'Temel EIGRP komutları ile dinamik yönlendirme kurulumu.' : 'Dynamic routing setup using basic EIGRP commands.',
    detail: 'router eigrp 100, network 192.168.1.0 0.0.0.255, no auto-summary',
    level: 'advanced',
    data: baseProjectData(ripRoutingDevices, ripRoutingConnections, eigrpRoutingNotes, [
      { id: 'switch0-l2', state: switch0L2State },
      { id: 'mlswitch0', state: eigrpMlswitch0State },
      { id: 'mlswitch1', state: eigrpMlswitch1State },
      { id: 'switch3-l2', state: switch3L2State }
    ])
  };
};

export default example;

