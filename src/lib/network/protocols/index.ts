/**
 * protocols/index.ts — Barrel export for all protocol state machine types and functions.
 */

export type {
  // OSPF
  OspfNeighborState,
  OspfNeighborRecord,
  OspfNeighborEvent,
  OspfNeighborTransitionResult,
  OspfProtocolEvent,
  // STP
  StpPortState,
  StpPortRole,
  StpPortRecord,
  StpPortEvent,
  StpPortTransitionResult,
  // DHCP
  DhcpClientState,
  DhcpClientRecord,
  DhcpClientEvent,
  DhcpClientTransitionResult,
  // EIGRP
  EigrpNeighborState,
  EigrpNeighborRecord,
  EigrpNeighborEvent,
  EigrpNeighborTransitionResult,
  // LACP
  LacpPortState,
  LacpPortRecord,
  LacpPortEvent,
  LacpPortTransitionResult,
} from './protocolStateMachines';
export type {
  // BGP (RFC 4271 §8)
  BgpPeerState,
  BgpSessionRecord,
  BgpSessionEvent,
  BgpSessionTransitionResult,
} from './bgpStateMachine';

export {
  // OSPF
  ospfNeighborTransition,
  ospfTickDeadTimer,
  // STP
  stpPortTransition,
  stpTickPort,
  // DHCP
  dhcpClientTransition,
  dhcpTickClient,
  // EIGRP
  eigrpNeighborTransition,
  eigrpTickHoldTimer,
  // LACP
  lacpPortTransition,
  lacpTickTimer,
} from './protocolStateMachines';
export {
  bgpSessionTransition,
  bgpTickSession,
  createBgpSessionRecord,
  BGP_DEFAULT_KEEPALIVE,
  BGP_DEFAULT_HOLDTIME,
} from './bgpStateMachine';
