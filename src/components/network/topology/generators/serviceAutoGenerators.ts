import type { CanvasDevice } from '../../networkTopology.types';
import { generatePCPorts } from '../../networkTopology.portGenerators';
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
// 27. Enterprise Network Services (HTTP, DNS, Syslog/SNMP)
// ===========================================================================
export function generateEnterpriseServices(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Gateway Router
  const { state: rState } = addRouter(ctx, 'r-srv-gw', 'Services-Gateway', '0011.2233.9901', 380, 50);
  enableRouterPort(rState, 'gi0/0', '10.0.0.1', '255.255.255.0');

  // Distribution Switch
  const { state: swState } = addSwitch(ctx, 'sw-srv', 'Server-Farm-SW', '0011.2233.8801', 380, 180);
  connect(ctx, 'conn-rgw-swsrv', 'r-srv-gw', 'gi0/0', rState, 'sw-srv', 'fa0/1', swState);

  // Web Server (HTTP / HTTPS)
  const webServer: CanvasDevice = {
    id: 'srv-web',
    type: 'pc',
    name: 'Web-Server (corp.local)',
    macAddress: '0011.2233.DD01',
    ip: '10.0.0.10',
    subnet: '255.255.255.0',
    gateway: '10.0.0.1',
    dns: '10.0.0.20',
    x: 100,
    y: 340,
    status: 'online',
    ports: generatePCPorts(),
    services: { http: { enabled: true, mode: 'simple', content: '<h1>Enterprise Intranet Portal</h1><p>Welcome to Corporate Cloud Services</p>' } },
  };
  ctx.devices.push(webServer);
  connect(ctx, 'conn-sw-web', 'srv-web', 'eth0', null, 'sw-srv', 'fa0/2', swState);

  // DNS Resolver Server
  const dnsServer: CanvasDevice = {
    id: 'srv-dns',
    type: 'pc',
    name: 'DNS-Server (ns1.corp)',
    macAddress: '0011.2233.DD02',
    ip: '10.0.0.20',
    subnet: '255.255.255.0',
    gateway: '10.0.0.1',
    dns: '10.0.0.20',
    x: 280,
    y: 340,
    status: 'online',
    ports: generatePCPorts(),
    services: { dns: { enabled: true, records: [{ domain: 'corp.local', address: '10.0.0.10' }, { domain: 'log.corp', address: '10.0.0.30' }] } },
  };
  ctx.devices.push(dnsServer);
  connect(ctx, 'conn-sw-dns', 'srv-dns', 'eth0', null, 'sw-srv', 'fa0/3', swState);

  // Syslog & Monitoring Server
  const logServer: CanvasDevice = {
    id: 'srv-log',
    type: 'pc',
    name: 'Syslog-SNMP-Collector',
    macAddress: '0011.2233.DD03',
    ip: '10.0.0.30',
    subnet: '255.255.255.0',
    gateway: '10.0.0.1',
    dns: '10.0.0.20',
    x: 460,
    y: 340,
    status: 'online',
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
export function generateNetautoPython(_pcCount: number): Ctx {
  const ctx = newCtx();
  // Out-Of-Band Management Switch
  const { state: swMgmt } = addSwitch(ctx, 'sw-mgmt', 'OOBM-Mgmt-SW', '0011.2233.8801', 380, 180);

  // Python Automation Station PC
  const autoPc: CanvasDevice = {
    id: 'pc-netauto',
    type: 'pc',
    name: 'Python-Automation-Node',
    macAddress: '0011.2233.AA10',
    ip: '192.168.100.10',
    subnet: '255.255.255.0',
    gateway: '192.168.100.1',
    dns: '8.8.8.8',
    x: 380,
    y: 40,
    status: 'online',
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
        users: [{ username: 'admin', privilege: 15, password: 'password' }],
        vtyLines: { login: true, transportInput: ['ssh', 'telnet'], execTimeout: { minutes: 15, seconds: 0 } },
      },
    });
    enableRouterPort(rState, 'gi0/0', r.ip, '255.255.255.0');
    connect(ctx, `conn-${r.id}-mgmt`, r.id, 'gi0/0', rState, 'sw-mgmt', r.swPort, swMgmt);
  });

  return ctx;
}
