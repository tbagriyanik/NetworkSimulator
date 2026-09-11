import { cliModeError } from './cliErrors';
import type { CommandHandler, CommandContext } from './commandTypes';
import type { SwitchState, CommandResult } from '../types';

// Line (console/vty) komutları (line console, password, login, transport input, vs.)

export const lineHandlers: Record<string, CommandHandler> = {
  'line console': cmdLineConsole,
  'line vty': cmdLineVty,
  'password': cmdPassword,
  'no password': cmdNoPassword,
  'login': cmdLogin,
  'no login': cmdNoLogin,
  'transport input': cmdTransportInput,
  'no transport input': cmdNoTransportInput,
  'logging synchronous': cmdLoggingSynchronous,
  'no logging synchronous': cmdNoLoggingSynchronous,
  'exec-timeout': cmdExecTimeout,
  'no exec-timeout': cmdNoExecTimeout,
  'history': cmdHistory,
  'no history': cmdNoHistory,
  'exec': cmdExec,
  'no exec': cmdNoExec,
  'autocommand': cmdAutocommand,
  'no autocommand': cmdNoAutocommand,
  'privilege level': cmdPrivilegeLevel,
  'line aux': cmdLineAux,
  'line': cmdLine,
  'transport output': cmdTransportOutput,
  'no transport output': cmdNoTransportOutput,
  'transport preferred': cmdTransportPreferred,
  'no transport preferred': cmdNoTransportPreferred,
  'history size': cmdHistory,
  'access-class': cmdAccessClass,
  'no access-class': cmdNoAccessClass,
  'session-limit': cmdSessionLimit,
  'no session-limit': cmdNoSessionLimit,
  'lockable': cmdLockable,
  'no lockable': cmdNoLockable,
};

/**
 * Line Console
 */
function cmdLineConsole(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^line\s+console\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid line console command' };
  }

  return {
    success: true,
    newState: {
      currentMode: 'line',
      currentLine: `console ${match[1]}`
    }
  };
}

/**
 * Line VTY
 */
function cmdLineVty(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^line\s+vty\s+(\d+)\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid line vty command' };
  }

  return {
    success: true,
    newState: {
      currentMode: 'line',
      currentLine: `vty ${match[1]} ${match[2]}`
    }
  };
}

/**
 * Password - Set line password
 */
function cmdPassword(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^password\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid password command' };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      password: match[1]
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      password: match[1]
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Login - Enable password checking on line
 */
function cmdLogin(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };
  const useLocalLogin = /\blogin\s+local\b/i.test(input);

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      login: true,
      loginLocal: false
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      login: true,
      loginLocal: useLocalLogin
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Login - Disable password checking on line
 */
function cmdNoLogin(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      login: false,
      loginLocal: false
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      login: false,
      loginLocal: false
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Transport Input - Set allowed protocols for line
 */
function cmdTransportInput(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^transport\s+input\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid transport input command' };
  }

  const parts = match[1].toLowerCase().split(/\s+/);
  const protocols = parts.filter(p => ['ssh', 'telnet', 'all', 'none'].includes(p));

  if (protocols.length === 0) {
    return { success: false, error: '% Invalid transport input protocol' };
  }

  // If 'all' or 'none' is present, it usually takes precedence or clears others but we'll just store the list for simplicity.
  const finalProtocols = (protocols.includes('all') ? ['all'] : protocols.includes('none') ? ['none'] : protocols) as ('none' | 'all' | 'ssh' | 'telnet')[];

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      transportInput: finalProtocols
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Logging Synchronous
 */
function cmdLoggingSynchronous(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      loggingSynchronous: true
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Exec-Timeout
 */
function cmdExecTimeout(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^exec-timeout\s+(\d+)(?:\s+(\d+))?$/i);
  if (!match) {
    return { success: false, error: '% Invalid exec-timeout command' };
  }

  const minutes = parseInt(match[1]);
  const seconds = match[2] ? parseInt(match[2]) : 0;

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      execTimeout: { minutes, seconds }
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      execTimeout: { minutes, seconds }
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Password - Remove line password
 */
function cmdNoPassword(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      password: ''
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      password: ''
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Transport Input - Reset transport input
 */
function cmdNoTransportInput(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      transportInput: []
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Logging Synchronous - Disable logging synchronous
 */
function cmdNoLoggingSynchronous(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      loggingSynchronous: false
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Exec-Timeout - Reset exec timeout to default
 */
function cmdNoExecTimeout(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      execTimeout: { minutes: 10, seconds: 0 }
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      execTimeout: { minutes: 10, seconds: 0 }
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * History - Set command history size
 */
function cmdHistory(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^history\s+size\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid history command' };
  }

  const newSecurity = { ...state.security };
  const size = parseInt(match[1]);

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      historySize: size
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      historySize: size
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No History - Disable command history
 */
function cmdNoHistory(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      historySize: 0
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      historySize: 0
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Exec - Enable EXEC mode on line
 */
function cmdExec(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      exec: true
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      exec: true
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Exec - Disable EXEC mode on line
 */
function cmdNoExec(state: SwitchState, _input: string, _cmd: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = {
      ...newSecurity.consoleLine,
      exec: false
    };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      exec: false
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Autocommand - Run command on connection
 */
function cmdAutocommand(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^autocommand\s+(.+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid autocommand' };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      autocommand: match[1]
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * No Autocommand - Remove autocommand
 */
function cmdNoAutocommand(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = {
      ...newSecurity.vtyLines,
      autocommand: ''
    };
  }

  return {
    success: true,
    newState: { security: newSecurity }
  };
}

/**
 * Line AUX
 */
function cmdLineAux(_state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  return { success: true, newState: { currentMode: 'line', currentLine: 'aux 0' } };
}

/**
 * Line (generic)
 */
function cmdLine(_state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  const match = input.match(/^line\s+(\S+)\s+(\d+)(?:\s+(\d+))?$/i);
  if (!match) return { success: false, error: '% Invalid line command' };
  return { success: true, newState: { currentMode: 'line', currentLine: `${match[1]} ${match[2]}` } };
}

/**
 * Privilege Level - Set privilege level for line
 */
function cmdPrivilegeLevel(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) {
    return { success: false, error: cliModeError() };
  }

  const match = input.match(/^privilege\s+level\s+(\d+)$/i);
  if (!match) {
    return { success: false, error: '% Invalid privilege level command. Use: privilege level {0-15}' };
  }

  const level = parseInt(match[1]);
  if (level < 0 || level > 15) {
    return { success: false, error: '% Privilege level must be between 0 and 15' };
  }

  const newSecurity = { ...state.security };

  if (state.currentLine.startsWith('console')) {
    newSecurity.consoleLine = { ...newSecurity.consoleLine, privilegeLevel: level };
  } else if (state.currentLine.startsWith('vty')) {
    newSecurity.vtyLines = { ...newSecurity.vtyLines, privilegeLevel: level };
  }

  return {
    success: true,
    output: `Privilege level ${level} set`,
    newState: { security: newSecurity }
  };
}

function cmdTransportOutput(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const match = input.match(/^transport\s+output\s+(all|none|ssh|telnet)$/i);
  if (!match) return { success: false, error: '% Invalid transport output command' };
  const val = match[1].toLowerCase();
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  const targetLine = { ...newSecurity[targetKey] };
  targetLine.transportOutput = val === 'none' ? [] : val === 'all' ? ['all'] : [val as 'ssh' | 'telnet'];
  newSecurity[targetKey] = targetLine;
  return { success: true, newState: { security: newSecurity } };
}

function cmdNoTransportOutput(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  const targetLine = { ...newSecurity[targetKey] };
  targetLine.transportOutput = ['all'];
  newSecurity[targetKey] = targetLine;
  return { success: true, newState: { security: newSecurity } };
}

function cmdTransportPreferred(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const match = input.match(/^transport\s+preferred\s+(none|ssh|telnet)$/i);
  if (!match) return { success: false, error: '% Invalid transport preferred command' };
  const val = match[1].toLowerCase();
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  newSecurity[targetKey] = { ...newSecurity[targetKey], transportPreferred: val };
  return { success: true, newState: { security: newSecurity } };
}

function cmdNoTransportPreferred(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  newSecurity[targetKey] = { ...newSecurity[targetKey], transportPreferred: undefined };
  return { success: true, newState: { security: newSecurity } };
}

function cmdAccessClass(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const match = input.match(/^access-class\s+(\S+)\s+(in|out)$/i);
  if (!match) return { success: false, error: '% Usage: access-class <access-list-number|name> {in|out}' };
  const [, aclName, dir] = match;
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  const targetLine = { ...newSecurity[targetKey] };
  if (dir.toLowerCase() === 'in') targetLine.accessClassIn = aclName;
  else targetLine.accessClassOut = aclName;
  newSecurity[targetKey] = targetLine;
  return { success: true, newState: { security: newSecurity } };
}

function cmdNoAccessClass(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+access-class\s+(\S+)\s+(in|out)$/i);
  const dir = match ? match[2].toLowerCase() : 'in';
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  const targetLine = { ...newSecurity[targetKey] };
  if (dir === 'in') targetLine.accessClassIn = undefined;
  else targetLine.accessClassOut = undefined;
  newSecurity[targetKey] = targetLine;
  return { success: true, newState: { security: newSecurity } };
}

function cmdSessionLimit(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const match = input.match(/^session-limit\s+(\d+)$/i);
  if (!match) return { success: false, error: '% Usage: session-limit {1-20}' };
  const limit = parseInt(match[1], 10);
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  newSecurity[targetKey] = { ...newSecurity[targetKey], sessionLimit: limit };
  return { success: true, newState: { security: newSecurity } };
}

function cmdNoSessionLimit(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  newSecurity[targetKey] = { ...newSecurity[targetKey], sessionLimit: undefined };
  return { success: true, newState: { security: newSecurity } };
}

function cmdLockable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  newSecurity[targetKey] = { ...newSecurity[targetKey], lockable: true };
  return { success: true, newState: { security: newSecurity } };
}

function cmdNoLockable(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'line' || !state.currentLine) return { success: false, error: cliModeError() };
  const newSecurity = { ...state.security };
  const targetKey = state.currentLine.startsWith('console') ? 'consoleLine' : 'vtyLines';
  newSecurity[targetKey] = { ...newSecurity[targetKey], lockable: false };
  return { success: true, newState: { security: newSecurity } };
}


