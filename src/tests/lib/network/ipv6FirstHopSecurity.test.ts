import { describe, it, expect } from 'vitest';
import { evaluateIpv6FirstHopSecurity } from '@/lib/network/forwarding/ipv6FirstHopSecurity';
import type { Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';

function createMockPort(id: string, options: { ipv6RaGuard?: boolean; ipv6DhcpGuard?: boolean }): Port {
  return {
    id,
    name: id,
    status: 'connected',
    vlan: 1,
    mode: 'access',
    duplex: 'auto',
    speed: 'auto',
    shutdown: false,
    type: 'fastethernet',
    ...options,
  };
}

describe('ipv6FirstHopSecurity (RA Guard & DHCPv6 Guard)', () => {
  it('drops rogue ICMPv6 Router Advertisement when ipv6RaGuard is enabled', () => {
    const port = createMockPort('fa0/5', { ipv6RaGuard: true });
    const raFrame: NetworkPacketFrame = {
      id: 'f-ra-1',
      protocol: 'IPV6',
      ipProtocol: 58,
      srcMac: '00:11:22:33:44:55',
      dstMac: '33:33:00:00:00:01',
      etherType: '0x86DD',
      length: 80,
      info: 'ICMPv6 Router Advertisement from rogue router',
      timestamp: Date.now(),
    };

    const res = evaluateIpv6FirstHopSecurity(port, raFrame);
    expect(res.action).toBe('drop');
    expect(res.isViolation).toBe(true);
    expect(res.violationType).toBe('RA_GUARD');
    expect(res.dropReason).toContain('Rogue Router Advertisement packet dropped');
  });

  it('permits normal IPv6 traffic through RA Guard protected port', () => {
    const port = createMockPort('fa0/5', { ipv6RaGuard: true });
    const normalFrame: NetworkPacketFrame = {
      id: 'f-norm-1',
      protocol: 'IPV6',
      ipProtocol: 6, // TCP
      srcMac: '00:11:22:33:44:55',
      dstMac: '66:77:88:99:AA:BB',
      etherType: '0x86DD',
      length: 120,
      info: 'TCP HTTP request',
      timestamp: Date.now(),
    };

    const res = evaluateIpv6FirstHopSecurity(port, normalFrame);
    expect(res.action).toBe('pass');
    expect(res.isViolation).toBe(false);
  });

  it('drops rogue DHCPv6 server offer when ipv6DhcpGuard is enabled', () => {
    const port = createMockPort('fa0/10', { ipv6DhcpGuard: true });
    const dhcpv6Frame: NetworkPacketFrame = {
      id: 'f-dhcp-1',
      protocol: 'DHCPV6',
      srcMac: '00:AA:BB:CC:DD:EE',
      dstMac: '33:33:00:01:00:02',
      etherType: '0x86DD',
      length: 150,
      info: 'DHCPv6 Advertise message',
      timestamp: Date.now(),
      dhcpPayload: {
        messageType: 'offer',
        clientMac: '00:11:22:33:44:55',
      },
    };

    const res = evaluateIpv6FirstHopSecurity(port, dhcpv6Frame);
    expect(res.action).toBe('drop');
    expect(res.isViolation).toBe(true);
    expect(res.violationType).toBe('DHCPV6_GUARD');
  });
});
