import type { SwitchState } from './types';
import { executeCommand } from './executor';

export type EemTrigger = 'syslog' | 'cli' | 'timer';

export interface EemExecutionResult {
  state: SwitchState;
  firedApplets: string[];
  logs: string[];
}

/** Dispatches a concrete event to EEM and applies CLI actions to live state. */
export function dispatchEemEvent(
  state: SwitchState,
  type: EemTrigger,
  value: string,
  language: 'tr' | 'en' = 'en'
): EemExecutionResult {
  let current = state;
  const firedApplets: string[] = [];
  const logs: string[] = [];
  for (const [name, applet] of Object.entries(state.eemApplets || {})) {
    const matched = (applet.events || []).some(event => {
      if (event.type !== type) return false;
      if (type === 'timer') return Number(value) >= Number(event.pattern || 0);
      try { return new RegExp(event.pattern || '', 'i').test(value); } catch { return value.includes(event.pattern || ''); }
    });
    if (!matched) continue;
    firedApplets.push(name);
    for (const action of applet.actions || []) {
      if (action.type === 'syslog' && action.message) {
        logs.push(action.message);
        current = { ...current, eventLogs: [...(current.eventLogs || []), action.message] };
      } else if (action.type === 'cli' && action.command) {
        const result = executeCommand(current, action.command, language, undefined, undefined, undefined, undefined, true);
        if (result.newState) current = { ...current, ...result.newState };
        if (result.output) logs.push(result.output);
        if (result.error) logs.push(result.error);
      }
    }
  }
  return { state: current, firedApplets, logs };
}
