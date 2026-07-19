import type { SwitchState } from '../types';
import type { CanvasDevice, CanvasConnection, CanvasNote, DeviceType } from '@/components/network/networkTopology.types';
import { generateRandomLinkLocalIpv4 } from '../linkLocal';
import type { FirewallRule, ProjectData } from './types';

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
    macAddress: baseMac,
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

export {
  deterministicMac,
  deterministicIpv6,
  createSwitchDevice,
  createL3SwitchDevice,
  createPcDevice,
  createRouterDevice,
  createIotDevice,
  createFirewallDevice,
  connectPorts,
  baseProjectData
};
