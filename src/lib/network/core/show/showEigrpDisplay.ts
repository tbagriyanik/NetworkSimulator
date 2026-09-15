import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';
import { buildEigrp6TopologyTable, EigrpTopologyEntry } from '../../eigrp-dual';

/**
 * Show IP EIGRP Neighbors
 */
export function cmdShowIpEigrpNeighbors(state: SwitchState, _input: string, ctx?: CommandContext): CommandResult {
  const isEigrpEnabled = state.routingProtocol === 'eigrp' || Boolean(state.eigrpAs) || Boolean(state.runningConfig?.some(l => l.includes('router eigrp')));

  if (!isEigrpEnabled) {
    return { success: true, output: '\n% EIGRP is not configured on this device\n' };
  }

  const asNum = state.eigrpAs || '100';
  let output = `\nEIGRP-IPv4 Neighbors for AS(${asNum})\n`;
  output += 'H   Address                 Interface              Hold Uptime   SRTT   RTO  Q  Seq\n';
  output += '                                                   (sec)         (ms)       Cnt Num\n';

  const neighbors: Array<{ address: string; intf: string }> = [];

  if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
    state.dynamicRoutes.forEach((r) => {
      if (r.nextHop && !neighbors.some(n => n.address === r.nextHop)) {
        let foundIntf = r.interface || '';
        if (!foundIntf) {
          Object.entries(state.ports).forEach(([portName, port]) => {
            if (port.ipAddress && (port.mode === 'routed' || port.isRoutedPort || port.status === 'connected')) {
              foundIntf = portName;
            }
          });
        }
        neighbors.push({ address: r.nextHop, intf: foundIntf || 'Gi1/0/24' });
      }
    });
  }

  if (neighbors.length === 0 && ctx?.deviceStates) {
    Object.entries(state.ports).forEach(([portName, port]) => {
      if (port.ipAddress && (port.mode === 'routed' || port.isRoutedPort || port.status === 'connected')) {
        const myIp = port.ipAddress;
        ctx.deviceStates?.forEach((otherState) => {
          if (otherState.hostname !== state.hostname && (otherState.routingProtocol === 'eigrp' || otherState.eigrpAs)) {
            Object.values(otherState.ports).forEach((otherPort) => {
              if (otherPort.ipAddress && otherPort.ipAddress !== myIp) {
                const myIpParts = myIp.split('.');
                const otherIpParts = otherPort.ipAddress.split('.');
                if (myIpParts[0] === otherIpParts[0] && myIpParts[1] === otherIpParts[1] && myIpParts[2] === otherIpParts[2]) {
                  if (!neighbors.some(n => n.address === otherPort.ipAddress)) {
                    neighbors.push({ address: otherPort.ipAddress, intf: portName });
                  }
                }
              }
            });
          }
        });
      }
    });
  }

  if (neighbors.length > 0) {
    neighbors.forEach((n, idx) => {
      const holdTime = '12';
      const uptime = '00:04:15';
      const srtt = '12';
      const rto = '200';
      const qCnt = '0';
      const seqNum = String(idx + 1);
      output += `${String(idx).padEnd(4)}${n.address.padEnd(24)}${n.intf.padEnd(23)}${holdTime.padEnd(5)} ${uptime.padEnd(10)} ${srtt.padEnd(6)} ${rto.padEnd(4)} ${qCnt.padEnd(2)} ${seqNum}\n`;
    });
  } else {
    output += '0   192.168.2.2             Gi1/0/24                 12 00:04:15   12   200  0  1\n';
  }

  return { success: true, output };
}

/**
 * Show IP EIGRP Interfaces
 */
export function cmdShowIpEigrpInterfaces(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const isEigrpEnabled = state.routingProtocol === 'eigrp' || Boolean(state.eigrpAs) || Boolean(state.runningConfig?.some(l => l.includes('router eigrp')));
  if (!isEigrpEnabled) {
    return { success: true, output: '\n% EIGRP is not configured on this device\n' };
  }
  const asNum = state.eigrpAs || '100';
  let output = `\nEIGRP-IPv4 Interfaces for AS(${asNum})\n`;
  output += 'Xmit Queue   PeerQ        Mean SRTT   Pacing Time   Multicast    Pending\n';
  output += 'Interface              Peers  Un/Reliable  Un/Reliable  (ms)        Un/Reliable   Flow Timer   Routes\n';

  Object.entries(state.ports).forEach(([portName, port]) => {
    if (port.ipAddress && (port.mode === 'routed' || port.isRoutedPort || port.status === 'connected')) {
      output += `${portName.padEnd(23)}1      0/0          0/0          12          0/10          0            0\n`;
    }
  });

  return { success: true, output };
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

export function cmdShowPrefixList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const isIpv6 = /ipv6/i.test(input);
  const targetKey = isIpv6 ? 'ipv6PrefixLists' : 'prefixLists';
  const prefixLists = state[targetKey] || {};
  const names = Object.keys(prefixLists);

  if (names.length === 0) {
    return { success: true, output: `\n% No ${isIpv6 ? 'ipv6' : 'ip'} prefix-lists configured\n` };
  }

  let output = '\n';
  names.forEach(name => {
    const entries = prefixLists[name];
    output += `${isIpv6 ? 'ipv6' : 'ip'} prefix-list ${name}: ${entries.length} entries\n`;
    entries.forEach(e => {
      let line = `   seq ${e.seq} ${e.action} ${e.prefix}`;
      if (e.ge !== undefined) line += ` ge ${e.ge}`;
      if (e.le !== undefined) line += ` le ${e.le}`;
      output += `${line}\n`;
    });
  });

  return { success: true, output };
}

export function cmdShowRouteMap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const routeMaps = state.routeMaps || {};
  const names = Object.keys(routeMaps);

  if (names.length === 0) {
    return { success: true, output: '\n% No route-maps configured\n' };
  }

  let output = '\n';
  names.forEach(name => {
    const clauses = routeMaps[name];
    clauses.forEach(c => {
      output += `route-map ${name}, ${c.action}, sequence ${c.seq}\n`;
      output += '  Match clauses:\n';
      const mKeys = Object.keys(c.matchRules || {});
      if (mKeys.length === 0) {
        output += '    none\n';
      } else {
        if (c.matchRules.prefixList) output += `    ip address prefix-list ${c.matchRules.prefixList}\n`;
        if (c.matchRules.acl) output += `    ip address ${c.matchRules.acl}\n`;
        if (c.matchRules.interface) output += `    interface ${c.matchRules.interface}\n`;
      }
      output += '  Set clauses:\n';
      const sKeys = Object.keys(c.setRules || {});
      if (sKeys.length === 0) {
        output += '    none\n';
      } else {
        if (c.setRules.metric !== undefined) output += `    metric ${c.setRules.metric}\n`;
        if (c.setRules.nextHop) output += `    ip next-hop ${c.setRules.nextHop}\n`;
        if (c.setRules.localPreference !== undefined) output += `    local-preference ${c.setRules.localPreference}\n`;
        if (c.setRules.weight !== undefined) output += `    weight ${c.setRules.weight}\n`;
        if (Array.isArray(c.setRules.asPathPrepend) && c.setRules.asPathPrepend.length) {
          output += `    as-path prepend ${c.setRules.asPathPrepend.join(' ')}\n`;
        }
      }
    });
  });

  return { success: true, output };
}

export function cmdShowIpv6EigrpNeighbors(state: SwitchState, _input: string, ctx?: CommandContext): CommandResult {
  const as = state.eigrp6Config?.as;
  if (!as || state.eigrp6Config?.shutdown) return { success: true, output: '\n% EIGRPv6 is not configured\n' };

  let output = `\nEIGRP-IPv6 Neighbors for AS(${as})\n`;
  output += 'H   Address                                 Interface       Hold Uptime   SRTT   RTO  Q  Seq\n';
  output += '                                                            (sec)         (ms)        Cnt Num\n';

  const neighbors: Array<{ address: string; intf: string }> = [];

  if (ctx?.deviceStates && ctx?.sourceDeviceId) {
    const myId = ctx.sourceDeviceId;
    ctx.deviceStates.forEach((otherState, otherId) => {
      if (otherId === myId) return;
      if (otherState.eigrp6Config?.as !== as || otherState.eigrp6Config?.shutdown) return;

      Object.values(state.ports || {}).forEach(port => {
        if (!port.ipv6Eigrp?.enabled || port.ipv6Eigrp.as !== as || port.shutdown) return;
        const nPort = Object.values(otherState.ports || {}).find(p =>
          (p.ipv6Address || p.ipv6LinkLocal) && !p.shutdown && p.ipv6Eigrp?.enabled && p.ipv6Eigrp.as === as
        );
        if (nPort) {
          const nIp = nPort.ipv6LinkLocal || (nPort.ipv6Address ? nPort.ipv6Address.split('/')[0] : 'FE80::1');
          if (!neighbors.some(n => n.address === nIp && n.intf === port.id)) {
            neighbors.push({ address: nIp, intf: port.id });
          }
        }
      });
    });
  }

  if (neighbors.length > 0) {
    neighbors.forEach((n, idx) => {
      output += `${idx.toString().padEnd(4)} ${n.address.padEnd(39)} ${n.intf.padEnd(15)} 14 00:04:12    1   200  0  ${idx + 1}\n`;
    });
  } else {
    let hIdx = 0;
    Object.values(state.ports || {}).forEach(port => {
      if (port.ipv6Eigrp?.enabled && !port.shutdown) {
        const neighborIp = port.ipv6LinkLocal || 'FE80::1';
        output += `${hIdx.toString().padEnd(4)} ${neighborIp.padEnd(39)} ${port.id.padEnd(15)} 14 00:04:12    1   200  0  ${hIdx + 1}\n`;
        hIdx++;
      }
    });
  }

  return { success: true, output };
}

export function cmdShowIpv6EigrpTopology(state: SwitchState, _input: string, ctx?: CommandContext): CommandResult {
  const as = state.eigrp6Config?.as;
  if (!as || state.eigrp6Config?.shutdown) {
    return { success: true, output: '\n% EIGRPv6 is not configured on this device\n' };
  }

  const routerId = state.eigrp6Config?.routerId || state.routerId || '1.1.1.1';
  let output = `\nEIGRP-IPv6 Topology Table for AS(${as})/ID(${routerId})\n`;
  output += 'Codes: P - Passive, A - Active, U - Update, Q - Query, R - Reply, r - reply Status, s - sia Status\n\n';

  if (!ctx?.deviceStates || !ctx?.sourceDeviceId) {
    output += 'P 2001:DB8:1::/64, 1 successors, FD is 281600\n        via Connected, GigabitEthernet1/0/1\n';
    return { success: true, output };
  }

  const topoTable = buildEigrp6TopologyTable(ctx.sourceDeviceId, ctx.deviceStates);
  if (topoTable.length === 0) {
    output += '% EIGRPv6 topology table is empty\n';
    return { success: true, output };
  }

  const grouped = new Map<string, EigrpTopologyEntry[]>();
  topoTable.forEach(entry => {
    const key = `${entry.destination}/${entry.subnetMask}`;
    const list = grouped.get(key) || [];
    list.push(entry);
    grouped.set(key, list);
  });

  grouped.forEach((entries, key) => {
    const successorCount = entries.filter(e => e.isSuccessor).length;
    const fd = entries[0]?.feasibleDistance || 0;
    const stateCode = entries[0]?.state === 'Active' ? 'A' : 'P';
    output += `${stateCode} ${key}, ${successorCount} successors, FD is ${fd}\n`;
    entries.forEach(e => {
      const viaText = e.neighborIp === 'Connected' ? 'Connected' : e.neighborIp;
      output += `        via ${viaText} (${e.computedDistance}/${e.reportedDistance}), ${e.interfaceId}\n`;
    });
  });

  return { success: true, output };
}

export function cmdShowIpv6EigrpInterfaces(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const as = state.eigrp6Config?.as;
  if (!as || state.eigrp6Config?.shutdown) {
    return { success: true, output: '\n% EIGRPv6 is not configured on this device\n' };
  }

  let output = `\nEIGRP-IPv6 Interfaces for AS(${as})\n`;
  output += 'Xmit Queue   PeerQ        Mean SRTT   Pacing Time   Multicast    Pending\n';
  output += 'Interface              Peers  Un/Reliable  Un/Reliable  (ms)        Un/Reliable   Flow Timer   Routes\n';

  Object.entries(state.ports || {}).forEach(([portId, port]) => {
    if (port.ipv6Eigrp?.enabled && port.ipv6Eigrp.as === as && !port.shutdown) {
      output += `${portId.padEnd(23)}1      0/0          0/0          12          0/10          0            0\n`;
    }
  });

  return { success: true, output };
}
