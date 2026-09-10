import { IOS_ERRORS, iosModeError } from '../iosErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { getPvstUpdate } from '../commandHelpers';
import {
  isInInterfaceMode,
  isVlanInterfaceName,
  applyToSelectedPorts,
  mutatePortAtInterface
} from './helpers';
import { validateNoSwitchportSupport } from '../L3Validation';

export function cmdSwitchportPortSecurity(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: true };
    return { ...port, portSecurity: { ...portSecurity, enabled: true } };
  });
}

/**
 * Switchport Port-Security Maximum
 */
export function cmdSwitchportPortSecurityMaximum(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdSwitchportPortSecurityViolation(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdSwitchportPortSecuritySticky(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^switchport\s+port-security\s+mac-address\s+sticky(?:\s+([0-9a-fA-F.:-]+))?$/i);
  const mac = match && match[1] ? match[1].toLowerCase() : undefined;
  return mutatePortAtInterface(state, (port) => {
    const portSecurity = port.portSecurity ?? { enabled: false };
    const stickyMacs = mac ? Array.from(new Set([...(port.stickyMacs || []), mac])) : port.stickyMacs;
    return {
      ...port,
      portSecurity: { ...portSecurity, sticky: true },
      stickyMacs,
    };
  });
}

/**
 * Spanning-Tree Portfast
 */

export function cmdNoSwitchport(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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

  const targets = Array.isArray(state.selectedInterfaces) && state.selectedInterfaces.length > 0
    ? state.selectedInterfaces
    : [state.currentInterface];

  const newPorts = { ...state.ports };

  targets.forEach((portId) => {
    const existing = newPorts[portId] || { id: portId, type: 'gigabitethernet' };
    newPorts[portId] = {
      ...existing,
      mode: 'routed',
      isRoutedPort: true,
      accessVlan: undefined,
      nativeVlan: undefined,
      allowedVlans: undefined,
      portSecurity: undefined,
      spanningTree: undefined,
      trunkAllowedVlans: undefined,
      trunkNativeVlan: undefined,
      voiceVlan: undefined,
    };

    // If this is a Port-channel interface (e.g. po1), propagate routed mode to member ports
    const poMatch = portId.match(/^po(\d+)$/i);
    if (poMatch) {
      const groupId = parseInt(poMatch[1], 10);
      Object.keys(newPorts).forEach((pId) => {
        if (newPorts[pId]?.channelGroup === groupId) {
          newPorts[pId] = {
            ...newPorts[pId],
            mode: 'routed',
            isRoutedPort: true,
            accessVlan: undefined,
            nativeVlan: undefined,
            allowedVlans: undefined,
          };
        }
      });
    }
  });

  let output = `\n`;
  if (targets.length > 1) {
    output += `Interfaces ${targets.join(', ')} converted to routed ports\n`;
  } else {
    output += `Interface ${state.currentInterface} converted to routed port\n`;
  }
  output += `Port(s) are now in L3 routed mode. Use 'ip address' to assign an IP address.\n`;

  return {
    success: true,
    output,
    newState: { ports: newPorts },
    hint: {
      tr: '💡 Gerçek dünyada: "no switchport" komutu L3 Switch portunu (veya Port-channel arayüzünü) Katman 2 (switchport) modundan Katman 3 (routed port) moduna geçirir. Böylece arayüze doğrudan IP adresi atanabilir.',
      en: '💡 In the real world: "no switchport" converts an L3 Switch port (or Port-channel interface) from Layer 2 (switchport) mode to Layer 3 (routed port) mode, allowing direct IP address assignment.'
    }
  };
}

/**
 * Switchport Mode - access | trunk | dynamic auto | dynamic desirable | dot1q-tunnel
 */
export function cmdSwitchportMode(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
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
      return !port?.encapsulation || (port.encapsulation as string) !== '802.1q';
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
    newState: myUpdatedState || ({ ports: newPorts } as Partial<SwitchState>),
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
export function cmdSwitchportAccessVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
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
export function cmdSwitchportTrunkNativeVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdSwitchportTrunkAllowedVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdNoSwitchportMode(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdNoSwitchportAccessVlan(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdNoSwitchportPortSecurity(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdSwitchportNonegotiate(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: iosModeError() };
  }

  const updatePort = (port: Port) => ({ ...port, nonegotiate: true });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'DTP negotiation disabled', newState: { ports: newPorts } };
}

/**
 * Switchport Voice VLAN - Set voice VLAN
 */
export function cmdSwitchportVoiceVlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Voice VLAN ${vlanId} configured`, newState: { ports: newPorts } };
}

/**
 * CDP Enable - Enable CDP on interface
 */
export function cmdSwitchportTrunkEncapsulation(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const match = input.match(/^switchport\s+trunk\s+encapsulation\s+(dot1q|isl|negotiate)$/i);
  if (!match) return { success: false, error: '% Invalid encapsulation command' };
  const encap = match[1].toLowerCase() as 'dot1q' | 'isl' | 'negotiate';
  const updatePort = (port: Port) => ({
    ...port,
    trunkEncapsulation: encap,
    encapsulation: (encap === 'dot1q' ? '802.1q' : (encap === 'isl' ? 'isl' : 'negotiate')) as Port['encapsulation']
  });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Trunk encapsulation set to ${match[1]}`, newState: { ports: newPorts } };
}

/**
 * Encapsulation dot1Q (subinterface)
 */
export function cmdSwitchportProtected(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const isNo = input.trim().toLowerCase().startsWith('no ');
  const updatePort = (port: Port) => ({ ...port, protected: !isNo });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Port protected mode ${isNo ? 'disabled' : 'enabled'}`, newState: { ports: newPorts } };
}

/**
 * Switchport Block (unicast/multicast)
 */
export function cmdSwitchportBlock(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: iosModeError() };
  const isNo = input.trim().toLowerCase().startsWith('no ');
  const match = input.match(/^(?:no\s+)?switchport\s+block\s+(unicast|multicast)$/i);
  if (!match) return { success: false, error: '% Invalid switchport block command' };
  const type = match[1].toLowerCase();
  const key = type === 'unicast' ? 'blockUnicast' : 'blockMulticast';
  const updatePort = (port: Port) => ({ ...port, [key]: !isNo });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `${match[1]} blocking ${isNo ? 'disabled' : 'enabled'}`, newState: { ports: newPorts } };
}

/**
 * Switchport Port-Security MAC-Address (static)
 */
export function cmdSwitchportPortSecurityMacAddress(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdSwitchportPortSecurityAgingTime(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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

export function cmdSwitchportPortSecurityAgingType(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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


