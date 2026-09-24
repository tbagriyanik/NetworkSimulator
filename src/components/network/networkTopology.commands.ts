import { LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

// Import modular command definitions
import { getKeyboardShortcuts } from './networkTopology.commands.shortcuts';
import { getCommandModes } from './networkTopology.commands.modes';
import { getSystemCommands } from './networkTopology.commands.system';
import { getNetworkingCommands } from './networkTopology.commands.networking';
import { getLinuxCommands } from './networkTopology.commands.linux';
import { getPrivilegedCommands } from './networkTopology.commands.privileged';
import { getGlobalConfigCommands } from './networkTopology.commands.global';
import {
  getDhcpExample,
  getWifiExample,
  getSshExample,
  getVlanExample,
  getNatExample,
  getRouterOnAStickExample,
  getEtherChannelExample,
  getHsrpExample,
  getOspfExample,
  getAclExample
} from './networkTopology.commands.examples';
import { getInfoCategories } from './networkTopology.commands.info';
import { getNetSimCommands } from './networkTopology.commands.netsim';
import { getDesktopCommands } from './networkTopology.commands.desktop';
import { getAlternativeCliCommands } from './networkTopology.commands.compat';

export function getCommandCategories(isTR: boolean): CommandDefinition[] {
  return [
    getKeyboardShortcuts(isTR),
    getCommandModes(isTR),
    getNetworkingCommands(isTR),
    getSystemCommands(isTR),
    getAlternativeCliCommands(isTR),
    getLinuxCommands(isTR),
    getPrivilegedCommands(isTR),
    getGlobalConfigCommands(isTR),

    // Examples
    getDhcpExample(isTR),
    getWifiExample(isTR),
    getSshExample(isTR),
    getVlanExample(isTR),
    getNatExample(isTR),
    getRouterOnAStickExample(isTR),
    getEtherChannelExample(isTR),
    getHsrpExample(isTR),
    getOspfExample(isTR),
    getAclExample(isTR),

    // Info categories (knowledge, network terms, abbreviations, diagnostics)
    ...getInfoCategories(isTR),

    // CLI commands (firewall, acl, wlc, interface, wireless, line, admin, router, dhcp, show, bgp/mpls)
    ...getNetSimCommands(isTR),

    // Desktop & Python commands
    ...getDesktopCommands(isTR),
  ];
}
