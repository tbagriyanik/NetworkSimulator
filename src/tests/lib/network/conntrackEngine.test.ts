import { describe, it, expect } from 'vitest';
import { ConntrackEngine } from '../../../lib/network/conntrackEngine';

describe('ConntrackEngine', () => {
  it('tracks outbound TCP SYN and permits stateful return traffic', () => {
    const engine = new ConntrackEngine();
    
    // Outbound SYN: 192.168.1.10:49152 -> 8.8.8.8:80
    const entry = engine.trackPacket('TCP', '192.168.1.10', 49152, '8.8.8.8', 80, { syn: true });
    expect(entry.state).toBe('SYN_SENT');

    // Return traffic: 8.8.8.8:80 -> 192.168.1.10:49152
    const res = engine.inspectReturnTraffic('TCP', '8.8.8.8', 80, '192.168.1.10', 49152);
    expect(res.allowed).toBe(true);
    expect(res.reason).toContain('SPI Allow');
  });

  it('drops unsolicited inbound traffic with no stateful entry', () => {
    const engine = new ConntrackEngine();
    const res = engine.inspectReturnTraffic('TCP', '1.2.3.4', 443, '192.168.1.10', 50000);
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('SPI Drop');
  });
});
