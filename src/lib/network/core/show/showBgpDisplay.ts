import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Route } from '../../types';
import { recalculateBgpNeighbors, calculateBgpRoutes } from '../../routing';
import { getPrefixLength } from '../showHelpers';

/**
 * Show IP BGP Summary
 */
export function cmdShowIpBgpSummary(state: SwitchState, _input: string, ctx?: CommandContext): CommandResult {
  let currentState = state;
  if (ctx?.deviceStates && ctx?.sourceDeviceId) {
    const updatedStates = recalculateBgpNeighbors(ctx.deviceStates);
    const updatedMyState = updatedStates.get(ctx.sourceDeviceId);
    if (updatedMyState) {
      currentState = updatedMyState;
    }
  }

  const routerId = currentState.routerId || currentState.defaultGateway || '1.1.1.1';
  const localAs = currentState.bgpAs || 65000;
  const rawNeighbors = currentState.bgpNeighbors;

  const neighborList: Array<{ ip: string; as: string | number; state?: string }> = [];

  if (Array.isArray(rawNeighbors)) {
    rawNeighbors.forEach(n => {
      neighborList.push({
        ip: n.ip,
        as: n.as || n.remoteAs || '65000',
        state: n.state || currentState.bgpNeighborState?.[n.ip]
      });
    });
  } else if (rawNeighbors && typeof rawNeighbors === 'object') {
    Object.entries(rawNeighbors as Record<string, { remoteAs?: number | string; as?: number | string; state?: string }>).forEach(([ip, val]) => {
      neighborList.push({
        ip,
        as: val.as || val.remoteAs || localAs,
        state: val.state || currentState.bgpNeighborState?.[ip]
      });
    });
  }

  if (neighborList.length === 0) {
    return { success: true, output: '\n% BGP is not configured on this device\n' };
  }

  let output = `BGP router identifier ${routerId}, local AS number ${localAs}\n`;
  output += `BGP table version is 1, main routing table version 1\n\n`;
  output += `Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n`;

  neighborList.forEach(n => {
    const nState = n.state || currentState.bgpNeighborState?.[n.ip] || 'Idle';
    output += `${n.ip.padEnd(15)} 4 ${String(n.as).padEnd(12)} 12      12        1    0    0 00:15:20 ${nState}\n`;
  });

  return { success: true, output };
}

/**
 * Show IP BGP Table (optionally filtered by prefix)
 * show ip bgp            — full table
 * show ip bgp <prefix>   — specific prefix detail
 */
export function cmdShowIpBgp(state: SwitchState, input: string, ctx?: CommandContext): CommandResult {
  const routerId = state.routerId || state.defaultGateway || '1.1.1.1';
  const bgpNetworks = state.bgpNetworks || [];
  const dynamicRoutes = state.dynamicRoutes || [];

  // --- Specific prefix query: show ip bgp 192.168.1.0/24 or show ip bgp 192.168.1.0
  const prefixMatch = input.match(/^show\s+ip\s+bgp\s+([0-9.]+(?:\/\d+)?)$/i);
  if (prefixMatch) {
    const prefixQuery = prefixMatch[1].trim().toLowerCase();
    const queryNet = prefixQuery.includes('/') ? prefixQuery.split('/')[0] : prefixQuery;
    const queryLen = prefixQuery.includes('/') ? parseInt(prefixQuery.split('/')[1]) : undefined;

    const allEntries = [
      ...bgpNetworks.map(n => ({
        network: n.network,
        prefixLength: getPrefixLength(n.mask),
        nextHop: '0.0.0.0',
        metric: 0,
        asPath: 'i',
        weight: 32768,
        localPref: 100,
        internal: false,
      })),
      ...(ctx?.deviceStates && ctx?.sourceDeviceId
        ? calculateBgpRoutes(ctx.sourceDeviceId, ctx.deviceStates)
        : dynamicRoutes.filter(r => r.code === 'B')
      ).map((r: Route) => ({
        network: r.destination,
        prefixLength: r.prefixLength || getPrefixLength(r.mask || r.subnetMask || '255.255.255.0'),
        nextHop: r.nextHop || '0.0.0.0',
        metric: r.metric ?? 0,
        asPath: r.asPath || 'i',
        weight: r.weight ?? 0,
        localPref: r.localPreference ?? 100,
        internal: r.administrativeDistance === 200,
      })),
    ];

    const matched = allEntries.filter(e => {
      if (e.network.toLowerCase() !== queryNet) return false;
      if (queryLen !== undefined) return e.prefixLength === queryLen;
      return true;
    });

    if (matched.length === 0) {
      return { success: true, output: `\n% Network not in table: ${prefixQuery}\n` };
    }

    let output = `BGP routing table entry for ${matched[0].network}/${matched[0].prefixLength}, version 1\n`;
    output += `Paths: (${matched.length} available, best #1, table Default-IP-Routing-Table)\n`;
    matched.forEach((e, idx) => {
      const isIbgp = e.internal;
      output += `  ${isIbgp ? 'Local' : e.asPath !== 'i' ? e.asPath : `${state.bgpAs || 65000}`}\n`;
      output += `    ${e.nextHop} from ${e.nextHop} (${routerId})\n`;
      output += `      Origin ${e.asPath === 'i' ? 'IGP' : 'EGP'}, metric ${e.metric}, `;
      output += `localpref ${e.localPref}, weight ${e.weight}`;
      if (idx === 0) output += `, valid, best`;
      output += `\n`;
    });
    void input;
    return { success: true, output };
  }

  const entries: Array<{ network: string; prefixLength: number; nextHop: string; metric: number; asPath?: string; localPref?: number; weight?: number; internal?: boolean }>
    = bgpNetworks.map(n => ({
      network: n.network,
      prefixLength: getPrefixLength(n.mask),
      nextHop: '0.0.0.0',
      metric: 0,
      asPath: 'i',
      weight: 32768,
    }));

  const learnedRoutes = ctx?.deviceStates && ctx?.sourceDeviceId
    ? calculateBgpRoutes(ctx.sourceDeviceId, ctx.deviceStates)
    : dynamicRoutes.filter(r => r.code === 'B');

  learnedRoutes.forEach((r: Route) => {
    if (!bgpNetworks.some(n => n.network === r.destination)) {
      entries.push({
        network: r.destination,
        prefixLength: r.prefixLength || getPrefixLength(r.mask || r.subnetMask || '255.255.255.0'),
        nextHop: r.nextHop || '0.0.0.0',
        metric: r.metric ?? 0,
        asPath: r.asPath || 'i',
        localPref: r.localPreference ?? 100,
        weight: r.weight,
        internal: r.administrativeDistance === 200,
      });
    }
  });

  if (state.routingProtocol === 'bgp') {
    const knownNets = new Set(entries.map(e => e.network));
    dynamicRoutes.forEach(r => {
      if (!knownNets.has(r.destination)) {
        entries.push({
          network: r.destination,
          prefixLength: r.prefixLength || getPrefixLength(r.mask || r.subnetMask || '255.255.255.0'),
          nextHop: r.nextHop || '0.0.0.0',
          metric: r.metric ?? 0,
          asPath: r.asPath || 'i',
          localPref: r.localPreference ?? 100,
        });
      }
    });
  }

  let output = `BGP table version is 1, local router ID ${routerId}\n`;
  output += `Status codes: s suppressed, d damped, h history, * valid, > best, i - internal\n`;
  output += `Origin codes: i - IGP, e - EGP, ? - incomplete\n\n`;
  if (state.bgpLocalPreference !== undefined) {
    output += `BGP default local-preference is ${state.bgpLocalPreference}\n`;
  }
  output += `   Network          Next Hop            Metric LocPrf Weight Path\n`;

  if (entries.length === 0) {
    output += `   No BGP prefixes advertised\n`;
  } else {
    entries.forEach(r => {
      const netStr = `${r.network}/${r.prefixLength}`;
      const nextHop = r.nextHop;
      const metric = r.metric ?? 0;
      const flag = r.internal ? '*>i' : '*>';
      output += `${flag} ${netStr.padEnd(16)} ${String(nextHop).padEnd(20)} ${String(metric).padEnd(5)} ${String(r.localPref ?? 100).padEnd(6)} ${String(r.weight ?? 0).padEnd(6)} ${r.asPath || 'i'}\n`;
    });
  }
  void input;
  return { success: true, output };
}

/**
 * Show IP BGP Neighbors (detailed per neighbor or compact list)
 */
export function cmdShowIpBgpNeighbors(state: SwitchState, input: string, ctx?: CommandContext): CommandResult {
  let currentState = state;
  if (ctx?.deviceStates && ctx?.sourceDeviceId) {
    const updatedStates = recalculateBgpNeighbors(ctx.deviceStates);
    const updatedMyState = updatedStates.get(ctx.sourceDeviceId);
    if (updatedMyState) currentState = updatedMyState;
  }

  const routerId = currentState.routerId || currentState.defaultGateway || '1.1.1.1';
  const localAs = currentState.bgpAs || 65000;
  const neighbors = currentState.bgpNeighbors || [];

  if (neighbors.length === 0) {
    return { success: true, output: '\n% BGP is not configured on this device\n' };
  }

  const specificMatch = input.match(/^show\s+ip\s+bgp\s+neighbors?\s+([0-9.]+)$/i);

  let learnedRoutes: Route[] = [];
  if (ctx?.deviceStates && ctx?.sourceDeviceId) {
    learnedRoutes = calculateBgpRoutes(ctx.sourceDeviceId, ctx.deviceStates);
  }
  const learnedByNeighbor = new Map<string, number>();
  learnedRoutes.forEach((r: Route) => {
    learnedByNeighbor.set(r.nextHop, (learnedByNeighbor.get(r.nextHop) || 0) + 1);
  });

  if (specificMatch) {
    const n = neighbors.find(x => x.ip === specificMatch[1]);
    if (!n) {
      return { success: true, output: `% BGP neighbor ${specificMatch[1]} does not exist\n` };
    }
    const keepalive = n.timersKeepalive ?? 60;
    const holdtime = n.timersHoldtime ?? 180;
    const nState = n.state || currentState.bgpNeighborState?.[n.ip] || 'Idle';
    let output = `BGP neighbor is ${n.ip}, remote AS ${n.as}${n.as === localAs ? ', internal link' : ', external link'}\n`;
    output += `  BGP version 4, remote router ID ${routerId}\n`;
    output += `  BGP state = ${nState}, up for 00:15:20\n`;
    output += `  Last read 00:00:${Math.max(1, keepalive - 20)}, hold time is ${holdtime}, keepalive interval is ${keepalive} seconds\n`;
    if (n.description) output += `  Description: ${n.description}\n`;
    if (n.shutdown) output += `  Administratively shut down\n`;
    if (n.updateSource) output += `  Update source is ${n.updateSource}\n`;
    if (n.ebgpMultihop !== undefined) output += `  External BGP multihop: ${n.ebgpMultihop} hops\n`;
    if (n.password) output += `  Message Digest based authentication enabled\n`;
    if (n.nextHopSelf) output += `  Next-hop-self is enabled\n`;
    if (n.defaultOriginate) output += `  Default information originate is enabled\n`;
    if (n.routeReflectorClient) output += `  Route-Reflector Client, cluster-id ${currentState.bgpClusterId || routerId}\n`;
    if (n.maximumPrefix !== undefined) output += `  Maximum prefixes allowed: ${n.maximumPrefix}\n`;
    if (n.allowAsIn !== undefined) output += `  Allow AS in: ${n.allowAsIn}\n`;
    if (n.sendCommunity) output += `  Community attribute sent to this neighbor\n`;
    if (n.removePrivateAs) output += `  Private AS numbers are removed before sending updates\n`;
    if (n.asOverride) output += `  AS override enabled\n`;
    if (n.softReconfiguration) output += `  Inbound soft reconfiguration allowed\n`;
    if (n.routeMapIn) output += `  Incoming update route-map filter is ${n.routeMapIn}\n`;
    if (n.routeMapOut) output += `  Outgoing update route-map filter is ${n.routeMapOut}\n`;
    if (n.weight !== undefined) output += `  BGP weight is ${n.weight}\n`;
    if (n.med !== undefined) output += `  MED is ${n.med}\n`;
    output += `  Received prefix count: ${learnedByNeighbor.get(n.ip) || 0}\n`;
    return { success: true, output };
  }

  let output = `BGP neighbor summary for router ${routerId}, local AS ${localAs}\n\n`;
  output += `Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n`;
  neighbors.forEach(n => {
    const nState = n.state || currentState.bgpNeighborState?.[n.ip] || 'Idle';
    const received = learnedByNeighbor.get(n.ip) || 0;
    const stateField = nState === 'Established' ? String(received) : nState;
    output += `${n.ip.padEnd(15)} 4 ${String(n.as).padEnd(12)} 12      12        1    0    0 00:15:20 ${stateField}\n`;
  });

  return { success: true, output };
}
