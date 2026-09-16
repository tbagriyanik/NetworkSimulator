import { CLI_ERRORS, cliModeError } from './cliErrors';
import type { CommandResult, Route, SwitchState } from '../types';
import type { CommandContext } from './commandTypes';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { canAssignIPToPhysicalPort, isLayer3Switch } from '../switchModels';
import { getDeviceCapabilities } from '../capabilities';
import { validateIpRoutingSupport } from './L3Validation';

/**
 * IP Routing - Enable IP routing
 */
export function cmdIpRouting(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const validation = validateIpRoutingSupport(state.switchModel, state);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const currentDevice = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support IP routing.\nIP routing is only supported on routers and Layer 3 switches.`
    };
  }

  let output = 'IP routing enabled\n';
  const newState: Partial<SwitchState> = { ipRouting: true };

  if (state.sdmPreferConfigured) {
    output += 'SDM preference configuration is active. Routing table has been allocated.\n';
  }

  return {
    success: true,
    output,
    newState
  };
}

export function cmdNoIpRouting(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    output: 'IP routing disabled\n',
    newState: { ipRouting: false }
  };
}

/**
 * IP Route - Add static route
 */
export function cmdIpRoute(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const currentDevice = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support static routing.\nStatic routing is only supported on routers and Layer 3 switches.`
    };
  }

  const match = input.match(/^ip\s+route\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+|\S+)(?:\s+(\d+))?(?:\s+track\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid ip route command. Use: ip route <network> <mask> <next-hop|interface> [administrative-distance] [track <track-id>]' };
  }

  const [, network, mask, nextHop, adminDistance, trackId] = match;
  const metric = adminDistance ? parseInt(adminDistance, 10) : 1;

  const newStaticRoutes = [...(state.staticRoutes || [])];
  const filteredRoutes = newStaticRoutes.filter(
    (route: Route) => !(route.destination === network && route.subnetMask === mask)
  );
  filteredRoutes.push({
    destination: network,
    subnetMask: mask,
    nextHop,
    metric,
    type: 'static',
    ...(trackId ? { trackId: parseInt(trackId, 10) } : {})
  });

  return {
    success: true,
    newState: {
      staticRoutes: filteredRoutes,
      ipRouting: true
    }
  };
}

/**
 * No IP Route - Remove static route
 */
export function cmdNoIpRoute(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const currentDevice = ctx.devices?.find((d: CanvasDevice) => d.id === ctx.sourceDeviceId);
  const capabilities = getDeviceCapabilities(currentDevice || null, state.switchModel);
  if (!capabilities.routing) {
    const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support static routing.\nStatic routing is only supported on routers and Layer 3 switches.`
    };
  }

  const match = input.match(/^no\s+ip\s+route\s+([0-9.]+)\s+([0-9.]+)(?:\s+([0-9.]+|\S+))?(?:\s+track\s+\d+)?$/i);
  if (!match) {
    return { success: false, error: '% Invalid no ip route command' };
  }

  const [, network, mask, nextHop] = match;

  let newStaticRoutes;
  if (nextHop) {
    newStaticRoutes = (state.staticRoutes || []).filter(
      (route: Route) => !(route.destination === network && route.subnetMask === mask && route.nextHop === nextHop)
    );
  } else {
    newStaticRoutes = (state.staticRoutes || []).filter(
      (route: Route) => !(route.destination === network && route.subnetMask === mask)
    );
  }

  return {
    success: true,
    newState: { staticRoutes: newStaticRoutes }
  };
}

/**
 * Router RIP - Enable RIP routing
 */
export function cmdRouterRip(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const deviceType: string | undefined = state.deviceType;
  if (deviceType !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    const deviceLabel = (deviceType as string | undefined) === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.\nRouting protocols are only supported on Layer 3 switches.`
    };
  }

  const lang = ctx.language || 'en';
  return {
    success: true,
    output: lang === 'tr' ?
      'RIP Routing Protocol etkinleştirildi' :
      'RIP Routing Protocol enabled',
    newState: {
      routingProtocol: 'rip',
      ipRouting: true,
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'rip' ? [] : state.dynamicRoutes
    }
  };
}

/**
 * Router OSPF - Enable OSPF routing
 */
export function cmdRouterOspf(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const deviceType2: string | undefined = state.deviceType;
  if (deviceType2 !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    const deviceLabel = (deviceType2 as string | undefined) === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.\nRouting protocols are only supported on Layer 3 switches.`
    };
  }

  const match = input.match(/^router\s+ospf\s*(\d*)$/i);
  const processId = match?.[1] || '1';

  return {
    success: true,
    output: `OSPF Routing Process enabled with Process ID ${processId}`,
    newState: {
      routingProtocol: 'ospf',
      ipRouting: true,
      ospfProcessId: processId,
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'ospf' ? [] : state.dynamicRoutes
    }
  };
}

export function cmdNoRouterRip(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const lang = ctx.language || 'en';
  return {
    success: true,
    output: lang === 'tr' ?
      'RIP Routing Protocol devre dışı bırakıldı' :
      'RIP Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: []
    }
  };
}

export function cmdNoRouterOspf(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const lang = ctx.language || 'en';
  return {
    success: true,
    output: lang === 'tr' ?
      'OSPF Routing Protocol devre dışı bırakıldı' :
      'OSPF Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: []
    }
  };
}

export function cmdRouterEigrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
  if (state.deviceType !== 'router' && !canAssignIPToPhysicalPort(state.switchModel)) {
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.`
    };
  }

  const match = input.match(/^router\s+eigrp\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.incomplete };
  }

  const asNumber = match[1];
  return {
    success: true,
    output: `EIGRP Routing Process enabled with AS ${asNumber}`,
    newState: {
      routingProtocol: 'eigrp',
      ipRouting: true,
      eigrpAs: asNumber,
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'eigrp' ? [] : state.dynamicRoutes
    }
  };
}

export function cmdNoRouterEigrp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+router\s+eigrp\s+(\d+)$/i);
  if (!match) return { success: false, error: CLI_ERRORS.incomplete };

  return {
    success: true,
    output: 'EIGRP Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: [],
      eigrpAs: undefined,
      eigrpStub: null
    }
  };
}

export function cmdRouterBgp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const deviceLabel = state.deviceType === 'router' ? 'router' : (isLayer3Switch(state.switchModel) ? 'Layer 3 switch' : 'Layer 2 switch');
  if (!canAssignIPToPhysicalPort(state.switchModel)) {
    return {
      success: false,
      error: `% Invalid command. ${deviceLabel} (${state.switchModel}) does not support routing protocols.`
    };
  }

  const match = input.match(/^router\s+bgp\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: CLI_ERRORS.incomplete };
  }

  const asNumber = match[1];
  return {
    success: true,
    output: `BGP Routing Process enabled with AS ${asNumber}`,
    newState: {
      routingProtocol: 'bgp',
      ipRouting: true,
      bgpAs: asNumber,
      currentMode: 'router-config',
      dynamicRoutes: state.routingProtocol !== 'bgp' ? [] : state.dynamicRoutes
    }
  };
}

export function cmdNoRouterBgp(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^no\s+router\s+bgp\s+(\d+)$/i);
  if (!match) return { success: false, error: CLI_ERRORS.incomplete };

  return {
    success: true,
    output: 'BGP Routing Protocol disabled',
    newState: {
      routingProtocol: 'none',
      dynamicRoutes: [],
      bgpAs: undefined
    }
  };
}

export function cmdIpDefaultGateway(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^ip\s+default-gateway\s+([0-9.]+)$/i);
  if (!match) {
    return { success: false, error: "% Invalid input detected at '^' marker." };
  }

  return {
    success: true,
    newState: { defaultGateway: match[1] }
  };
}

export function cmdNoIpDefaultGateway(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: { defaultGateway: undefined }
  };
}


