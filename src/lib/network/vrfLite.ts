import type { SwitchState } from './types';
import type { Route } from './types/routingTypes';

export interface VrfInstance {
  name: string;
  rd?: string;
  rtImport?: string[];
  rtExport?: string[];
  interfaces: string[];
  staticRoutes?: Route[];
}

export function getOrCreateVrfInstance(state: SwitchState, name: string): VrfInstance {
  if (!state.vrfInstances) {
    state.vrfInstances = {};
  }
  const key = name.toLowerCase();
  if (!state.vrfInstances[key]) {
    state.vrfInstances[key] = {
      name,
      rtImport: [],
      rtExport: [],
      interfaces: [],
      staticRoutes: [],
    };
  }
  return state.vrfInstances[key];
}

export function setVrfRouteDistinguisher(state: SwitchState, name: string, rd: string): void {
  const vrf = getOrCreateVrfInstance(state, name);
  vrf.rd = rd;
}

export function setVrfRouteTarget(
  state: SwitchState,
  name: string,
  direction: 'import' | 'export' | 'both',
  rt: string
): void {
  const vrf = getOrCreateVrfInstance(state, name);
  if (!vrf.rtImport) vrf.rtImport = [];
  if (!vrf.rtExport) vrf.rtExport = [];

  if ((direction === 'import' || direction === 'both') && !vrf.rtImport.includes(rt)) {
    vrf.rtImport.push(rt);
  }
  if ((direction === 'export' || direction === 'both') && !vrf.rtExport.includes(rt)) {
    vrf.rtExport.push(rt);
  }
}

export function assignInterfaceToVrf(state: SwitchState, name: string, ifName: string): void {
  const vrf = getOrCreateVrfInstance(state, name);
  const normalized = ifName.toLowerCase();
  if (!vrf.interfaces.includes(normalized)) {
    vrf.interfaces.push(normalized);
  }

  // Bind interface in ports map
  const targetPortKey = Object.keys(state.ports || {}).find(
    p => p.toLowerCase() === normalized || p.toLowerCase().endsWith(normalized)
  );
  if (targetPortKey && state.ports[targetPortKey]) {
    state.ports[targetPortKey].vrf = name;
  }
}

export function getVrfForInterface(state: SwitchState, ifName: string): string | undefined {
  if (!ifName) return undefined;
  const normIf = ifName.toLowerCase();

  if (state.ports) {
    const targetPort = Object.keys(state.ports).find(
      p => p.toLowerCase() === normIf || p.toLowerCase().endsWith(normIf)
    );
    if (targetPort && state.ports[targetPort]?.vrf) {
      return state.ports[targetPort].vrf;
    }
  }

  if (state.vrfInstances) {
    for (const vrf of Object.values(state.vrfInstances)) {
      if (vrf.interfaces.some(i => i.toLowerCase() === normIf)) {
        return vrf.name;
      }
    }
  }

  return undefined;
}

export function addVrfStaticRoute(state: SwitchState, vrfName: string, route: Route): void {
  const vrf = getOrCreateVrfInstance(state, vrfName);
  if (!vrf.staticRoutes) vrf.staticRoutes = [];
  const taggedRoute: Route = { ...route, vrf: vrfName };
  vrf.staticRoutes.push(taggedRoute);
}

/**
 * Filters and isolates routes strictly according to VRF routing table boundaries.
 * Also performs MP-BGP Route Target (RT) leaking between VRFs when configured.
 */
export function filterRoutesByVrf(
  state: SwitchState,
  vrfName: string | undefined,
  routes: Route[]
): Route[] {
  if (!vrfName || vrfName.toLowerCase() === 'global') {
    // Global routing table: excludes interfaces and routes assigned to specific VRFs
    const assignedInterfaces = new Set<string>();
    if (state.vrfInstances) {
      Object.values(state.vrfInstances).forEach((vrf) => {
        vrf.interfaces.forEach((iface) => assignedInterfaces.add(iface.toLowerCase()));
      });
    }

    return routes.filter((r) => {
      if (r.vrf && r.vrf.toLowerCase() !== 'global') return false;
      const iface = r.interfaceId || (r as { interface?: string }).interface || (r.type === 'connected' ? r.nextHop : undefined);
      if (iface && assignedInterfaces.has(iface.toLowerCase())) return false;
      return true;
    });
  }

  const key = vrfName.toLowerCase();
  const vrf = state.vrfInstances?.[key];
  if (!vrf) return [];

  const vrfInterfaces = new Set(vrf.interfaces.map((i) => i.toLowerCase()));

  // 1. Direct VRF routes (matching interfaces, tagged static/dynamic VRF routes)
  const isolatedRoutes = routes.filter((r) => {
    if (r.vrf && r.vrf.toLowerCase() === key) return true;
    const iface = r.interfaceId || (r as { interface?: string }).interface || (r.type === 'connected' ? r.nextHop : undefined);
    if (iface && vrfInterfaces.has(iface.toLowerCase())) return true;
    return false;
  });

  // Include explicit VRF static routes
  if (vrf.staticRoutes && vrf.staticRoutes.length > 0) {
    isolatedRoutes.push(...vrf.staticRoutes);
  }

  // 2. RT (Route Target) Leaking from other VRFs
  if (vrf.rtImport && vrf.rtImport.length > 0 && state.vrfInstances) {
    for (const otherVrf of Object.values(state.vrfInstances)) {
      if (otherVrf.name.toLowerCase() === key) continue;
      if (!otherVrf.rtExport || otherVrf.rtExport.length === 0) continue;

      const hasMatchingRt = otherVrf.rtExport.some(rt => vrf.rtImport?.includes(rt));
      if (hasMatchingRt) {
        // Leak routes from otherVrf into vrf
        const otherVrfRoutes = filterRoutesByVrf(state, otherVrf.name, routes);
        otherVrfRoutes.forEach(leakedRoute => {
          if (!isolatedRoutes.some(r => r.destination === leakedRoute.destination)) {
            isolatedRoutes.push({
              ...leakedRoute,
              vrf: vrf.name,
              code: `VLeaked (${otherVrf.name})`,
            });
          }
        });
      }
    }
  }

  return isolatedRoutes;
}
