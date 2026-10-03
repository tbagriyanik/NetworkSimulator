// Firewall ve interface komutlari
import type { CommandPattern } from './commandPatterns.types';
import { interfaceFirewallPatterns } from './interfaceFirewallPatterns';
import { interfacePortPatterns } from './interfacePortPatterns';
import { interfaceBasePatterns } from './interfaceBasePatterns';
import { interfaceServicesPatterns } from './interfaceServicesPatterns';

export const interfacePatterns: Record<string, CommandPattern> = {
  ...interfaceFirewallPatterns,
  ...interfaceServicesPatterns,
  ...interfacePortPatterns,
  ...interfaceBasePatterns,
};
