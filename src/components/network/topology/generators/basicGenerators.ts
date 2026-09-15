import {
  type Ctx,
  newCtx,
  addRouter,
  addSwitch,
  addPcToSwitch,
  connect,
  enableRouterPort,
} from './shared';

// ===========================================================================
// 1. SOHO (DHCP)
// ===========================================================================
export function generateSoho(pcCount: number): Ctx {
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
export function generateStar(pcCount: number): Ctx {
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
export function generateRing(pcCount: number): Ctx {
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
export function generateFullMesh(_pcCount: number): Ctx {
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
      dynamicRoutes: [{ destination: '10.0.0.0', subnetMask: '0.255.255.255', area: 0, nextHop: '', type: 'dynamic' }]
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
export function generatePartialMesh(_pcCount: number): Ctx {
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
export function generateGrid2D(): Ctx {
  const ctx = newCtx();
  const rows = 2;
  const cols = 3;
  const gridSw: Array<Array<{ device: { id: string }; state: any }>> = [];

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
