import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Route } from '../../types';
import { getPrefixLength, formatPortName } from '../showHelpers';
import { isTrackedRouteActive } from '../../routing';

function routeInlineAd(route: Route): number {
  const extra = route as Route & { distance?: number; ad?: number };
  return route.administrativeDistance ?? extra.distance ?? extra.ad ?? 1;
}

/**
 * Show IP Route
 */
export function cmdShowIpRoute(
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult {
  let output = '\n';

  if (!state.ipRouting) {
    output += '% IP routing is not enabled\n';
    return { success: true, output };
  }

  const rest = input.replace(/^show\s+ip\s+route/i, '').trim();
  const tokens = rest.split(/\s+/).filter(Boolean);
  let filter: string | undefined;
  let lookupIp: string | undefined;
  let lookupMask: string | undefined;
  if (tokens.length > 0) {
    const first = tokens[0].toLowerCase();
    if (['ospf', 'eigrp', 'rip', 'static', 'connected'].includes(first)) {
      filter = first;
    } else if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(first)) {
      const cidr = first.match(/^(\d{1,3}(\.\d{1,3}){3})\/(\d{1,2})$/);
      if (cidr) {
        lookupIp = cidr[1];
        lookupMask = prefixLenToMask(parseInt(cidr[3], 10));
      }
    } else if (/^\d{1,3}(\.\d{1,3}){3}$/.test(first)) {
      lookupIp = first;
      if (tokens.length >= 2 && /^\d{1,3}(\.\d{1,3}){3}$/.test(tokens[1])) {
        lookupMask = tokens[1];
      }
    }
  }

  if (lookupIp) {
    return showRouteLookup(state, ctx, lookupIp, lookupMask);
  }

  output += 'Codes: C - connected, S - static, I - IGRP, R - RIP, M - mobile, B - BGP\n';
  output += '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area\n';
  output += '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2\n';
  output += '       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP\n';
  output += '       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area\n';
  output += '       * - candidate default, U - per-user static route, o - ODR\n';
  output += '       P - periodic downloaded static route\n';
  output += '\n';
  output += 'Gateway of last resort is not set\n\n';

  let hasConnectedRoutes = false;
  if (!filter || filter === 'connected') {
    Object.keys(state.ports || {}).forEach(portName => {
      const port = state.ports[portName];
      if (port.ipAddress && port.subnetMask && !port.shutdown) {
        hasConnectedRoutes = true;
        const prefixLength = getPrefixLength(port.subnetMask);
        const networkAddress = getNetworkAddress(port.ipAddress, port.subnetMask);
        const formattedPortName = formatPortName(portName);
        output += `C     ${networkAddress}/${prefixLength} is directly connected, ${formattedPortName}\n`;
      }
    });

    const connections = ctx.connections || [];
    const sourceDeviceId = ctx.sourceDeviceId as string;
    const devices = ctx.devices || [];

    if (connections && connections.length > 0) {
      connections.forEach((conn) => {
        if (conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId) {
          const isSource = conn.sourceDeviceId === sourceDeviceId;
          const localPort = isSource ? conn.sourcePort : conn.targetPort;
          const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;

          const connectedDevice = devices.find((d) => d.id === connectedDeviceId);

          if (connectedDevice?.ip && connectedDevice?.subnet) {
            const prefixLength = getPrefixLength(connectedDevice.subnet);
            const networkAddress = getNetworkAddress(connectedDevice.ip, connectedDevice.subnet);
            const formattedPortName = formatPortName(localPort);
            output += `C     ${networkAddress}/${prefixLength} is directly connected, ${formattedPortName}\n`;
            hasConnectedRoutes = true;
          }
        }
      });
    }
  }

  if (!filter || filter === 'static') {
    if (state.staticRoutes && state.staticRoutes.length > 0) {
      state.staticRoutes.filter((route: Route) => isTrackedRouteActive(state, route)).forEach((route) => {
        const mask = route.mask || route.subnetMask;
        const network = route.network || route.destination;
        if (mask && network) {
          const prefixLength = getPrefixLength(mask);
          const ad = routeInlineAd(route);
          const metric = route.metric ?? 0;
          const outInt = route.interface ? formatPortName(route.interface) : '';
          const trackPart = route.trackId !== undefined ? `, track ${route.trackId}` : '';
          if (route.nextHop) {
            output += `S     ${network}/${prefixLength} [${ad}/${metric}] via ${route.nextHop}${outInt ? `, ${outInt}` : ''}${trackPart}\n`;
          } else if (outInt) {
            output += `S     ${network}/${prefixLength} is directly connected, ${outInt}${trackPart}\n`;
          }
        }
      });
    }
  }

  if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
    state.dynamicRoutes.forEach((route) => {
      const mask = route.mask || route.subnetMask;
      const network = route.network || route.destination;
      if (mask && network) {
        const prefixLength = getPrefixLength(mask);
        let code = 'R';
        let ad = 120;
        let protocol = 'rip';
        if (state.routingProtocol === 'ospf') {
          const myAreas = (state.dynamicRoutes || []).map(r => r.area).filter(a => a !== undefined);
          if (state.ospfAreas) state.ospfAreas.forEach(a => myAreas.push(a));
          const isInterArea = route.area !== undefined && !myAreas.includes(route.area);
          code = isInterArea ? 'O IA' : 'O';
          ad = 110;
          protocol = 'ospf';
        }
        else if (state.routingProtocol === 'eigrp') { code = 'D'; ad = 90; protocol = 'eigrp'; }
        else if (state.routingProtocol === 'bgp') { code = 'B'; ad = 20; protocol = 'bgp'; }

        if (!filter || filter === protocol) {
          const metric = route.metric || 1;
          const outInt = route.interface ? formatPortName(route.interface) : '';
          output += `${code.padEnd(6)}${network}/${prefixLength} [${ad}/${metric}] via ${route.nextHop}, 00:00:11${outInt ? `, ${outInt}` : ''}\n`;
        }
      }
    });
  }

  if (!hasConnectedRoutes && (!state.staticRoutes || state.staticRoutes.length === 0) && (!state.dynamicRoutes || state.dynamicRoutes.length === 0)) {
    output += 'No routes in routing table\n';
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show IPv6 Route
 */
export function cmdShowIpv6Route(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n';

  if (!state.ipv6Enabled) {
    output += '% IPv6 routing is not enabled\n';
    return { success: true, output };
  }

  const routes: string[] = [];

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.ipv6Address && port.ipv6Prefix && !port.shutdown) {
      routes.push(`C   ${port.ipv6Address}/${port.ipv6Prefix} [0/0]\n     via ${portName}, directly connected`);
      routes.push(`L   ${port.ipv6Address}/128 [0/0]\n     via ${portName}, receive`);
    }
  });

  if (state.ipv6StaticRoutes && state.ipv6StaticRoutes.length > 0) {
    state.ipv6StaticRoutes.forEach((route: Route) => {
      const metric = route.metric || 1;
      routes.push(`S   ${route.destination}/${route.prefixLength} [${metric}/0]\n     via ${route.nextHop}`);
    });
  }

  if (state.ipv6DynamicRoutes && state.ipv6DynamicRoutes.length > 0) {
    state.ipv6DynamicRoutes.forEach((route: Route) => {
      const metric = route.metric || 1;
      const code = state.routingProtocol === 'ospfv3' ? 'O' : 'R';
      routes.push(`${code}   ${route.destination}/${route.prefixLength} [${code === 'O' ? 110 : 120}/${metric}]\n     via ${route.nextHop}`);
    });
  }

  output += `IPv6 Routing Table - default - ${routes.length} entries\n`;
  output += 'Codes: C - Connected, L - Local, S - Static, U - Per-user Static route\n';
  output += '       B - BGP, R - RIP, I1 - ISIS L1, I2 - IS-IS L2\n';
  output += '       IA - IS-IS interarea, IS - IS-IS summary, D - EIGRP, EX - EIGRP external\n';
  output += '       O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2\n';
  output += '       ON1 - OSPF NSSA ext 1, ON2 - OSPF NSSA ext 2\n\n';

  if (routes.length === 0) {
    output += 'No IPv6 routes found\n';
  } else {
    output += routes.join('\n') + '\n';
  }

  return { success: true, output };
}

import { getNetworkAddress, isIpInNetwork } from '../showHelpers';
import { findRouteDetailed } from '../../routing';

function prefixLenToMask(prefixLength: number): string {
  const int = prefixLength === 0 ? 0 : (~0 >>> 0) ^ ((1 << (32 - Math.min(prefixLength, 32))) - 1);
  return `${(int >>> 24) & 255}.${(int >>> 16) & 255}.${(int >>> 8) & 255}.${int & 255}`;
}

function collectRouteCandidates(state: SwitchState, ctx: CommandContext): Route[] {
  const candidates: Route[] = [];

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.ipAddress && port.subnetMask && !port.shutdown) {
      candidates.push({
        destination: getNetworkAddress(port.ipAddress, port.subnetMask),
        subnetMask: port.subnetMask,
        nextHop: portName,
        interface: portName,
        type: 'connected',
        metric: 0,
        code: 'C',
      });
    }
  });

  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId as string;
  const devices = ctx.devices || [];
  if (connections.length > 0 && sourceDeviceId) {
    connections.forEach((conn) => {
      if (conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId) {
        const isSource = conn.sourceDeviceId === sourceDeviceId;
        const localPort = isSource ? conn.sourcePort : conn.targetPort;
        const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
        const connectedDevice = devices.find((d) => d.id === connectedDeviceId);
        if (connectedDevice?.ip && connectedDevice?.subnet) {
          candidates.push({
            destination: getNetworkAddress(connectedDevice.ip, connectedDevice.subnet),
            subnetMask: connectedDevice.subnet,
            nextHop: localPort,
            interface: localPort,
            type: 'connected',
            metric: 0,
            code: 'C',
          });
        }
      }
    });
  }

  (state.staticRoutes || []).filter((route: Route) => isTrackedRouteActive(state, route)).forEach((route: Route) => {
    const mask = route.mask || route.subnetMask;
    const network = route.network || route.destination;
    if (mask && network) {
      const ad = routeInlineAd(route);
      candidates.push({
        destination: network,
        subnetMask: mask,
        nextHop: route.nextHop,
        interface: route.interface,
        type: 'static',
        metric: route.metric ?? 0,
        administrativeDistance: ad,
        code: 'S',
      });
    }
  });

  (state.dynamicRoutes || []).forEach((route: Route) => {
    const mask = route.mask || route.subnetMask;
    const network = route.network || route.destination;
    if (mask && network) {
      let code = 'R';
      let ad = 120;
      if (state.routingProtocol === 'ospf') {
        const myAreas = (state.dynamicRoutes || []).map(r => r.area).filter((a: number | undefined) => a !== undefined);
        if (state.ospfAreas) state.ospfAreas.forEach(a => myAreas.push(a));
        const isInterArea = route.area !== undefined && !myAreas.includes(route.area);
        code = isInterArea ? 'O IA' : 'O';
        ad = 110;
      } else if (state.routingProtocol === 'eigrp') {
        code = 'D';
        ad = 90;
      } else if (state.routingProtocol === 'bgp') {
        code = 'B';
        ad = 20;
      }
      candidates.push({
        destination: network,
        subnetMask: mask,
        nextHop: route.nextHop,
        interface: route.interface,
        type: 'dynamic',
        metric: route.metric || 1,
        administrativeDistance: ad,
        code,
      });
    }
  });

  return candidates;
}

function showRouteLookup(state: SwitchState, ctx: CommandContext, lookupIp: string, lookupMask?: string): CommandResult {
  const candidates = collectRouteCandidates(state, ctx);
  let output = '\n';

  if (lookupMask) {
    const exact = candidates.find(r => {
      const prefixLength = getPrefixLength(r.subnetMask);
      return r.destination.toLowerCase() === lookupIp && getPrefixLength(lookupMask) === prefixLength && getNetworkAddress(lookupIp, lookupMask).toLowerCase() === r.destination.toLowerCase();
    });
    if (!exact) {
      output += `% Network not in table\n`;
      return { success: true, output };
    }
    const prefixLength = getPrefixLength(exact.subnetMask);
    const routeLabel = routeCodeLabel(exact);
    output += `Routing entry for ${exact.destination}/${prefixLength}\n`;
    output += `  Known via "${routeLabel}", distance ${routeAd(exact)}, metric ${routeMetric(exact)}\n`;
    const hopText = routeHopText(exact);
    if (hopText.intf) output += `  Last update from ${hopText.hop}${hopText.intf ? `, ${hopText.intf}` : ''}\n`;
    output += `  Routing Descriptor Blocks:\n`;
    output += `  * ${exact.destination}/${prefixLength}, ${hopText.line}\n`;
    output += `      Route metric is ${routeMetric(exact)}, traffic share count is 1\n`;
    output += `  Decision: exact match on ${exact.destination}/${prefixLength}; source "${routeLabel}", AD ${routeAd(exact)}, metric ${routeMetric(exact)}, next-hop ${hopText.hop}\n`;
    return { success: true, output };
  }

  const matchedCandidates = candidates.filter(r => {
    if (!r.subnetMask) return false;
    return isIpInNetwork(lookupIp, r.destination, r.subnetMask);
  });

  const detailed = findRouteDetailed(lookupIp, candidates);
  if (!detailed) {
    output += `% Network not in table\n`;
    output += `  No route matched ${lookupIp} across ${candidates.length} candidate route(s); longest-prefix lookup returned no match.\n`;
    return { success: true, output };
  }

  const route = detailed.route;
  const routeLabel = routeCodeLabel(route);
  const hopText = routeHopText(route);
  const prefixLength = getPrefixLength(route.subnetMask);
  output += `Routing entry for ${route.destination}/${prefixLength}\n`;
  output += `  Known via "${routeLabel}", distance ${detailed.administrativeDistance}, metric ${detailed.metric}\n`;
  const lastUpdate = route.type === 'connected' ? 'directly connected' : (route.nextHop || '(no next hop)');
  output += `  Last update from ${lastUpdate}${route.type !== 'connected' && hopText.intf ? `, ${hopText.intf}` : ''}\n`;
  output += `  Routing Descriptor Blocks:\n`;
  if (route.type === 'connected') {
    output += `  * ${route.destination}/${prefixLength} is directly connected, ${hopText.hop}\n`;
  } else {
    output += `  * ${route.destination}/${prefixLength}, ${hopText.line}\n`;
  }
  output += `      Route metric is ${detailed.metric}, traffic share count is 1\n`;
  output += `  Decision: longest-prefix match selected ${route.destination}/${prefixLength} (${matchedCandidates.length}/${candidates.length} candidate route(s) matched ${lookupIp});\n`;
  output += `    source "${routeLabel}", AD ${detailed.administrativeDistance}, metric ${detailed.metric}, next-hop ${hopText.hop}${hopText.intf ? ` on ${hopText.intf}` : ''}\n`;
  output += `    Selection order: longest prefix match, then lowest administrative distance, then lowest metric.\n`;
  return { success: true, output };
}

function routeCodeLabel(route: Route): string {
  if (route.type === 'connected') return 'connected';
  if (route.type === 'static') return 'static';
  if (route.code?.startsWith('O')) return 'ospf';
  if (route.code === 'D' || route.code === 'EX') return 'eigrp';
  if (route.code === 'R') return 'rip';
  if (route.code === 'B') return 'bgp';
  return route.code || 'dynamic';
}

function routeAd(route: Route): number {
  if (route.type === 'connected') return 0;
  if (route.type === 'static') return route.administrativeDistance ?? 1;
  if (route.code?.startsWith('O')) return 110;
  if (route.code === 'D' || route.code === 'EX') return 90;
  if (route.code === 'R') return 120;
  if (route.code === 'B') return 20;
  return route.administrativeDistance ?? 110;
}

function routeMetric(route: Route): number {
  return route.metric ?? 0;
}

function routeHopText(route: Route): { hop: string; intf?: string; line: string } {
  const isIpNextHop = /^\d{1,3}(\.\d{1,3}){3}$/.test(route.nextHop || '');
  const via = isIpNextHop ? route.nextHop : formatPortName(route.nextHop || '');
  if (route.type === 'connected') {
    return { hop: via, line: `via ${via}, directly connected` };
  }
  if (isIpNextHop) {
    const intf = route.interface ? formatPortName(route.interface) : undefined;
    return { hop: via, intf, line: `via ${via}${intf ? `, ${intf}` : ''}` };
  }
  const intf = via;
  return { hop: intf, intf, line: `is directly connected, ${intf}` };
}
