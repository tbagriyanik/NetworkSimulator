import type { IpSlaOperation } from './types';

export function createIpSlaOperation(id: string, target: string, type: 'icmp-echo'|'jitter' = 'icmp-echo', frequency = 60, timeout = 5000): IpSlaOperation {
  return { id, target, type, frequency, timeout, running: false,
    statistics: { attempts: 0, successes: 0, failures: 0, samples: [] } };
}

export function recordIpSlaProbe(operation: IpSlaOperation, rtt?: number, timestamp = Date.now()): IpSlaOperation {
  const success = typeof rtt === 'number' && Number.isFinite(rtt) && rtt >= 0;
  const currentSamples = Array.isArray(operation.statistics.samples) ? operation.statistics.samples : [];
  const samples = [...currentSamples, { success, rtt: success ? rtt : undefined, timestamp }].slice(-100);
  const values = samples.flatMap(s => s.success && s.rtt !== undefined ? [s.rtt] : []);
  const jitter = values.length > 1 ? values.slice(1).reduce((sum, value, i) => sum + Math.abs(value - values[i]), 0) / (values.length - 1) : undefined;
  return { ...operation, statistics: { attempts: operation.statistics.attempts + 1, successes: operation.statistics.successes + (success ? 1 : 0), failures: operation.statistics.failures + (success ? 0 : 1), min: values.length ? Math.min(...values) : undefined, avg: values.length ? values.reduce((a,b) => a+b, 0) / values.length : undefined, max: values.length ? Math.max(...values) : undefined, jitter, last: success ? rtt : undefined, samples } };
}

export function runSyntheticIpSlaProbe(operation: IpSlaOperation, result: { reachable: boolean; latency?: number }, timestamp = Date.now()): IpSlaOperation {
  return { ...recordIpSlaProbe(operation, result.reachable ? result.latency : undefined, timestamp), lastRunAt: timestamp };
}

export function isIpSlaDue(operation: IpSlaOperation, now = Date.now()): boolean {
  return operation.running && (operation.lastRunAt === undefined || now - operation.lastRunAt >= operation.frequency * 1000);
}

export function formatIpSlaStatistics(operations: Record<string, IpSlaOperation> = {}): string {
  const entries = Object.values(operations);
  if (!entries.length) return '\nIP SLA: No operations configured\n';
  return '\nIP SLAs configured: ' + entries.length + '\n' + entries.map(op => {
    const s = op.statistics;
    return `\n${op.id}: ${op.type} ${op.target}\n  Latest operation return code: ${s.successes ? 'OK' : 'Timeout'}\n  Packets: Sent = ${s.attempts}, Received = ${s.successes}, Lost = ${s.failures}\n  RTT: Min/Avg/Max = ${s.min ?? '-'} / ${s.avg?.toFixed(2) ?? '-'} / ${s.max ?? '-'} ms\n  Jitter: ${s.jitter?.toFixed(2) ?? '-'} ms`;
  }).join('\n') + '\n';
}
