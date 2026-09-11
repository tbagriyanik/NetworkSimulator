import type { CommandHandler } from './commandTypes';
import { CLI_ERRORS, cliModeError } from './cliErrors';

/**
 * VPN/IPsec Configuration Commands (Firewall / Router)
 */

export const cmdCryptoIsakmpPolicy: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^crypto\s+isakmp\s+policy\s+(\d+)$/i);
    if (!match) {
        return { success: false, error: CLI_ERRORS.invalidInput };
    }

    const priority = parseInt(match[1], 10);

    if (!state.cryptoIsakmpPolicies) {
        state.cryptoIsakmpPolicies = {};
    }

    if (!state.cryptoIsakmpPolicies[priority]) {
        state.cryptoIsakmpPolicies[priority] = { encryption: 'aes', hash: 'sha', group: 2, lifetime: 86400 };
    }

    // For simplicity, we just create the policy and stay in config mode.
    // A real firewall would enter config-isakmp mode.
    return {
        success: true,
        output: '',
    };
};

export const cmdCryptoIpsecTransformSet: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: cliModeError() };
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
        return { success: false, error: cliModeError() };
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
        return { success: false, error: CLI_ERRORS.invalidInput };
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
        return { success: false, error: cliModeError() };
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

    return { success: false, error: CLI_ERRORS.invalidInput };
};

export const cmdCryptoIsakmpKey: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^crypto\s+isakmp\s+key\s+(\S+)\s+address\s+([0-9.]+)/i);
    if (!match) {
        return { success: false, error: CLI_ERRORS.invalidInput };
    }

    const key = match[1];
    const peerAddress = match[2];

    if (!state.cryptoIsakmpKeys) {
        state.cryptoIsakmpKeys = {};
    }

    state.cryptoIsakmpKeys[peerAddress] = key;

    return {
        success: true,
        output: `ISAKMP key configured for peer ${peerAddress}`
    };
};

export const cmdShowCryptoIsakmpSa: CommandHandler = (state, _input, _ctx) => {
    let output = '\nIPv4 Crypto ISAKMP SA\n';
    output += 'dst             src             state          conn-id slot status\n';
    output += '-------------------------------------------------------------------\n';

    const keys = state.cryptoIsakmpKeys || {};
    const peers = Object.keys(keys);

    if (peers.length === 0) {
        output += 'No ISAKMP SAs active\n';
    } else {
        peers.forEach((peerIp, idx) => {
            const localIp = state.ip || '10.0.0.1';
            output += `${peerIp.padEnd(16)}${localIp.padEnd(16)}QM_IDLE         ${1001 + idx}    0   ACTIVE\n`;
        });
    }

    output += '\nIPv6 Crypto ISAKMP SA\n';
    output += 'dst             src             state          conn-id slot status\n';
    output += '-------------------------------------------------------------------\n';
    output += '[Educational Note: Phase 1 ISAKMP SA (IKE Phase 1) status QM_IDLE indicates Diffie-Hellman key exchange and authentication succeeded. The secure control channel is ACTIVE.]\n';

    return { success: true, output };
};

export const cmdShowCryptoIpsecSa: CommandHandler = (state, _input, _ctx) => {
    const maps = state.cryptoMaps || {};
    const mapNames = Object.keys(maps);
    const localIp = state.ip || '10.0.0.1';

    let output = '';

    if (mapNames.length === 0) {
        const peer = Object.keys(state.cryptoIsakmpKeys || {})[0] || '203.0.113.2';
        output += '\ninterface: Tunnel0\n';
        output += `    Crypto map tag: IPSEC-MAP, local addr ${localIp}\n\n`;
        output += '   protected vrf: (none)\n';
        output += '   local ident (addr/mask/prot/port): (0.0.0.0/0.0.0.0/0/0)\n';
        output += '   remote ident (addr/mask/prot/port): (0.0.0.0/0.0.0.0/0/0)\n';
        output += `   current_peer ${peer} port 500\n`;
        output += '     PERMIT, flags={origin_is_acl,}\n';
        output += '    #pkts encaps: 142, #pkts encrypt: 142, #pkts digest: 142\n';
        output += '    #pkts decaps: 142, #pkts decrypt: 142, #pkts verify: 142\n';
        output += '    #send errors 0, #recv errors 0\n\n';
        output += `      local crypto endpt.: ${localIp}, remote crypto endpt.: ${peer}\n`;
        output += '      plaintext mtu 1438, path mtu 1500, ip mtu 1500, ip mtu idb GigabitEthernet0/0\n';
        output += '      current outbound spi: 0xC3B84E1A(3283635738)\n';
        output += '      PFS (Diffie-Hellman group): group2\n\n';
        output += '      inbound esp sas:\n';
        output += '        spi: 0x7F1A9D02(2132417794)\n';
        output += '          transform: esp-aes esp-sha-hmac ,\n';
        output += '          in use settings ={Tunnel, }\n';
        output += '          conn id: 2001, flow_id: SW:1, sibling_flags: 80000040, crypto map: IPSEC-MAP\n';
        output += '          sa timing: remaining key lifetime (kbytes/sec): (4608000/3420)\n';
        output += '          IV size: 16 bytes\n';
        output += '          replay detection support: Y\n';
        output += '          Status: ACTIVE(ACTIVE)\n\n';
        output += '      outbound esp sas:\n';
        output += '        spi: 0xC3B84E1A(3283635738)\n';
        output += '          transform: esp-aes esp-sha-hmac ,\n';
        output += '          in use settings ={Tunnel, }\n';
        output += '          conn id: 2002, flow_id: SW:2, sibling_flags: 80000040, crypto map: IPSEC-MAP\n';
        output += '          sa timing: remaining key lifetime (kbytes/sec): (4608000/3418)\n';
        output += '          IV size: 16 bytes\n';
        output += '          replay detection support: Y\n';
        output += '          Status: ACTIVE(ACTIVE)\n';
    } else {
        mapNames.forEach(mapName => {
            const seqs = maps[mapName];
            Object.keys(seqs).forEach((seqStr, idx) => {
                const entry = seqs[Number(seqStr)];
                const peer = entry.setPeer || '203.0.113.2';
                const transformName = entry.setTransformSet || 'TS-1';
                const transformObj = state.cryptoIpsecTransformSets?.[transformName];
                const transformStr = transformObj
                    ? `${transformObj.espEncryption} ${transformObj.espAuth}`
                    : 'esp-aes esp-sha-hmac';

                output += `\ninterface: Tunnel${idx}\n`;
                output += `    Crypto map tag: ${mapName}, local addr ${localIp}\n\n`;
                output += `   protected vrf: (none)\n`;
                output += `   local ident (addr/mask/prot/port): (${entry.matchAddress || '0.0.0.0/0.0.0.0/0/0'})\n`;
                output += `   remote ident (addr/mask/prot/port): (0.0.0.0/0.0.0.0/0/0)\n`;
                output += `   current_peer ${peer} port 500\n`;
                output += `     PERMIT, flags={origin_is_acl,}\n`;
                output += `    #pkts encaps: 248, #pkts encrypt: 248, #pkts digest: 248\n`;
                output += `    #pkts decaps: 248, #pkts decrypt: 248, #pkts verify: 248\n`;
                output += `    #send errors 0, #recv errors 0\n\n`;
                output += `      local crypto endpt.: ${localIp}, remote crypto endpt.: ${peer}\n`;
                output += `      plaintext mtu 1438, path mtu 1500, ip mtu 1500, ip mtu idb GigabitEthernet0/0\n`;
                output += `      current outbound spi: 0xC3B84E1A(3283635738)\n`;
                output += `      PFS (Diffie-Hellman group): group2\n\n`;
                output += `      inbound esp sas:\n`;
                output += `        spi: 0x7F1A9D02(2132417794)\n`;
                output += `          transform: ${transformStr} ,\n`;
                output += `          in use settings ={Tunnel, }\n`;
                output += `          conn id: ${2001 + idx}, flow_id: SW:${1 + idx}, sibling_flags: 80000040, crypto map: ${mapName}\n`;
                output += `          sa timing: remaining key lifetime (kbytes/sec): (4608000/3420)\n`;
                output += `          IV size: 16 bytes\n`;
                output += `          replay detection support: Y\n`;
                output += `          Status: ACTIVE(ACTIVE)\n\n`;
                output += `      outbound esp sas:\n`;
                output += `        spi: 0xC3B84E1A(3283635738)\n`;
                output += `          transform: ${transformStr} ,\n`;
                output += `          in use settings ={Tunnel, }\n`;
                output += `          conn id: ${2002 + idx}, flow_id: SW:${2 + idx}, sibling_flags: 80000040, crypto map: ${mapName}\n`;
                output += `          sa timing: remaining key lifetime (kbytes/sec): (4608000/3418)\n`;
                output += `          IV size: 16 bytes\n`;
                output += `          replay detection support: Y\n`;
                output += `          Status: ACTIVE(ACTIVE)\n`;
            });
        });
    }

    output += '\n[Educational Note: IPsec Phase 2 Security Association (SA) is ACTIVE. Encrypted packets are protected using ESP (Encapsulating Security Payload) with negotiation metrics.]\n';

    return { success: true, output };
};

export const cmdShowCryptoMap: CommandHandler = (state, _input, _ctx) => {
    const maps = state.cryptoMaps || {};
    const mapNames = Object.keys(maps);

    if (mapNames.length === 0) {
        return { success: true, output: '\nNo crypto maps configured\n' };
    }

    let output = '\nCrypto Map Table\n';
    mapNames.forEach(name => {
        const seqs = maps[name];
        Object.keys(seqs).forEach(seqStr => {
            const entry = seqs[Number(seqStr)];
            output += `Crypto Map "${name}" ${seqStr} ipsec-isakmp\n`;
            output += `    Peer = ${entry.setPeer || 'none'}\n`;
            output += `    Transform set = ${entry.setTransformSet || 'none'}\n`;
            output += `    Match address = ${entry.matchAddress || 'none'}\n`;
        });
    });

    return { success: true, output };
};

export const cryptoHandlers: Record<string, CommandHandler> = {
    'crypto isakmp policy': cmdCryptoIsakmpPolicy,
    'crypto isakmp key': cmdCryptoIsakmpKey,
    'crypto ipsec transform-set': cmdCryptoIpsecTransformSet,
    'crypto map': cmdCryptoMap,
    'tunnel-group': cmdTunnelGroup,
    'show crypto isakmp sa': cmdShowCryptoIsakmpSa,
    'show crypto ipsec sa': cmdShowCryptoIpsecSa,
    'show crypto map': cmdShowCryptoMap
};

