// Network Command Parser
import { CommandMode, ParsedCommand, CommandValidationResult } from './types';
import { commandAliases } from './initialState';
import { IOS_ERRORS, iosModeError } from "./core/iosErrors";
import { getDeviceCapabilities } from './capabilities';

// Komut yapıları
interface CommandPattern {
  pattern: RegExp;
  modes: CommandMode[];
  minArgs: number;
  maxArgs: number;
  capability?: 'routing' | 'switching' | 'firewall';
}

// Desteklenen komutlar ve pattern'leri
export const commandPatterns: Record<string, CommandPattern> = {
  // Mode değiştirme komutları
  'enable': {
    pattern: /^enable$/i,
    modes: ['user'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip host': {
    pattern: /^ip\s+host\s+(\S+)\s+([0-9.]+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'show ipv6 dhcp pool': {
    pattern: /^show\s+ipv6\s+dhcp\s+pool(?:\s+(\S+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'no ipv6 unicast-routing': {
    pattern: /^no\s+ipv6\s+unicast-routing$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ipv6 route': {
    pattern: /^ipv6\s+route\s+([0-9a-fA-F:]+\/\d+)\s+(\S+)(?:\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 3
  },
  'no ipv6 route': {
    pattern: /^no\s+ipv6\s+route\s+([0-9a-fA-F:]+\/\d+)(?:\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 2
  },
  'disable': {
    pattern: /^disable$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'configure terminal': {
    pattern: /^conf(?:igure)?(?:\s+t(?:erminal)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'exit': {
    pattern: /^(exit|quit)$/i,
    modes: ['privileged', 'config', 'interface', 'config-if-range', 'line', 'vlan', 'dhcp-config', 'router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'end': {
    pattern: /^end$/i,
    modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'dhcp-config', 'router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'clock set': {
    pattern: /^clock\s+set\s+(\d{1,2}:\d{1,2}:\d{1,2})\s+(\d{1,2})\s+(\w+)\s+(\d{4})$/i,
    modes: ['privileged'],
    minArgs: 4,
    maxArgs: 4
  },

  // Global config komutları
  'hostname': {
    pattern: /^hostname\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'vlan': {
    pattern: /^vlan\s+(\d+)(\s+name\s+(.+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 3
  },
  'no vlan': {
    pattern: /^no\s+vlan\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'enable password': {
    pattern: /^enable\s+password\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'enable secret': {
    pattern: /^enable\s+secret\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no enable secret': {
    pattern: /^no\s+enable\s+secret$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no enable password': {
    pattern: /^no\s+enable\s+password$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'service password-encryption': {
    pattern: /^service\s+password-encryption$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no service password-encryption': {
    pattern: /^no\s+service\s+password-encryption$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'username': {
    pattern: /^username\s+(\S+)(\s+(privilege\s+\d+|password|secret)\s+(.+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 4
  },
  'no username': {
    pattern: /^no\s+username\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'banner motd': {
    pattern: /^banner\s+motd\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no banner motd': {
    pattern: /^no\s+banner\s+motd$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'banner login': {
    pattern: /^banner\s+login\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no banner login': {
    pattern: /^no\s+banner\s+login$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'banner exec': {
    pattern: /^banner\s+exec\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no banner exec': {
    pattern: /^no\s+banner\s+exec$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip domain-name': {
    pattern: /^ip\s+domain-name\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip domain lookup': {
    pattern: /^ip\s+domain\s+lookup$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip domain-lookup': {
    pattern: /^ip\s+domain-lookup$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip domain-lookup': {
    pattern: /^no\s+ip\s+domain-lookup$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ipv6 unicast-routing': {
    pattern: /^ipv6\s+unicast-routing$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip name-server': {
    pattern: /^ip\s+name-server\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip default-gateway': {
    pattern: /^ip\s+default-gateway\s+([0-9.]+|[\w.-]+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip default-gateway': {
    pattern: /^no\s+ip\s+default-gateway$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip routing': {
    pattern: /^ip\s+routing$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip routing': {
    pattern: /^no\s+ip\s+routing$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip route': {
    pattern: /^ip\s+route\s+([0-9.]+)\s+([0-9.]+)\s+(\S+)(?:\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 4
  },
  'no ip route': {
    pattern: /^no\s+ip\s+route\s+([0-9.]+)\s+([0-9.]+)(?:\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 3
  },
  'ip ssh version': {
    pattern: /^ip\s+ssh\s+version\s+(1|2)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip ssh authentication-retries': {
    pattern: /^ip\s+ssh\s+authentication-retries\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip ssh time-out': {
    pattern: /^ip\s+ssh\s+time-out\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip ssh time-out': {
    pattern: /^no\s+ip\s+ssh\s+time-out$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip http server': {
    pattern: /^ip\s+http\s+server$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip http server': {
    pattern: /^no\s+ip\s+http\s+server$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'crypto key generate rsa': {
    pattern: /^crypto\s+key\s+generate\s+rsa(\s+modulus\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 2
  },
  'show standby': {
    pattern: /^show\s+standby(?:\s+(\S+))?(?:\s+brief)?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show hosts': {
    pattern: /^show\s+hosts$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ip protocols': {
    pattern: /^show\s+ip\s+protocols$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ip ospf': {
    pattern: /^show\s+ip\s+ospf(?:\s+(\d+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip ospf neighbor': {
    pattern: /^show\s+ip\s+ospf\s+neighbor(?:\s+(\S+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip ospf interface': {
    pattern: /^show\s+ip\s+ospf\s+interface(?:\s+(\S+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'cdp run': {
    pattern: /^cdp\s+run$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no cdp run': {
    pattern: /^no\s+cdp\s+run$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
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
    pattern: /^no\s+router\s+ospf$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
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
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 4
  },
  'dhcp-config network': {
    pattern: /^network\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)$/i,
    modes: ['dhcp-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'neighbor remote-as': {
    pattern: /^neighbor\s+([0-9.]+)\s+remote-as\s+(\d+)$/i,
    modes: ['router-config'],
    minArgs: 2,
    maxArgs: 2
  },
  'ipv6 dhcp pool': {
    pattern: /^ipv6\s+dhcp\s+pool\s+(\S+)$/i,
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
    pattern: /^default-information\s+originate$/i,
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

  // Alias for subcommands in router config
  'router-config network': {
    pattern: /^network\s+([0-9.]+)(\s+([0-9.]+))?(\s+area\s+(\d+))?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 4
  },

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
    maxArgs: 1,
    capability: 'switching'
  },
  'spanning-tree vlan': {
    pattern: /^spanning-tree\s+vlan\s+(\d+)(?:\s+(priority|root)(?:\s+(primary|secondary|\d+))?)?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 4,
    capability: 'switching'
  },
  'spanning-tree portfast': {
    pattern: /^spanning-tree\s+portfast(\s+(default|edge|bpduguard\s+(enable|disable)))?$/i,
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 2,
    capability: 'switching'
  },
  'spanning-tree bpduguard': {
    pattern: /^spanning-tree\s+bpduguard\s+(enable|disable)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'switching'
  },
  'no spanning-tree': {
    pattern: /^no\s+spanning-tree(\s+vlan\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 2,
    capability: 'switching'
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
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no mls qos': {
    pattern: /^no\s+mls\s+qos$/i,
    modes: ['config'],
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
  'ip arp inspection': {
    pattern: /^ip\s+arp\s+inspection\s+vlan\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
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
  'macro': {
    pattern: /^macro\s+(name|global|auto\s+(execute|processing))\s+(.+)$/i,
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 3
  },

  // Firewall ASA specific commands
  'nameif': {
    pattern: /^nameif\s+(\S+)$/i,
    modes: ['interface'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'firewall'
  },
  'security-level': {
    pattern: /^security-level\s+(\d+)$/i,
    modes: ['interface'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'firewall'
  },

  // Interface komutları - interface ÖNCE gelmeli (daha spesifik)
  'interface': {
    pattern: /^interface\s+(?!r(?:ange)?\s)(fa|fastethernet|gi|gig|gigabitethernet|e|ethernet|po|port-channel|vlan)?\s*(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'interface range': {
    pattern: /^interface\s+r(?:ange)?\s+(?:(?:fa|fastethernet|gi|gig|gigabitethernet|e|ethernet|po|port-channel|vlan)\s*)?(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'default interface': {
    pattern: /^default\s+interface\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no interface': {
    pattern: /^no\s+interface\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ipv6 address': {
    pattern: /^ipv6\s+address\s+([0-9a-fA-F:]+)\/(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no shutdown': {
    pattern: /^no\s+shutdown$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'shutdown': {
    pattern: /^shutdown$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'speed': {
    pattern: /^speed\s+(10|100|1000|2500|5000|10000|auto)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'duplex': {
    pattern: /^duplex\s+(half|full|auto)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'description': {
    pattern: /^description\s+(.+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no description': {
    pattern: /^no\s+description$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport mode': {
    pattern: /^switchport\s+mode\s+(access|trunk|dynamic\s+(auto|desirable)|dot1q-tunnel)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 2
  },
  'no switchport': {
    pattern: /^no\s+switchport$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no switchport mode': {
    pattern: /^no\s+switchport\s+mode$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport access vlan': {
    pattern: /^switchport\s+access\s+vlan\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no switchport access vlan': {
    pattern: /^no\s+switchport\s+access\s+vlan$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport trunk allowed vlan': {
    pattern: /^switchport\s+trunk\s+allowed\s+vlan\s+(.+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport trunk native vlan': {
    pattern: /^switchport\s+trunk\s+native\s+vlan\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport trunk encapsulation': {
    pattern: /^switchport\s+trunk\s+encapsulation\s+(dot1q|isl|negotiate)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'encapsulation dot1q': {
    pattern: /^encapsulation\s+dot1q\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
    // Capability omitted - used by both routers and switches
  },
  'switchport nonegotiate': {
    pattern: /^switchport\s+nonegotiate$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport protected': {
    pattern: /^switchport\s+protected$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport block': {
    pattern: /^switchport\s+block\s+(unicast|multicast)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport port-security': {
    pattern: /^switchport\s+port-security$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no switchport port-security': {
    pattern: /^no\s+switchport\s+port-security$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport port-security maximum': {
    pattern: /^switchport\s+port-security\s+maximum\s+(\d+)(\s+vlan\s+(.+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'switchport port-security violation': {
    pattern: /^switchport\s+port-security\s+violation\s+(protect|restrict|shutdown)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport port-security mac-address': {
    pattern: /^switchport\s+port-security\s+mac-address\s+(.+?)(\s+vlan\s+(\d+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'switchport port-security mac-address sticky': {
    pattern: /^switchport\s+port-security\s+mac-address\s+sticky$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'switchport port-security aging time': {
    pattern: /^switchport\s+port-security\s+aging\s+time\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport port-security aging type': {
    pattern: /^switchport\s+port-security\s+aging\s+type\s+(absolute|inactivity)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport voice vlan': {
    pattern: /^switchport\s+voice\s+vlan\s+(\d+|dot1p|none|untagged)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'switchport voice': {
    pattern: /^switchport\s+voice\s+(.+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'cdp enable': {
    pattern: /^cdp\s+enable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no cdp enable': {
    pattern: /^no\s+cdp\s+enable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'channel-group': {
    pattern: /^channel-group\s+(\d+)(\s+mode\s+(on|active|passive|desirable|auto))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'ssid': {
    pattern: /^ssid\s+(.+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing' // Routers/APs
  },
  'encryption': {
    pattern: /^encryption\s+(open|wpa|wpa2|wpa3)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing'
  },
  'no channel-group': {
    pattern: /^no\s+channel-group\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'channel-protocol': {
    pattern: /^channel-protocol\s+(lacp|pagp)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'storm-control': {
    pattern: /^storm-control\s+(broadcast|multicast|unicast)\s+level\s+(.+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'storm-control action': {
    pattern: /^storm-control\s+action\s+(shutdown|trap)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'udld enable': {
    pattern: /^udld\s+enable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'udld port': {
    pattern: /^udld\s+port(\s+aggressive)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'no udld': {
    pattern: /^no\s+udld(\s+(enable|port))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'mls qos trust': {
    pattern: /^mls\s+qos\s+trust\s+(cos|dscp|ip-precedence)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'mls qos cos': {
    pattern: /^mls\s+qos\s+cos\s+(\d+)(\s+override)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 2
  },
  'priority-queue out': {
    pattern: /^priority-queue\s+out$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'queue-set': {
    pattern: /^queue-set\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'tx-queue': {
    pattern: /^tx-queue\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'power inline': {
    pattern: /^power\s+inline\s+(auto|static|never)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'power inline consumption': {
    pattern: /^power\s+inline\s+consumption\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'wlan': {
    pattern: /^wlan\s+(\S+)\s+(\d+)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3,
    capability: 'routing'
  },
  'security wpa psk set-key': {
    pattern: /^security\s+wpa\s+psk\s+set-key\s+ascii\s+0\s+(.+)$/i,
    modes: ['config'],
    minArgs: 5,
    maxArgs: 5,
    capability: 'routing'
  },
  'channel': {
    pattern: /^channel\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing'
  },
  'station-role': {
    pattern: /^station-role\s+root$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2,
    capability: 'routing'
  },
  'ip address': {
    pattern: /^ip\s+address\s+(?:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|\/(\d|[12]\d|3[0-2]))(\s+secondary)?|dhcp)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'no ip address': {
    pattern: /^no\s+ip\s+address$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip helper-address': {
    pattern: /^ip\s+helper-address\s+([0-9.]+|[\w.-]+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip directed-broadcast': {
    pattern: /^ip\s+directed-broadcast$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip proxy-arp': {
    pattern: /^ip\s+proxy-arp$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip proxy-arp': {
    pattern: /^no\s+ip\s+proxy-arp$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip verify source': {
    pattern: /^ip\s+verify\s+source(\s+(vlan\s+dhcp-snooping|port-security))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 2
  },
  'ip dhcp snooping trust': {
    pattern: /^ip\s+dhcp\s+snooping\s+trust$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip dhcp snooping trust': {
    pattern: /^no\s+ip\s+dhcp\s+snooping\s+trust$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip arp inspection trust': {
    pattern: /^ip\s+arp\s+inspection\s+trust$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip arp inspection trust': {
    pattern: /^no\s+ip\s+arp\s+inspection\s+trust$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip arp inspection limit': {
    pattern: /^ip\s+arp\s+inspection\s+limit\s+(rate\s+\d+|none)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 2
  },
  'keepalive': {
    pattern: /^keepalive(\s+(\d+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'no keepalive': {
    pattern: /^no\s+keepalive$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'carrier-delay': {
    pattern: /^carrier-delay\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'bandwidth': {
    pattern: /^bandwidth\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'delay': {
    pattern: /^delay\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'load-interval': {
    pattern: /^load-interval\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },

  // VLAN config komutları
  'name': {
    pattern: /^name\s+(.+)$/i,
    modes: ['vlan'],
    minArgs: 1,
    maxArgs: 1
  },
  'no name': {
    pattern: /^no\s+name$/i,
    modes: ['vlan'],
    minArgs: 0,
    maxArgs: 0
  },
  'state': {
    pattern: /^state\s+(active|suspend)$/i,
    modes: ['vlan'],
    minArgs: 1,
    maxArgs: 1
  },

  // Line komutları
  'line console': {
    pattern: /^line\s+console\s+0$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'line vty': {
    pattern: /^line\s+vty\s+(\d+)(?:\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 2
  },
  'line aux': {
    pattern: /^line\s+aux\s+0$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'line': {
    pattern: /^line\s+(\S+)(\s+(\d+)(\s+(\d+))?)?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 4
  },
  'password': {
    pattern: /^password\s+(.+)$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 1
  },
  'no password': {
    pattern: /^no\s+password$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'login': {
    pattern: /^login(\s+local)?$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 1
  },
  'no login': {
    pattern: /^no\s+login$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'transport input': {
    pattern: /^transport\s+input\s+(ssh|telnet|all|none)(\s+(ssh|telnet|all|none))*$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 4
  },
  'transport output': {
    pattern: /^transport\s+output\s+(ssh|telnet|all|none)(\s+(ssh|telnet|all|none))*$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 4
  },
  'no transport input': {
    pattern: /^no\s+transport\s+input$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'transport preferred': {
    pattern: /^transport\s+preferred\s+(ssh|telnet|none)$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 1
  },
  'exec-timeout': {
    pattern: /^exec-timeout\s+(\d+)(?:\s+(\d+))?$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 2
  },
  'no exec-timeout': {
    pattern: /^no\s+exec-timeout$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'logging synchronous': {
    pattern: /^logging\s+synchronous$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'no logging synchronous': {
    pattern: /^no\s+logging\s+synchronous$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'history size': {
    pattern: /^history\s+size\s+(\d+)$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 1
  },
  'history': {
    pattern: /^history(\s+(enable|disable))?$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 1
  },
  'no history': {
    pattern: /^no\s+history$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'privilege level': {
    pattern: /^privilege\s+level\s+(\d+)$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 1
  },
  'access-class': {
    pattern: /^access-class\s+(\d+)\s+(in|out)$/i,
    modes: ['line'],
    minArgs: 2,
    maxArgs: 2
  },
  'session-limit': {
    pattern: /^session-limit\s+(\d+)$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 1
  },
  'no exec': {
    pattern: /^no\s+exec$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'exec': {
    pattern: /^exec$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'autocommand': {
    pattern: /^autocommand\s+(.+)$/i,
    modes: ['line'],
    minArgs: 1,
    maxArgs: 1
  },
  'no autocommand': {
    pattern: /^no\s+autocommand$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },
  'lockable': {
    pattern: /^lockable$/i,
    modes: ['line'],
    minArgs: 0,
    maxArgs: 0
  },

  // Show komutları
  'show': {
    pattern: /^show\s*$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show running-config': {
    pattern: /^show(\s+running-config|\s+run|\s+running)(?:\s+interface\s+(\S+))?(\s+\|\s+(include|section|begin|exclude)\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 5
  },
  'show startup-config': {
    pattern: /^show\s+startup-config$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show interfaces status': {
    pattern: /^show\s+interfaces?\s+status$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show interface trunk': {
    pattern: /^show\s+interface\s+trunk$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show interfaces trunk': {
    pattern: /^show\s+interfaces?\s+trunk$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show interfaces': {
    pattern: /^show(\s+interfaces?|\s+int)(\s+(status|description|counter|\S+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show interface': {
    pattern: /^show\s+interface\s+(.+)$/i,
    modes: ['user', 'privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'show vlan brief': {
    pattern: /^show(\s+vlan|\s+vl)\s*(brief|br)?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show vlan': {
    pattern: /^show\s+vlan(\s+(id|name)\s+(.+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 3
  },
  'show version': {
    pattern: /^show(\s+version|\s+ver)$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show mac address-table': {
    pattern: /^show\s+mac(?:\s*(?:address\-table|address|addr))?(\s+(.+)?)?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show cdp neighbors': {
    pattern: /^show\s+cdp\s+(neighbors?|nei|ne)(\s+(detail|det))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show cdp': {
    pattern: /^show\s+cdp(\s+(interface|interfaces|entry)\s*(.+)?)?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show ip interface brief': {
    pattern: /^show\s+ip\s+(?:int(?:erfaces?)?)\s+(brief|br)$/i,
    modes: ['user', 'privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'show ip interface': {
    pattern: /^show\s+ip\s+interface(?:\s+(\S+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip route': {
    pattern: /^show\s+ip\s+route(?:\s+(ospf|rip|static|connected))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ipv6 interface brief': {
    pattern: /^show\s+ipv6\s+interface\s+brief$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show spanning-tree': {
    pattern: /^show\s+spanning-tree(\s+(vlan|interface|detail|summary)\s*(.+)?)?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show port-security': {
    pattern: /^show\s+port-security(\s+(interface)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show ssh': {
    pattern: /^show\s+ssh(\s+(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip ssh': {
    pattern: /^show\s+ip\s+ssh$/i,
    modes: ['privileged'],
    minArgs: 2,
    maxArgs: 2
  },
  'show etherchannel': {
    pattern: /^show\s+etherchannel(\s+(summary|detail|port|load-balance)\s*(.+)?)?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show vtp status': {
    pattern: /^show\s+vtp\s+(status|password|counters)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'show errdisable recovery': {
    pattern: /^show\s+errdisable\s+recovery$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show errdisable detect': {
    pattern: /^show\s+errdisable\s+detect$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show mac address-table static': {
    pattern: /^show\s+mac\s+address-table\s+static$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show authentication': {
    pattern: /^show\s+authentication(\s+(sessions|status)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show clock': {
    pattern: /^show\s+clock(\s+detail)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show flash': {
    pattern: /^show\s+flash(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show boot': {
    pattern: /^show\s+boot$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show environment': {
    pattern: /^show\s+environment(\s+(all|power|temperature|fan))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show inventory': {
    pattern: /^show\s+inventory(\s+(raw))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show users': {
    pattern: /^show\s+users(\s+(wide))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show sessions': {
    pattern: /^show\s+sessions?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show processes': {
    pattern: /^show\s+processes(\s+(cpu|memory))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show memory': {
    pattern: /^show\s+memory(\s+(statistics|summary))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show wireless': {
    pattern: /^show\s+wireless$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show wlan summary': {
    pattern: /^show\s+wlan\s+summary$/i,
    modes: ['privileged'],
    minArgs: 2,
    maxArgs: 2
  },
  'show ap summary': {
    pattern: /^show\s+ap\s+summary$/i,
    modes: ['privileged'],
    minArgs: 2,
    maxArgs: 2
  },
  'show debugging': {
    pattern: /^show\s+debugging$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ntp associations': {
    pattern: /^show\s+ntp\s+associations(\s+(detail))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ntp status': {
    pattern: /^show\s+ntp\s+status$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ntp': {
    pattern: /^show\s+ntp(\s+(associations|status|source))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show snmp': {
    pattern: /^show\s+snmp(\s+(community|contact|location|host|user|group))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show arp': {
    pattern: /^show\s+arp(\s+(.+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip arp': {
    pattern: /^show\s+ip\s+arp(\s+(.+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip dhcp snooping': {
    pattern: /^show\s+ip\s+dhcp\s+snooping(\s+(binding|database|statistics))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip source binding': {
    pattern: /^show\s+ip\s+source\s+binding(\s+(vlan\s+\d+|interface\s+\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show ip verify source': {
    pattern: /^show\s+ip\s+verify\s+source$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip dhcp pool': {
    pattern: /^show\s+ip\s+dhcp\s+pool(\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip dhcp binding': {
    pattern: /^show\s+ip\s+dhcp\s+binding(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip arp inspection': {
    pattern: /^show\s+ip\s+arp\s+inspection(\s+(vlan|interface|statistics)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show monitor': {
    pattern: /^show\s+monitor(\s+(session)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show policy-map': {
    pattern: /^show\s+policy-map(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show class-map': {
    pattern: /^show\s+class-map(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show access-lists': {
    pattern: /^show\s+access-lists?(\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show mac access-lists': {
    pattern: /^show\s+mac\s+access-lists?(\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show system mtu': {
    pattern: /^show\s+system\s+mtu$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show sdm prefer': {
    pattern: /^show\s+sdm\s+prefer$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show controllers': {
    pattern: /^show\s+controllers(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show diagnostic': {
    pattern: /^show\s+diagnostic(\s+(result|content|status|schedule)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show udld': {
    pattern: /^show\s+udld(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show lldp': {
    pattern: /^show\s+lldp(\s+(neighbors|entry|interface|traffic)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show mls qos': {
    pattern: /^show\s+mls\s+qos(\s+(interface|maps|queueing)\s*(.+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'show storm-control': {
    pattern: /^show\s+storm-control(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show banner motd': {
    pattern: /^show\s+banner\s+motd$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show alias': {
    pattern: /^show\s+alias$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show history': {
    pattern: /^show\s+history$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show redundancy': {
    pattern: /^show\s+redundancy(\s+(states|clients|history))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show archive': {
    pattern: /^show\s+archive(\s+(config\s+differences|status))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },

  // Kaydetme komutları
  'write memory': {
    pattern: /^(?:wr[ite]*(\s+me[mory]*)?)$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'copy running-config startup-config': {
    pattern: /^cop[y]*\s+run[ning\-config]*\s+sta[rtup\-config]*$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'copy running-config flash': {
    pattern: /^cop[y]*\s+run[ning\-config]*\s+flash:(\S+)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'copy running-config tftp': {
    pattern: /^copy\s+running-config\s+tftp$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'copy tftp running-config': {
    pattern: /^copy\s+tftp\s+running-config$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'copy startup-config running-config': {
    pattern: /^copy\s+startup-config\s+running-config$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'copy flash startup-config': {
    pattern: /^copy\s+flash:(\S+)?\s+startup-config$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'erase startup-config': {
    pattern: /^erase\s+startup-config$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'erase nvram': {
    pattern: /^erase\s+nvram$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'delete nvram': {
    pattern: /^delete\s+(nvram|flash:config\.text)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'delete flash:vlan.dat': {
    pattern: /^delete\s+flash:vlan\.dat$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // Yardım
  'help': {
    pattern: /^(\?|help)$/i,
    modes: ['user', 'privileged', 'config', 'interface', 'config-if-range', 'line', 'vlan'],
    minArgs: 0,
    maxArgs: 0
  },

  // Do komutları (config moddan show çalıştırma)
  'do show': {
    pattern: /^do\s+(sh(?:ow)?\s+.+)$/i,
    modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config', 'dhcp-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'do': {
    pattern: /^do\s+(.*)$/i,
    modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config', 'dhcp-config'],
    minArgs: 0,
    maxArgs: 10
  },

  // Ping
  'ping': {
    pattern: /^ping\s+([0-9a-fA-F:.]+|[\w.-]+)(\s+(repeat\s+\d+|size\s+\d+|timeout\s+\d+))*$/i,
    modes: ['user', 'privileged'],
    minArgs: 1,
    maxArgs: 6
  },

  // Traceroute
  'traceroute': {
    pattern: /^traceroute\s+([0-9a-fA-F:.]+|[\w.-]+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // Tracert (traceroute equivalent)

  // Telnet
  'telnet': {
    pattern: /^telnet\s+([0-9a-fA-F:.]+|[\w.-]+)(\s+(\d+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 1,
    maxArgs: 2
  },

  // SSH
  'ssh': {
    pattern: /^ssh\s+(-l\s+\S+\s+)?([0-9a-fA-F:.]+|[\w.-]+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 3
  },

  // Terminal
  'terminal length': {
    pattern: /^terminal\s+length\s+(\d+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'terminal width': {
    pattern: /^terminal\s+width\s+(\d+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'terminal monitor': {
    pattern: /^terminal\s+monitor$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'terminal no monitor': {
    pattern: /^terminal\s+no\s+monitor$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'terminal': {
    pattern: /^terminal\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // Reload
  'reload': {
    pattern: /^reload(\s+(in\s+\d+|at\s+\S+|cancel))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },

  // Clear commands
  'clear arp-cache': {
    pattern: /^clear\s+arp-cache$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'clear mac address-table': {
    pattern: /^clear\s+mac\s+address-table(\s+(dynamic|static)(\s+vlan\s+\d+)?)?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 3
  },
  'clear counters': {
    pattern: /^clear\s+counters(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'clear line': {
    pattern: /^clear\s+line\s+(\d+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'clear interface': {
    pattern: /^clear\s+interface\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // Debug commands
  'debug': {
    pattern: /^debug\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },
  'no debug': {
    pattern: /^no\s+debug(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },
  'undebug all': {
    pattern: /^undebug\s+all$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'no debug all': {
    pattern: /^no\s+debug\s+all$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'undebug': {
    pattern: /^undebug(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 2
  },

  // Setup
  'setup': {
    pattern: /^setup$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },

  // Test
  'test': {
    pattern: /^test\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // Configure replace
  'configure replace': {
    pattern: /^configure\s+replace\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // More
  'more': {
    pattern: /^more\s+(.+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1
  },

  // Disconnect
  'disconnect': {
    pattern: /^disconnect(\s+(\d+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },

  // Resume
  'resume': {
    pattern: /^resume(\s+(\d+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },

  // Suspend
  'suspend': {
    pattern: /^suspend$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },

  // Access-list
  'access-list': {
    pattern: /^access-list\s+(\d+)\s+(permit|deny)\s+(.+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3
  },
  'ip access-list': {
    pattern: /^ip\s+access-list\s+(standard|extended)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no access-list': {
    pattern: /^no\s+access-list\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip access-list': {
    pattern: /^no\s+ip\s+access-list\s+(standard|extended)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'ip access-group': {
    pattern: /^ip\s+access-group\s+(\S+)\s+(in|out)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ip access-group': {
    pattern: /^no\s+ip\s+access-group\s+(\S+)\s+(in|out)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },

  // Mac access-list
  'mac access-list': {
    pattern: /^mac\s+access-list\s+extended\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },

  // Monitor session (SPAN)
  'monitor session': {
    pattern: /^monitor\s+session\s+(\d+)(\s+(source|destination)\s+(.+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 4
  },
  'no monitor session': {
    pattern: /^no\s+monitor\s+session\s+(\d+)(\s+(source|destination))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 3
  },

  // Class-map
  'class-map': {
    pattern: /^class-map\s+(match-any|match-all)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },

  // Policy-map
  'policy-map': {
    pattern: /^policy-map\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },

  // Template
  'template': {
    pattern: /^template\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },

  // Spanning-tree bpduguard disable
  'spanning-tree bpduguard disable': {
    pattern: /^spanning-tree\s+bpduguard\s+disable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },

  // Spanning-tree cost
  'spanning-tree cost': {
    pattern: /^spanning-tree\s+cost\s+\d+$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },

  // Spanning-tree priority (port priority)
  'spanning-tree priority': {
    pattern: /^spanning-tree\s+priority\s+\d+$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'standby ip': {
    pattern: /^standby\s+(\d+)\s+ip\s+([0-9.]+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'standby ipv6': {
    pattern: /^standby\s+(\d+)\s+ipv6\s+([0-9a-fA-F:]+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'standby priority': {
    pattern: /^standby\s+(\d+)\s+priority\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'standby preempt': {
    pattern: /^standby\s+(\d+)\s+preempt$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },

  // No IP helper-address
  'no ip helper-address': {
    pattern: /^no\s+ip\s+helper-address(?:\s+\d+\.\d+\.\d+\.\d+)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },

  // ── DHCP Pool (config mode) ──────────────────────────────────────────────
  'ip dhcp pool': {
    pattern: /^ip\s+dhcp\s+pool\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip dhcp pool': {
    pattern: /^no\s+ip\s+dhcp\s+pool\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip dhcp excluded-address': {
    pattern: /^ip\s+dhcp\s+excluded-address\s+\d+\.\d+\.\d+\.\d+(?:\s+\d+\.\d+\.\d+\.\d+)?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no ip dhcp excluded-address': {
    pattern: /^no\s+ip\s+dhcp\s+excluded-address\s+\d+\.\d+\.\d+\.\d+(?:\s+\d+\.\d+\.\d+\.\d+)?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 2
  },

  // ── DHCP Pool sub-commands (dhcp-config mode) ────────────────────────────
  'default-router': {
    pattern: /^default-router\s+\d+\.\d+\.\d+\.\d+(?:\s+\d+\.\d+\.\d+\.\d+)*$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 8
  },
  'dns-server': {
    pattern: /^dns-server\s+(?:[0-9.]+|[0-9a-fA-F:]+)(?:\s+(?:[0-9.]+|[0-9a-fA-F:]+))*$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 8
  },
  'lease': {
    pattern: /^lease\s+(?:infinite|\d+(?:\s+\d+(?:\s+\d+)?)?)$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 3
  },
  'domain-name': {
    pattern: /^domain-name\s+(\S+)$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 1
  },

  // Wireless commands
  'dot11 ssid': {
    pattern: /^dot11\s+ssid\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'authentication': {
    pattern: /^authentication\s+(.+)$/i,
    modes: ['ssid-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'authentication key-management': {
    pattern: /^authentication\s+key-management\s+wpa\s+version\s+(\d+)$/i,
    modes: ['ssid-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'wpa-psk': {
    pattern: /^wpa-psk\s+(?:ascii|hex)\s+(.+)$/i,
    modes: ['ssid-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'guest-mode': {
    pattern: /^guest-mode$/i,
    modes: ['ssid-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'interface dot11radio': {
    pattern: /^interface\s+dot11radio\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'encryption mode': {
    pattern: /^encryption\s+mode\s+ciphers\s+(.+)$/i,
    modes: ['dot11-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'dot11 channel': {
    pattern: /^channel\s+(\d+)$/i,
    modes: ['dot11-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'dot11 power': {
    pattern: /^power\s+(\d+|full|half|quarter|eighth)$/i,
    modes: ['dot11-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'dot11 station-role': {
    pattern: /^station-role\s+(\S+)$/i,
    modes: ['dot11-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'dot11 mac-filter': {
    pattern: /^mac-filter\s+(?:allow|deny)\s+(.+)$/i,
    modes: ['dot11-config'],
    minArgs: 1,
    maxArgs: 1
  },

  // ── End of Configuration ──────────────────────────────────────────────────
};

// Komut alias'larını çöz - Gelişmiş versiyon
export function resolveAliases(input: string): string {
  const trimmed = input.trim().toLowerCase();

  // Tam eşleşme - direkt alias
  if (commandAliases[trimmed]) {
    return commandAliases[trimmed];
  }

  // Kısmi eşleşme - daha uzun komutlar için
  // Önce en uzun alias'ları dene
  const sortedAliases = Object.entries(commandAliases)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [alias, full] of sortedAliases) {
    const aliasLower = alias.toLowerCase();
    const fullLower = full.toLowerCase();

    // Alias ile tam eşleşme
    if (trimmed === aliasLower) {
      return full;
    }

    // Alias ile başlıyor ve boşlukla devam ediyorsa (prefix match)
    if (trimmed.startsWith(aliasLower + ' ')) {
      // Eğer zaten tam komutla (veya onun prefix'iyle) başlıyorsa genişletme yapma
      // Bu, "clear mac address-table" gibi komutların "clear mac" alias'ı yüzünden
      // "clear mac address-table address-table" haline gelmesini önler.
      if (trimmed === fullLower || trimmed.startsWith(fullLower + ' ')) {
        continue;
      }

      const rest = input.trim().substring(alias.length).trim();
      return rest ? full + ' ' + rest : full;
    }
  }

  return input;
}

// Levenshtein mesafesi hesaplama (bulanık eşleşme için)
export function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// Komut parse et
export function parseCommand(input: string, currentMode: CommandMode, state?: any): ParsedCommand | null {
  const capabilities = state ? getDeviceCapabilities(state, state.switchModel) : undefined;
  const resolvedInput = expandKeywordPrefixes(resolveAliases(input), currentMode, capabilities);
  const trimmed = resolvedInput.trim();

  if (!trimmed) return null;

  // Komut ve argümanları ayır
  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);
  const intent = inferIntent(parts.map(p => p.toLowerCase()));

  return {
    command: command.toLowerCase(),
    args: args.map(a => a.toLowerCase()),
    rawInput: input,
    resolvedInput: resolvedInput,  // Store resolved input for executor
    intent
  };
}

function inferIntent(tokens: string[]): ParsedCommand['intent'] {
  const [t0 = '', t1 = '', t2 = ''] = tokens;
  if (t0 === 'show') return { family: 'show', action: [t0, t1, t2].filter(Boolean).join(' ') };
  if (t0 === 'interface' || (t0 === 'int')) return { family: 'interface', action: 'interface' };
  if (t0 === 'ip' && (t1 === 'route' || t1 === 'routing')) return { family: 'routing', action: `ip ${t1}` };
  if (t0 === 'router' || (t0 === 'ipv6' && t1 === 'router')) return { family: 'routing', action: [t0, t1, t2].filter(Boolean).join(' ') };
  if (t0 === 'spanning-tree' || (t0 === 'switchport' && t1 === 'port-security')) return { family: 'security', action: [t0, t1, t2].filter(Boolean).join(' ') };
  if (['enable', 'disable', 'exit', 'end', 'reload', 'write', 'copy', 'delete', 'clear', 'debug', 'undebug'].includes(t0)) {
    return { family: 'system', action: [t0, t1].filter(Boolean).join(' ') };
  }
  return { family: 'other', action: t0 || 'unknown' };
}

interface CommandTreeNode {
  children: Map<string, CommandTreeNode>;
  terminalPatterns: string[];
}

const commandTreeByMode: Partial<Record<CommandMode, CommandTreeNode>> = {};

function createNode(): CommandTreeNode {
  return { children: new Map<string, CommandTreeNode>(), terminalPatterns: [] };
}

function isKeywordToken(token: string): boolean {
  return /^[a-z0-9-]+$/i.test(token);
}

function ensureCommandTree(mode: CommandMode, capabilities?: any): CommandTreeNode {
  // If we have specific capabilities, we don't cache since trees might differ per device
  const root = createNode();

  for (const [patternName, pattern] of Object.entries(commandPatterns)) {
    if (!pattern.modes.includes(mode)) continue;

    // Filter by capability if provided
    if (capabilities && pattern.capability) {
      if (!capabilities[pattern.capability]) continue;
    }

    const tokens = patternName.toLowerCase().split(/\s+/).filter(isKeywordToken);
    if (tokens.length === 0) continue;
    let current = root;
    for (const token of tokens) {
      if (!current.children.has(token)) current.children.set(token, createNode());
      current = current.children.get(token)!;
    }
    current.terminalPatterns.push(patternName);
  }

  return root;
}

function tokenize(input: string): string[] {
  return input.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function expandKeywordPrefixes(input: string, currentMode: CommandMode, capabilities?: any): string {
  const rawTokens = input.trim().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return input;

  let frontier: CommandTreeNode[] = [ensureCommandTree(currentMode, capabilities)];
  const expanded = [...rawTokens];

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i].toLowerCase();
    const matches: Array<{ keyword: string; child: CommandTreeNode }> = [];
    for (const node of frontier) {
      for (const [keyword, child] of node.children.entries()) {
        if (keyword.startsWith(token)) matches.push({ keyword, child });
      }
    }
    if (matches.length === 0) break;
    const uniqueKeywords = Array.from(new Set(matches.map(m => m.keyword)));
    if (uniqueKeywords.length === 1) expanded[i] = uniqueKeywords[0];
    frontier = matches.map(m => m.child);
  }

  return expanded.join(' ');
}

function resolveByCommandTree(input: string, currentMode: CommandMode, capabilities?: any): { kind: 'ok' | 'ambiguous' | 'incomplete'; candidates?: string[]; failedTokenIndex?: number } {
  const tokens = tokenize(input);
  if (tokens.length === 0) return { kind: 'ok' };

  let frontier: CommandTreeNode[] = [ensureCommandTree(currentMode, capabilities)];
  let failedTokenIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next: CommandTreeNode[] = [];
    for (const node of frontier) {
      for (const [keyword, child] of node.children.entries()) {
        if (keyword.startsWith(token)) next.push(child);
      }
    }
    if (next.length === 0) {
      failedTokenIndex = i;
      break;
    }
    frontier = next;
  }

  if (failedTokenIndex !== -1) {
    return { kind: 'ok', failedTokenIndex };
  }

  const terminal = frontier.flatMap(n => n.terminalPatterns);
  const hasChildren = frontier.some(n => n.children.size > 0);

  if (terminal.length === 0 && hasChildren) {
    const nextKeywords = Array.from(new Set(frontier.flatMap(n => Array.from(n.children.keys())))).slice(0, 8);
    return { kind: 'incomplete', candidates: nextKeywords };
  }

  if (terminal.length > 1) {
    const unique = Array.from(new Set(terminal)).slice(0, 8);
    return { kind: 'ambiguous', candidates: unique };
  }

  return { kind: 'ok' };
}

// Komut geçerli mi kontrol et
export function validateCommand(
  parsed: ParsedCommand,
  currentMode: CommandMode,
  state?: any
): CommandValidationResult {

  const input = parsed.rawInput.toLowerCase();
  const resolvedInput = resolveAliases(parsed.rawInput);
  const capabilities = state ? getDeviceCapabilities(state, state.switchModel) : undefined;

  // Exact pattern match must win over prefix-tree ambiguity.
  for (const [name, pattern] of Object.entries(commandPatterns)) {
    const match = resolvedInput.match(pattern.pattern);
    if (!match) continue;

    // Check capability
    if (capabilities && pattern.capability && !capabilities[pattern.capability]) {
      // If capability mismatch, treat as unknown command to get proper caret positioning
      continue;
    }

    if (!pattern.modes.includes(currentMode)) {
      return {
        valid: false,
        reason: 'invalid-mode',
        error: getModeError(parsed.rawInput, currentMode)
      };
    }

    // Cihaz uyumluluk kontrolü (Akıllı Destek)
    if (state) {
      const compatibility = checkDeviceCompatibility(name, state);
      if (!compatibility.valid) {
        return {
          valid: false,
          reason: 'unknown-command', // IOS gibi 'invalid' yerine cihaz uyumsuzluğunu belirtiyoruz
          error: compatibility.error
        };
      }
    }

    return { valid: true, reason: 'ok', matchedPattern: name };
  }

  const treeResolution = resolveByCommandTree(resolvedInput, currentMode, capabilities);
  if (treeResolution.kind === 'ambiguous') {
    const options = (treeResolution.candidates || []).join(', ');
    return { valid: false, reason: 'ambiguous', error: IOS_ERRORS.ambiguous };
  }
  if (treeResolution.kind === 'incomplete') {
    const options = (treeResolution.candidates || []).join(', ');
    return { valid: false, reason: 'incomplete', error: IOS_ERRORS.incomplete };
  }

  // Eşleşme bulunamadı
  const failedTokenIndex = treeResolution.failedTokenIndex;
  return {
    valid: false,
    reason: 'unknown-command',
    error: getInvalidCommandError(parsed.rawInput, failedTokenIndex, currentMode)
  };
}

// Mode hatası mesajı
function getModeError(input: string, currentMode: CommandMode): string {
  const modeNames: Record<CommandMode, string> = {
    user: 'User EXEC',
    privileged: 'Privileged EXEC',
    config: 'Global Configuration',
    interface: 'Interface Configuration',
    'config-if-range': 'Interface Range Configuration',
    line: 'Line Configuration',
    vlan: 'VLAN Configuration',
    'router-config': 'Router Configuration',
    'dhcp-config': 'DHCP Pool Configuration',
    'ssid-config': 'SSID Configuration',
    'dot11-config': 'Dot11 Radio Configuration',
  };

  const indicatorPos = calculateCaretPosition(input, 0);
  const cleanedInput = input.replace(/\s+$/g, '');
  const indicator = ' '.repeat(indicatorPos) + '^';
  return `${cleanedInput}\n${indicator}\n${iosModeError(input, currentMode)}`;
}

// Geçersiz komut hatası
export function getInvalidCommandError(
  input: string,
  failedTokenIndexOrState?: number | any,
  currentMode?: CommandMode
): string {
  let failedTokenIndex: number | undefined = undefined;
  if (typeof failedTokenIndexOrState === 'number') {
    failedTokenIndex = failedTokenIndexOrState;
  } else if (failedTokenIndexOrState && typeof failedTokenIndexOrState === 'object') {
    if (!currentMode && 'currentMode' in failedTokenIndexOrState) {
      currentMode = failedTokenIndexOrState.currentMode;
    }
  }

  const indicatorPos = calculateCaretPosition(input, failedTokenIndex ?? 0);
  const cleanedInput = input.replace(/\s+$/g, '');
  const indicator = ' '.repeat(indicatorPos) + '^';
  let errorMsg = `${cleanedInput}\n${indicator}\n${IOS_ERRORS.invalidInput}`;

  if (currentMode) {
    const cmdTokens = cleanedInput.toLowerCase().split(/\s+/);
    const firstWord = cmdTokens[0];

    // Mevcut mod için geçerli komutların ilk kelimelerini topla
    const validFirstWords = new Set<string>();
    Object.entries(commandPatterns).forEach(([name, pattern]) => {
      if (pattern.modes.includes(currentMode!)) {
        validFirstWords.add(name.split(/\s+/)[0]);
      }
    });

    // En yakın 3 komutu bul
    const suggestions = Array.from(validFirstWords)
      .map(word => ({ word, distance: getLevenshteinDistance(firstWord, word) }))
      .filter(item => item.distance <= 2)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    if (suggestions.length > 0) {
      const suggestionStr = suggestions.map(s => s.word).join(', ');
      errorMsg += `\n\nBunu mu demek istediniz? (Did you mean?): ${suggestionStr}`;
    }
  }

  return errorMsg;
}

/**
 * Cihaz ve komut uyumluluğunu kontrol eder (Akıllı Yardımcı)
 */
export function checkDeviceCompatibility(commandName: string, state: any): { valid: boolean; error?: string } {
  const model = state.switchModel || '';
  const isModelL3 = typeof model === 'string' && model.includes('3650');
  const isLayer3 = state.isLayer3Switch || state.switchLayer === 'L3' || isModelL3;
  const deviceType = state.deviceType === 'router'
    ? 'router'
    : (state.deviceType === 'firewall'
      ? 'firewall'
      : (isLayer3 ? 'switchL3' : (state.deviceType || 'switchL2')));
  const deviceLabel = deviceType === 'switchL2'
    ? 'Layer 2 switch'
    : deviceType === 'switchL3'
      ? 'Layer 3 switch'
      : deviceType === 'router'
        ? 'router'
        : 'firewall';
  const unsupported = (cmd: string) => `${IOS_ERRORS.invalidInput}\n${cmd} is not supported on this ${deviceLabel}.`;

  // 1. Router üzerinde Switchport komutları
  if (deviceType === 'router' && (commandName.startsWith('switchport') || commandName === 'vlan' || commandName === 'no vlan')) {
    return { valid: false, error: unsupported(commandName) };
  }

  // 2. L2 Switch üzerinde L3 komutları (no switchport, ip routing, vs.)
  if (deviceType === 'switchL2' && (commandName === 'no switchport' || commandName === 'ip routing' || commandName.startsWith('router ') || commandName.startsWith('ipv6 router '))) {
    return { valid: false, error: unsupported(commandName) };
  }

  // 3. Firewall (ASA) spesifik olmayan ama interface modunda olan komutlar
  if (deviceType === 'firewall' && (commandName.startsWith('switchport') || commandName === 'vlan')) {
    return { valid: false, error: unsupported(commandName) };
  }

  return { valid: true };
}

function calculateCaretPosition(input: string, tokenIndex: number): number {
  const tokens = input.split(/(\s+)/);
  let pos = 0;
  let currentTokenCount = 0;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].trim() !== '') {
      if (currentTokenCount === tokenIndex) {
        return pos;
      }
      currentTokenCount++;
    }
    pos += tokens[i].length;
  }
  return pos;
}

// Komut için gereken argümanları al
export function getCommandArgs(input: string, pattern: RegExp): string[] | null {
  const match = input.match(pattern);
  if (!match) return null;
  return match.slice(1);
}

// Yardım içeriği
export function getHelpContent(mode: CommandMode, language: 'tr' | 'en' = 'tr'): string {
  const helpContentsTR: Record<CommandMode, string> = {
    user: `
Mevcut komutlar:
  enable      - Privileged EXEC moduna geç
  exit        - Oturumu kapat
  show        - Sistem bilgilerini göster (sınırlı)
  ?           - Bu yardım mesajını göster

Hızlı yazım:
  en          = enable
`,
    privileged: `
Mevcut komutlar:
  configure terminal  - Global configuration moduna geç
  disable            - User EXEC moduna dön
  show               - Sistem bilgilerini göster
    show running-config   - Çalışan konfigürasyonu göster
    show interfaces       - Port durumlarını göster
    show vlan brief       - VLAN özetini göster
    show version          - Sistem versiyonunu göster
    show mac address-table - MAC adres tablosunu göster
    show ip source binding - IP source binding'leri göster
    show ip verify source - IP verify source yapılandırmasını göster
    show cdp neighbors    - CDP komşularını göster
    show spanning-tree    - Spanning-tree durumunu göster
    show port-security    - Port güvenlik durumunu göster
    show ssh              - SSH durumunu göster
    show ip interface brief - IP arayüz özetini göster
    show arp              - ARP tablosunu göster
  write memory       - Konfigürasyonu kaydet
  copy run start     - Konfigürasyonu kaydet (alternatif)
  delete flash:      - Flash bellekten dosya sil
  ping <ip>          - Ping at
  traceroute <ip>    - Trace route
  telnet <ip>        - Telnet bağlantısı
  reload             - Switch'i yeniden başlat
  exit               - User EXEC moduna dön

Hızlı yazım:
  conf t      = configure terminal
  sh run      = show running-config
  sh int      = show interfaces
  sh vl br    = show vlan brief
  sh ver      = show version
  sh mac      = show mac address-table
  sh cdp ne   = show cdp neighbors
  sh ssh      = show ssh
  sh arp      = show arp
  wr          = write memory
  cop run sta = copy running-config startup-config
`,
    config: `
Mevcut komutlar:
  hostname <isim>           - Switch adını değiştir
  interface <port>          - Interface konfigürasyonuna geç
    Ethernet                - Ethernet IEEE 802.3
    FastEthernet            - FastEthernet IEEE 802.3
    GigabitEthernet        - GigabitEthernet IEEE 802.3z
    Port-channel            - Ethernet Channel of interfaces
    Vlan                    - Catalyst Vlans
  interface range <ports>   - Birden fazla interface seç
  vlan <id>                 - VLAN konfigürasyonuna geç
  no vlan <id>              - VLAN sil
  enable secret <şifre>     - Enable şifresi (şifreli)
  enable password <şifre>   - Enable şifresi (düz metin)
  service password-encryption - Şifreleri şifrele
  username <isim> password <şifre> - Kullanıcı oluştur
  line console 0            - Console hattı konfigürasyonu
  line vty <start> <end>    - VTY hattı konfigürasyonu
  banner motd #<mesaj>#     - MOTD banner ayarla
  ip default-gateway <ip>   - Varsayılan ağ geçidi
  ip domain-name <name>     - Domain adı
  ip dhcp snooping          - DHCP snooping etkinleştir
  ip dhcp snooping vlan <vlan> - DHCP snooping VLAN ayarla
  ip arp inspection vlan <vlan> - ARP inspection VLAN ayarla
  spanning-tree mode <mode> - STP modu ayarla
  vtp mode <mode>           - VTP modu ayarla
  vtp domain <name>         - VTP domain ayarla
  cdp run                   - CDP'yi etkinleştir
  no cdp run                - CDP'yi devre dışı bırak
  router rip                - RIP yönlendirme etkinleştir
  router ospf <id>          - OSPF yönlendirme etkinleştir
  no router rip             - RIP yönlendirme devre dışı
  no router ospf            - OSPF yönlendirme devre dışı
  exit                      - Privileged mode'a dön
  end                       - Privileged mode'a dön
  do <command>              - Privileged komutlarını çalıştır

Hızlı yazım:
  int fa0/1   = interface FastEthernet0/1
  int gi0/1   = interface GigabitEthernet0/1
  int r fa0/1-24 = interface range FastEthernet0/1-24
  en sec      = enable secret
  ser pass    = service password-encryption
  ban mot     = banner motd
  ip def      = ip default-gateway
`,
    interface: `
Mevcut komutlar:
  shutdown                  - Portu kapat
  no shutdown               - Portu aç
  speed <10|100|1000|10000|auto>  - Port hızı
  duplex <half|full|auto>   - Duplex ayarı
  description <metin>       - Port açıklaması
  switchport mode <access|trunk|dynamic auto|dynamic desirable> - Port modu
  switchport access vlan <id>    - VLAN ata
  switchport trunk allowed vlan <list> - Trunk VLAN'ları
  switchport trunk native vlan <id> - Native VLAN
  switchport port-security        - Port güvenliği etkinleştir
  switchport port-security maximum <n> - Max MAC adresi
  switchport port-security violation <mode> - İhlal modu
  switchport port-security mac-address <mac> - Statik MAC
  switchport port-security aging time <min> - Aging süresi (dakika)
  switchport port-security aging type <type> - Aging tipi (absolute/inactivity)
  switchport voice vlan <id>       - Voice VLAN
  ip dhcp snooping trust   - DHCP snooping trust port
  ip arp inspection trust  - ARP inspection trust port
  ip verify source         - IP source guard etkinleştir
  ip verify source port-security - IP source guard + port security
  cdp enable               - CDP'yi etkinleştir (port)
  no cdp enable            - CDP'yi devre dışı bırak (port)
  channel-group <id> mode <mode>   - EtherChannel
  spanning-tree portfast   - PortFast etkinleştir
  spanning-tree bpduguard enable - BPDU Guard etkinleştir
  storm-control broadcast level <rate> - Storm control
  power inline <auto|static|never> - PoE kontrolü
  wlan <name> <id> <ssid>  - WLAN oluştur (WLC only)
  security wpa psk set-key ascii 0 <pass> - WPA şifresi ayarla (WLC only)
  channel <num>             - RF kanalı ayarla (WLC only)
  station-role root        - AP modu ayarla (AP only)
  exit                      - Config mode'a dön
  end                       - Privileged mode'a dön

Hızlı yazım:
  no sh      = no shutdown
  sh         = shutdown
  sw mode    = switchport mode
  sw acc vlan = switchport access vlan
  sw m a     = switchport mode access
  sw m t     = switchport mode trunk
  sw p       = switchport port-security
  sw voice   = switchport voice
  desc       = description
  chan       = channel-group
  span port  = spanning-tree portfast
`,
    'config-if-range': `
Mevcut komutlar (Çoklu Portlar):
  shutdown                  - Seçili portları kapat
  no shutdown               - Seçili portları aç
  speed <10|100|1000|10000|auto>  - Port hızı
  duplex <half|full|auto>   - Duplex ayarı
  description <metin>       - Port açıklaması
  switchport mode <access|trunk|dynamic auto|dynamic desirable> - Port modu
  switchport access vlan <id>    - VLAN ata
  switchport trunk allowed vlan <list> - Trunk VLAN'ları
  switchport trunk native vlan <id> - Native VLAN
  switchport port-security        - Port güvenliği etkinleştir
  switchport port-security maximum <n> - Max MAC adresi
  switchport port-security violation <mode> - İhlal modu
  switchport port-security aging time <min> - Aging süresi (dakika)
  switchport port-security aging type <type> - Aging tipi (absolute/inactivity)
  ip dhcp snooping trust   - DHCP snooping trust port
  ip arp inspection trust  - ARP inspection trust port
  ip verify source         - IP source guard etkinleştir
  ip verify source port-security - IP source guard + port security
  spanning-tree portfast   - PortFast etkinleştir
  spanning-tree bpduguard enable - BPDU Guard etkinleştir
  exit                      - Config mode'a dön
  end                       - Privileged mode'a dön

Hızlı yazım:
  no sh      = no shutdown
  sh         = shutdown
  sw mode    = switchport mode
  sw acc vlan = switchport access vlan
  sw m a     = switchport mode access
  sw m t     = switchport mode trunk
  desc       = description
`,
    line: `
Mevcut komutlar:
  password <şifre>          - Hat şifresi
  login                     - Login aktifleştir
  login local               - Local authentication
  no login                  - Login devre dışı
  transport input <ssh|telnet|all|none> - Erişim protokolü
  transport output <ssh|telnet|all|none> - Çıkış protokolü
  exec-timeout <min> <sec>  - Oturum zaman aşımı
  logging synchronous       - Log senkronizasyonu
  history size <n>          - Komut geçmişi boyutu
  privilege level <0-15>    - Privilege seviyesi
  access-class <acl> <in|out> - Erişim kontrolü
  exit                      - Config mode'a dön
  end                       - Privileged mode'a dön

Hızlı yazım:
  pass       = password
  trans in   = transport input
  exec-t     = exec-timeout
  log sync   = logging synchronous
`,
    vlan: `
Mevcut komutlar:
  name <isim>               - VLAN adı
  no name                   - VLAN adını sil
  state <active|suspend>    - VLAN durumu
  exit                      - Config mode'a dön
  end                       - Privileged mode'a dön

Hızlı yazım:
  n         = name
`,
    'router-config': `
Mevcut komutlar:
  network <ip> <wildcard> area <area> - OSPF/ağ bildirimi
  neighbor <ip>               - BGP komşu
  version <1|2>               - RIP versiyonu
  no auto-summary             - Otomatik özetlemeyi kapat
  redistribute <protocol>     - Rota yeniden dağıt
  exit                        - Config mode'a dön
  end                         - Privileged mode'a dön
`,
    'dhcp-config': `
Mevcut komutlar:
  network <ağ-adresi> <alt-ağ-maskesi> - DHCP havuz ağı
  default-router <ip>         - Varsayılan ağ geçidi
  dns-server <ip>             - DNS sunucusu
  lease <gün> [saat] [dakika] - Kira süresi (veya infinite)
  domain-name <alan-adı>      - Alan adı
  exit                        - Config mode'a dön
  end                         - Privileged mode'a dön
`,
    'ssid-config': `
Mevcut komutlar:
  authentication <open|shared|network-eap> - Kimlik doğrulama türü
  authentication key-management wpa version <2|3> - WPA versiyonu
  wpa-psk ascii <şifre>       - WPA önceden paylaşılan anahtar
  guest-mode                  - Konuk modunu etkinleştir
  exit                        - Config mode'a dön
  end                         - Privileged mode'a dön
`,
    'dot11-config': `
Mevcut komutlar:
  encryption mode ciphers <aes-ccm|tkip|aes-tkip> - Şifreleme algoritması
  ssid <ssid-adı>             - SSID bağlama
  channel <kanal>             - Radyo kanalı
  power <full|half|quarter|eighth|dBm> - İletim gücü
  station-role <root|repeater|client> - İstasyon rolü
  mac-filter <allow|deny> <MAC> - MAC adres filtresi
  exit                        - Config mode'a dön
  end                         - Privileged mode'a dön
`
  };

  const helpContentsEN: Record<CommandMode, string> = {
    user: `
Available commands:
  enable      - Enter privileged EXEC mode
  exit        - Close session
  show        - Display system information (limited)
  ?           - Show this help message

Shortcuts:
  en          = enable
`,
    privileged: `
Available commands:
  configure terminal  - Enter global configuration mode
  disable            - Return to user EXEC mode
  show               - Display system information
    show running-config   - Show running configuration
    show interfaces       - Show port status
    show vlan brief       - Show VLAN summary
    show version          - Show system version
    show mac address-table - Show MAC address table
    show ip source binding - Show IP source bindings
    show ip verify source - Show IP verify source configuration
    show cdp neighbors    - Show CDP neighbors
    show spanning-tree    - Show spanning-tree status
    show port-security    - Show port security status
    show ssh              - Show SSH status
    show ip interface brief - Show IP interface summary
    show arp              - Show ARP table
  write memory       - Save configuration
  copy run start     - Save configuration (alternative)
  delete flash:      - Delete files from flash memory
  ping <ip>          - Ping
  traceroute <ip>    - Trace route
  telnet <ip>        - Telnet connection
  reload             - Reload switch
  exit               - Return to user EXEC mode

Shortcuts:
  conf t      = configure terminal
  sh run      = show running-config
  sh int      = show interfaces
  sh vl br    = show vlan brief
  sh ver      = show version
  sh mac      = show mac address-table
  sh cdp ne   = show cdp neighbors
  sh ssh      = show ssh
  sh arp      = show arp
  wr          = write memory
  cop run sta = copy running-config startup-config
`,
    config: `
    Available commands:
    hostname <name>           - Change switch name
    interface <port>          - Enter interface configuration
    Ethernet                - Ethernet IEEE 802.3
    FastEthernet            - FastEthernet IEEE 802.3
    GigabitEthernet        - GigabitEthernet IEEE 802.3z
    Port-channel            - Ethernet Channel of interfaces
    Vlan                    - Catalyst Vlans
    interface range <ports>   - Select multiple interfaces
    vlan <id>                 - Enter VLAN configuration
    no vlan <id>              - Delete VLAN
    enable secret <password>  - Enable password (encrypted)
    enable password <password> - Enable password (plain text)
    service password-encryption - Encrypt passwords
    username <name> password <password> - Create user
    line console 0            - Console line configuration
    line vty <start> <end>    - VTY line configuration
    banner motd #<message>#   - Set MOTD banner
    ip default-gateway <ip>   - Default gateway
    ip domain-name <name>     - Domain name
    ip dhcp snooping          - Enable DHCP snooping
    ip dhcp snooping vlan <vlan> - DHCP snooping on VLAN
    ip arp inspection vlan <vlan> - ARP inspection on VLAN
    spanning-tree mode <mode> - Set STP mode
    vtp mode <mode>           - Set VTP mode
    vtp domain <name>         - Set VTP domain
    cdp run                   - Enable CDP
    no cdp run                - Disable CDP   
    exit                      - Return to privileged mode
    end                       - Return to privileged mode
    do <command>              - Run privileged commands

    Shortcuts:
    int fa0/1   = interface FastEthernet0/1
    int gi0/1   = interface GigabitEthernet0/1
    int r fa0/1-24 = interface range FastEthernet0/1-24
    en sec      = enable secret
    ser pass    = service password-encryption
    ban mot     = banner motd
    ip def      = ip default-gateway
    `,
    interface: `
Available commands:
  shutdown                  - Disable port
  no shutdown               - Enable port
  speed <10|100|1000|10000|auto>  - Port speed
  duplex <half|full|auto>   - Duplex setting
  description <text>        - Port description
  switchport mode <access|trunk|dynamic auto|dynamic desirable> - Port mode
  switchport access vlan <id>    - Assign VLAN
  switchport trunk allowed vlan <list> - Trunk VLANs
  switchport trunk native vlan <id> - Native VLAN
  switchport port-security        - Enable port security
  switchport port-security maximum <n> - Max MAC addresses
  switchport port-security violation <mode> - Violation mode
  switchport port-security mac-address <mac> - Static MAC
  switchport port-security aging time <min> - Aging time (minutes)
  switchport port-security aging type <type> - Aging type (absolute/inactivity)
  switchport voice vlan <id>       - Voice VLAN
  ip dhcp snooping trust   - DHCP snooping trust port
  ip arp inspection trust  - ARP inspection trust port
  ip verify source         - Enable IP source guard
  ip verify source port-security - IP source guard + port security
  cdp enable               - Enable CDP (port)
  no cdp enable            - Disable CDP (port)
  channel-group <id> mode <mode>   - EtherChannel
  spanning-tree portfast   - Enable PortFast
  spanning-tree bpduguard enable - Enable BPDU Guard
  storm-control broadcast level <rate> - Storm control
  power inline <auto|static|never> - PoE control
  wlan <name> <id> <ssid>  - Create WLAN (WLC only)
  security wpa psk set-key ascii 0 <pass> - Set WPA password (WLC only)
  channel <num>             - Set RF channel (WLC only)
  station-role root        - Set AP mode (AP only)
  exit                      - Return to config mode
  end                       - Return to privileged mode

Shortcuts:
  no sh      = no shutdown
  sh         = shutdown
  sw mode    = switchport mode
  sw acc vlan = switchport access vlan
  sw m a     = switchport mode access
  sw m t     = switchport mode trunk
  sw p       = switchport port-security
  sw voice   = switchport voice
  desc       = description
  chan       = channel-group
  span port  = spanning-tree portfast
`,
    'config-if-range': `
Available commands (Multiple Ports):
  shutdown                  - Disable selected ports
  no shutdown               - Enable selected ports
  speed <10|100|1000|10000|auto>  - Port speed
  duplex <half|full|auto>   - Duplex setting
  description <text>        - Port description
  switchport mode <access|trunk|dynamic auto|dynamic desirable> - Port mode
  switchport access vlan <id>    - Assign VLAN
  switchport trunk allowed vlan <list> - Trunk VLANs
  switchport trunk native vlan <id> - Native VLAN
  switchport port-security        - Enable port security
  switchport port-security maximum <n> - Max MAC addresses
  switchport port-security violation <mode> - Violation mode
  switchport port-security aging time <min> - Aging time (minutes)
  switchport port-security aging type <type> - Aging type (absolute/inactivity)
  ip dhcp snooping trust   - DHCP snooping trust port
  ip arp inspection trust  - ARP inspection trust port
  ip verify source         - Enable IP source guard
  ip verify source port-security - IP source guard + port security
  spanning-tree portfast   - Enable PortFast
  spanning-tree bpduguard enable - Enable BPDU Guard
  exit                      - Return to config mode
  end                       - Return to privileged mode

Shortcuts:
  no sh      = no shutdown
  sh         = shutdown
  sw mode    = switchport mode
  sw acc vlan = switchport access vlan
  sw m a     = switchport mode access
  sw m t     = switchport mode trunk
  desc       = description
`,
    line: `
Available commands:
  password <password>       - Line password
  login                     - Enable login
  login local               - Local authentication
  no login                  - Disable login
  transport input <ssh|telnet|all|none> - Access protocol
  transport output <ssh|telnet|all|none> - Output protocol
  exec-timeout <min> <sec>  - Session timeout
  logging synchronous       - Log synchronization
  history size <n>          - Command history size
  privilege level <0-15>    - Privilege level
  access-class <acl> <in|out> - Access control
  exit                      - Return to config mode
  end                       - Return to privileged mode

Shortcuts:
  pass       = password
  trans in   = transport input
  exec-t     = exec-timeout
  log sync   = logging synchronous
`,
    vlan: `
Available commands:
  name <name>               - VLAN name
  no name                   - Remove VLAN name
  state <active|suspend>    - VLAN state
  exit                      - Return to config mode
  end                       - Return to privileged mode

Shortcuts:
  n         = name
`,
    'router-config': `
Available commands:
  network <ip> <wildcard> area <area> - OSPF/network announcement
  neighbor <ip>               - BGP neighbor
  version <1|2>               - RIP version
  no auto-summary             - Disable auto-summary
  redistribute <protocol>     - Redistribute routes
  exit                        - Return to config mode
  end                         - Return to privileged mode
`,
    'dhcp-config': `
Available commands:
  network <network-address> <subnet-mask> - DHCP pool network
  default-router <ip>         - Default gateway
  dns-server <ip>             - DNS server
  lease <days> [hours] [minutes] - Lease time (or infinite)
  domain-name <domain>        - Domain name
  exit                        - Return to config mode
  end                         - Return to privileged mode
`,
    'ssid-config': `
Available commands:
  authentication <open|shared|network-eap> - Authentication type
  authentication key-management wpa version <2|3> - WPA version
  wpa-psk ascii <password>    - WPA pre-shared key
  guest-mode                  - Enable guest mode
  exit                        - Return to config mode
  end                         - Return to privileged mode
`,
    'dot11-config': `
Available commands:
  encryption mode ciphers <aes-ccm|tkip|aes-tkip> - Encryption cipher
  ssid <ssid-name>            - SSID binding
  channel <channel>           - Radio channel
  power <full|half|quarter|eighth|dBm> - Transmit power
  station-role <root|repeater|client> - Station role
  mac-filter <allow|deny> <MAC> - MAC address filter
  exit                        - Return to config mode
  end                         - Return to privileged mode
`
  };

  return language === 'en' ? helpContentsEN[mode] : helpContentsTR[mode];
}





