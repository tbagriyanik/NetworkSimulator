import type { CommandHandler, CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import type { CanvasDevice } from '@/components/network/networkTopology.types';

export const cmdShowWireless: CommandHandler = (
  state: SwitchState,
  _input: string,
  ctx: CommandContext
): CommandResult => {
  const device = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show wireless is not a switch command.\nWireless summary is only available on Wireless LAN Controllers (WLC).\nWLC commands: show wlan summary, show ap summary' };
  }

  let output = '\nWireless Configuration Status\n';
  output += '-------------------------------------------\n';
  output += 'Interface   Mode     SSID           Security   Channel  Status\n';
  output += '---------   ------   -------------  ---------  -------  ----------\n';

  let found = false;
  Object.keys(state.ports || {}).forEach(portName => {
    const port = state.ports[portName];
    if (portName.toLowerCase().startsWith('wlan')) {
      found = true;
      const wifi = port.wifi;
      const mode = (wifi?.mode || 'disabled').padEnd(8);
      const ssid = (wifi?.ssid || '-').padEnd(14);
      const security = (wifi?.security || 'open').padEnd(10);
      const channel = (wifi?.channel || '2.4GHz').padEnd(8);
      const status = (port.shutdown ? 'Down' : 'Up');

      output += `${portName.padEnd(11)} ${mode}${ssid}${security}${channel}${status}\n`;
    }
  });

  if (!found) {
    output += 'No wireless interfaces found on this device.\n';
  }

  output += '!\n';
  return { success: true, output };
};

export const cmdShowWlanSummary: CommandHandler = (
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult => {
  const device = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show wlan summary is only available on Wireless LAN Controllers (WLC).' };
  }

  const idMatch = input.match(/show\s+wlan\s+summary\s+(\d+)/i);
  const specificId = idMatch ? idMatch[1] : null;

  let output = '\nWLAN Summary\n';
  output += '-----------\n';

  const wlcWlans = state.wlcWlans || {};
  const wlans = state.wlans || {};

  if (Object.keys(wlcWlans).length > 0 || Object.keys(wlans).length > 0) {
    output += 'WLAN ID  Profile Name  SSID              Status  Security  VLAN\n';
    output += '--------  ------------  ----------------  ------  --------  ----\n';

    Object.entries(wlcWlans).forEach(([id, wlan]) => {
      if (specificId && id !== specificId) return;
      output += `${String(wlan.id).padEnd(8)}  ${wlan.name.padEnd(12)}  ${wlan.ssid.padEnd(16)}  ${wlan.status === 'enabled' ? 'Up' : 'Down'}  ${wlan.security.padEnd(8)}  ${wlan.vlan || 1}\n`;
    });

    Object.entries(wlans).forEach(([id, wlan]) => {
      if (specificId && id !== specificId) return;
      output += `${id.padEnd(8)}  ${wlan.name.padEnd(12)}  ${wlan.ssid.padEnd(16)}  Up      ${state.ports['wlan0']?.wifi?.security || 'open'.padEnd(8)}  ${1}\n`;
    });
  } else if (specificId) {
    return { success: false, error: `% WLAN ${specificId} not found` };
  } else {
    output += 'No WLANs configured.\n';
  }

  output += `\nNumber of WLANs: ${Object.keys(wlcWlans).length + Object.keys(wlans).length}\n`;
  output += '!\n';
  return { success: true, output };
};

export const cmdShowApSummary: CommandHandler = (
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult => {
  const device = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show ap summary is only available on Wireless LAN Controllers (WLC).' };
  }

  const nameMatch = input.match(/show\s+ap\s+summary\s+(\S+)/i);
  const specificAp = nameMatch ? nameMatch[1] : null;

  const wlcAps = state.wlcAps || {};

  let output = '\nAP Summary\n';
  output += '----------\n';
  output += 'AP Name           MAC Address      IP Address       Status         Model           WLANs\n';
  output += '----------------  ---------------  ---------------  -------------  --------------  -----\n';

  let apCount = 0;

  Object.entries(wlcAps).forEach(([apId, ap]) => {
    if (specificAp && ap.name !== specificAp && apId !== specificAp) return;
    apCount++;
    const status = ap.status.padEnd(14);
    const model = (ap.model || 'AIR-AP1852I').padEnd(15);
    const wlanCount = ap.wlans?.length ? ap.wlans.join(',') : '-';
    output += `${ap.name.padEnd(17)}  ${ap.macAddress.padEnd(16)}  ${(ap.ipAddress || '-').padEnd(16)}  ${status}${model}${wlanCount}\n`;
  });

  const wlan = state.ports['wlan0'];
  if (wlan && !wlan.shutdown && wlan.wifi?.ssid) {
    if (!specificAp || specificAp === device?.name?.toLowerCase()) {
      apCount++;
      output += `${(device?.name || 'AP-local').padEnd(17)}  ${state.macAddress?.padEnd(16) || '0000.0000.0000   '}  ${(wlan.ipAddress || '-').padEnd(16)}  ${'Up'.padEnd(14)}${'Built-in'.padEnd(15)}${wlan.wifi.ssid}\n`;
    }
  }

  if (apCount === 0) {
    output += 'No APs configured or joined.\n';
  }

  output += `\nNumber of APs: ${apCount}\n`;
  output += '!\n';
  return { success: true, output };
};

export const cmdShowApConfig: CommandHandler = (
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult => {
  const device = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show ap config is only available on Wireless LAN Controllers (WLC).' };
  }

  const match = input.match(/show\s+ap\s+config\s+(\S+)/i);
  const apName = match?.[1];

  const wlcAps = state.wlcAps || {};
  const ap = apName ? Object.values(wlcAps).find(a => a.name.toLowerCase() === apName.toLowerCase()) : null;

  if (apName && !ap) {
    return { success: false, error: `% AP ${apName} not found` };
  }

  let output = '\n';
  if (ap) {
    output += `AP Name          : ${ap.name}\n`;
    output += `MAC Address      : ${ap.macAddress}\n`;
    output += `IP Address       : ${ap.ipAddress || 'Not assigned'}\n`;
    output += `Status           : ${ap.status}\n`;
    output += `Model            : ${ap.model || 'AIR-AP1852I'}\n`;
    output += `AP Group         : ${ap.apGroup || 'default'}\n`;
    const ap5ghz = ap.dot11?.['5ghz'];
    output += `RF Channel       : ${ap5ghz?.rfChannel ?? ap.rfChannel ?? 'Auto'}\n`;
    output += `Power Level      : ${ap5ghz?.powerConstraint ?? ap.power ?? 'Auto'}\n`;
    output += `Uptime           : ${ap.uptime || 'Unknown'}\n`;
    output += `Associated WLANs : ${ap.wlans?.length ? ap.wlans.join(', ') : 'None'}\n`;
  } else {
    if (Object.keys(wlcAps).length === 0) {
      output += 'No APs configured.\n';
    } else {
      output += 'AP Name           MAC Address      Status       Uptime\n';
      output += '----------------  ---------------  -----------  -------------------------\n';
      Object.values(wlcAps).forEach(a => {
        output += `${a.name.padEnd(17)}  ${a.macAddress.padEnd(16)}  ${a.status.padEnd(12)}  ${a.uptime || 'Unknown'}\n`;
      });
    }
  }

  output += '!\n';
  return { success: true, output };
};

export const cmdShowApJoinStats: CommandHandler = (
  state: SwitchState,
  _input: string,
  ctx: CommandContext
): CommandResult => {
  const device = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  if (device && (device.type === 'switchL2' || device.type === 'switchL3')) {
    return { success: false, error: '% Invalid command. show ap join statistics is only available on Wireless LAN Controllers (WLC).' };
  }

  let output = '\nAP Join Statistics\n';
  output += '------------------\n';
  output += 'Total APs Discovered: 0\n';
  output += 'Total APs Joined    : ' + Object.keys(state.wlcAps || {}).length + '\n';
  output += 'Total APs Rejected  : 0\n';
  output += 'Last Join Time      : N/A\n';
  output += '\nJoin Process:\n';
  output += '  1. Discovery Request      - Sent to WLC\n';
  output += '  2. Discovery Response     - WLC responds\n';
  output += '  3. Join Request           - AP requests to join\n';
  output += '  4. Join Response          - WLC accepts join\n';
  output += '  5. Config Download        - AP downloads config\n';
  output += '  6. Software Download      - If version mismatch\n';
  output += '  7. CAPWAP State           - Run state\n';

  if (Object.keys(state.wlcAps || {}).length > 0) {
    output += '\nCurrently Joined APs:\n';
    Object.values(state.wlcAps || {}).forEach(ap => {
      output += `  ${ap.name} (${ap.macAddress}) - ${ap.status}\n`;
    });
  }

  output += '!\n';
  return { success: true, output };
};

export const cmdShowDot11Associations: CommandHandler = (
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult => {
  const anyState = state as SwitchState & { wirelessClients?: Array<{ iface?: string; ssid?: string; mac?: string; status?: string }> };
  const clients = anyState.wirelessClients || [];
  if (clients.length === 0) {
    return { success: true, output: '\n% No wireless clients associated\n' };
  }
  let output = '\nInterface    SSID                         MAC Address        Status\n';
  output += '--------     ----                         ------------       ------\n';
  clients.forEach((c: { iface?: string; ssid?: string; mac?: string; status?: string }) => {
    const iface = c.iface || 'Dot11Radio0';
    const ssid = c.ssid || '-';
    const mac = c.mac || '-';
    const status = c.status || 'associated';
    output += `${iface.padEnd(12)}${ssid.padEnd(30)}${mac.padEnd(18)}${status}\n`;
  });
  output += '!\n';
  return { success: true, output };
};

export const cmdShowDot11Statistics: CommandHandler = (
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult => {
  const anyState = state as SwitchState & { dot11Stats?: { rxPackets?: number; txPackets?: number; crcErrors?: number; retries?: number } };
  let output = '\nDot11 Radio Statistics:\n';
  output += `  Packets Received: ${anyState.dot11Stats?.rxPackets || 0}\n`;
  output += `  Packets Transmitted: ${anyState.dot11Stats?.txPackets || 0}\n`;
  output += `  CRC Errors: ${anyState.dot11Stats?.crcErrors || 0}\n`;
  output += `  Retries: ${anyState.dot11Stats?.retries || 0}\n`;
  output += '!\n';
  return { success: true, output };
};

export const cmdShowWlan: CommandHandler = (
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult => {
  const match = input.match(/show\s+wlan\s+(\d+)/i);
  const wlanId = match?.[1];
  const wlans = state.wlans || {};
  const wlan = wlans[wlanId || ''];
  if (!wlan) {
    return { success: false, error: `% WLAN ${wlanId} not found` };
  }
  let output = `\nWLAN ID: ${wlanId}\n`;
  output += `  Name: ${wlan.name || '-'}\n`;
  output += `  SSID: ${wlan.ssid || '-'}\n`;
  output += '!\n';
  return { success: true, output };
};
