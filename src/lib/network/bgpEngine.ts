import type { SwitchState } from './types';

export interface BgpNeighbor {
  ip: string;
  remoteAs: number;
  description?: string;
  state: 'Idle' | 'Connect' | 'Active' | 'OpenSent' | 'OpenConfirm' | 'Established';
  uptimeSeconds?: number;
  prefixesReceived?: number;
  prefixesSent?: number;
  isIbgp: boolean;
  nextHopSelf?: boolean;
  updateSource?: string;
  routeReflectorClient?: boolean;
}

export interface BgpRoute {
  prefix: string; // e.g. "10.0.0.0/24"
  network: string;
  netmask: string;
  nextHop: string;
  metric?: number; // MED
  localPref?: number;
  weight?: number;
  asPath: number[];
  origin: 'IGP' | 'EGP' | 'INCOMPLETE';
  originAs: number;
  advertisedBy?: string; // neighbor IP
  isBest?: boolean;
  vrfName?: string; // For MP-BGP VPNv4
  routeTarget?: string; // For MP-BGP VPNv4
  rd?: string; // Route Distinguisher e.g. "65001:100"
}

export interface BgpConfig {
  asNumber: number;
  routerId: string;
  neighbors: Record<string, BgpNeighbor>;
  advertisedNetworks: Array<{ network: string; mask: string; backdoor?: boolean }>;
  rib: BgpRoute[]; // BGP Routing Information Base
  vpnV4Routes?: BgpRoute[]; // MP-BGP VPNv4 Routes
  addressFamilyVpnV4?: boolean;
  vrfDefinitions?: Record<string, {
    rd: string;
    routeTargetImport: string[];
    routeTargetExport: string[];
  }>;
}

/**
 * Extract primary IP address from state ports
 */
export function getDevicePrimaryIp(state: SwitchState): string {
  if (state.routerId) return state.routerId;
  for (const port of Object.values(state.ports || {})) {
    if (port.ipAddress && !port.shutdown) {
      return port.ipAddress;
    }
  }
  return '1.1.1.1';
}

/**
 * Initializes or retrieves BGP configuration for a device state
 */
export function getOrCreateBgpConfig(state: SwitchState, asNumber?: number): BgpConfig | null {
  if (!state.bgpConfig && asNumber) {
    state.bgpConfig = {
      asNumber,
      routerId: state.routerId || getDevicePrimaryIp(state),
      neighbors: {},
      advertisedNetworks: [],
      rib: [],
      vpnV4Routes: [],
      addressFamilyVpnV4: false,
      vrfDefinitions: {}
    };
  }
  return (state.bgpConfig as BgpConfig) || null;
}

/**
 * Adds or updates a BGP neighbor
 */
export function configureBgpNeighbor(
  state: SwitchState,
  neighborIp: string,
  remoteAs: number
): BgpNeighbor | null {
  if (!state.bgpConfig) return null;
  const cfg = state.bgpConfig as BgpConfig;
  const isIbgp = cfg.asNumber === remoteAs;

  const neighbor: BgpNeighbor = {
    ip: neighborIp,
    remoteAs,
    state: 'Established',
    uptimeSeconds: 3600,
    prefixesReceived: 0,
    prefixesSent: 0,
    isIbgp
  };

  cfg.neighbors[neighborIp] = neighbor;
  return neighbor;
}

/**
 * Advertises a network into BGP
 */
export function addBgpNetwork(
  state: SwitchState,
  network: string,
  mask: string
): boolean {
  if (!state.bgpConfig) return false;
  const cfg = state.bgpConfig as BgpConfig;
  const exists = cfg.advertisedNetworks.some(n => n.network === network && n.mask === mask);
  if (!exists) {
    cfg.advertisedNetworks.push({ network, mask });
    // Add to local BGP RIB
    cfg.rib.push({
      prefix: `${network}/${maskToCidr(mask)}`,
      network,
      netmask: mask,
      nextHop: '0.0.0.0',
      metric: 0,
      localPref: 100,
      weight: 32768,
      asPath: [],
      origin: 'IGP',
      originAs: cfg.asNumber,
      isBest: true
    });
  }
  return true;
}

/**
 * MP-BGP: Configures VPNv4 route redistribution for VRF
 */
export function configureMpBgpVrf(
  state: SwitchState,
  vrfName: string,
  rd: string,
  rtExport: string,
  rtImport: string
): void {
  const cfg = getOrCreateBgpConfig(state);
  if (!cfg) return;
  cfg.addressFamilyVpnV4 = true;
  if (!cfg.vrfDefinitions) cfg.vrfDefinitions = {};
  
  cfg.vrfDefinitions[vrfName] = {
    rd,
    routeTargetExport: [rtExport],
    routeTargetImport: [rtImport]
  };
}

/**
 * Simulates BGP peering and route exchange across topology devices
 */
export function exchangeBgpRoutes(
  deviceStates: Map<string, SwitchState>
): void {
  // Step 1: Collect all advertised routes per AS
  const asRouteMap = new Map<string, BgpRoute[]>();

  deviceStates.forEach((state, deviceId) => {
    const cfg = state.bgpConfig as BgpConfig | undefined;
    if (!cfg) return;

    const devIp = getDevicePrimaryIp(state);
    const routes: BgpRoute[] = [];
    cfg.advertisedNetworks.forEach(adv => {
      routes.push({
        prefix: `${adv.network}/${maskToCidr(adv.mask)}`,
        network: adv.network,
        netmask: adv.mask,
        nextHop: devIp,
        metric: 0,
        localPref: 100,
        weight: 0,
        asPath: [cfg.asNumber],
        origin: 'IGP',
        originAs: cfg.asNumber,
        advertisedBy: deviceId,
        isBest: true
      });
    });

    asRouteMap.set(deviceId, routes);
  });

  // Step 2: Propagate to neighbors
  deviceStates.forEach((state, deviceId) => {
    const cfg = state.bgpConfig as BgpConfig | undefined;
    if (!cfg) return;

    // Reset received routes in RIB while keeping local originated routes
    cfg.rib = cfg.rib.filter(r => r.originAs === cfg.asNumber);

    deviceStates.forEach((otherState, otherDeviceId) => {
      if (deviceId === otherDeviceId) return;
      const otherCfg = otherState.bgpConfig as BgpConfig | undefined;
      if (!otherCfg) return;

      const otherIp = getDevicePrimaryIp(otherState);

      // Check if they are peering
      const hasNeighbor = Object.values(cfg.neighbors).some(n => 
        n.ip === otherIp
      );

      if (hasNeighbor) {
        const otherRoutes = asRouteMap.get(otherDeviceId) || [];
        otherRoutes.forEach(r => {
          // BGP Loop Prevention: Do not accept route if local AS is in AS Path
          if (r.asPath.includes(cfg.asNumber)) return;

          const isIbgp = cfg.asNumber === otherCfg.asNumber;
          const importedRoute: BgpRoute = {
            ...r,
            nextHop: otherIp,
            asPath: isIbgp ? [...r.asPath] : [otherCfg.asNumber, ...r.asPath],
            localPref: isIbgp ? 100 : undefined,
            weight: 0,
            isBest: true
          };

          cfg.rib.push(importedRoute);
        });
      }
    });
  });
}

function maskToCidr(mask: string): number {
  return mask
    .split('.')
    .map(Number)
    .map(part => part.toString(2).replace(/0/g, '').length)
    .reduce((a, b) => a + b, 0);
}
