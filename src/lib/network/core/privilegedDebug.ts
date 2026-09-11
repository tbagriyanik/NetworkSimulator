import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

/**
 * Debug - Enable debugging
 */
export function cmdDebug(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^debug\s+(.+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid debug command' };
    }

    const debugType = match[1].toLowerCase();
    const newDebugs = { ...state.debugs };
    newDebugs[debugType] = true;

    let output = `${debugType} debugging is on\n`;

    // Realistic debug output for common debug types
    const lower = debugType.toLowerCase();
    if (lower === 'ip routing' || lower === 'ip routing table') {
        output += `\nRT: adding route 0.0.0.0/0 via ${state.ip || '192.168.1.1'}, ${Object.keys(state.ports || {}).find(p => state.ports?.[p]?.ipAddress) || 'gi0/0'}\n`;
        output += `RT: interface gi0/0 joined routing domain, routes updated\n`;
        output += `RT: add 10.0.0.0/8 via 10.0.0.1, gi0/1, connected, [0/0]\n`;
        output += `RT: add ${state.ip || '192.168.1.0'}/24 via ${state.ip || '192.168.1.1'}, gi0/0, connected, [0/0]\n`;
        if (state.dynamicRoutes && state.dynamicRoutes.length > 0) {
            state.dynamicRoutes.slice(0, 3).forEach(r => {
                output += `RT: add ${r.destination} via ${r.nextHop || 'directly connected'}, ${r.interface || 'gi0/0'}, ${r.type || 'dynamic'}, [110/2]\n`;
            });
        }
        output += `\n%OSPF-5-ADJCHG: Process 1, Nbr 10.0.0.1 on gi0/1 from LOADING to FULL, Loading Done\n`;
        output += `ip routing debugging is on\n`;
    } else if (lower === 'ip ospf' || lower === 'ip ospf events') {
        output += `\nOSPF: Rcv hello from 10.0.0.1 area 0 from gi0/1\n`;
        output += `OSPF: End of hello processing\n`;
        output += `OSPF: Send hello to 224.0.0.5 area 0 on gi0/1\n`;
        output += `OSPF: Rcv hello from 10.0.0.2 area 0 from gi0/0\n`;
        output += `OSPF: 2 Way Communication to 10.0.0.2 on gi0/0, state 2WAY\n`;
        output += `OSPF: Send hello to 224.0.0.5 area 0 on gi0/0\n`;
        output += `OSPF: Neighbor change event on interface gi0/1\n`;
        output += `OSPF: DR/BDR election on gi0/1\n`;
        output += `OSPF: Elect BDR 10.0.0.1\n`;
        output += `OSPF: Elect DR 10.0.0.2\n`;
        output += `OSPF: End of hello processing\n`;
        output += `\n%OSPF-5-ADJCHG: Process 1, Nbr 10.0.0.1 on gi0/1 from LOADING to FULL, Loading Done\n`;
        output += `ip ospf events debugging is on\n`;
    } else if (lower === 'ip ospf adj') {
        output += `\nOSPF: Rcv DBD from 10.0.0.1 on gi0/1 seq 0x1A2B opt 0x52 flag 0x7 len 32\n`;
        output += `OSPF: Rcv DBD from 10.0.0.2 on gi0/0 seq 0x1A2C opt 0x52 flag 0x1 len 32\n`;
        output += `OSPF: Send DBD to 10.0.0.1 on gi0/1 seq 0x1A2D opt 0x52 flag 0x0 len 32\n`;
        output += `OSPF: Nbr 10.0.0.1 has state 0x8 (FULL), neighbor state changed\n`;
        output += `ip ospf adj debugging is on\n`;
    } else if (lower === 'ip packet') {
        const configuredPorts = Object.values(state.ports || {}).filter(p => p.ipAddress && !p.shutdown);
        if (configuredPorts.length >= 2) {
            const p1 = configuredPorts[0];
            const p2 = configuredPorts[1];
            const net1 = p1.ipAddress?.replace(/\.\d+$/, '.100');
            const net2 = p2.ipAddress?.replace(/\.\d+$/, '.50');
            output += `\nIP: s=${net1} (${p1.name || p1.id}) d=${p2.ipAddress} (${p2.name || p2.id}) len 100, rcvd 3\n`;
            output += `IP: s=${p1.ipAddress} (${p1.name || p1.id}) d=${net2} (${p2.name || p2.id}) len 40, forward\n`;
        } else if (configuredPorts.length === 1) {
            const p1 = configuredPorts[0];
            const net1 = p1.ipAddress?.replace(/\.\d+$/, '.100');
            output += `\nIP: s=${net1} (${p1.name || p1.id}) d=${p1.ipAddress} (${p1.name || p1.id}) len 84, rcvd 3\n`;
            output += `IP: s=${p1.ipAddress} (${p1.name || p1.id}) d=8.8.8.8 (${p1.name || p1.id}) len 40, forward\n`;
        } else {
            output += `\nIP: s=10.0.0.1 (gi0/1) d=192.168.1.100 (gi0/0) len 100, rcvd 3\n`;
            output += `IP: s=192.168.1.100 (gi0/0) d=8.8.8.8 (gi0/1) len 40, forward\n`;
        }
        output += `ip packet debugging is on\n`;
    } else if (lower === 'ip nat' || lower === 'ip nat detailed') {
        const insideIf = Object.keys(state.ports || {}).find(p => state.ports?.[p]?.natSide === 'inside') || 'gi0/0';
        const outsideIf = Object.keys(state.ports || {}).find(p => state.ports?.[p]?.natSide === 'outside') || 'gi0/1';
        const staticEntries = state.natStaticTranslations || [];
        const dynamicEntries = state.natTranslations || [];

        output += `\n`;
        if (staticEntries.length === 0 && dynamicEntries.length === 0) {
            output += `NAT: No translations configured — configure NAT and run ping to see events\n`;
        } else {
            staticEntries.slice(0, 2).forEach((t, i) => {
                const seq = i + 1;
                output += `*Mar  1 00:00:0${seq}.00${seq}: NAT: s=${t.localIp}->${t.globalIp}, d=203.0.113.100 [${seq * 10}]\n`;
                if (lower === 'ip nat detailed') {
                    output += `*Mar  1 00:00:0${seq}.00${seq + 1}: NAT: i=${insideIf} [${seq * 10}], o=${outsideIf}, protocol=icmp\n`;
                }
                output += `*Mar  1 00:00:0${seq}.00${seq + 2}: NAT*: s=203.0.113.100, d=${t.globalIp}->${t.localIp} [${seq * 10}]\n`;
            });
            dynamicEntries.slice(0, 2).forEach((t, i) => {
                const seq = staticEntries.length + i + 1;
                const dstIp = '203.0.113.100';
                output += `*Mar  1 00:00:0${seq}.001: NAT: s=${t.localIp}:${t.localPort || 1024}->${t.globalIp}:${t.globalPort || 1024}, d=${dstIp} [${seq * 10}]\n`;
                if (lower === 'ip nat detailed') {
                    output += `*Mar  1 00:00:0${seq}.002: NAT: i=${insideIf} [${seq * 10}], o=${outsideIf}, protocol=${t.protocol || 'icmp'}\n`;
                }
                output += `*Mar  1 00:00:0${seq}.003: NAT*: s=${dstIp}, d=${t.globalIp}:${t.globalPort || 1024}->${t.localIp}:${t.localPort || 1024} [${seq * 10}]\n`;
            });
            output += `\n(Subsequent translations will appear automatically when ping is executed)\n`;
        }
    }

    return {
        success: true,
        output,
        newState: { debugs: newDebugs }
    };
}

/**
 * Undebug All
 */
export function cmdUndebugAll(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    return {
        success: true,
        output: 'All possible debugging has been turned off',
        newState: { debugs: {} }
    };
}

/**
 * Undebug (alias for undebug all)
 */
export function cmdUndebug(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return {
        success: true,
        output: 'All possible debugging has been turned off',
        newState: { debugs: {} }
    };
}