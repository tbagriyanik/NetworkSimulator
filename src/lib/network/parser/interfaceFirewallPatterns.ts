// Firewall and basic interface patterns
import type { CommandPattern } from './commandPatterns.types';

export const interfaceFirewallPatterns: Record<string, CommandPattern> = {
  // Firewall specific commands
  'access-group': {
    pattern: /^access-group\s+(\S+)\s+in\s+interface\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 4,
    maxArgs: 4,
    capability: 'firewall'
  },
  'no access-group': {
    pattern: /^no\s+access-group\s+(\S+)\s+in\s+interface\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 4,
    maxArgs: 4,
    capability: 'firewall'
  },
  'object network': {
    pattern: /^object\s+network\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2,
    capability: 'firewall'
  },
  'no object network': {
    pattern: /^no\s+object\s+network\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3,
    capability: 'firewall'
  },
  'nat': {
    pattern: /^nat\s*(?:\([^)]+\)|\s+.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 6,
    capability: 'firewall'
  },
  'no nat': {
    pattern: /^no\s+nat\s*(?:\([^)]+\)|\s+.+)?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 6,
    capability: 'firewall'
  },
  'route': {
    pattern: /^route\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\d+))?$/i,
    modes: ['config'],
    minArgs: 4,
    maxArgs: 5,
    capability: 'firewall'
  },
  'no route': {
    pattern: /^no\s+route\s+(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 4,
    maxArgs: 5,
    capability: 'firewall'
  },
  'timeout': {
    pattern: /^timeout\s+(\S+)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2,
    capability: 'firewall'
  },
  'passwd': {
    pattern: /^passwd\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'firewall'
  },
  'http server enable': {
    pattern: /^http\s+server\s+enable$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
  'no http server enable': {
    pattern: /^no\s+http\s+server\s+enable$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
  'ssh asa': {
    pattern: /^ssh\s+(\S+)\s+(\S+)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3,
    capability: 'firewall'
  },
  'no ssh asa': {
    pattern: /^no\s+ssh\s+(\S+)\s+(\S+)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3,
    capability: 'firewall'
  },
  'telnet asa': {
    pattern: /^telnet\s+(\S+)\s+(\S+)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3,
    capability: 'firewall'
  },
  'no telnet asa': {
    pattern: /^no\s+telnet\s+(\S+)\s+(\S+)\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3,
    capability: 'firewall'
  },
  'logging enable': {
    pattern: /^logging\s+enable$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
  'no logging enable': {
    pattern: /^no\s+logging\s+enable$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
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
  'same-security-traffic': {
    pattern: /^same-security-traffic\s+permit\s+inter-interface$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },
  'no same-security-traffic': {
    pattern: /^no\s+same-security-traffic\s+permit\s+inter-interface$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'firewall'
  },

  // Interface komutları - interface ÖNCE gelmeli (daha spesifik)
  'interface': {
    pattern: /^interface\s+(?!r(?:ange)?\s)(f(?:a(?:st(?:ethernet)?)?)?|g(?:i(?:g(?:abit(?:ethernet)?)?)?)?|e(?:thernet)?|se(?:rial)?|po(?:\s*port-channel)?|vlan|loopback|lo)?\s*(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'interface range': {
    pattern: /^interface\s+r(?:ange)?\s+(?:(?:f(?:a(?:st(?:ethernet)?)?)?|g(?:i(?:g(?:abit(?:ethernet)?)?)?)?|e(?:thernet)?|se(?:rial)?|po(?:\s*port-channel)?|vlan)\s*)?(.+)$/i,
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
    pattern: /^ipv6\s+address\s+([0-9a-fA-F:]+)(?:\/(\d+))?(?:\s+(eui-64))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'ipv6 nd suppress-ra': {
    pattern: /^ipv6\s+nd\s+suppress-ra$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ipv6 nd suppress-ra': {
    pattern: /^no\s+ipv6\s+nd\s+suppress-ra$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ipv6 traffic-filter': {
    pattern: /^ipv6\s+traffic-filter\s+(\S+)\s+(in|out)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ipv6 traffic-filter': {
    pattern: /^no\s+ipv6\s+traffic-filter(?:\s+(\S+)\s+(in|out))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 2
  },
  'vrrp ip': {
    pattern: /^vrrp\s+(\d+)\s+ip\s+([0-9.]+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 3,
    maxArgs: 3
  },
  'vrrp priority': {
    pattern: /^vrrp\s+(\d+)\s+priority\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 3,
    maxArgs: 3
  },
  'vrrp preempt': {
    pattern: /^vrrp\s+(\d+)\s+preempt$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no vrrp preempt': {
    pattern: /^no\s+vrrp\s+(\d+)\s+preempt$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no vrrp': {
    pattern: /^no\s+vrrp\s+(\d+)(?:\s+(ip|priority|preempt)(?:\s+\S+)?)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'ipv6 eigrp': {
    pattern: /^ipv6\s+eigrp\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'glbp': {
    pattern: /^glbp\s+\d+\s+(?:ip(?:\s+\S+)?|priority\s+\d+|preempt|load-balancing\s+(?:round-robin|weighted|host-dependent))$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 4
  },
  'spanning-tree guard loop': {
    pattern: /^spanning-tree\s+guard\s+(?:loop|none)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip flow ingress': {
    pattern: /^ip\s+flow\s+(?:ingress|egress)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip flow ingress': {
    pattern: /^no\s+ip\s+flow\s+(?:ingress|egress)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip flow monitor': {
    pattern: /^ip\s+flow\s+monitor\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip flow monitor': {
    pattern: /^no\s+ip\s+flow\s+monitor\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no shutdown': {
    pattern: /^no\s+shutdown$/i,
    modes: ['interface', 'config-if-range', 'dot11-config'],
    minArgs: 0,
    maxArgs: 0
  },
  'shutdown': {
    pattern: /^shutdown$/i,
    modes: ['interface', 'config-if-range', 'dot11-config'],
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
  },
  'encapsulation hdlc': {
    pattern: /^encapsulation\s+hdlc$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'encapsulation ppp': {
    pattern: /^encapsulation\s+ppp$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'clock rate': {
    pattern: /^clock\s+rate\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'ppp authentication pap': {
    pattern: /^ppp\s+authentication\s+pap$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ppp authentication chap': {
    pattern: /^ppp\s+authentication\s+chap$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ppp pap sent-username': {
    pattern: /^ppp\s+pap\s+sent-username\s+(\S+)\s+password\s+0\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no encapsulation': {
    pattern: /^no\s+encapsulation$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no clock rate': {
    pattern: /^no\s+clock\s+rate$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ppp authentication': {
    pattern: /^no\s+ppp\s+authentication$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
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
  'no switchport protected': {
    pattern: /^no\s+switchport\s+protected$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no switchport block': {
    pattern: /^no\s+switchport\s+block\s+(unicast|multicast)$/i,
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
  'switchport port-security mac-address sticky': {
    pattern: /^switchport\s+port-security\s+mac-address\s+sticky(\s+([0-9a-fA-F.:-]+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'switchport port-security mac-address': {
    pattern: /^switchport\s+port-security\s+mac-address\s+(.+?)(\s+vlan\s+(\d+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
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
};

