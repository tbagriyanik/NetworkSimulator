import { cliModeError } from './cliErrors';

import type { CommandHandler } from './commandTypes';
import type { SwitchState, CommandResult, BgpNeighbor } from '../types';

// Router config commands (router ospf, router rip, etc.)

export const routerConfigHandlers: Record<string, CommandHandler> = {
    'network': cmdRouterNetwork,
    'version': cmdRoutingVersion,
    'neighbor remote-as': cmdNeighborRemoteAs,
    'neighbor route-map': cmdNeighborRouteMap,
    'neighbor weight': cmdNeighborWeight,
    'neighbor next-hop-self': cmdNeighborNextHopSelf,
    'neighbor ebgp-multihop': cmdNeighborEbgpMultihop,
    'neighbor update-source': cmdNeighborUpdateSource,
    'neighbor timers': cmdNeighborTimers,
    'neighbor password': cmdNeighborPassword,
    'neighbor description': cmdNeighborDescription,
    'neighbor shutdown': cmdNeighborShutdown,
    'neighbor default-originate': cmdNeighborDefaultOriginate,
    'neighbor remove-private-as': cmdNeighborRemovePrivateAs,
    'neighbor maximum-prefix': cmdNeighborMaximumPrefix,
    'neighbor allowas-in': cmdNeighborAllowAsIn,
    'neighbor send-community': cmdNeighborSendCommunity,
    'neighbor route-reflector-client': cmdNeighborRouteReflectorClient,
    'neighbor as-override': cmdNeighborAsOverride,
    'neighbor soft-reconfiguration': cmdNeighborSoftReconfig,
    'no neighbor next-hop-self': cmdNoNeighborNextHopSelf,
    'no neighbor ebgp-multihop': cmdNoNeighborEbgpMultihop,
    'no neighbor update-source': cmdNoNeighborUpdateSource,
    'no neighbor timers': cmdNoNeighborTimers,
    'no neighbor password': cmdNoNeighborPassword,
    'no neighbor description': cmdNoNeighborDescription,
    'no neighbor shutdown': cmdNoNeighborShutdown,
    'no neighbor default-originate': cmdNoNeighborDefaultOriginate,
    'no neighbor remove-private-as': cmdNoNeighborRemovePrivateAs,
    'no neighbor maximum-prefix': cmdNoNeighborMaximumPrefix,
    'no neighbor allowas-in': cmdNoNeighborAllowAsIn,
    'no neighbor send-community': cmdNoNeighborSendCommunity,
    'no neighbor route-reflector-client': cmdNoNeighborRouteReflectorClient,
    'no neighbor as-override': cmdNoNeighborAsOverride,
    'no neighbor soft-reconfiguration': cmdNoNeighborSoftReconfig,
    'aggregate-address': cmdAggregateAddress,
    'no aggregate-address': cmdNoAggregateAddress,
    'maximum-paths': cmdMaximumPaths,
    'no maximum-paths': cmdNoMaximumPaths,
    'bgp graceful-restart': cmdBgpGracefulRestart,
    'no bgp graceful-restart': cmdNoBgpGracefulRestart,
    'bgp cluster-id': cmdBgpClusterId,
    'no bgp cluster-id': cmdNoBgpClusterId,
    'synchronization': cmdBgpSynchronization,
    'no synchronization': cmdNoBgpSynchronization,
    'timers bgp': cmdBgpTimers,
    'no timers bgp': cmdNoBgpTimers,

    'no auto-summary': cmdNoAutoSummary,
    'router-id': cmdRouterId,
    'passive-interface': cmdPassiveInterface,
    'default-information originate': cmdDefaultInformation,
    'default-information always': cmdDefaultInformation,
    'no network': cmdNoRouterNetwork,
    'no neighbor remote-as': cmdNoNeighborRemoteAs,
    'no neighbor': cmdNoNeighborRemoteAs,
    'no passive-interface': cmdNoPassiveInterface,
    'no router-id': cmdNoRouterId,
    'eigrp router-id': cmdEigrpRouterId,
    'no eigrp router-id': cmdNoEigrpRouterId,
    'bgp router-id': cmdBgpRouterId,
    'auto-summary': cmdAutoSummary,
    'area range': cmdAreaRange,
    'area stub': cmdAreaStub,
    'area nssa': cmdAreaNssa,
    'area stub no-summary': cmdAreaStubNoSummary,
    'area nssa no-summary': cmdAreaNssaNoSummary,
    'no area stub': cmdNoAreaStub,
    'no area nssa': cmdNoAreaNssa,
    'redistribute': cmdRedistribute,
    'no redistribute': cmdNoRedistribute,
};

function cmdRoutingVersion(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^version\s+([12])$/i);
    if (!match) return { success: false, error: '% Invalid routing protocol version.' };
    if (state.routingProtocol !== 'rip') {
        return { success: false, error: cliModeError() };
    }

    return {
        success: true,
        output: `RIP version ${match[1]} configured`,
        newState: { ripVersion: Number(match[1]) as 1 | 2 }
    };
}

// Router subcommands in OSPF/RIP config mode

/**
 * network - Add network to routing process
 * Note: This command is only available in router-config mode via routerConfigHandlers
 */
function isValidOctets(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function cmdRouterNetwork(state: SwitchState, input: string): CommandResult {
    // IPv6 routing protocols (RIPng/OSPFv3) do not use network statements
    if (state.routingProtocol === 'ripng' || state.routingProtocol === 'ospfv3') {
        return {
            success: false,
            error: '% Invalid command. IPv6 routing protocols (RIPng/OSPFv3) do not use network statements.\nEnable routing on interfaces: interface <id> -> ipv6 rip <name> enable / ipv6 ospf <id> area <area>'
        };
    }

    // Check if EIGRP network (network + wildcard)
    if (state.routingProtocol === 'eigrp') {
        const eigrpMatch = input.match(/^network\s+([0-9.]+)\s+([0-9.]+)$/i);
        if (eigrpMatch) {
            if (!isValidOctets(eigrpMatch[1]) || !isValidOctets(eigrpMatch[2])) {
                return { success: false, error: '% Invalid IP address or wildcard mask.' };
            }
            return {
                success: true,
                output: `${eigrpMatch[1]} with wildcard ${eigrpMatch[2]} added to EIGRP`,
                newState: {
                    dynamicRoutes: [
                        ...(state.dynamicRoutes || []),
                        { destination: eigrpMatch[1], subnetMask: eigrpMatch[2], nextHop: 'directly connected', metric: 1, type: 'dynamic' }
                    ]
                }
            };
        }
    }

    // Check if BGP network (network + mask)
    if (state.routingProtocol === 'bgp') {
        const bgpMatch = input.match(/^network\s+([0-9.]+)\s+mask\s+([0-9.]+)$/i);
        if (bgpMatch) {
            if (!isValidOctets(bgpMatch[1]) || !isValidOctets(bgpMatch[2])) {
                return { success: false, error: '% Invalid IP address or subnet mask.' };
            }
            return {
                success: true,
                output: `${bgpMatch[1]} with mask ${bgpMatch[2]} added to BGP`,
                newState: {
                    dynamicRoutes: [
                        ...(state.dynamicRoutes || []),
                        { destination: bgpMatch[1], subnetMask: bgpMatch[2], nextHop: 'directly connected', metric: 1, type: 'dynamic' }
                    ],
                    bgpNetworks: [
                        ...(state.bgpNetworks || []),
                        { network: bgpMatch[1], mask: bgpMatch[2] }
                    ]
                }
            };
        }
    }

    const match = input.match(/^network\s+([0-9.]+)\s+([0-9.]+)\s+area\s+(\d+)$/i);
    if (!match) {
        // Try without area (RIP or simple network)
        const ripMatch = input.match(/^network\s+([0-9.]+)$/i);
        if (!ripMatch) {
            return { success: false, error: '% Invalid network command.' };
        }
        if (!isValidOctets(ripMatch[1])) {
            return { success: false, error: '% Invalid IP address.' };
        }

        // RIP network
        return {
            success: true,
            output: `${ripMatch[1]} added to routing`,
            newState: {
                dynamicRoutes: [
                    ...(state.dynamicRoutes || []),
                    { destination: ripMatch[1], subnetMask: '255.255.255.0', nextHop: 'directly connected', metric: 1, type: 'dynamic' }
                ]
            }
        };
    }

    // OSPF network
    const [_, network, wildcard, area] = match;
    if (!isValidOctets(network) || !isValidOctets(wildcard)) {
        return { success: false, error: '% Invalid IP address or wildcard mask.' };
    }

    return {
        success: true,
        output: `${network}/${wildcard} added to OSPF area ${area}`,
        newState: {
            dynamicRoutes: [
                ...(state.dynamicRoutes || []),
                { destination: network, subnetMask: wildcard, nextHop: 'directly connected', metric: 1, type: 'dynamic', area: parseInt(area) }
            ]
        }
    };
}

/**
 * no network - Remove network from routing process
 */
function cmdNoRouterNetwork(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol === 'ripng' || state.routingProtocol === 'ospfv3') {
        return {
            success: false,
            error: '% Invalid command. IPv6 routing protocols (RIPng/OSPFv3) do not use network statements.'
        };
    }
    const match = input.match(/^no\s+network\s+([0-9.]+)(?:\s+[0-9.]+)?(?:\s+area\s+\d+)?$/i);
    if (!match) return { success: false, error: '% Invalid no network command' };

    const network = match[1];
    if (!isValidOctets(network)) {
        return { success: false, error: '% Invalid IP address.' };
    }

    const dynamicRoutes = (state.dynamicRoutes || []).filter((r: { destination: string }) => r.destination !== network);
    const bgpNetworks = (state.bgpNetworks || []).filter((n: { network: string }) => n.network !== network);

    return {
        success: true,
        newState: { dynamicRoutes, bgpNetworks: bgpNetworks.length > 0 ? bgpNetworks : undefined }
    };
}

/**
 * no neighbor <ip> remote-as <as>
 */
function cmdNoNeighborRemoteAs(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)(?:\s+remote-as\s+\d+)?$/i);
    if (!match) return { success: false, error: '% Invalid no neighbor command' };

    const neighborIp = match[1];
    const bgpNeighbors = (state.bgpNeighbors || []).filter((n: { ip: string }) => n.ip !== neighborIp);

    return {
        success: true,
        newState: { bgpNeighbors }
    };
}

/**
 * no passive-interface <name>
 */
function cmdNoPassiveInterface(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+passive-interface\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid no passive-interface command' };

    const iface = match[1];
    const passiveInterfaces = (state.passiveInterfaces || []).filter((p: string) => p !== iface);

    return {
        success: true,
        newState: { passiveInterfaces }
    };
}

/**
 * no router-id
 */
function cmdNoRouterId(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        newState: { routerId: undefined }
    };
}

/**
 * router-id - Set router ID
 */
function cmdRouterId(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^router-id\s+([0-9.]+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid router-id command' };
    }

    return {
        success: true,
        output: `Router ID set to ${match[1]}`,
        newState: { routerId: match[1] }
    };
}

/**
 * passive-interface - Disable sending updates on interface
 */
function cmdPassiveInterface(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^passive-interface\s+(\S+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid passive-interface command' };
    }

    return {
        success: true,
        output: `Interface ${match[1]} set as passive`,
        newState: {
            passiveInterfaces: [...(state.passiveInterfaces || []), match[1]]
        }
    };
}

/**
 * neighbor remote-as - Configure BGP neighbor
 */
function cmdNeighborRemoteAs(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'bgp') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid neighbor command' };

    const [_, neighborIp, remoteAs] = match;
    const bgpNeighbors = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find((n: { ip: string }) => n.ip === neighborIp) || { ip: neighborIp, as: remoteAs };
    const updated = { ...existing, ip: neighborIp, as: remoteAs };
    const newNeighbors = [...bgpNeighbors.filter((n: { ip: string }) => n.ip !== neighborIp), updated];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} in AS ${remoteAs} configured`,
        newState: { bgpNeighbors: newNeighbors }
    };
}

function cmdNeighborRouteMap(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'bgp') return { success: false, error: cliModeError() };
    const match = input.match(/^neighbor\s+([0-9.]+)\s+route-map\s+(\S+)\s+(in|out)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> route-map <map> in|out' };

    const [_, neighborIp, mapName, dir] = match;
    const bgpNeighbors = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find((n: import('../types').BgpNeighbor) => n.ip === neighborIp) || { ip: neighborIp, as: '65000' };
    const updated = {
        ...existing,
        [dir.toLowerCase() === 'in' ? 'routeMapIn' : 'routeMapOut']: mapName
    };
    const newNeighbors = [...bgpNeighbors.filter((n: import('../types').BgpNeighbor) => n.ip !== neighborIp), updated];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} route-map ${mapName} ${dir} configured`,
        newState: { bgpNeighbors: newNeighbors }
    };
}

function cmdNeighborWeight(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'bgp') return { success: false, error: cliModeError() };
    const match = input.match(/^neighbor\s+([0-9.]+)\s+weight\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> weight <value>' };

    const [_, neighborIp, weightStr] = match;
    const weight = parseInt(weightStr, 10);
    const bgpNeighbors = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find((n: import('../types').BgpNeighbor) => n.ip === neighborIp) || { ip: neighborIp, as: '65000' };
    const updated = { ...existing, weight };
    const newNeighbors = [...bgpNeighbors.filter((n: import('../types').BgpNeighbor) => n.ip !== neighborIp), updated];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} weight set to ${weight}`,
        newState: { bgpNeighbors: newNeighbors }
    };
}


/**
 * no auto-summary
 */
function cmdNoAutoSummary(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        newState: { autoSummary: false }
    };
}

/**
 * default-information - Control distribution of default route
 */
function cmdDefaultInformation(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^default-information\s+(originate|always)$/i);
    if (!match) {
        return { success: false, error: '% Invalid default-information command' };
    }

    return {
        success: true,
        output: `Default information ${match[1]} configured`,
        newState: {
            defaultInformation: match[1]
        }
    };
}

/**
 * eigrp router-id
 */
function cmdEigrpRouterId(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^eigrp\s+router-id\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const routerId = match[1];
    return {
        success: true,
        output: `EIGRP router-id set to ${routerId}`,
        newState: { routerId: routerId, routingProtocol: 'eigrp' }
    };
}

/**
 * no eigrp router-id
 */
function cmdNoEigrpRouterId(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        output: 'EIGRP router-id removed',
        newState: { routerId: undefined }
    };
}

/**
 * bgp router-id
 */
function cmdBgpRouterId(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^bgp\s+router-id\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const routerId = match[1];
    return {
        success: true,
        output: `BGP router-id set to ${routerId}`,
        newState: { routerId: routerId, routingProtocol: 'bgp' }
    };
}

/**
 * auto-summary
 */
function cmdAutoSummary(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        output: 'Auto-summary enabled',
        newState: { autoSummary: true }
    };
}

/**
 * area range
 */
function cmdAreaRange(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+range\s+([0-9.]+)\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    return {
        success: true,
        output: `Area ${match[1]} range ${match[2]} ${match[3]} configured`,
        newState: { areaRange: { area: match[1], network: match[2], mask: match[3] } } as unknown as Partial<SwitchState>
    };
}

/**
 * area stub
 */
function cmdAreaStub(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+stub$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const stubAreas: string[] = (state as SwitchState & { ospfStubAreas?: string[] }).ospfStubAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as stub`,
        newState: { ospfStubAreas: [...stubAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

/**
 * area nssa
 */
function cmdAreaNssa(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+nssa$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const nssaAreas: string[] = (state as SwitchState & { ospfNssaAreas?: string[] }).ospfNssaAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as NSSA`,
        newState: { ospfNssaAreas: [...nssaAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

/**
 * area stub no-summary (Totally Stubby)
 */
function cmdAreaStubNoSummary(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+stub\s+no-summary$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const totallyStubAreas: string[] = (state as SwitchState & { ospfTotallyStubAreas?: string[] }).ospfTotallyStubAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as totally stubby`,
        newState: { ospfTotallyStubAreas: [...totallyStubAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

/**
 * area nssa no-summary (Totally NSSA)
 */
function cmdAreaNssaNoSummary(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+nssa\s+no-summary$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const totallyNssaAreas: string[] = (state as SwitchState & { ospfTotallyNssaAreas?: string[] }).ospfTotallyNssaAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as totally NSSA`,
        newState: { ospfTotallyNssaAreas: [...totallyNssaAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

/**
 * no area stub
 */
function cmdNoAreaStub(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+area\s+(\d+)\s+stub$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const stubAreas: string[] = (state as SwitchState & { ospfStubAreas?: string[] }).ospfStubAreas || [];
    const totallyStubAreas: string[] = (state as SwitchState & { ospfTotallyStubAreas?: string[] }).ospfTotallyStubAreas || [];
    const areaStr = match[1];
    return {
        success: true,
        output: `Area ${areaStr} removed from stub configuration`,
        newState: {
            ospfStubAreas: stubAreas.filter(a => a !== areaStr),
            ospfTotallyStubAreas: totallyStubAreas.filter(a => a !== areaStr)
        } as unknown as Partial<SwitchState>
    };
}

/**
 * no area nssa
 */
function cmdNoAreaNssa(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+area\s+(\d+)\s+nssa$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const nssaAreas: string[] = (state as SwitchState & { ospfNssaAreas?: string[] }).ospfNssaAreas || [];
    const totallyNssaAreas: string[] = (state as SwitchState & { ospfTotallyNssaAreas?: string[] }).ospfTotallyNssaAreas || [];
    const areaStr = match[1];
    return {
        success: true,
        output: `Area ${areaStr} removed from NSSA configuration`,
        newState: {
            ospfNssaAreas: nssaAreas.filter(a => a !== areaStr),
            ospfTotallyNssaAreas: totallyNssaAreas.filter(a => a !== areaStr)
        } as unknown as Partial<SwitchState>
    };
}

/**
 * redistribute - Redistribute routes from another protocol
 */
function cmdRedistribute(state: SwitchState, input: string): CommandResult {
    if (state.currentMode !== 'router-config') return { success: false, error: cliModeError() };
    if (!state.routingProtocol || state.routingProtocol === 'none') {
        return { success: false, error: '% No routing protocol active' };
    }

    const match = input.match(/^redistribute\s+(ospf|rip|eigrp|bgp|static|connected)(?:\s+(\d+))?(?:\s+metric\s+(\d+))?(\s+subnets)?/i);
    if (!match) {
        return { success: false, error: '% Invalid redistribute command syntax. Usage: redistribute <protocol> [pid] [metric <val>] [subnets]' };
    }

    const sourceProtocol = match[1].toLowerCase() as 'ospf' | 'rip' | 'eigrp' | 'bgp' | 'static' | 'connected';
    const processId = match[2];
    const metric = match[3] ? parseInt(match[3], 10) : undefined;
    const subnets = !!match[4];

    const targetProtocol = state.routingProtocol;

    const existingRules = state.redistributeRules || [];
    const filteredRules = existingRules.filter(r => !(r.targetProtocol === targetProtocol && r.sourceProtocol === sourceProtocol));
    const newRule = {
        targetProtocol,
        sourceProtocol,
        processId,
        metric,
        subnets
    };

    return {
        success: true,
        output: `Redistributing ${sourceProtocol}${processId ? ' ' + processId : ''} into ${targetProtocol}`,
        newState: {
            redistributeRules: [...filteredRules, newRule]
        }
    };
}

/**
 * no redistribute
 */
function cmdNoRedistribute(state: SwitchState, input: string): CommandResult {
    if (state.currentMode !== 'router-config') return { success: false, error: cliModeError() };
    const match = input.match(/^no\s+redistribute\s+(ospf|rip|eigrp|bgp|static|connected)/i);
    if (!match) return { success: false, error: '% Invalid no redistribute command syntax' };

    const sourceProtocol = match[1].toLowerCase();
    const targetProtocol = state.routingProtocol;
    const existingRules = state.redistributeRules || [];
    const updatedRules = existingRules.filter(r => !(r.targetProtocol === targetProtocol && r.sourceProtocol === sourceProtocol));

    return {
        success: true,
        output: `Removed redistribution of ${sourceProtocol} from ${targetProtocol}`,
        newState: {
            redistributeRules: updatedRules
        }
    };
}

// ============================================================================
// ADVANCED BGP COMMANDS
// ============================================================================

/** Guard: command only valid inside BGP router-config mode. */
function requireBgp(state: SwitchState): CommandResult | null {
    if (state.routingProtocol !== 'bgp') {
        return { success: false, error: cliModeError() };
    }
    return null;
}

/** Merge a patch into an existing BGP neighbor (creating it when absent). */
function patchBgpNeighbor(
    state: SwitchState,
    neighborIp: string,
    patch: Partial<BgpNeighbor>
): { neighbors: BgpNeighbor[]; neighbor: BgpNeighbor } {
    const bgpNeighbors: BgpNeighbor[] = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find(n => n.ip === neighborIp);
    const neighbor: BgpNeighbor = {
        ip: neighborIp,
        as: existing?.as || '65000',
        ...existing,
        ...patch

    };
    const neighbors = [...bgpNeighbors.filter(n => n.ip !== neighborIp), neighbor];
    return { neighbors, neighbor };
}

function cmdNeighborNextHopSelf(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+next-hop-self$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> next-hop-self' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { nextHopSelf: true });
    return { success: true, output: `BGP neighbor ${match[1]} next-hop-self enabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborNextHopSelf(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+next-hop-self$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { nextHopSelf: false });
    return { success: true, output: `BGP neighbor ${match[1]} next-hop-self disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborEbgpMultihop(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+ebgp-multihop(?:\s+(\d+))?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> ebgp-multihop [<hops>]' };
    const hops = match[2] ? parseInt(match[2], 10) : 2;
    const { neighbors } = patchBgpNeighbor(state, match[1], { ebgpMultihop: hops });
    return { success: true, output: `BGP neighbor ${match[1]} ebgp-multihop set to ${hops}`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborEbgpMultihop(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+ebgp-multihop$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { ebgpMultihop: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} ebgp-multihop removed`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborUpdateSource(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+update-source\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> update-source <interface>' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { updateSource: match[2] });
    return { success: true, output: `BGP neighbor ${match[1]} update-source ${match[2]} configured`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborUpdateSource(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+update-source$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { updateSource: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} update-source removed`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+timers\s+(\d+)\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> timers <keepalive> <holdtime>' };
    const keepalive = parseInt(match[2], 10);
    const holdtime = parseInt(match[3], 10);
    const { neighbors } = patchBgpNeighbor(state, match[1], { timersKeepalive: keepalive, timersHoldtime: holdtime });
    return { success: true, output: `BGP neighbor ${match[1]} timers updated (keepalive ${keepalive}s, holdtime ${holdtime}s)`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+timers$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { timersKeepalive: undefined, timersHoldtime: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} timers reset to defaults`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborPassword(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+password\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> password <password>' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { password: match[2] });
    return { success: true, output: `BGP neighbor ${match[1]} MD5 password configured`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborPassword(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+password$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { password: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} MD5 password removed`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborDescription(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+description\s+(.+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> description <text>' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { description: match[2].trim() });
    return { success: true, output: `BGP neighbor ${match[1]} description set`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborDescription(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+description$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { description: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} description removed`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborShutdown(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+shutdown$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> shutdown' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { shutdown: true });
    return { success: true, output: `BGP neighbor ${match[1]} administratively shut down`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborShutdown(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+shutdown$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { shutdown: false });
    return { success: true, output: `BGP neighbor ${match[1]} re-activated`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborDefaultOriginate(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+default-originate$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> default-originate' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { defaultOriginate: true });
    return { success: true, output: `BGP neighbor ${match[1]} default-originate enabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborDefaultOriginate(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+default-originate$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { defaultOriginate: false });
    return { success: true, output: `BGP neighbor ${match[1]} default-originate disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborRemovePrivateAs(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+remove-private-as$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> remove-private-as' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { removePrivateAs: true });
    return { success: true, output: `BGP neighbor ${match[1]} remove-private-as enabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborRemovePrivateAs(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+remove-private-as$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { removePrivateAs: false });
    return { success: true, output: `BGP neighbor ${match[1]} remove-private-as disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborMaximumPrefix(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+maximum-prefix\s+(\d+)(?:\s+(\d+))?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> maximum-prefix <limit> [<threshold>]' };
    const limit = parseInt(match[2], 10);
    const { neighbors } = patchBgpNeighbor(state, match[1], { maximumPrefix: limit });
    const threshold = match[3] ? ` (threshold ${match[3]}%)` : '';
    return { success: true, output: `BGP neighbor ${match[1]} maximum-prefix set to ${limit}${threshold}`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborMaximumPrefix(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+maximum-prefix$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { maximumPrefix: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} maximum-prefix removed`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborAllowAsIn(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+allowas-in(?:\s+(\d+))?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> allowas-in [<number>]' };
    const count = match[2] ? parseInt(match[2], 10) : 1;
    const { neighbors } = patchBgpNeighbor(state, match[1], { allowAsIn: count });
    return { success: true, output: `BGP neighbor ${match[1]} allowas-in enabled (${count})`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborAllowAsIn(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+allowas-in$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { allowAsIn: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} allowas-in disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborSendCommunity(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+send-community(?:\s+\w+)?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> send-community [both|standard|extended]' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { sendCommunity: true });
    return { success: true, output: `BGP neighbor ${match[1]} send-community enabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborSendCommunity(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+send-community$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { sendCommunity: false });
    return { success: true, output: `BGP neighbor ${match[1]} send-community disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborRouteReflectorClient(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+route-reflector-client$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> route-reflector-client' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { routeReflectorClient: true });
    return { success: true, output: `BGP neighbor ${match[1]} configured as route-reflector client`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborRouteReflectorClient(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+route-reflector-client$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { routeReflectorClient: false });
    return { success: true, output: `BGP neighbor ${match[1]} route-reflector client removed`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborAsOverride(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+as-override$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> as-override' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { asOverride: true });
    return { success: true, output: `BGP neighbor ${match[1]} as-override enabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborAsOverride(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+as-override$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { asOverride: false });
    return { success: true, output: `BGP neighbor ${match[1]} as-override disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNeighborSoftReconfig(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+soft-reconfiguration\s+inbound$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> soft-reconfiguration inbound' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { softReconfiguration: true });
    return { success: true, output: `BGP neighbor ${match[1]} soft-reconfiguration inbound enabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdNoNeighborSoftReconfig(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+soft-reconfiguration$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { softReconfiguration: false });
    return { success: true, output: `BGP neighbor ${match[1]} soft-reconfiguration disabled`, newState: { bgpNeighbors: neighbors } };
}

function cmdAggregateAddress(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^aggregate-address\s+([0-9.]+)\s+([0-9.]+)(?:\s+summary-only)?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: aggregate-address <network> <mask> [summary-only]' };
    const aggregates = state.bgpAggregateAddresses || [];
    if (aggregates.some(a => a.network === match[1] && a.mask === match[2])) {
        return { success: true, output: `Aggregate ${match[1]} ${match[2]} already configured`, newState: {} };
    }
    return {
        success: true,
        output: `Aggregate ${match[1]} ${match[2]} added`,
        newState: {
            bgpAggregateAddresses: [...aggregates, { network: match[1], mask: match[2], summaryOnly: !!match[3] }]
        }
    };
}

function cmdNoAggregateAddress(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+aggregate-address\s+([0-9.]+)\s+([0-9.]+)/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: no aggregate-address <network> <mask>' };
    const aggregates = (state.bgpAggregateAddresses || []).filter(a => !(a.network === match[1] && a.mask === match[2]));
    return { success: true, output: `Aggregate ${match[1]} ${match[2]} removed`, newState: { bgpAggregateAddresses: aggregates } };
}

function cmdMaximumPaths(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^maximum-paths\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: maximum-paths <number>' };
    const paths = parseInt(match[1], 10);
    return { success: true, output: `BGP maximum-paths set to ${paths}`, newState: { bgpMaximumPaths: paths } };
}

function cmdNoMaximumPaths(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+maximum-paths/i);
    if (!match) return { success: false, error: '% Invalid command' };
    return { success: true, output: 'BGP maximum-paths reset to default (1)', newState: { bgpMaximumPaths: 1 } };
}

function cmdBgpGracefulRestart(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP graceful-restart enabled', newState: { bgpGracefulRestart: true } };
}

function cmdNoBgpGracefulRestart(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP graceful-restart disabled', newState: { bgpGracefulRestart: false } };
}

function cmdBgpClusterId(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^bgp\s+cluster-id\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: bgp cluster-id <id>' };
    return { success: true, output: `BGP cluster-id set to ${match[1]}`, newState: { bgpClusterId: match[1] } };
}

function cmdNoBgpClusterId(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP cluster-id removed', newState: { bgpClusterId: undefined } };
}

function cmdBgpSynchronization(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP synchronization enabled', newState: { bgpSynchronization: true } };
}

function cmdNoBgpSynchronization(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP synchronization disabled', newState: { bgpSynchronization: false } };
}

function cmdBgpTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^timers\s+bgp\s+(\d+)\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: timers bgp <keepalive> <holdtime>' };
    const keepalive = parseInt(match[1], 10);
    const holdtime = parseInt(match[2], 10);
    return {
        success: true,
        output: `BGP routing process timers updated (keepalive ${keepalive}s, holdtime ${holdtime}s)`,
        newState: { bgpTimers: { keepalive, holdtime } }
    };
}

function cmdNoBgpTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP timers reset to defaults (60/180)', newState: { bgpTimers: undefined } };
}


