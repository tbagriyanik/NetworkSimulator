import type { SwitchState } from './types';

export interface QosPolicyClass {
  name: string;
  priorityPercent?: number;
  bandwidthKbps?: number;
}

export interface QosPolicy {
  name: string;
  classes: QosPolicyClass[];
}

export function getOrCreateQosPolicy(state: SwitchState, name: string): QosPolicy {
  if (!state.qosPolicies) {
    state.qosPolicies = {};
  }
  const key = name.toLowerCase();
  if (!state.qosPolicies[key]) {
    state.qosPolicies[key] = {
      name,
      classes: [],
    };
  }
  return state.qosPolicies[key];
}

export function addClassToQosPolicy(
  state: SwitchState,
  policyName: string,
  className: string,
  priorityPercent?: number,
  bandwidthKbps?: number
): void {
  const policy = getOrCreateQosPolicy(state, policyName);
  const existing = policy.classes.find((c) => c.name.toLowerCase() === className.toLowerCase());
  if (existing) {
    existing.priorityPercent = priorityPercent;
    existing.bandwidthKbps = bandwidthKbps;
  } else {
    policy.classes.push({
      name: className,
      priorityPercent,
      bandwidthKbps,
    });
  }
}
