import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { dispatchCapturedPackets } from '../../../utils/packetCapture';
import { installWindowDispatchEventShim } from '../../helpers/browserGlobals';

describe('Service Packets in Packet Capture Panel', () => {
  beforeEach(() => {
    installWindowDispatchEventShim();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should dispatch HTTP service packets', () => {
    const spy = vi.spyOn(globalThis.window, 'dispatchEvent');
    const httpPacket = {
      connectionId: 'conn-1',
      sourceIp: '192.168.1.10',
      targetIp: '192.168.1.50',
      protocol: 'HTTP',
      length: 384,
      info: 'HTTP GET http://www.local.lan/index.html (HTTP/1.1 200 OK)',
    };

    dispatchCapturedPackets([httpPacket]);

    const events = spy.mock.calls.map(call => (call[0] as CustomEvent).detail);
    expect(events).toHaveLength(1);
    expect(events[0].protocol).toBe('HTTP');
    expect(events[0].info).toContain('HTTP GET');
  });

  it('should dispatch Mail (SMTP) service packets', () => {
    const spy = vi.spyOn(globalThis.window, 'dispatchEvent');
    const smtpPacket = {
      connectionId: 'conn-2',
      sourceIp: '192.168.1.10',
      targetIp: '192.168.1.60',
      protocol: 'SMTP',
      length: 215,
      info: 'SMTP: MAIL FROM:<user@local.lan> RCPT TO:<admin@local.lan>',
    };

    dispatchCapturedPackets([smtpPacket]);

    const events = spy.mock.calls.map(call => (call[0] as CustomEvent).detail);
    expect(events).toHaveLength(1);
    expect(events[0].protocol).toBe('SMTP');
    expect(events[0].info).toContain('MAIL FROM');
  });

  it('should dispatch FTP service packets', () => {
    const spy = vi.spyOn(globalThis.window, 'dispatchEvent');
    const ftpPacket = {
      connectionId: 'conn-3',
      sourceIp: '192.168.1.10',
      targetIp: '192.168.1.70',
      protocol: 'FTP',
      length: 150,
      info: 'FTP: STOR sample.txt (150 Opening BINARY connection)',
    };

    dispatchCapturedPackets([ftpPacket]);

    const events = spy.mock.calls.map(call => (call[0] as CustomEvent).detail);
    expect(events).toHaveLength(1);
    expect(events[0].protocol).toBe('FTP');
    expect(events[0].info).toContain('STOR sample.txt');
  });

  it('should dispatch DNS query packets', () => {
    const spy = vi.spyOn(globalThis.window, 'dispatchEvent');
    const dnsPacket = {
      connectionId: 'conn-4',
      sourceIp: '192.168.1.10',
      targetIp: '192.168.1.1',
      protocol: 'DNS',
      length: 64,
      info: 'DNS Query: A www.local.lan -> 192.168.1.50',
    };

    dispatchCapturedPackets([dnsPacket]);

    const events = spy.mock.calls.map(call => (call[0] as CustomEvent).detail);
    expect(events).toHaveLength(1);
    expect(events[0].protocol).toBe('DNS');
    expect(events[0].info).toContain('DNS Query');
  });
});
