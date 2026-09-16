import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';

export interface HopPacketInfo {
    hopIndex: number;
    fromDevice: { id: string; name: string; type: string; ip: string; mac: string };
    toDevice: { id: string; name: string; type: string; ip: string; mac: string };
    cableType: string;
    srcMac: string;
    dstMac: string;
    etherType: string;
    srcIp: string;
    dstIp: string;
    ttl: number;
    protocol: string;
    icmpType: string;
    icmpCode: number;
    icmpSeq: number;
    layer2: string;
    layer3: string;
    layer4: string;
    actionDescription?: string;
}

export function generateActionDescription(fromDev: CanvasDevice | undefined, toDev: CanvasDevice | undefined, hopIndex: number, pathLength: number): string {
    if (!fromDev || !toDev) return '';

    const isFirstHop = hopIndex === 0;
    const isLastHop = hopIndex === pathLength - 2;

    if (fromDev.type === 'pc' || fromDev.type === 'iot') {
        if (isFirstHop) return 'Encapsulating ICMP Echo Request and sending to default gateway.';
        return 'Forwarding frame to next hop.';
    }

    if (fromDev.type.startsWith('switch')) {
        if (toDev.type === 'pc' || toDev.type === 'iot') return `Switching frame to target port for ${toDev.name}.`;
        return 'Switching frame at Layer 2 based on MAC table.';
    }

    if (fromDev.type === 'router') {
        if (isLastHop) return `Routing packet to destination network for ${toDev.name}.`;
        return 'Routing packet at Layer 3 (TTL decremented).';
    }

    return 'Forwarding network traffic.';
}

export function buildHopPacketInfos(
    path: string[],
    devices: CanvasDevice[],
    connections: CanvasConnection[],
    targetIp?: string,
    initialTTL = 64
): HopPacketInfo[] {
    if (path.length < 2) return [];

    const targetDevice = devices.find(d => d.id === path[path.length - 1]);
    const originalDstIp = targetDevice?.ip || targetDevice?.ipv6 || '0.0.0.0';

    const isIPv6 = (targetIp && targetIp.includes(':')) || originalDstIp.includes(':');

    const getMac = (device: CanvasDevice | undefined, fallback: string): string => {
        if (!device) return fallback;
        if (device.macAddress) return device.macAddress;
        const hash = device.id.replace(/[^a-f0-9]/gi, '').padEnd(12, '0').slice(0, 12);
        return `${hash.slice(0, 2)}:${hash.slice(2, 4)}:${hash.slice(4, 6)}:${hash.slice(6, 8)}:${hash.slice(8, 10)}:${hash.slice(10, 12)}`.toUpperCase();
    };

    // Check if two devices are connected via wireless
    const isWirelessConnection = (fromId: string, toId: string): boolean => {
        const fromDev = devices.find(d => d.id === fromId);
        const toDev = devices.find(d => d.id === toId);

        if (!fromDev || !toDev) return false;

        const conn = connections.find(c =>
            (c.sourceDeviceId === fromId && c.targetDeviceId === toId) ||
            (c.sourceDeviceId === toId && c.targetDeviceId === fromId)
        );

        if (conn) {
            return conn.cableType === 'wireless';
        }

        const isFromClient = fromDev.type === 'pc' || fromDev.type === 'iot';
        const isToAP = toDev.type === 'router' || toDev.type.startsWith('switch');
        const isToClient = toDev.type === 'pc' || toDev.type === 'iot';
        const isFromAP = fromDev.type === 'router' || fromDev.type.startsWith('switch');

        if ((isFromClient && isToAP) || (isFromAP && isToClient)) {
            return true;
        }

        return false;
    };

    const infos: HopPacketInfo[] = [];
    let ttl = initialTTL;
    let icmpSeq = 1;

    for (let i = 0; i < path.length - 1; i++) {
        const fromDev = devices.find(d => d.id === path[i]);
        const toDev = devices.find(d => d.id === path[i + 1]);

        const conn = connections.find(c =>
            (c.sourceDeviceId === path[i] && c.targetDeviceId === path[i + 1]) ||
            (c.sourceDeviceId === path[i + 1] && c.targetDeviceId === path[i])
        );

        const isL3Hop = fromDev?.type === 'router' || fromDev?.type === 'switchL3';
        const srcMac = getMac(fromDev, 'AA:BB:CC:DD:EE:FF');
        const dstMac = getMac(toDev, 'FF:EE:DD:CC:BB:AA');

        if (i > 0 && isL3Hop) {
            ttl = Math.max(1, ttl - 1);
        }

        const cableType = conn?.cableType || (isWirelessConnection(path[i], path[i + 1]) ? 'wireless' : 'straight');

        const hopSrcIp = isIPv6 ? (fromDev?.ipv6 || fromDev?.ip || '::') : (fromDev?.ip || '0.0.0.0');
        const hopDstIp = isIPv6 ? (toDev?.ipv6 || toDev?.ip || '::') : (toDev?.ip || '0.0.0.0');

        infos.push({
            hopIndex: i,
            fromDevice: {
                id: fromDev?.id || path[i],
                name: fromDev?.name || path[i],
                type: fromDev?.type || 'unknown',
                ip: isIPv6 ? (fromDev?.ipv6 || fromDev?.ip || '::') : (fromDev?.ip || '0.0.0.0'),
                mac: srcMac,
            },
            toDevice: {
                id: toDev?.id || path[i + 1],
                name: toDev?.name || path[i + 1],
                type: toDev?.type || 'unknown',
                ip: isIPv6 ? (toDev?.ipv6 || toDev?.ip || '::') : (toDev?.ip || '0.0.0.0'),
                mac: dstMac,
            },
            cableType,
            srcMac,
            dstMac,
            etherType: isIPv6 ? '0x86DD (IPv6)' : '0x0800 (IPv4)',
            srcIp: hopSrcIp,
            dstIp: hopDstIp,
            ttl,
            protocol: isIPv6 ? 'ICMPv6 (58)' : 'ICMP (1)',
            icmpType: isIPv6 ? 'Echo Request (128)' : 'Echo Request (8)',
            icmpCode: 0,
            icmpSeq: icmpSeq++,
            layer2: 'Ethernet II',
            layer3: isIPv6 ? 'IPv6' : 'IPv4',
            layer4: isIPv6 ? 'ICMPv6' : 'ICMP',
            actionDescription: generateActionDescription(fromDev, toDev, i, path.length),
        });
    }

    return infos;
}

