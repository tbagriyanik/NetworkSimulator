// Network Switch Initial State
import { SwitchState, Port, Vlan, SecurityConfig, CommandMode, StartupConfig, SwitchModel } from './types';
import { getSwitchLayer } from './switchModels';
export { normalizePortId } from './portUtils';

function formatMacFromNumber(value: number): string {
  const base = value.toString(16).padStart(12, '0').toUpperCase();
  return `${base.slice(0, 4)}.${base.slice(4, 8)}.${base.slice(8, 12)}`;
}

function normalizeMacCandidate(mac: string): string {
  return mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().padStart(12, '0').slice(0, 12);
}

/**
 * Reservasyon artık global state (Set) kullanmıyor.
 * Deterministic sonuçlar üretir. Uniqueness sorumluluğu artık çağırana ait veya
 * parametre olarak gelen macAddress üzerinden yürütülür.
 */
function reserveMacAddress(mac?: string, defaultBase: number = 0x001100000000): string {
  if (!mac) return formatMacFromNumber(defaultBase);
  const normalized = normalizeMacCandidate(mac);
  if (!normalized) return formatMacFromNumber(defaultBase);
  return formatMacFromNumber(parseInt(normalized, 16));
}

// 24 FastEthernet + configurable GigabitEthernet ports oluştur
function createInitialPorts(gigabitPortCount: number = 2, baseMac?: string, hasWireless: boolean = false): Record<string, Port> {
  const ports: Record<string, Port> = {};
  const switchBaseMac = baseMac || formatMacFromNumber(0x001100000000); // Switch base MAC range

  // Console port
  ports['console'] = {
    id: 'console',
    name: 'Console',
    status: 'notconnect',
    vlan: 1,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'fastethernet'
  };

  const isL3GigabitLayout = gigabitPortCount === 4;

  // Access ports (L2: FastEthernet0/1-24, L3: GigabitEthernet1/0/1-24)
  for (let i = 1; i <= 24; i++) {
    const portId = isL3GigabitLayout ? `gi1/0/${i}` : `fa0/${i}`;
    const portMac = formatMacFromNumber(parseInt(switchBaseMac.replace(/\./g, ''), 16) + i);
    ports[portId] = {
      id: portId,
      name: '',
      status: 'notconnect',
      vlan: 1,
      mode: 'dynamic-auto', // VARSAYILAN: switchport mode dynamic auto
      voiceVlan: 'none',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false, // BAŞLANGIÇTA AÇIK
      type: isL3GigabitLayout ? 'gigabitethernet' : 'fastethernet',
      allowedVlans: 'all',
      channelGroup: undefined,
      channelMode: undefined,
      channelProtocol: undefined,
      macAddress: portMac // Per-port MAC address
    };
  }

  // GigabitEthernet uplink/routed ports
  for (let i = 1; i <= gigabitPortCount; i++) {
    const portId = isL3GigabitLayout ? `gi1/1/${i}` : `gi0/${i}`;
    const portMac = formatMacFromNumber(parseInt(switchBaseMac.replace(/\./g, ''), 16) + 24 + i);
    ports[portId] = {
      id: portId,
      name: '',
      status: 'notconnect',
      vlan: 1,
      mode: 'dynamic-auto', // VARSAYILAN: switchport mode dynamic auto
      voiceVlan: 'none',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false, // BAŞLANGIÇTA AÇIK
      type: 'gigabitethernet',
      allowedVlans: 'all',
      channelGroup: undefined,
      channelMode: undefined,
      channelProtocol: undefined,
      macAddress: portMac // Per-port MAC address
    };
  }

  // WLAN interface - only if explicitly requested
  if (hasWireless) {
    ports['wlan0'] = {
      id: 'wlan0',
      name: '',
      status: 'connected',
      vlan: 1,
      mode: 'access',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      type: 'fastethernet',
      wifi: {
        ssid: '',
        security: 'open',
        password: '',
        channel: '2.4GHz',
        mode: 'ap'
      },
      macAddress: formatMacFromNumber(parseInt(switchBaseMac.replace(/\./g, ''), 16) + 24 + gigabitPortCount + 1)
    };
  }

  return ports;
}

// Firewall için başlangıç portları oluştur
function createInitialFirewallPorts(baseMac?: string): Record<string, Port> {
  const ports: Record<string, Port> = {};
  const firewallBaseMac = baseMac || formatMacFromNumber(0x00A000000000); // Firewall base MAC range

  // Console port
  ports['console'] = {
    id: 'console',
    name: 'Console',
    status: 'notconnect',
    vlan: 1,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'fastethernet'
  };

  // Firewall has 8 GigabitEthernet ports (Gi1/0/0-7) + Management 1/1
  for (let i = 0; i <= 7; i++) {
    const portId = `gi1/0/${i}`;
    const portMacNumber = parseInt(firewallBaseMac.replace(/\./g, ''), 16) + i + 1;
    const portMac = formatMacFromNumber(portMacNumber);

    ports[portId] = {
      id: portId,
      name: '',
      status: 'notconnect',
      vlan: 1,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
      shutdown: true,
      type: 'gigabitethernet',
      macAddress: portMac,
      isRoutedPort: true
    };
  }

  // Management 1/1
  // Gi1/0/7 uses base + 8, so management must use the next unique address.
  const mgmtMac = formatMacFromNumber(parseInt(firewallBaseMac.replace(/\./g, ''), 16) + 9);
  ports['mgmt1/1'] = {
    id: 'mgmt1/1',
    name: 'Management',
    status: 'notconnect',
    vlan: 1,
    mode: 'routed',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'gigabitethernet',
    macAddress: mgmtMac,
    isRoutedPort: true
  };

  return ports;
}

// Varsayılan VLAN'lar - sadece sistem VLAN'ları (kullanıcı VLAN oluşturmalı)
function createInitialVlans(): Record<number, Vlan> {
  return {
    1: { id: 1, name: 'default', status: 'active', ports: [] },
    1002: { id: 1002, name: 'fddi-default', status: 'active', ports: [] },
    1003: { id: 1003, name: 'token-ring-default', status: 'active', ports: [] },
    1004: { id: 1004, name: 'fddinet-default', status: 'active', ports: [] },
    1005: { id: 1005, name: 'trnet-default', status: 'active', ports: [] }
  };
}

// Güvenlik başlangıç durumu
function createInitialSecurity(): SecurityConfig {
  return {
    enableSecret: undefined,
    enableSecretEncrypted: false,
    enablePassword: undefined,
    servicePasswordEncryption: false,
    users: [],
    consoleLine: {
      password: undefined,
      login: false,
      transportInput: ['all'],
      execTimeout: { minutes: 10, seconds: 0 }
    },
    vtyLines: {
      password: undefined,
      login: false,
      transportInput: ['all'],
      execTimeout: { minutes: 10, seconds: 0 }
    }
  };
}

// Ana başlangıç durumu
export function createInitialState(
  mac?: string,
  switchModel: 'NS-L2-24TT-L' | 'NS-L3-24PS' = 'NS-L2-24TT-L',
  options: { bootTime?: number; now?: Date } = {}
): SwitchState {
  const { bootTime = 1715600000000, now = new Date(1715600000000) } = options;

  // Switch modeline göre Layer belirle
  const switchLayer = getSwitchLayer(switchModel);
  const macAddress = reserveMacAddress(mac);
  const ports = createInitialPorts(switchLayer === 'L3' ? 4 : 2, macAddress, switchLayer === 'L3');
  const vlans = createInitialVlans();

  // VLAN'lara portları ata
  Object.values(ports).forEach(port => {
    const vlanId = Number(port.accessVlan || port.vlan || 1);
    if (!port.shutdown && vlans[vlanId]) {
      vlans[vlanId].ports.push(port.id.toUpperCase());
    }
  });

  return {
    hostname: 'Switch',
    macAddress,
    switchModel: switchModel,
    switchLayer,
    deviceType: switchLayer === 'L3' ? 'switchL3' : 'switchL2',
    currentMode: 'user',
    currentInterface: undefined,
    consoleAuthenticated: false,
    bootTime,
    ports,
    vlans,
    security: createInitialSecurity(),
    services: {
      http: {
        enabled: false,
        content: '<h1>Merhaba Dünya! / Hello World!</h1>\n<p>This page is served from C:\\www\\index.html</p>',
        fontSize: 16
      },
      ftp: {
        enabled: false,
        anonymousAccess: true,
        rootDirectory: 'C:\\upload',
        files: [
          { name: 'welcome.txt', size: 1280, modifiedAt: now.toISOString() },
          { name: 'config.backup', size: 4096, modifiedAt: now.toISOString() }
        ]
      },
      mail: {
        enabled: false,
        domain: 'local.lan',
        username: 'user',
        password: 'mail123',
        inbox: [],
        sent: []
      },
      ntp: {
        enabled: false,
        server: '',
        timezone: 'UTC',
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8)
      }
    },
    runningConfig: [
      '!',
      `hostname Switch`,
      '!',
      '!',
      '!',
      'interface Vlan1',
      ' no ip address',
      ' no shutdown',
      '!',
      '!',
      'line con 0',
      'line vty 0 4',
      ' login',
      'line vty 5 15',
      ' login',
      '!',
      'end'
    ],
    commandHistory: [],
    historyIndex: -1,
    bannerMOTD: 'Welcome to the Network Simulator\nUnauthorized access is strictly prohibited.',
    bannerLogin: undefined,
    bannerExec: undefined,
    version: {
      nosVersion: '15.0(2)SE4',
      modelName: switchModel,
      serialNumber: 'FOC1234X5YZ',
      uptime: '2 weeks, 3 days, 5 hours'
    },
    macAddressTable: [],
    arpCache: [],
    vtpRevision: 0,
    ipRouting: false
  };
}

// Router için başlangıç portları oluştur
function createInitialRouterPorts(baseMac?: string): Record<string, Port> {
  const ports: Record<string, Port> = {};
  const routerBaseMac = baseMac || formatMacFromNumber(0x005000000000); // Router base MAC range

  // Console port
  ports['console'] = {
    id: 'console',
    name: 'Console',
    status: 'notconnect',
    vlan: 1,
    mode: 'routed',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'fastethernet'
  };

  // GigabitEthernet 0/0 - 0/3 (Router portları)
  for (let i = 0; i <= 3; i++) {
    const portId = `gi0/${i}`;
    // Generate per-port MAC address by incrementing from base MAC
    // Keep every interface MAC distinct from the router base MAC.
    const portMacNumber = parseInt(routerBaseMac.replace(/\./g, ''), 16) + i + 1;
    const portMac = formatMacFromNumber(portMacNumber);

    ports[portId] = {
      id: portId,
      name: i === 0 ? 'WAN' : i === 1 ? 'LAN' : '',
      status: 'notconnect',
      vlan: 1,
      mode: 'routed',
      voiceVlan: 'none',
      duplex: 'auto',
      speed: 'auto',
      shutdown: true,
      type: 'gigabitethernet',
      allowedVlans: 'all',
      channelGroup: undefined,
      channelMode: undefined,
      channelProtocol: undefined,
      macAddress: portMac, // Per-port MAC address for router
      isRoutedPort: true
    };
  }

  // Serial interfaces (WAN)
  for (let i = 0; i <= 2; i++) {
    const serialPortId = `s0/${i}/0`;
    const serialMacNumber = parseInt(routerBaseMac.replace(/\./g, ''), 16) + 5 + i;
    ports[serialPortId] = {
      id: serialPortId,
      name: i === 0 ? 'Serial WAN' : '',
      status: 'notconnect',
      vlan: 1,
      mode: 'routed',
      voiceVlan: 'none',
      duplex: 'full',
      speed: 'auto',
      shutdown: true,
      type: 'serial',
      serialEncapsulation: 'hdlc',
      clockRate: 2000000,
      dce: i === 0,
      bandwidth: 1544,
      macAddress: formatMacFromNumber(serialMacNumber),
      isRoutedPort: true,
    };
  }

  // WLAN interface
  const wlanMac = formatMacFromNumber(parseInt(routerBaseMac.replace(/\./g, ''), 16) + 11);
  ports['wlan0'] = {
    id: 'wlan0',
    name: 'WLAN',
    status: 'notconnect',
    vlan: 1,
    mode: 'routed',
    duplex: 'auto',
    speed: 'auto',
    shutdown: true,
    type: 'fastethernet',
    wifi: {
      ssid: '',
      security: 'open',
      password: '',
      channel: '2.4GHz',
      mode: 'ap'
    },
    macAddress: wlanMac,
    isRoutedPort: true
  };

  return ports;
}

// Router için başlangıç durumu
export function createInitialRouterState(
  mac?: string,
  options: { bootTime?: number } = {}
): SwitchState {
  const { bootTime = 1715600000000 } = options;
  const macAddress = reserveMacAddress(mac, 0x005000000000);
  const ports = createInitialRouterPorts(macAddress);
  const vlans = createInitialVlans();

  return {
    hostname: 'Router',
    macAddress,
    switchModel: 'NS-R-4451-X' as SwitchModel,
    switchLayer: 'L3',
    deviceType: 'router',
    currentMode: 'user',
    currentInterface: undefined,
    consoleAuthenticated: false,
    bootTime,
    ipRouting: true,
    ports,
    vlans,
    security: createInitialSecurity(),
    arpCache: [],
    services: {
      http: {
        enabled: true,
        content: '',
        fontSize: 16
      }
    },
    runningConfig: [
      '!',
      `hostname Router`,
      '!',
      '!',
      '!',
      '!',
      'line con 0',
      'line aux 0',
      'line vty 0 4',
      ' login',
      '!',
      'end'
    ],
    commandHistory: [],
    historyIndex: -1,
    bannerMOTD: 'Welcome to the Network Simulator\nUnauthorized access is strictly prohibited.',
    version: {
      nosVersion: '15.4(3)M4',
      modelName: 'NS-R-4451-X',
      serialNumber: 'FTX1234ABCD',
      uptime: '1 week, 2 days, 4 hours'
    },
    macAddressTable: [],
    vtpRevision: 0
  };
}

// Firewall için başlangıç durumu
export function createInitialFirewallState(
  mac?: string,
  options: { bootTime?: number } = {}
): SwitchState {
  const { bootTime = 1715600000000 } = options;
  const macAddress = reserveMacAddress(mac, 0x00A000000000);
  const ports = createInitialFirewallPorts(macAddress);
  const vlans = createInitialVlans();

  return {
    hostname: 'asa',
    macAddress,
    switchModel: 'NS-FW-5506' as SwitchModel,
    switchLayer: 'FW',
    deviceType: 'firewall',
    currentMode: 'user',
    currentInterface: undefined,
    consoleAuthenticated: false,
    bootTime,
    ipRouting: true,
    ports,
    vlans,
    security: createInitialSecurity(),
    arpCache: [],
    services: {
      http: {
        enabled: false,
        content: '',
        fontSize: 16
      }
    },
    runningConfig: [
      '!',
      `hostname asa 5506-x`,
      '!',
      'interface GigabitEthernet0/0',
      ' no shutdown',
      '!',
      'interface GigabitEthernet0/1',
      ' no shutdown',
      '!',
      '!',
      'end'
    ],
    commandHistory: [],
    historyIndex: -1,
    bannerMOTD: 'NetSim Firewall Software\n',
    version: {
      nosVersion: '9.6(1)',
      modelName: 'NS-FW-5506',
      serialNumber: 'ASA12345678',
      uptime: '1 day, 2 hours, 15 minutes'
    },
    macAddressTable: [],
    vtpRevision: 0
  };
}

// WLC için başlangıç portları oluştur
function createInitialWLCPorts(baseMac?: string): Record<string, Port> {
  const ports: Record<string, Port> = {};
  const wlcBaseMac = baseMac || formatMacFromNumber(0x00C000000000);

  // Console port
  ports['console'] = {
    id: 'console',
    name: 'Console',
    status: 'notconnect',
    vlan: 1,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'fastethernet'
  };

  // GigabitEthernet 0/0 - 0/3 (WLC management + AP connectivity)
  for (let i = 0; i <= 3; i++) {
    const portId = `gi0/${i}`;
    const portMacNumber = parseInt(wlcBaseMac.replace(/\./g, ''), 16) + i + 1;
    const portMac = formatMacFromNumber(portMacNumber);
    ports[portId] = {
      id: portId,
      name: i === 0 ? 'Management' : i === 1 ? 'AP-Manager' : '',
      status: 'notconnect',
      vlan: 1,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
      shutdown: false,
      type: 'gigabitethernet',
      macAddress: portMac,
      isRoutedPort: true,
      ipAddress: i === 0 ? '192.168.1.1' : undefined,
      subnetMask: i === 0 ? '255.255.255.0' : undefined,
    };
  }

  // Service port
  ports['service'] = {
    id: 'service',
    name: 'Service Port',
    status: 'notconnect',
    vlan: 1,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'fastethernet',
    macAddress: formatMacFromNumber(parseInt(wlcBaseMac.replace(/\./g, ''), 16) + 5),
  };

  return ports;
}

// WLC için başlangıç durumu
export function createInitialWLCState(
  mac?: string,
  options: { bootTime?: number } = {}
): SwitchState {
  const { bootTime = 1715600000000 } = options;
  const macAddress = reserveMacAddress(mac, 0x00C000000000);
  const ports = createInitialWLCPorts(macAddress);
  const vlans = createInitialVlans();

  return {
    hostname: 'WLC',
    macAddress,
    switchModel: 'NS-WLC-2504' as SwitchModel,
    switchLayer: 'WLC',
    deviceType: 'wlc',
    currentMode: 'user',
    currentInterface: undefined,
    consoleAuthenticated: false,
    bootTime,
    ipRouting: true,
    ports,
    vlans,
    security: createInitialSecurity(),
    services: {
      http: {
        enabled: true,
        content: '',
        fontSize: 16
      },
      dhcp: {
        enabled: true,
        pools: [
          {
            poolName: 'WLC-DHCP-POOL',
            defaultGateway: '192.168.1.1',
            dnsServer: '8.8.8.8',
            startIp: '192.168.1.100',
            subnetMask: '255.255.255.0',
            maxUsers: 50
          }
        ]
      },
      ntp: {
        enabled: false,
        server: '',
        timezone: 'UTC',
        date: new Date(bootTime).toISOString().slice(0, 10),
        time: new Date(bootTime).toTimeString().slice(0, 8)
      }
    },
    runningConfig: [
      '!',
      'hostname WLC',
      '!',
      'interface GigabitEthernet0/0',
      ' ip address 192.168.1.254 255.255.255.0',
      ' no shutdown',
      '!',
      'interface GigabitEthernet0/1',
      ' no shutdown',
      '!',
      'line con 0',
      'line vty 0 4',
      ' login',
      '!',
      'end'
    ],
    commandHistory: [],
    historyIndex: -1,
    bannerMOTD: 'Wireless LAN Controller\n',
    version: {
      nosVersion: '8.5.105.0',
      modelName: 'NS-WLC-2504 WLC',
      serialNumber: 'WLC2504ABCD',
      uptime: '3 days, 2 hours, 30 minutes'
    },
    macAddressTable: [],
    arpCache: [],
    wlcAps: {},
    wlcWlans: {
      '1': {
        id: 1,
        name: 'Default-WLAN',
        ssid: 'WLC-WiFi',
        status: 'enabled',
        security: 'open',
        vlan: 1
      }
    },
    vtpRevision: 0
  };
}

export function buildStartupConfig(state: SwitchState): StartupConfig {
  return {
    hostname: state.hostname,
    ports: structuredClone(state.ports),
    vlans: structuredClone(state.vlans),
    security: structuredClone(state.security),
    bannerMOTD: state.bannerMOTD,
    domainName: state.domainName,
    defaultGateway: state.defaultGateway,
    dnsServer: state.dnsServer,
    sshVersion: state.sshVersion,
    cdpEnabled: state.cdpEnabled,
    lldpEnabled: state.lldpEnabled,
    spanningTreeMode: state.spanningTreeMode,
    vtpMode: state.vtpMode,
    vtpDomain: state.vtpDomain,
    mlsQosEnabled: state.mlsQosEnabled,
    dhcpSnoopingEnabled: state.dhcpSnoopingEnabled,
    dhcpSnoopingBindings: state.dhcpSnoopingBindings ? state.dhcpSnoopingBindings.map(b => ({ ...b })) : undefined,
    ntpServers: state.ntpServers ? [...state.ntpServers] : undefined,
    ntpTimeOffset: state.services?.ntp?.timeOffset,
    ipv6Enabled: state.ipv6Enabled,
    ipRouting: state.ipRouting
  };
}

export function applyStartupConfig(baseState: SwitchState, startup: StartupConfig): SwitchState {
  const mergedPorts: Record<string, Port> = {};
  Object.entries(baseState.ports).forEach(([id, basePort]) => {
    const savedPort = startup.ports[id];
    if (!savedPort) {
      mergedPorts[id] = basePort;
      return;
    }
    mergedPorts[id] = {
      ...basePort,
      name: savedPort.name,
      vlan: savedPort.vlan,
      mode: savedPort.mode,
      voiceVlan: savedPort.voiceVlan ?? basePort.voiceVlan ?? 'none',
      duplex: savedPort.duplex,
      speed: savedPort.speed,
      shutdown: savedPort.shutdown,
      type: savedPort.type,
      allowedVlans: savedPort.allowedVlans,
      channelGroup: savedPort.channelGroup,
      channelMode: savedPort.channelMode,
      channelProtocol: savedPort.channelProtocol,
      portSecurity: savedPort.portSecurity,
      ipAddress: savedPort.ipAddress,
      subnetMask: savedPort.subnetMask,
      ipv6Address: savedPort.ipv6Address,
      ipv6Prefix: savedPort.ipv6Prefix,
      // Preserve wifi config so AP settings survive power cycles and reloads
      wifi: savedPort.wifi ?? basePort.wifi,
      status: savedPort.status ?? basePort.status,
    };
  });

  return {
    ...baseState,
    hostname: startup.hostname,
    ports: mergedPorts,
    vlans: structuredClone(startup.vlans),
    security: structuredClone(startup.security),
    bannerMOTD: startup.bannerMOTD,
    domainName: startup.domainName,
    defaultGateway: startup.defaultGateway,
    dnsServer: startup.dnsServer,
    sshVersion: startup.sshVersion,
    cdpEnabled: startup.cdpEnabled,
    spanningTreeMode: startup.spanningTreeMode,
    vtpMode: startup.vtpMode,
    vtpDomain: startup.vtpDomain,
    vtpPassword: startup.vtpPassword,
    vtpRevision: startup.vtpRevision ?? baseState.vtpRevision ?? 0,
    mlsQosEnabled: startup.mlsQosEnabled,
    dhcpSnoopingEnabled: startup.dhcpSnoopingEnabled,
    dhcpSnoopingBindings: startup.dhcpSnoopingBindings ? startup.dhcpSnoopingBindings.map(b => ({ ...b })) : undefined,
    ntpServers: startup.ntpServers ? [...startup.ntpServers] : undefined,
    services: {
      ...baseState.services,
      ntp: {
        ...(baseState.services?.ntp || { enabled: false, timezone: 'UTC' }),
        ...(startup.ntpServers && startup.ntpServers.length > 0
          ? {
              enabled: true,
              server: startup.ntpServers[0],
            }
          : {}),
        timeOffset: startup.ntpTimeOffset,
      },
    },
    ipv6Enabled: startup.ipv6Enabled,
    ipRouting: startup.ipRouting
  };
}

// Mode prompt'ları
export function getModePrompt(mode: CommandMode, hostname: string, _context?: string): string {
  switch (mode) {
    case 'user':
      return `${hostname}>`;
    case 'privileged':
      return `${hostname}#`;
    case 'config':
      return `${hostname}(config)#`;
    case 'interface':
      return `${hostname}(config-if)#`;
    case 'config-if-range':
      return `${hostname}(config-if-range)#`;
    case 'vlan':
      return `${hostname}(config-vlan)#`;
    case 'line':
      return `${hostname}(config-line)#`;
    case 'config-std-nacl':
      return `${hostname}(config-std-nacl)#`;
    case 'config-ext-nacl':
      return `${hostname}(config-ext-nacl)#`;
    case 'config-ipv6-acl':
      return `${hostname}(config-ipv6-acl)#`;
    case 'config-mst':
      return `${hostname}(config-mst)#`;
    case 'config-route-map':
      return `${hostname}(config-route-map)#`;
    case 'dhcp-config':
      return `${hostname}(dhcp-config)#`;
    case 'ssid-config':
      return `${hostname}(config-ssid)#`;
    case 'dot11-config':
      return `${hostname}(config-if)#`;
    case 'router-config':
      return `${hostname}(config-router)#`;
    case 'ap-config':
      return `${hostname}(config-ap)#`;
    default:
      return `${hostname}>`;
  }
}

// Komut kısaltmaları
export { commandAliases } from './commandAliases';
