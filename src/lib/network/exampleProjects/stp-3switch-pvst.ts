import { createInitialState } from '../initialState';
import { createL3SwitchDevice, createPcDevice, connectPorts, baseProjectData } from './helpers';
;
;
import type { ExampleProject } from './types';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';

const example = (isTr: boolean): ExampleProject => {
  const stpPvstDevices = [
    createL3SwitchDevice('sw1', 'SW1', 300, 200),
    createL3SwitchDevice('sw2', 'SW2', 600, 100),
    createL3SwitchDevice('sw3', 'SW3', 600, 300),
    createPcDevice('pc1-vlan1', 'PC1-VLAN1', 80, 180, '192.168.1.10', 1),
    createPcDevice('pc1-vlan10', 'PC1-VLAN10', 80, 220, '192.168.10.10', 10),
    createPcDevice('pc1-vlan20', 'PC1-VLAN20', 80, 260, '192.168.20.10', 20),
    createPcDevice('pc2-vlan1', 'PC2-VLAN1', 750, 80, '192.168.1.20', 1),
    createPcDevice('pc2-vlan10', 'PC2-VLAN10', 820, 80, '192.168.10.20', 10),
    createPcDevice('pc2-vlan20', 'PC2-VLAN20', 890, 80, '192.168.20.20', 20),
    createPcDevice('pc3-vlan1', 'PC3-VLAN1', 750, 320, '192.168.1.30', 1),
    createPcDevice('pc3-vlan10', 'PC3-VLAN10', 820, 320, '192.168.10.30', 10),
    createPcDevice('pc3-vlan20', 'PC3-VLAN20', 890, 320, '192.168.20.30', 20)
  ];

  const stpPvstConnections: CanvasConnection[] = [];
  connectPorts(stpPvstDevices, stpPvstConnections, 'sw1', 'gi1/0/1', 'sw2', 'gi1/0/1');
  connectPorts(stpPvstDevices, stpPvstConnections, 'sw1', 'gi1/0/2', 'sw3', 'gi1/0/1');
  connectPorts(stpPvstDevices, stpPvstConnections, 'sw2', 'gi1/0/2', 'sw3', 'gi1/0/2');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc1-vlan1', 'eth0', 'sw1', 'gi1/0/3');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc1-vlan10', 'eth0', 'sw1', 'gi1/0/4');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc1-vlan20', 'eth0', 'sw1', 'gi1/0/5');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc2-vlan1', 'eth0', 'sw2', 'gi1/0/3');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc2-vlan10', 'eth0', 'sw2', 'gi1/0/4');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc2-vlan20', 'eth0', 'sw2', 'gi1/0/5');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc3-vlan1', 'eth0', 'sw3', 'gi1/0/3');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc3-vlan10', 'eth0', 'sw3', 'gi1/0/4');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc3-vlan20', 'eth0', 'sw3', 'gi1/0/5');

  const stpPvstNotes: CanvasNote[] = [
    {
      id: 'note-stp-vlan1',
      text: isTr
        ? '🔧 VLAN 1 KONFİGÜRASYONU:\n\nSW1 (Root):\n- spanning-tree vlan 1 priority 24576\n\nSW2:\n- spanning-tree vlan 1 priority 32768\n\nSW3:\n- spanning-tree vlan 1 priority 32768\n\nPC\'ler:\n- PC1-VLAN1: 192.168.1.10 (SW1 Gi1/0/3)\n- PC2-VLAN1: 192.168.1.20 (SW2 Gi1/0/3)\n- PC3-VLAN1: 192.168.1.30 (SW3 Gi1/0/3)\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 VLAN 1 CONFIGURATION:\n\nSW1 (Root):\n- spanning-tree vlan 1 priority 24576\n\nSW2:\n- spanning-tree vlan 1 priority 32768\n\nSW3:\n- spanning-tree vlan 1 priority 32768\n\nPCs:\n- PC1-VLAN1: 192.168.1.10 (SW1 Gi1/0/3)\n- PC2-VLAN1: 192.168.1.20 (SW2 Gi1/0/3)\n- PC3-VLAN1: 192.168.1.30 (SW3 Gi1/0/3)\n\n⚠️ Note: Refresh Network (F5)',
      x: 200,
      y: 50,
      width: 300,
      height: 160,
      color: 'var(--color-primary-400)',
      font: 'Arial',
      fontSize: 12,
      opacity: 1
    },
    {
      id: 'note-stp-vlan10',
      text: isTr
        ? '🔧 VLAN 10 KONFİGÜRASYONU:\n\nSW1:\n- spanning-tree vlan 10 priority 32768\n\nSW2 (Root):\n- spanning-tree vlan 10 priority 24576\n\nSW3:\n- spanning-tree vlan 10 priority 32768\n\nPC\'ler:\n- PC1-VLAN10: 192.168.10.10 (SW1 Gi1/0/4)\n- PC2-VLAN10: 192.168.10.20 (SW2 Gi1/0/4)\n- PC3-VLAN10: 192.168.10.30 (SW3 Gi1/0/4)\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 VLAN 10 CONFIGURATION:\n\nSW1:\n- spanning-tree vlan 10 priority 32768\n\nSW2 (Root):\n- spanning-tree vlan 10 priority 24576\n\nSW3:\n- spanning-tree vlan 10 priority 32768\n\nPCs:\n- PC1-VLAN10: 192.168.10.10 (SW1 Gi1/0/4)\n- PC2-VLAN10: 192.168.10.20 (SW2 Gi1/0/4)\n- PC3-VLAN10: 192.168.10.30 (SW3 Gi1/0/4)\n\n⚠️ Note: Refresh Network (F5)',
      x: 500,
      y: 30,
      width: 300,
      height: 160,
      color: 'var(--color-warning-400)',
      font: 'Arial',
      fontSize: 12,
      opacity: 1
    },
    {
      id: 'note-stp-vlan20',
      text: isTr
        ? '🔧 VLAN 20 KONFİGÜRASYONU:\n\nSW1:\n- spanning-tree vlan 20 priority 32768\n\nSW2:\n- spanning-tree vlan 20 priority 32768\n\nSW3 (Root):\n- spanning-tree vlan 20 priority 24576\n\nPC\'ler:\n- PC1-VLAN20: 192.168.20.10 (SW1 Gi1/0/5)\n- PC2-VLAN20: 192.168.20.20 (SW2 Gi1/0/5)\n- PC3-VLAN20: 192.168.20.30 (SW3 Gi1/0/5)\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 VLAN 20 CONFIGURATION:\n\nSW1:\n- spanning-tree vlan 20 priority 32768\n\nSW2:\n- spanning-tree vlan 20 priority 32768\n\nSW3 (Root):\n- spanning-tree vlan 20 priority 24576\n\nPCs:\n- PC1-VLAN20: 192.168.20.10 (SW1 Gi1/0/5)\n- PC2-VLAN20: 192.168.20.20 (SW2 Gi1/0/5)\n- PC3-VLAN20: 192.168.20.30 (SW3 Gi1/0/5)\n\n⚠️ Note: Refresh Network (F5)',
      x: 500,
      y: 380,
      width: 300,
      height: 160,
      color: 'var(--color-accent-600)',
      font: 'Arial',
      fontSize: 12,
      opacity: 1
    },
    {
      id: 'note-pvst',
      text: isTr
        ? 'Amaç: PVST kullanarak her VLAN için ayrı STP instance\'ı oluşturarak load balancing sağlamak.\n\n🔧 PVST (Per-VLAN STP) ADIMLARI:\n\n1) VLAN\'LAR OLUŞTUR:\n   - Her switch\'te vlan 1, 10, 20 oluştur\n\n2) ROOT BRIDGE AYARLA:\n   - SW1: spanning-tree vlan 1 priority 24576\n   - SW2: spanning-tree vlan 10 priority 24576\n   - SW3: spanning-tree vlan 20 priority 24576\n\n3) TRUNK BAĞLANTILARI:\n   - Gi1/0/1 ve Gi1/0/2 için:\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n\n4) TEST:\n   - show spanning-tree vlan 1\n   - show spanning-tree vlan 10\n   - show spanning-tree vlan 20\n   - Her VLAN farklı root kullanır'
        : '🔧 PVST (Per-VLAN STP) STEPS:\n\n1) CREATE VLANs:\n   - Create vlan 1, 10, 20 on each switch\n\n2) SET ROOT BRIDGE:\n   - SW1: spanning-tree vlan 1 priority 24576\n   - SW2: spanning-tree vlan 10 priority 24576\n   - SW3: spanning-tree vlan 20 priority 24576\n\n3) TRUNK CONNECTIONS:\n   - For Gi1/0/1 and Gi1/0/2:\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n\n4) TEST:\n   - show spanning-tree vlan 1\n   - show spanning-tree vlan 10\n   - show spanning-tree vlan 20\n   - Each VLAN uses different root',
      x: 150,
      y: 320,
      width: 280,
      height: 200,
      color: 'var(--color-success-400)',
      font: 'Arial',
      fontSize: 12,
      opacity: 1
    }
  ];

  const stpPvstSw1 = createInitialState('00:11:00:00:01:00', 'WS-C3650-24PS');
  stpPvstSw1.hostname = 'SW1';
  stpPvstSw1.switchModel = 'WS-C3650-24PS';
  stpPvstSw1.switchLayer = 'L3';
  stpPvstSw1.ipRouting = true;
  stpPvstSw1.spanningTreeMode = 'pvst';
  stpPvstSw1.vlans[1] = { id: 1, name: 'default', status: 'active', ports: ['GI1/0/3', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI1/0/4', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw1.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI1/0/5', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw1.spanningTreeVlans = {
    '1': { priority: '24576' },
    '10': { priority: '32768' },
    '20': { priority: '32768' }
  };
  stpPvstSw1.ports['gi1/0/1'] = {
    ...stpPvstSw1.ports['gi1/0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: {
      instances: {
        1: { role: 'designated', state: 'forwarding' },
        10: { role: 'root', state: 'forwarding' },
        20: { role: 'alternate', state: 'blocking' }
      }
    }
  };
  stpPvstSw1.ports['gi1/0/2'] = {
    ...stpPvstSw1.ports['gi1/0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: {
      instances: {
        1: { role: 'designated', state: 'forwarding' },
        10: { role: 'alternate', state: 'blocking' },
        20: { role: 'root', state: 'forwarding' }
      }
    }
  };
  stpPvstSw1.ports['gi1/0/3'] = { ...stpPvstSw1.ports['gi1/0/3'], vlan: 1, mode: 'access', status: 'connected' };
  stpPvstSw1.ports['gi1/0/4'] = { ...stpPvstSw1.ports['gi1/0/4'], vlan: 10, mode: 'access', status: 'connected' };
  stpPvstSw1.ports['gi1/0/5'] = { ...stpPvstSw1.ports['gi1/0/5'], vlan: 20, mode: 'access', status: 'connected' };
  stpPvstSw1.runningConfig = [
    '!',
    'hostname SW1',
    '!',
    'ip routing',
    '!',
    'vlan 10',
    ' name VLAN10',
    '!',
    'vlan 20',
    ' name VLAN20',
    '!',
    'interface vlan 1',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
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
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    '!',
    'spanning-tree mode pvst',
    'spanning-tree vlan 1 root primary',
    'spanning-tree vlan 10 priority 32768',
    'spanning-tree vlan 20 priority 32768',
    '!'
  ];

  const stpPvstSw2 = createInitialState('00:11:00:00:02:00', 'WS-C3650-24PS');
  stpPvstSw2.hostname = 'SW2';
  stpPvstSw2.switchModel = 'WS-C3650-24PS';
  stpPvstSw2.switchLayer = 'L3';
  stpPvstSw2.ipRouting = true;
  stpPvstSw2.spanningTreeMode = 'pvst';
  stpPvstSw2.vlans[1] = { id: 1, name: 'default', status: 'active', ports: ['GI1/0/3', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI1/0/4', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw2.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI1/0/5', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw2.spanningTreeVlans = {
    '1': { priority: '32768' },
    '10': { priority: '24576' },
    '20': { priority: '32768' }
  };
  stpPvstSw2.ports['gi1/0/1'] = {
    ...stpPvstSw2.ports['gi1/0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: {
      instances: {
        1: { role: 'root', state: 'forwarding' },
        10: { role: 'designated', state: 'forwarding' },
        20: { role: 'alternate', state: 'blocking' }
      }
    }
  };
  stpPvstSw2.ports['gi1/0/2'] = {
    ...stpPvstSw2.ports['gi1/0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: {
      instances: {
        1: { role: 'alternate', state: 'blocking' },
        10: { role: 'designated', state: 'forwarding' },
        20: { role: 'root', state: 'forwarding' }
      }
    }
  };
  stpPvstSw2.ports['gi1/0/3'] = { ...stpPvstSw2.ports['gi1/0/3'], vlan: 1, mode: 'access', status: 'connected' };
  stpPvstSw2.ports['gi1/0/4'] = { ...stpPvstSw2.ports['gi1/0/4'], vlan: 10, mode: 'access', status: 'connected' };
  stpPvstSw2.ports['gi1/0/5'] = { ...stpPvstSw2.ports['gi1/0/5'], vlan: 20, mode: 'access', status: 'connected' };
  stpPvstSw2.runningConfig = [
    '!',
    'hostname SW2',
    '!',
    'ip routing',
    '!',
    'vlan 10',
    ' name VLAN10',
    '!',
    'vlan 20',
    ' name VLAN20',
    '!',
    'interface vlan 1',
    ' ip address 192.168.1.2 255.255.255.0',
    ' no shutdown',
    '!',
    'interface vlan 10',
    ' ip address 192.168.10.2 255.255.255.0',
    ' no shutdown',
    '!',
    'interface vlan 20',
    ' ip address 192.168.20.2 255.255.255.0',
    ' no shutdown',
    '!',
    'interface range gi1/0/1-2',
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    '!',
    'spanning-tree mode pvst',
    'spanning-tree vlan 1 priority 32768',
    'spanning-tree vlan 10 root primary',
    'spanning-tree vlan 20 priority 32768',
    '!'
  ];

  const stpPvstSw3 = createInitialState('00:11:00:00:03:00', 'WS-C3650-24PS');
  stpPvstSw3.hostname = 'SW3';
  stpPvstSw3.switchModel = 'WS-C3650-24PS';
  stpPvstSw3.switchLayer = 'L3';
  stpPvstSw3.ipRouting = true;
  stpPvstSw3.spanningTreeMode = 'pvst';
  stpPvstSw3.vlans[1] = { id: 1, name: 'default', status: 'active', ports: ['GI1/0/3', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw3.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI1/0/4', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw3.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI1/0/5', 'GI1/0/1', 'GI1/0/2'] };
  stpPvstSw3.spanningTreeVlans = {
    '1': { priority: '32768' },
    '10': { priority: '32768' },
    '20': { priority: '24576' }
  };
  stpPvstSw3.ports['gi1/0/1'] = {
    ...stpPvstSw3.ports['gi1/0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: {
      instances: {
        1: { role: 'root', state: 'forwarding' },
        10: { role: 'alternate', state: 'blocking' },
        20: { role: 'designated', state: 'forwarding' }
      }
    }
  };
  stpPvstSw3.ports['gi1/0/2'] = {
    ...stpPvstSw3.ports['gi1/0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: {
      instances: {
        1: { role: 'alternate', state: 'blocking' },
        10: { role: 'root', state: 'forwarding' },
        20: { role: 'designated', state: 'forwarding' }
      }
    }
  };
  stpPvstSw3.ports['gi1/0/3'] = { ...stpPvstSw3.ports['gi1/0/3'], vlan: 1, mode: 'access', status: 'connected' };
  stpPvstSw3.ports['gi1/0/4'] = { ...stpPvstSw3.ports['gi1/0/4'], vlan: 10, mode: 'access', status: 'connected' };
  stpPvstSw3.ports['gi1/0/5'] = { ...stpPvstSw3.ports['gi1/0/5'], vlan: 20, mode: 'access', status: 'connected' };
  stpPvstSw3.runningConfig = [
    '!',
    'hostname SW3',
    '!',
    'ip routing',
    '!',
    'vlan 10',
    ' name VLAN10',
    '!',
    'vlan 20',
    ' name VLAN20',
    '!',
    'interface vlan 1',
    ' ip address 192.168.1.3 255.255.255.0',
    ' no shutdown',
    '!',
    'interface vlan 10',
    ' ip address 192.168.10.3 255.255.255.0',
    ' no shutdown',
    '!',
    'interface vlan 20',
    ' ip address 192.168.20.3 255.255.255.0',
    ' no shutdown',
    '!',
    'interface range gi1/0/1-2',
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    '!',
    'spanning-tree mode pvst',
    'spanning-tree vlan 1 priority 32768',
    'spanning-tree vlan 10 priority 32768',
    'spanning-tree vlan 20 root primary',
    '!'
  ];

  return {
    id: 'stp-3switch-pvst',
    tag: isTr ? 'STP' : 'STP',
    title: isTr ? 'STP 3 Switch PVST' : 'STP 3 Switch PVST',
    description: isTr
      ? 'PVST ile her VLAN için farklı root bridge yük dengelemesi sağlanır.'
      : 'PVST provides load balancing with different root bridge per VLAN.',
    detail: isTr
      ? 'VLAN1 root SW1, VLAN10 root SW2, VLAN20 root SW3'
      : 'VLAN1 root SW1, VLAN10 root SW2, VLAN20 root SW3',
    level: 'advanced',
    data: baseProjectData(stpPvstDevices, stpPvstConnections, stpPvstNotes, [
      { id: 'sw1', state: stpPvstSw1 },
      { id: 'sw2', state: stpPvstSw2 },
      { id: 'sw3', state: stpPvstSw3 }
    ])
  };
};

export default example;


