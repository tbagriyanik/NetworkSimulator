import { SwitchState } from './types';
import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { checkConnectivity } from './connectivity/pathResolution';
import { recordIpSlaProbe, isIpSlaDue } from './ipSla';

export interface IpSlaEvaluationResult {
  updatedStates: Map<string, SwitchState>;
  dispatchedPackets: Array<{
    connectionId: string;
    sourceIp: string;
    targetIp: string;
    protocol: string;
    length: number;
    info: string;
  }>;
}

/**
 * Evaluates all scheduled IP SLA operations across topology devices,
 * calculates real topology path reachability and latency, updates probe statistics,
 * and updates associated Track Objects (ipSlaTracks) dynamically.
 */
export function evaluateIpSlaOperations(
  deviceStates: Map<string, SwitchState>,
  devices: CanvasDevice[],
  connections: CanvasConnection[],
  now: number = Date.now()
): IpSlaEvaluationResult {
  const updatedStates = new Map<string, SwitchState>(deviceStates);
  const dispatchedPackets: IpSlaEvaluationResult['dispatchedPackets'] = [];

  deviceStates.forEach((state, deviceId) => {
    if (!state.ipSlaOperations) return;

    let deviceUpdated = false;
    const currentOperations = { ...state.ipSlaOperations };
    const currentTracks = { ...state.ipSlaTracks };


    Object.entries(currentOperations).forEach(([slaId, op]) => {
      if (!op.running || !isIpSlaDue(op, now)) return;

      // Perform real path connectivity check across network topology
      const pathRes = checkConnectivity(
        deviceId,
        op.target,
        devices,
        connections,
        updatedStates,
        'tr',
        { protocol: 'icmp' }
      );

      const reachable = pathRes.success;
      // Calculate latency based on path hop count or direct delay (default 2ms per hop)
      const hopCount = pathRes.hops?.length || 1;
      const latency = reachable ? Math.max(1, hopCount * 2 + Math.floor(Math.random() * 3)) : undefined;

      // Update SLA Operation statistics
      const updatedOp = recordIpSlaProbe(op, latency, now);
      updatedOp.lastRunAt = now;
      currentOperations[slaId] = updatedOp;
      deviceUpdated = true;

      // Dispatch synthetic packet capture on first connection hop
      if (pathRes.hopIds && pathRes.hopIds.length >= 2) {
        const h1 = pathRes.hopIds[0];
        const h2 = pathRes.hopIds[1];
        const conn = connections.find(
          c => c.active &&
            ((c.sourceDeviceId === h1 && c.targetDeviceId === h2) ||
              (c.sourceDeviceId === h2 && c.targetDeviceId === h1))
        );
        if (conn) {
          dispatchedPackets.push({
            connectionId: conn.id || `${conn.sourceDeviceId}-${conn.targetDeviceId}`,
            sourceIp: state.ports?.gi0_0?.ipAddress || state.hostname || '1.1.1.1',
            targetIp: op.target,
            protocol: 'IP SLA',
            length: op.type === 'jitter' ? 128 : 64,
            info: `IP SLA Probe #${slaId} ${op.type.toUpperCase()} -> ${op.target} (${reachable ? `RTT ${latency}ms` : 'Timeout'})`
          });
        }
      }

      // Update associated Track objects and apply HSRP/VRRP priority decrement
      const targetState = reachable ? 'up' : 'down';
      Object.entries(currentTracks).forEach(([trackId, trackObj]) => {
        if (trackObj.operationId === slaId && trackObj.state !== targetState) {
          currentTracks[trackId] = {
            ...trackObj,
            state: targetState,
            lastChange: now
          };
          deviceUpdated = true;

          // Apply HSRP / VRRP Priority Decrement if tracking is configured on device ports
          const decrement = trackObj.decrement ?? 10;
          const ports = { ...state.ports };
          let portUpdated = false;

          Object.entries(ports).forEach(([pName, pObj]) => {
            if (pObj.hsrp?.groups) {
              const groups: Record<string, typeof pObj.hsrp.groups[number]> = { ...pObj.hsrp.groups };
              let groupUpdated = false;

              Object.entries(groups).forEach(([gId, groupConfig]) => {
                if (groupConfig && (groupConfig.trackId === trackId || groupConfig.trackId === String(trackId))) {
                  const basePriority = groupConfig.basePriority ?? groupConfig.priority ?? 100;
                  const newPriority = targetState === 'down' 
                    ? Math.max(1, basePriority - decrement) 
                    : basePriority;

                  groups[gId] = {
                    ...groupConfig,
                    basePriority,
                    priority: newPriority
                  };
                  groupUpdated = true;
                }
              });

              if (groupUpdated) {
                ports[pName] = {
                  ...pObj,
                  hsrp: {
                    ...pObj.hsrp,
                    groups
                  }
                };
                portUpdated = true;
              }
            }
          });

          if (portUpdated) {
            state.ports = ports;
          }
        }
      });
    });

    if (deviceUpdated) {
      updatedStates.set(deviceId, {
        ...state,
        ipSlaOperations: currentOperations,
        ipSlaTracks: currentTracks
      });
    }
  });

  return { updatedStates, dispatchedPackets };
}
