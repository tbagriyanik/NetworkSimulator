import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const routerDhcpDevices = [
    createPcDevice('pc-1', 'PC-1', 110, 140, '0.0.0.0', 1),
    createPcDevice('pc-2', 'PC-2', 110, 290, '0.0.0.0', 1),
    createSwitchDevice('switch-1', 'SW1', 280, 215, '192.168.10.2'),
    createRouterDevice('router-1', 'R1', 450, 215, '192.168.10.1')
  ];
  routerDhcpDevices[0].ipConfigMode = 'dhcp';
  routerDhcpDevices[1].ipConfigMode = 'dhcp';
  routerDhcpDevices[2].ipConfigMode = 'static';
  routerDhcpDevices[3].ipConfigMode = 'static';

  const routerDhcpConnections: CanvasConnection[] = [];
  connectPorts(routerDhcpDevices, routerDhcpConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(routerDhcpDevices, routerDhcpConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(routerDhcpDevices, routerDhcpConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');

  const routerDhcpNotes: CanvasNote[] = [
    {
      id: 'router-dhcp-note',
      text: isTr
        ? 'Amaç: Router üzerinde DHCP sunucusu yapılandırarak PC\'lere otomatik IP ataması yapmak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Router (R1) ekle\n   - 1 adet Switch (SW1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)\n   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)\n\n2) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - interface gi0/0\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip dhcp pool LAN\n     network 192.168.10.0 255.255.255.0\n     default-router 192.168.10.1\n     dns-server 8.8.8.8\n   - exit\n\n3) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - interface vlan 1\n     ip address 192.168.10.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface fa0/1\n     switchport mode access\n   - exit\n   - interface fa0/2\n     switchport mode access\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP mode DHCP\n   - PC-2: IP mode DHCP\n\n5) TEST:\n   - PC-1 CMD: ipconfig /renew\n   - PC-2 CMD: ipconfig /renew\n   - R1> show ip dhcp binding (DHCP atamalarını gör)\n   - PC-1 ve PC-2 IP almalı (192.168.10.100+ aralığı)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Router (R1)\n   - Add 1 Switch (SW1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/2 (Straight cable)\n   - Connect SW1 Gi0/1 -> R1 Gi0/0 (Crossover cable)\n\n2) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - interface gi0/0\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip dhcp pool LAN\n     network 192.168.10.0 255.255.255.0\n     default-router 192.168.10.1\n     dns-server 8.8.8.8\n   - exit\n\n3) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - interface vlan 1\n     ip address 192.168.10.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface fa0/1\n     switchport mode access\n   - exit\n   - interface fa0/2\n     switchport mode access\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP mode DHCP\n   - PC-2: IP mode DHCP\n\n5) TEST:\n   - PC-1 CMD: ipconfig /renew\n   - PC-2 CMD: ipconfig /renew\n   - R1> show ip dhcp binding (view DHCP assignments)\n   - PC-1 and PC-2 should receive IPs (192.168.10.100+ range)',
      x: 610,
      y: 40,
      width: 500,
      height: 340,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const routerDhcpR1 = createInitialRouterState('00:50:00:00:00:07');
  routerDhcpR1.hostname = 'R1';
  routerDhcpR1.ports['gi0/0'] = {
    ...routerDhcpR1.ports['gi0/0'],
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false
  };
  routerDhcpR1.dhcpPools = {
    LAN: {
      network: '192.168.10.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.10.1',
      dnsServer: '8.8.8.8',
      leaseTime: '1'
    }
  };
  routerDhcpR1.services = {
    ...routerDhcpR1.services,
    dhcp: {
      enabled: true,
      pools: [
        {
          poolName: 'LAN',
          defaultGateway: '192.168.10.1',
          dnsServer: '8.8.8.8',
          startIp: '192.168.10.100',
          subnetMask: '255.255.255.0',
          maxUsers: 50
        }
      ]
    }
  } as import('../types').SwitchState['services'];
  routerDhcpR1.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface gi0/0',
    ' ip address 192.168.10.1 255.255.255.0',
    ' no shutdown',
    '!',
    'ip dhcp pool LAN',
    ' network 192.168.10.0 255.255.255.0',
    ' default-router 192.168.10.1',
    ' dns-server 8.8.8.8',
    '!',
    'line con 0',
    'line aux 0',
    'line vty 0 4',
    ' login',
    '!',
    'end'
  ];

  const routerDhcpSw1 = createInitialState('00:1A:2B:3C:4D:70');
  routerDhcpSw1.hostname = 'SW1';
  routerDhcpSw1.ports['fa0/1'] = { ...routerDhcpSw1.ports['fa0/1'], status: 'connected' };
  routerDhcpSw1.ports['fa0/2'] = { ...routerDhcpSw1.ports['fa0/2'], status: 'connected' };
  routerDhcpSw1.ports['gi0/1'] = { ...routerDhcpSw1.ports['gi0/1'], mode: 'access', status: 'connected' };
  routerDhcpSw1.runningConfig = [
    '!',
    'hostname SW1',
    '!',
    'line con 0',
    'line vty 0 4',
    ' login',
    '!',
    'end'
  ];

  return {
    id: 'nat-pat-basic',
    tag: 'NAT',
    title: isTr ? 'NAT PAT' : 'NAT PAT',
    description: isTr ? 'PAT (NAT overload) ile çoktan-bire çeviri.' : 'Many-to-one translation with PAT (NAT overload).',
    detail: 'ip nat inside source list 1 interface gi0/0 overload',
    level: 'advanced',
    data: baseProjectData(routerDhcpDevices, routerDhcpConnections, routerDhcpNotes, [
      { id: 'router-1', state: routerDhcpR1 },
      { id: 'switch-1', state: routerDhcpSw1 }
    ])
  };
};

export default example;

