import { describe, it, expect } from 'vitest';
import { setSpanSourceInterface, setSpanDestinationInterface, isSpanActive } from '@/lib/network/portMirroring';
import type { SwitchState } from '@/lib/network/types';

describe('portMirroring (Cisco SPAN)', () => {
  it('should register SPAN source and destination interfaces correctly', () => {
    const mockState = {} as SwitchState;

    setSpanSourceInterface(mockState, 1, 'GigabitEthernet0/1');
    setSpanDestinationInterface(mockState, 1, 'GigabitEthernet0/2');

    expect(isSpanActive(mockState, 'GigabitEthernet0/1')).toBe(true);
    expect(isSpanActive(mockState, 'GigabitEthernet0/3')).toBe(false);
  });
});
