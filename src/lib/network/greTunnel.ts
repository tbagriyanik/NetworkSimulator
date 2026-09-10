import type { SwitchState } from './types';

export interface GreTunnel {
  id: string;
  source?: string;
  destination?: string;
  tunnelIp?: string;
  subnetMask?: string;
}

export function getOrCreateGreTunnel(state: SwitchState, tunnelId: string): GreTunnel {
  if (!state.greTunnels) {
    state.greTunnels = {};
  }
  const id = tunnelId.toLowerCase();
  if (!state.greTunnels[id]) {
    state.greTunnels[id] = { id };
  }
  return state.greTunnels[id];
}

export function setGreTunnelSource(state: SwitchState, tunnelId: string, source: string): void {
  const tunnel = getOrCreateGreTunnel(state, tunnelId);
  tunnel.source = source;
}

export function setGreTunnelDestination(state: SwitchState, tunnelId: string, destination: string): void {
  const tunnel = getOrCreateGreTunnel(state, tunnelId);
  tunnel.destination = destination;
}
