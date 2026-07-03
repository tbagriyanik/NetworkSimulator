import { SwitchState } from './types';

export type FaultType =
  | 'wrongSubnetMask'
  | 'wrongVlan'
  | 'shutdownInterface'
  | 'wrongDefaultGateway'
  | 'aclBlocking'
  | 'duplicateIp'
  | 'wrongIpAddress'
  | 'missingRoute';

export interface FaultDefinition {
  id: string;
  deviceId: string;
  faultType: FaultType;
  configKey: string; // e.g., 'ports.fa0/1.ipAddress'
  faultValue: unknown;
  correctValue: unknown;
  description: { tr: string; en: string }; // Visible to teacher, hidden from student
  hint?: { tr: string; en: string }; // Progressive hint for the student
}

/**
 * Applies a fault to a device state.
 * Returns a new state with the fault injected.
 */
export function applyFault(state: SwitchState, fault: FaultDefinition): SwitchState {
  const newState = JSON.parse(JSON.stringify(state));
  const parts = fault.configKey.split('.');

  let current: Record<string, unknown> = newState;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current && typeof current === 'object' && part in current) {
      current = current[part] as Record<string, unknown>;
    } else {
      return state;
    }
  }

  const lastPart = parts[parts.length - 1];
  if (current && typeof current === 'object') {
    current[lastPart] = fault.faultValue;
  }

  return newState;
}

/**
 * Checks if a fault has been resolved by comparing current state with the correct value.
 */
export function checkFaultResolved(state: SwitchState, fault: FaultDefinition): boolean {
  const parts = fault.configKey.split('.');

  let current: Record<string, unknown> = state as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current && typeof current === 'object' && part in current) {
      current = current[part] as Record<string, unknown>;
    } else {
      return false;
    }
  }

  const lastPart = parts[parts.length - 1];
  const currentValue = current?.[lastPart];

  // For complex objects, simple comparison might not work, but for most config it's fine
  if (typeof fault.correctValue === 'object' && fault.correctValue !== null) {
     return JSON.stringify(currentValue) === JSON.stringify(fault.correctValue);
  }

  return currentValue === fault.correctValue;
}
