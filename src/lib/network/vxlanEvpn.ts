import type { SwitchState, NveInterface } from './types';

export interface EvpnMacRoute {
  vni: number;
  macAddress: string;
  ipAddress?: string;
  nextHopVtep: string;
  routeType: 'Type-2' | 'Type-3';
}

export function getOrCreateNveInterface(state: SwitchState, name: string = 'nve1'): NveInterface {
  if (!state.nveInterfaces) {
    state.nveInterfaces = {};
  }
  const key = name.toLowerCase();
  if (!state.nveInterfaces[key]) {
    state.nveInterfaces[key] = {
      name,
      sourceInterface: 'Loopback0',
      vniMappings: {},
      status: 'up',
    };
  }
  return state.nveInterfaces[key];
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
