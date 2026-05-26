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
    if (!model || !SWITCH_MODELS[model as SwitchModel]) {
        // Default to L2 for unknown models
        return 'L2';
    }
    return SWITCH_MODELS[model as SwitchModel].layer;
}

export function getSwitchInfo(model: SwitchModel | string | undefined): SwitchModelInfo | undefined {
    if (!model || !SWITCH_MODELS[model as SwitchModel]) {
        return undefined;
    }
    return SWITCH_MODELS[model as SwitchModel];
}

export function isLayer2Switch(model: SwitchModel | string | undefined): boolean {
    if (!model) return false;
    // Routers are not L2 switches
    if (isRouterModel(model)) return false;
    return getSwitchLayer(model as SwitchModel) === 'L2';
}

export function isLayer3Switch(model: SwitchModel | string | undefined): boolean {
    if (!model) return false;
    return getSwitchLayer(model as SwitchModel) === 'L3' || isRouterModel(model);
}

export function isRouterModel(model: string | undefined): boolean {
    if (!model) return false;
    const m = model.toUpperCase();
    return m.includes('ISR') || m.includes('4451') || m.includes('1900') || m.includes('2900') || m.includes('ASR') || m.includes('7200');
}

export function canAssignIPToPhysicalPort(model: SwitchModel | string | undefined): boolean {
    if (!model) return true; // Default to allowing IP assignment if model is unknown (for routers)
    return isLayer3Switch(model) || model === 'ASA-5506-X' || isRouterModel(model);
}

export function getAvailableSwitchModels(): SwitchModel[] {
    return Object.keys(SWITCH_MODELS) as SwitchModel[];
}
