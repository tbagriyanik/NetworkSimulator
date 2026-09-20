import type { CommandPattern } from './commandPatterns.types';

export const routingProtocolsPatterns: Record<string, CommandPattern> = {
  // Routing protocols
  'router rip': {
    pattern: /^router\s+rip$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'router ospf': {
    pattern: /^router\s+ospf\s*(\d*)$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 1
  },
  'router eigrp': {
    pattern: /^router\s+eigrp\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'router bgp': {
    pattern: /^router\s+bgp\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ipv6 router rip': {
    pattern: /^ipv6\s+router\s+rip\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ipv6 router ospf': {
    pattern: /^ipv6\s+router\s+ospf\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no router rip': {
    pattern: /^no\s+router\s+rip$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ipv6 router rip': {
    pattern: /^no\s+ipv6\s+router\s+rip\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ipv6 router ospf': {
    pattern: /^no\s+ipv6\s+router\s+ospf\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no router ospf': {
    pattern: /^no\s+router\s+ospf\s*(\d*)$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 1
  },
  'no router eigrp': {
    pattern: /^no\s+router\s+eigrp\s*(\d*)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no router bgp': {
    pattern: /^no\s+router\s+bgp\s*(\d*)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  // Router config subcommands
  'network': {
    pattern: /^network\s+([0-9.]+)(?:\s+([0-9.]+))?(?:\s+area\s+(\d+)|(?:\s+mask\s+([0-9.]+)))?$/i,
    modes: ['router-config', 'dhcp-config'],
    minArgs: 1,
    maxArgs: 4
  },
  'version': {
    pattern: /^version\s+[12]$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'neighbor remote-as': {
    pattern: /^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor next-hop-self': {
    pattern: /^neighbor\s+[0-9.]+\s+next-hop-self$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no neighbor next-hop-self': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+next-hop-self$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor ebgp-multihop': {
    pattern: /^neighbor\s+[0-9.]+\s+ebgp-multihop(?:\s+\d+)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no neighbor ebgp-multihop': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+ebgp-multihop$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor update-source': {
    pattern: /^neighbor\s+[0-9.]+\s+update-source\s+\S+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no neighbor update-source': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+update-source$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor timers': {
    pattern: /^neighbor\s+[0-9.]+\s+timers\s+\d+\s+\d+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no neighbor timers': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+timers$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor password': {
    pattern: /^neighbor\s+[0-9.]+\s+password\s+\S+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no neighbor password': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+password$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor description': {
    pattern: /^neighbor\s+[0-9.]+\s+description\s+.+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no neighbor description': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+description$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor shutdown': {
    pattern: /^neighbor\s+[0-9.]+\s+shutdown$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no neighbor shutdown': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+shutdown$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor default-originate': {
    pattern: /^neighbor\s+[0-9.]+\s+default-originate$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no neighbor default-originate': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+default-originate$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor remove-private-as': {
    pattern: /^neighbor\s+[0-9.]+\s+remove-private-as$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no neighbor remove-private-as': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+remove-private-as$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor maximum-prefix': {
    pattern: /^neighbor\s+[0-9.]+\s+maximum-prefix\s+\d+(?:\s+\d+)?$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 3
  },
  'no neighbor maximum-prefix': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+maximum-prefix$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor allowas-in': {
    pattern: /^neighbor\s+[0-9.]+\s+allowas-in(?:\s+\d+)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no neighbor allowas-in': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+allowas-in$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor send-community': {
    pattern: /^neighbor\s+[0-9.]+\s+send-community(?:\s+\w+)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no neighbor send-community': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+send-community$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor route-reflector-client': {
    pattern: /^neighbor\s+[0-9.]+\s+route-reflector-client$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no neighbor route-reflector-client': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+route-reflector-client$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor as-override': {
    pattern: /^neighbor\s+[0-9.]+\s+as-override$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no neighbor as-override': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+as-override$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor soft-reconfiguration': {
    pattern: /^neighbor\s+[0-9.]+\s+soft-reconfiguration\s+inbound$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no neighbor soft-reconfiguration': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+soft-reconfiguration$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor med': {
    pattern: /^neighbor\s+[0-9.]+\s+med\s+\d+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no neighbor med': {
    pattern: /^no\s+neighbor\s+[0-9.]+\s+med$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'aggregate-address': {
    pattern: /^aggregate-address\s+[0-9.]+\s+[0-9.]+(?:\s+summary-only)?$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 3
  },
  'no aggregate-address': {
    pattern: /^no\s+aggregate-address\s+[0-9.]+\s+[0-9.]+/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'maximum-paths': {
    pattern: /^maximum-paths\s+\d+$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no maximum-paths': {
    pattern: /^no\s+maximum-paths$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'bgp graceful-restart': {
    pattern: /^bgp\s+graceful-restart$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no bgp graceful-restart': {
    pattern: /^no\s+bgp\s+graceful-restart$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'bgp cluster-id': {
    pattern: /^bgp\s+cluster-id\s+[0-9.]+$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no bgp cluster-id': {
    pattern: /^no\s+bgp\s+cluster-id$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'bgp default local-preference': {
    pattern: /^bgp\s+default\s+local-preference\s+\d+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no bgp default local-preference': {
    pattern: /^no\s+bgp\s+default\s+local-preference$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'synchronization': {
    pattern: /^synchronization$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no synchronization': {
    pattern: /^no\s+synchronization$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'timers bgp': {
    pattern: /^timers\s+bgp\s+\d+\s+\d+$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no timers bgp': {
    pattern: /^no\s+timers\s+bgp$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'bgp confederation identifier': {
    pattern: /^bgp\s+confederation\s+identifier\s+(\d+)$/i,
    modes: ['router-config'],
    minArgs: 3,
    maxArgs: 3
  },
  'bgp confederation peers': {
    pattern: /^bgp\s+confederation\s+peers\s+(.+)$/i,
    modes: ['router-config'],
    minArgs: 3,
    maxArgs: 10
  },
  'bgp always-compare-med': {
    pattern: /^bgp\s+always-compare-med$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no bgp always-compare-med': {
    pattern: /^no\s+bgp\s+always-compare-med$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'bgp bestpath': {
    pattern: /^bgp\s+bestpath\s+(as-path\s+ignore|compare-routerid)$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 3
  },
  'ipv6 dhcp pool': {
    pattern: /^ipv6\s+dhcp\s+pool\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ipv6 dhcp pool': {
    pattern: /^no\s+ipv6\s+dhcp\s+pool\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ipv6 dhcp server': {
    pattern: /^ipv6\s+dhcp\s+server\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'address prefix': {
    pattern: /^address\s+prefix\s+([0-9a-fA-F:]+\/\d+)$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no auto-summary': {
    pattern: /^no\s+auto-summary$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'router-id': {
    pattern: /^router-id\s+([0-9.]+)$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'passive-interface': {
    pattern: /^passive-interface\s+(\S+)$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'default-information originate': {
    pattern: /^default-information\s+originate(?:\s+(always))?(?:\s+metric\s+(\d+))?(?:\s+metric-type\s+([12]))?(?:\s+(always))?$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 4
  },
  'no default-information originate': {
    pattern: /^no\s+default-information\s+originate$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'default-information always': {
    pattern: /^default-information\s+always$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'area range': {
    pattern: /^area\s+(\d+)\s+range\s+([0-9.]+)\s+([0-9.]+)$/i,
    modes: ['router-config'],
    minArgs: 3,
    maxArgs: 3
  },
  'area stub': {
    pattern: /^area\s+(\d+)\s+stub$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'area stub no-summary': {
    pattern: /^area\s+(\d+)\s+stub\s+no-summary$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no area stub': {
    pattern: /^no\s+area\s+(\d+)\s+stub(?:\s+no-summary)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'area nssa': {
    pattern: /^area\s+(\d+)\s+nssa$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'area nssa no-summary': {
    pattern: /^area\s+(\d+)\s+nssa\s+no-summary$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no area nssa': {
    pattern: /^no\s+area\s+(\d+)\s+nssa(?:\s+no-summary)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'area authentication': {
    pattern: /^area\s+(\d+)\s+authentication(?:\s+(message-digest))?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no area authentication': {
    pattern: /^no\s+area\s+(\d+)\s+authentication(?:\s+message-digest)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'redistribute': {
    pattern: /^redistribute\s+(ospf|rip|eigrp|bgp|static|connected)(?:\s+(\d+))?(?:\s+metric\s+(\d+))?(\s+subnets)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 4
  },
  'no redistribute': {
    pattern: /^no\s+redistribute\s+(ospf|rip|eigrp|bgp|static|connected)(?:\s+(\d+))?$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 3
  }
};

