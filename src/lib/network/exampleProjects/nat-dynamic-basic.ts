import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
;
import type { ExampleProject } from './types';
import { createInitialState, createInitialRouterState } from '../initialState';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  // -- Cihazlar --------------------------------------------------------------
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

  // -- Bağlantılar -----------------------------------------------------------
  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'pc-1', 'eth0', 'sw1', 'fa0/1');
  connectPorts(devices, connections, 'pc-2', 'eth0', 'sw1', 'fa0/2');
  connectPorts(devices, connections, 'sw1', 'gi0/1', 'r1', 'gi0/0', 'crossover');
  connectPorts(devices, connections, 'r1', 'gi0/1', 'server', 'eth0', 'crossover');

  // -- Not / Canvas açıklaması -----------------------------------------------
  const notes: CanvasNote[] = [
    {
      id: 'nat-dynamic-note',
      text: isTr
        ? 'Amaç: NAT havuzu (Dynamic NAT) kullanarak iç IP adreslerini tanımlı dış IP havuzundaki (203.0.113.20 - 203.0.113.30) adreslere dinamik olarak çevirmek.\n\nDinamik NAT Yapılandırması:\n  - İç Ağ: 192.168.10.0/24 (gi0/0 - ip nat inside)\n  - Dış Ağ: 203.0.113.0/24 (gi0/1 - ip nat outside)\n  - NAT Havuzu: OUT (203.0.113.20 - 203.0.113.30)\n  - Kural: ip nat inside source list 1 pool OUT\n\n✅ TEST ADIMLARI:\n\n1) R1 terminalinde NAT durumunu gör:\n   R1# show ip nat translations\n\n2) PC-1\'den dış sunucuya ping at:\n   ping 203.0.113.100\n   → Başarılı olmalı (havuzdan ilk boş IP 203.0.113.20 atanır)\n\n3) R1 terminalinde çeviriyi kontrol et:\n   R1# show ip nat translations\n\n4) NAT istatistikleri:\n   R1# show ip nat statistics'
        : 'Goal: Dynamically map internal IP addresses to a pool of external IP addresses (203.0.113.20 - 203.0.113.30) using Dynamic NAT.\n\nDynamic NAT Configuration:\n  - Inside Network: 192.168.10.0/24 (gi0/0 - ip nat inside)\n  - Outside Network: 203.0.113.0/24 (gi0/1 - ip nat outside)\n  - NAT Pool: OUT (203.0.113.20 - 203.0.113.30)\n  - Rule: ip nat inside source list 1 pool OUT\n\n✅ TEST STEPS:\n\n1) View NAT table on R1:\n   R1# show ip nat translations\n\n2) From PC-1, ping Server:\n   ping 203.0.113.100\n   → Should succeed (dynamically assigned 203.0.113.20 from pool)\n\n3) Check translations on R1:\n   R1# show ip nat translations\n\n4) Check stats:\n   R1# show ip nat statistics',
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

  // -- Router R1 durumu ------------------------------------------------------
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
  r1State.natPools = {
    OUT: { startIp: '203.0.113.20', endIp: '203.0.113.30', netmask: '255.255.255.0' }
  };
  r1State.natDynamicRules = [
    { aclId: '1', poolName: 'OUT' }
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
    'ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0',
    'access-list 1 permit 192.168.10.0 0.0.0.255',
    'ip nat inside source list 1 pool OUT',
    '!',
    'end'
  ];

  // -- Switch SW1 durumu -----------------------------------------------------
  const sw1State = createInitialState(devices[2].macAddress);
  sw1State.hostname = 'SW1';
  sw1State.ports['fa0/1'] = { ...sw1State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['fa0/2'] = { ...sw1State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.ports['gi0/1'] = { ...sw1State.ports['gi0/1'], vlan: 1, mode: 'access', status: 'connected' };
  sw1State.runningConfig = [
    '!', 'hostname SW1', '!', 'end'
  ];

  // -- Proje tanımı ----------------------------------------------------------
  return {
    id: 'nat-dynamic-basic',
    tag: 'NAT',
    title: isTr ? 'NAT Dynamic' : 'NAT Dynamic',
    description: isTr
      ? 'NAT havuzu ile dinamik çeviri.'
      : 'Dynamic translation with NAT pool.',
    detail: 'ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0',
    level: 'advanced',
    data: baseProjectData(devices, connections, notes, [
      { id: 'r1', state: r1State },
      { id: 'sw1', state: sw1State }
    ])
  };
};

export default example;


