import { describe, it, expect } from 'vitest';
import {
  configureOspfVirtualLink,
  removeOspfVirtualLink,
  isVirtualLinkValidForBackbone,
  getOrCreateOspfVirtualLinks,
} from '@/lib/network/ospfVirtualLink';
import type { SwitchState } from '@/lib/network/types';

describe('OSPF Virtual-Link Simulation (Transit Area & Backbone Continuity)', () => {
  it('should configure OSPF virtual-link across non-backbone transit area', () => {
    const mockState = {} as SwitchState;
    configureOspfVirtualLink(mockState, '1', '2.2.2.2', 'md5', 'cisco123');

    const vlinks = getOrCreateOspfVirtualLinks(mockState);
    expect(vlinks['1_2.2.2.2']).toBeDefined();
    expect(vlinks['1_2.2.2.2'].transitAreaId).toBe('1');
    expect(vlinks['1_2.2.2.2'].neighborRouterId).toBe('2.2.2.2');
    expect(vlinks['1_2.2.2.2'].authType).toBe('md5');
    expect(vlinks['1_2.2.2.2'].status).toBe('up');
  });

  it('should remove OSPF virtual-link', () => {
    const mockState = {} as SwitchState;
    configureOspfVirtualLink(mockState, '1', '2.2.2.2');

    const removed = removeOspfVirtualLink(mockState, '1', '2.2.2.2');
    expect(removed).toBe(true);
    expect(mockState.ospfVirtualLinks?.['1_2.2.2.2']).toBeUndefined();
  });

  it('should reject Area 0 as transit area and validate transit backbone extension', () => {
    // Area 0 cannot be used as transit area for virtual-links
    expect(isVirtualLinkValidForBackbone('0', [])).toBe(false);
    expect(isVirtualLinkValidForBackbone('0.0.0.0', [])).toBe(false);

    // Non-backbone transit area with active virtual link is valid
    const valid = isVirtualLinkValidForBackbone('1', [
      { transitAreaId: '1', neighborRouterId: '2.2.2.2', status: 'up' },
    ]);
    expect(valid).toBe(true);
  });
});
