import type { SwitchState } from './types';
import { getDevicePrimaryIp } from './bgpEngine';

export interface LdpNeighbor {
  peerLdpId: string; // e.g. "2.2.2.2:0"
  peerIp: string;
  tcpState: 'NonExistent' | 'Initialized' | 'OpenRec' | 'OpenSent' | 'Operational';
  uptimeSeconds: number;
  addresses: string[];
}

export interface LfibEntry {
  inLabel: number; // Incoming label (e.g. 16, 17...)
  outLabel: number | 'Pop' | 'Untagged' | 'Implicit-Null';
  prefix: string; // e.g. "192.168.10.0/24"
  outInterface: string;
  nextHop: string;
  bytesSwitched?: number;
}

export interface MplsConfig {
  enabled: boolean;
  routerId: string;
  ldpEnabled: boolean;
  labelRange: { min: number; max: number };
  neighbors: Record<string, LdpNeighbor>;
  lfib: LfibEntry[]; // Label Forwarding Information Base
  lib: Array<{ prefix: string; localLabel: number; remoteLabel?: number; peerIp?: string }>;
}

export function getOrCreateMplsConfig(state: SwitchState): MplsConfig {
  if (!state.mplsConfig) {
    state.mplsConfig = {
      enabled: true,
      routerId: state.routerId || getDevicePrimaryIp(state),
      ldpEnabled: true,
      labelRange: { min: 16, max: 1000 },
      neighbors: {},
      lfib: [],
      lib: []
    };
  }
  return state.mplsConfig as MplsConfig;
}

/**
 * Enable MPLS and LDP on an interface
 */
export function enableMplsOnInterface(state: SwitchState, ifName: string): boolean {
  const mpls = getOrCreateMplsConfig(state);
  mpls.enabled = true;
  mpls.ldpEnabled = true;

  const port = Object.values(state.ports || {}).find(p => p.id.toLowerCase() === ifName.toLowerCase());
  if (port) {
    port.mplsEnabled = true;
    return true;
  }
  return false;
}

/**
 * Build LFIB (Label Forwarding Information Base) from routing and neighbor tables
 */
export function generateLfib(state: SwitchState): LfibEntry[] {
  const mpls = getOrCreateMplsConfig(state);
  const lfib: LfibEntry[] = [];
  let labelCounter = 16;

  // Generate label bindings for connected and routing table entries
  Object.entries(state.ports || {}).forEach(([portId, port]) => {
    if (port.ipAddress && port.subnetMask && !port.shutdown) {
      lfib.push({
        inLabel: labelCounter++,
        outLabel: 'Implicit-Null', // Pop label at egress (PHP)
        prefix: `${port.ipAddress}/${port.subnetMask}`,
        outInterface: portId,
        nextHop: 'Directly Connected',
        bytesSwitched: 0
      });
    }
  });

  mpls.lfib = lfib;
  return lfib;
}

/**
 * Establish LDP Peering between two MPLS routers
 */
export function establishLdpSession(
  localState: SwitchState,
  remoteRouterId: string,
  remoteIp: string
): LdpNeighbor {
  const mpls = getOrCreateMplsConfig(localState);
  const neighbor: LdpNeighbor = {
    peerLdpId: `${remoteRouterId}:0`,
    peerIp: remoteIp,
    tcpState: 'Operational',
    uptimeSeconds: 7200,
    addresses: [remoteIp]
  };

  mpls.neighbors[remoteIp] = neighbor;
  return neighbor;
}
