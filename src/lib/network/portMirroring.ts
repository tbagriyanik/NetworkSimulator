import type { SwitchState } from './types';

export interface SpanSession {
  id: number;
  sourceInterfaces: string[];
  destinationInterface?: string;
  enabled: boolean;
}

export function getOrCreateSpanSession(state: SwitchState, sessionId: number): SpanSession {
  if (!state.spanSessions) {
    state.spanSessions = {};
  }
  if (!state.spanSessions[sessionId]) {
    state.spanSessions[sessionId] = {
      id: sessionId,
      sourceInterfaces: [],
      enabled: true,
    };
  }
  return state.spanSessions[sessionId];
}

export function setSpanSourceInterface(state: SwitchState, sessionId: number, ifName: string): void {
  const session = getOrCreateSpanSession(state, sessionId);
  const normalized = ifName.toLowerCase();
  if (!session.sourceInterfaces.includes(normalized)) {
    session.sourceInterfaces.push(normalized);
  }
}

export function setSpanDestinationInterface(state: SwitchState, sessionId: number, ifName: string): void {
  const session = getOrCreateSpanSession(state, sessionId);
  session.destinationInterface = ifName.toLowerCase();
}

export function isSpanActive(state: SwitchState, sourceIfName: string): boolean {
  if (!state.spanSessions) return false;
  const normalized = sourceIfName.toLowerCase();
  return Object.values(state.spanSessions).some(
    (sess) => sess.enabled && !!sess.destinationInterface && sess.sourceInterfaces.includes(normalized)
  );
}
