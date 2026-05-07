import type { CommandHandler } from './commandTypes';
import { showHandlers } from './showCommands';
import { privilegedHandlers } from './privilegedCommands';

// Sistem ve oturum komutları (enable, configure terminal, ping, reload, debug, vs.)

export const systemHandlers: Record<string, CommandHandler> = {
  'enable': cmdEnable,
  'disable': cmdDisable,
  'configure terminal': cmdConfigureTerminal,
  'exit': cmdExit,
  'end': cmdEnd,
  'abort': cmdEnd,
  'do': cmdDo,
};

/**
 * Enable - Enter privileged mode
 */
function cmdEnable(
  state: any,
  input: string,
  ctx: any
): any {
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
  state: any,
  input: string,
  ctx: any
): any {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: '% Invalid command at this mode' };
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
  state: any,
  input: string,
  ctx: any
): any {
  if (state.currentMode !== 'privileged') {
    return { success: false, error: '% Invalid command at this mode' };
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
  state: any,
  input: string,
  ctx: any
): any {
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
  state: any,
  input: string,
  ctx: any
): any {
  // Handle all sub-modes and return to privileged
  switch (state.currentMode) {
    case 'interface':
    case 'config-if-range':
    case 'line':
    case 'vlan':
    case 'router-config':
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
          ospfProcessId: undefined,
          ripEnabled: undefined
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
          ospfProcessId: undefined,
          ripEnabled: undefined
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
  state: any,
  input: string,
  ctx: any
): any {
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
  const privilegedState = { ...state, currentMode: 'privileged' };

  // Route to appropriate handler based on command type

  // Show commands
  if (subCommandLower.startsWith('show ')) {
    // Find matching show handler
    const showKey = Object.keys(showHandlers).find(key => {
      const pattern = key.toLowerCase();
      return subCommandLower.startsWith(pattern);
    });

    if (showKey) {
      const result = showHandlers[showKey](privilegedState, subCommand, ctx);
      // Restore original mode in result
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
  }

  // Ping command
  if (subCommandLower.startsWith('ping ')) {
    const result = privilegedHandlers['ping'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Traceroute commands
  if (subCommandLower.startsWith('traceroute ')) {
    const result = privilegedHandlers['traceroute'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  if (subCommandLower.startsWith('tracert ')) {
    const result = privilegedHandlers['tracert'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Telnet command
  if (subCommandLower.startsWith('telnet ')) {
    const result = privilegedHandlers['telnet'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // SSH command
  if (subCommandLower.startsWith('ssh ')) {
    const result = privilegedHandlers['ssh'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Write commands
  if (subCommandLower.startsWith('write') || subCommandLower.startsWith('wr')) {
    // Directly return success without mode check
    const result = {
      success: true,
      output: 'Building configuration...\n[OK]\n',
      saveConfig: true,
      newState: { currentMode: originalMode }
    };
    return result;
  }

  // Copy commands
  if (subCommandLower.startsWith('copy ')) {
    if (subCommandLower.includes('running-config') && subCommandLower.includes('startup-config')) {
      const result = privilegedHandlers['copy running-config startup-config'](privilegedState, subCommand, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
    if (subCommandLower.includes('running-config') && subCommandLower.includes('flash')) {
      const result = privilegedHandlers['copy running-config flash'](privilegedState, subCommand, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
  }

  // Erase commands
  if (subCommandLower.startsWith('erase ')) {
    if (subCommandLower.includes('startup-config')) {
      const result = privilegedHandlers['erase startup-config'](privilegedState, subCommand, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
    if (subCommandLower.includes('nvram')) {
      const result = privilegedHandlers['erase nvram'](privilegedState, subCommand, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
  }

  // Debug commands
  if (subCommandLower.startsWith('debug ')) {
    const result = privilegedHandlers['debug'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Undebug commands
  if (subCommandLower.startsWith('undebug ') || subCommandLower === 'undebug all') {
    const result = privilegedHandlers['undebug all'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Reload command
  if (subCommandLower.startsWith('reload')) {
    const result = privilegedHandlers['reload'](privilegedState, subCommand, ctx);
    // Note: reload changes mode, so we keep its state change
    return result;
  }

  // Delete flash:vlan.dat
  if (subCommandLower.startsWith('delete flash:vlan.dat')) {
    const result = privilegedHandlers['delete flash:vlan.dat'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // IP route commands
  if (subCommandLower.startsWith('ip route ')) {
    const result = privilegedHandlers['ip route'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  if (subCommandLower.startsWith('no ip route ')) {
    const result = privilegedHandlers['no ip route'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Terminal commands
  if (subCommandLower.startsWith('terminal ')) {
    const result = privilegedHandlers['terminal'](privilegedState, subCommand, ctx);
    if (result.newState) {
      result.newState = { ...result.newState, currentMode: originalMode };
    } else {
      result.newState = { currentMode: originalMode };
    }
    return result;
  }

  // Clear commands
  if (subCommandLower.startsWith('clear ')) {
    if (subCommandLower.includes('arp')) {
      const result = privilegedHandlers['clear arp-cache'](privilegedState, subCommand, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
    if (subCommandLower.includes('mac')) {
      const result = privilegedHandlers['clear mac address-table'](privilegedState, subCommand, ctx);
      if (result.newState) {
        result.newState = { ...result.newState, currentMode: originalMode };
      } else {
        result.newState = { currentMode: originalMode };
      }
      return result;
    }
  }

  // Unknown command
  return { success: false, error: `% Unknown command: ${subCommand}` };
}


