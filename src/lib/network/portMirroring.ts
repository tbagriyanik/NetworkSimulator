import type { SwitchState } from './types';

export interface SpanSession {
  id: number;
  sourceInterfaces: string[];
  destinationInterface?: string;
  remoteVlan?: number;
  type?: 'local' | 'rspan-source' | 'rspan-destination';
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
      type: 'local',
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

export function setSpanRemoteVlan(state: SwitchState, sessionId: number, vlanId: number, isDestination: boolean = false): void {
  const session = getOrCreateSpanSession(state, sessionId);
  session.remoteVlan = vlanId;
  session.type = isDestination ? 'rspan-destination' : 'rspan-source';
}

export function getSpanMirrorDestinations(state: SwitchState, sourceIfName: string): { destinationInterface?: string; remoteVlan?: number; type?: 'local' | 'rspan-source' | 'rspan-destination' }[] {
  if (!state.spanSessions) return [];
  const normalized = sourceIfName.toLowerCase();
  const results: { destinationInterface?: string; remoteVlan?: number; type?: 'local' | 'rspan-source' | 'rspan-destination' }[] = [];

  for (const sess of Object.values(state.spanSessions)) {
    if (!sess.enabled) continue;
    if (sess.sourceInterfaces.includes(normalized)) {
      if (sess.destinationInterface || sess.remoteVlan) {
        results.push({
          destinationInterface: sess.destinationInterface,
          remoteVlan: sess.remoteVlan,
          type: sess.type || 'local',
        });
      }
    }
  }
  return results;
}

/**
 * RSPAN destination sessions matching an ingress frame's remote VLAN tag.
 * On the destination switch, frames arriving tagged with the RSPAN VLAN are
 * forwarded out the session's destination interface by the analyzer.
 */
export function getRspanDestinationSessions(
  state: SwitchState,
  vlanId: number | undefined
): { destinationInterface?: string; remoteVlan?: number }[] {
  if (!state.spanSessions || vlanId === undefined) return [];
  const results: { destinationInterface?: string; remoteVlan?: number }[] = [];
  for (const sess of Object.values(state.spanSessions)) {
    if (!sess.enabled) continue;
    if (sess.type === 'rspan-destination' && sess.remoteVlan === vlanId && sess.destinationInterface) {
      results.push({ destinationInterface: sess.destinationInterface, remoteVlan: sess.remoteVlan });
    }
  }
  return results;
}

/**
 * The RSPAN source sessions that actively mirror a given ingress interface.
 * Returns the remote VLAN each session mirrors traffic onto.
 */
export function getRspanSourceVlans(state: SwitchState, sourceIfName: string): number[] {
  if (!state.spanSessions) return [];
  const normalized = sourceIfName.toLowerCase();
  const found: number[] = [];
  for (const sess of Object.values(state.spanSessions)) {
    if (!sess.enabled) continue;
    if (sess.type === 'rspan-source' && sess.remoteVlan !== undefined && sess.sourceInterfaces.includes(normalized)) {
      found.push(sess.remoteVlan);
    }
  }
  return found;
}

export function isSpanActive(state: SwitchState, sourceIfName: string): boolean {
  return getSpanMirrorDestinations(state, sourceIfName).length > 0;
}

