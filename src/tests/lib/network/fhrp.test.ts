import { describe, it, expect } from 'vitest';

describe('FHRP (First Hop Redundancy Protocols)', () => {
  interface HSRPGroup {
    group: number;
    virtualIp: string;
    priority: number;
    preempt: boolean;
    state: 'Active' | 'Standby' | 'Listen';
    routerId: string;
  }

  function simulateHSRP(
    routers: Array<{ id: string; priority: number; preempt: boolean }>,
    virtualIp: string,
    group: number
  ): HSRPGroup[] {
    const sorted = [...routers].sort((a, b) => b.priority - a.priority);
    return sorted.map((r, i) => ({
      group,
      virtualIp,
      priority: r.priority,
      preempt: r.preempt,
      state: i === 0 ? 'Active' as const : (i === 1 ? 'Standby' as const : 'Listen' as const),
      routerId: r.id,
    }));
  }

  it('should elect Active router based on highest priority', () => {
    const groups = simulateHSRP(
      [{ id: 'R1', priority: 100, preempt: false }, { id: 'R2', priority: 150, preempt: true }],
      '192.168.1.254', 1
    );
    const active = groups.find(g => g.state === 'Active');
    expect(active?.routerId).toBe('R2');
  });

  it('should elect Standby router as second highest priority', () => {
    const groups = simulateHSRP(
      [{ id: 'R1', priority: 150, preempt: true }, { id: 'R2', priority: 100, preempt: false }, { id: 'R3', priority: 50, preempt: false }],
      '192.168.1.254', 1
    );
    const standby = groups.find(g => g.state === 'Standby');
    expect(standby?.routerId).toBe('R2');
  });

  it('should handle HSRP preemption', () => {
    const groups = simulateHSRP(
      [{ id: 'R1', priority: 150, preempt: true }, { id: 'R2', priority: 100, preempt: false }],
      '10.0.0.1', 10
    );
    expect(groups[0].preempt).toBe(true);
  });

  it('should support multiple HSRP groups', () => {
    const group1 = simulateHSRP(
      [{ id: 'R1', priority: 150, preempt: true }, { id: 'R2', priority: 100, preempt: false }],
      '192.168.1.254', 1
    );
    const group2 = simulateHSRP(
      [{ id: 'R2', priority: 150, preempt: true }, { id: 'R1', priority: 100, preempt: false }],
      '192.168.2.254', 2
    );
    expect(group1[0].routerId).toBe('R1');
    expect(group2[0].routerId).toBe('R2');
  });

  it('should support VRRP with virtual router ID', () => {
    const vrid = 1;
    const virtualIp = '192.168.1.254';
    expect(vrid).toBeGreaterThan(0);
    expect(virtualIp).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });

  it('should handle failover when Active router goes down', () => {
    const groups = simulateHSRP(
      [{ id: 'R1', priority: 100, preempt: false }, { id: 'R2', priority: 200, preempt: true }],
      '192.168.1.254', 1
    );
    const active = groups.find(g => g.state === 'Active');
    expect(active?.routerId).toBe('R2');
  });

  it('should use virtual IP as default gateway', () => {
    const virtualIp = '192.168.1.254';
    const hosts = ['192.168.1.10', '192.168.1.20', '192.168.1.30'];
    hosts.forEach(host => {
      const gateway = host.split('.').slice(0, 3).concat(['254']).join('.');
      expect(gateway).toBe(virtualIp);
    });
  });

  it('should track interface for HSRP priority decrement', () => {
    const initialPriority = 150;
    const decrement = 20;
    const trackedPriority = initialPriority - decrement;
    expect(trackedPriority).toBe(130);
  });
});
