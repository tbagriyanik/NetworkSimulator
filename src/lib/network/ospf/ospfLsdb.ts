import type { Port, SwitchState } from '../types';
import { getNetworkAddress } from '../core/showHelpers';
import {
  LSAType,
  OSPFAreaType,
  RouterLSA,
  SummaryLSA,
  ASExternalLSA,
  NSSAExternalLSA,
  LSDB,
  OSPFLink,
  OspfCandidate,
  DrBdrElectionResult,
} from './ospfTypes';

const OSPF_REFERENCE_BANDWIDTH = 100000; // 100 Mbps in Kbps (Standard default)

export function calculateOSPFInterfaceCost(port: Port): number {
  if (port.ospfCost !== undefined) return port.ospfCost;
  if (port.stpCost !== undefined) return port.stpCost;

  const bandwidth = getPortBandwidthKbps(port);
  const cost = Math.max(1, Math.floor(OSPF_REFERENCE_BANDWIDTH / bandwidth));
  return cost;
}

function getPortBandwidthKbps(port: Port): number {
  if (port.bandwidth) return port.bandwidth;
  if (port.type === 'gigabitethernet') return 1000000;
  if (port.type === 'fastethernet') return 100000;
  if (port.type === 'serial') return 1544;
  return 100000;
}

export function getAreaType(area: number, state: SwitchState): OSPFAreaType {
  const areaStr = String(area);

  if (state.ospfTotallyNssaAreas?.includes(areaStr)) return OSPFAreaType.TotallyNSSA;
  if (state.ospfTotallyStubAreas?.includes(areaStr)) return OSPFAreaType.TotallyStubby;
  if (state.ospfNssaAreas?.includes(areaStr)) return OSPFAreaType.NSSA;
  if (state.ospfStubAreas?.includes(areaStr)) return OSPFAreaType.Stub;
  return OSPFAreaType.Normal;
}

export function isLSAAllowedInArea(areaType: OSPFAreaType, lsaType: LSAType): boolean {
  switch (areaType) {
    case OSPFAreaType.Normal:
      return true;
    case OSPFAreaType.Stub:
      return lsaType !== LSAType.ASExternal;
    case OSPFAreaType.TotallyStubby:
      return lsaType !== LSAType.Summary && lsaType !== LSAType.ASExternal;
    case OSPFAreaType.NSSA:
      return lsaType !== LSAType.ASExternal;
    case OSPFAreaType.TotallyNSSA:
      return lsaType !== LSAType.Summary && lsaType !== LSAType.ASExternal;
    default:
      return true;
  }
}

export function getAreaTypeDisplay(areaType: OSPFAreaType): string {
  switch (areaType) {
    case OSPFAreaType.Normal: return 'normal';
    case OSPFAreaType.Stub: return 'stub';
    case OSPFAreaType.TotallyStubby: return 'totally stubby';
    case OSPFAreaType.NSSA: return 'nssa';
    case OSPFAreaType.TotallyNSSA: return 'totally nssa';
  }
}

export function isOspfProtocol(protocol: string | undefined): boolean {
  return protocol === 'ospf' || protocol === 'ospfv3';
}

export function isOspfV3(protocol: string | undefined): boolean {
  return protocol === 'ospfv3';
}

export function isOspfInterfacePassive(state: SwitchState, portId: string): boolean {
  const port = state.ports?.[portId];
  if (port?.passiveInterface) return true;
  return (state.passiveInterfaces || []).some(p => p.toLowerCase() === portId.toLowerCase());
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isPortCoveredByOspfNetworks(
  portIp: string,
  targetArea: number,
  state: SwitchState
): boolean {
  const ospfNetworks = state.ospfNetworks;
  if (!ospfNetworks || ospfNetworks.length === 0) {
    return true;
  }
  const portInt = ipToInt(portIp);
  return ospfNetworks.some(entry => {
    if (entry.area !== targetArea) return false;
    const networkInt = ipToInt(entry.network);
    const wildcardInt = ipToInt(entry.wildcard);
    const mask = ~wildcardInt >>> 0;
    return (portInt & mask) === (networkInt & mask);
  });
}

function getTypeRestrictiveness(type: OSPFAreaType): number {
  switch (type) {
    case OSPFAreaType.Normal: return 0;
    case OSPFAreaType.Stub: return 1;
    case OSPFAreaType.NSSA: return 2;
    case OSPFAreaType.TotallyStubby: return 3;
    case OSPFAreaType.TotallyNSSA: return 4;
  }
}

export function buildOSPFLinkStateDatabase(
  deviceStates: Map<string, SwitchState>
): LSDB {
  const lsdb: LSDB = { passiveLinks: new Set() };

  const areaTypes = new Map<number, OSPFAreaType>();
  deviceStates.forEach((state) => {
    if (!isOspfProtocol(state.routingProtocol)) return;
    const areas = state.ospfAreas || [0];
    areas.forEach(area => {
      const existingType = areaTypes.get(area);
      const thisAreaType = getAreaType(area, state);
      if (!existingType || getTypeRestrictiveness(thisAreaType) > getTypeRestrictiveness(existingType)) {
        areaTypes.set(area, thisAreaType);
      }
      if (!lsdb[area]) {
        lsdb[area] = {
          routerLSAs: new Map(),
          summaryLSAs: new Map()
        };
      }
    });
  });

  areaTypes.forEach((areaType, area) => {
    if (lsdb[area]) {
      lsdb[area].areaType = areaType;
    }
  });

  deviceStates.forEach((state, deviceId) => {
    if (!isOspfProtocol(state.routingProtocol)) return;

    const isV6 = isOspfV3(state.routingProtocol);
    const routerId = state.ospfRouterId || state.routerId || state.ip || state.hostname || deviceId;
    const areas = state.ospfAreas || [0];

    areas.forEach(area => {
      if (!lsdb[area]) {
        lsdb[area] = {
          routerLSAs: new Map(),
          summaryLSAs: new Map()
        };
      }

      const links: OSPFLink[] = [];
      Object.entries(state.ports || {}).forEach(([portId, port]) => {
        if (port.shutdown) return;

        if (isV6) {
          if (!port.ipv6Address || port.ipv6Prefix === undefined) return;
          if (!port.ipv6Ospf?.enabled) return;

          const portArea = port.ipv6Ospf.area !== undefined ? parseInt(port.ipv6Ospf.area) : area;
          if (portArea !== area) return;

          links.push({
            id: port.ipv6Address,
            data: String(port.ipv6Prefix),
            type: 'stub',
            metric: calculateOSPFInterfaceCost(port)
          });

          if (isOspfInterfacePassive(state, portId)) {
            lsdb.passiveLinks?.add(`${routerId}|${area}|${port.ipv6Address}`);
          }
        } else {
          if (!port.ipAddress || !port.subnetMask) return;
          if (port.ospfEnabled === false) return;

          const portArea = port.ospfArea !== undefined ? parseInt(port.ospfArea) : area;
          if (portArea !== area) return;

          if (!isPortCoveredByOspfNetworks(port.ipAddress, area, state)) return;

          const networkAddr = getNetworkAddress(port.ipAddress, port.subnetMask);
          links.push({
            id: networkAddr,
            data: port.subnetMask,
            type: 'stub',
            metric: calculateOSPFInterfaceCost(port)
          });

          if (isOspfInterfacePassive(state, portId)) {
            lsdb.passiveLinks?.add(`${routerId}|${area}|${networkAddr}`);
          }
        }
      });

      const routerLSA: RouterLSA = {
        id: routerId,
        advRouter: routerId,
        type: LSAType.Router,
        area,
        sequence: 1,
        ageNumber: 0,
        isAbr: !!state.isAbr || areas.length > 1,
        isAsbr: !!state.bgpAs,
        links
      };

      lsdb[area].routerLSAs.set(routerId, routerLSA);
    });
  });

  deviceStates.forEach((state, deviceId) => {
    if (!isOspfProtocol(state.routingProtocol)) return;
    const isV6 = isOspfV3(state.routingProtocol);
    const routerId = state.ospfRouterId || state.routerId || state.ip || state.hostname || deviceId;
    const areas = state.ospfAreas || [0];

    const isAsbr = !!state.bgpAs;
    if (!isAsbr) return;

    areas.forEach(area => {
      if (!lsdb[area]) return;
      const areaType = lsdb[area].areaType || OSPFAreaType.Normal;

      const externalNetworks: Array<{ network: string; mask: string; metric: number }> = [];
      Object.values(state.ports).forEach(port => {
        if (port.shutdown) return;

        if (isV6) {
          if (!port.ipv6Address || port.ipv6Prefix === undefined) return;
          if (!port.ipv6Ospf?.enabled) return;

          externalNetworks.push({
            network: port.ipv6Address,
            mask: String(port.ipv6Prefix),
            metric: calculateOSPFInterfaceCost(port)
          });
        } else {
          if (!port.ipAddress || !port.subnetMask) return;
          if (port.ospfEnabled === false) return;
          const portArea = port.ospfArea !== undefined ? parseInt(port.ospfArea) : area;
          if (portArea !== area) return;

          const networkAddr = getNetworkAddress(port.ipAddress, port.subnetMask);
          externalNetworks.push({
            network: networkAddr,
            mask: port.subnetMask,
            metric: calculateOSPFInterfaceCost(port)
          });
        }
      });

      if (externalNetworks.length === 0) return;

      if (areaType === OSPFAreaType.NSSA || areaType === OSPFAreaType.TotallyNSSA) {
        const nssaLsas = lsdb[area].nssaLsas ?? (lsdb[area].nssaLsas = new Map());
        externalNetworks.forEach(ext => {
          const nssaLsa: NSSAExternalLSA = {
            id: `7-${ext.network}`,
            advRouter: routerId,
            type: LSAType.NSSA,
            area,
            sequence: 1,
            ageNumber: 0,
            network: ext.network,
            mask: ext.mask,
            metric: ext.metric,
            propagate: true
          };
          nssaLsas.set(nssaLsa.id, nssaLsa);
        });
      } else if (areaType === OSPFAreaType.Normal) {
        if (!lsdb[area].asExternalLSAs) {
          lsdb[area].asExternalLSAs = new Map();
        }
        externalNetworks.forEach(ext => {
          const externalLsa: ASExternalLSA = {
            id: ext.network,
            advRouter: routerId,
            type: LSAType.ASExternal,
            area,
            sequence: 1,
            ageNumber: 0,
            network: ext.network,
            mask: ext.mask,
            metric: ext.metric
          };
          const asExtLsas = lsdb[area].asExternalLSAs ?? (lsdb[area].asExternalLSAs = new Map());
          asExtLsas.set(externalLsa.id, externalLsa);
        });
      }
    });
  });

  deviceStates.forEach((state, deviceId) => {
    const routerId = state.ospfRouterId || state.routerId || state.ip || deviceId;
    const areas = state.ospfAreas || [0];

    if (areas.length > 1) {
      areas.forEach(sourceArea => {
        const sourceAreaData = lsdb[sourceArea];
        if (!sourceAreaData) return;

        sourceAreaData.routerLSAs.forEach((lsa) => {
          lsa.links.forEach(link => {
            if (link.type === 'stub') {
              areas.forEach(targetArea => {
                if (sourceArea === targetArea) return;

                if (!lsdb[targetArea]) {
                  lsdb[targetArea] = { routerLSAs: new Map(), summaryLSAs: new Map() };
                }

                const targetAreaType = lsdb[targetArea].areaType || OSPFAreaType.Normal;

                if (!isLSAAllowedInArea(targetAreaType, LSAType.Summary)) {
                  return;
                }

                const summaryLSA: SummaryLSA = {
                  id: link.id,
                  advRouter: routerId,
                  type: LSAType.Summary,
                  area: targetArea,
                  sequence: 1,
                  ageNumber: 0,
                  network: link.id,
                  mask: link.data,
                  metric: link.metric
                };
                lsdb[targetArea].summaryLSAs.set(`${summaryLSA.id}-${routerId}`, summaryLSA);
              });
            }
          });
        });
      });

      areas.forEach(sourceArea => {
        const sourceAreaData = lsdb[sourceArea];
        if (!sourceAreaData?.nssaLsas) return;
        const sourceAreaType = sourceAreaData.areaType || OSPFAreaType.Normal;
        if (sourceAreaType !== OSPFAreaType.NSSA && sourceAreaType !== OSPFAreaType.TotallyNSSA) return;

        sourceAreaData.nssaLsas.forEach((nssaLsa) => {
          if (!nssaLsa.propagate) return;

          areas.forEach(targetArea => {
            if (sourceArea === targetArea) return;
            if (!lsdb[targetArea]) {
              lsdb[targetArea] = { routerLSAs: new Map(), summaryLSAs: new Map() };
            }
            if (!lsdb[targetArea].asExternalLSAs) {
              lsdb[targetArea].asExternalLSAs = new Map();
            }

            const targetAreaType = lsdb[targetArea].areaType || OSPFAreaType.Normal;
            if (!isLSAAllowedInArea(targetAreaType, LSAType.ASExternal)) return;

            const externalLsa: ASExternalLSA = {
              id: nssaLsa.network,
              advRouter: routerId,
              type: LSAType.ASExternal,
              area: targetArea,
              sequence: 1,
              ageNumber: 0,
              network: nssaLsa.network,
              mask: nssaLsa.mask,
              metric: nssaLsa.metric
            };
            const asExtLsas = lsdb[targetArea].asExternalLSAs ?? (lsdb[targetArea].asExternalLSAs = new Map());
            asExtLsas.set(externalLsa.id, externalLsa);
          });
        });
      });
    }
  });

  deviceStates.forEach((state, deviceId) => {
    const routerId = state.ospfRouterId || state.routerId || state.ip || deviceId;
    const areas = state.ospfAreas || [0];

    if (areas.length > 1) {
      areas.forEach(targetArea => {
        if (!lsdb[targetArea]) return;
        const targetAreaType = lsdb[targetArea].areaType || OSPFAreaType.Normal;

        if (targetAreaType === OSPFAreaType.Stub ||
            targetAreaType === OSPFAreaType.TotallyStubby ||
            targetAreaType === OSPFAreaType.NSSA ||
            targetAreaType === OSPFAreaType.TotallyNSSA) {
          const defaultSummary: SummaryLSA = {
            id: '0.0.0.0',
            advRouter: routerId,
            type: LSAType.Summary,
            area: targetArea,
            sequence: 1,
            ageNumber: 0,
            network: '0.0.0.0',
            mask: '0.0.0.0',
            metric: 1
          };
          lsdb[targetArea].summaryLSAs.set(`0.0.0.0-${routerId}`, defaultSummary);
        }
      });
    }
  });

  return lsdb;
}

export function electOspfDrBdr(candidates: OspfCandidate[]): DrBdrElectionResult {
  const eligible = candidates.filter(c => c.drPriority > 0);
  if (eligible.length === 0) {
    return { dr: null, bdr: null, otherCandidates: candidates };
  }

  const sorted = [...eligible].sort((a, b) => {
    if (b.drPriority !== a.drPriority) {
      return b.drPriority - a.drPriority;
    }
    return b.routerId.localeCompare(a.routerId, undefined, { numeric: true });
  });

  const dr = sorted[0] || null;
  const bdr = sorted[1] || null;
  const otherCandidates = candidates.filter(c => c !== dr && c !== bdr);

  return { dr, bdr, otherCandidates };
}
