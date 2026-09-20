// Routing protocols ve router config alt komutlari
import type { CommandPattern } from './commandPatterns.types';
import { routingProtocolsPatterns } from './routingProtocolsPatterns';
import { routingSwitchPatterns } from './routingSwitchPatterns';
import { routingCorePatterns } from './routingCorePatterns';
import { routingServicesPatterns } from './routingServicesPatterns';

export const routingPatterns: Record<string, CommandPattern> = {
  ...routingCorePatterns,
  ...routingServicesPatterns,
  ...routingProtocolsPatterns,
  ...routingSwitchPatterns,
};
