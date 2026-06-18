import { iosModeError } from './iosErrors';
import type { CommandHandler, CommandContext } from './commandTypes';
import { checkConnectivity, getWirelessDistance } from '../connectivity';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState, CommandResult, Port, Route } from '../types';
import { clearArpCache } from '../arp';
import { clearMacTable, clearDynamicMacEntries, clearStaticMacEntries } from '../macLearning';

// Privileged EXEC komutları (ping, telnet, write, copy, erase, reload, debug, vs.)

export const privilegedHandlers: Record<string, CommandHandler> = {
    'ping': cmdPing,
    'telnet': cmdTelnet,
    'ssh': cmdSsh,
    'traceroute': cmdTraceroute,
    'write memory': cmdWriteMemory,
    'copy running-config startup-config': cmdCopyRunningStartup,
    'copy running-config flash': cmdCopyRunningFlash,
    'copy flash startup-config': cmdCopyFlashStartup,
    'ftp': cmdFtp,
    'mail': cmdMail,
    'erase startup-config': cmdEraseStartupConfig,
    'erase nvram': cmdEraseNvram,
    'reload': cmdReload,
    'ip route': cmdIpRoute,
    'no ip route': cmdNoIpRoute,
    'debug': cmdDebug,
    'undebug all': cmdUndebugAll,
    'delete flash:vlan.dat': cmdDeleteVlanDat,
    'setup': cmdSetup,
    'test': cmdTest,
    'more': cmdMore,
    'disconnect': cmdDisconnect,
    'resume': cmdResume,
    'suspend': cmdSuspend,
    'copy running-config tftp': cmdCopyTftp,
    'copy tftp running-config': cmdCopyTftp,
    'copy startup-config running-config': cmdCopyStartupRunning,
    'delete nvram': cmdEraseNvram,
    'clear line': cmdClearLine,
    'clear interface': cmdClearInterface,
    'terminal': cmdTerminal,
    'terminal length': cmdTerminal,
    'terminal width': cmdTerminal,
    'terminal monitor': cmdTerminal,
    'terminal no monitor': cmdTerminal,
    'clear arp-cache': cmdClearArpCache,
    'clear mac address-table': cmdClearMacAddressTable,
    'clear counters': cmdClearCounters,
    'undebug': cmdUndebug,
    'clock set': cmdClockSet,
    'no debug all': cmdUndebugAll,
    'help': cmdHelp,
};

/**
 * Generate ping latencies proportional to WiFi distance.
 * Uses exponential curve: close = very fast, far = much slower (realistic WiFi behavior).
 * distance 0px → ~1ms, 450px (signal 1) → ~150ms, 549px → ~210ms
 */
function generatePingLatencies(distance: number): { min: number; avg: number; max: number } {
    const jitter = (base: number, pct: number) =>
        Math.max(1, Math.round(base * (1 + (Math.random() * 2 - 1) * pct)));

    // Exponential: base = e^(distance/130) scaled to 1ms at 0px, ~210ms at 549px
    const basePing = Math.exp(distance / 130);

    const min = jitter(basePing * 0.8, 0.08);
    const avg = jitter(basePing, 0.08);
    const max = jitter(basePing * 1.25, 0.08);

    return { min, avg: Math.max(min, avg), max: Math.max(avg, max) };
}

/**
 * Ping - Test connectivity
 */
function cmdPing(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^ping\s+([0-9a-fA-F:.]+|[\w.-]+)(?:\s+(\d+))?(?:\s+(\d+))?$/i);
    if (!match) {
        return { success: false, error: '% Invalid ping command. Use: ping <host> [size] [count]' };
    }

    const host = match[1];
    const size = match[2] || '56';
    const count = match[3] || '5';
    if (ctx?.sourceDeviceId && Array.isArray(ctx.devices)) {
        const connectivity = checkConnectivity(
            ctx.sourceDeviceId,
            host,
            ctx.devices,
            ctx.connections || [],
            ctx.deviceStates,
            ctx.language,
            { protocol: 'icmp' }
        );

        // Handle port security violations - update state if needed
        let updatedDeviceStates: Map<string, SwitchState> | undefined;
        if (connectivity.portSecurityViolations && connectivity.portSecurityViolations.length > 0) {
            // Create new deviceStates Map with updated ports
            updatedDeviceStates = new Map<string, SwitchState>(ctx.deviceStates);

            connectivity.portSecurityViolations.forEach(violation => {
                if (violation.action === 'shutdown') {
                    const deviceState = updatedDeviceStates?.get(violation.deviceId);
                    if (deviceState) {
                        const updatedPorts = { ...deviceState.ports };
                        const port = updatedPorts[violation.portId];
                        if (port) {
                            updatedPorts[violation.portId] = {
                                ...port,
                                shutdown: true,
                                status: 'err-disabled',
                                portSecurity: port.portSecurity ? {
                                    ...port.portSecurity,
                                    violations: (port.portSecurity.violations || 0) + 1
                                } : undefined
                            };
                            updatedDeviceStates?.set(violation.deviceId, {
                                ...deviceState,
                                ports: updatedPorts
                            });
                        }
                    }
                }
            });
        }

        if (connectivity.success) {
            let output = `\nType escape sequence to abort.\n`;
            output += `Sending ${count}, ${size}-byte ICMP Echos to ${host}, timeout is 2 seconds:\n`;
            const debugLines: string[] = [];
            const devices = (ctx.devices || []) as CanvasDevice[];
            const sourceDevice = ctx.sourceDeviceId ? devices.find(d => d.id === ctx.sourceDeviceId) : undefined;
            const sourceIp = sourceDevice?.ip || '0.0.0.0';
            if (state.debugs?.['ip icmp'] || state.debugs?.['ip packet']) {
                debugLines.push(`*Mar  1 00:00:00.001: ICMP: echo request sent, src ${sourceIp}, dst ${host}`);
                debugLines.push(`*Mar  1 00:00:00.004: ICMP: echo reply rcvd, src ${host}, dst ${sourceIp}`);
            }
            if ((state.debugs?.['sw-vlan packet'] || state.debugs?.['vlan packet']) && connectivity.hops?.length) {
                debugLines.push(`*Mar  1 00:00:00.002: SW_VLAN-PACKET: frame forwarded across ${Math.max(0, connectivity.hops.length - 1)} hop(s)`);
            }
            const successCount = parseInt(count, 10) || 5;
            const targetDevice = connectivity.targetId ? devices.find(d => d.id === connectivity.targetId) : undefined;

            const srcDist = getWirelessDistance(sourceDevice, devices, ctx.deviceStates);
            const dstDist = getWirelessDistance(targetDevice, devices, ctx.deviceStates);

            // Both wired → <1ms
            // One or both wireless → sum their distances for total path latency
            const srcWired = srcDist === Infinity;
            const dstWired = dstDist === Infinity;

            let pingResult: { min: number; avg: number; max: number };
            if (srcWired && dstWired) {
                pingResult = { min: 1, avg: 1, max: 2 };
            } else {
                // Use effective distance: sum wireless hops, ignore wired (0 cost)
                const effectiveDist = (srcWired ? 0 : srcDist) + (dstWired ? 0 : dstDist);
                pingResult = generatePingLatencies(effectiveDist);
            }

            const fmtMs = (ms: number) => ms <= 1 ? '<1' : String(ms);
            for (let i = 0; i < successCount; i++) output += '!';
            output += `\n\nSuccess rate is 100 percent (${successCount}/${successCount}), round-trip min/avg/max = ${fmtMs(pingResult.min)}/${fmtMs(pingResult.avg)}/${fmtMs(pingResult.max)} ms\n`;
            if (debugLines.length > 0) {
                output = `${debugLines.join('\n')}\n${output}`;
            }
            return { success: true, output, triggerPingAnimation: connectivity.targetId, deviceStates: updatedDeviceStates };
        } else {
            return {
                success: false,
                output: `\nType escape sequence to abort.\nSending ${count}, ${size}-byte ICMP Echos to ${host}, timeout is 2 seconds:\n.....\n`,
                error: connectivity.error || `Destination host unreachable.`,
                deviceStates: updatedDeviceStates
            };
        }
    }

    return { success: false, error: '% Ping requires network context' };
}

/**
 * Telnet - Connect to remote device
 */
function cmdTelnet(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    // Allow telnet from both user and privileged modes
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^telnet\s+([0-9.]+|[\w.-]+)(?:\s+(\d+))?$/i);
    if (!match) {
        return { success: false, error: '% Invalid telnet command' };
    }

    const host = match[1];
    const port = match[2] || '23';

    // Connectivity logic
    if (ctx?.sourceDeviceId && Array.isArray(ctx.devices)) {
        const connectivity = checkConnectivity(
            ctx.sourceDeviceId,
            host,
            ctx.devices,
            ctx.connections || [],
            ctx.deviceStates,
            ctx.language,
            { protocol: 'tcp', port }
        );

        if (!connectivity.success) {
            return {
                success: false,
                output: `Trying ${host} ${port} ...`,
                error: connectivity.error || (ctx.language === 'tr' ? 'Hedefe ulaşılamadı.' : 'Destination host unreachable.')
            };
        }

            // Check target device configuration
            if (!connectivity.targetId) return { success: false, error: '% Target device not found' };
            const targetState = ctx.deviceStates?.get(connectivity.targetId);

            if (targetState) {
                const transportInput = targetState.security?.vtyLines?.transportInput || [];
                const isTelnetActive = transportInput.includes('all') || transportInput.includes('telnet');

                if (!isTelnetActive) {
                    return {
                        success: false,
                        output: `Connecting to ${host}...`,
                        error: `% Connection refused by remote host`
                    };
                }
            }
    }

    return {
        success: true,
        output: `Trying ${host} ${port} ...\nOpen\n\nUser Access Verification\n\nPassword: `,
        requiresTelnetPassword: true,
        telnetTarget: { host, port }
    };
}

/**
 * SSH - Connect to remote device via SSH
 */
function cmdSsh(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    // Allow ssh from both user and privileged modes
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^ssh\s+(-l\s+\S+\s+)?([0-9.]+|[\w.-]+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid ssh command. Use: ssh [-l username] host' };
    }

    const username = match[1] ? match[1].replace(/^-l\s+/, '') : undefined;
    const host = match[2];

    // Resolve hostname to show IP address
    let resolvedIp = host;
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(host)) {
        const knownDomains: Record<string, string> = {
            'a10.com': '52.8.34.123',
            'portal.local': '192.0.2.10',
            'docs.local': '192.0.2.20',
            'search.local': '192.0.2.30',
            'mail.local': '192.0.2.40',
            'files.local': '192.0.2.50',
            'social.local': '192.0.2.70',
        };
        resolvedIp = knownDomains[host.toLowerCase()] || host;
    }

    // Connectivity logic
    if (ctx?.sourceDeviceId && Array.isArray(ctx.devices)) {
        const connectivity = checkConnectivity(
            ctx.sourceDeviceId,
            host,
            ctx.devices,
            ctx.connections || [],
            ctx.deviceStates,
            ctx.language,
            { protocol: 'tcp', port: '22' }
        );

        if (!connectivity.success) {
            return {
                success: false,
                output: `Connecting to ${host}...`,
                error: connectivity.error || (ctx.language === 'tr' ? 'Hedefe ulaşılamadı.' : 'Destination host unreachable.')
            };
        }

        // Check target device configuration
        const targetDeviceId = connectivity.targetId;
        const targetState = targetDeviceId ? ctx.deviceStates?.get(targetDeviceId) : undefined;

        if (targetState) {
            const transportInput = targetState.security?.vtyLines?.transportInput || [];
            const isSshActive = transportInput.includes('all') || transportInput.includes('ssh');

            if (!isSshActive) {
                return {
                    success: false,
                    output: `Connecting to ${host}...`,
                    error: `% Connection refused by remote host`
                };
            }
        }
    }

    let output = `Connecting to ${host}`;
    if (resolvedIp !== host) {
        output += ` (${resolvedIp})`;
    }
    output += ` port 22...\n`;

    if (username) {
        output += `${username}@${host}'s password: `;
    } else {
        output += `Password: `;
    }

    return {
        success: true,
        output,
        requiresSshPassword: true,
        sshTarget: { host, username, port: 22 }
    };
}

/**
 * Write Memory - Save configuration
 */
function cmdWriteMemory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    return {
        success: true,
        output: 'Building configuration...\n[OK]\n',
        saveConfig: true
    };
}

/**
 * Copy Running-Config Startup-Config
 */
function cmdCopyRunningStartup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    return {
        success: true,
        output: 'Destination filename [startup-config]?\nBuilding configuration...\n[OK]\n',
        saveConfig: true
    };
}

/**
 * Copy Running-Config Flash:
 */
function cmdCopyRunningFlash(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^copy\s+running-config\s+flash:(\S+)?$/i);
    if (!match) {
        return { success: false, error: '% Invalid copy command. Use: copy running-config flash:[:filename]' };
    }

    const requestedFilename = (match[1] || '').trim();
    const filename = requestedFilename || 'running-config';

    return {
        success: true,
        output: `Destination filename [${filename}]?\nBuilding configuration...\n[OK]\n`,
        saveFlashConfig: true,
        flashFilename: filename
    };
}

/**
 * Copy Flash: Startup-Config
 */
function cmdCopyFlashStartup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^copy\s+flash:(\S+)?\s+startup-config$/i);
    if (!match) {
        return { success: false, error: '% Invalid copy command. Use: copy flash:[:filename] startup-config' };
    }

    const requestedFilename = (match[1] || '').trim();
    const sourceFilename = requestedFilename || 'running-config';
    const hasSnapshot = !!state.flashStartupConfigs?.[sourceFilename];
    const hasLegacyTextBackup = !!state.flashFiles?.[sourceFilename];

    if (!hasSnapshot && hasLegacyTextBackup) {
        return {
            success: false,
            error: `%Error: flash:${sourceFilename} is legacy backup format. Re-save with "copy running-config flash:${sourceFilename}" and try again.`
        };
    }

    if (!hasSnapshot) {
        return {
            success: false,
            error: `%Error: flash:${sourceFilename} not found`
        };
    }

    return {
        success: true,
        output: `Loading flash:${sourceFilename} to startup-config...\n[OK]\nStartup config updated. Reload required to apply.\n`,
        restoreFlashConfig: true,
        flashSourceFilename: sourceFilename
    };
}

/**
 * Erase Startup-Config
 */
function cmdEraseStartupConfig(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    return {
        success: true,
        output: 'Erasing the nvram filesystem will remove startup configuration files.\nErase of nvram: complete\n',
        requiresConfirmation: true,
        confirmationMessage: 'Erase startup configuration? This cannot be undone.',
        confirmationAction: 'erase',
        eraseConfig: true
    };
}

/**
 * Erase NVRAM
 */
function cmdEraseNvram(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    return {
        success: true,
        output: 'Erasing the nvram filesystem will remove all configuration files.\nErase of nvram: complete\n',
        requiresConfirmation: true,
        confirmationMessage: 'Erase nvram? This will remove all configuration files.',
        confirmationAction: 'erase',
        eraseConfig: true
    };
}

/**
 * Reload - Reboot device
 */
function cmdReload(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }
    return {
        success: true,
        output: 'Proceed with reload? [confirm]\nReloading...\n',
        reloadDevice: true
    };
}

/**
 * IP Route - Add static route
 */
function cmdIpRoute(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^ip\s+route\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+|\S+)(?:\s+(\d+))?$/i);
    if (!match) {
        return { success: false, error: '% Invalid ip route command. Use: ip route <network> <mask> <next-hop|interface> [administrative-distance]' };
    }

    const [, network, mask, nextHop, adminDistance] = match;
    const metric = adminDistance ? parseInt(adminDistance, 10) : 1;

    const newStaticRoutes = [...(state.staticRoutes || [])];
    // Remove existing route to same destination if exists
    const filteredRoutes = newStaticRoutes.filter(
            (route: Route) => !(route.destination === network && route.subnetMask === mask)
    );
    filteredRoutes.push({ destination: network, subnetMask: mask, nextHop, metric, type: 'static' });

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
function cmdNoIpRoute(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^no\s+ip\s+route\s+([0-9.]+)\s+([0-9.]+)(?:\s+([0-9.]+|\S+))?$/i);
    if (!match) {
        return { success: false, error: '% Invalid no ip route command' };
    }

    const [, network, mask, nextHop] = match;

    let newStaticRoutes;
    if (nextHop) {
        // Remove specific route
        newStaticRoutes = (state.staticRoutes || []).filter(
            (route: Route) => !(route.destination === network && route.subnetMask === mask && route.nextHop === nextHop)
        );
    } else {
        // Remove all routes for this network/mask
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
 * Debug - Enable debugging
 */
function cmdDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^debug\s+(.+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid debug command' };
    }

    const debugType = match[1].toLowerCase();
    const newDebugs = { ...(state.debugs || {}) };
    newDebugs[debugType] = true;

    return {
        success: true,
        output: `${debugType} debugging is on`,
        newState: { debugs: newDebugs }
    };
}

/**
 * Undebug All
 */
function cmdUndebugAll(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    return {
        success: true,
        output: 'All possible debugging has been turned off',
        newState: { debugs: {} }
    };
}


/**
 * Traceroute - Trace route to destination (Unix/Linux style)
 */
function cmdTraceroute(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^traceroute\s+([0-9.]+|[\w.-]+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid traceroute command. Use: traceroute <host>' };
    }

    const host = match[1];

    if (ctx?.sourceDeviceId && Array.isArray(ctx.devices)) {
        const connectivity = checkConnectivity(
            ctx.sourceDeviceId,
            host,
            ctx.devices,
            ctx.connections || [],
            ctx.deviceStates,
            ctx.language,
            { protocol: 'icmp' }
        );

        if (connectivity.success) {
            // Resolve hostname to show IP address
            let resolvedIp = host;
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(host)) {
                // For external domains, we'll simulate the IP
                const knownDomains: Record<string, string> = {
                    'a10.com': '52.8.34.123',
                    'portal.local': '192.0.2.10',
                    'docs.local': '192.0.2.20',
                    'search.local': '192.0.2.30',
                    'mail.local': '192.0.2.40',
                    'files.local': '192.0.2.50',
                    'social.local': '192.0.2.70',
                };
                resolvedIp = knownDomains[host.toLowerCase()] || 'Unknown';
            }

            let output = `\nType escape sequence to abort.\n`;
            output += `Tracing the route to ${host} (${resolvedIp})\n`;

            // Use the hops from connectivity result
            if (connectivity.hops && connectivity.hops.length > 0) {
                for (let i = 0; i < connectivity.hops.length; i++) {
                    const hop = connectivity.hops[i];
                    const hopTime = Math.floor(Math.random() * 20) + 1; // 1-20ms
                    output += `  ${i + 1} ${hop} ${hopTime} ms ${hopTime} ms ${hopTime} ms\n`;
                }
            } else {
                // Fallback hops
                const hops = Math.floor(Math.random() * 3) + 2; // 2-4 hops
                for (let i = 1; i <= hops; i++) {
                    const hopTime = Math.floor(Math.random() * 20) + 1; // 1-20ms
                    output += `  ${i} ${connectivity.targetId || '192.168.1.1'} ${hopTime} ms ${hopTime} ms ${hopTime} ms\n`;
                }
            }

            output += `\nTrace complete.\n`;
            return { success: true, output, triggerPingAnimation: connectivity.targetId };
        } else {
            // For failed connections, still try to show resolved IP
            let resolvedIp = host;
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(host)) {
                const knownDomains: Record<string, string> = {
                    'a10.com': '52.8.34.123',
                    'portal.local': '192.0.2.10',
                    'docs.local': '192.0.2.20',
                    'search.local': '192.0.2.30',
                    'mail.local': '192.0.2.40',
                    'files.local': '192.0.2.50',
                    'social.local': '192.0.2.70',
                };
                resolvedIp = knownDomains[host.toLowerCase()] || 'Unknown';
            }

            return {
                success: false,
                output: `\nType escape sequence to abort.\nTracing the route to ${host} (${resolvedIp})\n`,
                error: connectivity.error || `Destination host unreachable.`,
            };
        }
    }

    return { success: false, error: '% Traceroute requires network context' };
}


/**
 * Terminal - Set terminal parameters
 */
function cmdTerminal(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    const match = input.match(/^terminal\s+(length|width|monitor|no\s+monitor)\s*(\d*)$/i);
    if (!match) return { success: false, error: '% Invalid terminal command' };
    const param = match[1].toLowerCase();
    if (param === 'length') return { success: true, output: '' };
    if (param === 'width') return { success: true, output: '' };
    if (param === 'monitor') return { success: true, output: '%LINK-5-CHANGED: Interface, changed state to monitoring' };
    return { success: true, output: '' };
}

/**
 * Clear ARP Cache
 */
function cmdClearArpCache(_state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
    const deviceId = ctx.sourceDeviceId;
    const deviceStates = ctx.deviceStates;

    if (deviceId && deviceStates) {
        clearArpCache(deviceId, deviceStates);
    }

    return { success: true, output: '' };
}

/**
 * Clear MAC Address-Table
 */
function cmdClearMacAddressTable(_state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    const deviceId = ctx.sourceDeviceId;
    const deviceStates = ctx.deviceStates;
    const args = input.trim().split(/\s+/).slice(2); // Skip "clear mac address-table"

    if (deviceId && deviceStates) {
        if (args.length === 0 || args[0] === '') {
            // Clear all entries
            clearMacTable(deviceId, deviceStates);
        } else if (args[0] === 'dynamic') {
            // Clear only dynamic entries
            clearDynamicMacEntries(deviceId, deviceStates);
        } else if (args[0] === 'static') {
            // Clear only static entries
            clearStaticMacEntries(deviceId, deviceStates);
        }
    }

    return { success: true, output: '' };
}

/**
 * Clear Counters
 */
function cmdClearCounters(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    // Parse input to see if specific interface is mentioned
    const match = input.match(/clear\s+counters\s+(?:interface\s+)?(\S+)?/i);
    const interfaceName = match?.[1];

    const newState = JSON.parse(JSON.stringify(state));

    if (interfaceName) {
        // Clear counters for specific interface
        const port = newState.ports?.[interfaceName.toLowerCase()];
        if (!port) {
            return { success: false, error: `% Interface ${interfaceName} not found` };
        }
        // Reset statistics for this port
        port.statistics = {
            inputPackets: 0,
            outputPackets: 0,
            inputBytes: 0,
            outputBytes: 0,
            inputErrors: 0,
            outputErrors: 0,
            crcErrors: 0,
            collisions: 0,
            runts: 0,
            giants: 0,
            throttles: 0,
            resets: 1,
            drops: 0,
            overruns: 0,
            underruns: 0,
            lastCleared: Date.now()
        };
        return {
            success: true,
            output: `Clear "show interface" counters on interface ${interfaceName}\n`,
            newState
        };
    } else {
        // Clear counters for all interfaces
        Object.keys(newState.ports || {}).forEach(portName => {
            const port = newState.ports[portName];
            if (port) {
                port.statistics = {
                    inputPackets: 0,
                    outputPackets: 0,
                    inputBytes: 0,
                    outputBytes: 0,
                    inputErrors: 0,
                    outputErrors: 0,
                    crcErrors: 0,
                    collisions: 0,
                    runts: 0,
                    giants: 0,
                    throttles: 0,
                    resets: 1,
                    drops: 0,
                    overruns: 0,
                    underruns: 0,
                    lastCleared: Date.now()
                };
            }
        });
        return {
            success: true,
            output: 'Clear "show interface" counters on all interfaces\n',
            newState
        };
    }
}

/**
 * Undebug (alias for undebug all)
 */
function cmdUndebug(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return {
        success: true,
        output: 'All possible debugging has been turned off',
        newState: { debugs: {} }
    };
}

/**
 * Clock Set
 */
function cmdClockSet(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
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
            date: configuredDate.toISOString().slice(0, 10),
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
 * Help command
 */
function cmdHelp(_state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
    const lang = ctx?.language || 'en';
    const output = lang === 'tr'
        ? '\nYardım sistemi:\n  Komut tamamlama için TAB tuşunu kullanın\n  Komut yardımı için ? kullanın\n  Örnek: show ?\n'
        : '\nHelp system:\n  Use TAB for command completion\n  Use ? for command help\n  Example: show ?\n';
    return { success: true, output };
}

/**
 * Setup command
 */
function cmdSetup(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return {
        success: true,
        output: '\n--- System Configuration Dialog ---\n\nWould you like to enter the initial configuration dialog? [yes/no]: \n% Aborting setup.'
    };
}

/**
 * Test command
 */
function cmdTest(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% Diagnostic test completed successfully.\n' };
}

/**
 * More command
 */
function cmdMore(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% File display not supported in this version.\n' };
}

/**
 * Disconnect command
 */
function cmdDisconnect(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% No active sessions to disconnect.\n' };
}

/**
 * Resume command
 */
function cmdResume(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% No suspended sessions to resume.\n' };
}

/**
 * Suspend command
 */
function cmdSuspend(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '\n% Suspend not supported in this session.\n' };
}

/**
 * Copy TFTP command
 */
function cmdCopyTftp(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }
    const lang = ctx.language || 'en';
    const isRestore = /^copy\s+tftp/i.test(input.trim());

    // Extract URL part: either "tftp://ip/file" at end or after "tftp"
    let urlPart: string | undefined;
    const endMatch = input.match(/tftp:\/\/(\S+)$/i);
    const midMatch = input.match(/tftp:\/\/(\S+)\s+/i);
    const bareMatch = input.match(/tftp(:\/\/)?(\S+)?$/i);

    if (endMatch) {
        urlPart = endMatch[1];
    } else if (midMatch && isRestore) {
        urlPart = midMatch[1];
    } else if (bareMatch) {
        urlPart = bareMatch[2] || bareMatch[1];
    }

    if (!urlPart || urlPart === ':') {
        return { success: false, error: lang === 'tr'
            ? '% TFTP sunucu adresi belirtilmedi. Kullanım: copy running-config tftp://<sunucu>[/dosya]'
            : '% TFTP server address not specified. Use: copy running-config tftp://<server>[/filename]' };
    }

    // Split IP and optional filename
    const slashIndex = urlPart.indexOf('/');
    let targetIp: string;
    let filename: string;
    if (slashIndex >= 0) {
        targetIp = urlPart.substring(0, slashIndex);
        filename = urlPart.substring(slashIndex + 1);
    } else {
        targetIp = urlPart;
        filename = state.hostname ? `${state.hostname.toLowerCase()}-config` : 'router-config';
    }

    // Validate IP
    const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetIp);
    if (!isIp) {
        return { success: false, error: `% Invalid target address: ${targetIp}` };
    }

    // Verify target exists in topology and has FTP service enabled
    let targetDevice: CanvasDevice | undefined;
    if (Array.isArray(ctx.devices)) {
        targetDevice = ctx.devices.find((d: CanvasDevice) => d.ip === targetIp);
        if (!targetDevice) {
            return { success: false, error: `% Error opening tftp://${targetIp}/${filename} (Timed out)` };
        }
    }

    // Require FTP service enabled on target for backup
    if (!isRestore && !targetDevice?.services?.ftp?.enabled) {
        const errMsg = lang === 'tr'
            ? `% Hata: ${targetIp} üzerinde FTP servisi etkin değil.`
            : `% Error: FTP service is not enabled on ${targetIp}.`;
        return { success: false, error: errMsg };
    }

    // Store the backup file on the target device's FTP service
    if (!isRestore && typeof window !== 'undefined' && targetDevice) {
        try {
            const configContent = Array.isArray(state.runningConfig) ? state.runningConfig.join('\n') : '';
            const newFile = { name: filename, size: configContent.length || 4096, modifiedAt: new Date().toISOString() };
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                detail: {
                    deviceId: targetDevice.id,
                    config: {
                        services: {
                            ...(targetDevice.services || {}),
                            ftp: {
                                ...(targetDevice.services?.ftp || {}),
                                enabled: true,
                                files: [...((targetDevice.services?.ftp?.files || []).filter((f: { name: string }) => f.name !== filename)), newFile]
                            }
                        }
                    }
                }
            }));
        } catch (_e) {
            // Non-critical; backup still reported as OK
        }
    }

    const verb = isRestore
        ? (lang === 'tr' ? 'Yükleniyor' : 'Loading')
        : (lang === 'tr' ? 'Yazılıyor' : 'Writing');
    const source = isRestore ? `tftp://${targetIp}/${filename}` : 'running-config';
    const dest = isRestore ? 'running-config' : `tftp://${targetIp}/${filename}`;

    return {
        success: true,
        output: `\n${verb} ${source} to ${dest} ...\nBuilding configuration...\n[OK]\n`
    };
}

function cmdFtp(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: false, error: '% Unknown command or computer name' };
}

function cmdMail(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: false, error: '% Unknown command or computer name' };
}

/**
 * Copy Startup-Config Running-Config
 */
function cmdCopyStartupRunning(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return {
        success: true,
        output: 'Destination filename [running-config]?\n[OK]\n'
    };
}

/**
 * Clear Line
 */
function cmdClearLine(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '[confirm]\n' };
}

/**
 * Clear Interface
 */
function cmdClearInterface(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return { success: true, output: '[confirm]\n' };
}

/**
 * Delete VLAN database file
 */
function cmdDeleteVlanDat(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: iosModeError() };
    }

    // Check if this is a confirmation (skipConfirm is passed from useDeviceManager)
    if (ctx?.skipConfirm) {
        // Actually delete the VLANs
        const newPorts: Record<string, Port> = {};
        Object.entries(state.ports || {}).forEach(([portId, port]: [string, Port]) => {
            newPorts[portId] = {
                ...port,
                accessVlan: 1,
                vlan: 1,
                trunkAllowedVlans: '1-4094',
                nativeVlan: 1
            };
        });

        return {
            success: true,
            output: 'Delete filename [vlan.dat]? \nDeleting flash:vlan.dat...\n',
            newState: {
                vlans: {},
                ports: newPorts,
                runningConfig: undefined // Will be rebuilt
            }
        };
    }

    return {
        success: true,
        output: 'Delete filename [vlan.dat]?',
        requiresConfirmation: true,
        confirmationMessage: 'Delete vlan.dat? This will remove all VLAN database information.',
        confirmationAction: 'delete-vlan',
        deleteVlanDat: true
    };
}



