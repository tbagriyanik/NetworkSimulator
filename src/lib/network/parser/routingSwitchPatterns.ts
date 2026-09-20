import type { CommandPattern } from './commandPatterns.types';

export const routingSwitchPatterns: Record<string, CommandPattern> = {
  'cdp timer': {
    pattern: /^cdp\s+timer\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'cdp holdtime': {
    pattern: /^cdp\s+holdtime\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'lldp timer': {
    pattern: /^lldp\s+timer\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'lldp holdtime': {
    pattern: /^lldp\s+holdtime\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'lldp reinit': {
    pattern: /^lldp\s+reinit\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'lldp tlv-select': {
    pattern: /^lldp\s+tlv-select\s+(.+)$/i, modes: ['config'], minArgs: 1, maxArgs: 4
  },
  'vtp mode': {
    pattern: /^vtp\s+mode\s+(server|client|transparent|off)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'vtp domain': {
    pattern: /^vtp\s+domain\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'vtp password': {
    pattern: /^vtp\s+password\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'spanning-tree mode': {
    pattern: /^spanning-tree\s+mode\s+(pvst|rapid-pvst|mst)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'spanning-tree mst configuration': {
    pattern: /^spanning-tree\s+mst\s+configuration$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'spanning-tree mst priority': {
    pattern: /^spanning-tree\s+mst\s+(\d+)\s+priority\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3
  },
  'name': {
    pattern: /^name\s+(\S+)$/i,
    modes: ['config-mst'],
    minArgs: 1,
    maxArgs: 1
  },
  'revision': {
    pattern: /^revision\s+(\d+)$/i,
    modes: ['config-mst'],
    minArgs: 1,
    maxArgs: 1
  },
  'instance': {
    pattern: /^instance\s+(\d+)\s+vlan\s+([0-9,-]+)$/i,
    modes: ['config-mst'],
    minArgs: 3,
    maxArgs: 3
  },
  'no instance': {
    pattern: /^no\s+instance\s+(\d+)$/i,
    modes: ['config-mst'],
    minArgs: 2,
    maxArgs: 2
  },
  'show pending': {
    pattern: /^show\s+pending$/i,
    modes: ['config-mst'],
    minArgs: 0,
    maxArgs: 0
  },
  'spanning-tree vlan': {
    pattern: /^spanning-tree\s+vlan\s+(\d+)(?:\s+(priority|root)(?:\s+(primary|secondary|\d+))?)?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 4
  },
  'spanning-tree portfast': {
    pattern: /^spanning-tree\s+portfast(\s+(default|edge|bpduguard\s+(enable|disable)))?$/i,
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 2
  },
  'spanning-tree bpduguard': {
    pattern: /^spanning-tree\s+bpduguard\s+(enable|disable)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'spanning-tree uplinkfast': {
    pattern: /^spanning-tree\s+uplinkfast$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no spanning-tree uplinkfast': {
    pattern: /^no\s+spanning-tree\s+uplinkfast$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'spanning-tree backbonefast': {
    pattern: /^spanning-tree\s+backbonefast$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no spanning-tree backbonefast': {
    pattern: /^no\s+spanning-tree\s+backbonefast$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no spanning-tree': {
    pattern: /^no\s+spanning-tree(\s+vlan\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 2
  },
  'no spanning-tree portfast': {
    pattern: /^no\s+spanning-tree\s+portfast$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'errdisable recovery': {
    pattern: /^errdisable\s+recovery\s+(cause|interval)\s+(.+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'ipv6 rip enable': {
    pattern: /^ipv6\s+rip\s+(\S+)\s+enable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'ipv6 ospf area': {
    pattern: /^ipv6\s+ospf\s+(\d+)\s+area\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ipv6 rip enable': {
    pattern: /^no\s+ipv6\s+rip\s+(\S+)\s+enable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'ip ospf area': {
    pattern: /^ip\s+ospf\s+(\d+)\s+area\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ip ospf area': {
    pattern: /^no\s+ip\s+ospf\s+(\d+)\s+area\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ipv6 ospf area': {
    pattern: /^no\s+ipv6\s+ospf\s+(\d+)\s+area\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'errdisable recovery cause': {
    pattern: /^errdisable\s+recovery\s+cause\s+(all|bpduguard|channel-misconfig|dhcp-rate-limit|dtp-flap|gbic-invalid|l2ptguard|linkstate|loopback|mac-limit|pagp-flap|port-mode-failure|port-security|psecure-violation|security-violation|sfp-config-mismatch|small-frame|storm-control|udld|unicast-flood)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'show ipv6 route': {
    pattern: /^show\s+ipv6\s+route(\s+(.+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'mls qos': {
    pattern: /^mls\s+qos$/i,
    modes: ['config', 'interface'],
    minArgs: 0,
    maxArgs: 0
  },
  'no mls qos': {
    pattern: /^no\s+mls\s+qos$/i,
    modes: ['config', 'interface'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip dhcp snooping': {
    pattern: /^ip\s+dhcp\s+snooping$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip dhcp snooping vlan': {
    pattern: /^ip\s+dhcp\s+snooping\s+vlan\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip dhcp snooping': {
    pattern: /^no\s+ip\s+dhcp\s+snooping$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip dhcp snooping information option': {
    pattern: /^ip\s+dhcp\s+snooping\s+information\s+option$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip dhcp snooping information option': {
    pattern: /^no\s+ip\s+dhcp\s+snooping\s+information\s+option$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip arp inspection': {
    pattern: /^ip\s+arp\s+inspection\s+vlan\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip arp inspection': {
    pattern: /^no\s+ip\s+arp\s+inspection(\s+vlan\s+(.+))?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 2
  },
  'system mtu': {
    pattern: /^system\s+mtu\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'sdm prefer': {
    pattern: /^sdm\s+prefer\s+(default|dual-ipv4-and-ipv6|lanbase-routing|qos)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'snmp-server community': {
    pattern: /^snmp-server\s+community\s+(\S+)(\s+(RO|RW))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no spanning-tree portfast default': {
    pattern: /^no\s+spanning-tree\s+portfast\s+default$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no snmp-server community': {
    pattern: /^no\s+snmp-server\s+community\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'snmp-server contact': {
    pattern: /^snmp-server\s+contact\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'snmp-server location': {
    pattern: /^snmp-server\s+location\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ntp server': {
    pattern: /^ntp\s+server\s+([0-9.]+|[\w.-]+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ntp server': {
    pattern: /^no\s+ntp\s+server(?:\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 1
  },
  'ntp master': {
    pattern: /^ntp\s+master\s+(\d{1,2})$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'clock timezone': {
    pattern: /^clock\s+timezone\s+(\S+)\s+([+-]?\d+)(:\d+)?$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 3
  },
  'archive': {
    pattern: /^archive$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'alias': {
    pattern: /^alias\s+(exec|configure|interface|line)\s+(\S+)\s+(.+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3
  },
  'no alias': {
    pattern: /^no\s+alias\s+(exec|configure|interface|line)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'macro': {
    pattern: /^macro\s+(name|global|auto\s+(execute|processing))\s+(.+)$/i,
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 3
  },
  'ipv6 router eigrp': {
    pattern: /^ipv6\s+router\s+eigrp\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip prefix-list': {
    pattern: /^ip\s+prefix-list\s+(\S+)(?:\s+seq\s+\d+)?\s+(?:permit|deny)\s+\S+(?:\s+ge\s+\d+)?(?:\s+le\s+\d+)?$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 9
  },
  'ipv6 prefix-list': {
    pattern: /^ipv6\s+prefix-list\s+(\S+)(?:\s+seq\s+\d+)?\s+(?:permit|deny)\s+\S+(?:\s+ge\s+\d+)?(?:\s+le\s+\d+)?$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 9
  },
  'route-map': {
    pattern: /^route-map\s+(\S+)(?:\s+(?:permit|deny))?(?:\s+\d+)?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 3
  },
  'no route-map': {
    pattern: /^no\s+route-map\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip prefix-list': {
    pattern: /^no\s+ip\s+prefix-list\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ipv6 prefix-list': {
    pattern: /^no\s+ipv6\s+prefix-list\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'match': {
    pattern: /^match\s+(?:(?:ip|ipv6)\s+address\s+(?:prefix-list\s+)?\S+|interface\s+\S+)$/i,
    modes: ['config-route-map'],
    minArgs: 1,
    maxArgs: 4
  },
  'set': {
    pattern: /^set\s+(?:metric\s+\d+|(?:ip|ipv6)\s+next-hop\s+\S+|local-preference\s+\d+)$/i,
    modes: ['config-route-map'],
    minArgs: 1,
    maxArgs: 3
  },
  'ip flow-export': {
    pattern: /^ip\s+flow-export\s+(?:destination\s+\S+\s+\d+|version\s+(?:5|9))$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 3
  },
  'no ip flow-export': {
    pattern: /^no\s+ip\s+flow-export.*$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 4
  },
  'flow record': {
    pattern: /^flow\s+record\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no flow record': {
    pattern: /^no\s+flow\s+record\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'flow exporter': {
    pattern: /^flow\s+exporter\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no flow exporter': {
    pattern: /^no\s+flow\s+exporter\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'flow monitor': {
    pattern: /^flow\s+monitor\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no flow monitor': {
    pattern: /^no\s+flow\s+monitor\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'match ipv4 source address': {
    pattern: /^match\s+ipv4\s+source\s+address$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'match ipv4 destination address': {
    pattern: /^match\s+ipv4\s+destination\s+address$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'match ipv4 protocol': {
    pattern: /^match\s+ipv4\s+protocol$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'match transport source-port': {
    pattern: /^match\s+transport\s+source-port$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'match transport destination-port': {
    pattern: /^match\s+transport\s+destination-port$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'collect counter bytes': {
    pattern: /^collect\s+counter\s+bytes$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'collect counter packets': {
    pattern: /^collect\s+counter\s+packets$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'collect counter flows': {
    pattern: /^collect\s+counter\s+flows$/i,
    modes: ['config-flow-record'],
    minArgs: 0,
    maxArgs: 0
  },
  'destination': {
    pattern: /^destination\s+\S+$/i,
    modes: ['config-flow-exporter'],
    minArgs: 1,
    maxArgs: 1
  },
  'transport udp': {
    pattern: /^transport\s+udp\s+\d+$/i,
    modes: ['config-flow-exporter'],
    minArgs: 1,
    maxArgs: 1
  },
  'version 9': {
    pattern: /^version\s+(?:5|9)$/i,
    modes: ['config-flow-exporter'],
    minArgs: 1,
    maxArgs: 1
  },
  'template data timeout': {
    pattern: /^template\s+data\s+timeout\s+\d+$/i,
    modes: ['config-flow-exporter'],
    minArgs: 1,
    maxArgs: 1
  },
  'source': {
    pattern: /^source\s+\S+$/i,
    modes: ['config-flow-exporter'],
    minArgs: 1,
    maxArgs: 1
  },
  'exporter': {
    pattern: /^exporter\s+\S+$/i,
    modes: ['config-flow-monitor'],
    minArgs: 1,
    maxArgs: 1
  },
  'record': {
    pattern: /^record\s+\S+$/i,
    modes: ['config-flow-monitor'],
    minArgs: 1,
    maxArgs: 1
  },
  'cache timeout active': {
    pattern: /^cache\s+timeout\s+active\s+\d+$/i,
    modes: ['config-flow-monitor'],
    minArgs: 1,
    maxArgs: 1
  },
  'cache timeout inactive': {
    pattern: /^cache\s+timeout\s+inactive\s+\d+$/i,
    modes: ['config-flow-monitor'],
    minArgs: 1,
    maxArgs: 1
  },
  'spanning-tree loopguard default': {
    pattern: /^spanning-tree\s+loopguard\s+default$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no spanning-tree loopguard default': {
    pattern: /^no\s+spanning-tree\s+loopguard\s+default$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
};

