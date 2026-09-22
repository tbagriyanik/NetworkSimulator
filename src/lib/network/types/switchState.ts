// Switch and Device State Types

import type { SwitchModel } from '../switchModels';
import type {
  OspfNeighborRecord,
  EigrpNeighborRecord,
  DhcpClientRecord,
  LacpPortRecord,
} from '../protocols/protocolStateMachines';
import type { Route, BgpNeighbor } from './routingTypes';
import type { NveInterface, EigrpNamedInstance, OspfVirtualLinkConfig, LispConfig, CoppConfig, IpSlaOperation } from './protocols';
import type { Port } from './ports';
import type { Vlan, StpVlanState, DhcpSnoopingBinding } from './vlans';
import type { CommandMode } from './cli';
import type { Dhcpv6Binding, PppoeSession } from './wireless';
import type { RedistributeRule, MstConfig } from './services';

export type SwitchLayer = 'L2' | 'L3' | 'FW' | 'WLC';

export interface LineConfig {
  password?: string;
  login: boolean;
  loginLocal?: boolean;
  transportInput: ('ssh' | 'telnet' | 'all' | 'none')[];
  transportOutput?: ('ssh' | 'telnet' | 'all' | 'none')[];
  transportPreferred?: string;
  accessClassIn?: string;
  accessClassOut?: string;
  sessionLimit?: number;
  lockable?: boolean;
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
  lldpEnabled?: boolean;
  spanningTreeMode?: 'pvst' | 'rapid-pvst' | 'mst';
  vtpMode?: 'server' | 'client' | 'transparent' | 'off';
  vtpDomain?: string;
  vtpPassword?: string;
  vtpRevision?: number;
  mlsQosEnabled?: boolean;
  dhcpSnoopingEnabled?: boolean;
  dhcpSnoopingBindings?: DhcpSnoopingBinding[];
  ntpServers?: string[];
  ntpTimeOffset?: number;
  ipv6Enabled?: boolean;
  ipRouting: boolean;
}

export interface SwitchState {
  hostname: string;
  macAddress: string; // Unique base MAC address for the device
  switchModel: SwitchModel; // Switch model (L2 or L3)
  switchLayer: SwitchLayer; // Layer 2 or Layer 3
  deviceType?: 'pc' | 'router' | 'switch' | 'switchL2' | 'switchL3' | 'iot' | 'firewall' | 'wlc'; // Device type for identification
  currentMode: CommandMode;
  terminalLength?: number;
  terminalWidth?: number;
  terminalMonitor?: boolean;
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
  eventLogs?: string[];
  debugs?: Record<string, boolean>;
  bannerMOTD?: string;
  bannerLogin?: string;
  bannerExec?: string;
  installedModules?: Record<number, string>; // slot index -> module ID (e.g. 1 -> 'WIC-2T')
  version: {
    nosVersion: string;
    modelName: string;
    serialNumber: string;
    uptime: string;
  };
  macAddressTable: { mac: string; vlan: number; port: string; type: string; timestamp?: number }[];
  arpCache: { ip: string; mac: string; interface: string; timestamp: number }[];
  ndpCache?: { ipv6: string; mac: string; interface: string; state: string; timestamp: number; isRouter?: boolean }[];
  // Password prompt state
  awaitingPassword?: boolean;
  passwordContext?: 'enable' | 'console' | 'vty';
  // "Configuring from terminal, memory, or network" prompt state
  awaitingConfigSource?: boolean;
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
  spanSessions?: Record<number, { id: number; sourceInterfaces: string[]; destinationInterface?: string; remoteVlan?: number; type?: 'local' | 'rspan-source' | 'rspan-destination'; enabled: boolean }>;
  errdisableConfig?: { enabledCauses: string[]; interval: number };
  greTunnels?: Record<string, { id: string; source?: string; destination?: string; tunnelIp?: string; subnetMask?: string }>;
  ospfAreaRanges?: { areaId: string; network: string; mask: string; advertise: boolean }[];
  vrfInstances?: Record<string, { name: string; rd?: string; interfaces: string[] }>;
  qosPolicies?: Record<string, { name: string; classes: { name: string; priorityPercent?: number; bandwidthKbps?: number }[] }>;
  nveInterfaces?: Record<string, NveInterface>;
  vxlanConfig?: import('../vxlanEvpn').VxlanConfig;
  lispConfig?: LispConfig;
  coppConfig?: CoppConfig;
  eigrpNamedInstances?: Record<string, EigrpNamedInstance>;
  ospfVirtualLinks?: Record<string, OspfVirtualLinkConfig>;
  bootTime: number;
  // New optional properties for extended features
  domainName?: string;
  defaultGateway?: string;
  dnsServer?: string;
  domainLookup?: boolean;
  sshVersion?: 1 | 2;
  rsaKeys?: { modulus: number; name: string };
  cryptoIsakmpPolicies?: Record<number, { encryption: string; hash: string; group: number; lifetime: number }>;
  cryptoIpsecTransformSets?: Record<string, { espEncryption: string; espAuth: string; mode: string }>;
  cryptoMaps?: Record<string, Record<number, { ipsecIsakmp: boolean; matchAddress?: string; setPeer?: string; setTransformSet?: string; setPfs?: string }>>;
  tunnelGroups?: Record<string, { type?: string; generalAttributes?: { authenticationType?: string; authenticationServerGroup?: string }; ipsecAttributes?: { preSharedKey?: string } }>;
  cdpEnabled?: boolean;
  cdpTimer?: number;
  cdpHoldtime?: number;
  lldpEnabled?: boolean;
  lldpTimer?: number;
  lldpHoldtime?: number;
  lldpReinit?: number;
  lldpTlvSelect?: string[];
  lldpMed?: { capabilities?: boolean; networkPolicy?: boolean; location?: boolean; power?: boolean };
  snmpCommunities?: Record<string, 'RO' | 'RW'>;
  snmpContact?: string;
  snmpLocation?: string;
  spanningTreeMode?: 'pvst' | 'rapid-pvst' | 'mst';
  vtpMode?: 'server' | 'client' | 'transparent' | 'off';
  vtpDomain?: string;
  vtpPassword?: string;
  vtpRevision?: number;
  savedConfig?: string;
  mlsQosEnabled?: boolean;
  dhcpSnooping?: { enabled?: boolean; vlans?: number[]; informationOption?: boolean };
  dhcpSnoopingEnabled?: boolean;
  dhcpExcludedAddresses?: Array<{ startIp: string; endIp?: string }>;
  clockTimezone?: { name: string; hoursOffset: number; minutesOffset?: number };
  ntpServers?: string[];
  ntpMasterStratum?: number;
  systemClock?: { time: string; day: string; month: string; year: string };
  ipv6Enabled?: boolean;
  ipRouting: boolean;
  spanningTreeVlans?: Record<string, { priority?: string; enabled?: boolean }>;
  startupConfig?: StartupConfig;
  flashFiles?: Record<string, string[]>;
  flashStartupConfigs?: Record<string, StartupConfig>;
  loopguardDefault?: boolean;
  eigrp6Config?: {
    as?: string;
    routerId?: string;
    shutdown?: boolean;
  };
  prefixLists?: Record<string, {
    seq: number;
    action: 'permit' | 'deny';
    prefix: string;
    ge?: number;
    le?: number;
  }[]>;
  ipv6PrefixLists?: Record<string, {
    seq: number;
    action: 'permit' | 'deny';
    prefix: string;
    ge?: number;
    le?: number;
  }[]>;
  currentRouteMap?: string;
  currentFlowRecordName?: string;    // Current flow record being configured
  currentFlowExporterName?: string;  // Current flow exporter being configured
  currentFlowMonitorName?: string;   // Current flow monitor being configured
  routeMaps?: Record<string, {
    seq: number;
    action: 'permit' | 'deny';
    matchRules: Record<string, unknown>;
    setRules: Record<string, unknown>;
    setNextHop?: string;
    setInterface?: string;
    setPrecedence?: number;
    setDscp?: number;
  }[]>;
  flowRecords?: Record<string, {
    matchFields?: string[];
    collectFields?: string[];
  }>;
  flowExporters?: Record<string, {
    destination?: string;
    transportProtocol: 'udp';
    transportPort?: number;
    version?: number;
    source?: string;
    templateDataTimeout?: number;
  }>;
  flowMonitors?: Record<string, {
    exporter?: string;
    record?: string;
    cacheTimeoutActive?: number;
    cacheTimeoutInactive?: number;
  }>;
  netflowConfig?: {
    exportDestination?: string;
    exportPort?: number;
    version?: number;
    exportedPackets?: number;
    exportedFlows?: number;
  };
  netflowCache?: {
    srcIf?: string;
    dstIf?: string;
    srcIp: string;
    dstIp: string;
    proto: string;
    srcPort: number;
    dstPort: number;
    pkts: number;
    bytes: number;
    active: number;
    lastSeen: number;
  }[];
  bgpConfig?: unknown;
  mplsConfig?: unknown;
  restconfEnabled?: boolean;
  archiveConfig?: { path?: string; maximum?: number };
  macros?: Record<string, string[]>;
  macAcls?: Record<string, unknown[]>;
  templates?: Record<string, string[]>;
  isLayer3Switch?: boolean;        // L3 switch capability
  staticRoutes?: Route[];          // Static routing table
  dynamicRoutes?: Route[];         // Dynamic routing table
  ipv6StaticRoutes?: Route[];      // IPv6 static routing table
  ipv6DynamicRoutes?: Route[];     // IPv6 dynamic routing table
  routingProtocol?: 'none' | 'rip' | 'ospf' | 'ripng' | 'ospfv3' | 'eigrp' | 'bgp'; // Routing protocol
  ripVersion?: 1 | 2;                 // RIP version configured in router mode
  autoSummary?: boolean;           // Auto-summary for routing protocols
  ospfProcessId?: string | number; // OSPF process ID
  ospfRouterId?: string;           // OSPF Router ID
  ospfAreas?: number[];            // OSPF active areas
  ospfNetworks?: { network: string; wildcard: string; area: number }[]; // Explicit OSPF network statements
  ospfAreaAuth?: Record<string, 'simple' | 'md5'>; // OSPF area authentication configuration
  ospfStubAreas?: string[];        // OSPF stub areas
  ospfTotallyStubAreas?: string[]; // OSPF totally stubby areas (stub no-summary)
  ospfNssaAreas?: string[];        // OSPF NSSA areas
  ospfTotallyNssaAreas?: string[]; // OSPF totally NSSA areas (nssa no-summary)
  ospfDefaultOriginate?: {         // OSPF default-information originate
    enabled: boolean;
    always?: boolean;
    metric?: number;
    metricType?: 1 | 2;
  };
  isAbr?: boolean;                 // Area Border Router flag
  ip?: string;                     // Device primary IP
  ospfNeighbors?: string[];        // OSPF neighbor IDs/IPs
  eigrpAs?: string;                // EIGRP AS number
  eigrpStub?: {                    // EIGRP Stub Routing (eigrp stub [connected|summary|static|redistributed|receive-only])
    connected: boolean;
    summary: boolean;
    static: boolean;
    redistributed: boolean;
    receiveOnly: boolean;
  } | null;
  eigrpNeighbors?: string[];       // EIGRP neighbor IDs/IPs
  bgpAs?: string;                  // BGP AS number
  bgpNeighbors?: BgpNeighbor[];   // BGP neighbor configurations
  bgpNeighborState?: Record<string, string>; // BGP neighbor dynamic state mapping (e.g. 'Established', 'Idle')
  bgpNetworks?: { network: string; mask: string }[]; // BGP advertised networks (network <ip> mask <mask>)
  // --- Advanced BGP global settings (router-config mode for BGP) ---
  bgpMaximumPaths?: number;          // maximum-paths <n> multipath
  bgpLocalPreference?: number;       // bgp default local-preference <n>
  bgpGracefulRestart?: boolean;      // bgp graceful-restart
  bgpClusterId?: string;             // bgp cluster-id <id> (route-reflector)
  bgpSynchronization?: boolean;      // synchronization (default false on modern router software)
  bgpAggregateAddresses?: { network: string; mask: string; summaryOnly?: boolean }[]; // aggregate-address <ip> <mask>
  bgpTimers?: { keepalive: number; holdtime: number }; // timers bgp <keepalive> <holdtime>
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
    dnsServer?: string;
    domainName?: string;
  }>;
  dhcpv6Bindings?: Dhcpv6Binding[];
  pppoeSessions?: PppoeSession[];

  // Services (DHCP, DNS, HTTP, FTP, Mail)
  services?: {
    dhcp?: {
      enabled: boolean;
      pools?: {
        poolName: string;
        defaultGateway: string;
        dnsServer: string;
        startIp: string;
        endIp?: string;
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
        content?: string;
      }>;
    };
    http?: {
      enabled: boolean;
      content?: string;
      fontSize?: number;
      username?: string;
      password?: string;
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
    syslog?: {
      enabled: boolean;
      messages: import('../syslog').SyslogMessage[];
      maxMessages?: number;
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
  ospfv3ProcessId?: string;
  sshTimeout?: number;
  sshAuthenticationRetries?: number;
  dhcpOption82?: boolean;
  dhcpSnoopingVlans?: string[];
  dhcpSnoopingBindings?: DhcpSnoopingBinding[];
  arpInspectionVlans?: string[];
  // DAI — Dynamic ARP Inspection
  daiEnabled?: boolean;
  daiStaticBindings?: { ip: string; mac: string; vlan: number; portId: string }[];
  daiStats?: Record<string, { forwarded: number; dropped: number; portId: string; vlan: number }>;
  daiValidate?: { srcMac: boolean; dstMac: boolean; ip: boolean };
  // IPSG — IP Source Guard binding table (populated from DHCP snooping)
  ipsgBindings?: { ip: string; mac?: string; vlan: number; portId: string }[];
  // Private VLAN domain config
  pvlanDomain?: {
    primaryVlan?: number;
    isolatedVlan?: number;
    communityVlans?: number[];
    associations?: { primary: number; secondaries: number[] }[];
  };
  accessLists?: Record<string, string[]>;
  ipv6AccessLists?: Record<string, string[]>;
  namedAclTypes?: Record<string, 'standard' | 'extended'>;  // Track named ACL types for display
  currentNamedAcl?: string;  // Current named standard ACL being configured
  currentExtendedAcl?: string;  // Current named extended ACL being configured
  currentIpv6Acl?: string;  // Current named IPv6 ACL being configured
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
    timestamp?: number;
    flags?: string;
  }>;

  // Zone-Based Firewall (ZBFW)
  zones?: string[];
  zonePairs?: Array<{
    name: string;
    sourceZone: string;
    destinationZone: string;
    servicePolicy?: string;
    action: 'inspect' | 'pass' | 'drop';
  }>;

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
    dot11?: {
      '5ghz'?: {
        rfChannel?: number;
        powerConstraint?: number;
        channelSwitchMode?: 0 | 1;
      };
    };
    uptime?: string;
  }>;
  wlcWlans?: Record<string, {
    id: number;
    name: string;
    ssid: string;
    status: 'enabled' | 'disabled';
    security: 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
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
  // STP calculation results
  cryptoIsakmpKeys?: Record<string, string>;
  stpState?: Record<number, StpVlanState>;

  sameSecurityTraffic?: boolean;
  // Firewall-specific state
  firewallObjects?: Record<string, {
    name: string;
    subnet?: { ip: string; mask: string };
    host?: string;
    nat?: string;
  }>;
  currentFirewallObject?: string;
  natRules?: Array<{
    type: 'static' | 'dynamic';
    srcZone: string;
    dstZone: string;
    mappedIp?: string;
    pool?: string;
    target?: string;
  }>;
  firewallTimeouts?: Record<string, string>;
  loggingEnabled?: boolean;
  syslogHost?: string;
  syslogTrapLevel?: string;
  currentSlaId?: string;
  ipSlaOperations?: Record<string, IpSlaOperation>;
  ipSlaTracks?: Record<string, { operationId: string; state: 'up' | 'down'; lastChange: number; decrement?: number }>;
  qosClassMaps?: Record<string, { match: 'all' | 'any'; criteria: string[] }>;
  qosPolicyMaps?: Record<string, { classes: Record<string, { priority?: boolean; bandwidthPercent?: number; setDscp?: string; setCos?: number; policeRate?: number; match?: 'all' | 'any' }> }>;
  qosServicePolicies?: Record<string, { direction: 'input' | 'output'; policy: string }>;
  dot1xSystemAuthControl?: boolean;
  dot1xSessions?: Record<string, import('../dot1x').Dot1xSession>;

  // Route redistribution rules
  redistributeRules?: RedistributeRule[];

  // MSTP configuration state
  mstConfig?: MstConfig;

  // SLAAC / Host IPv6 Auto-config
  ipv6UnicastRouting?: boolean;
  ipv6Autoconfig?: boolean;

  // AAA, RADIUS, TACACS+ state
  aaaNewModel?: boolean;
  aaaAuthentication?: string[];
  radiusServers?: Array<{ host: string; key?: string }>;
  tacacsServers?: Array<{ host: string; key?: string }>;
  radiusKey?: string;
  tacacsKey?: string;

  /**
   * OSPF neighbor FSM records keyed by neighbor Router-ID.
   */
  ospfNeighborStates?: Record<string, OspfNeighborRecord>;

  /**
   * EIGRP neighbor FSM records keyed by neighbor IP.
   */
  eigrpNeighborStates?: Record<string, EigrpNeighborRecord>;

  /**
   * DHCP client FSM records keyed by interface ID (e.g. 'gi0/0').
   */
  dhcpClientStates?: Record<string, DhcpClientRecord>;

  /**
   * LACP port FSM records keyed by port ID.
   */
  lacpPortStates?: Record<string, LacpPortRecord>;

  // Multicast & PIM state
  multicastRoutingEnabled?: boolean;
  igmpSnoopingEnabled?: boolean;
  /** Static RP address for PIM sparse-mode (ip pim rp-address X.X.X.X) */
  pimRpAddress?: string;
  mrouteEntries?: Array<{
    source: string;           // '*' for (*,G) shared-tree entries
    group: string;
    incomingInterface: string;
    outgoingInterfaces: string[];
    flags?: string;
    uptime?: number;          // creation timestamp (ms)
    expires?: number;         // expiry timestamp (ms)
    rpfNeighbor?: string;     // RPF neighbor IP address
    rpAddress?: string;       // RP address for (*,G) entries
  }>;
  /** Dynamic PIM neighbor table, keyed by neighbor IP */
  pimNeighbors?: Record<string, {
    interface: string;
    ip: string;
    uptime: number;
    expires: number;
    drPriority?: number;
    version?: number;
  }>;
  /** Dynamic IGMP group membership table, keyed by group IP */
  igmpMemberships?: Record<string, {
    interface: string;
    lastReporter: string;
    expires: number;
    version: 1 | 2 | 3;
  }>;
  /** Dense-mode pruned interfaces per group — group → port IDs that are pruned */
  pimPrunedInterfaces?: Record<string, string[]>;

  // Spanning Tree features
  stpUplinkFast?: boolean;
  stpBackboneFast?: boolean;

  // SNMPv3 configuration
  snmpGroups?: Array<{ name: string; version: 'v1' | 'v2c' | 'v3'; secLevel?: 'noauth' | 'auth' | 'priv' }>;
  snmpUsers?: Array<{ username: string; group: string; authProto?: string; authPass?: string; privProto?: string; privPass?: string }>;
  snmpHosts?: Array<{ host: string; version?: string; communityOrUser?: string; informs?: boolean }>;

  // BGP Advanced features
  bgpConfederationId?: number;
  bgpConfederationPeers?: number[];
  bgpAlwaysCompareMed?: boolean;
  bgpBestpathConfig?: { asPathIgnore?: boolean; compareRouterId?: boolean };

  // IP SLA Responder
  ipSlaResponder?: boolean;

  // CBAC (Context-Based Access Control) inspect rules
  inspectRules?: Record<string, Array<{ protocol: string; timeout?: number; alert?: boolean; auditTrail?: boolean }>>;

  // EEM (Embedded Event Manager)
  eemApplets?: Record<string, {
    events?: Array<{ type: string; pattern?: string }>;
    actions?: Array<{ id: string; command?: string; message?: string; type: string }>;
  }>;
  currentEemApplet?: string;

  // NETCONF / Programmability
  netconfYangEnabled?: boolean;
  netconfSshEnabled?: boolean;

  // Multi-mode CLI Aliases
  aliases?: {
    exec?: Record<string, string>;
    configure?: Record<string, string>;
    interface?: Record<string, string>;
    line?: Record<string, string>;
  };

  // Interactive Initial Configuration Dialog (Setup)
  setupDialog?: {
    step: 'enter_dialog' | 'basic_mgmt' | 'hostname' | 'enable_secret' | 'enable_password' | 'vty_password' | 'mgmt_interface' | 'mgmt_ip' | 'mgmt_mask' | 'save_nvram' | 'completed';
    answers: Record<string, string>;
  };

  // Remote Outgoing Sessions (Telnet/SSH Suspension & Resume)
  activeSessions?: Array<{
    id: number;
    host: string;
    port?: string;
    protocol: 'telnet' | 'ssh';
    user?: string;
    status: 'active' | 'suspended';
    lastActive?: string;
  }>;

  // sFlow sampling configuration and runtime state
  sflowConfig?: {
    enabled?: boolean;
    sampleRate?: number;
    collector?: string;
    samples?: Array<{
      sequence: number;
      sourceIp?: string;
      destinationIp?: string;
      protocol: string;
      inputInterface?: string;
      outputInterfaces: string[];
      bytes: number;
      sampledAt: number;
    }>;
    exportedSamples?: number;
    exportQueue?: Array<{
      collector: string;
      sample: {
        sequence: number;
        sourceIp?: string;
        destinationIp?: string;
        protocol: string;
        inputInterface?: string;
        outputInterfaces: string[];
        bytes: number;
        sampledAt: number;
      };
    }>;
    sequence?: number;
  };

  // CAPWAP session state (WLC)
  capwapSessions?: Record<string, {
    apName: string;
    state: 'discovery' | 'joining' | 'configuring' | 'data' | 'run' | 'failed';
    controlChannel: boolean;
    dataChannel: boolean;
    lastTransition: number;
    retries: number;
  }>;
}
