import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { formatMacAddressSimple, formatPortName } from './showHelpers';

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
  output += `1    default                          active    ${vlan1Ports.join(', ')}\n`;

  // Other VLANs from state.vlans
  knownVlanIds.forEach(vlanId => {
    if (vlanId !== '1') {
      const vlan = state.vlans[Number(vlanId)];
      const vlanName = (vlan?.name || `VLAN${vlanId}`).padEnd(32);
      const vlanStatus = (vlan?.status || 'active').padEnd(9);
      const ports = (vlanPortMap[vlanId] || []).join(', ');
      output += `${vlanId.padEnd(4)} ${vlanName} ${vlanStatus} ${ports}\n`;
    }
  });

  // Default token ring/fddi VLANs for full show vlan
  if (!isBrief) {
    if (!state.vlans?.[1002]) output += `1002 fddi-default                     act/unsup\n`;
    if (!state.vlans?.[1003]) output += `1003 token-ring-default               act/unsup\n`;
    if (!state.vlans?.[1004]) output += `1004 fddinet-default                  act/unsup\n`;
    if (!state.vlans?.[1005]) output += `1005 trnet-default                    act/unsup\n`;

    output += '\nVLAN Type  SAID       MTU   Parent RingNo BridgeNo Stp  BrdgMode Trans1 Trans2\n';
    output += '---- ----- ---------- ----- ------ ------ -------- ---- -------- ------ ------\n';
    output += `1    enet  100001     1500  -      -      -        -    -        0      0\n`;

    knownVlanIds.forEach(vlanId => {
      if (vlanId !== '1') {
        output += `${vlanId.padEnd(4)}enet  ${100000 + parseInt(vlanId)}         1500  -      -      -        -    -        0      0\n`;
      }
    });
  }

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
  let output = '          Mac Address Table\n';
  output += '-------------------------------------------\n\n';
  output += 'Vlan    Mac Address       Type        Ports\n';
  output += '----    -----------       --------    -----\n';

  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId as string;

  const cpuMacs: { vlan: number | string; mac: string; port: string; type: string }[] = [
    { vlan: 'All', mac: '0100.0ccc.cccc', port: 'CPU', type: 'STATIC' },
    { vlan: 'All', mac: '0100.0ccc.cccd', port: 'CPU', type: 'STATIC' },
    { vlan: 'All', mac: '0180.c200.0000', port: 'CPU', type: 'STATIC' },
  ];
  cpuMacs.forEach(e => { output += `${String(e.vlan).padEnd(8)}${e.mac.padEnd(18)}${e.type.padEnd(12)}${e.port}\n`; });

  const macTable: { vlan: number; mac: string; port: string; type: string }[] = [];

  if (connections && connections.length > 0) {
    const deviceConnections = connections.filter(
      (conn: CanvasConnection) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    deviceConnections.forEach((conn: CanvasConnection) => {
      const isSource = conn.sourceDeviceId === sourceDeviceId;
      const portId = formatPortName(isSource ? conn.sourcePort : conn.targetPort);

      const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
      const connectedDevice = ctx.devices?.find((d: CanvasDevice) => d.id === connectedDeviceId);

      if (connectedDevice?.macAddress) {
        const mac = formatMacAddressSimple(connectedDevice.macAddress);

        const rawPortId = isSource ? conn.sourcePort : conn.targetPort;
        const portState = state.ports?.[rawPortId];

        if (portState?.mode === 'trunk') {
          const vlans = Object.keys(state.vlans || {}).filter(v => v !== '1').slice(0, 5);
          if (vlans.length === 0) {
            macTable.push({ vlan: 1, mac, port: portId, type: 'DYNAMIC' });
          } else {
            vlans.forEach((vlanId) => {
              macTable.push({ vlan: parseInt(vlanId), mac, port: portId, type: 'DYNAMIC' });
            });
          }
        } else {
          const vlan = Number(portState?.accessVlan || portState?.vlan || 1);
          macTable.push({ vlan, mac, port: portId, type: 'DYNAMIC' });
        }
      }
    });
  }

  const uniqueMacTable = macTable.filter((entry, index, self) =>
    index === self.findIndex(e => e.vlan === entry.vlan && e.mac === entry.mac && e.port === entry.port)
  );

  if (uniqueMacTable.length > 0) {
    uniqueMacTable.forEach((entry) => {
      output += `${String(entry.vlan).padEnd(8)}${entry.mac.padEnd(18)}${entry.type.padEnd(12)}${entry.port}\n`;
    });
  }

  output += '\nTotal Mac Addresses for this criterion: ' + (uniqueMacTable.length + cpuMacs.length) + '\n';
  return { success: true, output };
}

/**
 * Show CDP Neighbors
 */
export function cmdShowCdpNeighbors(
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult {
  const cdpEnabled = state.cdpEnabled !== false;
  if (!cdpEnabled) {
    return { success: true, output: '\n% CDP is not enabled\n' };
  }

  const connections = ctx.connections || [];
  const sourceDeviceId = ctx.sourceDeviceId as string;
  const devices = ctx.devices || [];

  const deviceConnections = connections.filter(
    (conn: CanvasConnection) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
  );

  const isDetail = /detail|det/i.test(input);

  if (isDetail) {
    if (deviceConnections.length === 0) {
      return { success: true, output: '\nNo CDP neighbors found\n' };
    }

    let output = '\n';
    deviceConnections.forEach((conn: CanvasConnection) => {
      const isSource = conn.sourceDeviceId === sourceDeviceId;
      const localPort = isSource ? conn.sourcePort : conn.targetPort;
      const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
      const remotePort = isSource ? conn.targetPort : conn.sourcePort;

      const connectedDevice = devices.find((d: CanvasDevice) => d.id === connectedDeviceId);
      if (connectedDevice) {
        const deviceType = connectedDevice.type;
        let capability = 'Switch';
        let platform = 'NS-L2-24TT-L';
        let version = 'NOS Software, NS-L2 Software (NS-L2-LANBASEK9-M), Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)';

        if (deviceType === 'router') {
          capability = 'Router';
          platform = 'NS-R-2911';
          version = 'NOS Software, NS-R Software (NS-R-UNIVERSALK9-M), Version 15.1(4)M4, RELEASE SOFTWARE (fc2)';
        } else if (deviceType === 'pc') {
          capability = 'Host';
          platform = 'PC / Workstation';
          version = 'Network OS Workstation Kernel 6.1.0';
        } else if (deviceType === 'iot') {
          capability = 'Host';
          platform = 'IoT Device';
          version = 'Embedded MicroOS v2.4';
        } else if (deviceType === 'wlc') {
          capability = 'Switch, WLAN';
          platform = 'NS-WLC-2504';
          version = 'NOS Software, Version 8.5.140.0';
        } else if (deviceType === 'firewall') {
          capability = 'Router';
          platform = 'ASA5505';
          version = 'NOS Software, Version 9.1(2)';
        }

        const neighborState = ctx.deviceStates?.get(connectedDeviceId);
        let managementIp = connectedDevice.ip || '';
        if (!managementIp && neighborState) {
          const portIp = Object.values(neighborState.ports || {}).find(p => p.ipAddress)?.ipAddress;
          if (portIp) managementIp = portIp;
        }
        if (!managementIp) {
          managementIp = '0.0.0.0';
        }

        const nativeVlan = neighborState?.ports?.[remotePort]?.vlan || 1;
        output += `-------------------------\n`;
        output += `Device ID: ${connectedDevice.name}\n`;
        output += `Entry address(es):\n`;
        output += `  IP address: ${managementIp}\n`;
        output += `Platform: ${platform},  Capabilities: ${capability}\n`;
        output += `Interface: ${localPort},  Port ID (outgoing port): ${remotePort}\n`;
        output += `Holdtime : 140 sec\n\n`;
        output += `Version :\n${version}\n\n`;
        output += `advertisement version: 2\n`;
        output += `Duplex: full\n`;
        output += `Native VLAN: ${nativeVlan}\n`;
        output += `VTP Management Domain: ''\n`;
      }
    });

    output += `-------------------------\n`;
    output += `Total cdp entries displayed : ${deviceConnections.length}\n`;
    return { success: true, output };
  }

  let output = '\nCapability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n';
  output += '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone\n\n';
  output += 'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n';

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
        const deviceType = connectedDevice.type;
        let capability = 'S';
        let platform = 'NS-L2-24TT-L';

        if (deviceType === 'router') {
          capability = 'R';
          platform = 'NS-R-2911';
        } else if (deviceType === 'pc' || deviceType === 'iot') {
          capability = 'H';
          platform = deviceType === 'pc' ? 'PC' : 'IoT';
        } else if (deviceType === 'wlc') {
          capability = 'S';
          platform = 'NS-WLC-2504';
        } else if (deviceType === 'firewall') {
          capability = 'R';
          platform = 'ASA5505';
        }

        output += `${connectedDevice.name.padEnd(16)}${localPort.padEnd(18)}${'140'.padEnd(12)}${capability.padEnd(12)}${platform.padEnd(11)}${remotePort}\n`;
      }
    });
  }

  output += '\nTotal entries displayed: ' + deviceConnections.length + '\n';
  output += '!\n';
  return { success: true, output };
}

export function cmdShowCdp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const enabled = state.cdpEnabled !== false;
  let output = '\nGlobal CDP information:\n';
  output += `  CDP is ${enabled ? 'enabled' : 'disabled'}\n`;
  output += `  Sending CDP packets every 60 seconds\n`;
  output += `  Sending a holdtime value of 180 seconds\n`;
  return { success: true, output };
}

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

export function cmdShowVtpPassword(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  const anyState = state as SwitchState & { vtp?: { password?: string } };
  const vtp = anyState.vtp || {};
  if (vtp.password) {
    return { success: true, output: `\nVTP Password: ${vtp.password}\n` };
  }
  return { success: true, output: '\n% VTP password not set\n' };
}

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

export function cmdShowMacStatic(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '          Mac Address Table\n';
  output += '-------------------------------------------\n\n';
  output += 'Vlan    Mac Address       Type        Ports\n';
  output += '----    -----------       --------    -----\n';

  output += 'All     0100.0ccc.cccc    STATIC      CPU\n';
  output += 'All     0100.0ccc.cccd    STATIC      CPU\n';
  output += 'All     0180.c200.0000    STATIC      CPU\n';

  let count = 3;

  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    const vlan = Number(port.accessVlan || port.vlan || 1);
    const staticList = port.staticMacs || [];
    staticList.forEach(sm => {
      count++;
      output += `${String(vlan).padEnd(8)}${formatMacAddressSimple(sm).padEnd(18)}${'STATIC'.padEnd(12)}${formatPortName(portName)}\n`;
    });
  });

  output += '\nTotal Mac Addresses for this criterion: ' + count + '\n';
  return { success: true, output };
}

export function cmdShowLldp(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  const enabled = state.lldpEnabled === true;
  if (!enabled) {
    return { success: true, output: '\n% LLDP is not enabled\n' };
  }

  const timer = state.lldpTimer || 30;
  const holdtime = state.lldpHoldtime || 120;
  const reinit = state.lldpReinit || 2;

  if (input.includes('neighbors detail')) {
    let output = '\n';
    const connections = ctx.connections || [];
    const sourceDeviceId = ctx.sourceDeviceId as string;
    const devices = ctx.devices || [];

    const deviceConnections = connections.filter(
      (conn: CanvasConnection) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    if (deviceConnections.length === 0) {
      output += 'No LLDP neighbors found\n';
    } else {
      deviceConnections.forEach((conn: CanvasConnection) => {
        const isSource = conn.sourceDeviceId === sourceDeviceId;
        const localPort = isSource ? conn.sourcePort : conn.targetPort;
        const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
        const remotePort = isSource ? conn.targetPort : conn.sourcePort;

        const connectedDevice = devices.find((d: CanvasDevice) => d.id === connectedDeviceId);
        if (connectedDevice) {
          const deviceType = connectedDevice.type;
          let capability = 'B';
          let enabledCapability = 'B';
          let systemDescription = '';

          if (deviceType === 'router') {
            capability = 'B,R';
            enabledCapability = 'B,R';
            systemDescription = 'NetSim NOS, Router Series Software';
          } else if (deviceType === 'switchL2' || deviceType === 'switchL3') {
            capability = 'B';
            enabledCapability = 'B';
            systemDescription = 'NetSim NOS, NS-L2 Software';
          } else if (deviceType === 'pc') {
            capability = 'S';
            enabledCapability = 'S';
            systemDescription = 'PC, Generic Workstation';
          } else if (deviceType === 'iot') {
            capability = 'S';
            enabledCapability = 'S';
            systemDescription = 'IoT Device, Generic Sensor/Actuator';
          } else if (deviceType === 'wlc') {
            capability = 'B,W';
            enabledCapability = 'B,W';
            systemDescription = 'NetSim Software, Wireless LAN Controller';
          } else if (deviceType === 'firewall') {
            capability = 'B,R';
            enabledCapability = 'B,R';
            systemDescription = 'NetSim Software, NetSim Firewall';
          }

          output += `------------------------------------------------\n`;
          output += `Local Intf: ${localPort}\n`;
          const neighborState = ctx.deviceStates?.get(connectedDeviceId);
          const rawChassisId =
            connectedDevice.macAddress ||
            neighborState?.macAddress ||
            Object.values(neighborState?.ports || {}).find(p => p.macAddress)?.macAddress ||
            '0050.56a1.b2c3';
          const chassisId = formatMacAddressSimple(rawChassisId);

          let managementIp: string = connectedDevice.ip || '';
          if (!managementIp && neighborState) {
            const neighborVlanState = (neighborState as unknown as { vlanState?: { vlanInterfaces?: Array<{ ipAddress?: string }> } }).vlanState;
            const vlanIps = neighborVlanState?.vlanInterfaces?.map((v: { ipAddress?: string }) => v.ipAddress).filter(Boolean);
            if (vlanIps && vlanIps.length > 0) {
              managementIp = vlanIps[0] || '';
            } else {
              const portIp = Object.values(neighborState.ports || {}).find(p => p.ipAddress)?.ipAddress;
              if (portIp) managementIp = portIp;
            }
          }
          if (!managementIp) {
            managementIp = 'not configured';
          }

          const localPortObj = connectedDevice.ports?.find(p => p.id === localPort);
          const portDescription = localPortObj?.description || localPortObj?.name || remotePort;

          output += `Chassis id: ${chassisId}\n`;
          output += `Port id: ${remotePort}\n`;
          output += `Port Description: ${portDescription}\n`;
          output += `System Name: ${connectedDevice.name}\n`;
          output += `System Description:\n ${systemDescription}\n`;
          output += `Time remaining: ${holdtime} seconds\n`;
          output += `System Capabilities: ${capability}\n`;
          output += `Enabled Capabilities: ${enabledCapability}\n`;
          output += `Management Addresses:\n    IP: ${managementIp}\n`;

          if (neighborState && deviceType !== 'pc' && deviceType !== 'iot') {
            const vlanInfo = Object.entries(neighborState.ports || {})
              .filter(([, port]) => port.vlan && port.vlan > 1)
              .map(([portId, port]) => `    ${portId}: VLAN ${port.vlan}`)
              .join('\n');
            if (vlanInfo) {
              output += `VLAN Information:\n${vlanInfo}\n`;
            }
          }
        }
      });
      output += `------------------------------------------------\n`;
    }
    output += '\nTotal entries displayed: ' + deviceConnections.length + '\n';
    return { success: true, output };
  } else if (input.includes('neighbors')) {
    let output = '\nCapability codes:\n';
    output += '    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device\n';
    output += '    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other\n\n';
    output += 'Device ID           Local Intf     Hold-time  Capability      Port ID\n';

    const connections = ctx.connections || [];
    const sourceDeviceId = ctx.sourceDeviceId as string;
    const devices = ctx.devices || [];

    const deviceConnections = connections.filter(
      (conn: CanvasConnection) => conn.sourceDeviceId === sourceDeviceId || conn.targetDeviceId === sourceDeviceId
    );

    if (deviceConnections.length === 0) {
      output += 'No LLDP neighbors found\n';
    } else {
      deviceConnections.forEach((conn: CanvasConnection) => {
        const isSource = conn.sourceDeviceId === sourceDeviceId;
        const localPort = isSource ? conn.sourcePort : conn.targetPort;
        const connectedDeviceId = isSource ? conn.targetDeviceId : conn.sourceDeviceId;
        const remotePort = isSource ? conn.targetPort : conn.sourcePort;

        const connectedDevice = devices.find((d: CanvasDevice) => d.id === connectedDeviceId);
        if (connectedDevice) {
          const deviceType = connectedDevice.type;
          let capability = 'B';
          if (deviceType === 'router') capability = 'B,R';
          else if (deviceType === 'pc' || deviceType === 'iot') capability = 'S';

          output += `${connectedDevice.name.padEnd(20)}${localPort.padEnd(15)}${holdtime.toString().padEnd(11)}${capability.padEnd(16)}${remotePort}\n`;
        }
      });
    }

    output += '\nTotal entries displayed: ' + deviceConnections.length + '\n';
    return { success: true, output };
  }

  let output = '\nGlobal LLDP Information:\n';
  output += `    Status: ACTIVE\n`;
  output += `    LLDP advertisements are sent every ${timer} seconds\n`;
  output += `    LLDP hold time advertised is ${holdtime} seconds\n`;
  output += `    LLDP interface reinitialisation delay is ${reinit} seconds\n`;

  return { success: true, output };
}
