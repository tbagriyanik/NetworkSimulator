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
// 12. Multi-Area OSPF
// ===========================================================================
export function generateMultiAreaOspf(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Area 0 Backbone Router
  const { state: r0 } = addRouter(ctx, 'r-area0', 'R0-Backbone', '0011.2233.9901', 360, 60, {
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: '1.1.1.1',
    dynamicRoutes: [
      { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '10.0.0.4', subnetMask: '0.0.0.3', area: 0 },
    ],
  });
  enableRouterPort(r0, 'gi0/0', '10.0.0.1', '255.255.255.252');
  enableRouterPort(r0, 'gi0/1', '10.0.0.5', '255.255.255.252');

  // ABR Area 1
  const { state: r1 } = addRouter(ctx, 'r-area1', 'ABR-Area1', '0011.2233.9902', 160, 220, {
    routingProtocol: 'ospf', ospfProcessId: '1', routerId: '2.2.2.2',
    dynamicRoutes: [
      { destination: '10.0.0.0', subnetMask: '0.0.0.3', area: 0 },
      { destination: '192.168.1.0', subnetMask: '0.0.0.255', area: 1 },
    ],
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
    ],
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
export function generateBgpDualHomed(): Ctx {
  const ctx = newCtx();
  // Enterprise Edge Router (AS 65000)
  const { state: rEdge } = addRouter(ctx, 'r-bgp-edge', 'Edge-BGP (AS65000)', '0011.2233.9901', 360, 240, {
    bgpConfig: { localAs: 65000, neighbors: ['203.0.113.1', '198.51.100.1'] },
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
// 15. Static Routing
// ===========================================================================
export function generateStaticRouting(pcCount: number): Ctx {
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
// 17. OSPF (Single Area 0)
// ===========================================================================
export function generateOspf(pcCount: number): Ctx {
  const ctx = newCtx();
  const ospfExtras = (rid: string, nets: Array<{ destination: string; subnetMask: string; area: number }>) => ({
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
// 20. Triangle Routing (3-Node Mesh)
// ===========================================================================
export function generateTriangle(pcCount: number): Ctx {
  const ctx = newCtx();
  const ospfExtras = (rid: string, nets: Array<{ destination: string; subnetMask: string; area: number }>) => ({
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

// ===========================================================================
// 21. NAT (PAT / Overload)
// ===========================================================================
export function generateNat(pcCount: number): Ctx {
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
