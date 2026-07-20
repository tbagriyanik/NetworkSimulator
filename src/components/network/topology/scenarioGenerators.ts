/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ScenarioType } from './topologyScenarios';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { generateSwitchPorts, generateRouterPorts } from '../networkTopology.portGenerators';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const MAC_POOL = [
  '0011.2233.4455', '0011.2233.4466', '0011.2233.4477', '0011.2233.4488',
  '0011.2233.4499', '0011.2233.44AA', '0011.2233.44BB', '0011.2233.44CC',
];

function getPortType(id: string): 'serial' | 'fastethernet' | 'gigabitethernet' {
  if (id.startsWith('s')) return 'serial';
  if (id.startsWith('gi')) return 'gigabitethernet';
  return 'fastethernet';
}

export interface GeneratedTopology {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
}

interface Ctx {
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  states: Map<string, any>;
}

function newCtx(): Ctx {
  return { devices: [], connections: [], states: new Map() };
}

// ---------------------------------------------------------------------------
// Helper: create a switch device + state and push into ctx
// ---------------------------------------------------------------------------
function addSwitch(
  ctx: Ctx, id: string, name: string, mac: string, x: number, y: number,
  vlanDb: Record<string, string> = { '1': 'default' },
): { device: CanvasDevice; state: any } {
  const device: CanvasDevice = {
    id, type: 'switchL2', name, macAddress: mac, ip: '', x, y,
    status: 'online', switchModel: 'WS-C2960-24TT-L', ports: generateSwitchPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'switchL2', hostname: name, macAddress: mac,
    switchModel: 'WS-C2960-24TT-L', switchLayer: 'L2',
    currentMode: 'user', commandHistory: [], vlanDatabase: { ...vlanDb }, ports: {},
  } as any;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id, type: getPortType(p.id), status: 'notconnect',
      shutdown: false, accessVlan: 1, mode: 'access',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a router device + state and push into ctx
// ---------------------------------------------------------------------------
function addRouter(
  ctx: Ctx, id: string, name: string, mac: string, x: number, y: number,
  extras: Record<string, any> = {},
): { device: CanvasDevice; state: any } {
  const device: CanvasDevice = {
    id, type: 'router', name, macAddress: mac, ip: '', x, y,
    status: 'online', ports: generateRouterPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'router', hostname: name, macAddress: mac,
    switchModel: 'WS-C3650-24PS', switchLayer: 'L3',
    currentMode: 'user', commandHistory: [], vlanDatabase: {}, ports: {},
    ipRouting: true, ...extras,
  } as any;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id, type: getPortType(p.id), status: 'notconnect',
      shutdown: true, accessVlan: 1, mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a PC and connect to a switch
// ---------------------------------------------------------------------------
function addPcToSwitch(
  ctx: Ctx, pcIndex: number, ip: string, gateway: string, dns: string,
  switchId: string, switchState: any, swPort: string,
  x: number, y: number,
  extras: Partial<CanvasDevice> = {},
): CanvasDevice {
  const pcId = `pc-${pcIndex}`;
  const pc: CanvasDevice = {
    id: pcId, type: 'pc', name: `PC-${pcIndex}`,
    macAddress: MAC_POOL[(pcIndex - 1) % MAC_POOL.length],
    ip, subnet: '255.255.255.0', gateway, dns,
    ipConfigMode: 'static', x, y, status: 'online',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
    ...extras,
  };
  ctx.devices.push(pc);
  ctx.connections.push({
    id: `conn-pc-${pcIndex}`, sourceDeviceId: pcId, sourcePort: 'eth0',
    targetDeviceId: switchId, targetPort: swPort, cableType: 'straight', active: true,
  });
  if (switchState.ports[swPort]) switchState.ports[swPort].status = 'connected';
  return pc;
}

// ---------------------------------------------------------------------------
// Helper: connect two devices
// ---------------------------------------------------------------------------
function connect(
  ctx: Ctx, connId: string,
  srcId: string, srcPort: string, srcState: any,
  dstId: string, dstPort: string, dstState: any,
  cableType: 'straight' | 'crossover' | 'serial' | 'fiber' = 'straight',
) {
  ctx.connections.push({
    id: connId, sourceDeviceId: srcId, sourcePort: srcPort,
    targetDeviceId: dstId, targetPort: dstPort, cableType, active: true,
  });
  if (srcState?.ports?.[srcPort]) srcState.ports[srcPort].status = 'connected';
  if (dstState?.ports?.[dstPort]) dstState.ports[dstPort].status = 'connected';
}

// ---------------------------------------------------------------------------
// Enable a router port with IP
// ---------------------------------------------------------------------------
function enableRouterPort(state: any, portId: string, ip?: string, mask?: string) {
  if (state.ports[portId]) {
    state.ports[portId].shutdown = false;
    if (ip) state.ports[portId].ipAddress = ip;
    if (mask) state.ports[portId].subnetMask = mask;
  }
}

// ===========================================================================
// 1. SOHO (DHCP)
// ===========================================================================
function generateSoho(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: rState } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 50, {
    dhcpPools: {
      'LAN-POOL': { network: '192.168.1.0', subnetMask: '255.255.255.0', defaultRouter: '192.168.1.1', dnsServer: '8.8.8.8' },
    },
  });
  enableRouterPort(rState, 'gi0/0', '192.168.1.1', '255.255.255.0');

  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 240);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', rState, 'switch-1', 'fa0/1', swState);

  const startX = 350 - ((pcCount - 1) * 140) / 2;
  for (let i = 0; i < pcCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.10${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 2}`, startX + i * 140, 420,
      { ipConfigMode: 'dhcp' });
  }
  return ctx;
}

// ===========================================================================
// 2. Static Routing
// ===========================================================================
function generateStaticRouting(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: r1s } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 200, 80, {
    staticRoutes: [{ destination: '192.168.2.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.2' }],
  });
  enableRouterPort(r1s, 'gi0/0', '192.168.1.1', '255.255.255.0');
  enableRouterPort(r1s, 's0/0/0', '10.0.0.1', '255.255.255.252');

  const { state: r2s } = addRouter(ctx, 'router-2', 'R2', '0011.2233.9902', 650, 80, {
    staticRoutes: [{ destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '10.0.0.1' }],
  });
  enableRouterPort(r2s, 'gi0/0', '192.168.2.1', '255.255.255.0');
  enableRouterPort(r2s, 's0/0/0', '10.0.0.2', '255.255.255.252');

  connect(ctx, 'conn-r1-r2-serial', 'router-1', 's0/0/0', r1s, 'router-2', 's0/0/0', r2s, 'serial');

  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 250);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 250);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', r1s, 'switch-1', 'fa0/1', sw1s);
  connect(ctx, 'conn-r2-sw2', 'router-2', 'gi0/0', r2s, 'switch-2', 'fa0/1', sw2s);

  const half = Math.max(1, Math.floor(pcCount / 2));
  for (let i = 0; i < half; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', sw1s, `fa0/${i + 2}`, 80 + i * 140, 420);
  }
  const offset = half;
  for (let i = 0; i < Math.max(1, Math.ceil(pcCount / 2)); i++) {
    addPcToSwitch(ctx, offset + i + 1, `192.168.2.1${i}`, '192.168.2.1', '8.8.8.8',
      'switch-2', sw2s, `fa0/${i + 2}`, 580 + i * 140, 420);
  }
  return ctx;
}

// ===========================================================================
// 3. ROAS (Inter-VLAN)
// ===========================================================================
function generateRoas(): Ctx {
  const ctx = newCtx();
  const { state: rState } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 50);
  enableRouterPort(rState, 'gi0/0');
  rState.ports['gi0/0.10'] = {
    id: 'gi0/0.10', type: getPortType('gi0/0.10'), status: 'connected', shutdown: false,
    accessVlan: 10, mode: 'routed', ipAddress: '192.168.10.1', subnetMask: '255.255.255.0',
  };
  rState.ports['gi0/0.20'] = {
    id: 'gi0/0.20', type: getPortType('gi0/0.20'), status: 'connected', shutdown: false,
    accessVlan: 20, mode: 'routed', ipAddress: '192.168.20.1', subnetMask: '255.255.255.0',
  };

  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 240,
    { '1': 'default', '10': 'Sales', '20': 'Marketing' });
  swState.ports['fa0/1'].mode = 'trunk';
  swState.ports['fa0/2'].accessVlan = 10;
  swState.ports['fa0/3'].accessVlan = 20;

  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', rState, 'switch-1', 'fa0/1', swState);

  addPcToSwitch(ctx, 1, '192.168.10.10', '192.168.10.1', '8.8.8.8',
    'switch-1', swState, 'fa0/2', 200, 420, { vlan: 10 });
  addPcToSwitch(ctx, 2, '192.168.20.10', '192.168.20.1', '8.8.8.8',
    'switch-1', swState, 'fa0/3', 500, 420, { vlan: 20 });
  return ctx;
}

// ===========================================================================
// 4. OSPF (Dynamic)
// ===========================================================================
function generateOspf(pcCount: number): Ctx {
  const ctx = newCtx();
  const ospfExtras = (rid: string, nets: any[]) => ({
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: rid, dynamicRoutes: nets,
  });
  const { state: r1s } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 200, 80,
    ospfExtras('1.1.1.1', [
      { destination: '192.168.1.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r1s, 'gi0/0', '192.168.1.1', '255.255.255.0');
  enableRouterPort(r1s, 's0/0/0', '10.0.0.1', '255.255.255.252');

  const { state: r2s } = addRouter(ctx, 'router-2', 'R2', '0011.2233.9902', 650, 80,
    ospfExtras('2.2.2.2', [
      { destination: '192.168.2.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r2s, 'gi0/0', '192.168.2.1', '255.255.255.0');
  enableRouterPort(r2s, 's0/0/0', '10.0.0.2', '255.255.255.252');

  connect(ctx, 'conn-r1-r2-serial', 'router-1', 's0/0/0', r1s, 'router-2', 's0/0/0', r2s, 'serial');

  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 250);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 250);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', r1s, 'switch-1', 'fa0/1', sw1s);
  connect(ctx, 'conn-r2-sw2', 'router-2', 'gi0/0', r2s, 'switch-2', 'fa0/1', sw2s);

  const half = Math.max(1, Math.floor(pcCount / 2));
  for (let i = 0; i < half; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', sw1s, `fa0/${i + 2}`, 80 + i * 140, 420);
  }
  const offset = half;
  for (let i = 0; i < Math.max(1, Math.ceil(pcCount / 2)); i++) {
    addPcToSwitch(ctx, offset + i + 1, `192.168.2.1${i}`, '192.168.2.1', '8.8.8.8',
      'switch-2', sw2s, `fa0/${i + 2}`, 580 + i * 140, 420);
  }
  return ctx;
}

// ===========================================================================
// 5. VLAN & Trunk
// ===========================================================================
function generateVlanTrunk(pcCount: number): Ctx {
  const ctx = newCtx();
  const vlanDb = { '1': 'default', '10': 'Sales', '20': 'HR' };
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 120, vlanDb);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 120, vlanDb);

  // Trunk link between switches on gi0/1
  sw1s.ports['gi0/1'].mode = 'trunk';
  sw2s.ports['gi0/1'].mode = 'trunk';
  connect(ctx, 'conn-sw1-sw2-trunk', 'switch-1', 'gi0/1', sw1s, 'switch-2', 'gi0/1', sw2s, 'crossover');

  const half = Math.max(1, Math.floor(pcCount / 2));
  for (let i = 0; i < half; i++) {
    const vlan = i % 2 === 0 ? 10 : 20;
    const ip = vlan === 10 ? `192.168.10.1${i}` : `192.168.20.1${i}`;
    const gw = vlan === 10 ? '192.168.10.1' : '192.168.20.1';
    const port = `fa0/${i + 1}`;
    sw1s.ports[port].accessVlan = vlan;
    addPcToSwitch(ctx, i + 1, ip, gw, '8.8.8.8',
      'switch-1', sw1s, port, 80 + i * 140, 310, { vlan });
  }
  const offset = half;
  for (let i = 0; i < Math.max(1, Math.ceil(pcCount / 2)); i++) {
    const vlan = i % 2 === 0 ? 10 : 20;
    const ip = vlan === 10 ? `192.168.10.2${i}` : `192.168.20.2${i}`;
    const gw = vlan === 10 ? '192.168.10.1' : '192.168.20.1';
    const port = `fa0/${i + 1}`;
    sw2s.ports[port].accessVlan = vlan;
    addPcToSwitch(ctx, offset + i + 1, ip, gw, '8.8.8.8',
      'switch-2', sw2s, port, 580 + i * 140, 310, { vlan });
  }
  return ctx;
}

// ===========================================================================
// 6. EtherChannel (LACP)
// ===========================================================================
function generateEtherChannel(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 120);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 120);

  // EtherChannel: fa0/23 + fa0/24 bundled as Port-channel1 (LACP active)
  sw1s.ports['fa0/23'].mode = 'trunk';
  sw1s.ports['fa0/24'].mode = 'trunk';
  sw2s.ports['fa0/23'].mode = 'trunk';
  sw2s.ports['fa0/24'].mode = 'trunk';
  sw1s.channelGroups = { '1': { ports: ['fa0/23', 'fa0/24'], protocol: 'lacp', mode: 'active' } };
  sw2s.channelGroups = { '1': { ports: ['fa0/23', 'fa0/24'], protocol: 'lacp', mode: 'active' } };

  connect(ctx, 'conn-ec-1', 'switch-1', 'fa0/23', sw1s, 'switch-2', 'fa0/23', sw2s, 'crossover');
  connect(ctx, 'conn-ec-2', 'switch-1', 'fa0/24', sw1s, 'switch-2', 'fa0/24', sw2s, 'crossover');

  const half = Math.max(1, Math.floor(pcCount / 2));
  for (let i = 0; i < half; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', sw1s, `fa0/${i + 1}`, 80 + i * 140, 310);
  }
  const offset = half;
  for (let i = 0; i < Math.max(1, Math.ceil(pcCount / 2)); i++) {
    addPcToSwitch(ctx, offset + i + 1, `192.168.1.2${i}`, '192.168.1.1', '8.8.8.8',
      'switch-2', sw2s, `fa0/${i + 1}`, 580 + i * 140, 310);
  }
  return ctx;
}

// ===========================================================================
// 7. Triangle Topology (3 Routers, OSPF)
// ===========================================================================
function generateTriangle(pcCount: number): Ctx {
  const ctx = newCtx();
  const ospfExtras = (rid: string, nets: any[]) => ({
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: rid, dynamicRoutes: nets,
  });

  // R1 top-center
  const { state: r1s } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 400, 40,
    ospfExtras('1.1.1.1', [
      { destination: '192.168.1.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.1.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.2.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r1s, 'gi0/0', '192.168.1.1', '255.255.255.0');
  enableRouterPort(r1s, 's0/0/0', '10.0.1.1', '255.255.255.252');
  enableRouterPort(r1s, 's0/1/0', '10.0.2.1', '255.255.255.252');

  // R2 bottom-left
  const { state: r2s } = addRouter(ctx, 'router-2', 'R2', '0011.2233.9902', 150, 250,
    ospfExtras('2.2.2.2', [
      { destination: '192.168.2.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.1.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.3.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r2s, 'gi0/0', '192.168.2.1', '255.255.255.0');
  enableRouterPort(r2s, 's0/0/0', '10.0.1.2', '255.255.255.252');
  enableRouterPort(r2s, 's0/1/0', '10.0.3.1', '255.255.255.252');

  // R3 bottom-right
  const { state: r3s } = addRouter(ctx, 'router-3', 'R3', '0011.2233.9903', 650, 250,
    ospfExtras('3.3.3.3', [
      { destination: '192.168.3.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.2.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.3.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r3s, 'gi0/0', '192.168.3.1', '255.255.255.0');
  enableRouterPort(r3s, 's0/0/0', '10.0.2.2', '255.255.255.252');
  enableRouterPort(r3s, 's0/1/0', '10.0.3.2', '255.255.255.252');

  // Serial connections: R1-R2, R1-R3, R2-R3
  connect(ctx, 'conn-r1-r2', 'router-1', 's0/0/0', r1s, 'router-2', 's0/0/0', r2s, 'serial');
  connect(ctx, 'conn-r1-r3', 'router-1', 's0/1/0', r1s, 'router-3', 's0/0/0', r3s, 'serial');
  connect(ctx, 'conn-r2-r3', 'router-2', 's0/1/0', r2s, 'router-3', 's0/1/0', r3s, 'serial');

  // Switches
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 400, 180);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 150, 390);
  const { state: sw3s } = addSwitch(ctx, 'switch-3', 'SW3', '0011.2233.8803', 650, 390);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', r1s, 'switch-1', 'fa0/1', sw1s);
  connect(ctx, 'conn-r2-sw2', 'router-2', 'gi0/0', r2s, 'switch-2', 'fa0/1', sw2s);
  connect(ctx, 'conn-r3-sw3', 'router-3', 'gi0/0', r3s, 'switch-3', 'fa0/1', sw3s);

  // Distribute PCs across 3 switches
  const perSw = Math.max(1, Math.floor(pcCount / 3));
  let idx = 1;
  for (let i = 0; i < perSw; i++) {
    addPcToSwitch(ctx, idx, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', sw1s, `fa0/${i + 2}`, 340 + i * 140, 310);
    idx++;
  }
  for (let i = 0; i < perSw; i++) {
    addPcToSwitch(ctx, idx, `192.168.2.1${i}`, '192.168.2.1', '8.8.8.8',
      'switch-2', sw2s, `fa0/${i + 2}`, 60 + i * 140, 510);
    idx++;
  }
  const remaining = Math.max(1, pcCount - 2 * perSw);
  for (let i = 0; i < remaining; i++) {
    addPcToSwitch(ctx, idx, `192.168.3.1${i}`, '192.168.3.1', '8.8.8.8',
      'switch-3', sw3s, `fa0/${i + 2}`, 580 + i * 140, 510);
    idx++;
  }
  return ctx;
}

// ===========================================================================
// 8. NAT / PAT
// ===========================================================================
function generateNat(pcCount: number): Ctx {
  const ctx = newCtx();
  // Edge Router (does NAT)
  const { state: r1s } = addRouter(ctx, 'router-1', 'R1-Edge', '0011.2233.9901', 350, 140, {
    natConfig: {
      insideInterface: 'gi0/0',
      outsideInterface: 'gi0/1',
      accessList: '1',
      overload: true,
    },
    accessLists: { '1': { type: 'standard', entries: [{ action: 'permit', source: '192.168.1.0', wildcard: '0.0.0.255' }] } },
  });
  enableRouterPort(r1s, 'gi0/0', '192.168.1.1', '255.255.255.0');
  enableRouterPort(r1s, 'gi0/1', '203.0.113.1', '255.255.255.0');

  // ISP Router
  const { state: r2s } = addRouter(ctx, 'router-2', 'ISP', '0011.2233.9902', 350, 40, {
    staticRoutes: [{ destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '203.0.113.1' }],
  });
  enableRouterPort(r2s, 'gi0/0', '203.0.113.2', '255.255.255.0');

  connect(ctx, 'conn-r1-isp', 'router-1', 'gi0/1', r1s, 'router-2', 'gi0/0', r2s);

  // LAN switch
  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 260);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', r1s, 'switch-1', 'fa0/1', swState);

  const startX = 350 - ((pcCount - 1) * 140) / 2;
  for (let i = 0; i < pcCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 2}`, startX + i * 140, 420);
  }
  return ctx;
}

// ===========================================================================
// 9. ACL (Access Control List)
// ===========================================================================
function generateAcl(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: rState } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 50, {
    accessLists: {
      '100': {
        type: 'extended',
        name: 'FILTER',
        entries: [
          { action: 'permit', protocol: 'tcp', source: 'any', destination: '192.168.1.0 0.0.0.255', port: 'eq 80' },
          { action: 'deny', protocol: 'icmp', source: 'any', destination: 'any' },
          { action: 'permit', protocol: 'ip', source: 'any', destination: 'any' },
        ],
      },
    },
  });
  enableRouterPort(rState, 'gi0/0', '192.168.1.1', '255.255.255.0');

  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 240);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', rState, 'switch-1', 'fa0/1', swState);

  const startX = 350 - ((pcCount - 1) * 140) / 2;
  for (let i = 0; i < pcCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 2}`, startX + i * 140, 420);
  }
  return ctx;
}

// ===========================================================================
// 10. Port Security
// ===========================================================================
function generatePortSecurity(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 120);

  // Enable port security on access ports
  for (let i = 1; i <= pcCount; i++) {
    const portId = `fa0/${i}`;
    if (swState.ports[portId]) {
      swState.ports[portId].portSecurity = {
        enabled: true,
        maximum: 1,
        violation: 'shutdown',
        stickyEnabled: true,
      };
    }
  }

  const startX = 350 - ((pcCount - 1) * 140) / 2;
  for (let i = 0; i < pcCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 1}`, startX + i * 140, 310);
  }
  return ctx;
}

// ===========================================================================
// 11. STP (Spanning Tree)
// ===========================================================================
function generateStp(pcCount: number): Ctx {
  const ctx = newCtx();
  // Triangle of 3 switches
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 400, 150);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 150, 380);
  const { state: sw3s } = addSwitch(ctx, 'switch-3', 'SW3', '0011.2233.8803', 650, 380);

  // SW1 is root bridge
  sw1s.spanningTreeMode = 'pvst';
  sw1s.spanningTreePriority = 4096;
  sw2s.spanningTreeMode = 'pvst';
  sw3s.spanningTreeMode = 'pvst';

  // Triangle connections (gi ports for inter-switch)
  sw1s.ports['gi0/1'].mode = 'trunk';
  sw1s.ports['gi0/2'].mode = 'trunk';
  sw2s.ports['gi0/1'].mode = 'trunk';
  sw2s.ports['gi0/2'].mode = 'trunk';
  sw3s.ports['gi0/1'].mode = 'trunk';
  sw3s.ports['gi0/2'].mode = 'trunk';

  connect(ctx, 'conn-sw1-sw2', 'switch-1', 'gi0/1', sw1s, 'switch-2', 'gi0/1', sw2s, 'crossover');
  connect(ctx, 'conn-sw1-sw3', 'switch-1', 'gi0/2', sw1s, 'switch-3', 'gi0/1', sw3s, 'crossover');
  connect(ctx, 'conn-sw2-sw3', 'switch-2', 'gi0/2', sw2s, 'switch-3', 'gi0/2', sw3s, 'crossover');

  // Distribute PCs
  const perSw = Math.max(1, Math.floor(pcCount / 3));
  let idx = 1;
  for (let i = 0; i < perSw; i++) {
    addPcToSwitch(ctx, idx, `192.168.1.${10 + idx}`, '192.168.1.1', '8.8.8.8',
      'switch-1', sw1s, `fa0/${i + 1}`, 340 + i * 140, 50);
    idx++;
  }
  for (let i = 0; i < perSw; i++) {
    addPcToSwitch(ctx, idx, `192.168.1.${10 + idx}`, '192.168.1.1', '8.8.8.8',
      'switch-2', sw2s, `fa0/${i + 1}`, 60 + i * 140, 530);
    idx++;
  }
  const remaining = Math.max(1, pcCount - 2 * perSw);
  for (let i = 0; i < remaining; i++) {
    addPcToSwitch(ctx, idx, `192.168.1.${10 + idx}`, '192.168.1.1', '8.8.8.8',
      'switch-3', sw3s, `fa0/${i + 1}`, 580 + i * 140, 530);
    idx++;
  }
  return ctx;
}

// ===========================================================================
// 12. Wireless Network
// ===========================================================================
function generateWireless(pcCount: number): Ctx {
  const ctx = newCtx();
  // Router
  const { state: rState } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 40, {
    dhcpPools: {
      'WIFI-POOL': { network: '192.168.1.0', subnetMask: '255.255.255.0', defaultRouter: '192.168.1.1', dnsServer: '8.8.8.8' },
    },
  });
  enableRouterPort(rState, 'gi0/0', '192.168.1.1', '255.255.255.0');

  // Switch
  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 200);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', rState, 'switch-1', 'fa0/1', swState);

  // Access Point (router device with wifi config)
  const apId = 'router-ap';
  const ap: CanvasDevice = {
    id: apId, type: 'router', name: 'AP-1',
    macAddress: '0011.2233.AA01', ip: '192.168.1.2', subnet: '255.255.255.0',
    gateway: '192.168.1.1', x: 600, y: 200, status: 'online',
    ports: generateRouterPorts(),
    wifi: {
      enabled: true, ssid: 'NetSim-WiFi', bssid: '0011.2233.AA01',
      security: 'wpa2', password: 'netsim', channel: '2.4GHz',
      mode: 'ap', hidden: false, maxClients: 10,
    },
  };
  ctx.devices.push(ap);

  const apState = {
    deviceType: 'router', hostname: 'AP-1', macAddress: '0011.2233.AA01',
    switchModel: 'WS-C3650-24PS', switchLayer: 'L3',
    currentMode: 'user', commandHistory: [], vlanDatabase: {}, ports: {},
    ipRouting: false,
  } as any;
  ap.ports.forEach(p => {
    apState.ports[p.id] = {
      id: p.id, type: getPortType(p.id), status: 'notconnect',
      shutdown: p.id === 'gi0/0' ? false : true, accessVlan: 1, mode: 'routed',
    };
    if (p.id === 'gi0/0') {
      apState.ports[p.id].ipAddress = '192.168.1.2';
      apState.ports[p.id].subnetMask = '255.255.255.0';
    }
    if (p.id === 'wlan0') {
      apState.ports[p.id].shutdown = false;
      apState.ports[p.id].wifi = {
        ssid: 'NetSim-WiFi', security: 'wpa2', password: 'netsim',
        channel: '2.4GHz', mode: 'ap',
      };
    }
  });
  ctx.states.set(apId, apState);

  // Connect AP to switch
  connect(ctx, 'conn-ap-sw1', apId, 'gi0/0', apState, 'switch-1', 'fa0/2', swState);

  // Wired PCs
  const wiredCount = Math.max(1, Math.floor(pcCount / 2));
  const wirelessCount = Math.max(1, Math.ceil(pcCount / 2));
  for (let i = 0; i < wiredCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 3}`, 180 + i * 140, 380,
      { ipConfigMode: 'dhcp' });
  }
  // Wireless PCs (not physically connected with cable - just placed near AP)
  for (let i = 0; i < wirelessCount; i++) {
    const pcIdx = wiredCount + i + 1;
    const pc: CanvasDevice = {
      id: `pc-${pcIdx}`, type: 'pc', name: `PC-${pcIdx}`,
      macAddress: MAC_POOL[(pcIdx - 1) % MAC_POOL.length],
      ip: `192.168.1.2${i}`, subnet: '255.255.255.0',
      gateway: '192.168.1.1', dns: '8.8.8.8',
      ipConfigMode: 'dhcp', x: 560 + i * 140, y: 380,
      status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'disconnected' },
      { id: 'wlan0', label: 'WLAN0', status: 'connected' }],
    };
    ctx.devices.push(pc);
  }
  return ctx;
}

// ===========================================================================
// Main dispatcher
// ===========================================================================
export function generateTopology(scenario: ScenarioType, pcCount: number): GeneratedTopology {
  let ctx: Ctx;
  switch (scenario) {
    case 'soho': ctx = generateSoho(pcCount); break;
    case 'routing': ctx = generateStaticRouting(pcCount); break;
    case 'roas': ctx = generateRoas(); break;
    case 'ospf': ctx = generateOspf(pcCount); break;
    case 'vlan-trunk': ctx = generateVlanTrunk(pcCount); break;
    case 'etherchannel': ctx = generateEtherChannel(pcCount); break;
    case 'triangle': ctx = generateTriangle(pcCount); break;
    case 'nat': ctx = generateNat(pcCount); break;
    case 'acl': ctx = generateAcl(pcCount); break;
    case 'port-security': ctx = generatePortSecurity(pcCount); break;
    case 'stp': ctx = generateStp(pcCount); break;
    case 'wireless': ctx = generateWireless(pcCount); break;
    default: ctx = generateSoho(pcCount);
  }
  return {
    devices: ctx.devices,
    connections: ctx.connections,
    deviceStates: ctx.states as Map<string, SwitchState>,
  };
}
