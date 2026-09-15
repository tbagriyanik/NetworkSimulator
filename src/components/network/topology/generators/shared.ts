import type { CanvasDevice, CanvasConnection } from '../../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import {
  generateSwitchPorts,
  generateL3SwitchPorts,
  generateRouterPorts,
  generatePCPorts,
  generateWLCPorts,
  generateFirewallPorts,
} from '../../networkTopology.portGenerators';

// ---------------------------------------------------------------------------
// Shared Pool & Types
// ---------------------------------------------------------------------------

export const MAC_POOL = [
  '0011.2233.4455', '0011.2233.4466', '0011.2233.4477', '0011.2233.4488',
  '0011.2233.4499', '0011.2233.44AA', '0011.2233.44BB', '0011.2233.44CC',
  '0011.2233.44DD', '0011.2233.44EE', '0011.2233.44FF', '0011.2233.5500',
  '0011.2233.5511', '0011.2233.5522', '0011.2233.5533', '0011.2233.5544',
];

export function getPortType(id: string): 'serial' | 'fastethernet' | 'gigabitethernet' {
  if (id.startsWith('s')) return 'serial';
  if (id.startsWith('gi')) return 'gigabitethernet';
  return 'fastethernet';
}

export interface GeneratedTopology {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
}

export interface Ctx {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  states: Map<string, SwitchState>;
}

export function newCtx(): Ctx {
  return { devices: [], connections: [], states: new Map() };
}

// ---------------------------------------------------------------------------
// Helper: create an L2 Switch
// ---------------------------------------------------------------------------
export function addSwitch(
  ctx: Ctx,
  id: string,
  name: string,
  mac: string,
  x: number,
  y: number,
  vlanDb: Record<string, string> = { '1': 'default' },
): { device: CanvasDevice; state: SwitchState } {
  const device: CanvasDevice = {
    id,
    type: 'switchL2',
    name,
    macAddress: mac,
    ip: '',
    x,
    y,
    status: 'online',
    switchModel: 'NS-L2-24TT-L',
    ports: generateSwitchPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'switchL2',
    hostname: name,
    macAddress: mac,
    switchModel: 'NS-L2-24TT-L',
    switchLayer: 'L2',
    currentMode: 'user',
    commandHistory: [],
    vlanDatabase: { ...vlanDb },
    ports: {},
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
    },
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id,
      name: p.label || p.id,
      vlan: 1,
      duplex: 'full',
      speed: '1000',
      type: getPortType(p.id),
      status: 'notconnect',
      shutdown: false,
      accessVlan: 1,
      mode: 'access',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create an L3 Switch
// ---------------------------------------------------------------------------
export function addL3Switch(
  ctx: Ctx,
  id: string,
  name: string,
  mac: string,
  x: number,
  y: number,
  vlanDb: Record<string, string> = { '1': 'default' },
  extras: Record<string, unknown> = {},
): { device: CanvasDevice; state: SwitchState } {
  const device: CanvasDevice = {
    id,
    type: 'switchL3',
    name,
    macAddress: mac,
    ip: '',
    x,
    y,
    status: 'online',
    switchModel: 'NS-L3-24PS',
    ports: generateL3SwitchPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'switchL3',
    hostname: name,
    macAddress: mac,
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    currentMode: 'user',
    commandHistory: [],
    vlanDatabase: { ...vlanDb },
    ports: {},
    ipRouting: true,
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
    },
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id,
      name: p.label || p.id,
      vlan: 1,
      duplex: 'full',
      speed: '1000',
      type: getPortType(p.id),
      status: 'notconnect',
      shutdown: false,
      accessVlan: 1,
      mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a router device + state
// ---------------------------------------------------------------------------
export function addRouter(
  ctx: Ctx,
  id: string,
  name: string,
  mac: string,
  x: number,
  y: number,
  extras: Record<string, unknown> = {},
): { device: CanvasDevice; state: SwitchState } {
  const device: CanvasDevice = {
    id,
    type: 'router',
    name,
    macAddress: mac,
    ip: '',
    x,
    y,
    status: 'online',
    ports: generateRouterPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'router',
    hostname: name,
    macAddress: mac,
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    currentMode: 'user',
    commandHistory: [],
    vlanDatabase: {},
    ports: {},
    ipRouting: true,
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
    },
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id,
      name: p.label || p.id,
      vlan: 1,
      duplex: 'full',
      speed: '1000',
      type: getPortType(p.id),
      status: 'notconnect',
      shutdown: false,
      accessVlan: 1,
      mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a Firewall device
// ---------------------------------------------------------------------------
export function addFirewall(
  ctx: Ctx,
  id: string,
  name: string,
  mac: string,
  x: number,
  y: number,
  extras: Record<string, unknown> = {},
): { device: CanvasDevice; state: SwitchState } {
  const device: CanvasDevice = {
    id,
    type: 'firewall',
    name,
    macAddress: mac,
    ip: '',
    x,
    y,
    status: 'online',
    ports: generateFirewallPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'firewall',
    hostname: name,
    macAddress: mac,
    currentMode: 'user',
    commandHistory: [],
    ports: {},
    ipRouting: true,
    firewallRules: [
      { id: 'rule-1', action: 'permit', protocol: 'tcp', srcIp: 'any', dstIp: 'any', dstPort: '80', desc: 'Permit HTTP' },
      { id: 'rule-2', action: 'permit', protocol: 'tcp', srcIp: 'any', dstIp: 'any', dstPort: '443', desc: 'Permit HTTPS' },
      { id: 'rule-3', action: 'permit', protocol: 'icmp', srcIp: '192.168.1.0/24', dstIp: 'any', desc: 'Internal ICMP' },
    ],
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id,
      name: p.label || p.id,
      vlan: 1,
      duplex: 'full',
      speed: '1000',
      type: 'gigabitethernet',
      status: 'notconnect',
      shutdown: false,
      mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a Wireless LAN Controller (WLC) device
// ---------------------------------------------------------------------------
export function addWlc(
  ctx: Ctx,
  id: string,
  name: string,
  mac: string,
  x: number,
  y: number,
  ip: string = '192.168.1.5',
  gateway: string = '192.168.1.1',
  extras: Record<string, unknown> = {},
): { device: CanvasDevice; state: SwitchState } {
  const device: CanvasDevice = {
    id,
    type: 'wlc',
    name,
    macAddress: mac,
    ip,
    subnet: '255.255.255.0',
    gateway,
    x,
    y,
    status: 'online',
    ports: generateWLCPorts(),
    services: { http: { enabled: true, mode: 'simple', content: `<h1>${name} Controller Web Console</h1>` } },
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'wlc',
    hostname: name,
    macAddress: mac,
    currentMode: 'user',
    commandHistory: [],
    ports: {},
    ipRouting: false,
    services: { http: { enabled: true, mode: 'simple', content: `<h1>${name} Controller Web Console</h1>` } },
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id,
      name: p.label || p.id,
      vlan: 1,
      duplex: 'full',
      speed: '1000',
      type: 'gigabitethernet',
      status: 'notconnect',
      shutdown: false,
      mode: 'access',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a PC and connect to a switch
// ---------------------------------------------------------------------------
export function addPcToSwitch(
  ctx: Ctx,
  pcIndex: number,
  ip: string,
  gateway: string,
  dns: string,
  switchId: string,
  switchState: SwitchState,
  swPort: string,
  x: number,
  y: number,
  extras: Partial<CanvasDevice> = {},
): CanvasDevice {
  const pcId = `pc-${pcIndex}`;
  const pcPorts = generatePCPorts();
  pcPorts[0].status = 'connected';
  pcPorts[0].shutdown = false;
  const pc: CanvasDevice = {
    id: pcId,
    type: 'pc',
    name: `PC-${pcIndex}`,
    macAddress: MAC_POOL[(pcIndex - 1) % MAC_POOL.length],
    ip,
    subnet: '255.255.255.0',
    gateway,
    dns,
    ipConfigMode: 'static',
    x,
    y,
    status: 'online',
    ports: pcPorts,
    services: {
      http: { enabled: true, mode: 'simple', content: `<h1>Welcome to PC-${pcIndex} Web Server</h1>` },
    },
    ...extras,
  };
  ctx.devices.push(pc);
  ctx.connections.push({
    id: `conn-pc-${pcIndex}`,
    sourceDeviceId: pcId,
    sourcePort: 'eth0',
    targetDeviceId: switchId,
    targetPort: swPort,
    cableType: 'straight',
    active: true,
  });
  if (switchState.ports[swPort]) {
    switchState.ports[swPort].status = 'connected';
    switchState.ports[swPort].shutdown = false;
  }
  return pc;
}

// ---------------------------------------------------------------------------
// Helper: connect two devices
// ---------------------------------------------------------------------------
export function connect(
  ctx: Ctx,
  connId: string,
  srcId: string,
  srcPort: string,
  srcState: SwitchState | null,
  dstId: string,
  dstPort: string,
  dstState: SwitchState | null,
  cableType: 'straight' | 'crossover' | 'serial' | 'fiber' | 'wireless' = 'straight',
) {
  ctx.connections.push({
    id: connId,
    sourceDeviceId: srcId,
    sourcePort: srcPort,
    targetDeviceId: dstId,
    targetPort: dstPort,
    cableType,
    active: true,
  });
  if (srcState?.ports?.[srcPort]) {
    srcState.ports[srcPort].status = 'connected';
    srcState.ports[srcPort].shutdown = false;
  }
  if (dstState?.ports?.[dstPort]) {
    dstState.ports[dstPort].status = 'connected';
    dstState.ports[dstPort].shutdown = false;
  }
}

// ---------------------------------------------------------------------------
// Enable a router/switch port with IP
// ---------------------------------------------------------------------------
export function enableRouterPort(state: SwitchState, portId: string, ip?: string, mask?: string) {
  if (state.ports[portId]) {
    state.ports[portId].shutdown = false;
    if (ip) state.ports[portId].ipAddress = ip;
    if (mask) state.ports[portId].subnetMask = mask;
  }
}
