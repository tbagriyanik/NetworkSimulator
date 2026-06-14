'use client';
import { iosModeError } from './iosErrors';

import type { CommandHandler } from './commandTypes';
import { buildRunningConfig } from './configBuilder';

// ── DHCP Pool sub-command handlers ──────────────────────────────────────────

export function cmdDhcpNetwork(state: any, input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') {
        return { success: false, error: iosModeError() };
    }
    const match = input.match(/^network\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)$/i);
    if (!match) {
        return { success: false, error: '% Invalid network command' };
    }
    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    pools[poolName] = { ...(pools[poolName] || {}), network: match[1], subnetMask: match[2] };

    // Sync with services.dhcp.pools for PC DHCP functionality
    const services = { ...state.services };
    if (!services.dhcp) services.dhcp = { enabled: true, pools: [] };
    const existingServicePool = services.dhcp.pools?.find((p: any) => p.poolName === poolName);
    if (existingServicePool) {
        existingServicePool.subnetMask = match[2];
        // Calculate start IP from network
        const networkParts = match[1].split('.');
        existingServicePool.startIp = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.100`;
    } else {
        const networkParts = match[1].split('.');
        services.dhcp.pools = services.dhcp.pools || [];
        services.dhcp.pools.push({
            poolName,
            subnetMask: match[2],
            startIp: `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.100`,
            defaultGateway: pools[poolName].defaultRouter || match[1].replace(/\d+$/, '1'),
            dnsServer: pools[poolName].dnsServer || '8.8.8.8',
            maxUsers: 50
        });
    }

    const updatedState = { ...state, dhcpPools: pools, services };
    return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

function cmdDhcpDefaultRouter(state: any, input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') {
        return { success: false, error: iosModeError() };
    }
    const match = input.match(/^default-router\s+(.+)$/i);
    if (!match) return { success: false, error: '% Invalid default-router command' };

    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const primaryGw = match[1].trim().split(/\s+/)[0];
    const pools = { ...(state.dhcpPools || {}) };
    pools[poolName] = { ...(pools[poolName] || {}), defaultRouter: primaryGw };

    // Sync with services.dhcp.pools
    const services = { ...state.services };
    if (!services.dhcp) services.dhcp = { enabled: true, pools: [] };
    const existingServicePool = services.dhcp.pools?.find((p: any) => p.poolName === poolName);
    if (existingServicePool) {
        existingServicePool.defaultGateway = primaryGw;
    }

    const updatedState = { ...state, dhcpPools: pools, services };
    return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

function cmdDhcpDnsServer(state: any, input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') {
        return { success: false, error: iosModeError() };
    }
    const match = input.match(/^dns-server\s+(.+)$/i);
    if (!match) return { success: false, error: '% Invalid dns-server command' };

    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const primaryDns = match[1].trim().split(/\s+/)[0];
    const pools = { ...(state.dhcpPools || {}) };
    pools[poolName] = { ...(pools[poolName] || {}), dnsServer: primaryDns };

    // Sync with services.dhcp.pools
    const services = { ...state.services };
    if (!services.dhcp) services.dhcp = { enabled: true, pools: [] };
    const existingServicePool = services.dhcp.pools?.find((p: any) => p.poolName === poolName);
    if (existingServicePool) {
        existingServicePool.dnsServer = primaryDns;
    }

    const updatedState = { ...state, dhcpPools: pools, services };
    return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

function cmdDhcpLease(state: any, input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') {
        return { success: false, error: iosModeError() };
    }
    const match = input.match(/^lease\s+(.+)$/i);
    if (!match) return { success: false, error: '% Invalid lease command' };

    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    pools[poolName] = { ...(pools[poolName] || {}), leaseTime: match[1].trim() };

    const updatedState = { ...state, dhcpPools: pools };
    return { success: true, newState: { dhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

function cmdDhcpDomainName(state: any, input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') {
        return { success: false, error: iosModeError() };
    }
    const match = input.match(/^domain-name\s+(\S+)$/i);
    if (!match) return { success: false, error: '% Invalid domain-name command' };

    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    pools[poolName] = { ...(pools[poolName] || {}), domainName: match[1] };

    const updatedState = { ...state, dhcpPools: pools };
    return { success: true, newState: { dhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

function cmdIpv6DhcpAddressPrefix(state: any, input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') {
        return { success: false, error: iosModeError() };
    }
    const match = input.match(/^address\s+prefix\s+([0-9a-fA-F:]+\/\d+)$/i);
    if (!match) return { success: false, error: '% Invalid address prefix command' };

    const poolName = state.currentIpv6DhcpPool;
    if (!poolName) return { success: false, error: '% No active IPv6 DHCP pool' };

    const pools = { ...(state.ipv6DhcpPools || {}) };
    pools[poolName] = { ...(pools[poolName] || {}), addressPrefix: match[1] };

    const updatedState = { ...state, ipv6DhcpPools: pools };
    return { success: true, newState: { ipv6DhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

export const dhcpConfigHandlers: Record<string, CommandHandler> = {
    'network': cmdDhcpNetwork,
    'dhcp-config network': cmdDhcpNetwork,
    'default-router': cmdDhcpDefaultRouter,
    'dns-server': cmdDhcpDnsServer,
    'lease': cmdDhcpLease,
    'domain-name': cmdDhcpDomainName,
    'address prefix': cmdIpv6DhcpAddressPrefix,
    'no network': cmdNoDhcpNetwork,
    'no default-router': cmdNoDhcpDefaultRouter,
    'no dns-server': cmdNoDhcpDnsServer,
    'no domain-name': cmdNoDhcpDomainName,
    'no address prefix': cmdNoIpv6DhcpAddressPrefix,
};

/**
 * no network - Remove network from DHCP pool
 */
function cmdNoDhcpNetwork(state: any, _input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') return { success: false, error: iosModeError() };
    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    if (pools[poolName]) {
        delete pools[poolName].network;
        delete pools[poolName].subnetMask;
    }

    const services = { ...state.services };
    if (services.dhcp && services.dhcp.pools) {
        const p = services.dhcp.pools.find((pool: any) => pool.poolName === poolName);
        if (p) {
            delete p.subnetMask;
            delete p.startIp;
        }
    }

    const updatedState = { ...state, dhcpPools: pools, services };
    return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * no default-router
 */
function cmdNoDhcpDefaultRouter(state: any, _input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') return { success: false, error: iosModeError() };
    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    if (pools[poolName]) delete pools[poolName].defaultRouter;

    const services = { ...state.services };
    if (services.dhcp && services.dhcp.pools) {
        const p = services.dhcp.pools.find((pool: any) => pool.poolName === poolName);
        if (p) delete p.defaultGateway;
    }

    const updatedState = { ...state, dhcpPools: pools, services };
    return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * no dns-server
 */
function cmdNoDhcpDnsServer(state: any, _input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') return { success: false, error: iosModeError() };
    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    if (pools[poolName]) delete pools[poolName].dnsServer;

    const services = { ...state.services };
    if (services.dhcp && services.dhcp.pools) {
        const p = services.dhcp.pools.find((pool: any) => pool.poolName === poolName);
        if (p) delete p.dnsServer;
    }

    const updatedState = { ...state, dhcpPools: pools, services };
    return { success: true, newState: { dhcpPools: pools, services, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * no domain-name
 */
function cmdNoDhcpDomainName(state: any, _input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') return { success: false, error: iosModeError() };
    const poolName = state.currentDhcpPool;
    if (!poolName) return { success: false, error: '% No active DHCP pool' };

    const pools = { ...(state.dhcpPools || {}) };
    if (pools[poolName]) delete pools[poolName].domainName;

    const updatedState = { ...state, dhcpPools: pools };
    return { success: true, newState: { dhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}

/**
 * no address prefix
 */
function cmdNoIpv6DhcpAddressPrefix(state: any, _input: string, _ctx: any): any {
    if (state.currentMode !== 'dhcp-config') return { success: false, error: iosModeError() };
    const poolName = state.currentIpv6DhcpPool;
    if (!poolName) return { success: false, error: '% No active IPv6 DHCP pool' };

    const pools = { ...(state.ipv6DhcpPools || {}) };
    if (pools[poolName]) delete pools[poolName].addressPrefix;

    const updatedState = { ...state, ipv6DhcpPools: pools };
    return { success: true, newState: { ipv6DhcpPools: pools, runningConfig: buildRunningConfig(updatedState) } };
}
