import type { SwitchState, OspfVirtualLinkConfig } from './types';

export function getOrCreateOspfVirtualLinks(state: SwitchState): Record<string, OspfVirtualLinkConfig> {
  if (!state.ospfVirtualLinks) {
    state.ospfVirtualLinks = {};
  }
  return state.ospfVirtualLinks;
}

export function configureOspfVirtualLink(
  state: SwitchState,
  transitAreaId: string,
  neighborRouterId: string,
  authType: 'null' | 'simple' | 'md5' = 'null',
  authKey?: string
): void {
  const vlinks = getOrCreateOspfVirtualLinks(state);
  const key = `${transitAreaId}_${neighborRouterId}`;
  vlinks[key] = {
    transitAreaId,
    neighborRouterId,
    authType,
    authKey,
    status: 'up',
  };
}

export function removeOspfVirtualLink(
  state: SwitchState,
  transitAreaId: string,
  neighborRouterId: string
): boolean {
  if (!state.ospfVirtualLinks) return false;
  const key = `${transitAreaId}_${neighborRouterId}`;
  if (state.ospfVirtualLinks[key]) {
    delete state.ospfVirtualLinks[key];
    return true;
  }
  return false;
}

export function isVirtualLinkValidForBackbone(
  transitAreaId: string,
  configuredVirtualLinks: OspfVirtualLinkConfig[]
): boolean {
  // Area 0 itself cannot be a transit area for virtual-link
  if (transitAreaId === '0' || transitAreaId === '0.0.0.0') {
    return false;
  }
  return configuredVirtualLinks.some(
    (vl) => vl.transitAreaId === transitAreaId && vl.status === 'up'
  );
}
