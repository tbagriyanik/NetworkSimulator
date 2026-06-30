import { IOS_ERRORS, iosModeError } from './iosErrors';
import type { CommandHandler, CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, Port, SpeedMode, DuplexMode, EtherChannelMode } from '../types';
import { normalizePortId } from '../initialState';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../switchModels';
import { buildRunningConfig } from './configBuilder';
import {
  validateNoSwitchportSupport,
  validateSviStatus
} from './L3Validation';
import { getPvstUpdate } from './commandHelpers';
import { createStubHandler } from './stubCommandHints';

// Helper function to check if in interface mode (single or range)
function isInInterfaceMode(state: SwitchState): boolean {
  return state.currentMode === 'interface' || state.currentMode === 'config-if-range';
}

function isVlanInterfaceName(interfaceName: string | undefined): boolean {
  return !!interfaceName && /^vlan\d+$/i.test(interfaceName);
}

function getVlanPortKey(interfaceName: string): string {
  return interfaceName.toLowerCase();
}

function mutatePortAtInterface(
  state: SwitchState,
  mutator: (port: Port) => Port,
  modeError: () => string = iosModeError
): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: modeError() };
  }

  const currentInterface = state.currentInterface;
  const newPorts = { ...state.ports };
  const existingPort = newPorts[currentInterface] ?? {};
  newPorts[currentInterface] = mutator(existingPort);

  return { success: true, newState: { ports: newPorts } };
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
  'no wlan': cmdNoWlan,
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
  'ip ospf area': cmdIpOspfArea,
  'no ip ospf area': cmdNoIpOspfArea,
  'ipv6 dhcp server': cmdIpv6DhcpServer,
  'no ipv6 rip enable': cmdNoIpv6Rip,
  'no ipv6 ospf area': cmdNoIpv6Ospf,
  'switchport voice': cmdSwitchportVoiceVlan,
  'channel-protocol': createStubHandler('channel-protocol'),
  'priority-queue out': createStubHandler('priority-queue out'),
  'queue-set': createStubHandler('queue-set'),
  'tx-queue': createStubHandler('tx-queue'),
  'power inline': createStubHandler('power inline'),
  'power inline consumption': createStubHandler('power inline consumption'),
  'ip directed-broadcast': createStubHandler('ip directed-broadcast'),
  'no ip directed-broadcast': createStubHandler('no ip directed-broadcast'),
  'ip arp inspection limit': createStubHandler('ip arp inspection limit'),
  'carrier-delay': createStubHandler('carrier-delay'),
  'delay': cmdDelay,
  'load-interval': createStubHandler('load-interval'),
  'mtu': cmdMtu,
  'switchport trunk encapsulation': cmdSwitchportTrunkEncapsulation,
  'encapsulation dot1q': cmdEncapsulationDot1q,
  'encapsulation hdlc': cmdEncapsulationHdlc,
  'encapsulation ppp': cmdEncapsulationPpp,
  'no encapsulation': cmdNoEncapsulation,
  'clock rate': cmdClockRate,
  'no clock rate': cmdNoClockRate,
  'ppp authentication pap': cmdPppAuthPap,
  'ppp authentication chap': cmdPppAuthChap,
  'no ppp authentication': cmdNoPppAuth,
  'ppp pap sent-username': cmdPppPapSentUsername,
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
  'ip nat inside': cmdIpNatInside,
  'no ip nat inside': cmdNoIpNatInside,
  'ip nat outside': cmdIpNatOutside,
  'no ip nat outside': cmdNoIpNatOutside,
};

/**
 * Interface - Enter interface configuration mode
 */
function cmdInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
        status: 'notconnect',
        shutdown: false,
        mode: 'routed',
        duplex: 'auto',
        speed: 'auto'
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

  // Loopback interface - always create virtual interface
  const loopbackMatch = interfaceName.match(/^(?:loopback|lo)\s*(\d+)$/i);
  if (loopbackMatch) {
    const loopbackId = loopbackMatch[1];
    const normalizedLoopback = `loopback${loopbackId}`;
    const newPorts = { ...state.ports };
    if (!newPorts[normalizedLoopback]) {
      newPorts[normalizedLoopback] = {
        id: normalizedLoopback,
        name: `Loopback${loopbackId}`,
        type: 'gigabitethernet',
        vlan: 1,
        status: 'connected',
        shutdown: false,
        mode: 'routed',
        duplex: 'auto',
        speed: 'auto',
        isRoutedPort: true
      };
    }
    return {
      success: true,
      newState: {
        currentMode: 'interface',
        currentInterface: normalizedLoopback,
        selectedInterfaces: [normalizedLoopback],
        ports: newPorts
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
      status: 'notconnect',
      shutdown: false,
      mode: 'routed',
      duplex: 'auto',
      speed: 'auto',
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
function cmdShutdown(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
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
    const portName = state.currentInterface;
    return {
      success: true,
      output: `%LINK-5-CHANGED: Interface ${portName}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portName}, changed state to down\n`,
      newState: { ports: newPorts }
    };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, shutdown: true }));

  // Recalculate STP states for all devices in the topology after shutdown
  const updatedCurrentState = { ...state, ports: newPorts };
  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  // Return the new ports for the current device and the updated states for all switches
  const finalPorts = myUpdatedState ? myUpdatedState.ports : newPorts;
  const portName = state.currentInterface;

  return {
    success: true,
    output: `%LINK-5-CHANGED: Interface ${portName}, changed state to administratively down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portName}, changed state to down\n`,
    newState: { ports: finalPorts },
    deviceStates: allUpdatedStates
  };
}

/**
 * No Shutdown - Enable interface
 */
function cmdNoShutdown(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
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
    const portName = state.currentInterface;
    return {
      success: true,
      output: `%LINK-3-UPDOWN: Interface ${portName}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portName}, changed state to up\n`,
      newState: { ports: newPorts }
    };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, shutdown: false }));

  // Recalculate STP states for all devices in the topology after no shutdown
  const updatedCurrentState = { ...state, ports: newPorts };
  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  // Return the new ports for the current device and the updated states for all switches
  const finalPorts = myUpdatedState ? myUpdatedState.ports : newPorts;
  const portName = state.currentInterface;

  return {
    success: true,
    output: `%LINK-3-UPDOWN: Interface ${portName}, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portName}, changed state to up\n`,
    newState: { ports: finalPorts },
    deviceStates: allUpdatedStates,
    hint: {
      tr: '💡 Gerçek dünyada: "no shutdown" komutu arayüzü fiziksel olarak aktif hale getirir. Yeni cihazlarda portlar genelde "shutdown" durumundadır.',
      en: '💡 In the real world: The "no shutdown" command physically activates the interface. On new devices, ports are usually in "shutdown" state by default.'
    }
  };
}

/**
 * Speed - Set interface speed
 */
function cmdSpeed(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^speed\s+(10|100|1000|10000|auto)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, speed: match[1].toLowerCase() as SpeedMode }));
  const updatedCurrentState = { ...state, ports: newPorts };
  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || { ports: newPorts },
    deviceStates: allUpdatedStates
  };
}

/**
 * Duplex - Set duplex mode
 */
function cmdDuplex(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^duplex\s+(half|full|auto)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  const duplex = match[1].toLowerCase() as DuplexMode;

  // Reject half duplex on GigabitEthernet interfaces
  if (duplex === 'half') {
    const port = state.ports[state.currentInterface];
    const isGigabit = port?.type === 'gigabitethernet' || /^gi/i.test(state.currentInterface);
    if (isGigabit) {
      return { success: false, error: '% GigabitEthernet interfaces do not support half duplex.' };
    }
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, duplex }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * standby <group> ip <virtual-ip>
 */
function cmdStandbyIp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+ip\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const virtualIp = match[2];

  const updatePort = (port: Port) => {
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
function cmdStandbyPriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+priority\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const priority = parseInt(match[2]);

  const updatePort = (port: Port) => {
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
function cmdStandbyIpv6(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+ipv6\s+([0-9a-fA-F:]+)$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);
  const ipv6VirtualIp = match[2];

  const updatePort = (port: Port) => {
    const hsrp = port.hsrp || { groups: {} };
    const groups = hsrp.groups || {};
    (groups[group] as Record<string, unknown>).ipv6VirtualIp = ipv6VirtualIp;
    (groups[group] as Record<string, unknown>).state = 'Active';
    return { ...port, hsrp: { ...hsrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

function cmdStandbyPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const match = input.match(/^standby\s+(\d+)\s+preempt$/i);
  if (!match) return { success: false, error: '% Invalid standby command' };

  const group = parseInt(match[1]);

  const updatePort = (port: Port) => {
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
function cmdDescription(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^description\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid description command' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, description: match[1] }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * No Switchport - Convert physical port to routed port (L3 switch only)
 */
function cmdNoSwitchport(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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

  const newPorts = applyToSelectedPorts(state, (port: Port) => {
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
function cmdSwitchportMode(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+mode\s+(access|trunk|dynamic\s+auto|dynamic\s+desirable|dot1q-tunnel)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
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
      return !port?.encapsulation || (port.encapsulation as string) !== 'dot1q';
    });
    if (missingEncapsulation) {
      return { success: false, error: "% Command rejected: An interface whose trunk encapsulation is 'Auto' cannot be configured to 'trunk' mode." };
    }
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, mode: normalizedMode }));
  const updatedCurrentState = {
    ...state,
    ports: newPorts,
  };

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || { ports: newPorts },
    deviceStates: allUpdatedStates,
    hint: normalizedMode === 'access' ? {
      tr: '💡 Gerçek dünyada: Access portlar genelde PC, IP Telefon veya yazıcı gibi uç cihazlara bağlanır.',
      en: '💡 In the real world: Access ports are typically connected to end devices like PCs, IP Phones, or printers.'
    } : normalizedMode === 'trunk' ? {
      tr: '💡 Gerçek dünyada: Trunk portlar üzerinden birden fazla VLAN trafiği taşınabilir, genelde switchler arası bağlantıda kullanılır.',
      en: '💡 In the real world: Trunk ports can carry traffic for multiple VLANs, typically used for inter-switch connections.'
    } : undefined
  };
}

/**
 * Switchport Mode Access
 */
/**
 * Switchport Access VLAN
 */
function cmdSwitchportAccessVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+access\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const vlanId = match[1];
  const vlanIdNum = Number(vlanId);

  if (vlanIdNum < 1 || vlanIdNum > 4094) {
    return { success: false, error: `% VLAN ID ${vlanId} is not in the range 1 to 4094.` };
  }
  if (vlanIdNum >= 1002 && vlanIdNum <= 1005) {
    return { success: false, error: `% VLAN ${vlanIdNum} is a reserved VLAN and cannot be used.` };
  }

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

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || { ports: newPorts, vlans: newVlans },
    deviceStates: allUpdatedStates
  };
}

/**
 * Switchport Trunk Native VLAN
 */
function cmdSwitchportTrunkNativeVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+trunk\s+native\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, nativeVlan: parseInt(match[1]) }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Trunk Allowed VLAN
 */
function cmdSwitchportTrunkAllowedVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+trunk\s+allowed\s+vlan\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN list' };
  }

  const vlanSpec = match[1].trim();
  const keywordMatch = vlanSpec.match(/^(add|remove|except)\s+(.+)$/i);
  const currentPort = state.currentInterface ? state.ports[state.currentInterface] : undefined;
  const currentVlans = (currentPort?.allowedVlans === 'all' || currentPort?.allowedVlans === undefined)
    ? 'all' : (typeof currentPort?.allowedVlans === 'string' ? currentPort.allowedVlans : '1');

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

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, allowedVlans: newAllowed as unknown as number[] | 'all' }));

  return {
    success: true,
    newState: { ports: newPorts }
  };
}

/**
 * Switchport Port-Security
 */
function cmdSwitchportPortSecurity(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: true };
    return { ...port, portSecurity: { ...portSecurity, enabled: true } };
  });
}

/**
 * Switchport Port-Security Maximum
 */
function cmdSwitchportPortSecurityMaximum(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+maximum\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid maximum value' };
  }

  const maxAddresses = parseInt(match[1]);
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: false };
    return { ...port, portSecurity: { ...portSecurity, maxAddresses } };
  });
}

/**
 * Switchport Port-Security Violation
 */
function cmdSwitchportPortSecurityViolation(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+violation\s+(protect|restrict|shutdown)$/i);
  if (!match) {
    return { success: false, error: '% Invalid violation mode (protect, restrict, shutdown)' };
  }

  const violationAction = match[1].toLowerCase() as 'shutdown' | 'restrict' | 'protect';
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: false };
    return { ...port, portSecurity: { ...portSecurity, violationAction } };
  });
}

/**
 * Switchport Port-Security MAC-Address Sticky
 */
function cmdSwitchportPortSecuritySticky(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: false };
    return { ...port, portSecurity: { ...portSecurity, sticky: true } };
  });
}

/**
 * Spanning-Tree Portfast
 */
function cmdSpanningTreePortfast(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return mutatePortAtInterface(state, (port) => {
    const spanningTree = port.spanningTree ?? {};
    return { ...port, spanningTree: { ...spanningTree, portfast: true } };
  });
}

/**
 * Spanning-Tree BPDU Guard
 */
function cmdSpanningTreeBpduguard(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return mutatePortAtInterface(state, (port) => {
    const spanningTree = port.spanningTree ?? {};
    return { ...port, spanningTree: { ...spanningTree, bpduguard: true } };
  });
}

/**
 * IP Address - Assign IP to routed port or VLAN interface
 */
function cmdIpAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const match = input.match(/^ip\s+address\s+(?:(\d{1,3}(?:\.\d{1,3}){3})(?:\s+(\d{1,3}(?:\.\d{1,3}){3}))|dhcp)$/i);
  if (!match) {
    return { success: false, error: '% Invalid input: ip address <ip> <mask> or ip address dhcp' };
  }

  const isDhcp = input.toLowerCase().endsWith('dhcp');

  if (isDhcp) {
    const newPorts = applyToSelectedPorts(state, (port: Port) => ({
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

  const [, ip, dottedMask] = match;
  const mask = dottedMask;

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
    ((state.deviceType as string) === 'switchL2' ||
      (state.deviceType as string) === 'switchL3' ||
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
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
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
    newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) },
    hint: {
      tr: '💡 Gerçek dünyada: Bir arayüze IP verildiğinde o arayüz L3 (katman 3) çalışmaya başlar. Cihazlar arası yönlendirme için IP gereklidir.',
      en: '💡 In the real world: When an IP is assigned to an interface, it starts operating at L3 (layer 3). IPs are required for routing between devices.'
    }
  };
}

/**
 * No IP Address - Remove IP from interface
 */
function cmdNoIpAddress(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, ipAddress: undefined, subnetMask: undefined, mode: 'access' }));

  const updatedState = { ...state, ports: newPorts };
  return {
    success: true,
    newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) }
  };
}

/**
 * IP Default-Gateway - Configured from interface mode
 */
function cmdIpDefaultGateway(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoIpDefaultGateway(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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

function expandInterfaceRange(rangeSpec: string, state: SwitchState): string[] {
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

function applyToSelectedPorts(state: SwitchState, updater: (port: Port) => Port) {
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
function cmdSsid(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }
  if (!state.currentInterface.toLowerCase().startsWith('wlan')) {
    return { success: false, error: '% Wireless commands are only valid on WLAN interfaces' };
  }

  const match = input.match(/^ssid\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid SSID' };

  const ssid = match[1].trim();
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    wifi: { ...(port.wifi ?? { security: 'open', channel: '2.4GHz', mode: 'ap' }), ssid }
  }));

  const updatedState = { ...state, ports: newPorts };
  return { success: true, newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * Encryption - Set Wireless Security
 */
function cmdEncryption(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }
  if (!state.currentInterface.toLowerCase().startsWith('wlan')) {
    return { success: false, error: '% Wireless commands are only valid on WLAN interfaces' };
  }

  const match = input.match(/^encryption\s+(open|wpa|wpa2|wpa3)$/i);
  if (!match) return { success: false, error: '% Invalid encryption (open, wpa, wpa2, wpa3)' };

  const security = match[1].toLowerCase() as 'open' | 'wpa' | 'wpa2' | 'wpa3';
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    wifi: { ...(port.wifi ?? { ssid: '', channel: '2.4GHz', mode: 'ap' }), security }
  }));

  const updatedState = { ...state, ports: newPorts };
  return { success: true, newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) } };
}


/**
 * WLAN - Create WLAN configuration (WLC only)
 */
function cmdWlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
      wifi: { ...(newPorts['wlan0'].wifi ?? { security: 'open', channel: '2.4GHz', mode: 'ap' }), ssid }
    };
  }

  return { success: true, newState: { ports: newPorts, wlans: newWlans } };
}

/**
 * No WLAN - Delete a WLAN configuration
 */
function cmdNoWlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^no\s+wlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid command. Usage: no wlan <wlan-id>' };
  }
  const wlanId = match[1];
  const wlans = { ...(state.wlans || {}) };
  if (!wlans[wlanId]) {
    return { success: false, error: `% WLAN ${wlanId} does not exist` };
  }
  delete wlans[wlanId];
  return { success: true, newState: { wlans } };
}

/**
 * Security WPA PSK Set-Key - Set WPA password (WLC only)
 */
function cmdSecurityWpaPsk(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^security\s+wpa\s+psk\s+set-key\s+ascii\s+(?:0|7)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid security command. Usage: security wpa psk set-key ascii {0|7} <password>' };
  }

  const password = match[1];

  // Update wlan0 interface with security
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...(newPorts['wlan0'].wifi ?? { ssid: '', channel: '2.4GHz', mode: 'ap' }), password, security: 'wpa2' }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Channel - Set RF channel (WLC only)
 */
function cmdChannel(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
      wifi: { ...(newPorts['wlan0'].wifi ?? { ssid: '', security: 'open', mode: 'ap' }), channel }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Station-Role - Set AP mode (AP only)
 */
function cmdStationRole(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^station-role\s+root$/i);
  if (!match) {
    return { success: false, error: '% Invalid station-role command. Usage: station-role root' };
  }

  // Update wlan0 interface with AP mode
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...(newPorts['wlan0'].wifi ?? { ssid: '', security: 'open', channel: '2.4GHz' }), mode: 'ap' }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Description - Clear interface description
 */
function cmdNoDescription(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    description: ''
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Switchport Mode - Reset switchport mode
 */
function cmdNoSwitchportMode(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    mode: 'access'
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Switchport Access VLAN - Reset access VLAN
 */
function cmdNoSwitchportAccessVlan(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoSwitchportPortSecurity(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    portSecurity: undefined
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No CDP Enable - Disable CDP on interface
 */
function cmdNoCdpEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    cdpEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Channel-Group - Remove EtherChannel
 */
function cmdNoChannelGroup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    channelGroup: undefined,
    channelProtocol: undefined
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No UDLD - Disable UDLD on interface
 */
function cmdNoUdld(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    udldEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP Proxy-ARP - Disable proxy ARP
 */
function cmdNoIpProxyArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    ipProxyArp: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Keepalive - Disable keepalive
 */
function cmdNoKeepalive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    keepalive: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No Spanning-Tree - Disable spanning-tree on interface
 */
function cmdNoSpanningTree(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    spanningTreeEnabled: false
  }));

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Debug - Enable debug
 */
function cmdDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdMonitorSession(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdNoMonitorSession(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
function cmdAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^access-list\s+(\d+)\s+(?:(\d+)\s+)?(permit|deny)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const seqNum = match[2] ? parseInt(match[2], 10) : undefined;
  const action = match[3];
  const ruleBody = match[4].trim();
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

  const accessLists = { ...(state.accessLists || {}) };
  const existingRules = accessLists[aclId] || [];

  // Determine sequence number
  let effectiveSeq: number;
  if (seqNum) {
    effectiveSeq = seqNum;
  } else {
    // Auto-assign: find the highest existing seq + 10, starting at 10
    const maxSeq = existingRules.reduce((max: number, r: string) => {
      const s = parseInt(r, 10);
      return !isNaN(s) && s > max ? s : max;
    }, 0);
    effectiveSeq = maxSeq === 0 ? 10 : maxSeq + 10;
  }

  // Insert the rule with sequence number prefix
  const newRule = `${effectiveSeq} ${action} ${ruleBody}`;
  const newRules = [...existingRules];

  // Insert at correct position based on sequence number
  const insertIndex = newRules.findIndex((r: string) => {
    const s = parseInt(r, 10);
    return !isNaN(s) && s > effectiveSeq;
  });
  if (insertIndex >= 0) {
    newRules.splice(insertIndex, 0, newRule);
  } else {
    newRules.push(newRule);
  }

  accessLists[aclId] = newRules;

  return {
    success: true,
    output: `Access-list ${aclId} rule added (sequence ${effectiveSeq})`,
    newState: { accessLists }
  };
}

/**
 * No Access-List - Remove ACL or single rule by sequence number
 * Supports: no access-list <id> (remove entire ACL)
 *           no access-list <id> <seq> (remove specific rule)
 */
function cmdNoAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+access-list\s+(\d+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const seqToRemove = match[2]; // Optional sequence number for single rule deletion

  const accessLists = { ...(state.accessLists || {}) };

  if (seqToRemove) {
    // Remove single rule by sequence number
    if (!accessLists[aclId]) {
      return { success: false, error: `% Access-list ${aclId} not found` };
    }
    const ruleExists = accessLists[aclId].some((r: string) => r.startsWith(seqToRemove + ' '));
    if (!ruleExists) {
      return { success: false, error: `% Rule with sequence ${seqToRemove} not found in access-list ${aclId}` };
    }
    accessLists[aclId] = accessLists[aclId].filter((r: string) => !r.startsWith(seqToRemove + ' '));
    if (accessLists[aclId].length === 0) {
      delete accessLists[aclId];
    }
    return {
      success: true,
      output: `Access-list ${aclId} rule ${seqToRemove} removed`,
      newState: { accessLists }
    };
  } else {
    // Remove entire ACL
    delete accessLists[aclId];
    return {
      success: true,
      output: `Access-list ${aclId} removed`,
      newState: { accessLists }
    };
  }
}

/**
 * IP Access-Group - Apply ACL to interface
 */
function cmdIpAccessGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^ip\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid ip access-group command' };

  const [_, aclName, direction] = match;
  const prop = direction.toLowerCase() === 'in' ? 'accessGroupIn' : 'accessGroupOut';

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
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
function cmdNoIpAccessGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+ip\s+access-group\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const direction = match[2];
  const prop = direction.toLowerCase() === 'in' ? 'accessGroupIn' : 'accessGroupOut';

  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
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
function cmdChannelGroup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^channel-group\s+(\d+)\s+mode\s+(active|passive|on|desirable|auto)$/i);
  if (!match) {
    return { success: false, error: '% Invalid channel-group command. Use: channel-group <1-48> mode {active|passive|on|desirable|auto}' };
  }

  const group = parseInt(match[1]);
  const mode = match[2].toLowerCase() as EtherChannelMode;

  const updatePort = (port: Port) => ({ ...port, channelGroup: group, channelMode: mode });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {} as Port);
  return { success: true, output: `Channel-group ${group} mode ${mode} configured`, newState: { ports: newPorts } };
}

/**
 * IP Helper-Address - Set DHCP relay address
 */
function cmdIpHelperAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
  const port = newPorts[state.currentInterface] || {} as Port;
  const helpers: string[] = [...((port as unknown as Record<string, unknown>).helperAddresses as string[] || [])];
  if (!helpers.includes(helperIp)) helpers.push(helperIp);
  newPorts[state.currentInterface] = { ...port, helperAddresses: helpers } as Port;

  return { success: true, output: `Helper address ${helperIp} added`, newState: { ports: newPorts } };
}

/**
 * No IP Helper-Address - Remove DHCP relay address
 */
function cmdNoIpHelperAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^no\s+ip\s+helper-address(?:\s+(\d+\.\d+\.\d+\.\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid command' };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  const port = newPorts[state.currentInterface] || {} as Port;
  newPorts[state.currentInterface] = { ...port, helperAddresses: [] } as Port;

  return { success: true, output: 'Helper address(es) removed', newState: { ports: newPorts } };
}

/**
 * Switchport Nonegotiate - Disable DTP negotiation
 */
function cmdSwitchportNonegotiate(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const updatePort = (port: Port) => ({ ...port, nonegotiate: true });

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
function cmdSwitchportVoiceVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+voice\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid switchport voice vlan command' };
  }

  const vlanId = parseInt(match[1]);
  const updatePort = (port: Port) => ({ ...port, voiceVlan: vlanId });

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
function cmdCdpEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  if (state.cdpEnabled === false) {
    return { success: false, error: '% CDP is not enabled globally. Use "cdp run" first.' };
  }

  const updatePort = (port: Port) => ({ ...port, cdpEnabled: true });

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
function cmdSpanningTreeBpduguardDisable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const updatePort = (port: Port) => ({ ...port, bpduguard: false });

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
function cmdSpanningTreeCost(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^spanning-tree\s+cost\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid spanning-tree cost command. Use: spanning-tree cost <1-200000000>' };
  }

  const cost = parseInt(match[1]);
  const updatePort = (port: Port) => ({ ...port, stpCost: cost });

  let newPorts;
  if (state.selectedInterfaces?.length) {
    newPorts = applyToSelectedPorts(state, updatePort);
  } else {
    if (!state.currentInterface) return { success: false, error: '% No interface selected' };
    newPorts = { ...state.ports };
    newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  }

  const updatedCurrentState = { ...state, ports: newPorts };
  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    output: `STP cost set to ${cost}`,
    newState: myUpdatedState || { ports: newPorts },
    deviceStates: allUpdatedStates
  };
}

/**
 * IPv6 Address
 */
function cmdIpv6Address(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+address\s+([0-9a-fA-F:]+)\/(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid IPv6 address' };
  const updatePort = (port: Port) => ({ ...port, ipv6Address: match[1], ipv6Prefix: parseInt(match[2]) });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 RIP Enable
 */
function cmdIpv6Rip(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+rip\s+(\S+)\s+enable$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processName = match[1];
  const updatePort = (port: Port) => ({
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
function cmdIpv6Ospf(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processId = match[1];
  const area = match[2];
  const updatePort = (port: Port) => ({
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
 * IP OSPF Area - Enable OSPF on interface (IPv4)
 */
function cmdIpOspfArea(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ip\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const processId = match[1];
  const area = match[2];
  const updatePort = (port: Port) => ({
    ...port,
    ospfEnabled: true,
    ospfProcessId: processId,
    ospfArea: area
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP OSPF Area - Disable OSPF on interface (IPv4)
 */
function cmdNoIpOspfArea(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^no\s+ip\s+ospf\s+(\d+)\s+area\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const updatePort = (port: Port) => ({
    ...port,
    ospfEnabled: false,
    ospfProcessId: undefined,
    ospfArea: undefined
  });
  const newPorts = applyToSelectedPorts(state, updatePort);

  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IPv6 RIP
 */
function cmdNoIpv6Rip(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => ({
    ...port,
    ipv6Rip: { enabled: false }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IPv6 DHCP Server
 */
function cmdIpv6DhcpServer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const match = input.match(/^ipv6\s+dhcp\s+server\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  const poolName = match[1];
  const updatePort = (port: Port) => ({
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
function cmdNoIpv6Ospf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: '% No interface selected' };
  const updatePort = (port: Port) => ({
    ...port,
    ipv6Ospf: { enabled: false }
  });
  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Spanning-Tree Priority - Set STP port priority
 */
function cmdSpanningTreePriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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

  const updatePort = (port: Port) => ({ ...port, stpPriority: priority });

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
function cmdSwitchportTrunkEncapsulation(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^switchport\s+trunk\s+encapsulation\s+(dot1q|isl|negotiate)$/i);
  if (!match) return { success: false, error: '% Invalid encapsulation command' };
  const updatePort = (port: Port) => ({ ...port, trunkEncapsulation: match[1].toLowerCase() });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Trunk encapsulation set to ${match[1]}`, newState: { ports: newPorts } };
}

/**
 * Encapsulation dot1Q (subinterface)
 */
function cmdEncapsulationDot1q(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^encapsulation\s+dot1[qQ]\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid encapsulation command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {} as Port), dot1qVlan: parseInt(match[1]) } as Port;
  return { success: true, output: `Encapsulation dot1Q VLAN ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * Encapsulation HDLC - Set serial encapsulation to HDLC (default)
 */
function cmdEncapsulationHdlc(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% HDLC encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: 'hdlc' as const, encapsulation: 'hdlc' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation set to HDLC', newState: { ports: newPorts } };
}

/**
 * Encapsulation PPP - Set serial encapsulation to PPP
 */
function cmdEncapsulationPpp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: 'ppp' as const, encapsulation: 'ppp' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation set to PPP', newState: { ports: newPorts } };
}

/**
 * No Encapsulation - Reset serial encapsulation to default (HDLC)
 */
function cmdNoEncapsulation(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: undefined, encapsulation: 'hdlc' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation reset to default HDLC', newState: { ports: newPorts } };
}

/**
 * Clock Rate - Set DCE clock rate on serial interface
 */
function cmdClockRate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^clock\s+rate\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid clock rate command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Clock rate is only supported on serial interfaces' };
  const rate = parseInt(match[1]);
  // 15.x valid clock rates (2000000 is valid per reference)
  const validRates = [1200, 2400, 4800, 9600, 19200, 38400, 56000, 64000, 72000, 125000, 148000, 256000, 500000, 512000, 2000000, 4000000, 8000000];
  if (!validRates.includes(rate)) {
    return { success: false, error: `% Invalid input detected at '^' marker.` };
  }
  // Only mark as DCE if interface is wired for DCE (clock rate implies DCE side)
  const updatePort = (p: Port) => ({ ...p, clockRate: rate, dce: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Clock rate set to ${rate} bps`, newState: { ports: newPorts } };
}

/**
 * No Clock Rate - Remove clock rate from serial interface
 */
function cmdNoClockRate(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Clock rate is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, clockRate: undefined, dce: undefined });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Clock rate removed', newState: { ports: newPorts } };
}

/**
 * PPP Authentication PAP - Set PPP PAP authentication
 */
function cmdPppAuthPap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: 'pap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP PAP authentication enabled', newState: { ports: newPorts } };
}

/**
 * PPP Authentication CHAP - Set PPP CHAP authentication
 */
function cmdPppAuthChap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: 'chap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP CHAP authentication enabled', newState: { ports: newPorts } };
}

/**
 * No PPP Authentication - Remove PPP authentication
 */
function cmdNoPppAuth(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: undefined });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP authentication removed', newState: { ports: newPorts } };
}

/**
 * PPP PAP Sent-Username - Set PPP PAP credentials
 */
function cmdPppPapSentUsername(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^ppp\s+pap\s+sent-username\s+(\S+)\s+password\s+0\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command. Usage: ppp pap sent-username <username> password 0 <password>' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP commands are only supported on serial interfaces' };
  const username = match[1];
  const password = match[2];
  const updatePort = (p: Port) => ({ ...p, pppPapUsername: username, pppPapPassword: password, pppAuth: 'pap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `PPP PAP sent-username ${username} configured`, newState: { ports: newPorts } };
}

/**
 * Switchport Protected
 */
function cmdSwitchportProtected(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, protected: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Port protected mode enabled', newState: { ports: newPorts } };
}

/**
 * Switchport Block (unicast/multicast)
 */
function cmdSwitchportBlock(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^switchport\s+block\s+(unicast|multicast)$/i);
  if (!match) return { success: false, error: '% Invalid switchport block command' };
  const updatePort = (port: Port) => ({ ...port, [`block${match[1]}`]: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `${match[1]} blocking enabled`, newState: { ports: newPorts } };
}

/**
 * Switchport Port-Security MAC-Address (static)
 */
function cmdSwitchportPortSecurityMacAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };

  // Check if it's the sticky variant
  if (/^switchport\s+port-security\s+mac-address\s+sticky$/i.test(input)) {
    return mutatePortAtInterface(state, (port) => {
      const portSecurity = port.portSecurity ?? { enabled: false };
      return { ...port, portSecurity: { ...portSecurity, sticky: true } };
    });
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
function cmdStormControl(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^storm-control\s+(broadcast|multicast|unicast)\s+level\s+([\d.]+)(?:\s+([\d.]+))?$/i);
  if (!match) return { success: false, error: '% Invalid storm-control command. Use: storm-control {broadcast|multicast|unicast} level <rising> [falling]' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {} as Port), stormControl: { type: match[1], rising: match[2], falling: match[3] } as unknown as Port['stormControl'] } as Port;
  return { success: true, output: `Storm-control ${match[1]} level ${match[2]} configured`, newState: { ports: newPorts } };
}

/**
 * Storm-Control Action
 */
function cmdStormControlAction(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^storm-control\s+action\s+(shutdown|trap)$/i);
  if (!match) return { success: false, error: '% Invalid storm-control action command' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = { ...(newPorts[state.currentInterface] || {} as Port), stormControlAction: match[1] } as Port;
  return { success: true, output: `Storm-control action ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS Trust
 */
function cmdMlsQosTrust(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^mls\s+qos\s+trust\s+(cos|dscp|ip-precedence)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos trust command' };
  const updatePort = (port: Port) => ({ ...port, qosTrust: match[1] });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS trust ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS CoS
 */
function cmdMlsQosCos(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^mls\s+qos\s+cos\s+(\d)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos cos command' };
  const updatePort = (port: Port) => ({ ...port, qosCos: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS CoS ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * IP DHCP Snooping Trust
 */
function cmdIpDhcpSnoopingTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, dhcpSnoopingTrust: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'DHCP snooping trust configured', newState: { ports: newPorts } };
}

/**
 * No IP DHCP Snooping Trust
 */
function cmdNoIpDhcpSnoopingTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, dhcpSnoopingTrust: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'DHCP snooping trust removed', newState: { ports: newPorts } };
}

/**
 * IP ARP Inspection Trust
 */
function cmdIpArpInspectionTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, arpInspectionTrust: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'ARP inspection trust configured', newState: { ports: newPorts } };
}

/**
 * No IP ARP Inspection Trust
 */
function cmdNoIpArpInspectionTrust(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, arpInspectionTrust: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'ARP inspection trust removed', newState: { ports: newPorts } };
}

/**
 * Bandwidth
 */
function cmdBandwidth(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^bandwidth\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid bandwidth command' };
  const updatePort = (port: Port) => ({ ...port, bandwidth: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Bandwidth set to ${match[1]} kbps`, newState: { ports: newPorts } };
}

/**
 * Delay
 */
function cmdDelay(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^delay\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid delay command' };
  const delayValue = parseInt(match[1]);
  const updatePort = (port: Port) => ({ ...port, delay: delayValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Delay set to ${delayValue} microseconds`, newState: { ports: newPorts } };
}

/**
 * MTU
 */
function cmdMtu(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid MTU command' };
  const mtuValue = parseInt(match[1]);
  if (mtuValue < 68 || mtuValue > 65535) {
    return { success: false, error: '% MTU must be between 68 and 65535' };
  }
  const updatePort = (port: Port) => ({ ...port, mtu: mtuValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `MTU set to ${mtuValue} bytes`, newState: { ports: newPorts } };
}

/**
 * Keepalive
 */
function cmdKeepalive(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^keepalive(?:\s+(\d+))?$/i);
  const interval = match?.[1] ? parseInt(match[1]) : 10;
  const updatePort = (port: Port) => ({ ...port, keepalive: interval });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Keepalive set to ${interval} seconds`, newState: { ports: newPorts } };
}

/**
 * IP Proxy-ARP (enable)
 */
function cmdIpProxyArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, proxyArp: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Proxy ARP enabled', newState: { ports: newPorts } };
}

/**
 * IP Verify Source
 */
function cmdIpVerifySource(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const hasPortSecurity = input.includes('port-security');
  const updatePort = (port: Port) => ({
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
function cmdUdldEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const updatePort = (port: Port) => ({ ...port, udld: { enabled: true, ...(port.udld ? { mode: port.udld.mode } : {}) } });
  if (state.selectedInterfaces?.length) return { success: true, newState: applyToSelectedPorts(state, updatePort) };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'UDLD enabled', newState: { ports: newPorts } };
}

/**
 * Switchport Port-Security Aging Time
 */
function cmdSwitchportPortSecurityAgingTime(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+aging\s+time\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid aging time value' };
  }

  const agingTime = parseInt(match[1]);
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: false };
    const aging = portSecurity.aging ?? {};
    return {
      ...port,
      portSecurity: {
        ...portSecurity,
        aging: { ...aging, time: agingTime, enabled: true },
      },
    };
  });
}
function cmdIpNatInside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: 'inside' }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IP NAT Outside
 */
function cmdIpNatOutside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: 'outside' }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP NAT Inside - Remove NAT inside designation from interface
 */
function cmdNoIpNatInside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: undefined }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * No IP NAT Outside - Remove NAT outside designation from interface
 */
function cmdNoIpNatOutside(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: iosModeError() };
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({ ...port, natSide: undefined }));
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Switchport Port-Security Aging Type
 */
function cmdSwitchportPortSecurityAgingType(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: iosModeError() };
  }

  const match = input.match(/^switchport\s+port-security\s+aging\s+type\s+(absolute|inactivity)$/i);
  if (!match) {
    return { success: false, error: '% Invalid aging type (absolute, inactivity)' };
  }

  const agingType = match[1].toLowerCase() as 'absolute' | 'inactivity';
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: false };
    const aging = portSecurity.aging ?? {};
    return {
      ...port,
      portSecurity: {
        ...portSecurity,
        aging: { ...aging, type: agingType, enabled: true },
      },
    };
  });
}



