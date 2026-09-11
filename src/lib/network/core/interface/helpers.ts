import { cliModeError } from '../cliErrors';
import type { SwitchState, Port, CommandResult } from '../../types';

// Helper function to check if in interface mode (single or range)
export function isInInterfaceMode(state: SwitchState): boolean {
  return state.currentMode === 'interface' || state.currentMode === 'config-if-range' || state.currentMode === 'dot11-config';
}

export function isVlanInterfaceName(interfaceName: string | undefined): boolean {
  return !!interfaceName && /^vlan\d+$/i.test(interfaceName);
}

export function getVlanPortKey(interfaceName: string): string {
  return interfaceName.toLowerCase();
}

export function mutatePortAtInterface(
  state: SwitchState,
  mutator: (port: Port) => Port,
  modeError: () => string = cliModeError
): CommandResult {
  if (!isInInterfaceMode(state) || !state.currentInterface) {
    return { success: false, error: modeError() };
  }

  const currentInterface = state.currentInterface;
  const newPorts = { ...state.ports };
  const existingPort = newPorts[currentInterface] ?? {};
  newPorts[currentInterface] = mutator(existingPort);

  return { success: true, newState: { ports: newPorts } };
}

/**
 * Helper function to validate IP address
 */
export function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    const num = parseInt(part);
    if (isNaN(num) || num < 0 || num > 255) return false;
  }
  return true;
}

export function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + (parts[3] >>> 0)) >>> 0;
}

export function isValidSubnetMask(mask: string): boolean {
  if (!isValidIP(mask)) return false;
  const maskNum = ipToNumber(mask);
  const inv = (~maskNum) >>> 0;
  return (inv & (inv + 1)) === 0;
}

export function isNetworkOrBroadcastAddress(ip: string, mask: string): boolean {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  const hostBits = (~maskNum) >>> 0;
  // /31 and /32 have no classic network/broadcast host restriction
  if (hostBits <= 1) return false;
  const hostPart = ipNum & hostBits;
  return hostPart === 0 || hostPart === hostBits;
}

export function expandInterfaceRange(rangeSpec: string, state: SwitchState): string[] {
  const normalized = rangeSpec.replace(/\s+/g, '').toLowerCase();

  // Handle comma-separated ranges: fa0/1,3,6 or fa0/1-4,7-9
  const parts = normalized.split(',');
  const allPorts: string[] = [];

  for (const part of parts) {
    // Try VLAN interface range: vlan10-20
    const vlanMatch = part.match(/^vlan(\d+)(?:-(\d+))?$/);
    if (vlanMatch) {
      const startVlan = parseInt(vlanMatch[1], 10);
      const endVlan = vlanMatch[2] ? parseInt(vlanMatch[2], 10) : startVlan;
      for (let vid = startVlan; vid <= endVlan; vid++) {
        const vlanId = `vlan${vid}`;
        if (!allPorts.includes(vlanId)) allPorts.push(vlanId);
      }
      continue;
    }

    // Try Port-channel interface range: po1-2 or port-channel1-2
    const poMatch = part.match(/^(?:port-channel|po)(\d+)(?:-(\d+))?$/);
    if (poMatch) {
      const startPo = parseInt(poMatch[1], 10);
      const endPo = poMatch[2] ? parseInt(poMatch[2], 10) : startPo;
      for (let pid = startPo; pid <= endPo; pid++) {
        const poId = `po${pid}`;
        if (!allPorts.includes(poId)) allPorts.push(poId);
      }
      continue;
    }

    const match = part.match(/^(fastethernet|gigabitethernet|gigabit|fa|gig|gi)(\d+(?:\/\d+)*)\/(\d+)(?:-(\d+))?$/);
    if (!match) continue;

    const prefix = match[1].startsWith('f') ? 'fa' : 'gi';
    const moduleSlot = match[2]; // e.g. "0" (2-level) or "1/0" (3-level)
    const startPort = parseInt(match[3], 10);
    const endPort = match[4] ? parseInt(match[4], 10) : startPort;

    if (Number.isNaN(startPort) || Number.isNaN(endPort) || endPort < startPort) continue;

    const available = Object.keys(state.ports || {});
    const modulePrefix = `${prefix}${moduleSlot}/`;
    const modulePorts = available
      .filter(portId => portId.startsWith(modulePrefix))
      .map(portId => parseInt(portId.split('/').pop() || '', 10))
      .filter(n => !Number.isNaN(n))
      .sort((a, b) => a - b);

    if (modulePorts.length === 0) return [];
    const minPort = modulePorts[0];
    const maxPort = modulePorts[modulePorts.length - 1];
    if (startPort < minPort || endPort > maxPort) return [];

    for (let port = startPort; port <= endPort; port++) {
      const normalizedId = `${prefix}${moduleSlot}/${port}`;
      if (available.includes(normalizedId) && !allPorts.includes(normalizedId)) {
        allPorts.push(normalizedId);
      }
    }
  }

  return allPorts;
}

export function applyToSelectedPorts(state: SwitchState, updater: (port: Port) => Port) {
  const newPorts = { ...state.ports };
  const targets = Array.isArray(state.selectedInterfaces) && state.selectedInterfaces.length > 0
    ? state.selectedInterfaces
    : state.currentInterface
      ? [state.currentInterface]
      : [];

  targets.forEach((portId: string) => {
    if (newPorts[portId]) {
      newPorts[portId] = updater(newPorts[portId]);
    }
  });

  return newPorts;
}
