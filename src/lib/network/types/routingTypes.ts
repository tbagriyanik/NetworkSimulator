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
  ospfRouteType?: 'E1' | 'E2' | 'N1' | 'N2';
  code?: string;
  administrativeDistance?: number;
  asPath?: string;          // For BGP — AS path attribute
  localPreference?: number; // For BGP — local preference attribute
  weight?: number;          // For BGP — weight attribute
}

export interface BgpNeighbor {
  ip: string;
  as?: string | number;
  remoteAs?: string | number;
  state?: string;
  weight?: number;
  routeMapIn?: string;
  routeMapOut?: string;
  nextHopSelf?: boolean;
  ebgpMultihop?: number;
  updateSource?: string;
  timersKeepalive?: number;
  timersHoldtime?: number;
  password?: string;
  description?: string;
  shutdown?: boolean;
  defaultOriginate?: boolean;
  removePrivateAs?: boolean;
  maximumPrefix?: number;
  allowAsIn?: number;
  sendCommunity?: boolean;
  routeReflectorClient?: boolean;
  asOverride?: boolean;
  softReconfiguration?: boolean;
}
