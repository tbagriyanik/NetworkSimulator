import { describe, expect, it } from 'vitest';
import { BGPPatterns, EIGRPPatterns, OSPFPatterns, getRoutingPatternCategory } from '@/lib/network/parser/routingPatternCategories';

describe('routing pattern categories', () => {
  it('classifies protocol commands', () => {
    expect(getRoutingPatternCategory('router ospf 1')).toBe('ospf');
    expect(getRoutingPatternCategory('neighbor ebgp-multihop')).toBe('bgp');
    expect(getRoutingPatternCategory('ipv6 router eigrp 10')).toBe('eigrp');
  });

  it('exposes non-empty protocol catalogs without changing parser output', () => {
    expect(Object.keys(OSPFPatterns).length).toBeGreaterThan(0);
    expect(Object.keys(BGPPatterns).length).toBeGreaterThan(0);
    expect(Object.keys(EIGRPPatterns).length).toBeGreaterThan(0);
  });
});
