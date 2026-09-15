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

export function cmdAreaRange(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+range\s+([0-9.]+)\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    return {
        success: true,
        output: `Area ${match[1]} range ${match[2]} ${match[3]} configured`,
        newState: { areaRange: { area: match[1], network: match[2], mask: match[3] } } as unknown as Partial<SwitchState>
    };
}

export function cmdAreaStub(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+stub$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const stubAreas: string[] = (state as SwitchState & { ospfStubAreas?: string[] }).ospfStubAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as stub`,
        newState: { ospfStubAreas: [...stubAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

export function cmdAreaNssa(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+nssa$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const nssaAreas: string[] = (state as SwitchState & { ospfNssaAreas?: string[] }).ospfNssaAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as NSSA`,
        newState: { ospfNssaAreas: [...nssaAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

export function cmdAreaStubNoSummary(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+stub\s+no-summary$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const totallyStubAreas: string[] = (state as SwitchState & { ospfTotallyStubAreas?: string[] }).ospfTotallyStubAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as totally stubby`,
        newState: { ospfTotallyStubAreas: [...totallyStubAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

export function cmdAreaNssaNoSummary(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^area\s+(\d+)\s+nssa\s+no-summary$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const totallyNssaAreas: string[] = (state as SwitchState & { ospfTotallyNssaAreas?: string[] }).ospfTotallyNssaAreas || [];
    return {
        success: true,
        output: `Area ${match[1]} configured as totally NSSA`,
        newState: { ospfTotallyNssaAreas: [...totallyNssaAreas, match[1]] } as unknown as Partial<SwitchState>
    };
}

export function cmdNoAreaStub(state: SwitchState, input: string): CommandResult {
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

export function cmdNoAreaNssa(state: SwitchState, input: string): CommandResult {
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

export const ospfRouterHandlers: Record<string, CommandHandler> = {
    'router-id': cmdRouterId,
    'no router-id': cmdNoRouterId,
    'passive-interface': cmdPassiveInterface,
    'no passive-interface': cmdNoPassiveInterface,
    'default-information originate': cmdDefaultInformation,
    'default-information always': cmdDefaultInformation,
    'area range': cmdAreaRange,
    'area stub': cmdAreaStub,
    'area nssa': cmdAreaNssa,
    'area stub no-summary': cmdAreaStubNoSummary,
    'area nssa no-summary': cmdAreaNssaNoSummary,
    'no area stub': cmdNoAreaStub,
    'no area nssa': cmdNoAreaNssa,
};
