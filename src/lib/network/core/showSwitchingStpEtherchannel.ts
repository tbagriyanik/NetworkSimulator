import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { detectEtherChannelBundles, getLoadBalanceAlgorithm, formatLoadBalance } from '../etherchannel';
import { getPortNumber } from './showHelpers';

/**
 * Show Spanning Tree
 */
export function cmdShowSpanningTree(
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult {
  let output = '';

  const stpMode = state.spanningTreeMode || 'pvst';

  const vlanMatch = input.match(/vlan\s+(\d+)/i);
  const requestedVlan = vlanMatch ? vlanMatch[1] : null;

  if (!state.stpState || Object.keys(state.stpState).length === 0) {
    return { success: true, output: '\nNo spanning tree instances found\n' };
  }

  const vlanIds = requestedVlan
    ? (state.stpState[Number(requestedVlan)] ? [Number(requestedVlan)] : [])
    : Object.keys(state.stpState).map(Number).sort((a, b) => a - b);

  if (requestedVlan && vlanIds.length === 0) {
    return { success: false, error: `% Invalid VLAN ID: ${requestedVlan}` };
  }

  vlanIds.forEach((vlanId) => {
    const vStp = state.stpState?.[vlanId];
    if (!vStp) return;
    output += `\nVLAN${String(vlanId).padStart(4, '0')}\n`;
    const stpProtocol = stpMode === 'mst' ? 'mstp' : stpMode === 'rapid-pvst' ? 'rstp' : 'ieee';
    output += `  Spanning tree enabled protocol ${stpProtocol}\n`;

    if (vStp.isRoot) {
      output += `  Root ID    Priority    ${vStp.bridgeId.split('.')[0]}\n`;
      output += `             Address     ${vStp.bridgeId.split('.').slice(1).join('.')}\n`;
      output += `             This bridge is the root\n`;
    } else {
      output += `  Root ID    Priority    ${vStp.rootBridgeId.split('.')[0]}\n`;
      output += `             Address     ${vStp.rootBridgeId.split('.').slice(1).join('.')}\n`;

      const rootPortEntry = Object.entries(vStp.ports).find(([, p]) => p.role === 'root');
      if (rootPortEntry) {
        const [portId] = rootPortEntry;
        const rootPortNum = getPortNumber(portId);
        output += `             Cost        ${vStp.rootCost}\n`;
        output += `             Port        ${rootPortNum} (${portId})\n`;
      }
    }
    output += `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec\n\n`;
    output += `  Bridge ID  Priority    ${vStp.bridgeId.split('.')[0]}  (priority ${parseInt(vStp.bridgeId.split('.')[0]) - vlanId} sys-id-ext ${vlanId})\n`;
    output += `             Address     ${state.macAddress || '001A.2B3C.4D5E'}\n`;
    output += `             Hello Time   2 sec  Max Age 20 sec  Forward Delay 15 sec\n`;
    output += `             Aging Time  300`;
    if (state.loopguardDefault) {
      output += `\n             Loopguard default            enabled`;
    }
    output += `\n\n`;

    output += `Interface           Role Sts Cost      Prio.Nbr Type\n`;
    output += `------------------- ---- --- --------- -------- --------------------------------\n`;

    const sortedPorts = Object.entries(vStp.ports)
      .sort(([a], [b]) => getPortNumber(a) - getPortNumber(b));

    sortedPorts.forEach(([portId, pInfo]) => {
      const port = state.ports[portId];
      if (!port) return;

      const portNum = getPortNumber(portId);
      const roleMap: Record<string, string> = { 'root': 'Root', 'designated': 'Desg', 'alternate': 'Altn', 'backup': 'Back', 'disabled': 'Dis' };
      const stateMap: Record<string, string> = { 'forwarding': 'FWD', 'blocking': 'BLK', 'listening': 'LIS', 'learning': 'LRN', 'disabled': 'DIS' };

      const role = roleMap[pInfo.role] || pInfo.role;
      const status = stateMap[pInfo.state] || pInfo.state;
      const cost = pInfo.cost;
      const prioNbr = `${port.stpPriority ?? 128}.${portNum}`;

      const interfaceName = portId.length <= 18 ? portId : portId.substring(0, 18);
      let guardInfo = 'P2p';
      if (port.spanningTree?.loopguard === 'enable') guardInfo = 'P2p *LG';
      else if (port.spanningTree?.loopguard === 'disable') guardInfo = 'P2p *noLG';
      output += `${interfaceName.padEnd(19)}${role.padStart(4)} ${status.padStart(3)} ${cost.toString().padStart(9)} ${prioNbr.padStart(8)}    ${guardInfo}\n`;
    });
  });

  output += '\n';
  return { success: true, output };
}

/**
 * Show Spanning Tree Interface
 */
export function cmdShowSpanningTreeInterface(
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult {
  const match = input.match(/show\s+spanning-tree\s+interface\s+(\S+)(?:\s+detail)?/i);
  const interfaceName = match?.[1];
  const isDetail = input.toLowerCase().includes('detail');

  if (!interfaceName) {
    return { success: false, error: '% Incomplete command.' };
  }

  const port = (state.ports || {})[interfaceName.toLowerCase()];
  if (!port) {
    return { success: false, error: `% Interface ${interfaceName} not found` };
  }

  let output = `\nSpanning Tree Protocol for interface ${interfaceName}\n`;
  const stp = port.spanningTree;

  if (!stp) {
    output += '  Spanning Tree not configured on this interface\n';
  } else {
    output += `  Port Role: ${stp.role || 'disabled'}\n`;
    output += `  Port State: ${stp.state || 'disabled'}\n`;

    if (stp.portfast) {
      output += `  Portfast: enabled\n`;
    }
    if (stp.bpduguard) {
      output += `  BPDU Guard: enabled\n`;
    }
    if (stp.loopguard === 'enable') {
      output += `  Loop Guard: enabled\n`;
    } else if (stp.loopguard === 'disable') {
      output += `  Loop Guard: disabled\n`;
    } else if (state.loopguardDefault) {
      output += `  Loop Guard: default (enabled globally)\n`;
    }

    if (isDetail) {
      output += `\n  Designated Root Maintenance\n`;
      output += `    Priority: 32768\n`;
      output += `    Cost: 0\n`;
      output += `    Port: 0\n`;
      output += `    Hello Time: 2\n`;
      output += `    Max Age: 20\n`;
      output += `    Forward Delay: 15\n`;

      output += `\n  Port Role State Transitions\n`;
      output += `    Forward Transitions: 1\n`;
      output += `    Blocked Transitions: 0\n`;

      if (stp.instances && Object.keys(stp.instances).length > 0) {
        output += `\n  MSTP Instances:\n`;
        Object.keys(stp.instances).forEach(instId => {
          const inst = stp.instances?.[Number(instId)];
          if (!inst) return;
          output += `    Instance ${instId}:\n`;
          output += `      Role: ${inst.role || 'disabled'}\n`;
          output += `      State: ${inst.state || 'disabled'}\n`;
        });
      }
    }
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show Port Security
 */
export function cmdShowPortSecurity(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  let output = '\nSecure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action\n';
  output += '-----------------------------------------------------------------------\n';

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.portSecurity?.enabled) {
      const maxAddr = port.portSecurity.maxAddresses || 1;
      const currentAddr = (port.staticMacs?.length || 0) + (port.portSecurity.sticky ? 1 : 0);
      const violations = port.portSecurity.violations || 0;
      const action = port.portSecurity.violationAction || 'Shutdown';
      output += `${portName.padEnd(12)}${String(maxAddr).padEnd(15)}${String(currentAddr).padEnd(13)}${String(violations).padEnd(20)}${action}\n`;
    }
  });

  output += '!\n';

  let hasAging = false;
  let agingOutput = '\nAging Configuration:\n';
  agingOutput += '--------------------\n';
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.portSecurity?.enabled && port.portSecurity.aging?.enabled) {
      hasAging = true;
      const agingTime = port.portSecurity.aging.time || 0;
      const agingType = port.portSecurity.aging.type || 'absolute';
      agingOutput += `${portName.padEnd(12)}Time: ${agingTime} min, Type: ${agingType}\n`;
    }
  });

  if (hasAging) {
    output += agingOutput;
  }

  return { success: true, output };
}

/**
 * Show EtherChannel Summary
 */
export function cmdShowEtherchannel(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  let option = '';
  const optMatch = input.match(/^show\s+etherchannel\s+(\w+)\s*(.*)$/i);
  if (optMatch) {
    option = optMatch[1].toLowerCase();
  }

  const groups: Record<number, string[]> = {};
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (port.channelGroup) {
      if (!groups[port.channelGroup]) groups[port.channelGroup] = [];
      groups[port.channelGroup].push(portName);
    }
  });

  const bundles = (_ctx.connections && _ctx.deviceStates)
    ? detectEtherChannelBundles(_ctx.connections, _ctx.deviceStates)
    : [];

  const bundledKeys = new Set<string>();
  const bundleByGroup = new Map<string, { protocol: string; bundled: boolean; reason?: string }>();
  for (const b of bundles) {
    const key = `${b.sourceDeviceId}::${b.targetDeviceId}::${b.groupId}`;
    bundledKeys.add(key);
    if (b.bundled) {
      bundleByGroup.set(`${b.groupId}`, { protocol: b.protocol, bundled: true });
    } else {
      bundleByGroup.set(`${b.groupId}`, { protocol: b.protocol, bundled: false, reason: b.reason });
    }
  }

  const sourceDeviceId = _ctx.sourceDeviceId;
  const memberIsUp = (portId: string): boolean => {
    for (const b of bundles) {
      for (const m of b.members) {
        if (b.sourceDeviceId === sourceDeviceId && m.sourcePort === portId) return m.up;
        if (b.targetDeviceId === sourceDeviceId && m.targetPort === portId) return m.up;
        if (!sourceDeviceId && (m.sourcePort === portId || m.targetPort === portId)) return m.up;
      }
    }
    return true;
  };

  const getBundleInfoForGroup = (groupId: number) => {
    const info = bundleByGroup.get(`${groupId}`);
    if (info) {
      return info;
    }
    const ports = groups[groupId] || [];
    const mode = ports.length > 0 ? (state.ports[ports[0]]?.channelMode || 'on') : 'on';
    const protocol = mode === 'on' ? '-' : 'LACP';
    return { protocol, bundled: true };
  };

  if (option === 'load-balance') {
    const algo = getLoadBalanceAlgorithm('');
    let output = `\nLoad-balanceing: ${formatLoadBalance(algo)}\n`;
    output += 'Hash aritmatic: Rotational\n';
    output += `Minimum load:  0    %<->100\n`;
    if (Object.keys(groups).length === 0) {
      output += 'Members : <empty>\n';
    } else {
      output += 'Members : ' + Object.entries(groups).map(([g, ps]) => `Po${g}: ${ps.join(', ')}`).join(', ') + '\n';
    }
    return { success: true, output };
  }

  if (option === 'port-channel') {
    let output = '\nPort-channels in the switch:\n\n';
    if (Object.keys(groups).length === 0) {
      output += 'No port-channels configured\n';
    } else {
      Object.entries(groups).forEach(([group, ports]) => {
        const info = getBundleInfoForGroup(parseInt(group));
        const protocol = info.protocol === 'static' ? '-' : info.protocol.toUpperCase();
        output += `Port-channel ${group}\n`;
        output += `  Protocol: ${protocol}\n`;
        const mode = state.ports[ports[0]]?.channelMode || 'on';
        output += `  Mode: ${mode.toUpperCase()}\n`;
        output += `  Member ports: ${ports.map(p => (memberIsUp(p) ? p : `${p} (down)`)).join(', ')}\n\n`;
      });
    }
    return { success: true, output };
  }

  if (option === 'summary') {
    let output = '\nFlags:  D - down        P - bundled in port-channel\n';
    output += '        I - stand-alone s - suspended\n';
    output += '        H - Hot-standby (LACP only)\n';
    output += '        R - Layer3      S - Layer2\n';
    output += '        U - in use      f - failed to allocate aggregator\n\n';
    output += `Number of channel-groups in use: ${Object.keys(groups).length}\n`;
    output += `Number of aggregators:           ${Object.keys(groups).length}\n\n`;
    output += 'Group  Port-channel  Protocol    Ports\n';
    output += '------+-------------+-----------+-----------------------------------------------\n';

    Object.entries(groups).forEach(([group, ports]) => {
      const info = getBundleInfoForGroup(parseInt(group));
      const poPort = state.ports[`po${group}`];
      const isLayer3 = poPort?.mode === 'routed' || poPort?.isRoutedPort;
      const layerFlag = isLayer3 ? 'R' : 'S';
      const protocol = info.protocol === 'static' ? '-' : info.protocol.toUpperCase();
      output += `${group.padEnd(7)}Po${group}(${layerFlag}).padEnd(13)${protocol.padEnd(12)}${ports.map(p => `${memberIsUp(p) ? 'P' : 'D'}(${p})`).join(' ')}\n`;
    });

    return { success: true, output };
  }

  if (option === 'port') {
    let output = '\nChannel group listing:\n';
    output += '--------------------------------------------\n';
    if (Object.keys(groups).length === 0) {
      output += '<none>\n';
    } else {
      Object.entries(groups).forEach(([group, ports]) => {
        output += `Group ${group}: Po${group} -> ${ports.join(', ')}\n`;
      });
    }
    return { success: true, output };
  }

  if (option === 'detail') {
    let output = '\nFlags:  D - down        P - bundled in port-channel\n';
    output += '        I - stand-alone s - suspended\n';
    output += '        H - Hot-standby (LACP only)\n';
    output += '        R - Layer3      S - Layer2\n';
    output += '        U - in use      f - failed to allocate aggregator\n\n';
    output += `Number of channel-groups in use: ${Object.keys(groups).length}\n`;
    output += `Number of aggregators:           ${Object.keys(groups).length}\n\n`;
    output += 'Group Port-channel     Protocol Ports\n';
    output += '------+---------------+---------+------------------------\n';
    Object.entries(groups).forEach(([group, ports]) => {
      const poPort = state.ports[`po${group}`];
      const isLayer3 = poPort?.mode === 'routed' || poPort?.isRoutedPort;
      const layerFlag = isLayer3 ? 'R' : 'S';
      const mode = state.ports[ports[0]]?.channelMode || 'on';
      output += `${group.padEnd(7)}Po${group.padEnd(14)}${mode.toUpperCase().padEnd(10)}`;
      output += ports.map(p => `${memberIsUp(p) ? 'P' : 'D'}(${p})`).join(', ');
      output += ` [${layerFlag}]\n`;
    });
    return { success: true, output };
  }

  let output = '\nFlags:  D - down        P - bundled in port-channel\n';
  output += '        I - stand-alone s - suspended\n';
  output += '        H - Hot-standby (LACP only)\n';
  output += '        R - Layer3      S - Layer2\n';
  output += '        U - in use      f - failed to allocate aggregator\n\n';
  output += `Number of channel-groups in use: ${Object.keys(groups).length}\n`;
  output += `Number of aggregators:           ${Object.keys(groups).length}\n\n`;
  Object.entries(groups).forEach(([group, ports]) => {
    const info = getBundleInfoForGroup(parseInt(group));
    const poPort = state.ports[`po${group}`];
    const isLayer3 = poPort?.mode === 'routed' || poPort?.isRoutedPort;
    const layerFlag = isLayer3 ? 'R' : 'S';
    const protocol = info.protocol === 'static' ? '-' : info.protocol.toUpperCase();
    output += `${group.padEnd(7)}Po${group.padEnd(13)}${protocol.padEnd(12)}${ports.map(p => `${memberIsUp(p) ? 'P' : 'D'}(${p})`).join(', ')} [${layerFlag}]\n`;
  });

  return { success: true, output };
}
