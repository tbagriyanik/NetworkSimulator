import { SwitchState } from './types';

export type FaultType =
  | 'wrongSubnetMask'
  | 'wrongVlan'
  | 'shutdownInterface'
  | 'wrongDefaultGateway'
  | 'aclBlocking'
  | 'duplicateIp'
  | 'wrongIpAddress'
  | 'missingRoute'
  | 'brokenTrunk'
  | 'ospfIssue'
  | 'natIssue'
  | 'stpIssue';

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
 * Checks if a fault has been resolved by comparing current state with the correct value.
 */
export function checkFaultResolved(state: SwitchState, fault: FaultDefinition): boolean {
  const parts = fault.configKey.split('.');

  let current: Record<string, unknown> = state as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current && typeof current === 'object') {
      const matchKey = Object.keys(current).find(k => k.toLowerCase() === part.toLowerCase()) || part;
      if (matchKey in current) {
        current = current[matchKey] as Record<string, unknown>;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  const lastPart = parts[parts.length - 1];
  const lastKey = Object.keys(current || {}).find(k => k.toLowerCase() === lastPart.toLowerCase()) || lastPart;
  const currentValue = current?.[lastKey];

  // For complex objects, simple comparison might not work, but for most config it's fine
  if (typeof fault.correctValue === 'object' && fault.correctValue !== null) {
     return JSON.stringify(currentValue) === JSON.stringify(fault.correctValue);
  }

  return currentValue === fault.correctValue;
}
