import { createSwitchDevice, createPcDevice, createRouterDevice, connectPorts, baseProjectData } from './helpers';
import { createInitialState, createInitialRouterState } from '../initialState';
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';

/**
 * NAT Static Basic
 * Senaryo:
 *   PC-1 (192.168.10.10) ve PC-2 (192.168.10.11) iç ağdadır.
 *   R1 gi0/0 → inside (192.168.10.1)
 *   R1 gi0/1 → outside (203.0.113.1)
 *   Statik NAT: PC-1 192.168.10.10 ↔ 203.0.113.10 (birebir)
 *   Dış ağda "Server" (203.0.113.100) bulunur.
 *
 * Test:
 *   PC-1 terminalinden: ping 203.0.113.100 → başarılı (kaynak 203.0.113.10 olarak görünür)
 *   PC-2 terminalinden: ping 203.0.113.100 → başarısız (NAT kaydı yok)
 *   Server terminalinden: ping 203.0.113.10  → PC-1'e ulaşır (statik NAT)
 *   R1# show ip nat translations
 */
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
      id: 'nat-static-note',
      text: isTr
        ? 'Amaç: Statik NAT ile iç IP adresini dış IP adresine birebir çevirmek.\n\nStatik NAT Kuralı:\n  PC-1 (192.168.10.10) ↔ 203.0.113.10\n\n✅ TEST ADIMLARI:\n\n1) R1 terminalinde NAT tablosunu gör:\n   R1# show ip nat translations\n\n2) PC-1\'den Server\'a ping at:\n   ping 203.0.113.100\n   → Başarılı olmalı (kaynak IP 203.0.113.10\'a çevrilir)\n\n3) Server\'dan PC-1\'e ping at:\n   ping 203.0.113.10\n   → PC-1\'e (192.168.10.10) ulaşmalı\n\n4) PC-2\'den Server\'a ping at:\n   ping 203.0.113.100\n   → Başarısız (PC-2 için NAT kaydı yok)\n\n5) NAT istatistikleri:\n   R1# show ip nat statistics'
        : 'Goal: Map internal IP to external IP one-to-one with static NAT.\n\nStatic NAT Rule:\n  PC-1 (192.168.10.10) ↔ 203.0.113.10\n\n✅ TEST STEPS:\n\n1) View NAT table on R1:\n   R1# show ip nat translations\n\n2) From PC-1, ping Server:\n   ping 203.0.113.100\n   → Should succeed (source translated to 203.0.113.10)\n\n3) From Server, ping PC-1 via global IP:\n   ping 203.0.113.10\n   → Should reach PC-1 (192.168.10.10)\n\n4) From PC-2, ping Server:\n   ping 203.0.113.100\n   → Should fail (no NAT entry for PC-2)\n\n5) Check stats:\n   R1# show ip nat statistics',
      x: 770,
      y: 50,
      width: 520,
      height: 460,
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
  // gi0/0: iç ağ (inside)
  r1State.ports['gi0/0'] = {
    ...r1State.ports['gi0/0'],
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false,
    natSide: 'inside'
  };
  // gi0/1: dış ağ (outside)
  r1State.ports['gi0/1'] = {
    ...r1State.ports['gi0/1'],
    ipAddress: '203.0.113.1',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false,
    natSide: 'outside'
  };
  // Statik NAT: PC-1 iç IP → dış IP
  r1State.natStaticTranslations = [
    { localIp: '192.168.10.10', globalIp: '203.0.113.10' }
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
    'ip nat inside source static 192.168.10.10 203.0.113.10',
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
    id: 'nat-static-basic',
    tag: 'NAT',
    title: isTr ? 'NAT Static' : 'NAT Static',
    description: isTr
      ? 'Static NAT ile birebir adres eşlemesi (PC-1 ↔ 203.0.113.10).'
      : 'One-to-one address mapping with static NAT (PC-1 ↔ 203.0.113.10).',
    detail: 'ip nat inside source static 192.168.10.10 203.0.113.10',
    level: 'intermediate',
    data: baseProjectData(devices, connections, notes, [
      { id: 'r1', state: r1State },
      { id: 'sw1', state: sw1State }
    ])
  };
};

export default example;


