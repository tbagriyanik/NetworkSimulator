// MAC Address Learning Simulation
import { SwitchState } from './types';
import type { CanvasDevice, CanvasConnection } from '@/components/network/NetworkTopology/types/networkTopology.types';

export interface MacTableEntry {
  mac: string;
  vlan: number;
  port: string;
  type: string; // Changed to string for compatibility with existing type
  timestamp?: number;
}

const MAC_AGING_TIME = 300000; // 5 minutes in milliseconds

/**
 * Resolve the effective aging time for a MAC entry.
 * Precedence: device global `macAgingTime` (seconds, from
 * `mac address-table aging-time <sec>`) → default 300 s.
 */
function resolveAgingMs(state: SwitchState): number {
  const global = (state as { macAgingTime?: number }).macAgingTime;
  if (typeof global === 'number' && global > 0) return global * 1000;
  return MAC_AGING_TIME;
}

export type MacLifecycleEventType = 'LEARN' | 'MOVE' | 'AGE' | 'FLOOD';

export interface MacLifecycleEvent {
  type: MacLifecycleEventType;
  deviceId: string;
  mac: string;
  vlan: number;
  oldPort?: string;
  newPort?: string;
  timestamp: number;
  message: string;
}

type MacEventListener = (event: MacLifecycleEvent) => void;
const macEventListeners: Set<MacEventListener> = new Set();

export function onMacLifecycleEvent(listener: MacEventListener): () => void {
  macEventListeners.add(listener);
  return () => macEventListeners.delete(listener);
}

export function emitMacLifecycleEvent(event: MacLifecycleEvent): void {
  macEventListeners.forEach(listener => {
    try {
      listener(event);
    } catch {
      // Ignore listener errors
    }
  });
}

/**
 * Learn MAC address on a switch port
 * Called when a frame is received on a port
 */
export function learnMacAddress(
  deviceId: string,
  mac: string,
  portId: string,
  vlan: number,
  deviceStates: Map<string, SwitchState>,
  type: string = 'DYNAMIC'
): void {
  const state = deviceStates.get(deviceId);
  if (!state) return;

  if (!state.macAddressTable) {
    state.macAddressTable = [];
  }

  const cleanMac = mac.toLowerCase();
  const existing = state.macAddressTable.find(
    entry => entry.mac.toLowerCase() === cleanMac && entry.vlan === vlan
  );

  const now = Date.now();

  if (existing) {
    if (existing.port !== portId) {
      const oldPort = existing.port;
      existing.port = portId;
      existing.type = type;
      existing.timestamp = now;

      emitMacLifecycleEvent({
        type: 'MOVE',
        deviceId,
        mac: cleanMac,
        vlan,
        oldPort,
        newPort: portId,
        timestamp: now,
        message: `[MAC MOVE] MAC ${cleanMac} moved from ${oldPort} to ${portId} on VLAN ${vlan}`,
      });
    } else {
      existing.timestamp = now;
    }
  } else {
    state.macAddressTable.push({
      mac: cleanMac,
      vlan,
      port: portId,
      type,
      timestamp: now
    });

    emitMacLifecycleEvent({
      type: 'LEARN',
      deviceId,
      mac: cleanMac,
      vlan,
      newPort: portId,
      timestamp: now,
      message: `[MAC LEARN] Learned MAC ${cleanMac} on port ${portId} (VLAN ${vlan})`,
    });
  }
}

/**
 * Clean expired MAC entries (older than MAC_AGING_TIME)
 * Only affects dynamic entries, static entries are permanent
 */
export function cleanExpiredMacEntries(state: SwitchState, deviceId?: string): MacLifecycleEvent[] {
  if (!state.macAddressTable || state.macAddressTable.length === 0) return [];

  const now = Date.now();
  const agingMs = resolveAgingMs(state);
  const agedEvents: MacLifecycleEvent[] = [];

  state.macAddressTable = state.macAddressTable.filter(entry => {
    if (entry.type === 'STATIC') return true;
    if (!entry.timestamp) return true;
    const isExpired = (now - entry.timestamp) >= agingMs;
    if (isExpired) {
      const evt: MacLifecycleEvent = {
        type: 'AGE',
        deviceId: deviceId || 'switch',
        mac: entry.mac,
        vlan: entry.vlan,
        oldPort: entry.port,
        timestamp: now,
        message: `[MAC AGE] MAC entry ${entry.mac} aged out from port ${entry.port} (VLAN ${entry.vlan})`,
      };
      agedEvents.push(evt);
      emitMacLifecycleEvent(evt);
    }
    return !isExpired;
  });

  return agedEvents;
}

/**
 * Find which port a MAC address is learned on
 */
export function findMacPort(
  deviceId: string,
  mac: string,
  vlan: number,
  deviceStates: Map<string, SwitchState>
): string | null {
  const state = deviceStates.get(deviceId);
  if (!state || !state.macAddressTable) return null;

  // Clean expired entries first
  cleanExpiredMacEntries(state);

  const entry = state.macAddressTable.find(
    e => e.mac.toLowerCase() === mac.toLowerCase() && e.vlan === vlan
  );

  return entry ? entry.port : null;
}

/**
 * Clear MAC address table
 */
export function clearMacTable(deviceId: string, deviceStates: Map<string, SwitchState>): void {
  const state = deviceStates.get(deviceId);
  if (!state) return;

  state.macAddressTable = [];
}

/**
 * Clear dynamic MAC entries only (keep static entries)
 */
export function clearDynamicMacEntries(deviceId: string, deviceStates: Map<string, SwitchState>): void {
  const state = deviceStates.get(deviceId);
  if (!state || !state.macAddressTable) return;

  state.macAddressTable = state.macAddressTable.filter(entry => entry.type === 'STATIC');
}

/**
 * Clear static MAC entries only (keep dynamic entries)
 */
export function clearStaticMacEntries(deviceId: string, deviceStates: Map<string, SwitchState>): void {
  const state = deviceStates.get(deviceId);
  if (!state || !state.macAddressTable) return;

  state.macAddressTable = state.macAddressTable.filter(entry => entry.type === 'DYNAMIC');
}

/**
 * Add static MAC address entry
 */
export function addStaticMacEntry(
  deviceId: string,
  mac: string,
  portId: string,
  vlan: number,
  deviceStates: Map<string, SwitchState>
): void {
  learnMacAddress(deviceId, mac, portId, vlan, deviceStates, 'STATIC');
}

/**
 * Remove specific MAC entry
 */
export function removeMacEntry(
  deviceId: string,
  mac: string,
  vlan: number,
  deviceStates: Map<string, SwitchState>
): void {
  const state = deviceStates.get(deviceId);
  if (!state || !state.macAddressTable) return;

  state.macAddressTable = state.macAddressTable.filter(
    entry => !(entry.mac.toLowerCase() === mac.toLowerCase() && entry.vlan === vlan)
  );
}

/**
 * Get MAC address table for display
 */
export function getMacTableForDisplay(
  deviceId: string,
  deviceStates: Map<string, SwitchState>
): MacTableEntry[] {
  const state = deviceStates.get(deviceId);
  if (!state || !state.macAddressTable) return [];

  // Clean expired entries before display
  cleanExpiredMacEntries(state);

  return state.macAddressTable;
}

/**
 * Simulate MAC learning when a device sends a frame
 * This should be called when:
 * - A device sends a packet (learn source MAC)
 * - A device receives a packet on a port (learn source MAC from incoming frame)
 */
export function processFrameMacLearning(
  switchDeviceId: string,
  sourceMac: string,
  ingressPort: string,
  vlan: number,
  deviceStates: Map<string, SwitchState>
): void {
  // Learn the source MAC address on the ingress port
  learnMacAddress(switchDeviceId, sourceMac, ingressPort, vlan, deviceStates, 'DYNAMIC');
}

const isSwitchDeviceType = (type: string): boolean => type === 'switchL2' || type === 'switchL3';

/**
 * Simulate MAC learning when a new cable connection is created.
 * Each switch endpoint of the connection immediately learns the peer device's
 * source MAC on the connecting port (new connection trigger).
 */
export function learnMacsOnNewConnection(
  deviceStates: Map<string, SwitchState>,
  connection: CanvasConnection,
  devices: CanvasDevice[]
): Map<string, SwitchState> {
  const nextStates = new Map(deviceStates);
  const byId = new Map(devices.map((d) => [d.id, d]));
  const source = byId.get(connection.sourceDeviceId);
  const target = byId.get(connection.targetDeviceId);
  if (!source || !target) return nextStates;

  const learnPeer = (switchDev: CanvasDevice, peer: CanvasDevice, portId: string) => {
    if (!peer.macAddress) return;
    const state = nextStates.get(switchDev.id);
    const port = state?.ports?.[portId];
    if (!state) return;
    const vlan = Number(port?.accessVlan || port?.vlan || 1);

    if (port?.portSecurity?.enabled) {
      const normalizedPeerMac = peer.macAddress.toLowerCase().replace(/[-:.]/g, '');
      const secureMacs = (port.staticMacs || []).map((mac) => mac.toLowerCase().replace(/[-:.]/g, ''));

      if (secureMacs.length === 0 && port.portSecurity.sticky) {
        const updatedPorts = { ...state.ports };
        updatedPorts[portId] = {
          ...port,
          staticMacs: [peer.macAddress],
          portSecurity: { ...port.portSecurity, macAddress: peer.macAddress }
        };
        nextStates.set(switchDev.id, { ...state, ports: updatedPorts });
      } else if (!secureMacs.includes(normalizedPeerMac)) {
        const updatedPorts = { ...state.ports };
        updatedPorts[portId] = {
          ...port,
          shutdown: true,
          status: 'err-disabled',
          portSecurity: {
            ...port.portSecurity,
            violations: (port.portSecurity.violations || 0) + 1
          }
        };
        nextStates.set(switchDev.id, { ...state, ports: updatedPorts });
        return;
      }
    }

    learnMacAddress(switchDev.id, peer.macAddress, portId, vlan, nextStates, 'DYNAMIC');
  };

  if (isSwitchDeviceType(source.type)) learnPeer(source, target, connection.sourcePort);
  if (isSwitchDeviceType(target.type)) learnPeer(target, source, connection.targetPort);

  return nextStates;
}


