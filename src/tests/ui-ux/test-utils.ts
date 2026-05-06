/**
 * Test Utilities for UI/UX Components
 * Provides helper functions and fixtures for testing
 */

import type {
    DeviceConfig,
    Connection,
    NetworkState,
    Achievement,
    StudentProgress,
    LearningMode,
} from '@/types/ui-ux';

/**
 * Create a mock device configuration
 */
export function createMockDevice(overrides?: Partial<DeviceConfig>): DeviceConfig {
    return {
        id: 'device-1',
        type: 'pc',
        name: 'Test PC',
        position: { x: 100, y: 100 },
        status: 'online',
        network: {
            ipv4: '192.168.1.10',
            subnet: '255.255.255.0',
            gateway: '192.168.1.1',
        },
        isSelected: false,
        isHighlighted: false,
        ...overrides,
    };
}

/**
 * Create a mock connection
 */
export function createMockConnection(overrides?: Partial<Connection>): Connection {
    return {
        id: 'conn-1',
        sourceDeviceId: 'device-1',
        targetDeviceId: 'device-2',
        type: 'ethernet',
        status: 'active',
        createdAt: new Date(),
        ...overrides,
    };
}

/**
 * Create a mock network state
 */
export function createMockNetworkState(overrides?: Partial<NetworkState>): NetworkState {
    return {
        devices: [
            createMockDevice({ id: 'device-1', name: 'PC 1' }),
            createMockDevice({ id: 'device-2', name: 'Router 1', type: 'router' }),
        ],
        connections: [createMockConnection()],
        metadata: {
            name: 'Test Network',
            description: 'A test network',
            createdAt: new Date(),
            lastModified: new Date(),
            mode: 'beginner',
        },
        ...overrides,
    };
}

/**
 * Create a mock achievement
 */
export function createMockAchievement(overrides?: Partial<Achievement>): Achievement {
    return {
        id: 'achievement-1',
        name: 'First Network',
        description: 'Create your first network',
        icon: 'network',
        category: 'network-basics',
        requirement: {
            type: 'task-completion',
            value: 1,
        },
        reward: {
            xp: 50,
            badge: 'first-network',
        },
        isUnlocked: false,
        ...overrides,
    };
}

/**
 * Create a mock student progress
 */
export function createMockStudentProgress(overrides?: Partial<StudentProgress>): StudentProgress {
    return {
        studentId: 'student-1',
        level: 1,
        totalXP: 0,
        achievements: [createMockAchievement()],
        tasksCompleted: 0,
        streakDays: 0,
        lastActivityDate: new Date(),
        createdAt: new Date(),
        ...overrides,
    };
}

/**
 * Validate IPv4 address
 */
export function isValidIPv4(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every((part) => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
    });
}

/**
 * Validate subnet mask
 */
export function isValidSubnetMask(subnet: string): boolean {
    if (!isValidIPv4(subnet)) return false;
    const parts = subnet.split('.').map((p) => parseInt(p, 10));
    const binary = parts.map((p) => p.toString(2).padStart(8, '0')).join('');
    // Check if it's a valid CIDR mask (continuous 1s followed by 0s)
    // A valid subnet mask has at least one 1 and at least one 0
    const lastOne = binary.lastIndexOf('1');
    const firstZero = binary.indexOf('0');
    // Valid if: 1s come before 0s (and both exist)
    return firstZero !== -1 && lastOne !== -1 && lastOne < firstZero;
}

/**
 * Validate gateway address
 */
export function isValidGateway(gateway: string, ipv4: string, subnet: string): boolean {
    if (!isValidIPv4(gateway)) return false;
    // Gateway should be in the same subnet as the IP
    // This is a simplified check
    const ipParts = ipv4.split('.').map((p) => parseInt(p, 10));
    const gatewayParts = gateway.split('.').map((p) => parseInt(p, 10));
    const subnetParts = subnet.split('.').map((p) => parseInt(p, 10));

    for (let i = 0; i < 4; i++) {
        if ((ipParts[i] & subnetParts[i]) !== (gatewayParts[i] & subnetParts[i])) {
            return false;
        }
    }
    return true;
}

/**
 * Validate DNS server address
 */
export function isValidDNS(dns: string): boolean {
    return isValidIPv4(dns);
}

/**
 * Validate MAC address
 */
export function isValidMACAddress(mac: string): boolean {
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
}

/**
 * Validate device name
 */
export function isValidDeviceName(name: string): boolean {
    const nameRegex = /^[a-zA-Z0-9\-_]{1,32}$/;
    return nameRegex.test(name);
}

/**
 * Generate random device ID
 */
export function generateDeviceId(): string {
    return `device-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random connection ID
 */
export function generateConnectionId(): string {
    return `conn-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate random achievement ID
 */
export function generateAchievementId(): string {
    return `achievement-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate XP for level
 */
export function calculateXPForLevel(level: number): number {
    const xpThresholds: Record<number, number> = {
        1: 0,
        2: 100,
        3: 250,
        4: 450,
        5: 700,
        6: 1000,
        7: 1350,
        8: 1750,
        9: 2200,
        10: 2700,
    };
    return xpThresholds[Math.min(level, 10)] || 0;
}

/**
 * Get level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
    const xpThresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
    for (let i = xpThresholds.length - 1; i >= 0; i--) {
        if (totalXP >= xpThresholds[i]) {
            return i + 1;
        }
    }
    return 1;
}

/**
 * Get XP progress to next level
 */
export function getXPProgressToNextLevel(totalXP: number): { current: number; needed: number } {
    const currentLevel = getLevelFromXP(totalXP);
    const nextLevel = Math.min(currentLevel + 1, 10);

    const currentThreshold = calculateXPForLevel(currentLevel);
    const nextThreshold = calculateXPForLevel(nextLevel);

    const current = totalXP - currentThreshold;
    const needed = nextThreshold - currentThreshold;

    return { current, needed };
}

/**
 * Serialize network state to JSON
 */
export function serializeNetworkState(state: NetworkState): string {
    return JSON.stringify(state, null, 2);
}

/**
 * Deserialize network state from JSON
 */
export function deserializeNetworkState(json: string): NetworkState {
    const parsed = JSON.parse(json);
    // Convert date strings back to Date objects
    parsed.metadata.createdAt = new Date(parsed.metadata.createdAt);
    parsed.metadata.lastModified = new Date(parsed.metadata.lastModified);
    parsed.connections.forEach((conn: Connection) => {
        conn.createdAt = new Date(conn.createdAt);
    });
    return parsed as NetworkState;
}

/**
 * Check if device is in bounds
 */
export function isDeviceInBounds(
    device: DeviceConfig,
    canvasWidth: number,
    canvasHeight: number,
    deviceSize: number = 50
): boolean {
    return (
        device.position.x >= 0 &&
        device.position.y >= 0 &&
        device.position.x + deviceSize <= canvasWidth &&
        device.position.y + deviceSize <= canvasHeight
    );
}

/**
 * Check if two devices overlap
 */
export function devicesOverlap(
    device1: DeviceConfig,
    device2: DeviceConfig,
    minDistance: number = 50
): boolean {
    const dx = device1.position.x - device2.position.x;
    const dy = device1.position.y - device2.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < minDistance;
}

/**
 * Get devices by type
 */
export function getDevicesByType(devices: DeviceConfig[], type: string): DeviceConfig[] {
    return devices.filter((d) => d.type === type);
}

/**
 * Get connections for device
 */
export function getConnectionsForDevice(
    connections: Connection[],
    deviceId: string
): Connection[] {
    return connections.filter((c) => c.sourceDeviceId === deviceId || c.targetDeviceId === deviceId);
}

/**
 * Check if connection is valid
 */
export function isValidConnection(
    connection: Connection,
    devices: DeviceConfig[]
): { valid: boolean; reason?: string } {
    const sourceDevice = devices.find((d) => d.id === connection.sourceDeviceId);
    const targetDevice = devices.find((d) => d.id === connection.targetDeviceId);

    if (!sourceDevice) {
        return { valid: false, reason: 'Source device not found' };
    }

    if (!targetDevice) {
        return { valid: false, reason: 'Target device not found' };
    }

    if (connection.sourceDeviceId === connection.targetDeviceId) {
        return { valid: false, reason: 'Cannot connect device to itself' };
    }

    return { valid: true };
}
