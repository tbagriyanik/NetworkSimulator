import type { SwitchState } from './types';

export interface OspfAreaRange {
  areaId: string;
  network: string;
  mask: string;
  advertise: boolean;
}

export function getOrCreateOspfRanges(state: SwitchState): OspfAreaRange[] {
  if (!state.ospfAreaRanges) {
    state.ospfAreaRanges = [];
  }
  return state.ospfAreaRanges;
}

export function addOspfAreaRange(
  state: SwitchState,
  areaId: string,
  network: string,
  mask: string,
  advertise: boolean = true
): void {
  const ranges = getOrCreateOspfRanges(state);
  const existing = ranges.find((r) => r.areaId === areaId && r.network === network);
  if (existing) {
    existing.mask = mask;
    existing.advertise = advertise;
  } else {
    ranges.push({ areaId, network, mask, advertise });
  }
}
