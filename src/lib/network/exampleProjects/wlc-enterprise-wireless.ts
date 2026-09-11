import { createInitialRouterState, createInitialState, createInitialWLCState } from '../initialState';
import {
  createPcDevice,
  createRouterDevice,
  createL3SwitchDevice,
  createWlcDevice,
  connectPorts,
  baseProjectData
} from './helpers';
import type { CanvasConnection, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';

const example = (isTr: boolean): ExampleProject => {
  // 1. Canvas Devices
  const r1 = createRouterDevice('router-1', 'R1', 380, 50, '192.168.1.1');
  const sw1 = createL3SwitchDevice('switch-1', 'SW1', 380, 200);
  const wlc = createWlcDevice('wlc-1', 'WLC-2504', 120, 200, '192.168.1.10');
  wlc.services = {
    http: {
      enabled: true,
      content: ''
    }
  };

  const pcAdmin = createPcDevice('pc-admin', 'Admin-PC', 120, 360, '192.168.1.50', 1, '192.168.1.1');
  pcAdmin.services = {
    http: {
      enabled: false,
      content: ''
    }
  };

  // Lightweight Access Points (Wireless-enabled Layer 3 Switches - NS-L3-24PS)
  const lap1 = createL3SwitchDevice('lap-1', 'LAP-Floor1', 400, 360);
  lap1.ip = '192.168.1.51';
  lap1.wifi = {
    enabled: true,
    ssid: 'Corp-WiFi',
    security: 'wpa2',
    password: 'SecureNet',
    channel: '2.4GHz',
    mode: 'ap'
  };
  lap1.ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 10,
      ipAddress: '192.168.10.2',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Corp-WiFi',
        security: 'wpa2',
        password: 'SecureNet',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    ...lap1.ports.filter(p => p.id !== 'wlan0')
  ];

  const lap2 = createL3SwitchDevice('lap-2', 'LAP-Floor2', 650, 360);
  lap2.ip = '192.168.1.52';
  lap2.wifi = {
    enabled: true,
    ssid: 'Guest-WiFi',
    security: 'open',
    password: '',
    channel: '5GHz',
    mode: 'ap'
  };
  lap2.ports = [
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
    ...lap2.ports.filter(p => p.id !== 'wlan0')
  ];

  // Wireless Laptop Clients
  const laptopCorp = createPcDevice('laptop-1', 'Laptop-Corp', 300, 520, '192.168.10.101', 10, '192.168.10.1');
  laptopCorp.wifi = {
    enabled: true,
    ssid: 'Corp-WiFi',
    security: 'wpa2',
    password: 'SecureNet',
    channel: '2.4GHz',
    mode: 'client'
  };
  laptopCorp.ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 10,
      ipAddress: '192.168.10.101',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'Corp-WiFi',
        security: 'wpa2',
        password: 'SecureNet',
        channel: '2.4GHz',
        mode: 'client'
      }
    },
    ...laptopCorp.ports
  ];

  const laptopGuest = createPcDevice('laptop-2', 'Laptop-Guest', 650, 520, '192.168.20.101', 20, '192.168.20.1');
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

  const devices = [r1, sw1, wlc, pcAdmin, lap1, lap2, laptopCorp, laptopGuest];
  const connections: CanvasConnection[] = [];

  // Physical Cable Connections
  connectPorts(devices, connections, 'router-1', 'gi0/0', 'switch-1', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'switch-1', 'gi1/0/2', 'wlc-1', 'gi0/0', 'straight');
  connectPorts(devices, connections, 'switch-1', 'gi1/0/3', 'lap-1', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'switch-1', 'gi1/0/4', 'lap-2', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'switch-1', 'gi1/0/5', 'pc-admin', 'eth0', 'straight');

  // Notes
  const notes: CanvasNote[] = [
    {
      id: 'wlc-info-note',
      text: isTr
        ? 'Amaç: WLC (Wireless LAN Controller) ile merkezi AP ve WLAN yapılandırmasını incelemek.\n\nWLC Kurumsal Kablosuz Ağ Laboratuvarı:\n1) WLC-2504 denetleyicisi L3 AP\'leri (LAP-Floor1 & LAP-Floor2) merkezi olarak yönetir.\n2) Tanımlı WLAN\'lar:\n   • WLAN ID 1: "Corp-WiFi" (VLAN 10, WPA2-PSK: SecureNet)\n   • WLAN ID 2: "Guest-WiFi" (VLAN 20, Açık / Open)\n3) CLI Komutları (WLC Terminalinde):\n   • show wlan summary (Tanımlı kablosuz ağlar)\n   • show ap summary (Kayıtlı Access Point listesi)\n   • show ap config LAP-Floor1 (AP detay ve RF durumu)\n4) Bağlantı Testleri:\n   • Laptop-Corp > ping 192.168.20.101 (Laptop-Guest ile iletişim)\n   • Laptop-Corp > ping 192.168.1.10 (WLC Denetleyiciye ping)\n   • Laptop-Corp > wget 192.168.1.10 (WLC Web Yönetim Paneli)\n   • Admin-PC > wget 192.168.1.10 (WLC Web Paneli Arayüzü)\n\n⚠️ Not: Ağı Yenile (F5)'
        : 'Goal: Explore centralized AP and WLAN management using Wireless LAN Controller (WLC).\n\nWLC Enterprise Wireless Lab:\n1) WLC-2504 centrally manages lightweight L3 APs (LAP-Floor1 & LAP-Floor2).\n2) Configured WLANs:\n   • WLAN ID 1: "Corp-WiFi" (VLAN 10, WPA2-PSK: SecureNet)\n   • WLAN ID 2: "Guest-WiFi" (VLAN 20, Open)\n3) WLC CLI Commands:\n   • show wlan summary (List configured WLANs)\n   • show ap summary (List registered APs)\n   • show ap config LAP-Floor1 (AP details and RF info)\n4) Connectivity Tests:\n   • Laptop-Corp > ping 192.168.20.101 (Inter-laptop ping)\n   • Laptop-Corp > ping 192.168.1.10 (Ping to WLC Controller)\n   • Laptop-Corp > wget 192.168.1.10 (Open WLC Web Panel)\n   • Admin-PC > wget 192.168.1.10 (WLC Web Management UI)\n\n⚠️ Note: Refresh Network (F5)',
      x: 350,
      y: 620,
      width: 520,
      height: 250,
      color: 'var(--color-primary-500)',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];

  // Device States
  // R1 (Router)
  const r1State = createInitialRouterState('00:50:00:00:00:81');
  r1State.hostname = 'R1';
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
          poolName: 'MGMT-POOL',
          defaultGateway: '192.168.1.1',
          dnsServer: '8.8.8.8',
          startIp: '192.168.1.50',
          subnetMask: '255.255.255.0',
          maxUsers: 50
        },
        {
          poolName: 'CORP-WIFI',
          defaultGateway: '192.168.10.1',
          dnsServer: '8.8.8.8',
          startIp: '192.168.10.100',
          subnetMask: '255.255.255.0',
          maxUsers: 100
        },
        {
          poolName: 'GUEST-WIFI',
          defaultGateway: '192.168.20.1',
          dnsServer: '8.8.8.8',
          startIp: '192.168.20.100',
          subnetMask: '255.255.255.0',
          maxUsers: 100
        }
      ]
    }
  };
  r1State.dhcpPools = {
    'MGMT-POOL': {
      network: '192.168.1.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.1.1',
      dnsServer: '8.8.8.8'
    },
    'CORP-WIFI': {
      network: '192.168.10.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.10.1',
      dnsServer: '8.8.8.8'
    },
    'GUEST-WIFI': {
      network: '192.168.20.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.20.1',
      dnsServer: '8.8.8.8'
    }
  };
  r1State.runningConfig = [
    '!',
    'hostname R1',
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
    'ip dhcp pool MGMT-POOL',
    ' network 192.168.1.0 255.255.255.0',
    ' default-router 192.168.1.1',
    ' dns-server 8.8.8.8',
    '!',
    'ip dhcp pool CORP-WIFI',
    ' network 192.168.10.0 255.255.255.0',
    ' default-router 192.168.10.1',
    ' dns-server 8.8.8.8',
    '!',
    'ip dhcp pool GUEST-WIFI',
    ' network 192.168.20.0 255.255.255.0',
    ' default-router 192.168.20.1',
    ' dns-server 8.8.8.8',
    '!',
    'end'
  ];

  // SW1 (Layer 3 Switch NS-L3-24PS)
  const sw1State = createInitialState('00:50:00:00:00:82', 'NS-L3-24PS');
  sw1State.hostname = 'SW1';
  sw1State.switchModel = 'NS-L3-24PS';
  sw1State.switchLayer = 'L3';
  sw1State.deviceType = 'switchL3';
  sw1State.ipRouting = false;
  sw1State.vlans = {
    ...sw1State.vlans,
    10: { id: 10, name: 'Corp-Wireless', status: 'active', ports: ['gi1/0/3'] },
    20: { id: 20, name: 'Guest-Wireless', status: 'active', ports: ['gi1/0/4'] }
  };
  sw1State.ports['gi1/0/1'] = { ...sw1State.ports['gi1/0/1'], status: 'connected', mode: 'trunk' };
  sw1State.ports['gi1/0/2'] = { ...sw1State.ports['gi1/0/2'], status: 'connected', vlan: 1, mode: 'access' };
  sw1State.ports['gi1/0/3'] = { ...sw1State.ports['gi1/0/3'], status: 'connected', mode: 'trunk' };
  sw1State.ports['gi1/0/4'] = { ...sw1State.ports['gi1/0/4'], status: 'connected', mode: 'trunk' };
  sw1State.ports['gi1/0/5'] = { ...sw1State.ports['gi1/0/5'], status: 'connected', vlan: 1, mode: 'access' };

  // WLC (Wireless LAN Controller)
  const wlcState = createInitialWLCState('00:50:00:00:00:83');
  wlcState.hostname = 'WLC-2504';
  wlcState.ports['gi0/0'] = {
    ...wlcState.ports['gi0/0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.10',
    subnetMask: '255.255.255.0'
  };
  wlcState.ports['gi0/1'] = {
    ...wlcState.ports['gi0/1'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.11',
    subnetMask: '255.255.255.0'
  };
  wlcState.defaultGateway = '192.168.1.1';
  wlcState.services = {
    ...wlcState.services,
    http: {
      enabled: true,
      content: '',
      fontSize: 16
    }
  };
  wlcState.wlcWlans = {
    '1': {
      id: 1,
      name: 'Corporate',
      ssid: 'Corp-WiFi',
      status: 'enabled',
      security: 'wpa2',
      password: 'SecureNet',
      vlan: 10
    },
    '2': {
      id: 2,
      name: 'Guest',
      ssid: 'Guest-WiFi',
      status: 'enabled',
      security: 'open',
      password: '',
      vlan: 20
    }
  };
  wlcState.wlcAps = {
    'LAP-Floor1': {
      name: 'LAP-Floor1',
      macAddress: '00E0.F711.2233',
      ipAddress: '192.168.1.51',
      status: 'joined',
      model: 'NS-AP1852I',
      apGroup: 'default-group',
      rfChannel: 1,
      power: '1',
      uptime: '12 days, 4 hours',
      wlans: [1, 2]
    },
    'LAP-Floor2': {
      name: 'LAP-Floor2',
      macAddress: '00E0.F744.5566',
      ipAddress: '192.168.1.52',
      status: 'joined',
      model: 'NS-AP1852I',
      apGroup: 'default-group',
      rfChannel: 6,
      power: '1',
      uptime: '8 days, 19 hours',
      wlans: [1, 2]
    }
  };
  wlcState.runningConfig = [
    '!',
    'hostname WLC-2504',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.1.10 255.255.255.0',
    ' no shutdown',
    '!',
    'interface GigabitEthernet0/1',
    ' ip address 192.168.1.11 255.255.255.0',
    ' no shutdown',
    '!',
    'ip default-gateway 192.168.1.1',
    '!',
    'wlan Corporate 1 Corp-WiFi',
    'wlan Guest 2 Guest-WiFi',
    '!',
    'ap name LAP-Floor1',
    'ap name LAP-Floor2',
    '!',
    'end'
  ];

  // LAP-1 State (Layer 3 Switch NS-L3-24PS)
  const lap1State = createInitialState('00:50:00:00:00:84', 'NS-L3-24PS');
  lap1State.hostname = 'LAP-Floor1';
  lap1State.switchModel = 'NS-L3-24PS';
  lap1State.switchLayer = 'L3';
  lap1State.deviceType = 'switchL3';
  lap1State.ipRouting = true;
  lap1State.defaultGateway = '192.168.10.1';
  lap1State.staticRoutes = [
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.10.1', type: 'static', metric: 1 }
  ];
  lap1State.vlans = {
    ...lap1State.vlans,
    10: { id: 10, name: 'Corp-Wireless', status: 'active', ports: ['gi1/0/1', 'wlan0'] }
  };
  lap1State.ports['gi1/0/1'] = { ...lap1State.ports['gi1/0/1'], status: 'connected', mode: 'trunk' };
  lap1State.ports['wlan0'] = {
    ...lap1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    vlan: 10,
    ipAddress: '192.168.10.2',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'Corp-WiFi',
      security: 'wpa2',
      password: 'SecureNet',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };

  // LAP-2 State (Layer 3 Switch NS-L3-24PS)
  const lap2State = createInitialState('00:50:00:00:00:85', 'NS-L3-24PS');
  lap2State.hostname = 'LAP-Floor2';
  lap2State.switchModel = 'NS-L3-24PS';
  lap2State.switchLayer = 'L3';
  lap2State.deviceType = 'switchL3';
  lap2State.ipRouting = true;
  lap2State.defaultGateway = '192.168.20.1';
  lap2State.staticRoutes = [
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.20.1', type: 'static', metric: 1 }
  ];
  lap2State.vlans = {
    ...lap2State.vlans,
    20: { id: 20, name: 'Guest-Wireless', status: 'active', ports: ['gi1/0/1', 'wlan0'] }
  };
  lap2State.ports['gi1/0/1'] = { ...lap2State.ports['gi1/0/1'], status: 'connected', mode: 'trunk' };
  lap2State.ports['wlan0'] = {
    ...lap2State.ports['wlan0'],
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
    id: 'wlc-enterprise-wireless',
    tag: 'WLC',
    title: isTr ? 'WLC Merkezi Kablosuz Ağ' : 'WLC Enterprise Wireless Network',
    description: isTr
      ? 'WLC denetleyicisi ile Lightweight Access Point (LAP) ve çoklu SSID yönetimi.'
      : 'Centralized Lightweight AP and multi-SSID management using Wireless LAN Controller.',
    detail: isTr
      ? 'WLC-2504, 2x LAP (Corp-WiFi & Guest-WiFi), VLAN 10/20, DHCP ve show komutları'
      : 'WLC-2504, 2x LAP (Corp-WiFi & Guest-WiFi), VLAN 10/20, DHCP, and show commands',
    level: 'advanced',
    data: baseProjectData(devices, connections, notes, [
      { id: 'router-1', state: r1State },
      { id: 'switch-1', state: sw1State },
      { id: 'wlc-1', state: wlcState },
      { id: 'lap-1', state: lap1State },
      { id: 'lap-2', state: lap2State }
    ])
  };
};

export default example;
