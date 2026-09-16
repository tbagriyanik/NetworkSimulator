import { CLI_ERRORS, cliModeError } from './cliErrors';
import type { CommandResult } from '../types';
import type { SwitchState } from '../types';
import type { CommandContext } from './commandTypes';
import { getPvstUpdate } from './commandHelpers';

/**
 * Hostname - Set device hostname
 */
export function cmdHostname(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^hostname\s+(.+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }

  const hostname = match[1].trim();
  if (hostname.length > 63 || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(hostname)) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { hostname },
    hint: {
      tr: '💡 Gerçek dünyada: Anlamlı bir hostname cihazı ağda tanımlamayı kolaylaştırır (örn: Kat2-SW).',
      en: '💡 In the real world: A meaningful hostname makes it easier to identify the device in the network (e.g., Floor2-SW).'
    }
  };
}

export function cmdNoHostname(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  return {
    success: true,
    newState: { hostname: 'Switch' }
  };
}

/**
 * VLAN - Create/enter VLAN configuration
 */
export function cmdVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }

  const vlanId = match[1];
  const vlanNum = parseInt(vlanId, 10);

  if (vlanNum < 1 || vlanNum > 4094) {
    return { success: false, error: `% VLAN ID ${vlanId} is not in the range 1 to 4094.` };
  }
  if (vlanNum >= 1002 && vlanNum <= 1005) {
    return { success: false, error: `% VLAN ${vlanNum} is a reserved VLAN and cannot be created.` };
  }

  const newVlans = { ...state.vlans };

  if (!newVlans[vlanId]) {
    newVlans[vlanId] = {
      id: vlanNum,
      name: `VLAN${vlanId}`,
      status: 'active',
      ports: []
    };
  }

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  const updatedCurrentState = {
    ...state,
    vlans: newVlans,
    vtpRevision: nextVtpRevision,
    currentMode: 'vlan' as const,
    currentVlan: vlanNum
  };

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || updatedCurrentState,
    updatedDeviceStates: allUpdatedStates,
    hint: {
      tr: `💡 İpucu: VLAN ${vlanId} oluşturuldu. Şimdi 'name' komutu ile isim verebilir veya arayüzleri bu VLAN'a atayabilirsiniz.`,
      en: `💡 Hint: VLAN ${vlanId} created. Now you can give it a name using the 'name' command or assign interfaces to this VLAN.`
    }
  };
}

/**
 * No VLAN - Delete VLAN
 */
export function cmdNoVlan(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+vlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN ID' };
  }

  const vlanId = match[1];

  if (vlanId === '1') {
    return { success: false, error: '% Cannot remove VLAN 1.' };
  }

  const newVlans = { ...state.vlans };

  if (!newVlans[vlanId]) {
    return { success: false, error: `% VLAN ${vlanId} does not exist` };
  }

  delete newVlans[vlanId];

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  const updatedCurrentState = {
    ...state,
    vlans: newVlans,
    vtpRevision: nextVtpRevision,
  };

  const pvst = getPvstUpdate(updatedCurrentState, ctx);
  if ('error' in pvst) return pvst.error;
  const { allUpdatedStates, myUpdatedState } = pvst;

  return {
    success: true,
    newState: myUpdatedState || updatedCurrentState,
    updatedDeviceStates: allUpdatedStates
  };
}

/**
 * VLAN Name
 */
export function cmdVlanName(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'vlan' || state.currentVlan == null) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^name\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN name command' };
  }

  const vlanId = String(state.currentVlan);
  const vlan = state.vlans?.[vlanId];
  if (!vlan) {
    return { success: false, error: '% VLAN not found' };
  }

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  return {
    success: true,
    newState: {
      vlans: {
        ...state.vlans,
        [vlanId]: {
          ...vlan,
          name: match[1]
        }
      },
      vtpRevision: nextVtpRevision,
    }
  };
}

/**
 * No Name - Clear VLAN name (only valid in vlan mode)
 */
export function cmdNoVlanName(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
 * VLAN State
 */
export function cmdVlanState(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'vlan' || state.currentVlan == null) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^state\s+(active|suspend)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VLAN state command' };
  }

  const vlanId = String(state.currentVlan);
  const vlan = state.vlans?.[vlanId];
  if (!vlan) {
    return { success: false, error: '% VLAN not found' };
  }

  const shouldBumpVtp = (state.vtpMode === 'server') && !!state.vtpDomain;
  const nextVtpRevision = shouldBumpVtp ? ((state.vtpRevision || 0) + 1) : state.vtpRevision;

  return {
    success: true,
    newState: {
      vlans: {
        ...state.vlans,
        [vlanId]: {
          ...vlan,
          status: match[1].toLowerCase() as 'active' | 'suspend'
        }
      },
      vtpRevision: nextVtpRevision,
    }
  };
}

/**
 * VTP Mode
 */
export function cmdVtpMode(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^vtp\s+mode\s+(server|client|transparent)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { vtpMode: match[1].toLowerCase() as 'server' | 'client' | 'transparent' }
  };
}

/**
 * VTP Domain
 */
export function cmdVtpDomain(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^vtp\s+domain\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid VTP domain command' };
  }

  return {
    success: true,
    newState: { vtpDomain: match[1] }
  };
}

/**
 * Spanning-Tree Mode
 */
export function cmdSpanningTreeMode(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^spanning-tree\s+mode\s+(pvst|rapid-pvst|mst)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }

  return {
    success: true,
    newState: { spanningTreeMode: match[1].toLowerCase() as 'pvst' | 'rapid-pvst' | 'mst' }
  };
}

export function cmdDefaultInterface(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^default\s+interface\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid interface name' };
  const interfaceName = match[1];
  const port = state.ports?.[interfaceName];
  if (!port) return { success: false, error: `% Interface ${interfaceName} not found` };
  const defaultPort = { ...port };
  for (const key of ['description', 'ipAddress', 'ipv6Address', 'nativeVlan', 'allowedVlans', 'qos', 'bandwidth', 'delay', 'stpPriority', 'dhcpSnoopingTrust', 'dhcpSnoopingLimitRate', 'arpInspectionTrust', 'carrierDelay', 'loadInterval', 'directedBroadcast', 'powerInline', 'channelGroup', 'encapsulation', 'clockRate', 'pppAuthentication', 'pppUsername', 'helperAddress', 'proxyArp', 'ipVerifySource']) {
    delete (defaultPort as Record<string, unknown>)[key];
  }
  return { success: true, output: `Interface ${interfaceName} reset to default configuration`, newState: { ports: { ...state.ports, [interfaceName]: defaultPort } } };
}
