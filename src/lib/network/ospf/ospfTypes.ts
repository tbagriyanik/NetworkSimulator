export enum LSAType {
  Router = 1,       // Type 1: Router LSA (Intra-area)
  Network = 2,      // Type 2: Network LSA (Intra-area, for multi-access links)
  Summary = 3,      // Type 3: Summary LSA (Inter-area, from ABR)
  ASExternal = 5,   // Type 5: AS External LSA (From ASBR)
  NSSA = 7          // Type 7: NSSA External LSA (From ASBR in NSSA)
}

export enum OSPFAreaType {
  Normal = 'normal',
  Stub = 'stub',
  TotallyStubby = 'totally-stubby',
  NSSA = 'nssa',
  TotallyNSSA = 'totally-nssa'
}

export interface LSA {
  id: string;             // LSA ID (usually Router ID or Network ID)
  advRouter: string;      // Advertising Router ID
  type: LSAType;
  area: number;
  sequence: number;
  ageNumber: number;
  checksum?: string;
}

export interface RouterLSA extends LSA {
  type: LSAType.Router;
  isAbr: boolean;
  isAsbr: boolean;
  links: OSPFLink[];
}

export interface OSPFLink {
  id: string;             // Neighbor Router ID or Network ID
  data: string;           // Router's local interface IP or mask
  type: 'p2p' | 'transit' | 'stub';
  metric: number;
}

export interface SummaryLSA extends LSA {
  type: LSAType.Summary;
  network: string;
  mask: string;
  metric: number;
}

export interface ASExternalLSA extends LSA {
  type: LSAType.ASExternal;
  network: string;
  mask: string;
  metric: number;
  forwardingAddress?: string;
}

export interface NSSAExternalLSA extends LSA {
  type: LSAType.NSSA;
  network: string;
  mask: string;
  metric: number;
  forwardingAddress?: string;
  propagate: boolean;
}

export interface LSDB {
  passiveLinks?: Set<string>;
  [area: number]: {
    routerLSAs: Map<string, RouterLSA>;
    summaryLSAs: Map<string, SummaryLSA>;
    asExternalLSAs?: Map<string, ASExternalLSA>;
    nssaLsas?: Map<string, NSSAExternalLSA>;
    areaType?: OSPFAreaType;
  };
}

export interface SPFNode {
  routerId: string;
  cost: number;
  nextHop: string;
  area: number;
}

export interface OspfCandidate {
  routerId: string;
  drPriority: number;
  ipAddress: string;
  interfaceName?: string;
}

export interface DrBdrElectionResult {
  dr: OspfCandidate | null;
  bdr: OspfCandidate | null;
  otherCandidates: OspfCandidate[];
}
