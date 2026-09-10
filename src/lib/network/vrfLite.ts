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
