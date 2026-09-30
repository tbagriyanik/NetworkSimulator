import type { SwitchState, NveInterface } from './types';
import type { NetworkPacketFrame } from './forwarding/packetFrame';

export interface EvpnMacRoute {
  vni: number;
  macAddress: string;
  ipAddress?: string;
  nextHopVtep: string;
  routeType: 'Type-2' | 'Type-3' | 'Type-5';
  esi?: string; // Ethernet Segment Identifier
  local: boolean;
  uptime: number;
}

export interface EvpnNeighbor {
  vtepIp: string;
  bgpAs: number;
  state: 'Idle' | 'Connect' | 'Active' | 'OpenSent' | 'OpenConfirm' | 'Established';
  uptime: number;
  receivedRoutes: number;
  advertisedRoutes: number;
}

export interface VxlanConfig {
  enabled: boolean;
  nveInterfaces: Record<string, NveInterface>;
  evpnMacRoutes: EvpnMacRoute[];
  evpnNeighbors: EvpnNeighbor[];
  bgpEvpnEnabled: boolean;
  evpnVniMapping: Record<number, { vlanId: number; rd?: string; rtImport?: string[]; rtExport?: string[] }>;
}

export function getOrCreateVxlanConfig(state: SwitchState): VxlanConfig {
  if (!state.vxlanConfig) {
    state.vxlanConfig = {
      enabled: false,
      nveInterfaces: {},
      evpnMacRoutes: [],
      evpnNeighbors: [],
      bgpEvpnEnabled: false,
      evpnVniMapping: {}
    };
  }
  return state.vxlanConfig as VxlanConfig;
}

export function getOrCreateNveInterface(state: SwitchState, name: string = 'nve1'): NveInterface {
  const vxlan = getOrCreateVxlanConfig(state);
  const key = name.toLowerCase();
  if (!vxlan.nveInterfaces[key]) {
    vxlan.nveInterfaces[key] = {
      name,
      sourceInterface: 'Loopback0',
      vniMappings: {},
      status: 'up',
    };
  }
  state.nveInterfaces = vxlan.nveInterfaces;
  return vxlan.nveInterfaces[key];
}

export function mapVlanToVni(
  state: SwitchState,
  nveName: string,
  vlanId: number,
  vni: number,
  ingressReplication: boolean = true
): void {
  const nve = getOrCreateNveInterface(state, nveName);
  nve.vniMappings[vni] = { vlanId, ingressReplication };
  
  // Update global VNI mapping
  const vxlan = getOrCreateVxlanConfig(state);
  vxlan.evpnVniMapping[vni] = { vlanId };
}

export function encapsulateVxlanPacket(
  vni: number,
  sourceVtep: string,
  destVtep: string,
  innerPayload: string
): {
  outerHeader: { srcIp: string; dstIp: string; udpPort: number; vni: number };
  payload: string;
} {
  return {
    outerHeader: {
      srcIp: sourceVtep,
      dstIp: destVtep,
      udpPort: 4789, // Standard VXLAN UDP Port
      vni,
    },
    payload: innerPayload,
  };
}

/**
 * Handles VXLAN Ingress Encapsulation for frames originating on local access/trunk VLANs mapped to VNIs.
 */
export function processVxlanEncapsulation(
  state: SwitchState,
  frame: NetworkPacketFrame
): { encapsulated: boolean; vxlanFrame?: NetworkPacketFrame; targetVtep?: string } {
  if (!state.vxlanConfig?.enabled) {
    return { encapsulated: false };
  }

  const vlanId = frame.vlanId || 1;
  const nveInterface = Object.values(state.vxlanConfig.nveInterfaces)[0];
  if (!nveInterface) return { encapsulated: false };

  // Find matching VNI for frame's VLAN
  let matchingVni: number | undefined;
  for (const [vniStr, mapping] of Object.entries(nveInterface.vniMappings)) {
    if (mapping.vlanId === vlanId) {
      matchingVni = parseInt(vniStr, 10);
      break;
    }
  }

  if (!matchingVni) return { encapsulated: false };

  // Auto-learn local MAC into EVPN Type-2 MAC table
  addEvpnMacRoute(state, matchingVni, frame.srcMac, frame.srcIp, 'local');

  // Lookup destination VTEP in EVPN MAC routes
  const evpnRoute = lookupEvpnMacTable(state.vxlanConfig.evpnMacRoutes, matchingVni, frame.dstMac);
  const targetVtep = evpnRoute?.nextHopVtep || state.vxlanConfig.evpnNeighbors[0]?.vtepIp;

  if (!targetVtep || targetVtep === 'local' || targetVtep === '0.0.0.0') {
    return { encapsulated: false };
  }

  const localVtepIp = state.ports['Loopback0']?.ipAddress || state.ipAddress || '192.168.255.1';

  const vxlanFrame: NetworkPacketFrame = {
    id: `vxlan-encap-${Date.now()}`,
    protocol: 'VXLAN',
    timestamp: Date.now(),
    srcMac: state.macAddress || '00:11:22:33:44:55',
    dstMac: 'ffff.ffff.ffff',
    etherType: '0x0800',
    srcIp: localVtepIp,
    dstIp: targetVtep,
    dstPort: 4789,
    vxlanPayload: {
      vni: matchingVni,
      outerSrcIp: localVtepIp,
      outerDstIp: targetVtep,
      innerFrame: frame,
    },
    length: frame.length + 50,
    info: `VXLAN VNI ${matchingVni} Encap (${frame.srcMac} -> ${frame.dstMac})`,
  };

  return { encapsulated: true, vxlanFrame, targetVtep };
}

/**
 * Handles VXLAN Egress Decapsulation for incoming UDP 4789 packets at a VTEP.
 */
export function processVxlanDecapsulation(
  state: SwitchState,
  frame: NetworkPacketFrame
): { decapsulated: boolean; innerFrame?: NetworkPacketFrame } {
  if (frame.protocol !== 'VXLAN' && frame.dstPort !== 4789) {
    return { decapsulated: false };
  }

  if (!frame.vxlanPayload) {
    return { decapsulated: false };
  }

  const { vni, outerSrcIp, innerFrame } = frame.vxlanPayload;
  const nveInterface = Object.values(state.vxlanConfig?.nveInterfaces || {})[0];
  const mappedVlan = nveInterface?.vniMappings[vni]?.vlanId || state.vxlanConfig?.evpnVniMapping[vni]?.vlanId || 1;

  const resFrame: NetworkPacketFrame = {
    ...innerFrame,
    vlanId: mappedVlan,
  };

  // Auto-learn remote VTEP MAC into EVPN MAC table
  addEvpnMacRoute(state, vni, innerFrame.srcMac, innerFrame.srcIp, outerSrcIp);

  return { decapsulated: true, innerFrame: resFrame };
}

export function lookupEvpnMacTable(
  routes: EvpnMacRoute[],
  vni: number,
  macAddress: string
): EvpnMacRoute | undefined {
  const normalizedMac = macAddress.toLowerCase();
  return routes.find(
    (r) => r.vni === vni && r.macAddress.toLowerCase() === normalizedMac
  );
}

export function addEvpnMacRoute(
  state: SwitchState,
  vni: number,
  macAddress: string,
  ipAddress?: string,
  nextHopVtep?: string
): EvpnMacRoute {
  const vxlan = getOrCreateVxlanConfig(state);
  const route: EvpnMacRoute = {
    vni,
    macAddress: macAddress.toLowerCase(),
    ipAddress,
    nextHopVtep: nextHopVtep || '0.0.0.0',
    routeType: ipAddress ? 'Type-2' : 'Type-3',
    local: true,
    uptime: 0
  };
  
  // Remove existing route for same MAC/VNI
  const existingIndex = vxlan.evpnMacRoutes.findIndex(
    r => r.vni === vni && r.macAddress.toLowerCase() === macAddress.toLowerCase()
  );
  
  if (existingIndex >= 0) {
    vxlan.evpnMacRoutes[existingIndex] = route;
  } else {
    vxlan.evpnMacRoutes.push(route);
  }
  
  return route;
}

export function establishEvpnNeighbor(
  state: SwitchState,
  vtepIp: string,
  bgpAs: number
): EvpnNeighbor {
  const vxlan = getOrCreateVxlanConfig(state);
  const neighbor: EvpnNeighbor = {
    vtepIp,
    bgpAs,
    state: 'Established',
    uptime: 0,
    receivedRoutes: Math.floor(Math.random() * 100) + 10,
    advertisedRoutes: Math.floor(Math.random() * 100) + 10
  };
  
  const existingIndex = vxlan.evpnNeighbors.findIndex(n => n.vtepIp === vtepIp);
  if (existingIndex >= 0) {
    vxlan.evpnNeighbors[existingIndex] = neighbor;
  } else {
    vxlan.evpnNeighbors.push(neighbor);
  }
  
  return neighbor;
}

export function getEvpnMacTable(state: SwitchState): string {
  const vxlan = getOrCreateVxlanConfig(state);
  
  if (!vxlan.enabled || vxlan.evpnMacRoutes.length === 0) {
    return '% No EVPN MAC routes';
  }

  let output = '\nEVPN MAC Table:\n';
  output += 'VNI    MAC Address       IP Address       VTEP           Type    Local\n';
  output += '------ ----------------- ---------------- -------------- ------- ------\n';

  vxlan.evpnMacRoutes.forEach(route => {
    const macStr = route.macAddress.toUpperCase();
    const ipStr = route.ipAddress || '--';
    const vtepStr = route.nextHopVtep || '--';
    const localStr = route.local ? 'Yes' : 'No';
    
    output += `${route.vni.toString().padEnd(6)} ${macStr.padEnd(17)} ${ipStr.padEnd(16)} ${vtepStr.padEnd(14)} ${route.routeType.padEnd(7)} ${localStr}\n`;
  });

  return output;
}

export function getEvpnNeighborTable(state: SwitchState): string {
  const vxlan = getOrCreateVxlanConfig(state);
  
  if (!vxlan.enabled || vxlan.evpnNeighbors.length === 0) {
    return '% No EVPN neighbors';
  }

  let output = '\nEVPN Neighbors:\n';
  output += 'VTEP IP          BGP AS    State           Uptime     Rx Routes  Tx Routes\n';
  output += '---------------- --------- --------------- ---------- ---------- ----------\n';

  vxlan.evpnNeighbors.forEach(neighbor => {
    const uptime = formatUptime(neighbor.uptime);
    output += `${neighbor.vtepIp.padEnd(16)} ${neighbor.bgpAs.toString().padEnd(9)} ${neighbor.state.padEnd(15)} ${uptime.padEnd(10)} ${neighbor.receivedRoutes.toString().padEnd(10)} ${neighbor.advertisedRoutes.toString().padEnd(10)}\n`;
  });

  return output;
}

export function getNveInterfaceTable(state: SwitchState): string {
  const vxlan = getOrCreateVxlanConfig(state);
  
  if (Object.keys(vxlan.nveInterfaces).length === 0) {
    return '% No NVE interfaces configured';
  }

  let output = '\nNVE Interfaces:\n';
  output += 'Interface    Source Interface  Status   VNI Mappings\n';
  output += '------------ ----------------- -------- -------------\n';

  Object.values(vxlan.nveInterfaces).forEach(nve => {
    const vniList = Object.keys(nve.vniMappings).join(', ') || 'None';
    output += `${nve.name.padEnd(12)} ${nve.sourceInterface.padEnd(17)} ${nve.status.padEnd(8)} ${vniList}\n`;
  });

  return output;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d${Math.floor((seconds % 86400) / 3600)}h`;
}
