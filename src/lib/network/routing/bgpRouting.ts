import { SwitchState } from '../types';
import { getNetworkAddress } from '../core/showHelpers';
import { evaluateAcl } from '../connectivity/acl';
import { ipToNumber, getPrefixLength, maskFromPrefixLength } from './routingUtils';
import type { Route } from './routingTypes';

/** Get all active (up) IPv4 addresses of a device state. */
function getActiveBgpDeviceIps(st: SwitchState): string[] {
  const ips: string[] = [];
  Object.values(st.ports || {}).forEach(port => {
    if (!port.shutdown && port.ipAddress) ips.push(port.ipAddress);
  });
  return ips;
}

/**
 * Recalculate BGP neighbor states across devices in the topology.
 * When neighbor remote-as match on both sides, state is 'Established', otherwise 'Idle'.
 */
export function recalculateBgpNeighbors(
  deviceStates: Map<string, SwitchState>
): Map<string, SwitchState> {
  const updatedStates = new Map<string, SwitchState>(deviceStates);

  // Helper to collect all active IP addresses of a device
  const getActiveDeviceIps = (st: SwitchState): string[] => {
    const ips: string[] = [];
    Object.values(st.ports || {}).forEach(port => {
      if (!port.shutdown && port.ipAddress) {
        ips.push(port.ipAddress);
      }
    });
    return ips;
  };

  deviceStates.forEach((state, deviceId) => {
    if (!state.bgpNeighbors || state.bgpNeighbors.length === 0) return;

    const localAs = String(state.bgpAs || '');
    const localIps = getActiveDeviceIps(state);
    const newNeighborStateMap: Record<string, string> = { ...state.bgpNeighborState };

    const newNeighbors = state.bgpNeighbors.map(n => {
      const neighborIp = n.ip;
      const targetAs = String(n.as || '');
      let isEstablished = false;

      // Search for peer router matching targetAs and neighborIp
      deviceStates.forEach((peerState, peerId) => {
        if (peerId === deviceId) return;
        if (String(peerState.bgpAs || '') !== targetAs) return;

        const peerIps = getActiveDeviceIps(peerState);
        if (!peerIps.includes(neighborIp)) return;

        // Peer must have neighbor pointing back to one of localIps with matching localAs
        const peerHasMatchingNeighbor = (peerState.bgpNeighbors || []).some(
          pn => localIps.includes(pn.ip) && String(pn.as || '') === localAs
        );

        if (peerHasMatchingNeighbor) {
          isEstablished = true;
        }
      });

      const nState = n.shutdown
        ? 'Administratively down'
        : (isEstablished ? 'Established' : 'Idle');
      newNeighborStateMap[neighborIp] = nState;

      return {
        ...n,
        state: nState
      };
    });

    updatedStates.set(deviceId, {
      ...state,
      bgpNeighbors: newNeighbors,
      bgpNeighborState: newNeighborStateMap
    });
  });

  return updatedStates;
}

/**
 * Collect the IPv4 prefixes a BGP speaker would advertise to its peers.
 * Advertised set = `network <ip> mask <mask>` statements + redistributed
 * routes (`redistribute <proto>`) whose target protocol is BGP.
 *
 * When a `recipient` is provided (route being sent to that peer), BGP-learned
 * routes from `state.dynamicRoutes` are also reflected subject to
 * route-reflector split-horizon rules:
 *  - routes with an external ASN in the path are advertised to everyone;
 *  - iBGP-learned routes (path 'i') are re-advertised only to route-reflector
 *    clients (otherwise a full mesh would be required).
 */
function collectBgpAdvertisedPrefixes(state: SwitchState, recipient?: SwitchState): Route[] {
  const prefixes: Route[] = [];

  (state.bgpNetworks || []).forEach(n => {
    if (!n.network || !n.mask) return;
    if (!prefixes.some(p => p.destination === n.network && p.subnetMask === n.mask)) {
      prefixes.push({
        destination: n.network,
        subnetMask: n.mask,
        nextHop: '0.0.0.0',
        metric: 0,
        type: 'dynamic',
        code: 'B'
      });
    }
  });

  const bgpRedist = (state.redistributeRules || []).filter(r => r.targetProtocol === 'bgp');
  if (bgpRedist.length > 0) {
    const connected: Route[] = Object.values(state.ports || {})
      .filter(p => !p.shutdown && !!p.ipAddress && !!p.subnetMask)
      .map(p => ({
        destination: getNetworkAddress(p.ipAddress as string, p.subnetMask as string),
        subnetMask: p.subnetMask as string,
        nextHop: '0.0.0.0',
        metric: 0,
        type: 'dynamic',
        code: 'B'
      }));

    const sourceMap: Record<string, Route[]> = {
      connected,
      static: state.staticRoutes || [],
      ospf: (state.dynamicRoutes || []).filter(r => (r.code || '').startsWith('O')),
      eigrp: (state.dynamicRoutes || []).filter(r => (r.code || '').startsWith('D')),
      rip: (state.dynamicRoutes || []).filter(r => (r.code || '').startsWith('R'))
    };

    bgpRedist.forEach(rule => {
      (sourceMap[rule.sourceProtocol] || []).forEach(src => {
        if (!src.destination) return;
        if (!prefixes.some(p => p.destination === src.destination && p.subnetMask === src.subnetMask)) {
          prefixes.push({
            destination: src.destination,
            subnetMask: src.subnetMask,
            nextHop: '0.0.0.0',
            metric: rule.metric ?? 0,
            type: 'dynamic',
            code: 'B'
          });
        }
      });
    });
  }

  if (recipient) {
    const recipientIps = getActiveBgpDeviceIps(recipient);
    const recipientIsRrClient = (state.bgpNeighbors || []).some(
      n => n.routeReflectorClient === true && recipientIps.includes(n.ip)
    );
    const recipientIsEbgp = isIBgpSession(state, recipient) === false;

    (state.dynamicRoutes || []).forEach(br => {
      if (br.code !== 'B' || !br.destination) return;
      if (prefixes.some(p => p.destination === br.destination && p.subnetMask === (br.subnetMask || br.mask))) return;

      const path = (br.asPath || '').trim();
      const isInternalOnly = asPathAsnCount(path) === 0;

      if (isInternalOnly && !recipientIsEbgp && !recipientIsRrClient) return;

      prefixes.push({
        destination: br.destination,
        subnetMask: br.subnetMask || br.mask,
        nextHop: '0.0.0.0',
        metric: typeof br.metric === 'number' ? br.metric : 0,
        type: 'dynamic',
        code: 'B',
        asPath: br.asPath,
        localPreference: br.localPreference,
        weight: br.weight
      });
    });
  }

  return prefixes;
}

/** Parse a stored prefix-list prefix (e.g. '192.168.1.0/24') into { network, length }. */
function parsePrefixListEntry(prefix: string): { network: string; length: number } | null {
  const match = prefix.match(/^([0-9.]+)\/(\d+)$/);
  if (!match) return null;
  return { network: match[1], length: parseInt(match[2], 10) };
}

/** Apply ge/le semantics and test if candidate prefix falls inside a prefix-list entry. */
function bgpPrefixMatchesEntry(
  entry: { action: 'permit' | 'deny'; prefix: string; ge?: number; le?: number },
  candidate: { destination: string; mask?: string; subnetMask?: string }
): boolean {
  const parsed = parsePrefixListEntry(entry.prefix);
  if (!parsed) return false;
  const prefixIp = ipToNumber(parsed.network);
  const destIp = ipToNumber(candidate.destination);
  const destLength = getPrefixLength(candidate.mask || candidate.subnetMask || '255.255.255.0');

  if (!destIp || !prefixIp) return false;

  const prefixMask = maskFromPrefixLength(parsed.length);
  const inSubnet = (destIp & ipToNumber(prefixMask)) === (prefixIp & ipToNumber(prefixMask));
  if (!inSubnet) return false;

  if (entry.ge !== undefined && destLength < entry.ge) return false;
  if (entry.le !== undefined && destLength > entry.le) return false;
  return true;
}

/**
 * Evaluate a route-map against a candidate prefix. Returns true when the prefix
 * is permitted (allowed to pass the filter). Missing route-maps deny traffic.
 */
function bgpRouteMapAllows(
  state: SwitchState,
  mapName: string,
  candidate: { destination: string; mask?: string; subnetMask?: string }
): boolean {
  const clauses = (state.routeMaps || {})[mapName];
  if (!clauses || clauses.length === 0) return false;

  const sorted = [...clauses].sort((a, b) => (a.seq || 0) - (b.seq || 0));

  for (const clause of sorted) {
    const matchRules = clause.matchRules || {};
    const matchAll = Object.keys(matchRules).length === 0;

    let clauseMatched = matchAll;
    if (!matchAll) {
      if (typeof matchRules.prefixList === 'string') {
        const entries = (state.prefixLists || {})[matchRules.prefixList];
        clauseMatched = (entries || []).some(e => bgpPrefixMatchesEntry(e, candidate));
      } else if (typeof matchRules.acl === 'string') {
        const aclResult = evaluateAcl(matchRules.acl, state, candidate.destination, candidate.destination, 'ip', 'any');
        clauseMatched = aclResult !== 'deny' && aclResult !== 'none';
      } else if (typeof matchRules.interface === 'string') {
        clauseMatched = false;
      } else {
        clauseMatched = true;
      }
    }

    if (!clauseMatched) continue;

    if (clause.action === 'deny') return false;
    return true;
  }

  return false;
}

/** Extract route-map `set` values for a matched inbound policy. */
function bgpRouteMapSetRules(
  state: SwitchState,
  mapName: string,
  candidate: { destination: string; mask?: string; subnetMask?: string }
): { metric?: number; localPreference?: number; nextHop?: string; weight?: number; asPathPrepend?: string[] } {
  const clauses = (state.routeMaps || {})[mapName];
  if (!clauses || clauses.length === 0) return {};

  const sorted = [...clauses].sort((a, b) => (a.seq || 0) - (b.seq || 0));
  for (const clause of sorted) {
    const matchRules = clause.matchRules || {};
    const matchAll = Object.keys(matchRules).length === 0;

    let clauseMatched = matchAll;
    if (!matchAll) {
      if (typeof matchRules.prefixList === 'string') {
        const entries = (state.prefixLists || {})[matchRules.prefixList];
        clauseMatched = (entries || []).some(e => bgpPrefixMatchesEntry(e, candidate));
      } else if (typeof matchRules.acl === 'string') {
        const aclResult = evaluateAcl(matchRules.acl, state, candidate.destination, candidate.destination, 'ip', 'any');
        clauseMatched = aclResult !== 'deny' && aclResult !== 'none';
      }
    }

    if (!clauseMatched || clause.action === 'deny') continue;

    const setRules = clause.setRules || {};
    return {
      metric: typeof setRules.metric === 'number' ? setRules.metric : undefined,
      localPreference: typeof setRules.localPreference === 'number' ? setRules.localPreference : undefined,
      nextHop: typeof setRules.nextHop === 'string' ? setRules.nextHop : undefined,
      weight: typeof setRules.weight === 'number' ? setRules.weight : undefined,
      asPathPrepend: Array.isArray(setRules.asPathPrepend)
        ? setRules.asPathPrepend.filter((a): a is string => typeof a === 'string')
        : undefined
    };
  }
  return {};
}

/** Whether two devices peer over iBGP (same local ASN). */
function isIBgpSession(a: SwitchState, b: SwitchState): boolean {
  return String(a.bgpAs || '') === String(b.bgpAs || '');
}

/** Number of ASNs carried in an AS_PATH string ('65000 65001 i' -> 2). */
function asPathAsnCount(path: string | undefined): number {
  const p = (path || '').trim();
  if (!p) return 0;
  return p
    .replace(/\s+i$/, '')
    .trim()
    .split(/\s+/)
    .filter(t => Boolean(t) && t !== 'i').length;
}

/** BGP best-path selection for two routes to the same prefix. */
function bgpBestPath(r: Route, existing: Route): boolean {
  if ((r.weight || 0) !== (existing.weight || 0)) return (r.weight || 0) > (existing.weight || 0);
  if ((r.localPreference ?? 100) !== (existing.localPreference ?? 100)) {
    return (r.localPreference ?? 100) > (existing.localPreference ?? 100);
  }
  const rPathLen = asPathAsnCount(r.asPath);
  const ePathLen = asPathAsnCount(existing.asPath);
  if (rPathLen !== ePathLen) return rPathLen < ePathLen;
  if ((r.metric || 0) !== (existing.metric || 0)) return (r.metric || 0) < (existing.metric || 0);
  const rAd = r.administrativeDistance || 200;
  const eAd = existing.administrativeDistance || 200;
  return rAd < eAd;
}

/**
 * Compute BGP-learned routes for a device from all its Established neighbors.
 * Honors advanced features: next-hop-self, ebgp-multihop, allowas-in, shutdown,
 * maximum-prefix, route-map in/out filtering, aggregate-address summarization.
 */
export function calculateBgpRoutes(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): Route[] {
  const rawState = deviceStates.get(deviceId);
  if (!rawState || rawState.routingProtocol !== 'bgp' || !rawState.bgpAs) return [];

  const updated = recalculateBgpNeighbors(deviceStates);
  const myState = updated.get(deviceId) || rawState;
  const ownAs = String(myState.bgpAs);
  const myIps = getActiveBgpDeviceIps(myState);
  if (myIps.length === 0) return [];

  const learned: Route[] = [];

  updated.forEach((peerState, peerId) => {
    if (peerId === deviceId) return;
    const peerAs = String(peerState.bgpAs || '');
    if (!peerAs) return;

    // My neighbor config pointing at this peer (must be Established)
    const myNeighbor = (myState.bgpNeighbors || []).find(n =>
      getActiveBgpDeviceIps(peerState).includes(n.ip) && n.state === 'Established' && !n.shutdown
    );
    if (!myNeighbor) return;

    // Peer must be configured back toward me (bidirectional peering)
    const peerNeighborCfg = (peerState.bgpNeighbors || []).find(pn => myIps.includes(pn.ip));
    if (!peerNeighborCfg || peerNeighborCfg.shutdown) return;

    const isIBgp = peerAs === ownAs;
    const advertised = collectBgpAdvertisedPrefixes(peerState, myState);
    let receivedCount = 0;
    advertised.forEach(prefix => {
      // Outbound policy applied on advertising peer
      if (peerNeighborCfg.routeMapOut && !bgpRouteMapAllows(peerState, peerNeighborCfg.routeMapOut, prefix)) return;
      const peerOutSet = peerNeighborCfg.routeMapOut
        ? bgpRouteMapSetRules(peerState, peerNeighborCfg.routeMapOut, prefix)
        : {};

      // AS-loop prevention: drop when our AS already appears in the AS_PATH
      const prepend = peerOutSet.asPathPrepend || [];
      const asPath = isIBgp ? [...prepend] : [peerAs, ...prepend];
      if (asPath.includes(ownAs)) {
        const allowedLoops = myNeighbor.allowAsIn ?? 0;
        const loopCount = asPath.filter(a => a === ownAs).length;
        if (loopCount > allowedLoops) return;
      }

      // Inbound policy applied on receiving router
      if (myNeighbor.routeMapIn && !bgpRouteMapAllows(myState, myNeighbor.routeMapIn, prefix)) return;
      const setRules = myNeighbor.routeMapIn
        ? bgpRouteMapSetRules(myState, myNeighbor.routeMapIn, prefix)
        : {};

      // maximum-prefix inbound guard
      receivedCount += 1;
      if (myNeighbor.maximumPrefix !== undefined && receivedCount > myNeighbor.maximumPrefix) return;

      const nextHop =
        setRules.nextHop ||
        peerOutSet.nextHop ||
        (isIBgp && !myNeighbor.nextHopSelf ? peerState.routerId || myNeighbor.ip : myNeighbor.ip);

      const pathString = prefix.asPath || `${asPath.join(' ')}${asPath.length ? ' ' : ''}i`;

      learned.push({
        destination: prefix.destination,
        subnetMask: prefix.subnetMask,
        nextHop,
        metric: setRules.metric ?? peerOutSet.metric ?? peerNeighborCfg.med ?? prefix.metric ?? 0,
        type: 'dynamic',
        code: 'B',
        administrativeDistance: isIBgp ? 200 : 20,
        asPath: pathString,
        localPreference: setRules.localPreference ?? prefix.localPreference ?? myState.bgpLocalPreference ?? 100,
        weight: setRules.weight ?? prefix.weight ?? myNeighbor.weight ?? 0
      });
    });

    // default-originate
    if (peerNeighborCfg.defaultOriginate && !learned.some(l => l.destination === '0.0.0.0' && l.subnetMask === '0.0.0.0')) {
      learned.push({
        destination: '0.0.0.0',
        subnetMask: '0.0.0.0',
        nextHop: myNeighbor.ip,
        metric: 0,
        type: 'dynamic',
        code: 'B',
        administrativeDistance: isIBgp ? 200 : 20,
        asPath: isIBgp ? 'i' : `${peerAs} i`,
        localPreference: myState.bgpLocalPreference ?? 100,
        weight: myNeighbor.weight ?? 0
      });
    }
  });

  // Deduplicate: prefer most specific prefix (longest mask), then BGP best-path
  // (highest weight > highest local-pref > shortest AS_PATH > lowest MED >
  // eBGP over iBGP > lowest AD).
  const bestByKey = new Map<string, Route>();
  learned.forEach(r => {
    const key = `${r.destination}/${getPrefixLength(r.subnetMask || '255.255.255.255')}`;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, r);
      return;
    }
    const existingLen = getPrefixLength(existing.subnetMask || '255.255.255.255');
    const newLen = getPrefixLength(r.subnetMask || '255.255.255.255');
    if (newLen > existingLen || (newLen === existingLen && bgpBestPath(r, existing))) {
      bestByKey.set(key, r);
    }
  });

  const result = Array.from(bestByKey.values());

  // aggregate-address: add summary routes for prefixes covered by aggregates
  (myState.bgpAggregateAddresses || []).forEach(agg => {
    const aggNum = ipToNumber(agg.network);
    const aggMask = ipToNumber(agg.mask);
    const covered = result.some(r => r.subnetMask && (ipToNumber(r.destination) & aggMask) === (aggNum & aggMask));
    if (covered && !result.some(r => r.destination === agg.network && r.subnetMask === agg.mask)) {
      result.push({
        destination: agg.network,
        subnetMask: agg.mask,
        nextHop: '0.0.0.0',
        metric: 0,
        type: 'dynamic',
        code: 'B',
        administrativeDistance: 200,
        asPath: 'i',
        localPreference: 100
      });
    }
  });

  return result;
}
