import { createInitialRouterState, createInitialState } from '../initialState';
import {
  createPcDevice,
  createRouterDevice,
  createSwitchDevice,
  createL3SwitchDevice,
  createIotDevice,
  connectPorts,
  baseProjectData
} from './helpers';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';

const example = (isTr: boolean): ExampleProject => {
  // 1. Devices
  const r1 = createRouterDevice('router-1', 'R1-Gateway', 380, 60, '192.168.1.1');
  const sw1 = createSwitchDevice('switch-1', 'SW1-Core', 380, 210);

  // Standalone Access Points (Wireless-enabled Layer 3 Switches - NS-L3-24PS)
  const wap1 = createL3SwitchDevice('wap-1', 'WAP-Staff', 180, 360);
  wap1.ip = '192.168.10.2';
  wap1.wifi = {
    enabled: true,
    ssid: 'Staff-WiFi',
    security: 'wpa2',
    password: 'SecureStaff2026',
    channel: '2.4GHz',
    mode: 'ap'
  };
  wap1.ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 10,
      ipAddress: '192.168.10.2',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Staff-WiFi',
        security: 'wpa2',
        password: 'SecureStaff2026',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    ...wap1.ports.filter(p => p.id !== 'wlan0')
  ];

  const wap2 = createL3SwitchDevice('wap-2', 'WAP-Guest', 580, 360);
  wap2.ip = '192.168.20.2';
  wap2.wifi = {
    enabled: true,
    ssid: 'Guest-WiFi',
    security: 'open',
    password: '',
    channel: '5GHz',
    mode: 'ap'
  };
  wap2.ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 20,
      ipAddress: '192.168.20.2',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Guest-WiFi',
        security: 'open',
        password: '',
        channel: '5GHz',
        mode: 'ap'
      }
    },
    ...wap2.ports.filter(p => p.id !== 'wlan0')
  ];

  // Wired PC
  const pcWired = createPcDevice('pc-admin', 'PC-Wired', 740, 210, '192.168.1.50', 1, '192.168.1.1');

  // Wireless Clients
  const laptopStaff = createPcDevice('laptop-staff', 'Laptop-Staff', 120, 520, '192.168.10.101', 10, '192.168.10.1');
  laptopStaff.wifi = {
    enabled: true,
    ssid: 'Staff-WiFi',
    security: 'wpa2',
    password: 'SecureStaff2026',
    channel: '2.4GHz',
    mode: 'client'
  };
  laptopStaff.ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 10,
      ipAddress: '192.168.10.101',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Staff-WiFi',
        security: 'wpa2',
        password: 'SecureStaff2026',
        channel: '2.4GHz',
        mode: 'client'
      }
    },
    ...laptopStaff.ports
  ];

  const laptopGuest = createPcDevice('laptop-guest', 'Laptop-Guest', 520, 520, '192.168.20.101', 20, '192.168.20.1');
  laptopGuest.wifi = {
    enabled: true,
    ssid: 'Guest-WiFi',
    security: 'open',
    password: '',
    channel: '5GHz',
    mode: 'client'
  };
  laptopGuest.ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 20,
      ipAddress: '192.168.20.101',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Guest-WiFi',
        security: 'open',
        password: '',
        channel: '5GHz',
        mode: 'client'
      }
    },
    ...laptopGuest.ports
  ];

  const iotDevice = createIotDevice('iot-smart', 'Smart-Sensor', 680, 520, 'temperature');
  iotDevice.wifi = {
    enabled: true,
    ssid: 'Guest-WiFi',
    security: 'open',
    password: '',
    channel: '5GHz',
    mode: 'client'
  };
  iotDevice.ip = '192.168.20.105';
  iotDevice.subnet = '255.255.255.0';
  iotDevice.gateway = '192.168.20.1';
  iotDevice.ports = [
    {
      id: 'eth0',
      label: 'Eth0',
      status: 'disconnected' as const
    },
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      ipAddress: '192.168.20.105',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Guest-WiFi',
        security: 'open',
        channel: '5GHz',
        mode: 'client'
      }
    }
  ];

  const devices = [r1, sw1, wap1, wap2, pcWired, laptopStaff, laptopGuest, iotDevice];
  const connections: CanvasConnection[] = [];

  // Physical Connections
  connectPorts(devices, connections, 'router-1', 'gi0/0', 'switch-1', 'fa0/1', 'straight');
  connectPorts(devices, connections, 'switch-1', 'fa0/2', 'wap-1', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'switch-1', 'fa0/3', 'wap-2', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'switch-1', 'fa0/4', 'pc-admin', 'eth0', 'straight');

  // Notes
  const notes: CanvasNote[] = [
    {
      id: 'wap-multi-note',
      text: isTr
        ? 'Amaç: Çoklu Wireless Destekli L3 Switch (WAP) ve VLAN tabanlı Multi-SSID kurumsal kablosuz dağıtımını incelemek.\n\nWireless L3 Switch WAP & Multi-SSID Laboratuvarı:\n1) WAP-Staff (NS-L3 Sw, 2.4GHz) -> SSID: Staff-WiFi (VLAN 10, WPA2-PSK: SecureStaff2026)\n2) WAP-Guest (NS-L3 Sw, 5GHz) -> SSID: Guest-WiFi (VLAN 20, Açık/Open)\n3) R1-Gateway üzerinde Inter-VLAN Routing (ROAS) ve DHCP havuzları aktiftir.\n4) SW1 Switch portları:\n   • Fa0/1: Trunk (R1 ile bağlantı)\n   • Fa0/2: Access VLAN 10 (WAP-Staff gi1/0/1)\n   • Fa0/3: Access VLAN 20 (WAP-Guest gi1/0/1)\n   • Fa0/4: Access VLAN 1 (Yönetim PC)\n5) Testler:\n   • Laptop-Staff > ping 192.168.10.1 (VLAN 10 Gateway testi)\n   • Laptop-Guest > ping 192.168.20.1 (VLAN 20 Gateway testi)\n   • Laptop-Staff > ping 192.168.20.101 (Inter-VLAN yönlendirme testi)\n   • Laptop-Staff > ping 192.168.10.2 (WAP-Staff L3 Switch IP)\n\n⚠️ Not: Ağı Yenile (F5)'
        : 'Goal: Explore Wireless-enabled Layer 3 Switch WAPs and VLAN-based multi-SSID wireless deployment.\n\nWireless L3 Switch WAP & Multi-SSID Lab:\n1) WAP-Staff (NS-L3 Sw, 2.4GHz) -> SSID: Staff-WiFi (VLAN 10, WPA2-PSK: SecureStaff2026)\n2) WAP-Guest (NS-L3 Sw, 5GHz) -> SSID: Guest-WiFi (VLAN 20, Open)\n3) R1-Gateway handles Inter-VLAN Routing (ROAS) and DHCP.\n4) SW1 Switch ports:\n   • Fa0/1: Trunk (Link to R1)\n   • Fa0/2: Access VLAN 10 (WAP-Staff gi1/0/1)\n   • Fa0/3: Access VLAN 20 (WAP-Guest gi1/0/1)\n   • Fa0/4: Access VLAN 1 (Admin PC)\n5) Connectivity Tests:\n   • Laptop-Staff > ping 192.168.10.1 (VLAN 10 Gateway)\n   • Laptop-Guest > ping 192.168.20.1 (VLAN 20 Gateway)\n   • Laptop-Staff > ping 192.168.20.101 (Inter-VLAN routing test)\n   • Laptop-Staff > ping 192.168.10.2 (WAP-Staff L3 Switch IP)\n\n⚠️ Note: Refresh Network (F5)',
      x: 340,
      y: 620,
      width: 520,
      height: 250,
      color: 'var(--color-success-500)',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];

  // Device States
  // Router State
  const r1State = createInitialRouterState('00:50:00:00:00:91');
  r1State.hostname = 'R1-Gateway';
  r1State.ports['gi0/0'] = {
    ...r1State.ports['gi0/0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.1',
    subnetMask: '255.255.255.0'
  };
  r1State.ports['gi0/0.10'] = {
    ...r1State.ports['gi0/0'],
    id: 'gi0/0.10',
    vlan: 10,
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    isSubinterface: true,
    parentInterface: 'gi0/0',
    status: 'connected'
  };
  r1State.ports['gi0/0.20'] = {
    ...r1State.ports['gi0/0'],
    id: 'gi0/0.20',
    vlan: 20,
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0',
    isSubinterface: true,
    parentInterface: 'gi0/0',
    status: 'connected'
  };
  r1State.services = {
    ...r1State.services,
    dhcp: {
      enabled: true,
      pools: [
        {
          poolName: 'STAFF-POOL',
          defaultGateway: '192.168.10.1',
          dnsServer: '8.8.8.8',
          startIp: '192.168.10.100',
          subnetMask: '255.255.255.0',
          maxUsers: 50
        },
        {
          poolName: 'GUEST-POOL',
          defaultGateway: '192.168.20.1',
          dnsServer: '8.8.8.8',
          startIp: '192.168.20.100',
          subnetMask: '255.255.255.0',
          maxUsers: 50
        }
      ]
    }
  };
  r1State.dhcpPools = {
    'STAFF-POOL': {
      network: '192.168.10.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.10.1',
      dnsServer: '8.8.8.8'
    },
    'GUEST-POOL': {
      network: '192.168.20.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.20.1',
      dnsServer: '8.8.8.8'
    }
  };
  r1State.runningConfig = [
    '!',
    'hostname R1-Gateway',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface GigabitEthernet0/0.10',
    ' encapsulation dot1Q 10',
    ' ip address 192.168.10.1 255.255.255.0',
    '!',
    'interface GigabitEthernet0/0.20',
    ' encapsulation dot1Q 20',
    ' ip address 192.168.20.1 255.255.255.0',
    '!',
    'ip dhcp pool STAFF-POOL',
    ' network 192.168.10.0 255.255.255.0',
    ' default-router 192.168.10.1',
    ' dns-server 8.8.8.8',
    '!',
    'ip dhcp pool GUEST-POOL',
    ' network 192.168.20.0 255.255.255.0',
    ' default-router 192.168.20.1',
    ' dns-server 8.8.8.8',
    '!',
    'end'
  ];

  // SW1 (Switch)
  const sw1State = createInitialState('00:50:00:00:00:92');
  sw1State.hostname = 'SW1-Core';
  sw1State.vlans = {
    ...sw1State.vlans,
    10: { id: 10, name: 'Staff-VLAN', status: 'active', ports: ['fa0/2'] },
    20: { id: 20, name: 'Guest-VLAN', status: 'active', ports: ['fa0/3'] }
  };
  sw1State.ports['fa0/1'] = { ...sw1State.ports['fa0/1'], status: 'connected', mode: 'trunk' };
  sw1State.ports['fa0/2'] = { ...sw1State.ports['fa0/2'], status: 'connected', vlan: 10, mode: 'access' };
  sw1State.ports['fa0/3'] = { ...sw1State.ports['fa0/3'], status: 'connected', vlan: 20, mode: 'access' };
  sw1State.ports['fa0/4'] = { ...sw1State.ports['fa0/4'], status: 'connected', vlan: 1, mode: 'access' };
  sw1State.runningConfig = [
    '!',
    'hostname SW1-Core',
    '!',
    'vlan 10',
    ' name Staff-VLAN',
    '!',
    'vlan 20',
    ' name Guest-VLAN',
    '!',
    'interface FastEthernet0/1',
    ' switchport mode trunk',
    '!',
    'interface FastEthernet0/2',
    ' switchport mode access',
    ' switchport access vlan 10',
    '!',
    'interface FastEthernet0/3',
    ' switchport mode access',
    ' switchport access vlan 20',
    '!',
    'interface FastEthernet0/4',
    ' switchport mode access',
    ' switchport access vlan 1',
    '!',
    'end'
  ];

  // WAP-1 State (Staff - L3 Switch NS-L3-24PS)
  const wap1State = createInitialState('00:50:00:00:00:93', 'NS-L3-24PS');
  wap1State.hostname = 'WAP-Staff';
  wap1State.switchModel = 'NS-L3-24PS';
  wap1State.switchLayer = 'L3';
  wap1State.deviceType = 'switchL3';
  wap1State.ipRouting = true;
  wap1State.defaultGateway = '192.168.10.1';
  wap1State.staticRoutes = [
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.10.1', type: 'static', metric: 1 }
  ];
  wap1State.vlans = {
    ...wap1State.vlans,
    10: { id: 10, name: 'Staff-VLAN', status: 'active', ports: ['gi1/0/1', 'wlan0'] }
  };
  wap1State.ports['gi1/0/1'] = { ...wap1State.ports['gi1/0/1'], status: 'connected', vlan: 10, mode: 'access' };
  wap1State.ports['wlan0'] = {
    ...wap1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    vlan: 10,
    ipAddress: '192.168.10.2',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'Staff-WiFi',
      security: 'wpa2',
      password: 'SecureStaff2026',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };

  // WAP-2 State (Guest - L3 Switch NS-L3-24PS)
  const wap2State = createInitialState('00:50:00:00:00:94', 'NS-L3-24PS');
  wap2State.hostname = 'WAP-Guest';
  wap2State.switchModel = 'NS-L3-24PS';
  wap2State.switchLayer = 'L3';
  wap2State.deviceType = 'switchL3';
  wap2State.ipRouting = true;
  wap2State.defaultGateway = '192.168.20.1';
  wap2State.staticRoutes = [
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.20.1', type: 'static', metric: 1 }
  ];
  wap2State.vlans = {
    ...wap2State.vlans,
    20: { id: 20, name: 'Guest-VLAN', status: 'active', ports: ['gi1/0/1', 'wlan0'] }
  };
  wap2State.ports['gi1/0/1'] = { ...wap2State.ports['gi1/0/1'], status: 'connected', vlan: 20, mode: 'access' };
  wap2State.ports['wlan0'] = {
    ...wap2State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    vlan: 20,
    ipAddress: '192.168.20.2',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'Guest-WiFi',
      security: 'open',
      password: '',
      channel: '5GHz',
      mode: 'ap'
    }
  };

  return {
    id: 'wap-multi-ssid',
    tag: 'WAP',
    title: isTr ? 'Çoklu Access Point (WAP) ve SSID' : 'Multi Access Point (WAP) and SSID',
    description: isTr
      ? 'Wireless destekli L3 Switch Access Point (WAP) cihazları ile VLAN tabanlı kurumsal kablosuz dağıtım.'
      : 'Wireless-enabled L3 Switch Access Point (WAP) deployment with VLAN-isolated multi-SSID architecture.',
    detail: isTr
      ? '2x L3 Switch WAP (Staff-WiFi & Guest-WiFi), 2.4GHz/5GHz, ROAS Inter-VLAN yönlendirme ve DHCP'
      : '2x L3 Switch WAPs (Staff-WiFi & Guest-WiFi), 2.4GHz/5GHz, ROAS Inter-VLAN routing, and DHCP',
    level: 'intermediate',
    data: baseProjectData(devices, connections, notes, [
      { id: 'router-1', state: r1State },
      { id: 'switch-1', state: sw1State },
      { id: 'wap-1', state: wap1State },
      { id: 'wap-2', state: wap2State }
    ])
  };
};

export default example;
