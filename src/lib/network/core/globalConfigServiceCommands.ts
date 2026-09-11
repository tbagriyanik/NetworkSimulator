import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { isLayer3Switch } from '../switchModels';

/**
 * No IP HTTP Server - Disable HTTP server
 */
export function cmdNoIpHttpServer(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const lang = ctx.language || 'en';
  const services = state.services || {};
  return {
    success: true,
    output: lang === 'tr' ?
      'HTTP sunucusu devre dışı bırakıldı' :
      'HTTP server disabled',
    newState: {
      services: {
        ...services,
        http: {
          enabled: false,
          content: '',
          fontSize: 14
        }
      }
    }
  };
}

/**
 * No IP Domain Lookup - Disable domain lookup
 */
export function cmdNoIpDomainLookup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { domainLookup: false }
  };
}

export function cmdNoIpDomainName(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }
  return {
    success: true,
    newState: { domainName: undefined }
  };
}

/**
 * No IP Routing - Disable IP routing
 */
export function cmdNoIpRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { ipRouting: false }
  };
}

/**
 * No IP SSH Time-Out
 */
export function cmdNoIpSshTimeOut(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { sshTimeout: undefined }
  };
}

/**
 * No MLS QoS - Disable MLS QoS
 */
export function cmdNoMlsQos(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { mlsQosEnabled: false }
  };
}

/**
 * IP SSH Version - Set SSH version
 */
export function cmdIpSshVersion(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ip\s+ssh\s+version\s+(1|2)$/i);
  if (!match) {
    return { success: false, error: '% Invalid ip ssh version command. Use: ip ssh version {1|2}' };
  }

  const version = parseInt(match[1]);
  return {
    success: true,
    output: `SSH version ${version} configured`,
    newState: { sshVersion: version as 1 | 2 }
  };
}

/**
 * IP DHCP Snooping VLAN
 */
export function cmdIpDomainLookup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return { success: true, newState: { domainLookup: true } };
}

export function cmdSystemMtu(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^system\s+mtu\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid system mtu command' };
  return { success: true, output: `Changes to the MTU will take effect after reload\nSystem MTU size is ${match[1]} bytes` };
}

export function cmdSdmPrefer(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };

  const match = input.match(/^sdm\s+prefer\s+(\S+)(?:\s+(\S+))?/i);
  if (!match) {
    return {
      success: false,
      error: `% Invalid sdm prefer command.\nUsage: sdm prefer {lanbase-routing | lanbase | desktop | default}`
    };
  }

  const template = match[1].toLowerCase();
  const validTemplates = ['lanbase-routing', 'lanbase', 'desktop', 'default', 'routing'];

  if (!validTemplates.includes(template)) {
    return {
      success: false,
      error: `% Invalid template: ${template}\nValid templates: lanbase-routing, lanbase, desktop, default`
    };
  }

  if (!isLayer3Switch(state.switchModel)) {
    return {
      success: false,
      error: `% SDM preference is not supported on ${state.switchModel}\nSDM prefer is only available on Layer 3 switches`
    };
  }

  let output = '';

  if (template === 'lanbase-routing' || template === 'routing') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 16384 IPv4 ACL entries, 2048 QoS labels, 16384 IPv4 Multicast entries\n`;
  } else if (template === 'lanbase') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 8192 IPv4 ACL entries, 2048 QoS labels, 2048 IPv4 Multicast entries\n`;
  } else if (template === 'desktop') {
    output = `Changes to the SDM preferences will take effect after reload.\n`;
    output += `This template will configure: 4096 IPv4 ACL entries, 512 QoS labels, 256 IPv4 Multicast entries\n`;
  } else {
    output = `Current SDM template is: ${template}\n`;
  }

  output += `\n% System needs to be reloaded for the new template to take effect.\n% Use 'reload' command to reboot the device.\n`;

  return {
    success: true,
    output,
    newState: {
      sdmPreferConfigured: true,
      sdmTemplate: template,
      reloaded: false
    }
  };
}

export function cmdIpSshAuthRetries(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^ip\s+ssh\s+authentication-retries\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };
  const retries = parseInt(match[1], 10);
  if (retries < 0 || retries > 5) return { success: false, error: '% Value must be between 0 and 5' };
  return { success: true, output: `SSH authentication retries set to ${retries}` };
}