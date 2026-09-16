import type { CommandContext } from '../commandTypes';
import type { SwitchState, CommandResult } from '../../types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { diagnoseVlanMismatches, diagnoseDuplicateAddresses, diagnoseOrphanDevices } from '../../vlanDiagnostics';
import { detectRoutingLoops, getRoutingTable, findRoute, ipToNumber } from '../../routing';

export interface HealthDiagnosis {
  errors: string[];
  warnings: string[];
}

function numberToIp(num: number): string {
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
}

function prefixFromMask(maskNum: number): number {
  let count = 0;
  let temp = maskNum >>> 0;
  while (temp & 0x80000000) {
    count++;
    temp = (temp << 1) >>> 0;
  }
  return count;
}

/**
 * Flag administratively shutdown ports and ports not in 'connected' state.
 */
function diagnoseInterfaceHealth(deviceStates: Map<string, SwitchState>): HealthDiagnosis {
  const errors: string[] = [];
  const warnings: string[] = [];

  deviceStates.forEach((state, deviceId) => {
    const ports = state.ports || {};
    const portIds = Object.keys(ports);
    if (portIds.length === 0) return;

    const shutdownPorts: string[] = [];
    const downPorts: string[] = [];

    portIds.forEach(pid => {
      const p = ports[pid];
      if (p.shutdown) {
        shutdownPorts.push(pid);
      } else if (p.status && p.status !== 'connected') {
        downPorts.push(`${pid} (${p.status})`);
      }
    });

    if (shutdownPorts.length === portIds.length) {
      errors.push(`Device ${deviceId}: ALL interfaces are administratively shutdown (${shutdownPorts.join(', ')})`);
    } else if (shutdownPorts.length > 0) {
      warnings.push(`Device ${deviceId}: interfaces shutdown: ${shutdownPorts.join(', ')}`);
    }
    if (downPorts.length > 0) {
      warnings.push(`Device ${deviceId}: interfaces not connected: ${downPorts.join(', ')}`);
    }
  });

  return { errors, warnings };
}

/**
 * Flag switches running STP that have no port in forwarding state (fully isolated).
 */
function diagnoseStpIsolation(deviceStates: Map<string, SwitchState>): string[] {
  const issues: string[] = [];

  deviceStates.forEach((state, deviceId) => {
    if (state.spanningTreeEnabled === false) return;
    const hasStpInfo = Object.values(state.ports || {}).some(p => p.spanningTree?.state);
    if (!hasStpInfo && !state.spanningTreePriority) return;

    const forwardingPorts = Object.values(state.ports || {})
      .filter(p => (p.spanningTree?.state === 'forwarding') || (p.status === 'connected' && !p.spanningTree?.state));
    if (forwardingPorts.length === 0) {
      issues.push(`Switch ${deviceId}: STP is enabled but no port is in forwarding state â€” switch is isolated`);
    }
  });

  return issues;
}

/**
 * For each L3 device, verify every known network in the topology is reachable.
 */
function diagnoseRouteReachability(
  devices: CanvasDevice[],
  deviceStates: Map<string, SwitchState>,
  connections: CanvasConnection[]
): HealthDiagnosis {
  const errors: string[] = [];
  const warnings: string[] = [];

  const knownNetworks = new Set<string>();
  const networkLabel = new Map<string, string>();

  devices.forEach(device => {
    const ips: { ip: string; mask: string }[] = [];
    const state = deviceStates.get(device.id);
    if (state) {
      Object.values(state.ports || {}).forEach(p => {
        if (p.ipAddress && p.subnetMask) ips.push({ ip: p.ipAddress, mask: p.subnetMask });
      });
    }
    ips.forEach(({ ip, mask }) => {
      try {
        const ipNum = ipToNumber(ip);
        const maskNum = ipToNumber(mask);
        const netNum = (ipNum & maskNum) >>> 0;
        const key = `${netNum}:${maskNum}`;
        if (!knownNetworks.has(key)) {
          knownNetworks.add(key);
          networkLabel.set(key, `${numberToIp(netNum)}/${prefixFromMask(maskNum)}`);
        }
      } catch {
        // ignore malformed IPs
      }
    });
  });

  const l3Devices = devices.filter(d =>
    d.type === 'router' || d.type === 'firewall' ||
    (d.type === 'switchL3' && deviceStates.get(d.id)?.ipRouting !== false)
  );

  l3Devices.forEach(device => {
    const state = deviceStates.get(device.id);
    if (!state) return;
    const table = getRoutingTable(device.id, deviceStates, devices, connections);

    knownNetworks.forEach(key => {
      const [netNumStr] = key.split(':');
      const netNum = parseInt(netNumStr, 10);
      const netIp = numberToIp(netNum);
      if (!findRoute(netIp, table)) {
        const net = networkLabel.get(key) || netIp;
        if (net.toLowerCase().startsWith('0.0.0.0')) return;
        if (!findRoute('0.0.0.0', table) && table.length === 0) {
          warnings.push(`${device.name}: no routes configured at all â€” network ${net} is unreachable`);
        } else {
          errors.push(`${device.name}: no route to ${net}`);
        }
      }
    });
  });

  return { errors, warnings };
}

export function cmdShowNetworkHealth(
  _state: SwitchState,
  _input: string,
  ctx: CommandContext
): CommandResult {
  const devices = ctx.devices || [];
  const connections = ctx.connections || [];
  const deviceStates = ctx.deviceStates || new Map<string, SwitchState>();

  const vlanIssues = diagnoseVlanMismatches(devices, connections, deviceStates);
  const dupIssues = diagnoseDuplicateAddresses(devices, deviceStates);
  const orphanIssues = diagnoseOrphanDevices(devices, connections, deviceStates);
  const loopIssues = detectRoutingLoops(devices, deviceStates, connections);
  const interfaceIssues = diagnoseInterfaceHealth(deviceStates);
  const stpIssues = diagnoseStpIsolation(deviceStates);
  const reachabilityIssues = diagnoseRouteReachability(devices, deviceStates, connections);

  const errors = orphanIssues.filter(o => o.type === 'ORPHAN_DEVICE').length
    + stpIssues.length
    + (interfaceIssues.errors?.length || 0)
    + (reachabilityIssues.errors?.length || 0);
  const warnings = vlanIssues.length
    + dupIssues.length
    + orphanIssues.filter(o => o.type === 'ORPHAN_PORT').length
    + loopIssues.length
    + (interfaceIssues.warnings?.length || 0);

  let overallStatus = 'PASSED';
  if (errors > 0) overallStatus = 'CRITICAL';
  else if (warnings > 0) overallStatus = 'WARNING';

  let output = '\n';
  output += '=====================================================\n';
  output += '            NETWORK HEALTH CHECK REPORT              \n';
  output += '=====================================================\n';
  output += `Overall Status : ${overallStatus}\n`;
  output += `Total Devices  : ${devices.length}\n`;
  output += `Total Links    : ${connections.length}\n`;
  output += `Errors         : ${errors}\n`;
  output += `Warnings       : ${warnings}\n`;
  output += '-----------------------------------------------------\n\n';

  output += '1. VLAN & Trunk Configuration:\n';
  if (vlanIssues.length === 0) {
    output += '   [OK] No VLAN or Native VLAN mismatches detected.\n';
  } else {
    vlanIssues.forEach(issue => {
      output += `   [!] ${issue.message}\n       Fix: ${issue.recommendation}\n`;
    });
  }
  output += '\n';

  output += '2. IP & MAC Address Integrity:\n';
  if (dupIssues.length === 0) {
    output += '   [OK] All assigned IP and MAC addresses are unique.\n';
  } else {
    dupIssues.forEach(issue => {
      output += `   [!] ${issue.message}\n`;
    });
  }
  output += '\n';

  output += '3. Device & Port Connectivity:\n';
  if (orphanIssues.length === 0) {
    output += '   [OK] All devices and configured ports are properly connected.\n';
  } else {
    orphanIssues.forEach(issue => {
      output += `   [!] ${issue.message}\n`;
    });
  }
  output += '\n';

  output += '4. Routing Loops:\n';
  if (loopIssues.length === 0) {
    output += '   [OK] No routing loops detected in route tables.\n';
  } else {
    loopIssues.forEach(issue => {
      output += `   [!] ${issue.message}\n`;
    });
  }
  output += '\n';

  output += '5. Interface Health (shutdown / down):\n';
  if ((interfaceIssues.errors?.length || 0) === 0 && (interfaceIssues.warnings?.length || 0) === 0) {
    output += '   [OK] All interfaces are administratively up and connected.\n';
  } else {
    (interfaceIssues.errors || []).forEach(issue => {
      output += `   [!] ${issue}\n`;
    });
    (interfaceIssues.warnings || []).forEach(issue => {
      output += `   [~] ${issue}\n`;
    });
  }
  output += '\n';

  output += '6. Spanning-Tree Isolation:\n';
  if (stpIssues.length === 0) {
    output += '   [OK] All switches have at least one forwarding STP port.\n';
  } else {
    stpIssues.forEach(issue => {
      output += `   [!] ${issue}\n`;
    });
  }
  output += '\n';

  output += '7. Route Reachability:\n';
  if ((reachabilityIssues.errors?.length || 0) === 0 && (reachabilityIssues.warnings?.length || 0) === 0) {
    output += '   [OK] All known networks are reachable from every L3 device.\n';
  } else {
    (reachabilityIssues.errors || []).forEach(issue => {
      output += `   [!] ${issue}\n`;
    });
    (reachabilityIssues.warnings || []).forEach(issue => {
      output += `   [~] ${issue}\n`;
    });
  }
  output += '\n';

  output += '=====================================================\n';
  return { success: true, output };
}


