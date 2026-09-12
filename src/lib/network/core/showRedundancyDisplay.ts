import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, Port } from '../types';

/**
 * Show Standby - Display HSRP status
 */
export function cmdShowStandby(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n';
  let found = false;

  Object.entries(state.ports || {}).forEach(([portName, port]: [string, Port]) => {
    if (port.hsrp?.groups) {
      found = true;
      Object.entries(port.hsrp.groups).forEach(([groupId, config]) => {
        output += `${portName} - Group ${groupId}\n`;
        output += `  State is ${config.state || 'Active'}\n`;
        output += `  Virtual IP address is ${config.virtualIp || 'unknown'}\n`;
        output += `  Active virtual MAC address is 0000.0c07.ac${parseInt(groupId).toString(16).padStart(2, '0')}\n`;
        output += `  Local virtual MAC address is 0000.0c07.ac${parseInt(groupId).toString(16).padStart(2, '0')} (v1 default)\n`;
        output += `  Hello time 3 sec, hold time 10 sec\n`;
        output += `  Next hello sent in 1.234 secs\n`;
        output += `  Preemption ${config.preempt ? 'enabled' : 'disabled'}\n`;
        output += `  Active router is local\n`;
        output += `  Standby router is unknown\n`;
        output += `  Priority ${config.priority ?? 100} (configured ${config.priority ?? 100})\n`;
        output += `  Group name is "hsrp-${portName}-${groupId}" (default)\n`;
      });
    }
  });

  if (!found) {
    output += '% HSRP not configured on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show VRRP
 */
export function cmdShowVrrp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '';
  let found = false;

  Object.entries(state.ports || {}).forEach(([portName, port]) => {
    if (port.vrrp?.groups) {
      Object.entries(port.vrrp.groups).forEach(([groupId, config]) => {
        found = true;
        output += `${portName} - Group ${groupId}\n`;
        output += `  State is ${config.state || 'Init'}\n`;
        output += `  Virtual IP address is ${config.virtualIp || '0.0.0.0'}\n`;
        output += `  Master Router IP address is ${config.state === 'Master' ? (port.ipAddress || 'self') : '192.168.1.1'}\n`;
        output += `  Priority is ${config.priority ?? 100}\n`;
        output += `  Preemption ${config.preempt !== false ? 'enabled' : 'disabled'}\n`;
      });
    }
  });

  if (!found) {
    output = '% VRRP not configured on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show VRRP Brief
 */
export function cmdShowVrrpBrief(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = 'Interface          Grp  Pri Time  Own Pre State   Master addr     Group addr\n';
  let found = false;

  Object.entries(state.ports || {}).forEach(([portName, port]) => {
    if (port.vrrp?.groups) {
      Object.entries(port.vrrp.groups).forEach(([groupId, config]) => {
        found = true;
        const stateStr = (config.state || 'Init').padEnd(7);
        const priStr = String(config.priority ?? 100).padEnd(4);
        const preStr = config.preempt !== false ? 'Y' : 'N';
        const masterIp = config.state === 'Master' ? (port.ipAddress || 'local') : '192.168.1.1';
        const vIp = config.virtualIp || '0.0.0.0';
        output += `${portName.padEnd(18)} ${groupId.padEnd(4)} ${priStr} 3609  N   ${preStr}   ${stateStr} ${masterIp.padEnd(15)} ${vIp}\n`;
      });
    }
  });

  if (!found) {
    output = '% VRRP not configured on any interface\n';
  }

  return { success: true, output };
}

/**
 * Show GLBP
 */
export function cmdShowGlbp(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  let output = '\n';
  let found = false;

  Object.entries(state.ports || {}).forEach(([portId, port]) => {
    if (port.glbp?.groups) {
      Object.entries(port.glbp.groups).forEach(([gId, group]) => {
        found = true;
        output += `${portId} - Group ${gId}\n`;
        output += `  State is ${group.state || 'Listen'}\n`;
        output += `  Virtual IP address is ${group.virtualIp || '192.168.1.254'}\n`;
        output += `  Active is ${group.state === 'Active' ? 'local' : '192.168.1.1'}\n`;
        output += `  Standby is ${group.state === 'Standby' ? 'local' : '192.168.1.2'}\n`;
        output += `  Virtual MAC address is ${group.avgMac || '0007.b400.0101'} (Active)\n`;
        if (group.loadBalancing) {
          output += `  Load balancing mode is ${group.loadBalancing}\n`;
        }
      });
    }
  });

  if (!found) {
    return { success: true, output: '\n% GLBP is not configured on any interface\n' };
  }

  return { success: true, output };
}
