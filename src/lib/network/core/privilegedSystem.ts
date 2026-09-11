import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';
import { buildRunningConfig } from './configBuilder';

/**
 * Reload - Reboot device
 */
export function cmdReload(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }
    return {
        success: true,
        output: 'Proceed with reload? [confirm]\nReloading...\n',
        reloadDevice: true
    };
}

/**
 * Clock Set
 */
export function cmdClockSet(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    const match = input.match(/^clock\s+set\s+(\d{1,2}:\d{1,2}:\d{1,2})\s+(\d{1,2})\s+(\w+)\s+(\d{4})$/i);
    if (!match) return { success: false, error: '% Invalid input' };

    const [, time, day, monthStr, year] = match;

    // Parse month string to number (0-11)
    const monthMap: Record<string, number> = {
        january: 0, jan: 0,
        february: 1, feb: 1,
        march: 2, mar: 2,
        april: 3, apr: 3,
        may: 4,
        june: 5, jun: 5,
        july: 6, jul: 6,
        august: 7, aug: 7,
        september: 8, sep: 8, sept: 8,
        october: 9, oct: 9,
        november: 10, nov: 10,
        december: 11, dec: 11
    };
    const month = monthMap[monthStr.toLowerCase()];
    if (month === undefined) return { success: false, error: '% Invalid month' };

    // Parse time (hh:mm:ss)
    const [hours, minutes, seconds] = time.split(':').map(Number);

    // Create configured date object
    const configuredDate = new Date(Number(year), month, Number(day), hours, minutes, seconds);
    // Get real current time
    const realDate = new Date();
    // Calculate offset in milliseconds
    const timeOffset = configuredDate.getTime() - realDate.getTime();

    // Update services.ntp.timeOffset
    const nextServices = {
        ...state.services,
        ntp: {
            ...state.services?.ntp,
            timeOffset,
            enabled: true,
            timezone: state.services?.ntp?.timezone || 'UTC',
            date: `${configuredDate.getFullYear()}-${String(configuredDate.getMonth() + 1).padStart(2, '0')}-${String(configuredDate.getDate()).padStart(2, '0')}`,
            time: configuredDate.toTimeString().slice(0, 8),
        }
    };

    return {
        success: true,
        output: '',
        newState: {
            systemClock: { time, day, month: monthStr, year },
            services: nextServices
        }
    };
}

/**
 * Terminal - Set terminal parameters
 */
export function cmdTerminal(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    const match = input.match(/^terminal\s+(length|width|monitor|no\s+monitor)\s*(\d*)$/i);
    if (!match) return { success: false, error: '% Invalid terminal command' };
    const param = match[1].toLowerCase();
    if (param === 'length') return { success: true, output: '' };
    if (param === 'width') return { success: true, output: '' };
    if (param === 'monitor') return { success: true, output: '%LINK-5-CHANGED: Interface, changed state to monitoring' };
    return { success: true, output: '' };
}

/**
 * Help command
 */
export function cmdHelp(_state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
    const lang = ctx?.language || 'en';
    const output = lang === 'tr'
        ? '\nYardım sistemi:\n  Komut tamamlama için TAB tuşunu kullanın\n  Komut yardımı için ? kullanın\n  Örnek: show ?\n'
        : '\nHelp system:\n  Use TAB for command completion\n  Use ? for command help\n  Example: show ?\n';
    return { success: true, output };
}

/**
 * Setup command
 */
export function cmdSetup(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return {
        success: true,
        output: '\n--- System Configuration Dialog ---\n\nWould you like to enter the initial configuration dialog? [yes/no]: \n% Aborting setup.'
    };
}

/**
 * Test command
 */
export function cmdTest(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% Diagnostic test completed successfully.\n' };
}

export function cmdMore(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    const arg = input.replace(/^more\s+/i, '').trim().toLowerCase();
    if (!arg) return { success: false, error: '% Usage: more <filename>' };

    if (arg.includes('running-config') || arg.includes('system:running-config')) {
        return { success: true, output: '\n' + buildRunningConfig(state) };
    }
    if (arg.includes('startup-config') || arg.includes('nvram:startup-config')) {
        return { success: true, output: '\n' + (state.savedConfig || buildRunningConfig(state)) };
    }
    if (arg.includes('vlan.dat') || arg.includes('flash:vlan.dat')) {
        return { success: true, output: '\nVLAN database file (binary format vlan.dat)\n' };
    }
    return { success: true, output: `\n-- More (${arg}) --\nContent of ${arg}\n` };
}

/**
 * Disconnect command
 */
export function cmdDisconnect(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% No active sessions to disconnect.\n' };
}

/**
 * Resume command
 */
export function cmdResume(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% No suspended sessions to resume.\n' };
}

/**
 * Suspend command
 */
export function cmdSuspend(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% Suspend not supported in this session.\n' };
}