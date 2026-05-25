/**
 * L3 Switch Configuration Validation
 * Implements proper L3 switch behavior 
 */

import { isLayer3Switch, isLayer2Switch } from '../switchModels';

/**
 * Validates that a device supports routed ports (no switchport)
 * Only L3 switches and routers support routed ports
 */
export function validateNoSwitchportSupport(
    switchModel: string | undefined,
    deviceType?: string
): {
    valid: boolean;
    error?: string;
} {
    // Routers always support routed ports (no switchport is redundant but valid or might be used to convert back)
    if (deviceType === 'router') {
        return { valid: true };
    }

    // If model is missing, allow known L3 device types and block others with IOS-like error.
    if (!switchModel) {
        if (deviceType === 'switchL3') {
            return { valid: true };
        }
        return {
            valid: false,
            error: "% Invalid input detected at '^' marker."
        };
    }

    if (!isLayer3Switch(switchModel)) {
        const layer = isLayer2Switch(switchModel) ? 'Layer 2' : 'unknown';
        return {
            valid: false,
            error: `% Invalid command. ${layer} switch (${switchModel}) does not support routed ports.\n'no switchport' is only available on Layer 3 switches.`
        };
    }

    return { valid: true };
}

/**
 * Validates that ip routing is supported and prerequisites are met
 * For some L3 switches, sdm prefer lanbase-routing must be configured first
 */
export function validateIpRoutingSupport(
    switchModel: string | undefined,
    currentState: any
): {
    valid: boolean;
    error?: string;
    requiresReload?: boolean;
} {
    // Routers always support IP routing
    if (currentState?.deviceType === 'router') {
        return { valid: true };
    }

    if (!switchModel) {
        return { valid: false, error: 'Switch model not specified' };
    }

    if (!isLayer3Switch(switchModel)) {
        const layer = isLayer2Switch(switchModel) ? 'Layer 2' : 'unknown';
        return {
            valid: false,
            error: `% Invalid command. ${layer} switch (${switchModel}) does not support IP routing.\nIP routing is only supported on routers and Layer 3 switches.`
        };
    }

    // Check if sdm prefer was configured and requires reload
    if (currentState.sdmPreferConfigured && !currentState.reloaded) {
        return {
            valid: false,
            error: `% SDM preference has been changed.\nDevice must be reloaded before activating 'ip routing'.\nUse command: reload`,
            requiresReload: true
        };
    }

    return { valid: true };
}

/**
 * Validates SVI (VLAN interface) status
 * A VLAN interface can only be "up/up" if at least one physical port
 * in that VLAN is connected and active (not shutdown)
 */
export function validateSviStatus(
    state: any,
    vlanId: number
): {
    valid: boolean;
    status: 'up' | 'down' | 'notaccessible';
    activePorts: string[];
    error?: string;
} {
    const vlanKey = vlanId.toString();
    const vlan = state.vlans?.[vlanKey];

    if (!vlan) {
        return {
            valid: false,
            status: 'down',
            activePorts: [],
            error: `VLAN ${vlanId} does not exist`
        };
    }

    // Check for physical ports assigned to this VLAN
    const activePorts: string[] = [];
    let hasAnyPorts = false;

    for (const [portId, portData] of Object.entries(state.ports || {})) {
        const port = portData as any;

        // Skip VLAN interfaces themselves
        if (port.type === 'vlan') continue;

        // Check if port is in this VLAN
        const portInVlan =
            port.accessVlan === vlanId ||
            port.vlan === vlanId ||
            (port.mode === 'trunk' &&
                (port.allowedVlans === 'all' ||
                    (Array.isArray(port.allowedVlans) && port.allowedVlans.includes(vlanId))));

        if (portInVlan) {
            hasAnyPorts = true;

            // Check if port is active (not shutdown, connected)
            if (!port.shutdown && port.status !== 'disabled' && port.status !== 'err-disabled') {
                activePorts.push(portId);
            }
        }
    }

    if (!hasAnyPorts) {
        return {
            valid: true,
            status: 'down',
            activePorts: [],
            error: `VLAN ${vlanId} has no physical ports assigned`
        };
    }

    if (activePorts.length === 0) {
        return {
            valid: true,
            status: 'down',
            activePorts: [],
            error: `No active ports in VLAN ${vlanId}`
        };
    }

    return {
        valid: true,
        status: 'up',
        activePorts
    };
}

/**
 * Validates that IP routing is actually enabled before using VLAN routing
 */
export function validateIpRoutingEnabled(state: any): {
    valid: boolean;
    error?: string;
} {
    if (!state.ipRouting) {
        return {
            valid: false,
            error: `% IP routing is not enabled.\nEnable it with: ip routing`
        };
    }

    return { valid: true };
}

/**
 * Distinguishes between management IP (L2 switch) and routing IP (L3 switch)
 * For L2 switches, IP is only for device management (SSH/Telnet)
 * For L3 switches, IP can be used for routing between VLANs
 */
export function getIpAddressPurpose(
    state: any,
    interfaceName: string | undefined
): {
    purpose: 'management' | 'routing' | 'both' | 'unknown';
    description: string;
} {
    if (!interfaceName) {
        return { purpose: 'unknown', description: 'No interface specified' };
    }

    // Determine if this is L2 or L3 switch
    const isL3 = isLayer3Switch(state.switchModel);

    // VLAN interfaces
    if (interfaceName.toLowerCase().startsWith('vlan')) {
        if (isL3) {
            return {
                purpose: 'both',
                description: 'VLAN interface on L3 switch: used for routing between VLANs and device management'
            };
        } else {
            return {
                purpose: 'management',
                description: 'VLAN interface on L2 switch: used only for device management (SSH/Telnet). Cannot route traffic.'
            };
        }
    }

    // Physical routed ports
    if (interfaceName.match(/^(fa|gi|et)\d+\/\d+$/i)) {
        if (isL3 && state.ports?.[interfaceName]?.mode === 'routed') {
            return {
                purpose: 'routing',
                description: 'Routed port on L3 switch: used for inter-VLAN routing'
            };
        }
    }

    return { purpose: 'unknown', description: 'Cannot determine IP purpose for interface' };
}

/**
 * Validates switch prerequisites for L3 configuration
 * Checks that device is proper type and configured correctly
 */
export function validateL3SwitchPrerequisites(state: any): {
    valid: boolean;
    prerequisites: {
        isL3Switch: boolean;
        isRouter: boolean;
        ipRoutingEnabled: boolean;
        sdmPreferConfigured: boolean;
        hasActivePorts: boolean;
    };
    errors: string[];
} {
    const errors: string[] = [];

    const isRouter = state.deviceType === 'router';
    const isL3 = isLayer3Switch(state.switchModel) || isRouter;

    if (!isL3) {
        errors.push(`Device is ${isLayer2Switch(state.switchModel) ? 'Layer 2' : 'unknown'} switch, not L3/Router`);
    }

    const ipRoutingEnabled = !!state.ipRouting;
    if (!ipRoutingEnabled && isL3 && !isRouter) {
        errors.push('IP routing is not enabled - use: ip routing');
    }

    const sdmConfigured = !!state.sdmPreferConfigured;

    const hasActivePorts = Object.values(state.ports || {})
        .filter((port: any) => !port.shutdown && port.type !== 'vlan')
        .length > 0;
    if (!hasActivePorts) {
        errors.push('No active physical ports available');
    }

    return {
        valid: errors.length === 0,
        prerequisites: {
            isL3Switch: isL3 && !isRouter,
            isRouter,
            ipRoutingEnabled,
            sdmPreferConfigured: sdmConfigured,
            hasActivePorts
        },
        errors
    };
}
