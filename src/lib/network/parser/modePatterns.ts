// Mode degistirme ve global config komutlari
import type { CommandPattern } from './commandPatterns.types';

export const modePatterns: Record<string, CommandPattern> = {
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
  'no ip host': {
    pattern: /^no\s+ip\s+host\s+(\S+)(?:\s+[0-9.]+)?$/i,
    modes: ['config'],
    minArgs: 1,
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
    pattern: /^exit$/i,
    modes: ['privileged', 'config', 'interface', 'config-if-range', 'line', 'vlan', 'dhcp-config', 'router-config', 'config-std-nacl', 'config-ext-nacl', 'config-ipv6-acl', 'ap-config', 'dot11-config', 'ssid-config', 'config-mst', 'config-route-map'],
    minArgs: 0,
    maxArgs: 0
  },
  'end': {
    pattern: /^end$/i,
    modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'dhcp-config', 'router-config', 'config-std-nacl', 'config-ext-nacl', 'config-ipv6-acl', 'ap-config', 'dot11-config', 'ssid-config', 'config-mst', 'config-route-map'],
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
  'no hostname': {
    pattern: /^no\s+hostname$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
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
  'aaa new-model': {
    pattern: /^aaa\s+new-model$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'no aaa new-model': {
    pattern: /^no\s+aaa\s+new-model$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'aaa authentication login': {
    pattern: /^aaa\s+authentication\s+login\s+(.+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 4
  },
  'radius-server host': {
    pattern: /^radius-server\s+host\s+([0-9.]+)(?:\s+key\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 3
  },
  'tacacs-server host': {
    pattern: /^tacacs-server\s+host\s+([0-9.]+)(?:\s+key\s+(\S+))?$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 3
  },
  'radius-server key': {
    pattern: /^radius-server\s+key\s+(\S+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'tacacs-server key': {
    pattern: /^tacacs-server\s+key\s+(\S+)$/i,
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
  'no ip domain-name': {
    pattern: /^no\s+ip\s+domain-name$/i,
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
    modes: ['config', 'interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
  'no ip default-gateway': {
    pattern: /^no\s+ip\s+default-gateway$/i,
    modes: ['config', 'interface', 'config-if-range'],
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
  'crypto key zeroize rsa': {
    pattern: /^crypto\s+key\s+zeroize\s+rsa$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
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
  'show ip ospf database': {
    pattern: /^show\s+ip\s+ospf\s+database(?:\s+(\S+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip eigrp': {
    pattern: /^show\s+ip\s+eigrp(?:\s+(\d+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'show ip eigrp neighbors': {
    pattern: /^show\s+ip\s+eigrp\s+neighbors(?:\s+(\d+))?$/i,
    modes: ['user', 'privileged'],
    minArgs: 0,
    maxArgs: 1
  },
  'router eigrp': {
    pattern: /^router\s+eigrp\s+(\d+)$/i,
    modes: ['config'],
    minArgs: 1,
    maxArgs: 1
  },
  'no router eigrp': {
    pattern: /^no\s+router\s+eigrp(?:\s+(\d+))?$/i,
    modes: ['config'],
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
  'lldp run': {
    pattern: /^lldp\s+run$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'dot1x system-auth-control': { pattern: /^dot1x\s+system-auth-control$/i, modes: ['config'], minArgs: 0, maxArgs: 0 },
  'no lldp run': {
    pattern: /^no\s+lldp\s+run$/i,
    modes: ['config'],
    minArgs: 0,
    maxArgs: 0
  },
  'macro apply': {
    pattern: /^macro\s+apply\s+(\S+)$/i,
    modes: ['privileged', 'config', 'interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 1
  },
};
