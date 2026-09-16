import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { CableInfo, SwitchState } from './types';
import { ipToNumber } from './routing';
import { ensureDeviceStatesMap } from './networkUtils';
import { isCableCompatible } from './types';
import { normalizePortId } from './initialState';

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


