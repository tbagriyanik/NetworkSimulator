import { SwitchState } from '../types';
import { buildHeaderServicesConfig } from './configHeaderServices';
import { buildInterfacesConfig } from './configInterfaces';
import { buildRoutingProtocolsConfig } from './configRoutingProtocols';
import { buildSecurityLinesAclConfig } from './configSecurityLinesAcl';

/**
 * Pure function that generates the running config lines for a given SwitchState.
 * Returns one config line per array entry (no \n characters).
 * Mirrors the generateConfig() logic in ConfigPanel.tsx.
 */
export function buildRunningConfig(state: SwitchState): string[] {
  const lines: string[] = [];
  buildHeaderServicesConfig(state, lines);
  buildInterfacesConfig(state, lines);
  buildRoutingProtocolsConfig(state, lines);
  buildSecurityLinesAclConfig(state, lines);
  return lines;
}
