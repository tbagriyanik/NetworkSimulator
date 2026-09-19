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
 * Setup command - Starts interactive configuration wizard
 */
export function cmdSetup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }
    return {
        success: true,
        output: '\n--- System Configuration Dialog ---\n\nWould you like to enter the initial configuration dialog? [yes/no]: ',
        newState: {
            setupDialog: {
                step: 'enter_dialog',
                answers: {}
            }
        }
    };
}

/**
 * Test command - Performs modular diagnostic tests
 */
export function cmdTest(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const args = input.replace(/^test\s*/i, '').trim();
    if (!args) {
        return {
            success: true,
            output: '\n% Usage: test <interfaces | memory | loopback | cable-diagnostics | vlan> [options]\n'
        };
    }

    const lower = args.toLowerCase();

    // test memory
    if (lower === 'memory' || lower.startsWith('memory ')) {
        return {
            success: true,
            output: `
Memory Diagnostic Test Results:
  Processor Memory: PASSED (65536000 bytes tested, 0 errors)
  Packet Buffer RAM: PASSED (32768000 bytes tested, 0 errors)
  NVRAM Checksum: PASSED (Integrity OK)
  Flash Memory CRC: PASSED (0 bad sectors)
`
        };
    }

    // test cable-diagnostics tdr interface <intf>
    if (lower.startsWith('cable-diagnostics') || lower.startsWith('cable')) {
        const intfMatch = args.match(/interface\s+(\S+)/i) || args.match(/cable(?:-diagnostics)?\s+(?:tdr\s+)?(?:interface\s+)?(\S+)/i);
        const intfName = intfMatch?.[1];
        if (!intfName) {
            return { success: false, error: '% Interface required for cable-diagnostics' };
        }
        const portKey = intfName.toLowerCase();
        const port = state.ports?.[portKey];
        if (!port) {
            return { success: false, error: `% Interface ${intfName} not found` };
        }
        const isConnected = port.status === 'connected' && !port.shutdown;
        const pairStatus = isConnected ? 'Normal' : (port.shutdown ? 'Shut' : 'Open');
        const lengthStr = isConnected ? '15 m' : 'N/A';

        return {
            success: true,
            output: `
TDR test started on interface ${intfName}...
TDR test completed.
Interface Speed Pair Cable length        Pair status
--------- ----- ---- ------------------- -------------------
${intfName.padEnd(10)}100M  Pair A 1-2  ${lengthStr.padEnd(20)}${pairStatus}
            Pair B 3-6  ${lengthStr.padEnd(20)}${pairStatus}
            Pair C 4-5  ${lengthStr.padEnd(20)}${pairStatus}
            Pair D 7-8  ${lengthStr.padEnd(20)}${pairStatus}
`
        };
    }

    // test interfaces / test loopback
    if (lower.startsWith('interface') || lower.startsWith('interfaces') || lower.startsWith('loopback')) {
        const intfMatch = args.match(/(?:interfaces?|loopback)\s+(\S+)/i);
        const targetIntf = intfMatch?.[1];

        if (targetIntf) {
            const portKey = targetIntf.toLowerCase();
            const port = state.ports?.[portKey];
            if (!port) {
                return { success: false, error: `% Interface ${targetIntf} not found` };
            }
            const statusStr = port.shutdown ? 'ADMIN_DOWN' : (port.status === 'connected' ? 'PASSED' : 'NO_CARRIER');
            return {
                success: true,
                output: `
Diagnostic Test for interface ${targetIntf}:
  Internal Loopback Test: PASSED
  MAC Controller Test: PASSED
  Transceiver / PHY Test: PASSED
  Link State: ${statusStr}
  CRC / Alignment Check: 0 Errors detected
`
            };
        }

        // Test all interfaces
        const portEntries = Object.entries(state.ports || {});
        let output = '\nInterface Diagnostic Test Summary:\n';
        output += 'Port        PHY     MAC     Loopback  Result\n';
        output += '----------  ------  ------  --------  -------\n';
        portEntries.forEach(([name, p]) => {
            const res = p.shutdown ? 'Disabled' : (p.status === 'connected' ? 'Passed' : 'NoCable');
            output += `${name.padEnd(12)}${'OK'.padEnd(8)}${'OK'.padEnd(8)}${'OK'.padEnd(10)}${res}\n`;
        });
        return { success: true, output };
    }

    // test vlan <id>
    if (lower.startsWith('vlan')) {
        const vlanMatch = args.match(/vlan\s+(\d+)/i);
        const vlanId = vlanMatch?.[1];
        if (!vlanId) {
            return { success: false, error: '% VLAN ID required' };
        }
        const vlanExists = state.vlans && state.vlans[vlanId];
        return {
            success: true,
            output: vlanExists
                ? `\nVLAN ${vlanId} (${vlanExists.name}): Diagnostic state NORMAL, STP instance active, MAC forwarding table synced.\n`
                : `\n% VLAN ${vlanId} not found in database.\n`
        };
    }

    return {
        success: true,
        output: `\n% Diagnostic test for "${args}" completed successfully.\n`
    };
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
 * Disconnect command - Close an active or suspended remote session
 */
export function cmdDisconnect(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^disconnect(?:\s+(\d+))?$/i);
    const targetId = match?.[1] ? parseInt(match[1], 10) : undefined;

    const sessions = state.activeSessions || [];
    if (sessions.length === 0) {
        return { success: true, output: '\n% No active sessions to disconnect.\n' };
    }

    let sessionToDisconnect = targetId
        ? sessions.find(s => s.id === targetId)
        : sessions[sessions.length - 1];

    if (!sessionToDisconnect) {
        return { success: false, error: `% No session number ${targetId}` };
    }

    const updatedSessions = sessions.filter(s => s.id !== sessionToDisconnect!.id);

    return {
        success: true,
        output: `\nClosing connection to ${sessionToDisconnect.host} [confirm]\nConnection to ${sessionToDisconnect.host} closed.\n`,
        newState: {
            activeSessions: updatedSessions
        }
    };
}

/**
 * Resume command - Resume a suspended session
 */
export function cmdResume(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^resume(?:\s+(\d+))?$/i);
    const targetId = match?.[1] ? parseInt(match[1], 10) : undefined;

    const sessions = state.activeSessions || [];
    const suspendedSessions = sessions.filter(s => s.status === 'suspended');

    if (suspendedSessions.length === 0) {
        return { success: true, output: '\n% No suspended sessions to resume.\n' };
    }

    let sessionToResume = targetId
        ? sessions.find(s => s.id === targetId && s.status === 'suspended')
        : suspendedSessions[suspendedSessions.length - 1];

    if (!sessionToResume) {
        return { success: false, error: `% No suspended session with ID ${targetId}` };
    }

    const updatedSessions = sessions.map(s =>
        s.id === sessionToResume!.id ? { ...s, status: 'active' as const } : s
    );

    return {
        success: true,
        output: `\n[Resuming connection ${sessionToResume.id} to ${sessionToResume.host} ...]\n`,
        newState: {
            activeSessions: updatedSessions
        }
    };
}

/**
 * Suspend command - Suspends the current remote session and returns to prompt
 */
export function cmdSuspend(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const sessions = state.activeSessions || [];
    const activeSession = sessions.find(s => s.status === 'active');

    if (!activeSession) {
        return { success: true, output: '\n% Suspend not supported in this session (no active outgoing session).\n' };
    }

    const updatedSessions = sessions.map(s =>
        s.id === activeSession.id ? { ...s, status: 'suspended' as const } : s
    );

    return {
        success: true,
        output: `\n[Connection ${activeSession.id} to ${activeSession.host} suspended]\n`,
        newState: {
            activeSessions: updatedSessions
        }
    };
}