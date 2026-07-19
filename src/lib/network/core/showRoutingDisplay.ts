import type { CommandContext } from './commandTypes';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import type { SwitchState, CommandResult, Route, Port } from '../types';
import { buildOSPFLinkStateDatabase } from '../ospf';
import { ensureDeviceStatesMap } from '../networkUtils';
import {
  getPrefixLength, getNetworkAddress, formatPortName, isIpInNetwork, getSTPCost,
} from './showHelpers';

/**
 * Show IP OSPF Interface
 */
export function cmdShowIpOspfInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const match = input.match(/show\s+ip\s+ospf\s+interface\s*(\S+)?/i);
  const interfaceName = match?.[1];

  let output = '\n';

  const portEntries = interfaceName
    ? (state.ports?.[interfaceName.toLowerCase()] ? [[interfaceName.toLowerCase(), state.ports[interfaceName.toLowerCase()]]] : [])
    : Object.entries(state.ports || {});

  if (interfaceName && portEntries.length === 0) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  let found = false;
  (portEntries as [string, Port][]).forEach(([name, port]) => {
    if (port.ipAddress && !port.shutdown) {
      found = true;
      output += `${name} is up, line protocol is up\n`;
      output += `  Internet Address ${port.ipAddress}/${getPrefixLength(port.subnetMask)}, Area 0\n`;
      output += `  Process ID 1, Router ID ${state.ip || '192.168.1.1'}, Network Type BROADCAST, Cost: ${getSTPCost(port)}\n`;
      output += `  Transmit Delay is 1 sec, State DR, Priority 1\n`;
      output += `  Designated Router (ID) ${state.ip || '192.168.1.1'}, Interface address ${port.ipAddress}\n`;
      output += `  Backup Designated router (ID) 0.0.0.0, Interface address 0.0.0.0\n`;
      output += `  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5\n`;
      output += `    Hello due in 00:00:07\n`;
      output += `  Index 1/1, flood queue length 0\n`;
      output += `  Next 0x0(0)/0x0(0)\n`;
      output += `  Last flood scan length is 0, maximum is 0\n`;
      output += `  Last flood scan time is 0 msec, maximum is 0 msec\n`;
      output += `  Neighbor Count is 0, Adjacent neighbor count is 0\n`;
      output += `  Suppress hello for 0 neighbor(s)\n\n`;
    }
  });

  if (!found) {
    output += '% OSPF not enabled on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show Standby - Display HSRP status
 */
export function cmdShowStandby(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n';
  let found = false;

  Object.entries(state.ports || {}).forEach(([portName, port]: [string, Port]) => {
    if (port.hsrp?.groups) {
      found = true;
      Object.entries(port.hsrp.groups).forEach(([groupId, config]) => {
        output += `${portName} - Group ${groupId}\n`;
        output += `  State is ${config.state || 'Active'}\n`;
        output += `  Virtual IP address is ${config.virtualIp || 'unknown'}\n`;
        output += `  Active virtual MAC address is 0000.0c07.ac${parseInt(groupId).toString(16).padStart(2, '0')}\n`;
        output += `  Local virtual MAC address is 0000.0c07.ac${parseInt(groupId).toString(16).padStart(2, '0')} (v1 default)\n`;
        output += `  Hello time 3 sec, hold time 10 sec\n`;
        output += `  Next hello sent in 1.234 secs\n`;
        output += `  Preemption ${config.preempt ? 'enabled' : 'disabled'}\n`;
        output += `  Active router is local\n`;
        output += `  Standby router is unknown\n`;
        output += `  Priority ${config.priority ?? 100} (configured ${config.priority ?? 100})\n`;
        output += `  Group name is "hsrp-${portName}-${groupId}" (default)\n`;
      });
    }
  });

  if (!found) {
    output += '% HSRP not configured on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show IP NAT Translations
 */
export function cmdShowIpNatTranslations(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nPro Inside global      Inside local       Outside local      Outside global\n';
  const translations = state.natTranslations || [];
  const staticTranslations = state.natStaticTranslations || [];

  staticTranslations.forEach(t => {
    output += `--- ${t.globalIp.padEnd(18)} ${t.localIp.padEnd(18)} ---                ---\n`;
  });

  translations.forEach(t => {
    const proto = t.protocol || 'tcp';
    output += `${proto.toLowerCase().padEnd(3)} ${t.globalIp}:${t.globalPort}`.padEnd(23);
    output += ` ${t.localIp}:${t.localPort}`.padEnd(19);
    output += ` ${t.remoteIp || '---'}:${t.remotePort || '---'}`.padEnd(19);
    output += ` ${t.remoteIp || '---'}:${t.remotePort || '---'}\n`;
  });

  if (staticTranslations.length === 0 && translations.length === 0) {
    output = '\n% No NAT translations active\n';
  }

  return { success: true, output };
}

/**
 * Show IP NAT Statistics
 */
export function cmdShowIpNatStatistics(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nTotal active translations: ' + (state.natTranslations?.length || 0) + ' (0 static, 0 dynamic; 0 extended)\n';
  output += 'Peak translations: 0, occurred 00:00:00 ago\n';
  output += 'Outside interfaces:\n';
  Object.keys(state.ports).forEach(pId => {
    if (state.ports[pId].natSide === 'outside') output += `  ${pId}\n`;
  });
  output += 'Inside interfaces:\n';
  Object.keys(state.ports).forEach(pId => {
    if (state.ports[pId].natSide === 'inside') output += `  ${pId}\n`;
  });
  output += 'Hits: 0  Misses: 0\n';
  output += 'CEF Translated packets: 0, CEF Punted packets: 0\n';
  output += 'Expired translations: 0\n';
  output += 'Dynamic mappings:\n';
  (state.natDynamicRules || []).forEach(r => {
    output += `-- Inside Source\n`;
    output += `   access-list ${r.aclId} interface ${r.interface || 'pool ' + r.poolName} refcount 0\n`;
  });

  return { success: true, output };
}

/**
 * Show Hosts - Display DNS host mapping
 */
export function cmdShowHosts(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nDefault domain is not set\n';
  output += 'Name servers are unassigned\n\n';
  output += 'Host                      Address\n';

  const records = state.services?.dns?.records || [];
  if (records.length === 0) {
    output += '(No host mappings configured)\n';
  } else {
    records.forEach((record: { domain: string; address: string }) => {
      output += `${record.domain.padEnd(25)} ${record.address}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
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

  // Parse filter
  const match = input.match(/show\s+ip\s+route\s*(ospf|eigrp|rip|static|connected)?/i);
  const filter = match?.[1]?.toLowerCase();

  output += 'Codes: C - connected, S - static, I - IGRP, R - RIP, M - mobile, B - BGP\n';
  output += '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area\n';
  output += '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2\n';
  output += '       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP\n';
  output += '       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area\n';
  output += '       * - candidate default, U - per-user static route, o - ODR\n';
  output += '       P - periodic downloaded static route\n';
  output += '\n';
  output += 'Gateway of last resort is not set\n\n';

  // Connected routes - show network address instead of interface IP
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

    // Add routes to connected networks via topology
    const connections = ctx.connections || [];
    const sourceDeviceId = ctx.sourceDeviceId as string;
    const devices = ctx.devices || [];

    if (connections && connections.length > 0) {
      connections.forEach((conn: CanvasConnection) => {
        if (conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId) {
          const isSource = conn.sourceDeviceId === sourceDeviceId;
          const localPort = isSource ? conn.sourcePort : conn.targetPort;
          const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;

          const connectedDevice = devices.find((d: CanvasDevice) => d.id === connectedDeviceId);

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

  // Static routes
  if (!filter || filter === 'static') {
    if (state.staticRoutes && state.staticRoutes.length > 0) {
      state.staticRoutes.forEach((route) => {
        const mask = route.mask || route.subnetMask;
        const network = route.network || route.destination;
        if (mask && network) {
          const prefixLength = getPrefixLength(mask);
          const metric = route.metric || 1;
          output += `S     ${network}/${prefixLength} [${metric}/0] via ${route.nextHop}${route.interface ? ` ${route.interface}` : ''}\n`;
        }
      });
    }
  }

  // Dynamic routes (RIP, OSPF, EIGRP, BGP)
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
          output += `${code.padEnd(6)}${network}/${prefixLength} [${ad}/${metric}] via ${route.nextHop}, 00:00:11, ${route.interface || ''}\n`;
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
 * Show IP Protocols
 */
export function cmdShowIpProtocols(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!state.routingProtocol) {
    return { success: true, output: '\n% No routing protocols configured\n' };
  }

  let output = '\n';
  if (state.routingProtocol === 'ospf') {
    const processId = state.ospfProcessId || 1;
    const routerId = state.ospfRouterId || state.ip || '192.168.1.1';
    const areas = new Set<number>();
    if (state.dynamicRoutes) state.dynamicRoutes.forEach(r => { if (r.area !== undefined) areas.add(r.area); });
    if (state.ospfAreas) state.ospfAreas.forEach(a => areas.add(a));
    const areaCount = areas.size || 1;

    output += `Routing Protocol is "ospf ${processId}"\n`;
    output += '  Outgoing update filter list for all interfaces is not set\n';
    output += '  Incoming update filter list for all interfaces is not set\n';
    output += `  Router ID ${routerId}\n`;
    if (state.isAbr) output += '  It is an area border router\n';
    let normalCount = 0, stubCount = 0, totallyStubCount = 0, nssaCount = 0, totallyNssaCount = 0;
    areas.forEach(a => {
      const aStr = String(a);
      if (state.ospfTotallyNssaAreas?.includes(aStr)) totallyNssaCount++;
      else if (state.ospfNssaAreas?.includes(aStr)) nssaCount++;
      else if (state.ospfTotallyStubAreas?.includes(aStr)) totallyStubCount++;
      else if (state.ospfStubAreas?.includes(aStr)) stubCount++;
      else normalCount++;
    });
    output += `  Number of areas in this router is ${areaCount}. ${normalCount} normal ${stubCount + totallyStubCount} stub ${nssaCount + totallyNssaCount} nssa\n`;
    output += '  Maximum path: 4\n';
    output += '  Routing for Networks:\n';
    if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
      state.dynamicRoutes.forEach((route) => {
        if (route.network && route.mask) {
          // Wildcard mask approximation from subnet
          const wildcard = route.mask.split('.').map((p: string) => 255 - parseInt(p)).join('.');
          output += `    ${route.network} ${wildcard} area ${route.area || 0}\n`;
        }
      });
    } else {
      output += '    (No networks advertised)\n';
    }
    output += '  Routing Information Sources:\n';
    output += '    Gateway         Distance      Last Update\n';
    if (state.dynamicRoutes) {
      state.dynamicRoutes.forEach((route: Route) => {
        if (route.nextHop) {
          output += `    ${route.nextHop.padEnd(15)} 110           00:00:15\n`;
        }
      });
    }
    output += '  Distance: (default is 110)\n';
  } else if (state.routingProtocol === 'eigrp') {
    const asNum = state.eigrpAs || 1;
    output += `Routing Protocol is "eigrp ${asNum}"\n`;
    output += '  Outgoing update filter list for all interfaces is not set\n';
    output += '  Incoming update filter list for all interfaces is not set\n';
    output += '  Default networks accepted in routing updates\n';
    output += '  Default networks will not be sent in routing updates\n';
    output += `  EIGRP-IPv4 Protocol for AS(${asNum})\n`;
    output += '    Metric weight K1=1, K2=0, K3=1, K4=0, K5=0\n';
    output += '    NSF-aware route hold timer is 240\n';
    output += `    Router-ID: ${state.ospfRouterId || state.ip || '10.0.0.1'}\n`;
    output += '    Topology : 0 (base)\n';
    output += '      Active Timer: 3 min\n';
    output += '      Distance: internal 90 external 170\n';
    output += '      Maximum path: 4\n';
    output += '      Maximum hopcount 100\n';
    output += '      Maximum metric variance 1\n';
  } else {
    output += `Routing Protocol is "${state.routingProtocol}"\n`;
    output += '  No detailed information available for this protocol.\n';
  }

  return { success: true, output };
}

/**
 * Show IP OSPF Neighbor
 */
export function cmdShowIpOspfNeighbor(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  let output = '\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n';

  // Simulate neighbors from dynamic routes
  if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
    const neighborMap = new Map<string, { address: string; intf: string; routerId: string }>();
    state.dynamicRoutes.forEach((r) => {
      if (r.nextHop && !neighborMap.has(r.nextHop)) {
        const routerId = `10.0.0.${Math.floor(Math.random() * 254) + 1}`;
        const address = r.nextHop;
        const intf = r.interface || 'FastEthernet0/0';
        neighborMap.set(r.nextHop, { address, intf, routerId });
      }
    });

    const neighborStates = ['FULL/DR', 'FULL/BDR', 'FULL/DROTHER', '2WAY/DROTHER', 'FULL/  -  ', 'INIT/  -  '];
    neighborMap.forEach((neighbor) => {
      const deadTimer = `00:00:${String(Math.floor(Math.random() * 35) + 2).padStart(2, '0')}`;
      const stateStr = neighborStates[Math.floor(Math.random() * neighborStates.length)];
      output += `${neighbor.routerId.padEnd(15)} 1     ${stateStr.padEnd(15)} ${deadTimer}    ${neighbor.address.padEnd(15)} ${neighbor.intf}\n`;
    });
  }

  if (output === '\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n') {
    output += '(no neighbors found)\n';
  }

  return { success: true, output };
}

/**
 * Show IP OSPF Database
 */
export function cmdShowIpOspfDatabase(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const routerId = state.ospfRouterId || state.ip || '192.168.1.1';
  const areas = state.ospfAreas || [0];
  const deviceStates = ensureDeviceStatesMap(ctx.deviceStates);

  // Real LSDB build for OSPF
  const lsdb = buildOSPFLinkStateDatabase(deviceStates);

  let output = '\n            OSPF Router with ID (' + routerId + ') (Process ID 1)\n\n';

  areas.forEach(area => {
    const areaData = lsdb[area];
    if (!areaData) return;

    output += `                Router Link States (Area ${area})\n\n`;
    output += 'Link ID         ADV Router      Age         Seq#       Checksum Link count\n';

    areaData.routerLSAs.forEach((lsa) => {
      output += `${lsa.id.padEnd(15)} ${lsa.advRouter.padEnd(15)} ${lsa.ageNumber.toString().padEnd(11)} 0x80000001 0x0000   ${lsa.links.length}\n`;
    });

    if (areaData.summaryLSAs.size > 0) {
      output += `\n                Summary Net Link States (Area ${area})\n\n`;
      output += 'Link ID         ADV Router      Age         Seq#       Checksum\n';
      areaData.summaryLSAs.forEach((lsa) => {
        output += `${lsa.id.padEnd(15)} ${lsa.advRouter.padEnd(15)} ${lsa.ageNumber.toString().padEnd(11)} 0x80000001 0x0000\n`;
      });
    }
  });

  return { success: true, output };
}

/**
 * Show IP OSPF
 */
export function cmdShowIpOspf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const processId = state.ospfProcessId || 1;
  const routerId = state.ospfRouterId || state.ip || '192.168.1.1';
  const areas = new Set<number>();
  if (state.dynamicRoutes) state.dynamicRoutes.forEach(r => { if (r.area !== undefined) areas.add(r.area); });
  if (state.ospfAreas) state.ospfAreas.forEach(a => areas.add(a));
  const areaCount = areas.size || 1;

  let output = `\n Routing Process "ospf ${processId}" with ID ${routerId}\n`;
  if (state.isAbr) output += ' It is an area border router\n';
  output += ' Start time: 00:00:01.000, Time elapsed: 00:02:15.000\n';
  output += ' Supports only single TOS(TOS0) routes\n';
  output += ' Supports opaque LSA\n';
  output += ' Supports Link-local Signaling (LLS)\n';
  output += ' Supports area transit capability\n';
  output += ' Initial SPF schedule delay 5000 msecs\n';
  output += ' Minimum hold time between two consecutive SPFs 10000 msecs\n';
  output += ' Maximum wait time between two consecutive SPFs 10000 msecs\n';
  output += ' Incremental-SPF disabled\n';
  output += ' Minimum LSA interval 5 secs\n';
  output += ' Minimum LSA arrival 1000 msecs\n';
  output += ' LSA group pacing timer 240 secs\n';
  output += ' Interface flood pacing timer 33 msecs\n';
  output += ' Retransmission pacing timer 66 msecs\n';
  output += ' Number of external LSA 0. Checksum Sum 0x000000\n';
  output += ' Number of opaque AS LSA 0. Checksum Sum 0x000000\n';
  output += ' Number of DCbitless external and opaque AS LSA 0\n';
  output += ' Number of DoNotAge external and opaque AS LSA 0\n';
  let normalCount = 0, stubCount = 0, totallyStubCount = 0, nssaCount = 0, totallyNssaCount = 0;
  areas.forEach(a => {
    const aStr = String(a);
    if (state.ospfTotallyNssaAreas?.includes(aStr)) totallyNssaCount++;
    else if (state.ospfNssaAreas?.includes(aStr)) nssaCount++;
    else if (state.ospfTotallyStubAreas?.includes(aStr)) totallyStubCount++;
    else if (state.ospfStubAreas?.includes(aStr)) stubCount++;
    else normalCount++;
  });
  output += ` Number of areas in this router is ${areaCount}. ${normalCount} normal ${stubCount + totallyStubCount} stub ${nssaCount + totallyNssaCount} nssa\n`;
  output += ' Number of areas transit capable is 0\n';
  output += ' External flood list length 0\n';
  output += ' IETF NSF helper support enabled\n';
  output += ' Reference bandwidth unit is 100 mbps\n';

  Array.from(areas).forEach(area => {
    const aStr = String(area);
    let areaTypeStr = 'normal';
    if (state.ospfTotallyNssaAreas?.includes(aStr)) areaTypeStr = 'totally nssa';
    else if (state.ospfNssaAreas?.includes(aStr)) areaTypeStr = 'nssa';
    else if (state.ospfTotallyStubAreas?.includes(aStr)) areaTypeStr = 'totally stubby';
    else if (state.ospfStubAreas?.includes(aStr)) areaTypeStr = 'stub';

    output += `    Area ${area === 0 ? 'BACKBONE(0)' : area}\n`;
    output += `        Number of interfaces in this area is 1\n`;
    output += `        It is a ${areaTypeStr} area\n`;
    output += `        Area has no authentication\n`;
    output += `        SPF algorithm last executed 00:01:15.000 ago\n`;
    output += `        SPF algorithm executed 2 times\n`;
    output += `        Area ranges are\n`;
  });

  if (areas.size === 0) {
    output += '    Area BACKBONE(0)\n';
    output += '        Number of interfaces in this area is 1\n';
    output += '        Area has no authentication\n';
  }
  output += '        Number of interfaces in this area is 1\n';
  output += '        Area has no authentication\n';
  output += '        SPF algorithm last executed 00:01:15.000 ago\n';
  output += '        SPF algorithm executed 2 times\n';
  output += '        Area ranges are\n';
  output += '        Number of LSA 3. Checksum Sum 0x01A3B1\n';
  output += '        Number of opaque link LSA 0. Checksum Sum 0x000000\n';
  output += '        Number of DCbitless LSA 0\n';
  output += '        Number of indication LSA 0\n';
  output += '        Number of DoNotAge LSA 0\n';
  output += '        Flood list length 0\n';

  return { success: true, output };
}

/**
 * Show IP DHCP Snooping
 */
export function cmdShowIpDhcpSnooping(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const enabled = state.dhcpSnoopingEnabled ?? false;
  const vlans: string[] = state.dhcpSnoopingVlans ?? [];
  const bindings = state.dhcpSnoopingBindings || [];

  // Subcommand: show ip dhcp snooping binding
  if (/\bbinding\b/i.test(input)) {
    let output = '\nDHCP Snooping Binding Table\n';
    output += '---------------------------\n\n';
    output += 'MacAddress          IpAddress        Lease(sec)  Type    VLAN  Interface\n';
    output += '------------------- ---------------- ----------- ------- ----- ---------------\n';
    if (bindings.length === 0) {
      output += 'No bindings found\n';
    } else {
      bindings.forEach(b => {
        const mac = (b.macAddress || '').padEnd(19);
        const ip = (b.ipAddress || '').padEnd(16);
        const lease = (b.leaseTime !== undefined ? String(b.leaseTime) : '-').padEnd(11);
        const type = (b.type || 'dynamic').padEnd(7);
        const vlan = String(b.vlan ?? '-').padEnd(5);
        const port = b.portId || '-';
        output += `${mac}${ip}${lease}${type}${vlan}${port}\n`;
      });
    }
    output += '!\n';
    return { success: true, output };
  }

  let output = '\nDHCP snooping is ' + (enabled ? 'enabled' : 'disabled') + '\n';
  output += 'DHCP snooping is configured on following VLANs:\n';
  output += vlans.length > 0 ? vlans.join(',') + '\n' : 'none\n';
  output += '\nInsertion of option 82 is ' + (state.dhcpOption82 ? 'enabled' : 'disabled') + '\n';
  output += '\nInterface           Trusted   Rate limit (pps)\n';
  output += '------------------ -------- -----------------\n';

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    const trusted = port?.dhcpSnoopingTrust ? 'yes' : 'no';
    const rateLimit = port?.dhcpSnoopingLimitRate !== undefined ? String(port.dhcpSnoopingLimitRate) : 'unlimited';
    output += `${portName.padEnd(18)}${trusted.padEnd(9)}${rateLimit}\n`;
  });

  output += `\nNumber of DHCP snooping bindings: ${bindings.length}\n`;
  output += '!\n';
  return { success: true, output };
}

/**
 * Show IP ARP Inspection
 */
export function cmdShowIpArpInspection(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nSource Mac Validation      : Disabled\nDestination Mac Validation : Disabled\nIP Address Validation      : Disabled\n\n Vlan     Configuration    Operation   ACL Match          Static ACL\n------   -------------    ---------   ---------          ----------\n' };
}

export function cmdShowIpDhcpPool(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const pools = state.dhcpPools || {};
  const poolNames = Object.keys(pools);
  if (poolNames.length === 0) {
    return { success: true, output: '\n% No DHCP pools configured\n' };
  }
  let output = '\n';
  poolNames.forEach(name => {
    const p = pools[name];
    output += `Pool ${name} :\n`;
    output += ` Utilization mark (high/low)    : 100 / 0\n`;
    output += ` Subnet size (first/next)        : 0 / 0\n`;
    output += ` Total addresses                 : 254\n`;
    output += ` Leased addresses                : 0\n`;
    output += ` Pending event                   : none\n`;
    if (p.network && p.subnetMask) {
      output += ` 1 subnet is currently in the pool :\n`;
      output += ` Current index        IP address range                    Leased addresses\n`;
      output += ` ${(p.network + '').padEnd(21)} ${p.network} - ${p.network.replace(/\.\d+$/, '.254')}   0\n`;
    }
    output += `\n`;
    output += `Pool ${name}:\n`;
    output += ` Network             : ${p.network || 'not set'} ${p.subnetMask || ''}\n`;
    output += ` Default router      : ${p.defaultRouter || 'not set'}\n`;
    output += ` DNS server          : ${p.dnsServer || 'not set'}\n`;
    if (p.domainName) output += ` Domain name         : ${p.domainName}\n`;
    if (p.leaseTime) output += ` Lease               : ${p.leaseTime}\n`;
    output += '\n';
  });
  return { success: true, output };
}

export function cmdShowIpDhcpBinding(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  let output = '\nIP address       Client-ID/              Lease expiration        Type\n' +
    '                 Hardware address\n';

  const devices = ctx.devices || [];

  // Find devices that received DHCP from this device
  // A device is considered a DHCP client if its ipConfigMode is 'dhcp' 
  // and it's connected (directly or indirectly) to this device.
  const dhcpClients = devices.filter((d) =>
    (d.type === 'pc' || d.type === 'iot') &&
    d.ipConfigMode === 'dhcp' &&
    d.ip &&
    d.ip !== '0.0.0.0' &&
    !d.ip.startsWith('169.254.')
  );

  if (dhcpClients.length === 0) {
    output += '% No bindings found\n';
  } else {
    dhcpClients.forEach((client) => {
      // Check if this client's IP belongs to one of our pools
      const cliPools = state.dhcpPools || {};
      const servicePools = state.services?.dhcp?.pools || [];

      let belongsToOurPool = false;

      // Check CLI pools
      for (const poolName in cliPools) {
        const pool = cliPools[poolName];
        if (pool.network && pool.subnetMask) {
          if (isIpInNetwork(client.ip, pool.network, pool.subnetMask)) {
            belongsToOurPool = true;
            break;
          }
        }
      }

      // Check Service pools
      if (!belongsToOurPool) {
        for (const pool of servicePools) {
          if (pool.startIp && pool.subnetMask) {
            // Simple check: same subnet
            if (isIpInNetwork(client.ip, pool.startIp, pool.subnetMask)) {
              belongsToOurPool = true;
              break;
            }
          }
        }
      }

      if (belongsToOurPool) {
        const mac = client.macAddress || '0000.0000.0000';
        const formattedMac = mac.replace(/[:-]/g, '').toLowerCase();
        const clientId = `01${formattedMac}`; // Format: 01 + mac
        output += `${client.ip.padEnd(16)} ${clientId.padEnd(23)} Infinite                Automatic\n`;
      }
    });

    if (output.endsWith('Hardware address\n')) {
      output += '% No bindings found\n';
    }
  }

  return { success: true, output };
}

/**
 * Show IP Source Binding
 */
export function cmdShowIpSourceBinding(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {

  let output = '\nMacAddress          IpAddress       Lease(sec)  Type           VLAN  Interface\n';
  output += '------------------  --------------  ----------  -------------  ----  --------------------\n';

  // Check if DHCP snooping is enabled
  if (!state.dhcpSnoopingEnabled) {
    output += '% DHCP snooping not enabled\n';
    return { success: true, output };
  }

  // Build bindings from port data
  const bindings: { mac: string; ip: string; vlan: number; interface: string; type: string }[] = [];
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.dhcpSnoopingTrust && port.ipAddress) {
      bindings.push({
        mac: port.macAddress || '0000.0000.0000',
        ip: port.ipAddress,
        vlan: port.vlan || 1,
        interface: portName,
        type: 'dhcp-snooping'
      });
    }
  });

  if (bindings.length === 0) {
    output += '% No bindings found\n';
  } else {
    bindings.forEach(b => {
      output += `${b.mac.padEnd(18)}  ${b.ip.padEnd(14)}  0           ${b.type.padEnd(13)}  ${String(b.vlan).padEnd(4)}  ${b.interface}\n`;
    });
  }

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

  // Connected routes
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.ipv6Address && port.ipv6Prefix && !port.shutdown) {
      routes.push(`C   ${port.ipv6Address}/${port.ipv6Prefix} [0/0]\n     via ${portName}, directly connected`);
      routes.push(`L   ${port.ipv6Address}/128 [0/0]\n     via ${portName}, receive`);
    }
  });

  // Static routes
  if (state.ipv6StaticRoutes && state.ipv6StaticRoutes.length > 0) {
    state.ipv6StaticRoutes.forEach((route: Route) => {
      const metric = route.metric || 1;
      routes.push(`S   ${route.destination}/${route.prefixLength} [${metric}/0]\n     via ${route.nextHop}`);
    });
  }

  // Dynamic routes
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

/**
 * Show IPv6 DHCP Pool
 */
export function cmdShowIpv6DhcpPool(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const pools = state.ipv6DhcpPools || {};
  const poolNames = Object.keys(pools);
  if (poolNames.length === 0) {
    return { success: true, output: '\n% No IPv6 DHCP pools configured\n' };
  }

  const match = input.match(/show\s+ipv6\s+dhcp\s+pool\s*(\S+)?/i);
  const requestedPool = match?.[1];

  let output = '\n';
  const targetPools = requestedPool ? (pools[requestedPool] ? [requestedPool] : []) : poolNames;

  if (targetPools.length === 0 && requestedPool) {
    return { success: false, error: `% DHCPv6 pool ${requestedPool} not found` };
  }

  targetPools.forEach(name => {
    const p = pools[name];
    output += `DHCPv6 pool: ${name}\n`;
    output += `  Address allocation prefix: ${p.addressPrefix || 'not set'}\n`;
    output += `  Active clients: 0\n`;
  });

  return { success: true, output };
}

/**
 * Show IP Verify Source
 */
export function cmdShowIpVerifySource(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nInterface        Filter Type    Filter Mode    IP Address      MacAddress       Vlan\n';
  output += '---------------  -------------  -------------  --------------  ---------------  ----\n';

  let hasEntries = false;
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.ipVerifySource) {
      hasEntries = true;
      const filterType = port.ipVerifySourcePortSecurity ? 'ip+mac' : 'ip';
      const filterMode = 'active';
      output += `${portName.padEnd(15)}  ${filterType.padEnd(13)}  ${filterMode.padEnd(13)}  ${(port.ipAddress || 'N/A').padEnd(14)}  ${(port.macAddress || 'N/A').padEnd(15)}  ${port.vlan || 1}\n`;
    }
  });

  if (!hasEntries) {
    output += '% No interfaces configured with IP verify source\n';
  }

  return { success: true, output };
}

/**
 * Show IP EIGRP Neighbors
 */
export function cmdShowIpEigrpNeighbors(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% EIGRP is not configured on this device\n' };
}

/**
 * Show IP BGP Summary
 */
export function cmdShowIpBgpSummary(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% BGP is not configured on this device\n' };
}

/**
 * Show IP BGP
 */
export function cmdShowIpBgp(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% BGP table is empty\n' };
}

/**
 * Show IPv6 RIP
 */
export function cmdShowIpv6Rip(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const anyState = state as SwitchState & { ipv6RipProcesses?: Record<string, { interfaces?: string[] }> };
  const ripProcesses = anyState.ipv6RipProcesses || {};
  const keys = Object.keys(ripProcesses);
  if (keys.length === 0) {
    return { success: true, output: '\n% IPv6 RIP is not configured\n' };
  }
  let output = '\nIPv6 RIP Processes:\n';
  keys.forEach(name => {
    const proc = ripProcesses[name];
    output += `  Process "${name}":\n`;
    output += `    Interfaces: ${(proc?.interfaces || []).join(', ') || 'none'}\n`;
  });
  output += '!\n';
  return { success: true, output };
}

/**
 * Show IPv6 OSPF
 */
export function cmdShowIpv6Ospf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const anyState = state as SwitchState & { ipv6OspfProcesses?: Record<string, { routerId?: string; areas?: string[] }> };
  const ospfProcesses = anyState.ipv6OspfProcesses || {};
  const keys = Object.keys(ospfProcesses);
  if (keys.length === 0) {
    return { success: true, output: '\n% OSPFv3 is not configured\n' };
  }
  let output = '\nOSPFv3 Processes:\n';
  keys.forEach(id => {
    const proc = ospfProcesses[id];
    output += `  Process ${id}:\n`;
    output += `    Router ID: ${proc?.routerId || 'not set'}\n`;
    output += `    Areas: ${(proc?.areas || []).join(', ') || 'none'}\n`;
  });
  output += '!\n';
  return { success: true, output };
}
