import { createInitialState, createInitialRouterState } from './initialState';
import type { SwitchState, CableInfo } from './types';
import { FaultDefinition } from './faults';
import type { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { generateRandomLinkLocalIpv4 } from './linkLocal';
import macExampleA from './examples/40-sayfa2-mac-tablosu.json';
import dnsHttpExample from './examples/59-sayfa3-dns-http.json';
import macExampleB from './examples/69-sayfa4-mac-tablosu.json';
import ipConfigExample from './examples/76-sayfa1-ip-yapilandirma.json';
import dhcpExample from './examples/87-sayfa6-dhcp.json';
import trunk2SwitchExample from './examples/166-sayfa5uygulama-2switchTrunk.json';

type ProjectData = {
  version: string;
  timestamp: string;
  devices: { id: string; state: SwitchState }[];
  deviceOutputs: { id: string; outputs: unknown[] }[];
  pcOutputs: { id: string; outputs: unknown[] }[];
  pcHistories: { id: string; history: string[] }[];
  topology: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    notes: CanvasNote[];
  };
  cableInfo: CableInfo;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  activeTab: 'topology' | 'cmd' | 'terminal' | 'ports' | 'vlan' | 'security';
  zoom: number;
  pan: { x: number; y: number };
};

type FirewallProtocol = 'icmp' | 'tcp' | 'udp' | 'any';
type FirewallAction = 'allow' | 'deny';
type FirewallRule = {
  id: string;
  sourceIp: string;
  targetIp: string;
  port: string;
  protocol: FirewallProtocol;
  action: FirewallAction;
  enabled: boolean;
};

const defaultCableInfo: CableInfo = {
  connected: true,
  cableType: 'straight',
  sourceDevice: 'pc',
  targetDevice: 'switchL2'
};

const normalizeDeviceType = (type: string): CanvasDevice['type'] => {
  if (type === 'switch') return 'switchL2';
  if (type === 'switchL2' || type === 'switchL3' || type === 'pc' || type === 'iot' || type === 'router' || type === 'firewall' || type === 'wlc') return type;
  throw new Error(`Invalid device type: ${type}`);
};

const isValidIpv4 = (value?: string) => {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (part.length > 1 && part.startsWith('0')) return false;
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
};

const applyLinkLocalToUnconfiguredHosts = (devices: CanvasDevice[]): CanvasDevice[] => {
  const usedIps = new Set<string>();
  devices.forEach((device) => {
    if (isValidIpv4(device.ip) && device.ip !== '0.0.0.0') {
      usedIps.add(device.ip);
    }
  });

  return devices.map((device) => {
    if (device.type !== 'pc' && device.type !== 'iot') return device;
    if (isValidIpv4(device.ip) && device.ip !== '0.0.0.0') return device;

    const linkLocalIp = generateRandomLinkLocalIpv4(usedIps);
    usedIps.add(linkLocalIp);
    return {
      ...device,
      ip: linkLocalIp,
      subnet: device.subnet || '255.255.0.0',
      gateway: device.gateway || '0.0.0.0',
      dns: device.dns || '0.0.0.0',
      ipConfigMode: device.type === 'iot' ? (device.ipConfigMode || 'dhcp') : device.ipConfigMode
    };
  });
};

const normalizeMacAddress = (mac?: string): string | undefined => {
  if (!mac) return mac;
  if (/^[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}\.[0-9A-Fa-f]{4}$/.test(mac)) {
    return mac.toUpperCase();
  }
  const clean = mac.replace(/[^0-9A-Fa-f]/g, '');
  if (clean.length === 12) {
    const part1 = clean.slice(0, 4).toUpperCase();
    const part2 = clean.slice(4, 8).toUpperCase();
    const part3 = clean.slice(8, 12).toUpperCase();
    return `${part1}.${part2}.${part3}`;
  }
  return mac;
};

const ensureProjectData = (source: unknown): ProjectData => {
  const asRecord = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const partial = asRecord(source);
  const topology = asRecord(partial.topology);
  const cableInfo = asRecord(partial.cableInfo);

  const safeNormalizeType = (deviceType: string): CanvasDevice['type'] => {
    return normalizeDeviceType(deviceType);
  };

  return {
    version: typeof partial.version === 'string' ? partial.version : '1.0',
    timestamp: typeof partial.timestamp === 'string' ? partial.timestamp : new Date().toISOString(),
    devices: Array.isArray(partial.devices) ? (partial.devices as { id: string; state: SwitchState }[]) : [],
    deviceOutputs: Array.isArray(partial.deviceOutputs) ? (partial.deviceOutputs as { id: string; outputs: unknown[] }[]) : [],
    pcOutputs: Array.isArray(partial.pcOutputs) ? (partial.pcOutputs as { id: string; outputs: unknown[] }[]) : [],
    pcHistories: Array.isArray(partial.pcHistories) ? (partial.pcHistories as { id: string; history: string[] }[]) : [],
    topology: {
      devices: applyLinkLocalToUnconfiguredHosts(((Array.isArray(topology.devices) ? topology.devices : []) as CanvasDevice[]).map((device: CanvasDevice) => ({
        ...device,
        type: safeNormalizeType(device.type),
        macAddress: normalizeMacAddress(device.macAddress) ?? '',
        ports: Array.isArray(device.ports) ? device.ports.map(port => ({
          ...port,
          macAddress: normalizeMacAddress(port.macAddress)
        })) : device.ports
      }))),
      connections: Array.isArray(topology.connections) ? (topology.connections as CanvasConnection[]) : [],
      notes: Array.isArray(topology.notes) ? (topology.notes as CanvasNote[]) : []
    },
    cableInfo: Object.keys(cableInfo).length
      ? {
        connected: typeof cableInfo.connected === 'boolean' ? cableInfo.connected : defaultCableInfo.connected,
        cableType: cableInfo.cableType === 'straight' || cableInfo.cableType === 'crossover' || cableInfo.cableType === 'console' ? cableInfo.cableType : defaultCableInfo.cableType,
        sourcePort: typeof cableInfo.sourcePort === 'string' ? cableInfo.sourcePort : '',
        targetPort: typeof cableInfo.targetPort === 'string' ? cableInfo.targetPort : '',
        sourceDevice: safeNormalizeType(typeof cableInfo.sourceDevice === 'string' ? cableInfo.sourceDevice : 'pc'),
        targetDevice: safeNormalizeType(typeof cableInfo.targetDevice === 'string' ? cableInfo.targetDevice : 'switchL2'),
      }
      : defaultCableInfo,
    activeDeviceId: typeof partial.activeDeviceId === 'string' ? partial.activeDeviceId : 'switch-1',
    activeDeviceType: safeNormalizeType(typeof partial.activeDeviceType === 'string' ? partial.activeDeviceType : 'switchL2'),
    activeTab: partial.activeTab === 'topology' || partial.activeTab === 'cmd' || partial.activeTab === 'terminal' || partial.activeTab === 'ports' || partial.activeTab === 'vlan' || partial.activeTab === 'security' ? partial.activeTab : 'topology',
    zoom: typeof partial.zoom === 'number' ? partial.zoom : 1,
    pan: (partial.pan && typeof partial.pan === 'object' && typeof (partial.pan as { x?: unknown }).x === 'number' && typeof (partial.pan as { y?: unknown }).y === 'number')
      ? { x: (partial.pan as { x: number }).x, y: (partial.pan as { y: number }).y }
      : { x: 0, y: 0 }
  };
};

export type ExampleProjectLevel = 'basic' | 'intermediate' | 'advanced';


export type ExampleProject = {
  id: string;
  tag: string;
  title: string;
  description: string;
  detail?: string;
  data: ProjectData;
  level: ExampleProjectLevel;
  injectedFaults?: FaultDefinition[];
};

const macExampleAData: ProjectData = ensureProjectData(macExampleA);
const dnsHttpExampleData: ProjectData = ensureProjectData(dnsHttpExample);
const macExampleBData: ProjectData = ensureProjectData(macExampleB);
const ipConfigExampleData: ProjectData = ensureProjectData(ipConfigExample);
const dhcpExampleData: ProjectData = ensureProjectData(dhcpExample);
const trunk2SwitchData: ProjectData = ensureProjectData(trunk2SwitchExample);

const deterministicMac = (seed: string, scope: string = 'example-projects') => {
  const input = `${scope}:${seed}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const low24 = (hash >>> 0) & 0xffffff;
  const base = `00E0F7${low24.toString(16).padStart(6, '0').toUpperCase()}`;
  return `${base.slice(0, 4)}.${base.slice(4, 8)}.${base.slice(8, 12)}`;
};

const deterministicIpv6 = (seed: string, vlan: number = 1): string => {
  const input = seed;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  
  const hash32 = (hash >>> 0) & 0xffffffff;
  
  // 2001:db8:acad:VLAN::HOST formatında IPv6 adresi oluştur
  const subnet = vlan.toString(16);
  const host = (hash32 & 0xffff).toString(16).toLowerCase();
  
  return `2001:db8:acad:${subnet}::${host}`;
};

const createSwitchDevice = (id: string, name: string, x: number, y: number, ip: string = ''): CanvasDevice => ({
  id,
  type: 'switchL2',
  name,
  x,
  y,
  ip,
  macAddress: deterministicMac(id),
  status: 'online',
  switchModel: 'WS-C2960-24TT-L',
  ports: [
    ...Array.from({ length: 24 }, (_, i) => ({ id: `fa0/${i + 1}`, label: `Fa0/${i + 1}`, status: 'disconnected' as const })),
    { id: 'console', label: 'Console', status: 'disconnected' as const },
    { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
    { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const }
  ]
});

const createL3SwitchDevice = (id: string, name: string, x: number, y: number): CanvasDevice => ({
  id,
  type: 'switchL3',
  name,
  x,
  y,
  ip: '',
  ipConfigMode: 'static',
  macAddress: deterministicMac(id),
  status: 'online',
  switchModel: 'WS-C3650-24PS',
  ports: [
    ...Array.from({ length: 24 }, (_, i) => ({ id: `gi1/0/${i + 1}`, label: `Gi1/0/${i + 1}`, status: 'disconnected' as const })),
    { id: 'console', label: 'Console', status: 'disconnected' as const },
    { id: 'gi1/1/1', label: 'Gi1/1/1', status: 'disconnected' as const },
    { id: 'gi1/1/2', label: 'Gi1/1/2', status: 'disconnected' as const },
    { id: 'gi1/1/3', label: 'Gi1/1/3', status: 'disconnected' as const },
    { id: 'gi1/1/4', label: 'Gi1/1/4', status: 'disconnected' as const },
    { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, shutdown: true }
  ]
});

const createPcDevice = (id: string, name: string, x: number, y: number, ip: string, vlan: number, gateway?: string, ipv6?: string): CanvasDevice => ({
  id,
  type: 'pc',
  name,
  x,
  y,
  ip,
  vlan,
  gateway,
  ipv6: ipv6 || deterministicIpv6(id, vlan),
  macAddress: deterministicMac(id),
  status: 'online',
  ports: [
    { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
    { id: 'com1', label: 'COM1', status: 'disconnected' as const }
  ]
});

const createRouterDevice = (id: string, name: string, x: number, y: number, ip: string = ''): CanvasDevice => {
  const baseMac = deterministicMac(id);

  return {
    id,
    type: 'router',
    name,
    x,
    y,
    ip,
    macAddress: baseMac, // Base MAC for router
    status: 'online',
    ports: [
      { id: 'console', label: 'Console', status: 'disconnected' as const },
      { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:gi0/0`) },
      { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:gi0/1`) },
      { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:gi0/2`) },
      { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:gi0/3`) },
      { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:s0/0/0`) },
      { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:s0/1/0`) },
      { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:s0/2/0`) },
      { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, shutdown: true, macAddress: deterministicMac(`${id}:wlan0`) }
    ]
  };
};

const createIotDevice = (id: string, name: string, x: number, y: number, sensorType: 'temperature' | 'humidity' | 'motion' | 'light' | 'sound'): CanvasDevice => ({
  id,
  type: 'iot',
  name,
  x,
  y,
  ip: '',
  macAddress: deterministicMac(id),
  status: 'online',
  iot: {
    sensorType,
    collaborationEnabled: true,
    dataStore: ''
  },
  wifi: {
    enabled: true,
    ssid: '',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  },
  ports: [
    { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, wifi: { ssid: '', security: 'open', channel: '2.4GHz', mode: 'client' } }
  ]
});

const createFirewallDevice = (id: string, name: string, x: number, y: number, ip: string = '', firewallRules?: FirewallRule[]): CanvasDevice => {
  const baseMac = deterministicMac(id);

  return {
    id,
    type: 'firewall',
    name,
    x,
    y,
    ip,
    macAddress: baseMac,
    status: 'online',
    firewallRules: firewallRules || [],
    ports: [      
      { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:gi0/0`) },
      { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const, macAddress: deterministicMac(`${id}:gi0/1`) }
    ]
  };
};

const connectPorts = (
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  sourceDeviceId: string,
  sourcePort: string,
  targetDeviceId: string,
  targetPort: string,
  cableType: 'straight' | 'crossover' | 'console' = 'straight'
) => {
  connections.push({
    id: `${sourceDeviceId}-${sourcePort}-${targetDeviceId}-${targetPort}`,
    sourceDeviceId,
    sourcePort,
    targetDeviceId,
    targetPort,
    cableType,
    active: true
  });

  devices.forEach(device => {
    if (device.id !== sourceDeviceId && device.id !== targetDeviceId) return;
    device.ports = device.ports.map(port => {
      const isMatch = (device.id === sourceDeviceId && port.id === sourcePort) ||
        (device.id === targetDeviceId && port.id === targetPort);
      return isMatch ? { ...port, status: 'connected' as const, adminStatus: 'up', operStatus: 'up' } : port;
    });
  });
};

const baseProjectData = (devices: CanvasDevice[], connections: CanvasConnection[], notes: CanvasNote[], deviceStates: { id: string; state: SwitchState }[]): ProjectData => ({
  version: '1.0',
  timestamp: new Date().toISOString(),
  devices: deviceStates,
  deviceOutputs: [],
  pcOutputs: [],
  pcHistories: [],
  topology: {
    devices: applyLinkLocalToUnconfiguredHosts(devices),
    connections,
    notes
  },
  cableInfo: {
    connected: true,
    cableType: 'straight',
    sourceDevice: 'pc',
    targetDevice: 'switchL2'
  },
  activeDeviceId: deviceStates[0]?.id || 'switch-1',
  activeDeviceType: (devices[0]?.type || 'switchL2') as DeviceType,
  activeTab: 'topology',
  zoom: 1.0,
  pan: { x: 0, y: 0 }
});

export const exampleProjects = (language: 'tr' | 'en'): ExampleProject[] => {
  const isTr = language === 'tr';

  // 🌍 Dil Desteği / Language Support
  // ✅ Türkçe - Tam destek / Full support
  // ✅ English - Tam destek / Full support

  // Example 11: Wireless Lab (Intermediate) - 2 PCs, 1 Router
  const wifiDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 220, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1', 350, 220),
    createPcDevice('pc-2', 'PC-2', 650, 220, '192.168.1.11', 1)
  ];

  // Example 12: Basic Firewall Lab - ICMP blocked, other traffic allowed
  const firewallRulesBasic = [
    { id: 'rule-1', sourceIp: '*', targetIp: '*', port: '*', protocol: 'icmp' as const, action: 'deny' as const, enabled: true },
    { id: 'rule-2', sourceIp: '*', targetIp: '*', port: '*', protocol: 'any' as const, action: 'allow' as const, enabled: true }
  ];
  const firewallBasicDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 220, '192.168.1.10', 1, '192.168.1.1'),
    createFirewallDevice('firewall-1', 'FW-1', 350, 220, '192.168.1.1', firewallRulesBasic),
    createPcDevice('pc-2', 'PC-2', 650, 220, '192.168.1.20', 1, '192.168.1.1')
  ];
  const firewallBasicConnections: CanvasConnection[] = [];
  const firewallBasicNotes: CanvasNote[] = [
    {
      id: 'firewall-basic-note',
      text: isTr
        ? '🛡️ Firewall Temel Laboratuvarı:\n\n1) PC-1 (192.168.1.10) → FW-1 → PC-2 (192.168.1.20)\n2) ICMP (ping) ENGELLENMİŞ - Rule 1\n3) Diğer tüm trafiğe İZİN VERİLMİŞ - Rule 2\n\nTest:\n• PC-1 > ping 192.168.1.20 (BAŞARISIZ - ICMP engelli)\n• PC-1 > wget 192.168.1.20 (BAŞARILI - HTTP izinli)\n\nKurallar sıralamaya göre işlenir. ICMP deny kuralı eşleşir ve engeller. HTTP/HTTPS gibi diğer protokoller allow kuralına düşer.'
        : '🛡️ Firewall Basic Lab:\n\n1) PC-1 (192.168.1.10) → FW-1 → PC-2 (192.168.1.20)\n2) ICMP (ping) BLOCKED - Rule 1\n3) All other traffic ALLOWED - Rule 2\n\nTest:\n• PC-1 > ping 192.168.1.20 (FAIL - ICMP blocked)\n• PC-1 > wget 192.168.1.20 (SUCCESS - HTTP allowed)\n\nRules are processed in order. ICMP deny rule matches and blocks. Other protocols like HTTP/HTTPS fall through to allow rule.',
      x: 50,
      y: 50,
      width: 550,
      height: 180,
      color: '#ef4444',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  connectPorts(firewallBasicDevices, firewallBasicConnections, 'pc-1', 'eth0', 'firewall-1', 'gi0/0', 'crossover');
  connectPorts(firewallBasicDevices, firewallBasicConnections, 'firewall-1', 'gi0/1', 'pc-2', 'eth0', 'crossover');

  // Example 13: IoT WiFi Lab - 3 IoT devices, 1 PC, 1 Router (WiFi with connected IoT)
  const iotWifiDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 100, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1', 300, 100),
    createIotDevice('iot-1', 'IoT-Temp', 50, 280, 'temperature'),
    createIotDevice('iot-2', 'IoT-Humidity', 200, 320, 'humidity'),
    createIotDevice('iot-3', 'IoT-Motion', 350, 280, 'motion')
  ];

  // Configure R1 for WiFi with open security
  iotWifiDevices[1].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'ap'
  };
  iotWifiDevices[1].ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected' as const,
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'IoT-Network',
        security: 'open',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    ...iotWifiDevices[1].ports
  ];

  // Configure PC-1 for WiFi (Client mode, open) with DHCP
  iotWifiDevices[0].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[0].ipConfigMode = 'dhcp';
  iotWifiDevices[0].ip = '0.0.0.0';
  iotWifiDevices[0].subnet = '255.255.255.0';
  iotWifiDevices[0].gateway = '192.168.1.1';

  // Configure IoT devices to connect to the router's WiFi via DHCP
  iotWifiDevices[2].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[2].ipConfigMode = 'dhcp';
  iotWifiDevices[2].ip = '0.0.0.0';
  iotWifiDevices[2].subnet = '255.255.255.0';
  iotWifiDevices[2].gateway = '192.168.1.1';
  iotWifiDevices[2].ports[0].status = 'connected';
  iotWifiDevices[2].ports[0].ipAddress = '0.0.0.0';
  iotWifiDevices[2].ports[0].subnetMask = '255.255.255.0';
  iotWifiDevices[2].ports[0].wifi = { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' };

  iotWifiDevices[3].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[3].ipConfigMode = 'dhcp';
  iotWifiDevices[3].ip = '0.0.0.0';
  iotWifiDevices[3].subnet = '255.255.255.0';
  iotWifiDevices[3].gateway = '192.168.1.1';
  iotWifiDevices[3].ports[0].status = 'connected';
  iotWifiDevices[3].ports[0].ipAddress = '0.0.0.0';
  iotWifiDevices[3].ports[0].subnetMask = '255.255.255.0';
  iotWifiDevices[3].ports[0].wifi = { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' };

  iotWifiDevices[4].wifi = {
    enabled: true,
    ssid: 'IoT-Network',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  iotWifiDevices[4].ipConfigMode = 'dhcp';
  iotWifiDevices[4].ip = '0.0.0.0';
  iotWifiDevices[4].subnet = '255.255.255.0';
  iotWifiDevices[4].gateway = '192.168.1.1';
  iotWifiDevices[4].ports[0].status = 'connected';
  iotWifiDevices[4].ports[0].ipAddress = '0.0.0.0';
  iotWifiDevices[4].ports[0].subnetMask = '255.255.255.0';
  iotWifiDevices[4].ports[0].wifi = { ssid: 'IoT-Network', security: 'open', channel: '2.4GHz', mode: 'client' };

  const iotWifiConnections: CanvasConnection[] = [];
  const iotWifiNotes: CanvasNote[] = [
    {
      id: 'iot-wifi-note',
      text: isTr
        ? 'Amaç: IoT cihazlarını kablosuz ağa bağlayarak sensör verilerini izlemek.\n\nIoT WiFi Laboratuvarı:\n1) R1 (Router) wlan0 üzerinde AP modunda SSID: IoT-Network (Open) yayınlar.\n2) R1 üzerinde DHCP havuzu yapılandırılmıştır (192.168.1.100-150).\n3) PC-1 ve 3 IoT cihazı kablosuz ağa (DHCP) bağlıdır.\n4) PC-1 üzerinde wget 192.168.1.1 ile WiFi panelinden IoT cihazlarını yönetin.\n5) PC-1 > ping 192.168.1.1 ile bağlantıyı test edin.\n6) PC-1 > wget http://iot-panel ile cihaz kontrol paneline ulaşınız.\n\n⚠️ Not: Ağı Yenile (F5)'
        : 'IoT WiFi Lab:\n1) R1 (Router) broadcasts SSID: IoT-Network (Open) on wlan0 in AP mode.\n2) DHCP pool is configured on R1 (192.168.1.100-150).\n3) PC-1 and 3 IoT devices are connected via WiFi (DHCP).\n4) Manage IoT devices from PC-1 WiFi panel via wget 192.168.1.1.\n5) Test connectivity with PC-1 > ping 192.168.1.1.\n6) Access device control panel via PC-1 > wget http://iot-panel\n\n⚠️ Note: Refresh Network (F5)',
      x: 500,
      y: 80,
      width: 450,
      height: 220,
      color: '#10b981',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];

  const iotWifiR1State = createInitialRouterState('00:50:00:00:00:09');
  iotWifiR1State.hostname = 'R1';
  // Update router port MAC addresses (already set by createInitialRouterPorts)
  iotWifiR1State.ports['wlan0'] = {
    ...iotWifiR1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.1',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'IoT-Network',
      security: 'open',
      password: '',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };
  if (iotWifiR1State.ports['wlan0'].wifi) iotWifiR1State.ports['wlan0'].wifi.mode = 'ap';

  // Add DHCP service for WiFi clients
  iotWifiR1State.services = {
    ...iotWifiR1State.services,
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'iot-pool',
        defaultGateway: '192.168.1.1',
        dnsServer: '8.8.8.8',
        startIp: '192.168.1.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };
  iotWifiR1State.dhcpPools = {
    'iot-pool': {
      network: '192.168.1.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.1.1',
      dnsServer: '8.8.8.8'
    }
  };

  // Update running config
  iotWifiR1State.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface WLAN0',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'wlan IoT-Network 1 IoT-Network',
    '!',
    'ip dhcp pool iot-pool',
    ' network 192.168.1.0 255.255.255.0',
    ' default-router 192.168.1.1',
    ' dns-server 8.8.8.8',
    '!',
    'line con 0',
    'line aux 0',
    'line vty 0 4',
    ' login',
    '!',
    'end'
  ];

  // Example 14: Greenhouse (Sera) IoT Lab - Environmental monitoring
  const greenhouseDevices = [
    createPcDevice('pc-1', 'PC-1', 50, 80, '192.168.2.10', 1),
    createRouterDevice('router-1', 'R1', 300, 80),
    createIotDevice('iot-temp', 'Sera-Sicaklik', 30, 300, 'temperature'),
    createIotDevice('iot-hum', 'Sera-Nem', 180, 340, 'humidity'),
    createIotDevice('iot-light', 'Sera-Isik', 330, 300, 'light'),
    createIotDevice('iot-motion', 'Sera-Kapi', 480, 320, 'motion'),
    createIotDevice('iot-heater', 'Sera-Isitici', 120, 470, 'temperature'),
    createIotDevice('iot-cooler', 'Sera-Sogutucu', 300, 470, 'temperature'),
    createIotDevice('iot-lamp', 'Sera-Lamba', 480, 470, 'light')
  ];

  // Configure R1 for Greenhouse WiFi with WPA2 security
  greenhouseDevices[1].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'ap'
  };
  greenhouseDevices[1].ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected',
      vlan: 1,
      ipAddress: '192.168.2.1',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'GreenHouse-Network',
        security: 'wpa2',
        password: 'sera',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    {
      id: 'console',
      label: 'Console',
      status: 'disconnected'
    },
    {
      id: 'gi0/0',
      label: 'Gi0/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/0')?.macAddress
    },
    {
      id: 'gi0/1',
      label: 'Gi0/1',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/1')?.macAddress
    },
    {
      id: 'gi0/2',
      label: 'Gi0/2',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/2')?.macAddress
    },
    {
      id: 'gi0/3',
      label: 'Gi0/3',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 'gi0/3')?.macAddress
    },
    {
      id: 's0/0/0',
      label: 'S0/0/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 's0/0/0')?.macAddress
    },
    {
      id: 's0/1/0',
      label: 'S0/1/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 's0/1/0')?.macAddress
    },
    {
      id: 's0/2/0',
      label: 'S0/2/0',
      status: 'disconnected',
      macAddress: greenhouseDevices[1].ports.find(p => p.id === 's0/2/0')?.macAddress
    }
  ];

  // Configure PC-1 for Greenhouse WiFi
  greenhouseDevices[0].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[0].ip = '192.168.2.10';
  greenhouseDevices[0].subnet = '255.255.255.0';
  greenhouseDevices[0].gateway = '192.168.2.1';

  // Configure IoT sensors for greenhouse
  greenhouseDevices[2].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[2].ip = '192.168.2.101';
  greenhouseDevices[2].subnet = '255.255.255.0';
  greenhouseDevices[2].gateway = '192.168.2.1';
  greenhouseDevices[2].ports[0].status = 'connected';
  greenhouseDevices[2].ports[0].ipAddress = '192.168.2.101';
  greenhouseDevices[2].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[2].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[3].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[3].ip = '192.168.2.102';
  greenhouseDevices[3].subnet = '255.255.255.0';
  greenhouseDevices[3].gateway = '192.168.2.1';
  greenhouseDevices[3].ports[0].status = 'connected';
  greenhouseDevices[3].ports[0].ipAddress = '192.168.2.102';
  greenhouseDevices[3].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[3].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[4].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[4].ip = '192.168.2.103';
  greenhouseDevices[4].subnet = '255.255.255.0';
  greenhouseDevices[4].gateway = '192.168.2.1';
  greenhouseDevices[4].ports[0].status = 'connected';
  greenhouseDevices[4].ports[0].ipAddress = '192.168.2.103';
  greenhouseDevices[4].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[4].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[5].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[5].ip = '192.168.2.104';
  greenhouseDevices[5].subnet = '255.255.255.0';
  greenhouseDevices[5].gateway = '192.168.2.1';
  greenhouseDevices[5].ports[0].status = 'connected';
  greenhouseDevices[5].ports[0].ipAddress = '192.168.2.104';
  greenhouseDevices[5].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[5].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };

  greenhouseDevices[6].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[6].ip = '192.168.2.111';
  greenhouseDevices[6].subnet = '255.255.255.0';
  greenhouseDevices[6].gateway = '192.168.2.1';
  greenhouseDevices[6].ports[0].status = 'connected';
  greenhouseDevices[6].ports[0].ipAddress = '192.168.2.111';
  greenhouseDevices[6].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[6].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };
  greenhouseDevices[6].iot = {
    ...greenhouseDevices[6].iot,
    sensorType: 'temperature',
    kind: 'heater',
    dataFlowDirection: 'output',
    value: false
  };

  greenhouseDevices[7].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[7].ip = '192.168.2.112';
  greenhouseDevices[7].subnet = '255.255.255.0';
  greenhouseDevices[7].gateway = '192.168.2.1';
  greenhouseDevices[7].ports[0].status = 'connected';
  greenhouseDevices[7].ports[0].ipAddress = '192.168.2.112';
  greenhouseDevices[7].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[7].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };
  greenhouseDevices[7].iot = {
    ...greenhouseDevices[7].iot,
    sensorType: 'temperature',
    kind: 'cooler',
    dataFlowDirection: 'output',
    value: false
  };

  greenhouseDevices[8].wifi = {
    enabled: true,
    ssid: 'GreenHouse-Network',
    security: 'wpa2',
    password: 'sera',
    channel: '2.4GHz',
    mode: 'client'
  };
  greenhouseDevices[8].ip = '192.168.2.113';
  greenhouseDevices[8].subnet = '255.255.255.0';
  greenhouseDevices[8].gateway = '192.168.2.1';
  greenhouseDevices[8].ports[0].status = 'connected';
  greenhouseDevices[8].ports[0].ipAddress = '192.168.2.113';
  greenhouseDevices[8].ports[0].subnetMask = '255.255.255.0';
  greenhouseDevices[8].ports[0].wifi = { ssid: 'GreenHouse-Network', security: 'wpa2', channel: '2.4GHz', mode: 'client' };
  greenhouseDevices[8].iot = {
    ...greenhouseDevices[8].iot,
    sensorType: 'light',
    kind: 'lamp',
    dataFlowDirection: 'output',
    value: false
  };

  greenhouseDevices[2].iot = {
    ...greenhouseDevices[2].iot,
    sensorType: 'temperature',
    kind: 'sensor',
    dataFlowDirection: 'input',
    rules: [
      { id: 'gh-temp-hot', condition: 'iot:iot-temp:temperature > 28', action: 'iot-cooler:ON', enabled: true },
      { id: 'gh-temp-cooler-off', condition: 'iot:iot-temp:temperature < 26', action: 'iot-cooler:OFF', enabled: true },
      { id: 'gh-temp-cold', condition: 'iot:iot-temp:temperature < 18', action: 'iot-heater:ON', enabled: true },
      { id: 'gh-temp-heater-off', condition: 'iot:iot-temp:temperature > 20', action: 'iot-heater:OFF', enabled: true }
    ]
  };
  greenhouseDevices[4].iot = {
    ...greenhouseDevices[4].iot,
    sensorType: 'light',
    kind: 'sensor',
    dataFlowDirection: 'input',
    rules: [
      { id: 'gh-light-dark', condition: 'iot:iot-light:light < 45', action: 'iot-lamp:ON', enabled: true },
      { id: 'gh-light-bright', condition: 'iot:iot-light:light > 60', action: 'iot-lamp:OFF', enabled: true }
    ]
  };

  const greenhouseConnections: CanvasConnection[] = [];
  const greenhouseNotes: CanvasNote[] = [
    {
      id: 'greenhouse-note',
      text: isTr
        ? 'Amaç: Güvenli WiFi ağı ile IoT sensörleri ve aktüatörlerle sera ortamını izlemek.\n\nAKILLI SERA KROKISI:\n1) R1 (Router) WPA2 korumalı WiFi ağı: GreenHouse-Network (şifre: sera)\n2) 4 IoT Sensör: Sıcaklık (2.101), Nem (2.102), Işık (2.103), Kapı/Hareket (2.104)\n3) 3 Aktüatör: Isıtıcı (2.111), Soğutucu (2.112), Lamba (2.113)\n4) Basit programlama hazır: sıcaklık ısıtıcı/soğutucuyu, ışık sensörü lambayı otomatik yönetir\n5) PC-1 ile WiFi panelinden (wget 192.168.2.1) sensörleri izleyin\n6) IoT Panel: wget http://iot-panel (admin/admin) ile cihazları ve kuralları yönetin'
        : 'SMART GREENHOUSE SKETCH:\n1) R1 (Router) WPA2 secured WiFi: GreenHouse-Network (password: sera)\n2) 4 IoT Sensors: Temperature (.101), Humidity (.102), Light (.103), Door/Motion (.104)\n3) 3 Actuators: Heater (.111), Cooler (.112), Lamp (.113)\n4) Simple programming is preconfigured: temperature drives heater/cooler, light drives lamp automatically\n5) Monitor sensors from PC-1 via WiFi panel (wget 192.168.2.1)\n6) IoT Panel: wget http://iot-panel (admin/admin) to manage devices and rules',
      x: 500,
      y: 60,
      width: 480,
      height: 220,
      color: '#10b981',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const greenhouseR1State = createInitialRouterState('00:50:00:00:00:0A');
  greenhouseR1State.hostname = 'R1-SERA';
  greenhouseR1State.ports['wlan0'] = {
    ...greenhouseR1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.2.1',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'GreenHouse-Network',
      security: 'wpa2',
      password: 'sera',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };
  if (greenhouseR1State.ports['wlan0'].wifi) greenhouseR1State.ports['wlan0'].wifi.mode = 'ap';

  // Add DHCP service for greenhouse WiFi clients
  greenhouseR1State.services = {
    ...greenhouseR1State.services,
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'greenhouse-pool',
        defaultGateway: '192.168.2.1',
        dnsServer: '8.8.8.8',
        startIp: '192.168.2.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };
  greenhouseR1State.dhcpPools = {
    'greenhouse-pool': {
      network: '192.168.2.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.2.1',
      dnsServer: '8.8.8.8'
    }
  };

  greenhouseR1State.runningConfig = [
    '!',
    'hostname R1-SERA',
    '!',
    'interface WLAN0',
    ' ip address 192.168.2.1 255.255.255.0',
    ' no shutdown',
    '!',
    'wlan GreenHouse-Network 1 GreenHouse-Network',
    'security wpa psk ascii 0 sera',
    '!',
    'ip dhcp pool greenhouse-pool',
    ' network 192.168.2.0 255.255.255.0',
    ' default-router 192.168.2.1',
    ' dns-server 8.8.8.8',
    '!',
    'line con 0',
    'line aux 0',
    'line vty 0 4',
    ' login',
    '!',
    'end'
  ];

  // Configure R1 for WiFi
  wifiDevices[1].wifi = {
    enabled: true,
    ssid: 'HomeWiFi',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'ap'
  };
  wifiDevices[1].ports = [
    {
      id: 'wlan0',
      label: 'WLAN0',
      status: 'connected' as const,
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
      wifi: {
        ssid: 'HomeWiFi',
        security: 'open',
        channel: '2.4GHz',
        mode: 'ap'
      }
    },
    ...wifiDevices[1].ports
  ];
  // Configure PCs for WiFi (Clients) - Keep static IPs for now
  wifiDevices[0].wifi = {
    enabled: true,
    ssid: 'HomeWiFi',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };
  wifiDevices[2].wifi = {
    enabled: true,
    ssid: 'HomeWiFi',
    security: 'open',
    password: '',
    channel: '2.4GHz',
    mode: 'client'
  };

  const wifiConnections: CanvasConnection[] = [];
  const wifiNotes: CanvasNote[] = [
    {
      id: 'wifi-note',
      text: isTr
        ? 'Amaç: Router AP modunda kablosuz ağ oluşturarak PC\'lerin kablosuz bağlanmasını sağlamak.\n\nWiFi Laboratuvarı (Orta Seviye):\n1) R1 (Router) wlan0 üzerinde AP modunda SSID: HomeWiFi yayınlar.\n2) PC-1 ve PC-2 kablosuz ağa (SSID match) bağlıdır.\n3) Tüm cihazlar aynı subnet (192.168.1.x) içindedir.\n4) PC-1 > ping 192.168.1.11 ile kablosuz iletişimi test edin.\n5) PC-1 > wget 192.168.1.1 ile Wifi kontrol panelini görün.\n\n⚠️ Not: Ağı Yenile (F5)'
        : 'WiFi Lab (Intermediate):\n1) R1 (Router) broadcasts SSID: HomeWiFi on wlan0 in AP mode.\n2) PC-1 and PC-2 are connected wirelessly (SSID match).\n3) All devices are on the same subnet (192.168.1.x).\n4) Test wireless connectivity with PC-1 > ping 192.168.1.11.\n5) PC-1 > wget 192.168.1.1 for Wifi control panel.\n\n⚠️ Note: Refresh Network (F5)',
      x: 300,
      y: 400,
      width: 450,
      height: 180,
      color: '#f59e0b',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];
  const wifiR1State = createInitialRouterState('00:50:00:00:00:08');
  wifiR1State.hostname = 'R1';
  wifiR1State.ports['wlan0'] = {
    ...wifiR1State.ports['wlan0'],
    status: 'connected',
    shutdown: false,
    ipAddress: '192.168.1.1',
    subnetMask: '255.255.255.0',
    wifi: {
      ssid: 'HomeWiFi',
      security: 'open',
      password: '',
      channel: '2.4GHz',
      mode: 'ap'
    }
  };
  if (wifiR1State.ports['wlan0'].wifi) wifiR1State.ports['wlan0'].wifi.mode = 'ap';

  // Add DHCP service to R1 for WiFi clients
  wifiR1State.services = {
    ...wifiR1State.services,
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'wifi-pool',
        defaultGateway: '192.168.1.1',
        dnsServer: '8.8.8.8',
        startIp: '192.168.1.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };
  wifiR1State.dhcpPools = {
    'wifi-pool': {
      network: '192.168.1.0',
      subnetMask: '255.255.255.0',
      defaultRouter: '192.168.1.1',
      dnsServer: '8.8.8.8'
    }
  };

  // Example 12: Router DHCP (2 PCs + 1 Switch + 1 Router)
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
      color: '#0ea5e9',
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
  } as SwitchState['services'];
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
  // Varsayılan L2 switch ayarlarına eşitle (IP'siz, tüm portlar dinamik)
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

  // Update running config to include wifi mode
  wifiR1State.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'interface WLAN0',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'wlan HomeWiFi 1 HomeWiFi',
    '!',
    'ip dhcp pool wifi-pool',
    ' network 192.168.1.0 255.255.255.0',
    ' default-router 192.168.1.1',
    ' dns-server 8.8.8.8',
    '!',
    'line con 0',
    'line aux 0',
    'line vty 0 4',
    ' login',
    '!',
    'end'
  ];

  // Example 1: Basic switch + passwords
  const basicDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 180, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2 (Console)', 40, 320, '', 1),
    createSwitchDevice('switch-1', 'SW1', 240, 220)
  ];
  const basicConnections: CanvasConnection[] = [];
  connectPorts(basicDevices, basicConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(basicDevices, basicConnections, 'pc-2', 'com1', 'switch-1', 'console', 'console');
  const basicNotes: CanvasNote[] = [
    {
      id: 'basic-note-1',
      text: isTr
        ? 'Amaç: Switch üzerinde konsol, VTY ve enable parolalarını yapılandırmak ve doğrulamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet PC (PC-1) ekle\n   - 1 adet PC (PC-2) ekle (Console için)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 COM1 -> SW1 Console (Console kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - enable secret class\n   - enable password paswd\n   - service password-encryption\n   - line con 0\n     password console\n     login\n     logging synchronous\n   - line vty 0 4\n     password vty123\n     login\n     transport input telnet ssh\n   - exit\n\n3) VLAN VE IP AYARLARI:\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.150 255.255.255.0\n     no shutdown\n   - exit\n   - interface fa0/1\n     switchport access vlan 10\n     switchport mode access\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.150\n   - PC-2: Console bağlantısı için IP gerekmez\n\n5) TEST:\n   - PC-2 Console terminalinden SW1\'e bağlan\n   - PC-1 CMD: telnet 192.168.10.150\n   - Kullanıcı adı: (yok), Şifre: vty123\n   - Enable şifresi: class veya paswd'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 PC (PC-1)\n   - Add 1 PC (PC-2) for Console\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 COM1 -> SW1 Console (Console cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - enable secret class\n   - enable password paswd\n   - service password-encryption\n   - line con 0\n     password console\n     login\n     logging synchronous\n   - line vty 0 4\n     password vty123\n     login\n     transport input telnet ssh\n   - exit\n\n3) VLAN AND IP SETTINGS:\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.150 255.255.255.0\n     no shutdown\n   - exit\n   - interface fa0/1\n     switchport access vlan 10\n     switchport mode access\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.150\n   - PC-2: No IP needed for Console connection\n\n5) TEST:\n   - Connect to SW1 from PC-2 Console terminal\n   - PC-1 CMD: telnet 192.168.10.150\n   - Username: (none), Password: vty123\n   - Enable password: class or paswd',
      x: 600,
      y: 40,
      width: 500,
      height: 320,
      color: '#22d3ee',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const basicState = createInitialState();
  basicState.hostname = 'SW1';
  basicState.security = {
    ...basicState.security,
    enableSecret: 'class',
    enablePassword: 'paswd',
    servicePasswordEncryption: true,
    consoleLine: { ...basicState.security.consoleLine, password: 'console', login: true },
    vtyLines: { ...basicState.security.vtyLines, password: 'vty123', login: true }
  };
  basicState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  basicState.ports['vlan10'] = {
    id: 'vlan10',
    name: 'VLAN10 Interface',
    status: 'connected',
    vlan: 10,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.10.150',
    subnetMask: '255.255.255.0'
  };
  basicState.ports['fa0/1'] = { ...basicState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };

  // Example 2: Single switch VLANs
  const vlanDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20),
    createSwitchDevice('switch-1', 'SW1', 260, 190)
  ];
  const vlanConnections: CanvasConnection[] = [];
  connectPorts(vlanDevices, vlanConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(vlanDevices, vlanConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  const vlanNotes: CanvasNote[] = [
    {
      id: 'vlan-note-1',
      text: isTr
        ? 'Amaç: Tek bir switch üzerinde VLAN oluşturarak PC\'leri farklı broadcast domain\'lere ayırmak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)\n\n2) SWITCH VLAN KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n\n3) PORT VLAN ATAMASI:\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n4) PC IP KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, VLAN 20\n\n5) DOĞRULAMA:\n   - show vlan brief (VLAN 10 ve 20\'yi gör)\n   - show interfaces status (port VLAN atamalarını kontrol et)\n   - PC-1 ve PC-2 birbirine ping atamaz (farklı VLAN)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/2 (Straight cable)\n\n2) SWITCH VLAN CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n\n3) PORT VLAN ASSIGNMENT:\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n4) PC IP CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, VLAN 20\n\n5) VERIFICATION:\n   - show vlan brief (see VLAN 10 and 20)\n   - show interfaces status (check port VLAN assignments)\n   - PC-1 and PC-2 cannot ping each other (different VLANs)',
      x: 600,
      y: 40,
      width: 480,
      height: 280,
      color: '#a855f7',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const vlanState = createInitialState();
  vlanState.hostname = 'SW1';
  vlanState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  vlanState.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/2'] };
  vlanState.ports['fa0/1'] = { ...vlanState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  vlanState.ports['fa0/2'] = { ...vlanState.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };

  // Example 3: Two switches trunk + VTP
  const vtpDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 220, '192.168.10.10', 10),
    createSwitchDevice('switch-1', 'SW1', 240, 140),
    createSwitchDevice('switch-2', 'SW2', 440, 260)
  ];
  const vtpConnections: CanvasConnection[] = [];
  connectPorts(vtpDevices, vtpConnections, 'pc-1', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(vtpDevices, vtpConnections, 'switch-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  const vtpNotes: CanvasNote[] = [
    {
      id: 'vtp-note-1',
      text: isTr
        ? 'Amaç: İki switch arasında VTP kullanarak VLAN bilgilerinin otomatik yayılımını sağlamak.\n\nTrunk + VTP:\nSW1 (server): vtp mode server, vtp domain LAB\nSW2 (client): vtp mode client, vtp domain LAB\nGi0/1 trunk olmalı.\nSW1\'de VLAN 10/20 aç -> SW2\'ye otomatik gelmeli.\nshow interface trunk ve show vlan brief ile doğrula.'
        : 'Goal: Automate VLAN propagation between two switches using VTP.\n\nTrunk + VTP:\nSW1 (server): vtp mode server, vtp domain LAB\nSW2 (client): vtp mode client, vtp domain LAB\nGi0/1 must be trunk.\nCreate VLAN 10/20 on SW1 -> should appear on SW2.\nVerify with show interface trunk and show vlan brief.',
      x: 600,
      y: 40,
      width: 420,
      height: 190,
      color: '#f59e0b',
      font: 'verdana',
      fontSize: 16,
      opacity: 0.75
    }
  ];
  const vtpSw1 = createInitialState('00:1A:2B:3C:4D:61');
  vtpSw1.hostname = 'SW1';
  vtpSw1.vtpMode = 'server';
  vtpSw1.vtpDomain = 'LAB';
  vtpSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI0/1'] };
  vtpSw1.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI0/1'] };
  vtpSw1.ports['gi0/1'] = { ...vtpSw1.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected' };
  const vtpSw2 = createInitialState('00:1A:2B:3C:4D:62');
  vtpSw2.hostname = 'SW2';
  vtpSw2.vtpMode = 'client';
  vtpSw2.vtpDomain = 'LAB';
  vtpSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1', 'GI0/1'] };
  vtpSw2.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI0/1'] };
  vtpSw2.ports['gi0/1'] = { ...vtpSw2.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected' };
  vtpSw2.ports['fa0/1'] = { ...vtpSw2.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };

  // Example 3.5: Native VLAN Configuration (Basic)
  const nativeVlanDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 180, '192.168.99.10', 99),
    createPcDevice('pc-2', 'PC-2', 40, 320, '192.168.99.11', 99),
    createSwitchDevice('switch-1', 'SW1', 240, 180),
    createSwitchDevice('switch-2', 'SW2', 440, 320)
  ];
  const nativeVlanConnections: CanvasConnection[] = [];
  connectPorts(nativeVlanDevices, nativeVlanConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(nativeVlanDevices, nativeVlanConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(nativeVlanDevices, nativeVlanConnections, 'switch-1', 'fa0/24', 'switch-2', 'fa0/24', 'crossover');
  const nativeVlanSw1 = createInitialState();
  nativeVlanSw1.hostname = 'SW1';
  nativeVlanSw1.vlans[99] = { id: 99, name: 'NativeVLAN', status: 'active', ports: ['FA0/1', 'FA0/24'] };
  nativeVlanSw1.ports['fa0/1'] = { ...nativeVlanSw1.ports['fa0/1'], vlan: 99, mode: 'access', status: 'connected' };
  nativeVlanSw1.ports['fa0/24'] = { ...nativeVlanSw1.ports['fa0/24'], mode: 'trunk', nativeVlan: 99, allowedVlans: [99], status: 'connected' };
  const nativeVlanSw2 = createInitialState('00:1A:2B:3C:4D:65');
  nativeVlanSw2.hostname = 'SW2';
  nativeVlanSw2.vlans[99] = { id: 99, name: 'NativeVLAN', status: 'active', ports: ['FA0/1', 'FA0/24'] };
  nativeVlanSw2.ports['fa0/1'] = { ...nativeVlanSw2.ports['fa0/1'], vlan: 99, mode: 'access', status: 'connected' };
  nativeVlanSw2.ports['fa0/24'] = { ...nativeVlanSw2.ports['fa0/24'], mode: 'trunk', nativeVlan: 99, allowedVlans: [99], status: 'connected' };
  const nativeVlanNotes: CanvasNote[] = [
    {
      id: 'native-vlan-note',
      text: isTr
        ? 'Amaç: Trunk bağlantısında native VLAN yapılandırarak etiketsiz trafiğin belirli bir VLAN üzerinden geçmesini sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Switch ekle (SW1, SW2)\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)\n   - SW1 Fa0/24 -> SW2 Fa0/24 (Crossover kablo)\n\n2) SW1 KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n3) SW2 KONFİGÜRASYONU:\n   - SW2 terminaline gir: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99\n   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99\n\n5) TEST:\n   - show interfaces trunk (trunk ve native VLAN\'ı gör)\n   - PC-1 ping 192.168.99.11 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Fa0/1 (Straight cable)\n   - Connect SW1 Fa0/24 -> SW2 Fa0/24 (Crossover cable)\n\n2) SW1 CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n3) SW2 CONFIGURATION:\n   - Enter SW2 terminal: enable, conf t\n   - vlan 99\n     name NativeVLAN\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 99\n   - exit\n   - interface fa0/24\n     switchport mode trunk\n     switchport trunk native vlan 99\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99\n   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99\n\n5) TEST:\n   - show interfaces trunk (view trunk and native VLAN)\n   - PC-1 ping 192.168.99.11 (PC-2)',
      x: 500,
      y: 80,
      width: 480,
      height: 320,
      color: '#a78bfa',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // Example 4: ROAS (conceptual)
  const roasDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20),
    createSwitchDevice('switch-1', 'SW1', 260, 190),
    createRouterDevice('router-1', 'R1', 520, 190)
  ];
  const roasConnections: CanvasConnection[] = [];
  connectPorts(roasDevices, roasConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(roasDevices, roasConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(roasDevices, roasConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');
  const roasSw = createInitialState();
  roasSw.hostname = 'SW1';
  roasSw.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  roasSw.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/2'] };
  roasSw.ports['fa0/1'] = { ...roasSw.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  roasSw.ports['fa0/2'] = { ...roasSw.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };
  roasSw.ports['gi0/1'] = { ...roasSw.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected' };
  const roasRouter = createInitialRouterState('00:50:00:00:00:05');
  roasRouter.hostname = 'R1';
  roasRouter.ports['gi0/0'] = { ...roasRouter.ports['gi0/0'], status: 'connected', shutdown: false };
  roasRouter.ports['gi0/0.10'] = {
    ...roasRouter.ports['gi0/0'],
    id: 'gi0/0.10',
    vlan: 10,
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    isSubinterface: true,
    parentInterface: 'gi0/0'
  };
  roasRouter.ports['gi0/0.20'] = {
    ...roasRouter.ports['gi0/0'],
    id: 'gi0/0.20',
    vlan: 20,
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0',
    isSubinterface: true,
    parentInterface: 'gi0/0'
  };

  const roasNotes: CanvasNote[] = [
    {
      id: 'roas-note',
      text: isTr
        ? 'Amaç: Router-on-a-Stick kullanarak tek bir router interface\'i üzerinden farklı VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet Router (R1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)\n   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n\n3) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - interface gi0/0\n     no shutdown\n   - exit\n   - interface gi0/0.10\n     encapsulation dot1q 10\n     ip address 192.168.10.1 255.255.255.0\n   - exit\n   - interface gi0/0.20\n     encapsulation dot1q 20\n     ip address 192.168.20.1 255.255.255.0\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, Gateway 192.168.20.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2) - Başarılı (inter-VLAN routing)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 Router (R1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/2 (Straight cable)\n   - Connect SW1 Gi0/1 -> R1 Gi0/0 (Crossover cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n\n3) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - interface gi0/0\n     no shutdown\n   - exit\n   - interface gi0/0.10\n     encapsulation dot1q 10\n     ip address 192.168.10.1 255.255.255.0\n   - exit\n   - interface gi0/0.20\n     encapsulation dot1q 20\n     ip address 192.168.20.1 255.255.255.0\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, Gateway 192.168.20.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2) - Success (inter-VLAN routing)',
      x: 600,
      y: 40,
      width: 500,
      height: 340,
      color: '#38bdf8',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // Example 5: Legacy Inter-VLAN Routing (2 separate router interfaces, not trunk)
  const legacyRoutingDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.0.2', 10, '192.168.0.1'),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.1.2', 20, '192.168.1.1'),
    createSwitchDevice('switch-1', 'SW1', 260, 190),
    createRouterDevice('router-1', 'R1', 520, 190)
  ];
  const legacyRoutingConnections: CanvasConnection[] = [];
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/12');
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'router-1', 'gi0/1', 'switch-1', 'fa0/11', 'crossover');
  connectPorts(legacyRoutingDevices, legacyRoutingConnections, 'router-1', 'gi0/0', 'switch-1', 'fa0/1', 'crossover');
  const legacyRoutingSw = createInitialState();
  legacyRoutingSw.hostname = 'SW1';
  legacyRoutingSw.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/2', 'FA0/11'] };
  legacyRoutingSw.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/12', 'FA0/1'] };
  legacyRoutingSw.ports['fa0/2'] = { ...legacyRoutingSw.ports['fa0/2'], vlan: 10, mode: 'access', status: 'connected' };
  legacyRoutingSw.ports['fa0/12'] = { ...legacyRoutingSw.ports['fa0/12'], vlan: 20, mode: 'access', status: 'connected' };
  legacyRoutingSw.ports['fa0/11'] = { ...legacyRoutingSw.ports['fa0/11'], vlan: 10, mode: 'access', status: 'connected' };
  legacyRoutingSw.ports['fa0/1'] = { ...legacyRoutingSw.ports['fa0/1'], vlan: 20, mode: 'access', status: 'connected' };
  const legacyRoutingRouter = createInitialRouterState('00:50:00:00:00:06');
  legacyRoutingRouter.hostname = 'R1';
  legacyRoutingRouter.ipRouting = true;
  legacyRoutingRouter.ports['gi0/1'] = { ...legacyRoutingRouter.ports['gi0/1'], ipAddress: '192.168.0.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  legacyRoutingRouter.ports['gi0/0'] = { ...legacyRoutingRouter.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  const legacyRoutingNotes: CanvasNote[] = [
    {
      id: 'legacy-routing-note',
      text: isTr
        ? 'Amaç: Router üzerinde ayrı fiziksel interface\'ler kullanarak VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet Router (R1) ekle\n   - 2 adet PC ekle (PC-1, PC-2)\n   - PC-1 Eth0 -> SW1 Fa0/2 (Straight kablo)\n   - PC-2 Eth0 -> SW1 Fa0/12 (Straight kablo)\n   - R1 Gi0/1 -> SW1 Fa0/11 (Crossover kablo)\n   - R1 Gi0/0 -> SW1 Fa0/1 (Crossover kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/12\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface fa0/11\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - interface gi0/1\n     ip address 192.168.0.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/0\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing (otomatik aktiftir)\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.0.2, Subnet 255.255.255.0, Gateway 192.168.0.1, VLAN 10\n   - PC-2: IP 192.168.1.2, Subnet 255.255.255.0, Gateway 192.168.1.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.1.2 (PC-2) - Başarılı (inter-VLAN routing)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 Router (R1)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/2 (Straight cable)\n   - Connect PC-2 Eth0 -> SW1 Fa0/12 (Straight cable)\n   - Connect R1 Gi0/1 -> SW1 Fa0/11 (Crossover cable)\n   - Connect R1 Gi0/0 -> SW1 Fa0/1 (Crossover cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/12\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface fa0/11\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - interface gi0/1\n     ip address 192.168.0.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/0\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing (auto-enabled)\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.0.2, Subnet 255.255.255.0, Gateway 192.168.0.1, VLAN 10\n   - PC-2: IP 192.168.1.2, Subnet 255.255.255.0, Gateway 192.168.1.1, VLAN 20\n\n5) TEST:\n   - PC-1 ping 192.168.1.2 (PC-2) - Success (inter-VLAN routing)',
      x: 600,
      y: 40,
      width: 500,
      height: 340,
      color: '#a855f7',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // Example 6: Port-security
  const psDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 180, '192.168.1.10', 1),
    createSwitchDevice('switch-1', 'SW1', 240, 180)
  ];
  // Set PC1 MAC to match the port security static MAC
  psDevices[0].macAddress = '00E0.F701.A124';
  const psConnections: CanvasConnection[] = [];
  connectPorts(psDevices, psConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/3');
  const psNotes: CanvasNote[] = [
    {
      id: 'ps-note-1',
      text: isTr
        ? 'Amaç: Switch port\'unda port-security yapılandırarak sadece izin verilen MAC adreslerinin bağlanmasına izin vermek.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Switch (SW1) ekle\n   - 1 adet PC (PC-1) ekle\n   - PC-1 Eth0 -> SW1 Fa0/3 (Straight kablo)\n\n2) SWITCH KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - interface fa0/3\n     switchport mode access\n     switchport port-security\n     switchport port-security maximum 1\n     switchport port-security violation shutdown\n     switchport port-security mac-address sticky\n   - exit\n\n3) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0\n   - PC-1 MAC adresi otomatik öğrenilir (sticky)\n\n4) DOĞRULAMA:\n   - show port-security interface fa0/3\n   - show port-security address\n\n5) TEST:\n   - PC-1\'den trafik gönder (ping)\n   - Farklı bir MAC adresi bağlanırsa port shutdown olur\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Switch (SW1)\n   - Add 1 PC (PC-1)\n   - Connect PC-1 Eth0 -> SW1 Fa0/3 (Straight cable)\n\n2) SWITCH CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - interface fa0/3\n     switchport mode access\n     switchport port-security\n     switchport port-security maximum 1\n     switchport port-security violation shutdown\n     switchport port-security mac-address sticky\n   - exit\n\n3) PC CONFIGURATION:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0\n   - PC-1 MAC address is automatically learned (sticky)\n\n4) VERIFICATION:\n   - show port-security interface fa0/3\n   - show port-security address\n\n5) TEST:\n   - Send traffic from PC-1 (ping)\n   - If a different MAC connects, the port will shutdown\n\n⚠️ Note: Refresh network (F5)',
      x: 400,
      y: 80,
      width: 480,
      height: 280,
      color: '#ef4444',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const psState = createInitialState();
  psState.hostname = 'SW1';
  psState.ports['fa0/3'] = {
    ...psState.ports['fa0/3'],
    status: 'connected',
    portSecurity: { enabled: true, maxAddresses: 1, violationAction: 'shutdown', sticky: true },
    staticMacs: ['00E0.F701.A124']
  };

  // Example 6: Inter-VLAN Routing (L3 Switch)
  const l3RoutingDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10, '192.168.10.1'),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20, '192.168.20.1'),
    createPcDevice('pc-3', 'PC-3', 40, 400, '192.168.30.10', 30, '192.168.30.1'),
    createPcDevice('pc-4', 'PC-4', 40, 540, '192.168.40.10', 40, '192.168.40.1'),
    createL3SwitchDevice('switch-1', 'L3SW1', 260, 330)
  ];
  const l3RoutingConnections: CanvasConnection[] = [];
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-1', 'eth0', 'switch-1', 'gi1/0/1');
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-2', 'eth0', 'switch-1', 'gi1/0/2');
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-3', 'eth0', 'switch-1', 'gi1/0/3');
  connectPorts(l3RoutingDevices, l3RoutingConnections, 'pc-4', 'eth0', 'switch-1', 'gi1/0/4');
  const l3RoutingNotes: CanvasNote[] = [
    {
      id: 'l3-routing-note',
      text: isTr
        ? 'Amaç: L3 Switch üzerinde SVI interface\'leri kullanarak farklı VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet L3 Switch (L3SW1) ekle\n   - 4 adet PC ekle (PC-1, PC-2, PC-3, PC-4)\n   - PC-1 Eth0 -> L3SW1 Gig1/0/1 (Straight kablo)\n   - PC-2 Eth0 -> L3SW1 Gig1/0/2 (Straight kablo)\n   - PC-3 Eth0 -> L3SW1 Gi1/0/3 (Straight kablo)\n   - PC-4 Eth0 -> L3SW1 Gi1/0/4 (Straight kablo)\n\n2) L3 SWITCH KONFİGÜRASYONU:\n   - L3SW1 terminaline gir: enable, conf t\n   - ip routing\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - vlan 30\n     name VLAN30\n   - exit\n   - vlan 40\n     name VLAN40\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 30\n     ip address 192.168.30.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 40\n     ip address 192.168.40.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi1/0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi1/0/3\n     switchport mode access\n     switchport access vlan 30\n   - exit\n   - interface gi1/0/4\n     switchport mode access\n     switchport access vlan 40\n   - exit\n\n3) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n   - PC-3: IP 192.168.30.10, GW 192.168.30.1, VLAN 30\n   - PC-4: IP 192.168.40.10, GW 192.168.40.1, VLAN 40\n\n4) TEST:\n   - show ip route (routing tablosunu gör)\n   - Tüm PC\'ler birbirine ping atabilir'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 L3 Switch (L3SW1)\n   - Add 4 PCs (PC-1, PC-2, PC-3, PC-4)\n   - Connect PC-1 Eth0 -> L3SW1 Gig1/0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> L3SW1 Gig1/0/2 (Straight cable)\n   - Connect PC-3 Eth0 -> L3SW1 Gi1/0/3 (Straight cable)\n   - Connect PC-4 Eth0 -> L3SW1 Gi1/0/4 (Straight cable)\n\n2) L3 SWITCH CONFIGURATION:\n   - Enter L3SW1 terminal: enable, conf t\n   - ip routing\n   - vlan 10\n     name VLAN10\n   - exit\n   - vlan 20\n     name VLAN20\n   - exit\n   - vlan 30\n     name VLAN30\n   - exit\n   - vlan 40\n     name VLAN40\n   - exit\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 30\n     ip address 192.168.30.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 40\n     ip address 192.168.40.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi1/0/2\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi1/0/3\n     switchport mode access\n     switchport access vlan 30\n   - exit\n   - interface gi1/0/4\n     switchport mode access\n     switchport access vlan 40\n   - exit\n\n3) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n   - PC-3: IP 192.168.30.10, GW 192.168.30.1, VLAN 30\n   - PC-4: IP 192.168.40.10, GW 192.168.40.1, VLAN 40\n\n4) TEST:\n   - show ip route (view routing table)\n   - All PCs can ping each other',
              x: 600,
      y: 40,
      width: 500,
      height: 400,
      color: '#22c55e',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const l3RoutingState = createInitialState(undefined, 'WS-C3650-24PS');
  l3RoutingState.hostname = 'L3SW1';
  l3RoutingState.ipRouting = true;
  l3RoutingState.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['GI1/0/1'] };
  l3RoutingState.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['GI1/0/2'] };
  l3RoutingState.vlans[30] = { id: 30, name: 'VLAN30', status: 'active', ports: ['GI1/0/3'] };
  l3RoutingState.vlans[40] = { id: 40, name: 'VLAN40', status: 'active', ports: ['GI1/0/4'] };
  l3RoutingState.ports['vlan1'] = { id: 'vlan1', name: '', status: 'connected', vlan: 1, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.1.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan10'] = { id: 'vlan10', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan20'] = { id: 'vlan20', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.20.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan30'] = { id: 'vlan30', name: '', status: 'connected', vlan: 30, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.30.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['vlan40'] = { id: 'vlan40', name: '', status: 'connected', vlan: 40, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet', ipAddress: '192.168.40.1', subnetMask: '255.255.255.0' };
  l3RoutingState.ports['gi1/0/1'] = { ...l3RoutingState.ports['gi1/0/1'], vlan: 10, mode: 'access', status: 'connected' };
  l3RoutingState.ports['gi1/0/2'] = { ...l3RoutingState.ports['gi1/0/2'], vlan: 20, mode: 'access', status: 'connected' };
  l3RoutingState.ports['gi1/0/3'] = { ...l3RoutingState.ports['gi1/0/3'], vlan: 30, mode: 'access', status: 'connected' };
  l3RoutingState.ports['gi1/0/4'] = { ...l3RoutingState.ports['gi1/0/4'], vlan: 40, mode: 'access', status: 'connected' };

  // Example 7: Static Routing
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
      color: '#3b82f6',
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

  // Example 8: EtherChannel
  const etherChannelDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.10.11', 10),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createSwitchDevice('switch-2', 'SW2', 440, 190)
  ];
  const etherChannelConnections: CanvasConnection[] = [];
  connectPorts(etherChannelDevices, etherChannelConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(etherChannelDevices, etherChannelConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  // EtherChannel bundles (gi0/1 + gi0/2)
  connectPorts(etherChannelDevices, etherChannelConnections, 'switch-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  connectPorts(etherChannelDevices, etherChannelConnections, 'switch-1', 'gi0/2', 'switch-2', 'gi0/2', 'crossover');
  const etherChannelNotes: CanvasNote[] = [
    {
      id: 'etherchannel-note',
      text: isTr
        ? 'Amaç: İki switch arasında EtherChannel (LACP) kullanarak bant genişliğini artırmak ve redundancy sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Switch (SW1, SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)\n   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)\n   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)\n\n2) SW1 KONFİGÜRASYONU:\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n3) SW2 KONFİGÜRASYONU:\n   - SW2 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show etherchannel summary (EtherChannel durumunu gör)\n   - show spanning-tree (STP durumunu kontrol et)\n   - PC-1 ping 192.168.10.11 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Fa0/1 (Straight cable)\n   - Connect SW1 Gi0/1 -> SW2 Gi0/1 (Crossover cable)\n   - Connect SW1 Gi0/2 -> SW2 Gi0/2 (Crossover cable)\n\n2) SW1 CONFIGURATION:\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n3) SW2 CONFIGURATION:\n   - Enter SW2 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     channel-group 1 mode active\n   - exit\n   - interface port-channel 1\n     switchport mode trunk\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show etherchannel summary (view EtherChannel status)\n   - show spanning-tree (check STP status)\n   - PC-1 ping 192.168.10.11 (PC-2)',
      x: 600,
      y: 40,
      width: 500,
      height: 360,
      color: 'var(--color-warning-400)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const etherSw1 = createInitialState('00:1A:2B:3C:4D:63');
  etherSw1.hostname = 'SW1';
  etherSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  etherSw1.ports['fa0/1'] = { ...etherSw1.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  // EtherChannel ports bundled (LACP)
  etherSw1.ports['gi0/1'] = { ...etherSw1.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };
  etherSw1.ports['gi0/2'] = { ...etherSw1.ports['gi0/2'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };

  const etherSw2 = createInitialState('00:1A:2B:3C:4D:64');
  etherSw2.hostname = 'SW2';
  etherSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  etherSw2.ports['fa0/1'] = { ...etherSw2.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  // EtherChannel ports bundled
  etherSw2.ports['gi0/1'] = { ...etherSw2.ports['gi0/1'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };
  etherSw2.ports['gi0/2'] = { ...etherSw2.ports['gi0/2'], mode: 'trunk', allowedVlans: 'all', status: 'connected', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp' };

  // Example 9: STP Redundant Links
  const stpDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.10.11', 10),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createSwitchDevice('switch-2', 'SW2', 440, 190)
  ];
  const stpConnections: CanvasConnection[] = [];
  connectPorts(stpDevices, stpConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(stpDevices, stpConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(stpDevices, stpConnections, 'switch-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  connectPorts(stpDevices, stpConnections, 'switch-1', 'gi0/2', 'switch-2', 'gi0/2', 'crossover');
  const stpNotes: CanvasNote[] = [
    {
      id: 'stp-note',
      text: isTr
        ? 'Amaç: STP kullanarak redundant link\'lerde loop önlemek ve path sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet Switch (SW1, SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)\n   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)\n   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)\n\n2) SW1 KONFİGÜRASYONU (ROOT BRIDGE):\n   - SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - spanning-tree vlan 10 priority 28672\n   - exit\n\n3) SW2 KONFİGÜRASYONU:\n   - SW2 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show spanning-tree (STP durumunu gör)\n   - SW1 Gi0/2 bloke olmalı (BLK)\n   - Gi0/1 kablo kesilirse Gi0/2 otomatik aktif olur\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 Switches (SW1, SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> SW2 Fa0/1 (Straight cable)\n   - Connect SW1 Gi0/1 -> SW2 Gi0/1 (Crossover cable)\n   - Connect SW1 Gi0/2 -> SW2 Gi0/2 (Crossover cable)\n\n2) SW1 CONFIGURATION (ROOT BRIDGE):\n   - Enter SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - spanning-tree vlan 10 priority 28672\n   - exit\n\n3) SW2 CONFIGURATION:\n   - Enter SW2 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi0/1-2\n     switchport mode trunk\n   - exit\n   - spanning-tree mode rapid-pvst\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10\n   - PC-2: IP 192.168.10.11, Subnet 255.255.255.0, VLAN 10\n\n5) TEST:\n   - show spanning-tree (view STP status)\n   - SW1 Gi0/2 should be blocked (BLK)\n   - If Gi0/1 fails, Gi0/2 automatically becomes active\n\n⚠️ Note: Refresh Network (F5)',
      x: 600,
      y: 40,
      width: 500,
      height: 360,
      color: '#f59e0b',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const stpSw1 = createInitialState('00:1A:2B:3C:4D:65');
  stpSw1.hostname = 'SW1';
  stpSw1.spanningTreeMode = 'rapid-pvst';
  stpSw1.spanningTreePriority = 28672; // Lower priority = Root Bridge
  stpSw1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  stpSw1.ports['fa0/1'] = {
    ...stpSw1.ports['fa0/1'],
    vlan: 10,
    mode: 'access',
    status: 'connected',
    spanningTree: { role: 'root', state: 'forwarding' }
  };
  stpSw1.ports['gi0/1'] = {
    ...stpSw1.ports['gi0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'designated', state: 'forwarding' }
  };
  stpSw1.ports['gi0/2'] = {
    ...stpSw1.ports['gi0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'alternate', state: 'blocking' } // Blocked port
  };

  const stpSw2 = createInitialState('00:1A:2B:3C:4D:66');
  stpSw2.hostname = 'SW2';
  stpSw2.spanningTreeMode = 'rapid-pvst';
  stpSw2.spanningTreePriority = 32768; // Default priority
  stpSw2.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  stpSw2.ports['fa0/1'] = {
    ...stpSw2.ports['fa0/1'],
    vlan: 10,
    mode: 'access',
    status: 'connected',
    spanningTree: { role: 'designated', state: 'forwarding' }
  };
  stpSw2.ports['gi0/1'] = {
    ...stpSw2.ports['gi0/1'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'root', state: 'forwarding' } // Root Port
  };
  stpSw2.ports['gi0/2'] = {
    ...stpSw2.ports['gi0/2'],
    mode: 'trunk',
    allowedVlans: 'all',
    status: 'connected',
    spanningTree: { role: 'alternate', state: 'blocking' } // Blocked port
  };

  // Example 10: STP Triangle Topology (3 switches)
  const stpTriangleDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.1.10', 1),
    createPcDevice('pc-2', 'PC-2', 40, 400, '192.168.1.11', 1),
    createSwitchDevice('switch-1', 'SW1', 240, 190),
    createSwitchDevice('switch-2', 'SW2', 440, 190),
    createSwitchDevice('switch-3', 'SW3', 340, 350)
  ];
  const stpTriangleConnections: CanvasConnection[] = [];
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/24');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/24');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'switch-1', 'fa0/1', 'switch-3', 'fa0/1', 'crossover');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'switch-1', 'fa0/2', 'switch-2', 'fa0/1', 'crossover');
  connectPorts(stpTriangleDevices, stpTriangleConnections, 'switch-2', 'fa0/2', 'switch-3', 'fa0/2', 'crossover');
  const stpTriangleNotes: CanvasNote[] = [
    {
      id: 'stp-triangle-note',
      text: isTr
        ? 'Amaç: Üç switch arasında triangle topolojide STP kullanarak loop önlemek ve path sağlamak.\n\n🔄 STP Triangle Topology (3 Switch):\n\nSW1, SW2, SW3 üçgen topolojide bağlı.\n\nÜçgen bağlantı:\n- SW1 Fa0/1 ↔ SW3 Fa0/1: Altn BLK\n- SW1 Fa0/2 ↔ SW2 Fa0/1: Desg FWD\n- SW2 Fa0/2 ↔ SW3 Fa0/2: Desg FWD\n\nGörevler:\n1) show spanning-tree ile STP durumunu kontrol et\n2) Bloke port (SW1 Fa0/1)\n3) SW1 Fa0/1 kablo kesilirse otomatik aktif olur\n\n⚠️ Not: Ağı Yenile (F5)'
        : '🔄 STP Triangle Topology (3 Switches):\n\nSW1, SW2, SW3 connected in triangle topology.\n\nTriangle connections:\n- SW1 Fa0/1 ↔ SW3 Fa0/1: Altn BLK\n- SW1 Fa0/2 ↔ SW2 Fa0/1: Desg FWD\n- SW2 Fa0/2 ↔ SW3 Fa0/2: Desg FWD\n\nTasks:\n1) Verify STP state with show spanning-tree\n2) Blocked port (SW1 Fa0/1) \n3) If SW1 Fa0/1 fails, it automatically becomes active\n\n⚠️ Note: Refresh Network (F5)',
      x: 600,
      y: 40,
      width: 500,
      height: 260,
      color: 'var(--color-warning-400)',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const stpTriangleSw1 = createInitialState('00-1a-2b-3c-4d-5e');
  stpTriangleSw1.hostname = 'SW1';
  stpTriangleSw1.spanningTreeMode = 'rapid-pvst';
  stpTriangleSw1.spanningTreePriority = 32768; // Default priority
  stpTriangleSw1.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/24', 'FA0/1', 'FA0/2'] };
  stpTriangleSw1.ports['fa0/24'] = {
    ...stpTriangleSw1.ports['fa0/24'],
    vlan: 1,
    mode: 'access',
    status: 'connected'
  };
  stpTriangleSw1.ports['fa0/1'] = {
    ...stpTriangleSw1.ports['fa0/1'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  stpTriangleSw1.ports['fa0/2'] = {
    ...stpTriangleSw1.ports['fa0/2'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };

  const stpTriangleSw2 = createInitialState('00:1A:2B:3C:4D:5F');
  stpTriangleSw2.hostname = 'SW2';
  stpTriangleSw2.spanningTreeMode = 'rapid-pvst';
  stpTriangleSw2.spanningTreePriority = 28672; // Lower priority = Root Bridge
  stpTriangleSw2.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/24', 'FA0/1', 'FA0/2'] };
  stpTriangleSw2.ports['fa0/24'] = {
    ...stpTriangleSw2.ports['fa0/24'],
    vlan: 1,
    mode: 'access',
    status: 'connected'
  };
  stpTriangleSw2.ports['fa0/1'] = {
    ...stpTriangleSw2.ports['fa0/1'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  stpTriangleSw2.ports['fa0/2'] = {
    ...stpTriangleSw2.ports['fa0/2'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };

  const stpTriangleSw3 = createInitialState('00:1A:2B:3C:4D:60');
  stpTriangleSw3.hostname = 'SW3';
  stpTriangleSw3.spanningTreeMode = 'rapid-pvst';
  stpTriangleSw3.spanningTreePriority = 32768; // Default priority
  stpTriangleSw3.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/1', 'FA0/2'] };
  stpTriangleSw3.ports['fa0/1'] = {
    ...stpTriangleSw3.ports['fa0/1'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  stpTriangleSw3.ports['fa0/2'] = {
    ...stpTriangleSw3.ports['fa0/2'],
    mode: 'trunk',
    allowedVlans: [1],
    status: 'connected'
  };
  // STP 3-Switch PVST Example (Per-VLAN Spanning Tree)
  const stpPvstDevices = [
    createL3SwitchDevice('sw1', 'SW1', 300, 200),
    createL3SwitchDevice('sw2', 'SW2', 600, 100),
    createL3SwitchDevice('sw3', 'SW3', 600, 300),
    // SW1 PCs (left side)
    createPcDevice('pc1-vlan1', 'PC1-VLAN1', 80, 180, '192.168.1.10', 1),
    createPcDevice('pc1-vlan10', 'PC1-VLAN10', 80, 220, '192.168.10.10', 10),
    createPcDevice('pc1-vlan20', 'PC1-VLAN20', 80, 260, '192.168.20.10', 20),
    // SW2 PCs (right side)
    createPcDevice('pc2-vlan1', 'PC2-VLAN1', 750, 80, '192.168.1.20', 1),
    createPcDevice('pc2-vlan10', 'PC2-VLAN10', 820, 80, '192.168.10.20', 10),
    createPcDevice('pc2-vlan20', 'PC2-VLAN20', 890, 80, '192.168.20.20', 20),
    // SW3 PCs (right side)
    createPcDevice('pc3-vlan1', 'PC3-VLAN1', 750, 320, '192.168.1.30', 1),
    createPcDevice('pc3-vlan10', 'PC3-VLAN10', 820, 320, '192.168.10.30', 10),
    createPcDevice('pc3-vlan20', 'PC3-VLAN20', 890, 320, '192.168.20.30', 20)
  ];

  const stpPvstConnections: CanvasConnection[] = [];
  // Switch-to-switch trunk connections
  connectPorts(stpPvstDevices, stpPvstConnections, 'sw1', 'gi1/0/1', 'sw2', 'gi1/0/1');
  connectPorts(stpPvstDevices, stpPvstConnections, 'sw1', 'gi1/0/2', 'sw3', 'gi1/0/1');
  connectPorts(stpPvstDevices, stpPvstConnections, 'sw2', 'gi1/0/2', 'sw3', 'gi1/0/2');
  // SW1 PC connections
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc1-vlan1', 'eth0', 'sw1', 'gi1/0/3');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc1-vlan10', 'eth0', 'sw1', 'gi1/0/4');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc1-vlan20', 'eth0', 'sw1', 'gi1/0/5');
  // SW2 PC connections
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc2-vlan1', 'eth0', 'sw2', 'gi1/0/3');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc2-vlan10', 'eth0', 'sw2', 'gi1/0/4');
  connectPorts(stpPvstDevices, stpPvstConnections, 'pc2-vlan20', 'eth0', 'sw2', 'gi1/0/5');
  // SW3 PC connections
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
      color: '#e3f2fd',
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
      color: '#fff3e0',
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
      color: '#f3e5f5',
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
      color: '#e8f5e9',
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
  stpTriangleSw3.spanningTreePriority = 32768; // Default priority
  stpTriangleSw3.vlans[1] = { id: 1, name: 'VLAN1', status: 'active', ports: ['FA0/1', 'FA0/2'] };
  stpTriangleSw3.ports['fa0/1'] = {
    ...stpTriangleSw3.ports['fa0/1'],
    mode: 'access',
    vlan: 1,
    status: 'connected'
  };
  stpTriangleSw3.ports['fa0/2'] = {
    ...stpTriangleSw3.ports['fa0/2'],
    mode: 'access',
    vlan: 1,
    status: 'connected'
  };

  // Example 11: Campus Network (Simplified)
  const campusDevices = [
    createPcDevice('pc-1', 'PC-1', 40, 120, '192.168.10.10', 10),
    createPcDevice('pc-2', 'PC-2', 40, 260, '192.168.20.10', 20),
    createSwitchDevice('switch-1', 'ACC-SW1', 240, 190),
    createRouterDevice('router-1', 'CORE-R1', 440, 190),
    createSwitchDevice('switch-2', 'ACC-SW2', 640, 190)
  ];
  const campusConnections: CanvasConnection[] = [];
  connectPorts(campusDevices, campusConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(campusDevices, campusConnections, 'pc-2', 'eth0', 'switch-2', 'fa0/1');
  connectPorts(campusDevices, campusConnections, 'switch-1', 'gi0/1', 'router-1', 'gi0/0', 'crossover');
  connectPorts(campusDevices, campusConnections, 'router-1', 'gi0/1', 'switch-2', 'gi0/1', 'crossover');
  const campusNotes: CanvasNote[] = [
    {
      id: 'campus-note',
      text: isTr
        ? 'Amaç: Campus ağ topolojisinde core router ve access switch\'ler kullanarak VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Router (CORE-R1) ekle\n   - 2 adet Switch (ACC-SW1, ACC-SW2) ekle\n   - 2 adet PC (PC-1, PC-2) ekle\n   - PC-1 Eth0 -> ACC-SW1 Fa0/1 (Straight kablo)\n   - PC-2 Eth0 -> ACC-SW2 Fa0/1 (Straight kablo)\n   - ACC-SW1 Gi0/1 -> CORE-R1 Gi0/0 (Crossover kablo)\n   - ACC-SW2 Gi0/1 -> CORE-R1 Gi0/1 (Crossover kablo)\n\n2) CORE-R1 KONFİGÜRASYONU:\n   - CORE-R1 terminaline gir: enable, conf t\n   - interface gi0/0\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/1\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing\n   - exit\n\n3) ACC-SW1 KONFİGÜRASYONU:\n   - ACC-SW1 terminaline gir: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n4) ACC-SW2 KONFİGÜRASYONU:\n   - ACC-SW2 terminaline gir: enable, conf t\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n5) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n\n6) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Router (CORE-R1)\n   - Add 2 Switches (ACC-SW1, ACC-SW2)\n   - Add 2 PCs (PC-1, PC-2)\n   - Connect PC-1 Eth0 -> ACC-SW1 Fa0/1 (Straight cable)\n   - Connect PC-2 Eth0 -> ACC-SW2 Fa0/1 (Straight cable)\n   - Connect ACC-SW1 Gi0/1 -> CORE-R1 Gi0/0 (Crossover cable)\n   - Connect ACC-SW2 Gi0/1 -> CORE-R1 Gi0/1 (Crossover cable)\n\n2) CORE-R1 CONFIGURATION:\n   - Enter CORE-R1 terminal: enable, conf t\n   - interface gi0/0\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi0/1\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip routing\n   - exit\n\n3) ACC-SW1 CONFIGURATION:\n   - Enter ACC-SW1 terminal: enable, conf t\n   - vlan 10\n     name VLAN10\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n4) ACC-SW2 CONFIGURATION:\n   - Enter ACC-SW2 terminal: enable, conf t\n   - vlan 20\n     name VLAN20\n   - exit\n   - interface fa0/1\n     switchport mode access\n     switchport access vlan 20\n   - exit\n   - interface gi0/1\n     switchport mode access\n   - exit\n\n5) PC CONFIGURATION:\n   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10\n   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20\n\n6) TEST:\n   - PC-1 ping 192.168.20.10 (PC-2)',
      x: 600,
      y: 40,
      width: 500,
      height: 380,
      color: '#8b5cf6',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const campusAcc1 = createInitialState('00:1A:2B:3C:4D:69');
  campusAcc1.hostname = 'ACC-SW1';
  campusAcc1.vlans[10] = { id: 10, name: 'VLAN10', status: 'active', ports: ['FA0/1'] };
  campusAcc1.ports['fa0/1'] = { ...campusAcc1.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  campusAcc1.ports['gi0/1'] = { ...campusAcc1.ports['gi0/1'], mode: 'access', vlan: 10, status: 'connected' };

  const campusCore = createInitialRouterState('00:50:00:00:00:03');
  campusCore.hostname = 'CORE-R1';
  campusCore.ipRouting = true;
  campusCore.ports['gi0/0'] = { ...campusCore.ports['gi0/0'], ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  campusCore.ports['gi0/1'] = { ...campusCore.ports['gi0/1'], ipAddress: '192.168.20.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  campusCore.staticRoutes = [
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.10.254', metric: 1, type: 'static' },
    { destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '192.168.20.254', metric: 1, type: 'static' }
  ];

  const campusAcc2 = createInitialState('00:1A:2B:3C:4D:6A');
  campusAcc2.hostname = 'ACC-SW2';
  campusAcc2.vlans[20] = { id: 20, name: 'VLAN20', status: 'active', ports: ['FA0/1'] };
  campusAcc2.ports['fa0/1'] = { ...campusAcc2.ports['fa0/1'], vlan: 20, mode: 'access', status: 'connected' };
  campusAcc2.ports['gi0/1'] = { ...campusAcc2.ports['gi0/1'], mode: 'access', vlan: 20, status: 'connected' };

  // Example 12: Router SSH Lab (Basic) - 1 PC, 1 Router
  const routerSshDevices = [
    createPcDevice('pc-1', 'PC-1', 80, 220, '192.168.1.10', 1),
    createRouterDevice('router-1', 'R1', 420, 220),
  ];
  const routerSshConnections: CanvasConnection[] = [];
  connectPorts(routerSshDevices, routerSshConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0', 'crossover');
  const routerSshNotes: CanvasNote[] = [
    {
      id: 'router-ssh-note',
      text: isTr
        ? 'Amaç: Router üzerinde SSH yapılandırarak güvenli uzaktan yönetim erişimi sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 1 adet Router (R1) ekle\n   - 1 adet PC (PC-1) ekle\n   - PC-1 Eth0 -> R1 Gi0/0 (Straight kablo)\n\n2) ROUTER KONFİGÜRASYONU:\n   - R1 terminaline gir: enable, conf t\n   - hostname R1\n   - ip domain-name lab.local\n   - crypto key generate rsa modulus 1024\n   - ip ssh version 2\n   - username admin privilege 15 secret 1234\n   - enable secret 123\n   - line vty 0 4\n     login local\n     transport input ssh\n   - exit\n\n3) INTERFACE AYARLARI:\n   - interface gi0/0\n     ip address 192.168.1.150 255.255.255.0\n     no shutdown\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.150\n\n5) TEST:\n   - PC-1 CMD: ssh admin@192.168.1.150\n   - Şifre: 1234\n   - R1> show ssh (SSH bağlantılarını gör)\n   - R1> show ip ssh (SSH durumunu kontrol et)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 1 Router (R1)\n   - Add 1 PC (PC-1)\n   - Connect PC-1 Eth0 -> R1 Gi0/0 (Straight cable)\n\n2) ROUTER CONFIGURATION:\n   - Enter R1 terminal: enable, conf t\n   - hostname R1\n   - ip domain-name lab.local\n   - crypto key generate rsa modulus 1024\n   - ip ssh version 2\n   - username admin privilege 15 secret 1234\n   - enable secret 123\n   - line vty 0 4\n     login local\n     transport input ssh\n   - exit\n\n3) INTERFACE SETTINGS:\n   - interface gi0/0\n     ip address 192.168.1.150 255.255.255.0\n     no shutdown\n   - exit\n\n4) PC CONFIGURATION:\n   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.150\n\n5) TEST:\n   - PC-1 CMD: ssh admin@192.168.1.150\n   - Password: 1234\n   - R1> show ssh (view SSH connections)\n   - R1> show ip ssh (check SSH status)',
      x: 580,
      y: 80,
      width: 480,
      height: 300,
      color: '#22c55e',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];
  const routerSshR1 = createInitialRouterState('00:50:00:00:00:04');
  routerSshR1.hostname = 'R1';
  routerSshR1.domainName = 'lab.local';
  routerSshR1.sshVersion = 2;
  routerSshR1.ports['gi0/0'] = {
    ...routerSshR1.ports['gi0/0'],
    ipAddress: '192.168.1.150',
    subnetMask: '255.255.255.0',
    status: 'connected',
    shutdown: false
  };
  routerSshR1.security = {
    ...routerSshR1.security,
    users: [
      { username: 'admin', password: '1234', privilege: 15 },
      { username: 'user', password: '1234', privilege: 15 }
    ],
    enableSecret: '123',
    vtyLines: {
      ...routerSshR1.security.vtyLines,
      login: true,
      loginLocal: true,
      transportInput: ['ssh']
    }
  };
  routerSshR1.runningConfig = [
    '!',
    'hostname R1',
    '!',
    'ip domain-name lab.local',
    'crypto key generate rsa modulus 1024',
    'ip ssh version 2',
    '!',
    'username admin privilege 15 secret 1234',
    'username user privilege 15 secret 1234',
    'enable secret 123',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 192.168.1.150 255.255.255.0',
    ' no shutdown',
    '!',
    'line vty 0 4',
    ' login local',
    ' transport input ssh',
    '!',
    'end'
  ];
  const routerSshData: ProjectData = {
    ...baseProjectData(routerSshDevices, routerSshConnections, routerSshNotes, [
      { id: 'router-1', state: routerSshR1 }
    ]),
    activeDeviceId: 'router-1',
    activeDeviceType: 'router',
    cableInfo: {
      connected: true,
      cableType: 'straight',
      sourceDevice: 'pc',
      targetDevice: 'router'
    }
  };

  // Example: 2 L3 Switches with VLANs 10 and 20 (AG1/AG2)
  const l3Switch2VlanDevices = [
    // Switch2 (Left) - Multilayer Switch2
    createL3SwitchDevice('switch2', 'Switch2', 300, 200),
    // Switch2 PCs
    createPcDevice('pc4', 'PC4', 50, 100, '192.168.10.10', 10, '192.168.10.1'),
    createPcDevice('pc5', 'PC5', 50, 180, '192.168.10.15', 10, '192.168.10.1'),
    createPcDevice('pc6', 'PC6', 50, 260, '192.168.20.10', 20, '192.168.20.1'),
    createPcDevice('pc7', 'PC7', 50, 340, '192.168.20.15', 20, '192.168.20.1'),
    // Switch4 (Right) - Multilayer Switch4
    createL3SwitchDevice('switch4', 'Switch4', 700, 200),
    // Switch4 PCs
    createPcDevice('pc8', 'PC8', 950, 100, '192.168.10.20', 10, '192.168.10.1'),
    createPcDevice('pc9', 'PC9', 950, 180, '192.168.10.30', 10, '192.168.10.1'),
    createPcDevice('pc10', 'PC10', 950, 260, '192.168.20.20', 20, '192.168.20.1'),
    createPcDevice('pc11', 'PC11', 950, 340, '192.168.20.30', 20, '192.168.20.1')
  ];

  const l3Switch2VlanConnections: CanvasConnection[] = [];
  // Trunk connection between Switch2 and Switch4
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'switch2', 'gi1/0/5', 'switch4', 'gi1/0/5', 'crossover');
  // Switch2 PC connections
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc4', 'eth0', 'switch2', 'gi1/0/1');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc5', 'eth0', 'switch2', 'gi1/0/2');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc6', 'eth0', 'switch2', 'gi1/0/3');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc7', 'eth0', 'switch2', 'gi1/0/4');
  // Switch4 PC connections
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc8', 'eth0', 'switch4', 'gi1/0/1');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc9', 'eth0', 'switch4', 'gi1/0/2');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc10', 'eth0', 'switch4', 'gi1/0/3');
  connectPorts(l3Switch2VlanDevices, l3Switch2VlanConnections, 'pc11', 'eth0', 'switch4', 'gi1/0/4');

  const l3Switch2VlanNotes: CanvasNote[] = [
    {
      id: 'l3-switch2-vlan-note',
      text: isTr
        ? 'Amaç: İki L3 switch arasında trunk bağlantısı ile VLAN\'lar arası routing sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet L3 Switch (Switch2, Switch4) ekle\n   - 8 adet PC ekle (PC4-PC11)\n   - Switch2 Gi1/0/5 -> Switch4 Gi1/0/5 (Crossover kablo)\n   - PC4-PC5 -> Switch2 Gi1/0/1-2 (VLAN 10)\n   - PC6-PC7 -> Switch2 Gi1/0/3-4 (VLAN 20)\n   - PC8-PC9 -> Switch4 Gi1/0/1-2 (VLAN 10)\n   - PC10-PC11 -> Switch4 Gi1/0/3-4 (VLAN 20)\n\n2) SWITCH2 KONFİGÜRASYONU:\n   - Switch2 terminaline gir: enable, conf t\n   - vlan 10\n     name AG1\n   - exit\n   - vlan 20\n     name AG2\n   - exit\n   - ip routing\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/5\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n   - interface range gi1/0/1-2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi1/0/3-4\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) SWITCH4 KONFİGÜRASYONU:\n   - Switch4 terminaline gir: enable, conf t\n   - Aynı yapılandırma Switch2 ile aynı\n\n4) PC KONFİGÜRASYONU:\n   - VLAN 10 PC\'ler: IP 192.168.10.x, GW 192.168.10.1\n   - VLAN 20 PC\'ler: IP 192.168.20.x, GW 192.168.20.1\n\n5) TEST:\n   - Tüm PC\'ler birbirine ping atabilir'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 L3 Switches (Switch2, Switch4)\n   - Add 8 PCs (PC4-PC11)\n   - Connect Switch2 Gi1/0/5 -> Switch4 Gi1/0/5 (Crossover cable)\n   - Connect PC4-PC5 -> Switch2 Gi1/0/1-2 (VLAN 10)\n   - Connect PC6-PC7 -> Switch2 Gi1/0/3-4 (VLAN 20)\n   - Connect PC8-PC9 -> Switch4 Gi1/0/1-2 (VLAN 10)\n   - Connect PC10-PC11 -> Switch4 Gi1/0/3-4 (VLAN 20)\n\n2) SWITCH2 CONFIGURATION:\n   - Enter Switch2 terminal: enable, conf t\n   - vlan 10\n     name AG1\n   - exit\n   - vlan 20\n     name AG2\n   - exit\n   - ip routing\n   - interface vlan 10\n     ip address 192.168.10.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface vlan 20\n     ip address 192.168.20.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/5\n     switchport trunk encapsulation dot1q\n     switchport mode trunk\n   - exit\n   - interface range gi1/0/1-2\n     switchport mode access\n     switchport access vlan 10\n   - exit\n   - interface range gi1/0/3-4\n     switchport mode access\n     switchport access vlan 20\n   - exit\n\n3) SWITCH4 CONFIGURATION:\n   - Enter Switch4 terminal: enable, conf t\n   - Same configuration as Switch2\n\n4) PC CONFIGURATION:\n   - VLAN 10 PCs: IP 192.168.10.x, GW 192.168.10.1\n   - VLAN 20 PCs: IP 192.168.20.x, GW 192.168.20.1\n\n5) TEST:\n   - All PCs can ping each other',
      x: 400,
      y: 400,
      width: 520,
      height: 380,
      color: '#8b5cf6',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // Configure Switch2 state
  const l3Switch2State = createInitialState('00:1A:2B:3C:4D:70', 'WS-C3650-24PS');
  l3Switch2State.hostname = 'Switch2';
  l3Switch2State.switchModel = 'WS-C3650-24PS';
  l3Switch2State.switchLayer = 'L3';
  l3Switch2State.ipRouting = true;
  l3Switch2State.vlans[10] = { id: 10, name: 'AG1', status: 'active', ports: ['GI1/0/1', 'GI1/0/2', 'GI1/0/5'] };
  l3Switch2State.vlans[20] = { id: 20, name: 'AG2', status: 'active', ports: ['GI1/0/3', 'GI1/0/4', 'GI1/0/5'] };
  l3Switch2State.ports['vlan10'] = {
    id: 'vlan10',
    name: 'VLAN10',
    status: 'connected',
    vlan: 10,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch2State.ports['vlan20'] = {
    id: 'vlan20',
    name: 'VLAN20',
    status: 'connected',
    vlan: 20,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch2State.ports['gi1/0/1'] = { id: 'gi1/0/1', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/2'] = { id: 'gi1/0/2', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/3'] = { id: 'gi1/0/3', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/4'] = { id: 'gi1/0/4', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.ports['gi1/0/5'] = { id: 'gi1/0/5', name: '', status: 'connected', vlan: 1, mode: 'trunk', allowedVlans: 'all', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch2State.runningConfig = [
    '!',
    'hostname Switch2',
    '!',
    'vlan 10',
    ' name AG1',
    '!',
    'vlan 20',
    ' name AG2',
    '!',
    'ip routing',
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
    ' switchport access vlan 10',
    ' switchport mode access',
    '!',
    'interface range gi1/0/3 - 4',
    ' switchport access vlan 20',
    ' switchport mode access',
    '!',
    'interface gi1/0/5',
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    ' switchport trunk allowed vlan all',
    '!',
    'end'
  ];

  // Configure Switch4 state
  const l3Switch4State = createInitialState('00:1A:2B:3C:4D:71', 'WS-C3650-24PS');
  l3Switch4State.hostname = 'Switch4';
  l3Switch4State.switchModel = 'WS-C3650-24PS';
  l3Switch4State.switchLayer = 'L3';
  l3Switch4State.ipRouting = true;
  l3Switch4State.vlans[10] = { id: 10, name: 'AG1', status: 'active', ports: ['GI1/0/1', 'GI1/0/2', 'GI1/0/5'] };
  l3Switch4State.vlans[20] = { id: 20, name: 'AG2', status: 'active', ports: ['GI1/0/3', 'GI1/0/4', 'GI1/0/5'] };
  l3Switch4State.ports['vlan10'] = {
    id: 'vlan10',
    name: 'VLAN10',
    status: 'connected',
    vlan: 10,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch4State.ports['vlan20'] = {
    id: 'vlan20',
    name: 'VLAN20',
    status: 'connected',
    vlan: 20,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0'
  };
  l3Switch4State.ports['gi1/0/1'] = { id: 'gi1/0/1', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/2'] = { id: 'gi1/0/2', name: '', status: 'connected', vlan: 10, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/3'] = { id: 'gi1/0/3', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/4'] = { id: 'gi1/0/4', name: '', status: 'connected', vlan: 20, mode: 'access', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.ports['gi1/0/5'] = { id: 'gi1/0/5', name: '', status: 'connected', vlan: 1, mode: 'trunk', allowedVlans: 'all', duplex: 'auto', speed: 'auto', shutdown: false, type: 'gigabitethernet' };
  l3Switch4State.runningConfig = [
    '!',
    'hostname Switch4',
    '!',
    'vlan 10',
    ' name AG1',
    '!',
    'vlan 20',
    ' name AG2',
    '!',
    'ip routing',
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
    ' switchport access vlan 10',
    ' switchport mode access',
    '!',
    'interface range gi1/0/3 - 4',
    ' switchport access vlan 20',
    ' switchport mode access',
    '!',
    'interface gi1/0/5',
    ' switchport trunk encapsulation dot1q',
    ' switchport mode trunk',
    ' switchport trunk allowed vlan all',
    '!',
    'end'
  ];

  // Üçüncü Katman Anahtarlama Cihazında Statik Yönlendirme
  // 2 Multilayer Switch + 1 Router + 2 L2 Switch + 2 PC
  const staticL3RoutingDevices = [
    // PC0 - Sol taraftaki PC
    createPcDevice('pc0', 'PC0', 50, 350, '192.168.1.10', 1, '192.168.1.1'),
    // Switch0 - Sol L2 switch
    createSwitchDevice('switch0', 'Switch0', 200, 350),
    // Multilayer Switch1 - Sol L3 switch
    createL3SwitchDevice('mlswitch1', 'MultilayerSwitch1', 350, 200),
    // Router3 - Ortadaki router
    createRouterDevice('router3', 'Router3', 550, 200),
    // Multilayer Switch2 - Sağ L3 switch
    createL3SwitchDevice('mlswitch2', 'MultilayerSwitch2', 750, 200),
    // Switch1 - Sağ L2 switch
    createSwitchDevice('switch1', 'Switch1', 900, 350),
    // PC4 - Sağ taraftaki PC
    createPcDevice('pc4', 'PC4', 1050, 350, '192.168.2.10', 1, '192.168.2.1')
  ];

  const staticL3RoutingConnections: CanvasConnection[] = [];
  // PC0 -> Switch0
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'pc0', 'eth0', 'switch0', 'fa0/1');
  // Switch0 -> MultilayerSwitch1 (Fa0/2)
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'switch0', 'fa0/2', 'mlswitch1', 'gi1/0/2');
  // MultilayerSwitch1 (Gi1/0/1) -> Router3 (Gi0/0)
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'mlswitch1', 'gi1/0/1', 'router3', 'gi0/0', 'crossover');
  // Router3 (Gi0/1) -> MultilayerSwitch2 (Gi0/1)
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'router3', 'gi0/1', 'mlswitch2', 'gi1/0/1', 'crossover');
  // MultilayerSwitch2 (Gi1/0/2) -> Switch1
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'mlswitch2', 'gi1/0/2', 'switch1', 'fa0/1');
  // Switch1 -> PC4
  connectPorts(staticL3RoutingDevices, staticL3RoutingConnections, 'switch1', 'fa0/2', 'pc4', 'eth0');

  const staticL3RoutingNotes: CanvasNote[] = [
    {
      id: 'static-l3-routing-note',
      text: isTr
        ? 'Amaç: L3 switch\'ler ve router arasında static routing yapılandırarak farklı ağlar arası iletişim sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet L3 Switch (ML1, ML2) ekle\n   - 1 adet Router (R3) ekle\n   - 2 adet L2 Switch (Switch0, Switch1) ekle\n   - 4 adet PC ekle\n   - Bağlantıları yapıştır (topolojiye göre)\n\n2) ML1 KONFİGÜRASYONU:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/1\n     no switchport\n     ip address 10.0.0.1 255.0.0.0\n     no shutdown\n   - exit\n   - interface gi1/0/2\n     no switchport\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.2.0 255.255.255.0 10.0.0.2\n\n3) R3 KONFİGÜRASYONU:\n   - enable, conf t\n   - interface gi0/0\n     ip address 10.0.0.2 255.0.0.0\n     no shutdown\n   - exit\n   - interface gi0/1\n     ip address 20.0.0.1 255.0.0.0\n     no shutdown\n   - exit\n   - ip route 192.168.1.0 255.255.255.0 10.0.0.1\n   - ip route 192.168.2.0 255.255.255.0 20.0.0.2\n\n4) ML2 KONFİGÜRASYONU:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/1\n     no switchport\n     ip address 20.0.0.2 255.0.0.0\n     no shutdown\n   - exit\n   - interface gi1/0/2\n     no switchport\n     ip address 192.168.2.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.1.0 255.255.255.0 20.0.0.1\n\n5) TEST:\n   - show ip route (statik rotaları gör)\n   - PC\'ler arası ping testi'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 L3 Switches (ML1, ML2)\n   - Add 1 Router (R3)\n   - Add 2 L2 Switches (Switch0, Switch1)\n   - Add 4 PCs\n   - Connect all devices according to topology\n\n2) ML1 CONFIGURATION:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/1\n     no switchport\n     ip address 10.0.0.1 255.0.0.0\n     no shutdown\n   - exit\n   - interface gi1/0/2\n     no switchport\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.2.0 255.255.255.0 10.0.0.2\n\n3) R3 CONFIGURATION:\n   - enable, conf t\n   - interface gi0/0\n     ip address 10.0.0.2 255.0.0.0\n     no shutdown\n   - exit\n   - interface gi0/1\n     ip address 20.0.0.1 255.0.0.0\n     no shutdown\n   - exit\n   - ip route 192.168.1.0 255.255.255.0 10.0.0.1\n   - ip route 192.168.2.0 255.255.255.0 20.0.0.2\n\n4) ML2 CONFIGURATION:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/1\n     no switchport\n     ip address 20.0.0.2 255.0.0.0\n     no shutdown\n   - exit\n   - interface gi1/0/2\n     no switchport\n     ip address 192.168.2.1 255.255.255.0\n     no shutdown\n   - exit\n   - ip route 192.168.1.0 255.255.255.0 20.0.0.1\n\n5) TEST:\n   - show ip route (view static routes)\n   - Ping test between PCs',
      x: 450,
      y: 80,
      width: 520,
      height: 380,
      color: '#3b82f6',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // MultilayerSwitch1 State (Sol L3 Switch)
  const mlSwitch1State = createInitialState('00:1A:2B:3C:4D:80', 'WS-C3650-24PS');
  mlSwitch1State.hostname = 'MultilayerSwitch1';
  mlSwitch1State.switchModel = 'WS-C3650-24PS';
  mlSwitch1State.switchLayer = 'L3';
  mlSwitch1State.ipRouting = true;
  mlSwitch1State.ports['gi1/0/1'] = { ...mlSwitch1State.ports['gi1/0/1'], mode: 'routed', isRoutedPort: true, ipAddress: '10.0.0.1', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  mlSwitch1State.ports['gi1/0/2'] = { ...mlSwitch1State.ports['gi1/0/2'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  mlSwitch1State.staticRoutes = [
    { destination: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2', metric: 1, type: 'static' }
  ];
  mlSwitch1State.runningConfig = [
    '!',
    'hostname MultilayerSwitch1',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/1',
    ' no switchport',
    ' ip address 10.0.0.1 255.0.0.0',
    ' no shutdown',
    '!',
    'interface gi1/0/2',
    ' no switchport',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'ip route 192.168.2.0 255.255.255.0 10.0.0.2',
    '!',
    'end'
  ];

  // Router3 State (Ortadaki Router)
  const router3State = createInitialRouterState('00:50:00:00:00:10');
  router3State.hostname = 'Router3';
  router3State.ipRouting = true;
  router3State.ports['gi0/0'] = { ...router3State.ports['gi0/0'], ipAddress: '10.0.0.2', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  router3State.ports['gi0/1'] = { ...router3State.ports['gi0/1'], ipAddress: '20.0.0.1', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  router3State.staticRoutes = [
    { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1', metric: 1, type: 'static' },
    { destination: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '20.0.0.2', metric: 1, type: 'static' }
  ];
  router3State.runningConfig = [
    '!',
    'hostname Router3',
    '!',
    'interface GigabitEthernet0/0',
    ' ip address 10.0.0.2 255.0.0.0',
    ' no shutdown',
    '!',
    'interface GigabitEthernet0/1',
    ' ip address 20.0.0.1 255.0.0.0',
    ' no shutdown',
    '!',
    'ip route 192.168.1.0 255.255.255.0 10.0.0.1',
    'ip route 192.168.2.0 255.255.255.0 20.0.0.2',
    '!',
    'end'
  ];

  // MultilayerSwitch2 State (Sağ L3 Switch)
  const mlSwitch2State = createInitialState('00:1A:2B:3C:4D:81', 'WS-C3650-24PS');
  mlSwitch2State.hostname = 'MultilayerSwitch2';
  mlSwitch2State.switchModel = 'WS-C3650-24PS';
  mlSwitch2State.switchLayer = 'L3';
  mlSwitch2State.ipRouting = true;
  mlSwitch2State.ports['gi1/0/1'] = { ...mlSwitch2State.ports['gi1/0/1'], mode: 'routed', isRoutedPort: true, ipAddress: '20.0.0.2', subnetMask: '255.0.0.0', status: 'connected', shutdown: false };
  mlSwitch2State.ports['gi1/0/2'] = { ...mlSwitch2State.ports['gi1/0/2'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  mlSwitch2State.staticRoutes = [
    { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '20.0.0.1', metric: 1, type: 'static' }
  ];
  mlSwitch2State.runningConfig = [
    '!',
    'hostname MultilayerSwitch2',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/1',
    ' no switchport',
    ' ip address 20.0.0.2 255.0.0.0',
    ' no shutdown',
    '!',
    'interface gi1/0/2',
    ' no switchport',
    ' ip address 192.168.2.1 255.255.255.0',
    ' no shutdown',
    '!',
    'ip route 192.168.1.0 255.255.255.0 20.0.0.1',
    '!',
    'end'
  ];

  // Switch0 State (Sol L2 Switch)
  const switch0State = createInitialState('00:1A:2B:3C:4D:82', 'WS-C2960-24TT-L');
  switch0State.hostname = 'Switch0';
  switch0State.ports['fa0/1'] = { ...switch0State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch0State.ports['fa0/2'] = { ...switch0State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };

  // Switch1 State (Sağ L2 Switch)
  const switch1State = createInitialState('00:1A:2B:3C:4D:83', 'WS-C2960-24TT-L');
  switch1State.hostname = 'Switch1';
  switch1State.ports['fa0/1'] = { ...switch1State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch1State.ports['fa0/2'] = { ...switch1State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };

  // Dinamik Yönlendirme Topolojisi (RIP)
  // 2 Multilayer Switch + 2 L2 Switch + 4 PC - RIP Dynamic Routing
  const ripRoutingDevices = [
    // PC0 - Sol alt
    createPcDevice('pc0', 'PC0', 100, 500, '192.168.1.10', 1, '192.168.1.1'),
    // PC1 - Sol alt (PC0'ın altında)
    createPcDevice('pc1', 'PC1', 300, 500, '192.168.1.11', 1, '192.168.1.1'),
    // Switch0-L2 - Sol L2 switch (PC0 ve PC1'i bağlar)
    createSwitchDevice('switch0-l2', 'Switch0-L2', 200, 400),
    // Multilayer Switch0 - Sol üst L3 switch
    createL3SwitchDevice('mlswitch0', 'MultilayerSwitch0', 300, 250),
    // Multilayer Switch1 - Sağ üst L3 switch
    createL3SwitchDevice('mlswitch1', 'MultilayerSwitch1', 700, 250),
    // Switch3-L2 - Sağ L2 switch (PC2 ve PC3'ü bağlar)
    createSwitchDevice('switch3-l2', 'Switch3-L2', 800, 400),
    // PC2 - Sağ alt
    createPcDevice('pc2', 'PC2', 700, 500, '192.168.3.10', 1, '192.168.3.1'),
    // PC3 - Sağ alt (PC2'nin sağında)
    createPcDevice('pc3', 'PC3', 900, 500, '192.168.3.20', 1, '192.168.3.1')
  ];

  const ripRoutingConnections: CanvasConnection[] = [];
  // PC0 -> Switch0-L2
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'pc0', 'eth0', 'switch0-l2', 'fa0/1');
  // PC1 -> Switch0-L2
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'pc1', 'eth0', 'switch0-l2', 'fa0/2');
  // Switch0-L2 -> MultilayerSwitch0
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'switch0-l2', 'fa0/24', 'mlswitch0', 'gi1/0/23');
  // MultilayerSwitch0 <-> MultilayerSwitch1 (Trunk/Routed link)
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'mlswitch0', 'gi1/0/24', 'mlswitch1', 'gi1/0/24', 'crossover');
  // MultilayerSwitch1 -> Switch3-L2
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'mlswitch1', 'gi1/0/23', 'switch3-l2', 'fa0/24');
  // Switch3-L2 -> PC2
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'switch3-l2', 'fa0/1', 'pc2', 'eth0');
  // Switch3-L2 -> PC3
  connectPorts(ripRoutingDevices, ripRoutingConnections, 'switch3-l2', 'fa0/2', 'pc3', 'eth0');

  const ripRoutingNotes: CanvasNote[] = [
    {
      id: 'rip-routing-note',
      text: isTr
        ? 'Amaç: L3 switch\'ler arasında RIP dynamic routing yapılandırarak otomatik route öğrenimi sağlamak.\n\n🔧 YAPILANDIRMA ADIMLARI:\n\n1) TOPOLOJİ OLUŞTURMA:\n   - 2 adet L3 Switch (ML0, ML1) ekle\n   - 2 adet L2 Switch (Switch0-L2, Switch3-L2) ekle\n   - 4 adet PC (PC0-PC3) ekle\n   - PC0-PC1 -> Switch0-L2 Fa0/1-2\n   - Switch0-L2 Fa0/24 -> ML0 Gi1/0/23\n   - ML0 Gi1/0/24 -> ML1 Gi1/0/24 (Crossover)\n   - ML1 Gi1/0/23 -> Switch3-L2 Fa0/24\n   - Switch3-L2 Fa0/1-2 -> PC2-PC3\n\n2) ML0 KONFİGÜRASYONU:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.1 255.255.255.0\n     no shutdown\n   - exit\n   - router rip\n     network 192.168.1.0\n     network 192.168.2.0\n   - exit\n\n3) ML1 KONFİGÜRASYONU:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.3.1 255.255.255.0\n     no shutdown\n   - exit\n   - router rip\n     network 192.168.2.0\n     network 192.168.3.0\n   - exit\n\n4) PC KONFİGÜRASYONU:\n   - PC0-PC1: IP 192.168.1.x, GW 192.168.1.1\n   - PC2-PC3: IP 192.168.3.x, GW 192.168.3.1\n\n5) TEST:\n   - show ip route (dinamik rotaları gör)\n   - PC0 ping 192.168.3.10 (PC2)'
        : '🔧 BUILD STEPS:\n\n1) CREATE TOPOLOGY:\n   - Add 2 L3 Switches (ML0, ML1)\n   - Add 2 L2 Switches (Switch0-L2, Switch3-L2)\n   - Add 4 PCs (PC0-PC3)\n   - Connect PC0-PC1 -> Switch0-L2 Fa0/1-2\n   - Connect Switch0-L2 Fa0/24 -> ML0 Fa0/23\n   - Connect ML0 Fa0/24 -> ML1 Fa0/24 (Crossover)\n   - Connect ML1 Fa0/23 -> Switch3-L2 Fa0/24\n   - Connect Switch3-L2 Fa0/1-2 -> PC2-PC3\n\n2) ML0 CONFIGURATION:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.1.1 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.1 255.255.255.0\n     no shutdown\n   - exit\n   - router rip\n     network 192.168.1.0\n     network 192.168.2.0\n   - exit\n\n3) ML1 CONFIGURATION:\n   - enable, conf t\n   - ip routing\n   - interface gi1/0/24\n     no switchport\n     ip address 192.168.2.2 255.255.255.0\n     no shutdown\n   - exit\n   - interface gi1/0/23\n     no switchport\n     ip address 192.168.3.1 255.255.255.0\n     no shutdown\n   - exit\n   - router rip\n     network 192.168.2.0\n     network 192.168.3.0\n   - exit\n\n4) PC CONFIGURATION:\n   - PC0-PC1: IP 192.168.1.x, GW 192.168.1.1\n   - PC2-PC3: IP 192.168.3.x, GW 192.168.3.1\n\n5) TEST:\n   - show ip route (view dynamic routes)\n   - PC0 ping 192.168.3.10 (PC2)',
      x: 450,
      y: 80,
      width: 520,
      height: 380,
      color: '#22c55e',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  // MultilayerSwitch0 State (Sol L3 Switch) - RIP
  const ripMlswitch0State = createInitialState('00:1A:2B:3C:4D:90', 'WS-C3650-24PS');
  ripMlswitch0State.hostname = 'MultilayerSwitch0';
  ripMlswitch0State.switchModel = 'WS-C3650-24PS';
  ripMlswitch0State.switchLayer = 'L3';
  ripMlswitch0State.ipRouting = true;
  ripMlswitch0State.routingProtocol = 'rip';
  ripMlswitch0State.ports['gi1/0/23'] = { ...ripMlswitch0State.ports['gi1/0/23'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  ripMlswitch0State.ports['gi1/0/24'] = { ...ripMlswitch0State.ports['gi1/0/24'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  ripMlswitch0State.dynamicRoutes = [
    { destination: '192.168.3.0', subnetMask: '255.255.255.0', nextHop: '192.168.2.2', metric: 1, type: 'dynamic' }
  ];
  ripMlswitch0State.runningConfig = [
    '!',
    'hostname MultilayerSwitch0',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/23',
    ' no switchport',
    ' ip address 192.168.1.1 255.255.255.0',
    ' no shutdown',
    '!',
    'interface gi1/0/24',
    ' no switchport',
    ' ip address 192.168.2.1 255.255.255.0',
    ' no shutdown',
    '!',
    'router rip',
    ' network 192.168.1.0',
    ' network 192.168.2.0',
    '!',
    'end'
  ];

  // MultilayerSwitch1 State (Sağ L3 Switch) - RIP
  const ripMlswitch1State = createInitialState('00:1A:2B:3C:4D:91', 'WS-C3650-24PS');
  ripMlswitch1State.hostname = 'MultilayerSwitch1';
  ripMlswitch1State.switchModel = 'WS-C3650-24PS';
  ripMlswitch1State.switchLayer = 'L3';
  ripMlswitch1State.ipRouting = true;
  ripMlswitch1State.routingProtocol = 'rip';
  ripMlswitch1State.ports['gi1/0/24'] = { ...ripMlswitch1State.ports['gi1/0/24'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.2.2', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  ripMlswitch1State.ports['gi1/0/23'] = { ...ripMlswitch1State.ports['gi1/0/23'], mode: 'routed', isRoutedPort: true, ipAddress: '192.168.3.1', subnetMask: '255.255.255.0', status: 'connected', shutdown: false };
  ripMlswitch1State.dynamicRoutes = [
    { destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '192.168.2.1', metric: 1, type: 'dynamic' }
  ];
  ripMlswitch1State.runningConfig = [
    '!',
    'hostname MultilayerSwitch1',
    '!',
    'ip routing',
    '!',
    'interface gi1/0/24',
    ' no switchport',
    ' ip address 192.168.2.2 255.255.255.0',
    ' no shutdown',
    '!',
    'interface gi1/0/23',
    ' no switchport',
    ' ip address 192.168.3.1 255.255.255.0',
    ' no shutdown',
    '!',
    'router rip',
    ' network 192.168.2.0',
    ' network 192.168.3.0',
    '!',
    'end'
  ];

  // Switch0-L2 State (Sol L2 Switch)
  const switch0L2State = createInitialState('00:1A:2B:3C:4D:92', 'WS-C2960-24TT-L');
  switch0L2State.hostname = 'Switch0-L2';
  switch0L2State.ports['fa0/1'] = { ...switch0L2State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch0L2State.ports['fa0/2'] = { ...switch0L2State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  switch0L2State.ports['fa0/24'] = { ...switch0L2State.ports['fa0/24'], vlan: 1, mode: 'access', status: 'connected' };

  // Switch3-L2 State (Sağ L2 Switch)
  const switch3L2State = createInitialState('00:1A:2B:3C:4D:93', 'WS-C2960-24TT-L');
  switch3L2State.hostname = 'Switch3-L2';
  switch3L2State.ports['fa0/1'] = { ...switch3L2State.ports['fa0/1'], vlan: 1, mode: 'access', status: 'connected' };
  switch3L2State.ports['fa0/2'] = { ...switch3L2State.ports['fa0/2'], vlan: 1, mode: 'access', status: 'connected' };
  switch3L2State.ports['fa0/24'] = { ...switch3L2State.ports['fa0/24'], vlan: 1, mode: 'access', status: 'connected' };

  // Example 15: Advanced IPv6 Lab (Routing, DHCPv6, OSPFv3)
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
      color: '#3b82f6',
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

  // Example 16: Services Lab - 6 PCs (DNS, HTTP, DHCP, FTP, MAIL, NTP), 1 Switch
  const servicesLabDevices = [
    createPcDevice('pc-dns', 'PC-DNS', 50, 100, '192.168.1.10', 1),
    createPcDevice('pc-http', 'PC-HTTP', 200, 100, '192.168.1.20', 1),
    createPcDevice('pc-dhcp', 'PC-DHCP', 350, 100, '192.168.1.30', 1),
    createPcDevice('pc-ftp', 'PC-FTP', 500, 100, '192.168.1.40', 1),
    createPcDevice('pc-mail', 'PC-MAIL', 650, 100, '192.168.1.50', 1),
    createPcDevice('pc-ntp', 'PC-NTP', 800, 100, '192.168.1.60', 1),
    createSwitchDevice('switch-1', 'SW1', 425, 300)
  ].map(dev => ({ ...dev, dns: '192.168.1.10' }));

  // Configure DNS Service
  servicesLabDevices[0].services = {
    dns: {
      enabled: true,
      records: [
        { domain: 'www.lab.local', address: '192.168.1.20' },
        { domain: 'web.lab.local', address: '192.168.1.20' },
        { domain: 'ftp.lab.local', address: '192.168.1.40' },
        { domain: 'mail.lab.local', address: '192.168.1.50' }
      ]
    }
  };

  // Configure HTTP Service
  servicesLabDevices[1].services = {
    http: {
      enabled: true,
      content: isTr
        ? '<h1>Laboratuvar Web Sayfası</h1><p>HTTP servisi çalışıyor!</p>'
        : '<h1>Lab Web Page</h1><p>HTTP service is running!</p>',
    }
  };

  // Configure DHCP Service
  servicesLabDevices[2].services = {
    dhcp: {
      enabled: true,
      pools: [{
        poolName: 'LabPool',
        defaultGateway: '192.168.1.1',
        dnsServer: '192.168.1.10',
        startIp: '192.168.1.100',
        subnetMask: '255.255.255.0',
        maxUsers: 50
      }]
    }
  };

  // Configure FTP Service
  servicesLabDevices[3].services = {
    ftp: {
      enabled: true,
      files: [
        { name: 'welcome.txt', size: 512, modifiedAt: new Date().toISOString() },
        { name: 'data.csv', size: 2048, modifiedAt: new Date().toISOString() }
      ]
    }
  };

  // Configure MAIL Service
  servicesLabDevices[4].services = {
    mail: {
      enabled: true,
      domain: 'lab.local',
      username: 'admin',
      password: 'password123',
      inbox: [],
      sent: []
    }
  };

  // Configure NTP Service
  servicesLabDevices[5].services = {
    ntp: {
      enabled: true,
      server: 'local-clock',
      date: '2026-02-26',
      time: '10:00:00'
    }
  };

  const servicesLabConnections: CanvasConnection[] = [];
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-dns', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-http', 'eth0', 'switch-1', 'fa0/2');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-dhcp', 'eth0', 'switch-1', 'fa0/3');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-ftp', 'eth0', 'switch-1', 'fa0/4');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-mail', 'eth0', 'switch-1', 'fa0/5');
  connectPorts(servicesLabDevices, servicesLabConnections, 'pc-ntp', 'eth0', 'switch-1', 'fa0/6');

  const servicesLabNotes: CanvasNote[] = [
    {
      id: 'services-lab-note',
      text: isTr
        ? '🌐 Servisler Laboratuvarı:\n\nBu laboratuvarda 6 farklı ağ servisi PC\'ler üzerinde çalışmaktadır:\n\n1) DNS (1.10): www.lab.local, ftp.lab.local çözümlemesi yapar.\n2) HTTP (1.20): Web sunucusu.\n3) DHCP (1.30): 192.168.1.100+ aralığında IP dağıtır.\n4) FTP (1.40): Dosya paylaşım sunucusu.\n5) MAIL (1.50): E-posta sunucusu (admin@lab.local).\n6) NTP (1.60): Zaman sunucusu.\n\nTestler:\n• Bir PC terminalinde "nslookup www.lab.local"\n• "wget www.lab.local" ile web sayfasına bakın.\n• "ftp 192.168.1.40" ile dosya yüklemeyi (put) deneyin.\n• Switch üzerinde "ntp server 192.168.1.60" yapıp "show clock" ile zamanı kontrol edin.'
        : '🌐 Services Lab:\n\nIn this lab, 6 different network services are running on PCs:\n\n1) DNS (1.10): Resolves www.lab.local, ftp.lab.local.\n2) HTTP (1.20): Web server.\n3) DHCP (1.30): Distributes IPs in 192.168.1.100+ range.\n4) FTP (1.40): File sharing server.\n5) MAIL (1.50): Mail server (admin@lab.local).\n6) NTP (1.60): Time server.\n\nTests:\n• Run "nslookup www.lab.local" in a PC terminal.\n• Use "wget www.lab.local" to view the web page.\n• Use "ftp 192.168.1.40" to try file uploading (put).\n• On the Switch: "ntp server 192.168.1.60" then "show clock" to check time sync.',
      x: 50,
      y: 450,
      width: 600,
      height: 350,
      color: '#3b82f6',
      font: 'verdana',
      fontSize: 12,
      opacity: 0.75
    }
  ];

  const troubleVlanDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 10),
    createPcDevice('pc-2', 'PC-2', 100, 250, '192.168.1.20', 10),
    createSwitchDevice('switch-1', 'SW1', 300, 175)
  ];
  const troubleVlanConnections: CanvasConnection[] = [];
  connectPorts(troubleVlanDevices, troubleVlanConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  connectPorts(troubleVlanDevices, troubleVlanConnections, 'pc-2', 'eth0', 'switch-1', 'fa0/2');
  const troubleVlanSwState = createInitialState();
  troubleVlanSwState.hostname = 'SW1';
  troubleVlanSwState.vlans[10] = { id: 10, name: 'SALES', status: 'active', ports: ['FA0/1', 'FA0/2'] };
  // Inject fault: Fa0/2 is in VLAN 20 instead of 10
  troubleVlanSwState.ports['fa0/1'] = { ...troubleVlanSwState.ports['fa0/1'], vlan: 10, mode: 'access', status: 'connected' };
  troubleVlanSwState.ports['fa0/2'] = { ...troubleVlanSwState.ports['fa0/2'], vlan: 20, mode: 'access', status: 'connected' };
  troubleVlanSwState.vlans[20] = { id: 20, name: 'FAULT', status: 'active', ports: ['FA0/2'] };

  const troubleMaskDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1),
    createPcDevice('pc-2', 'PC-2', 300, 100, '192.168.1.20', 1)
  ];
  const troubleMaskConnections: CanvasConnection[] = [];
  connectPorts(troubleMaskDevices, troubleMaskConnections, 'pc-1', 'eth0', 'pc-2', 'eth0', 'crossover');
  // Inject fault: PC-2 has wrong mask 255.255.255.240
  troubleMaskDevices[1].subnet = '255.255.255.240';

  const troubleShutDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1),
    createSwitchDevice('switch-1', 'SW1', 300, 100)
  ];
  const troubleShutConnections: CanvasConnection[] = [];
  connectPorts(troubleShutDevices, troubleShutConnections, 'pc-1', 'eth0', 'switch-1', 'fa0/1');
  const troubleShutSwState = createInitialState();
  troubleShutSwState.hostname = 'SW1';
  // Inject fault: Fa0/1 is shutdown
  troubleShutSwState.ports['fa0/1'] = { ...troubleShutSwState.ports['fa0/1'], shutdown: true, status: 'notconnect' };

  const troubleGwDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1, '192.168.1.254'),
    createRouterDevice('router-1', 'R1', 300, 100)
  ];
  const troubleGwConnections: CanvasConnection[] = [];
  connectPorts(troubleGwDevices, troubleGwConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0', 'crossover');
  const troubleGwR1State = createInitialRouterState();
  troubleGwR1State.hostname = 'R1';
  troubleGwR1State.ports['gi0/0'] = { ...troubleGwR1State.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' };
  // Inject fault: PC-1 has wrong gateway 192.168.1.254 (should be 192.168.1.1)
  troubleGwDevices[0].gateway = '192.168.1.254';

  const troubleDuplicateDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1),
    createPcDevice('pc-2', 'PC-2', 300, 100, '192.168.1.10', 1)
  ];
  const troubleDuplicateConnections: CanvasConnection[] = [];
  connectPorts(troubleDuplicateDevices, troubleDuplicateConnections, 'pc-1', 'eth0', 'pc-2', 'eth0', 'crossover');
  // Inject fault: PC-2 has same IP as PC-1
  troubleDuplicateDevices[1].ip = '192.168.1.10';

  const troubleAclDevices = [
    createPcDevice('pc-1', 'PC-1', 100, 100, '192.168.1.10', 1, '192.168.1.1'),
    createRouterDevice('router-1', 'R1', 300, 100),
    createPcDevice('pc-2', 'PC-2', 500, 100, '192.168.2.10', 1, '192.168.2.1')
  ];
  const troubleAclConnections: CanvasConnection[] = [];
  connectPorts(troubleAclDevices, troubleAclConnections, 'pc-1', 'eth0', 'router-1', 'gi0/0', 'crossover');
  connectPorts(troubleAclDevices, troubleAclConnections, 'router-1', 'gi0/1', 'pc-2', 'eth0', 'crossover');
  const troubleAclR1State = createInitialRouterState();
  troubleAclR1State.hostname = 'R1';
  troubleAclR1State.ports['gi0/0'] = { ...troubleAclR1State.ports['gi0/0'], ipAddress: '192.168.1.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' };
  troubleAclR1State.ports['gi0/1'] = { ...troubleAclR1State.ports['gi0/1'], ipAddress: '192.168.2.1', subnetMask: '255.255.255.0', shutdown: false, status: 'connected' };
  // Inject fault: ACL blocking all traffic on Gi0/0
  troubleAclR1State.accessLists = {
    '101': [
      'access-list 101 deny ip any any'
    ]
  };
  troubleAclR1State.ports['gi0/0'].accessGroupIn = '101';

  return [
    {
      id: 'trouble-vlan',
      tag: isTr ? 'ARIZA' : 'TROUBLE',
      title: isTr ? 'Yanlış VLAN Ataması' : 'Wrong VLAN Assignment',
      description: isTr ? 'PC2 neden PC1\'e ping atamıyor? Switch portlarını kontrol edin.' : 'Why can\'t PC2 ping PC1? Check the switch ports.',
      level: 'intermediate',
      injectedFaults: [
        {
          id: 'fault-vlan-2',
          deviceId: 'switch-1',
          faultType: 'wrongVlan',
          description: { tr: 'Fa0/2 portu yanlışlıkla VLAN 20\'ye atanmış.', en: 'Port Fa0/2 is mistakenly assigned to VLAN 20.' },
          configKey: 'ports.fa0/2.vlan',
          faultValue: 20,
          correctValue: 10
        }
      ],
      data: baseProjectData(troubleVlanDevices, troubleVlanConnections, [], [{ id: 'switch-1', state: troubleVlanSwState }])
    },
    {
      id: 'trouble-mask',
      tag: isTr ? 'ARIZA' : 'TROUBLE',
      title: isTr ? 'Yanlış Alt Ağ Maskesi' : 'Incorrect Subnet Mask',
      description: isTr ? 'PC1 ve PC2 aynı ağda olmasına rağmen iletişim kuramıyor.' : 'PC1 and PC2 are on the same network but cannot communicate.',
      level: 'basic',
      injectedFaults: [
        {
          id: 'fault-mask-pc2',
          deviceId: 'pc-2',
          faultType: 'wrongSubnetMask',
          description: { tr: 'PC2\'nin maskesi 255.255.255.240 olarak ayarlanmış.', en: 'PC2 mask is set to 255.255.255.240.' },
          configKey: 'pc.pc-2.subnet',
          faultValue: '255.255.255.240',
          correctValue: '255.255.255.0'
        }
      ],
      data: baseProjectData(troubleMaskDevices, troubleMaskConnections, [], [])
    },
    {
      id: 'trouble-shutdown',
      tag: isTr ? 'ARIZA' : 'TROUBLE',
      title: isTr ? 'Kapalı Arayüz' : 'Shutdown Interface',
      description: isTr ? 'Fiziksel bağlantı var ama LED\'ler sönük. Sorunu bulun.' : 'Physical connection exists but LEDs are off. Find the issue.',
      level: 'basic',
      injectedFaults: [
        {
          id: 'fault-shut-fa01',
          deviceId: 'switch-1',
          faultType: 'shutdownInterface',
          description: { tr: 'Switch Fa0/1 portu shutdown durumunda.', en: 'Switch port Fa0/1 is shutdown.' },
          configKey: 'ports.fa0/1.shutdown',
          faultValue: true,
          correctValue: false
        }
      ],
      data: baseProjectData(troubleShutDevices, troubleShutConnections, [], [{ id: 'switch-1', state: troubleShutSwState }])
    },
    {
      id: 'trouble-gateway',
      tag: isTr ? 'ARIZA' : 'TROUBLE',
      title: isTr ? 'Yanlış Ağ Geçidi' : 'Wrong Default Gateway',
      description: isTr ? 'PC1 router\'a ulaşamıyor. Gateway ayarlarını kontrol edin.' : 'PC1 cannot reach the router. Check gateway settings.',
      level: 'basic',
      injectedFaults: [
        {
          id: 'fault-gw-pc1',
          deviceId: 'pc-1',
          faultType: 'wrongDefaultGateway',
          description: { tr: 'PC1\'in gateway adresi yanlış (192.168.1.254).', en: 'PC1 gateway address is wrong (192.168.1.254).' },
          configKey: 'pc.pc-1.gateway',
          faultValue: '192.168.1.254',
          correctValue: '192.168.1.1'
        }
      ],
      data: baseProjectData(troubleGwDevices, troubleGwConnections, [], [{ id: 'router-1', state: troubleGwR1State }])
    },
    {
      id: 'trouble-duplicate',
      tag: isTr ? 'ARIZA' : 'TROUBLE',
      title: isTr ? 'Çakışan IP Adresi' : 'Duplicate IP Address',
      description: isTr ? 'Ağda iki cihaz aynı IP adresini kullanıyor. Çakışmayı giderin.' : 'Two devices in the network use the same IP. Resolve the conflict.',
      level: 'basic',
      injectedFaults: [
        {
          id: 'fault-dup-pc2',
          deviceId: 'pc-2',
          faultType: 'duplicateIp',
          description: { tr: 'PC-2, PC-1 ile aynı IP\'ye (192.168.1.10) sahip.', en: 'PC-2 has the same IP (192.168.1.10) as PC-1.' },
          configKey: 'pc.pc-2.ip',
          faultValue: '192.168.1.10',
          correctValue: '192.168.1.11'
        }
      ],
      data: baseProjectData(troubleDuplicateDevices, troubleDuplicateConnections, [], [])
    },
    {
      id: 'trouble-acl',
      tag: isTr ? 'ARIZA' : 'TROUBLE',
      title: isTr ? 'Hatalı ACL Kısıtlaması' : 'Incorrect ACL Restriction',
      description: isTr ? 'Router üzerindeki bir ACL trafiği engelliyor. Kuralı düzeltin.' : 'An ACL on the router is blocking traffic. Fix the rule.',
      level: 'intermediate',
      injectedFaults: [
        {
          id: 'fault-acl-r1',
          deviceId: 'router-1',
          faultType: 'aclBlocking',
          description: { tr: 'R1 Gi0/0 arayüzünde tüm trafiği engelleyen ACL 101 uygulanmış.', en: 'ACL 101 blocking all traffic is applied on R1 Gi0/0.' },
          configKey: 'ports.gi0/0.accessGroupIn',
          faultValue: '101',
          correctValue: undefined
        }
      ],
      data: baseProjectData(troubleAclDevices, troubleAclConnections, [], [{ id: 'router-1', state: troubleAclR1State }])
    },
    {
      id: 'basic-secure',
      tag: isTr ? 'TEMEL' : 'BASIC',
      title: isTr ? 'Basit Ağ + Parolalar' : 'Basic Network + Passwords',
      description: isTr
        ? 'Temel ağ güvenliği için console, VTY ve enable parolaları yapılandırılmıştır.'
        : 'Basic network security with console, VTY, and enable passwords configured.',
      detail: isTr
        ? 'Şifreler: enable secret: class, enable password: paswd, console: console, vty: vty123'
        : 'Passwords: enable secret: class, enable password: paswd, console: console, vty: vty123',
      level: 'basic',
      data: baseProjectData(basicDevices, basicConnections, basicNotes, [{ id: 'switch-1', state: basicState }])
    },
    {
      id: 'single-vlan',
      tag: isTr ? 'VLAN' : 'VLAN',
      title: isTr ? '1 Switch VLAN' : 'Single Switch VLANs',
      description: isTr
        ? 'Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu yapılandırması.'
        : 'Single switch with VLAN 10 and 20 access port configuration for two PCs.',
      detail: isTr
        ? 'PC-1: VLAN 10 (192.168.10.10), PC-2: VLAN 20 (192.168.20.10)'
        : 'PC-1: VLAN 10 (192.168.10.10), PC-2: VLAN 20 (192.168.20.10)',
      level: 'basic',
      data: baseProjectData(vlanDevices, vlanConnections, vlanNotes, [{ id: 'switch-1', state: vlanState }])
    },
    {
      id: 'trunk-vtp',
      tag: isTr ? 'TRUNK/VTP' : 'TRUNK/VTP',
      title: isTr ? '2 Switch Trunk + VTP' : 'Two Switch Trunk + VTP',
      description: isTr
        ? 'İki switch arası trunk bağlantısı ve VTP domain ile VLAN yayılımı sağlanır.'
        : 'Trunk connection between two switches with VTP domain for VLAN propagation.',
      detail: isTr
        ? 'VTP domain: LAB, Gi0/1 trunk, VLAN 10/20 otomatik yayılır'
        : 'VTP domain: LAB, Gi0/1 trunk, VLAN 10/20 auto-propagated',
      level: 'intermediate',
      data: baseProjectData(vtpDevices, vtpConnections, vtpNotes, [
        { id: 'switch-1', state: vtpSw1 },
        { id: 'switch-2', state: vtpSw2 }
      ])
    },
    {
      id: 'roas',
      tag: isTr ? 'ROAS' : 'ROAS',
      title: isTr ? 'ROAS (Router-on-a-Stick)' : 'ROAS (Router-on-a-Stick)',
      description: isTr
        ? 'Router-on-a-Stick ile tek trunk interface üzerinden inter-VLAN routing.'
        : 'Router-on-a-Stick inter-VLAN routing via single trunk interface.',
      detail: isTr
        ? 'Router subinterface: Gi0/0.10 (VLAN 10), Gi0/0.20 (VLAN 20)'
        : 'Router subinterface: Gi0/0.10 (VLAN 10), Gi0/0.20 (VLAN 20)',
      level: 'intermediate',
      data: baseProjectData(roasDevices, roasConnections, roasNotes, [
        { id: 'switch-1', state: roasSw },
        { id: 'router-1', state: roasRouter }
      ])
    },
    {
      id: 'legacy-routing',
      tag: isTr ? 'LEGACY ROUTING' : 'LEGACY ROUTING',
      title: isTr ? 'Legacy Inter-VLAN Routing' : 'Legacy Inter-VLAN Routing',
      description: isTr
        ? 'Router iki fiziksel interface ile VLANlara bağlanır, trunk kullanılmaz.'
        : 'Router connects to VLANs using two physical interfaces without trunk.',
      detail: isTr
        ? 'Router Gi0/1: VLAN 10 (192.168.0.1), Gi0/0: VLAN 20 (192.168.1.1)'
        : 'Router Gi0/1: VLAN 10 (192.168.0.1), Gi0/0: VLAN 20 (192.168.1.1)',
      level: 'intermediate',
      data: baseProjectData(legacyRoutingDevices, legacyRoutingConnections, legacyRoutingNotes, [
        { id: 'switch-1', state: legacyRoutingSw },
        { id: 'router-1', state: legacyRoutingRouter }
      ])
    },
    {
      id: 'port-security',
      tag: isTr ? 'GÜVENLİK' : 'SECURITY',
      title: isTr ? 'Port-Security' : 'Port-Security',
      description: isTr
        ? 'Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırılmıştır.'
        : 'MAC address-based security restriction configured on switch port.',
      detail: isTr
        ? 'Fa0/3: max MAC 1, violation shutdown, MAC: 00-11-22-33-44-55'
        : 'Fa0/3: max MAC 1, violation shutdown, MAC: 00-11-22-33-44-55',
      level: 'intermediate',
      data: baseProjectData(psDevices, psConnections, psNotes, [{ id: 'switch-1', state: psState }])
    },
    {
      id: 'l3-routing',
      tag: isTr ? 'L3 ROUTING' : 'L3 ROUTING',
      title: isTr ? 'Inter-VLAN Routing (L3 Switch)' : 'Inter-VLAN Routing (L3 Switch)',
      description: isTr
        ? 'L3 switch üzerinde dört VLAN arası routing aktiftir.'
        : 'Inter-VLAN routing is enabled on L3 switch for four VLANs.',
      detail: isTr
        ? 'VLAN 10: 192.168.10.1, VLAN 20: 192.168.20.1, VLAN 30: 192.168.30.1, VLAN 40: 192.168.40.1'
        : 'VLAN 10: 192.168.10.1, VLAN 20: 192.168.20.1, VLAN 30: 192.168.30.1, VLAN 40: 192.168.40.1',
      level: 'advanced',
      data: baseProjectData(l3RoutingDevices, l3RoutingConnections, l3RoutingNotes, [{ id: 'switch-1', state: l3RoutingState }])
    },
    {
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
    },
    {
      id: 'etherchannel',
      tag: isTr ? 'ETHERCHANNEL' : 'ETHERCHANNEL',
      title: isTr ? 'EtherChannel Lab' : 'EtherChannel Lab',
      description: isTr
        ? 'LACP ile birden fazla link tek bir mantıksal bağlantıda birleştirilir.'
        : 'Multiple links combined into single logical connection using LACP.',
      detail: isTr
        ? 'Fa0/1-2: channel-group 1 mode active, Po1 trunk'
        : 'Fa0/1-2: channel-group 1 mode active, Po1 trunk',
      level: 'advanced',
      data: baseProjectData(etherChannelDevices, etherChannelConnections, etherChannelNotes, [
        { id: 'switch-1', state: etherSw1 },
        { id: 'switch-2', state: etherSw2 }
      ])
    },
    {
      id: 'stp-redundant',
      tag: isTr ? 'STP' : 'STP',
      title: isTr ? 'STP Redundant Links' : 'STP Redundant Links',
      description: isTr
        ? 'Rapid-PVST redundant linklerde loop önlemek için STP kullanır.'
        : 'Rapid-PVST uses STP to prevent loops on redundant links.',
      detail: isTr
        ? 'SW1: spanning-tree priority 28672 (root)'
        : 'SW1: spanning-tree priority 28672 (root)',
      level: 'advanced',
      data: baseProjectData(stpDevices, stpConnections, stpNotes, [
        { id: 'switch-1', state: stpSw1 },
        { id: 'switch-2', state: stpSw2 }
      ])
    },
    {
      id: 'stp-triangle',
      tag: isTr ? 'STP' : 'STP',
      title: isTr ? 'STP Triangle Topology' : 'STP Triangle Topology',
      description: isTr
        ? 'Üç switch triangle topolojisinde STP bir portu bloke eder.'
        : 'Three switches in triangle topology with STP blocking one port.',
      detail: isTr
        ? 'SW1 Fa0/1 bloke (STP), SW2 root'
        : 'SW1 Fa0/1 blocked (STP), SW2 root',
      level: 'advanced',
      data: baseProjectData(stpTriangleDevices, stpTriangleConnections, stpTriangleNotes, [
        { id: 'switch-1', state: stpTriangleSw1 },
        { id: 'switch-2', state: stpTriangleSw2 },
        { id: 'switch-3', state: stpTriangleSw3 }
      ])
    },
    {
      id: 'campus-network',
      tag: isTr ? 'CAMPUS' : 'CAMPUS',
      title: isTr ? 'Campus Network' : 'Campus Network',
      description: isTr
        ? 'Core router iki access switch arası routing sağlar.'
        : 'Core router provides routing between two access switches.',
      detail: isTr
        ? 'CORE-R1: Gi0/0 VLAN 10, Gi0/1 VLAN 20, ip routing'
        : 'CORE-R1: Gi0/0 VLAN 10, Gi0/1 VLAN 20, ip routing',
      level: 'advanced',
      data: baseProjectData(campusDevices, campusConnections, campusNotes, [
        { id: 'switch-1', state: campusAcc1 },
        { id: 'router-1', state: campusCore },
        { id: 'switch-2', state: campusAcc2 }
      ])
    },
    {
      id: 'wifi-intermediate',
      tag: isTr ? 'WiFi' : 'WiFi',
      title: isTr ? 'Kablosuz Ağ (WiFi)' : 'Wireless Network (WiFi)',
      description: isTr
        ? 'Router access point mode ile kablosuz istemci bağlantısı sağlanır.'
        : 'Router configured as access point for wireless client connectivity.',
      detail: isTr
        ? 'SSID: HomeWiFi, Şifre: yok (open), Router AP mode'
        : 'SSID: HomeWiFi, Password: none (open), Router AP mode',
      level: 'intermediate',
      data: baseProjectData(wifiDevices, wifiConnections, wifiNotes, [
        { id: 'router-1', state: wifiR1State }
      ])
    },
    {
      id: 'iot-wifi-lab',
      tag: 'IoT',
      title: isTr ? 'IoT WiFi Laboratuvarı' : 'IoT WiFi Lab',
      description: isTr
        ? 'Üç IoT cihazı ve PC DHCP üzerinden açık WiFi ağına bağlanır.'
        : 'Three IoT devices and PC connect to open WiFi network via DHCP.',
      detail: isTr
        ? 'SSID: IoT-Network, DHCP IP desteği, 3 IoT cihazı'
        : 'SSID: IoT-Network, DHCP IP support, 3 IoT devices',
      level: 'intermediate',
      data: baseProjectData(iotWifiDevices, iotWifiConnections, iotWifiNotes, [
        { id: 'router-1', state: iotWifiR1State }
      ])
    },
    {
      id: 'greenhouse-iot-lab',
      tag: isTr ? 'ÇEVRE' : 'ENV',
      title: isTr ? '🌱 Sera Krokisi (Akıllı Tarım)' : '🌱 Greenhouse Sketch (Smart Farm)',
      description: isTr
        ? 'Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme yapar.'
        : 'Four environmental sensors use WPA2 WiFi for greenhouse monitoring.',
      detail: isTr
        ? 'SSID: GreenHouse-Network, Şifre: sera (WPA2), 4 sensör'
        : 'SSID: GreenHouse-Network, Password: sera (WPA2), 4 sensors',
      level: 'intermediate',
      data: baseProjectData(greenhouseDevices, greenhouseConnections, greenhouseNotes, [
        { id: 'router-1', state: greenhouseR1State }
      ])
    },
    {
      id: 'router-ssh-1pc',
      tag: 'SSH',
      title: isTr ? 'Router SSH (1 PC + 1 Router)' : 'Router SSH (1 PC + 1 Router)',
      description: isTr
        ? 'PC-1 üzerinden router R1 cihazına SSH ile güvenli bağlantı.'
        : 'Secure SSH connection from PC-1 to router R1.',
      detail: isTr
        ? 'Komut: ssh admin@192.168.1.150, Şifre: 1234'
        : 'Command: ssh admin@192.168.1.150, Password: 1234',
      level: 'basic',
      data: routerSshData
    },
    {
      id: 'router-dhcp-2pc',
      tag: 'DHCP',
      title: isTr ? 'Router DHCP (2 PC + 1 Switch + 1 Router)' : 'Router DHCP (2 PCs + 1 Switch + 1 Router)',
      description: isTr
        ? 'Router DHCP havuzu üzerinden iki PCye otomatik IP dağıtımı.'
        : 'Automatic IP assignment to two PCs via router DHCP pool.',
      detail: isTr
        ? 'R1: ip dhcp pool LAN, network 192.168.1.0 255.255.255.0, default-router 192.168.1.1'
        : 'R1: ip dhcp pool LAN, network 192.168.1.0 255.255.255.0, default-router 192.168.1.1',
      level: 'basic',
      data: baseProjectData(routerDhcpDevices, routerDhcpConnections, routerDhcpNotes, [
        { id: 'router-1', state: routerDhcpR1 },
        { id: 'switch-1', state: routerDhcpSw1 }
      ])
    },
    {
      id: 'firewall-basic',
      tag: isTr ? 'FIREWALL' : 'FIREWALL',
      title: isTr ? 'Firewall Temel (ICMP Bloke)' : 'Firewall Basic (ICMP Block)',
      description: isTr
        ? 'ICMP (ping) engellenmiş, diğer tüm trafiğe izin verilmiş basit firewall.'
        : 'Simple firewall with ICMP (ping) blocked, all other traffic allowed.',
      detail: isTr
        ? 'Kural 1: DENY ICMP | Kural 2: ALLOW ANY | PC-1 ping BAŞARISIZ, wget BAŞARILI'
        : 'Rule 1: DENY ICMP | Rule 2: ALLOW ANY | PC-1 ping FAIL, wget SUCCESS',
      level: 'basic',
      data: baseProjectData(firewallBasicDevices, firewallBasicConnections, firewallBasicNotes, [])
    },
    {
      id: 'mac-table-lab',
      tag: isTr ? 'MAC' : 'MAC',
      title: isTr ? 'MAC Tablo Öğrenme' : 'MAC Table Lab',
      description: isTr
        ? 'Switch MAC adres tablosu öğrenme özelliği incelenir.'
        : 'Switch MAC address table learning feature is examined.',
      detail: isTr
        ? 'PC1 MAC: 00-e0-f7-01-a1-b1, PC2 MAC: 97-31-e5-97-a7-03'
        : 'PC1 MAC: 00-e0-f7-01-a1-b1, PC2 MAC: 97-31-e5-97-a7-03',
      level: 'basic',
      data: macExampleAData
    },
    {
      id: 'dns-http',
      tag: isTr ? 'DNS/HTTP' : 'DNS/HTTP',
      title: isTr
        ? 'DNS ve HTTP Test (Domain Name System / Hypertext Transfer Protocol - görev: isim çözümleme + web erişimi)'
        : 'DNS + HTTP Test (Domain Name System / Hypertext Transfer Protocol - task: name resolution + web access)',
      description: isTr
        ? 'DNS name resolution ve HTTP web erişimi test edilir.'
        : 'DNS name resolution and HTTP web access are tested.',
      detail: isTr
        ? 'Test: wget 192.168.1.10, wget a10.com, nslookup a10.com'
        : 'Test: wget 192.168.1.10, wget a10.com, nslookup a10.com',
      level: 'intermediate',
      data: dnsHttpExampleData
    },
    {
      id: 'mac-arp-lab',
      tag: isTr ? 'MAC' : 'MAC',
      title: isTr ? 'ARP ve MAC Tablo Çalışması' : 'ARP vs MAC Table',
      description: isTr
        ? 'ARP ve MAC adres tablosu arasındaki ilişki incelenir.'
        : 'The relationship between ARP and MAC address table is examined.',
      detail: isTr
        ? 'PC: arp -a, Switch: show mac address-table'
        : 'PC: arp -a, Switch: show mac address-table',
      level: 'basic',
      data: macExampleBData
    },
    {
      id: 'ip-config-lab',
      tag: isTr ? 'IP' : 'IP',
      title: isTr ? 'IP Yapılandırma Laboratuvarı' : 'IP Configuration Lab',
      description: isTr
        ? 'IP yapılandırmasının ağ bağlantısı üzerindeki etkisi incelenir.'
        : 'The effect of IP configuration on network connectivity is examined.',
      detail: isTr
        ? 'PC1/PC2: 192.168.1.x/24, PC3: farklı subnet'
        : 'PC1/PC2: 192.168.1.x/24, PC3: different subnet',
      level: 'basic',
      data: ipConfigExampleData
    },
    {
      id: 'dhcp-distribution',
      tag: isTr ? 'DHCP' : 'DHCP',
      title: isTr
        ? 'DHCP Dağıtım Senaryosu (Dynamic Host Configuration Protocol - görev: otomatik IP dağıtımı)'
        : 'DHCP Distribution Scenario (Dynamic Host Configuration Protocol - task: automatic IP assignment)',
      description: isTr
        ? 'DHCP sunucusu otomatik IP dağıtımı yaparken manuel yapılandırma karşılaştırılır.'
        : 'DHCP automatic IP assignment is compared with manual configuration.',
      detail: isTr
        ? 'DHCP sunucusu PC1 ve PC2ye IP atarken PC3 manuel yapılandırma ile kalır.'
        : 'DHCP server assigns IPs to PC1 and PC2 while PC3 remains manually configured.',
      level: 'intermediate',
      data: dhcpExampleData
    },
    {
      id: 'trunk-2switch',
      tag: isTr ? 'TRUNK' : 'TRUNK',
      title: isTr ? '2 Switch Trunk Uygulaması' : '2 Switch Trunk Application',
      description: isTr
        ? 'İki switch trunk bağlantısı ile VLAN trafiğini taşır.'
        : 'Two switches carry VLAN traffic via trunk connection.',
      detail: isTr
        ? 'SW-1/2: Fa0/1 VLAN100, Fa0/11 VLAN200, Gi0/1 trunk'
        : 'SW-1/2: Fa0/1 VLAN100, Fa0/11 VLAN200, Gi0/1 trunk',
      level: 'intermediate',
      data: trunk2SwitchData
    },
    {
      id: 'native-vlan-basic',
      tag: isTr ? 'NATIVE' : 'NATIVE',
      title: isTr ? 'Native VLAN Yapılandırması' : 'Native VLAN Configuration',
      description: isTr
        ? 'İki switch arası native VLAN 99 trunk bağlantısı yapılandırılır.'
        : 'Native VLAN 99 trunk connection is configured between two switches.',
      detail: isTr
        ? 'SW1/SW2: vlan 99, Fa0/24 trunk, switchport trunk native vlan 99'
        : 'SW1/SW2: vlan 99, Fa0/24 trunk, switchport trunk native vlan 99',
      level: 'basic',
      data: baseProjectData(nativeVlanDevices, nativeVlanConnections, nativeVlanNotes, [
        { id: 'switch-1', state: nativeVlanSw1 },
        { id: 'switch-2', state: nativeVlanSw2 }
      ])
    },
    {
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
    },
    {
      id: 'l3-switch-2vlan',
      tag: isTr ? 'L3 VLAN' : 'L3 VLAN',
      title: isTr ? '2 L3 Switch VLAN (AG1/AG2)' : '2 L3 Switch VLAN (AG1/AG2)',
      description: isTr
        ? 'İki L3 switch SVI gateway ile VLAN 10 ve 20 arası routing sağlar.'
        : 'Two L3 switches provide routing between VLAN 10 and 20 via SVI gateways.',
      detail: isTr
        ? 'Switch2/4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1'
        : 'Switch2/4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1',
      level: 'advanced',
      data: baseProjectData(l3Switch2VlanDevices, l3Switch2VlanConnections, l3Switch2VlanNotes, [
        { id: 'switch2', state: l3Switch2State },
        { id: 'switch4', state: l3Switch4State }
      ])
    },
    {
      id: 'static-l3-routing',
      tag: isTr ? 'STATIK ROUTING' : 'STATIC ROUTING',
      title: isTr ? 'L3 Switch Statik Yönlendirme' : 'L3 Switch Static Routing',
      description: isTr
        ? 'Multilayer switchler ve router statik rotalarla ağlar arası iletişim sağlar.'
        : 'Multilayer switches and router enable inter-network communication via static routes.',
      detail: isTr
        ? 'ML1: ip route 192.168.2.0 255.255.255.0 10.0.0.2 | R3: ip route 192.168.1.0 255.255.255.0 10.0.0.1, ip route 192.168.2.0 255.255.255.0 20.0.0.2 | ML2: ip route 192.168.1.0 255.255.255.0 20.0.0.1'
        : 'ML1: ip route 192.168.2.0 255.255.255.0 10.0.0.2 | R3: ip route 192.168.1.0 255.255.255.0 10.0.0.1, ip route 192.168.2.0 255.255.255.0 20.0.0.2 | ML2: ip route 192.168.1.0 255.255.255.0 20.0.0.1',
      level: 'advanced',
      data: baseProjectData(staticL3RoutingDevices, staticL3RoutingConnections, staticL3RoutingNotes, [
        { id: 'switch0', state: switch0State },
        { id: 'mlswitch1', state: mlSwitch1State },
        { id: 'router3', state: router3State },
        { id: 'mlswitch2', state: mlSwitch2State },
        { id: 'switch1', state: switch1State }
      ])
    },
    {
      id: 'rip-dynamic-routing',
      tag: isTr ? 'RIP ROUTING' : 'RIP ROUTING',
      title: isTr ? 'RIP Dinamik Yönlendirme' : 'RIP Dynamic Routing',
      description: isTr
        ? 'RIP dinamik yönlendirme protokolü otomatik route öğrenimi sağlar.'
        : 'RIP dynamic routing protocol provides automatic route learning.',
      detail: isTr
        ? 'ML0: router rip, network 192.168.1.0, network 192.168.2.0 | ML1: router rip, network 192.168.2.0, network 192.168.3.0'
        : 'ML0: router rip, network 192.168.1.0, network 192.168.2.0 | ML1: router rip, network 192.168.2.0, network 192.168.3.0',
      level: 'advanced',
      data: baseProjectData(ripRoutingDevices, ripRoutingConnections, ripRoutingNotes, [
        { id: 'switch0-l2', state: switch0L2State },
        { id: 'mlswitch0', state: ripMlswitch0State },
        { id: 'mlswitch1', state: ripMlswitch1State },
        { id: 'switch3-l2', state: switch3L2State }
      ])
    },
    {
      id: 'acl-standard-basic',
      tag: 'ACL',
      title: isTr ? 'ACL Standard ' : 'ACL Standard ',
      description: isTr ? 'Standard ACL ile temel erişim kontrolü.' : 'Basic access control with standard ACL.',
      detail: isTr ? 'access-list 10 deny 192.168.1.0 0.0.0.255, access-list 10 permit any' : 'access-list 10 deny 192.168.1.0 0.0.0.255, access-list 10 permit any',
      level: 'intermediate',
      data: baseProjectData(staticL3RoutingDevices, staticL3RoutingConnections, staticL3RoutingNotes, [
        { id: 'switch0', state: switch0State },
        { id: 'mlswitch1', state: mlSwitch1State },
        { id: 'router3', state: router3State },
        { id: 'mlswitch2', state: mlSwitch2State },
        { id: 'switch1', state: switch1State }
      ])
    },
    {
      id: 'acl-extended-basic',
      tag: 'ACL',
      title: isTr ? 'ACL Extended ' : 'ACL Extended ',
      description: isTr ? 'Extended ACL ile protokol/port bazlı filtreleme.' : 'Protocol and port based filtering with extended ACL.',
      detail: isTr ? 'ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any' : 'ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any',
      level: 'advanced',
      data: baseProjectData(firewallBasicDevices, firewallBasicConnections, firewallBasicNotes, [])
    },
    {
      id: 'nat-static-basic',
      tag: 'NAT',
      title: isTr ? 'NAT Static ' : 'NAT Static ',
      description: isTr ? 'Static NAT ile birebir adres eşlemesi.' : 'One-to-one address mapping with static NAT.',
      detail: 'ip nat inside source static 192.168.1.10 203.0.113.10',
      level: 'intermediate',
      data: baseProjectData(routerDhcpDevices, routerDhcpConnections, routerDhcpNotes, [
        { id: 'router-1', state: routerDhcpR1 },
        { id: 'switch-1', state: routerDhcpSw1 }
      ])
    },
    {
      id: 'nat-dynamic-basic',
      tag: 'NAT',
      title: isTr ? 'NAT Dynamic ' : 'NAT Dynamic ',
      description: isTr ? 'NAT havuzu ile dinamik çeviri.' : 'Dynamic translation with NAT pool.',
      detail: 'ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0',
      level: 'advanced',
      data: baseProjectData(routerDhcpDevices, routerDhcpConnections, routerDhcpNotes, [
        { id: 'router-1', state: routerDhcpR1 },
        { id: 'switch-1', state: routerDhcpSw1 }
      ])
    },
    {
      id: 'nat-pat-basic',
      tag: 'NAT',
      title: isTr ? 'NAT PAT ' : 'NAT PAT ',
      description: isTr ? 'PAT (NAT overload) ile çoktan-bire çeviri.' : 'Many-to-one translation with PAT (NAT overload).',
      detail: 'ip nat inside source list 1 interface gi0/0 overload',
      level: 'advanced',
      data: baseProjectData(routerDhcpDevices, routerDhcpConnections, routerDhcpNotes, [
        { id: 'router-1', state: routerDhcpR1 },
        { id: 'switch-1', state: routerDhcpSw1 }
      ])
    },
    {
      id: 'hsrp-redundancy-basic',
      tag: 'HSRP',
      title: isTr ? 'HSRP Redundancy ' : 'HSRP Redundancy ',
      description: isTr ? 'Varsayılan ağ geçidi yedekliliği için HSRP.' : 'HSRP for default gateway redundancy.',
      detail: isTr ? 'standby 1 ip 192.168.10.254, standby 1 priority 110, standby 1 preempt' : 'standby 1 ip 192.168.10.254, standby 1 priority 110, standby 1 preempt',
      level: 'advanced',
      data: baseProjectData(l3Switch2VlanDevices, l3Switch2VlanConnections, l3Switch2VlanNotes, [
        { id: 'switch2', state: l3Switch2State },
        { id: 'switch4', state: l3Switch4State }
      ])
    },
    {
      id: 'ospf-multi-area-1',
      tag: 'OSPF',
      title: isTr ? 'OSPF Multi-Area ' : 'OSPF Multi-Area ',
      description: isTr ? 'Area 0 ve Area 10 ile çok alanlı OSPF.' : 'Multi-area OSPF with Area 0 and Area 10.',
      detail: 'router ospf 1, network 10.0.0.0 0.0.0.255 area 0, network 10.0.10.0 0.0.0.255 area 10',
      level: 'advanced',
      data: baseProjectData(staticL3RoutingDevices, staticL3RoutingConnections, staticL3RoutingNotes, [
        { id: 'switch0', state: switch0State },
        { id: 'mlswitch1', state: mlSwitch1State },
        { id: 'router3', state: router3State },
        { id: 'mlswitch2', state: mlSwitch2State },
        { id: 'switch1', state: switch1State }
      ])
    },
    {
      id: 'ospf-multi-area-2',
      tag: 'OSPF',
      title: isTr ? 'OSPF Multi-Area ' : 'OSPF Multi-Area ',
      description: isTr ? 'ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması.' : 'Connecting multiple OSPF areas to backbone via ABR.',
      detail: 'router ospf 1, area 20 stub, area 10 range 10.10.0.0 255.255.0.0',
      level: 'advanced',
      data: baseProjectData(staticL3RoutingDevices, staticL3RoutingConnections, staticL3RoutingNotes, [
        { id: 'switch0', state: switch0State },
        { id: 'mlswitch1', state: mlSwitch1State },
        { id: 'router3', state: router3State },
        { id: 'mlswitch2', state: mlSwitch2State },
        { id: 'switch1', state: switch1State }
      ])
    },
    {
      id: 'eigrp-basic-1',
      tag: 'EIGRP',
      title: isTr ? 'EIGRP Basic ' : 'EIGRP Basic ',
      description: isTr ? 'Temel EIGRP komutları ile dinamik yönlendirme kurulumu.' : 'Dynamic routing setup using basic EIGRP commands.',
      detail: 'router eigrp 100, network 192.168.1.0 0.0.0.255, no auto-summary',
      level: 'advanced',
      data: baseProjectData(ripRoutingDevices, ripRoutingConnections, ripRoutingNotes, [
        { id: 'switch0-l2', state: switch0L2State },
        { id: 'mlswitch0', state: ripMlswitch0State },
        { id: 'mlswitch1', state: ripMlswitch1State },
        { id: 'switch3-l2', state: switch3L2State }
      ])
    },
    {
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
    },
    {
      id: 'all-services-lab',
      tag: isTr ? 'SERVİSLER' : 'SERVICES',
      title: isTr ? 'Tüm Servisler Laboratuvarı (DNS, HTTP, FTP, MAIL, NTP, DHCP)' : 'All Services Lab (DNS, HTTP, FTP, MAIL, NTP, DHCP)',
      description: isTr
        ? 'PC\'ler üzerinde çalışan temel ağ servislerinin bir arada bulunduğu kapsamlı laboratuvar.'
        : 'A comprehensive lab featuring basic network services running on PCs.',
      detail: 'DNS: 1.10, HTTP: 1.20, DHCP: 1.30, FTP: 1.40, MAIL: 1.50, NTP: 1.60',
      level: 'intermediate',
      data: baseProjectData(servicesLabDevices, servicesLabConnections, servicesLabNotes, [])
    }
  ];
};

