export interface Route {
  destination: string;      // e.g., "192.168.2.0" or "2001:db8:1::"
  subnetMask?: string;       // e.g., "255.255.255.0" (for IPv4)
  prefixLength?: number;     // e.g., 64 (for IPv6)
  nextHop: string;          // e.g., "192.168.1.1" or "2001:db8:1::1" or interface name
  metric?: number;          // Administrative distance/metric
  type: 'connected' | 'static' | 'dynamic'; // Route type
  area?: number;            // For OSPF
  ospfRouteType?: 'E1' | 'E2' | 'N1' | 'N2';
  code?: string;
  interfaceId?: string;
  administrativeDistance?: number;
  asPath?: string;          // For BGP — AS path attribute
  localPreference?: number; // For BGP — local preference attribute
  weight?: number;          // For BGP — weight attribute
  trackId?: number;         // For floating static — IP SLA track object id (route only installed while track is Up)
}

export interface RouteDecisionDetails {
  route: Route;
  destinationIp: string;
  matchedPrefix: string;
  prefixLength: number;
  administrativeDistance: number;
  metric: number;
  type: string;
  explanation: string;
}

export interface L3Hop {
  name: string;
  ip: string;
}

export interface RoutingLoopIssue {
  type: 'ROUTING_LOOP';
  deviceId: string;
  deviceName: string;
  destination: string;
  nextHop: string;
  loopPath: string[];
  message: string;
}
