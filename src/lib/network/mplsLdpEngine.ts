import type { SwitchState } from './types';
import { getDevicePrimaryIp } from './bgpEngine';
type LdpConnection = {
  sourceDeviceId: string;
  sourcePort: string;
  targetDeviceId: string;
  targetPort: string;
  active: boolean;
};

export interface LdpNeighbor {
  peerLdpId: string; // e.g. "2.2.2.2:0"
  peerIp: string;
  tcpState: 'NonExistent' | 'Initialized' | 'OpenRec' | 'OpenSent' | 'Operational';
  uptimeSeconds: number;
  addresses: string[];
  discoverySource: string; // Interface where neighbor was discovered
  holdTime: number; // LDP hold time in seconds
  labelsReceived: number;
  labelsAdvertised: number;
}

export interface LfibEntry {
  inLabel: number; // Incoming label (e.g. 16, 17...)
  outLabel: number | 'Pop' | 'Untagged' | 'Implicit-Null';
  prefix: string; // e.g. "192.168.10.0/24"
  outInterface: string;
  nextHop: string;
  bytesSwitched?: number;
  packetsSwitched?: number;
}

export interface LibEntry {
  prefix: string;
  localLabel: number;
  remoteLabel?: number;
  peerIp?: string;
  labelType: 'implicit-null' | 'explicit-null' | 'regular';
}

export interface MplsPacket {
  label: number;
  destinationPrefix: string;
  payload?: unknown;
}

export interface MplsForwardResult {
  action: 'forward' | 'pop' | 'untagged' | 'drop';
  outLabel?: number;
  outInterface?: string;
  nextHop?: string;
  payload?: unknown;
}

export interface MplsConfig {
  enabled: boolean;
  routerId: string;
  ldpEnabled: boolean;
  labelRange: { min: number; max: number };
  neighbors: Record<string, LdpNeighbor>;
  lfib: LfibEntry[]; // Label Forwarding Information Base
  lib: LibEntry[]; // Label Information Base
  discoveryInterfaces: string[]; // Interfaces where LDP discovery is enabled
  gracefulRestartEnabled: boolean;
  sessionProtectionEnabled: boolean;
}

export function getOrCreateMplsConfig(state: SwitchState): MplsConfig {
  if (!state.mplsConfig) {
    state.mplsConfig = {
      enabled: true,
      routerId: state.routerId || getDevicePrimaryIp(state),
      ldpEnabled: true,
      labelRange: { min: 16, max: 100000 },
      neighbors: {},
      lfib: [],
      lib: [],
      discoveryInterfaces: [],
      gracefulRestartEnabled: false,
      sessionProtectionEnabled: false
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
    // Add to discovery interfaces if not already present
    if (!mpls.discoveryInterfaces.includes(ifName)) {
      mpls.discoveryInterfaces.push(ifName);
    }
    return true;
  }
  return false;
}

/**
 * Disable MPLS and LDP on an interface
 */
export function disableMplsOnInterface(state: SwitchState, ifName: string): boolean {
  const mpls = getOrCreateMplsConfig(state);
  const port = Object.values(state.ports || {}).find(p => p.id.toLowerCase() === ifName.toLowerCase());
  if (port) {
    port.mplsEnabled = false;
    // Remove from discovery interfaces
    mpls.discoveryInterfaces = mpls.discoveryInterfaces.filter(iface => iface !== ifName);
    // Remove neighbors discovered on this interface
    Object.keys(mpls.neighbors).forEach(peerIp => {
      if (mpls.neighbors[peerIp].discoverySource === ifName) {
        delete mpls.neighbors[peerIp];
      }
    });
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
  let labelCounter = mpls.labelRange.min;

  // Generate label bindings for connected and routing table entries
  Object.entries(state.ports || {}).forEach(([portId, port]) => {
    if (port.ipAddress && port.subnetMask && !port.shutdown && port.mplsEnabled) {
      lfib.push({
        inLabel: labelCounter++,
        outLabel: 'Implicit-Null', // Pop label at egress (PHP)
        prefix: `${port.ipAddress}/${port.subnetMask}`,
        outInterface: portId,
        nextHop: 'Directly Connected',
        bytesSwitched: 0,
        packetsSwitched: 0
      });
    }
  });

  // Add label bindings from routing table (static routes, OSPF, BGP, etc.)
  const allRoutes = [
    ...(state.staticRoutes || []),
    ...(state.dynamicRoutes || [])
  ];
  
  allRoutes.forEach((route) => {
    const prefix = route.destination || route.network;
    const nextHop = route.nextHop;
    const outInterface = route.interface;
    
    if (prefix && nextHop && outInterface && outInterface !== 'Null0') {
      // Check if this route is already covered by connected routes
      const isDirect = lfib.some(entry => entry.prefix === prefix);
      if (!isDirect) {
        // For remote routes, assign outgoing label from neighbor
        const neighborEntry = Object.values(mpls.neighbors).find(n => 
          n.addresses.includes(nextHop)
        );
        
        lfib.push({
          inLabel: labelCounter++,
          outLabel: neighborEntry ? remoteLabelFor(prefix, neighborEntry.peerIp) : 'Pop',
          prefix,
          outInterface,
          nextHop,
          bytesSwitched: 0,
          packetsSwitched: 0
        });
      }
    }
  });

  mpls.lfib = lfib;
  return lfib;
}

/**
 * Build LIB (Label Information Base) from local and remote label bindings
 */
export function generateLib(state: SwitchState): LibEntry[] {
  const mpls = getOrCreateMplsConfig(state);
  const lib: LibEntry[] = [];
  let labelCounter = mpls.labelRange.min;

  // Generate local label bindings for connected networks
  Object.values(state.ports || {}).forEach((port) => {
    if (port.ipAddress && port.subnetMask && !port.shutdown && port.mplsEnabled) {
      lib.push({
        prefix: `${port.ipAddress}/${port.subnetMask}`,
        localLabel: labelCounter++,
        labelType: 'implicit-null'
      });
    }
  });

  // Add remote label bindings from neighbors
  Object.values(mpls.neighbors).forEach(neighbor => {
    if (neighbor.tcpState === 'Operational') {
      const remotePrefixes = Object.values(state.ports || {})
        .filter(port => port.ipAddress && port.subnetMask && !port.shutdown && port.mplsEnabled)
        .map(port => `${port.ipAddress}/${port.subnetMask}`);
      neighbor.labelsReceived = remotePrefixes.length;
      neighbor.labelsAdvertised = remotePrefixes.length;

      for (const prefix of remotePrefixes) {
        lib.push({
          prefix,
          localLabel: labelCounter++,
          remoteLabel: remoteLabelFor(prefix, neighbor.peerIp),
          peerIp: neighbor.peerIp,
          labelType: 'regular'
        });
      }
    }
  });

  mpls.lib = lib;
  return lib;
}

function remoteLabelFor(prefix: string, peerIp = ''): number {
  let hash = 2166136261;
  for (const char of `${prefix}|${peerIp}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return 1000 + (hash >>> 0) % 90000;
}

/** Look up an incoming label and apply the LFIB action. */
export function forwardMplsPacket(state: SwitchState, packet: MplsPacket): MplsForwardResult {
  const entry = getOrCreateMplsConfig(state).lfib.find(item => item.inLabel === packet.label && item.prefix === packet.destinationPrefix)
    || getOrCreateMplsConfig(state).lfib.find(item => item.inLabel === packet.label);
  if (!entry) return { action: 'drop' };
  entry.packetsSwitched = (entry.packetsSwitched || 0) + 1;
  if (entry.outLabel === 'Implicit-Null' || entry.outLabel === 'Pop') {
    return { action: 'pop', outInterface: entry.outInterface, nextHop: entry.nextHop, payload: packet.payload };
  }
  if (entry.outLabel === 'Untagged') {
    return { action: 'untagged', outInterface: entry.outInterface, nextHop: entry.nextHop, payload: packet.payload };
  }
  entry.bytesSwitched = (entry.bytesSwitched || 0) + 1;
  return { action: 'forward', outLabel: entry.outLabel, outInterface: entry.outInterface, nextHop: entry.nextHop, payload: packet.payload };
}

/**
 * Establish LDP Peering between two MPLS routers
 */
export function establishLdpSession(
  localState: SwitchState,
  remoteRouterId: string,
  remoteIp: string,
  discoveryInterface: string
): LdpNeighbor {
  const mpls = getOrCreateMplsConfig(localState);
  const neighbor: LdpNeighbor = {
    peerLdpId: `${remoteRouterId}:0`,
    peerIp: remoteIp,
    tcpState: 'Operational',
    uptimeSeconds: 0,
    addresses: [remoteIp],
    discoverySource: discoveryInterface,
    holdTime: 180, // Default LDP hold time
    labelsReceived: 0,
    labelsAdvertised: 0
  };

  mpls.neighbors[remoteIp] = neighbor;
  return neighbor;
}

/**
 * Simulate LDP neighbor discovery on MPLS-enabled interfaces
 */
export function discoverLdpNeighbors(
  state: SwitchState,
  topologyStates?: Map<string, SwitchState>,
  connections: LdpConnection[] = []
): void {
  const mpls = getOrCreateMplsConfig(state);
  
  if (!mpls.enabled || !mpls.ldpEnabled) {
    return;
  }

  // Discovery must come from an actual connected peer. The old implementation
  // generated random addresses, which made `show mpls ldp neighbor` look valid
  // while no packet could ever use that adjacency.
  if (topologyStates && connections.length > 0) {
    const localId = [...topologyStates.entries()].find(([, candidate]) => candidate === state)?.[0];
    if (localId) {
      connections.filter(c => c.active && (c.sourceDeviceId === localId || c.targetDeviceId === localId)).forEach(conn => {
        const localPortId = conn.sourceDeviceId === localId ? conn.sourcePort : conn.targetPort;
        const peerId = conn.sourceDeviceId === localId ? conn.targetDeviceId : conn.sourceDeviceId;
        const peerPortId = conn.sourceDeviceId === localId ? conn.targetPort : conn.sourcePort;
        const peer = topologyStates.get(peerId);
        const localPort = Object.values(state.ports || {}).find(p => p.id.toLowerCase() === localPortId.toLowerCase());
        const peerPort = peer && Object.values(peer.ports || {}).find(p => p.id.toLowerCase() === peerPortId.toLowerCase());
        if (!peer || !localPort || !peerPort || !localPort.mplsEnabled || !peerPort.mplsEnabled ||
            localPort.shutdown || peerPort.shutdown || !localPort.ipAddress || !peerPort.ipAddress ||
            !sameSubnet(localPort.ipAddress, localPort.subnetMask, peerPort.ipAddress, peerPort.subnetMask)) return;

        const peerMpls = getOrCreateMplsConfig(peer);
        establishLdpSession(state, peerMpls.routerId || peer.routerId || getDevicePrimaryIp(peer), peerPort.ipAddress, localPortId);
        const localMpls = getOrCreateMplsConfig(state);
        establishLdpSession(peer, localMpls.routerId || state.routerId || getDevicePrimaryIp(state), localPort.ipAddress, peerPortId);
      });
      return;
    }
  }

  // Without topology context there is no safe way to discover a neighbor.
  // Keep this path side-effect free for callers that only hold one device.
  if (!topologyStates) return;

}

function sameSubnet(a: string, maskA: string | undefined, b: string, maskB: string | undefined): boolean {
  if (!maskA || !maskB) return false;
  const toInt = (ip: string) => ip.split('.').reduce((n, octet) => ((n << 8) | Number(octet)) >>> 0, 0);
  const mask = toInt(maskA);
  return (toInt(a) & mask) === (toInt(b) & mask) && mask === toInt(maskB);
}

/**
 * Get LDP discovery information for show commands
 */
export function getLdpDiscoveryInfo(state: SwitchState): string {
  const mpls = getOrCreateMplsConfig(state);
  
  if (!mpls.enabled || !mpls.ldpEnabled) {
    return '% LDP is not enabled';
  }

  let output = '\n  LDP Discovery Sources:\n';
  output += '    Interfaces    Xmit/Recv\n';
  output += '    --------------------\n';

  mpls.discoveryInterfaces.forEach(ifName => {
    const port = Object.values(state.ports || {}).find(p => 
      p.id.toLowerCase() === ifName.toLowerCase()
    );
    if (port && port.mplsEnabled) {
      const neighborCount = Object.values(mpls.neighbors).filter(
        n => n.discoverySource === ifName
      ).length;
      output += `    ${ifName.padEnd(14)} ${neighborCount}/1\n`;
    }
  });

  return output;
}

/**
 * Get LDP neighbor table for show commands
 */
export function getLdpNeighborTable(state: SwitchState): string {
  const mpls = getOrCreateMplsConfig(state);
  
  if (!mpls.enabled || !mpls.ldpEnabled) {
    return '% LDP is not enabled';
  }

  const neighbors = Object.values(mpls.neighbors);
  if (neighbors.length === 0) {
    return '% No LDP neighbors found';
  }

  let output = '\n  LDP Neighbor Information:\n';
  output += '    Peer LDP Id     Peer Address    State    Uptime    Hold Time   Labels\n';
  output += '    --------------- --------------- -------- --------- ----------- ------\n';

  neighbors.forEach(neighbor => {
    const uptime = formatUptime(neighbor.uptimeSeconds);
    output += `    ${neighbor.peerLdpId.padEnd(15)} ${neighbor.peerIp.padEnd(15)} `;
    output += `${neighbor.tcpState.padEnd(8)} ${uptime.padEnd(9)} `;
    output += `${neighbor.holdTime.toString().padEnd(11)} ${neighbor.labelsReceived}/${neighbor.labelsAdvertised}\n`;
  });

  return output;
}

/**
 * Get LFIB table for show commands
 */
export function getLfibTable(state: SwitchState): string {
  const mpls = getOrCreateMplsConfig(state);
  
  if (!mpls.enabled || !mpls.ldpEnabled) {
    return '% MPLS is not enabled';
  }

  if (mpls.lfib.length === 0) {
    return '% No LFIB entries';
  }

  let output = '\n  Label Forwarding Information Base (LFIB):\n';
  output += '    InLabel  OutLabel     Prefix           Out Interface  Next Hop\n';
  output += '    -------- ------------ ---------------- --------------- ------------\n';

  mpls.lfib.forEach(entry => {
    const outLabelStr = typeof entry.outLabel === 'number' ? entry.outLabel.toString() : entry.outLabel;
    output += `    ${entry.inLabel.toString().padEnd(8)} ${outLabelStr.padEnd(12)} `;
    output += `${entry.prefix.padEnd(16)} ${entry.outInterface.padEnd(15)} ${entry.nextHop}\n`;
  });

  return output;
}

/**
 * Get LIB table for show commands
 */
export function getLibTable(state: SwitchState): string {
  const mpls = getOrCreateMplsConfig(state);
  
  if (!mpls.enabled || !mpls.ldpEnabled) {
    return '% MPLS is not enabled';
  }

  if (mpls.lib.length === 0) {
    return '% No LIB entries';
  }

  let output = '\n  Label Information Base (LIB):\n';
  output += '    Prefix           Local Label  Remote Label  Peer IP\n';
  output += '    ---------------- ------------ ------------ ------------\n';

  mpls.lib.forEach(entry => {
    const remoteLabelStr = entry.remoteLabel ? entry.remoteLabel.toString() : '-';
    const peerIpStr = entry.peerIp || '-';
    output += `    ${entry.prefix.padEnd(16)} ${entry.localLabel.toString().padEnd(12)} `;
    output += `${remoteLabelStr.padEnd(12)} ${peerIpStr}\n`;
  });

  return output;
}

/**
 * Format uptime in readable format
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d${Math.floor((seconds % 86400) / 3600)}h`;
}
