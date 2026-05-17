'use client';
import { IOS_ERRORS, iosModeError } from './iosErrors';

import type { CommandHandler } from './commandTypes';

// Router config commands (router ospf, router rip, etc.)

export const routerConfigHandlers: Record<string, CommandHandler> = {
    'network': cmdRouterNetwork,
    'router-config network': cmdRouterNetwork,
    'neighbor remote-as': cmdNeighborRemoteAs,
    'no auto-summary': cmdNoAutoSummary,
    'router-id': cmdRouterId,
    'passive-interface': cmdPassiveInterface,
    'default-information originate': cmdDefaultInformation,
    'default-information always': cmdDefaultInformation,
};

// Router subcommands in OSPF/RIP config mode

/**
 * network - Add network to routing process
 * Note: This command is only available in router-config mode via routerConfigHandlers
 */
export function cmdRouterNetwork(state: any, input: string, ctx: any): any {
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
 * router-id - Set router ID
 */
function cmdRouterId(state: any, input: string, ctx: any): any {
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
function cmdPassiveInterface(state: any, input: string, ctx: any): any {
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
function cmdNeighborRemoteAs(state: any, input: string, ctx: any): any {
    if (state.routingProtocol !== 'bgp') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid neighbor command' };

    const [_, neighborIp, remoteAs] = match;
    const bgpNeighbors = state.bgpNeighbors || [];
    const newNeighbors = [...bgpNeighbors.filter((n: any) => n.ip !== neighborIp), { ip: neighborIp, as: remoteAs }];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} in AS ${remoteAs} configured`,
        newState: { bgpNeighbors: newNeighbors }
    };
}

/**
 * no auto-summary
 */
function cmdNoAutoSummary(state: any, input: string, ctx: any): any {
    return {
        success: true,
        newState: { autoSummary: false }
    };
}

/**
 * default-information - Control distribution of default route
 */
function cmdDefaultInformation(state: any, input: string, ctx: any): any {
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
