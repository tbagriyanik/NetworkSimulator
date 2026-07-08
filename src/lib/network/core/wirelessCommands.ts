import { IOS_ERRORS, iosModeError } from './iosErrors';
import type { CommandHandler } from './commandTypes';

/**
 * Wireless Configuration Commands
 * Supports: dot11 ssid, authentication, encryption, channel, power settings, MAC filtering
 * Modes: config, ssid-config, interface (dot11Radio), ap-config
 */

// Wireless SSID Configuration Handler
const cmdDot11Ssid: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^dot11\s+ssid\s+(\S+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const ssidName = match[1];

    // Validate SSID name (1-32 characters)
    if (ssidName.length < 1 || ssidName.length > 32) {
        return {
            success: false,
        error: 'Error: SSID name must be between 1-32 characters',
        };
    }

    // Initialize wireless config if not exists
    if (!state.wirelessConfig) {
        state.wirelessConfig = {};
    }

    // Create or update SSID configuration
    if (!state.wirelessConfig[ssidName]) {
        state.wirelessConfig[ssidName] = {
            name: ssidName,
            authentication: 'open' as const,
            keyManagement: 'none',
            wpaVersion: 2 as const,
            presharedKey: '',
            encryption: 'none',
            guestMode: false,
        };
    }

    // Store current SSID context
    state.currentSsid = ssidName;

    return {
        success: true,
        output: '',
        modeChange: 'ssid-config',
    };
};

// Authentication command
const cmdAuthentication: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'ssid-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^authentication\s+(.+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const authType = match[1].trim().toLowerCase();
    const validAuthTypes = ['open', 'shared', 'network-eap'];

    if (!validAuthTypes.includes(authType)) {
        return {
            success: false,
            error: `Error: Invalid authentication type. Valid types: ${validAuthTypes.join(', ')}`,
        };
    }

    if (!state.wirelessConfig || !state.currentSsid) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessConfig[state.currentSsid].authentication = authType as 'open' | 'shared' | 'network-eap';

    return { success: true, output: '' };
};

// Key Management (WPA/WPA2/WPA3)
const cmdAuthenticationKeyManagement: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'ssid-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^authentication\s+key-management\s+wpa\s+version\s+(\d+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const version = parseInt(match[1]);
    if (![2, 3].includes(version)) {
        return {
            success: false,
            error: 'Error: WPA version must be 2 or 3',
        };
    }

    if (!state.wirelessConfig || !state.currentSsid) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessConfig[state.currentSsid].keyManagement = 'wpa';
    state.wirelessConfig[state.currentSsid].wpaVersion = version as 2 | 3;

    return { success: true, output: '' };
};

// WPA Pre-Shared Key (Password)
const cmdWpaPsk: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'ssid-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^wpa-psk\s+(?:ascii|hex)\s+(.+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const password = match[1].trim();

    // Validate password (8-63 characters for ASCII)
    if (password.length < 8 || password.length > 63) {
        return {
            success: false,
            error: 'Error: Password must be between 8-63 characters',
        };
    }

    if (!state.wirelessConfig || !state.currentSsid) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessConfig[state.currentSsid].presharedKey = password;

    return { success: true, output: '' };
};

// Guest Mode (SSID broadcast)
const cmdGuestMode: CommandHandler = (state, _input, _ctx) => {
    if (state.currentMode !== 'ssid-config') {
        return { success: false, error: iosModeError() };
    }

    if (!state.wirelessConfig || !state.currentSsid) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessConfig[state.currentSsid].guestMode = true;

    return { success: true, output: '' };
};

// Interface dot11Radio configuration
const cmdInterfaceDot11Radio: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^interface\s+dot11radio\s+(\d+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const radioId = match[1];
    const validRadios = ['0', '1']; // 0 = 2.4GHz, 1 = 5GHz

    if (!validRadios.includes(radioId)) {
        return {
            success: false,
            error: 'Error: Invalid radio ID. Valid values: 0 (2.4GHz), 1 (5GHz)',
        };
    }

    // Initialize radio config if not exists
    if (!state.wirelessRadios) {
        state.wirelessRadios = {};
    }

    if (!state.wirelessRadios[radioId]) {
        state.wirelessRadios[radioId] = {
            id: radioId,
            frequency: radioId === '0' ? '2.4GHz' : '5GHz',
            channel: radioId === '0' ? 6 : 36,
            power: 'full',
            ssid: '',
            encryption: 'none',
            stationRole: 'root' as const,
            shutdown: false,
        };
    }

    state.currentRadio = radioId;

    return {
        success: true,
        output: '',
        modeChange: 'dot11-config',
    };
};

// Encryption mode and cipher
const cmdEncryptionMode: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'dot11-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^encryption\s+mode\s+ciphers\s+(.+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const cipher = match[1].trim().toLowerCase();
    const validCiphers = ['aes-ccm', 'tkip', 'aes-tkip'];

    if (!validCiphers.includes(cipher)) {
        return {
            success: false,
            error: `Error: Invalid encryption cipher. Valid values: ${validCiphers.join(', ')}`,
        };
    }

    if (!state.wirelessRadios || !state.currentRadio) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessRadios[state.currentRadio].encryption = cipher;

    return { success: true, output: '' };
};

// SSID binding to radio interface configuration
const cmdSsidBinding: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'dot11-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^ssid\s+(\S+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const ssidName = match[1];

    // Check if SSID exists
    if (!state.wirelessConfig || !state.wirelessConfig[ssidName]) {
        return {
            success: false,
            error: `Error: SSID '${ssidName}' is not defined`,
        };
    }

    if (!state.wirelessRadios || !state.currentRadio) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessRadios[state.currentRadio].ssid = ssidName;

    return { success: true, output: '' };
};

// Channel selection
const cmdChannel: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'dot11-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^channel\s+(\d+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const channel = parseInt(match[1]);

    if (!state.wirelessRadios || !state.currentRadio) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const radioId = state.currentRadio;
    const frequency = state.wirelessRadios[radioId].frequency;

    // Validate channel based on frequency
    let validChannels: number[] = [];
    if (frequency === '2.4GHz') {
        validChannels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    } else if (frequency === '5GHz') {
        validChannels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];
    }

    if (!validChannels.includes(channel)) {
        return {
            success: false,
            error: `Error: Invalid channel. Valid channels for ${frequency}: ${validChannels.join(', ')}`,
        };
    }

    state.wirelessRadios[radioId].channel = channel;

    return { success: true, output: '' };
};

// Transmit power
const cmdPower: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'dot11-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^power\s+(\d+|full|half|quarter|eighth)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const power = match[1].toLowerCase();
    const validPowers = ['full', 'half', 'quarter', 'eighth'];

    if (!validPowers.includes(power) && isNaN(parseInt(power))) {
        return {
            success: false,
            error: `Error: Invalid power value. Valid values: ${validPowers.join(', ')} or 1-30 dBm`,
        };
    }

    if (!state.wirelessRadios || !state.currentRadio) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessRadios[state.currentRadio].power = power;

    return { success: true, output: '' };
};

// Station role (AP or Client)
const cmdStationRole: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'dot11-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^station-role\s+(\S+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const role = match[1].toLowerCase();
    const validRoles = ['root', 'repeater', 'client'];

    if (!validRoles.includes(role)) {
        return {
            success: false,
            error: `Error: Invalid station role. Valid roles: ${validRoles.join(', ')}`,
        };
    }

    if (!state.wirelessRadios || !state.currentRadio) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessRadios[state.currentRadio].stationRole = role as 'root' | 'repeater' | 'client';

    return { success: true, output: '' };
};

// MAC address filtering
const cmdMacFilter: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'dot11-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^mac-filter\s+(?:allow|deny)\s+(.+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const action = input.match(/^mac-filter\s+(allow|deny)/i)?.[1].toLowerCase() || 'allow';
    const macAddress = match[1].trim().toUpperCase();

    // Validate MAC address format
    const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
    if (!macRegex.test(macAddress)) {
        return {
            success: false,
            error: 'Error: Invalid MAC address format (e.g., AA:BB:CC:DD:EE:FF)',
        };
    }

    if (!state.wirelessRadios || !state.currentRadio) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    if (!state.wirelessRadios[state.currentRadio].macFilter) {
        state.wirelessRadios[state.currentRadio].macFilter = {
            enabled: true,
            allowList: [],
            denyList: [],
        };
    }

    const macF = state.wirelessRadios[state.currentRadio].macFilter;
    if (!macF) return { success: false, output: 'MAC filter not configured' };
    const filter = macF;
    if (action === 'allow') {
        if (!filter.allowList.includes(macAddress)) {
            filter.allowList.push(macAddress);
        }
    } else {
        if (!filter.denyList.includes(macAddress)) {
            filter.denyList.push(macAddress);
        }
    }

    return { success: true, output: '' };
};

// Show wireless configuration
const cmdShowWireless: CommandHandler = (state, _input, ctx) => {
    if (!['privileged', 'user'].includes(state.currentMode)) {
        return { success: false, error: iosModeError() };
    }

    let output = '';

    if (ctx.language === 'tr') {
        output += '=== Wireless Konfigürasyonu ===\n\n';
    } else {
        output += '=== Wireless Configuration ===\n\n';
    }

    // Show SSID configurations
    if (state.wirelessConfig && Object.keys(state.wirelessConfig).length > 0) {
        if (state.wirelessConfig) {
            if (ctx.language === 'tr') {
                output += 'SSID Yapılandırmaları:\n';
            } else {
                output += 'SSID Configurations:\n';
            }

            for (const [ssidName, config] of Object.entries(state.wirelessConfig)) {
                output += `\n  SSID: ${ssidName}\n`;
                output += `    ${ctx.language === 'tr' ? 'Kimlik Doğrulama' : 'Authentication'}: ${config.authentication}\n`;
                output += `    ${ctx.language === 'tr' ? 'Anahtar Yönetimi' : 'Key Management'}: ${config.keyManagement}\n`;
                if (config.keyManagement === 'wpa') {
                    output += `    WPA ${ctx.language === 'tr' ? 'Versiyonu' : 'Version'}: ${config.wpaVersion}\n`;
                }
                if (config.presharedKey) {
                    output += `    ${ctx.language === 'tr' ? 'Önceden Paylaşılan Anahtar' : 'Pre-Shared Key'}: ${config.presharedKey}\n`;
                }
                output += `    ${ctx.language === 'tr' ? 'Konuk Modu' : 'Guest Mode'}: ${config.guestMode ? 'Etkin' : 'Devre Dışı'}\n`;
            }
        }
    }

    // Show radio configurations
    if (state.wirelessRadios && Object.keys(state.wirelessRadios).length > 0) {
        if (state.wirelessRadios) {
            output += `\n\n${ctx.language === 'tr' ? 'Radyo Yapılandırmaları' : 'Radio Configurations'}:\n`;

            for (const [radioId, radio] of Object.entries(state.wirelessRadios)) {
                output += `\n  ${ctx.language === 'tr' ? 'Radyo' : 'Radio'} ${radioId} (${radio.frequency}):\n`;
                output += `    ${ctx.language === 'tr' ? 'SSID' : 'SSID'}: ${radio.ssid || 'Tanımlanmamış'}\n`;
                output += `    ${ctx.language === 'tr' ? 'Kanal' : 'Channel'}: ${radio.channel}\n`;
                output += `    ${ctx.language === 'tr' ? 'Güç' : 'Power'}: ${radio.power}\n`;
                output += `    ${ctx.language === 'tr' ? 'Şifreleme' : 'Encryption'}: ${radio.encryption}\n`;
                output += `    ${ctx.language === 'tr' ? 'İstasyon Rolü' : 'Station Role'}: ${radio.stationRole}\n`;
                output += `    ${ctx.language === 'tr' ? 'Durum' : 'Status'}: ${radio.shutdown ? 'Kapalı' : 'Açık'}\n`;

                if (radio.macFilter) {
                    output += `    ${ctx.language === 'tr' ? 'MAC Filtresi' : 'MAC Filter'}: Etkin\n`;
                    if (radio.macFilter.allowList.length > 0) {
                        output += `      ${ctx.language === 'tr' ? 'İzin Verilen' : 'Allow List'}: ${radio.macFilter.allowList.join(', ')}\n`;
                    }
                    if (radio.macFilter.denyList.length > 0) {
                        output += `      ${ctx.language === 'tr' ? 'Reddedilen' : 'Deny List'}: ${radio.macFilter.denyList.join(', ')}\n`;
                    }
                }
            }
        }
    }

    return { success: true, output };
};

const cmdApName: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^ap\s+(\S+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    const apName = match[1];

    if (!state.wlcAps) {
        state.wlcAps = {};
    }

    if (!state.wlcAps[apName]) {
        state.wlcAps[apName] = {
            name: apName,
            macAddress: '0000.0000.0000',
            status: 'disconnected',
            dot11: {},
        };
    }

    state.currentApName = apName;

    return { success: true, output: '', modeChange: 'ap-config' };
};

const cmdApAuthMac: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'ap-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^auth-mac\s+([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    if (!state.currentApName || !state.wlcAps || !state.wlcAps[state.currentApName]) {
        return { success: false, error: 'Error: No AP selected' };
    }

    state.wlcAps[state.currentApName].macAddress = match[1].toLowerCase();

    return { success: true, output: '' };
};

const cmdApRfChannel: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'ap-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^rf-channel\s+(\d+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    if (!state.currentApName || !state.wlcAps || !state.wlcAps[state.currentApName]) {
        return { success: false, error: 'Error: No AP selected' };
    }

    const ap = state.wlcAps[state.currentApName];
    const channel = parseInt(match[1]);
    if (channel < 1 || channel > 165) {
        return { success: false, error: 'Error: Invalid RF channel (1-165)' };
    }

    ap.rfChannel = channel;
    ap.dot11 ??= {};
    ap.dot11['5ghz'] ??= {};
    ap.dot11['5ghz'].rfChannel = channel;

    return { success: true, output: '' };
};

const cmdApDot115Ghz: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'ap-config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^dot11\s+5ghz\s+(power-constraint|channelswitch\s+mode)\s+(.+)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    if (!state.currentApName || !state.wlcAps || !state.wlcAps[state.currentApName]) {
        return { success: false, error: 'Error: No AP selected' };
    }

    const ap = state.wlcAps[state.currentApName];
    const command = match[1].toLowerCase();
    const value = match[2].trim();
    ap.dot11 ??= {};
    ap.dot11['5ghz'] ??= {};

    if (command === 'power-constraint') {
        const powerConstraint = parseInt(value);
        if (Number.isNaN(powerConstraint) || powerConstraint < 0 || powerConstraint > 255) {
            return { success: false, error: 'Error: Invalid power-constraint value (0-255)' };
        }
        ap.dot11['5ghz'].powerConstraint = powerConstraint;
        ap.power = String(powerConstraint);
    } else {
        const switchMode = parseInt(value);
        if (![0, 1].includes(switchMode)) {
            return { success: false, error: 'Error: Invalid channel switch mode (0 or 1)' };
        }
        ap.dot11['5ghz'].channelSwitchMode = switchMode as 0 | 1;
    }

    return { success: true, output: '' };
};

const cmdMbssid: CommandHandler = (state, _input, _ctx) => {
    if (state.currentMode !== 'ssid-config') {
        return { success: false, error: iosModeError() };
    }

    if (!state.wirelessConfig || !state.currentSsid) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessConfig[state.currentSsid].mbssid = true;

    return { success: true, output: '' };
};

const cmdNoMbssid: CommandHandler = (state, _input, _ctx) => {
    if (state.currentMode !== 'ssid-config') {
        return { success: false, error: iosModeError() };
    }

    if (!state.wirelessConfig || !state.currentSsid) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.wirelessConfig[state.currentSsid].mbssid = false;

    return { success: true, output: '' };
};

const cmdNoSecurityWpaPsk: CommandHandler = (state, _input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    if (!state.wlcWlans || Object.keys(state.wlcWlans).length === 0) {
        return { success: false, error: 'Error: No WLANs configured' };
    }

    for (const wlan of Object.values(state.wlcWlans)) {
        wlan.security = 'open';
        wlan.password = undefined;
    }

    return { success: true, output: '' };
};

const cmdWlanShutdown: CommandHandler = (state, _input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    if (!state.wlcWlans || Object.keys(state.wlcWlans).length === 0) {
        return { success: false, error: 'Error: No WLANs configured' };
    }

    for (const wlan of Object.values(state.wlcWlans)) {
        wlan.status = 'disabled';
    }

    return { success: true, output: '' };
};

const cmdNoWlanShutdown: CommandHandler = (state, _input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    if (!state.wlcWlans || Object.keys(state.wlcWlans).length === 0) {
        return { success: false, error: 'Error: No WLANs configured' };
    }

    for (const wlan of Object.values(state.wlcWlans)) {
        wlan.status = 'enabled';
    }

    return { success: true, output: '' };
};

const cmdWorldModeDot11d: CommandHandler = (state, input, _ctx) => {
    if (state.currentMode !== 'config') {
        return { success: false, error: iosModeError() };
    }

    const match = input.match(/^world-mode\s+dot11d\s+country-code\s+([A-Za-z]{2})\s+(indoor|outdoor|both)$/i);
    if (!match) {
        return { success: false, error: IOS_ERRORS.invalidInput };
    }

    state.worldModeDot11d = `country-code ${match[1].toUpperCase()} ${match[2].toLowerCase()}`;

    return { success: true, output: '' };
};

// Wireless command handlers map
export const wirelessHandlers: Record<string, CommandHandler> = {
    'dot11 ssid': cmdDot11Ssid,
    'authentication': cmdAuthentication,
    'authentication key-management': cmdAuthenticationKeyManagement,
    'wpa-psk': cmdWpaPsk,
    'guest-mode': cmdGuestMode,
    'interface dot11radio': cmdInterfaceDot11Radio,
    'encryption mode': cmdEncryptionMode,
    'ssid': cmdSsidBinding,
    'dot11 ssid binding': cmdSsidBinding,
    'dot11 channel': cmdChannel,
    'dot11 power': cmdPower,
    'dot11 station-role': cmdStationRole,
    'dot11 mac-filter': cmdMacFilter,
    'show wireless': cmdShowWireless,
    'ap': cmdApName,
    'auth-mac': cmdApAuthMac,
    'rf-channel': cmdApRfChannel,
    'dot11 5ghz': cmdApDot115Ghz,
    'mbssid': cmdMbssid,
    'no mbssid': cmdNoMbssid,
    'no security wpa psk': cmdNoSecurityWpaPsk,
    'wlan shutdown': cmdWlanShutdown,
    'no wlan shutdown': cmdNoWlanShutdown,
    'world-mode dot11d': cmdWorldModeDot11d,
};

