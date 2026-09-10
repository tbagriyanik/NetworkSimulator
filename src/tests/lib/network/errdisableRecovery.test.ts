import { describe, it, expect } from 'vitest';
import { enableErrdisableCause, setErrdisableInterval } from '@/lib/network/errdisableRecovery';
import type { SwitchState } from '@/lib/network/types';

describe('errdisableRecovery (Cisco Errdisable Auto-Recovery)', () => {
  it('should enable recovery causes and set interval correctly', () => {
    const mockState = {} as SwitchState;

    enableErrdisableCause(mockState, 'port-security');
    setErrdisableInterval(mockState, 30);

    expect(mockState.errdisableConfig?.enabledCauses).toContain('port-security');
    expect(mockState.errdisableConfig?.interval).toBe(30);
  });
});
