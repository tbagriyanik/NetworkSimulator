// Orchestrator for checkConnectivity. Pipeline stages live in dedicated modules:
// targetResolution, arpNdpResolution, pathFinding, traceRecording, l3Routing,
// l2Checks, dhcpSnooping and forwardingControls.

import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { buildImplicitWirelessConnections } from '@/lib/network/wireless';
import { buildConnectionIndex } from '@/lib/network/connectionIndex';
import { getPrimaryDeviceIp, isManagementIpSet } from '@/lib/network/connectivity.utils';
import { ConnectivityResult, CheckOptions } from './types';
import { resolveTarget } from './targetResolution';
import { performArpNdpResolution } from './arpNdpResolution';
import { findPath } from './pathFinding';
import { recordTrace } from './traceRecording';
import { validateL3Routing, checkL3Connectivity } from './l3Routing';
import { validateVlanAndL2 } from './l2Checks';
import { enforceDhcpSnooping } from './dhcpSnooping';
import { applyForwardingControls } from './forwardingControls';

/**
 * Robust Network connectivity checker for simulation
 * Checks if two devices can communicate based on:
 * 1. Physical connection (Topology)
 * 2. Layer 3 configuration (IP/Subnet)
 * 3. VLAN configuration (for Switches)
 * 4. Port status (Shutdown/Connected)
 */
export function checkConnectivity(
  sourceId: string,
  targetIp: string,
  devices: CanvasDevice[],
  _connections: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  language: 'tr' | 'en' = 'tr',
  options?: CheckOptions
): ConnectivityResult {
  const safeDeviceStates = ensureDeviceStatesMap(deviceStates);

  // Track port security violations for React state updates
  const portSecurityViolations: ConnectivityResult['portSecurityViolations'] = [];
  const traversedPorts: ConnectivityResult['traversedPorts'] = [];
  const capturedPackets: ConnectivityResult['capturedPackets'] = [];

  // BOLT: Use a device map for O(1) lookups
  const deviceMap = new Map<string, CanvasDevice>();
  for (const d of devices) {
    deviceMap.set(d.id, d);
  }

  // 1.5. Implicit Wireless Connections
  const connections = [
    ..._connections,
    ...buildImplicitWirelessConnections(devices, safeDeviceStates, 'wireless'),
  ];

  // Build all connection indexes once for this connectivity evaluation. BFS,
  // device-neighbor checks and path lookups reuse the same adjacency map.
  const connectionIndex = buildConnectionIndex(connections);
  const adjacency = connectionIndex.adjacency;

  // 0-1. Resolve hostname / target device / STP / ipMap
  const targetResolution = resolveTarget({ sourceId, targetIp, devices, connections, deviceMap, deviceStates, safeDeviceStates, language, options });
  if (targetResolution.type === 'error') return targetResolution.result;
  const { resolvedTargetIp, targetDevice, stpDeviceStates, ipMap } = targetResolution;

  // 1.5. Perform ARP/NDP resolution if target is in same subnet
  const arpBroadcast = performArpNdpResolution({ sourceId, devices, deviceMap, adjacency, safeDeviceStates, resolvedTargetIp, targetDevice, capturedPackets });

  // 2. Pathfinding with Gateway Routing support for inter-subnet communication
  const pathResult = findPath({ sourceId, devices, deviceMap, deviceStates, safeDeviceStates, connections, connectionIndex, adjacency, stpDeviceStates, ipMap, resolvedTargetIp, targetDevice, language });
  if (pathResult.type === 'error') return pathResult.result;
  const { path, sourceVlan, sourceIp, sourceDeviceForSubnet } = pathResult;

  // 2.5. Trace recording (TTL, MAC/ARP learning, packets, ARP flood, console-only links)
  const traceResult = recordTrace({ sourceId, path, deviceMap, adjacency, connections, safeDeviceStates, resolvedTargetIp, targetDevice, sourceIp, sourceVlan, arpBroadcast, language, options, traversedPorts, capturedPackets });
  if (traceResult.type === 'error') return traceResult.result;
  const { pathConnections } = traceResult;

  const hopNames = path.map(id => deviceMap.get(id)?.name || id);

  // 2.5. Check subnet compatibility (Layer 3)
  const l3Result = validateL3Routing({ sourceId, deviceStates, sourceDeviceForSubnet, targetDevice, devices, connections, deviceMap, safeDeviceStates, adjacency, path, hopNames, sourceIp, resolvedTargetIp, language });
  if (l3Result.type === 'error') return l3Result.result;

  // 3-5. Validate endpoint VLANs, trunks, VLAN-across-path and L2 connectivity
  const l2Result = validateVlanAndL2({ deviceStates, sourceId, devices, deviceMap, safeDeviceStates, adjacency, path, hopNames, pathConnections, resolvedTargetIp, targetDevice, routingRequired: l3Result.routingRequired, language, portSecurityViolations });
  if (l2Result.type === 'error') return l2Result.result;

  // 6. Layer 3 Routing Logic
  const l3Connectivity = checkL3Connectivity({ deviceStates, sourceId, devices, connections, deviceMap, safeDeviceStates, path, hopNames, resolvedTargetIp, targetDevice, routingRequired: l2Result.routingRequired, language });
  if (l3Connectivity.type === 'error') return l3Connectivity.result;

  // Fallback for simple topologies without advanced device states
  const basicConnectivityPossible = !deviceStates && !l2Result.routingRequired;

  // Track packet addresses as they are translated while traversing the path.
  let currentSourceIp = getPrimaryDeviceIp(sourceId, devices, safeDeviceStates, resolvedTargetIp.includes(':'));
  let currentTargetIp = resolvedTargetIp;

  // 6.5 DHCP Snooping Enforcement
  const dhcpResult = enforceDhcpSnooping({ deviceStates, path, deviceMap, safeDeviceStates, pathConnections, options, language, hopNames, targetDevice });
  if (dhcpResult.type === 'error') return dhcpResult.result;

  // 7. ACL, NAT & Firewall Logic
  const fwResult = applyForwardingControls({
    path,
    deviceMap,
    safeDeviceStates,
    pathConnections,
    options,
    language,
    hopNames,
    targetDevice,
    currentSourceIp,
    currentTargetIp,
    capturedPackets,
    traversedPorts,
    portSecurityViolations,
  });
  if (fwResult.type === 'error') return fwResult.result;
  currentSourceIp = fwResult.currentSourceIp;
  currentTargetIp = fwResult.currentTargetIp;

  if (!l2Result.l2ConnectivityPossible && !l3Connectivity.l3ConnectivityPossible && !basicConnectivityPossible) {
    // If we got here and no connectivity was confirmed, double check management IPs
    // BOLT: Use pre-resolved safeDeviceStates
    if (!getPrimaryDeviceIp(sourceId, devices, safeDeviceStates) && !isManagementIpSet(sourceId, safeDeviceStates)) {
      return { success: false, hops: [], hopIds: [], error: 'Source has no IP address.' };
    }
  }

  return {
    success: true,
    hops: hopNames,
    hopIds: path,
    targetId: targetDevice.id,
    portSecurityViolations,
    traversedPorts,
    capturedPackets
  };
}