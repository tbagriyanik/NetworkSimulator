import { iosModeError } from './iosErrors';
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
    return { success: false, error: iosModeError() };
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
  _input: string,
  _ctx: CommandContext
): CommandResult {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: iosModeError() };
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
      return {
        success: true,
        newState: {
          currentMode: 'privileged',
          currentNamedAcl: undefined
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
  // Extract the command after "do"
  const match = input.match(/^do\s*(.*)$/i);
  if (!match) {
    return { success: false, error: '% Invalid command' };
  }

  const subCommand = match[1].trim();
  const subCommandLower = subCommand.toLowerCase();

  // If no subcommand, show error
  if (!subCommandLower) {
    return { success: false, error: '% Incomplete command' };
  }

  // Save original mode
  const originalMode = state.currentMode;

  // Temporarily change mode to privileged for execution
  const privilegedState = { ...state, currentMode: 'privileged' as CommandMode };

  // Route to appropriate handler based on command type

  // Show commands (intent-first parse in privileged mode)
  if (subCommandLower.startsWith('show ') || subCommandLower === 'show') {
    const parsedSub = parseCommand(subCommand, 'privileged');
    if (parsedSub) {
      const validationSub = validateCommand(parsedSub, 'privileged', privilegedState);
      if (validationSub.valid && validationSub.matchedPattern) {
        const showHandler = showHandlers[validationSub.matchedPattern];
        if (showHandler) {
          const result = showHandler(privilegedState, parsedSub.resolvedInput || subCommand, ctx);
          if (result.newState) {
            result.newState = { ...result.newState, currentMode: originalMode };
          } else {
            result.newState = { currentMode: originalMode };
          }
          return result;
        }
      }
    }
  }

  // Parser-first privileged command dispatch
  const parsedSub = parseCommand(subCommand, 'privileged');
  if (parsedSub) {
    const validationSub = validateCommand(parsedSub, 'privileged', privilegedState);
    if (validationSub.valid && validationSub.matchedPattern) {
      const matched = validationSub.matchedPattern;
      const normalizedInput = parsedSub.resolvedInput || subCommand;

      if (matched === 'reload') return privilegedHandlers['reload'](privilegedState, normalizedInput, ctx);
      if (matched === 'write memory' || matched === 'copy running-config startup-config') {
        return withOriginalMode({
          success: true,
          output: 'Building configuration...\n[OK]\n',
          saveConfig: true,
          newState: { currentMode: originalMode }
        });
      }
      if (matched === 'copy running-config flash') {
        return withOriginalMode(privilegedHandlers['copy running-config flash'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'erase startup-config') {
        return withOriginalMode(privilegedHandlers['erase startup-config'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'erase nvram') {
        return withOriginalMode(privilegedHandlers['erase nvram'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'delete flash:vlan.dat') {
        return withOriginalMode(privilegedHandlers['delete flash:vlan.dat'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'ip route') {
        return withOriginalMode(privilegedHandlers['ip route'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'no ip route') {
        return withOriginalMode(privilegedHandlers['no ip route'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'terminal') {
        return withOriginalMode(privilegedHandlers['terminal'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'clear arp-cache') {
        return withOriginalMode(privilegedHandlers['clear arp-cache'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'clear mac address-table') {
        return withOriginalMode(privilegedHandlers['clear mac address-table'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'debug') {
        return withOriginalMode(privilegedHandlers['debug'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'undebug all') {
        return withOriginalMode(privilegedHandlers['undebug all'](privilegedState, normalizedInput, ctx));
      }
      if (matched === 'ping' || matched === 'traceroute' || matched === 'telnet' || matched === 'ssh') {
        const h = privilegedHandlers[matched];
        if (h) return withOriginalMode(h(privilegedState, normalizedInput, ctx));
      }
    }
  }

  // Unknown command
  return { success: false, error: `% Invalid input detected at '^' marker.\n${subCommand ? `% ${subCommand}` : ''}` };
}




