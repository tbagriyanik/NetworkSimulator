import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult, Port } from '../../types';
import { buildRunningConfig } from '../configBuilder';
import { isInInterfaceMode, applyToSelectedPorts } from './helpers';

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
