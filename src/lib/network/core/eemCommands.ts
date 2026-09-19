import { cliModeError } from './cliErrors';
import type { CommandResult, SwitchState } from '../types';
import type { CommandContext, CommandHandler } from './commandTypes';
import { buildRunningConfig } from './configBuilder';

// Global: event manager applet <name>
export function cmdEventManagerApplet(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^event\s+manager\s+applet\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid event manager applet command. Usage: event manager applet <name>' };

  const appletName = match[1];
  const eemApplets = { ...state.eemApplets };
  if (!eemApplets[appletName]) {
    eemApplets[appletName] = { events: [], actions: [] };
  }

  const updatedState = { ...state, eemApplets, currentEemApplet: appletName };
  return {
    success: true,
    output: '',
    modeChange: 'config-applet',
    newState: {
      currentEemApplet: appletName,
      eemApplets,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

export function cmdNoEventManagerApplet(state: SwitchState, input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const match = input.match(/^no\s+event\s+manager\s+applet\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no event manager applet command' };

  const appletName = match[1];
  const eemApplets = { ...state.eemApplets };
  delete eemApplets[appletName];

  const updatedState = { ...state, eemApplets };
  return {
    success: true,
    output: '',
    newState: {
      eemApplets,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
}

// Config-Applet submode: event ...
export const cmdEemEvent: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'config-applet') return { success: false, error: cliModeError() };
  const appletName = state.currentEemApplet;
  if (!appletName) return { success: false, error: '% No EEM applet selected' };

  const syslogMatch = input.match(/^event\s+syslog\s+pattern\s+(.+)$/i);
  const cliMatch = input.match(/^event\s+cli\s+pattern\s+(.+)$/i);
  const timerMatch = input.match(/^event\s+timer\s+countdown\s+(\d+)$/i);

  const eemApplets = { ...state.eemApplets };
  const applet = { ...(eemApplets[appletName] || { events: [], actions: [] }) };
  const events = [...(applet.events || [])];

  if (syslogMatch) {
    events.push({ type: 'syslog', pattern: syslogMatch[1].trim() });
  } else if (cliMatch) {
    events.push({ type: 'cli', pattern: cliMatch[1].trim() });
  } else if (timerMatch) {
    events.push({ type: 'timer', pattern: timerMatch[1].trim() });
  } else {
    return { success: false, error: '% Unsupported event type. Supported: syslog pattern, cli pattern, timer countdown' };
  }

  applet.events = events;
  eemApplets[appletName] = applet;

  const updatedState = { ...state, eemApplets };
  return {
    success: true,
    output: '',
    newState: {
      eemApplets,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
};

export const cmdNoEemEvent: CommandHandler = (state, _input, _ctx) => {
  if (state.currentMode !== 'config-applet') return { success: false, error: cliModeError() };
  const appletName = state.currentEemApplet;
  if (!appletName) return { success: false, error: '% No EEM applet selected' };

  const eemApplets = { ...state.eemApplets };
  const applet = { ...(eemApplets[appletName] || { events: [], actions: [] }) };
  applet.events = [];
  eemApplets[appletName] = applet;

  const updatedState = { ...state, eemApplets };
  return {
    success: true,
    output: '',
    newState: {
      eemApplets,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
};

// Config-Applet submode: action <id> ...
export const cmdEemAction: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'config-applet') return { success: false, error: cliModeError() };
  const appletName = state.currentEemApplet;
  if (!appletName) return { success: false, error: '% No EEM applet selected' };

  const match = input.match(/^action\s+(\S+)\s+(syslog\s+msg|cli\s+command)\s+(.+)$/i);
  if (!match) return { success: false, error: '% Invalid action command. Usage: action <id> syslog msg <msg> | action <id> cli command <cmd>' };

  const actionId = match[1];
  const typeStr = match[2].toLowerCase();
  const payload = match[3].trim();

  const eemApplets = { ...state.eemApplets };
  const applet = { ...(eemApplets[appletName] || { events: [], actions: [] }) };
  const actions = (applet.actions || []).filter(a => a.id !== actionId);

  if (typeStr.startsWith('syslog')) {
    actions.push({ id: actionId, type: 'syslog', message: payload });
  } else {
    actions.push({ id: actionId, type: 'cli', command: payload });
  }

  applet.actions = actions;
  eemApplets[appletName] = applet;

  const updatedState = { ...state, eemApplets };
  return {
    success: true,
    output: '',
    newState: {
      eemApplets,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
};

export const cmdNoEemAction: CommandHandler = (state, input, _ctx) => {
  if (state.currentMode !== 'config-applet') return { success: false, error: cliModeError() };
  const appletName = state.currentEemApplet;
  if (!appletName) return { success: false, error: '% No EEM applet selected' };

  const match = input.match(/^no\s+action\s+(\S+)$/i);
  if (!match) return { success: false, error: '% Invalid no action command. Usage: no action <id>' };

  const actionId = match[1];
  const eemApplets = { ...state.eemApplets };
  const applet = { ...(eemApplets[appletName] || { events: [], actions: [] }) };
  applet.actions = (applet.actions || []).filter(a => a.id !== actionId);
  eemApplets[appletName] = applet;

  const updatedState = { ...state, eemApplets };
  return {
    success: true,
    output: '',
    newState: {
      eemApplets,
      runningConfig: buildRunningConfig(updatedState)
    }
  };
};

// Show: show event manager applet all
export const cmdShowEventManager: CommandHandler = (state, _input, _ctx) => {
  const applets = state.eemApplets || {};
  const names = Object.keys(applets);
  if (names.length === 0) {
    return { success: true, output: 'No EEM applets registered' };
  }

  let output = '';
  for (const name of names) {
    const item = applets[name];
    output += `applet: ${name}\n`;
    for (const ev of (item.events || [])) {
      output += ` event ${ev.type} pattern "${ev.pattern}"\n`;
    }
    for (const act of (item.actions || [])) {
      if (act.type === 'syslog') {
        output += ` action ${act.id} syslog msg "${act.message}"\n`;
      } else {
        output += ` action ${act.id} cli command "${act.command}"\n`;
      }
    }
  }
  return { success: true, output: output.trimEnd() };
};

// NETCONF commands
export function cmdNetconfYang(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const updatedState = { ...state, netconfYangEnabled: true };
  return {
    success: true,
    output: 'netconf-yang datastore initialized',
    newState: { netconfYangEnabled: true, runningConfig: buildRunningConfig(updatedState) }
  };
}

export function cmdNoNetconfYang(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const updatedState = { ...state, netconfYangEnabled: false };
  return {
    success: true,
    output: 'netconf-yang stopped',
    newState: { netconfYangEnabled: false, runningConfig: buildRunningConfig(updatedState) }
  };
}

export function cmdNetconfSsh(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const updatedState = { ...state, netconfSshEnabled: true };
  return {
    success: true,
    output: 'netconf ssh server enabled on port 830',
    newState: { netconfSshEnabled: true, runningConfig: buildRunningConfig(updatedState) }
  };
}

export function cmdNoNetconfSsh(state: SwitchState, _input: string, _ctx: CommandContext): CommandResult {
  if (state.currentMode !== 'config') return { success: false, error: cliModeError() };
  const updatedState = { ...state, netconfSshEnabled: false };
  return {
    success: true,
    output: 'netconf ssh server disabled',
    newState: { netconfSshEnabled: false, runningConfig: buildRunningConfig(updatedState) }
  };
}

export const cmdShowNetconfYang: CommandHandler = (state, _input, _ctx) => {
  let output = `netconf-yang status: ${state.netconfYangEnabled ? 'running' : 'disabled'}\n`;
  output += `netconf ssh port 830: ${state.netconfSshEnabled ? 'listening' : 'disabled'}\n`;
  return { success: true, output: output.trimEnd() };
};
