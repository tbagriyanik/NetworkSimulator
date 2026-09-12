// Device capability gate shared between the direct command path (executor) and
// privileged delegation (`do ...` in cmdDo) so both enforce identical rules.
import type { SwitchState } from '../types';
import { getDeviceCapabilities } from '../capabilities';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';

const requiresSwitchingPrefixes = [
  'vlan', 'no vlan', 'switchport', 'spanning-tree', 'vtp', 'show vlan',
  'show mac address-table', 'show spanning-tree', 'show port-security',
  'show interface trunk', 'show interfaces trunk', 'show etherchannel',
  'show storm-control', 'show udld'
];
const requiresRoutingPrefixes = [
  'ip route', 'no ip route', 'router rip', 'router ospf', 'router eigrp',
  'ipv6 route', 'no ipv6 route', 'ipv6 router', 'show ip route', 'show ipv6 route',
  'show ip protocols', 'show ip ospf', 'show ip ospf neighbor', 'show ip ospf database', 'show ip ospf interface',
  'show ip eigrp', 'show ip eigrp neighbors'
];
const requiresFirewallPrefixes = [
  'access-group', 'object network', 'object-group', 'nat', 'same-security-traffic'
];

const l3OnlyCommands = [
  'show ip route', 'show ipv6 route', 'show ip protocols', 'show ip ospf', 'show ip ospf neighbor', 'show ip ospf database', 'show ip ospf interface',
  'show ip eigrp', 'show ip eigrp neighbors',
  'show mls qos', 'show sdm prefer'
];
const switchOnlyCommands = [
  'show vlan', 'show vlan brief', 'show spanning-tree', 'show port-security', 'show mac address-table',
  'show interfaces trunk', 'show interface trunk', 'show vtp status', 'show etherchannel', 'show udld',
  'show storm-control', 'show errdisable recovery', 'show errdisable detect'
];
const firewallOnlyCommands = ['access-group', 'nat', 'object network', 'object-group'];
const wlcOnlyCommands = [
  'show ap summary', 'show ap config', 'show ap join statistics',
  'show ap join stats', 'ap', 'auth-mac', 'rf-channel', 'dot11 5ghz'
];

/**
 * Returns a capability-gate error message for a fully validated commandName run
 * against a device, or null when the device supports the command.
 */
export function getCommandCapabilityError(commandName: string, state: Partial<SwitchState>): string | null {
  const inferredDeviceType = state.deviceType === 'switch'
    ? (state.switchLayer === 'L3' ? 'switchL3' : 'switchL2')
    : (state.deviceType || (state.switchLayer === 'FW' ? 'firewall' : state.switchLayer === 'L3' ? 'switchL3' : 'switchL2'));
  const capabilities = getDeviceCapabilities({ type: inferredDeviceType as DeviceType } as Pick<CanvasDevice, 'type'>, state.switchModel);

  const needsSwitching = requiresSwitchingPrefixes.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const needsRouting = requiresRoutingPrefixes.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const needsFirewall = requiresFirewallPrefixes.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));

  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || (state.version?.modelName || '').includes('NS-FW');
  const isL3Switch = state.switchModel === 'NS-L3-24PS' ||
    (state.switchModel && (state.switchModel.includes('NS-L3') || state.switchModel.includes('NS-R'))) ||
    state.deviceType === 'switchL3' ||
    state.switchLayer === 'L3';
  const isL2Switch = !isL3Switch && (
    state.switchModel === 'NS-L2-24TT-L' ||
    (state.switchModel && state.switchModel.includes('NS-L2')) ||
    state.deviceType === 'switch' ||
    state.deviceType === 'switchL2' ||
    state.switchLayer === 'L2' ||
    capabilities.switching
  );
  const isRouter = state.deviceType === 'router' || (!isFirewall && !isL2Switch && !isL3Switch && capabilities.routing);
  const isWLC = state.deviceType === 'wlc' || state.switchModel === 'NS-WLC-2504';

  const isL3OnlyCmd = l3OnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isSwitchOnlyCmd = switchOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isFirewallOnlyCmd = firewallOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isWlcOnlyCmd = wlcOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));

  const deviceLabel = isFirewall
    ? 'firewall'
    : isWLC
      ? 'Wireless LAN Controller'
      : isRouter
        ? 'router'
        : isL3Switch
          ? 'Layer 3 switch'
          : 'Layer 2 switch';

  if ((needsSwitching && !capabilities.switching) ||
    (needsRouting && !capabilities.routing) ||
    (needsFirewall && !capabilities.firewall) ||
    (isL3OnlyCmd && !(isL3Switch || isRouter || isWLC)) ||
    (isSwitchOnlyCmd && !(isL2Switch || isL3Switch)) ||
    (isFirewallOnlyCmd && !isFirewall) ||
    (isWlcOnlyCmd && !isWLC)) {
    return `% Invalid input detected at '^' marker.\n${commandName} is not supported on this ${deviceLabel}.`;
  }

  return null;
}