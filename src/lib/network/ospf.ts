export {
  LSAType,
  OSPFAreaType,
  type LSA,
  type RouterLSA,
  type OSPFLink,
  type SummaryLSA,
  type ASExternalLSA,
  type NSSAExternalLSA,
  type LSDB,
  type OspfCandidate,
  type DrBdrElectionResult,
} from './ospf/ospfTypes';

export {
  calculateOSPFInterfaceCost,
  getAreaType,
  isLSAAllowedInArea,
  getAreaTypeDisplay,
  isOspfProtocol,
  isOspfV3,
  isOspfInterfacePassive,
  buildOSPFLinkStateDatabase,
  electOspfDrBdr,
} from './ospf/ospfLsdb';

export {
  runOSPFDijkstra,
  calculateOSPFRoutes,
} from './ospf/ospfEngine';
