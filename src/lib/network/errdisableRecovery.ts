import type { SwitchState } from './types';

export function getOrCreateErrdisableConfig(state: SwitchState) {
  if (!state.errdisableConfig) {
    state.errdisableConfig = {
      enabledCauses: [],
      interval: 300, // 300 seconds default interval
    };
  }
  return state.errdisableConfig;
}

export function enableErrdisableCause(state: SwitchState, cause: string): void {
  const config = getOrCreateErrdisableConfig(state);
  const normalized = cause.toLowerCase();
  if (!config.enabledCauses.includes(normalized)) {
    config.enabledCauses.push(normalized);
  }
}

export function setErrdisableInterval(state: SwitchState, intervalSeconds: number): void {
  const config = getOrCreateErrdisableConfig(state);
  config.interval = Math.max(30, intervalSeconds);
}
