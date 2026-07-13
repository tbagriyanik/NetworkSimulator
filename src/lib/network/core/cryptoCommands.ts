import type { CommandHandler } from './commandTypes';
import { IOS_ERRORS, iosModeError } from './iosErrors';

/**
 * VPN/IPsec Configuration Commands (ASA / Router)
 */

export const cmdCryptoIsakmpPolicy: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^crypto\s+isakmp\s+policy\s+(\d+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const priority = parseInt(match[1], 10);

    if (!state.cryptoIsakmpPolicies) {
        state.cryptoIsakmpPolicies = {};
    }

    if (!state.cryptoIsakmpPolicies[priority]) {
        state.cryptoIsakmpPolicies[priority] = { encryption: 'aes', hash: 'sha', group: 2, lifetime: 86400 };
    }

    // For simplicity, we just create the policy and stay in config mode.
    // Real ASA would enter config-isakmp mode.
    return {
        success: true,
        output: '',
    };
};

export const cmdCryptoIpsecTransformSet: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^crypto\s+ipsec\s+transform-set\s+(\S+)\s+(esp-[a-z0-9-]+)\s+(esp-[a-z0-9-]+)$/i);
    if (!match) {
        return { success: false, error: '% Incomplete or incorrect command' };
    }

    const name = match[1];
    const espEncr = match[2];
    const espAuth = match[3];

    if (!state.cryptoIpsecTransformSets) {
        state.cryptoIpsecTransformSets = {};
    }

    state.cryptoIpsecTransformSets[name] = {
        espEncryption: espEncr,
        espAuth: espAuth,
        mode: 'tunnel',
    };

    return { success: true, output: '' };
};

export const cmdCryptoMap: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^crypto\s+map\s+(\S+)\s+(\d+)\s+ipsec-isakmp$/i);
    if (!match) {
        // Also handle crypto map set commands
        const setMatch = input.match(/^crypto\s+map\s+(\S+)\s+(\d+)\s+(set|match)\s+(.+)$/i);
        if (setMatch) {
            const name = setMatch[1];
            const seq = parseInt(setMatch[2], 10);
            const action = setMatch[3].toLowerCase();
            const value = setMatch[4];

            if (!state.cryptoMaps || !state.cryptoMaps[name] || !state.cryptoMaps[name][seq]) {
                return { success: false, error: '% Crypto map not found' };
            }

            if (action === 'set') {
                if (value.startsWith('peer')) {
                    state.cryptoMaps[name][seq].setPeer = value.split(' ')[1];
                } else if (value.startsWith('transform-set')) {
                    state.cryptoMaps[name][seq].setTransformSet = value.split(' ')[1];
                }
            } else if (action === 'match') {
                if (value.startsWith('address')) {
                    state.cryptoMaps[name][seq].matchAddress = value.split(' ')[1];
                }
            }
            return { success: true, output: '' };
        }
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const name = match[1];
    const seq = parseInt(match[2], 10);

    if (!state.cryptoMaps) state.cryptoMaps = {};
    if (!state.cryptoMaps[name]) state.cryptoMaps[name] = {};
    if (!state.cryptoMaps[name][seq]) state.cryptoMaps[name][seq] = { ipsecIsakmp: true };

    return { success: true, output: '' };
};

export const cmdTunnelGroup: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const typeMatch = input.match(/^tunnel-group\s+(\S+)\s+type\s+(ipsec-l2l|remote-access)$/i);
    if (typeMatch) {
        const name = typeMatch[1];
        const type = typeMatch[2].toLowerCase() as 'ipsec-l2l' | 'remote-access';
        if (!state.tunnelGroups) state.tunnelGroups = {};
        state.tunnelGroups[name] = { type };
        return { success: true, output: '' };
    }

    const pskMatch = input.match(/^tunnel-group\s+(\S+)\s+ipsec-attributes\s+pre-shared-key\s+(.+)$/i);
    if (pskMatch) {
        const name = pskMatch[1];
        const psk = pskMatch[2];
        if (!state.tunnelGroups || !state.tunnelGroups[name]) {
            return { success: false, error: '% Tunnel group not found' };
        }
        if (!state.tunnelGroups[name].ipsecAttributes) {
            state.tunnelGroups[name].ipsecAttributes = {};
        }
        if (state.tunnelGroups[name].ipsecAttributes) {
            state.tunnelGroups[name].ipsecAttributes.preSharedKey = psk;
        }
        return { success: true, output: '' };
    }

    return { success: false, error: IOS_ERRORS.invalidInput };
};

export const cryptoHandlers: Record<string, CommandHandler> = {
    'crypto isakmp policy': cmdCryptoIsakmpPolicy,
    'crypto ipsec transform-set': cmdCryptoIpsecTransformSet,
    'crypto map': cmdCryptoMap,
    'tunnel-group': cmdTunnelGroup,
};
