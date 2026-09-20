import type { CommandPattern } from './commandPatterns.types';
import { routingPatterns } from './routingPatterns';

export type RoutingPatternCategory = 'ospf' | 'bgp' | 'eigrp' | 'other';

export function getRoutingPatternCategory(command: string): RoutingPatternCategory {
  const normalized = command.toLowerCase();
  if (normalized.includes('ospf')) return 'ospf';
  if (normalized.includes('bgp')) return 'bgp';
  if (normalized.includes('eigrp')) return 'eigrp';
  return 'other';
}

export function getRoutingPatternsByCategory(category: RoutingPatternCategory): Record<string, CommandPattern> {
  return Object.fromEntries(Object.entries(routingPatterns).filter(([command]) => getRoutingPatternCategory(command) === category));
}

export const OSPFPatterns = getRoutingPatternsByCategory('ospf');
export const BGPPatterns = getRoutingPatternsByCategory('bgp');
export const EIGRPPatterns = getRoutingPatternsByCategory('eigrp');
