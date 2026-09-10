import { describe, it, expect } from 'vitest';
import { addOspfAreaRange } from '@/lib/network/ospfAreaSummarization';
import type { SwitchState } from '@/lib/network/types';

describe('ospfAreaSummarization (Cisco OSPF Multi-Area ABR Summarization)', () => {
  it('should register OSPF area range for ABR summarization', () => {
    const mockState = {} as SwitchState;

    addOspfAreaRange(mockState, '1', '10.1.0.0', '255.255.0.0', true);

    expect(mockState.ospfAreaRanges).toHaveLength(1);
    expect(mockState.ospfAreaRanges?.[0].network).toBe('10.1.0.0');
    expect(mockState.ospfAreaRanges?.[0].mask).toBe('255.255.0.0');
  });
});
