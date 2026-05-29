import { IOS_ERRORS, iosModeError } from './iosErrors';
import type { CommandHandler } from './commandTypes';
import { normalizePortId } from '../initialState';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../switchModels';
import { buildRunningConfig } from './configBuilder';
import { calculateSTPState, calculatePVST } from './showCommands';
import {
  validateNoSwitchportSupport,
  validateSviStatus,
  getIpAddressPurpose
} from './L3Validation';

// Helper function to check if in interface mode (single or range)
function isInInterfaceMode(state: any): boolean {
  return state.currentMode === 'interface' || state.currentMode === 'config-if-range';
}

function isVlanInterfaceName(interfaceName: string | undefined): boolean {
  return !!interfaceName && /^vlan\d+$/i.test(interfaceName);
}

function normalizeWifiMode(mode: string | undefined): 'ap' | 'client' | 'disabled' {
  const normalized = (mode || 'disabled').toLowerCase();
  if (normalized === 'sta') return 'client';
  if (normalized === 'ap' || normalized === 'client' || normalized === 'disabled') return normalized;
  return 'disabled';
}

function getVlanPortKey(interfaceName: string): string {
  return interfaceName.toLowerCase();
}

// Interface-level komutlar (interface, shutdown, speed, duplex, switchport, ip address, vs.)

export const interfaceHandlers: Record<string, CommandHandler> = {
  'interface': cmdInterface,
  'interface range': cmdInterface,
  'shutdown': cmdShutdown,
  'no shutdown': cmdNoShutdown,
  'speed': cmdSpeed,
  'duplex': cmdDuplex,
  'description': cmdDescription,
  'switchport mode': cmdSwitchportMode,
  'switchport access vlan': cmdSwitchportAccessVlan,
  'switchport trunk native vlan': cmdSwitchportTrunkNativeVlan,
  'switchport trunk allowed vlan': cmdSwitchportTrunkAllowedVlan,
  'switchport port-security': cmdSwitchportPortSecurity,
  'switchport port-security maximum': cmdSwitchportPortSecurityMaximum,
  'switchport port-security violation': cmdSwitchportPortSecurityViolation,
  'switchport port-security mac-address sticky': cmdSwitchportPortSecuritySticky,
  'no switchport': cmdNoSwitchport,
  'spanning-tree portfast': cmdSpanningTreePortfast,
  'spanning-tree bpduguard': cmdSpanningTreeBpduguard,
  'ip address': cmdIpAddress,
  'no ip address': cmdNoIpAddress,
  'ip default-gateway': cmdIpDefaultGateway,
  'no ip default-gateway': cmdNoIpDefaultGateway,
  'wlan': cmdWlan,
  'security wpa psk set-key': cmdSecurityWpaPsk,
  'channel': cmdChannel,
  'station-role': cmdStationRole,
  'ssid': cmdSsid,
  'encryption': cmdEncryption,
  // No commands for interface
  'no description': cmdNoDescription,
  'no switchport mode': cmdNoSwitchportMode,
  'no switchport access vlan': cmdNoSwitchportAccessVlan,
  'no switchport port-security': cmdNoSwitchportPortSecurity,
  'no cdp enable': cmdNoCdpEnable,
  'no udld': cmdNoUdld,
  'no ip proxy-arp': cmdNoIpProxyArp,
  'no keepalive': cmdNoKeepalive,
  'no name': cmdNoName,
  'no spanning-tree': cmdNoSpanningTree,
  // Debug and monitor
  'debug': cmdDebug,
  'no debug': cmdNoDebug,
  'undebug all': cmdNoDebug,
  'undebug': cmdNoDebug,
  'monitor session': cmdMonitorSession,
  'no monitor session': cmdNoMonitorSession,
  // Access-list
  'access-list': cmdAccessList,
  'no access-list': cmdNoAccessList,
  'ip access-group': cmdIpAccessGroup,
  'no ip access-group': cmdNoIpAccessGroup,
  // EtherChannel
  'channel-group': cmdChannelGroup,
  'no channel-group': cmdNoChannelGroup,
  // DHCP relay
  'ip helper-address': cmdIpHelperAddress,
  'no ip helper-address': cmdNoIpHelperAddress,
  // Switchport extras
  'switchport nonegotiate': cmdSwitchportNonegotiate,
  'switchport voice vlan': cmdSwitchportVoiceVlan,
  // CDP
  'cdp enable': cmdCdpEnable,
  // Spanning-tree extras
  'spanning-tree bpduguard disable': cmdSpanningTreeBpduguardDisable,
  'spanning-tree cost': cmdSpanningTreeCost,
  'spanning-tree priority': cmdSpanningTreePriority,
  'ipv6 address': cmdIpv6Address,
  'ipv6 rip enable': cmdIpv6Rip,
  'ipv6 ospf area': cmdIpv6Ospf,
  'ipv6 dhcp server': cmdIpv6DhcpServer,
  'no ipv6 rip enable': cmdNoIpv6Rip,
  'no ipv6 ospf area': cmdNoIpv6Ospf,
  'switchport voice': cmdSwitchportVoiceVlan,
  'channel-protocol': cmdStubSuccess,
  'priority-queue out': cmdStubSuccess,
  'queue-set': cmdStubSuccess,
  'tx-queue': cmdStubSuccess,
  'power inline': cmdStubSuccess,
  'power inline consumption': cmdStubSuccess,
  'ip directed-broadcast': cmdStubSuccess,
  'ip arp inspection limit': cmdStubSuccess,
  'carrier-delay': cmdStubSuccess,
  'delay': cmdDelay,
  'load-interval': cmdStubSuccess,
  'mtu': cmdMtu,
  'switchport trunk encapsulation': cmdSwitchportTrunkEncapsulation,
  'encapsulation dot1q': cmdEncapsulationDot1q,
  'switchport protected': cmdSwitchportProtected,
  'switchport block': cmdSwitchportBlock,
  'switchport port-security mac-address': cmdSwitchportPortSecurityMacAddress,
  'switchport port-security aging time': cmdSwitchportPortSecurityAgingTime,
  'switchport port-security aging type': cmdSwitchportPortSecurityAgingType,
  'storm-control': cmdStormControl,
  'storm-control action': cmdStormControlAction,
  'mls qos trust': cmdMlsQosTrust,
  'mls qos cos': cmdMlsQosCos,
  'ip dhcp snooping trust': cmdIpDhcpSnoopingTrust,
  'no ip dhcp snooping trust': cmdNoIpDhcpSnoopingTrust,
  'ip arp inspection trust': cmdIpArpInspectionTrust,
  'no ip arp inspection trust': cmdNoIpArpInspectionTrust,
  'bandwidth': cmdBandwidth,
  'keepalive': cmdKeepalive,
  'ip proxy-arp': cmdIpProxyArp,
  'ip verify source': cmdIpVerifySource,
  'udld enable': cmdUdldEnable,
  'udld port': cmdUdldEnable,
  'standby ip': cmdStandbyIp,
  'standby priority': cmdStandbyPriority,
  'standby ipv6': cmdStandbyIpv6,
  'standby preempt': cmdStandbyPreempt,
};

/**
 * Interface - Enter interface configuration mode
 */
function cmdInterface(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^interface\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid interface command' };
  }

  const interfaceName = match[1].trim();

  if (/^range\s+/i.test(interfaceName)) {
    const rangeSpec = interfaceName.replace(/^range\s+/i, '').trim();
    const selectedInterfaces = expandInterfaceRange(rangeSpec, state);
    if (selectedInterfaces.length === 0) {
      return { success: false, error: `% Invalid interface range: ${rangeSpec}` };
    }

    return {
      success: true,
      newState: {
        currentMode: 'config-if-range',
        currentInterface: selectedInterfaces[0],
        selectedInterfaces
      }
    };
  }

  // VLAN interface kontrolü (vlan 10, vlan 20, etc.)
  const vlanMatch = interfaceName.match(/^vlan\s+(\d+)$/i);
  if (vlanMatch) {
    const vlanId = parseInt(vlanMatch[1], 10);
    const vlanPortId = `vlan${vlanId}`;

    // VLAN port'u ve VLAN'ı oluştur (eğer yoksa)
    const newPorts = { ...state.ports };
    const newVlans = { ...state.vlans };
    if (!newPorts[vlanPortId]) {
      newPorts[vlanPortId] = {
        id: vlanPortId,
        name: `Vlan${vlanId}`,
        type: 'vlan',
        vlan: vlanId,
        status: 'up',
        shutdown: false,
        mode: 'routed'
      };
    }
    if (!newVlans[vlanId]) {
      newVlans[vlanId] = {
        id: vlanId,
        name: `VLAN${vlanId}`,
        status: 'active',
        ports: []
      };
    }

    return {
      success: true,
      newState: {
        currentMode: 'interface',
        currentInterface: vlanPortId,
        selectedInterfaces: [vlanPortId],
        ports: newPorts,
        vlans: newVlans
      }
    };
  }

  // Validate interface exists or create subinterface
  const normalized = normalizePortId(interfaceName) || interfaceName.toLowerCase();

  // Console is not a configurable switchport interface in CLI
  if (normalized === 'console') {
    return { success: false, error: "% Invalid interface type and number" };
  }

  // Check if it's a subinterface (contains a dot)
  const isSubinterface = normalized.includes('.');

  // For physical interfaces (not subinterfaces), validate the port exists
  if (!isSubinterface) {
    if (!state.ports || !state.ports[normalized]) {
      return { success: false, error: `% Interface ${interfaceName} does not exist` };
    }
  }

  // For subinterfaces, create them if they don't exist
  let newPorts = state.ports;
  if (isSubinterface && (!state.ports || !state.ports[normalized])) {
    newPorts = { ...state.ports };
    // Extract base interface and subinterface number
    const parts = normalized.split('.');
    const baseInterface = parts[0];
    const subinterfaceNum = parts[1];

    // Create the subinterface
    newPorts[normalized] = {
      id: normalized,
      name: `${normalized}`,
      type: normalized.startsWith('fa') ? 'fastethernet' : 'gigabitethernet',
      vlan: parseInt(subinterfaceNum) || 1,
      status: 'up',
      shutdown: false,
      mode: 'routed',
      isSubinterface: true,
      parentInterface: baseInterface
    };
  }

  return {
    success: true,
    newState: {
      currentMode: 'interface',
      currentInterface: normalized,
      selectedInterfaces: [normalized],
      ...(isSubinterface && newPorts !== state.ports ? { ports: newPorts } : {})
    }
  };
}

/**
 * Shutdown - Administratively disable interface
 */
function cmdShutdown(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  // VLAN interface'i için shutdown
  if (isVlanInterfaceName(state.currentInterface)) {
    const vlanPortKey = getVlanPortKey(state.currentInterface);
    const newPorts = { ...state.ports };
    if (newPorts[vlanPortKey]) {
      newPorts[vlanPortKey] = { ...newPorts[vlanPortKey], shutdown: true };
    }
    return {
      success: true,
      newState: { ports: newPorts }
    };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, shutdown: true }));

  // Recalculate STP states for all devices in the topology after shutdown
  const updatedCurrentState = { ...state, ports: newPorts };
  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);

  // Return the new ports for the current device and the updated states for all switches
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);
  const finalPorts = myUpdatedState ? myUpdatedState.ports : newPorts;

  return {
    success: true,
    newState: { ports: finalPorts },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * No Shutdown - Enable interface
 */
function cmdNoShutdown(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  // VLAN interface'i için no shutdown
  if (isVlanInterfaceName(state.currentInterface)) {
    const vlanPortKey = getVlanPortKey(state.currentInterface);
    const newPorts = { ...state.ports };
    if (newPorts[vlanPortKey]) {
      newPorts[vlanPortKey] = { ...newPorts[vlanPortKey], shutdown: false };
    }
    return {
      success: true,
      newState: { ports: newPorts }
    };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, shutdown: false }));

  // Recalculate STP states for all devices in the topology after no shutdown
  const updatedCurrentState = { ...state, ports: newPorts };
  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);

  // Return the new ports for the current device and the updated states for all switches
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);
  const finalPorts = myUpdatedState ? myUpdatedState.ports : newPorts;

  return {
    success: true,
    newState: { ports: finalPorts },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * Speed - Set interface speed
 */
function cmdSpeed(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^speed\s+(10|100|1000|10000|auto)$/i);
  if (!match) {
    return { success: false, error: '% Invalid speed value (10, 100, 1000, 10000, auto)' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, speed: match[1].toLowerCase() }));
  const updatedCurrentState = { ...state, ports: newPorts };
  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    newState: myUpdatedState || { ports: newPorts },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * Duplex - Set duplex mode
 */
function cmdDuplex(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^duplex\s+(half|full|auto)$/i);
  if (!match) {
    return { success: false, error: '% Invalid duplex value (half, full, auto)' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, duplex: match[1].toLowerCase() }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * standby <group> ip <virtual-ip>
 */
function cmdStandbyIp(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+ip\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const virtualIp = match[2];

  const updatePort = (port: any) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], virtualIp, state: 'Active' };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * standby <group> priority <priority>
 */
function cmdStandbyPriority(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+priority\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const priority = parseInt(match[2]);

  const updatePort = (port: any) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], priority };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * standby <group> ipv6 <virtual-ipv6>
 */
function cmdStandbyIpv6(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+ipv6\s+([0-9a-fA-F:]+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const ipv6VirtualIp = match[2];

  const updatePort = (port: any) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], ipv6VirtualIp, state: 'Active' };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

function cmdStandbyPreempt(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+preempt$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);

  const updatePort = (port: any) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    groups[group] = { ...groups[group], preempt: true };
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Description - Set interface description
 */
function cmdDescription(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^description\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid description command' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, description: match[1] }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * No Switchport - Convert physical port to routed port (L3 switch only)
 */
function cmdNoSwitchport(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const noSwitchportValidation = validateNoSwitchportSupport(state.switchModel, state.deviceType);
  if (!noSwitchportValidation.valid) {
    return { success: false, error: noSwitchportValidation.error || IOS_ERRORS.invalidInput };
  }

  // Don't allow on VLAN interfaces
  if (isVlanInterfaceName(state.currentInterface)) {
    return { success: false, error: '% Invalid command on VLAN interface' };
  }

  // Don't allow on WLAN interface
  if (state.currentInterface.toLowerCase().startsWith('wlan')) {
    return { success: false, error: '% Invalid command on WLAN interface' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => {
    // Convert port from L2 switchport mode to L3 routed mode
    return {
      ...port,
      mode: 'routed',
      isRoutedPort: true,
      // Clear Layer 2 specific settings when converting to routed port
      accessVlan: undefined,
      nativeVlan: undefined,
      allowedVlans: undefined,
      portSecurity: undefined,
      spanningTree: undefined,
      trunkAllowedVlans: undefined,
      trunkNativeVlan: undefined,
      voiceVlan: undefined,
    };
  });

  let output = `\n`;
  if (state.selectedInterfaces && state.selectedInterfaces.length > 1) {
    output += `Interfaces ${state.selectedInterfaces.join(', ')} converted to routed ports\n`;
  } else {
    output += `Interface ${state.currentInterface} converted to routed port\n`;
  }
  output += `Port(s) are now in L3 routed mode. Use 'ip address' to assign an IP address.\n`;

  return {
    success: true,
    output,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Mode - access | trunk | dynamic auto | dynamic desirable | dot1q-tunnel
 */
function cmdSwitchportMode(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+mode\s+(access|trunk|dynamic\s+auto|dynamic\s+desirable|dot1q-tunnel)$/i);
  if (!match) {
    return { success: false, error: '% Invalid switchport mode' };
  }

  const requestedMode = match[1].toLowerCase().replace(/\s+/g, '-');
  const normalizedMode = requestedMode as 'access' | 'trunk' | 'dynamic-auto' | 'dynamic-desirable' | 'dot1q-tunnel';

  // L3 switch'te trunk modu için önce switchport trunk encapsulation dot1q gereklidir
  if (normalizedMode === 'trunk' && state.switchLayer === 'L3') {
    const targetPorts = Array.isArray(state.selectedInterfaces) && state.selectedInterfaces.length > 0
      ? state.selectedInterfaces
      : state.currentInterface ? [state.currentInterface] : [];
    const missingEncapsulation = targetPorts.some((portId: string) => {
      const port = state.ports?.[portId];
      return !port?.trunkEncapsulation || port.trunkEncapsulation !== 'dot1q';
    });
    if (missingEncapsulation) {
      return { success: false, error: "% Command rejected: The interface does not support trunking. Use 'switchport trunk encapsulation dot1q' first." };
    }
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, mode: normalizedMode }));
  const updatedCurrentState = {
    ...state,
    ports: newPorts,
  };

  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    newState: myUpdatedState || { ports: newPorts },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * Switchport Mode Access
 */
function cmdSwitchportModeAccess(state: any, input: string, ctx: any): any {
  return cmdSwitchportMode(state, 'switchport mode access', ctx);
}

/**
 * Switchport Mode Trunk
 */
function cmdSwitchportModeTrunk(state: any, input: string, ctx: any): any {
  return cmdSwitchportMode(state, 'switchport mode trunk', ctx);
}

/**
 * Switchport Access VLAN
 */
function cmdSwitchportAccessVlan(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+access\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const vlanId = match[1];
  const vlanIdNum = Number(vlanId);
  const targets = Array.isArray(state.selectedInterfaces) && state.selectedInterfaces.length > 0
    ? state.selectedInterfaces
    : state.currentInterface
      ? [state.currentInterface]
      : [];

  const newPorts = { ...state.ports };
  const newVlans = { ...state.vlans };
  if (!newVlans[vlanIdNum]) {
    newVlans[vlanIdNum] = { id: vlanIdNum, name: `VLAN${vlanIdNum}`, status: 'active', ports: [] };
  }

  targets.forEach((portId: string) => {
    const port = newPorts[portId];
    if (!port) return;

    const oldVlanId = Number(port.accessVlan || port.vlan || 1);
    const targetVlanId = vlanIdNum;

    // Remove port from previous VLAN membership
    if (newVlans[oldVlanId]) {
      newVlans[oldVlanId] = {
        ...newVlans[oldVlanId],
        ports: newVlans[oldVlanId].ports.filter((p: string) => p.toLowerCase() !== port.id.toLowerCase())
      };
    }

    // Add port to new VLAN membership
    if (!newVlans[targetVlanId]) {
      newVlans[targetVlanId] = { id: targetVlanId, name: `VLAN${targetVlanId}`, status: 'active', ports: [] };
    }
    const upperPortId = port.id.toUpperCase();
    if (!newVlans[targetVlanId].ports.includes(upperPortId)) {
      newVlans[targetVlanId] = {
        ...newVlans[targetVlanId],
        ports: [...newVlans[targetVlanId].ports, upperPortId]
      };
    }

    newPorts[portId] = {
      ...port,
      accessVlan: vlanId,
      vlan: targetVlanId,
      mode: 'access',
    };
  });

  const updatedCurrentState = {
    ...state,
    ports: newPorts,
    vlans: newVlans
  };

  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    newState: myUpdatedState || { ports: newPorts, vlans: newVlans },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * Switchport Trunk Native VLAN
 */
function cmdSwitchportTrunkNativeVlan(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+trunk\s+native\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, nativeVlan: match[1] }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Trunk Allowed VLAN
 */
function cmdSwitchportTrunkAllowedVlan(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+trunk\s+allowed\s+vlan\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN list' };
  }

  const vlanSpec = match[1].trim();
  const keywordMatch = vlanSpec.match(/^(add|remove|except)\s+(.+)$/i);
  const currentVlans = (state.currentPort?.allowedVlans === 'all' || state.currentPort?.allowedVlans === undefined)
    ? 'all' : (typeof state.currentPort?.allowedVlans === 'string' ? state.currentPort.allowedVlans : '1');

  let newAllowed: string;
  if (keywordMatch) {
    const keyword = keywordMatch[1].toLowerCase();
    const vlanList = keywordMatch[2];
    if (keyword === 'add') {
      newAllowed = currentVlans === 'all' ? 'all' : `${currentVlans},${vlanList}`;
    } else if (keyword === 'remove') {
      if (currentVlans === 'all') {
        const removed = vlanList.split(',').map(v => v.trim());
        newAllowed = removed.length > 0 ? `1-${Math.max(...removed.map(Number)) - 1}` : 'all';
      } else {
        const existing = new Set(currentVlans.split(',').map((v: string) => v.trim()));
        vlanList.split(',').forEach((v: string) => existing.delete(v.trim()));
        newAllowed = Array.from(existing).join(',') || 'none';
      }
    } else if (keyword === 'except') {
      newAllowed = `except ${vlanList}`;
    } else {
      newAllowed = vlanSpec;
    }
  } else if (vlanSpec.toLowerCase() === 'all') {
    newAllowed = 'all';
  } else {
    newAllowed = vlanSpec;
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, allowedVlans: newAllowed }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Port-Security
 */
function cmdSwitchportPortSecurity(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].portSecurity) {
    newPorts[state.currentInterface].portSecurity = {};
  }
  newPorts[state.currentInterface].portSecurity.enabled = true;

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Port-Security Maximum
 */
function cmdSwitchportPortSecurityMaximum(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+maximum\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid maximum value' };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].portSecurity) {
    newPorts[state.currentInterface].portSecurity = {};
  }
  newPorts[state.currentInterface].portSecurity.maxAddresses = parseInt(match[1]);

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Port-Security Violation
 */
function cmdSwitchportPortSecurityViolation(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+violation\s+(protect|restrict|shutdown)$/i);
  if (!match) {
    return { success: false, error: '% Invalid violation mode (protect, restrict, shutdown)' };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].portSecurity) {
    newPorts[state.currentInterface].portSecurity = {};
  }
  newPorts[state.currentInterface].portSecurity.violationAction = match[1].toLowerCase();

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Port-Security MAC-Address Sticky
 */
function cmdSwitchportPortSecuritySticky(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].portSecurity) {
    newPorts[state.currentInterface].portSecurity = {};
  }
  newPorts[state.currentInterface].portSecurity.sticky = true;

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Spanning-Tree Portfast
 */
function cmdSpanningTreePortfast(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].spanningTree) {
    newPorts[state.currentInterface].spanningTree = {};
  }
  newPorts[state.currentInterface].spanningTree.portfast = true;

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Spanning-Tree BPDU Guard
 */
function cmdSpanningTreeBpduguard(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].spanningTree) {
    newPorts[state.currentInterface].spanningTree = {};
  }
  newPorts[state.currentInterface].spanningTree.bpduguard = true;

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * IP Address - Assign IP to routed port or VLAN interface
 */
function cmdIpAddress(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const match = input.match(/^ip\s+address\s+(?:(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\d{1,3}(?:\.\d{1,3}){3})|\/(\d|[12]\d|3[0-2]))|dhcp)$/i);
  if (!match) {
    return { success: false, error: '% Invalid input: ip address <ip> <mask> or ip address <ip>/<prefix> or ip address dhcp' };
  }

  const isDhcp = input.toLowerCase().endsWith('dhcp');

  if (isDhcp) {
    const newPorts = applyToSelectedPorts(state, (port: any) => ({
      ...port,
      ipConfigMode: 'dhcp',
      ipAddress: undefined,
      subnetMask: undefined,
      mode: 'routed',
      isRoutedPort: true
    }));
    return {
      success: true,
      output: `\nInterface ${state.currentInterface} configured to acquire IP via DHCP\n`,
      newState: { ports: newPorts }
    };
  }

  const [, ip, dottedMask, prefixLength] = match;
  const mask = dottedMask || prefixToSubnetMask(parseInt(prefixLength, 10));

  if (!isValidIP(ip) || !mask || !isValidIP(mask)) {
    return { success: false, error: '% Invalid IP address format' };
  }
  if (!isValidSubnetMask(mask)) {
    return { success: false, error: '% Invalid subnet mask format' };
  }
  if (isNetworkOrBroadcastAddress(ip, mask)) {
    return { success: false, error: '% Invalid host address (network or broadcast address)' };
  }

  // VLAN interface IP assignment
  if (isVlanInterfaceName(state.currentInterface)) {
    const vlanPortKey = getVlanPortKey(state.currentInterface);
    const vlanId = parseInt(vlanPortKey.replace(/^vlan/, ''), 10);
    const newPorts = { ...state.ports };

    if (newPorts[vlanPortKey]) {
      // Validate SVI status - check that there are active ports in this VLAN
      const sviStatus = validateSviStatus(state, vlanId);

      let warningMsg = '';
      if (sviStatus.activePorts.length === 0) {
        warningMsg = `\n% Warning: VLAN ${vlanId} has no active ports assigned.\n% SVI will be down until at least one port in this VLAN is configured and active.\n`;
      }

      // Get IP purpose for L2 vs L3 distinction
      const ipPurpose = getIpAddressPurpose(state, state.currentInterface);
      let purposeMsg = '';
      if (ipPurpose.purpose === 'management') {
        purposeMsg = `\n% Note: This is a Layer 2 switch. IP address is for device management only (SSH/Telnet).\n% Traffic between VLANs cannot be routed.\n`;
      } else if (ipPurpose.purpose === 'both') {
        purposeMsg = `\n% Note: This IP will be used for both device management and VLAN ${vlanId} routing gateway.\n`;
      }

      newPorts[vlanPortKey] = {
        ...newPorts[vlanPortKey],
        ipAddress: ip,
        subnetMask: mask,
        mode: 'routed'
      };
    }

    const updatedState = { ...state, ports: newPorts };
    let output = `Interface Vlan${vlanId} configured with IP ${ip} ${mask}\n`;

    // Add status indicator
    const sviStatus = validateSviStatus(state, vlanId);
    if (sviStatus.activePorts.length > 0) {
      output += `Vlan${vlanId} will be up (Active ports: ${sviStatus.activePorts.join(', ')})\n`;
    } else {
      output += `Vlan${vlanId} status: down (no active ports assigned)\n`;
    }

    return {
      success: true,
      output,
      newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
    };
  }

  // Layer 2 switch check - prevent IP assignment on physical ports
  // Apply this guard only for switch devices; routers must allow physical IP addressing.
  const isSwitchDevice =
    (state.deviceType === 'switchL2' ||
      state.deviceType === 'switchL3' ||
      state.switchLayer === 'L2' ||
      state.switchLayer === 'L3' ||
      state.switchModel === 'WS-C2960-24TT-L' ||
      state.switchModel === 'WS-C3650-24PS') &&
    state.deviceType !== 'router'; // Routers must be excluded from this check
  if (isSwitchDevice && !canAssignIPToPhysicalPort(state.switchModel)) {
    const port = state.ports[state.currentInterface];
    if (port && (port.type === 'fastethernet' || port.type === 'gigabitethernet')) {
      return {
        success: false,
        error: `% Invalid command. Layer 2 switch (${state.switchModel}) does not support IP addressing on physical ports.\nUse VLAN interface instead: interface vlan <vlan-id>`
      };
    }
  }

  // L3 switch physical ports: require either global ip routing OR routed port mode (no switchport)
  const currentPort = state.ports?.[state.currentInterface];
  const isPhysicalInterface = !!currentPort && (currentPort.type === 'fastethernet' || currentPort.type === 'gigabitethernet');
  const isL3Sw = isLayer3Switch(state.switchModel);
  const hasIpRouting = !!state.ipRouting;
  const isRoutedPort = currentPort?.mode === 'routed' || currentPort?.isRoutedPort === true;

  if (isL3Sw && isPhysicalInterface && !hasIpRouting && !isRoutedPort) {
    return {
      success: false,
      error: `% Invalid input detected at '^' marker.`
    };
  }

  // Physical routed port IP assignment (Layer 3 switch or router)
  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    ipAddress: ip,
    subnetMask: mask,
    mode: 'routed',
    isRoutedPort: true
  }));

  const updatedState = { ...state, ports: newPorts };
  const output = `\nInterface ${state.currentInterface} configured with IP ${ip} ${mask}\n`;

  return {
    success: true,
    output,
    newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * No IP Address - Remove IP from interface
 */
function cmdNoIpAddress(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  // VLAN interface'i için IP kaldırma
  if (isVlanInterfaceName(state.currentInterface)) {
    const vlanPortKey = getVlanPortKey(state.currentInterface);
    const newPorts = { ...state.ports };

    if (newPorts[vlanPortKey]) {
      newPorts[vlanPortKey] = {
        ...newPorts[vlanPortKey],
        ipAddress: undefined,
        subnetMask: undefined
      };
    }

    const updatedState = { ...state, ports: newPorts };
    return {
      success: true,
      newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
    };
  }

  // Fiziksel port'tan IP kaldırma
  const newPorts = applyToSelectedPorts(state, (port: any) => ({ ...port, ipAddress: undefined, subnetMask: undefined, mode: 'access' }));

  const updatedState = { ...state, ports: newPorts };
  return {
    success: true,
    newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * IP Default-Gateway - Configured from interface mode
 */
function cmdIpDefaultGateway(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const match = input.match(/^ip\s+default-gateway\s+([0-9.]+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid default-gateway command' };
  }

  return {
    success: true,
    newState: { defaultGateway: match[1] }
  };
}

/**
 * No IP Default-Gateway - Configured from interface mode
 */
function cmdNoIpDefaultGateway(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  return {
    success: true,
    newState: { defaultGateway: undefined }
  };
}

/**
 * Helper function to validate IP address
 */
function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    const num = parseInt(part);
    if (isNaN(num) || num < 0 || num > 255) return false;
  }
  return true;
}

function prefixToSubnetMask(prefixLength: number): string | null {
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return null;
  }

  const mask = [0, 0, 0, 0];
  let remaining = prefixLength;
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, remaining));
    mask[i] = bits === 0 ? 0 : (0xff << (8 - bits)) & 0xff;
    remaining -= bits;
  }
  return mask.join('.');
}

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
}

function isValidSubnetMask(mask: string): boolean {
  if (!isValidIP(mask)) return false;
  const maskNum = ipToNumber(mask);
  // contiguous-ones mask check
  const inv = (~maskNum) >>> 0;
  return (inv & (inv + 1)) === 0;
}

function isNetworkOrBroadcastAddress(ip: string, mask: string): boolean {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  const hostBits = (~maskNum) >>> 0;
  // /31 and /32 have no classic network/broadcast host restriction
  if (hostBits <= 1) return false;
  const hostPart = ipNum & hostBits;
  return hostPart === 0 || hostPart === hostBits;
}

function expandInterfaceRange(rangeSpec: string, state: any): string[] {
  const normalized = rangeSpec.replace(/\s+/g, '').toLowerCase();

  // Handle comma-separated ranges: fa0/1,3,6 or fa0/1-4,7-9
  const parts = normalized.split(',');
  const allPorts: string[] = [];

  for (const part of parts) {
    // Try VLAN interface range: vlan10-20
    const vlanMatch = part.match(/^vlan(\d+)(?:-(\d+))?$/);
    if (vlanMatch) {
      const startVlan = parseInt(vlanMatch[1], 10);
      const endVlan = vlanMatch[2] ? parseInt(vlanMatch[2], 10) : startVlan;
      for (let vid = startVlan; vid <= endVlan; vid++) {
        const vlanId = `vlan${vid}`;
        if (!allPorts.includes(vlanId)) allPorts.push(vlanId);
      }
      continue;
    }

    const match = part.match(/^(fastethernet|gigabitethernet|gigabit|fa|gig|gi)(\d+(?:\/\d+)*)\/(\d+)(?:-(\d+))?$/);
    if (!match) continue;

    const prefix = match[1].startsWith('f') ? 'fa' : 'gi';
    const moduleSlot = match[2]; // e.g. "0" (2-level) or "1/0" (3-level)
    const startPort = parseInt(match[3], 10);
    const endPort = match[4] ? parseInt(match[4], 10) : startPort;

    if (Number.isNaN(startPort) || Number.isNaN(endPort) || endPort < startPort) continue;

    const available = Object.keys(state.ports || {});
    const modulePrefix = `${prefix}${moduleSlot}/`;
    const modulePorts = available
      .filter(portId => portId.startsWith(modulePrefix))
      .map(portId => parseInt(portId.split('/').pop() || '', 10))
      .filter(n => !Number.isNaN(n))
      .sort((a, b) => a - b);

    if (modulePorts.length === 0) return [];
    const minPort = modulePorts[0];
    const maxPort = modulePorts[modulePorts.length - 1];
    if (startPort < minPort || endPort > maxPort) return [];

    for (let port = startPort; port <= endPort; port++) {
      const normalizedId = `${prefix}${moduleSlot}/${port}`;
      if (available.includes(normalizedId) && !allPorts.includes(normalizedId)) {
        allPorts.push(normalizedId);
      }
    }
  }

  return allPorts;
}

function applyToSelectedPorts(state: any, updater: (port: any) => any) {
  const newPorts = { ...state.ports };
  const targets = Array.isArray(state.selectedInterfaces) && state.selectedInterfaces.length > 0
    ? state.selectedInterfaces
    : state.currentInterface
      ? [state.currentInterface]
      : [];

  targets.forEach((portId: string) => {
    if (newPorts[portId]) {
      newPorts[portId] = updater(newPorts[portId]);
    }
  });

  return newPorts;
}

/**
 * SSID - Set Wireless SSID
 */
function cmdSsid(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }
  if (!state.currentInterface.toLowerCase().startsWith('wlan')) {
    return { success: false, error: '% Wireless commands are only valid on WLAN interfaces' };
  }

  const match = input.match(/^ssid\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid SSID' };

  const ssid = match[1].trim();
  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    wifi: { ...port.wifi, ssid }
  }));

  const updatedState = { ...state, ports: newPorts };
  return { success: true, newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * Encryption - Set Wireless Security
 */
function cmdEncryption(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }
  if (!state.currentInterface.toLowerCase().startsWith('wlan')) {
    return { success: false, error: '% Wireless commands are only valid on WLAN interfaces' };
  }

  const match = input.match(/^encryption\s+(open|wpa|wpa2|wpa3)$/i);
  if (!match) return { success: false, error: '% Invalid encryption (open, wpa, wpa2, wpa3)' };

  const security = match[1].toLowerCase();
  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    wifi: { ...port.wifi, security }
  }));

  const updatedState = { ...state, ports: newPorts };
  return { success: true, newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) } };
}


/**
 * WLAN - Create WLAN configuration (WLC only)
 */
function cmdWlan(state: any, input: string, ctx: any): any {
  const match = input.match(/^wlan\s+(\S+)\s+(\d+)\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid WLAN command. Usage: wlan <name> <id> <ssid>' };
  }

  const wlanName = match[1];
  const wlanId = match[2];
  const ssid = match[3];

  // Store WLAN configuration in state
  const newWlans = state.wlans || {};
  newWlans[wlanId] = { name: wlanName, ssid };

  // Update wlan0 interface with SSID
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...newPorts['wlan0'].wifi, ssid }
    };
  }

  return { success: true, newState: { ports: newPorts, wlans: newWlans } };
}

/**
 * Security WPA PSK Set-Key - Set WPA password (WLC only)
 */
function cmdSecurityWpaPsk(state: any, input: string, ctx: any): any {
  const match = input.match(/^security\s+wpa\s+psk\s+set-key\s+ascii\s+0\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid security command. Usage: security wpa psk set-key ascii 0 <password>' };
  }

  const password = match[1];

  // Update wlan0 interface with security
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...newPorts['wlan0'].wifi, password, security: 'wpa2' }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Channel - Set RF channel (WLC only)
 */
function cmdChannel(state: any, input: string, ctx: any): any {
  const match = input.match(/^channel\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid channel command. Usage: channel <num>' };
  }

  const channelNum = parseInt(match[1], 10);
  const channel = channelNum <= 14 ? '2.4GHz' : '5GHz';

  // Update wlan0 interface with channel
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...newPorts['wlan0'].wifi, channel }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Station-Role - Set AP mode (AP only)
 */
function cmdStationRole(state: any, input: string, ctx: any): any {
  const match = input.match(/^station-role\s+root$/i);
  if (!match) {
    return { success: false, error: '% Invalid station-role command. Usage: station-role root' };
  }

  // Update wlan0 interface with AP mode
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...newPorts['wlan0'].wifi, mode: 'ap' }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Description - Clear interface description
 */
function cmdNoDescription(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    description: ''
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Switchport Mode - Reset switchport mode
 */
function cmdNoSwitchportMode(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    mode: 'access'
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Switchport Access VLAN - Reset access VLAN
 */
function cmdNoSwitchportAccessVlan(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const targets = Array.isArray(state.selectedInterfaces) && state.selectedInterfaces.length > 0
    ? state.selectedInterfaces
    : state.currentInterface
      ? [state.currentInterface]
      : [];

  const newPorts = { ...state.ports };
  const newVlans = { ...state.vlans };

  targets.forEach((portId: string) => {
    const port = newPorts[portId];
    if (!port) return;

    const oldVlanId = Number(port.accessVlan || port.vlan || 1);
    const targetVlanId = 1;

    if (newVlans[oldVlanId]) {
      newVlans[oldVlanId] = {
        ...newVlans[oldVlanId],
        ports: newVlans[oldVlanId].ports.filter((p: string) => p.toLowerCase() !== port.id.toLowerCase())
      };
    }

    const upperPortId = port.id.toUpperCase();
    if (!newVlans[targetVlanId]) {
      newVlans[targetVlanId] = { id: 1, name: 'default', status: 'active', ports: [] };
    }
    if (!newVlans[targetVlanId].ports.includes(upperPortId)) {
      newVlans[targetVlanId] = {
        ...newVlans[targetVlanId],
        ports: [...newVlans[targetVlanId].ports, upperPortId]
      };
    }

    newPorts[portId] = {
      ...port,
      accessVlan: targetVlanId,
      vlan: targetVlanId
    };
  });

  return { success: true, newState: { ports: newPorts, vlans: newVlans } };
}

/**
 * No Switchport Port-Security - Disable port security
 */
function cmdNoSwitchportPortSecurity(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    portSecurity: undefined
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No CDP Enable - Disable CDP on interface
 */
function cmdNoCdpEnable(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    cdpEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Channel-Group - Remove EtherChannel
 */
function cmdNoChannelGroup(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    channelGroup: undefined,
    channelProtocol: undefined
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No UDLD - Disable UDLD on interface
 */
function cmdNoUdld(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    udldEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP Proxy-ARP - Disable proxy ARP
 */
function cmdNoIpProxyArp(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    ipProxyArp: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Keepalive - Disable keepalive
 */
function cmdNoKeepalive(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    keepalive: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Name - Clear VLAN name (only valid in vlan mode)
 */
function cmdNoName(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'vlan') {
    return { success: false, error: '% Invalid command. no name is only valid in VLAN configuration mode.\nUsage: vlan <id> -> no name' };
  }

  const newVlans = { ...state.vlans };
  const currentVlanId = state.currentVlan;
  if (currentVlanId && newVlans[currentVlanId]) {
    newVlans[currentVlanId] = { ...newVlans[currentVlanId], name: `VLAN${currentVlanId}` };
    return { success: true, newState: { vlans: newVlans } };
  }

  return { success: false, error: '% VLAN not found' };
}

/**
 * No Spanning-Tree - Disable spanning-tree on interface
 */
function cmdNoSpanningTree(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    spanningTreeEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Debug - Enable debug
 */
function cmdDebug(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^debug\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Incomplete command. Must specify debug type (e.g., debug ip packet)' };
  }

  return { success: true, output: `Debug ${match[1]} enabled` };
}

/**
 * No Debug - Disable debug
 */
function cmdNoDebug(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'privileged' && state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+debug(?:\s+(.+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid debug command' };
  }

  const debugType = match[1];
  if (debugType) {
    return { success: true, output: `Debug ${debugType} disabled` };
  } else {
    return { success: true, output: 'All debug output disabled' };
  }
}

/**
 * Monitor Session - Configure port monitoring
 */
function cmdMonitorSession(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^monitor\s+session\s+(\d+)\s+(source|destination)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid monitor session command' };
  }

  return { success: true, output: `Monitor session ${match[1]} configured` };
}

/**
 * No Monitor Session - Remove port monitoring
 */
function cmdNoMonitorSession(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+monitor\s+session\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid monitor session command' };
  }

  return { success: true, output: `Monitor session ${match[1]} removed` };
}

/**
 * Access-List - Configure ACL
 */
function cmdAccessList(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^access-list\s+(\d+)\s+(permit|deny)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const ruleBody = match[3].trim();
  if (/\*/.test(ruleBody)) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }
  const protocolMatch = ruleBody.match(/^(ip|tcp|udp|icmp)\b/i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    if (protocol === 'icmp' && /\beq\s+\d+\b/i.test(ruleBody)) {
      return { success: false, error: "% Invalid input detected at '^' marker." };
    }
  }
  const rule = `${match[2]} ${ruleBody}`;
  const accessLists = { ...(state.accessLists || {}) };
  accessLists[aclId] = [...(accessLists[aclId] || []), rule];

  return {
    success: true,
    output: `Access-list ${aclId} rule added`,
    newState: { accessLists }
  };
}

/**
 * No Access-List - Remove ACL
 */
function cmdNoAccessList(state: any, input: string, ctx: any): any {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+access-list\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const accessLists = { ...(state.accessLists || {}) };
  delete accessLists[aclId];

  return {
    success: true,
    output: `Access-list ${aclId} removed`,
    newState: { accessLists }
  };
}

/**
 * IP Access-Group - Apply ACL to interface
 */
function cmdIpAccessGroup(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid ip access-group command' };

  const [_, aclName, direction] = match;
  const prop = direction.toLowerCase() === 'in' ? 'accessGroupIn' : 'accessGroupOut';

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    [prop]: aclName
  }));

  return {
    success: true,
    output: `IP access-group ${aclName} ${direction} applied to ${state.currentInterface}`,
    newState: { ports: newPorts }
  };
}

/**
 * No IP Access-Group
 */
function cmdNoIpAccessGroup(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+ip\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const direction = match[2];
  const prop = direction.toLowerCase() === 'in' ? 'accessGroupIn' : 'accessGroupOut';

  const newPorts = applyToSelectedPorts(state, (port: any) => ({
    ...port,
    [prop]: undefined
  }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Channel-Group - Assign interface to EtherChannel
 */
function cmdChannelGroup(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^channel-group\s+(\d+)\s+mode\s+(active|passive|on|desirable|auto)$/i);
  if (!match) {
    return { success: false, error: '% Invalid channel-group command. Use: channel-group <1-48> mode {active|passive|on|desirable|auto}' };
  }

  const group = parseInt(match[1]);
  const mode = match[2].toLowerCase();

  const updatePort = (port: any) => ({ ...port, channelGroup: group, channelMode: mode });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Channel-group ${group} mode ${mode} configured`, newState: { ports: newPorts } };
}

/**
 * IP Helper-Address - Set DHCP relay address
 */
function cmdIpHelperAddress(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+helper-address\s+(\d+\.\d+\.\d+\.\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid ip helper-address command. Use: ip helper-address <ip>' };
  }

  const helperIp = match[1];
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  const port = newPorts[state.currentInterface] || {};
  const helpers: string[] = [...(port.helperAddresses || [])];
  if (!helpers.includes(helperIp)) helpers.push(helperIp);
  newPorts[state.currentInterface] = { ...port, helperAddresses: helpers };

  return { success: true, output: `Helper address ${helperIp} added`, newState: { ports: newPorts } };
}

/**
 * No IP Helper-Address - Remove DHCP relay address
 */
function cmdNoIpHelperAddress(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+ip\s+helper-address(?:\s+(\d+\.\d+\.\d+\.\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid command' };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  const port = newPorts[state.currentInterface] || {};
  newPorts[state.currentInterface] = { ...port, helperAddresses: [] };

  return { success: true, output: 'Helper address(es) removed', newState: { ports: newPorts } };
}

/**
 * Switchport Nonegotiate - Disable DTP negotiation
 */
function cmdSwitchportNonegotiate(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const updatePort = (port: any) => ({ ...port, nonegotiate: true });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'DTP negotiation disabled', newState: { ports: newPorts } };
}

/**
 * Switchport Voice VLAN - Set voice VLAN
 */
function cmdSwitchportVoiceVlan(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+voice\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid switchport voice vlan command' };
  }

  const vlanId = parseInt(match[1]);
  const updatePort = (port: any) => ({ ...port, voiceVlan: vlanId });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Voice VLAN ${vlanId} configured`, newState: { ports: newPorts } };
}

/**
 * CDP Enable - Enable CDP on interface
 */
function cmdCdpEnable(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  if (state.cdpEnabled === false) {
    return { success: false, error: '% CDP is not enabled globally. Use "cdp run" first.' };
  }

  const updatePort = (port: any) => ({ ...port, cdpEnabled: true });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'CDP enabled on interface', newState: { ports: newPorts } };
}

/**
 * Spanning-Tree BPDUGuard Disable
 */
function cmdSpanningTreeBpduguardDisable(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const updatePort = (port: any) => ({ ...port, bpduguard: false });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'BPDU guard disabled', newState: { ports: newPorts } };
}

/**
 * Spanning-Tree Cost - Set STP path cost
 */
function cmdSpanningTreeCost(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^spanning-tree\s+cost\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid spanning-tree cost command. Use: spanning-tree cost <1-200000000>' };
  }

  const cost = parseInt(match[1]);
  const updatePort = (port: any) => ({ ...port, stpCost: cost });

  let newPorts;
  if (state.selectedInterfaces?.length) {
    newPorts = applyToSelectedPorts(state, updatePort);
  } else {
    if (!state.currentInterface) return { success: false, error: '% No interface selected' };
    newPorts = { ...state.ports };
    newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  }

  const updatedCurrentState = { ...state, ports: newPorts };
  const allUpdatedStates = calculatePVST(updatedCurrentState, ctx, ctx.sourceDeviceId);
  const myUpdatedState = allUpdatedStates.get(ctx.sourceDeviceId);

  return {
    success: true,
    output: `STP cost set to ${cost}`,
    newState: myUpdatedState || { ports: newPorts },
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * Stub Success
 */
function cmdStubSuccess(state: any, input: string, ctx: any): any {
  return { success: true };
}

/**
 * IPv6 Address
 */
function cmdIpv6Address(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+address\s+([0-9a-fA-F:]+)\/(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid IPv6 address' };
  const updatePort = (port: any) => ({ ...port, ipv6Address: match[1], ipv6Prefix: parseInt(match[2]) });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 RIP Enable
 */
function cmdIpv6Rip(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+rip\s+(\S+)\s+enable$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processName = match[1];
  const updatePort = (port: any) => ({
    ...port,
    ipv6Rip: { enabled: true, processName }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  // Also add route if IP exists
  const targetPorts = Array.isArray(state.selectedInterfaces) ? state.selectedInterfaces : [state.currentInterface];
  const ipv6DynamicRoutes = [...(state.ipv6DynamicRoutes || [])];

  targetPorts.forEach((pId: string) => {
    const port = state.ports[pId];
    if (port && port.ipv6Address && port.ipv6Prefix) {
      ipv6DynamicRoutes.push({
        destination: port.ipv6Address,
        prefixLength: port.ipv6Prefix,
        nextHop: 'directly connected',
        metric: 1,
        type: 'dynamic'
      });
    }
  });

  return { success: true, newState: { ports: newPorts, ipv6DynamicRoutes } };
}

/**
 * IPv6 OSPF Area
 */
function cmdIpv6Ospf(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processId = match[1];
  const area = match[2];
  const updatePort = (port: any) => ({
    ...port,
    ipv6Ospf: { enabled: true, processId, area }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  // Also add route if IP exists
  const targetPorts = Array.isArray(state.selectedInterfaces) ? state.selectedInterfaces : [state.currentInterface];
  const ipv6DynamicRoutes = [...(state.ipv6DynamicRoutes || [])];

  targetPorts.forEach((pId: string) => {
    const port = state.ports[pId];
    if (port && port.ipv6Address && port.ipv6Prefix) {
      ipv6DynamicRoutes.push({
        destination: port.ipv6Address,
        prefixLength: port.ipv6Prefix,
        nextHop: 'directly connected',
        metric: 1,
        type: 'dynamic',
        area: parseInt(area)
      });
    }
  });

  return { success: true, newState: { ports: newPorts, ipv6DynamicRoutes } };
}

/**
 * No IPv6 RIP
 */
function cmdNoIpv6Rip(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: any) => ({
    ...port,
    ipv6Rip: { enabled: false }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 DHCP Server
 */
function cmdIpv6DhcpServer(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+dhcp\s+server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const poolName = match[1];
  const updatePort = (port: any) => ({
    ...port,
    ipv6DhcpServer: poolName
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  const updatedState = { ...state, ports: newPorts };
  return { success: true, newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * No IPv6 OSPF
 */
function cmdNoIpv6Ospf(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: any) => ({
    ...port,
    ipv6Ospf: { enabled: false }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Spanning-Tree Priority - Set STP port priority
 */
function cmdSpanningTreePriority(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^spanning-tree\s+priority\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid spanning-tree priority command. Use: spanning-tree priority <0-240>' };
  }

  const priority = parseInt(match[1]);
  if (priority < 0 || priority > 240 || priority % 16 !== 0) {
    return { success: false, error: '% Priority must be a multiple of 16 between 0 and 240' };
  }

  const updatePort = (port: any) => ({ ...port, stpPriority: priority });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `STP port priority set to ${priority}`, newState: { ports: newPorts } };
}



/**
 * Switchport Trunk Encapsulation
 */
function cmdSwitchportTrunkEncapsulation(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^switchport\s+trunk\s+encapsulation\s+(dot1q|isl|negotiate)$/i);
  if (!match) return { success: false, error: '% Invalid encapsulation command' };
  const updatePort = (port: any) => ({ ...port, trunkEncapsulation: match[1].toLowerCase() });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Trunk encapsulation set to ${match[1]}`, newState: { ports: newPorts } };
}

/**
 * Encapsulation dot1Q (subinterface)
 */
function cmdEncapsulationDot1q(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^encapsulation\s+dot1[qQ]\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid encapsulation command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {}), dot1qVlan: parseInt(match[1]) };
  return { success: true, output: `Encapsulation dot1Q VLAN ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * Switchport Protected
 */
function cmdSwitchportProtected(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, protected: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Port protected mode enabled', newState: { ports: newPorts } };
}

/**
 * Switchport Block (unicast/multicast)
 */
function cmdSwitchportBlock(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^switchport\s+block\s+(unicast|multicast)$/i);
  if (!match) return { success: false, error: '% Invalid switchport block command' };
  const updatePort = (port: any) => ({ ...port, [`block${match[1]}`]: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `${match[1]} blocking enabled`, newState: { ports: newPorts } };
}

/**
 * Switchport Port-Security MAC-Address (static)
 */
function cmdSwitchportPortSecurityMacAddress(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };

  // Check if it's the sticky variant
  if (/^switchport\s+port-security\s+mac-address\s+sticky$/i.test(input)) {
    if (!state.currentInterface) return { success: false, error: '% No interface selected' };
    const newPorts = { ...state.ports };
    if (!newPorts[state.currentInterface].portSecurity) {
      newPorts[state.currentInterface].portSecurity = {};
    }
    newPorts[state.currentInterface].portSecurity.sticky = true;
    return { success: true, newState: { ports: newPorts } };
  }

  const match = input.match(/^switchport\s+port-security\s+mac-address\s+([0-9a-fA-F.:-]+)$/i);
  if (!match) return { success: false, error: '% Invalid mac-address command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  const port = newPorts[state.currentInterface] || {};
  const staticMacs = [...(port.staticMacs || [])];
  if (!staticMacs.includes(match[1])) staticMacs.push(match[1]);
  newPorts[state.currentInterface] = { ...port, staticMacs };
  return { success: true, output: `Static MAC ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * Storm-Control
 */
function cmdStormControl(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^storm-control\s+(broadcast|multicast|unicast)\s+level\s+([\d.]+)(?:\s+([\d.]+))?$/i);
  if (!match) return { success: false, error: '% Invalid storm-control command. Use: storm-control {broadcast|multicast|unicast} level <rising> [falling]' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {}), stormControl: { type: match[1], rising: match[2], falling: match[3] } };
  return { success: true, output: `Storm-control ${match[1]} level ${match[2]} configured`, newState: { ports: newPorts } };
}

/**
 * Storm-Control Action
 */
function cmdStormControlAction(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^storm-control\s+action\s+(shutdown|trap)$/i);
  if (!match) return { success: false, error: '% Invalid storm-control action command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {}), stormControlAction: match[1] };
  return { success: true, output: `Storm-control action ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS Trust
 */
function cmdMlsQosTrust(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^mls\s+qos\s+trust\s+(cos|dscp|ip-precedence)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos trust command' };
  const updatePort = (port: any) => ({ ...port, qosTrust: match[1] });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS trust ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS CoS
 */
function cmdMlsQosCos(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^mls\s+qos\s+cos\s+(\d)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos cos command' };
  const updatePort = (port: any) => ({ ...port, qosCos: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS CoS ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * IP DHCP Snooping Trust
 */
function cmdIpDhcpSnoopingTrust(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, dhcpSnoopingTrust: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'DHCP snooping trust configured', newState: { ports: newPorts } };
}

/**
 * No IP DHCP Snooping Trust
 */
function cmdNoIpDhcpSnoopingTrust(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, dhcpSnoopingTrust: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'DHCP snooping trust removed', newState: { ports: newPorts } };
}

/**
 * IP ARP Inspection Trust
 */
function cmdIpArpInspectionTrust(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, arpInspectionTrust: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'ARP inspection trust configured', newState: { ports: newPorts } };
}

/**
 * No IP ARP Inspection Trust
 */
function cmdNoIpArpInspectionTrust(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, arpInspectionTrust: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'ARP inspection trust removed', newState: { ports: newPorts } };
}

/**
 * Bandwidth
 */
function cmdBandwidth(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^bandwidth\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid bandwidth command' };
  const updatePort = (port: any) => ({ ...port, bandwidth: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Bandwidth set to ${match[1]} kbps`, newState: { ports: newPorts } };
}

/**
 * Delay
 */
function cmdDelay(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^delay\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid delay command' };
  const delayValue = parseInt(match[1]);
  const updatePort = (port: any) => ({ ...port, delay: delayValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Delay set to ${delayValue} microseconds`, newState: { ports: newPorts } };
}

/**
 * MTU
 */
function cmdMtu(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid MTU command' };
  const mtuValue = parseInt(match[1]);
  if (mtuValue < 68 || mtuValue > 65535) {
    return { success: false, error: '% MTU must be between 68 and 65535' };
  }
  const updatePort = (port: any) => ({ ...port, mtu: mtuValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `MTU set to ${mtuValue} bytes`, newState: { ports: newPorts } };
}

/**
 * Keepalive
 */
function cmdKeepalive(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^keepalive(?:\s+(\d+))?$/i);
  const interval = match?.[1] ? parseInt(match[1]) : 10;
  const updatePort = (port: any) => ({ ...port, keepalive: interval });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Keepalive set to ${interval} seconds`, newState: { ports: newPorts } };
}

/**
 * IP Proxy-ARP (enable)
 */
function cmdIpProxyArp(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, proxyArp: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Proxy ARP enabled', newState: { ports: newPorts } };
}

/**
 * IP Verify Source
 */
function cmdIpVerifySource(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const hasPortSecurity = input.includes('port-security');
  const updatePort = (port: any) => ({
    ...port,
    ipVerifySource: true,
    ipVerifySourcePortSecurity: hasPortSecurity || port.ipVerifySourcePortSecurity
  });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'IP verify source configured', newState: { ports: newPorts } };
}

/**
 * UDLD Enable / Port
 */
function cmdUdldEnable(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: any) => ({ ...port, udld: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'UDLD enabled', newState: { ports: newPorts } };
}

/**
 * Switchport Port-Security Aging Time
 */
function cmdSwitchportPortSecurityAgingTime(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+aging\s+time\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid aging time value' };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].portSecurity) {
    newPorts[state.currentInterface].portSecurity = {};
  }
  if (!newPorts[state.currentInterface].portSecurity.aging) {
    newPorts[state.currentInterface].portSecurity.aging = {};
  }
  newPorts[state.currentInterface].portSecurity.aging.time = parseInt(match[1]);
  newPorts[state.currentInterface].portSecurity.aging.enabled = true;

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Port-Security Aging Type
 */
function cmdSwitchportPortSecurityAgingType(state: any, input: string, ctx: any): any {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+aging\s+type\s+(absolute|inactivity)$/i);
  if (!match) {
    return { success: false, error: '% Invalid aging type (absolute, inactivity)' };
  }

  const newPorts = { ...state.ports };
  if (!newPorts[state.currentInterface].portSecurity) {
    newPorts[state.currentInterface].portSecurity = {};
  }
  if (!newPorts[state.currentInterface].portSecurity.aging) {
    newPorts[state.currentInterface].portSecurity.aging = {};
  }
  newPorts[state.currentInterface].portSecurity.aging.type = match[1].toLowerCase() as 'absolute' | 'inactivity';
  newPorts[state.currentInterface].portSecurity.aging.enabled = true;

  return {
    success: true,
    newState: { ports: newPorts }
  };
}


