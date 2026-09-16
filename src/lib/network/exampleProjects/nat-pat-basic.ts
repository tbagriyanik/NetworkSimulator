import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  // â”€â”€ Cihazlar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const devices = [
    createPcDevice('pc-1', 'PC-1', 100, 130, '192.168.10.10', 1, '192.168.10.1'),
    createPcDevice('pc-2', 'PC-2', 100, 300, '192.168.10.11', 1, '192.168.10.1'),
    createSwitchDevice('sw1', 'SW1', 270, 215, '192.168.10.2'),
    createRouterDevice('r1', 'R1', 450, 215, '192.168.10.1'),
    createPcDevice('server', 'Server', 650, 215, '203.0.113.100', 1, '203.0.113.1')
  ];
  devices[0].ipConfigMode = 'static';
  devices[1].ipConfigMode = 'static';
  devices[2].ipConfigMode = 'static';
  devices[3].ipConfigMode = 'static';
  devices[4].ipConfigMode = 'static';

  // â”€â”€ BaÄŸlantÄ±lar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'pc-1', 'eth0', 'sw1', 'fa0/1');
  connectPorts(devices, connections, 'pc-2', 'eth0', 'sw1', 'fa0/2');
  connectPorts(devices, connections, 'sw1', 'gi0/1', 'r1', 'gi0/0', 'crossover');
  connectPorts(devices, connections, 'r1', 'gi0/1', 'server', 'eth0', 'crossover');

  // â”€â”€ Not / Canvas aÃ§Ä±klamasÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const notes: CanvasNote[] = [
    {
      id: 'nat-pat-note',
      text: isTr
        ? 'AmaÃ§: PAT (Port Address Translation / NAT Overload) ile iÃ§ aÄŸdaki tÃ¼m cihazlarÄ± tek bir dÄ±ÅŸ IP adresi (203.0.113.1) ve farklÄ± port numaralarÄ± Ã¼zerinden internete Ã§Ä±karmak.\n\nPAT YapÄ±landÄ±rmasÄ±:\n  - Ä°Ã§ AÄŸ: 192.168.10.0/24 (gi0/0 - ip nat inside)\n  - DÄ±ÅŸ AÄŸ: 203.0.113.0/24 (gi0/1 - ip nat outside)\n  - ACL 1: access-list 1 permit 192.168.10.0 0.0.0.255\n  - PAT KuralÄ±: ip nat inside source list 1 interface gi0/1 overload\n\nâœ… TEST ADIMLARI:\n\n1) R1 terminalinde NAT durumunu gÃ¶r:\n   R1# show ip nat translations\n\n2) PC-1 ve PC-2 terminalinden dÄ±ÅŸ sunucuya ping at:\n   ping 203.0.113.100\n   â†’ Ä°ki cihazdan da baÅŸarÄ±yla ulaÅŸmalÄ±\n\n3) R1 terminalinde Ã§evirileri kontrol et:\n   R1# show ip nat translations\n   â†’ 192.168.10.10:port ve 192.168.10.11:port adreslerinin tek dÄ±ÅŸ IP (203.0.113.1) Ã¼zerinde portlar ile eÅŸleÅŸtiÄŸini gÃ¶r!\n\n4) NAT istatistikleri:\n   R1# show ip nat statistics'
        : 'Goal: Route all internal devices through a single external IP (203.0.113.1) using PAT (Port Address Translation / NAT Overload).\n\nPAT Configuration:\n  - Inside Network: 192.168.10.0/24 (gi0/0 - ip nat inside)\n  - Outside Network: 203.0.113.0/24 (gi0/1 - ip nat outside)\n  - ACL 1: access-list 1 permit 192.168.10.0 0.0.0.255\n  - PAT Rule: ip nat inside source list 1 interface gi0/1 overload\n\nâœ… TEST STEPS:\n\n1) View NAT table on R1:\n   R1# show ip nat translations\n\n2) From PC-1 and PC-2, ping Server:\n   ping 203.0.113.100\n   â†’ Should succeed from both devices\n\n3) Inspect translations on R1:\n   R1# show ip nat translations\n   â†’ Observe 192.168.10.10:port and 192.168.10.11:port translated to external IP 203.0.113.1!\n\n4) Check stats:\n   R1# show ip nat statistics',
      x: 770,
      y: 50,
      width: 520,
      height: 480,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // â”€â”€ Router R1 durumu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const r1State = createInitialRouterState(devices[3].macAddress);
  r1State.hostname = 'R1';
  r1State.ipRouting = true;
  r1State.ports['gi0/0'] = {
    ...r1State.ports['gi0/0'],
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false,
    natSide: 'inside'
  };
  r1State.ports['gi0/1'] = {
    ...r1State.ports['gi0/1'],
    ipAddress: '203.0.113.1',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false,
    natSide: 'outside'
  };
  r1State.accessLists = {
    '1': ['permit 192.168.10.0 0.0.0.255']
  };
  r1State.natDynamicRules = [
    { aclId: '1', interface: 'gi0/1', overload: true }
  ];
  r1State.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.10.1 255.255.255.0',
    ' ip nat inside',
    ' no shutdown',
    '!',
    'interface GigabitEthernet0/1',
    ' ip address 203.0.113.1 255.255.255.0',
    ' ip nat outside',
    ' no shutdown',
    '!',
    'access-list 1 permit 192.168.10.0 0.0.0.255',
    'ip nat inside source list 1 interface gi0/1 overload',
    '!',
    'end'
  ];

  // â”€â”€ Switch SW1 durumu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sw1State = createInitialState(devices[2].macAddress);
  sw1State.hostname = 'SW1';
  sw1State.ports['fa0/1'] = { ...sw1State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['fa0/2'] = { ...sw1State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['gi0/1'] = { ...sw1State.ports['gi0/1'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.runningConfig = [
    '!', 'hostname SW1', '!', 'end'
  ];

  // â”€â”€ Proje tanÄ±mÄ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return {
    id: 'nat-pat-basic',
    tag: 'NAT',
    title: isTr ? 'NAT PAT' : 'NAT PAT',
    description: isTr
      ? 'PAT (NAT overload) ile Ã§oktan-bire Ã§eviri.'
      : 'Many-to-one translation with PAT (NAT overload).',
    detail: 'ip nat inside source list 1 interface gi0/1 overload',
    level: 'advanced',
    data: baseProjectData(devices, connections, notes, [
      { id: 'r1', state: r1State },
      { id: 'sw1', state: sw1State }
    ])
  };
};

export default example;


