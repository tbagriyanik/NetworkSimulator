import { cliModeError } from './cliErrors';
import type { CommandHandler, CommandContext } from './commandTypes';
import { showHandlers } from './showCommands';
import { privilegedHandlers } from './privilegedCommands';
import { parseCommand, validateCommand } from '../parser';
import type { SwitchState, CommandResult, CommandMode } from '../types';

// Sistem ve oturum komutları (enable, configure terminal, ping, reload, debug, vs.)

export const systemHandlers: Record<string, CommandHandler> = {
  'enable': cmdEnable,
  'disable': cmdDisable,
  'configure terminal': cmdConfigureTerminal,
  'exit': cmdExit,
  'end': cmdEnd,
  'do': cmdDo,
  'do show': cmdDo,
};

/**
 * Enable - Enter privileged mode
 */
function cmdEnable(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  // Check if already in privileged mode
  if (state.currentMode === 'privileged') {
    return { success: true, output: '' };
  }

  // Check if enable secret/password is configured
  const needsPassword = !!(state.security?.enableSecret || state.security?.enablePassword);

  // Build output with banners
  let output = '';

  // Display login banner before password prompt (if configured and password is required)
  if (needsPassword && state.bannerLogin) {
    output = `\n${state.bannerLogin}\n\nPassword: `;
  } else if (needsPassword) {
    output = 'Password: ';
  }

  if (needsPassword) {
    return {
      success: true,
      output: output,
      requiresPassword: true,
      passwordPrompt: 'Password: ',
      passwordContext: 'enable',
      newState: {
        awaitingPassword: true,
        passwordContext: 'enable'
      }
    };
  }

  // No password required - directly enter privileged mode
  // Display exec banner (if configured) when entering privileged EXEC mode
  if (state.bannerExec) {
    output = `\n${state.bannerExec}\n`;
  }

  return {
    success: true,
    output: output,
    newState: {
      currentMode: 'privileged'
    }
  };
}

/**
 * Disable - Return to user mode
 */
function cmdDisable(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }

  return {
    success: true,
    newState: {
      currentMode: 'user'
    }
  };
}

/**
 * Configure Terminal - Enter global configuration mode
 */
function cmdConfigureTerminal(
  state: SwitchState,
  input: string,
  _ctx: CommandContext
): CommandResult {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: cliModeError() };
  }

  // Explicit "configure terminal" (or alias-resolved form) enters config mode directly.
  const trimmed = input.trim().toLowerCase();
  const isExplicitTerminal = trimmed === 'configure terminal';

  if (!isExplicitTerminal) {
    return {
      success: true,
      output: 'Configuring from terminal, memory, or network [terminal]? ',
      newState: {
        awaitingConfigSource: true
      }
    };
  }

  return {
    success: true,
    newState: {
      currentMode: 'config'
    }
  };
}

/**
 * Exit - Exit current mode
 */
function cmdExit(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  switch (state.currentMode) {
    case 'interface':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentInterface: undefined
        }
      };
    case 'config-if-range':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentInterface: undefined,
          selectedInterfaces: undefined
        }
      };
    case 'line':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentLine: undefined
        }
      };
    case 'vlan':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentVlan: undefined
        }
      };
    case 'config':
      return {
        success: true,
        newState: {
          currentMode: 'privileged'
        }
      };
    case 'router-config':
      return {
        success: true,
        newState: {
          currentMode: 'config'
        }
      };
    case 'config-route-map':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentRouteMap: undefined
        }
      };
    case 'config-ext-nacl':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentExtendedAcl: undefined
        }
      };
    case 'config-std-nacl':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentNamedAcl: undefined
        }
      };
    case 'dhcp-config':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentDhcpPool: undefined
        }
      };
    case 'dot11-config':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentInterface: undefined,
          currentRadio: undefined
        }
      };
    case 'ssid-config':
      return {
        success: true,
        newState: {
          currentMode: 'config',
          currentSsid: undefined
        }
      };
    case 'privileged':
    case 'user':
      return {
        success: true,
        output: '',
        exitSession: true
      };
    default:
      return { success: true, output: '', exitSession: true };
  }
}

/**
 * End - Return to privileged mode from any sub-mode
 */
function cmdEnd(
  state: SwitchState,
  _input: string,
  _ctx: CommandContext
): CommandResult {
  // Handle all sub-modes and return to privileged
  switch (state.currentMode) {
    case 'interface':
    case 'config-if-range':
    case 'line':
    case 'vlan':
    case 'router-config':
    case 'config-std-nacl':
    case 'config-ext-nacl':
    case 'dot11-config':
    case 'ssid-config':
      return {
        success: true,
        newState: {
          currentMode: 'privileged',
          currentInterface: undefined,
          currentRadio: undefined,
          currentSsid: undefined,
          currentNamedAcl: undefined,
          currentExtendedAcl: undefined
        }
      };
    case 'dhcp-config':
      return {
        success: true,
        newState: {
          currentMode: 'privileged',
          currentInterface: undefined,
          selectedInterfaces: undefined,
          currentLine: undefined,
          currentVlan: undefined,
          currentDhcpPool: undefined,
          ospfProcessId: undefined
        }
      };
    case 'config':
      return {
        success: true,
        newState: {
          currentMode: 'privileged',
          currentInterface: undefined,
          currentLine: undefined,
          currentVlan: undefined,
          ospfProcessId: undefined
        }
      };
    default:
      return { success: true, output: '' };
  }
}


/**
 * Do - Execute privileged commands from config mode
 */
function cmdDo(
  state: SwitchState,
  input: string,
  ctx: CommandContext
): CommandResult {
  const withOriginalMode = (result: CommandResult) => {
    if (result?.newState) result.newState = { ...result.newState, currentMode: originalMode };
    else result.newState = { currentMode: originalMode };
    return result;
  };

  const subCommand = input.replace(/^do\s+/i, '').trim();
  const originalMode = state.currentMode;

  // Temporarily change mode to privileged for execution
  const privilegedState = { ...state, currentMode: 'privileged' as CommandMode };

  // Parse and validate the sub-command in privileged mode
  const parsedSub = parseCommand(subCommand, 'privileged', privilegedState);
  if (!parsedSub) {
    return { success: false, error: `% Invalid input detected at '^' marker.\n${subCommand ? `% ${subCommand}` : ''}` };
  }
  const validationSub = validateCommand(parsedSub, 'privileged', privilegedState);
  if (!validationSub.valid || !validationSub.matchedPattern) {
    return { success: false, error: `% Invalid input detected at '^' marker.\n${subCommand ? `% ${subCommand}` : ''}` };
  }

  const matched = validationSub.matchedPattern;
  const normalizedInput = parsedSub.resolvedInput || subCommand;

  // Special case: 'write memory' / 'copy running-config startup-config' triggers config save
  if (matched === 'write memory' || matched === 'copy running-config startup-config') {
    return withOriginalMode({
      success: true,
      output: 'Building configuration...\n[OK]\n',
      saveConfig: true,
      newState: { currentMode: originalMode }
    });
  }

  // Intent-first dispatch for show commands
  if (parsedSub.intent?.family === 'show' || matched.startsWith('show ')) {
    const showHandler = showHandlers[matched] || Object.entries(showHandlers).find(([k]) => matched.startsWith(k + ' ') || matched === k)?.[1];
    if (showHandler) {
      const result = showHandler(privilegedState, normalizedInput, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
  }

  // Dynamic dispatch: look up handler from privilegedHandlers map.
  // This replaces the previous explicit if-chain and automatically supports
  // any new privileged command without manual updates.
  const handler = privilegedHandlers[matched];
  if (handler) {
    return withOriginalMode(handler(privilegedState, normalizedInput, ctx));
  }

  // Unknown command
  return { success: false, error: `% Invalid input detected at '^' marker.\n${subCommand ? `% ${subCommand}` : ''}` };
}




