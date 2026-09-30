/**
 * largeScaleNetworkScenario.test.ts — Büyük uçtan uca ağ senaryosu
 *
 * Tek bir kampüs + WAN senaryosu üzerinde öncelikli eksikleri doğrular:
 *  1. Conntrack + Firewall: ilk TCP SYN, 3-way handshake, izinsiz gelen trafik
 *  2. BGP Best Path: tüm tie-break adımları ve RIB entegrasyonu
 *  3. DHCP Relay: helper-address + giaddr + Option 82 ile gerçek pipeline
 *  4. Policy Engine: IP + VLAN + interface + direction kriterleri
 *  5. Uçtan uca akış (PC → Switch → Router → Firewall → WAN)
 *  6. Otomatik doğrulama/denetim (audit) motoru
 *  7. Multicast motor sahiplik ayrımı
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  runHopPipeline,
  setPipelinePolicyRules,
  clearPipelinePolicyRules,
  getPipelinePolicyRules,
} from '@/lib/network/forwarding/packetPipeline';
import { ConntrackEngine } from '@/lib/network/conntrackEngine';
import { PolicyEngine, cidrMatches, ipToLong } from '@/lib/network/policyEngine';
import { relayDhcpPayload, unwrapRelayedReply } from '@/lib/network/dhcpRelayEngine';
import { explainBgpBestPath, compareBgpRoutes, selectBestBgpPath, BGP_BEST_PATH_STEPS } from '@/lib/network/bgpBestPathExplainer';
import {
  getOrCreateBgpConfig,
  configureBgpNeighbor,
  addBgpNetwork,
  exchangeBgpRoutes,
  type BgpRoute,
} from '@/lib/network/bgpEngine';
import {
  buildIgmpSnoopingTableFromState,
  isMulticastAddress,
  isValidMulticastIp,
  MULTICAST_OWNERSHIP,
} from '@/lib/network/multicastEngine';
import { tickMulticast, getIgmpSnoopingTable } from '@/lib/network/forwarding/multicastEngine';
import { auditNetwork, summarizeAudit } from '@/lib/network/networkAudit';
import { generateNetworkReport, generateNetworkReportWithAudit } from '@/lib/network/networkReportGenerator';

import type { NetworkPacketFrame } from '@/lib/network/forwarding/packetFrame';
import type { SwitchState, Port } from '@/lib/network/types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

const NOW = 1_700_000_000_000;

/** Deterministic 2-hex-digit slice derived from a device id (test helper). */
function macHalf(id: string, offset: number): string {
  const seed = id.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 7);
  return seed.toString(16).padStart(4, '0').slice(offset, offset + 2);
}

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

function makeDevice(id: string, type: CanvasDevice['type'], ip: string, overrides: Partial<CanvasDevice> = {}): CanvasDevice {
  return {
    id,
    name: id.toUpperCase(),
    type,
    ip,
    x: 0,
    y: 0,
    status: 'online',
    // Deterministic, per-id unique MAC so the audit does not flag duplicates.
    macAddress: `00:aa:bb:cc:${macHalf(id, 0)}:${macHalf(id, 2)}`,
    ports: [],
    ...overrides,
  } as CanvasDevice;
}

function makeState(hostname: string, overrides: Partial<SwitchState> = {}): SwitchState {
  return {
    hostname,
    macAddress: '00:aa:bb:cc:dd:01',
    ports: {},
    vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] } },
    staticRoutes: [],
    runningConfig: [],
    ipRouting: true,
    bootTime: NOW - 60_000,
    ...overrides,
  } as SwitchState;
}

function tcpFrame(overrides: Partial<NetworkPacketFrame> = {}): NetworkPacketFrame {
  return {
    id: 'tcp-1',
    protocol: 'TCP',
    timestamp: NOW,
    ingressDeviceId: 'pc1',
    srcMac: '00:aa:bb:cc:00:10',
    dstMac: '00:aa:bb:cc:dd:01',
    etherType: '0x0800',
    srcIp: '192.168.10.10',
    dstIp: '203.0.113.80',
    srcPort: 49152,
    dstPort: 443,
    ttl: 64,
    ipProtocol: 6,
    length: 60,
    tcpFlags: 'SYN',
    info: 'TCP SYN',
    ...overrides,
  };
}

function dhcpFrame(overrides: Partial<NetworkPacketFrame> = {}): NetworkPacketFrame {
  return {
    id: 'dhcp-1',
    protocol: 'DHCP',
    timestamp: NOW,
    ingressDeviceId: 'sw1',
    ingressPortId: 'gi0/0',
    srcMac: '00:aa:bb:cc:00:10',
    dstMac: 'ff:ff:ff:ff:ff:ff',
    etherType: '0x0800',
    srcIp: '0.0.0.0',
    dstIp: '255.255.255.255',
    ipProtocol: 17,
    srcPort: 68,
    dstPort: 67,
    vlanId: 10,
    length: 320,
    info: 'DHCP Discover',
    dhcpPayload: { messageType: 'discover', clientMac: '00:aa:bb:cc:00:10' },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Conntrack + Firewall: ilk TCP SYN ve 3-way handshake
// ─────────────────────────────────────────────────────────────────────────────

describe('1 — Stateful firewall (Conntrack) first SYN', () => {
  const fwDevice = makeDevice('fw1', 'firewall', '192.168.10.1', { name: 'FW-EDGE' });
  const fwState = makeState('FW-EDGE', {
    deviceType: 'firewall',
    ports: {
      'gi0/0': makePort('gi0/0', { ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', nameif: 'inside', securityLevel: 100 }),
      'gi0/1': makePort('gi0/1', { ipAddress: '203.0.113.1', subnetMask: '255.255.255.0', nameif: 'outside', securityLevel: 0 }),
    },
  });

  function hop(frame: NetworkPacketFrame) {
    return runHopPipeline(0, frame, fwDevice, fwState, [fwDevice], [], NOW);
  }

  it('lets the very first outbound SYN open a session instead of dropping it', () => {
    const res = hop(tcpFrame({ ingressPortId: 'gi0/0' }));
    const ct = res.traces.find(t => t.stage === 'conntrack');
    expect(ct?.action).toBe('pass');
    expect(ct?.reason).toContain('new TCP session');
  });

  it('walks the full handshake to ESTABLISHED inside one engine', () => {
    const engine = new ConntrackEngine();
    const syn = engine.inspectAndTrack('TCP', '192.168.10.10', 49152, '203.0.113.80', 443, {
      tcpFlags: { syn: true }, direction: 'outbound',
    });
    const synAck = engine.inspectAndTrack('TCP', '203.0.113.80', 443, '192.168.10.10', 49152, {
      tcpFlags: { syn: true, ack: true }, direction: 'inbound',
    });
    const ack = engine.inspectAndTrack('TCP', '192.168.10.10', 49152, '203.0.113.80', 443, {
      tcpFlags: { ack: true }, direction: 'outbound',
    });
    expect([syn.allowed, synAck.allowed, ack.allowed]).toEqual([true, true, true]);
    expect(ack.entry?.state).toBe('ESTABLISHED');
  });

  it('drops unsolicited inbound SYN arriving on the untrusted interface', () => {
    const res = hop(tcpFrame({
      id: 'inbound', ingressPortId: 'gi0/1',
      srcIp: '198.51.100.7', dstIp: '192.168.10.10', srcPort: 51000, dstPort: 22,
    }));
    expect(res.accepted).toBe(false);
    expect(res.traces.some(t => t.stage === 'conntrack' && t.action === 'drop')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. BGP Best Path: tüm tie-break adımları
// ─────────────────────────────────────────────────────────────────────────────

function bgpRoute(overrides: Partial<BgpRoute> = {}): BgpRoute {
  return {
    prefix: '10.10.0.0/16',
    network: '10.10.0.0',
    netmask: '255.255.0.0',
    nextHop: '10.0.0.2',
    asPath: [65001],
    origin: 'IGP',
    originAs: 65001,
    weight: 0,
    localPref: 100,
    metric: 0,
    ...overrides,
  };
}

describe('2 — BGP Best Path decision process', () => {
  it('exposes the complete ordered decision step list', () => {
    expect(BGP_BEST_PATH_STEPS).toHaveLength(12);
    expect(BGP_BEST_PATH_STEPS[10]).toBe('Minimum Cluster List Length');
    expect(BGP_BEST_PATH_STEPS[11]).toBe('Lowest Neighbor IP (Tie-Breaker)');
  });

  it('breaks a tie on cluster list length before neighbor address', () => {
    const a = bgpRoute({ nextHop: '10.0.0.9', neighborAddress: '10.0.0.9', clusterListLength: 3 });
    const b = bgpRoute({ nextHop: '10.0.0.3', neighborAddress: '10.0.0.3', clusterListLength: 1 });
    const cmp = compareBgpRoutes(a, b);
    expect(cmp.winner).toBe(1);
    expect(cmp.stepName).toBe('Minimum Cluster List Length');

    const explained = explainBgpBestPath(a, b);
    expect(explained.bestRoute.nextHop).toBe('10.0.0.3');
    expect(explained.stepIndex).toBe(11);
  });

  it('falls back to the lowest neighbor address as the last tie-break', () => {
    const a = bgpRoute({ nextHop: '10.0.0.8', neighborAddress: '10.0.0.8', clusterListLength: 0, routerId: '9.9.9.9', originatorId: '9.9.9.9' });
    const b = bgpRoute({ nextHop: '10.0.0.4', neighborAddress: '10.0.0.4', clusterListLength: 0, routerId: '9.9.9.9', originatorId: '9.9.9.9' });
    const cmp = compareBgpRoutes(a, b);
    expect(cmp.stepIndex).toBe(12);
    expect(cmp.winner).toBe(1);
  });

  it('does not compare MED between paths from different neighbouring ASes', () => {
    const a = bgpRoute({ nextHop: '10.0.0.9', originAs: 65001, metric: 100 });
    const b = bgpRoute({ nextHop: '10.0.0.4', originAs: 65002, metric: 10 });
    const cmp = compareBgpRoutes(a, b);
    expect(cmp.stepName).not.toBe('Lowest MED (Multi-Exit Discriminator)');
    expect(cmp.stepIndex).toBe(12);
  });

  it('flags fully equivalent routes as ECMP multipath candidates', () => {
    const a = bgpRoute({ nextHop: '10.0.0.2', neighborAddress: '10.0.0.2' });
    const b = bgpRoute({ nextHop: '10.0.0.2', neighborAddress: '10.0.0.2' });
    expect(compareBgpRoutes(a, b).winner).toBe(0);
    expect(explainBgpBestPath(a, b).reason).toContain('ECMP');
    expect(selectBestBgpPath([a, b])).toBeDefined();
  });

  it('marks exactly one best route per prefix in the BGP RIB after exchange', () => {
    const states = new Map<string, SwitchState>();
    // No explicit routerId: getDevicePrimaryIp() falls back to the first
    // configured interface, which is exactly the address the peers use.
    const r1 = makeState('R1', { deviceType: 'router', ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.12.1', subnetMask: '255.255.255.0' }) } });
    const r2 = makeState('R2', { deviceType: 'router', ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.12.2', subnetMask: '255.255.255.0' }) } });
    const r3 = makeState('R3', { deviceType: 'router', ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.13.3', subnetMask: '255.255.255.0' }) } });
    states.set('r1', r1);
    states.set('r2', r2);
    states.set('r3', r3);

    // r1 peers with both r2 and r3; both advertise the same prefix.
    getOrCreateBgpConfig(r1, 65000);
    configureBgpNeighbor(r1, '10.0.12.2', 65002);
    configureBgpNeighbor(r1, '10.0.13.3', 65003);
    getOrCreateBgpConfig(r2, 65002);
    configureBgpNeighbor(r2, '10.0.12.1', 65000);
    addBgpNetwork(r2, '10.10.0.0', '255.255.0.0');
    getOrCreateBgpConfig(r3, 65003);
    configureBgpNeighbor(r3, '10.0.13.1', 65000);
    addBgpNetwork(r3, '10.10.0.0', '255.255.0.0');

    exchangeBgpRoutes(states, NOW);

    const rib = (r1.bgpConfig as { rib: BgpRoute[] }).rib;
    const learned = rib.filter(r => r.prefix === '10.10.0.0/16');
    expect(learned.length).toBeGreaterThanOrEqual(2);
    expect(learned.filter(r => r.isBest)).toHaveLength(1);
    // The winner must be the numerically lower neighbor address (equal attributes).
    expect(learned.find(r => r.isBest)?.nextHop).toBe('10.0.12.2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DHCP Relay → gerçek forwarding pipeline
// ─────────────────────────────────────────────────────────────────────────────

describe('3 — DHCP Relay inside the forwarding pipeline', () => {
  const relayDevice = makeDevice('r-relay', 'router', '192.168.10.1', { name: 'R-RELAY' });
  const relayState = makeState('R-RELAY', {
    deviceType: 'router',
    ports: {
      'gi0/0': makePort('gi0/0', { ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', helperAddresses: ['10.0.0.10'] }),
      'gi0/1': makePort('gi0/1', { ipAddress: '10.0.0.1', subnetMask: '255.255.255.252' }),
    },
  });

  it('fills giaddr + Option 82 and unicasts to the helper address', () => {
    const res = runHopPipeline(0, dhcpFrame(), relayDevice, relayState, [relayDevice], [], NOW);
    const trace = res.traces.find(t => t.stage === 'dhcp-relay');
    expect(trace?.action).toBe('forward');
    expect(trace?.reason).toContain('giaddr=192.168.10.1');
    expect(trace?.reason).toContain('forwarding to 10.0.0.10');
    expect(trace?.frameSnapshot.dstIp).toBe('10.0.0.10');
    expect(trace?.frameSnapshot.dhcpPayload?.giaddr).toBe('192.168.10.1');
    expect(trace?.frameSnapshot.dhcpPayload?.option82?.agentCircuitId).toContain('r-relay/gi0/0');
  });

  it('skips relaying when no helper-address is configured', () => {
    const noHelper = makeState('R-NOHELPER', {
      ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }) },
    });
    const res = runHopPipeline(0, dhcpFrame(), relayDevice, noHelper, [relayDevice], [], NOW);
    const trace = res.traces.find(t => t.stage === 'dhcp-relay');
    expect(trace?.action).toBe('skip');
    expect(trace?.frameSnapshot.dstIp).toBe('255.255.255.255');
  });

  it('unwraps a server reply whose giaddr is owned by the relay', () => {
    const reply = dhcpFrame({
      id: 'dhcp-offer',
      ingressPortId: 'gi0/1',
      srcIp: '10.0.0.10',
      dstIp: '192.168.10.1',
      dhcpPayload: { messageType: 'offer', clientMac: '00:aa:bb:cc:00:10', giaddr: '192.168.10.1', offeredIp: '192.168.10.50' },
    });
    const res = runHopPipeline(0, reply, relayDevice, relayState, [relayDevice], [], NOW);
    const trace = res.traces.find(t => t.stage === 'dhcp-relay');
    expect(trace?.action).toBe('forward');
    expect(trace?.frameSnapshot.dstIp).toBe('255.255.255.255');
    expect(trace?.frameSnapshot.dhcpPayload?.giaddr).toBe('0.0.0.0');
  });

  it('relay adapter keeps engine semantics in one place', () => {
    const relayed = relayDhcpPayload({ messageType: 'request', clientMac: '00:aa:bb:cc:00:10' }, '10.1.1.1', '10.9.9.9', 'sw1/gi0/5', 'mac');
    expect(relayed.payload.giaddr).toBe('10.1.1.1');
    expect(relayed.targetDestinationIp).toBe('10.9.9.9');
    expect(unwrapRelayedReply(relayed.payload).giaddr).toBe('0.0.0.0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Policy Engine: IP + VLAN + interface + direction
// ─────────────────────────────────────────────────────────────────────────────

describe('4 — Policy engine criteria', () => {
  afterEach(() => clearPipelinePolicyRules());

  it('matches CIDR prefixes correctly', () => {
    expect(cidrMatches('192.168.10.55', '192.168.10.0/24')).toBe(true);
    expect(cidrMatches('192.168.11.55', '192.168.10.0/24')).toBe(false);
    expect(cidrMatches('8.8.8.8', '0.0.0.0/0')).toBe(true);
    expect(cidrMatches('8.8.8.8', 'bogus')).toBe(false);
    expect(ipToLong('255.255.255.255')).toBe(4294967295);
  });

  it('enforces source CIDR + VLAN + ingress interface + direction together', () => {
    const engine = new PolicyEngine([
      { name: 'block-guest', protocol: 'TCP', srcCidr: '192.168.99.0/24', vlanId: 99, interfaceId: 'gi0/2', direction: 'inbound', action: 'DROP' },
    ]);

    const blocked = engine.evaluate('TCP', 30000, 443, {
      srcIp: '192.168.99.5', dstIp: '10.0.0.5', vlanId: 99, ingressPortId: 'gi0/2', direction: 'inbound',
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.matchedRule?.name).toBe('block-guest');

    // Same flow but arriving on the trusted side → no match → implicit permit.
    const permitted = engine.evaluate('TCP', 30000, 443, {
      srcIp: '192.168.99.5', dstIp: '10.0.0.5', vlanId: 99, ingressPortId: 'gi0/0', direction: 'outbound',
    });
    expect(permitted.allowed).toBe(true);
    expect(permitted.matchedRule).toBeNull();
  });

  it('matches an egress-scoped rule only on the egress evaluation', () => {
    const engine = new PolicyEngine([
      { name: 'no-dns-out', protocol: 'UDP', dstPortRange: [53, 53], interfaceId: 'gi0/1', action: 'DROP' },
    ]);
    expect(engine.evaluate('UDP', 40000, 53, { ingressPortId: 'gi0/0' }).allowed).toBe(true);
    expect(engine.evaluate('UDP', 40000, 53, { ingressPortId: 'gi0/0', egressPortId: 'gi0/1' }).allowed).toBe(false);
  });

  it('applies rules inside the packet pipeline with a policy trace', () => {
    const router = makeDevice('r-pol', 'router', '192.168.10.1', { name: 'R-POL' });
    const state = makeState('R-POL', {
      deviceType: 'router',
      ports: {
        'gi0/0': makePort('gi0/0', {
          ipAddress: '192.168.10.1',
          subnetMask: '255.255.255.0',
          nameif: 'inside',
          securityLevel: 100,
        }),
      },
    });

    setPipelinePolicyRules([
      { name: 'deny-wan-https', protocol: 'TCP', dstCidr: '203.0.113.0/24', direction: 'outbound', action: 'DROP' },
    ]);
    expect(getPipelinePolicyRules()).toHaveLength(1);

    const res = runHopPipeline(0, tcpFrame({ ingressPortId: 'gi0/0' }), router, state, [router], [], NOW);
    expect(res.accepted).toBe(false);
    const drop = res.traces.find(t => t.action === 'drop');
    expect(drop?.stage).toBe('policy');
    expect(drop?.reason).toContain('deny-wan-https');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Uçtan uca senaryo: PC → Switch → Router → Firewall
// ─────────────────────────────────────────────────────────────────────────────

describe('5 — Large campus scenario end-to-end', () => {
  it('runs DHCP relay, then a routed TCP flow through the same edge router', () => {
    const pc = makeDevice('pc1', 'pc', '192.168.10.10', { name: 'PC-1' });
    const sw = makeDevice('sw1', 'switchL2', '192.168.10.254', { name: 'SW-1' });
    const edge = makeDevice('r1', 'router', '192.168.10.1', { name: 'R-EDGE' });
    const fw = makeDevice('fw1', 'firewall', '203.0.113.1', { name: 'FW-EDGE' });

    const connections: CanvasConnection[] = [
      { id: 'c1', sourceDeviceId: 'pc1', targetDeviceId: 'sw1', sourcePort: 'eth0', targetPort: 'fa0/1', cableType: 'straight', active: true },
      { id: 'c2', sourceDeviceId: 'sw1', targetDeviceId: 'r1', sourcePort: 'fa0/24', targetPort: 'gi0/0', cableType: 'straight', active: true },
      { id: 'c3', sourceDeviceId: 'r1', targetDeviceId: 'fw1', sourcePort: 'gi0/1', targetPort: 'gi0/0', cableType: 'straight', active: true },
    ];

    const swState = makeState('SW-1', {
      switchModel: 'NS-L2-24TT-L',
      ports: {
        'fa0/1': makePort('fa0/1', { mode: 'access', vlan: 10 }),
        'fa0/24': makePort('fa0/24', { mode: 'trunk', allowedVlans: 'all' }),
      },
      vlans: { '1': { id: 1, name: 'default', status: 'active', ports: [] }, '10': { id: 10, name: 'USERS', status: 'active', ports: ['fa0/1'] } },
    });
    const edgeState = makeState('R-EDGE', {
      deviceType: 'router',
      ports: {
        'gi0/0': makePort('gi0/0', { ipAddress: '192.168.10.1', subnetMask: '255.255.255.0', helperAddresses: ['203.0.113.5'] }),
        'gi0/1': makePort('gi0/1', { ipAddress: '203.0.113.2', subnetMask: '255.255.255.252' }),
      },
      staticRoutes: [{ destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '203.0.113.1', type: 'static', metric: 1 }],
    });

    // DHCP discover is relayed by the edge router toward the DHCP server.
    const dhcpRes = runHopPipeline(0, dhcpFrame({ ingressPortId: 'gi0/0' }), edge, edgeState, [edge], connections, NOW);
    const relayTrace = dhcpRes.traces.find(t => t.stage === 'dhcp-relay');
    expect(relayTrace?.action).toBe('forward');
    expect(relayTrace?.frameSnapshot.dstIp).toBe('203.0.113.5');

    // Data plane: the same router accepts the first outbound TCP SYN.
    const tcpRes = runHopPipeline(0, tcpFrame({ ingressPortId: 'gi0/0' }), edge, edgeState, [edge], connections, NOW);
    const conntrackTrace = tcpRes.traces.find(t => t.stage === 'conntrack');
    expect(conntrackTrace?.action).toBe('pass');

    // Topology-level audit must consider this campus healthy.
    const audit = auditNetwork(
      [pc, sw, edge, fw],
      connections,
      new Map<string, SwitchState>([['sw1', swState], ['r1', edgeState]])
    );
    expect(audit.counts.critical).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Otomatik doğrulama / denetim (audit)
// ─────────────────────────────────────────────────────────────────────────────

describe('6 — Automatic validation & audit engine', () => {
  const cleanDevices = [
    makeDevice('r1', 'router', '10.0.0.1', { name: 'R1', macAddress: '00:aa:bb:cc:00:01' }),
    makeDevice('fw1', 'firewall', '10.0.0.2', { name: 'FW1', macAddress: '00:aa:bb:cc:00:02' }),
    makeDevice('pc1', 'pc', '10.0.0.10', { name: 'PC1', macAddress: '00:aa:bb:cc:00:03' }),
  ];
  const cleanConnections: CanvasConnection[] = [
    { id: 'c1', sourceDeviceId: 'r1', targetDeviceId: 'fw1', sourcePort: 'gi0/1', targetPort: 'gi0/0', cableType: 'straight', active: true },
  ];

  function cleanStates() {
    return new Map<string, SwitchState>([
      ['r1', makeState('R1', {
        deviceType: 'router',
        ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.0.1', subnetMask: '255.255.255.0' }) },
        staticRoutes: [{ destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '10.0.0.2', type: 'static', metric: 1 }],
      })],
      ['fw1', makeState('FW1', {
        deviceType: 'firewall',
        ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.0.2', subnetMask: '255.255.255.0', accessGroupIn: 'OUTSIDE-IN' }) },
        staticRoutes: [{ destination: '0.0.0.0', subnetMask: '0.0.0.0', nextHop: '10.0.0.1', type: 'static', metric: 1 }],
      })],
    ]);
  }

  it('passes a healthy topology and reports a health score', () => {
    const report = auditNetwork(cleanDevices, cleanConnections, cleanStates());
    expect(report.passed).toBe(true);
    expect(report.counts.critical).toBe(0);
    expect(report.score).toBeGreaterThan(60);
    expect(summarizeAudit(report)).toContain('PASS');
  });

  it('detects duplicate IPs, undefined VLANs, dangling cables and an unguarded firewall', () => {
    const devices = [
      makeDevice('r1', 'router', '10.0.0.1', { name: 'R1', macAddress: '00:aa:bb:cc:00:01' }),
      makeDevice('r2', 'router', '10.0.0.1', { name: 'R2', macAddress: '00:aa:bb:cc:00:09' }),
      makeDevice('fw1', 'firewall', '10.0.0.2', { name: 'FW1', macAddress: '00:aa:bb:cc:00:02' }),
    ];
    const connections: CanvasConnection[] = [
      { id: 'ghost', sourceDeviceId: 'r1', targetDeviceId: 'deleted-device', sourcePort: 'gi0/1', targetPort: 'gi0/0', cableType: 'straight', active: true },
    ];
    const states = new Map<string, SwitchState>([
      ['r1', makeState('R1', {
        deviceType: 'router',
        ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', vlan: 30, helperAddresses: ['172.16.99.9'] }) },
        staticRoutes: [{ destination: '172.20.0.0', subnetMask: '255.255.0.0', nextHop: '10.9.9.9', type: 'static', metric: 1 }],
      })],
      ['r2', makeState('R1', { deviceType: 'router', ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.0.1', subnetMask: '255.255.255.0' }) } })],
      ['fw1', makeState('FW1', { deviceType: 'firewall', ports: { 'gi0/0': makePort('gi0/0', { ipAddress: '10.0.0.2', subnetMask: '255.255.255.0' }) } })],
    ]);

    const report = auditNetwork(devices, connections, states);
    const codes = report.findings.map(f => f.code);
    expect(codes).toContain('duplicate-ip');
    expect(codes).toContain('dangling-cable');
    expect(codes).toContain('vlan-undefined');
    expect(codes).toContain('dhcp-helper-unreachable');
    expect(codes).toContain('static-route-unreachable');
    expect(codes).toContain('firewall-implicit-permit');
    expect(codes).toContain('duplicate-hostname');
    expect(report.passed).toBe(false);
    expect(report.score).toBeLessThan(100);
    expect(report.findings[0].severity).toBe('critical');
  });

  it('renders the audit section and header verdict in the report', () => {
    const report = generateNetworkReport(cleanDevices, cleanConnections, cleanStates(), { title: 'Senaryo Raporu' });
    expect(report).toContain('Senaryo Raporu');
    expect(report).toContain('Otomatik Doğrulama Durumu');
    expect(report).toContain('## 6. Otomatik Doğrulama ve Denetim (Audit)');

    const structured = generateNetworkReportWithAudit(cleanDevices, cleanConnections, cleanStates());
    expect(structured.audit.passed).toBe(true);
    expect(structured.auditSummary).toContain('PASS');

    const withoutAudit = generateNetworkReport(cleanDevices, cleanConnections, cleanStates(), { includeAudit: false });
    expect(withoutAudit).not.toContain('## 6. Otomatik Doğrulama');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Multicast motor sahiplik ayrımı
// ─────────────────────────────────────────────────────────────────────────────

describe('7 — Multicast engine ownership split', () => {
  const mcState = makeState('SW-MC', {
    deviceType: 'switchL2',
    igmpSnoopingEnabled: true,
    multicastRoutingEnabled: true,
    ports: {
      'fa0/1': makePort('fa0/1', { mode: 'access', vlan: 20, igmpGroups: ['239.1.1.10'] }),
      'fa0/2': makePort('fa0/2', { mode: 'access', vlan: 20, igmpGroups: ['239.1.1.10'] }),
      'fa0/24': makePort('fa0/24', { mode: 'trunk', pimMode: 'sparse-mode', ipAddress: '10.0.0.9', subnetMask: '255.255.255.0' }),
    },
  });

  it('documents which module owns each concern', () => {
    expect(MULTICAST_OWNERSHIP.controlPlaneHelpers).toBe('lib/network/multicastEngine');
    expect(MULTICAST_OWNERSHIP.runtimeStateTick).toBe('lib/network/forwarding/multicastEngine');
    expect(MULTICAST_OWNERSHIP.forwardingDecision).toBe('lib/network/forwarding/packetPipelineResolution');
  });

  it('classifies multicast addresses through a single implementation', () => {
    expect(isMulticastAddress('239.1.1.10')).toBe(true);
    expect(isMulticastAddress('10.0.0.1')).toBe(false);
    expect(isMulticastAddress(undefined)).toBe(false);
    expect(isMulticastAddress('224.0.0.1')).toBe(isValidMulticastIp('224.0.0.1'));
  });

  it('builds the L2 snooping table as a pure helper (no state mutation)', () => {
    const table = buildIgmpSnoopingTableFromState(mcState);
    expect(table).toHaveLength(1);
    expect(table[0].groupIp).toBe('239.1.1.10');
    expect(table[0].vlanId).toBe(20);
    expect(table[0].egressPorts.sort()).toEqual(['fa0/1', 'fa0/2']);
    // Pure: the state object must be untouched.
    expect(Object.keys(mcState.ports['fa0/1'])).not.toContain('mrouteEntries');
  });

  it('lets the runtime tick engine re-use the pure helper without duplicating logic', () => {
    expect(getIgmpSnoopingTable(mcState)).toEqual(buildIgmpSnoopingTableFromState(mcState));
  });

  it('owns runtime state in the tick engine (mroute + PIM neighbor tables)', () => {
    // Aligned to the 60 s IGMP query interval so the query tick actually fires.
    const alignedNow = NOW - 20000;
    const { state, frames } = tickMulticast(mcState, 'sw-mc', alignedNow);
    expect(state.mrouteEntries?.some(e => e.group === '239.1.1.10')).toBe(true);
    expect(Object.keys(state.pimNeighbors ?? {}).length).toBeGreaterThan(0);
    expect(frames.some(f => f.protocol === 'PIM')).toBe(true);
    expect(frames.some(f => f.protocol === 'IGMP')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Regression guards', () => {
  beforeEach(() => clearPipelinePolicyRules());

  it('keeps authentication-free policy behaviour: no rules means implicit permit', () => {
    const engine = new PolicyEngine();
    expect(engine.evaluate('TCP', 1234, 80, { srcIp: '1.2.3.4' }).allowed).toBe(true);
    expect(engine.evaluate('TCP', 1234, 80, { srcIp: '1.2.3.4' }).matchedRule).toBeNull();
  });

  it('restores the pipeline policy table between tests', () => {
    expect(getPipelinePolicyRules()).toHaveLength(0);
  });
});
