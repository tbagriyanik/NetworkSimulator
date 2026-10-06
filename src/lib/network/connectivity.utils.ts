import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { CableInfo, SwitchState } from './types';
import { ipToNumber } from './routing';
import { ensureDeviceStatesMap } from './networkUtils';
import { isCableCompatible } from './types';
import { normalizePortId } from './initialState';
import { normalizeMAC } from '@/lib/utils';

export function isIpInSubnet(ip: string, targetIp: string, subnet: string): boolean {
    try {
        const ipParts = ip.split('.').map(Number);
        const targetParts = targetIp.split('.').map(Number);
        const subnetParts = subnet.split('.').map(Number);

        for (let index = 0; index < 4; index++) {
            if ((ipParts[index] & subnetParts[index]) !== (targetParts[index] & subnetParts[index])) return false;
        }
        return true;
    } catch {
        return false;
    }
}

export function getPrimaryDeviceIp(
    deviceId: string,
    devices: CanvasDevice[],
    deviceStates?: Map<string, SwitchState>,
    preferIpv6: boolean = false,
    device?: CanvasDevice
): string {
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    const currentDevice = device || devices.find(candidate => candidate.id === deviceId);

    if (preferIpv6 && currentDevice?.ipv6) return currentDevice.ipv6;
    if (currentDevice?.ip) return currentDevice.ip;
    if (currentDevice?.ipv6) return currentDevice.ipv6;

    const state = safeDeviceStates.get(deviceId);
    if (!state) return '';

    for (const port of Object.values(state.ports)) {
        if (preferIpv6 && port.ipv6Address) return port.ipv6Address;
        if (port.ipAddress) return port.ipAddress;
        if (port.ipv6Address) return port.ipv6Address;
    }

    return '';
}

export function getSubnetForDeviceIp(
    deviceId: string,
    ip: string,
    devices: CanvasDevice[],
    deviceStates?: Map<string, SwitchState>,
    device?: CanvasDevice
): string {
    if (!ip) return '';

    const state = deviceStates?.get(deviceId);
    if (state) {
        for (const port of Object.values(state.ports)) {
            if (port.ipAddress === ip && port.subnetMask) return port.subnetMask;
        }
    }

    return (device || devices.find(candidate => candidate.id === deviceId))?.subnet || '';
}

export function isPortShutdown(
    deviceId: string,
    portId: string,
    devices: CanvasDevice[],
    deviceStates?: Map<string, SwitchState>,
    device?: CanvasDevice
): boolean {
    const normalizedPortId = normalizePortId(portId) || portId;
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);
    const state = safeDeviceStates.get(deviceId);
    if (state?.ports[normalizedPortId]) return state.ports[normalizedPortId].shutdown;

    const currentDevice = device || devices.find(candidate => candidate.id === deviceId);
    if (!currentDevice) return false;

    const port = currentDevice.ports.find(candidate =>
        candidate.id === portId || (normalizePortId(candidate.id) || candidate.id) === normalizedPortId
    );
    if (normalizedPortId === 'wlan0' && currentDevice.type === 'pc') return !currentDevice.wifi?.enabled;
    return port?.status === 'disabled';
}

export function isManagementIpSet(deviceId: string, deviceStates?: Map<string, SwitchState>): boolean {
    const state = ensureDeviceStatesMap(deviceStates).get(deviceId);
    return !!state && Object.values(state.ports).some(port => !!port.ipAddress);
}

export function isDevicePoweredOn(device: CanvasDevice | undefined): boolean {
    return !!device && device.status !== 'offline';
}

export function isConnectionCableCompatible(
    connection: CanvasConnection,
    sourceDevice?: CanvasDevice,
    targetDevice?: CanvasDevice
): boolean {
    if (!sourceDevice || !targetDevice) return true;

    const cable: CableInfo = {
        connected: true,
        cableType: connection.cableType,
        sourceDevice: sourceDevice.type,
        targetDevice: targetDevice.type,
        sourcePort: connection.sourceDeviceId === sourceDevice.id ? connection.sourcePort : connection.targetPort,
        targetPort: connection.sourceDeviceId === sourceDevice.id ? connection.targetPort : connection.sourcePort,
    };

    return isCableCompatible(cable);
}

export function matchIpWithWildcard(ip: string, ruleIp: string, wildcard: string): boolean {
    try {
        const mask = (~ipToNumber(wildcard)) >>> 0;
        return (ipToNumber(ip) & mask) === (ipToNumber(ruleIp) & mask);
    } catch {
        return false;
    }
}

export function getAllDeviceIps(
    device: CanvasDevice | undefined,
    state?: SwitchState
): string[] {
    if (!device) return [];
    const ips = new Set<string>();

    if (device.ip && device.ip.trim()) {
        const clean = device.ip.trim().toLowerCase();
        if (clean !== '0.0.0.0' && clean !== '255.255.255.255' && clean !== '127.0.0.1') {
            ips.add(clean);
        }
    }
    if (device.ipv6 && device.ipv6.trim()) {
        const clean = device.ipv6.trim().toLowerCase();
        if (clean !== '::' && clean !== '::1') {
            ips.add(clean);
        }
    }
    if (device.ports) {
        for (const p of device.ports) {
            if (p.ipAddress && p.ipAddress.trim()) {
                const clean = p.ipAddress.trim().toLowerCase();
                if (clean !== '0.0.0.0' && clean !== '255.255.255.255' && clean !== '127.0.0.1') {
                    ips.add(clean);
                }
            }
            if (p.ipv6Address && p.ipv6Address.trim()) {
                const clean = p.ipv6Address.trim().toLowerCase();
                if (clean !== '::' && clean !== '::1') {
                    ips.add(clean);
                }
            }
        }
    }
    if (state?.ports) {
        for (const p of Object.values(state.ports)) {
            if (p.ipAddress && p.ipAddress.trim()) {
                const clean = p.ipAddress.trim().toLowerCase();
                if (clean !== '0.0.0.0' && clean !== '255.255.255.255' && clean !== '127.0.0.1') {
                    ips.add(clean);
                }
            }
            if (p.ipv6Address && p.ipv6Address.trim()) {
                const clean = p.ipv6Address.trim().toLowerCase();
                if (clean !== '::' && clean !== '::1') {
                    ips.add(clean);
                }
            }
        }
    }
    return Array.from(ips);
}

export function getAllDeviceMacs(
    device: CanvasDevice | undefined,
    state?: SwitchState
): string[] {
    if (!device) return [];
    const macs = new Set<string>();

    const addIfValid = (raw?: string) => {
        if (!raw) return;
        const trimmed = raw.trim();
        if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'n/a') return;
        const hex = trimmed.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
        if (
            hex.length === 12 &&
            hex !== '000000000000' &&
            hex !== 'ffffffffffff' &&
            !hex.startsWith('0011000000') &&
            !hex.startsWith('0050000000') &&
            !hex.startsWith('00a0000000')
        ) {
            macs.add(normalizeMAC(trimmed));
        }
    };

    addIfValid(device.macAddress);
    addIfValid(state?.macAddress);

    if (device.ports) {
        for (const p of device.ports) {
            addIfValid(p.macAddress);
        }
    }
    if (state?.ports) {
        for (const p of Object.values(state.ports)) {
            addIfValid(p.macAddress);
        }
    }

    return Array.from(macs);
}

export function isFhrpVirtualIp(
    ip: string,
    safeDeviceStates: Map<string, SwitchState>
): boolean {
    const lower = ip.toLowerCase();
    for (const state of safeDeviceStates.values()) {
        for (const port of Object.values(state.ports || {})) {
            if (port.hsrp?.groups) {
                for (const g of Object.values(port.hsrp.groups)) {
                    if (g.virtualIp?.toLowerCase() === lower || g.ipv6VirtualIp?.toLowerCase() === lower) return true;
                }
            }
            if (port.vrrp?.groups) {
                for (const g of Object.values(port.vrrp.groups)) {
                    if (g.virtualIp?.toLowerCase() === lower) return true;
                }
            }
        }
    }
    return false;
}

export function isFhrpVirtualMac(
    mac: string,
    safeDeviceStates: Map<string, SwitchState>
): boolean {
    const norm = normalizeMAC(mac);
    for (const state of safeDeviceStates.values()) {
        for (const port of Object.values(state.ports || {})) {
            if (port.hsrp?.groups) {
                for (const g of Object.values(port.hsrp.groups)) {
                    if (g.virtualMac && normalizeMAC(g.virtualMac) === norm) return true;
                }
            }
            if (port.vrrp?.groups) {
                for (const g of Object.values(port.vrrp.groups)) {
                    if (g.virtualMac && normalizeMAC(g.virtualMac) === norm) return true;
                }
            }
        }
    }
    return false;
}

export interface AddressConflictResult {
    hasConflict: boolean;
    ipConflict: boolean;
    macConflict: boolean;
    conflictingIp?: string;
    conflictingMac?: string;
    conflictingDeviceId?: string;
    errorMessage?: string;
}

export function checkAddressConflicts(params: {
    sourceId: string;
    targetIp?: string;
    targetDeviceId?: string;
    devices: CanvasDevice[];
    safeDeviceStates: Map<string, SwitchState>;
    language?: 'tr' | 'en';
}): AddressConflictResult {
    const { sourceId, targetIp, targetDeviceId, devices, safeDeviceStates, language = 'tr' } = params;
    const isTr = language === 'tr';

    const sourceDevice = devices.find(d => d.id === sourceId);
    const targetDevice = targetDeviceId
        ? devices.find(d => d.id === targetDeviceId)
        : (targetIp ? devices.find(d => {
            if (d.type === 'cloud') return false;
            const ips = getAllDeviceIps(d, safeDeviceStates.get(d.id));
            return ips.includes(targetIp.toLowerCase());
        }) : undefined);

    if (!sourceDevice) {
        return { hasConflict: false, ipConflict: false, macConflict: false };
    }

    let ipConflict = false;
    let conflictingIp: string | undefined;
    let macConflict = false;
    let conflictingMac: string | undefined;
    let conflictingDeviceId: string | undefined;

    const sourceIps = getAllDeviceIps(sourceDevice, safeDeviceStates.get(sourceId));
    const sourceMacs = getAllDeviceMacs(sourceDevice, safeDeviceStates.get(sourceId));

    const targetIps = targetDevice ? getAllDeviceIps(targetDevice, safeDeviceStates.get(targetDevice.id)) : (targetIp ? [targetIp.toLowerCase()] : []);
    const targetMacs = targetDevice ? getAllDeviceMacs(targetDevice, safeDeviceStates.get(targetDevice.id)) : [];

    // 1. IP Conflict Checks:
    // Check if source device and target device have the same IP while being distinct devices
    if (targetDevice && sourceDevice.id !== targetDevice.id) {
        for (const sIp of sourceIps) {
            if (targetIps.includes(sIp) && !isFhrpVirtualIp(sIp, safeDeviceStates)) {
                ipConflict = true;
                conflictingIp = sIp;
                conflictingDeviceId = targetDevice.id;
                break;
            }
        }
    }

    // Check if target IP is claimed by multiple distinct devices in topology
    if (!ipConflict && targetIp && targetIp !== '127.0.0.1' && targetIp !== 'localhost' && !isFhrpVirtualIp(targetIp, safeDeviceStates)) {
        const devicesWithTargetIp = devices.filter(d => {
            if (d.type === 'cloud') return false;
            return getAllDeviceIps(d, safeDeviceStates.get(d.id)).includes(targetIp.toLowerCase());
        });
        if (devicesWithTargetIp.length > 1) {
            ipConflict = true;
            conflictingIp = targetIp;
            const other = devicesWithTargetIp.find(d => d.id !== sourceId);
            conflictingDeviceId = other?.id;
        }
    }

    // Check if source device's IP is duplicated by another device in topology
    if (!ipConflict) {
        for (const sIp of sourceIps) {
            if (sIp === '127.0.0.1' || isFhrpVirtualIp(sIp, safeDeviceStates)) continue;
            const devicesWithSourceIp = devices.filter(d => {
                if (d.type === 'cloud') return false;
                return getAllDeviceIps(d, safeDeviceStates.get(d.id)).includes(sIp);
            });
            if (devicesWithSourceIp.length > 1) {
                ipConflict = true;
                conflictingIp = sIp;
                const other = devicesWithSourceIp.find(d => d.id !== sourceId);
                conflictingDeviceId = other?.id;
                break;
            }
        }
    }

    // 2. MAC Conflict Checks:
    // Check if source and target have identical MAC address while being distinct devices
    if (targetDevice && sourceDevice.id !== targetDevice.id) {
        for (const sMac of sourceMacs) {
            if (targetMacs.includes(sMac) && !isFhrpVirtualMac(sMac, safeDeviceStates)) {
                macConflict = true;
                conflictingMac = sMac;
                conflictingDeviceId = conflictingDeviceId || targetDevice.id;
                break;
            }
        }
    }

    // Check if source MAC is duplicated by any other device on the network
    if (!macConflict) {
        for (const sMac of sourceMacs) {
            if (isFhrpVirtualMac(sMac, safeDeviceStates)) continue;
            const otherDevice = devices.find(d => {
                if (d.id === sourceDevice.id || d.type === 'cloud') return false;
                return getAllDeviceMacs(d, safeDeviceStates.get(d.id)).includes(sMac);
            });
            if (otherDevice) {
                macConflict = true;
                conflictingMac = sMac;
                conflictingDeviceId = conflictingDeviceId || otherDevice.id;
                break;
            }
        }
    }

    // Check if target MAC is duplicated by any other device on the network
    if (!macConflict && targetDevice) {
        for (const tMac of targetMacs) {
            if (isFhrpVirtualMac(tMac, safeDeviceStates)) continue;
            const otherDevice = devices.find(d => {
                if (d.id === targetDevice.id || d.type === 'cloud') return false;
                return getAllDeviceMacs(d, safeDeviceStates.get(d.id)).includes(tMac);
            });
            if (otherDevice) {
                macConflict = true;
                conflictingMac = tMac;
                conflictingDeviceId = conflictingDeviceId || otherDevice.id;
                break;
            }
        }
    }

    const hasConflict = ipConflict || macConflict;
    if (!hasConflict) {
        return { hasConflict: false, ipConflict: false, macConflict: false };
    }

    let errorMessage = '';
    if (ipConflict && macConflict) {
        errorMessage = isTr
            ? `IP ve MAC adresi çakışması tespit edildi! IP: (${conflictingIp}), MAC: (${conflictingMac}) ağda birden fazla cihazda tanımlı.`
            : `IP and MAC address conflict detected! IP: (${conflictingIp}), MAC: (${conflictingMac}) are assigned to multiple devices on the network.`;
    } else if (ipConflict) {
        errorMessage = isTr
            ? `IP adresi çakışması tespit edildi! (${conflictingIp}) adresi ağda birden fazla cihazda tanımlı.`
            : `IP address conflict detected! (${conflictingIp}) is assigned to multiple devices on the network.`;
    } else if (macConflict) {
        errorMessage = isTr
            ? `MAC adresi çakışması tespit edildi! (${conflictingMac}) adresi ağda birden fazla cihazda tanımlı.`
            : `MAC address conflict detected! (${conflictingMac}) is used by multiple devices on the network.`;
    }

    return {
        hasConflict: true,
        ipConflict,
        macConflict,
        conflictingIp,
        conflictingMac,
        conflictingDeviceId,
        errorMessage,
    };
}



