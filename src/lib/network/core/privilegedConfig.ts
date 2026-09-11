import { cliModeError } from './cliErrors';
import type { CommandContext } from './commandTypes';
import type { SwitchState, CommandResult, Port } from '../types';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import { isValidIPv4Format } from '../dns';

/**
 * Write Memory - Save configuration
 */
export function cmdWriteMemory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    return {
        success: true,
        output: 'Building configuration...\n[OK]\n',
        saveConfig: true
    };
}

/**
 * Copy Running-Config Startup-Config
 */
export function cmdCopyRunningStartup(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    return {
        success: true,
        output: 'Destination filename [startup-config]?\nBuilding configuration...\n[OK]\n',
        saveConfig: true
    };
}

/**
 * Copy Running-Config Flash:
 */
export function cmdCopyRunningFlash(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^copy\s+running-config\s+flash:(\S+)?$/i);
    if (!match) {
        return { success: false, error: '% Invalid copy command. Use: copy running-config flash:[:filename]' };
    }

    const requestedFilename = (match[1] || '').trim();
    const filename = requestedFilename || 'running-config';

    return {
        success: true,
        output: `Destination filename [${filename}]?\nBuilding configuration...\n[OK]\n`,
        saveFlashConfig: true,
        flashFilename: filename
    };
}

/**
 * Copy Flash: Startup-Config
 */
export function cmdCopyFlashStartup(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    const match = input.match(/^copy\s+flash:(\S+)?\s+startup-config$/i);
    if (!match) {
        return { success: false, error: '% Invalid copy command. Use: copy flash:[:filename] startup-config' };
    }

    const requestedFilename = (match[1] || '').trim();
    const sourceFilename = requestedFilename || 'running-config';
    const hasSnapshot = !!state.flashStartupConfigs?.[sourceFilename];
    const hasLegacyTextBackup = !!state.flashFiles?.[sourceFilename];

    if (!hasSnapshot && hasLegacyTextBackup) {
        return {
            success: false,
            error: `%Error: flash:${sourceFilename} is legacy backup format. Re-save with "copy running-config flash:${sourceFilename}" and try again.`
        };
    }

    if (!hasSnapshot) {
        return {
            success: false,
            error: `%Error: flash:${sourceFilename} not found`
        };
    }

    return {
        success: true,
        output: `Loading flash:${sourceFilename} to startup-config...\n[OK]\nStartup config updated. Reload required to apply.\n`,
        restoreFlashConfig: true,
        flashSourceFilename: sourceFilename
    };
}

/**
 * Erase Startup-Config
 */
export function cmdEraseStartupConfig(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    return {
        success: true,
        output: 'Erasing the nvram filesystem will remove startup configuration files.\nErase of nvram: complete\n',
        requiresConfirmation: true,
        confirmationMessage: 'Erase startup configuration? This cannot be undone.',
        confirmationAction: 'erase',
        eraseConfig: true
    };
}

/**
 * Erase NVRAM
 */
export function cmdEraseNvram(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    return {
        success: true,
        output: 'Erasing the nvram filesystem will remove all configuration files.\nErase of nvram: complete\n',
        requiresConfirmation: true,
        confirmationMessage: 'Erase nvram? This will remove all configuration files.',
        confirmationAction: 'erase',
        eraseConfig: true
    };
}

/**
 * Copy TFTP command
 */
export function cmdCopyTftp(state: SwitchState, input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }
    const lang = ctx.language || 'en';
    const isRestore = /^copy\s+tftp/i.test(input.trim());

    // Extract URL part: either "tftp://ip/file" at end or after "tftp"
    let urlPart: string | undefined;
    const endMatch = input.match(/tftp:\/\/(\S+)$/i);
    const midMatch = input.match(/tftp:\/\/(\S+)\s+/i);
    const bareMatch = input.match(/tftp(:\/\/)?(\S+)?$/i);

    if (endMatch) {
        urlPart = endMatch[1];
    } else if (midMatch && isRestore) {
        urlPart = midMatch[1];
    } else if (bareMatch) {
        urlPart = bareMatch[2] || bareMatch[1];
    }

    if (!urlPart || urlPart === ':') {
        return { success: false, error: '% TFTP server address not specified. Use: copy running-config tftp://<server>[/filename]' };
    }

    // Split IP and optional filename
    const slashIndex = urlPart.indexOf('/');
    let targetIp: string;
    let filename: string;
    if (slashIndex >= 0) {
        targetIp = urlPart.substring(0, slashIndex);
        filename = urlPart.substring(slashIndex + 1);
    } else {
        targetIp = urlPart;
        filename = state.hostname ? `${state.hostname.toLowerCase()}-config` : 'router-config';
    }

    // Validate IP (octet range 0-255 enforced)
    const isIp = isValidIPv4Format(targetIp);
    if (!isIp) {
        return { success: false, error: `% Invalid target address: ${targetIp}` };
    }

    // Verify target exists in topology and has FTP service enabled
    let targetDevice: CanvasDevice | undefined;
    if (Array.isArray(ctx.devices)) {
        targetDevice = ctx.devices.find((d: CanvasDevice) => d.ip === targetIp);
        if (!targetDevice) {
            return { success: false, error: `% Error opening tftp://${targetIp}/${filename} (Timed out)` };
        }
    }

    // Require FTP service enabled on target for backup
    if (!isRestore && !targetDevice?.services?.ftp?.enabled) {
        return { success: false, error: `% Error: FTP service is not enabled on ${targetIp}.` };
    }

    // Store the backup file on the target device's FTP service
    if (!isRestore && typeof window !== 'undefined' && targetDevice) {
        try {
            const configContent = Array.isArray(state.runningConfig) ? state.runningConfig.join('\n') : '';
            const newFile = { name: filename, size: configContent.length || 4096, modifiedAt: new Date().toISOString() };
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                detail: {
                    deviceId: targetDevice.id,
                    config: {
                        services: {
                            ...targetDevice.services,
                            ftp: {
                                ...targetDevice.services?.ftp,
                                enabled: true,
                                files: [...((targetDevice.services?.ftp?.files || []).filter((f: { name: string }) => f.name !== filename)), newFile]
                            }
                        }
                    }
                }
            }));
        } catch {
            // Non-critical; backup still reported as OK
        }
    }

    const verb = isRestore
        ? (lang === 'tr' ? 'Yükleniyor' : 'Loading')
        : (lang === 'tr' ? 'Yazılıyor' : 'Writing');
    const source = isRestore ? `tftp://${targetIp}/${filename}` : 'running-config';
    const dest = isRestore ? 'running-config' : `tftp://${targetIp}/${filename}`;

    return {
        success: true,
        output: `\n${verb} ${source} to ${dest} ...\nBuilding configuration...\n[OK]\n`
    };
}

/**
 * Copy Startup-Config Running-Config
 */
export function cmdCopyStartupRunning(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
    return {
        success: true,
        output: 'Destination filename [running-config]?\n[OK]\n'
    };
}

/**
 * Delete VLAN database file
 */
export function cmdDeleteVlanDat(state: SwitchState, _input: string, ctx: CommandContext): CommandResult {
    if (state.currentMode !== 'privileged') {
        return { success: false, error: cliModeError() };
    }

    // Check if this is a confirmation (skipConfirm is passed from useDeviceManager)
    if (ctx?.skipConfirm) {
        // Actually delete the VLANs
        const newPorts: Record<string, Port> = {};
        Object.entries(state.ports || {}).forEach(([portId, port]: [string, Port]) => {
            newPorts[portId] = {
                ...port,
                accessVlan: 1,
                vlan: 1,
                trunkAllowedVlans: '1-4094',
                nativeVlan: 1
            };
        });

        return {
            success: true,
            output: 'Delete filename [vlan.dat]? \nDeleting flash:vlan.dat...\n',
            newState: {
                vlans: {},
                ports: newPorts,
                runningConfig: undefined // Will be rebuilt
            }
        };
    }

    return {
        success: true,
        output: 'Delete filename [vlan.dat]?',
        requiresConfirmation: true,
        confirmationMessage: 'Delete vlan.dat? This will remove all VLAN database information.',
        confirmationAction: 'delete-vlan',
        deleteVlanDat: true
    };
}