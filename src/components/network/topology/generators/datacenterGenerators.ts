import type { CanvasDevice } from '../../networkTopology.types';
import {
  type Ctx,
  newCtx,
  addRouter,
  addL3Switch,
  addSwitch,
  addFirewall,
  addWlc,
  addAccessPoint,
  addPcToSwitch,
  connect,
  enableRouterPort,
} from './shared';

// ===========================================================================
// 7. Spine-Leaf (Data Center Clos)
// ===========================================================================
export function generateSpineLeaf(_pcCount: number): Ctx {
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
export function generateFatTree(_pcCount: number): Ctx {
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
export function generateHybridEnterprise(): Ctx {
  const ctx = newCtx();
  // Perimeter Edge Firewall
  const { state: fwState } = addFirewall(ctx, 'fw-edge', 'HQ-Perimeter-FW', '0011.2233.9901', 360, 60, {
    firewallRules: [
      { id: 'rule-1', action: 'allow', protocol: 'tcp', sourceIp: 'any', targetIp: '172.16.0.50', port: '80', enabled: true },
      { id: 'rule-2', action: 'allow', protocol: 'tcp', sourceIp: 'any', targetIp: '172.16.0.50', port: '443', enabled: true },
      { id: 'rule-3', action: 'allow', protocol: 'any', sourceIp: '192.168.10.0/24', targetIp: 'any', port: 'any', enabled: true },
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
  const { state: apState } = addAccessPoint(ctx, 'ap-hq', 'HQ-Campus-AP', '0011.2233.AA01', '192.168.10.10', 80, 350, 'HQ-Corp-WiFi', '5GHz', '192.168.10.1');
  connect(ctx, 'conn-ap-hqsw', 'ap-hq', 'gi0/0', apState, 'sw-hq', 'fa0/23', hqSw);

  // Mobile WiFi Client
  const mob: CanvasDevice = {
    id: 'mob-hq',
    type: 'mobile',
    name: 'HQ-Executive-Laptop',
    macAddress: '0011.2233.BB01',
    ip: '192.168.10.55',
    subnet: '255.255.255.0',
    gateway: '192.168.10.1',
    x: 80,
    y: 480,
    status: 'online',
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
