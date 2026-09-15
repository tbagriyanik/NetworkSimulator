import {
  type Ctx,
  newCtx,
  getPortType,
  addRouter,
  addSwitch,
  addPcToSwitch,
  connect,
  enableRouterPort,
} from './shared';

// ===========================================================================
// 16. ROAS (Router-on-a-Stick)
// ===========================================================================
export function generateRoas(): Ctx {
  const ctx = newCtx();
  const { state: rState } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 50);
  enableRouterPort(rState, 'gi0/0');
  rState.ports['gi0/0.10'] = {
    id: 'gi0/0.10',
    name: 'gi0/0.10',
    type: getPortType('gi0/0.10'),
    status: 'connected',
    shutdown: false,
    accessVlan: 10,
    mode: 'routed',
    ipAddress: '192.168.10.1',
    subnetMask: '255.255.255.0',
    vlan: 10,
    duplex: 'full',
    speed: '1000',
  };
  rState.ports['gi0/0.20'] = {
    id: 'gi0/0.20',
    name: 'gi0/0.20',
    type: getPortType('gi0/0.20'),
    status: 'connected',
    shutdown: false,
    accessVlan: 20,
    mode: 'routed',
    ipAddress: '192.168.20.1',
    subnetMask: '255.255.255.0',
    vlan: 20,
    duplex: 'full',
    speed: '1000',
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
// 18. VLAN Trunking (802.1Q)
// ===========================================================================
export function generateVlanTrunk(pcCount: number): Ctx {
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

// ===========================================================================
// 19. EtherChannel (LACP Bonding)
// ===========================================================================
export function generateEtherChannel(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: sw1s } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 200, 120);
  const { state: sw2s } = addSwitch(ctx, 'switch-2', 'SW2', '0011.2233.8802', 650, 120);

  sw1s.ports['fa0/23'].mode = 'trunk';
  sw1s.ports['fa0/23'].channelGroup = 1;
  sw1s.ports['fa0/23'].channelMode = 'active';
  sw1s.ports['fa0/23'].channelProtocol = 'lacp';

  sw1s.ports['fa0/24'].mode = 'trunk';
  sw1s.ports['fa0/24'].channelGroup = 1;
  sw1s.ports['fa0/24'].channelMode = 'active';
  sw1s.ports['fa0/24'].channelProtocol = 'lacp';

  sw2s.ports['fa0/23'].mode = 'trunk';
  sw2s.ports['fa0/23'].channelGroup = 1;
  sw2s.ports['fa0/23'].channelMode = 'active';
  sw2s.ports['fa0/23'].channelProtocol = 'lacp';

  sw2s.ports['fa0/24'].mode = 'trunk';
  sw2s.ports['fa0/24'].channelGroup = 1;
  sw2s.ports['fa0/24'].channelMode = 'active';
  sw2s.ports['fa0/24'].channelProtocol = 'lacp';

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
// 24. STP (Spanning Tree Protocol)
// ===========================================================================
export function generateStp(pcCount: number): Ctx {
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
