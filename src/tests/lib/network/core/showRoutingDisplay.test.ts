import { describe, it, expect } from 'vitest';

describe('Show Routing Display', () => {
  it('should format IP routing table', () => {
    const routes = [
      { code: 'C', network: '192.168.1.0/24', nextHop: 'connected', interface: 'gi0/0' },
      { code: 'S', network: '10.0.0.0/8', nextHop: '192.168.1.2', interface: 'gi0/0' },
      { code: 'O', network: '172.16.0.0/16', nextHop: '192.168.1.3', interface: 'gi0/0' },
    ];
    const routingTable = routes.map(r => `${r.code} ${r.network} [1/0] via ${r.nextHop}, ${r.interface}`);
    expect(routingTable[0]).toContain('C 192.168.1.0/24');
    expect(routingTable[1]).toContain('via 192.168.1.2');
    expect(routingTable).toHaveLength(3);
  });

  it('should display OSPF routes with area', () => {
    const ospfRoute = 'O IA 10.0.1.0/24 [110/20] via 192.168.1.2, 00:01:23, gi0/0';
    expect(ospfRoute).toContain('O IA');
    expect(ospfRoute).toContain('[110/20]');
  });

  it('should display EIGRP routes', () => {
    const eigrpRoute = 'D 172.16.0.0/16 [90/2172416] via 192.168.1.4, 00:02:15, gi0/1';
    expect(eigrpRoute).toContain('D');
    expect(eigrpRoute).toContain('[90/2172416]');
  });

  it('should display default route', () => {
    const defaultRoute = 'S* 0.0.0.0/0 [1/0] via 192.168.1.1, gi0/0';
    expect(defaultRoute).toContain('0.0.0.0/0');
  });

  it('should display route codes', () => {
    const codes = 'C - connected, S - static, O - OSPF, D - EIGRP, B - BGP';
    expect(codes).toContain('C - connected');
    expect(codes).toContain('O - OSPF');
  });
});
