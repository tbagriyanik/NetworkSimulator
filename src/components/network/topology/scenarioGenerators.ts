import type { ScenarioType } from './topologyScenarios';
import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import {
  generateSwitchPorts,
  generateL3SwitchPorts,
  generateRouterPorts,
  generatePCPorts,
  generateWLCPorts,
  generateFirewallPorts
} from '../networkTopology.portGenerators';

// ---------------------------------------------------------------------------
// Shared helpers & Pool
// ---------------------------------------------------------------------------

const MAC_POOL = [
  '0011.2233.4455', '0011.2233.4466', '0011.2233.4477', '0011.2233.4488',
  '0011.2233.4499', '0011.2233.44AA', '0011.2233.44BB', '0011.2233.44CC',
  '0011.2233.44DD', '0011.2233.44EE', '0011.2233.44FF', '0011.2233.5500',
  '0011.2233.5511', '0011.2233.5522', '0011.2233.5533', '0011.2233.5544',
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
// Helper: create an L2 Switch
// ---------------------------------------------------------------------------
function addSwitch(
  ctx: Ctx, id: string, name: string, mac: string, x: number, y: number,
  vlanDb: Record<string, string> = { '1': 'default' },
): { device: CanvasDevice; state: any } {
  const device: CanvasDevice = {
    id, type: 'switchL2', name, macAddress: mac, ip: '', x, y,
    status: 'online', switchModel: 'NS-L2-24TT-L', ports: generateSwitchPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'switchL2', hostname: name, macAddress: mac,
    switchModel: 'NS-L2-24TT-L', switchLayer: 'L2',
    currentMode: 'user', commandHistory: [], vlanDatabase: { ...vlanDb }, ports: {},
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } }
    },
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id, name: p.label || p.id, vlan: 1, duplex: 'full', speed: '1000', type: getPortType(p.id), status: 'notconnect',
      shutdown: false, accessVlan: 1, mode: 'access',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create an L3 Switch
// ---------------------------------------------------------------------------
function addL3Switch(
  ctx: Ctx, id: string, name: string, mac: string, x: number, y: number,
  vlanDb: Record<string, string> = { '1': 'default' },
  extras: Record<string, any> = {},
): { device: CanvasDevice; state: any } {
  const device: CanvasDevice = {
    id, type: 'switchL3', name, macAddress: mac, ip: '', x, y,
    status: 'online', switchModel: 'NS-L3-24PS', ports: generateL3SwitchPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'switchL3', hostname: name, macAddress: mac,
    switchModel: 'NS-L3-24PS', switchLayer: 'L3',
    currentMode: 'user', commandHistory: [], vlanDatabase: { ...vlanDb }, ports: {},
    ipRouting: true,
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } }
    },
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id, name: p.label || p.id, vlan: 1, duplex: 'full', speed: '1000', type: getPortType(p.id), status: 'notconnect',
      shutdown: false, accessVlan: 1, mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a router device + state
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
    switchModel: 'NS-L3-24PS', switchLayer: 'L3',
    currentMode: 'user', commandHistory: [], vlanDatabase: {}, ports: {},
    ipRouting: true,
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } }
    },
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id, name: p.label || p.id, vlan: 1, duplex: 'full', speed: '1000', type: getPortType(p.id), status: 'notconnect',
      shutdown: false, accessVlan: 1, mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a Firewall device
// ---------------------------------------------------------------------------
function addFirewall(
  ctx: Ctx, id: string, name: string, mac: string, x: number, y: number,
  extras: Record<string, any> = {},
): { device: CanvasDevice; state: any } {
  const device: CanvasDevice = {
    id, type: 'firewall', name, macAddress: mac, ip: '', x, y,
    status: 'online', ports: generateFirewallPorts(),
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'firewall', hostname: name, macAddress: mac,
    currentMode: 'user', commandHistory: [], ports: {},
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
      id: p.id, name: p.label || p.id, vlan: 1, duplex: 'full', speed: '1000', type: 'gigabitethernet', status: 'notconnect',
      shutdown: false, mode: 'routed',
    };
  });
  ctx.states.set(id, state);
  return { device, state };
}

// ---------------------------------------------------------------------------
// Helper: create a Wireless LAN Controller (WLC) device
// ---------------------------------------------------------------------------
function addWlc(
  ctx: Ctx, id: string, name: string, mac: string, x: number, y: number,
  ip: string = '192.168.1.5', gateway: string = '192.168.1.1',
  extras: Record<string, any> = {},
): { device: CanvasDevice; state: any } {
  const device: CanvasDevice = {
    id, type: 'wlc', name, macAddress: mac, ip, subnet: '255.255.255.0',
    gateway, x, y, status: 'online', ports: generateWLCPorts(),
    services: { http: { enabled: true, mode: 'simple', content: `<h1>${name} Controller Web Console</h1>` } },
  };
  ctx.devices.push(device);
  const state = {
    deviceType: 'wlc', hostname: name, macAddress: mac,
    currentMode: 'user', commandHistory: [], ports: {},
    ipRouting: false,
    services: { http: { enabled: true, mode: 'simple', content: `<h1>${name} Controller Web Console</h1>` } },
    ...extras,
  } as unknown as SwitchState;
  device.ports.forEach(p => {
    state.ports[p.id] = {
      id: p.id, name: p.label || p.id, vlan: 1, duplex: 'full', speed: '1000', type: 'gigabitethernet', status: 'notconnect',
      shutdown: false, mode: 'access',
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
  const pcPorts = generatePCPorts();
  pcPorts[0].status = 'connected';
  pcPorts[0].shutdown = false;
  const pc: CanvasDevice = {
    id: pcId, type: 'pc', name: `PC-${pcIndex}`,
    macAddress: MAC_POOL[(pcIndex - 1) % MAC_POOL.length],
    ip, subnet: '255.255.255.0', gateway, dns,
    ipConfigMode: 'static', x, y, status: 'online',
    ports: pcPorts,
    services: {
      http: { enabled: true, mode: 'simple', content: `<h1>Welcome to PC-${pcIndex} Web Server</h1>` }
    },
    ...extras,
  };
  ctx.devices.push(pc);
  ctx.connections.push({
    id: `conn-pc-${pcIndex}`, sourceDeviceId: pcId, sourcePort: 'eth0',
    targetDeviceId: switchId, targetPort: swPort, cableType: 'straight', active: true,
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
function connect(
  ctx: Ctx, connId: string,
  srcId: string, srcPort: string, srcState: any,
  dstId: string, dstPort: string, dstState: any,
  cableType: 'straight' | 'crossover' | 'serial' | 'fiber' | 'wireless' = 'straight',
) {
  ctx.connections.push({
    id: connId, sourceDeviceId: srcId, sourcePort: srcPort,
    targetDeviceId: dstId, targetPort: dstPort, cableType, active: true,
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
// 2. Star Topology
// ===========================================================================
function generateStar(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: swState } = addSwitch(ctx, 'switch-core', 'Core-SW', '0011.2233.8801', 360, 220);
  const count = Math.max(3, pcCount);
  const radius = 180;
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    const px = Math.round(360 + radius * Math.cos(angle));
    const py = Math.round(220 + radius * Math.sin(angle));
    addPcToSwitch(ctx, i + 1, `10.0.0.${10 + i}`, '10.0.0.1', '8.8.8.8',
      'switch-core', swState, `fa0/${i + 1}`, px, py);
  }
  return ctx;
}

// ===========================================================================
// 3. Ring Topology
// ===========================================================================
function generateRing(pcCount: number): Ctx {
  const ctx = newCtx();
  const swPositions = [
    { id: 'switch-1', name: 'SW-North', x: 350, y: 70, mac: '0011.2233.8801' },
    { id: 'switch-2', name: 'SW-East', x: 600, y: 220, mac: '0011.2233.8802' },
    { id: 'switch-3', name: 'SW-South', x: 350, y: 370, mac: '0011.2233.8803' },
    { id: 'switch-4', name: 'SW-West', x: 100, y: 220, mac: '0011.2233.8804' },
  ];
  const switches = swPositions.map(s => addSwitch(ctx, s.id, s.name, s.mac, s.x, s.y));

  // Connect in ring: 0-1, 1-2, 2-3, 3-0
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    connect(ctx, `conn-ring-${i}-${next}`,
      switches[i].device.id, 'gi0/1', switches[i].state,
      switches[next].device.id, 'gi0/2', switches[next].state, 'crossover');
  }

  // Attach PCs to switches
  const perSw = Math.max(1, Math.floor(pcCount / 4));
  let pcIdx = 1;
  const offsets = [
    { ox: 0, oy: -80 },
    { ox: 140, oy: 0 },
    { ox: 0, oy: 100 },
    { ox: -130, oy: 0 },
  ];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < perSw; j++) {
      addPcToSwitch(ctx, pcIdx, `192.168.${i + 1}.1${j}`, `192.168.${i + 1}.1`, '8.8.8.8',
        switches[i].device.id, switches[i].state, `fa0/${j + 1}`,
        swPositions[i].x + offsets[i].ox + j * 60, swPositions[i].y + offsets[i].oy);
      pcIdx++;
    }
  }
  return ctx;
}

// ===========================================================================
// 4. Full Mesh Topology
// ===========================================================================
function generateFullMesh(_pcCount: number): Ctx {
  const ctx = newCtx();
  const nodes = [
    { id: 'router-1', name: 'R1-Alpha', mac: '0011.2233.9901', x: 200, y: 80, ip: '10.0.1.1' },
    { id: 'router-2', name: 'R2-Beta', mac: '0011.2233.9902', x: 550, y: 80, ip: '10.0.2.1' },
    { id: 'router-3', name: 'R3-Gamma', mac: '0011.2233.9903', x: 550, y: 340, ip: '10.0.3.1' },
    { id: 'router-4', name: 'R4-Delta', mac: '0011.2233.9904', x: 200, y: 340, ip: '10.0.4.1' },
  ];

  const rList = nodes.map((n, idx) => {
    const { state, device } = addRouter(ctx, n.id, n.name, n.mac, n.x, n.y, {
      routingProtocol: 'ospf', ospfProcessId: '1', routerId: `${idx + 1}.${idx + 1}.${idx + 1}.${idx + 1}`,
      dynamicRoutes: [{ destination: '10.0.0.0', subnetMask: '0.255.255.255', area: 0 }]
    });
    return { state, device };
  });

  // Mesh connections between all pairs (6 links)
  const links = [
    { from: 0, to: 1, p1: 'gi0/0', p2: 'gi0/0', ip1: '10.12.0.1', ip2: '10.12.0.2' },
    { from: 0, to: 2, p1: 'gi0/1', p2: 'gi0/0', ip1: '10.13.0.1', ip2: '10.13.0.2' },
    { from: 0, to: 3, p1: 'gi0/2', p2: 'gi0/0', ip1: '10.14.0.1', ip2: '10.14.0.2' },
    { from: 1, to: 2, p1: 'gi0/1', p2: 'gi0/1', ip1: '10.23.0.1', ip2: '10.23.0.2' },
    { from: 1, to: 3, p1: 'gi0/2', p2: 'gi0/1', ip1: '10.24.0.1', ip2: '10.24.0.2' },
    { from: 2, to: 3, p1: 'gi0/2', p2: 'gi0/2', ip1: '10.34.0.1', ip2: '10.34.0.2' },
  ];

  links.forEach(l => {
    enableRouterPort(rList[l.from].state, l.p1, l.ip1, '255.255.255.252');
    enableRouterPort(rList[l.to].state, l.p2, l.ip2, '255.255.255.252');
    connect(ctx, `conn-mesh-${l.from}-${l.to}`,
      rList[l.from].device.id, l.p1, rList[l.from].state,
      rList[l.to].device.id, l.p2, rList[l.to].state, 'crossover');
  });

  // Client PC attached to R1
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW-Client', '0011.2233.8801', 50, 80);
  enableRouterPort(rList[0].state, 'gi0/3', '192.168.1.1', '255.255.255.0');
  connect(ctx, 'conn-r1-sw1', rList[0].device.id, 'gi0/3', rList[0].state, 'switch-1', 'fa0/1', sw1s);
  addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '8.8.8.8', 'switch-1', sw1s, 'fa0/2', 50, 200);

  return ctx;
}

// ===========================================================================
// 5. Partial Mesh Topology
// ===========================================================================
function generatePartialMesh(_pcCount: number): Ctx {
  const ctx = newCtx();
  // 2 Hub Routers in Core, 2 Spoke Routers
  const { state: h1 } = addRouter(ctx, 'r-core-1', 'Core-R1', '0011.2233.9901', 280, 80);
  const { state: h2 } = addRouter(ctx, 'r-core-2', 'Core-R2', '0011.2233.9902', 520, 80);
  const { state: s1 } = addRouter(ctx, 'r-spoke-1', 'Spoke-R1', '0011.2233.9903', 150, 270);
  const { state: s2 } = addRouter(ctx, 'r-spoke-2', 'Spoke-R2', '0011.2233.9904', 650, 270);

  // Core inter-link
  enableRouterPort(h1, 'gi0/0', '10.0.0.1', '255.255.255.252');
  enableRouterPort(h2, 'gi0/0', '10.0.0.2', '255.255.255.252');
  connect(ctx, 'conn-core-1-2', 'r-core-1', 'gi0/0', h1, 'r-core-2', 'gi0/0', h2, 'crossover');

  // Spoke 1 dual-homed to both Cores
  enableRouterPort(h1, 'gi0/1', '10.1.1.1', '255.255.255.252');
  enableRouterPort(s1, 'gi0/0', '10.1.1.2', '255.255.255.252');
  connect(ctx, 'conn-s1-h1', 'r-core-1', 'gi0/1', h1, 'r-spoke-1', 'gi0/0', s1);

  enableRouterPort(h2, 'gi0/1', '10.1.2.1', '255.255.255.252');
  enableRouterPort(s1, 'gi0/1', '10.1.2.2', '255.255.255.252');
  connect(ctx, 'conn-s1-h2', 'r-core-2', 'gi0/1', h2, 'r-spoke-1', 'gi0/1', s1);

  // Spoke 2 single-homed to Core 2
  enableRouterPort(h2, 'gi0/2', '10.2.1.1', '255.255.255.252');
  enableRouterPort(s2, 'gi0/0', '10.2.1.2', '255.255.255.252');
  connect(ctx, 'conn-s2-h2', 'r-core-2', 'gi0/2', h2, 'r-spoke-2', 'gi0/0', s2);

  // Switches and PCs
  const { state: sw1 } = addSwitch(ctx, 'sw-branch-1', 'SW-Branch-1', '0011.2233.8801', 150, 400);
  enableRouterPort(s1, 'gi0/2', '192.168.10.1', '255.255.255.0');
  connect(ctx, 'conn-s1-sw1', 'r-spoke-1', 'gi0/2', s1, 'sw-branch-1', 'fa0/1', sw1);
  addPcToSwitch(ctx, 1, '192.168.10.10', '192.168.10.1', '8.8.8.8', 'sw-branch-1', sw1, 'fa0/2', 150, 520);

  const { state: sw2 } = addSwitch(ctx, 'sw-branch-2', 'SW-Branch-2', '0011.2233.8802', 650, 400);
  enableRouterPort(s2, 'gi0/1', '192.168.20.1', '255.255.255.0');
  connect(ctx, 'conn-s2-sw2', 'r-spoke-2', 'gi0/1', s2, 'sw-branch-2', 'fa0/1', sw2);
  addPcToSwitch(ctx, 2, '192.168.20.10', '192.168.20.1', '8.8.8.8', 'sw-branch-2', sw2, 'fa0/2', 650, 520);

  return ctx;
}

// ===========================================================================
// 6. 2D Grid / Torus Mesh
// ===========================================================================
function generateGrid2D(): Ctx {
  const ctx = newCtx();
  const rows = 2;
  const cols = 3;
  const gridSw: any[][] = [];

  for (let r = 0; r < rows; r++) {
    gridSw[r] = [];
    for (let c = 0; c < cols; c++) {
      const id = `sw-g-${r}-${c}`;
      const name = `Grid-SW[${r},${c}]`;
      const mac = `0011.2233.90${r}${c}`;
      const x = 180 + c * 240;
      const y = 100 + r * 200;
      const sw = addSwitch(ctx, id, name, mac, x, y);
      gridSw[r][c] = sw;
    }
  }

  // Horizontal links
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      connect(ctx, `conn-h-${r}-${c}`,
        gridSw[r][c].device.id, 'fa0/21', gridSw[r][c].state,
        gridSw[r][c + 1].device.id, 'fa0/22', gridSw[r][c + 1].state, 'crossover');
    }
  }
  // Vertical links
  for (let c = 0; c < cols; c++) {
    connect(ctx, `conn-v-0-${c}`,
      gridSw[0][c].device.id, 'gi0/1', gridSw[0][c].state,
      gridSw[1][c].device.id, 'gi0/2', gridSw[1][c].state, 'crossover');
  }

  // Attach End Node PCs
  addPcToSwitch(ctx, 1, '10.0.0.10', '10.0.0.1', '8.8.8.8', gridSw[0][0].device.id, gridSw[0][0].state, 'fa0/1', 180, 20);
  addPcToSwitch(ctx, 2, '10.0.0.20', '10.0.0.1', '8.8.8.8', gridSw[1][2].device.id, gridSw[1][2].state, 'fa0/1', 660, 420);

  return ctx;
}

// ===========================================================================
// 7. Spine-Leaf (Data Center Clos)
// ===========================================================================
function generateSpineLeaf(_pcCount: number): Ctx {
  const ctx = newCtx();
  // 2 Spine Switches (L3)
  const spine1 = addL3Switch(ctx, 'sw-spine-1', 'Spine-1', '0011.2233.7701', 280, 80);
  const spine2 = addL3Switch(ctx, 'sw-spine-2', 'Spine-2', '0011.2233.7702', 520, 80);

  // 3 Leaf Switches (L2/L3)
  const leaf1 = addSwitch(ctx, 'sw-leaf-1', 'Leaf-1 (Rack-A)', '0011.2233.8801', 140, 260);
  const leaf2 = addSwitch(ctx, 'sw-leaf-2', 'Leaf-2 (Rack-B)', '0011.2233.8802', 400, 260);
  const leaf3 = addSwitch(ctx, 'sw-leaf-3', 'Leaf-3 (Rack-C)', '0011.2233.8803', 660, 260);

  const leaves = [leaf1, leaf2, leaf3];

  // Connect every Leaf to every Spine (GigabitEthernet / Crossover or Straight)
  leaves.forEach((leaf, idx) => {
    connect(ctx, `conn-leaf${idx + 1}-sp1`, leaf.device.id, 'gi0/1', leaf.state, spine1.device.id, `gi1/0/${idx + 1}`, spine1.state, 'straight');
    connect(ctx, `conn-leaf${idx + 1}-sp2`, leaf.device.id, 'gi0/2', leaf.state, spine2.device.id, `gi1/0/${idx + 1}`, spine2.state, 'straight');
  });

  // Attach server PCs
  addPcToSwitch(ctx, 1, '10.10.1.10', '10.10.1.1', '8.8.8.8', leaf1.device.id, leaf1.state, 'fa0/1', 140, 420, { name: 'Server-Web1' });
  addPcToSwitch(ctx, 2, '10.10.2.10', '10.10.2.1', '8.8.8.8', leaf2.device.id, leaf2.state, 'fa0/1', 400, 420, { name: 'Server-App1' });
  addPcToSwitch(ctx, 3, '10.10.3.10', '10.10.3.1', '8.8.8.8', leaf3.device.id, leaf3.state, 'fa0/1', 660, 420, { name: 'Server-DB1' });

  return ctx;
}

// ===========================================================================
// 8. Fat-Tree (3-Tier DC)
// ===========================================================================
function generateFatTree(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Core Layer (2 Routers)
  const core1 = addRouter(ctx, 'core-r1', 'Core-1', '0011.2233.9901', 300, 50);
  const core2 = addRouter(ctx, 'core-r2', 'Core-2', '0011.2233.9902', 500, 50);
  connect(ctx, 'conn-c1-c2', 'core-r1', 'gi0/0', core1.state, 'core-r2', 'gi0/0', core2.state, 'crossover');

  // Aggregation / Distribution Layer (2 L3 Switches)
  const agg1 = addL3Switch(ctx, 'agg-sw1', 'Agg-SW1', '0011.2233.7701', 220, 200);
  const agg2 = addL3Switch(ctx, 'agg-sw2', 'Agg-SW2', '0011.2233.7702', 580, 200);

  // Core to Agg links
  connect(ctx, 'conn-c1-a1', 'core-r1', 'gi0/1', core1.state, 'agg-sw1', 'gi1/0/1', agg1.state);
  connect(ctx, 'conn-c1-a2', 'core-r1', 'gi0/2', core1.state, 'agg-sw2', 'gi1/0/1', agg2.state);
  connect(ctx, 'conn-c2-a1', 'core-r2', 'gi0/1', core2.state, 'agg-sw1', 'gi1/0/2', agg1.state);
  connect(ctx, 'conn-c2-a2', 'core-r2', 'gi0/2', core2.state, 'agg-sw2', 'gi1/0/2', agg2.state);

  // Access Layer (2 Switches)
  const acc1 = addSwitch(ctx, 'acc-sw1', 'Access-SW1', '0011.2233.8801', 220, 360);
  const acc2 = addSwitch(ctx, 'acc-sw2', 'Access-SW2', '0011.2233.8802', 580, 360);

  connect(ctx, 'conn-a1-ac1', 'agg-sw1', 'gi1/0/3', agg1.state, 'acc-sw1', 'gi0/1', acc1.state);
  connect(ctx, 'conn-a2-ac2', 'agg-sw2', 'gi1/0/3', agg2.state, 'acc-sw2', 'gi0/1', acc2.state);

  // PCs
  addPcToSwitch(ctx, 1, '172.16.1.10', '172.16.1.1', '8.8.8.8', 'acc-sw1', acc1.state, 'fa0/1', 150, 500);
  addPcToSwitch(ctx, 2, '172.16.1.11', '172.16.1.1', '8.8.8.8', 'acc-sw1', acc1.state, 'fa0/2', 290, 500);
  addPcToSwitch(ctx, 3, '172.16.2.10', '172.16.2.1', '8.8.8.8', 'acc-sw2', acc2.state, 'fa0/1', 510, 500);
  addPcToSwitch(ctx, 4, '172.16.2.11', '172.16.2.1', '8.8.8.8', 'acc-sw2', acc2.state, 'fa0/2', 650, 500);

  return ctx;
}

// ===========================================================================
// 9. Hybrid Enterprise Campus (Firewall & WLC)
// ===========================================================================
function generateHybridEnterprise(): Ctx {
  const ctx = newCtx();
  // Perimeter Edge Firewall
  const { state: fwState } = addFirewall(ctx, 'fw-edge', 'HQ-Perimeter-FW', '0011.2233.9901', 360, 60, {
    firewallRules: [
      { id: 'rule-1', action: 'permit', protocol: 'tcp', srcIp: 'any', dstIp: '172.16.0.50', dstPort: '80', desc: 'Permit DMZ HTTP' },
      { id: 'rule-2', action: 'permit', protocol: 'tcp', srcIp: 'any', dstIp: '172.16.0.50', dstPort: '443', desc: 'Permit DMZ HTTPS' },
      { id: 'rule-3', action: 'permit', protocol: 'ip', srcIp: '192.168.10.0/24', dstIp: 'any', desc: 'HQ LAN Outbound' },
    ],
  });

  // WAN Branch Router
  const { state: brR } = addRouter(ctx, 'r-branch', 'Branch-Router', '0011.2233.9902', 720, 60);
  enableRouterPort(brR, 'gi0/0', '10.0.0.2', '255.255.255.252');
  enableRouterPort(brR, 'gi0/1', '192.168.20.1', '255.255.255.0');
  connect(ctx, 'conn-wan-fw-branch', 'fw-edge', 'gi0/0', fwState, 'r-branch', 'gi0/0', brR, 'straight');

  // HQ Core LAN Switch
  const { state: hqSw } = addSwitch(ctx, 'sw-hq', 'HQ-Campus-SW', '0011.2233.8801', 180, 200);
  connect(ctx, 'conn-hq-fw-sw', 'fw-edge', 'gi0/1', fwState, 'sw-hq', 'fa0/1', hqSw);

  // DMZ Server Switch
  const { state: dmzSw } = addSwitch(ctx, 'sw-dmz', 'DMZ-SW', '0011.2233.8802', 360, 200);
  connect(ctx, 'conn-hq-fw-dmz', 'fw-edge', 'gi0/2', fwState, 'sw-dmz', 'fa0/1', dmzSw);

  // Branch Switch
  const { state: brSw } = addSwitch(ctx, 'sw-branch', 'Branch-SW', '0011.2233.8803', 720, 200);
  connect(ctx, 'conn-br-r-sw', 'r-branch', 'gi0/1', brR, 'sw-branch', 'fa0/1', brSw);

  // Campus Wireless Controller (WLC) connected to HQ Switch
  const { state: wlcState } = addWlc(ctx, 'wlc-hq', 'HQ-Campus-WLC', '0011.2233.CC01', 60, 200, '192.168.10.5', '192.168.10.1');
  connect(ctx, 'conn-wlc-hqsw', 'wlc-hq', 'gi0/0', wlcState, 'sw-hq', 'fa0/24', hqSw);

  // Campus Access Point
  const ap: CanvasDevice = {
    id: 'ap-hq', type: 'router', name: 'HQ-Campus-AP', macAddress: '0011.2233.AA01',
    ip: '192.168.10.10', subnet: '255.255.255.0', gateway: '192.168.10.1', x: 80, y: 350, status: 'online',
    wifi: { enabled: true, ssid: 'HQ-Corp-WiFi', security: 'wpa2', password: 'password123', channel: '5GHz', mode: 'ap' },
    ports: generateRouterPorts(),
  };
  ctx.devices.push(ap);
  const apState = { deviceType: 'router', hostname: 'HQ-Campus-AP', ports: {} } as unknown as SwitchState;
  ctx.states.set('ap-hq', apState);
  connect(ctx, 'conn-ap-hqsw', 'ap-hq', 'gi0/0', apState, 'sw-hq', 'fa0/23', hqSw);

  // Mobile WiFi Client
  const mob: CanvasDevice = {
    id: 'mob-hq', type: 'mobile', name: 'HQ-Executive-Laptop', macAddress: '0011.2233.BB01',
    ip: '192.168.10.55', subnet: '255.255.255.0', gateway: '192.168.10.1', x: 80, y: 480, status: 'online',
    wifi: { enabled: true, ssid: 'HQ-Corp-WiFi', mode: 'client', security: 'wpa2', password: 'password123' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  ctx.devices.push(mob);

  // Endpoints
  addPcToSwitch(ctx, 1, '192.168.10.15', '192.168.10.1', '8.8.8.8', 'sw-hq', hqSw, 'fa0/2', 200, 350, { name: 'HQ-Admin-PC' });
  addPcToSwitch(ctx, 2, '172.16.0.50', '172.16.0.1', '8.8.8.8', 'sw-dmz', dmzSw, 'fa0/2', 360, 350, { name: 'DMZ-WebServer' });
  addPcToSwitch(ctx, 3, '192.168.20.25', '192.168.20.1', '8.8.8.8', 'sw-branch', brSw, 'fa0/2', 720, 350, { name: 'Branch-Client' });

  return ctx;
}

// ===========================================================================
// 10. Enterprise WLC & Multi-AP
// ===========================================================================
function generateEnterpriseWlc(): Ctx {
  const ctx = newCtx();
  // Core Switch
  const { state: swCore } = addSwitch(ctx, 'sw-core', 'Core-SW', '0011.2233.8801', 380, 100);

  // WLC Controller
  const { state: wlcState } = addWlc(ctx, 'wlc-1', 'WLC-5508', '0011.2233.CC01', 160, 100, '192.168.1.5', '192.168.1.1');
  connect(ctx, 'conn-wlc-core', 'wlc-1', 'gi0/0', wlcState, 'sw-core', 'fa0/1', swCore);

  // AP 1 (Floor 1)
  const ap1: CanvasDevice = {
    id: 'ap-floor1', type: 'router', name: 'AP-Floor1', macAddress: '0011.2233.AA01',
    ip: '192.168.1.10', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 240, y: 260, status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', security: 'wpa2', password: 'password123', channel: '2.4GHz', mode: 'ap' },
    ports: generateRouterPorts(),
  };
  ctx.devices.push(ap1);
  const ap1State = { deviceType: 'router', hostname: 'AP-Floor1', ports: {} } as unknown as SwitchState;
  ctx.states.set('ap-floor1', ap1State);
  connect(ctx, 'conn-ap1-core', 'ap-floor1', 'gi0/0', ap1State, 'sw-core', 'fa0/2', swCore);

  // AP 2 (Floor 2)
  const ap2: CanvasDevice = {
    id: 'ap-floor2', type: 'router', name: 'AP-Floor2', macAddress: '0011.2233.AA02',
    ip: '192.168.1.11', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 520, y: 260, status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', security: 'wpa2', password: 'password123', channel: '5GHz', mode: 'ap' },
    ports: generateRouterPorts(),
  };
  ctx.devices.push(ap2);
  const ap2State = { deviceType: 'router', hostname: 'AP-Floor2', ports: {} } as unknown as SwitchState;
  ctx.states.set('ap-floor2', ap2State);
  connect(ctx, 'conn-ap2-core', 'ap-floor2', 'gi0/0', ap2State, 'sw-core', 'fa0/3', swCore);

  // Mobile / Laptop Clients
  const mob1: CanvasDevice = {
    id: 'mob-1', type: 'mobile', name: 'Laptop-User1', macAddress: '0011.2233.BB01',
    ip: '192.168.1.51', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 180, y: 420, status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', mode: 'client', security: 'wpa2', password: 'password123' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  const mob2: CanvasDevice = {
    id: 'mob-2', type: 'mobile', name: 'Phone-User2', macAddress: '0011.2233.BB02',
    ip: '192.168.1.52', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 580, y: 420, status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', mode: 'client', security: 'wpa2', password: 'password123' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  ctx.devices.push(mob1, mob2);

  return ctx;
}

// ===========================================================================
// 11. IoT Smart Home Mesh
// ===========================================================================
function generateIotSmartHome(): Ctx {
  const ctx = newCtx();
  // Gateway
  const { state: gwState } = addRouter(ctx, 'iot-gw', 'Home-Gateway', '0011.2233.9901', 350, 60, {
    dhcpPools: { 'IOT-POOL': { network: '192.168.50.0', subnetMask: '255.255.255.0', defaultRouter: '192.168.50.1', dnsServer: '8.8.8.8' } },
    wifi: { enabled: true, ssid: 'SmartHome-IoT', security: 'wpa2', password: 'iotpassword', channel: '2.4GHz', mode: 'ap' },
  });
  enableRouterPort(gwState, 'gi0/0', '192.168.50.1', '255.255.255.0');

  // IoT Switch
  const { state: swState } = addSwitch(ctx, 'iot-sw', 'IoT-Bridge', '0011.2233.8801', 350, 200);
  connect(ctx, 'conn-gw-sw', 'iot-gw', 'gi0/0', gwState, 'iot-sw', 'fa0/1', swState);

  // IoT Endpoints
  const iotItems = [
    { id: 'iot-thermostat', name: 'Smart-Thermostat', ip: '192.168.50.101', x: 120, y: 360, port: 'fa0/2' },
    { id: 'iot-light', name: 'Smart-Lighting', ip: '192.168.50.102', x: 280, y: 360, port: 'fa0/3' },
    { id: 'iot-camera', name: 'Security-Cam', ip: '192.168.50.103', x: 440, y: 360, port: 'fa0/4' },
    { id: 'iot-speaker', name: 'Smart-Speaker', ip: '192.168.50.104', x: 600, y: 360, port: 'fa0/5' },
  ];

  iotItems.forEach(item => {
    const iotDev: CanvasDevice = {
      id: item.id, type: 'iot', name: item.name, macAddress: MAC_POOL[ctx.devices.length % MAC_POOL.length],
      ip: item.ip, subnet: '255.255.255.0', gateway: '192.168.50.1', x: item.x, y: item.y, status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
      services: { http: { enabled: true, mode: 'simple', content: `<h1>${item.name} Control Panel</h1>` } }
    };
    ctx.devices.push(iotDev);
    connect(ctx, `conn-${item.id}`, item.id, 'eth0', null, 'iot-sw', item.port, swState);
  });

  return ctx;
}

// ===========================================================================
// 12. Multi-Area OSPF
// ===========================================================================
function generateMultiAreaOspf(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Area 0 Backbone Router
  const { state: r0 } = addRouter(ctx, 'r-area0', 'R0-Backbone', '0011.2233.9901', 360, 60, {
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: '1.1.1.1',
    dynamicRoutes: [
      { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.0.4', subnetMask: '0.0.0.3', area: 0 },
    ]
  });
  enableRouterPort(r0, 'gi0/0', '10.0.0.1', '255.255.255.252');
  enableRouterPort(r0, 'gi0/1', '10.0.0.5', '255.255.255.252');

  // ABR Area 1
  const { state: r1 } = addRouter(ctx, 'r-area1', 'ABR-Area1', '0011.2233.9902', 160, 220, {
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: '2.2.2.2',
    dynamicRoutes: [
      { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '192.168.1.0', subnetMask: '0.0.0.255', area: 1 },
    ]
  });
  enableRouterPort(r1, 'gi0/0', '10.0.0.2', '255.255.255.252');
  enableRouterPort(r1, 'gi0/1', '192.168.1.1', '255.255.255.0');
  connect(ctx, 'conn-r0-r1', 'r-area0', 'gi0/0', r0, 'r-area1', 'gi0/0', r1);

  // ABR Area 2
  const { state: r2 } = addRouter(ctx, 'r-area2', 'ABR-Area2', '0011.2233.9903', 560, 220, {
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: '3.3.3.3',
    dynamicRoutes: [
      { destination: '10.0.0.4', subnetMask: '0.0.0.3', area: 0 },
      { destination: '192.168.2.0', subnetMask: '0.0.0.255', area: 2 },
    ]
  });
  enableRouterPort(r2, 'gi0/0', '10.0.0.6', '255.255.255.252');
  enableRouterPort(r2, 'gi0/1', '192.168.2.1', '255.255.255.0');
  connect(ctx, 'conn-r0-r2', 'r-area0', 'gi0/1', r0, 'r-area2', 'gi0/0', r2);

  // Switches and PCs
  const { state: sw1 } = addSwitch(ctx, 'sw-area1', 'SW-Area1', '0011.2233.8801', 160, 370);
  connect(ctx, 'conn-r1-sw1', 'r-area1', 'gi0/1', r1, 'sw-area1', 'fa0/1', sw1);
  addPcToSwitch(ctx, 1, '192.168.1.10', '192.168.1.1', '8.8.8.8', 'sw-area1', sw1, 'fa0/2', 160, 490);

  const { state: sw2 } = addSwitch(ctx, 'sw-area2', 'SW-Area2', '0011.2233.8802', 560, 370);
  connect(ctx, 'conn-r2-sw2', 'r-area2', 'gi0/1', r2, 'sw-area2', 'fa0/1', sw2);
  addPcToSwitch(ctx, 2, '192.168.2.10', '192.168.2.1', '8.8.8.8', 'sw-area2', sw2, 'fa0/2', 560, 490);

  return ctx;
}

// ===========================================================================
// 13. BGP Dual-Homed WAN
// ===========================================================================
function generateBgpDualHomed(): Ctx {
  const ctx = newCtx();
  // Enterprise Edge Router (AS 65000)
  const { state: rEdge } = addRouter(ctx, 'r-bgp-edge', 'Edge-BGP (AS65000)', '0011.2233.9901', 360, 240, {
    bgpConfig: { localAs: 65000, neighbors: ['203.0.113.1', '198.51.100.1'] }
  });
  enableRouterPort(rEdge, 'gi0/0', '203.0.113.2', '255.255.255.252');
  enableRouterPort(rEdge, 'gi0/1', '198.51.100.2', '255.255.255.252');
  enableRouterPort(rEdge, 'gi0/2', '10.50.0.1', '255.255.255.0');

  // ISP A (AS 100)
  const { state: ispA } = addRouter(ctx, 'r-isp-a', 'ISP-A (AS100)', '0011.2233.9902', 180, 80);
  enableRouterPort(ispA, 'gi0/0', '203.0.113.1', '255.255.255.252');
  connect(ctx, 'conn-edge-ispa', 'r-bgp-edge', 'gi0/0', rEdge, 'r-isp-a', 'gi0/0', ispA);

  // ISP B (AS 200)
  const { state: ispB } = addRouter(ctx, 'r-isp-b', 'ISP-B (AS200)', '0011.2233.9903', 540, 80);
  enableRouterPort(ispB, 'gi0/0', '198.51.100.1', '255.255.255.252');
  connect(ctx, 'conn-edge-ispb', 'r-bgp-edge', 'gi0/1', rEdge, 'r-isp-b', 'gi0/0', ispB);

  // Internal LAN
  const { state: swLan } = addSwitch(ctx, 'sw-bgp-lan', 'Enterprise-LAN', '0011.2233.8801', 360, 390);
  connect(ctx, 'conn-edge-lan', 'r-bgp-edge', 'gi0/2', rEdge, 'sw-bgp-lan', 'fa0/1', swLan);
  addPcToSwitch(ctx, 1, '10.50.0.10', '10.50.0.1', '8.8.8.8', 'sw-bgp-lan', swLan, 'fa0/2', 360, 510);

  return ctx;
}

// ===========================================================================
// 14. DMZ & Firewall Architecture (3-Zone)
// ===========================================================================
function generateDmzFirewall(_pcCount: number): Ctx {
  const ctx = newCtx();
  // 3-Zone Stateful Firewall (gi0/0: Outside, gi0/1: Inside, gi0/2: DMZ)
  const { state: fwState } = addFirewall(ctx, 'fw-1', 'Edge-Firewall', '0011.2233.9901', 360, 200, {
    firewallRules: [
      { id: 'rule-1', action: 'permit', protocol: 'tcp', srcIp: 'any', dstIp: '192.168.100.10', dstPort: '80', desc: 'Permit HTTP to DMZ Web Server' },
      { id: 'rule-2', action: 'permit', protocol: 'tcp', srcIp: 'any', dstIp: '192.168.100.10', dstPort: '443', desc: 'Permit HTTPS to DMZ Web Server' },
      { id: 'rule-3', action: 'permit', protocol: 'ip', srcIp: '10.0.1.0/24', dstIp: 'any', desc: 'Permit Inside to Internet' },
      { id: 'rule-4', action: 'deny', protocol: 'ip', srcIp: 'any', dstIp: '10.0.1.0/24', desc: 'Deny Outside to Inside' },
    ],
  });

  // Outside Internet Gateway Router
  const { state: ispR } = addRouter(ctx, 'r-isp', 'ISP-Gateway', '0011.2233.9902', 360, 50);
  enableRouterPort(ispR, 'gi0/0', '203.0.113.1', '255.255.255.0');
  connect(ctx, 'conn-isp-fw', 'r-isp', 'gi0/0', ispR, 'fw-1', 'gi0/0', fwState);

  // DMZ Switch (Web / App Servers) connected to Firewall Gi0/2
  const { state: swDmz } = addSwitch(ctx, 'sw-dmz', 'DMZ-Switch', '0011.2233.8801', 160, 350);
  connect(ctx, 'conn-fw-dmz', 'fw-1', 'gi0/2', fwState, 'sw-dmz', 'fa0/1', swDmz);
  addPcToSwitch(ctx, 1, '192.168.100.10', '192.168.100.1', '8.8.8.8', 'sw-dmz', swDmz, 'fa0/2', 160, 480, { name: 'DMZ-WebServer' });

  // Internal LAN Switch (Trusted Zone) connected to Firewall Gi0/1
  const { state: swLan } = addSwitch(ctx, 'sw-lan', 'Internal-LAN', '0011.2233.8802', 560, 350);
  connect(ctx, 'conn-fw-lan', 'fw-1', 'gi0/1', fwState, 'sw-lan', 'fa0/1', swLan);
  addPcToSwitch(ctx, 2, '10.0.1.10', '10.0.1.1', '8.8.8.8', 'sw-lan', swLan, 'fa0/2', 560, 480, { name: 'Internal-Client' });

  return ctx;
}

// ===========================================================================
// Existing Scenarios (ROAS, OSPF, VLAN-Trunk, EtherChannel, Triangle, NAT, ACL, Port-Security, STP, Wireless)
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

function generateVlanTrunk(pcCount: number): Ctx {
  const ctx = newCtx();
  const vlanDb = { '1': 'default', '10': 'Sales', '20': 'HR' };
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 120, vlanDb);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 120, vlanDb);

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

function generateEtherChannel(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 120);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 120);

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

function generateTriangle(pcCount: number): Ctx {
  const ctx = newCtx();
  const ospfExtras = (rid: string, nets: any[]) => ({
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: rid, dynamicRoutes: nets,
  });

  const { state: r1s } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 400, 40,
    ospfExtras('1.1.1.1', [
      { destination: '192.168.1.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.1.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.2.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r1s, 'gi0/0', '192.168.1.1', '255.255.255.0');
  enableRouterPort(r1s, 's0/0/0', '10.0.1.1', '255.255.255.252');
  enableRouterPort(r1s, 's0/1/0', '10.0.2.1', '255.255.255.252');

  const { state: r2s } = addRouter(ctx, 'router-2', 'R2', '0011.2233.9902', 150, 250,
    ospfExtras('2.2.2.2', [
      { destination: '192.168.2.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.1.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.3.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r2s, 'gi0/0', '192.168.2.1', '255.255.255.0');
  enableRouterPort(r2s, 's0/0/0', '10.0.1.2', '255.255.255.252');
  enableRouterPort(r2s, 's0/1/0', '10.0.3.1', '255.255.255.252');

  const { state: r3s } = addRouter(ctx, 'router-3', 'R3', '0011.2233.9903', 650, 250,
    ospfExtras('3.3.3.3', [
      { destination: '192.168.3.0', subnetMask: '0.0.0.255', area: 0 },
      { destination: '10.0.2.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.3.0', subnetMask: '0.0.0.3', area: 0 },
    ]));
  enableRouterPort(r3s, 'gi0/0', '192.168.3.1', '255.255.255.0');
  enableRouterPort(r3s, 's0/0/0', '10.0.2.2', '255.255.255.252');
  enableRouterPort(r3s, 's0/1/0', '10.0.3.2', '255.255.255.252');

  connect(ctx, 'conn-r1-r2', 'router-1', 's0/0/0', r1s, 'router-2', 's0/0/0', r2s, 'serial');
  connect(ctx, 'conn-r1-r3', 'router-1', 's0/1/0', r1s, 'router-3', 's0/0/0', r3s, 'serial');
  connect(ctx, 'conn-r2-r3', 'router-2', 's0/1/0', r2s, 'router-3', 's0/1/0', r3s, 'serial');

  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 400, 180);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 150, 390);
  const { state: sw3s } = addSwitch(ctx, 'switch-3', 'SW3', '0011.2233.8803', 650, 390);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', r1s, 'switch-1', 'fa0/1', sw1s);
  connect(ctx, 'conn-r2-sw2', 'router-2', 'gi0/0', r2s, 'switch-2', 'fa0/1', sw2s);
  connect(ctx, 'conn-r3-sw3', 'router-3', 'gi0/0', r3s, 'switch-3', 'fa0/1', sw3s);

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

function generateNat(pcCount: number): Ctx {
  const ctx = newCtx();
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

  const { state: r2s } = addRouter(ctx, 'router-2', 'ISP', '0011.2233.9902', 350, 40, {
    staticRoutes: [{ destination: '192.168.1.0', subnetMask: '255.255.255.0', nextHop: '203.0.113.1' }],
  });
  enableRouterPort(r2s, 'gi0/0', '203.0.113.2', '255.255.255.0');

  connect(ctx, 'conn-r1-isp', 'router-1', 'gi0/1', r1s, 'router-2', 'gi0/0', r2s);

  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 260);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', r1s, 'switch-1', 'fa0/1', swState);

  const startX = 350 - ((pcCount - 1) * 140) / 2;
  for (let i = 0; i < pcCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 2}`, startX + i * 140, 420);
  }
  return ctx;
}

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

function generatePortSecurity(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 120);

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

function generateStp(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 400, 150);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 150, 380);
  const { state: sw3s } = addSwitch(ctx, 'switch-3', 'SW3', '0011.2233.8803', 650, 380);

  sw1s.spanningTreeMode = 'pvst';
  sw1s.spanningTreePriority = 4096;
  sw2s.spanningTreeMode = 'pvst';
  sw3s.spanningTreeMode = 'pvst';

  sw1s.ports['gi0/1'].mode = 'trunk';
  sw1s.ports['gi0/2'].mode = 'trunk';
  sw2s.ports['gi0/1'].mode = 'trunk';
  sw2s.ports['gi0/2'].mode = 'trunk';
  sw3s.ports['gi0/1'].mode = 'trunk';
  sw3s.ports['gi0/2'].mode = 'trunk';

  connect(ctx, 'conn-sw1-sw2', 'switch-1', 'gi0/1', sw1s, 'switch-2', 'gi0/1', sw2s, 'crossover');
  connect(ctx, 'conn-sw1-sw3', 'switch-1', 'gi0/2', sw1s, 'switch-3', 'gi0/1', sw3s, 'crossover');
  connect(ctx, 'conn-sw2-sw3', 'switch-2', 'gi0/2', sw2s, 'switch-3', 'gi0/2', sw3s, 'crossover');

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

function generateWireless(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: rState, device: rDev } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 40, {
    dhcpPools: {
      'WIFI-POOL': { network: '192.168.1.0', subnetMask: '255.255.255.0', defaultRouter: '192.168.1.1', dnsServer: '8.8.8.8' },
    },
    services: { http: { enabled: true, content: '', fontSize: 16 } }
  });
  rDev.services = { http: { enabled: true, content: '' } };
  rDev.ip = '192.168.1.1';
  enableRouterPort(rState, 'gi0/0', '192.168.1.1', '255.255.255.0');

  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 200);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', rState, 'switch-1', 'fa0/1', swState);

  const apId = 'router-ap';
  const ap: CanvasDevice = {
    id: apId, type: 'router', name: 'AP-1',
    macAddress: '0011.2233.AA01', ip: '192.168.1.2', subnet: '255.255.255.0',
    gateway: '192.168.1.1', x: 600, y: 200, status: 'online',
    services: { http: { enabled: true, content: '' } },
    ports: [
      {
        id: 'wlan0', label: 'WLAN0', status: 'connected', ipAddress: '192.168.1.2', subnetMask: '255.255.255.0',
        wifi: { ssid: 'NetSim-WiFi', security: 'open', channel: '2.4GHz', mode: 'ap' },
      },
      ...generateRouterPorts(),
    ],
    wifi: {
      enabled: true, ssid: 'NetSim-WiFi', bssid: '0011.2233.AA01',
      security: 'open', password: '', channel: '2.4GHz',
      mode: 'ap', hidden: false, maxClients: 10,
    },
  };
  ctx.devices.push(ap);

  const apState = {
    deviceType: 'router', hostname: 'AP-1', macAddress: '0011.2233.AA01',
    switchModel: 'NS-L3-24PS', switchLayer: 'L3',
    currentMode: 'user', commandHistory: [], vlanDatabase: {}, ports: {},
    ipRouting: true,
    services: { http: { enabled: true, content: '', fontSize: 16 } },
    security: {
      enableSecretEncrypted: false, servicePasswordEncryption: false, users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
    },
  } as unknown as SwitchState;
  ap.ports.forEach(p => {
    apState.ports[p.id] = {
      id: p.id, name: p.label || p.id, vlan: 1, duplex: 'full', speed: '1000', type: getPortType(p.id), status: 'notconnect',
      shutdown: p.id === 'gi0/0' || p.id === 'wlan0' ? false : true, accessVlan: 1, mode: 'routed',
    };
    if (p.id === 'gi0/0') {
      apState.ports[p.id].ipAddress = '192.168.1.2';
      apState.ports[p.id].subnetMask = '255.255.255.0';
    }
    if (p.id === 'wlan0') {
      apState.ports[p.id].shutdown = false;
      apState.ports[p.id].ipAddress = '192.168.1.2';
      apState.ports[p.id].subnetMask = '255.255.255.0';
      apState.ports[p.id].wifi = {
        ssid: 'NetSim-WiFi', security: 'open', password: '',
        channel: '2.4GHz', mode: 'ap',
      };
    }
  });
  ctx.states.set(apId, apState);

  connect(ctx, 'conn-ap-sw1', apId, 'gi0/0', apState, 'switch-1', 'fa0/2', swState);

  const wiredCount = Math.max(1, Math.floor(pcCount / 2));
  const wirelessCount = Math.max(1, Math.ceil(pcCount / 2));
  for (let i = 0; i < wiredCount; i++) {
    addPcToSwitch(ctx, i + 1, `192.168.1.1${i}`, '192.168.1.1', '8.8.8.8',
      'switch-1', swState, `fa0/${i + 3}`, 180 + i * 140, 380,
      { ipConfigMode: 'dhcp' });
  }
  for (let i = 0; i < wirelessCount; i++) {
    const pcIdx = wiredCount + i + 1;
    const pc: CanvasDevice = {
      id: `pc-${pcIdx}`, type: 'pc', name: `PC-${pcIdx}`,
      macAddress: MAC_POOL[(pcIdx - 1) % MAC_POOL.length],
      ip: `192.168.1.2${i}`, subnet: '255.255.255.0',
      gateway: '192.168.1.1', dns: '8.8.8.8',
      ipConfigMode: 'static', x: 560 + i * 140, y: 380,
      status: 'online',
      ports: [
        { id: 'eth0', label: 'Eth0', status: 'disconnected' },
        {
          id: 'wlan0', label: 'WLAN0', status: 'connected',
          wifi: { ssid: 'NetSim-WiFi', security: 'open', channel: '2.4GHz', mode: 'client' },
        },
      ],
      wifi: { enabled: true, ssid: 'NetSim-WiFi', security: 'open', password: '', channel: '2.4GHz', mode: 'client' },
    };
    ctx.devices.push(pc);
  }
  return ctx;
}

// ===========================================================================
// 26. Office Printer & IoT Devices
// ===========================================================================
function generateOfficePrinterIot(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Main Office Router
  const { state: rState } = addRouter(ctx, 'r-office', 'Office-Router', '0011.2233.9901', 380, 50, {
    dhcpPools: { 'OFFICE-POOL': { network: '192.168.1.0', subnetMask: '255.255.255.0', defaultRouter: '192.168.1.1', dnsServer: '8.8.8.8' } },
    wifi: { enabled: true, ssid: 'Office-Staff-WiFi', security: 'wpa2', password: 'officepassword', channel: '5GHz', mode: 'ap' },
  });
  enableRouterPort(rState, 'gi0/0', '192.168.1.1', '255.255.255.0');

  // Department Switch
  const { state: swState } = addSwitch(ctx, 'sw-office', 'Office-Floor-SW', '0011.2233.8801', 380, 180);
  connect(ctx, 'conn-rofc-swofc', 'r-office', 'gi0/0', rState, 'sw-office', 'fa0/1', swState);

  // Network Printer
  const printer: CanvasDevice = {
    id: 'printer-1', type: 'printer', name: 'Office-LaserJet-MFP', macAddress: '0011.2233.EE01',
    ip: '192.168.1.20', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 120, y: 340, status: 'online',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
    services: { http: { enabled: true, mode: 'simple', content: '<h1>HP LaserJet MFP Management Web Interface</h1><p>Status: Ready (Paper: 100%, Toner: 85%)</p>' } },
  };
  ctx.devices.push(printer);
  connect(ctx, 'conn-sw-printer', 'printer-1', 'eth0', null, 'sw-office', 'fa0/2', swState);

  // IoT Smart Sensor
  const iotDev: CanvasDevice = {
    id: 'iot-temp', type: 'iot', name: 'Office-Climate-Sensor', macAddress: '0011.2233.EE02',
    ip: '192.168.1.30', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 280, y: 340, status: 'online',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
    services: { http: { enabled: true, mode: 'simple', content: '<h1>Climate Sensor Panel</h1><p>Temperature: 22.4°C | Humidity: 45%</p>' } },
  };
  ctx.devices.push(iotDev);
  connect(ctx, 'conn-sw-iot', 'iot-temp', 'eth0', null, 'sw-office', 'fa0/3', swState);

  // Office Workstation PC
  addPcToSwitch(ctx, 1, '192.168.1.101', '192.168.1.1', '8.8.8.8', 'sw-office', swState, 'fa0/4', 460, 340, { name: 'Manager-PC' });

  // Mobile Tablet Client
  const tablet: CanvasDevice = {
    id: 'mob-tablet', type: 'mobile', name: 'Staff-Tablet-iPad', macAddress: '0011.2233.EE03',
    ip: '192.168.1.150', subnet: '255.255.255.0', gateway: '192.168.1.1', x: 640, y: 340, status: 'online',
    wifi: { enabled: true, ssid: 'Office-Staff-WiFi', mode: 'client', security: 'wpa2', password: 'officepassword' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  ctx.devices.push(tablet);

  return ctx;
}

// ===========================================================================
// 27. Enterprise Network Services (HTTP, DNS, Syslog/SNMP)
// ===========================================================================
function generateEnterpriseServices(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Gateway Router
  const { state: rState } = addRouter(ctx, 'r-srv-gw', 'Services-Gateway', '0011.2233.9901', 380, 50);
  enableRouterPort(rState, 'gi0/0', '10.0.0.1', '255.255.255.0');

  // Distribution Switch
  const { state: swState } = addSwitch(ctx, 'sw-srv', 'Server-Farm-SW', '0011.2233.8801', 380, 180);
  connect(ctx, 'conn-rgw-swsrv', 'r-srv-gw', 'gi0/0', rState, 'sw-srv', 'fa0/1', swState);

  // Web Server (HTTP / HTTPS)
  const webServer: CanvasDevice = {
    id: 'srv-web', type: 'pc', name: 'Web-Server (corp.local)', macAddress: '0011.2233.DD01',
    ip: '10.0.0.10', subnet: '255.255.255.0', gateway: '10.0.0.1', dns: '10.0.0.20', x: 100, y: 340, status: 'online',
    ports: generatePCPorts(),
    services: { http: { enabled: true, mode: 'simple', content: '<h1>Enterprise Intranet Portal</h1><p>Welcome to Corporate Cloud Services</p>' } },
  };
  ctx.devices.push(webServer);
  connect(ctx, 'conn-sw-web', 'srv-web', 'eth0', null, 'sw-srv', 'fa0/2', swState);

  // DNS Resolver Server
  const dnsServer: CanvasDevice = {
    id: 'srv-dns', type: 'pc', name: 'DNS-Server (ns1.corp)', macAddress: '0011.2233.DD02',
    ip: '10.0.0.20', subnet: '255.255.255.0', gateway: '10.0.0.1', dns: '10.0.0.20', x: 280, y: 340, status: 'online',
    ports: generatePCPorts(),
    services: { dns: { enabled: true, records: [{ domain: 'corp.local', address: '10.0.0.10' }, { domain: 'log.corp', address: '10.0.0.30' }] } },
  };
  ctx.devices.push(dnsServer);
  connect(ctx, 'conn-sw-dns', 'srv-dns', 'eth0', null, 'sw-srv', 'fa0/3', swState);

  // Syslog & Monitoring Server
  const logServer: CanvasDevice = {
    id: 'srv-log', type: 'pc', name: 'Syslog-SNMP-Collector', macAddress: '0011.2233.DD03',
    ip: '10.0.0.30', subnet: '255.255.255.0', gateway: '10.0.0.1', dns: '10.0.0.20', x: 460, y: 340, status: 'online',
    ports: generatePCPorts(),
    services: { http: { enabled: true, mode: 'simple', content: '<h1>Syslog & Network Telemetry Dashboard</h1><p>Active Agents: 12 | Status: All Healthy</p>' } },
  };
  ctx.devices.push(logServer);
  connect(ctx, 'conn-sw-log', 'srv-log', 'eth0', null, 'sw-srv', 'fa0/4', swState);

  // Client Workstation
  addPcToSwitch(ctx, 1, '10.0.0.100', '10.0.0.1', '10.0.0.20', 'sw-srv', swState, 'fa0/5', 650, 340, { name: 'DevOps-Engineer-PC' });

  return ctx;
}

// ===========================================================================
// 28. Python Network Automation Lab (Netmiko / RESTCONF)
// ===========================================================================
function generateNetautoPython(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Out-Of-Band Management Switch
  const { state: swMgmt } = addSwitch(ctx, 'sw-mgmt', 'OOBM-Mgmt-SW', '0011.2233.8801', 380, 180);

  // Python Automation Station PC
  const autoPc: CanvasDevice = {
    id: 'pc-netauto', type: 'pc', name: 'Python-Automation-Node', macAddress: '0011.2233.AA10',
    ip: '192.168.100.10', subnet: '255.255.255.0', gateway: '192.168.100.1', dns: '8.8.8.8', x: 380, y: 40, status: 'online',
    ports: generatePCPorts(),
    services: { http: { enabled: true, mode: 'simple', content: '<h1>Python Network Automation Engine</h1><p>Modules: Netmiko, NAPALM, Scapy, RESTCONF</p>' } },
  };
  ctx.devices.push(autoPc);
  connect(ctx, 'conn-auto-mgmt', 'pc-netauto', 'eth0', null, 'sw-mgmt', 'fa0/1', swMgmt);

  // Target Routers Fleet (R1, R2, R3)
  const routers = [
    { id: 'r-auto-1', name: 'Edge-R1', mac: '0011.2233.9901', x: 120, y: 340, ip: '192.168.100.11', swPort: 'fa0/2' },
    { id: 'r-auto-2', name: 'Core-R2', mac: '0011.2233.9902', x: 380, y: 340, ip: '192.168.100.12', swPort: 'fa0/3' },
    { id: 'r-auto-3', name: 'Dist-R3', mac: '0011.2233.9903', x: 640, y: 340, ip: '192.168.100.13', swPort: 'fa0/4' },
  ];

  routers.forEach(r => {
    const { state: rState } = addRouter(ctx, r.id, r.name, r.mac, r.x, r.y, {
      security: {
        users: [{ username: 'admin', privilege: 15, password: 'ciscopassword' }],
        vtyLines: { login: true, transportInput: ['ssh', 'telnet'], execTimeout: { minutes: 15, seconds: 0 } },
      },
    });
    enableRouterPort(rState, 'gi0/0', r.ip, '255.255.255.0');
    connect(ctx, `conn-${r.id}-mgmt`, r.id, 'gi0/0', rState, 'sw-mgmt', r.swPort, swMgmt);
  });

  return ctx;
}

// ===========================================================================
// Main dispatcher
// ===========================================================================
export function generateTopology(scenario: ScenarioType, pcCount: number): GeneratedTopology {
  let ctx: Ctx;
  switch (scenario) {
    case 'soho': ctx = generateSoho(pcCount); break;
    case 'star': ctx = generateStar(pcCount); break;
    case 'ring': ctx = generateRing(pcCount); break;
    case 'full-mesh': ctx = generateFullMesh(pcCount); break;
    case 'partial-mesh': ctx = generatePartialMesh(pcCount); break;
    case 'grid-2d': ctx = generateGrid2D(); break;
    case 'spine-leaf': ctx = generateSpineLeaf(pcCount); break;
    case 'fat-tree': ctx = generateFatTree(pcCount); break;
    case 'hybrid-enterprise': ctx = generateHybridEnterprise(); break;
    case 'enterprise-wlc': ctx = generateEnterpriseWlc(); break;
    case 'iot-smart-home': ctx = generateIotSmartHome(); break;
    case 'office-printer-iot': ctx = generateOfficePrinterIot(pcCount); break;
    case 'enterprise-services': ctx = generateEnterpriseServices(pcCount); break;
    case 'netauto-python': ctx = generateNetautoPython(pcCount); break;
    case 'multi-area-ospf': ctx = generateMultiAreaOspf(pcCount); break;
    case 'bgp-dual-homed': ctx = generateBgpDualHomed(); break;
    case 'dmz-firewall': ctx = generateDmzFirewall(pcCount); break;
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
