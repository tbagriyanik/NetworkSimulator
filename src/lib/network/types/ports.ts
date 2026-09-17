// Port and Interface Level Types

import type { DeviceWifiSsidProfile } from '../wireless';
import type { WifiConfig, WifiMode } from './wireless';

export type PortLEDColor = 'green' | 'gray' | 'orange' | 'off' | 'white' | 'red';

export interface PortSecurityConfig {
  enabled: boolean;
  maxMacs: number;
  violationAction: 'protect' | 'restrict' | 'shutdown';
  macAddresses: string[];
  sticky: boolean;
  stickyMacs: string[];
}

export type PortStatus = 'connected' | 'notconnect' | 'disabled' | 'blocked' | 'err-disabled' | 'disconnected';
export type PortMode = 'access' | 'trunk' | 'routed' | 'dynamic-auto' | 'dynamic-desirable' | 'dot1q-tunnel';
export type VoiceVlanMode = number | 'dot1p' | 'none' | 'untagged';
export type EtherChannelProtocol = 'lacp' | 'pagp';
export type DuplexMode = 'half' | 'full' | 'auto';
export type SpeedMode = '10' | '100' | '1000' | '10000' | 'auto';
export type EtherChannelMode = 'on' | 'active' | 'passive' | 'desirable' | 'auto';

export interface PortStats {
  rxPackets?: number;
  rxBytes?: number;
  txPackets?: number;
  txBytes?: number;
  rxDrops?: number;
  txDrops?: number;
  rxErrors?: number;
  txErrors?: number;
}

export interface Port {
  id: string;              // fa0/1, gi0/1 etc.
  name: string;            // description
  description?: string;    // interface description (CLI: description <text>)
  status: PortStatus;
  stats?: PortStats;
  vlan: number;
  accessVlan?: number | string;
  nativeVlan?: number;       // Native VLAN for trunk ports
  mode: PortMode;
  voiceVlan?: VoiceVlanMode;
  duplex: DuplexMode;
  speed: SpeedMode;
  shutdown: boolean;
  type: 'fastethernet' | 'gigabitethernet' | 'tengigabitethernet' | 'vlan' | 'serial' | 'tunnel';
  previousStatus?: PortStatus;  // shutdown öncesi durum (no shutdown için)
  ipAddress?: string;           // For L3 ports or SVI
  subnetMask?: string;
  stpCost?: number;             // Manual STP path cost
  arpTimeout?: string;          // ARP timeout setting
  macAddress?: string;         // Per-port MAC address (for router ports)
  allowedVlans?: number[] | 'all'; // For trunk ports
  accessGroupIn?: string;       // Inbound ACL name/ID
  accessGroupOut?: string;      // Outbound ACL name/ID
  macAccessGroupIn?: string;    // Inbound MAC ACL name
  macAccessGroupOut?: string;   // Outbound MAC ACL name
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
  stickyMacs?: string[]; // Sticky MAC addresses for port security
  protected?: boolean; // Protected port (PVLAN edge)
  ipv6Address?: string;
  zoneMember?: string; // Zone-Based Firewall security zone member
  ipv6RaGuard?: boolean; // IPv6 First-Hop Security RA Guard
  ipv6DhcpGuard?: boolean; // IPv6 First-Hop Security DHCPv6 Guard

  ipv6Prefix?: number;
  ipv6LinkLocal?: string;
  ipv6Autoconfig?: boolean;
  ipv6Rip?: {
    enabled: boolean;
    processName?: string;
  };
  ipv6Ospf?: {
    enabled: boolean;
    processId?: string;
    area?: string;
  };
  ipv6NdSuppressRa?: boolean;
  ospfEnabled?: boolean;
  ospfProcessId?: string;
  ospfArea?: string;
  ospfCost?: number;
  ospfHelloInterval?: number;
  ospfDeadInterval?: number;
  ospfPriority?: number;
  ospfAuthType?: 'none' | 'simple' | 'md5';
  ospfAuthKey?: string;
  ospfMd5KeyId?: number;
  eigrpBandwidthPercent?: Record<number, number>;
  eigrpSummaryAddresses?: Array<{ as: number; ip: string; mask: string; distance?: number }>;
  passiveInterface?: boolean;
  ipv6DhcpServer?: string;
  ipv6DhcpServerPool?: string; // Pool name for 'ipv6 dhcp server <pool>' on interface
  pppoeClientDialPool?: number; // pppoe-client dial-pool-number N
  pppoeEnableGroup?: string; // pppoe enable group <group>
  dialerPool?: number; // dialer pool N
  pppAuthentication?: string; // ppp authentication chap pap
  pppChapHostname?: string;
  pppChapPassword?: string;
  helperAddresses?: string[];

  lldpTransmit?: boolean;       // default: true when LLDP enabled
  lldpReceive?: boolean;        // default: true when LLDP enabled
  isRoutedPort?: boolean;       // For L3 switch routed ports
  isSubinterface?: boolean;     // For subinterfaces (e.g., gi0/0.10)
  policyRouteMap?: string;      // PBR route-map applied to interface
  tunnel?: {
    source?: string;
    destination?: string;
    protocol?: 'gre' | 'ipsec';
  };
  parentInterface?: string;     // Parent interface for subinterfaces
  dot1qVlan?: number;           // Dot1q VLAN for subinterfaces
  nameif?: string;              // firewall interface name (nameif) (inside, outside, etc.)
  securityLevel?: number;       // firewall security level (0-100)
  wifi?: Partial<WifiConfig> & {
    ssid: string;
    mode: WifiMode;
  } | {
    ssid: string;
    security: 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
    password?: string;
    channel: '2.4GHz' | '5GHz' | string;
    mode: 'ap' | 'client' | 'disabled' | 'sta';
    hidden?: boolean;
    maxClients?: number;
    macFilterEnabled?: boolean;
    macFilterMode?: 'allow' | 'deny';
    macFilterList?: string[];
    ssids?: DeviceWifiSsidProfile[];
  };
  spanningTree?: {
    role?: 'root' | 'designated' | 'alternate' | 'backup' | 'disabled';
    state?: 'forwarding' | 'blocking' | 'listening' | 'learning' | 'disabled';
    portfast?: boolean;
    bpduguard?: boolean;
    bpdufilter?: boolean;
    guardRoot?: boolean;
    loopguard?: 'enable' | 'disable' | 'default';
    loopInconsistent?: boolean;
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
  qosDscp?: string;
  qosTrust?: 'cos' | 'dscp' | 'ip-precedence';
  qosCos?: number;
  bandwidth?: number;               // Bandwidth in kbps (for routing protocols)
  delay?: number;                   // Delay in microseconds (for routing protocols)
  stpPriority?: number;
  dhcpSnoopingTrust?: boolean;
  dhcpSnoopingLimitRate?: number; // DHCP rate limit (packets per second) on untrusted ports
  arpInspectionTrust?: boolean;
  arpInspectionLimitRate?: number;
  // IPSG — IP Source Guard
  ipVerifySource?: boolean;
  ipVerifySourcePortSecurity?: boolean;
  // Private VLAN port config
  pvlanMode?: 'host' | 'promiscuous' | 'trunk';
  pvlanHostAssociation?: { primary: number; secondary: number };
  pvlanMapping?: { primary: number; secondary: number[] }[];
  // Flex-Links
  flexLinkBackup?: string;   // backup interface port ID
  flexLinkActive?: boolean;  // true = this port is active, false = standby
  carrierDelay?: number;
  loadInterval?: number;
  directedBroadcast?: boolean;
  powerInline?: {
    auto?: boolean;
    static?: boolean;
    never?: boolean;
    maxMilliwatts?: number;
    enabled?: boolean;
    consumption?: number;
  };
  nonegotiate?: boolean;
  _ipVerifySourceLegacy?: never;
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
  trunkEncapsulation?: 'dot1q' | 'isl' | 'negotiate';
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
    groups?: Record<string | number, {
      groupId?: string;
      virtualIp?: string;
      ipv6VirtualIp?: string;
      virtualMac?: string;
      version?: number;
      priority?: number;
      basePriority?: number;
      trackId?: string;
      preempt?: boolean;
      state?: 'Initial' | 'Listen' | 'Speak' | 'Standby' | 'Active';
    }>;
  };
  vrrp?: {
    groups?: Record<string | number, {
      virtualIp?: string;
      virtualMac?: string;
      priority?: number;
      basePriority?: number;
      trackId?: string;
      preempt?: boolean;
      state?: 'Init' | 'Backup' | 'Master';
    }>;
  };
  glbp?: {
    groups?: Record<number, {
      virtualIp?: string;
      priority?: number;
      preempt?: boolean;
      loadBalancing?: 'round-robin' | 'weighted' | 'host-dependent';
      weighting?: number;
      state?: 'Listen' | 'Speak' | 'Standby' | 'Active';
      avgMac?: string;
      avfMacs?: Record<number, string>;
    }>;
  };
  ipv6Eigrp?: {
    enabled: boolean;
    as: string;
  };
  netflowIngress?: boolean;
  netflowEgress?: boolean;
  flowMonitor?: string;      // Flexible NetFlow monitor applied to interface
  ipv6TrafficFilterIn?: string;
  ipv6TrafficFilterOut?: string;
  natSide?: 'inside' | 'outside';
  // Serial interface properties (WAN)
  serialEncapsulation?: 'hdlc' | 'ppp';
  clockRate?: number;       // Clock rate in bps (DCE side)
  dce?: boolean;            // Whether this serial port is DCE
  pppAuth?: 'pap' | 'chap' | 'none';  // PPP authentication type
  pppPapUsername?: string;
  pppPapPassword?: string;
  lapGroup?: number;        // Lightweight AP group (WLC)
  mplsEnabled?: boolean;    // MPLS / LDP enabled on interface
}
