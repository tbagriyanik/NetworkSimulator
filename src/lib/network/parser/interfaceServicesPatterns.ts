import type { CommandPattern } from './commandPatterns.types';

export const interfaceServicesPatterns: Record<string, CommandPattern> = {
  // Firewall specific commands
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
  'lldp transmit': {
    pattern: /^lldp\s+transmit$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no lldp transmit': {
    pattern: /^no\s+lldp\s+transmit$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'lldp receive': {
    pattern: /^lldp\s+receive$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'service-policy': { pattern: /^service-policy\s+(input|output)\s+(\S+)$/i, modes: ['interface'], minArgs: 2, maxArgs: 2 },
  'dot1x port-control': { pattern: /^dot1x\s+port-control\s+(auto|force-authorized|force-unauthorized)$/i, modes: ['interface'], minArgs: 1, maxArgs: 1 },
  'no lldp receive': {
    pattern: /^no\s+lldp\s+receive$/i,
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
    modes: ['interface', 'config-if-range', 'dot11-config'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing'
  },
  'encryption': {
    pattern: /^encryption\s+(open|wep|wpa|wpa2|wpa3)$/i,
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
    pattern: /^wlan\s+(\S+)\s+(\d+)\s+(\S+)(?:\s+vlan\s+(\d+))?(?:\s+security\s+(\S+))?(?:\s+password\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 7
  },
  'wlan enable': {
    pattern: /^wlan\s+(enable|disable)\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 2
  },
  'wlan security': {
    pattern: /^wlan\s+security\s+(\d+)\s+(open|wep|wpa|wpa2|wpa3|802\.1x)(?:\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 2,
    maxArgs: 3
  },
  'wlan interface': {
    pattern: /^wlan\s+(?:interface|vlan)\s+(\d+)\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 3,
    maxArgs: 3
  },
  'wlan shutdown': {
    pattern: /^wlan\s+shutdown$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no wlan shutdown': {
    pattern: /^no\s+wlan\s+shutdown$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'ap': {
    pattern: /^ap\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'auth-mac': {
    pattern: /^auth-mac\s+([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})$/i,
    modes: ['ap-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'rf-channel': {
    pattern: /^rf-channel\s+(\d+)$/i,
    modes: ['ap-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'dot11 5ghz': {
    pattern: /^dot11\s+5ghz\s+(power-constraint|channelswitch\s+mode)\s+(.+)$/i,
    modes: ['ap-config'],
    minArgs: 1,
    maxArgs: 1
  },
  'security wpa psk set-key': {
    pattern: /^security\s+wpa\s+psk\s+set-key\s+ascii\s+(?:0|7)\s+(.+)$/i,
    modes: ['config'],
    minArgs: 5,
    maxArgs: 5,
    capability: 'routing'
  },
  'security wep key set-key': {
    pattern: /^security\s+wep\s+(?:key\s+set-key|key)\s+ascii\s+(?:0|7)\s+(.+)$/i,
    modes: ['config'],
    minArgs: 4,
    maxArgs: 5,
    capability: 'routing'
  },
  'mbssid': {
    pattern: /^mbssid$/i,
    modes: ['ssid-config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'routing'
  },
  'no mbssid': {
    pattern: /^no\s+mbssid$/i,
    modes: ['ssid-config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'routing'
  },
  'world-mode dot11d': {
    pattern: /^world-mode\s+dot11d\s+([1-9]|-1)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1,
    capability: 'routing'
  },
  'no security wpa psk': {
    pattern: /^no\s+security\s+wpa\s+psk$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0,
    capability: 'routing'
  },
  'no security wep': {
    pattern: /^no\s+security\s+wep(?:\s+key)?$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 1,
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
  'ip helper-address': {
    pattern: /^ip\s+helper-address\s+([0-9.]+|[\w.-]+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip helper-address': {
    pattern: /^no\s+ip\s+helper-address(?:\s+([0-9.]+|[\w.-]+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'ip directed-broadcast': {
    pattern: /^ip\s+directed-broadcast$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'no ip directed-broadcast': {
    pattern: /^no\s+ip\s+directed-broadcast$/i,
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
  'ip dhcp snooping limit rate': {
    pattern: /^ip\s+dhcp\s+snooping\s+limit\s+rate\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip dhcp snooping limit rate': {
    pattern: /^no\s+ip\s+dhcp\s+snooping\s+limit\s+rate$/i,
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
  'mac access-group': {
    pattern: /^mac\s+access-group\s+(\S+)\s+(in|out)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no mac access-group': {
    pattern: /^no\s+mac\s+access-group(?:\s+(\S+)\s+(in|out))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 2
  },
  'source template': {
    pattern: /^source\s+template\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip bandwidth-percent eigrp': {
    pattern: /^ip\s+bandwidth-percent\s+eigrp\s+(\d+)\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ip bandwidth-percent eigrp': {
    pattern: /^no\s+ip\s+bandwidth-percent\s+eigrp\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip summary-address eigrp': {
    pattern: /^ip\s+summary-address\s+eigrp\s+(\d+)\s+([0-9.]+)\s+([0-9.]+)(?:\s+(\d+))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 3,
    maxArgs: 4
  },
  'no ip summary-address eigrp': {
    pattern: /^no\s+ip\s+summary-address\s+eigrp\s+(\d+)\s+([0-9.]+)\s+([0-9.]+)/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 3,
    maxArgs: 3
  },
  'ip ospf authentication': {
    pattern: /^ip\s+ospf\s+authentication(?:\s+(message-digest|null))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'no ip ospf authentication': {
    pattern: /^no\s+ip\s+ospf\s+authentication$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip ospf authentication-key': {
    pattern: /^ip\s+ospf\s+authentication-key\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip ospf authentication-key': {
    pattern: /^no\s+ip\s+ospf\s+authentication-key$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip ospf message-digest-key': {
    pattern: /^ip\s+ospf\s+message-digest-key\s+(\d+)\s+md5\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 3,
    maxArgs: 3
  },
  'no ip ospf message-digest-key': {
    pattern: /^no\s+ip\s+ospf\s+message-digest-key\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'ip ospf cost': {
    pattern: /^ip\s+ospf\s+cost\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip ospf cost': {
    pattern: /^no\s+ip\s+ospf\s+cost$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip ospf hello-interval': {
    pattern: /^ip\s+ospf\s+hello-interval\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip ospf hello-interval': {
    pattern: /^no\s+ip\s+ospf\s+hello-interval$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip ospf dead-interval': {
    pattern: /^ip\s+ospf\s+dead-interval\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip ospf dead-interval': {
    pattern: /^no\s+ip\s+ospf\s+dead-interval$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'ip ospf priority': {
    pattern: /^ip\s+ospf\s+priority\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip ospf priority': {
    pattern: /^no\s+ip\s+ospf\s+priority$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },
  'tunnel protection': {
    pattern: /^tunnel\s+protection\s+ipsec\s+profile\s+(\S+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 3,
    maxArgs: 3
  },
  'no tunnel protection': {
    pattern: /^no\s+tunnel\s+protection(?:\s+ipsec\s+profile(?:\s+\S+)?)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 4
  },
  'ip pim': {
    pattern: /^ip\s+pim\s+(sparse-mode|dense-mode|sparse-dense-mode)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip pim': {
    pattern: /^no\s+ip\s+pim(?:\s+(?:sparse-mode|dense-mode|sparse-dense-mode))?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },
  'ip igmp': {
    pattern: /^ip\s+igmp\s+(?:join-group\s+([0-9.]+)|version\s+(1|2|3))$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 2
  },
  'no ip igmp': {
    pattern: /^no\s+ip\s+igmp\s+(?:join-group\s+([0-9.]+)|version)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 2
  },
  'ip inspect': {
    pattern: /^ip\s+inspect\s+(\S+)\s+(in|out)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  },
  'no ip inspect': {
    pattern: /^no\s+ip\s+inspect\s+(\S+)\s+(in|out)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 2,
    maxArgs: 2
  }
};

