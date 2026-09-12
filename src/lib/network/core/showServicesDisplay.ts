import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { isIpInNetwork } from './showHelpers';

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
export function cmdShowIpArpInspection(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nSource Mac Validation      : Disabled\nDestination Mac Validation : Disabled\nIP Address Validation      : Disabled\n\n Vlan     Configuration    Operation   ACL Match          Static ACL\n------   -------------    ---------   ---------          ----------\n' };
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
    output += `    Static IP Route 0.0.0.0/0\n\n`;
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

  let output = '\nNetFlow export status:\n';
  output += `  Version ${conf.version || 5} export flow records\n`;
  output += `  Exporting flows to ${conf.exportDestination} port ${conf.exportPort || 2055}\n`;
  output += '  Exporting source loopback 0\n';
  output += '  1542 packets exported, 34 exports executed\n';
  return { success: true, output };
}

export function cmdShowIpCacheFlow(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const cache = state.netflowCache || [
    { srcIp: '10.0.0.5', dstIp: '192.168.1.100', proto: '06', srcPort: 443, dstPort: 80, pkts: 24, bytes: 14200, active: 12 },
    { srcIp: '10.0.0.8', dstIp: '172.16.0.2', proto: '11', srcPort: 53, dstPort: 53, pkts: 4, bytes: 320, active: 2 }
  ];

  let output = '\nIP packet size distribution (100 total packets):\n';
  output += '  1-32   64  128  256  512 1024\n';
  output += '  .000 .800 .100 .050 .050 .000\n\n';
  output += 'SrcIf          SrcIPaddress    DstIf          DstIPaddress    Pr SrcP DstP  Pkts\n';

  cache.forEach(c => {
    output += `Gi0/0          ${c.srcIp.padEnd(15)} Gi0/1          ${c.dstIp.padEnd(15)} ${c.proto} ${c.srcPort.toString().padStart(4, '0')} ${c.dstPort.toString().padStart(4, '0')} ${c.pkts.toString().padStart(5)}\n`;
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

export function cmdShowMpls(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const mpls = state.mplsConfig as { enabled?: boolean; ldpEnabled?: boolean; lfib?: Record<string, unknown> } | undefined;
  if (!mpls || !mpls.enabled) {
    return { success: true, output: '\n% MPLS is not enabled\n' };
  }
  let output = '\nMPLS LDP Status: Operating\n';
  output += `LDP Discovery/Session: ${mpls.ldpEnabled ? 'Enabled' : 'Disabled'}\n`;
  output += `LFIB Entries: ${Object.keys(mpls.lfib || {}).length}\n`;
  return { success: true, output };
}
