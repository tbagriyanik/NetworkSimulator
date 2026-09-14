// NetFlow accounting engine (Flexible NetFlow data plane capture)
import { SwitchState, Port } from '../types';
import { NetworkPacketFrame } from './packetFrame';

export interface NetflowCaptureOptions {
  /** Monitor name (Flexible NetFlow) or legacy ingress/egress flag. */
  monitor?: string;
  /** Cache entry inactive timeout (seconds) before aging out. */
  inactiveTimeout?: number;
}

const DEFAULT_INACTIVE_TIMEOUT = 15;

const IP_PROTOCOL_NAMES: Record<number, string> = {
  1: '01',  // ICMP
  6: '06',  // TCP
  17: '11', // UDP
  47: '2F', // GRE
  50: '32', // ESP
  58: '3A', // EIGRP
  88: '58', // EIGRP
  89: '59', // OSPF
};

/** Convert an IP protocol number to the two-hex-digit string used in the cache. */
export function ipProtocolToProtoString(ipProtocol: number | undefined): string {
  if (ipProtocol !== undefined) return IP_PROTOCOL_NAMES[ipProtocol] || ipProtocol.toString(16).padStart(2, '0').toUpperCase();
  return '00';
}

/** True when an interface is configured to capture NetFlow (legacy or flexible). */
export function interfaceTracksFlows(port: Port | undefined): { ingress: boolean; egress: boolean } {
  if (!port) return { ingress: false, egress: false };
  return {
    ingress: Boolean(port.netflowIngress || port.flowMonitor),
    egress: Boolean(port.netflowEgress || port.flowMonitor),
  };
}

/** Resolve a flow's transport ports from a frame (L4 width or payload defaults). */
export function resolveFramePorts(frame: NetworkPacketFrame): { srcPort: number; dstPort: number } {
  if (frame.srcPort !== undefined || frame.dstPort !== undefined) {
    return { srcPort: frame.srcPort ?? 0, dstPort: frame.dstPort ?? 0 };
  }
  if (frame.dhcpPayload) {
    return { srcPort: 68, dstPort: 67 };
  }
  if (frame.ospfPayload || frame.eigrpPayload) {
    return { srcPort: 0, dstPort: 0 };
  }
  return { srcPort: 0, dstPort: 0 };
}

/**
 * Capture a forwarded IP packet into the device's NetFlow cache.
 * Mutates `state.netflowCache` (and export counters) in place.
 * Only invoked for successfully routed/forwarded data-plane packets.
 */
export function captureNetFlow(
  state: SwitchState,
  frame: NetworkPacketFrame,
  ingressPortId: string | undefined,
  egressPortIds: string[],
  now: number = Date.now()
): void {
  if (!state || !frame.srcIp || !frame.dstIp) return;
  const flowSrcIp = frame.srcIp;
  const flowDstIp = frame.dstIp;

  const ingressPort = ingressPortId ? state.ports?.[ingressPortId] : undefined;
  const inTracking = interfaceTracksFlows(ingressPort);

  let anyTracking = false;
  const egressTracking = egressPortIds.map(id => {
    const port = state.ports?.[id];
    const t = interfaceTracksFlows(port);
    if (t.ingress || t.egress) anyTracking = true;
    return { id, enabled: t.ingress || t.egress, port };
  });
  if (inTracking.ingress && egressPortIds.length > 0) anyTracking = true;
  if (!anyTracking) return;

  const { srcPort, dstPort } = resolveFramePorts(frame);
  const proto = ipProtocolToProtoString(frame.ipProtocol);
  const bytes = frame.length || 64;
  const cache = state.netflowCache || (state.netflowCache = []);

  const flowsToCount: { srcIf: string; dstIf: string }[] = [];
  if (inTracking.ingress) {
    egressTracking.forEach(et => {
      if (et.enabled) flowsToCount.push({ srcIf: ingressPortId || '', dstIf: et.id });
    });
    if (flowsToCount.length === 0) flowsToCount.push({ srcIf: ingressPortId || '', dstIf: egressPortIds[0] || '' });
  }
  egressTracking.forEach(et => {
    if (et.port) {
      const t = interfaceTracksFlows(et.port);
      if (t.egress && !flowsToCount.some(f => f.dstIf === et.id)) {
        flowsToCount.push({ srcIf: ingressPortId || '', dstIf: et.id });
      }
    }
  });
  if (flowsToCount.length === 0) return;

  flowsToCount.forEach(f => {
    const existing = cache.find(c =>
      (c.srcIf || '') === f.srcIf && (c.dstIf || '') === f.dstIf &&
      c.srcIp === flowSrcIp && c.dstIp === flowDstIp && c.proto === proto &&
      c.srcPort === srcPort && c.dstPort === dstPort);
    if (existing) {
      existing.pkts += 1;
      existing.bytes += bytes;
      existing.active += 1;
      existing.lastSeen = now;
    } else {
      cache.push({
        srcIf: f.srcIf,
        dstIf: f.dstIf,
        srcIp: flowSrcIp,
        dstIp: flowDstIp,
        proto,
        srcPort,
        dstPort,
        pkts: 1,
        bytes,
        active: 0,
        lastSeen: now,
      });
    }
  });

  // Aggregate export counters (what would be sent to the collector).
  const monitor = state.flowMonitors ? Object.values(state.flowMonitors)[0] : undefined;
  const inactiveTimeout = monitor?.cacheTimeoutInactive || DEFAULT_INACTIVE_TIMEOUT;
  ageOutNetflowCache(state, now, inactiveTimeout);

  if (state.netflowConfig?.exportDestination) {
    const cfg = state.netflowConfig;
    const before = cfg.exportedPackets || 0;
    cfg.exportedPackets = before + flowsToCount.length;
  }
}

/**
 * Remove flows that have seen no traffic for `inactiveTimeout` seconds.
 * Returns the number of flows aged out (counted as exports).
 */
export function ageOutNetflowCache(state: SwitchState, now: number = Date.now(), inactiveTimeout = DEFAULT_INACTIVE_TIMEOUT): number {
  if (!state.netflowCache || state.netflowCache.length === 0) return 0;
  const before = state.netflowCache.length;
  state.netflowCache = state.netflowCache.filter(c => now - c.lastSeen <= inactiveTimeout * 1000);
  const removed = before - state.netflowCache.length;
  if (removed > 0 && state.netflowConfig) {
    state.netflowConfig.exportedFlows = (state.netflowConfig.exportedFlows || 0) + removed;
  }
  return removed;
}