import type { CommandPattern } from './commandPatterns.types';

export const systemPatternsSaveAndBasic: Record<string, CommandPattern> = {
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
  }
};
