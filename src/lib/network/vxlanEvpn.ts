import type { SwitchState, NveInterface } from './types';

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
