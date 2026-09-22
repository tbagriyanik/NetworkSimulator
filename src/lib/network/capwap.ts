import type { SwitchState } from './types';

export type CapwapState = 'discovery' | 'joining' | 'configuring' | 'data' | 'run' | 'failed';

export interface CapwapSession {
  apName: string;
  state: CapwapState;
  controlChannel: boolean;
  dataChannel: boolean;
  lastTransition: number;
  retries: number;
}

export interface CapwapTickResult {
  state: SwitchState;
  sessions: Record<string, CapwapSession>;
  events: string[];
}

/** Advances CAPWAP control/data channels for APs registered on a WLC. */
export function tickCapwap(state: SwitchState, now = Date.now()): CapwapTickResult {
  const sessions: Record<string, CapwapSession> = state.capwapSessions ?? {};
  const events: string[] = [];
  const aps = state.wlcAps ?? {};
  Object.entries(aps).forEach(([name, ap]) => {
    const previous = sessions[name] || { apName: name, state: 'discovery' as const, controlChannel: false, dataChannel: false, lastTransition: now, retries: 0 };
    let next = previous;
    if (ap.status === 'disconnected') {
      next = { ...previous, state: 'failed', controlChannel: false, dataChannel: false, retries: previous.retries + 1, lastTransition: now };
    } else if (previous.state === 'discovery') {
      next = { ...previous, state: 'joining', controlChannel: true, lastTransition: now };
      events.push(`CAPWAP ${name}: discovery response received`);
    } else if (previous.state === 'joining') {
      next = { ...previous, state: 'configuring', lastTransition: now };
      events.push(`CAPWAP ${name}: join accepted`);
    } else if (previous.state === 'configuring' || ap.status === 'downloading') {
      next = { ...previous, state: 'data', dataChannel: true, lastTransition: now };
      events.push(`CAPWAP ${name}: configuration/data channel established`);
    } else if (previous.state === 'data' || previous.state === 'run') {
      next = { ...previous, state: 'run', controlChannel: true, dataChannel: true };
    }
    sessions[name] = next;
    if (next.state === 'run' && ap.status !== 'joined') aps[name] = { ...ap, status: 'joined' };
  });
  return { state: { ...state, wlcAps: aps, capwapSessions: sessions }, sessions, events };
}
