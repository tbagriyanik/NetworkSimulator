import type { SwitchState } from './types';

export interface VrfInstance {
  name: string;
  rd?: string;
  interfaces: string[];
}

export function getOrCreateVrfInstance(state: SwitchState, name: string): VrfInstance {
  if (!state.vrfInstances) {
    state.vrfInstances = {};
  }
  const key = name.toLowerCase();
  if (!state.vrfInstances[key]) {
    state.vrfInstances[key] = {
      name,
      interfaces: [],
    };
  }
  return state.vrfInstances[key];
}

export function setVrfRouteDistinguisher(state: SwitchState, name: string, rd: string): void {
  const vrf = getOrCreateVrfInstance(state, name);
  vrf.rd = rd;
}

export function assignInterfaceToVrf(state: SwitchState, name: string, ifName: string): void {
  const vrf = getOrCreateVrfInstance(state, name);
  const normalized = ifName.toLowerCase();
  if (!vrf.interfaces.includes(normalized)) {
    vrf.interfaces.push(normalized);
  }
}

export function filterRoutesByVrf<T extends { interface?: string }>(
  state: SwitchState,
  vrfName: string | undefined,
  routes: T[]
): T[] {
  if (!vrfName) {
    // Global routing table: excludes interfaces assigned to specific VRFs
    const assignedInterfaces = new Set<string>();
    if (state.vrfInstances) {
      Object.values(state.vrfInstances).forEach((vrf) => {
        vrf.interfaces.forEach((iface) => assignedInterfaces.add(iface.toLowerCase()));
      });
    }
    return routes.filter((r) => !r.interface || !assignedInterfaces.has(r.interface.toLowerCase()));
  }

  const key = vrfName.toLowerCase();
  const vrf = state.vrfInstances?.[key];
  if (!vrf) return [];

  const vrfInterfaces = new Set(vrf.interfaces.map((i) => i.toLowerCase()));
  return routes.filter((r) => r.interface && vrfInterfaces.has(r.interface.toLowerCase()));
}

