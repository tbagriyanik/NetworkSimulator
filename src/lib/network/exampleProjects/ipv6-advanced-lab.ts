import { createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import { createInitialRouterState } from '../initialState';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const ipv6LabDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 150, '', 1),
    createRouterDevice('router-1', 'R1', 300, 150),
    createRouterDevice('router-2', 'R2', 600, 150),
    createPcDevice('pc-2', 'PC-2', 850, 150, '', 1)
  ];
  ipv6LabDevices[0].ipv6 = '2001:DB8:1::10';
  ipv6LabDevices[3].ipv6 = '2001:DB8:2::20';

  const ipv6LabConnections: CanvasConnection[] = [];
  connectPorts(ipv6LabDevices, ipv6LabConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0');
  connectPorts(ipv6LabDevices, ipv6LabConnections, 'router-1', 'gi0/1', 'router-2', 'gi0/1', 'crossover');
  connectPorts(ipv6LabDevices, ipv6LabConnections, 'router-2', 'gi0/0', 'pc-2', 'eth0');

  const ipv6LabNotes: CanvasNote[] = [
    {
      id: 'ipv6-lab-note',
      text: isTr
        ? '🌐 IPv6 Gelişmiş Laboratuvar (Routing, DHCPv6, OSPFv3):\n\n1) IPv6 Unicast Routing: Cihazlarda IPv6 yönlendirmeyi etkinleştirin.\n2) Adresleme: \n   - R1 Gi0/0: 2001:DB8:1::1/64\n   - R1-R2 Link: 2001:DB8:AC::/64\n   - R2 Gi0/0: 2001:DB8:2::1/64\n3) DHCPv6: R1 ve R2 üzerinde PC\'ler için IPv6 havuzları oluşturun.\n4) Yönlendirme (OSPFv3):\n   - R1: ipv6 router ospf 1, area 0\n   - R2: ipv6 router ospf 1, area 0\n\nTest: PC-1 > ping 2001:DB8:2::20'
        : '🌐 IPv6 Advanced Lab (Routing, DHCPv6, OSPFv3):\n\n1) IPv6 Unicast Routing: Enable IPv6 routing on devices.\n2) Addressing: \n   - R1 Gi0/0: 2001:DB8:1::1/64\n   - R1-R2 Link: 2001:DB8:AC::/64\n   - R2 Gi0/0: 2001:DB8:2::1/64\n3) DHCPv6: Configure IPv6 pools for PCs on R1 and R2.\n4) Routing (OSPFv3):\n   - R1: ipv6 router ospf 1, area 0\n   - R2: ipv6 router ospf 1, area 0\n\nTest: PC-1 > ping 2001:DB8:2::20',
      x: 250,
      y: 300,
      width: 500,
      height: 220,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const ipv6R1 = createInitialRouterState('00:50:00:00:00:21');
  ipv6R1.hostname = 'R1';
  ipv6R1.ipv6Enabled = true;
  ipv6R1.ports['gi0/0'] = { ...ipv6R1.ports['gi0/0'], ipv6Address: '2001:DB8:1::1', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6R1.ports['gi0/1'] = { ...ipv6R1.ports['gi0/1'], ipv6Address: '2001:DB8:AC::1', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6R1.ipv6DynamicRoutes = [
    { destination: '2001:DB8:2::', prefixLength: 64, nextHop: '2001:DB8:AC::2', metric: 1, type: 'dynamic', area: 0 }
  ];

  const ipv6R2 = createInitialRouterState('00:50:00:00:00:22');
  ipv6R2.hostname = 'R2';
  ipv6R2.ipv6Enabled = true;
  ipv6R2.ports['gi0/0'] = { ...ipv6R2.ports['gi0/0'], ipv6Address: '2001:DB8:2::1', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6R2.ports['gi0/1'] = { ...ipv6R2.ports['gi0/1'], ipv6Address: '2001:DB8:AC::2', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6R2.ipv6DynamicRoutes = [
    { destination: '2001:DB8:1::', prefixLength: 64, nextHop: '2001:DB8:AC::1', metric: 1, type: 'dynamic', area: 0 }
  ];

  return {
    id: 'ipv6-advanced-lab',
    tag: 'IPv6',
    title: isTr ? 'IPv6 Gelişmiş Laboratuvar (DHCPv6 & OSPFv3)' : 'IPv6 Advanced Lab (DHCPv6 & OSPFv3)',
    description: isTr ? 'IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 dinamik yönlendirme.' : 'IPv6 addressing, DHCPv6 pools and OSPFv3 dynamic routing.',
    detail: 'ipv6 unicast-routing, ipv6 dhcp pool LAN, address prefix 2001:db8:1::/64, ipv6 router ospf 1',
    level: 'advanced',
    data: baseProjectData(ipv6LabDevices, ipv6LabConnections, ipv6LabNotes, [
      { id: 'router-1', state: ipv6R1 },
      { id: 'router-2', state: ipv6R2 }
    ])
  };
};

export default example;

