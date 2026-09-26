import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { buildOSPFLinkStateDatabase, electOspfDrBdr, type OspfCandidate } from '../../ospf';
import { ensureDeviceStatesMap } from '../../networkUtils';
import { getPrefixLength, getSTPCost } from '../showHelpers';

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

  const matchedPortKey = interfaceName ? Object.keys(state.ports || {}).find(k => k.toLowerCase() === interfaceName.toLowerCase()) : undefined;
  const portEntries = interfaceName
    ? (matchedPortKey && state.ports?.[matchedPortKey] ? [[matchedPortKey, state.ports[matchedPortKey]]] : [])
    : Object.entries(state.ports || {});

  if (interfaceName && portEntries.length === 0) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  let found = false;
  (portEntries as [string, Port][]).forEach(([name, port]) => {
    if (port.ipAddress && !port.shutdown) {
      found = true;
      const portArea = port.ospfArea !== undefined ? port.ospfArea : '0';
      const portProcess = port.ospfProcessId || state.ospfProcessId || '1';
      const cost = port.ospfCost !== undefined ? port.ospfCost : getSTPCost(port);
      const hello = port.ospfHelloInterval ?? 10;
      const dead = port.ospfDeadInterval ?? 40;
      const priority = port.ospfPriority ?? 1;
      const authType = port.ospfAuthType || 'None';
      const passive = (port.passiveInterface || (state.passiveInterfaces || []).some(p => p.toLowerCase() === name.toLowerCase()));
      output += `${name} is up, line protocol is up\n`;
      output += `  Internet Address ${port.ipAddress}/${getPrefixLength(port.subnetMask)}, Area ${portArea}\n`;
      output += `  Process ID ${portProcess}, Router ID ${state.ospfRouterId || state.routerId || state.ip || '192.168.1.1'}, Network Type BROADCAST, Cost: ${cost}\n`;
      output += `  Transmit Delay is 1 sec, State DR, Priority ${priority}\n`;
      output += `  Designated Router (ID) ${state.ip || '192.168.1.1'}, Interface address ${port.ipAddress}\n`;
      output += `  Backup Designated router (ID) 0.0.0.0, Interface address 0.0.0.0\n`;
      output += `  Timer intervals configured, Hello ${hello}, Dead ${dead}, Wait ${dead}, Retransmit 5\n`;
      output += `    Hello due in 00:00:07\n`;
      output += `  Authentication type (${authType}) is ${authType === 'None' ? 'No Authentication' : `configured${port.ospfMd5KeyId !== undefined ? ` (MD5 key id ${port.ospfMd5KeyId})` : ''}`}\n`;
      if (passive) {
        output += `  Passive Interface: enabled\n`;
      }
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
 * Show IP Protocols
 */
export function cmdShowIpProtocols(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!state.routingProtocol) {
    return { success: true, output: '\n% No routing protocols configured\n' };
  }

  let output = '\n';
  if (state.routingProtocol === 'ospf') {
    const processId = state.ospfProcessId || 1;
    const routerId = state.ospfRouterId || state.routerId || state.ip || '192.168.1.1';
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
      state.dynamicRoutes.forEach((route) => {
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
    if (state.eigrpStub) {
      const keywords: string[] = [];
      if (state.eigrpStub.receiveOnly) {
        keywords.push('receive-only');
      } else {
        if (state.eigrpStub.connected) keywords.push('connected');
        if (state.eigrpStub.summary) keywords.push('summary');
        if (state.eigrpStub.static) keywords.push('static');
        if (state.eigrpStub.redistributed) keywords.push('redistributed');
      }
      output += `  Stub: ${keywords.join(', ')} routes enabled\n`;
    }
    output += '    Metric weight K1=1, K2=0, K3=1, K4=0, K5=0\n';
    output += '    NSF-aware route hold timer is 240\n';
    output += `    Router-ID: ${state.ospfRouterId || state.routerId || state.ip || '10.0.0.1'}\n`;
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
export function cmdShowIpOspfNeighbor(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const match = input.match(/show\s+ip\s+ospf\s+neighbor(?:\s+(\S+))?/i);
  const arg = match?.[1]?.toLowerCase();
  const isDetail = arg === 'detail';

  const candidateList: OspfCandidate[] = [];
  const neighborList: { address: string; intf: string; routerId: string; priority: number }[] = [];

  if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
    const seen = new Set<string>();
    state.dynamicRoutes.forEach((r, idx) => {
      if (r.nextHop && !seen.has(r.nextHop)) {
        seen.add(r.nextHop);
        const routerId = `10.0.0.${(idx + 1) * 2}`;
        const address = r.nextHop;
        const intf = r.interface || 'FastEthernet0/0';
        const priority = 1;
        neighborList.push({ address, intf, routerId, priority });
        candidateList.push({ routerId, drPriority: priority, ipAddress: address, interfaceName: intf });
      }
    });
  }

  const election = electOspfDrBdr(candidateList);

  let filtered = neighborList;
  if (arg && !isDetail) {
    filtered = neighborList.filter(n => n.intf.toLowerCase() === arg || n.routerId === arg || n.address === arg);
  }

  if (filtered.length === 0) {
    return { success: true, output: '\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n(no neighbors found)\n' };
  }

  if (isDetail) {
    let output = '\n';
    filtered.forEach(neighbor => {
      let drBdrRole = 'DROTHER';
      if (election.dr?.routerId === neighbor.routerId) drBdrRole = 'DR';
      else if (election.bdr?.routerId === neighbor.routerId) drBdrRole = 'BDR';
      output += ` Neighbor ${neighbor.routerId}, interface address ${neighbor.address}\n`;
      output += `    In the area 0 via interface ${neighbor.intf}\n`;
      output += `    Neighbor priority is ${neighbor.priority}, State is FULL/${drBdrRole}, 6 state changes\n`;
      output += `    DR is ${election.dr?.ipAddress || neighbor.address}, BDR is ${election.bdr?.ipAddress || '0.0.0.0'}\n`;
      output += `    Options is 0x52 in Hello (E-bit, O-bit, L-bit)\n`;
      output += `    Dead timer due in 00:00:35\n`;
      output += `    Neighbor is up for 00:15:42\n\n`;
    });
    return { success: true, output };
  }

  let output = '\nNeighbor ID     Pri   State           Dead Time   Address         Interface\n';
  filtered.forEach((neighbor) => {
    const deadTimer = `00:00:35`;
    let drBdrRole = 'DROTHER';
    if (election.dr?.routerId === neighbor.routerId) drBdrRole = 'DR';
    else if (election.bdr?.routerId === neighbor.routerId) drBdrRole = 'BDR';
    const stateStr = `FULL/${drBdrRole}`;
    output += `${neighbor.routerId.padEnd(15)} ${String(neighbor.priority).padEnd(5)} ${stateStr.padEnd(15)} ${deadTimer}    ${neighbor.address.padEnd(15)} ${neighbor.intf}\n`;
  });

  return { success: true, output };
}

/**
 * Show IP OSPF Database
 */
export function cmdShowIpOspfDatabase(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.routingProtocol !== 'ospf') {
    return { success: true, output: '\n% OSPF is not enabled\n' };
  }

  const routerId = state.ospfRouterId || state.routerId || state.ip || '192.168.1.1';
  const areas = state.ospfAreas && state.ospfAreas.length > 0 ? state.ospfAreas : [0];
  const deviceStates = ensureDeviceStatesMap(ctx.deviceStates);

  // If local device isn't in deviceStates, ensure it's evaluated
  if (ctx.sourceDeviceId && !deviceStates.has(ctx.sourceDeviceId)) {
    deviceStates.set(ctx.sourceDeviceId, state);
  }

  const lsdb = buildOSPFLinkStateDatabase(deviceStates);

  // Fallback: If LSDB is empty for area 0, populate local router LSA
  areas.forEach(area => {
    if (!lsdb[area]) {
      lsdb[area] = {
        routerLSAs: new Map(),
        summaryLSAs: new Map()
      };
    }
    if (lsdb[area].routerLSAs.size === 0) {
      const links = Object.values(state.ports || {}).filter(p => p.ipAddress && !p.shutdown).map(p => ({
        id: p.ipAddress || '192.168.1.1',
        data: p.subnetMask || '255.255.255.0',
        type: 'stub' as const,
        metric: p.ospfCost || 1
      }));
      lsdb[area].routerLSAs.set(routerId, {
        id: routerId,
        advRouter: routerId,
        type: 1,
        area,
        sequence: 0x80000001,
        ageNumber: 120,
        isAbr: !!state.isAbr,
        isAsbr: false,
        links
      });
    }
  });

  const match = input.match(/show\s+ip\s+ospf\s+database(?:\s+(\S+))?(?:\s+(\S+))?/i);
  const filterType = match?.[1]?.toLowerCase();
  const filterId = match?.[2];

  let output = '\n            OSPF Router with ID (' + routerId + ') (Process ID 1)\n\n';

  // 1. database-summary
  if (filterType === 'database-summary' || filterType === 'summary-database') {
    let totalRouters = 0;
    let totalSummaries = 0;
    areas.forEach(area => {
      const areaData = lsdb[area];
      const rCount = areaData?.routerLSAs.size || 0;
      const sCount = areaData?.summaryLSAs.size || 0;
      totalRouters += rCount;
      totalSummaries += sCount;
      output += `Area ${area} database summary\n`;
      output += '  LSA Type           Count    Delete   Maxage\n';
      output += `  Router             ${String(rCount).padEnd(8)} 0        0\n`;
      output += `  Network            0        0        0\n`;
      output += `  Summary Net        ${String(sCount).padEnd(8)} 0        0\n`;
      output += `  Summary ASBR       0        0        0\n`;
      output += `  Type-7 NSSA        0        0        0\n`;
      output += `  Prefix             0        0        0\n`;
      output += `  Total              ${String(rCount + sCount).padEnd(8)} 0        0\n\n`;
    });
    output += 'Process subtotal\n';
    output += '  LSA Type           Count    Delete   Maxage\n';
    output += `  Router             ${String(totalRouters).padEnd(8)} 0        0\n`;
    output += `  Network            0        0        0\n`;
    output += `  Summary Net        ${String(totalSummaries).padEnd(8)} 0        0\n`;
    output += `  Summary ASBR       0        0        0\n`;
    output += `  Type-5 AS External 0        0        0\n`;
    output += `  Total              ${String(totalRouters + totalSummaries).padEnd(8)} 0        0\n`;
    return { success: true, output };
  }

  // 2. router filter
  if (filterType === 'router') {
    areas.forEach(area => {
      const areaData = lsdb[area];
      if (!areaData) return;
      output += `                Router Link States (Area ${area})\n\n`;
      areaData.routerLSAs.forEach(lsa => {
        if (filterId && lsa.id !== filterId && lsa.advRouter !== filterId) return;
        output += `  LS age: ${lsa.ageNumber || 100}\n`;
        output += `  Options: (No TOS-capability, DC)\n`;
        output += `  LS Type: Router Links\n`;
        output += `  Link State ID: ${lsa.id}\n`;
        output += `  Advertising Router: ${lsa.advRouter}\n`;
        output += `  LS Seq Number: 80000001\n`;
        output += `  Checksum: 0x0000\n`;
        output += `  Length: ${24 + (lsa.links.length * 12)}\n`;
        output += `  Number of Links: ${lsa.links.length}\n\n`;
        lsa.links.forEach(link => {
          output += `    Link connected to: a Stub Network\n`;
          output += `     (Link ID) Network/subnet number: ${link.id}\n`;
          output += `     (Link Data) Network Mask: ${link.data}\n`;
          output += `      Number of MTID metrics: 0\n`;
          output += `       TOS 0 Metrics: ${link.metric}\n\n`;
        });
      });
    });
    return { success: true, output };
  }

  // 3. summary / asbr-summary filter
  if (filterType === 'summary' || filterType === 'asbr-summary') {
    areas.forEach(area => {
      const areaData = lsdb[area];
      if (!areaData) return;
      output += `                Summary Net Link States (Area ${area})\n\n`;
      if (areaData.summaryLSAs.size === 0) {
        output += '  (No summary LSAs present in this area)\n\n';
      }
      areaData.summaryLSAs.forEach(lsa => {
        if (filterId && lsa.id !== filterId && lsa.advRouter !== filterId) return;
        output += `  LS age: ${lsa.ageNumber || 150}\n`;
        output += `  Options: (No TOS-capability, DC)\n`;
        output += `  LS Type: Summary Links(Network)\n`;
        output += `  Link State ID: ${lsa.id} (Summary Network Number)\n`;
        output += `  Advertising Router: ${lsa.advRouter}\n`;
        output += `  LS Seq Number: 80000001\n`;
        output += `  Checksum: 0x0000\n`;
        output += `  Length: 28\n`;
        output += `  Network Mask: /${getPrefixLength(lsa.mask)}\n`;
        output += `  MTID: 0         Metric: ${lsa.metric}\n\n`;
      });
    });
    return { success: true, output };
  }

  // 4. external filter
  if (filterType === 'external') {
    output += '                Type-5 AS External Link States\n\n';
    const hasDefaultOrig = state.ospfDefaultOriginate?.enabled || state.defaultInformation === 'originate';
    if (hasDefaultOrig) {
      const metric = state.ospfDefaultOriginate?.metric ?? 20;
      const metricType = state.ospfDefaultOriginate?.metricType ?? 2;
      output += `  LS age: 80\n`;
      output += `  Options: (No TOS-capability, DC)\n`;
      output += `  LS Type: AS External Link\n`;
      output += `  Link State ID: 0.0.0.0 (External Network Number)\n`;
      output += `  Advertising Router: ${routerId}\n`;
      output += `  LS Seq Number: 80000001\n`;
      output += `  Checksum: 0x0000\n`;
      output += `  Length: 36\n`;
      output += `  Network Mask: /0\n`;
      output += `  Metric Type: ${metricType} (Larger than any link state path)\n`;
      output += `  MTID: 0         Metric: ${metric}\n`;
      output += `  Forward Address: 0.0.0.0\n`;
      output += `  External Route Tag: 0\n\n`;
    } else {
      output += '  (No AS external LSAs)\n\n';
    }
    return { success: true, output };
  }

  // 5. nssa-external filter
  if (filterType === 'nssa-external') {
    areas.forEach(area => {
      output += `                Type-7 AS External Link States (Area ${area})\n\n`;
      output += `  (No Type-7 NSSA external LSAs)\n\n`;
    });
    return { success: true, output };
  }

  // 6. self-originate filter or default overview
  const isSelfOriginate = filterType === 'self-originate';

  areas.forEach(area => {
    const areaData = lsdb[area];
    if (!areaData) return;

    output += `                Router Link States (Area ${area})\n\n`;
    output += 'Link ID         ADV Router      Age         Seq#       Checksum Link count\n';

    areaData.routerLSAs.forEach((lsa) => {
      if (isSelfOriginate && lsa.advRouter !== routerId) return;
      output += `${lsa.id.padEnd(15)} ${lsa.advRouter.padEnd(15)} ${lsa.ageNumber.toString().padEnd(11)} 0x80000001 0x0000   ${lsa.links.length}\n`;
    });

    if (areaData.summaryLSAs.size > 0) {
      output += `\n                Summary Net Link States (Area ${area})\n\n`;
      output += 'Link ID         ADV Router      Age         Seq#       Checksum\n';
      areaData.summaryLSAs.forEach((lsa) => {
        if (isSelfOriginate && lsa.advRouter !== routerId) return;
        output += `${lsa.id.padEnd(15)} ${lsa.advRouter.padEnd(15)} ${lsa.ageNumber.toString().padEnd(11)} 0x80000001 0x0000\n`;
      });
    }
  });

  if (state.ospfDefaultOriginate?.enabled || state.defaultInformation === 'originate') {
    output += '\n                Type-5 AS External Link States\n\n';
    output += 'Link ID         ADV Router      Age         Seq#       Checksum Tag\n';
    output += `${'0.0.0.0'.padEnd(15)} ${routerId.padEnd(15)} 80          0x80000001 0x0000   0\n`;
  }

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
  const routerId = state.ospfRouterId || state.routerId || state.ip || '192.168.1.1';
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
