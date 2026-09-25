import type { CommandHandler } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';

export function cmdRouterId(_state: SwitchState, input: string): CommandResult {
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

export function cmdNoRouterId(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        newState: { routerId: undefined }
    };
}

export function cmdPassiveInterface(state: SwitchState, input: string): CommandResult {
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

export function cmdNoPassiveInterface(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+passive-interface\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid no passive-interface command' };

    const iface = match[1];
    const passiveInterfaces = (state.passiveInterfaces || []).filter((p: string) => p !== iface);

    return {
        success: true,
        newState: { passiveInterfaces }
    };
}

export function cmdDefaultInformation(_state: SwitchState, input: string): CommandResult {
    const isAlways = /\balways\b/i.test(input);
    const metricMatch = input.match(/\bmetric\s+(\d+)\b/i);
    const metricTypeMatch = input.match(/\bmetric-type\s+([12])\b/i);

    const metric = metricMatch ? parseInt(metricMatch[1], 10) : undefined;
    const metricType = metricTypeMatch ? (parseInt(metricTypeMatch[1], 10) as 1 | 2) : undefined;

    let outputDesc = 'Default information originate configured';
    if (isAlways) outputDesc += ' always';
    if (metric !== undefined) outputDesc += ` metric ${metric}`;
    if (metricType !== undefined) outputDesc += ` metric-type ${metricType}`;

    return {
        success: true,
        output: outputDesc,
        newState: {
            defaultInformation: 'originate',
            ospfDefaultOriginate: {
                enabled: true,
                always: isAlways,
                metric,
                metricType
            }
        }
    };
}

export function cmdNoDefaultInformation(_state: SwitchState, _input: string): CommandResult {
    return {
        success: true,
        output: 'Default information originate disabled',
        newState: {
            defaultInformation: undefined,
            ospfDefaultOriginate: undefined
        }
    };
}

export function cmdAreaRange(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+range\s+([0-9.]+)\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    return {
        success: true,
        output: `Area ${match[1]} range ${match[2]} ${match[3]} configured`,
        newState: { areaRange: { area: match[1], network: match[2], mask: match[3] } }
    };
}

export function cmdAreaStub(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+stub$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const stubAreas = state.ospfStubAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as stub`,
        newState: { ospfStubAreas: [...new Set([...stubAreas, match[1]])] }
    };
}

export function cmdAreaNssa(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+nssa$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const nssaAreas = state.ospfNssaAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as NSSA`,
        newState: { ospfNssaAreas: [...new Set([...nssaAreas, match[1]])] }
    };
}

export function cmdAreaStubNoSummary(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+stub\s+no-summary$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const totallyStubAreas = state.ospfTotallyStubAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as totally stubby`,
        newState: { ospfTotallyStubAreas: [...new Set([...totallyStubAreas, match[1]])] }
    };
}

export function cmdAreaNssaNoSummary(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+nssa\s+no-summary$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const totallyNssaAreas = state.ospfTotallyNssaAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as totally NSSA`,
        newState: { ospfTotallyNssaAreas: [...new Set([...totallyNssaAreas, match[1]])] }
    };
}

export function cmdNoAreaStub(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+area\s+(\d+)\s+stub(?:\s+no-summary)?$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const stubAreas = state.ospfStubAreas || [];
    const totallyStubAreas = state.ospfTotallyStubAreas || [];
    const areaStr = match[1];
    return {
        success: true,
        output: `Area ${areaStr} removed from stub configuration`,
        newState: {
            ospfStubAreas: stubAreas.filter(a => a !== areaStr),
            ospfTotallyStubAreas: totallyStubAreas.filter(a => a !== areaStr)
        }
    };
}

export function cmdNoAreaNssa(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+area\s+(\d+)\s+nssa(?:\s+no-summary)?$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const nssaAreas = state.ospfNssaAreas || [];
    const totallyNssaAreas = state.ospfTotallyNssaAreas || [];
    const areaStr = match[1];
    return {
        success: true,
        output: `Area ${areaStr} removed from NSSA configuration`,
        newState: {
            ospfNssaAreas: nssaAreas.filter(a => a !== areaStr),
            ospfTotallyNssaAreas: totallyNssaAreas.filter(a => a !== areaStr)
        }
    };
}

export function cmdAreaAuthentication(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+authentication(?:\s+(message-digest))?$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const areaId = match[1];
    const isMd5 = !!match[2];
    const authType: 'md5' | 'simple' = isMd5 ? 'md5' : 'simple';
    const areaAuth: Record<string, 'md5' | 'simple'> = { ...state.ospfAreaAuth, [areaId]: authType };
    return {
        success: true,
        output: `Area ${areaId} authentication ${isMd5 ? 'message-digest ' : ''}enabled`,
        newState: { ospfAreaAuth: areaAuth }
    };
}

export function cmdNoAreaAuthentication(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+area\s+(\d+)\s+authentication(?:\s+message-digest)?$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const areaId = match[1];
    const areaAuth: Record<string, 'md5' | 'simple'> = { ...state.ospfAreaAuth };
    delete areaAuth[areaId];
    return {
        success: true,
        output: `Area ${areaId} authentication disabled`,
        newState: { ospfAreaAuth: areaAuth }
    };
}

export const ospfRouterHandlers: Record<string, CommandHandler> = {
    'router-id': cmdRouterId,
    'no router-id': cmdNoRouterId,
    'passive-interface': cmdPassiveInterface,
    'no passive-interface': cmdNoPassiveInterface,
    'default-information originate': cmdDefaultInformation,
    'no default-information originate': cmdNoDefaultInformation,
    'default-information always': cmdDefaultInformation,
    'area range': cmdAreaRange,
    'area stub': cmdAreaStub,
    'area nssa': cmdAreaNssa,
    'area stub no-summary': cmdAreaStubNoSummary,
    'area nssa no-summary': cmdAreaNssaNoSummary,
    'no area stub': cmdNoAreaStub,
    'no area nssa': cmdNoAreaNssa,
    'area authentication': cmdAreaAuthentication,
    'no area authentication': cmdNoAreaAuthentication,
};
