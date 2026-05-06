import { LearningMode } from '@/contexts/ModeContext';

/**
 * Device types available in each learning mode
 */
export const DEVICE_TYPES_BY_MODE: Record<LearningMode, string[]> = {
    beginner: ['pc', 'router', 'switch'],
    intermediate: ['pc', 'router', 'switch', 'iot', 'wireless', 'firewall'],
    advanced: ['pc', 'router', 'switch', 'iot', 'wireless', 'firewall', 'loadbalancer', 'vpn', 'custom'],
};

/**
 * Configuration options available in each learning mode
 */
export const CONFIG_OPTIONS_BY_MODE: Record<LearningMode, string[]> = {
    beginner: ['name', 'ipv4', 'subnet', 'gateway'],
    intermediate: ['name', 'ipv4', 'subnet', 'gateway', 'dns', 'macAddress'],
    advanced: ['name', 'ipv4', 'ipv6', 'subnet', 'gateway', 'dns', 'macAddress', 'dhcp', 'ports'],
};

/**
 * Features available in each learning mode
 */
export const FEATURES_BY_MODE: Record<LearningMode, string[]> = {
    beginner: ['basic_ping', 'device_placement', 'basic_config'],
    intermediate: ['basic_ping', 'device_placement', 'basic_config', 'advanced_config', 'connection_types'],
    advanced: ['basic_ping', 'device_placement', 'basic_config', 'advanced_config', 'connection_types', 'routing', 'vlan', 'security'],
};

/**
 * Check if a device type is available in the current mode
 */
export function isDeviceAvailableInMode(deviceType: string, mode: LearningMode): boolean {
    return DEVICE_TYPES_BY_MODE[mode].includes(deviceType.toLowerCase());
}

/**
 * Check if a configuration option is available in the current mode
 */
export function isConfigOptionAvailableInMode(option: string, mode: LearningMode): boolean {
    return CONFIG_OPTIONS_BY_MODE[mode].includes(option.toLowerCase());
}

/**
 * Check if a feature is available in the current mode
 */
export function isFeatureAvailableInMode(feature: string, mode: LearningMode): boolean {
    return FEATURES_BY_MODE[mode].includes(feature.toLowerCase());
}

/**
 * Filter a list of devices based on the current mode
 */
export function filterDevicesByMode<T extends { type: string }>(devices: T[], mode: LearningMode): T[] {
    return devices.filter(device => isDeviceAvailableInMode(device.type, mode));
}

/**
 * Filter configuration options based on the current mode
 */
export function filterConfigOptionsByMode(options: string[], mode: LearningMode): string[] {
    return options.filter(option => isConfigOptionAvailableInMode(option, mode));
}

/**
 * Get the description for a learning mode
 */
export function getModeDescription(mode: LearningMode): string {
    const descriptions: Record<LearningMode, string> = {
        beginner: 'Perfect for learning the basics. Limited devices and simplified interface.',
        intermediate: 'Ready for more? All devices with standard features.',
        advanced: 'Master networking. All features with compact interface for power users.',
    };
    return descriptions[mode];
}

/**
 * Get the display name for a learning mode
 */
export function getModeName(mode: LearningMode): string {
    const names: Record<LearningMode, string> = {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced',
    };
    return names[mode];
}
