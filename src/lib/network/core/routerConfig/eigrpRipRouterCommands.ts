import { cliModeError } from '../cliErrors';
import type { CommandHandler } from '../commandTypes';
import type { SwitchState, CommandResult, Route } from '../../types';

export function isValidOctets(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

export function cmdRoutingVersion(state: SwitchState, input: string): CommandResult {
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

export function cmdRouterNetwork(state: SwitchState, input: string): CommandResult {
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

    const areaNum = parseInt(area);
    const alreadyExists = (state.ospfNetworks || []).some(
        n => n.network === network && n.wildcard === wildcard && n.area === areaNum
    );

    return {
        success: true,
        output: `${network}/${wildcard} added to OSPF area ${area}`,
        newState: {
            dynamicRoutes: [
                ...(state.dynamicRoutes || []),
                { destination: network, subnetMask: wildcard, nextHop: 'directly connected', metric: 1, type: 'dynamic', area: areaNum }
            ],
            ospfNetworks: alreadyExists
                ? (state.ospfNetworks || [])
                : [
                    ...(state.ospfNetworks || []),
                    { network, wildcard, area: areaNum }
                  ]
        }
    };
}

export function cmdNoRouterNetwork(state: SwitchState, input: string): CommandResult {
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

    const dynamicRoutes = (state.dynamicRoutes || []).filter((r: Route) => r.destination !== network);
    const bgpNetworks = (state.bgpNetworks || []).filter((n: { network: string }) => n.network !== network);
    const ospfNetworks = (state.ospfNetworks || []).filter(n => n.network !== network);

    return {
        success: true,
        newState: {
            dynamicRoutes,
            bgpNetworks: bgpNetworks.length > 0 ? bgpNetworks : undefined,
            ospfNetworks
        }
    };
}

export function cmdNoAutoSummary(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        newState: { autoSummary: false }
    };
}

export function cmdAutoSummary(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        output: 'Auto-summary enabled',
        newState: { autoSummary: true }
    };
}

export function cmdEigrpRouterId(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^eigrp\s+router-id\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const routerId = match[1];
    return {
        success: true,
        output: `EIGRP router-id set to ${routerId}`,
        newState: { routerId: routerId, routingProtocol: 'eigrp' }
    };
}

export function cmdNoEigrpRouterId(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        output: 'EIGRP router-id removed',
        newState: { routerId: undefined }
    };
}

export function cmdEigrpStub(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'eigrp') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^eigrp\s+stub(?:\s+([a-z-]+(?:\s+[a-z-]+)*))?$/i);
    if (!match) return { success: false, error: '% Invalid eigrp stub command syntax' };

    const tokens = (match[1] || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.some(t => !['connected', 'summary', 'static', 'redistributed', 'receive-only'].includes(t))) {
        return { success: false, error: '% Invalid keyword. Allowed: connected, summary, static, redistributed, receive-only' };
    }

    let connected = false;
    let summary = false;
    let receiveOnly = false;
    if (tokens.length === 0) {
        connected = true;
        summary = true;
    } else {
        connected = tokens.includes('connected');
        summary = tokens.includes('summary');
        receiveOnly = tokens.includes('receive-only');
    }

    const stub = {
        connected,
        summary,
        static: tokens.includes('static'),
        redistributed: tokens.includes('redistributed'),
        receiveOnly,
    };

    return {
        success: true,
        output: tokens.length === 0
            ? 'EIGRP stub routing enabled (connected, summary)'
            : `EIGRP stub routing enabled (${tokens.join(', ')})`,
        newState: { eigrpStub: stub }
    };
}

export function cmdNoEigrpStub(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'eigrp' || !/^no\s+eigrp\s+stub$/i.test(input)) {
        return { success: false, error: '% Invalid no eigrp stub command syntax' };
    }
    return {
        success: true,
        output: 'EIGRP stub routing disabled',
        newState: { eigrpStub: null }
    };
}

export function cmdRedistribute(state: SwitchState, input: string): CommandResult {
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

export function cmdNoRedistribute(state: SwitchState, input: string): CommandResult {
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

export const eigrpRipRouterHandlers: Record<string, CommandHandler> = {
    'network': cmdRouterNetwork,
    'no network': cmdNoRouterNetwork,
    'version': cmdRoutingVersion,
    'auto-summary': cmdAutoSummary,
    'no auto-summary': cmdNoAutoSummary,
    'eigrp router-id': cmdEigrpRouterId,
    'no eigrp router-id': cmdNoEigrpRouterId,
    'eigrp stub': cmdEigrpStub,
    'no eigrp stub': cmdNoEigrpStub,
    'redistribute': cmdRedistribute,
    'no redistribute': cmdNoRedistribute,
};
