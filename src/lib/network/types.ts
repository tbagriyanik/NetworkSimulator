// Network Simulator Types

export type CommandMode =
  | 'user'           // Switch>
  | 'privileged'     // Switch#
  | 'config'         // Switch(config)#
  | 'interface'      // Switch(config-if)#
  | 'config-if-range' // Switch(config-if-range)#
  | 'line'           // Switch(config-line)#
  | 'vlan'           // Switch(config-vlan)#
  | 'router-config'  // Router(config-router)#
  | 'dhcp-config'    // Router(dhcp-config)#
  | 'ssid-config'    // Router(config-ssid)#
  | 'dot11-config'   // Router(config-if)# [dot11Radio]
  | 'config-std-nacl'  // Router(config-std-nacl)# - Named standard ACL
  | 'config-ext-nacl'; // Router(config-ext-nacl)# - Named extended ACL

export type PortStatus = 'connected' | 'notconnect' | 'disabled' | 'blocked' | 'err-disabled';
export type PortMode = 'access' | 'trunk' | 'routed' | 'dynamic-auto' | 'dynamic-desirable' | 'dot1q-tunnel';
export type DuplexMode = 'half' | 'full' | 'auto';
export type SpeedMode = '10' | '100' | '1000' | '10000' | 'auto';
export type VoiceVlanMode = number | 'dot1p' | 'none' | 'untagged';
export type EtherChannelProtocol = 'lacp' | 'pagp';
export type EtherChannelMode = 'on' | 'active' | 'passive' | 'desirable' | 'auto';

export interface Port {
  id: string;              // fa0/1, gi0/1 etc.
  name: string;            // description
  description?: string;    // interface description (CLI: description <text>)
  status: PortStatus;
  vlan: number;
  accessVlan?: number | string;
  nativeVlan?: number;       // Native VLAN for trunk ports
  mode: PortMode;
  voiceVlan?: VoiceVlanMode;
  duplex: DuplexMode;
  speed: SpeedMode;
  shutdown: boolean;
  type: 'fastethernet' | 'gigabitethernet' | 'vlan' | 'serial';
  previousStatus?: PortStatus;  // shutdown öncesi durum (no shutdown için)
  ipAddress?: string;           // For L3 ports or SVI
  subnetMask?: string;
  stpCost?: number;             // Manual STP path cost
  arpTimeout?: string;          // ARP timeout setting
  macAddress?: string;         // Per-port MAC address (for router ports)
  allowedVlans?: number[] | 'all'; // For trunk ports
  accessGroupIn?: string;       // Inbound ACL name/ID
  accessGroupOut?: string;      // Outbound ACL name/ID
  channelGroup?: number; // Port-channel group id
  channelMode?: EtherChannelMode;
  channelProtocol?: EtherChannelProtocol;
  portSecurity?: {
    enabled: boolean;
    maxAddresses?: number;
    violationAction?: 'protect' | 'restrict' | 'shutdown';
    sticky?: boolean;
    violations?: number;
    macAddress?: string;
    aging?: {
      enabled?: boolean;
      time?: number; // minutes
      type?: 'absolute' | 'inactivity';
    };
  };
  staticMacs?: string[]; // Static MAC addresses for port security
  ipv6Address?: string;         // For CCNA 1 v7 support
  ipv6Prefix?: number;
  ipv6Rip?: {
    enabled: boolean;
    processName?: string;
  };
  ipv6Ospf?: {
    enabled: boolean;
    processId?: string;
    area?: string;
  };
  ospfEnabled?: boolean;
  ospfProcessId?: string;
  ospfArea?: string;
  ipv6DhcpServer?: string;
  isRoutedPort?: boolean;       // For L3 switch routed ports
  isSubinterface?: boolean;     // For subinterfaces (e.g., gi0/0.10)
  parentInterface?: string;     // Parent interface for subinterfaces
  nameif?: string;              // ASA interface name (inside, outside, etc.)
  securityLevel?: number;       // ASA security level (0-100)
  wifi?: {
    ssid: string;
    security: 'open' | 'wpa' | 'wpa2' | 'wpa3';
    password?: string;
    channel: '2.4GHz' | '5GHz';
    mode: 'ap' | 'client' | 'disabled' | 'sta';
    hidden?: boolean;
  };
  spanningTree?: {
    role?: 'root' | 'designated' | 'alternate' | 'backup' | 'disabled';
    state?: 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled';
    portfast?: boolean;
    bpduguard?: boolean;
    instances?: Record<number, {
      role?: 'root' | 'designated' | 'alternate' | 'backup' | 'disabled';
      state?: 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled';
    }>;
  };
  // Link layer properties
  mtu?: number;                    // Maximum Transmission Unit (default 1500)
  adminStatus?: 'up' | 'down';     // Admin status (from config: shutdown/no shutdown)
  operStatus?: 'up' | 'down';      // Operational status (actual port state)
  lineProtocol?: 'up' | 'down';    // Line protocol status
  encapsulation?: 'isl' | '802.1q' | 'native' | 'dot1q-tunnel' | 'hdlc' | 'ppp'; // Encapsulation type (trunk or WAN serial)
  // QoS & Performance properties
  qos?: {
    enabled: boolean;
    policyMap?: string;           // Service policy name
    ingressQueue?: number;        // Input queue size
    egressQueue?: number;         // Output queue size
    priorityQueue?: {
      enabled: boolean;
      limit?: number;
    };
    shaping?: {
      enabled: boolean;
      rate?: number;              // bits per second
    };
    policing?: {
      enabled: boolean;
      rate?: number;              // bits per second
      burst?: number;
    };
  };
  bandwidth?: number;               // Bandwidth in kbps (for routing protocols)
  delay?: number;                   // Delay in microseconds (for routing protocols)
  stpPriority?: number;
  dhcpSnoopingTrust?: boolean;
  ipVerifySource?: boolean;
  ipVerifySourcePortSecurity?: boolean;
  // Statistics & Counters
  statistics?: {
    inputPackets?: number;
    outputPackets?: number;
    inputBytes?: number;
    outputBytes?: number;
    inputErrors?: number;
    outputErrors?: number;
    crcErrors?: number;
    collisions?: number;
    runts?: number;                 // Frames < 64 bytes
    giants?: number;                // Frames > 1500 bytes
    throttles?: number;
    resets?: number;
    drops?: number;
    overruns?: number;
    underruns?: number;
    lastInput?: number;             // Timestamp of last input
    lastOutput?: number;            // Timestamp of last output
    lastCleared?: number;           // Timestamp when stats cleared
  };
  // Trunk specific properties
  trunkAllowedVlans?: number[] | string;  // VLAN range (e.g., "1-4094,except 1002-1005")
  trunkNativeVlan?: number;               // VLAN that doesn't get tagged
  vlanPruning?: {
    enabled: boolean;
    prunedVlans?: number[];
  };
  // Congestion & Flow Control
  congestion?: {
    level?: 'low' | 'medium' | 'high';
    flowControl?: boolean;
    pauseFrames?: number;
  };
  // Link aggregation details
  linkAggregation?: {
    enabled: boolean;
    groupId?: number;
    portInGroup?: number;
    totalPortsInGroup?: number;
    activePortsInGroup?: number;
  };
  // Port monitor (SPAN) settings
  portMonitor?: {
    source?: boolean;
    destination?: boolean;
    direction?: 'rx' | 'tx' | 'both';
  };
  // BPDU Guard & related features
  bpduGuard?: boolean;
  bpduFilter?: boolean;
  rootGuard?: boolean;
  // Storm control
  stormControl?: {
    broadcast?: {
      enabled: boolean;
      threshold?: number;         // percentage or pps
      action?: 'shutdown' | 'trap';
    };
    multicast?: {
      enabled: boolean;
      threshold?: number;
      action?: 'shutdown' | 'trap';
    };
    unicast?: {
      enabled: boolean;
      threshold?: number;
      action?: 'shutdown' | 'trap';
    };
  };
  // UDLD - Unidirectional Link Detection
  udld?: {
    enabled: boolean;
    mode?: 'normal' | 'aggressive';
    lastProbeTime?: number;
    bidirectionalStatus?: 'up' | 'down' | 'unknown';
  };
  hsrp?: {
    groups?: Record<number, {
      virtualIp?: string;
      ipv6VirtualIp?: string;
      priority?: number;
      preempt?: boolean;
      state?: 'Initial' | 'Listen' | 'Speak' | 'Standby' | 'Active';
    }>;
  };
  natSide?: 'inside' | 'outside';
  // Serial interface properties (WAN)
  serialEncapsulation?: 'hdlc' | 'ppp';
  clockRate?: number;       // Clock rate in bps (DCE side)
  dce?: boolean;            // Whether this serial port is DCE
  pppAuth?: 'pap' | 'chap' | 'none';  // PPP authentication type
  pppPapUsername?: string;
  pppPapPassword?: string;
  lapGroup?: number;        // Lightweight AP group (WLC)
}

export interface Vlan {
  id: number;
  name: string;
  status: 'active' | 'suspend';
  ports: string[];
  ipAddress?: string;
  subnetMask?: string;
}

export interface LineConfig {
  password?: string;
  login: boolean;
  loginLocal?: boolean;
  transportInput: ('ssh' | 'telnet' | 'all' | 'none')[];
  loggingSynchronous?: boolean;
  historySize?: number;
  exec?: boolean;
  autocommand?: string;
  privilegeLevel?: number;
  execTimeout?: { minutes: number; seconds: number };
}

export interface SecurityConfig {
  enableSecret?: string;
  enableSecretEncrypted: boolean;
  enablePassword?: string;
  servicePasswordEncryption: boolean;
  users: { username: string; password: string; privilege: number }[];
  consoleLine: LineConfig;
  vtyLines: LineConfig;
}

export type SwitchModel = 'WS-C2960-24TT-L' | 'WS-C3650-24PS' | 'ASA-5506-X' | 'AIR-CT2504-K9';
export type SwitchLayer = 'L2' | 'L3' | 'FW' | 'WLC';

export interface SwitchState {
  hostname: string;
  macAddress: string; // Unique base MAC address for the device
  switchModel: SwitchModel; // Switch model (L2 or L3)
  switchLayer: SwitchLayer; // Layer 2 or Layer 3
  deviceType?: 'pc' | 'router' | 'switch' | 'iot' | 'firewall' | 'wlc'; // Device type for identification
  currentMode: CommandMode;
  currentInterface?: string;
  selectedInterfaces?: string[];  // interface range için çoklu port seçimi
  currentLine?: string;
  currentVlan?: number;
  ports: Record<string, Port>;
  vlans: Record<string, Vlan>;
  security: SecurityConfig;
  runningConfig: string[];
  commandHistory: string[];
  historyIndex: number;
  debugs?: Record<string, boolean>;
  bannerMOTD?: string;
  bannerLogin?: string;
  bannerExec?: string;
  version: {
    nosVersion: string;
    modelName: string;
    serialNumber: string;
    uptime: string;
  };
  macAddressTable: { mac: string; vlan: number; port: string; type: string; timestamp?: number }[];
  arpCache: { ip: string; mac: string; interface: string; timestamp: number }[];
  // Password prompt state
  awaitingPassword?: boolean;
  passwordContext?: 'enable' | 'console' | 'vty';
  consoleAuthenticated?: boolean;
  telnetAuthenticated?: boolean;
  sshSessions?: { user: string; source: string; state: string }[];
  sshLastUser?: string;
  sshLastSource?: string;
  ftpSession?: {
    host: string;
    stage: 'username' | 'password' | 'ready';
    username?: string;
    remoteIp?: string;
    targetDeviceId?: string;
  };
  mailSession?: {
    address: string;
    stage: 'password' | 'ready';
    username: string;
    domain?: string;
    targetDeviceId?: string;
  };
  // Reload confirmation state
  awaitingReloadConfirm?: boolean;
  bootTime: number;
  // New optional properties for extended features
  domainName?: string;
  defaultGateway?: string;
  dnsServer?: string;
  domainLookup?: boolean;
  sshVersion?: 1 | 2;
  cdpEnabled?: boolean;
  spanningTreeMode?: 'pvst' | 'rapid-pvst' | 'mst';
  vtpMode?: 'server' | 'client' | 'transparent' | 'off';
  vtpDomain?: string;
  vtpPassword?: string;
  vtpRevision?: number;
  mlsQosEnabled?: boolean;
  dhcpSnoopingEnabled?: boolean;
  ntpServers?: string[];
  systemClock?: { time: string; day: string; month: string; year: string };
  ipv6Enabled?: boolean;
  ipRouting: boolean;
  spanningTreeVlans?: Record<string, { priority?: string; enabled?: boolean }>;
  startupConfig?: StartupConfig;
  flashFiles?: Record<string, string[]>;
  flashStartupConfigs?: Record<string, StartupConfig>;
  // New routing fields
  isLayer3Switch?: boolean;        // L3 switch capability
  staticRoutes?: Route[];          // Static routing table
  dynamicRoutes?: Route[];         // Dynamic routing table
  ipv6StaticRoutes?: Route[];      // IPv6 static routing table
  ipv6DynamicRoutes?: Route[];     // IPv6 dynamic routing table
  routingProtocol?: 'none' | 'rip' | 'ospf' | 'ripng' | 'ospfv3' | 'eigrp' | 'bgp'; // Routing protocol
  autoSummary?: boolean;           // Auto-summary for routing protocols
  ospfNeighbors?: string[];        // OSPF neighbor IDs/IPs
  eigrpAs?: string;                // EIGRP AS number
  eigrpNeighbors?: string[];       // EIGRP neighbor IDs/IPs
  bgpAs?: string;                  // BGP AS number
  bgpNeighbors?: { ip: string; as: string }[];  // BGP neighbor configurations
  passiveInterfaces?: string[];    // Interfaces that should not send updates
  routerId?: string;               // Router identifier (for routing)
  defaultInformation?: string;     // Default route information configuration
  // DHCP pool CLI config (ip dhcp pool <name>)
  currentDhcpPool?: string;
  dhcpPools?: Record<string, {
    network?: string;
    subnetMask?: string;
    defaultRouter?: string;
    dnsServer?: string;
    leaseTime?: string;
    domainName?: string;
  }>;
  currentIpv6DhcpPool?: string;
  ipv6DhcpPools?: Record<string, {
    addressPrefix?: string;
  }>;
  // Services (DHCP, DNS, HTTP, FTP, Mail)
  services?: {
    dhcp?: {
      enabled: boolean;
      pools?: {
        poolName: string;
        defaultGateway: string;
        dnsServer: string;
        startIp: string;
        subnetMask: string;
        maxUsers: number;
      }[];
    };
    dns?: {
      enabled: boolean;
      records?: { domain: string; address: string }[];
    };
    ftp?: {
      enabled: boolean;
      username?: string;
      password?: string;
      rootDirectory?: string;
      anonymousAccess?: boolean;
      files?: Array<{
        name: string;
        size: number;
        modifiedAt?: string;
      }>;
    };
    http?: {
      enabled: boolean;
      content?: string;
      fontSize: number;
    };
    mail?: {
      enabled: boolean;
      domain?: string;
      username?: string;
      password?: string;
      inbox?: Array<{ from: string; subject: string; body: string; timestamp?: string }>;
      sent?: Array<{ to: string; subject: string; body: string; timestamp?: string }>;
    };
    ntp?: {
      enabled: boolean;
      server?: string;
      timezone?: string;
      date?: string;
      time?: string;
      timeOffset?: number; // Time offset in milliseconds from real system time
    };
  };
  spanningTreePriority?: number;
  firewallRules?: Array<{
    id: string;
    sourceIp: string;
    targetIp: string;
    port: string;
    protocol: 'tcp' | 'udp' | 'icmp' | 'any';
    action: 'allow' | 'deny';
    enabled: boolean;
  }>;
  // Wireless configuration
  wirelessConfig?: Record<string, {
    name: string;
    authentication: 'open' | 'shared' | 'network-eap';
    keyManagement: 'none' | 'wpa';
    wpaVersion: 2 | 3;
    presharedKey: string;
    encryption: 'none' | 'aes-ccm' | 'tkip' | 'aes-tkip';
    guestMode: boolean;
    mbssid?: boolean;
  }>;
  wirelessRadios?: Record<string, {
    id: string;
    frequency: '2.4GHz' | '5GHz';
    channel: number;
    power: string;
    ssid: string;
    encryption: string;
    stationRole: 'root' | 'repeater' | 'client';
    shutdown: boolean;
    macFilter?: {
      enabled: boolean;
      allowList: string[];
      denyList: string[];
    };
  }>;
  wlans?: Record<string, {
    name: string;
    ssid: string;
  }>;
  ip?: string; // Device management/primary IP
  ospfProcessId?: string;
  ospfv3ProcessId?: string;
  ospfRouterId?: string;
  sshTimeout?: number;
  sshAuthenticationRetries?: number;
  dhcpOption82?: boolean;
  dhcpSnoopingVlans?: string[];
  accessLists?: Record<string, string[]>;
  namedAclTypes?: Record<string, 'standard' | 'extended'>;  // Track named ACL types for display
  currentNamedAcl?: string;  // Current named standard ACL being configured
  currentExtendedAcl?: string;  // Current named extended ACL being configured
  aclMatchCounters?: Record<string, Record<string, number>>;  // ACL name → rule index → match count
  currentSsid?: string;
  currentRadio?: string;
  execAliases?: Record<string, string>;
  // NAT configuration
  natPools?: Record<string, { startIp: string; endIp: string; netmask: string }>;
  natStaticTranslations?: Array<{ localIp: string; globalIp: string }>;
  natDynamicRules?: Array<{ aclId: string; poolName?: string; overload?: boolean; interface?: string }>;
  natTranslations?: Array<{
    protocol: string;
    localIp: string;
    localPort: number;
    globalIp: string;
    globalPort: number;
    remoteIp?: string;
    remotePort?: number;
    type?: 'static' | 'dynamic';
    timeout?: number;
  }>;
  // OSPF areas
  ospfAreas?: number[];
  isAbr?: boolean;
  // World mode for dot11d
  worldModeDot11d?: string;
  // IoT specific configuration
  iotConfig?: {
    sensorType?: string;
    name?: string;
    wifiSsid?: string;
  };
  // WLC-specific state
  wlcAps?: Record<string, {
    name: string;
    macAddress: string;
    ipAddress?: string;
    status: 'joined' | 'disconnected' | 'downloading';
    model?: string;
    apGroup?: string;
    wlans?: number[];
    rfChannel?: number;
    power?: string;
    uptime?: string;
  }>;
  wlcWlans?: Record<string, {
    id: number;
    name: string;
    ssid: string;
    status: 'enabled' | 'disabled';
    security: 'open' | 'wpa2' | 'wpa3';
    password?: string;
    vlan?: number;
    apGroups?: string[];
  }>;
  currentApName?: string;  // Current AP being configured
  // SDM / Reload
  sdmPreferConfigured?: boolean;
  sdmTemplate?: string;
  reloaded?: boolean;
  // Spanning-tree global per-VLAN enabled
  spanningTreeEnabled?: boolean;
  // ARP inspection
  arpInspectionEnabled?: boolean;
  // Spanning-tree portfast default (global)
  spanningTreePortfastDefault?: boolean;
}

export interface StartupConfig {
  hostname: string;
  version?: string;
  ports: Record<string, Port>;
  vlans: Record<string, Vlan>;
  security: SecurityConfig;
  spanningTree?: {
    mode: string;
  };
  bannerMOTD?: string;
  bannerLogin?: string;
  bannerExec?: string;
  domainName?: string;
  defaultGateway?: string;
  dnsServer?: string;
  sshVersion?: 1 | 2;
  cdpEnabled?: boolean;
  spanningTreeMode?: 'pvst' | 'rapid-pvst' | 'mst';
  vtpMode?: 'server' | 'client' | 'transparent' | 'off';
  vtpDomain?: string;
  vtpPassword?: string;
  vtpRevision?: number;
  mlsQosEnabled?: boolean;
  dhcpSnoopingEnabled?: boolean;
  ntpServers?: string[];
  ntpTimeOffset?: number;
  ipv6Enabled?: boolean;
  ipRouting: boolean;
}

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  realismLevel?: 'real' | 'stub' | 'sim-only';
  hint?: string | { tr: string; en: string };
  newState?: Partial<SwitchState>;
  deviceStates?: Map<string, SwitchState>; // Cross-device state updates (e.g., port security violations)
  updatedDeviceStates?: Map<string, SwitchState>; // Cross-device state updates (e.g., STP recalculation)
  modeChange?: CommandMode;
  requiresPassword?: boolean;        // Şifre gerekiyor mu?
  passwordPrompt?: string;           // Şifre istemi metni
  passwordContext?: 'enable' | 'console' | 'vty';        // Şifre bağlamı
  requiresConfirmation?: boolean;    // Onay gerekiyor mu?
  confirmationMessage?: string;      // Onay mesajı
  confirmationAction?: string;       // Onay sonrası yapılacak işlem
  requiresReloadConfirm?: boolean;   // Reload sonrası Enter ile onay gerekiyor mu?
  telnetTarget?: { host: string; port: string };  // Telnet bağlantı hedefi
  reloadDevice?: boolean;            // Cihazı sıfırla
  saveConfig?: boolean;  // running-config'i startup-config'e kaydet
  saveFlashConfig?: boolean;  // running-config'i flash'a kaydet
  flashFilename?: string;  // flash dosya adı (örn: running-config)
  restoreFlashConfig?: boolean;  // flash'tan startup-config'e geri yükle
  flashSourceFilename?: string;  // kaynak flash dosya adı
  eraseConfig?: boolean;  // startup-config'i sil
  deleteVlanDat?: boolean;  // vlan.dat dosyasını sil
  triggerPingAnimation?: string;  // Animatör başlatmak için hedef cihaz ID'si
  exitSession?: boolean;  // Oturum sonlandırma bayrağı
  requiresTelnetPassword?: boolean;  // Telnet için şifre gerekiyor mu?
  requiresSshPassword?: boolean;  // SSH için şifre gerekiyor mu?
  sshTarget?: { host: string; username?: string; port: number };  // SSH bağlantı hedefi
  sourceDeviceId?: string;             // Telnet bağlantı hedef IP
}

export interface ParsedCommand {
  command: string;
  args: string[];
  rawInput: string;
  resolvedInput?: string;  // Alias-resolved input for executor
  intent?: {
    family: 'show' | 'interface' | 'routing' | 'system' | 'security' | 'other';
    action: string;
  };
}

export type ValidationReason = 'ok' | 'ambiguous' | 'incomplete' | 'invalid-mode' | 'unknown-command';

export interface CommandValidationResult {
  valid: boolean;
  reason: ValidationReason;
  error?: string;
  matchedPattern?: string;
}

// Kablo Tipleri
export type CableType = 'straight' | 'crossover' | 'console' | 'wireless' | 'serial';

export interface CableInfo {
  connected: boolean;
  cableType: CableType;
  sourceDevice: 'pc' | 'iot' | 'switchL2' | 'switchL3' | 'router' | 'firewall' | 'wlc';
  targetDevice: 'pc' | 'iot' | 'switchL2' | 'switchL3' | 'router' | 'firewall' | 'wlc';
  sourcePort?: string;  // Port ID (e.g., 'eth0', 'com1', 'console', 'fa0/1')
  targetPort?: string;  // Port ID
}

// Kablo uyumluluk kuralları
export const CABLE_COMPATIBILITY: Record<string, CableType[]> = {
  'pc-switch': ['straight', 'crossover'],
  'iot-switch': ['straight', 'crossover'],
  'switch-iot': ['straight', 'crossover'],
  'switch-pc': ['straight', 'crossover'],
  'pc-router': ['straight', 'crossover'],
  'iot-router': ['straight', 'crossover'],
  'router-iot': ['straight', 'crossover'],
  'router-pc': ['straight', 'crossover'],
  'switch-router': ['straight', 'crossover'],
  'router-switch': ['straight', 'crossover'],
  'router-router': ['straight', 'crossover', 'serial'],
  'pc-pc': ['crossover'],
  'pc-iot': ['crossover'],
  'iot-pc': ['crossover'],
  'iot-iot': ['crossover'],
  'switch-switch': ['straight', 'crossover'],
  'pc-console': ['console'],
  'console-pc': ['console'],
  'firewall-switch': ['straight', 'crossover'],
  'switch-firewall': ['straight', 'crossover'],
  'firewall-router': ['straight', 'crossover'],
  'router-firewall': ['straight', 'crossover'],
  'firewall-pc': ['straight', 'crossover'],
  'pc-firewall': ['straight', 'crossover'],
  'firewall-firewall': ['crossover'],
  'router-serial': ['serial'],
  'serial-router': ['serial'],
  'wlc-switch': ['straight', 'crossover'],
  'switch-wlc': ['straight', 'crossover'],
  'wlc-router': ['straight', 'crossover'],
  'router-wlc': ['straight', 'crossover'],
  'wlc-pc': ['straight', 'crossover'],
  'pc-wlc': ['straight', 'crossover'],
};

// Console portu olup olmadığını kontrol et
function isConsolePort(portId: string | undefined): boolean {
  if (!portId) return false;
  const port = portId.toLowerCase();
  return port === 'console' || port === 'com1' || port === 'com';
}


export function isCableCompatible(cable: CableInfo): boolean {
  if (!cable.connected) return false;

  // Wireless bağlantılar her zaman geçerli (fiziksel kablo yok)
  if (cable.cableType === 'wireless') return true;

  // Console portu bağlantıları için özel kontrol
  // Console kablosu: PC COM1 <-> Switch Console portu
  const sourceIsConsole = isConsolePort(cable.sourcePort);
  const targetIsConsole = isConsolePort(cable.targetPort);

  if (sourceIsConsole || targetIsConsole) {
    // Console portları için sadece console kablosu geçerli
    if (cable.cableType !== 'console') return false;
    // Bir taraf console portu ise diğer taraf da console portu olmalı
    // PC COM1 <-> Switch Console veya Switch Console <-> PC COM1
    return sourceIsConsole && targetIsConsole;
  }

  // Normal Ethernet bağlantıları için standart kurallar
  const normalize = (t: CableInfo['sourceDevice']): 'pc' | 'switch' | 'router' | 'firewall' | 'wlc' =>
    t === 'switchL2' || t === 'switchL3'
      ? 'switch'
      : t === 'iot'
        ? 'pc'
        : t;
  const connection = `${normalize(cable.sourceDevice)}-${normalize(cable.targetDevice)}`;
  const allowedTypes = CABLE_COMPATIBILITY[connection];
  return allowedTypes ? allowedTypes.includes(cable.cableType) : false;
}

export function getCableTypeName(type: CableType, lang: 'tr' | 'en'): string {
  const names: Record<CableType, Record<'tr' | 'en', string>> = {
    straight: { tr: 'Düz Kablo', en: 'Straight-through' },
    crossover: { tr: 'Çapraz Kablo', en: 'Crossover' },
    console: { tr: 'Konsol Kablosu', en: 'Console Cable' },
    wireless: { tr: 'Kablosuz Bağlantı', en: 'Wireless Connection' },
    serial: { tr: 'Seri Kablo', en: 'Serial Cable' },
  };
  return names[type][lang];
}

export function getCableTypeLabel(type: CableType, primaryLang: 'tr' | 'en'): string {
  const trLabel = getCableTypeName(type, 'tr');
  const enLabel = getCableTypeName(type, 'en');
  return primaryLang === 'tr'
    ? `${trLabel}`
    : `${enLabel}`;
}

// Port LED renkleri
export type PortLEDColor = 'green' | 'gray' | 'orange' | 'off' | 'white' | 'red';

export function getPortLEDColor(port: Port): PortLEDColor {
  if (port.shutdown) return 'gray';
  if (port.status === 'err-disabled') return 'red';
  if (port.status === 'blocked') return 'orange';
  if (port.status === 'connected') return 'green';
  if (port.status === 'notconnect') return 'white';
  return 'white';
}

// Port tipi yardımcı fonksiyonları
export function parsePortId(portId: string): { type: 'fa' | 'gi'; module: number; port: number } | null {
  const match = portId.toLowerCase().match(/^(fa|gi)(\d+)\/(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] as 'fa' | 'gi',
    module: parseInt(match[2]),
    port: parseInt(match[3])
  };
}

export function formatPortId(type: 'fastethernet' | 'gigabitethernet', module: number, port: number): string {
  const prefix = type === 'fastethernet' ? 'Fa' : 'Gi';
  return `${prefix}${module}/${port}`;
}

// Route interface for routing functionality
export interface Route {
  destination: string;      // e.g., "192.168.2.0" or "2001:db8:1::"
  network?: string;         // Alias for destination
  mask?: string;            // Alias for subnetMask
  subnetMask?: string;      // e.g., "255.255.255.0" (for IPv4)
  prefixLength?: number;     // e.g., 64 (for IPv6)
  nextHop: string;          // e.g., "192.168.1.1" or "2001:db8:1::1" or interface name
  interface?: string;       // Exit interface name
  metric?: number;          // Administrative distance/metric
  type: 'connected' | 'static' | 'dynamic'; // Route type
  area?: number;            // For OSPF
}
