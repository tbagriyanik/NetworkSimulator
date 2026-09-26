/**
 * Removes every piece of persisted state that belongs to the *previous* project
 * so that opening an exam, a guided lesson, an example or a project file never
 * leaks data from the project that was loaded before it.
 *
 * Only project-scoped storage is cleared. Global user preferences (language,
 * theme, achievements, feature flags, onboarding state, etc.) are left intact.
 */
const PROJECT_STORAGE_KEYS = [
  'netsim_autosave',
  'netsim_history',
  'network-simulator-storage',
  'network-simulator-storage-backup',
  'netsim_window_positions_backup',
  'netsim_multi_device_windows',
  'examModeState',
  'guidedModeState',
  'guidedModeState_stepIndex',
  'guidedModeState_minimized',
  'lastProjectDescription',
];

const PROJECT_STORAGE_PREFIXES = [
  'draggable_position_',
  'mail_inbox_',
  'mail_sent_',
  'netsim_window_',
];

import { safeRemoveItem, safeGetStorageKeys } from './safeStorage';

export function clearProjectLocalStorage(): void {
  for (const key of PROJECT_STORAGE_KEYS) {
    safeRemoveItem(key);
  }

  for (const prefix of PROJECT_STORAGE_PREFIXES) {
    const prefixedKeys = safeGetStorageKeys(prefix);
    for (const key of prefixedKeys) {
      safeRemoveItem(key);
    }
  }
}
