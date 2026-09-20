import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import { checkConnectivity, getWirelessDistance } from '../connectivity';
import { lineAllowsProtocol } from './lineCommands';
import type { PortSecurityViolation, TraversedPort } from '../connectivity/pathResolution/types';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState, CommandResult } from '../types';
import { getL3Hops } from '../routing';
import { isValidIPv4Format, resolveHostname } from '../dns';

let _seed = 42;
export function resetDeterministicRandomSeed(seed = 42): void {
    _seed = seed;
}

export function deterministicRandom(): number {
    _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
    return _seed / 0x7fffffff;
}

/**
 * Generate ping latencies proportional to WiFi distance.
 * Uses exponential curve: close = very fast, far = much slower (realistic WiFi behavior).
 * distance 0px → ~1ms, 450px (signal 1) → ~150ms, 549px → ~210ms
 */
export function generatePingLatencies(distance: number): { min: number; avg: number; max: number } {
    const jitter = (base: number, pct: number) =>
        Math.max(1, Math.round(base * (1 + (deterministicRandom() * 2 - 1) * pct)));

    // Exponential: base = e^(distance/130) scaled to 1ms at 0px, ~210ms at 549px
    const basePing = Math.exp(distance / 130);

    const min = jitter(basePing * 0.8, 0.08);
    const avg = jitter(basePing, 0.08);
    const max = jitter(basePing * 1.25, 0.08);

    return { min, avg: Math.max(min, avg), max: Math.max(avg, max) };
}

/**
 * Three probe times for a single traceroute hop, consistent with the path latency.
 * Wired hops stay at 1ms (<1 msec); wireless paths grow toward the destination RTT.
 * Only a bounded ±1ms jitter is applied so the timing reflects the actual link.
 */
export function formatHopTimes(base: number): string {
    const fmt = (ms: number) => ms <= 1 ? '<1' : String(ms);
    const t1 = Math.max(1, base);
    const t2 = Math.max(1, base + (deterministicRandom() > 0.5 ? 1 : 0));
    const t3 = Math.max(1, base + (deterministicRandom() > 0.5 ? 1 : 0));
    return `${fmt(t1)} msec ${fmt(t2)} msec ${fmt(t3)} msec`;
}

/**
 * Ping - Test connectivity
 */
export function cmdPing(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const vrfMatch = input.match(/\bvrf\s+(\S+)/i);
    const sourceMatch = input.match(/\bsource\s+(\S+)/i);
    const repeatMatch = input.match(/\brepeat\s+(\d+)/i);
    const timeoutMatch = input.match(/\btimeout\s+(\d+)/i);
    const sizeMatch = input.match(/\bsize\s+(\d+)/i);

    const vrf = vrfMatch?.[1];
    const source = sourceMatch?.[1];
    const count = repeatMatch?.[1] || '5';
    const timeout = timeoutMatch?.[1] || '2';
    const size = sizeMatch?.[1] || '56';

    // Extract target host by removing options
    let cleanInput = input
        .replace(/^ping\s+/i, '')
        .replace(/\bvrf\s+\S+/gi, '')
        .replace(/\bsource\s+\S+/gi, '')
        .replace(/\brepeat\s+\d+/gi, '')
        .replace(/\btimeout\s+\d+/gi, '')
        .replace(/\bsize\s+\d+/gi, '')
        .trim();

    const positionalTokens = cleanInput.split(/\s+/).filter(Boolean);
    const host = positionalTokens[0];

    if (!host) {
        return { success: false, error: "% Invalid input detected at '^' marker." };
    }

    // Positional fallback: ping <host> [size] [count]
    const finalSize = sizeMatch ? size : (positionalTokens[1] || size);
    const finalCount = repeatMatch ? count : (positionalTokens[2] || count);

    // If target looks like a dotted IPv4 (and is not purely a name), enforce octet range 0-255.
    if (/^[\d.]+$/.test(host) && host.split('.').length >= 2 && !isValidIPv4Format(host)) {
        return { success: false, error: `% Invalid host address: ${host}` };
    }

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

        // Create new deviceStates Map for updates
        const updatedDeviceStates = new Map<string, SwitchState>(ctx.deviceStates);

        // Handle port security violations - update state if needed
        if (connectivity.portSecurityViolations && connectivity.portSecurityViolations.length > 0) {
            connectivity.portSecurityViolations.forEach((violation: PortSecurityViolation) => {
                if (violation.action === 'shutdown') {
                    const deviceState = updatedDeviceStates.get(violation.deviceId);
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
                            updatedDeviceStates.set(violation.deviceId, {
                                ...deviceState,
                                ports: updatedPorts
                            });
                        }
                    }
                }
            });
        }

        // Update interface statistics for all traversed ports
        if (connectivity.traversedPorts && connectivity.traversedPorts.length > 0) {
            const numPackets = parseInt(finalCount, 10) || 5;
            const bytesPerPacket = parseInt(finalSize, 10) || 56;
            const totalBytes = numPackets * bytesPerPacket;

            connectivity.traversedPorts.forEach((traversed: TraversedPort) => {
                const deviceState = updatedDeviceStates.get(traversed.deviceId);
                if (deviceState) {
                    const updatedPorts = { ...deviceState.ports };
                    const port = updatedPorts[traversed.portId];
                    if (port) {
                        const stats = { ...port.statistics };
                        if (traversed.type === 'ingress') {
                            stats.inputPackets = (stats.inputPackets || 0) + numPackets;
                            stats.inputBytes = (stats.inputBytes || 0) + totalBytes;
                            stats.lastInput = Date.now();
                        } else {
                            stats.outputPackets = (stats.outputPackets || 0) + numPackets;
                            stats.outputBytes = (stats.outputBytes || 0) + totalBytes;
                            stats.lastOutput = Date.now();
                        }

                        updatedPorts[traversed.portId] = {
                            ...port,
                            statistics: stats
                        };
                        updatedDeviceStates.set(traversed.deviceId, {
                            ...deviceState,
                            ports: updatedPorts
                        });
                    }
                }
            });
        }

        // Add to global packet capture state
        dispatchCapturedPackets(connectivity.capturedPackets);

        if (connectivity.success) {
            let output = `\nType escape sequence to abort.\n`;
            output += `Sending ${finalCount}, ${finalSize}-byte ICMP Echos to ${host}, timeout is ${timeout} seconds:\n`;
            if (vrf) output += `VRF: ${vrf}\n`;
            if (source) output += `Packet sent with a source address of ${source}\n`;
            const debugLines: string[] = [];
            const devices = (ctx.devices || []) as CanvasDevice[];
            const sourceDevice = ctx.sourceDeviceId ? devices.find(d => d.id === ctx.sourceDeviceId) : undefined;
            const sourceIp = sourceDevice?.ip || '0.0.0.0';
            if (state.debugs?.['ip icmp'] || state.debugs?.['ip packet']) {
                debugLines.push(`*Mar  1 00:00:00.001: ICMP: echo request sent, src ${sourceIp}, dst ${host}`);
                debugLines.push(`*Mar  1 00:00:00.004: ICMP: echo reply rcvd, src ${host}, dst ${sourceIp}`);
            }
            if (state.debugs?.['ip nat'] || state.debugs?.['ip nat detailed']) {
                // Look for NAT translation entries on devices in the path
                const pathDeviceIds = connectivity.hopIds || [];
                for (const devId of pathDeviceIds) {
                    const devState = ctx.deviceStates?.get(devId);
                    if (!devState) continue;
                    const staticEntry = devState.natStaticTranslations?.find(
                        (t: { localIp: string; globalIp: string }) => t.localIp === sourceIp || t.globalIp === host || t.localIp === host
                    );
                    if (staticEntry) {
                        debugLines.push(`*Mar  1 00:00:00.002: NAT: s=${sourceIp}->${staticEntry.globalIp}, d=${host} [1]`);
                        debugLines.push(`*Mar  1 00:00:00.005: NAT*: s=${host}, d=${staticEntry.globalIp}->${staticEntry.localIp} [1]`);
                        break;
                    }
                    const dynEntry = devState.natTranslations?.find(
                        (t: { localIp: string; globalIp: string; remoteIp?: string }) => t.localIp === sourceIp
                    );
                    if (dynEntry) {
                        debugLines.push(`*Mar  1 00:00:00.002: NAT: s=${sourceIp}->${dynEntry.globalIp}, d=${host} [1]`);
                        debugLines.push(`*Mar  1 00:00:00.005: NAT*: s=${host}, d=${dynEntry.globalIp}->${dynEntry.localIp} [1]`);
                        break;
                    }
                }
            }
            if ((state.debugs?.['sw-vlan packet'] || state.debugs?.['vlan packet']) && connectivity.hops?.length) {
                debugLines.push(`*Mar  1 00:00:00.002: SW_VLAN-PACKET: frame forwarded across ${Math.max(0, connectivity.hops.length - 1)} hop(s)`);
            }
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
            // Build per-packet symbols: real nOS shows '!' per success, '.' per timeout, 'U' per unreachable
            const n = parseInt(count, 10) || 5;
            let packetLine = '';
            let successes = 0;

            for (let i = 0; i < n; i++) {
                packetLine += '!';
                successes++;
            }
            output += packetLine;
            const successRate = Math.round((successes / n) * 100);
            output += `\n\nSuccess rate is ${successRate} percent (${successes}/${n})`;
            if (successes > 0) {
                output += `, round-trip min/avg/max = ${fmtMs(pingResult.min)}/${fmtMs(pingResult.avg)}/${fmtMs(pingResult.max)} ms\n`;
            } else {
                output += '\n';
            }
            if (debugLines.length > 0) {
                output = `${debugLines.join('\n')}\n${output}`;
            }
            return { success: true, output, triggerPingAnimation: connectivity.targetId, deviceStates: updatedDeviceStates };
        } else {
            const n = parseInt(count, 10) || 5;
            const isUnreachable = connectivity?.error?.toLowerCase().includes('unreachable') ||
                connectivity?.hops?.length === 0;
            const packetSymbol = isUnreachable ? 'U' : '.';
            let packetLine = '';
            for (let i = 0; i < n; i++) {
                packetLine += packetSymbol;
            }
            let failOutput = `\nType escape sequence to abort.\nSending ${count}, ${size}-byte ICMP Echos to ${host}, timeout is 2 seconds:\n${packetLine}\n`;
            failOutput += `Success rate is 0 percent (0/${n})\n`;
            const dropReasonStr = connectivity?.error || 'Destination host unreachable.';
            failOutput += `Drop Reason: ${dropReasonStr}\n`;
            return {
                success: false,
                output: failOutput,
                error: dropReasonStr,
                deviceStates: updatedDeviceStates
            };
        }
    }

    return { success: false, error: '% Ping requires network context' };
}

/**
 * Telnet - Connect to remote device
 */
export function cmdTelnet(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    // Allow telnet from both user and privileged modes
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
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

        dispatchCapturedPackets(connectivity.capturedPackets);

        if (!connectivity.success) {
            return {
                success: false,
                output: `Trying ${host} ${port} ...`,
                error: connectivity.error || 'Destination host unreachable.'
            };
        }

        // Check target device configuration
        if (!connectivity.targetId) return { success: false, error: '% Target device not found' };
        const targetState = ctx.deviceStates?.get(connectivity.targetId);

        if (targetState) {
            const transportInput = targetState.security?.vtyLines?.transportInput || [];
            const isTelnetActive = lineAllowsProtocol(transportInput, 'telnet');

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
export function cmdSsh(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    // Allow ssh from both user and privileged modes
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^ssh\s+(-l\s+\S+\s+)?([0-9.]+|[\w.-]+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid ssh command. Use: ssh [-l username] host' };
    }

    const username = match[1] ? match[1].replace(/^-l\s+/, '') : undefined;
    const host = match[2];

    // Resolve hostname to show IP address
    let resolvedIp = host;
    if (!isValidIPv4Format(host)) {
        resolvedIp = resolveHostname(host, ctx.devices || [], ctx.deviceStates) || host;
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

        dispatchCapturedPackets(connectivity.capturedPackets);

        if (!connectivity.success) {
            return {
                success: false,
                output: `Connecting to ${host}...`,
                error: connectivity.error || 'Destination host unreachable.'
            };
        }

        // Check target device configuration
        const targetDeviceId = connectivity.targetId;
        const targetState = targetDeviceId ? ctx.deviceStates?.get(targetDeviceId) : undefined;

        if (targetState) {
            const transportInput = targetState.security?.vtyLines?.transportInput || [];
            const isSshActive = lineAllowsProtocol(transportInput, 'ssh');

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
 * Traceroute - Trace route to destination (Unix/Linux style)
 */
export function cmdTraceroute(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const numeric = /\bnumeric\b/i.test(input);
    const sourceMatch = input.match(/\bsource\s+(\S+)/i);
    const probeMatch = input.match(/\bprobe\s+(\d+)/i);
    const ttlMatch = input.match(/\bttl\s+(\d+)(?:\s+(\d+))?/i);

    const source = sourceMatch?.[1];
    const maxTtl = ttlMatch?.[2] || ttlMatch?.[1] || '30';

    let cleanInput = input
        .replace(/^traceroute(?:\s+ip)?\s+/i, '')
        .replace(/\bsource\s+\S+/gi, '')
        .replace(/\bnumeric\b/gi, '')
        .replace(/\btimeout\s+\d+/gi, '')
        .replace(/\bprobe\s+\d+/gi, '')
        .replace(/\bttl\s+\d+(\s+\d+)?/gi, '')
        .trim();

    const host = cleanInput.split(/\s+/).filter(Boolean)[0];
    if (!host) {
        return { success: false, error: "% Invalid input detected at '^' marker." };
    }

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

        // Create new deviceStates Map for updates
        const updatedDeviceStates = new Map<string, SwitchState>(ctx.deviceStates);

        // Update interface statistics for all traversed ports
        if (connectivity.traversedPorts && connectivity.traversedPorts.length > 0) {
            // traceroute sends 3 packets per hop by default
            const numPackets = probeMatch?.[1] ? parseInt(probeMatch[1], 10) : 3;
            const bytesPerPacket = 40; // approx
            const totalBytes = numPackets * bytesPerPacket;

            connectivity.traversedPorts.forEach(traversed => {
                const deviceState = updatedDeviceStates.get(traversed.deviceId);
                if (deviceState) {
                    const updatedPorts = { ...deviceState.ports };
                    const port = updatedPorts[traversed.portId];
                    if (port) {
                        const stats = { ...port.statistics };
                        if (traversed.type === 'ingress') {
                            stats.inputPackets = (stats.inputPackets || 0) + numPackets;
                            stats.inputBytes = (stats.inputBytes || 0) + totalBytes;
                            stats.lastInput = Date.now();
                        } else {
                            stats.outputPackets = (stats.outputPackets || 0) + numPackets;
                            stats.outputBytes = (stats.outputBytes || 0) + totalBytes;
                            stats.lastOutput = Date.now();
                        }

                        updatedPorts[traversed.portId] = {
                            ...port,
                            statistics: stats
                        };
                        updatedDeviceStates.set(traversed.deviceId, {
                            ...deviceState,
                            ports: updatedPorts
                        });
                    }
                }
            });
        }

        // Add to global packet capture state
        dispatchCapturedPackets(connectivity.capturedPackets);

        if (connectivity.success) {
            let resolvedIp = host;
            if (!isValidIPv4Format(host)) {
                // For external domains, we'll simulate the IP
                resolvedIp = resolveHostname(host, ctx.devices || [], ctx.deviceStates) || 'Unknown';
            }

            let output = `\nType escape sequence to abort.\n`;
            output += `Tracing the route to ${numeric ? resolvedIp : host} (${resolvedIp}), ${maxTtl} hops max, 40 byte packets\n`;
            if (source) output += `Source interface: ${source}\n`;

            // Use the L3 routing hops
            const l3Hops = getL3Hops(
                ctx.sourceDeviceId,
                resolvedIp,
                ctx.devices,
                ctx.connections || [],
                ctx.deviceStates
            );

            // Hop latency values consistent with ping: wired stays at <1ms,
            // wireless grows toward the destination RTT (distance-based).
            const trDevices = (ctx.devices || []) as CanvasDevice[];
            const trSourceDevice = ctx.sourceDeviceId ? trDevices.find(d => d.id === ctx.sourceDeviceId) : undefined;
            const trTargetDevice = connectivity.targetId ? trDevices.find(d => d.id === connectivity.targetId) : undefined;
            const trSrcDist = getWirelessDistance(trSourceDevice, trDevices, ctx.deviceStates);
            const trDstDist = getWirelessDistance(trTargetDevice, trDevices, ctx.deviceStates);
            const trSrcWired = trSrcDist === Infinity;
            const trDstWired = trDstDist === Infinity;
            const destLatency = trSrcWired && trDstWired
                ? 1
                : generatePingLatencies((trSrcWired ? 0 : trSrcDist) + (trDstWired ? 0 : trDstDist)).avg;

            if (l3Hops && l3Hops.length > 0) {
                const totalHops = l3Hops.length;
                for (let i = 0; i < totalHops; i++) {
                    const hop = l3Hops[i];
                    const progress = (i + 1) / totalHops;
                    const base = Math.max(1, Math.round(destLatency * progress));
                    const namePart = hop.name === hop.ip ? hop.ip : `${hop.name} (${hop.ip})`;
                    output += `  ${i + 1} ${namePart} ${formatHopTimes(base)}\n`;
                }
            } else {
                // Directly reachable destination (no enumerated L3 hops): single hop
                const base = Math.max(1, Math.round(destLatency));
                output += `  1 ${connectivity.targetId || '192.168.1.1'} ${formatHopTimes(base)}\n`;
            }

            output += `\nTrace complete.\n`;
            return { success: true, output, triggerPingAnimation: connectivity.targetId, deviceStates: updatedDeviceStates };
        } else {
            // For failed connections, still try to show resolved IP
            let resolvedIp = host;
            if (!isValidIPv4Format(host)) {
                resolvedIp = resolveHostname(host, ctx.devices || [], ctx.deviceStates) || 'Unknown';
            }

            let output = `\nType escape sequence to abort.\nTracing the route to ${host} (${resolvedIp})\n`;
            // Show unresponsive hops like real nOS
            for (let i = 1; i <= 3; i++) {
                output += `  ${i}  * * *\n`;
            }
            output += `\nTrace complete.\n`;
            return {
                success: false,
                output,
                error: connectivity.error || `Destination host unreachable.`,
                deviceStates: updatedDeviceStates
            };
        }
    }

    return { success: false, error: '% Traceroute requires network context' };
}

/**
 * Extended Ping TCP - Test TCP port connectivity
 * Syntax: ping tcp <host> [port <port>] [source <src-ip>] [repeat <n>]
 */
export function cmdPingTcp(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const hostMatch = input.match(/^ping\s+tcp\s+([0-9.]+|[\w.-]+)(?:\s+port\s+(\d+))?(?:\s+source\s+(\S+))?/i);
    if (!hostMatch) {
        return { success: false, error: "% Usage: ping tcp <host> [port <port>] [source <src-ip>] [repeat <n>]" };
    }

    const host = hostMatch[1];
    const port = hostMatch[2] || '80';
    const source = hostMatch[3];
    const repeatMatch = input.match(/repeat\s+(\d+)/i);
    const count = parseInt(repeatMatch?.[1] || '5', 10);

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
        dispatchCapturedPackets(connectivity.capturedPackets);

        const devices = ctx.devices as CanvasDevice[];
        const srcDev = devices.find(d => d.id === ctx.sourceDeviceId);
        const dstDev = connectivity.targetId ? devices.find(d => d.id === connectivity.targetId) : undefined;
        const srcDist = getWirelessDistance(srcDev, devices, ctx.deviceStates);
        const dstDist = getWirelessDistance(dstDev, devices, ctx.deviceStates);
        const latency = (srcDist === Infinity && dstDist === Infinity)
            ? { min: 1, avg: 1, max: 2 }
            : generatePingLatencies((srcDist === Infinity ? 0 : srcDist) + (dstDist === Infinity ? 0 : dstDist));
        const fmtMs = (ms: number) => ms <= 1 ? '<1' : String(ms);

        if (connectivity.success) {
            let output = `\nType escape sequence to abort.\n`;
            output += `Sending ${count} TCP SYN packets to ${host}:${port}, timeout is 2 seconds:\n`;
            if (source) output += `Packet sent with a source address of ${source}\n`;
            output += '!'.repeat(count);
            output += `\n\nSuccess rate is 100 percent (${count}/${count})`;
            output += `, round-trip min/avg/max = ${fmtMs(latency.min)}/${fmtMs(latency.avg)}/${fmtMs(latency.max)} ms\n`;
            return { success: true, output };
        } else {
            const sym = connectivity.error?.toLowerCase().includes('unreachable') ? 'U' : '.';
            let output = `\nType escape sequence to abort.\n`;
            output += `Sending ${count} TCP SYN packets to ${host}:${port}, timeout is 2 seconds:\n`;
            output += sym.repeat(count);
            output += `\n\nSuccess rate is 0 percent (0/${count})\n`;
            output += `% ${connectivity.error || 'Destination host unreachable.'}\n`;
            return { success: false, output };
        }
    }
    return { success: false, error: '% Ping TCP requires network context' };
}

/**
 * Extended Ping UDP - Test UDP port connectivity
 * Syntax: ping udp <host> [port <port>] [source <src-ip>] [repeat <n>]
 */
export function cmdPingUdp(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'user' && state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const hostMatch = input.match(/^ping\s+udp\s+([0-9.]+|[\w.-]+)(?:\s+port\s+(\d+))?(?:\s+source\s+(\S+))?/i);
    if (!hostMatch) {
        return { success: false, error: "% Usage: ping udp <host> [port <port>] [source <src-ip>] [repeat <n>]" };
    }

    const host = hostMatch[1];
    const port = hostMatch[2] || '53';
    const source = hostMatch[3];
    const repeatMatch = input.match(/repeat\s+(\d+)/i);
    const count = parseInt(repeatMatch?.[1] || '5', 10);

    if (ctx?.sourceDeviceId && Array.isArray(ctx.devices)) {
        const connectivity = checkConnectivity(
            ctx.sourceDeviceId,
            host,
            ctx.devices,
            ctx.connections || [],
            ctx.deviceStates,
            ctx.language,
            { protocol: 'udp', port }
        );
        dispatchCapturedPackets(connectivity.capturedPackets);

        const devices = ctx.devices as CanvasDevice[];
        const srcDev = devices.find(d => d.id === ctx.sourceDeviceId);
        const dstDev = connectivity.targetId ? devices.find(d => d.id === connectivity.targetId) : undefined;
        const srcDist = getWirelessDistance(srcDev, devices, ctx.deviceStates);
        const dstDist = getWirelessDistance(dstDev, devices, ctx.deviceStates);
        const latency = (srcDist === Infinity && dstDist === Infinity)
            ? { min: 1, avg: 1, max: 2 }
            : generatePingLatencies((srcDist === Infinity ? 0 : srcDist) + (dstDist === Infinity ? 0 : dstDist));
        const fmtMs = (ms: number) => ms <= 1 ? '<1' : String(ms);

        if (connectivity.success) {
            let output = `\nType escape sequence to abort.\n`;
            output += `Sending ${count} UDP packets to ${host}:${port}, timeout is 2 seconds:\n`;
            if (source) output += `Packet sent with a source address of ${source}\n`;
            output += '!'.repeat(count);
            output += `\n\nSuccess rate is 100 percent (${count}/${count})`;
            output += `, round-trip min/avg/max = ${fmtMs(latency.min)}/${fmtMs(latency.avg)}/${fmtMs(latency.max)} ms\n`;
            return { success: true, output };
        } else {
            const sym = connectivity.error?.toLowerCase().includes('unreachable') ? 'U' : '.';
            let output = `\nType escape sequence to abort.\n`;
            output += `Sending ${count} UDP packets to ${host}:${port}, timeout is 2 seconds:\n`;
            output += sym.repeat(count);
            output += `\n\nSuccess rate is 0 percent (0/${count})\n`;
            output += `% ${connectivity.error || 'Destination host unreachable.'}\n`;
            return { success: false, output };
        }
    }
    return { success: false, error: '% Ping UDP requires network context' };
}
