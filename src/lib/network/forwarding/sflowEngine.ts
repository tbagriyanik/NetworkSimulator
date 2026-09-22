import type { SwitchState } from '../types';
import type { NetworkPacketFrame } from './packetFrame';

export interface SflowSample {
  sequence: number;
  sourceIp?: string;
  destinationIp?: string;
  protocol: string;
  inputInterface?: string;
  outputInterfaces: string[];
  bytes: number;
  sampledAt: number;
}

export function buildSflowExportFrame(state: SwitchState, sample: SflowSample): NetworkPacketFrame | undefined {
  const config = state.sflowConfig;
  if (!config?.collector) return undefined;
  return {
    id: `sflow-export-${sample.sequence}`, protocol: 'UDP', timestamp: sample.sampledAt,
    srcMac: state.macAddress || '00:00:00:00:00:00', dstMac: 'ff:ff:ff:ff:ff:ff', etherType: '0x0800',
    srcIp: Object.values(state.ports || {}).find(port => port.ipAddress)?.ipAddress,
    dstIp: config.collector, srcPort: 6343, dstPort: 6343, length: 128,
    info: `sFlow sample export #${sample.sequence} to ${config.collector}`
  };
}

export function captureSflow(state: SwitchState, frame: NetworkPacketFrame, ingressPort: string | undefined, egressPorts: string[], now = Date.now()): SflowSample | undefined {
  const config = state.sflowConfig;
  if (!config?.enabled) return undefined;
  const rate = Math.max(1, config.sampleRate || 1);
  const counter = (config.sequence || 0) + 1;
  config.sequence = counter;
  if (counter % rate !== 0) return undefined;
  const sample: SflowSample = { sequence: counter, sourceIp: frame.srcIp, destinationIp: frame.dstIp, protocol: frame.protocol, inputInterface: ingressPort, outputInterfaces: [...egressPorts], bytes: frame.length, sampledAt: now };
  config.samples = [...(config.samples || []), sample].slice(-1000);
  if (config.collector) {
    config.exportedSamples = (config.exportedSamples || 0) + 1;
    config.exportQueue = [...(config.exportQueue || []), { collector: config.collector, sample }].slice(-1000);
  }
  return sample;
}
