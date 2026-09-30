import { describe, it, expect } from 'vitest';
import { processDhcpRelay, type DhcpHeader } from '../../../lib/network/dhcpRelayEngine';

describe('dhcpRelayEngine', () => {
  it('inserts giaddr and Option 82 into DHCP DISCOVER request when relayed', () => {
    const packet: DhcpHeader = {
      op: 'BOOTREQUEST',
      xid: 12345,
      ciaddr: '0.0.0.0',
      yiaddr: '0.0.0.0',
      siaddr: '0.0.0.0',
      giaddr: '0.0.0.0',
      chaddr: '00:11:22:33:44:55',
      options: {
        messageType: 'DISCOVER'
      }
    };

    const res = processDhcpRelay(packet, '192.168.10.1', '10.0.0.5', 'VLAN-10 Fa0/1', 'Switch-1');
    expect(res.forwarded).toBe(true);
    expect(res.modifiedHeader.giaddr).toBe('192.168.10.1');
    expect(res.modifiedHeader.options.option82?.circuitId).toBe('VLAN-10 Fa0/1');
    expect(res.targetDestinationIp).toBe('10.0.0.5');
  });
});
