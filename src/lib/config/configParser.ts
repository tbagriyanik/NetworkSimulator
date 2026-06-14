/**
 * Configuration Parser and Pretty Printer
 * Handles serialization/deserialization of network configurations
 *
 * **Validates: Requirements 11.1, 11.2, 11.3**
 */

import type { NetworkState, DeviceConfig, Connection, DeviceType, ConnectionType } from '@/types/ui-ux';

// ============================================================================
// Types
// ============================================================================

const VALID_DEVICE_TYPES = new Set(['pc', 'router', 'switch', 'switchL2', 'switchL3', 'iot', 'firewall', 'loadbalancer']);

function isValidMACAddress(mac: unknown): boolean {
    if (typeof mac !== 'string') return false;
    const hex = mac.replace(/[^a-fA-F0-9]/g, '');
    return hex.length === 12;
}

function isValidIPv4(ip: unknown): boolean {
    if (typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
        const n = Number(part);
        return Number.isInteger(n) && n >= 0 && n <= 255;
    });
}

export interface ParsedConfig {
    version: string;
    exportedAt: string;
    network: NetworkState;
}

export interface ParseResult {
    success: boolean;
    data?: NetworkState;
    error?: string;
    warnings?: string[];
}

export interface ExportOptions {
    pretty?: boolean;
    includeMetadata?: boolean;
    indent?: number;
}

// ============================================================================
// Serialization: NetworkState -> JSON
// ============================================================================

export const serializeNetworkState = (
    state: NetworkState,
    options: ExportOptions = {}
): string => {
    const { pretty = true, includeMetadata: _includeMetadata = true, indent = 2 } = options;

    const data: ParsedConfig = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        network: state,
    };

    if (pretty) {
        return JSON.stringify(data, null, indent);
    }

    return JSON.stringify(data);
};

// ============================================================================
// Deserialization: JSON -> NetworkState
// ============================================================================

export const deserializeNetworkState = (jsonString: string): ParseResult => {
    const warnings: string[] = [];

    try {
        // Parse JSON
        const parsed = JSON.parse(jsonString);

        // Check if it's the wrapped format (with version and network)
        let networkData: Record<string, unknown>;
        if (parsed.network && typeof parsed.network === 'object') {
            networkData = parsed.network as Record<string, unknown>;
            if (parsed.version) {
                warnings.push(`Configuration version: ${parsed.version}`);
            }
        } else {
            networkData = parsed as Record<string, unknown>;
        }

        // Validate structure
        if (!networkData.devices || !Array.isArray(networkData.devices)) {
            return {
                success: false,
                error: 'Invalid configuration: "devices" array is missing or invalid',
            };
        }

        if (!networkData.connections || !Array.isArray(networkData.connections)) {
            return {
                success: false,
                error: 'Invalid configuration: "connections" array is missing or invalid',
            };
        }

        // Validate and clean devices
        const rawDevices = networkData.devices as Record<string, unknown>[];
        const devices: DeviceConfig[] = rawDevices.map((device, index) => {
            const id = typeof device.id === 'string' ? device.id : `device-${Date.now()}-${index}`;
            const rawType = String(device.type ?? 'pc');
            const type = VALID_DEVICE_TYPES.has(rawType) ? rawType : 'pc';
            const name = typeof device.name === 'string' ? device.name : `${type}-${index + 1}`;

            if (!device.id) {
                warnings.push(`Device at index ${index} missing ID, generating new ID`);
            }
            if (!device.type) {
                warnings.push(`Device "${id}" missing type, defaulting to "pc"`);
            } else if (!VALID_DEVICE_TYPES.has(String(device.type))) {
                warnings.push(`Device "${id}" has unknown type "${String(device.type)}", defaulting to "pc"`);
            }
            if (!device.name) {
                warnings.push(`Device "${id}" missing name, using default`);
            }

            const rawPos = device.position as Record<string, unknown> | undefined;
            if (!rawPos || typeof rawPos.x !== 'number' || typeof rawPos.y !== 'number') {
                warnings.push(`Device "${id}" missing or invalid position, using default`);
            }
            const posX = rawPos && typeof rawPos.x === 'number' ? rawPos.x : 100 + index * 50;
            const posY = rawPos && typeof rawPos.y === 'number' ? rawPos.y : 100;

            const deviceMac = device.macAddress;
            if (deviceMac !== undefined && !isValidMACAddress(deviceMac)) {
                warnings.push(`Device "${id}" has invalid MAC address "${String(deviceMac)}", removing`);
            }

            const deviceIp = device.ip;
            if (deviceIp !== undefined && !isValidIPv4(deviceIp)) {
                warnings.push(`Device "${id}" has invalid IPv4 address "${String(deviceIp)}", resetting`);
            }

            // Validate ports array
            const rawPorts = device.ports;
            const ports = Array.isArray(rawPorts)
                ? rawPorts.filter((p: unknown) => p && typeof p === 'object' && typeof (p as Record<string, unknown>).id === 'string')
                : undefined;

            // Validate network object
            const rawNetwork = device.network as Record<string, unknown> | undefined;
            const network = {
                ipv4: rawNetwork?.ipv4 && typeof rawNetwork.ipv4 === 'string' ? rawNetwork.ipv4 as string : undefined,
                ipv6: rawNetwork?.ipv6 && typeof rawNetwork.ipv6 === 'string' ? rawNetwork.ipv6 as string : undefined,
                subnet: rawNetwork?.subnet && typeof rawNetwork.subnet === 'string' ? rawNetwork.subnet as string : undefined,
                gateway: rawNetwork?.gateway && typeof rawNetwork.gateway === 'string' ? rawNetwork.gateway as string : undefined,
                dns: Array.isArray(rawNetwork?.dns) ? rawNetwork!.dns as string[] : undefined,
                dhcp: rawNetwork?.dhcp && typeof rawNetwork.dhcp === 'object' ? rawNetwork.dhcp as DeviceConfig['network']['dhcp'] : undefined,
            };

            return {
                id,
                type: type as DeviceType,
                name,
                position: { x: posX, y: posY },
                status: typeof device.status === 'string' ? device.status : 'offline',
                network,
                macAddress: deviceMac !== undefined && isValidMACAddress(deviceMac) ? String(deviceMac) : undefined,
                ports,
                isSelected: false,
                isHighlighted: false,
            } as DeviceConfig;
        });

        // Validate and clean connections
        const rawConnections = networkData.connections as Record<string, unknown>[];
        const validTypes: ConnectionType[] = ['ethernet', 'wireless', 'serial'];
        const connections: Connection[] = rawConnections
            .map((conn, index): Connection | null => {
                const id = typeof conn.id === 'string' ? conn.id : `conn-${Date.now()}-${index}`;
                const sourceDeviceId = String(conn.sourceDeviceId || '');
                const targetDeviceId = String(conn.targetDeviceId || '');
                const connType = String(conn.type || 'ethernet') as ConnectionType;

                // Validate connection type
                if (!validTypes.includes(connType)) {
                    warnings.push(`Connection ${id} has unknown type "${connType}", defaulting to "ethernet"`);
                }

                // Validate connection references valid devices
                const sourceExists = devices.some(d => d.id === sourceDeviceId);
                const targetExists = devices.some(d => d.id === targetDeviceId);

                if (!sourceExists) {
                    warnings.push(`Connection ${index} references non-existent source device "${sourceDeviceId}"`);
                }
                if (!targetExists) {
                    warnings.push(`Connection ${index} references non-existent target device "${targetDeviceId}"`);
                }

                return {
                    id,
                    sourceDeviceId,
                    sourcePortId: typeof conn.sourcePortId === 'string' ? conn.sourcePortId : undefined,
                    targetDeviceId,
                    targetPortId: typeof conn.targetPortId === 'string' ? conn.targetPortId : undefined,
                    type: validTypes.includes(connType) ? connType : 'ethernet',
                    status: conn.status === 'active' || conn.status === 'inactive' ? conn.status : 'inactive',
                    createdAt: typeof conn.createdAt === 'string' ? new Date(conn.createdAt) : new Date(),
                } as Connection;
            })
            .filter((conn): conn is Connection => {
                if (!conn) return false;
                const sourceExists = devices.some(d => d.id === conn.sourceDeviceId);
                const targetExists = devices.some(d => d.id === conn.targetDeviceId);
                // Remove orphaned connections (only warn once, already warned above)
                return sourceExists && targetExists;
            });

        // Reconstruct metadata
        const metadata = (networkData.metadata as Record<string, unknown>) || {};

        const result: NetworkState = {
            devices,
            connections,
            metadata: {
                name: String(metadata.name || 'Imported Network'),
                description: metadata.description !== undefined ? String(metadata.description) : undefined,
                createdAt: metadata.createdAt ? new Date(String(metadata.createdAt)) : new Date(),
                lastModified: new Date(),
                mode: String(metadata.mode || 'beginner') as import('@/types/ui-ux').LearningMode,
            },
        };

        return {
            success: true,
            data: result,
            warnings: warnings.length > 0 ? warnings : undefined,
        };

    } catch (error) {
        if (error instanceof SyntaxError) {
            return {
                success: false,
                error: `JSON syntax error: ${error.message}`,
            };
        }

        return {
            success: false,
            error: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};

// ============================================================================
// Pretty Printer: JSON -> Human Readable Format
// ============================================================================

export const prettyPrintConfig = (state: NetworkState): string => {
    const lines: string[] = [];

    // Header
    lines.push('='.repeat(50));
    lines.push('NETWORK CONFIGURATION');
    lines.push('='.repeat(50));
    lines.push(`Name: ${state.metadata.name}`);
    if (state.metadata.description) {
        lines.push(`Description: ${state.metadata.description}`);
    }
    lines.push(`Mode: ${state.metadata.mode}`);
    lines.push(`Devices: ${state.devices.length}`);
    lines.push(`Connections: ${state.connections.length}`);
    lines.push(`Created: ${state.metadata.createdAt.toLocaleString()}`);
    lines.push(`Modified: ${state.metadata.lastModified.toLocaleString()}`);
    lines.push('');

    // Devices
    if (state.devices.length > 0) {
        lines.push('-'.repeat(50));
        lines.push('DEVICES');
        lines.push('-'.repeat(50));

        state.devices.forEach((device, index) => {
            lines.push(`\n[${index + 1}] ${device.name} (${device.type.toUpperCase()})`);
            lines.push(`  ID: ${device.id}`);
            lines.push(`  Status: ${device.status}`);
            lines.push(`  Position: (${device.position.x}, ${device.position.y})`);

            if (device.network.ipv4) {
                lines.push(`  IPv4: ${device.network.ipv4}`);
            }
            if (device.network.subnet) {
                lines.push(`  Subnet: ${device.network.subnet}`);
            }
            if (device.network.gateway) {
                lines.push(`  Gateway: ${device.network.gateway}`);
            }
            if (device.network.dns && device.network.dns.length > 0) {
                lines.push(`  DNS: ${device.network.dns.join(', ')}`);
            }
            if (device.network.ipv6) {
                lines.push(`  IPv6: ${device.network.ipv6}`);
            }
            if (device.network.dhcp?.enabled) {
                lines.push(`  DHCP: ${device.network.dhcp.server ? 'Server' : 'Client'}`);
                if (device.network.dhcp.server) {
                    lines.push(`    Range: ${device.network.dhcp.startIP} - ${device.network.dhcp.endIP}`);
                    lines.push(`    Lease: ${device.network.dhcp.leaseTime}h`);
                }
            }
            if (device.macAddress) {
                lines.push(`  MAC: ${device.macAddress}`);
            }
            if (device.ports && device.ports.length > 0) {
                lines.push(`  Ports: ${device.ports.length}`);
                device.ports.forEach(port => {
                    const status = port.status === 'connected' ? '🔌' : '○';
                    lines.push(`    ${status} ${port.id} (${port.type})`);
                });
            }
        });
    }

    // Connections
    if (state.connections.length > 0) {
        lines.push('\n' + '-'.repeat(50));
        lines.push('CONNECTIONS');
        lines.push('-'.repeat(50));

        state.connections.forEach((conn, index) => {
            const sourceDevice = state.devices.find(d => d.id === conn.sourceDeviceId);
            const targetDevice = state.devices.find(d => d.id === conn.targetDeviceId);

            lines.push(`\n[${index + 1}] ${sourceDevice?.name || conn.sourceDeviceId} → ${targetDevice?.name || conn.targetDeviceId}`);
            lines.push(`  ID: ${conn.id}`);
            lines.push(`  Type: ${conn.type}`);
            lines.push(`  Status: ${conn.status}`);

            if (conn.sourcePortId) {
                lines.push(`  Source Port: ${conn.sourcePortId}`);
            }
            if (conn.targetPortId) {
                lines.push(`  Target Port: ${conn.targetPortId}`);
            }
        });
    }

    // Summary
    lines.push('\n' + '='.repeat(50));
    lines.push('END OF CONFIGURATION');
    lines.push('='.repeat(50));

    return lines.join('\n');
};

// ============================================================================
// Round-Trip Testing
// ============================================================================

export const roundTripTest = (original: NetworkState): { success: boolean; error?: string } => {
    try {
        // Serialize
        const serialized = serializeNetworkState(original, { pretty: false });

        // Deserialize
        const result = deserializeNetworkState(serialized);

        if (!result.success || !result.data) {
            return {
                success: false,
                error: `Round-trip failed: ${result.error}`,
            };
        }

        const restored = result.data;

        // Compare device counts
        if (original.devices.length !== restored.devices.length) {
            return {
                success: false,
                error: `Device count mismatch: ${original.devices.length} vs ${restored.devices.length}`,
            };
        }

        // Compare connection counts
        if (original.connections.length !== restored.connections.length) {
            return {
                success: false,
                error: `Connection count mismatch: ${original.connections.length} vs ${restored.connections.length}`,
            };
        }

        // Compare device properties
        for (let i = 0; i < original.devices.length; i++) {
            const orig = original.devices[i];
            const rest = restored.devices.find(d => d.id === orig.id);

            if (!rest) {
                return {
                    success: false,
                    error: `Device "${orig.id}" not found after round-trip`,
                };
            }

            if (orig.name !== rest.name) {
                return {
                    success: false,
                    error: `Device name mismatch for "${orig.id}": "${orig.name}" vs "${rest.name}"`,
                };
            }

            if (orig.type !== rest.type) {
                return {
                    success: false,
                    error: `Device type mismatch for "${orig.id}": "${orig.type}" vs "${rest.type}"`,
                };
            }

            if (orig.position.x !== rest.position.x || orig.position.y !== rest.position.y) {
                return {
                    success: false,
                    error: `Device position mismatch for "${orig.id}"`,
                };
            }
        }

        return { success: true };

    } catch (error) {
        return {
            success: false,
            error: `Round-trip exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};

// ============================================================================
// Import/Export File Operations
// ============================================================================

export const exportToFile = (state: NetworkState, filename?: string): { success: boolean; blob: Blob; filename: string } => {
    const json = serializeNetworkState(state, { pretty: true });
    const blob = new Blob([json], { type: 'application/json' });

    const suggestedFilename = filename || `network-${state.metadata.name.replace(/\s+/g, '_')}-${Date.now()}.json`;

    return {
        success: true,
        blob,
        filename: suggestedFilename,
    };
};

export const importFromFile = async (file: File): Promise<ParseResult> => {
    try {
        const text = await file.text();
        return deserializeNetworkState(text);
    } catch (error) {
        return {
            success: false,
            error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
};

// ============================================================================
// Utility Functions
// ============================================================================

export const createEmptyNetworkState = (name = 'New Network'): NetworkState => ({
    devices: [],
    connections: [],
    metadata: {
        name,
        description: '',
        createdAt: new Date(),
        lastModified: new Date(),
        mode: 'beginner',
    },
});

export const cloneNetworkState = (state: NetworkState): NetworkState => {
    const serialized = serializeNetworkState(state, { pretty: false });
    const result = deserializeNetworkState(serialized);

    if (result.success && result.data) {
        return result.data;
    }

    // Fallback to manual clone
    return {
        devices: state.devices.map(d => ({ ...d, network: { ...d.network } })),
        connections: state.connections.map(c => ({ ...c })),
        metadata: { ...state.metadata },
    };
};

export const validateConfigurationFile = (content: string): { valid: boolean; error?: string } => {
    const result = deserializeNetworkState(content);

    if (!result.success) {
        return { valid: false, error: result.error };
    }

    if (!result.data || result.data.devices.length === 0) {
        return { valid: false, error: 'Configuration contains no devices' };
    }

    return { valid: true };
};
