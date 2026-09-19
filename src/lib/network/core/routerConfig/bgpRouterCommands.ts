import { cliModeError } from '../cliErrors';
import type { CommandHandler } from '../commandTypes';
import type { SwitchState, CommandResult, BgpNeighbor } from '../../types';

/** Guard: command only valid inside BGP router-config mode. */
function requireBgp(state: SwitchState): CommandResult | null {
    if (state.routingProtocol !== 'bgp') {
        return { success: false, error: cliModeError() };
    }
    return null;
}

/** Merge a patch into an existing BGP neighbor (creating it when absent). */
function patchBgpNeighbor(
    state: SwitchState,
    neighborIp: string,
    patch: Partial<BgpNeighbor>
): { neighbors: BgpNeighbor[]; neighbor: BgpNeighbor } {
    const bgpNeighbors: BgpNeighbor[] = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find(n => n.ip === neighborIp);
    const neighbor: BgpNeighbor = {
        ip: neighborIp,
        as: existing?.as || '65000',
        ...existing,
        ...patch
    };
    const neighbors = [...bgpNeighbors.filter(n => n.ip !== neighborIp), neighbor];
    return { neighbors, neighbor };
}

export function cmdNeighborRemoteAs(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'bgp') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid neighbor command' };

    const [_, neighborIp, remoteAs] = match;
    const bgpNeighbors = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find((n: { ip: string }) => n.ip === neighborIp) || { ip: neighborIp, as: remoteAs };
    const updated = { ...existing, ip: neighborIp, as: remoteAs };
    const newNeighbors = [...bgpNeighbors.filter((n: { ip: string }) => n.ip !== neighborIp), updated];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} in AS ${remoteAs} configured`,
        newState: { bgpNeighbors: newNeighbors }
    };
}

export function cmdNoNeighborRemoteAs(state: SwitchState, input: string): CommandResult {
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)(?:\s+remote-as\s+\d+)?$/i);
    if (!match) return { success: false, error: '% Invalid no neighbor command' };

    const neighborIp = match[1];
    const bgpNeighbors = (state.bgpNeighbors || []).filter((n: { ip: string }) => n.ip !== neighborIp);

    return {
        success: true,
        newState: { bgpNeighbors }
    };
}

export function cmdNeighborRouteMap(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'bgp') return { success: false, error: cliModeError() };
    const match = input.match(/^neighbor\s+([0-9.]+)\s+route-map\s+(\S+)\s+(in|out)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> route-map <map> in|out' };

    const [_, neighborIp, mapName, dir] = match;
    const bgpNeighbors = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find((n: BgpNeighbor) => n.ip === neighborIp) || { ip: neighborIp, as: '65000' };
    const updated = {
        ...existing,
        [dir.toLowerCase() === 'in' ? 'routeMapIn' : 'routeMapOut']: mapName
    };
    const newNeighbors = [...bgpNeighbors.filter((n: BgpNeighbor) => n.ip !== neighborIp), updated];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} route-map ${mapName} ${dir} configured`,
        newState: { bgpNeighbors: newNeighbors }
    };
}

export function cmdNeighborWeight(state: SwitchState, input: string): CommandResult {
    if (state.routingProtocol !== 'bgp') return { success: false, error: cliModeError() };
    const match = input.match(/^neighbor\s+([0-9.]+)\s+weight\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> weight <value>' };

    const [_, neighborIp, weightStr] = match;
    const weight = parseInt(weightStr, 10);
    const bgpNeighbors = state.bgpNeighbors || [];
    const existing = bgpNeighbors.find((n: BgpNeighbor) => n.ip === neighborIp) || { ip: neighborIp, as: '65000' };
    const updated = { ...existing, weight };
    const newNeighbors = [...bgpNeighbors.filter((n: BgpNeighbor) => n.ip !== neighborIp), updated];

    return {
        success: true,
        output: `BGP neighbor ${neighborIp} weight set to ${weight}`,
        newState: { bgpNeighbors: newNeighbors }
    };
}

export function cmdBgpRouterId(_state: SwitchState, input: string): CommandResult {
    const match = input.match(/^bgp\s+router-id\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Incomplete command.' };
    const routerId = match[1];
    return {
        success: true,
        output: `BGP router-id set to ${routerId}`,
        newState: { routerId: routerId, routingProtocol: 'bgp' }
    };
}

export function cmdNeighborNextHopSelf(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+next-hop-self$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> next-hop-self' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { nextHopSelf: true });
    return { success: true, output: `BGP neighbor ${match[1]} next-hop-self enabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborNextHopSelf(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+next-hop-self$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { nextHopSelf: false });
    return { success: true, output: `BGP neighbor ${match[1]} next-hop-self disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborEbgpMultihop(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+ebgp-multihop(?:\s+(\d+))?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> ebgp-multihop [<hops>]' };
    const hops = match[2] ? parseInt(match[2], 10) : 2;
    const { neighbors } = patchBgpNeighbor(state, match[1], { ebgpMultihop: hops });
    return { success: true, output: `BGP neighbor ${match[1]} ebgp-multihop set to ${hops}`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborEbgpMultihop(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+ebgp-multihop$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { ebgpMultihop: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} ebgp-multihop removed`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborUpdateSource(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+update-source\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> update-source <interface>' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { updateSource: match[2] });
    return { success: true, output: `BGP neighbor ${match[1]} update-source ${match[2]} configured`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborUpdateSource(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+update-source$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { updateSource: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} update-source removed`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+timers\s+(\d+)\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> timers <keepalive> <holdtime>' };
    const keepalive = parseInt(match[2], 10);
    const holdtime = parseInt(match[3], 10);
    const { neighbors } = patchBgpNeighbor(state, match[1], { timersKeepalive: keepalive, timersHoldtime: holdtime });
    return { success: true, output: `BGP neighbor ${match[1]} timers updated (keepalive ${keepalive}s, holdtime ${holdtime}s)`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+timers$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { timersKeepalive: undefined, timersHoldtime: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} timers reset to defaults`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborPassword(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+password\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> password <password>' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { password: match[2] });
    return { success: true, output: `BGP neighbor ${match[1]} MD5 password configured`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborPassword(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+password$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { password: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} MD5 password removed`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborDescription(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+description\s+(.+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> description <text>' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { description: match[2].trim() });
    return { success: true, output: `BGP neighbor ${match[1]} description set`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborDescription(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+description$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { description: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} description removed`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborShutdown(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+shutdown$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> shutdown' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { shutdown: true });
    return { success: true, output: `BGP neighbor ${match[1]} administratively shut down`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborShutdown(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+shutdown$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { shutdown: false });
    return { success: true, output: `BGP neighbor ${match[1]} re-activated`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborDefaultOriginate(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+default-originate$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> default-originate' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { defaultOriginate: true });
    return { success: true, output: `BGP neighbor ${match[1]} default-originate enabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborDefaultOriginate(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+default-originate$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { defaultOriginate: false });
    return { success: true, output: `BGP neighbor ${match[1]} default-originate disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborRemovePrivateAs(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+remove-private-as$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> remove-private-as' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { removePrivateAs: true });
    return { success: true, output: `BGP neighbor ${match[1]} remove-private-as enabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborRemovePrivateAs(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+remove-private-as$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { removePrivateAs: false });
    return { success: true, output: `BGP neighbor ${match[1]} remove-private-as disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborMaximumPrefix(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+maximum-prefix\s+(\d+)(?:\s+(\d+))?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> maximum-prefix <limit> [<threshold>]' };
    const limit = parseInt(match[2], 10);
    const { neighbors } = patchBgpNeighbor(state, match[1], { maximumPrefix: limit });
    const threshold = match[3] ? ` (threshold ${match[3]}%)` : '';
    return { success: true, output: `BGP neighbor ${match[1]} maximum-prefix set to ${limit}${threshold}`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborMaximumPrefix(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+maximum-prefix$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { maximumPrefix: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} maximum-prefix removed`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborAllowAsIn(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+allowas-in(?:\s+(\d+))?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> allowas-in [<number>]' };
    const count = match[2] ? parseInt(match[2], 10) : 1;
    const { neighbors } = patchBgpNeighbor(state, match[1], { allowAsIn: count });
    return { success: true, output: `BGP neighbor ${match[1]} allowas-in enabled (${count})`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborAllowAsIn(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+allowas-in$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { allowAsIn: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} allowas-in disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborSendCommunity(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+send-community(?:\s+\w+)?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> send-community [both|standard|extended]' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { sendCommunity: true });
    return { success: true, output: `BGP neighbor ${match[1]} send-community enabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborSendCommunity(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+send-community$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { sendCommunity: false });
    return { success: true, output: `BGP neighbor ${match[1]} send-community disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborRouteReflectorClient(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+route-reflector-client$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> route-reflector-client' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { routeReflectorClient: true });
    return { success: true, output: `BGP neighbor ${match[1]} configured as route-reflector client`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborRouteReflectorClient(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+route-reflector-client$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { routeReflectorClient: false });
    return { success: true, output: `BGP neighbor ${match[1]} route-reflector client removed`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborAsOverride(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+as-override$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> as-override' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { asOverride: true });
    return { success: true, output: `BGP neighbor ${match[1]} as-override enabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborAsOverride(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+as-override$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { asOverride: false });
    return { success: true, output: `BGP neighbor ${match[1]} as-override disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNeighborSoftReconfig(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+soft-reconfiguration\s+inbound$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> soft-reconfiguration inbound' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { softReconfiguration: true });
    return { success: true, output: `BGP neighbor ${match[1]} soft-reconfiguration inbound enabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborSoftReconfig(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+soft-reconfiguration$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { softReconfiguration: false });
    return { success: true, output: `BGP neighbor ${match[1]} soft-reconfiguration disabled`, newState: { bgpNeighbors: neighbors } };
}

export function cmdAggregateAddress(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^aggregate-address\s+([0-9.]+)\s+([0-9.]+)(?:\s+summary-only)?$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: aggregate-address <network> <mask> [summary-only]' };
    const aggregates = state.bgpAggregateAddresses || [];
    if (aggregates.some(a => a.network === match[1] && a.mask === match[2])) {
        return { success: true, output: `Aggregate ${match[1]} ${match[2]} already configured`, newState: {} };
    }
    return {
        success: true,
        output: `Aggregate ${match[1]} ${match[2]} added`,
        newState: {
            bgpAggregateAddresses: [...aggregates, { network: match[1], mask: match[2], summaryOnly: !!match[3] }]
        }
    };
}

export function cmdNoAggregateAddress(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+aggregate-address\s+([0-9.]+)\s+([0-9.]+)/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: no aggregate-address <network> <mask>' };
    const aggregates = (state.bgpAggregateAddresses || []).filter(a => !(a.network === match[1] && a.mask === match[2]));
    return { success: true, output: `Aggregate ${match[1]} ${match[2]} removed`, newState: { bgpAggregateAddresses: aggregates } };
}

export function cmdMaximumPaths(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^maximum-paths\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: maximum-paths <number>' };
    const paths = parseInt(match[1], 10);
    return { success: true, output: `BGP maximum-paths set to ${paths}`, newState: { bgpMaximumPaths: paths } };
}

export function cmdNoMaximumPaths(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+maximum-paths/i);
    if (!match) return { success: false, error: '% Invalid command' };
    return { success: true, output: 'BGP maximum-paths reset to default (1)', newState: { bgpMaximumPaths: 1 } };
}

export function cmdBgpGracefulRestart(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP graceful-restart enabled', newState: { bgpGracefulRestart: true } };
}

export function cmdNoBgpGracefulRestart(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP graceful-restart disabled', newState: { bgpGracefulRestart: false } };
}

export function cmdBgpClusterId(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^bgp\s+cluster-id\s+([0-9.]+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: bgp cluster-id <id>' };
    return { success: true, output: `BGP cluster-id set to ${match[1]}`, newState: { bgpClusterId: match[1] } };
}

export function cmdNoBgpClusterId(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP cluster-id removed', newState: { bgpClusterId: undefined } };
}

export function cmdBgpSynchronization(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP synchronization enabled', newState: { bgpSynchronization: true } };
}

export function cmdNoBgpSynchronization(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP synchronization disabled', newState: { bgpSynchronization: false } };
}

export function cmdBgpTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^timers\s+bgp\s+(\d+)\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: timers bgp <keepalive> <holdtime>' };
    const keepalive = parseInt(match[1], 10);
    const holdtime = parseInt(match[2], 10);
    return {
        success: true,
        output: `BGP routing process timers updated (keepalive ${keepalive}s, holdtime ${holdtime}s)`,
        newState: { bgpTimers: { keepalive, holdtime } }
    };
}

export function cmdNoBgpTimers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP timers reset to defaults (60/180)', newState: { bgpTimers: undefined } };
}

export function cmdBgpDefaultLocalPref(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^bgp\s+default\s+local-preference\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: bgp default local-preference <1-4294967295>' };
    const value = parseInt(match[1], 10);
    if (value < 1 || value > 4294967295) return { success: false, error: '% Invalid local-preference value' };
    return { success: true, output: `BGP default local-preference set to ${value}`, newState: { bgpLocalPreference: value } };
}

export function cmdNoBgpDefaultLocalPref(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    void input;
    return { success: true, output: 'BGP default local-preference reset to 100', newState: { bgpLocalPreference: undefined } };
}

export function cmdNeighborMed(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^neighbor\s+([0-9.]+)\s+med\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid command. Usage: neighbor <ip> med <1-4294967295>' };
    const value = parseInt(match[2], 10);
    if (value < 1 || value > 4294967295) return { success: false, error: '% Invalid MED value' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { med: value });
    return { success: true, output: `BGP neighbor ${match[1]} MED set to ${value}`, newState: { bgpNeighbors: neighbors } };
}

export function cmdNoNeighborMed(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^no\s+neighbor\s+([0-9.]+)\s+med$/i);
    if (!match) return { success: false, error: '% Invalid command' };
    const { neighbors } = patchBgpNeighbor(state, match[1], { med: undefined });
    return { success: true, output: `BGP neighbor ${match[1]} MED reset`, newState: { bgpNeighbors: neighbors } };
}

export function cmdBgpConfederationIdentifier(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^bgp\s+confederation\s+identifier\s+(\d+)$/i);
    if (!match) return { success: false, error: '% Invalid BGP confederation identifier' };
    const confId = parseInt(match[1], 10);
    return {
        success: true,
        output: `BGP confederation identifier set to ${confId}`,
        newState: { bgpConfederationId: confId }
    };
}

export function cmdBgpConfederationPeers(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const match = input.match(/^bgp\s+confederation\s+peers\s+([0-9\s]+)$/i);
    if (!match) return { success: false, error: '% Invalid BGP confederation peers command' };
    const peers = match[1].trim().split(/\s+/).map(p => parseInt(p, 10)).filter(p => !isNaN(p));
    const currentPeers = [...(state.bgpConfederationPeers || [])];
    for (const p of peers) {
        if (!currentPeers.includes(p)) currentPeers.push(p);
    }
    return {
        success: true,
        output: `BGP confederation peers configured`,
        newState: { bgpConfederationPeers: currentPeers }
    };
}

export function cmdBgpAlwaysCompareMed(state: SwitchState, _input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    return {
        success: true,
        output: '',
        newState: { bgpAlwaysCompareMed: true }
    };
}

export function cmdNoBgpAlwaysCompareMed(state: SwitchState, _input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    return {
        success: true,
        output: '',
        newState: { bgpAlwaysCompareMed: false }
    };
}

export function cmdBgpBestpath(state: SwitchState, input: string): CommandResult {
    const err = requireBgp(state);
    if (err) return err;
    const currentConfig = { ...state.bgpBestpathConfig };
    if (/as-path\s+ignore/i.test(input)) {
        currentConfig.asPathIgnore = true;
    } else if (/compare-routerid/i.test(input)) {
        currentConfig.compareRouterId = true;
    }
    return {
        success: true,
        output: '',
        newState: { bgpBestpathConfig: currentConfig }
    };
}

export const bgpRouterHandlers: Record<string, CommandHandler> = {
    'neighbor remote-as': cmdNeighborRemoteAs,
    'neighbor route-map': cmdNeighborRouteMap,
    'neighbor weight': cmdNeighborWeight,
    'neighbor next-hop-self': cmdNeighborNextHopSelf,
    'neighbor ebgp-multihop': cmdNeighborEbgpMultihop,
    'neighbor update-source': cmdNeighborUpdateSource,
    'neighbor timers': cmdNeighborTimers,
    'neighbor password': cmdNeighborPassword,
    'neighbor description': cmdNeighborDescription,
    'neighbor shutdown': cmdNeighborShutdown,
    'neighbor default-originate': cmdNeighborDefaultOriginate,
    'neighbor remove-private-as': cmdNeighborRemovePrivateAs,
    'neighbor maximum-prefix': cmdNeighborMaximumPrefix,
    'neighbor allowas-in': cmdNeighborAllowAsIn,
    'neighbor send-community': cmdNeighborSendCommunity,
    'neighbor route-reflector-client': cmdNeighborRouteReflectorClient,
    'neighbor as-override': cmdNeighborAsOverride,
    'neighbor soft-reconfiguration': cmdNeighborSoftReconfig,
    'neighbor med': cmdNeighborMed,
    'no neighbor med': cmdNoNeighborMed,
    'no neighbor next-hop-self': cmdNoNeighborNextHopSelf,
    'no neighbor ebgp-multihop': cmdNoNeighborEbgpMultihop,
    'no neighbor update-source': cmdNoNeighborUpdateSource,
    'no neighbor timers': cmdNoNeighborTimers,
    'no neighbor password': cmdNoNeighborPassword,
    'no neighbor description': cmdNoNeighborDescription,
    'no neighbor shutdown': cmdNoNeighborShutdown,
    'no neighbor default-originate': cmdNoNeighborDefaultOriginate,
    'no neighbor remove-private-as': cmdNoNeighborRemovePrivateAs,
    'no neighbor maximum-prefix': cmdNoNeighborMaximumPrefix,
    'no neighbor allowas-in': cmdNoNeighborAllowAsIn,
    'no neighbor send-community': cmdNoNeighborSendCommunity,
    'no neighbor route-reflector-client': cmdNoNeighborRouteReflectorClient,
    'no neighbor as-override': cmdNoNeighborAsOverride,
    'no neighbor soft-reconfiguration': cmdNoNeighborSoftReconfig,
    'no neighbor remote-as': cmdNoNeighborRemoteAs,
    'no neighbor': cmdNoNeighborRemoteAs,
    'bgp router-id': cmdBgpRouterId,
    'aggregate-address': cmdAggregateAddress,
    'no aggregate-address': cmdNoAggregateAddress,
    'maximum-paths': cmdMaximumPaths,
    'no maximum-paths': cmdNoMaximumPaths,
    'bgp graceful-restart': cmdBgpGracefulRestart,
    'no bgp graceful-restart': cmdNoBgpGracefulRestart,
    'bgp cluster-id': cmdBgpClusterId,
    'no bgp cluster-id': cmdNoBgpClusterId,
    'bgp default local-preference': cmdBgpDefaultLocalPref,
    'no bgp default local-preference': cmdNoBgpDefaultLocalPref,
    'synchronization': cmdBgpSynchronization,
    'no synchronization': cmdNoBgpSynchronization,
    'timers bgp': cmdBgpTimers,
    'no timers bgp': cmdNoBgpTimers,
    'bgp confederation identifier': cmdBgpConfederationIdentifier,
    'bgp confederation peers': cmdBgpConfederationPeers,
    'bgp always-compare-med': cmdBgpAlwaysCompareMed,
    'no bgp always-compare-med': cmdNoBgpAlwaysCompareMed,
    'bgp bestpath': cmdBgpBestpath,
};
