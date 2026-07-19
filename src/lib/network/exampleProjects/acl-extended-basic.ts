import { createSwitchDevice, createL3SwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import { createInitialState, createInitialRouterState } from '../initialState';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const staticL3RoutingDevices = [
    createPcDevice('pc0', 'PC0', 50, 350, '192.168.1.10', 1, '192.168.1.1'),
    createSwitchDevice('switch0', 'Switch0', 200, 350),
    createL3SwitchDevice('mlswitch1', 'MultilayerSwitch1', 350, 200),
    createRouterDevice('router3', 'Router3', 550, 200),
    createL3SwitchDevice('mlswitch2', 'MultilayerSwitch2', 750, 200),
    createSwitchDevice('switch1', 'Switch1', 900, 350),
    createPcDevice('pc4', 'PC4', 1050, 350, '192.168.2.10', 1, '192.168.2.1')
  ];

  const staticL3RoutingConnections: CanvasConnection[] = [];
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'pc0', 'eth0', 'switch0', 'fa0/1');
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'switch0', 'fa0/2', 'mlswitch1', 'gi1/0/2');
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'mlswitch1', 'gi1/0/1', 'router3', 'gi0/0', 'crossover');
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'router3', 'gi0/1', 'mlswitch2', 'gi1/0/1', 'crossover');
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'mlswitch2', 'gi1/0/2', 'switch1', 'fa0/1');
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'switch1', 'fa0/2', 'pc4', 'eth0');

  const aclExtendedNotes: CanvasNote[] = [
    {
      id: 'acl-extended-note',
      text: isTr
        ? 'Amaç: Genişletilmiş ACL ile protokol ve port bazlı erişim kontrolü sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) ACL TANIMLAMA (R3):\n   - ip access-list extended WEB-FILTER\n   - permit tcp any host 192.168.2.10 eq 80\n   - deny ip any any\n\n2) ACL UYGULAMA:\n   - interface gi0/1\n   - ip access-group WEB-FILTER out\n\n3) TEST:\n   - PC0 -> PC2 HTTP (başarılı olmalı)\n   - PC0 -> PC2 PING (başarısız olmalı)'
        : '🔧 BUILD STEPS:\n\n1) DEFINE ACL (R3):\n   - ip access-list extended WEB-FILTER\n   - permit tcp any host 192.168.2.10 eq 80\n   - deny ip any any\n\n2) APPLY ACL:\n   - interface gi0/1\n   - ip access-group WEB-FILTER out\n\n3) TEST:\n   - PC0 -> PC2 HTTP (should succeed)\n   - PC0 -> PC2 PING (should fail)',
      x: 450,
      y: 80,
      width: 520,
      height: 380,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const mlSwitch1State = createInitialState('00:1A:2B:3C:4D:80', 'WS-C3650-24PS');
  mlSwitch1State.hostname = 'MultilayerSwitch1';
  mlSwitch1State.switchModel = 'WS-C3650-24PS';
  mlSwitch1State.switchLayer = 'L3';
  mlSwitch1State.ipRouting = true;
  mlSwitch1State.ports['gi1/0/1'] = { ...mlSwitch1State.ports['gi1/0/1'], mode: 'routed', isRoutedPort: true, ipAddress: '10.0.0.1', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  mlSwitch1State.ports['gi1/0/2'] = { ...mlSwitch1State.ports['gi1/0/2'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  mlSwitch1State.staticRoutes = [
    { destination: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2', metric: 1, type: 'static' }
  ];
  mlSwitch1State.runningConfig = [
    '!',
    'hostname MultilayerSwitch1',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/1',
    ' no switchport',
    ' ip address 10.0.0.1 255.0.0.0',
    ' no shutdown',
    '!',
    'interface gi1/0/2',
    ' no switchport',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'ip route 192.168.2.0 255.255.255.0 10.0.0.2',
    '!',
    'end'
  ];

  const router3State = createInitialRouterState('00:50:00:00:00:10');
  router3State.hostname = 'Router3';
  router3State.ipRouting = true;
  router3State.ports['gi0/0'] = { ...router3State.ports['gi0/0'], ipAddress: '10.0.0.2', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  router3State.ports['gi0/1'] = { ...router3State.ports['gi0/1'], ipAddress: '20.0.0.1', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  router3State.staticRoutes = [
    { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1', metric: 1, type: 'static' },
    { destination: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '20.0.0.2', metric: 1, type: 'static' }
  ];
  router3State.runningConfig = [
    '!',
    'hostname Router3',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 10.0.0.2 255.0.0.0',
    ' no shutdown',
    '!',
    'interface GigabitEthernet0/1',
    ' ip address 20.0.0.1 255.0.0.0',
    ' no shutdown',
    '!',
    'ip route 192.168.1.0 255.255.255.0 10.0.0.1',
    'ip route 192.168.2.0 255.255.255.0 20.0.0.2',
    '!',
    'end'
  ];

  const mlSwitch2State = createInitialState('00:1A:2B:3C:4D:81', 'WS-C3650-24PS');
  mlSwitch2State.hostname = 'MultilayerSwitch2';
  mlSwitch2State.switchModel = 'WS-C3650-24PS';
  mlSwitch2State.switchLayer = 'L3';
  mlSwitch2State.ipRouting = true;
  mlSwitch2State.ports['gi1/0/1'] = { ...mlSwitch2State.ports['gi1/0/1'], mode: 'routed', isRoutedPort: true, ipAddress: '20.0.0.2', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  mlSwitch2State.ports['gi1/0/2'] = { ...mlSwitch2State.ports['gi1/0/2'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  mlSwitch2State.staticRoutes = [
    { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '20.0.0.1', metric: 1, type: 'static' }
  ];
  mlSwitch2State.runningConfig = [
    '!',
    'hostname MultilayerSwitch2',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/1',
    ' no switchport',
    ' ip address 20.0.0.2 255.0.0.0',
    ' no shutdown',
    '!',
    'interface gi1/0/2',
    ' no switchport',
    ' ip address 192.168.2.1 255.255.255.0',
    ' no shutdown',
    '!',
    'ip route 192.168.1.0 255.255.255.0 20.0.0.1',
    '!',
    'end'
  ];

  const switch0State = createInitialState('00:1A:2B:3C:4D:82', 'WS-C2960-24TT-L');
  switch0State.hostname = 'Switch0';
  switch0State.ports['fa0/1'] = { ...switch0State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch0State.ports['fa0/2'] = { ...switch0State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };

  const switch1State = createInitialState('00:1A:2B:3C:4D:83', 'WS-C2960-24TT-L');
  switch1State.hostname = 'Switch1';
  switch1State.ports['fa0/1'] = { ...switch1State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch1State.ports['fa0/2'] = { ...switch1State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };

  return {
    id: 'acl-extended-basic',
    tag: 'ACL',
    title: isTr ? 'ACL Extended' : 'ACL Extended',
    description: isTr ? 'Extended ACL ile protokol/port bazlı filtreleme.' : 'Protocol and port based filtering with extended ACL.',
    detail: isTr ? 'ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any' : 'ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any',
    level: 'advanced',
    data: baseProjectData(staticL3RoutingDevices, staticL3RoutingConnections, aclExtendedNotes, [
      { id: 'switch0', state: switch0State },
      { id: 'mlswitch1', state: mlSwitch1State },
      { id: 'router3', state: router3State },
      { id: 'mlswitch2', state: mlSwitch2State },
      { id: 'switch1', state: switch1State }
    ])
  };
};

export default example;

