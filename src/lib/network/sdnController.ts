import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface YangLeaf {
  name: string;
  type: string;
  config: boolean;
  description?: string;
}

export interface YangContainer {
  name: string;
  leaves: YangLeaf[];
  description?: string;
}

export interface YangList {
  name: string;
  key: string;
  leaves: YangLeaf[];
  description?: string;
}

export interface YangRpc {
  name: string;
  inputLeaves: YangLeaf[];
  outputLeaves: YangLeaf[];
  description?: string;
}

export interface YangModule {
  name: string;
  namespace: string;
  prefix?: string;
  leaves: YangLeaf[];
  containers?: YangContainer[];
  lists?: YangList[];
  rpcs?: YangRpc[];
}

export type YangData = Record<string, string | number | boolean>;

export interface NetconfRpcMessage {
  messageId: string;
  rpcName: string;
  params: Record<string, string | number | boolean>;
}

export interface NetconfRpcReply {
  messageId: string;
  ok: boolean;
  data?: Record<string, unknown>;
  errorMessage?: string;
}

export interface SdnPathTraceHop {
  hopNumber: number;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ingressPort?: string;
  egressPort?: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs: number;
  aclStatus: 'PERMITTED' | 'DENIED';
}

export interface SdnPathTraceResult {
  sourceIp: string;
  destIp: string;
  pathFound: boolean;
  totalHops: number;
  latencyMs: number;
  pathHops: SdnPathTraceHop[];
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE';
}

export interface SdnIntentPolicy {
  id: string;
  name: string;
  type: 'qos-voip' | 'isolate-vlan' | 'rate-limit';
  targetDeviceIds: string[];
  parameters: {
    vlanId?: number;
    dscpValue?: number;
    bandwidthLimitMbps?: number;
  };
}

export interface SdnInventorySummary {
  totalDevices: number;
  switchesCount: number;
  routersCount: number;
  pcsCount: number;
  activeLinksCount: number;
  discoveredVlans: number[];
}

export interface SdnFlowRule {
  id: string;
  priority: number;
  match: {
    srcIp?: string;
    dstIp?: string;
    protocol?: string;
    vlanId?: number;
  };
  action: 'FORWARD' | 'DROP' | 'SET_VLAN' | 'PRIORTIZE';
  egressPort?: string;
}

function parseLeaves(block: string): YangLeaf[] {
  const leaves: YangLeaf[] = [];
  const leafPattern = /\bleaf\s+([\w-]+)\s*\{([\s\S]*?)\}/gi;
  let match: RegExpExecArray | null;

  while ((match = leafPattern.exec(block))) {
    const type = match[2].match(/\btype\s+([\w:-]+)/i)?.[1] || 'string';
    leaves.push({
      name: match[1],
      type,
      config: !/\bconfig\s+false\s*;/i.test(match[2]),
    });
  }
  return leaves;
}

/** Comprehensive YANG 1.1 model parser supporting modules, leaves, containers, lists and RPCs */
export function parseYangModule(source: string): YangModule {
  const name = source.match(/\bmodule\s+([\w-]+)\s*\{/i)?.[1];
  const namespace = source.match(/\bnamespace\s+"([^"]+)"\s*;/i)?.[1];
  const prefix = source.match(/\bprefix\s+"?([\w-]+)"?\s*;/i)?.[1];
  if (!name || !namespace) {
    throw new Error('Invalid YANG module: module and namespace are required');
  }

  function extractBlocks(tag: string): Array<{ name: string; content: string }> {
    const results: Array<{ name: string; content: string }> = [];
    const regex = new RegExp(`\\b${tag}\\s+([\\w-]+)\\s*\\{`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(source))) {
      const name = m[1];
      const start = m.index + m[0].length;
      let depth = 1;
      let pos = start;
      while (pos < source.length && depth > 0) {
        if (source[pos] === '{') depth++;
        else if (source[pos] === '}') depth--;
        pos++;
      }
      results.push({ name, content: source.slice(start, pos - 1) });
    }
    return results;
  }

  function extractSubBlock(parentContent: string, tag: string): string {
    const regex = new RegExp(`\\b${tag}\\s*\\{`, 'i');
    const m = regex.exec(parentContent);
    if (!m) return '';
    const start = m.index + m[0].length;
    let depth = 1;
    let pos = start;
    while (pos < parentContent.length && depth > 0) {
      if (parentContent[pos] === '{') depth++;
      else if (parentContent[pos] === '}') depth--;
      pos++;
    }
    return parentContent.slice(start, pos - 1);
  }

  // Top-level leaves
  const leaves = parseLeaves(source);

  // Containers
  const containers: YangContainer[] = extractBlocks('container').map(b => ({
    name: b.name,
    leaves: parseLeaves(b.content),
  }));

  // Lists
  const lists: YangList[] = extractBlocks('list').map(b => ({
    name: b.name,
    key: b.content.match(/\bkey\s+"?([\w-]+)"?\s*;/i)?.[1] || 'id',
    leaves: parseLeaves(b.content),
  }));

  // RPCs
  const rpcs: YangRpc[] = extractBlocks('rpc').map(b => {
    const inputContent = extractSubBlock(b.content, 'input');
    const outputContent = extractSubBlock(b.content, 'output');
    return {
      name: b.name,
      inputLeaves: parseLeaves(inputContent),
      outputLeaves: parseLeaves(outputContent),
    };
  });

  return { name, namespace, prefix, leaves, containers, lists, rpcs };
}

export class SdnController {
  private readonly data = new Map<string, YangData>();
  private readonly flowRules: SdnFlowRule[] = [];
  private readonly intentPolicies: SdnIntentPolicy[] = [];

  constructor(public readonly modules: YangModule[] = []) {}

  get(path: string): YangData | undefined {
    const value = this.data.get(path);
    return value ? { ...value } : undefined;
  }

  editConfig(path: string, patch: YangData): YangData {
    const current = { ...this.data.get(path) };
    const schema = this.modules.flatMap(m => m.leaves).filter(l => l.config);

    for (const key of Object.keys(patch)) {
      const leaf = schema.find(l => l.name === key);
      if (leaf && leaf.type === 'boolean' && typeof patch[key] !== 'boolean') {
        throw new Error(`Invalid type for ${key}`);
      }
    }

    const next = { ...current, ...patch };
    this.data.set(path, next);
    return { ...next };
  }

  netconfGet(path: string): string {
    return `<data><config path="${path}">${JSON.stringify(this.get(path) || {})}</config></data>`;
  }

  restconfGet(path: string): YangData | undefined {
    return this.get(path);
  }

  restconfPatch(path: string, patch: YangData): YangData {
    return this.editConfig(path, patch);
  }

  /**
   * Dispatches and processes a NETCONF RPC message against defined YANG RPC schemas.
   */
  executeNetconfRpc(rpcMessage: NetconfRpcMessage): NetconfRpcReply {
    const definedRpc = this.modules.flatMap(m => m.rpcs ?? []).find(r => r.name === rpcMessage.rpcName);
    if (!definedRpc) {
      return {
        messageId: rpcMessage.messageId,
        ok: false,
        errorMessage: `RPC ${rpcMessage.rpcName} not defined in loaded YANG modules`,
      };
    }

    // Verify required inputs
    for (const inLeaf of definedRpc.inputLeaves) {
      if (rpcMessage.params[inLeaf.name] === undefined) {
        return {
          messageId: rpcMessage.messageId,
          ok: false,
          errorMessage: `Missing input parameter: ${inLeaf.name}`,
        };
      }
    }

    return {
      messageId: rpcMessage.messageId,
      ok: true,
      data: {
        status: 'SUCCESS',
        executedRpc: rpcMessage.rpcName,
        receivedParams: rpcMessage.params,
      },
    };
  }

  netconfRpcXml(messageId: string, rpcName: string, params: Record<string, string | number>): string {
    const paramsXml = Object.entries(params)
      .map(([k, v]) => `<${k}>${v}</${k}>`)
      .join('');
    return `<rpc message-id="${messageId}" xmlns="urn:ietf:params:xml:ns:netconf:base:1.0"><${rpcName}>${paramsXml}</${rpcName}></rpc>`;
  }

  /**
   * Discovers topology inventory, device count, active links, and active VLANs.
   */
  discoverInventory(devices: CanvasDevice[], connections: CanvasConnection[]): SdnInventorySummary {
    const vlansSet = new Set<number>();

    let switchesCount = 0;
    let routersCount = 0;
    let pcsCount = 0;

    for (const d of devices) {
      if (d.type === 'switchL2' || d.type === 'switchL3') switchesCount++;
      else if (d.type === 'router') routersCount++;
      else if (d.type === 'pc') pcsCount++;

      if (typeof d.vlan === 'number') {
        vlansSet.add(d.vlan);
      }
    }

    const activeLinksCount = connections.filter(c => c.active !== false).length;

    return {
      totalDevices: devices.length,
      switchesCount,
      routersCount,
      pcsCount,
      activeLinksCount,
      discoveredVlans: Array.from(vlansSet).sort((a, b) => a - b),
    };
  }

  /**
   * Computes an APIC-EM-style hop-by-hop path trace between endpoints.
   */
  computePathTrace(
    srcIp: string,
    dstIp: string,
    devices: CanvasDevice[],
    connections: CanvasConnection[]
  ): SdnPathTraceResult {
    const srcDevice = devices.find(d => d.ip === srcIp);
    const dstDevice = devices.find(d => d.ip === dstIp);

    if (!srcDevice || !dstDevice) {
      return {
        sourceIp: srcIp,
        destIp: dstIp,
        pathFound: false,
        totalHops: 0,
        latencyMs: 0,
        pathHops: [],
        healthStatus: 'UNREACHABLE',
      };
    }

    const pathHops: SdnPathTraceHop[] = [];
    const visited = new Set<string>();
    const queue: Array<{ deviceId: string; path: Array<{ device: CanvasDevice; conn?: CanvasConnection }> }> = [
      { deviceId: srcDevice.id, path: [{ device: srcDevice }] }
    ];

    let foundPath: Array<{ device: CanvasDevice; conn?: CanvasConnection }> | undefined;

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (current.deviceId === dstDevice.id) {
        foundPath = current.path;
        break;
      }

      visited.add(current.deviceId);

      const activeConns = connections.filter(
        c => (c.sourceDeviceId === current.deviceId || c.targetDeviceId === current.deviceId) && c.active !== false
      );

      for (const conn of activeConns) {
        const nextId = conn.sourceDeviceId === current.deviceId ? conn.targetDeviceId : conn.sourceDeviceId;
        if (!visited.has(nextId)) {
          const nextDevice = devices.find(d => d.id === nextId);
          if (nextDevice) {
            queue.push({
              deviceId: nextId,
              path: [...current.path, { device: nextDevice, conn }]
            });
          }
        }
      }
    }

    if (!foundPath) {
      return {
        sourceIp: srcIp,
        destIp: dstIp,
        pathFound: false,
        totalHops: 0,
        latencyMs: 0,
        pathHops: [],
        healthStatus: 'UNREACHABLE',
      };
    }

    let hopNum = 1;
    let totalLatency = 0;

    for (let i = 0; i < foundPath.length; i++) {
      const item = foundPath[i];
      const ingressConn = foundPath[i].conn;
      const egressConn = foundPath[i + 1]?.conn;

      const ingressPort = ingressConn
        ? (ingressConn.sourceDeviceId === item.device.id ? ingressConn.sourcePort : ingressConn.targetPort)
        : undefined;

      const egressPort = egressConn
        ? (egressConn.sourceDeviceId === item.device.id ? egressConn.sourcePort : egressConn.targetPort)
        : undefined;

      const hopLatency = 0.4 + (i * 0.1);
      totalLatency += hopLatency;

      pathHops.push({
        hopNumber: hopNum++,
        deviceId: item.device.id,
        deviceName: item.device.name,
        deviceType: item.device.type,
        ingressPort,
        egressPort,
        status: item.device.status === 'online' ? 'UP' : 'DOWN',
        latencyMs: parseFloat(hopLatency.toFixed(2)),
        aclStatus: 'PERMITTED',
      });
    }

    return {
      sourceIp: srcIp,
      destIp: dstIp,
      pathFound: true,
      totalHops: pathHops.length,
      latencyMs: parseFloat(totalLatency.toFixed(2)),
      pathHops,
      healthStatus: 'HEALTHY',
    };
  }

  /**
   * Applies Intent-Based Networking (IBN) policy across target devices.
   */
  applyIntentPolicy(
    policy: SdnIntentPolicy,
    devices: CanvasDevice[],
    deviceStates: Map<string, SwitchState>
  ): { success: boolean; appliedDevices: string[]; log: string } {
    const appliedDevices: string[] = [];
    this.intentPolicies.push(policy);

    for (const devId of policy.targetDeviceIds) {
      const dev = devices.find(d => d.id === devId);
      const state = deviceStates.get(devId);
      if (!dev || !state) continue;

      if (policy.type === 'isolate-vlan' && typeof policy.parameters.vlanId === 'number') {
        const vlanIdNum = policy.parameters.vlanId;
        dev.vlan = vlanIdNum;
        if (!state.vlans) state.vlans = {};
        const vlanKey = String(vlanIdNum);
        state.vlans[vlanKey] = { id: vlanIdNum, name: `VLAN_${vlanIdNum}`, status: 'active', ports: [] };
        appliedDevices.push(dev.name);
      } else if (policy.type === 'qos-voip') {
        state.mlsQosEnabled = true;
        appliedDevices.push(dev.name);
      } else if (policy.type === 'rate-limit' && typeof policy.parameters.bandwidthLimitMbps === 'number') {
        const limit = policy.parameters.bandwidthLimitMbps;
        if (state.ports) {
          for (const portKey of Object.keys(state.ports)) {
            const p = state.ports[portKey];
            if (p) p.bandwidthLimitMbps = limit;
          }
        }
        appliedDevices.push(dev.name);
      }
    }

    return {
      success: appliedDevices.length > 0,
      appliedDevices,
      log: `Intent [${policy.name}] successfully deployed to ${appliedDevices.length} target devices.`,
    };
  }

  /**
   * Pushes OpenFlow/RESTCONF flow entry to controller flow table.
   */
  pushFlowRule(rule: SdnFlowRule): void {
    const existingIdx = this.flowRules.findIndex(r => r.id === rule.id);
    if (existingIdx >= 0) {
      this.flowRules[existingIdx] = rule;
    } else {
      this.flowRules.push(rule);
    }
    this.flowRules.sort((a, b) => b.priority - a.priority);
  }

  getFlowRules(): SdnFlowRule[] {
    return [...this.flowRules];
  }
}
