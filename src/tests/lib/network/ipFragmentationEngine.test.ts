import { describe, it, expect } from 'vitest';
import { checkOspfMtuCompatibility, processIpFragmentation } from '../../../lib/network/ipFragmentationEngine';

describe('ipFragmentationEngine', () => {
  it('does not fragment packet when size is within MTU', () => {
    const packet = {
      id: 'packet-1',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 1400,
      dontFragment: false,
    };

    const result = processIpFragmentation(packet, 1500);
    expect(result.fragmented).toBe(false);
    expect(result.dropped).toBe(false);
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0].moreFragments).toBe(false);
    expect(result.fragments[0].fragmentOffset).toBe(0);
  });

  it('drops packet with DF bit when size exceeds MTU', () => {
    const packet = {
      id: 'packet-2',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 2000,
      dontFragment: true,
    };

    const result = processIpFragmentation(packet, 1500);
    expect(result.fragmented).toBe(false);
    expect(result.dropped).toBe(true);
    expect(result.error).toContain('exceeds MTU');
    expect(result.error).toContain('DF bit set');
    expect(result.icmpDetail).toContain('Type 3, Code 4');
  });

  it('fragments packet when size exceeds MTU and DF bit is not set', () => {
    const packet = {
      id: 'packet-3',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 3000,
      dontFragment: false,
    };

    const result = processIpFragmentation(packet, 1500);
    expect(result.fragmented).toBe(true);
    expect(result.dropped).toBe(false);
    expect(result.fragments.length).toBeGreaterThan(1);

    // Check first fragment
    expect(result.fragments[0].moreFragments).toBe(true);
    expect(result.fragments[0].fragmentOffset).toBe(0);

    // Check last fragment
    const lastFragment = result.fragments[result.fragments.length - 1];
    expect(lastFragment.moreFragments).toBe(false);

    // All fragments should have same identification
    const identifications = result.fragments.map(f => f.identification);
    expect(new Set(identifications).size).toBe(1);
  });

  it('rejects invalid MTU below minimum (68 bytes)', () => {
    const packet = {
      id: 'packet-4',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 1000,
      dontFragment: false,
    };

    const result = processIpFragmentation(packet, 50);
    expect(result.fragmented).toBe(false);
    expect(result.dropped).toBe(true);
    expect(result.error).toContain('Invalid MTU');
    expect(result.error).toContain('must be at least 68');
  });

  it('prevents infinite loop when MTU is too small for fragmentation', () => {
    const packet = {
      id: 'packet-5',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 2000,
      dontFragment: false,
    };

    // MTU of 27 bytes would result in 0 payload per fragment after 8-byte alignment
    // Math.floor((27 - 20) / 8) * 8 = Math.floor(7 / 8) * 8 = 0 * 8 = 0
    // This is caught by the minimum MTU check (68 bytes) before reaching the payload check
    const result = processIpFragmentation(packet, 27);
    expect(result.fragmented).toBe(false);
    expect(result.dropped).toBe(true);
    expect(result.error).toContain('Invalid MTU');
    expect(result.error).toContain('must be at least 68');
  });

  it('handles edge case MTU exactly at minimum (68 bytes)', () => {
    const packet = {
      id: 'packet-6',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 68,
      dontFragment: false,
    };

    const result = processIpFragmentation(packet, 68);
    expect(result.fragmented).toBe(false);
    expect(result.dropped).toBe(false);
  });

  it('calculates 8-byte aligned fragment offsets correctly', () => {
    const packet = {
      id: 'packet-7',
      sourceIp: '192.168.1.1',
      targetIp: '192.168.1.2',
      protocol: 'TCP',
      totalLength: 3000,
      dontFragment: false,
    };

    const result = processIpFragmentation(packet, 1500);
    expect(result.fragmented).toBe(true);

    // Check that fragment offsets are in correct order
    for (let i = 1; i < result.fragments.length; i++) {
      expect(result.fragments[i].fragmentOffset).toBeGreaterThan(result.fragments[i - 1].fragmentOffset!);
    }

    // Check that fragment offsets are integers (they represent 8-byte units)
    result.fragments.forEach(frag => {
      expect(Number.isInteger(frag.fragmentOffset)).toBe(true);
    });
  });

  it('preserves a caller-provided IP identification across all fragments', () => {
    const result = processIpFragmentation({
      id: 'packet-8', sourceIp: '10.0.0.1', targetIp: '10.0.0.2', protocol: 'UDP',
      totalLength: 3000, identification: 4242,
    }, 1500);
    expect(result.fragments.every(fragment => fragment.identification === 4242)).toBe(true);
  });

  it('accepts an exact MTU boundary without fragmentation', () => {
    const result = processIpFragmentation({
      id: 'packet-9', sourceIp: '10.0.0.1', targetIp: '10.0.0.2', protocol: 'UDP', totalLength: 1500,
    }, 1500);
    expect(result).toMatchObject({ fragmented: false, dropped: false });
    expect(result.fragments).toHaveLength(1);
  });

  it('models OSPF MTU mismatch as a stuck EXSTART adjacency', () => {
    const result = checkOspfMtuCompatibility(1500, 1400);
    expect(result).toMatchObject({ isCompatible: false, state: 'EXSTART', stuck: true });
    expect(result.detail).toContain('MTU mismatch');
  });
});
