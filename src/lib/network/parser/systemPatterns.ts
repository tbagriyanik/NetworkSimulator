import type { CommandPattern } from './commandPatterns.types';
import { systemPatternsSaveAndBasic } from './systemPatternsSaveAndBasic';
import { systemPatternsAclAndQos } from './systemPatternsAclAndQos';
import { systemPatternsDhcpWirelessNatShow } from './systemPatternsDhcpWirelessNatShow';
import { controlPlanePatterns } from './controlPlanePatterns';

export const systemPatterns: Record<string, CommandPattern> = {
  ...systemPatternsSaveAndBasic,
  ...systemPatternsAclAndQos,
  ...systemPatternsDhcpWirelessNatShow,
  // NETCONF / MQTT / CoAP control-plane ingress. Spread last: `netconf get` and
  // friends must not be shadowed by the shorter `netconf-yang` / `netconf ssh`
  // config patterns in modePatterns.
  ...controlPlanePatterns,
};
