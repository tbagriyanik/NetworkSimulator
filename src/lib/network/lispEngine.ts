import type { SwitchState } from './types';

export interface LispEidMapping {
  eidPrefix: string;        // e.g. "192.168.10.0/24"
  rlocIp: string;           // Routing Locator IP, e.g. "10.1.1.1"
  priority?: number;
  weight?: number;
}

export interface LispConfig {
  enabled: boolean;
  routerId?: string;
  mapServerIp?: string;     // Map-Server IP address
  mapResolverIp?: string;   // Map-Resolver IP address
  siteName?: string;
  siteKey?: string;
  eidMappings: LispEidMapping[];
}

export function getOrCreateLispConfig(state: SwitchState): LispConfig {
  if (!state.lispConfig) {
    state.lispConfig = {
      enabled: false,
      eidMappings: []
    };
  }
  return state.lispConfig;
}

export function addLispMapping(state: SwitchState, mapping: LispEidMapping): void {
  const lisp = getOrCreateLispConfig(state);
  lisp.enabled = true;
  const existingIndex = lisp.eidMappings.findIndex(m => m.eidPrefix === mapping.eidPrefix);
  if (existingIndex >= 0) {
    lisp.eidMappings[existingIndex] = mapping;
  } else {
    lisp.eidMappings.push(mapping);
  }
}

export function resolveLispEid(state: SwitchState, dstIp: string): string | null {
  const lisp = state.lispConfig;
  if (!lisp || !lisp.enabled) return null;
  const match = lisp.eidMappings.find((m: LispEidMapping) => dstIp.startsWith(m.eidPrefix.split('/')[0].split('.').slice(0, 3).join('.')));
  return match ? match.rlocIp : null;
}
