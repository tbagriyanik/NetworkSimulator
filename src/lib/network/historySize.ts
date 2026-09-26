/**
 * Effective CLI history size.
 *
 * `history size N` under `line console 0` / `line vty 0 4` is stored on
 * LineConfig.historySize. Nothing previously consumed it, so both the terminal
 * up-arrow history and `show history` silently used hard-coded caps. This
 * helper is the single source of truth: line-level configuration wins, and
 * 0 / unset falls back to the app-wide default.
 */
import type { SwitchState } from './types';

export const DEFAULT_HISTORY_SIZE = 50;

export function getEffectiveHistorySize(state: SwitchState): number {
  const consoleSize = state.security?.consoleLine?.historySize;
  const vtySize = state.security?.vtyLines?.historySize;
  const configured = consoleSize || vtySize || 0;
  return configured > 0 ? configured : DEFAULT_HISTORY_SIZE;
}