/**
 * Configuration Validation System
 * Comprehensive validation for network device configurations
 *
 * **Validates: Requirements 9.3, 9.5, 12.1**
 */

import type { DeviceConfig } from '@/types/ui-ux';

export interface ValidationError {
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

// ============================================================================
// IPv4 Validation
// ============================================================================

export const validateIPv4 = (ip: string, fieldName = 'ipv4'): ValidationError | null => {
    if (!ip || ip.trim() === '') {
        return null; // Optional field
    }

    // Check format: xxx.xxx.xxx.xxx
    const formatRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!formatRegex.test(ip)) {
        return {
            field: fieldName,
            message: `Invalid IPv4 address "${ip}". Use format: 192.168.1.1 (4 numbers separated by dots)`,
            code: 'IPV4_INVALID_FORMAT',
            severity: 'error',
        };
    }

    const parts = ip.split('.').map(Number);

    // Check each octet is 0-255
    for (let i = 0; i < 4; i++) {
        const part = parts[i];
        if (isNaN(part) || part < 0 || part > 255) {
            return {
                field: fieldName,
                message: `Invalid octet in "${ip}". Octet ${i + 1} (${parts[i]}) must be between 0 and 255`,
                code: 'IPV4_OCTET_OUT_OF_RANGE',
                severity: 'error',
            };
        }
    }

    // Check for reserved/private ranges
    const [a, b, c, d] = parts;

    // Loopback address (127.x.x.x)
    if (a === 127) {
        return {
            field: fieldName,
            message: `"${ip}" is a loopback address (127.x.x.x). Use a different IP for network devices`,
            code: 'IPV4_LOOPBACK',
            severity: 'warning',
        };
    }

    // Multicast (224-239.x.x.x)
    if (a >= 224 && a <= 239) {
        return {
            field: fieldName,
            message: `"${ip}" is a multicast address range. Not valid for device IP`,
            code: 'IPV4_MULTICAST',
            severity: 'error',
        };
    }

    // Broadcast (255.255.255.255)
    if (a === 255 && b === 255 && c === 255 && d === 255) {
        return {
            field: fieldName,
            message: `"${ip}" is the broadcast address. Cannot be used as device IP`,
            code: 'IPV4_BROADCAST',
            severity: 'error',
        };
    }

    // Network address (x.x.x.0)
    if (d === 0) {
        return {
            field: fieldName,
            message: `"${ip}" is a network address (ends with .0). Use .1 to .254 for devices`,
            code: 'IPV4_NETWORK_ADDRESS',
            severity: 'error',
        };
    }

    // Broadcast address in subnet (x.x.x.255)
    if (d === 255) {
        return {
            field: fieldName,
            message: `"${ip}" is a subnet broadcast address (ends with .255). Use .1 to .254 for devices`,
            code: 'IPV4_SUBNET_BROADCAST',
            severity: 'error',
        };
    }

    return null;
};

// ============================================================================
// Subnet Mask Validation
// ============================================================================

export const validateSubnetMask = (subnet: string, fieldName = 'subnet'): ValidationError | null => {
    if (!subnet || subnet.trim() === '') {
        return null; // Optional field
    }

    // First check if it's valid IPv4 format
    const ipv4Error = validateIPv4(subnet, fieldName);
    if (ipv4Error && ipv4Error.severity === 'error') {
        return {
            field: fieldName,
            message: `Invalid subnet mask "${subnet}". ${ipv4Error.message}`,
            code: 'SUBNET_INVALID_FORMAT',
            severity: 'error',
        };
    }

    // Valid subnet masks (CIDR notation equivalents)
    const validSubnets = [
        '255.255.255.0',    // /24 - Common for home networks
        '255.255.255.128',  // /25
        '255.255.255.192',  // /26
        '255.255.255.224',  // /27
        '255.255.255.240',  // /28
        '255.255.255.248',  // /29
        '255.255.255.252',  // /30 - Point-to-point
        '255.255.0.0',      // /16 - Large networks
        '255.0.0.0',        // /8 - Very large networks
    ];

    if (!validSubnets.includes(subnet)) {
        // Check if it's a valid subnet pattern (continuous 1s followed by 0s)
        const parts = subnet.split('.').map(Number);
        const binary = parts.map(p => p.toString(2).padStart(8, '0')).join('');

        // Valid subnet has all 1s followed by all 0s
        const validPattern = /^1+0+$/;
        if (!validPattern.test(binary)) {
            return {
                field: fieldName,
                message: `"${subnet}" is not a valid subnet mask. Subnet mask must have continuous 1s followed by 0s (e.g., 255.255.255.0)`,
                code: 'SUBNET_INVALID_PATTERN',
                severity: 'error',
            };
        }

        // It's valid but uncommon - give a warning
        return {
            field: fieldName,
            message: `"${subnet}" is an uncommon subnet mask. Common values: 255.255.255.0 (/24), 255.255.0.0 (/16)`,
            code: 'SUBNET_UNCOMMON',
            severity: 'warning',
        };
    }

    return null;
};

// ============================================================================
// Gateway Validation
// ============================================================================

export const validateGateway = (
    gateway: string,
    deviceIP?: string,
    subnetMask?: string,
    fieldName = 'gateway'
): ValidationError | null => {
    if (!gateway || gateway.trim() === '') {
        return null; // Optional field
    }

    // First check if it's valid IPv4
    const ipv4Error = validateIPv4(gateway, fieldName);
    if (ipv4Error && ipv4Error.severity === 'error') {
        return {
            field: fieldName,
            message: `Invalid gateway "${gateway}". ${ipv4Error.message}`,
            code: 'GATEWAY_INVALID_FORMAT',
            severity: 'error',
        };
    }

    // Check if gateway is in same subnet as device
    if (deviceIP && subnetMask) {
        const deviceParts = deviceIP.split('.').map(Number);
        const gatewayParts = gateway.split('.').map(Number);
        const subnetParts = subnetMask.split('.').map(Number);

        if (deviceParts.length === 4 && gatewayParts.length === 4 && subnetParts.length === 4) {
            // Calculate network addresses
            const isSameSubnet = deviceParts.every((part, i) =>
                (part & subnetParts[i]) === (gatewayParts[i] & subnetParts[i])
            );

            if (!isSameSubnet) {
                return {
                    field: fieldName,
                    message: `Gateway "${gateway}" is on a different network than device "${deviceIP}". Check your subnet mask (${subnetMask})`,
                    code: 'GATEWAY_DIFFERENT_SUBNET',
                    severity: 'error',
                };
            }
        }
    }

    // Gateway should typically end with .1 (best practice, not strict requirement)
    const parts = gateway.split('.').map(Number);
    if (parts[3] !== 1 && parts[3] !== 254) {
        return {
            field: fieldName,
            message: `Gateway "${gateway}" typically ends with .1 or .254 (e.g., 192.168.1.1)`,
            code: 'GATEWAY_NON_STANDARD',
            severity: 'warning',
        };
    }

    return null;
};

// ============================================================================
// DNS Validation
// ============================================================================

export const validateDNS = (dns: string, fieldName = 'dns'): ValidationError | null => {
    if (!dns || dns.trim() === '') {
        return null; // Optional field
    }

    // Support comma-separated list
    const dnsServers = dns.split(',').map(s => s.trim()).filter(s => s);

    for (const server of dnsServers) {
        const ipv4Error = validateIPv4(server, fieldName);
        if (ipv4Error && ipv4Error.severity === 'error') {
            return {
                field: fieldName,
                message: `Invalid DNS server "${server}". ${ipv4Error.message}`,
                code: 'DNS_INVALID',
                severity: 'error',
            };
        }
    }

    return null;
};

// ============================================================================
// IPv6 Validation
// ============================================================================

export const validateIPv6 = (ip: string, fieldName = 'ipv6'): ValidationError | null => {
    if (!ip || ip.trim() === '') {
        return null; // Optional field
    }

    // IPv6 format: 8 groups of 4 hex digits separated by colons
    // Supports :: shorthand
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}:(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}:(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}:(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}:(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;

    if (!ipv6Regex.test(ip)) {
        return {
            field: fieldName,
            message: `Invalid IPv6 address "${ip}". Use format: 2001:db8::1 or full 8 groups`,
            code: 'IPV6_INVALID_FORMAT',
            severity: 'error',
        };
    }

    return null;
};

// ============================================================================
// Device Name Validation
// ============================================================================

export const validateDeviceName = (name: string, fieldName = 'name'): ValidationError | null => {
    if (!name || name.trim() === '') {
        return {
            field: fieldName,
            message: 'Device name is required. Enter a descriptive name like "PC-1" or "Router-Main"',
            code: 'NAME_REQUIRED',
            severity: 'error',
        };
    }

    const trimmed = name.trim();

    if (trimmed.length > 32) {
        return {
            field: fieldName,
            message: `Device name "${trimmed.substring(0, 20)}..." is too long. Maximum 32 characters`,
            code: 'NAME_TOO_LONG',
            severity: 'error',
        };
    }

    if (trimmed.length < 1) {
        return {
            field: fieldName,
            message: 'Device name is too short. Minimum 1 character',
            code: 'NAME_TOO_SHORT',
            severity: 'error',
        };
    }

    // Allow alphanumeric, dash, underscore, space
    const validNameRegex = /^[a-zA-Z0-9-_ ]+$/;
    if (!validNameRegex.test(trimmed)) {
        return {
            field: fieldName,
            message: `Device name "${trimmed}" contains invalid characters. Use only: letters, numbers, spaces, hyphens (-), and underscores (_)`,
            code: 'NAME_INVALID_CHARS',
            severity: 'error',
        };
    }

    return null;
};

// ============================================================================
// DHCP Validation
// ============================================================================

export const validateDHCPRange = (
    startIP: string,
    endIP: string,
    gateway?: string,
    fieldName = 'dhcp'
): ValidationError | null => {
    if (!startIP || !endIP) {
        return null; // Optional if not using DHCP server
    }

    // Validate both are valid IPs
    const startError = validateIPv4(startIP, `${fieldName}.startIP`);
    if (startError && startError.severity === 'error') {
        return {
            field: fieldName,
            message: `DHCP start IP: ${startError.message}`,
            code: 'DHCP_START_INVALID',
            severity: 'error',
        };
    }

    const endError = validateIPv4(endIP, `${fieldName}.endIP`);
    if (endError && endError.severity === 'error') {
        return {
            field: fieldName,
            message: `DHCP end IP: ${endError.message}`,
            code: 'DHCP_END_INVALID',
            severity: 'error',
        };
    }

    // Convert to numbers for comparison
    const startParts = startIP.split('.').map(Number);
    const endParts = endIP.split('.').map(Number);

    const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
    const endNum = (endParts[0] << 24) + (endParts[1] << 16) + (endParts[2] << 8) + endParts[3];

    if (startNum >= endNum) {
        return {
            field: fieldName,
            message: `DHCP range invalid: start IP "${startIP}" must be less than end IP "${endIP}"`,
            code: 'DHCP_RANGE_INVALID',
            severity: 'error',
        };
    }

    // Check range size (shouldn't be too large)
    const rangeSize = endNum - startNum + 1;
    if (rangeSize > 253) {
        return {
            field: fieldName,
            message: `DHCP range too large (${rangeSize} address${rangeSize > 1 ? 'es' : ''}). Consider a smaller range (max 253)`,
            code: 'DHCP_RANGE_TOO_LARGE',
            severity: 'warning',
        };
    }

    // Check if gateway is within range
    if (gateway) {
        const gwParts = gateway.split('.').map(Number);
        const gwNum = (gwParts[0] << 24) + (gwParts[1] << 16) + (gwParts[2] << 8) + gwParts[3];

        if (gwNum >= startNum && gwNum <= endNum) {
            return {
                field: fieldName,
                message: `Gateway "${gateway}" is within DHCP range "${startIP}-${endIP}". Gateway should be excluded from DHCP range`,
                code: 'DHCP_GATEWAY_IN_RANGE',
                severity: 'error',
            };
        }
    }

    return null;
};

export const validateLeaseTime = (leaseTime: number, fieldName = 'dhcp.leaseTime'): ValidationError | null => {
    if (!leaseTime && leaseTime !== 0) {
        return null; // Use default
    }

    if (leaseTime < 1) {
        return {
            field: fieldName,
            message: `Lease time must be at least 1 hour`,
            code: 'DHCP_LEASE_TOO_SHORT',
            severity: 'error',
        };
    }

    if (leaseTime > 168) { // 1 week
        return {
            field: fieldName,
            message: `Lease time ${leaseTime} hour${leaseTime > 1 ? 's' : ''} is very long. Typical values: 8-24 hours`,
            code: 'DHCP_LEASE_TOO_LONG',
            severity: 'warning',
        };
    }

    return null;
};

// ============================================================================
// Complete Device Configuration Validation
// ============================================================================

export const validateDeviceConfig = (config: DeviceConfig): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate device name
    const nameError = validateDeviceName(config.name);
    if (nameError) {
        if (nameError.severity === 'error') errors.push(nameError);
        else warnings.push(nameError);
    }

    // Validate IPv4
    if (config.network.ipv4) {
        const ipv4Error = validateIPv4(config.network.ipv4);
        if (ipv4Error) {
            if (ipv4Error.severity === 'error') errors.push(ipv4Error);
            else warnings.push(ipv4Error);
        }
    }

    // Validate subnet mask
    if (config.network.subnet) {
        const subnetError = validateSubnetMask(config.network.subnet);
        if (subnetError) {
            if (subnetError.severity === 'error') errors.push(subnetError);
            else warnings.push(subnetError);
        }
    }

    // Validate gateway
    if (config.network.gateway) {
        const gatewayError = validateGateway(
            config.network.gateway,
            config.network.ipv4,
            config.network.subnet
        );
        if (gatewayError) {
            if (gatewayError.severity === 'error') errors.push(gatewayError);
            else warnings.push(gatewayError);
        }
    }

    // Validate DNS servers
    if (config.network.dns && config.network.dns.length > 0) {
        const dnsString = config.network.dns.join(', ');
        const dnsError = validateDNS(dnsString);
        if (dnsError) {
            if (dnsError.severity === 'error') errors.push(dnsError);
            else warnings.push(dnsError);
        }
    }

    // Validate IPv6
    if (config.network.ipv6) {
        const ipv6Error = validateIPv6(config.network.ipv6);
        if (ipv6Error) {
            if (ipv6Error.severity === 'error') errors.push(ipv6Error);
            else warnings.push(ipv6Error);
        }
    }

    // Validate DHCP configuration
    if (config.network.dhcp?.enabled && config.network.dhcp.server) {
        const dhcpRangeError = validateDHCPRange(
            config.network.dhcp.startIP || '',
            config.network.dhcp.endIP || '',
            config.network.gateway
        );
        if (dhcpRangeError) {
            if (dhcpRangeError.severity === 'error') errors.push(dhcpRangeError);
            else warnings.push(dhcpRangeError);
        }

        const leaseError = validateLeaseTime(config.network.dhcp.leaseTime || 24);
        if (leaseError) {
            if (leaseError.severity === 'error') errors.push(leaseError);
            else warnings.push(leaseError);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
};

// ============================================================================
// Utility Functions
// ============================================================================

export const getFieldError = (result: ValidationResult, field: string): string | null => {
    const allMessages = [...result.errors, ...result.warnings];
    const error = allMessages.find(e => e.field === field || e.field.startsWith(`${field}.`));
    return error?.message || null;
};

export const hasFieldError = (result: ValidationResult, field: string): boolean => {
    return result.errors.some(e => e.field === field || e.field.startsWith(`${field}.`));
};

export const hasFieldWarning = (result: ValidationResult, field: string): boolean => {
    return result.warnings.some(e => e.field === field || e.field.startsWith(`${field}.`));
};

export const getAllMessages = (result: ValidationResult): ValidationError[] => {
    return [...result.errors, ...result.warnings];
};
