import { createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import { createInitialRouterState } from '../initialState';
import type { CanvasConnection } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const ipv6MasterDevices = [
    createPcDevice('pc-1', 'PC-Internal', 50, 150, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1-Internal', 300, 150),
    createRouterDevice('router-2', 'R2-Edge', 600, 150),
    createPcDevice('pc-2', 'PC-External', 850, 150, '203.0.113.10', 1)
  ];
  ipv6MasterDevices[0].ipv6 = '2001:DB8:A::10';
  ipv6MasterDevices[3].ipv6 = '2001:DB8:B::20';

  const ipv6MasterConnections: CanvasConnection[] = [];
  connectPorts(ipv6MasterDevices, ipv6MasterConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0');
  connectPorts(ipv6MasterDevices, ipv6MasterConnections, 'router-1', 'gi0/1', 'router-2', 'gi0/1', 'crossover');
  connectPorts(ipv6MasterDevices, ipv6MasterConnections, 'router-2', 'gi0/0', 'pc-2', 'eth0');

  const ipv6MasterR1 = createInitialRouterState();
  ipv6MasterR1.hostname = 'R1-Internal';
  ipv6MasterR1.ipv6Enabled = true;
  ipv6MasterR1.ports['gi0/0'] = { ...ipv6MasterR1.ports['gi0/0'], ipAddress: '192.168.1.1', ipv6Address: '2001:DB8:A::1', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6MasterR1.ports['gi0/1'] = { ...ipv6MasterR1.ports['gi0/1'], ipAddress: '10.0.0.1', ipv6Address: '2001:DB8:AC::1', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6MasterR1.ipv6DynamicRoutes = [{ destination: '2001:DB8:B::', prefixLength: 64, nextHop: '2001:DB8:AC::2', metric: 1, type: 'dynamic', area: 0 }];

  const ipv6MasterR2 = createInitialRouterState();
  ipv6MasterR2.hostname = 'R2-Edge';
  ipv6MasterR2.ipv6Enabled = true;
  ipv6MasterR2.accessLists = {
    'V6-FILTER': [
      'ipv6 access-list V6-FILTER',
      ' deny ipv6 host 2001:DB8:B::20 any',
      ' permit ipv6 any any'
    ]
  };
  ipv6MasterR2.ports['gi0/0'] = { ...ipv6MasterR2.ports['gi0/0'], ipAddress: '203.0.113.1', ipv6Address: '2001:DB8:B::1', ipv6Prefix: 64, status: 'connected', shutdown: false, accessGroupIn: 'V6-FILTER' };
  ipv6MasterR2.ports['gi0/1'] = { ...ipv6MasterR2.ports['gi0/1'], ipAddress: '10.0.0.2', ipv6Address: '2001:DB8:AC::2', ipv6Prefix: 64, status: 'connected', shutdown: false };
  ipv6MasterR2.ipv6DynamicRoutes = [{ destination: '2001:DB8:A::', prefixLength: 64, nextHop: '2001:DB8:AC::1', metric: 1, type: 'dynamic', area: 0 }];

  return {
    id: 'ipv6-master-lab',
    tag: 'IPv6',
    title: isTr ? 'IPv6 Master Lab (Dual-Stack & ACL)' : 'IPv6 Master Lab (Dual-Stack & ACL)',
    description: isTr ? 'Hem IPv4 hem IPv6 kullanılan (dual-stack) karmaşık bir ağda OSPFv3 ve IPv6 ACL yapılandırın.' : 'Configure OSPFv3 and IPv6 ACLs in a complex dual-stack network using both IPv4 and IPv6.',
    detail: 'Dual-stack, OSPFv3, IPv6 Access Lists (Traffic filtering).',
    level: 'advanced',
    data: baseProjectData(ipv6MasterDevices, ipv6MasterConnections, [], [
      { id: 'router-1', state: ipv6MasterR1 },
      { id: 'router-2', state: ipv6MasterR2 }
    ])
  };
};

export default example;

