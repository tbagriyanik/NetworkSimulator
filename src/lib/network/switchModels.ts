// Switch Model Definitions and Utilities

export type SwitchModel = 'WS-C2960-24TT-L' | 'WS-C3650-24PS' | 'ASA-5506-X';
export type SwitchLayer = 'L2' | 'L3' | 'FW';

export interface SwitchModelInfo {
    model: SwitchModel;
    name: string;
    layer: SwitchLayer;
    ports: number;
    description: string;
    features: string[];
}

export const SWITCH_MODELS: Record<SwitchModel, SwitchModelInfo> = {
    'WS-C2960-24TT-L': {
        model: 'WS-C2960-24TT-L',
        name: 'Catalyst 2960 24-Port',
        layer: 'L2',
        ports: 26,
        description: 'Layer 2 Switch - 24 FastEthernet + 2 GigabitEthernet ports',
        features: [
            'Layer 2 Switching',
            'VLAN Support',
            'Spanning Tree Protocol',
            'Port Security',
            'Management VLAN (Vlan1) only'
        ]
    },
    'WS-C3650-24PS': {
        model: 'WS-C3650-24PS',
        name: 'Catalyst 3650 24-Port PoE',
        layer: 'L3',
        ports: 29,
        description: 'Layer 3 Switch - 24 GigabitEthernet1/0/x + 4 GigabitEthernet1/1/x + 1 Wireless ports',
        features: [
            'Layer 3 Routing',
            'Layer 2 Switching',
            'IP Routing',
            'VLAN Interfaces',
            'Routed Ports',
            'Power over Ethernet (PoE)',
            'Port Security',
            'Wireless Access Point'
        ]
    },
    'ASA-5506-X': {
        model: 'ASA-5506-X',
        name: 'ASA 5506-X with FirePOWER',
        layer: 'FW',
        ports: 9, // 8 GE + 1 Console
        description: 'Next-Generation Firewall - 8 GigabitEthernet ports',
        features: [
            'Stateful Firewall',
            'Application Visibility and Control',
            'Next-Generation Intrusion Prevention',
            'Site-to-Site and Remote Access VPN',
            'Advanced Malware Protection'
        ]
    }
};

export function getSwitchLayer(model: SwitchModel | string | undefined): SwitchLayer {
    if (!model) return 'L2';

    // Check known switch models first
    if (SWITCH_MODELS[model as SwitchModel]) {
        return SWITCH_MODELS[model as SwitchModel].layer;
    }

    // Check for router models - typically contain ISR, 4451, 1900, 2901 etc.
    const upperModel = model.toUpperCase();
    if (upperModel.includes('ISR') || upperModel.includes('4451') || upperModel.includes('1900') || upperModel.includes('2901') || upperModel.includes('ROUTER')) {
        return 'L3';
    }

    // Default to L2 for unknown models
    return 'L2';
}

export function getSwitchInfo(model: SwitchModel | string | undefined): SwitchModelInfo | undefined {
    if (!model || !SWITCH_MODELS[model as SwitchModel]) {
        return undefined;
    }
    return SWITCH_MODELS[model as SwitchModel];
}

export function isLayer2Switch(model: SwitchModel | string | undefined): boolean {
    if (!model) return false;
    return getSwitchLayer(model as SwitchModel) === 'L2';
}

export function isLayer3Switch(model: SwitchModel | string | undefined): boolean {
    if (!model) return false;
    return getSwitchLayer(model as SwitchModel) === 'L3';
}

export function canAssignIPToPhysicalPort(model: SwitchModel | string | undefined): boolean {
    if (!model) return true; // Default to allowing IP assignment if model is unknown (for routers)

    // Check known L3 models
    if (isLayer3Switch(model) || model === 'ASA-5506-X' || model === 'FW') return true;

    // Check for router models explicitly if not caught by getSwitchLayer/isLayer3Switch
    const upperModel = model.toUpperCase();
    if (upperModel.includes('ISR') || upperModel.includes('4451') || upperModel.includes('1900') || upperModel.includes('2901') || upperModel.includes('ROUTER')) {
        return true;
    }

    return false;
}

export function getAvailableSwitchModels(): SwitchModel[] {
    return Object.keys(SWITCH_MODELS) as SwitchModel[];
}
