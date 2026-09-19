import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, LispEidMapping, CoppClassPolicy } from '../types';
import { isIpInNetwork, getPrefixLength } from './showHelpers';
import { getOrCreateMplsConfig, getLdpDiscoveryInfo, getLdpNeighborTable, getLfibTable, getLibTable, generateLfib, generateLib } from '../mplsLdpEngine';
import { getEvpnMacTable, getEvpnNeighborTable, getNveInterfaceTable, getOrCreateVxlanConfig } from '../vxlanEvpn';
import { ageOutNetflowCache } from '../forwarding/netflowEngine';

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
 * Show IP ARP Inspection
 */
export function cmdShowIpArpInspection(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  // show ip arp inspection statistics
  if (input.includes('statistics')) {
    if (!state.daiStats || Object.keys(state.daiStats).length === 0) {
      return { success: true, output: '\n Vlan      Forwarded        Dropped     DHCP Drops      ACL Drops\n ----      ---------        -------     ----------      ---------\n (No statistics available)\n' };
    }
    let output = '\n Vlan      Forwarded        Dropped     DHCP Drops      ACL Drops\n';
    output += ' ----      ---------        -------     ----------      ---------\n';
    for (const stat of Object.values(state.daiStats)) {
      output += ` ${String(stat.vlan).padEnd(9)} ${String(stat.forwarded).padEnd(16)} ${String(stat.dropped).padEnd(11)} ${String(0).padEnd(15)} ${0}\n`;
    }
    return { success: true, output };
  }

  const enabled = state.daiEnabled || (state.arpInspectionVlans?.length ?? 0) > 0;
  const vlans = state.arpInspectionVlans || [];
  const validate = state.daiValidate;

  let output = '\n';
  output += `Source Mac Validation      : ${validate?.srcMac ? 'Enabled' : 'Disabled'}\n`;
  output += `Destination Mac Validation : ${validate?.dstMac ? 'Enabled' : 'Disabled'}\n`;
  output += `IP Address Validation      : ${validate?.ip ? 'Enabled' : 'Disabled'}\n`;
  output += '\n';
  output += ' Vlan     Configuration    Operation   ACL Match          Static ACL\n';
  output += '------   -------------    ---------   ---------          ----------\n';

  if (!enabled || vlans.length === 0) {
    output += ' (DAI not enabled on any VLAN)\n';
  } else {
    for (const vlan of vlans) {
      output += ` ${vlan.padEnd(8)} Enabled          Active      dhcp-snooping      --\n`;
    }
  }

  output += '\n';

  // Show binding table
  const staticBindings = state.daiStaticBindings || [];
  const dynamicBindings = (state.dhcpSnoopingBindings || []).map((b) => ({
    ip: b.ipAddress, mac: b.macAddress, vlan: b.vlan, portId: b.portId, type: 'dynamic' as const
  }));

  const allBindings = [
    ...dynamicBindings,
    ...staticBindings.map((b) => ({ ...b, type: 'static' as const }))
  ];

  if (allBindings.length > 0) {
    output += ' IP address      MAC address         VLAN  Interface    Type\n';
    output += ' ----------      -----------         ----  ---------    ----\n';
    for (const b of allBindings) {
      output += ` ${b.ip.padEnd(16)} ${b.mac.padEnd(19)} ${String(b.vlan).padEnd(5)} ${b.portId.padEnd(12)} ${b.type}\n`;
    }
  }

  return { success: true, output };
}



export function cmdShowIpDhcpBinding(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  let output = '\nIP address       Client-ID/              Lease expiration        Type\n' +
    '                 Hardware address\n';

  const devices = ctx.devices || [];

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
      const cliPools = state.dhcpPools || {};
      const servicePools = state.services?.dhcp?.pools || [];

      let belongsToOurPool = false;

      for (const poolName in cliPools) {
        const pool = cliPools[poolName];
        if (pool.network && pool.subnetMask) {
          if (isIpInNetwork(client.ip, pool.network, pool.subnetMask)) {
            belongsToOurPool = true;
            break;
          }
        }
      }

      if (!belongsToOurPool) {
        for (const pool of servicePools) {
          if (pool.startIp && pool.subnetMask) {
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
        const clientId = `01${formattedMac}`;
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

  if (!state.dhcpSnoopingEnabled) {
    output += '% DHCP snooping not enabled\n';
    return { success: true, output };
  }

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
    const activeCount = (state.dhcpv6Bindings || []).length;
    output += `DHCPv6 pool: ${name}\n`;
    output += `  Address allocation prefix: ${p.addressPrefix || 'not set'}\n`;
    output += `  DNS server: ${p.dnsServer || 'not set'}\n`;
    output += `  Domain name: ${p.domainName || 'not set'}\n`;
    output += `  Active clients: ${activeCount}\n`;
  });

  return { success: true, output };
}

export function cmdShowIpv6DhcpBinding(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const bindings = state.dhcpv6Bindings || [];
  if (bindings.length === 0) {
    return { success: true, output: '\n% No DHCPv6 binding entries\n' };
  }

  let output = '\n';
  bindings.forEach(b => {
    output += `Client: ${b.clientHostname || b.duid}\n`;
    output += `  DUID: ${b.duid}\n`;
    output += `  ${b.type}: IAID ${b.iaid}, T1 302400, T2 483840\n`;

    output += `    Address: ${b.ipv6Address}\n`;
    output += `      preferred lifetime ${b.preferredLifetime}, valid lifetime ${b.validLifetime}\n`;
    output += `      expires at Oct 12 2026 12:00 PM (${b.validLifetime} seconds)\n`;
  });

  return { success: true, output };
}

export function cmdShowPppoeSession(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const sessions = state.pppoeSessions || [];
  if (sessions.length === 0) {
    return { success: true, output: '\n1 client session\n\nUniq ID  PPPoE  RemMAC          TTY        LocIP           RemIP           State\n         Sid\nN/A      101    0050.56C0.0002  Di1        100.64.1.2      100.64.1.1      UP (LCP/IPCP Opened)\n' };
  }

  let output = `\n${sessions.length} client session(s)\n\n`;
  output += 'Uniq ID  PPPoE  RemMAC          TTY        LocIP           RemIP           State\n';
  output += '         Sid\n';

  sessions.forEach(s => {
    output += `N/A      ${String(s.sessionId).padEnd(6)} ${s.serverMac.padEnd(15)} Di1        ${s.assignedIp.padEnd(15)} ${s.peerIp.padEnd(15)} UP (LCP/IPCP Opened)\n`;
  });

  return { success: true, output };
}

export function cmdShowCaller(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const sessions = state.pppoeSessions || [];
  let output = '\n  Line          User                 IP Address       Local Subnet    VLAN\n';
  output += '  ------------  -------------------  ---------------  --------------  ----\n';

  if (sessions.length === 0) {
    output += '  Di1           user@isp.net         100.64.1.2       100.64.1.1/32   1\n';
  } else {
    sessions.forEach(s => {
      output += `  Di1           ${'user@isp.net'.padEnd(19)}  ${s.assignedIp.padEnd(15)}  ${s.peerIp}/32   1\n`;
    });
  }

  return { success: true, output };
}

export function cmdShowTrack(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const tracks = state.ipSlaTracks || {};
  const trackKeys = Object.keys(tracks);

  if (trackKeys.length === 0) {
    return { success: true, output: '\n% No track objects configured\n' };
  }

  const match = input.match(/show\s+track\s*(\d+)?/i);
  const requestedId = match?.[1];

  let output = '\n';
  const targetKeys = requestedId ? (tracks[requestedId] ? [requestedId] : []) : trackKeys;

  if (requestedId && targetKeys.length === 0) {
    return { success: false, error: `% Track object ${requestedId} not found` };
  }

  targetKeys.forEach(id => {
    const t = tracks[id];
    const op = state.ipSlaOperations?.[t.operationId];
    const isUp = t.state === 'up';

    output += `Track ${id}\n`;
    output += `  IP SLA ${t.operationId} reachability\n`;
    output += `  Reachability is ${isUp ? 'Up' : 'Down'}\n`;
    output += `  Latest operation return code: ${op?.statistics?.successes ? 'OK' : 'Timeout'}\n`;
    output += `  Latest RTT: ${op?.statistics?.last !== undefined ? `${op.statistics.last} ms` : 'N/A'}\n`;
    output += `  Tracked by:\n`;

    const trackedId = parseInt(id, 10);
    const trackedV4 = (state.staticRoutes || []).filter((r: { trackId?: number }) => r.trackId === trackedId);
    const trackedV6 = (state.ipv6StaticRoutes || []).filter((r: { trackId?: number }) => r.trackId === trackedId);
    let trackedAny = false;

    trackedV4.forEach((r: { destination?: string; network?: string; subnetMask?: string; mask?: string; nextHop?: string }) => {
      const network = r.network || r.destination || '';
      const mask = r.mask || r.subnetMask || '';
      const prefixPart = mask ? `/${getPrefixLength(mask)}` : '';
      output += `    Static IP Route ${network}${prefixPart} via ${r.nextHop || 'n/a'}\n`;
      trackedAny = true;
    });
    trackedV6.forEach((r: { network?: string; destination?: string; prefixLength?: number; nextHop?: string }) => {
      const network = r.network || r.destination || '';
      output += `    Static IPv6 Route ${network}/${r.prefixLength ?? ''} via ${r.nextHop || 'n/a'}\n`;
      trackedAny = true;
    });

    if (!trackedAny) {
      output += `    (no static routes currently using track ${id})\n`;
    }

    output += `\n`;
  });

  return { success: true, output };
}

export function cmdShowIpSlaSummary(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const ops = state.ipSlaOperations || {};
  const entries = Object.values(ops);

  if (entries.length === 0) {
    return { success: true, output: '\nIP SLA: No operations configured\n' };
  }

  let output = '\nIP SLA Operational Summary\n';
  output += 'ID       Type        Target          Status      Return Code\n';
  output += '------------------------------------------------------------\n';

  entries.forEach(op => {
    const status = op.running ? 'Scheduled' : 'Configured';
    const returnCode = op.statistics.successes > 0 ? 'OK' : (op.running ? 'Timeout' : 'Pending');
    output += `${op.id.padEnd(8)} ${op.type.toUpperCase().padEnd(11)} ${op.target.padEnd(15)} ${status.padEnd(11)} ${returnCode}\n`;
  });

  return { success: true, output };
}

export function cmdShowIpSlaConfiguration(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const ops = state.ipSlaOperations || {};
  const entries = Object.values(ops);

  if (entries.length === 0) {
    return { success: true, output: '\n% No IP SLA operations configured\n' };
  }

  let output = '\n';
  entries.forEach(op => {
    output += `IP SLA Operation ${op.id}\n`;
    output += `  Type: ${op.type}\n`;
    output += `  Target: ${op.target}\n`;
    output += `  Frequency: ${op.frequency} seconds\n`;
    output += `  Timeout: ${op.timeout} ms\n`;
    output += `  Schedule: Start Time = ${op.startTime || 'Now'}, Life = ${op.life || 'Forever'}, Status = ${op.running ? 'Scheduled' : 'Inactive'}\n\n`;
  });

  return { success: true, output };
}

/**
 * Show IP Verify Source
 */
export function cmdShowIpVerifySource(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nInterface        Filter-type  Filter-mode  IP-address       Mac-address        Vlan\n';
  output += '---------------  -----------  -----------  ---------------  -----------------  ----\n';

  let hasEntries = false;

  // Collect IPSG-enabled ports and their bindings
  const snoopingBindings = state.dhcpSnoopingBindings || [];
  const ipsgBindings = state.ipsgBindings || [];

  const allBindings = [
    ...snoopingBindings.map((b) => ({ ip: b.ipAddress, mac: b.macAddress, vlan: b.vlan, portId: b.portId })),
    ...ipsgBindings,
  ];

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (!port.ipVerifySource) return;

    hasEntries = true;
    const filterType = port.ipVerifySourcePortSecurity ? 'ip-mac     ' : 'ip         ';
    const portBindings = allBindings.filter((b) => b.portId === portName);

    if (portBindings.length === 0) {
      output += `${portName.padEnd(16)} ${filterType} active       deny-all         --                 ${port.vlan || 1}\n`;
    } else {
      for (const b of portBindings) {
        output += `${portName.padEnd(16)} ${filterType} active       ${b.ip.padEnd(16)} ${(b.mac || '--').padEnd(18)} ${b.vlan}\n`;
      }
    }
  });

  if (!hasEntries) {
    output += '% No interfaces configured with IP verify source\n';
  }

  return { success: true, output };
}



/**
 * Show IPv6 Access-Lists
 */
export function cmdShowIpv6AccessList(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const aclMap = state.ipv6AccessLists || {};
  const keys = Object.keys(aclMap);
  if (keys.length === 0) {
    return { success: true, output: '% No IPv6 access lists configured\n' };
  }

  let output = '';
  keys.forEach(name => {
    output += `IPv6 access list ${name}\n`;
    const rules = aclMap[name] || [];
    rules.forEach((rule, idx) => {
      output += `    sequence ${(idx + 1) * 10} ${rule}\n`;
    });
  });

  return { success: true, output };
}

export function cmdShowIpv6Neighbors(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nIPv6 Address                              Age Link-layer Addr State Interface\n';

  const ndpCache = state.ndpCache || [];
  const now = Date.now();

  ndpCache.forEach(entry => {
    const ageMs = now - entry.timestamp;
    const ageMin = Math.floor(ageMs / 60000);
    const ageStr = entry.state === 'STATIC' ? '-' : ageMin.toString();
    const mac = entry.mac || '-';

    const paddedAddress = entry.ipv6.toUpperCase().padEnd(41, ' ');
    const paddedAge = ageStr.padStart(3, ' ');
    const paddedMac = mac.padEnd(15, ' ');
    const paddedState = entry.state.padEnd(5, ' ');
    output += `${paddedAddress} ${paddedAge} ${paddedMac} ${paddedState} ${entry.interface}\n`;
  });

  return { success: true, output };
}

export function cmdShowIpFlowExport(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const conf = state.netflowConfig;
  if (!conf || !conf.exportDestination) {
    return { success: true, output: '\nNetFlow export is disabled\n' };
  }

  const exportedPackets = conf.exportedPackets || 0;
  const exportedFlows = conf.exportedFlows || 0;

  let output = '\nNetFlow export status:\n';
  output += `  Version ${conf.version || 5} export flow records\n`;
  output += `  Exporting flows to ${conf.exportDestination} port ${conf.exportPort || 2055}\n`;
  output += '  Exporting source loopback 0\n';
  output += `  ${exportedPackets} packets exported, ${exportedFlows} exports executed\n`;
  return { success: true, output };
}

export function cmdShowIpCacheFlow(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const now = Date.now();
  ageOutNetflowCache(state, now, state.flowMonitors ? 15 : 15);

  const cache = state.netflowCache || [];
  const totalPackets = cache.reduce((sum, c) => sum + c.pkts, 0);

  let output = `\nIP packet size distribution (${totalPackets} total packets):\n`;
  output += '  1-32   64  128  256  512 1024\n';
  output += '  .000 .800 .100 .050 .050 .000\n\n';
  output += 'IP Flow Switching Cache, 2785088 bytes\n';
  output += `  ${cache.length} active, 4096 inactive, ${cache.length} added\n`;
  output += '  0 ager polls, 0 flow alloc failures\n\n';
  output += '  last clearing of statistics never\n\n';
  output += 'SrcIf          SrcIPaddress    DstIf          DstIPaddress    Pr SrcP   DstP   Pkts\n';

  cache.forEach(c => {
    const srcIf = (c.srcIf || 'Gi0/0').padEnd(13);
    const srcIp = c.srcIp.padEnd(16);
    const dstIf = (c.dstIf || 'Gi0/1').padEnd(14);
    const dstIp = c.dstIp.padEnd(16);
    output += `${srcIf} ${srcIp} ${dstIf} ${dstIp} ${c.proto} ${c.srcPort.toString().padStart(4, '0')} ${c.dstPort.toString().padStart(4, '0')} ${c.pkts.toString().padStart(5)}\n`;
  });

  if (cache.length === 0) {
    output += '  No active flows\n';
  }

  return { success: true, output };
}

export function cmdShowFlowRecord(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const records = state.flowRecords || {};
  const nameMatch = input.match(/^show\s+flow\s+record\s+(\S+)$/i);
  const name = nameMatch?.[1];

  if (name) {
    const rec = records[name];
    if (!rec) return { success: true, output: `\n% Flow record ${name} not found\n` };
    let output = `\nFlow record ${name}:\n`;
    output += '  Description: User defined\n';
    output += '  Fields:\n';
    (rec.matchFields || []).forEach(f => { output += `    ${f}\n`; });
    (rec.collectFields || []).forEach(f => { output += `    ${f}\n`; });
    return { success: true, output };
  }

  const names = Object.keys(records);
  if (names.length === 0) return { success: true, output: '\n% No flow records configured\n' };
  let output = '\nFlow Record                                                      Fields:\n';
  const matchCounts = Object.entries(records).map(([n, r]) => [n, (r.matchFields || []).length] as const);
  matchCounts.forEach(([n, cnt]) => {
    output += `${n.padEnd(80)} match ${cnt}\n`;
  });
  return { success: true, output };
}

export function cmdShowFlowExporter(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const exporters = state.flowExporters || {};
  const nameMatch = input.match(/^show\s+flow\s+exporter\s+(\S+)$/i);
  const name = nameMatch?.[1];

  if (name) {
    const exp = exporters[name];
    if (!exp) return { success: true, output: `\n% Flow exporter ${name} not found\n` };
    let output = `\nFlow exporter ${name}:\n`;
    output += `  Description: User defined\n`;
    output += `  Export protocol: NetFlow Version ${exp.version || 5}\n`;
    output += `  Transport Configuration:\n`;
    output += `    Destination IP address: ${exp.destination || 'not set'}\n`;
    output += `    Source IP address: ${exp.source || 'not set'}\n`;
    output += `    Transport Protocol: ${exp.transportProtocol}\n`;
    output += `    Destination Port: ${exp.transportPort || 2055}\n`;
    output += `    Source Port: 0\n`;
    output += `  Template Data Timeout: ${exp.templateDataTimeout ?? 1800} seconds\n`;
    return { success: true, output };
  }

  const names = Object.keys(exporters);
  if (names.length === 0) return { success: true, output: '\n% No flow exporters configured\n' };
  let output = '\nFlow Exporter                                                            Status\n';
  Object.entries(exporters).forEach(([n, exp]) => {
    const status = exp.destination ? 'Operational' : 'Not configured';
    output += `${n.padEnd(88)} ${status}\n`;
  });
  return { success: true, output };
}

export function cmdShowFlowMonitor(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const monitors = state.flowMonitors || {};
  const nameMatch = input.match(/^show\s+flow\s+monitor\s+(\S+)$/i);
  const name = nameMatch?.[1];

  if (name) {
    const mon = monitors[name];
    if (!mon) return { success: true, output: `\n% Flow monitor ${name} not found\n` };
    let output = `\nFlow monitor ${name}:\n`;
    output += '  Description: User defined\n';
    output += `  Flow Record: ${mon.record || 'not set'}\n`;
    output += `  Flow Exporter: ${mon.exporter || 'not set'}\n`;
    output += `  Cache type: Normal (Platform cache)\n`;
    output += `  Cache size: 4096\n`;
    output += `  Cache timeout: ${mon.cacheTimeoutActive ?? 1800} seconds (active), ${mon.cacheTimeoutInactive ?? 15} seconds (inactive)\n`;
    const applied = Object.entries(state.ports || {}).filter(([, p]) => p.flowMonitor === name).map(([id]) => id);
    output += `  Applied to interface(s): ${applied.join(', ') || 'none'}\n`;
    return { success: true, output };
  }

  const names = Object.keys(monitors);
  if (names.length === 0) return { success: true, output: '\n% No flow monitors configured\n' };
  let output = '\nFlow Monitor                                                            Status\n';
  Object.entries(monitors).forEach(([n, mon]) => {
    const status = mon.record && mon.exporter ? 'Active' : 'Incomplete';
    output += `${n.padEnd(88)} ${status}\n`;
  });
  return { success: true, output };
}

export function cmdShowVrf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const vrfs = state.vrfInstances;
  if (!vrfs || Object.keys(vrfs).length === 0) {
    return { success: true, output: '\n% No VRFs configured\n' };
  }
  let output = '\nName                             Default RD            Protocols  Interfaces\n';
  Object.values(vrfs).forEach(v => {
    output += `${v.name.padEnd(32)} ${(v.rd || '<not set>').padEnd(20)} ipv4,ipv6  ${v.interfaces.join(', ') || 'none'}\n`;
  });
  return { success: true, output };
}

export function cmdShowMpls(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  // Update LFIB and LIB before showing
  generateLfib(state);
  generateLib(state);

  const mpls = getOrCreateMplsConfig(state);
  if (!mpls || !mpls.enabled) {
    return { success: true, output: '\n% MPLS is not enabled\n' };
  }

  let output = '\nMPLS LDP Status: Operating\n';
  output += `LDP Router ID: ${mpls.routerId}\n`;
  output += `LDP Discovery/Session: ${mpls.ldpEnabled ? 'Enabled' : 'Disabled'}\n`;
  output += `Label Range: ${mpls.labelRange.min} - ${mpls.labelRange.max}\n`;
  output += `Graceful Restart: ${mpls.gracefulRestartEnabled ? 'Enabled' : 'Disabled'}\n`;
  output += `Session Protection: ${mpls.sessionProtectionEnabled ? 'Enabled' : 'Disabled'}\n`;

  // Parse input to determine what to show
  const inputLower = input.toLowerCase();

  if (inputLower.includes('ldp neighbor')) {
    output += getLdpNeighborTable(state);
  } else if (inputLower.includes('ldp discovery')) {
    output += getLdpDiscoveryInfo(state);
  } else if (inputLower.includes('lfib') || inputLower.includes('forwarding')) {
    output += getLfibTable(state);
  } else if (inputLower.includes('lib') || inputLower.includes('bindings')) {
    output += getLibTable(state);
  } else {
    // Show summary
    output += `\n${getLdpDiscoveryInfo(state)}`;
    output += `\n${getLdpNeighborTable(state)}`;
    output += `\n${getLfibTable(state)}`;
  }

  return { success: true, output };
}

// ─── Private VLAN Show Commands ───────────────────────────────────────────────

/**
 * show vlan private-vlan [type]
 */
export function cmdShowVlanPrivateVlan(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const domain = state.pvlanDomain;

  let output = '\nPrimary  Secondary  Type      Interfaces\n';
  output += '-------  ---------  --------  --------------------\n';

  if (!domain || !domain.primaryVlan) {
    output += '(No private-vlan configuration found)\n';
    return { success: true, output };
  }

  // Isolated VLAN
  if (domain.isolatedVlan) {
    const ports = Object.entries(state.ports)
      .filter(([, p]) => p.pvlanMode === 'host' && p.pvlanHostAssociation?.secondary === domain.isolatedVlan)
      .map(([id]) => id).join(', ') || '--';
    output += `${String(domain.primaryVlan).padEnd(8)} ${String(domain.isolatedVlan).padEnd(10)} isolated  ${ports}\n`;
  }

  // Community VLANs
  for (const communityVlan of domain.communityVlans || []) {
    const ports = Object.entries(state.ports)
      .filter(([, p]) => p.pvlanMode === 'host' && p.pvlanHostAssociation?.secondary === communityVlan)
      .map(([id]) => id).join(', ') || '--';
    output += `${String(domain.primaryVlan).padEnd(8)} ${String(communityVlan).padEnd(10)} community ${ports}\n`;
  }

  // Promiscuous ports
  const promiscuousPorts = Object.entries(state.ports)
    .filter(([, p]) => p.pvlanMode === 'promiscuous')
    .map(([id]) => id);
  if (promiscuousPorts.length > 0) {
    output += `\nPromiscuous ports: ${promiscuousPorts.join(', ')}\n`;
  }

  return { success: true, output };
}

// ─── Flex-Links Show Commands ──────────────────────────────────────────────────

/**
 * show interfaces [<if>] backup detail
 */
export function cmdShowInterfacesBackup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n';
  output += 'Interface   Backup-Interface         State        Preemption  Bandwidth\n';
  output += '---------   ----------------         -----        ----------  ---------\n';

  let hasPairs = false;

  for (const [portId, port] of Object.entries(state.ports)) {
    if (!port.flexLinkBackup) continue;
    hasPairs = true;

    const primaryStatus = port.shutdown ? 'down/standby' : (port.flexLinkActive !== false ? 'up/active' : 'up/standby');

    output += `${portId.padEnd(12)} ${port.flexLinkBackup.padEnd(25)} ${primaryStatus.padEnd(12)} off         --\n`;
  }

  if (!hasPairs) {
    output += '(No Flex-Link pairs configured)\n';
  }

  return { success: true, output };
}

// ─── VXLAN-EVPN Show Commands ─────────────────────────────────────────────────

/**
 * show nve interface
 */
export function cmdShowNveInterface(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const vxlan = getOrCreateVxlanConfig(state);

  if (!vxlan.enabled) {
    return { success: true, output: '% VXLAN is not enabled' };
  }

  return { success: true, output: getNveInterfaceTable(state) };
}

/**
 * show evpn
 */
export function cmdShowEvpn(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const vxlan = getOrCreateVxlanConfig(state);

  if (!vxlan.enabled) {
    return { success: true, output: '% VXLAN-EVPN is not enabled' };
  }

  let output = '\nVXLAN-EVPN Status: Enabled\n';
  output += `BGP EVPN: ${vxlan.bgpEvpnEnabled ? 'Enabled' : 'Disabled'}\n`;

  const inputLower = input.toLowerCase();

  if (inputLower.includes('mac') || inputLower.includes('mac-table')) {
    output += getEvpnMacTable(state);
  } else if (inputLower.includes('neighbor') || inputLower.includes('neighbor')) {
    output += getEvpnNeighborTable(state);
  } else {
    output += `\n${getNveInterfaceTable(state)}`;
    output += `\n${getEvpnNeighborTable(state)}`;
    output += `\n${getEvpnMacTable(state)}`;
  }

  return { success: true, output };
}

/**
 * show lisp
 */
export function cmdShowLisp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const lisp = state.lispConfig;
  if (!lisp || !lisp.enabled) {
    return { success: true, output: '\n% LISP is not enabled\n' };
  }
  let output = '\nLISP Routing Table / Map-Cache\n';
  output += 'EID Prefix           RLOC IP          Priority  Weight\n';
  output += '------------------   ---------------  --------  ------\n';
  lisp.eidMappings?.forEach((m: LispEidMapping) => {
    output += `${m.eidPrefix.padEnd(20)} ${(m.rlocIp || 'site-map').padEnd(16)} ${String(m.priority || 1).padEnd(9)} ${m.weight || 100}\n`;
  });
  return { success: true, output };
}

/**
 * show control-plane
 */
export function cmdShowControlPlane(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const copp = state.coppConfig;
  if (!copp || !copp.enabled) {
    return { success: true, output: '\n% CoPP (Control-Plane Policing) is not enabled\n' };
  }
  let output = '\nControl-Plane Policing Status: Active\n';
  output += 'Class                Rate(pps)  Conforming(pkts)  Exceeded(pkts)\n';
  output += '-------------------  ---------  ----------------  --------------\n';
  Object.values(copp.classPolicies || {}).forEach((p: CoppClassPolicy) => {
    output += `${p.className.padEnd(20)} ${String(p.policeRatePps).padEnd(10)} ${String(p.conformingPackets).padEnd(17)} ${p.exceededPackets}\n`;
  });
  return { success: true, output };
}

/**
 * Show IP CEF - Cisco Express Forwarding table
 * Syntax: show ip cef | show ip cef <prefix> | show ip cef detail
 */
export function cmdShowIpCef(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const isCefEnabled = state.switchLayer === 'L3' || state.deviceType === 'router' || state.deviceType === 'switchL3';
  if (!isCefEnabled) {
    return { success: true, output: '\n% CEF is not supported on this device\n' };
  }

  const isDetail = /\bdetail\b/i.test(input);
  const prefixMatch = input.match(/cef\s+([0-9.]+(?:\/\d+)?)\s*(?:detail)?$/i);
  const filterPrefix = prefixMatch ? prefixMatch[1] : null;

  // Build CEF table from connected and static/dynamic routes
  const routes: Array<{ prefix: string; mask: string; nextHop: string; outIf: string; adjType: string }> = [];

  // Connected routes from ports
  Object.entries(state.ports || {}).forEach(([portName, port]) => {
    if (port.ipAddress && port.subnetMask && !port.shutdown) {
      routes.push({
        prefix: port.ipAddress,
        mask: port.subnetMask,
        nextHop: 'directly connected',
        outIf: portName,
        adjType: 'receive',
      });
    }
  });

  // Static and dynamic routes
  const rawState = state as { ipRoutes?: unknown[] };
  const allRoutes = [
    ...(state.staticRoutes || []),
    ...(state.dynamicRoutes || []),
    ...((rawState.ipRoutes as Array<{ destination?: string; network?: string; subnetMask?: string; mask?: string; nextHop?: string; exitInterface?: string }>) || []),
  ];
  allRoutes.forEach((r: { destination?: string; network?: string; subnetMask?: string; mask?: string; nextHop?: string; exitInterface?: string }) => {
    const dest = r.destination || r.network || '0.0.0.0';
    const mask = r.subnetMask || r.mask || '255.255.255.0';
    const nh = r.nextHop || 'directly connected';
    const outIf = r.exitInterface || '';
    routes.push({ prefix: dest, mask, nextHop: nh, outIf, adjType: nh === 'directly connected' ? 'receive' : 'adjacency' });
  });

  // Filter by prefix if given
  const displayed = filterPrefix
    ? routes.filter(r => {
      const query = filterPrefix.includes('/') ? filterPrefix.split('/')[0] : filterPrefix;
      return r.prefix === query;
    })
    : routes;

  if (displayed.length === 0) {
    if (filterPrefix) return { success: true, output: `\n% Prefix ${filterPrefix} not found in CEF table\n` };
    return { success: true, output: '\n% CEF table is empty\n' };
  }

  let output = '\n';
  output += 'IP CEF Table - Prefix          Next Hop          Interface         Type\n';
  output += '-----------------------------  ----------------  ----------------  -----------\n';

  displayed.forEach(r => {
    const pl = getPrefixLength(r.mask);
    const prefixStr = `${r.prefix}/${pl}`;
    output += `${prefixStr.padEnd(31)} ${r.nextHop.padEnd(18)} ${r.outIf.padEnd(18)} ${r.adjType}\n`;
    if (isDetail && r.adjType === 'adjacency') {
      output += `    Adjacency: IP adj out of ${r.outIf || 'unknown'}, addr ${r.nextHop}\n`;
    }
  });

  return { success: true, output };
}
