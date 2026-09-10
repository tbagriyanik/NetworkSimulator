import { describe, it, expect } from 'vitest';
import { addClassToQosPolicy } from '@/lib/network/qosClassMapPolicyMap';
import type { SwitchState } from '@/lib/network/types';

describe('qosClassMapPolicyMap (Class-Based QoS)', () => {
  it('should create policy-map and attach class-map bandwidth/priority rules', () => {
    const mockState = {} as SwitchState;

    addClassToQosPolicy(mockState, 'QOS_POLICY', 'VOICE_TRAFFIC', 30, undefined);

    expect(mockState.qosPolicies?.['qos_policy']?.classes).toHaveLength(1);
    expect(mockState.qosPolicies?.['qos_policy']?.classes[0].name).toBe('VOICE_TRAFFIC');
    expect(mockState.qosPolicies?.['qos_policy']?.classes[0].priorityPercent).toBe(30);
  });
});
