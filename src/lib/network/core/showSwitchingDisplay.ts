import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { detectEtherChannelBundles, getLoadBalanceAlgorithm, formatLoadBalance } from '../etherchannel';
import {
  formatMacAddressSimple, getPortNumber,
} from './showHelpers';

/**
 * Show VLAN
 */
export function cmdShowVlan(
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult {
  const isBrief = /brief|br/i.test(input);
  let output = '\nVLAN Name                             Status    Ports\n';
  output += '---- -------------------------------- --------- -------------------------------\n';

  const allPorts = Object.keys(state.ports || {});
  const knownVlanIds = Object.keys(state.vlans || {});

  const vlanPortMap: Record<string, string[]> = {};
  allPorts.forEach(p => {
    const port = state.ports[p];
    const vlanId = String(port.accessVlan || port.vlan || 1);
    if (!vlanPortMap[vlanId]) vlanPortMap[vlanId] = [];
    vlanPortMap[vlanId].push(p);
  });

  // Default VLAN 1
  const vlan1Ports = vlanPortMap['1'] || [];
  output += `1    default                          active    ${vlan1Ports.join(', ') || '-'}\n`;

  // Other VLANs from state.vlans
  knownVlanIds.forEach(vlanId => {
    if (vlanId !== '1') {
      const vlan = state.vlans[Number(vlanId)];
      const vlanName = (vlan?.name || `VLAN${vlanId}`).padEnd(32);
      const vlanStatus = vlan?.status || 'active';
      const ports = vlanPortMap[vlanId] || [];
      output += `${vlanId.padEnd(4)} ${vlanName} ${vlanStatus.padEnd(9)} ${ports.join(', ') || '-'}\n`;
    }
  });


  // nOS only shows VLANs defined in state.vlans - ports assigned to undefined VLANs
  // are NOT shown as separate entries (no phantom VLANs)

  // Only show SAID/MTU table in full mode (not brief), matching real nOS behavior
  if (!isBrief) {
    output += '\nVLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2\n';
    output += '---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------\n';
    output += `1    enet  100001     1500  -      -      -        -    -        0      0\n`;

    knownVlanIds.forEach(vlanId => {
      if (vlanId !== '1') {
        output += `${vlanId.padEnd(4)}enet  ${100000 + parseInt(vlanId)}         1500  -      -      -        -    -        0      0\n`;
      }
    });
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show MAC Address Table
 */
export function cmdShowMacAddressTable(
  state: SwitchState,
  _input: string,
  ctx: CommandContext
): CommandResult {
  let output = '\nMac Address Table\n';
  output += '-------------------------------------------\n\n';
  output += 'Vlan    Mac Address       Type        Ports\n';
  output += '----    -----------       --------    -----\n';

  // Build MAC table from real connections (topologyConnections)
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId as string;

  // CPU static MAC addresses (multicast MACs)
  const cpuMacs: { vlan: number | string; mac: string; port: string; type: string }[] = [
    { vlan: 'All', mac: '0100.0ccc.cccc', port: 'CPU', type: 'STATIC' },
    { vlan: 'All', mac: '0100.0ccc.cccd', port: 'CPU', type: 'STATIC' },
    { vlan: 'All', mac: '0180.c200.0000', port: 'CPU', type: 'STATIC' },
  ];
  cpuMacs.forEach(e => { output += `${String(e.vlan).padEnd(8)}${e.mac.padEnd(18)}${e.type.padEnd(11)}${e.port}\n`; });

  // Collect MAC entries from connections only - no legacy data
  const macTable: { vlan: number; mac: string; port: string; type: string }[] = [];

  if (connections && connections.length > 0) {
    // Find all connections to this device using CanvasConnection format
    const deviceConnections = connections.filter(
      (conn: CanvasConnection) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    deviceConnections.forEach((conn: CanvasConnection) => {
      // Determine which port on the device is connected
      const isSource = conn.sourceDeviceId === sourceDeviceId;
      const portId = isSource ? conn.sourcePort : conn.targetPort;

      // Get the connected device's MAC address
      const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
      const connectedDevice = ctx.devices?.find((d: CanvasDevice) => d.id === connectedDeviceId);

      if (connectedDevice?.macAddress) {
        // Format MAC address: 0000.0000.0000
        const mac = formatMacAddressSimple(connectedDevice.macAddress);

        // Get VLAN from the port - check if trunk mode
        const portState = state.ports?.[portId];

        if (portState?.mode === 'trunk') {
          // For trunk ports, show all VLANs
          const vlans = Object.keys(state.vlans || {}).filter(v => v !== '1').slice(0, 5);
          if (vlans.length === 0) {
            // Default VLAN 1 for trunk
            macTable.push({
              vlan: 1,
              mac: mac,
              port: portId,
              type: 'DYNAMIC'
            });
          } else {
            // Add entries for each VLAN on trunk
            vlans.forEach((vlanId) => {
              macTable.push({
                vlan: parseInt(vlanId),
                mac: mac,
                port: portId,
                type: 'DYNAMIC'
              });
            });
          }
        } else {
          // Access port - get VLAN from accessVlan or default to 1
          const vlan = Number(portState?.accessVlan || portState?.vlan || 1);
          macTable.push({
            vlan: vlan,
            mac: mac,
            port: portId,
            type: 'DYNAMIC'
          });
        }
      }
    });
  }

  // Remove duplicates based on VLAN + MAC + Port
  const uniqueMacTable = macTable.filter((entry, index, self) =>
    index === self.findIndex(e => e.vlan === entry.vlan && e.mac === entry.mac && e.port === entry.port)
  );

  // Show learned MAC addresses from connections
  if (uniqueMacTable.length > 0) {
    uniqueMacTable.forEach((entry) => {
      output += `${String(entry.vlan).padEnd(8)}${entry.mac.padEnd(18)}${entry.type.padEnd(11)}${entry.port}\n`;
    });
  }

  // If no MAC addresses found, show nothing (matching real behavior)

  output += '\nTotal Mac Addresses for this criterion: ' + uniqueMacTable.length + '\n';
  output += '!\n';
  return { success: true, output };
}

/**
 * Show CDP Neighbors
 */
export function cmdShowCdpNeighbors(
  state: SwitchState,
  _input: string,
  ctx: CommandContext
): CommandResult {
  let output = '\nCapability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n';
  output += '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone\n\n';
  output += 'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n';

  // Get real neighbors from topology
  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId as string;
  const devices = ctx.devices || [];
  const cdpEnabled = state.cdpEnabled !== false;

  if (!cdpEnabled) {
    output += 'CDP is not enabled\n';
  } else {
    // Find connections to this device
    const deviceConnections = connections.filter(
      (conn: CanvasConnection) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    if (deviceConnections.length === 0) {
      output += 'No CDP neighbors found\n';
    } else {
      deviceConnections.forEach((conn: CanvasConnection) => {
        const isSource = conn.sourceDeviceId === sourceDeviceId;
        const localPort = isSource ? conn.sourcePort : conn.targetPort;
        const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
        const remotePort = isSource ? conn.targetPort : conn.sourcePort;

        const connectedDevice = devices.find((d: CanvasDevice) => d.id === connectedDeviceId);

        if (connectedDevice) {
          // Determine capability based on device type
          const deviceType = connectedDevice.type;
          let capability = 'S'; // Switch
          if (deviceType === 'router') capability = 'R';
          else if (deviceType === 'pc') capability = 'H';
          else if (deviceType === 'iot') capability = 'H';

          // Platform based on device type
          let platform = 'WS-C2960-24TT-L';
          if (deviceType === 'router') platform = 'C2911';
          else if (deviceType === 'pc') platform = 'PC';
          else if (deviceType === 'iot') platform = 'IoT';

          output += `${connectedDevice.name.padEnd(16)}${localPort.padEnd(18)}${'140'.padEnd(12)}${capability.padEnd(12)}${platform.padEnd(11)}${remotePort}\n`;
        }
      });
    }
  }

  output += '\nTotal entries displayed: ' + (cdpEnabled ? connections.filter((c: CanvasConnection) => c.sourceDeviceId === sourceDeviceId || c.targetDeviceId === sourceDeviceId).length : 0) + '\n';
  output += '!\n';
  return { success: true, output };
}

/** Show Spanning Tree
 */
export function cmdShowSpanningTree(
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult {
  let output = '';

  // Get spanning tree mode
  const stpMode = state.spanningTreeMode || 'pvst';

  // Parse input to check if specific VLAN is requested
  const vlanMatch = input.match(/vlan\s+(\d+)/i);
  const requestedVlan = vlanMatch ? vlanMatch[1] : null;

  // Use pre-calculated STP state from SwitchState
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

      // Find root port for display
      const rootPortEntry = Object.entries(vStp.ports).find(([_, p]) => p.role === 'root');
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
    output += `             Aging Time  300\n\n`;

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
      output += `${interfaceName.padEnd(19)}${role.padStart(4)} ${status.padStart(3)} ${cost.toString().padStart(9)} ${prioNbr.padStart(8)}    P2p\n`;
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

  // Show aging information if configured
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
 * Show CDP (brief)
 */
export function cmdShowCdp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const enabled = state.cdpEnabled !== false;
  let output = '\nGlobal CDP information:\n';
  output += `  CDP is ${enabled ? 'enabled' : 'disabled'}\n`;
  output += `  Sending CDP packets every 60 seconds\n`;
  output += `  Sending a holdtime value of 180 seconds\n`;
  return { success: true, output };
}

/**
 * Show VTP Status
 */
export function cmdShowVtpStatus(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nVTP Version capable             : 1 to 3\n';
  output += `VTP version running             : 2\n`;
  output += `VTP Domain Name                 : ${state.vtpDomain || ''}\n`;
  output += `VTP Pruning Mode                : Disabled\n`;
  output += `VTP Traps Generation            : Disabled\n`;
  output += `MD5 digest                      : 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00\n`;
  output += `Configuration last modified by  : 0.0.0.0 at 0-0-00 00:00:00\n`;
  output += `Local updater ID is 0.0.0.0 (no valid interface found)\n\n`;
  output += `Feature VLAN:\n`;
  output += `--------------\n`;
  output += `VTP Operating Mode                : ${(state.vtpMode || 'server').charAt(0).toUpperCase() + (state.vtpMode || 'server').slice(1)}\n`;
  output += `Maximum VLANs supported locally   : 1005\n`;
  output += `Number of existing VLANs          : ${Object.keys(state.vlans || {}).length}\n`;
  output += `Configuration Revision            : ${state.vtpRevision || 0}\n`;
  output += `MD5 digest                       : 0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00\n`;
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

  // Detect real bundles from peer states if available
  const bundles = (_ctx.connections && _ctx.deviceStates)
    ? detectEtherChannelBundles(_ctx.connections, _ctx.deviceStates)
    : [];

  // Build a set of (devicePair, groupId) for bundles that are actually bundled
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

  const getBundleInfoForGroup = (groupId: number) => {
    const info = bundleByGroup.get(`${groupId}`);
    if (info) {
      return info;
    }
    // Fallback: local only, no peer info
    const ports = groups[groupId] || [];
    const mode = ports.length > 0 ? (state.ports[ports[0]]?.channelMode || 'on') : 'on';
    const protocol = mode === 'on' ? '-' : 'LACP';
    return { protocol, bundled: true };
  };

  // show etherchannel load-balance
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

  // show etherchannel port-channel
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
        output += `  Member ports: ${ports.join(', ')}\n\n`;
      });
    }
    return { success: true, output };
  }

  // show etherchannel summary
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
      const flags = info.bundled ? 'P' : 'D';
      const protocol = info.protocol === 'static' ? '-' : info.protocol.toUpperCase();
      output += `${group.padEnd(7)}Po${group.padEnd(13)}${protocol.padEnd(12)}${ports.map(p => `${flags}(${p})`).join(' ')}\n`;
    });

    return { success: true, output };
  }

  // show etherchannel port
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

  // show etherchannel detail
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
      const info = getBundleInfoForGroup(parseInt(group));
      const mode = state.ports[ports[0]]?.channelMode || 'on';
      output += `${group.padEnd(7)}Po${group.padEnd(14)}${mode.toUpperCase().padEnd(10)}`;
      output += ports.map(p => `${info.bundled ? 'P' : 'D'}(${p})`).join(', ') + '\n';
    });
    return { success: true, output };
  }

  // Default: show etherchannel
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
    const flags = info.bundled ? 'P' : 'D';
    const protocol = info.protocol === 'static' ? '-' : info.protocol.toUpperCase();
    output += `${group.padEnd(7)}Po${group.padEnd(13)}${protocol.padEnd(12)}${ports.map(p => `${flags}(${p})`).join(', ')}\n`;
  });

  return { success: true, output };
}

/**
 * Show ARP / Show IP ARP
 */
export function cmdShowArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\nProtocol  Address          Age (min)  Hardware Addr   Type   Interface\n';
  output += '-------- ----------------- ---------- ---------------- ------ ---------\n';

  const arpCache = state.arpCache || [];
  const now = Date.now();

  const arpEntries: { protocol: string; address: string; age: string; mac: string; type: string; interface: string }[] = [];

  arpCache.forEach((entry: { ip: string; mac: string; interface: string; timestamp: number }) => {
    const ageMs = now - entry.timestamp;
    const ageMin = Math.floor(ageMs / 60000);
    const mac = formatMacAddressSimple(entry.mac);

    arpEntries.push({
      protocol: 'Internet',
      address: entry.ip,
      age: ageMin.toString(),
      mac: mac,
      type: 'ARPA',
      interface: entry.interface
    });
  });

  (state.macAddressTable || []).forEach((entry: { type: string; ip?: string; mac: string; vlan: number }) => {
    if (entry.type === 'STATIC' && entry.ip) {
      arpEntries.push({
        protocol: 'Internet',
        address: entry.ip,
        age: '-',
        mac: entry.mac,
        type: 'ARPA',
        interface: `Vlan${entry.vlan}`
      });
    }
  });

  if (arpEntries.length > 0) {
    arpEntries.forEach((entry) => {
      output += `${entry.protocol.padEnd(9)}${entry.address.padEnd(18)}${entry.age.padEnd(11)}${entry.mac.padEnd(18)}${entry.type.padEnd(7)}${entry.interface}\n`;
    });
  } else {
    output += 'No ARP entries found\n';
  }

  output += '!\n';
  return { success: true, output };
}

/**
 * Show MAC Static
 */
export function cmdShowMacStatic(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\nMac Address Table\n-------------------------------------------\n\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\nAll    0100.0ccc.cccc    STATIC      CPU\nAll    0100.0ccc.cccd    STATIC      CPU\n' };
}

/**
 * Show LLDP
 */
export function cmdShowLldp(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, output: '\n% LLDP is not enabled\n' };
}

/**
 * Show VTP Password
 */
export function cmdShowVtpPassword(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const anyState = state as SwitchState & { vtp?: { password?: string } };
  const vtp = anyState.vtp || {};
  if (vtp.password) {
    return { success: true, output: `\nVTP Password: ${vtp.password}\n` };
  }
  return { success: true, output: '\n% VTP password not set\n' };
}
