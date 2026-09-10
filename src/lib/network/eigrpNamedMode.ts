import type { SwitchState, EigrpNamedInstance } from './types';

export interface EigrpWideMetricParams {
  bandwidthKbps: number;
  delayPicoseconds: number;
  reliability?: number; // 1-255 (default 255)
  load?: number; // 1-255 (default 1)
}

export function getOrCreateEigrpNamedInstance(
  state: SwitchState,
  instanceName: string
): EigrpNamedInstance {
  if (!state.eigrpNamedInstances) {
    state.eigrpNamedInstances = {};
  }
  const key = instanceName.toLowerCase();
  if (!state.eigrpNamedInstances[key]) {
    state.eigrpNamedInstances[key] = {
      name: instanceName,
      addressFamilies: {},
    };
  }
  return state.eigrpNamedInstances[key];
}

export function configureEigrpAddressFamily(
  state: SwitchState,
  instanceName: string,
  afName: string, // e.g., "ipv4-unicast" or "ipv6-unicast"
  asNumber: number,
  networks: string[] = [],
  routerId?: string
): void {
  const instance = getOrCreateEigrpNamedInstance(state, instanceName);
  const afKey = afName.toLowerCase();
  instance.addressFamilies[afKey] = {
    asNumber,
    networks,
    routerId,
    metrics64Bit: true,
  };
}

/**
 * Calculates EIGRP 64-bit Wide Metric:
 * Metric = ((K1 * Minimum Throughput) + (K2 * Minimum Throughput)/(256-Load) + (K3 * Total Latency)) * 65536
 * In standard default K1=K3=1, K2=K4=K5=0:
 * Metric = (Minimum Throughput + Total Latency) * 65536
 * Where Minimum Throughput = (10^7 * 65536) / bandwidthKbps
 */
export function calculateEigrpWideMetric(params: EigrpWideMetricParams): number {
  const throughput = Math.floor((10_000_000 * 65536) / Math.max(1, params.bandwidthKbps));
  const latency = Math.floor(params.delayPicoseconds / 1_000_000); // Normalize to microseconds scale
  const metric = (throughput + latency) * 65536;
  return Math.max(1, metric);
}
