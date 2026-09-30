import { describe, it, expect } from 'vitest';
import {
  ConntrackEngine,
  parseTcpFlags,
  resolveIngressDirection,
} from '@/lib/network/conntrackEngine';
import { runHopPipeline } from '@/lib/network/forwarding/packetPipeline';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState, Port } from '@/lib/network/types';
import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';

const NOW = 1_700_000_000_000;

function makePort(id: string, overrides: Partial<Port> = {}): Port {
  return {
    id,
    name: id,
    status: 'connected',
    vlan: 1,
    mode: 'routed',
    duplex: 'full',
    speed: '1000',
    shutdown: false,
    type: 'gigabitethernet',
    ...overrides,
  };
}

const fwDevice: CanvasDevice = {
  id: 'fw-1',
  name: 'FW-1',
  type: 'firewall',
  ip: '192.168.1.1',
  x: 0,
  y: 0,
  status: 'online',
  macAddress: '00:aa:bb:cc:ff:01',
  ports: [],
};

function makeFwState(overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname: 'FW-1',
    deviceType: 'firewall',
    macAddress: '00:aa:bb:cc:ff:01',
    ipRouting: true,
    ports: {
      // Trusted (inside) segment: 192.168.1.0/24
      'gi0/0': makePort('gi0/0', {
        ipAddress: '192.168.1.1',
        subnetMask: '255.255.255.0',
        nameif: 'inside',
        securityLevel: 100,
      }),
      // Untrusted (outside) segment: 10.0.0.0/30
      'gi0/1': makePort('gi0/1', {
        ipAddress: '10.0.0.1',
        subnetMask: '255.255.255.252',
        nameif: 'outside',
        securityLevel: 0,
      }),
    },
    ...overrides,
  } as SwitchState;
}

function tcpFrame(overrides: Partial<NetworkPacketFrame>): NetworkPacketFrame {
  return {
    id: 'tcp-frame',
    protocol: 'TCP',
    timestamp: NOW,
    ingressDeviceId: 'fw-1',
    srcMac: '00:aa:bb:cc:00:10',
    dstMac: '00:aa:bb:cc:ff:01',
    etherType: '0x0800',
    srcIp: '192.168.1.10',
    dstIp: '93.184.216.34',
    srcPort: 49152,
    dstPort: 80,
    ttl: 64,
    ipProtocol: 6,
    length: 60,
    tcpFlags: 'SYN',
    info: 'TCP SYN',
    ...overrides,
  };
}

describe('parseTcpFlags', () => {
  it('parses plain SYN', () => {
    expect(parseTcpFlags('SYN')).toEqual({ syn: true });
  });

  it('parses SYN-ACK with hyphen separator', () => {
    expect(parseTcpFlags('SYN-ACK')).toEqual({ syn: true, ack: true });
  });

  it('parses comma separated flags', () => {
    expect(parseTcpFlags('PSH, ACK')).toEqual({ ack: true });
    expect(parseTcpFlags('FIN, ACK')).toEqual({ fin: true, ack: true });
  });

  it('maps KEEPALIVE to ACK', () => {
    expect(parseTcpFlags('KEEPALIVE')).toEqual({ ack: true });
  });

  it('returns empty flags for missing/unknown input', () => {
    expect(parseTcpFlags(undefined)).toEqual({});
    expect(parseTcpFlags('')).toEqual({});
    expect(parseTcpFlags('SOMETHING')).toEqual({});
  });
});

describe('resolveIngressDirection', () => {
  it('classifies nameif outside as inbound', () => {
    expect(resolveIngressDirection({ nameif: 'outside' })).toBe('inbound');
    expect(resolveIngressDirection({ nameif: 'OUTSIDE' })).toBe('inbound');
  });

  it('classifies nameif inside as outbound', () => {
    expect(resolveIngressDirection({ nameif: 'inside' })).toBe('outbound');
  });

  it('falls back to security level', () => {
    expect(resolveIngressDirection({ securityLevel: 0 })).toBe('inbound');
    expect(resolveIngressDirection({ securityLevel: 100 })).toBe('outbound');
  });

  it('falls back to NAT side', () => {
    expect(resolveIngressDirection({ natSide: 'outside' })).toBe('inbound');
    expect(resolveIngressDirection({ natSide: 'inside' })).toBe('outbound');
  });

  it('is unknown when no firewall profile exists', () => {
    expect(resolveIngressDirection({})).toBe('unknown');
    expect(resolveIngressDirection(undefined)).toBe('unknown');
  });
});

describe('ConntrackEngine.inspectAndTrack — first packet handling', () => {
  it('creates a session for the first outbound TCP SYN instead of dropping it', () => {
    const engine = new ConntrackEngine();
    const res = engine.inspectAndTrack('TCP', '192.168.1.10', 49152, '93.184.216.34', 80, {
      tcpFlags: { syn: true },
      direction: 'outbound',
      bytes: 60,
    });

    expect(res.allowed).toBe(true);
    expect(res.entry?.state).toBe('SYN_SENT');
    expect(res.reason).toContain('new TCP session');
  });

  it('allows the three-way handshake to progress to ESTABLISHED', () => {
    const engine = new ConntrackEngine();
    engine.inspectAndTrack('TCP', '192.168.1.10', 49152, '93.184.216.34', 80, {
      tcpFlags: { syn: true },
      direction: 'outbound',
    });

    // Server SYN-ACK comes back on the untrusted interface (return traffic)
    const synAck = engine.inspectAndTrack('TCP', '93.184.216.34', 80, '192.168.1.10', 49152, {
      tcpFlags: { syn: true, ack: true },
      direction: 'inbound',
    });
    expect(synAck.allowed).toBe(true);
    expect(synAck.entry?.state).toBe('SYN_RECV');

    const ack = engine.inspectAndTrack('TCP', '192.168.1.10', 49152, '93.184.216.34', 80, {
      tcpFlags: { ack: true },
      direction: 'outbound',
    });
    expect(ack.allowed).toBe(true);
    expect(ack.entry?.state).toBe('ESTABLISHED');
  });

  it('drops unsolicited inbound traffic arriving on an untrusted interface', () => {
    const engine = new ConntrackEngine();
    const res = engine.inspectAndTrack('TCP', '203.0.113.9', 51000, '192.168.1.10', 443, {
      tcpFlags: { syn: true },
      direction: 'inbound',
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toContain('unsolicited inbound');
    expect(engine.getSessions()).toHaveLength(0);
  });

  it('accepts established sessions regardless of ingress direction', () => {
    const engine = new ConntrackEngine();
    engine.inspectAndTrack('TCP', '192.168.1.10', 49152, '93.184.216.34', 80, {
      tcpFlags: { syn: true },
      direction: 'outbound',
    });

    const followUp = engine.inspectAndTrack('TCP', '192.168.1.10', 49152, '93.184.216.34', 80, {
      tcpFlags: { ack: true },
      direction: 'outbound',
    });
    expect(followUp.allowed).toBe(true);
    expect(followUp.entry?.state).toBe('SYN_SENT'); // ACK without SYN-ACK keeps state (flags only, no server reply yet)
  });

  it('allows a fresh SYN to re-open a CLOSED session', () => {
    const engine = new ConntrackEngine();
    engine.inspectAndTrack('TCP', '192.168.1.10', 40000, '93.184.216.34', 80, {
      tcpFlags: { syn: true },
      direction: 'outbound',
    });
    engine.inspectAndTrack('TCP', '192.168.1.10', 40000, '93.184.216.34', 80, {
      tcpFlags: { rst: true },
      direction: 'outbound',
    });

    const reopened = engine.inspectAndTrack('TCP', '192.168.1.10', 40000, '93.184.216.34', 80, {
      tcpFlags: { syn: true },
      direction: 'outbound',
    });
    expect(reopened.allowed).toBe(true);
    expect(reopened.entry?.state).toBe('SYN_SENT');
  });

  it('rejects mid-stream traffic for a CLOSED session', () => {
    const engine = new ConntrackEngine();
    engine.inspectAndTrack('TCP', '192.168.1.10', 40001, '93.184.216.34', 80, {
      tcpFlags: { syn: true },
      direction: 'outbound',
    });
    engine.inspectAndTrack('TCP', '192.168.1.10', 40001, '93.184.216.34', 80, {
      tcpFlags: { rst: true },
      direction: 'outbound',
    });

    const midStream = engine.inspectAndTrack('TCP', '192.168.1.10', 40001, '93.184.216.34', 80, {
      tcpFlags: { ack: true },
      direction: 'outbound',
    });
    expect(midStream.allowed).toBe(false);
    expect(midStream.reason).toContain('CLOSED');
  });

  it('tracks UDP flows initiated from the trusted side', () => {
    const engine = new ConntrackEngine();
    const res = engine.inspectAndTrack('UDP', '192.168.1.10', 50000, '8.8.8.8', 53, {
      direction: 'outbound',
      bytes: 74,
    });
    expect(res.allowed).toBe(true);
    expect(res.entry?.state).toBe('ESTABLISHED');
    expect(res.entry?.bytesOut).toBe(74);
  });
});

describe('Firewall pipeline — Stage 8b conntrack enforcement', () => {
  const connections: CanvasConnection[] = [];

  function runFwHop(frame: NetworkPacketFrame, state: SwitchState) {
    return runHopPipeline(0, frame, fwDevice, state, [fwDevice], connections, NOW);
  }

  it('passes the first outbound TCP SYN and records a conntrack trace', () => {
    const state = makeFwState();
    const res = runFwHop(tcpFrame({ ingressPortId: 'gi0/0' }), state);

    const ctTrace = res.traces.find(t => t.stage === 'conntrack');
    expect(ctTrace?.action).toBe('pass');
    expect(ctTrace?.reason).toContain('new TCP session');
    const conntrackDrop = res.traces.find(t => t.stage === 'conntrack' && t.action === 'drop');
    expect(conntrackDrop).toBeUndefined();
  });

  it('drops unsolicited inbound TCP SYN entering from the outside interface', () => {
    const state = makeFwState();
    const inbound = tcpFrame({
      id: 'inbound-syn',
      ingressPortId: 'gi0/1',
      srcIp: '203.0.113.9',
      dstIp: '192.168.1.10',
      srcPort: 51000,
      dstPort: 443,
      tcpFlags: 'SYN',
    });

    const res = runFwHop(inbound, state);
    expect(res.accepted).toBe(false);
    const dropTrace = res.traces.find(t => t.action === 'drop');
    expect(dropTrace?.stage).toBe('conntrack');
    expect(dropTrace?.reason).toContain('unsolicited inbound');
  });

  it('allows return traffic for a session opened by the first SYN', () => {
    const state = makeFwState();
    runFwHop(tcpFrame({ id: 'out-syn', ingressPortId: 'gi0/0' }), state);

    const synAck = tcpFrame({
      id: 'in-synack',
      ingressPortId: 'gi0/1',
      srcIp: '93.184.216.34',
      dstIp: '192.168.1.10',
      srcPort: 80,
      dstPort: 49152,
      tcpFlags: 'SYN-ACK',
    });

    const res = runFwHop(synAck, state);
    const ctTrace = res.traces.find(t => t.stage === 'conntrack');
    expect(ctTrace?.action).toBe('pass');
    expect(ctTrace?.reason).toContain('return traffic');
  });

  it('keeps non-firewall devices on the track-only (passthrough) path', () => {
    const router: CanvasDevice = { ...fwDevice, id: 'r-1', type: 'router', name: 'R-1' };
    const state = makeFwState();
    const frame = tcpFrame({ ingressPortId: 'gi0/0' });

    const res = runHopPipeline(0, frame, router, state, [router], connections, NOW);
    const ctTrace = res.traces.find(t => t.stage === 'conntrack');
    expect(ctTrace?.action).toBe('pass');
    expect(ctTrace?.reason).toContain('non-firewall passthrough');
  });
});
