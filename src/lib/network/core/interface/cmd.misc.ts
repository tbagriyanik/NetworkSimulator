import { cliModeError } from '../cliErrors';
import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { buildRunningConfig } from '../configBuilder';
import {
  isInInterfaceMode,
  applyToSelectedPorts
} from './helpers';

/**
 * standby <group> ip <virtual-ip>
 */
export function cmdStandbyIp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
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
export function cmdStandbyPriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
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
export function cmdStandbyIpv6(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
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

export function cmdStandbyPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
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
 * vrrp <group> ip <virtual-ip>
 */
export function cmdVrrpIp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^vrrp\s+(\d+)\s+ip\s+([0-9.]+)$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1]);
  const virtualIp = match[2];

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = vrrp.groups || {};
    groups[group] = { priority: 100, preempt: true, ...groups[group], virtualIp, state: 'Master' };
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * vrrp <group> priority <priority>
 */
export function cmdVrrpPriority(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^vrrp\s+(\d+)\s+priority\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1]);
  const priority = parseInt(match[2]);

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = vrrp.groups || {};
    groups[group] = { preempt: true, ...groups[group], priority };
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * vrrp <group> preempt
 */
export function cmdVrrpPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^vrrp\s+(\d+)\s+preempt$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1]);

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = vrrp.groups || {};
    groups[group] = { priority: 100, ...groups[group], preempt: true };
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

/**
 * no vrrp <group> [ip|priority|preempt]
 */
export function cmdNoVrrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  return noVrrpImpl(state, input);
}

/**
 * no vrrp <group> preempt
 */
export function cmdNoVrrpPreempt(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  return noVrrpImpl(state, input);
}

function noVrrpImpl(state: SwitchState, input: string): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+vrrp\s+(\d+)(?:\s+(ip|priority|preempt))?$/i);
  if (!match) return { success: false, error: '% Invalid vrrp command' };

  const group = parseInt(match[1], 10);
  const sub = match[2] ? match[2].toLowerCase() : undefined;

  const updatePort = (port: Port) => {
    const vrrp = port.vrrp || { groups: {} };
    const groups = { ...vrrp.groups };
    const existing = groups[group];

    if (!sub) {
      delete groups[group];
    } else if (existing) {
      if (sub === 'ip') {
        const { virtualIp: _removed, ...rest } = existing;
        groups[group] = { ...rest, state: 'Backup' };
      } else if (sub === 'priority') {
        groups[group] = { ...existing, priority: 100, basePriority: 100 };
      } else if (sub === 'preempt') {
        groups[group] = { ...existing, preempt: false };
      }
    }
    return { ...port, vrrp: { ...vrrp, groups } };
  };

  const newPorts = applyToSelectedPorts(state, updatePort);
  return { success: true, newState: { ports: newPorts } };
}

export function cmdSsid(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdEncryption(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: '% No interface selected' };
  }
  if (!state.currentInterface.toLowerCase().startsWith('wlan')) {
    return { success: false, error: '% Wireless commands are only valid on WLAN interfaces' };
  }

  const match = input.match(/^encryption\s+(open|wep|wpa|wpa2|wpa3)$/i);
  if (!match) return { success: false, error: '% Invalid encryption (open, wep, wpa, wpa2, wpa3)' };

  const security = match[1].toLowerCase() as 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
  const newPorts = applyToSelectedPorts(state, (port: Port) => ({
    ...port,
    wifi: { ...(port.wifi ?? { ssid: '', channel: '2.4GHz', mode: 'ap' }), security }
  }));

  const updatedState = { ...state, ports: newPorts };
  return { success: true, newState: { ports: newPorts, runningConfig: buildRunningConfig(updatedState) } };
}

export function cmdWlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  // Support wlan enable <id> / wlan disable <id>
  const enableMatch = input.match(/^wlan\s+(enable|disable)\s+(\d+)$/i);
  if (enableMatch) {
    const action = enableMatch[1].toLowerCase();
    const wlanId = enableMatch[2];
    if (state.deviceType === 'wlc' && state.wlcWlans?.[wlanId]) {
      const newWlcWlans = { ...state.wlcWlans };
      newWlcWlans[wlanId] = {
        ...newWlcWlans[wlanId],
        status: action === 'enable' ? 'enabled' : 'disabled',
      };
      return { success: true, newState: { wlcWlans: newWlcWlans } };
    }
    return { success: true };
  }

  // Support wlan security <id> <security> [password]
  const secMatch = input.match(/^wlan\s+security\s+(\d+)\s+(open|wep|wpa|wpa2|wpa3|802\.1x)(?:\s+(\S+))?$/i);
  if (secMatch) {
    const wlanId = secMatch[1];
    const sec = secMatch[2].toLowerCase() as 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
    const pwd = secMatch[3];
    if (state.deviceType === 'wlc' && state.wlcWlans?.[wlanId]) {
      const newWlcWlans = { ...state.wlcWlans };
      newWlcWlans[wlanId] = {
        ...newWlcWlans[wlanId],
        security: sec,
        password: pwd || newWlcWlans[wlanId].password,
      };
      return { success: true, newState: { wlcWlans: newWlcWlans } };
    }
    return { success: true };
  }

  // Support wlan interface/vlan mapping: wlan interface <id> <vlanId>
  const ifMatch = input.match(/^wlan\s+(?:interface|vlan)\s+(\d+)\s+(\d+)$/i);
  if (ifMatch) {
    const wlanId = ifMatch[1];
    const vlanId = parseInt(ifMatch[2], 10);
    if (state.deviceType === 'wlc' && state.wlcWlans?.[wlanId]) {
      const newWlcWlans = { ...state.wlcWlans };
      newWlcWlans[wlanId] = {
        ...newWlcWlans[wlanId],
        vlan: vlanId,
      };
      return { success: true, newState: { wlcWlans: newWlcWlans } };
    }
    return { success: true };
  }

  // Main create command: wlan <name> <id> <ssid> [vlan <vlanId>] [security <sec>] [password <key>]
  const match = input.match(/^wlan\s+(\S+)\s+(\d+)\s+(\S+)(?:\s+vlan\s+(\d+))?(?:\s+security\s+(\S+))?(?:\s+password\s+(\S+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid WLAN command. Usage: wlan <name> <id> <ssid> [vlan <id>] [security <open|wpa2|wpa3|802.1x>]' };
  }

  const wlanName = match[1];
  const wlanId = match[2];
  const ssid = match[3];
  const vlan = match[4] ? parseInt(match[4], 10) : undefined;
  const security = (match[5]?.toLowerCase() as 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3') || 'open';
  const password = match[6];

  // WLC stores WLANs in wlcWlans (centralized controller state)
  if (state.deviceType === 'wlc') {
    const newWlcWlans = { ...state.wlcWlans };
    newWlcWlans[wlanId] = {
      id: Number(wlanId),
      name: wlanName,
      ssid,
      status: 'enabled',
      security,
      password,
      vlan,
    };
    return { success: true, newState: { wlcWlans: newWlcWlans } };
  }

  // Store WLAN configuration in state (autonomous AP)
  const newWlans = state.wlans || {};
  newWlans[wlanId] = { name: wlanName, ssid };

  // Update wlan0 interface with SSID
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...(newPorts['wlan0'].wifi ?? { security: 'open', channel: '2.4GHz', mode: 'ap' }), ssid, security, password }
    };
  }

  return { success: true, newState: { ports: newPorts, wlans: newWlans } };
}

/**
 * No WLAN - Delete a WLAN configuration
 */
export function cmdNoWlan(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^no\s+wlan\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid command. Usage: no wlan <wlan-id>' };
  }
  const wlanId = match[1];

  // WLC stores WLANs in wlcWlans
  if (state.deviceType === 'wlc') {
    const newWlcWlans = { ...state.wlcWlans };
    if (!newWlcWlans[wlanId]) {
      return { success: false, error: `% WLAN ${wlanId} does not exist` };
    }
    delete newWlcWlans[wlanId];
    return { success: true, newState: { wlcWlans: newWlcWlans } };
  }

  const wlans = { ...state.wlans };
  if (!wlans[wlanId]) {
    return { success: false, error: `% WLAN ${wlanId} does not exist` };
  }
  delete wlans[wlanId];
  return { success: true, newState: { wlans } };
}

/**
 * Security WPA PSK Set-Key - Set WPA password (WLC only)
 */
export function cmdSecurityWpaPsk(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
 * Security WEP Key Set-Key - Set WEP key (WLC / AP)
 */
export function cmdSecurityWepKey(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^security\s+wep\s+(?:key\s+set-key|key)\s+ascii\s+(?:0|7)\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid security command. Usage: security wep key set-key ascii {0|7} <key>' };
  }

  const password = match[1];

  // Update wlan0 interface with WEP security
  const newPorts = { ...state.ports };
  if (newPorts['wlan0']) {
    newPorts['wlan0'] = {
      ...newPorts['wlan0'],
      wifi: { ...(newPorts['wlan0'].wifi ?? { ssid: '', channel: '2.4GHz', mode: 'ap' }), password, security: 'wep' }
    };
  }

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Channel - Set RF channel (WLC only)
 */
export function cmdChannel(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
export function cmdStationRole(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
 * No CDP Enable - Disable CDP on interface
 */
export function cmdNoCdpEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdNoUdld(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdNoKeepalive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdNoSpanningTree(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
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
export function cmdDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
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
export function cmdNoDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'privileged' && state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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
export function cmdMonitorSession(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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
export function cmdNoMonitorSession(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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
export function cmdAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
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

  const accessLists = { ...state.accessLists };
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
export function cmdNoAccessList(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+access-list\s+(\d+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid access-list command' };
  }

  const aclId = match[1];
  const seqToRemove = match[2]; // Optional sequence number for single rule deletion

  const accessLists = { ...state.accessLists };

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
export function cmdCdpEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) {
    return { success: false, error: cliModeError() };
  }

  if (state.cdpEnabled === false) {
    return { success: false, error: '% CDP is not enabled globally. Use "cdp run" first.' };
  }

  const updatePort = (port: Port) => ({ ...port, cdpEnabled: true });

  if (state.selectedInterfaces?.length) {
    return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  }

  if (!state.currentInterface) return { success: false, error: '% No interface selected' };

  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'CDP enabled on interface', newState: { ports: newPorts } };
}

export function cmdLldpTransmit(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpTransmit: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdNoLldpTransmit(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpTransmit: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdLldpReceive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpReceive: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

export function cmdNoLldpReceive(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, lldpReceive: false });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

/**
 * Spanning-Tree BPDUGuard Disable
 */
export function cmdEncapsulationDot1q(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
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
export function cmdEncapsulationHdlc(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% HDLC encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: 'hdlc' as const, encapsulation: 'hdlc' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation set to HDLC', newState: { ports: newPorts } };
}

/**
 * Encapsulation PPP - Set serial encapsulation to PPP
 */
export function cmdEncapsulationPpp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: 'ppp' as const, encapsulation: 'ppp' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation set to PPP', newState: { ports: newPorts } };
}

/**
 * No Encapsulation - Reset serial encapsulation to default (HDLC)
 */
export function cmdNoEncapsulation(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Encapsulation is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, serialEncapsulation: undefined, encapsulation: 'hdlc' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Encapsulation reset to default HDLC', newState: { ports: newPorts } };
}

/**
 * Clock Rate - Set DCE clock rate on serial interface
 */
export function cmdClockRate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
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
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Clock rate set to ${rate} bps`, newState: { ports: newPorts } };
}

/**
 * No Clock Rate - Remove clock rate from serial interface
 */
export function cmdNoClockRate(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% Clock rate is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, clockRate: undefined, dce: undefined });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Clock rate removed', newState: { ports: newPorts } };
}

/**
 * PPP Authentication PAP - Set PPP PAP authentication
 */
export function cmdPppAuthPap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: 'pap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP PAP authentication enabled', newState: { ports: newPorts } };
}

/**
 * PPP Authentication CHAP - Set PPP CHAP authentication
 */
export function cmdPppAuthChap(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: 'chap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP CHAP authentication enabled', newState: { ports: newPorts } };
}

/** PPPoE CHAP credentials (Dialer/serial interfaces). */
export function cmdPppChapCredentials(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const port = state.ports[state.currentInterface];
  const hostname = input.match(/^ppp\s+chap\s+hostname\s+(\S+)$/i);
  const password = input.match(/^ppp\s+chap\s+password\s+(?:0\s+)?(\S+)$/i);
  if (!hostname && !password) return { success: false, error: '% Invalid PPP CHAP command' };
  return { success: true, newState: { ports: { ...state.ports, [state.currentInterface]: { ...port, pppAuth: 'chap', ...(hostname ? { pppPapUsername: hostname[1] } : { pppPapPassword: password![1] }) } } } };
}

/**
 * No PPP Authentication - Remove PPP authentication
 */
export function cmdNoPppAuth(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP authentication is only supported on serial interfaces' };
  const updatePort = (p: Port) => ({ ...p, pppAuth: undefined });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'PPP authentication removed', newState: { ports: newPorts } };
}

/**
 * PPP PAP Sent-Username - Set PPP PAP credentials
 */
export function cmdPppPapSentUsername(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^ppp\s+pap\s+sent-username\s+(\S+)\s+password\s+0\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command. Usage: ppp pap sent-username <username> password 0 <password>' };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const port = state.ports[state.currentInterface];
  if (port?.type !== 'serial') return { success: false, error: '% PPP commands are only supported on serial interfaces' };
  const username = match[1];
  const password = match[2];
  const updatePort = (p: Port) => ({ ...p, pppPapUsername: username, pppPapPassword: password, pppAuth: 'pap' as const });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `PPP PAP sent-username ${username} configured`, newState: { ports: newPorts } };
}

/**
 * Switchport Protected
 */
export function cmdStormControl(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
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
export function cmdStormControlAction(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
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
export function cmdMlsQosTrust(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^mls\s+qos\s+trust\s+(cos|dscp|ip-precedence)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos trust command' };
  const trustVal = match[1] as 'cos' | 'dscp' | 'ip-precedence';
  const updatePort = (port: Port) => ({ ...port, qosTrust: trustVal });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS trust ${match[1]} configured`, newState: { ports: newPorts } };
}

/**
 * MLS QoS CoS
 */
export function cmdMlsQosCos(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^mls\s+qos\s+cos\s+(\d)$/i);
  if (!match) return { success: false, error: '% Invalid mls qos cos command' };
  const updatePort = (port: Port) => ({ ...port, qosCos: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `QoS CoS ${match[1]} configured`, newState: { ports: newPorts } };
}

export function cmdQosSetDscp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) return { success: false, error: cliModeError() };
  const match = input.match(/^set\s+dscp\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid DSCP value' };
  const port = state.ports[state.currentInterface];
  return { success: true, output: `DSCP marked ${match[1]}`, newState: { ports: { ...state.ports, [state.currentInterface]: { ...port, qosDscp: match[1], qos: { ...port?.qos, enabled: true } } } } };
}

export function cmdIpDhcpSnoopingLimitRate(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const isNo = input.trim().toLowerCase().startsWith('no ');
  const match = input.match(/^(?:no\s+)?ip\s+dhcp\s+snooping\s+limit\s+rate(?:\s+(\d+))?$/i);
  const rate = isNo ? undefined : (match && match[1] ? parseInt(match[1], 10) : 15);
  const updatePort = (port: Port) => ({ ...port, dhcpSnoopingLimitRate: rate });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, newState: { ports: newPorts } };
}

/**
 * IP DHCP Snooping Trust
 */
export function cmdBandwidth(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^bandwidth\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid bandwidth command' };
  const updatePort = (port: Port) => ({ ...port, bandwidth: parseInt(match[1]) });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Bandwidth set to ${match[1]} kbps`, newState: { ports: newPorts } };
}

/**
 * Delay
 */
export function cmdDelay(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^delay\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid delay command' };
  const delayValue = parseInt(match[1]);
  const updatePort = (port: Port) => ({ ...port, delay: delayValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Delay set to ${delayValue} microseconds`, newState: { ports: newPorts } };
}

/**
 * MTU
 */
export function cmdMtu(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid MTU command' };
  const mtuValue = parseInt(match[1]);
  if (mtuValue < 68 || mtuValue > 65535) {
    return { success: false, error: '% MTU must be between 68 and 65535' };
  }
  const updatePort = (port: Port) => ({ ...port, mtu: mtuValue });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `MTU set to ${mtuValue} bytes`, newState: { ports: newPorts } };
}

/**
 * Keepalive
 */
export function cmdKeepalive(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^keepalive(?:\s+(\d+))?$/i);
  const interval = match?.[1] ? parseInt(match[1]) : 10;
  const updatePort = (port: Port) => ({ ...port, keepalive: interval });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: `Keepalive set to ${interval} seconds`, newState: { ports: newPorts } };
}

/**
 * IP Proxy-ARP (enable)
 */
export function cmdIpProxyArp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, proxyArp: true });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'Proxy ARP enabled', newState: { ports: newPorts } };
}

/**
 * IP Verify Source
 */
export function cmdIpVerifySource(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const hasPortSecurity = input.includes('port-security');
  const updatePort = (port: Port) => ({
    ...port,
    ipVerifySource: true,
    ipVerifySourcePortSecurity: hasPortSecurity || port.ipVerifySourcePortSecurity
  });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'IP verify source configured', newState: { ports: newPorts } };
}

/**
 * UDLD Enable / Port
 */
export function cmdUdldEnable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, udld: { enabled: true, ...(port.udld ? { mode: port.udld.mode } : {}) } });
  if (state.selectedInterfaces?.length) return { success: true, newState: { ports: applyToSelectedPorts(state, updatePort) } };
  if (!state.currentInterface) return { success: false, error: '% No interface selected' };
  const newPorts = { ...state.ports };
  newPorts[state.currentInterface] = updatePort(newPorts[state.currentInterface] || {});
  return { success: true, output: 'UDLD enabled', newState: { ports: newPorts } };
}

/** Configure EtherChannel negotiation protocol on the selected interface(s). */
export function cmdChannelProtocol(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^channel-protocol\s+(lacp|pagp)$/i);
  if (!match) return { success: false, error: '% Invalid channel-protocol command' };
  const protocol = match[1].toLowerCase() as 'lacp' | 'pagp';
  const updatePort = (port: Port) => ({ ...port, channelProtocol: protocol });
  const ports = state.selectedInterfaces?.length
    ? applyToSelectedPorts(state, updatePort)
    : state.currentInterface
      ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) }
      : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `Channel protocol set to ${protocol.toUpperCase()}`, newState: { ports } };
}

/** Enable or disable directed broadcasts on the selected interface(s). */
export function cmdDirectedBroadcast(state: SwitchState, _input: string, enabled: boolean): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const updatePort = (port: Port) => ({ ...port, directedBroadcast: enabled });
  const ports = state.selectedInterfaces?.length
    ? applyToSelectedPorts(state, updatePort)
    : state.currentInterface
      ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) }
      : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `IP directed-broadcast ${enabled ? 'enabled' : 'disabled'}`, newState: { ports } };
}

export function cmdCarrierDelay(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^carrier-delay\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid carrier-delay command' };
  const delay = Number(match[1]);
  const updatePort = (port: Port) => ({ ...port, carrierDelay: delay });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, newState: { ports } };
}

export function cmdLoadInterval(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^load-interval\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid load-interval command' };
  const interval = Number(match[1]);
  if (interval < 30 || interval > 600) return { success: false, error: '% Load interval must be between 30 and 600 seconds' };
  const updatePort = (port: Port) => ({ ...port, loadInterval: interval });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, newState: { ports } };
}

export function cmdArpInspectionLimit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+arp\s+inspection\s+limit\s+(\d+)$/i);
  if (!match || Number(match[1]) < 1) return { success: false, error: '% Invalid ARP inspection rate' };
  const updatePort = (port: Port) => ({ ...port, arpInspectionLimitRate: Number(match[1]) });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `ARP inspection limit set to ${match[1]} pps`, newState: { ports } };
}

export function cmdPriorityQueueOut(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state) || !/^priority-queue\s+out$/i.test(input)) return { success: false, error: '% Invalid priority-queue command' };
  const updatePort = (port: Port) => ({ ...port, qos: { ...port.qos, enabled: true, priorityQueue: { ...port.qos?.priorityQueue, enabled: true } } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: 'Priority output queue enabled', newState: { ports } };
}

export function cmdQueueSet(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^queue-set\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid queue-set command' };
  const updatePort = (port: Port) => ({ ...port, qos: { ...port.qos, enabled: true, egressQueue: Number(match[1]) } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `Queue set ${match[1]} configured`, newState: { ports } };
}

export function cmdTxQueue(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^tx-queue\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid tx-queue command' };
  const updatePort = (port: Port) => ({ ...port, qos: { ...port.qos, enabled: true, ingressQueue: Number(match[1]) } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: `Transmit queue ${match[1]} configured`, newState: { ports } };
}

export function cmdPowerInline(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^power\s+inline$/i);
  if (!match) return { success: false, error: '% Invalid power inline command' };
  const updatePort = (port: Port) => ({ ...port, powerInline: { ...port.powerInline, enabled: true } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, output: 'Power inline enabled', newState: { ports } };
}

export function cmdPowerInlineConsumption(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (!isInInterfaceMode(state)) return { success: false, error: cliModeError() };
  const match = input.match(/^power\s+inline\s+consumption\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid power inline consumption command' };
  const consumption = Number(match[1]);
  const updatePort = (port: Port) => ({ ...port, powerInline: { enabled: true, consumption } });
  const ports = state.selectedInterfaces?.length ? applyToSelectedPorts(state, updatePort) : state.currentInterface ? { ...state.ports, [state.currentInterface]: updatePort(state.ports[state.currentInterface] || {} as Port) } : null;
  if (!ports) return { success: false, error: '% No interface selected' };
  return { success: true, newState: { ports } };
}
