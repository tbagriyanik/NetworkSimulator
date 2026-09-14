import { SwitchState } from './types';

/**
 * Generate CLI prompt string based on current switch state
 */
export function getPrompt(state: SwitchState): string {
  const hostname = state.hostname || 'Switch';
  const mode = state.currentMode;

  switch (mode) {
    case 'user':
      return `${hostname}>`;
    case 'privileged':
      return `${hostname}#`;
    case 'config':
      return `${hostname}(config)#`;
    case 'interface':
      return `${hostname}(config-if)#`;
    case 'config-if-range':
      return `${hostname}(config-if-range)#`;
    case 'line':
      return `${hostname}(config-line)#`;
    case 'vlan':
      return `${hostname}(config-vlan)#`;
    case 'router-config':
      return `${hostname}(config-router)#`;
    case 'dhcp-config':
      return `${hostname}(dhcp-config)#`;
    case 'ssid-config':
      return `${hostname}(config-ssid)#`;
    case 'config-std-nacl':
      return `${hostname}(config-std-nacl)#`;
    case 'config-ext-nacl':
      return `${hostname}(config-ext-nacl)#`;
    case 'config-mst':
      return `${hostname}(config-mst)#`;
    case 'config-route-map':
      return `${hostname}(config-route-map)#`;
    case 'config-flow-record':
      return `${hostname}(config-flow-record)#`;
    case 'config-flow-exporter':
      return `${hostname}(config-flow-exporter)#`;
    case 'config-flow-monitor':
      return `${hostname}(config-flow-monitor)#`;
    case 'dot11-config':
      return `${hostname}(config-if)#`;
    case 'ap-config':
      return `${hostname}(config-ap)#`;
    default:
      return `${hostname}>`;
  }
}