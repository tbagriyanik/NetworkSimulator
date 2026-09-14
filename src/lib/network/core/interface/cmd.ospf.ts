import type { CommandHandler } from '../commandTypes';
import type { SwitchState } from '../../types';
import { buildRunningConfig } from '../configBuilder';

const getTargetPortKey = (state: SwitchState): string | undefined => {
  if (!state.currentInterface) return undefined;
  const target = state.currentInterface.toLowerCase();
  return Object.keys(state.ports || {}).find(k => k.toLowerCase() === target) || state.currentInterface;
};

const updatePort = (
  state: SwitchState,
  patch: Record<string, unknown>
): { success: true; newState: Partial<SwitchState> } | { success: false; error: string } => {
  const portKey = getTargetPortKey(state);
  if (!portKey) return { success: false, error: '% No interface selected' };
  const ports = { ...state.ports };
  const port = ports[portKey];
  if (!port) return { success: false, error: '% Interface not found' };
  ports[portKey] = { ...port, ...patch };
  return { success: true, newState: { ports, runningConfig: buildRunningConfig({ ...state, ports }) } };
};

// ── ip ospf authentication [message-digest|null] ─────────────────────────
export const cmdIpOspfAuthentication: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfAuthType: 'none', ospfAuthKey: undefined, ospfMd5KeyId: undefined });
  }
  const isMd5 = /message-digest/i.test(input);
  const type: 'none' | 'simple' | 'md5' = isMd5 ? 'md5' : 'simple';
  return updatePort(state, { ospfAuthType: type });
};

// ── ip ospf authentication-key <key> ──────────────────────────────────────
export const cmdIpOspfAuthenticationKey: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfAuthKey: undefined });
  }
  const match = input.match(/authentication-key\s+(\S+)/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  return updatePort(state, { ospfAuthKey: match[1] });
};

// ── ip ospf message-digest-key <key-id> md5 <key> ────────────────────────
export const cmdIpOspfMessageDigestKey: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfMd5KeyId: undefined, ospfAuthKey: undefined });
  }
  const match = input.match(/message-digest-key\s+(\d+)\s+md5\s+(\S+)/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const keyId = parseInt(match[1], 10);
  if (keyId < 1 || keyId > 255) return { success: false, error: '% Key ID must be 1-255' };
  return updatePort(state, { ospfMd5KeyId: keyId, ospfAuthKey: match[2], ospfAuthType: 'md5' });
};

// ── ip ospf cost <1-65535> ───────────────────────────────────────────────
export const cmdIpOspfCost: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfCost: undefined });
  }
  const match = input.match(/cost\s+(\d+)/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const cost = parseInt(match[1], 10);
  if (cost < 1 || cost > 65535) return { success: false, error: '% Cost must be 1-65535' };
  return updatePort(state, { ospfCost: cost });
};

// ── ip ospf hello-interval <1-65535> ─────────────────────────────────────
export const cmdIpOspfHelloInterval: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfHelloInterval: undefined });
  }
  const match = input.match(/hello-interval\s+(\d+)/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const sec = parseInt(match[1], 10);
  if (sec < 1 || sec > 65535) return { success: false, error: '% Hello interval must be 1-65535' };
  return updatePort(state, { ospfHelloInterval: sec });
};

// ── ip ospf dead-interval <1-65535> ──────────────────────────────────────
export const cmdIpOspfDeadInterval: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfDeadInterval: undefined });
  }
  const match = input.match(/dead-interval\s+(\d+)/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const sec = parseInt(match[1], 10);
  if (sec < 1 || sec > 65535) return { success: false, error: '% Dead interval must be 1-65535' };
  return updatePort(state, { ospfDeadInterval: sec });
};

// ── ip ospf priority <0-255> ─────────────────────────────────────────────
export const cmdIpOspfPriority: CommandHandler = (state, input) => {
  if (/no\s+/i.test(input)) {
    return updatePort(state, { ospfPriority: undefined });
  }
  const match = input.match(/priority\s+(\d+)/i);
  if (!match) return { success: false, error: '% Incomplete command' };
  const prio = parseInt(match[1], 10);
  if (prio > 255) return { success: false, error: '% Priority must be 0-255' };
  return updatePort(state, { ospfPriority: prio });
};

export const ospfInterfaceHandlers: Record<string, CommandHandler> = {
  'ip ospf authentication': cmdIpOspfAuthentication,
  'no ip ospf authentication': cmdIpOspfAuthentication,
  'ip ospf authentication-key': cmdIpOspfAuthenticationKey,
  'no ip ospf authentication-key': cmdIpOspfAuthenticationKey,
  'ip ospf message-digest-key': cmdIpOspfMessageDigestKey,
  'no ip ospf message-digest-key': cmdIpOspfMessageDigestKey,
  'ip ospf cost': cmdIpOspfCost,
  'no ip ospf cost': cmdIpOspfCost,
  'ip ospf hello-interval': cmdIpOspfHelloInterval,
  'no ip ospf hello-interval': cmdIpOspfHelloInterval,
  'ip ospf dead-interval': cmdIpOspfDeadInterval,
  'no ip ospf dead-interval': cmdIpOspfDeadInterval,
  'ip ospf priority': cmdIpOspfPriority,
  'no ip ospf priority': cmdIpOspfPriority,
};