import {
  type Ctx,
  newCtx,
  addRouter,
  addFirewall,
  addSwitch,
  addPcToSwitch,
  connect,
  enableRouterPort,
} from './shared';

// ===========================================================================
// 14. DMZ & Firewall Architecture (3-Zone)
// ===========================================================================
export function generateDmzFirewall(_pcCount: number): Ctx {
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
// 22. ACL (Access Control Lists)
// ===========================================================================
export function generateAcl(pcCount: number): Ctx {
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
// 23. Port Security
// ===========================================================================
export function generatePortSecurity(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 120);

  for (let i = 1; i <= pcCount; i++) {
    const portId = `fa0/${i}`;
    if (swState.ports[portId]) {
      swState.ports[portId].portSecurity = {
        enabled: true,
        maxAddresses: 1,
        violationAction: 'shutdown',
        sticky: true,
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
