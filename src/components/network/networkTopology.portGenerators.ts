import { CanvasPort } from './networkTopology.types';

/** Generates standard L2 switch ports: 24x FastEthernet + 2x GigabitEthernet (no WLAN0 for L2) */
export function generateSwitchPorts(): CanvasPort[] {
    const ports: CanvasPort[] = [];
    for (let i = 1; i <= 24; i++) {
        ports.push({ id: `fa0/${i}`, label: `Fa0/${i}`, status: 'disconnected' as const });
    }
    ports.push({ id: 'console', label: 'Console', status: 'disconnected' as const });
    ports.push({ id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const });
    ports.push({ id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const });
    return ports;
}

/** Generates L3 switch ports: 24x GigabitEthernet1/0/x + 4x GigabitEthernet1/1/x + WLAN0 */
export function generateL3SwitchPorts(): CanvasPort[] {
    const ports: CanvasPort[] = [];
    for (let i = 1; i <= 24; i++) {
        ports.push({ id: `gi1/0/${i}`, label: `Gi1/0/${i}`, status: 'disconnected' as const });
    }
    ports.push({ id: 'console', label: 'Console', status: 'disconnected' as const });
    ports.push({ id: 'gi1/1/1', label: 'Gi1/1/1', status: 'disconnected' as const });
    ports.push({ id: 'gi1/1/2', label: 'Gi1/1/2', status: 'disconnected' as const });
    ports.push({ id: 'gi1/1/3', label: 'Gi1/1/3', status: 'disconnected' as const });
    ports.push({ id: 'gi1/1/4', label: 'Gi1/1/4', status: 'disconnected' as const });
    ports.push({ id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, shutdown: true });
    return ports;
}

/** Generates WLC ports: 4x GigabitEthernet + Service + Console */
export function generateWLCPorts(): CanvasPort[] {
    return [
        { id: 'console', label: 'Console', status: 'disconnected' as const },
        { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const },
        { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const },
        { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const },
        { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const },
        { id: 'service', label: 'Service', status: 'disconnected' as const },
    ];
}

/** Generates router ports: 4x GigabitEthernet + WLAN0 with per-port MAC addresses */
export function generateRouterPorts(): CanvasPort[] {
    // Generate base MAC for router ports
    const formatMacFromNumber = (value: number): string => {
        const base = value.toString(16).padStart(12, '0').toUpperCase();
        return `${base.slice(0, 4)}.${base.slice(4, 8)}.${base.slice(8, 12)}`;
    };
    const baseMacNumber = 0x005000000000; // Router base MAC range

    return [
        { id: 'console', label: 'Console', status: 'disconnected' as const },
        { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber) },
        { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 1) },
        { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 2) },
        { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 3) },
        { id: 's0/0/0', label: 'S0/0/0', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 5) },
        { id: 's0/1/0', label: 'S0/1/0', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 6) },
        { id: 's0/2/0', label: 'S0/2/0', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 7) },
        { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, shutdown: true },
    ];
}

/** Generates PC / Laptop ports: Eth0 + Console + WLAN0 */
export function generatePCPorts(): CanvasPort[] {
    return [
        { id: 'eth0', label: 'Eth0', status: 'disconnected' as const },
        { id: 'console', label: 'Console', status: 'disconnected' as const },
        { id: 'wlan0', label: 'WLAN0', status: 'disconnected' as const, shutdown: true },
    ];
}

/** Generates classic 8-port hub ports: 8x FastEthernet fa0/1 - fa0/8 */
export function generateHubPorts(): CanvasPort[] {
    const ports: CanvasPort[] = [];
    for (let i = 1; i <= 8; i++) {
        ports.push({ id: `fa0/${i}`, label: `Fa0/${i}`, status: 'disconnected' as const });
    }
    return ports;
}

/** Generates firewall ports: Gi0/0 (Outside), Gi0/1 (Inside), Gi0/2 (DMZ), Gi0/3 (MGMT) */
export function generateFirewallPorts(): CanvasPort[] {
    const formatMacFromNumber = (value: number): string => {
        const base = value.toString(16).padStart(12, '0').toUpperCase();
        return `${base.slice(0, 4)}.${base.slice(4, 8)}.${base.slice(8, 12)}`;
    };
    const baseMacNumber = 0x005000000000;
    return [
        { id: 'gi0/0', label: 'Gi0/0', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber) },
        { id: 'gi0/1', label: 'Gi0/1', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 1) },
        { id: 'gi0/2', label: 'Gi0/2', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 2) },
        { id: 'gi0/3', label: 'Gi0/3', status: 'disconnected' as const, macAddress: formatMacFromNumber(baseMacNumber + 3) },
    ];
}
