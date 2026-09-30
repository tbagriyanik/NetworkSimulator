import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { YangModule } from './yangParser';
import { buildImplicitWirelessConnections } from '@/lib/network/wireless';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { getRoutingTable, findRoute } from '@/lib/network/routing';
import { extractNetconfConfig, applyNetconfEditConfig } from './netconfStateSync';

/** Arbitrary YANG/NETCONF datastore payload (leaf name → value). */
export type YangData = Record<string, unknown>;

/** Match criteria of a pushed flow entry (OpenFlow/RESTCONF style). */
export interface SdnFlowMatch {
  srcIp?: string;
  dstIp?: string;
  protocol?: string;
  vlanId?: number;
}

export interface SdnFlowRule {
  id: string;
  priority: number;
  match: SdnFlowMatch;
  action: 'FORWARD' | 'DROP' | 'SET_VLAN' | 'PRIORTIZE';
  egressPort?: string;
}

export type SdnIntentType = 'qos-voip' | 'isolate-vlan' | 'rate-limit';

/** Intent-Based Networking policy applied across target devices. */
export interface SdnIntentPolicy {
  id: string;
  name: string;
  type: SdnIntentType;
  targetDeviceIds: string[];
  parameters: {
    vlanId?: number;
    bandwidthLimitMbps?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

/** Topology inventory produced by the controller discovery pass. */
export interface SdnInventorySummary {
  totalDevices: number;
  switchesCount: number;
  routersCount: number;
  pcsCount: number;
  activeLinksCount: number;
  discoveredVlans: number[];
}

/** One hop of an APIC-EM style path trace. */
export interface SdnPathTraceHop {
  hopNumber: number;
  deviceId: string;
  deviceName: string;
  deviceType: CanvasDevice['type'];
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

/** NETCONF <rpc> request envelope. */
export interface NetconfRpcMessage {
  messageId: string;
  rpcName: string;
  params: Record<string, string | number>;
}

/** NETCONF <rpc-reply> result envelope. */
export interface NetconfRpcReply {
  messageId: string;
  ok: boolean;
  errorMessage?: string;
  data?: Record<string, unknown>;
}

export type {
  YangLeaf,
  YangContainer,
  YangList,
  YangRpc,
  YangTypedef,
  YangModule,
  YangAstNode,
  YangToken,
  YangTokenType,
} from './yangParser';
export { tokenizeYang, parseYangTokens, buildYangSchemaFromAst, parseYangModule } from './yangParser';

export class SdnController {
  private readonly data = new Map<string, YangData>();
  private readonly flowRules: SdnFlowRule[] = [];
  private readonly intentPolicies: SdnIntentPolicy[] = [];

  constructor(public readonly modules: YangModule[] = []) {}

  get(path: string, deviceState?: SwitchState): YangData | undefined {
    if (deviceState) {
      const extracted = extractNetconfConfig(deviceState, path);
      return extracted as YangData;
    }
    const value = this.data.get(path);
    return value ? { ...value } : undefined;
  }

  editConfig(path: string, patch: YangData, deviceState?: SwitchState): YangData {
    const current = { ...this.data.get(path) };
    const schema = this.modules.flatMap(m => m.leaves).filter(l => l.config);

    for (const key of Object.keys(patch)) {
      const leaf = schema.find(l => l.name === key);
      if (leaf && leaf.type === 'boolean' && typeof patch[key] !== 'boolean') {
        throw new Error(`Invalid type for ${key}`);
      }
    }

    if (deviceState) {
      applyNetconfEditConfig(deviceState, patch as Record<string, string | number | boolean>, path);
    }

    const next = { ...current, ...patch };
    this.data.set(path, next);
    return { ...next };
  }

  netconfGet(path: string, deviceState?: SwitchState): string {
    const data = this.get(path, deviceState);
    return `<data><config path="${path}">${JSON.stringify(data || {})}</config></data>`;
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
    connections: CanvasConnection[],
    deviceStates?: Map<string, SwitchState>
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

    const safeStates = deviceStates ? ensureDeviceStatesMap(deviceStates) : new Map();
    const implicitWirelessConns = buildImplicitWirelessConnections(devices, safeStates, 'sdn-wireless');
    const allConns = [...connections, ...implicitWirelessConns];

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

      const activeConns = allConns.filter(
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
    let overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE' = 'HEALTHY';
    let pathFound = true;
    let currentSrcIp = srcIp;
    let currentDstIp = dstIp;

    for (let i = 0; i < foundPath.length; i++) {
      const item = foundPath[i];
      const devState = safeStates.get(item.device.id);
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

      let hopStatus: 'UP' | 'DOWN' | 'DEGRADED' = item.device.status === 'online' ? 'UP' : 'DOWN';
      let aclStatus: 'PERMITTED' | 'DENIED' = 'PERMITTED';

      // 1. STP & Port Operational Status Check
      if (devState && (ingressPort || egressPort)) {
        const inPortObj = ingressPort ? devState.ports?.[ingressPort] : undefined;
        const outPortObj = egressPort ? devState.ports?.[egressPort] : undefined;

        if (inPortObj?.shutdown || outPortObj?.shutdown || inPortObj?.status === 'disabled' || outPortObj?.status === 'disabled') {
          hopStatus = 'DOWN';
          overallHealth = 'UNREACHABLE';
          pathFound = false;
        } else if (inPortObj?.status === 'blocked' || outPortObj?.status === 'blocked') {
          hopStatus = 'DEGRADED';
          if (overallHealth !== 'UNREACHABLE') overallHealth = 'DEGRADED';
        }
      }

      // 2. SDN Flow Rules & ACL Status Check
      const activeFlowRules = [...this.flowRules, ...(devState?.sdnFlowRules || [])];
      for (const rule of activeFlowRules) {
        if (rule.action === 'DROP') {
          const matchSrc = !rule.match.srcIp || rule.match.srcIp === currentSrcIp;
          const matchDst = !rule.match.dstIp || rule.match.dstIp === currentDstIp;
          if (matchSrc && matchDst) {
            aclStatus = 'DENIED';
            hopStatus = 'DEGRADED';
            if (overallHealth !== 'UNREACHABLE') overallHealth = 'DEGRADED';
          }
        }
      }

      // 3. RIB / FIB Routing Table Verification for L3 Hops
      if (devState && (item.device.type === 'router' || item.device.type === 'switchL3' || devState.ipRouting)) {
        if (item.device.id !== dstDevice.id) {
          const routingTable = getRoutingTable(item.device.id, safeStates);
          const route = findRoute(currentDstIp, routingTable);
          if (!route) {
            hopStatus = 'DOWN';
            overallHealth = 'UNREACHABLE';
            pathFound = false;
          }
        }
      }

      // 4. NAT State Inspection
      if (devState?.staticNat && typeof devState.staticNat === 'object') {
        const natMap = devState.staticNat as Record<string, string>;
        if (natMap[currentSrcIp]) {
          currentSrcIp = natMap[currentSrcIp];
        }
      }

      pathHops.push({
        hopNumber: hopNum++,
        deviceId: item.device.id,
        deviceName: item.device.name,
        deviceType: item.device.type,
        ingressPort,
        egressPort,
        status: hopStatus,
        latencyMs: parseFloat(hopLatency.toFixed(2)),
        aclStatus,
      });

      if (!pathFound) break;
    }

    return {
      sourceIp: srcIp,
      destIp: dstIp,
      pathFound,
      totalHops: pathHops.length,
      latencyMs: parseFloat(totalLatency.toFixed(2)),
      pathHops,
      healthStatus: pathFound ? overallHealth : 'UNREACHABLE',
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

      if (!state.sdnIntents) state.sdnIntents = [];
      state.sdnIntents.push(policy);

      if (policy.type === 'isolate-vlan' && typeof policy.parameters.vlanId === 'number') {
        const vlanIdNum = policy.parameters.vlanId;
        dev.vlan = vlanIdNum;
        if (!state.vlans) state.vlans = {};
        const vlanKey = String(vlanIdNum);
        state.vlans[vlanKey] = { id: vlanIdNum, name: `VLAN_${vlanIdNum}`, status: 'active', ports: [] };
        
        const flowRule: SdnFlowRule = {
          id: `intent-isolate-${policy.id}-${devId}`,
          priority: 100,
          match: { vlanId: vlanIdNum },
          action: 'SET_VLAN',
        };
        this.pushFlowRule(flowRule);
        state.sdnFlowRules = [...(state.sdnFlowRules || []), flowRule];
        appliedDevices.push(dev.name);
      } else if (policy.type === 'qos-voip') {
        state.mlsQosEnabled = true;
        const flowRule: SdnFlowRule = {
          id: `intent-qos-${policy.id}-${devId}`,
          priority: 100,
          match: { protocol: 'udp' },
          action: 'PRIORTIZE',
        };
        this.pushFlowRule(flowRule);
        state.sdnFlowRules = [...(state.sdnFlowRules || []), flowRule];
        appliedDevices.push(dev.name);
      } else if (policy.type === 'rate-limit' && typeof policy.parameters.bandwidthLimitMbps === 'number') {
        const limit = policy.parameters.bandwidthLimitMbps;
        if (state.ports) {
          for (const portKey of Object.keys(state.ports)) {
            const p = state.ports[portKey];
            if (p) p.bandwidthLimitMbps = limit;
          }
        }
        const flowRule: SdnFlowRule = {
          id: `intent-rate-${policy.id}-${devId}`,
          priority: 50,
          match: {},
          action: 'FORWARD',
        };
        this.pushFlowRule(flowRule);
        state.sdnFlowRules = [...(state.sdnFlowRules || []), flowRule];
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
