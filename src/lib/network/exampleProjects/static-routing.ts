import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';

const example = (isTr: boolean): ExampleProject => {
  const staticRoutingDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 1, '192.168.10.1'),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 1, '192.168.20.1'),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createRouterDevice('router-1', 'R1', 440, 120),
    createRouterDevice('router-2', 'R2', 440, 260),
    createSwitchDevice('switch-2', 'SW2', 640, 190)
  ];
  const staticRoutingConnections: CanvasConnection[] = [];
  connectPorts(staticRoutingDevices, staticRoutingConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(staticRoutingDevices, staticRoutingConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(staticRoutingDevices, staticRoutingConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');
  connectPorts(staticRoutingDevices, staticRoutingConnections, 'router-1', 'gi0/1', 'router-2', 'gi0/0', 'crossover');
  connectPorts(staticRoutingDevices, staticRoutingConnections, 'router-2', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  const staticRoutingNotes: CanvasNote[] = [
    {
      id: 'static-routing-note',
      text: isTr
        ? 'Amaç: Router\'larda static routing yapılandırarak farklı ağlar arası iletişim sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Router (R1, R2) ekle\n   - 2 adet Switch (SW1, SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> SW1 Gi1/0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Gi1/0/1 (Straight kablo)\n   - SW1 Gi1/0/2 -> R1 Gi1/0/0 (Crossover kablo)\n   - R1 Gi1/0/1 -> R2 Gi1/0/0 (Crossover kablo)\n   - R2 Gi1/0/1 -> SW2 Gi1/0/2 (Crossover kablo)\n\n2) R1 KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - interface gi1/0/0\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.20.0 255.255.255.0 192.168.1.2\n   - exit\n\n3) R2 KONFİGÜRASYONU:\n   - R2 terminaline gir: enable, conf t\n   - interface gi1/0/0\n     ip address 192.168.1.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.10.0 255.255.255.0 192.168.1.1\n   - exit\n\n4) SWITCH KONFİGÜRASYONU:\n   - SW1 ve SW2: interface fa0/1 -> switchport mode access\n   - SW1 ve SW2: interface gi1/0/1 -> switchport mode access\n\n5) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1\n\n6) TEST:\n   - show ip route (statik rotaları gör)\n   - PC-1 ping 192.168.20.10 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Routers (R1, R2)\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Gi1/0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Gi1/0/1 (Straight cable)\n   - Connect SW1 Gi1/0/2 -> R1 Gi1/0/0 (Crossover cable)\n   - Connect R1 Gi1/0/1 -> R2 Gi1/0/0 (Crossover cable)\n   - Connect R2 Gi1/0/1 -> SW2 Gi1/0/2 (Crossover cable)\n\n2) R1 CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - interface gi1/0/0\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.20.0 255.255.255.0 192.168.1.2\n   - exit\n\n3) R2 CONFIGURATION:\n   - Enter R2 terminal: enable, conf t\n   - interface gi1/0/0\n     ip address 192.168.1.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.10.0 255.255.255.0 192.168.1.1\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1\n\n5) TEST:\n   - PC-1 ping PC-2 (should work via static routes)\n   - show ip route on both routers',
      x: 600,
      y: 40,
      width: 500,
      height: 360,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const staticSw1 = createInitialState('00:1A:2B:3C:4D:67', 'WS-C2960-24TT-L');
  staticSw1.hostname = 'SW1';
  staticSw1.ports['fa0/1'] = { ...staticSw1.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  staticSw1.ports['gi0/1'] = { ...staticSw1.ports['gi0/1'], vlan: 1, mode: 'access', status: 'connected' };

  const staticR1 = createInitialRouterState('00:50:00:00:00:01');
  staticR1.hostname = 'R1';
  staticR1.ports['gi0/0'] = { ...staticR1.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  staticR1.ports['gi0/1'] = { ...staticR1.ports['gi0/1'], ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  staticR1.staticRoutes = [
    { destination: '192.168.20.0', subnetMask: '255.255.255.0', nextHop: '192.168.1.2', metric: 1, type: 'static' }
  ];

  const staticR2 = createInitialRouterState('00:50:00:00:00:02');
  staticR2.hostname = 'R2';
  staticR2.ports['gi0/0'] = { ...staticR2.ports['gi0/0'], ipAddress: '192.168.1.2', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  staticR2.ports['gi0/1'] = { ...staticR2.ports['gi0/1'], ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  staticR2.staticRoutes = [
    { destination: '192.168.10.0', subnetMask: '255.255.255.0', nextHop: '192.168.1.1', metric: 1, type: 'static' }
  ];

  const staticSw2 = createInitialState('00:1A:2B:3C:4D:68', 'WS-C2960-24TT-L');
  staticSw2.hostname = 'SW2';
  staticSw2.ports['fa0/1'] = { ...staticSw2.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  staticSw2.ports['gi0/1'] = { ...staticSw2.ports['gi0/1'], vlan: 1, mode: 'access', status: 'connected' };

  return {
    id: 'static-routing',
    tag: isTr ? 'ROUTING' : 'ROUTING',
    title: isTr ? 'Static Routing Lab' : 'Static Routing Lab',
    description: isTr
      ? 'İki router arası statik yönlendirme ile farklı subnetler arası iletişim.'
      : 'Static routing between two routers for inter-subnet communication.',
    detail: isTr
      ? 'R1: ip route 192.168.20.0 255.255.255.0 192.168.1.2 | R2: ip route 192.168.10.0 255.255.255.0 192.168.1.1'
      : 'R1: ip route 192.168.20.0 255.255.255.0 192.168.1.2 | R2: ip route 192.168.10.0 255.255.255.0 192.168.1.1',
    level: 'advanced',
    data: baseProjectData(staticRoutingDevices, staticRoutingConnections, staticRoutingNotes, [
      { id: 'switch-1', state: staticSw1 },
      { id: 'router-1', state: staticR1 },
      { id: 'router-2', state: staticR2 },
      { id: 'switch-2', state: staticSw2 }
    ])
  };
};

export default example;

