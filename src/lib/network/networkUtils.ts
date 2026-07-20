import { SwitchState } from './types';
import { errorHandler } from '@/lib/errors/errorHandler';

// Cache Map representation of deviceStates to avoid O(N) conversion in hot paths.
// Since the store uses immutable state, we can use the Record object as a key.
const deviceStatesCache = new WeakMap<Record<string, SwitchState>, Map<string, SwitchState>>();
const EMPTY_MAP = new Map<string, SwitchState>();

/**
 * Ensures that deviceStates is a Map.
 * If it's a plain object (Record<string, SwitchState>), it converts it to a Map.
 */
export function ensureDeviceStatesMap(deviceStates: Map<string, SwitchState> | Record<string, SwitchState> | undefined | null): Map<string, SwitchState> {
  if (!deviceStates) return EMPTY_MAP;
  if (deviceStates instanceof Map) return deviceStates;
  
  // Check cache first
  const cached = deviceStatesCache.get(deviceStates);
  if (cached) return cached;

  try {
    const map = new Map(Object.entries(deviceStates));
    deviceStatesCache.set(deviceStates, map);
    return map;
  } catch (err) {
    errorHandler.logError(new Error('Failed to convert deviceStates to Map'), { error: String(err) });
    return EMPTY_MAP;
  }
}
