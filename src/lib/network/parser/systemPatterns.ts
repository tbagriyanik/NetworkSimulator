import type { CommandPattern } from './commandPatterns.types';
import { systemPatternsSaveAndBasic } from './systemPatternsSaveAndBasic';
import { systemPatternsAclAndQos } from './systemPatternsAclAndQos';
import { systemPatternsDhcpWirelessNatShow } from './systemPatternsDhcpWirelessNatShow';

export const systemPatterns: Record<string, CommandPattern> = {
  ...systemPatternsSaveAndBasic,
  ...systemPatternsAclAndQos,
  ...systemPatternsDhcpWirelessNatShow,
};
