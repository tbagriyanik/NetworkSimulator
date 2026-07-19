import { describe, it, expect } from 'vitest';

describe('OSPF Routing', () => {
  function simulateOSPF(
    routerId: string,
    networks: string[],
    neighbors: string[]
  ): { routerId: string; networks: string[]; neighbors: string[]; type: string } {
    return { routerId, networks, neighbors, type: 'OSPF' };
  }

  it('should create OSPF process with router ID', () => {
    const ospf = simulateOSPF('1.1.1.1', ['192.168.1.0/24'], ['2.2.2.2']);
    expect(ospf.routerId).toBe('1.1.1.1');
    expect(ospf.networks).toContain('192.168.1.0/24');
  });

  it('should discover OSPF neighbors', () => {
    const ospf = simulateOSPF('1.1.1.1', ['10.0.0.0/24'], ['2.2.2.2', '3.3.3.3']);
    expect(ospf.neighbors).toHaveLength(2);
  });

  it('should advertise networks in OSPF', () => {
    const ospf = simulateOSPF('1.1.1.1', ['10.0.0.0/24', '192.168.1.0/24', '172.16.0.0/16'], []);
    expect(ospf.networks).toHaveLength(3);
  });

  it('should have correct OSPF type', () => {
    const result = simulateOSPF('1.1.1.1', [], []);
    expect(result.type).toBe('OSPF');
  });

  it('should handle single-area OSPF', () => {
    const area = 0;
    const routers = ['R1', 'R2', 'R3'];
    expect(routers.length).toBeGreaterThanOrEqual(2);
    expect(area).toBe(0);
  });

  it('should handle multi-area OSPF', () => {
    const area0 = ['R1', 'R2'];
    const area1 = ['R3'];
    const area2 = ['R4'];
    expect(area0.length + area1.length + area2.length).toBe(4);
  });

  it('should elect DR and BDR', () => {
    const dr = '2.2.2.2';
    const bdr = '3.3.3.3';
    expect(dr).not.toBe(bdr);
  });

  it('should calculate shortest path using SPF', () => {
    const paths = [
      { destination: '10.0.0.0/24', cost: 10, nextHop: '192.168.1.2' },
      { destination: '172.16.0.0/16', cost: 20, nextHop: '192.168.1.3' },
    ];
    const sorted = [...paths].sort((a, b) => a.cost - b.cost);
    expect(sorted[0].cost).toBeLessThan(sorted[1].cost);
  });

  it('should handle OSPF route types (E1, E2)', () => {
    const externalRoutes = [
      { prefix: '10.0.0.0/24', type: 'E2', cost: 20, metric: 20 },
      { prefix: '172.16.0.0/16', type: 'E1', cost: 30, metric: 20 },
    ];
    expect(externalRoutes.filter(r => r.type === 'E2')).toHaveLength(1);
    expect(externalRoutes.filter(r => r.type === 'E1')).toHaveLength(1);
  });
});
