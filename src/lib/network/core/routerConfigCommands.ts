import { iosModeError } from './iosErrors';

import type { CommandHandler } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

// Router config commands (router ospf, router rip, etc.)

export const routerConfigHandlers: Record<string, CommandHandler> = {
    'network': cmdRouterNetwork,
    'neighbor remote-as': cmdNeighborRemoteAs,
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
};

// Router subcommands in OSPF/RIP config mode

/**
 * network - Add network to routing process
 * Note: This command is only available in router-config mode via routerConfigHandlers
 */
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
            return {
                success: true,
                output: `${bgpMatch[1]} with mask ${bgpMatch[2]} added to BGP`,
                newState: {
                    dynamicRoutes: [
                        ...(state.dynamicRoutes || []),
                        { destination: bgpMatch[1], subnetMask: bgpMatch[2], nextHop: 'directly connected', metric: 1, type: 'dynamic' }
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
    const dynamicRoutes = (state.dynamicRoutes || []).filter((r: { destination: string }) => r.destination !== network);

    return {
        success: true,
        newState: { dynamicRoutes }
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
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid neighbor command' };

    const [_, neighborIp, remoteAs] = match;
    const bgpNeighbors = state.bgpNeighbors || [];
    const newNeighbors = [...bgpNeighbors.filter((n: { ip: string }) => n.ip !== neighborIp), { ip: neighborIp, as: remoteAs }];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} in AS ${remoteAs} configured`,
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

