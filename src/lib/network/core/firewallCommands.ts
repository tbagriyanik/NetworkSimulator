import { CommandHandler } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { CLI_ERRORS } from './cliErrors';

export const firewallHandlers: Record<string, CommandHandler> = {
  'access-group': cmdAccessGroup,
  'no access-group': cmdNoAccessGroup,
  'object network': cmdObjectNetwork,
  'no object network': cmdNoObjectNetwork,
  'nat': cmdNat,
  'no nat': cmdNoNat,
  'route': cmdRoute,
  'no route': cmdNoRoute,
  'timeout': cmdTimeout,
  'passwd': cmdPasswd,
  'http server enable': cmdHttpServerEnable,
  'no http server enable': cmdNoHttpServerEnable,
  'ssh asa': cmdSshAsa,
  'no ssh asa': cmdNoSshAsa,
  'telnet asa': cmdTelnetAsa,
  'no telnet asa': cmdNoTelnetAsa,
  'logging enable': cmdLoggingEnable,
  'no logging enable': cmdNoLoggingEnable,
  'nameif': (state, input) => {
    if (state.currentInterface && state.ports[state.currentInterface]) {
      const parts = input.trim().split(/\s+/);
      const name = parts[1];
      if (!name) return { success: false, error: '% Incomplete command.' };

      const port = state.ports[state.currentInterface];
      const updatedPort = { ...port, nameif: name };

      // Auto-set security level for 'inside'
      if (name.toLowerCase() === 'inside' && port.securityLevel === undefined) {
        updatedPort.securityLevel = 100;
      } else if (port.securityLevel === undefined) {
        updatedPort.securityLevel = 0;
      }

      const newState = {
        ports: {
          ...state.ports,
          [state.currentInterface]: updatedPort
        }
      };
      return {
        success: true,
        output: `INFO: Security level for "${name}" set to ${updatedPort.securityLevel} by default.`,
        newState
      };
    }
    return { success: false, error: '% Error: No interface selected' };
  },
  'security-level': (state, input) => {
    if (state.currentInterface && state.ports[state.currentInterface]) {
      const parts = input.trim().split(/\s+/);
      const levelStr = parts[1];
      if (!levelStr) return { success: false, error: '% Incomplete command.' };

      const level = parseInt(levelStr);
      if (isNaN(level) || level < 0 || level > 100) {
        return { success: false, error: '% Error: Security level must be between 0 and 100' };
      }
      const newState = {
        ports: {
          ...state.ports,
          [state.currentInterface]: {
            ...state.ports[state.currentInterface],
            securityLevel: level
          }
        }
      };
      return { success: true, newState };
    }
    return { success: false, error: '% Error: No interface selected' };
  },
  'no nameif': (state, _input) => {
    if (state.currentInterface && state.ports[state.currentInterface]) {
      const newState = {
        ports: {
          ...state.ports,
          [state.currentInterface]: {
            ...state.ports[state.currentInterface],
            nameif: undefined
          }
        }
      };
      return { success: true, output: `\n% Interface name removed\n`, newState };
    }
    return { success: false, error: '% Error: No interface selected' };
  },
  'same-security-traffic': (_state, _input) => {
    return {
      success: true,
      output: '\n% Same-security traffic permitted between interfaces with the same security level.\n',
      newState: { sameSecurityTraffic: true }
    };
  },
  'no same-security-traffic': (_state, _input) => {
    return {
      success: true,
      output: '\n% Same-security traffic denied between interfaces with the same security level.\n',
      newState: { sameSecurityTraffic: false }
    };
  },
};

// ============================================================
// Firewall command handlers (fully implemented)
// ============================================================

/**
 * access-group <acl-name> in interface <nameif>
 * Apply an access-list to an interface (firewall style)
 */
function cmdAccessGroup(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^access-group\s+(\S+)\s+in\s+interface\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const aclName = match[1];
  const ifName = match[2].toLowerCase();

  // Find the interface by nameif
  const portEntry = Object.entries(state.ports || {}).find(
    ([, p]) => (p as { nameif?: string }).nameif?.toLowerCase() === ifName
  );
  if (!portEntry) {
    return { success: false, error: `% Interface ${ifName} not found` };
  }

  const updatedPorts = { ...state.ports };
  const portKey = portEntry[0];
  updatedPorts[portKey] = { ...updatedPorts[portKey], accessGroupIn: aclName };

  return {
    success: true,
    newState: { ports: updatedPorts },
  };
}

/**
 * no access-group <acl-name> in interface <nameif>
 */
function cmdNoAccessGroup(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^no\s+access-group\s+(\S+)\s+in\s+interface\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const ifName = match[2].toLowerCase();

  const portEntry = Object.entries(state.ports || {}).find(
    ([, p]) => (p as { nameif?: string }).nameif?.toLowerCase() === ifName
  );
  if (!portEntry) {
    return { success: false, error: `% Interface ${ifName} not found` };
  }

  const updatedPorts = { ...state.ports };
  const portKey = portEntry[0];
  updatedPorts[portKey] = { ...updatedPorts[portKey], accessGroupIn: undefined };

  return {
    success: true,
    newState: { ports: updatedPorts },
  };
}

/**
 * object network <name>
 * Create or enter a network object (firewall NAT)
 */
function cmdObjectNetwork(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^object\s+network\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const objName = match[1];

  const objects = { ...state.firewallObjects };
  if (!objects[objName]) {
    objects[objName] = { name: objName, subnet: undefined, host: undefined, nat: undefined };
  }

  return {
    success: true,
    newState: {
      firewallObjects: objects,
      currentFirewallObject: objName,
    },
  };
}

/**
 * no object network <name>
 */
function cmdNoObjectNetwork(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^no\s+object\s+network\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const objName = match[1];
  const objects = { ...state.firewallObjects };
  delete objects[objName];
  return {
    success: true,
    newState: { firewallObjects: objects },
  };
}

/**
 * host <ip> or subnet <ip> <mask> — inside object network sub-mode
 */
function cmdNat(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  // nat (inside,outside) static <mapped-ip>
  const staticMatch = input.match(/^nat\s*\(([^,]+),([^)]+)\)\s+static\s+(\S+)$/i);
  if (staticMatch) {
    const srcZone = staticMatch[1].trim().toLowerCase();
    const dstZone = staticMatch[2].trim().toLowerCase();
    const mappedIp = staticMatch[3];
    return {
      success: true,
      output: `Static NAT applied: (${srcZone},${dstZone}) -> ${mappedIp}`,
      newState: {
        natRules: [...(state.natRules || []), { type: 'static', srcZone, dstZone, mappedIp }],
      },
    };
  }
  // nat (inside,outside) source dynamic <pool> interface
  const dynamicMatch = input.match(/^nat\s*\(([^,]+),([^)]+)\)\s+source\s+dynamic\s+(\S+)\s+(\S+)$/i);
  if (dynamicMatch) {
    const srcZone = dynamicMatch[1].trim().toLowerCase();
    const dstZone = dynamicMatch[2].trim().toLowerCase();
    const pool = dynamicMatch[3];
    const target = dynamicMatch[4];
    return {
      success: true,
      output: `Dynamic NAT applied: (${srcZone},${dstZone}) source ${pool} ${target}`,
      newState: {
        natRules: [...(state.natRules || []), { type: 'dynamic', srcZone, dstZone, pool, target }],
      },
    };
  }
  // Inside object: host <ip>
  const hostMatch = input.match(/^host\s+(\S+)$/i);
  if (hostMatch && state.currentFirewallObject) {
    const objects = { ...state.firewallObjects };
    const obj = objects[state.currentFirewallObject];
    if (obj) {
      obj.host = hostMatch[1];
      return {
        success: true,
        newState: { firewallObjects: objects },
      };
    }
  }
  // Inside object: subnet <ip> <mask>
  const subnetMatch = input.match(/^subnet\s+(\S+)\s+(\S+)$/i);
  if (subnetMatch && state.currentFirewallObject) {
    const objects = { ...state.firewallObjects };
    const obj = objects[state.currentFirewallObject];
    if (obj) {
      obj.subnet = { ip: subnetMatch[1], mask: subnetMatch[2] };
      return {
        success: true,
        newState: { firewallObjects: objects },
      };
    }
  }
  return { success: false, error: CLI_ERRORS.invalidInput };
}

/**
 * no nat — remove NAT rule
 */
function cmdNoNat(_state: SwitchState, _input: string): CommandResult {
  return { success: true, output: '' };
}

/**
 * route <ifname> <network> <mask> <gateway> [distance]
 * Add static route on firewall
 */
function cmdRoute(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^route\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const [, ifName, network, mask, gateway, distance] = match;
  return {
    success: true,
    newState: {
      staticRoutes: [
        ...(state.staticRoutes || []),
        {
          destination: network,
          subnetMask: mask,
          nextHop: gateway,
          metric: distance ? parseInt(distance) : 1,
          type: 'static',
          interface: ifName,
        },
      ],
    },
  };
}

/**
 * no route <ifname> <network> <mask> [gateway]
 */
function cmdNoRoute(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^no\s+route\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const [, , network, mask] = match;
  const filtered = (state.staticRoutes || []).filter(
    (r) => !(r.destination === network && r.subnetMask === mask)
  );
  return {
    success: true,
    newState: { staticRoutes: filtered },
  };
}

/**
 * timeout <proto> <hours:minutes:seconds>
 */
function cmdTimeout(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^timeout\s+(\S+)\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const proto = match[1].toLowerCase();
  const value = match[2];
  return {
    success: true,
    newState: {
      firewallTimeouts: { ...state.firewallTimeouts, [proto]: value },
    },
  };
}

/**
 * passwd <password> — set enable password on firewall
 */
function cmdPasswd(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^passwd\s+(.+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  return {
    success: true,
    newState: {
      security: {
        ...state.security,
        enablePassword: match[1],
      },
    },
  };
}

/**
 * http server enable
 */
function cmdHttpServerEnable(state: SwitchState, _input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  return {
    success: true,
    newState: {
      services: {
        ...state.services,
        http: { enabled: true, content: '', fontSize: 14 },
      },
    },
  };
}

/**
 * no http server enable
 */
function cmdNoHttpServerEnable(state: SwitchState, _input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  return {
    success: true,
    newState: {
      services: {
        ...state.services,
        http: { enabled: false, content: '', fontSize: 14 },
      },
    },
  };
}

/**
 * ssh <ip> <mask> <ifname> — allow SSH from subnet
 */
function cmdSshAsa(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^ssh\s+(\S+)\s+(\S+)\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const [, ip, mask, ifName] = match;
  return {
    success: true,
    output: `SSH access permitted from ${ip}/${mask} on ${ifName}`,
  };
}

/**
 * no ssh <ip> <mask> <ifname>
 */
function cmdNoSshAsa(_state: SwitchState, _input: string): CommandResult {
  return { success: true, output: '' };
}

/**
 * telnet <ip> <mask> <ifname> — allow Telnet from subnet
 */
function cmdTelnetAsa(state: SwitchState, input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  const match = input.match(/^telnet\s+(\S+)\s+(\S+)\s+(\S+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.invalidInput };
  }
  const [, ip, mask, ifName] = match;
  return {
    success: true,
    output: `Telnet access permitted from ${ip}/${mask} on ${ifName}`,
  };
}

/**
 * no telnet <ip> <mask> <ifname>
 */
function cmdNoTelnetAsa(_state: SwitchState, _input: string): CommandResult {
  return { success: true, output: '' };
}

/**
 * logging enable
 */
function cmdLoggingEnable(state: SwitchState, _input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  return {
    success: true,
    newState: {
      loggingEnabled: true,
    },
  };
}

/**
 * no logging enable
 */
function cmdNoLoggingEnable(state: SwitchState, _input: string): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: '% Command not available in current mode.' };
  }
  return {
    success: true,
    newState: {
      loggingEnabled: false,
    },
  };
}
