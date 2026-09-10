import { describe, it, expect } from 'vitest';
import {
  getOrCreateEigrpNamedInstance,
  configureEigrpAddressFamily,
  calculateEigrpWideMetric,
} from '@/lib/network/eigrpNamedMode';
import type { SwitchState } from '@/lib/network/types';

describe('EIGRP Named Mode and 64-bit Wide Metrics Simulation', () => {
  it('should create EIGRP named instance with Address-Family and autonomous-system', () => {
    const mockState = {} as SwitchState;
    const instance = getOrCreateEigrpNamedInstance(mockState, 'CCNP_ENTERPRISE');
    expect(instance.name).toBe('CCNP_ENTERPRISE');

    configureEigrpAddressFamily(
      mockState,
      'CCNP_ENTERPRISE',
      'ipv4-unicast',
      100,
      ['10.0.0.0/8', '192.168.1.0/24'],
      '1.1.1.1'
    );

    const af = mockState.eigrpNamedInstances?.['ccnp_enterprise']?.addressFamilies['ipv4-unicast'];
    expect(af).toBeDefined();
    expect(af?.asNumber).toBe(100);
    expect(af?.networks).toContain('10.0.0.0/8');
    expect(af?.routerId).toBe('1.1.1.1');
    expect(af?.metrics64Bit).toBe(true);
  });

  it('should calculate accurate 64-bit Wide Metrics based on bandwidth and delay', () => {
    const metricFastEthernet = calculateEigrpWideMetric({
      bandwidthKbps: 100_000,
      delayPicoseconds: 100_000_000_000, // 100 microseconds
    });

    const metricGigabitEthernet = calculateEigrpWideMetric({
      bandwidthKbps: 1_000_000,
      delayPicoseconds: 10_000_000_000, // 10 microseconds
    });

    // Gigabit metric must be significantly lower (better) than FastEthernet
    expect(metricGigabitEthernet).toBeLessThan(metricFastEthernet);
    expect(metricGigabitEthernet).toBeGreaterThan(0);
  });
});
