import { describe, it, expect } from 'vitest';
import { generatePduHexAndAscii, decodePduLayers } from '@/lib/network/forwarding/pduDecoder';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';

describe('pduDecoder (Visual Packet Inspector Decoder Engine)', () => {
  it('correctly generates hex and ascii dump for an IPv4 ICMP packet', () => {
    const frame: NetworkPacketFrame = {
      id: 'frame-1',
      protocol: 'ICMP',
      timestamp: Date.now(),
      srcMac: '00:11:22:33:44:55',
      dstMac: '66:77:88:99:AA:BB',
      etherType: '0x0800',
      srcIp: '192.168.1.10',
      dstIp: '192.168.1.1',
      ttl: 64,
      length: 64,
      info: 'ICMP Echo Request',
    };

    const dump = generatePduHexAndAscii(frame);
    expect(dump.hexDump).toBeDefined();
    expect(dump.asciiDump).toBeDefined();
    expect(dump.rawBytes.length).toBeGreaterThanOrEqual(64);
  });

  it('correctly decodes OSI layers 1 through 4 for IPv4 / ICMP packet', () => {
    const frame: NetworkPacketFrame = {
      id: 'frame-2',
      protocol: 'ICMP',
      timestamp: Date.now(),
      ingressPortId: 'GigabitEthernet0/0',
      egressPortId: 'GigabitEthernet0/1',
      srcMac: '00:AA:BB:CC:DD:EE',
      dstMac: '00:11:22:33:44:55',
      etherType: '0x0800',
      srcIp: '10.0.0.2',
      dstIp: '10.0.0.1',
      ttl: 64,
      length: 84,
      info: 'ICMP Echo Request',
    };

    const decoded = decodePduLayers(frame);
    expect(decoded.inLayers.length).toBeGreaterThanOrEqual(4);
    expect(decoded.inLayers[0].layer).toBe(1); // Physical
    expect(decoded.inLayers[1].layer).toBe(2); // Data Link
    expect(decoded.inLayers[2].layer).toBe(3); // Network
    expect(decoded.inLayers[3].layer).toBe(4); // Transport
    expect(decoded.outLayers.length).toBeGreaterThanOrEqual(2);
    expect(decoded.decisions.length).toBeGreaterThan(0);
  });

  it('correctly decodes ARP payload', () => {
    const frame: NetworkPacketFrame = {
      id: 'frame-3',
      protocol: 'ARP',
      timestamp: Date.now(),
      srcMac: '00:AA:BB:CC:DD:EE',
      dstMac: 'FF:FF:FF:FF:FF:FF',
      etherType: '0x0806',
      arpPayload: {
        operation: 'request',
        senderMac: '00:AA:BB:CC:DD:EE',
        senderIp: '192.168.1.5',
        targetMac: '00:00:00:00:00:00',
        targetIp: '192.168.1.1',
      },
      length: 64,
      info: 'Who has 192.168.1.1? Tell 192.168.1.5',
    };

    const decoded = decodePduLayers(frame);
    const l3 = decoded.inLayers.find(l => l.name.includes('ARP'));
    expect(l3).toBeDefined();
    expect(l3?.fields.some(f => f.value === '192.168.1.5')).toBe(true);
  });
});
