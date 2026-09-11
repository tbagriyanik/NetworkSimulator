import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, Route } from '../types';

export function cmdIpv6UnicastRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return { success: true, newState: { ipv6Enabled: true } };
}

export function cmdNoIpv6UnicastRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  return { success: true, newState: { ipv6Enabled: false } };
}

export function cmdIpv6Route(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ipv6\s+route\s+([0-9a-fA-F:]+\/\d+)\s+(\S+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid ipv6 route command' };
  }

  const [, prefix, nextHop, adminDistance] = match;
  const [destination, prefixLength] = prefix.split('/');
  const metric = adminDistance ? parseInt(adminDistance, 10) : 1;

  const newStaticRoutes = [...(state.ipv6StaticRoutes || [])];
  const filteredRoutes = newStaticRoutes.filter(
    (route: Route) => !(route.destination === destination && route.prefixLength === parseInt(prefixLength))
  );
  filteredRoutes.push({
    destination,
    prefixLength: parseInt(prefixLength),
    nextHop,
    metric,
    type: 'static'
  });

  return {
    success: true,
    newState: {
      ipv6StaticRoutes: filteredRoutes,
      ipv6Enabled: true
    }
  };
}

export function cmdNoIpv6Route(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+ipv6\s+route\s+([0-9a-fA-F:]+\/\d+)(?:\s+(\S+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid no ipv6 route command' };
  }

  const [, prefix, nextHop] = match;
  const [destination, prefixLength] = prefix.split('/');

  const newStaticRoutes = (state.ipv6StaticRoutes || []).filter(
    (route: Route) => {
      const matchDest = route.destination === destination && route.prefixLength === parseInt(prefixLength);
      if (nextHop) {
        return !(matchDest && route.nextHop === nextHop);
      }
      return !matchDest;
    }
  );

  return {
    success: true,
    newState: { ipv6StaticRoutes: newStaticRoutes }
  };
}

export function cmdIpv6RouterRip(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ipv6\s+router\s+rip\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  return {
    success: true,
    output: `RIPng process "${match[1]}" started`,
    newState: {
      routingProtocol: 'ripng',
      ipv6Enabled: true,
      currentMode: 'router-config'
    }
  };
}

export function cmdIpv6RouterOspf(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ipv6\s+router\s+ospf\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Invalid command' };

  return {
    success: true,
    output: `OSPFv3 process ${match[1]} started`,
    newState: {
      routingProtocol: 'ospfv3',
      ipv6Enabled: true,
      ospfv3ProcessId: match[1],
      currentMode: 'router-config'
    }
  };
}

export function cmdNoIpv6RouterRip(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: {
      routingProtocol: 'none',
      ipv6DynamicRoutes: []
    }
  };
}

export function cmdNoIpv6RouterOspf(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: {
      routingProtocol: 'none',
      ipv6DynamicRoutes: []
    }
  };
}