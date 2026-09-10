/**
 * Routing Display Helper utilities for CLI `show ip route` & `show ipv6 route`.
 */

export const ROUTE_LEGEND_HEADER = `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area 
       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2
       E1 - OSPF external type 1, E2 - OSPF external type 2
       i - IS-IS, su - IS-IS summary, L1 - IS-IS level-1, L2 - IS-IS level-2
       ia - IS-IS inter area, * - candidate default, U - per-user static route
       o - ODR, P - periodic downloaded static route, H - NHRP, l - LISP
       a - application route
       + - replicated route, % - next hop override, p - overrides from PfR

Gateway of last resort is not set

`;

export function formatRouteCode(protocol?: string): string {
  if (!protocol) return 'S';
  const p = protocol.toLowerCase();
  if (p === 'connected') return 'C';
  if (p === 'local') return 'L';
  if (p === 'static') return 'S';
  if (p === 'ospf') return 'O';
  if (p === 'eigrp') return 'D';
  if (p === 'bgp') return 'B';
  if (p === 'rip') return 'R';
  return 'S';
}
