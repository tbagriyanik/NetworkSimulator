// Kaydetme, do, SSH, debug ve diger komutlar
import type { CommandPattern } from './commandPatterns.types';

export const systemPatterns: Record<string, CommandPattern> = {
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
    minArgs: 1,
    maxArgs: 1
  },
  'copy running-config tftp': {
    pattern: /^cop[y]*\s+run[ning\-config]*\s+tftp(?:[:]\/\/(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'copy tftp running-config': {
    pattern: /^cop[y]*\s+tftp(?:[:]\/\/(\S+))?\s+run[ning\-config]*$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'service dhcp': {
    pattern: /^service\s+dhcp$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no service dhcp': {
    pattern: /^no\s+service\s+dhcp$/i,
    modes: ['config'],
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
    minArgs: 1,
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
    modes: ['user', 'privileged', 'config', 'interface', 'config-if-range', 'line', 'vlan', 'config-std-nacl', 'config-ext-nacl'],
    minArgs: 0,
    maxArgs: 0
  },

  // Do komutları (config moddan show çalıştırma)
  'do show': {
    pattern: /^do\s+sh(?:ow)?\s+.*$/i,
    modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config', 'dhcp-config', 'config-std-nacl', 'config-ext-nacl', 'config-ipv6-acl', 'config-mst', 'config-route-map'],
    minArgs: 1,
    maxArgs: 10
  },
  'do': {
    pattern: /^do\s+(.*)$/i,
    modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config', 'dhcp-config', 'config-std-nacl', 'config-ext-nacl', 'config-ipv6-acl', 'config-mst', 'config-route-map'],
    minArgs: 1,
    maxArgs: 10
  },

  // Ping
  'ping': {
    pattern: /^ping(?:\s+vrf\s+\S+)?\s+([0-9a-fA-F:.]+|[\w.-]+)(.*)$/i,
    modes: ['user', 'privileged'],
    minArgs: 1,
    maxArgs: 10
  },

  // Traceroute
  'traceroute': {
    pattern: /^traceroute(?:\s+ip)?\s+([0-9a-fA-F:.]+|[\w.-]+)(.*)$/i,
    modes: ['user', 'privileged'],
    minArgs: 1,
    maxArgs: 10
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
  'clear ipv6 neighbors': {
    pattern: /^clear\s+ipv6\s+neighbor(s)?$/i,
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
  'clear ip ospf process': {
    pattern: /^clear\s+ip\s+ospf(?:\s+(\d+))?\s+process$/i,
    modes: ['privileged'],
    minArgs: 0,
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
    pattern: /^test(\s+(.+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
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

  // Access-list (numbered)
  'access-list': {
    pattern: /^access-list\s+(\d+)\s+(?:\d+\s+)?(permit|deny)\s+(.+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 4
  },
  // Named ACL sub-mode commands
  'seq permit/deny (named-acl)': {
    pattern: /^(?:(\d+)\s+)?(permit|deny)\s+(.+)$/i,
    modes: ['config-std-nacl', 'config-ext-nacl'],
    minArgs: 1,
    maxArgs: 10
  },
  'no (named-acl)': {
    pattern: /^no\s+(\d+|(?:permit|deny)\s+.+)$/i,
    modes: ['config-std-nacl', 'config-ext-nacl'],
    minArgs: 1,
    maxArgs: 10
  },
  'permit (named-acl)': {
    pattern: /^permit\s+(.+)$/i,
    modes: ['config-std-nacl'],
    minArgs: 1,
    maxArgs: 1
  },
  'deny (named-acl)': {
    pattern: /^deny\s+(.+)$/i,
    modes: ['config-std-nacl'],
    minArgs: 1,
    maxArgs: 1
  },
  'no permit (named-acl)': {
    pattern: /^no\s+permit\s+(.+)$/i,
    modes: ['config-std-nacl'],
    minArgs: 1,
    maxArgs: 1
  },
  'no deny (named-acl)': {
    pattern: /^no\s+deny\s+(.+)$/i,
    modes: ['config-std-nacl'],
    minArgs: 1,
    maxArgs: 1
  },
  'permit (ext-named-acl)': {
    pattern: /^permit\s+(.+)$/i,
    modes: ['config-ext-nacl', 'config'],
    minArgs: 1,
    maxArgs: 10
  },
  'deny (ext-named-acl)': {
    pattern: /^deny\s+(.+)$/i,
    modes: ['config-ext-nacl', 'config'],
    minArgs: 1,
    maxArgs: 10
  },
  'no permit (ext-named-acl)': {
    pattern: /^no\s+permit\s+(.+)$/i,
    modes: ['config-ext-nacl', 'config'],
    minArgs: 1,
    maxArgs: 10
  },
  'no deny (ext-named-acl)': {
    pattern: /^no\s+deny\s+(.+)$/i,
    modes: ['config-ext-nacl', 'config'],
    minArgs: 1,
    maxArgs: 10
  },
  'ip access-list': {
    pattern: /^ip\s+access-list\s+(standard|extended)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'no access-list': {
    pattern: /^no\s+access-list\s+(\d+)(?:\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no ip access-list': {
    pattern: /^no\s+ip\s+access-list\s+(standard|extended)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'ipv6 access-list': {
    pattern: /^ipv6\s+access-list\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ipv6 access-list': {
    pattern: /^no\s+ipv6\s+access-list\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'permit (ipv6-acl)': {
    pattern: /^(?:(\d+)\s+)?permit\s+(ipv6|icmp|tcp|udp|ip)\s+(.+)$/i,
    modes: ['config-ipv6-acl'],
    minArgs: 3,
    maxArgs: 10
  },
  'deny (ipv6-acl)': {
    pattern: /^(?:(\d+)\s+)?deny\s+(ipv6|icmp|tcp|udp|ip)\s+(.+)$/i,
    modes: ['config-ipv6-acl'],
    minArgs: 3,
    maxArgs: 10
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

  // Class within policy-map (QoS MQC)
  'class': {
    pattern: /^class\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },

  // Policy actions (QoS MQC)
  'set dscp': {
    pattern: /^set\s+dscp\s+(\S+)$/i,
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'set cos': {
    pattern: /^set\s+cos\s+(\d+)$/i,
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'police': {
    pattern: /^police\s+rate\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },

  // Remove class-map / policy-map
  'no class-map': {
    pattern: /^no\s+class-map\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no policy-map': {
    pattern: /^no\s+policy-map\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },

  // IP SLA operation and schedule definitions
  'ip sla': {
    pattern: /^ip\s+sla\s+(?:(?:\d+\s+(?:icmp-echo|jitter)\s+\S+(?:\s+frequency\s+\d+)?)|(?:schedule\s+\d+\s+life\s+forever\s+start\s+now))$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 7
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

  // Spanning-tree bpduguard enable
  'spanning-tree bpduguard enable': {
    pattern: /^spanning-tree\s+bpduguard\s+enable$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },

  // No Spanning-tree bpduguard
  'no spanning-tree bpduguard': {
    pattern: /^no\s+spanning-tree\s+bpduguard(\s+enable)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },

  // Spanning-tree cost
  'spanning-tree cost': {
    pattern: /^spanning-tree\s+(?:vlan\s+\d+\s+)?cost\s+\d+$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },

  // No Spanning-tree cost
  'no spanning-tree cost': {
    pattern: /^no\s+spanning-tree\s+(?:vlan\s+\d+\s+)?cost$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 2
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

  //  DHCP Pool (config mode) 
  'logging trap': {
    pattern: /^logging\s+trap\s+(\w+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'logging host': {
    pattern: /^logging\s+(?:host\s+)?([0-9.]+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
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

  //  DHCP Pool sub-commands (dhcp-config mode) 
  'default-router': {
    pattern: /^default-router(?:\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})+$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 8
  },
  'dns-server': {
    pattern: /^dns-server(?:\s+[0-9a-fA-F.:]+)+$/i,
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

  //  Interface NAT commands 
  'ip nat inside': {
    pattern: /^ip\s+nat\s+inside$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip nat inside': {
    pattern: /^no\s+ip\s+nat\s+inside$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip nat outside': {
    pattern: /^ip\s+nat\s+outside$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip nat outside': {
    pattern: /^no\s+ip\s+nat\s+outside$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },

  //  Interface MTU 
  'mtu': {
    pattern: /^mtu\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },

  //  Router config negation commands 
  'no network': {
    pattern: /^no\s+network\s+(.+)$/i,
    modes: ['router-config', 'dhcp-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no passive-interface': {
    pattern: /^no\s+passive-interface\s+(\S+)$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no router-id': {
    pattern: /^no\s+router-id$/i,
    modes: ['router-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no neighbor': {
    pattern: /^no\s+neighbor\s+([0-9.]+)(?:\s+remote-as(?:\s+\d+)?)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },
  'no neighbor remote-as': {
    pattern: /^no\s+neighbor\s+([0-9.]+)\s+remote-as(?:\s+\d+)?$/i,
    modes: ['router-config'],
    minArgs: 1,
    maxArgs: 2
  },

  //  DHCP config negation commands 
  'no default-router': {
    pattern: /^no\s+default-router(?:\s+\d+\.\d+\.\d+\.\d+)?$/i,
    modes: ['dhcp-config'],
    minArgs: 0,
    maxArgs: 1
  },
  'no dns-server': {
    pattern: /^no\s+dns-server(?:\s+(?:[0-9.]+|[0-9a-fA-F:]+))?$/i,
    modes: ['dhcp-config'],
    minArgs: 0,
    maxArgs: 1
  },
  'no domain-name': {
    pattern: /^no\s+domain-name(?:\s+\S+)?$/i,
    modes: ['dhcp-config'],
    minArgs: 0,
    maxArgs: 1
  },
  'no address prefix': {
    pattern: /^no\s+address\s+prefix\s+([0-9a-fA-F:]+\/\d+)$/i,
    modes: ['dhcp-config'],
    minArgs: 1,
    maxArgs: 1
  },

  //  NAT configuration commands 
  'ip nat pool': {
    pattern: /^ip\s+nat\s+pool\s+(\S+)\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)\s+(netmask\s+\d+\.\d+\.\d+\.\d+|prefix-length\s+\d+)$/i,
    modes: ['config'],
    minArgs: 4,
    maxArgs: 4
  },
  'ip nat inside source static': {
    pattern: /^ip\s+nat\s+inside\s+source\s+static\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },


  // ── Firewall commands ────────────────────────────────────────────────────────────
  'no nameif': {
    pattern: /^no\s+nameif$/i,
    modes: ['interface'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
  'show nameif': {
    pattern: /^show\s+nameif$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
  'show ip access-group': {
    pattern: /^show\s+ip\s+access-group(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1,
    capability: 'firewall'
  },
  'show dot11 associations': {
    pattern: /^show\s+dot11\s+associations(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1,
    capability: 'routing'
  },
  'show dot11 statistics': {
    pattern: /^show\s+dot11\s+statistics(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1,
    capability: 'routing'
  },
  'show wlan': {
    pattern: /^show\s+wlan\s+(\d+)$/i,
    modes: ['privileged'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing'
  },
  'no wlan': {
    pattern: /^no\s+wlan\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing'
  },
  'show vtp password': {
    pattern: /^show\s+vtp\s+password$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ip eigrp neighbors': {
    pattern: /^show\s+ip\s+eigrp\s+neighbors(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip bgp summary': {
    pattern: /^show\s+ip\s+bgp\s+summary$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ip bgp neighbors': {
    pattern: /^show\s+ip\s+bgp\s+neighbors?(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip bgp': {
    pattern: /^show\s+ip\s+bgp(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip nat translations': {
    pattern: /^show\s+ip\s+nat\s+translations$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ip nat statistics': {
    pattern: /^show\s+ip\s+nat\s+statistics$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show ipv6 rip': {
    pattern: /^show\s+ipv6\s+rip(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ipv6 ospf': {
    pattern: /^show\s+ipv6\s+ospf(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show vrrp brief': {
    pattern: /^show\s+vrrp\s+brief$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 0
  },
  'show vrrp': {
    pattern: /^show\s+vrrp(?:\s+(\d+|\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ipv6 access-list': {
    pattern: /^show\s+ipv6\s+access-list(?:\s+(\S+))?$/i,
    modes: ['privileged'],
    minArgs: 0,
    maxArgs: 1
  },

  // ── End of Configuration ─────────────────────────────────────────────────────────
};
