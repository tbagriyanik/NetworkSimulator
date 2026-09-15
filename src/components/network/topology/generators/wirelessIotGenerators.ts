import type { CanvasDevice } from '../../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { generateRouterPorts } from '../../networkTopology.portGenerators';
import {
  type Ctx,
  newCtx,
  MAC_POOL,
  getPortType,
  addRouter,
  addSwitch,
  addWlc,
  addPcToSwitch,
  connect,
  enableRouterPort,
} from './shared';

// ===========================================================================
// 10. Enterprise WLC & Multi-AP
// ===========================================================================
export function generateEnterpriseWlc(): Ctx {
  const ctx = newCtx();
  // Core Switch
  const { state: swCore } = addSwitch(ctx, 'sw-core', 'Core-SW', '0011.2233.8801', 380, 100);

  // WLC Controller
  const { state: wlcState } = addWlc(ctx, 'wlc-1', 'WLC-5508', '0011.2233.CC01', 160, 100, '192.168.1.5', '192.168.1.1');
  connect(ctx, 'conn-wlc-core', 'wlc-1', 'gi0/0', wlcState, 'sw-core', 'fa0/1', swCore);

  // AP 1 (Floor 1)
  const ap1: CanvasDevice = {
    id: 'ap-floor1',
    type: 'router',
    name: 'AP-Floor1',
    macAddress: '0011.2233.AA01',
    ip: '192.168.1.10',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 240,
    y: 260,
    status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', security: 'wpa2', password: 'password123', channel: '2.4GHz', mode: 'ap' },
    ports: generateRouterPorts(),
  };
  ctx.devices.push(ap1);
  const ap1State = { deviceType: 'router', hostname: 'AP-Floor1', ports: {} } as unknown as SwitchState;
  ctx.states.set('ap-floor1', ap1State);
  connect(ctx, 'conn-ap1-core', 'ap-floor1', 'gi0/0', ap1State, 'sw-core', 'fa0/2', swCore);

  // AP 2 (Floor 2)
  const ap2: CanvasDevice = {
    id: 'ap-floor2',
    type: 'router',
    name: 'AP-Floor2',
    macAddress: '0011.2233.AA02',
    ip: '192.168.1.11',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 520,
    y: 260,
    status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', security: 'wpa2', password: 'password123', channel: '5GHz', mode: 'ap' },
    ports: generateRouterPorts(),
  };
  ctx.devices.push(ap2);
  const ap2State = { deviceType: 'router', hostname: 'AP-Floor2', ports: {} } as unknown as SwitchState;
  ctx.states.set('ap-floor2', ap2State);
  connect(ctx, 'conn-ap2-core', 'ap-floor2', 'gi0/0', ap2State, 'sw-core', 'fa0/3', swCore);

  // Mobile / Laptop Clients
  const mob1: CanvasDevice = {
    id: 'mob-1',
    type: 'mobile',
    name: 'Laptop-User1',
    macAddress: '0011.2233.BB01',
    ip: '192.168.1.51',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 180,
    y: 420,
    status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', mode: 'client', security: 'wpa2', password: 'password123' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  const mob2: CanvasDevice = {
    id: 'mob-2',
    type: 'mobile',
    name: 'Phone-User2',
    macAddress: '0011.2233.BB02',
    ip: '192.168.1.52',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 580,
    y: 420,
    status: 'online',
    wifi: { enabled: true, ssid: 'Corp-WiFi', mode: 'client', security: 'wpa2', password: 'password123' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  ctx.devices.push(mob1, mob2);

  return ctx;
}

// ===========================================================================
// 11. IoT Smart Home Mesh
// ===========================================================================
export function generateIotSmartHome(): Ctx {
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
      id: item.id,
      type: 'iot',
      name: item.name,
      macAddress: MAC_POOL[ctx.devices.length % MAC_POOL.length],
      ip: item.ip,
      subnet: '255.255.255.0',
      gateway: '192.168.50.1',
      x: item.x,
      y: item.y,
      status: 'online',
      ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
      services: { http: { enabled: true, mode: 'simple', content: `<h1>${item.name} Control Panel</h1>` } },
    };
    ctx.devices.push(iotDev);
    connect(ctx, `conn-${item.id}`, item.id, 'eth0', null, 'iot-sw', item.port, swState);
  });

  return ctx;
}

// ===========================================================================
// 25. Wireless LAN (Wi-Fi)
// ===========================================================================
export function generateWireless(pcCount: number): Ctx {
  const ctx = newCtx();
  const { state: rState, device: rDev } = addRouter(ctx, 'router-1', 'R1', '0011.2233.9901', 350, 40, {
    dhcpPools: {
      'WIFI-POOL': { network: '192.168.1.0', subnetMask: '255.255.255.0', defaultRouter: '192.168.1.1', dnsServer: '8.8.8.8' },
    },
    services: { http: { enabled: true, content: '', fontSize: 16 } },
  });
  rDev.services = { http: { enabled: true, content: '' } };
  rDev.ip = '192.168.1.1';
  enableRouterPort(rState, 'gi0/0', '192.168.1.1', '255.255.255.0');

  const { state: swState } = addSwitch(ctx, 'switch-1', 'SW1', '0011.2233.8801', 350, 200);
  connect(ctx, 'conn-r1-sw1', 'router-1', 'gi0/0', rState, 'switch-1', 'fa0/1', swState);

  const apId = 'router-ap';
  const ap: CanvasDevice = {
    id: apId,
    type: 'router',
    name: 'AP-1',
    macAddress: '0011.2233.AA01',
    ip: '192.168.1.2',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 600,
    y: 200,
    status: 'online',
    services: { http: { enabled: true, content: '' } },
    ports: [
      {
        id: 'wlan0',
        label: 'WLAN0',
        status: 'connected',
        ipAddress: '192.168.1.2',
        subnetMask: '255.255.255.0',
        wifi: { ssid: 'NetSim-WiFi', security: 'open', channel: '2.4GHz', mode: 'ap' },
      },
      ...generateRouterPorts(),
    ],
    wifi: {
      enabled: true,
      ssid: 'NetSim-WiFi',
      bssid: '0011.2233.AA01',
      security: 'open',
      password: '',
      channel: '2.4GHz',
      mode: 'ap',
      hidden: false,
      maxClients: 10,
    },
  };
  ctx.devices.push(ap);

  const apState = {
    deviceType: 'router',
    hostname: 'AP-1',
    macAddress: '0011.2233.AA01',
    switchModel: 'NS-L3-24PS',
    switchLayer: 'L3',
    currentMode: 'user',
    commandHistory: [],
    vlanDatabase: {},
    ports: {},
    ipRouting: true,
    services: { http: { enabled: true, content: '', fontSize: 16 } },
    security: {
      enableSecretEncrypted: false,
      servicePasswordEncryption: false,
      users: [],
      consoleLine: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
      vtyLines: { login: false, transportInput: ['all'], execTimeout: { minutes: 10, seconds: 0 } },
    },
  } as unknown as SwitchState;
  ap.ports.forEach(p => {
    apState.ports[p.id] = {
      id: p.id,
      name: p.label || p.id,
      vlan: 1,
      duplex: 'full',
      speed: '1000',
      type: getPortType(p.id),
      status: 'notconnect',
      shutdown: p.id === 'gi0/0' || p.id === 'wlan0' ? false : true,
      accessVlan: 1,
      mode: 'routed',
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
        ssid: 'NetSim-WiFi',
        security: 'open',
        password: '',
        channel: '2.4GHz',
        mode: 'ap',
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
      id: `pc-${pcIdx}`,
      type: 'pc',
      name: `PC-${pcIdx}`,
      macAddress: MAC_POOL[(pcIdx - 1) % MAC_POOL.length],
      ip: `192.168.1.2${i}`,
      subnet: '255.255.255.0',
      gateway: '192.168.1.1',
      dns: '8.8.8.8',
      ipConfigMode: 'static',
      x: 560 + i * 140,
      y: 380,
      status: 'online',
      ports: [
        { id: 'eth0', label: 'Eth0', status: 'disconnected' },
        {
          id: 'wlan0',
          label: 'WLAN0',
          status: 'connected',
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
export function generateOfficePrinterIot(_pcCount: number): Ctx {
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
    id: 'printer-1',
    type: 'printer',
    name: 'Office-LaserJet-MFP',
    macAddress: '0011.2233.EE01',
    ip: '192.168.1.20',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 120,
    y: 340,
    status: 'online',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
    services: { http: { enabled: true, mode: 'simple', content: '<h1>LaserJet MFP Management Web Interface</h1><p>Status: Ready (Paper: 100%, Toner: 85%)</p>' } },
  };
  ctx.devices.push(printer);
  connect(ctx, 'conn-sw-printer', 'printer-1', 'eth0', null, 'sw-office', 'fa0/2', swState);

  // IoT Smart Sensor
  const iotDev: CanvasDevice = {
    id: 'iot-temp',
    type: 'iot',
    name: 'Office-Climate-Sensor',
    macAddress: '0011.2233.EE02',
    ip: '192.168.1.30',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 280,
    y: 340,
    status: 'online',
    ports: [{ id: 'eth0', label: 'Eth0', status: 'connected' }],
    services: { http: { enabled: true, mode: 'simple', content: '<h1>Climate Sensor Panel</h1><p>Temperature: 22.4°C | Humidity: 45%</p>' } },
  };
  ctx.devices.push(iotDev);
  connect(ctx, 'conn-sw-iot', 'iot-temp', 'eth0', null, 'sw-office', 'fa0/3', swState);

  // Office Workstation PC
  addPcToSwitch(ctx, 1, '192.168.1.101', '192.168.1.1', '8.8.8.8', 'sw-office', swState, 'fa0/4', 460, 340, { name: 'Manager-PC' });

  // Mobile Tablet Client
  const tablet: CanvasDevice = {
    id: 'mob-tablet',
    type: 'mobile',
    name: 'Staff-Tablet',
    macAddress: '0011.2233.EE03',
    ip: '192.168.1.150',
    subnet: '255.255.255.0',
    gateway: '192.168.1.1',
    x: 640,
    y: 340,
    status: 'online',
    wifi: { enabled: true, ssid: 'Office-Staff-WiFi', mode: 'client', security: 'wpa2', password: 'officepassword' },
    ports: [{ id: 'wlan0', label: 'WLAN0', status: 'connected' }],
  };
  ctx.devices.push(tablet);

  return ctx;
}
