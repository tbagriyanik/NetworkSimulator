import type { CommandPattern } from './commandPatterns.types';

export const systemPatternsDhcpWirelessNatShow: Record<string, CommandPattern> = {
  // No IP helper-address
  'no ip helper-address': {
    pattern: /^no\s+ip\s+helper-address(?:\s+\d+\.\d+\.\d+\.\d+)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 1
  },

  // DHCP Pool (config mode)
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

  // DHCP Pool sub-commands (dhcp-config mode)
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

  // Interface NAT commands
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

  // Interface MTU
  'mtu': {
    pattern: /^mtu\s+(\d+)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no mtu': {
    pattern: /^no\s+mtu$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 0
  },

  // Router config negation commands
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

  // DHCP config negation commands
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

  // NAT configuration commands
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

  // Firewall commands
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
  }
};
