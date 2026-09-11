import {
  baseProjectData,
  connectPorts,
  createFirewallDevice,
  createIotDevice,
  createL3SwitchDevice,
  createPcDevice,
  createRouterDevice,
  createSwitchDevice,
  createWlcDevice
} from './helpers';
import { createInitialRouterState, createInitialState, createInitialWLCState } from '../initialState';
import type { CanvasConnection, CanvasDevice, CanvasNote } from '@/components/network/networkTopology.types';
import type { ExampleProject } from './types';

const example = (isTr: boolean): ExampleProject => {
  const devices = [
    createRouterDevice('hq-router', 'R-HQ', 1200, 420, '203.0.113.2'),
    createRouterDevice('floor-router', 'R-FLOOR-2', 2250, 420, '10.50.0.1'),
    createFirewallDevice('edge-firewall', 'FW-EDGE', 1200, 650, '10.0.0.1'),
    createL3SwitchDevice('core-switch', 'SW-CORE', 1200, 900),
    createL3SwitchDevice('floor-l3-switch', 'SW-FLOOR-2', 2250, 900),
    createSwitchDevice('access-switch', 'SW-ACCESS', 1200, 1200, '10.10.10.2'),
    createWlcDevice('wireless-controller', 'WLC-HQ', 1700, 900, '10.20.20.2'),
    createPcDevice('office-pc', 'PC-OFFICE', 850, 1400, '10.10.10.10', 10, '10.10.10.1'),
    createPcDevice('server-pc', 'SRV-APP', 500, 1200, '10.10.20.10', 20, '10.10.20.1'),
    createPcDevice('guest-pc', 'PC-GUEST', 1700, 1200, '10.30.30.10', 30, '10.30.30.1'),
    createPcDevice('office-pc-2', 'PC-OFFICE-2', 850, 1600, '10.10.10.11', 10, '10.10.10.1'),
    createPcDevice('core-pc-1', 'PC-CORE-1', 700, 800, '10.40.40.10', 40, '10.40.40.1', '2001:db8:40::10'),
    createPcDevice('core-pc-2', 'PC-CORE-2', 700, 1000, '10.40.40.11', 40, '10.40.40.1', '2001:db8:40::11'),
    createPcDevice('router-console-pc', 'PC-CONSOLE', 700, 350, '10.99.99.10', 99, '10.99.99.1'),
    createPcDevice('hq-router-pc-1', 'PC-HQ-R1', 850, 500, '10.70.10.10', 70, '10.70.10.1'),
    createPcDevice('hq-router-pc-2', 'PC-HQ-R2', 850, 650, '10.70.10.11', 70, '10.70.10.1'),
    createPcDevice('floor-router-pc-1', 'PC-FLOOR-R1', 2050, 250, '10.50.10.10', 50, '10.50.10.1'),
    createPcDevice('floor-router-pc-2', 'PC-FLOOR-R2', 2500, 250, '10.50.10.11', 50, '10.50.10.1'),
    createPcDevice('floor-l3-pc-1', 'PC-FLOOR-L3-1', 2050, 1250, '10.60.10.10', 60, '10.60.10.1', '2001:db8:60::10'),
    createPcDevice('floor-l3-pc-2', 'PC-FLOOR-L3-2', 2500, 1250, '10.60.10.11', 60, '10.60.10.1', '2001:db8:60::11'),
    createIotDevice('temperature-sensor', 'IoT-TEMP', 1400, 600, 'temperature'),
    createIotDevice('humidity-sensor', 'IoT-HUMIDITY', 1600, 600, 'humidity'),
    createIotDevice('motion-sensor', 'IoT-MOTION', 1800, 600, 'motion'),
    createIotDevice('smart-light', 'IoT-LIGHT', 2000, 600, 'light')
  ];
  const connections: CanvasConnection[] = [];
  connectPorts(devices, connections, 'hq-router', 'gi0/0', 'edge-firewall', 'gi0/0', 'straight');
  connectPorts(devices, connections, 'edge-firewall', 'gi0/1', 'core-switch', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'core-switch', 'gi1/0/6', 'access-switch', 'gi0/1', 'straight');
  connectPorts(devices, connections, 'core-switch', 'gi1/0/7', 'access-switch', 'gi0/2', 'straight');
  connectPorts(devices, connections, 'core-switch', 'gi1/0/3', 'wireless-controller', 'gi0/0', 'straight');
  connectPorts(devices, connections, 'access-switch', 'fa0/1', 'office-pc', 'eth0', 'straight');
  connectPorts(devices, connections, 'access-switch', 'fa0/2', 'server-pc', 'eth0', 'straight');
  connectPorts(devices, connections, 'access-switch', 'fa0/3', 'office-pc-2', 'eth0', 'straight');
  connectPorts(devices, connections, 'core-switch', 'gi1/0/4', 'core-pc-1', 'eth0', 'straight');
  connectPorts(devices, connections, 'core-switch', 'gi1/0/5', 'core-pc-2', 'eth0', 'straight');
  connectPorts(devices, connections, 'wireless-controller', 'gi0/1', 'guest-pc', 'eth0', 'straight');
  // Showcase the remaining physical media used in the simulator.
  connectPorts(devices, connections, 'hq-router', 's0/0/0', 'floor-router', 's0/0/0', 'serial');
  connectPorts(devices, connections, 'hq-router', 'console', 'router-console-pc', 'com1', 'console');
  connectPorts(devices, connections, 'hq-router', 'gi0/2', 'hq-router-pc-1', 'eth0', 'straight');
  connectPorts(devices, connections, 'hq-router', 'gi0/3', 'hq-router-pc-2', 'eth0', 'straight');
  connectPorts(devices, connections, 'floor-router', 'gi0/0', 'floor-l3-switch', 'gi1/0/1', 'straight');
  connectPorts(devices, connections, 'floor-router', 'gi0/2', 'floor-router-pc-1', 'eth0', 'straight');
  connectPorts(devices, connections, 'floor-router', 'gi0/3', 'floor-router-pc-2', 'eth0', 'straight');
  connectPorts(devices, connections, 'floor-l3-switch', 'gi1/0/2', 'floor-l3-pc-1', 'eth0', 'straight');
  connectPorts(devices, connections, 'floor-l3-switch', 'gi1/0/3', 'floor-l3-pc-2', 'eth0', 'straight');
  ['temperature-sensor', 'humidity-sensor', 'motion-sensor', 'smart-light'].forEach((iotId) => {
    connections.push({
      id: `wireless-${iotId}-wlc-hq`,
      sourceDeviceId: iotId,
      sourcePort: 'wlan0',
      targetDeviceId: 'wireless-controller',
      targetPort: 'wlan0',
      cableType: 'wireless',
      active: true
    });
  });

  const tempSensor = devices.find(d => d.id === 'temperature-sensor');
  if (tempSensor) {
    tempSensor.wifi = {
      enabled: true, ssid: 'HQ-IoT', security: 'wpa2', password: 'IoT-Only-2026', channel: '2.4GHz', mode: 'client'
    };
  }
  ['humidity-sensor', 'motion-sensor', 'smart-light'].forEach((id) => {
    const dev = devices.find(d => d.id === id);
    if (dev) {
      dev.wifi = { enabled: true, ssid: 'HQ-IoT', security: 'wpa2', password: 'IoT-Only-2026', channel: '2.4GHz', mode: 'client' };
    }
  });
  const wlc = devices.find(d => d.id === 'wireless-controller');
  if (wlc) {
    // Use the IoT WLAN interface as the WLC's primary topology address so
    // WLC-HQ and its wireless clients can communicate on 10.80.10.0/24.
    wlc.ip = '10.80.10.1';
    wlc.subnet = '255.255.255.0';
    wlc.wifi = { enabled: true, ssid: 'HQ-IoT', security: 'wpa2', password: 'IoT-Only-2026', channel: '2.4GHz', mode: 'ap' };
    const guestInterface = wlc.ports.find(port => port.id === 'gi0/1');
    if (guestInterface) {
      guestInterface.status = 'connected';
      guestInterface.ipAddress = '10.30.30.1';
      guestInterface.subnetMask = '255.255.255.0';
      guestInterface.vlan = 30;
      guestInterface.adminStatus = 'up';
      guestInterface.operStatus = 'up';
    }
    const wlcRadio = wlc.ports.find(port => port.id === 'wlan0');
    if (wlcRadio) {
      wlcRadio.status = 'connected';
      wlcRadio.ipAddress = '10.80.10.1';
      wlcRadio.subnetMask = '255.255.255.0';
      wlcRadio.vlan = 80;
      wlcRadio.wifi = { ssid: 'HQ-IoT', security: 'wpa2', password: 'IoT-Only-2026', channel: '2.4GHz', mode: 'ap' };
    }
  }
  const iotAddresses: Record<string, string> = {
    'temperature-sensor': '10.80.10.10',
    'humidity-sensor': '10.80.10.11',
    'motion-sensor': '10.80.10.12',
    'smart-light': '10.80.10.13'
  };
  Object.entries(iotAddresses).forEach(([id, ip]) => {
    const device = devices.find(item => item.id === id);
    if (device) {
      device.ip = ip;
      device.subnet = '255.255.255.0';
      device.gateway = '10.80.10.1';
      device.ipConfigMode = 'static';
    }
  });
  const serverPc = devices.find(d => d.id === 'server-pc');
  if (serverPc) {
    serverPc.services = {
      dns: { enabled: true, records: [{ domain: 'intranet.hq.local', address: '10.10.20.10' }, { domain: 'mail.hq.local', address: '10.10.20.10' }] },
      dhcp: { enabled: true, pools: [{ poolName: 'OFFICE-VLAN10', defaultGateway: '10.10.10.1', dnsServer: '10.10.20.10', startIp: '10.10.10.100', subnetMask: '255.255.255.0', maxUsers: 100 }] },
      http: { enabled: true, mode: 'simple', content: '<h1>Merhaba Dünya! / Hello World!</h1>\n<p>HQ Intranet - Network Operations Center (C:\\www\\index.html)</p>' },
      ftp: { enabled: true, username: 'netadmin', password: 'Lab-Ftp-2026', rootDirectory: 'C:\\upload', anonymousAccess: false, files: [{ name: 'topology.txt', size: 2048 }] },
      mail: { enabled: true, domain: 'local.lan', username: 'user', password: 'mail123' }
    };
  }
  const core = devices.find(d => d.id === 'core-switch');
  const access = devices.find(d => d.id === 'access-switch');
  const floorCore = devices.find(d => d.id === 'floor-l3-switch');
  const hqRouter = devices.find(d => d.id === 'hq-router');
  const floorRouter = devices.find(d => d.id === 'floor-router');
  if (hqRouter) {
    hqRouter.ip = '10.70.10.1';
    hqRouter.subnet = '255.255.255.0';
  }
  if (floorRouter) {
    floorRouter.ip = '10.50.10.1';
    floorRouter.subnet = '255.255.255.0';
  }
  if (core) {
    core.ip = '10.40.40.1';
    core.subnet = '255.255.255.0';
  }
  const mark = (device: CanvasDevice | undefined, portId: string, values: Record<string, unknown>) => {
    if (!device) return;
    const port = device.ports.find(p => p.id === portId);
    if (port) Object.assign(port, values);
  };
  // The topology itself carries the lab's intended switching configuration.
  mark(core, 'gi1/0/1', { mode: 'routed', ipAddress: '10.0.0.2', subnetMask: '255.255.255.252', ipv6Address: '2001:db8:0:1::2', ipv6Prefix: 64 });
  mark(core, 'gi1/0/2', { mode: 'trunk', allowedVlans: [10, 20, 30, 40], nativeVlan: 99, spanningTree: { role: 'designated', state: 'forwarding' } });
  mark(access, 'gi0/1', { mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40], nativeVlan: 99, spanningTree: { role: 'root', state: 'forwarding' } });
  mark(core, 'gi1/0/6', { mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40] });
  mark(core, 'gi1/0/7', { mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40] });
  mark(core, 'gi1/0/4', { mode: 'access', accessVlan: 40, vlan: 40 });
  mark(core, 'gi1/0/5', { mode: 'access', accessVlan: 40, vlan: 40 });
  mark(access, 'gi0/2', { mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40] });
  mark(access, 'fa0/1', { mode: 'access', accessVlan: 10, vlan: 10, portSecurity: { enabled: true, maxAddresses: 2, violationAction: 'restrict', sticky: true } });
  mark(access, 'fa0/2', { mode: 'access', accessVlan: 20, vlan: 20 });
  mark(access, 'fa0/3', { mode: 'access', accessVlan: 10, vlan: 10 });
  mark(floorCore, 'gi1/0/1', { mode: 'routed', ipAddress: '10.50.0.2', subnetMask: '255.255.255.252', ipv6Address: '2001:db8:50::2', ipv6Prefix: 64 });
  mark(floorCore, 'gi1/0/2', { mode: 'access', accessVlan: 60, vlan: 60 });
  mark(floorCore, 'gi1/0/3', { mode: 'access', accessVlan: 60, vlan: 60 });
  mark(floorCore, 'gi1/0/4', { mode: 'trunk', allowedVlans: [50, 60, 80], nativeVlan: 99 });
  const notes: CanvasNote[] = [
    { id: 'architecture-note', text: isTr ? 'Kapsamlı Proje: Merkez ofis ağı\n\nR-HQ: İnternet/ISP sınırı\nFW-EDGE: Güvenlik duvarı\nSW-CORE: VLAN yönlendirme\nSW-ACCESS: Kullanıcı ve sunucu erişimi\nWLC: Kablosuz ağ yönetimi' : 'COMPREHENSIVE PROJECT: Headquarters network\n\nR-HQ: Internet/ISP boundary\nFW-EDGE: Security perimeter\nSW-CORE: VLAN routing\nSW-ACCESS: User and server access\nWLC: Wireless management', x: 400, y: 80, width: 370, height: 220, color: 'var(--color-primary-500)', font: 'verdana', fontSize: 16, opacity: 0.75, bold: true },
    { id: 'vlan-note', text: isTr ? 'VLAN PLANI\n\nVLAN 10: Ofis kullanıcıları\nVLAN 20: Uygulama sunucuları\nVLAN 30: Misafir ağı\n\nNot: VLAN’lar arası trafik SW-CORE üzerinde yönlendirilir; misafir ağı FW-EDGE ile sınırlandırılır.' : 'VLAN PLAN\n\nVLAN 10: Office users\nVLAN 20: Application servers\nVLAN 30: Guest network\n\nNote: Inter-VLAN routing is performed by SW-CORE; guest traffic is restricted by FW-EDGE.', x: 760, y: 40, width: 430, height: 220, color: 'var(--color-warning-500)', font: 'verdana', fontSize: 12, opacity: 0.75 },
    { id: 'selection-note', text: isTr ? 'KANVAS KULLANIMI\n\n• Cihazı seçmek için üzerine tıklayın.\n• Kabloyu seçmek için doğrudan kablo çizgisine tıklayın.\n• Kablolar renk ve yönleriyle bağlantı türünü ayırt eder.\n• IoT-SENSOR kablosuz olarak HQ-IoT SSID’sine bağlıdır.' : 'CANVAS USAGE\n\n• Click a device to select it.\n• Click directly on a cable line to select the link.\n• Cables are visually separated by type and direction.\n• IoT-SENSOR connects wirelessly to the HQ-IoT SSID.', x: 60, y: 500, width: 370, height: 210, color: 'var(--color-success-500)', font: 'verdana', fontSize: 12, opacity: 0.75 }
    ,{ id: 'services-note', text: isTr ? 'İLERİ DÜZEY LAB\n\nSunucu: DNS + DHCP + HTTP + FTP + MAIL\nYönetim: SSH (22) güvenli, TELNET (23) yalnızca lab/test\n\nSW-CORE: L3 SVI routing + IPv6\nSW-CORE ↔ SW-ACCESS: 802.1Q trunk, VTP domain HQ-LAB\nSTP: root SW-CORE\nPort-channel: Gi1/0/6-7 (LACP)\nGüvenlik: enable secret, console/vty parola, port-security.' : 'ADVANCED LAB\n\nServer: DNS + DHCP + HTTP + FTP + MAIL\nManagement: SSH (22) secure, TELNET (23) lab/test only\n\nSW-CORE: L3 SVI routing + IPv6\nSW-CORE ↔ SW-ACCESS: 802.1Q trunk, VTP domain HQ-LAB\nSTP: SW-CORE is root\nPort-channel: Gi1/0/6-7 (LACP)\nSecurity: enable secret, console/vty password, port-security.', x: 50, y: 300, width: 540, height: 250, color: 'var(--color-error-500)', font: 'verdana', fontSize: 12, opacity: 0.75 },
    { id: 'iot-ip-note', text: isTr ? 'WLC + IoT BAĞLANTISI\n\nWLC SSID: HQ-IoT\nGüvenlik: WPA2 / IoT-Only-2026\nAğ: 10.80.10.0/24\nAğ geçidi: 10.80.10.1\n\nIoT-TEMP      10.80.10.10\nIoT-HUMIDITY  10.80.10.11\nIoT-MOTION    10.80.10.12\nIoT-LIGHT     10.80.10.13\n\nIoT cihazları kablosuz olarak WLC’nin HQ-IoT WLAN’ına katılır. WLC, SSID ve erişim politikasını merkezi olarak yönetir.' : 'WLC + IoT CONNECTION\n\nWLC SSID: HQ-IoT\nSecurity: WPA2 / IoT-Only-2026\nNetwork: 10.80.10.0/24\nGateway: 10.80.10.1\n\nIoT-TEMP      10.80.10.10\nIoT-HUMIDITY  10.80.10.11\nIoT-MOTION    10.80.10.12\nIoT-LIGHT     10.80.10.13\n\nIoT devices join the WLC HQ-IoT WLAN wirelessly. The WLC centrally manages the SSID and access policy.', x: 1450, y: 1680, width: 600, height: 260, color: 'var(--color-success-500)', font: 'verdana', fontSize: 12, opacity: 0.75 }
  ];
  const floorState = createInitialState('00:50:00:00:60:02', 'NS-L3-24PS');
  floorState.hostname = 'SW-FLOOR-2';
  floorState.switchModel = 'NS-L3-24PS';
  floorState.switchLayer = 'L3';
  floorState.ipRouting = true;
  floorState.vlans[60] = { id: 60, name: 'FLOOR-USERS', status: 'active', ports: ['gi1/0/2', 'gi1/0/3'] };
  floorState.ports['vlan60'] = {
    id: 'vlan60', name: 'VLAN60', status: 'connected', vlan: 60, mode: 'access',
    duplex: 'auto', speed: 'auto', shutdown: false, type: 'vlan',
    ipAddress: '10.60.10.1', subnetMask: '255.255.255.0'
  };
  floorState.ports['gi1/0/1'] = { ...floorState.ports['gi1/0/1'], status: 'connected', mode: 'routed', ipAddress: '10.50.0.2', subnetMask: '255.255.255.252', shutdown: false };
  floorState.ports['gi1/0/2'] = { ...floorState.ports['gi1/0/2'], status: 'connected', vlan: 60, accessVlan: 60, mode: 'access', shutdown: false };
  floorState.ports['gi1/0/3'] = { ...floorState.ports['gi1/0/3'], status: 'connected', vlan: 60, accessVlan: 60, mode: 'access', shutdown: false };

  const coreState = createInitialState('00:50:00:00:40:02', 'NS-L3-24PS');
  coreState.hostname = 'SW-CORE';
  coreState.switchModel = 'NS-L3-24PS';
  coreState.switchLayer = 'L3';
  coreState.ipRouting = true;
  [10, 20, 40].forEach((vlan) => {
    coreState.vlans[vlan] = { id: vlan, name: `VLAN-${vlan}`, status: 'active', ports: [] };
    coreState.ports[`vlan${vlan}`] = {
      id: `vlan${vlan}`, name: `VLAN${vlan}`, status: 'connected', vlan, mode: 'access',
      duplex: 'auto', speed: 'auto', shutdown: false, type: 'vlan',
      ipAddress: ({ 10: '10.10.10.1', 20: '10.10.20.1', 30: '10.30.30.1', 40: '10.40.40.1' } as Record<number, string>)[vlan], subnetMask: '255.255.255.0'
    };
  });
  coreState.ports['gi1/0/4'] = { ...coreState.ports['gi1/0/4'], status: 'connected', vlan: 40, accessVlan: 40, mode: 'access', shutdown: false };
  coreState.ports['gi1/0/5'] = { ...coreState.ports['gi1/0/5'], status: 'connected', vlan: 40, accessVlan: 40, mode: 'access', shutdown: false };
  coreState.ports['gi1/0/6'] = { ...coreState.ports['gi1/0/6'], status: 'connected', mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40], shutdown: false };
  coreState.ports['gi1/0/7'] = { ...coreState.ports['gi1/0/7'], status: 'connected', mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40], shutdown: false };

  const hqRouterState = createInitialRouterState('00:50:00:00:70:01');
  hqRouterState.hostname = 'R-HQ';
  hqRouterState.ports['gi0/0'] = { ...hqRouterState.ports['gi0/0'], status: 'connected', adminStatus: 'up', operStatus: 'up', shutdown: false };
  hqRouterState.ports['s0/0/0'] = { ...hqRouterState.ports['s0/0/0'], status: 'connected', adminStatus: 'up', operStatus: 'up', shutdown: false };
  hqRouterState.ports['gi0/2'] = { ...hqRouterState.ports['gi0/2'], status: 'connected', adminStatus: 'up', operStatus: 'up', ipAddress: '10.70.10.1', subnetMask: '255.255.255.0', shutdown: false };
  hqRouterState.ports['gi0/3'] = { ...hqRouterState.ports['gi0/3'], status: 'connected', adminStatus: 'up', operStatus: 'up', ipAddress: '10.70.10.254', subnetMask: '255.255.255.0', shutdown: false };

  const floorRouterState = createInitialRouterState('00:50:00:00:50:01');
  floorRouterState.hostname = 'R-FLOOR-2';
  floorRouterState.ports['s0/0/0'] = { ...floorRouterState.ports['s0/0/0'], status: 'connected', adminStatus: 'up', operStatus: 'up', shutdown: false };
  floorRouterState.ports['gi0/0'] = { ...floorRouterState.ports['gi0/0'], status: 'connected', adminStatus: 'up', operStatus: 'up', shutdown: false };
  floorRouterState.ports['gi0/2'] = { ...floorRouterState.ports['gi0/2'], status: 'connected', adminStatus: 'up', operStatus: 'up', ipAddress: '10.50.10.1', subnetMask: '255.255.255.0', shutdown: false };
  floorRouterState.ports['gi0/3'] = { ...floorRouterState.ports['gi0/3'], status: 'connected', adminStatus: 'up', operStatus: 'up', ipAddress: '10.50.10.254', subnetMask: '255.255.255.0', shutdown: false };

  const accessState = createInitialState('00:50:00:00:10:02', 'NS-L2-24TT-L');
  accessState.hostname = 'SW-ACCESS';
  accessState.switchModel = 'NS-L2-24TT-L';
  accessState.switchLayer = 'L2';
  accessState.vlans[10] = { id: 10, name: 'OFFICE', status: 'active', ports: ['fa0/1', 'fa0/2', 'fa0/3'] };
  accessState.ports['vlan10'] = {
    id: 'vlan10', name: 'VLAN10', status: 'connected', vlan: 10, mode: 'access',
    duplex: 'auto', speed: 'auto', shutdown: false, type: 'vlan',
    ipAddress: '10.10.10.2', subnetMask: '255.255.255.0'
  };
  accessState.ports['fa0/1'] = { ...accessState.ports['fa0/1'], status: 'connected', vlan: 10, accessVlan: 10, mode: 'access', shutdown: false };
  accessState.ports['fa0/2'] = { ...accessState.ports['fa0/2'], status: 'connected', vlan: 20, accessVlan: 20, mode: 'access', shutdown: false };
  accessState.ports['fa0/3'] = { ...accessState.ports['fa0/3'], status: 'connected', vlan: 10, accessVlan: 10, mode: 'access', shutdown: false };
  accessState.ports['gi0/1'] = { ...accessState.ports['gi0/1'], status: 'connected', mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40], shutdown: false };
  accessState.ports['gi0/2'] = { ...accessState.ports['gi0/2'], status: 'connected', mode: 'trunk', channelGroup: 1, channelMode: 'active', channelProtocol: 'lacp', allowedVlans: [10, 20, 30, 40], shutdown: false };

  const wlcState = createInitialWLCState('00:50:00:00:20:02');
  wlcState.hostname = 'WLC-HQ';
  wlcState.ports['gi0/0'] = { ...wlcState.ports['gi0/0'], status: 'connected', ipAddress: '10.20.20.2', subnetMask: '255.255.255.0', shutdown: false };
  wlcState.ports['gi0/1'] = { ...wlcState.ports['gi0/1'], status: 'connected', ipAddress: '10.30.30.1', subnetMask: '255.255.255.0', shutdown: false, vlan: 30 };
  wlcState.ports['wlan0'] = { ...wlcState.ports['wlan0'], status: 'connected', ipAddress: '10.80.10.1', subnetMask: '255.255.255.0', shutdown: false, vlan: 80, mode: 'routed' };
  wlcState.wlcWlans = { '10': { id: 10, name: 'HQ-IoT-WLAN', ssid: 'HQ-IoT', status: 'enabled', security: 'wpa2', vlan: 80 } };
  return { id: 'real-world-comprehensive', tag: isTr ? 'KAPSAMLI' : 'COMPREHENSIVE', title: isTr ? 'Kapsamlı Proje: Ofis Ağı' : 'Comprehensive Project: Office Network', description: isTr ? 'Tüm cihaz tiplerini, güvenlik duvarını, VLAN’ları, kablolu ve kablosuz istemcileri içeren okunabilir kampüs/ofis ağı.' : 'Readable office network containing every device type, firewall, VLANs, wired and wireless clients.', detail: isTr ? 'R-HQ → FW-EDGE → SW-CORE → SW-ACCESS/WLC; VLAN 10/20/30 ve IoT.' : 'R-HQ → FW-EDGE → SW-CORE → SW-ACCESS/WLC; VLAN 10/20/30 and IoT.', level: 'advanced', data: baseProjectData(devices, connections, notes.filter(note => note.id !== 'selection-note'), [{ id: 'hq-router', state: hqRouterState }, { id: 'floor-router', state: floorRouterState }, { id: 'access-switch', state: accessState }, { id: 'core-switch', state: coreState }, { id: 'floor-l3-switch', state: floorState }, { id: 'wireless-controller', state: wlcState }]) };
};

export default example;
