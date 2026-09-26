import type { CommandPattern } from './commandPatterns.types';

export const systemPatternsAclAndQos: Record<string, CommandPattern> = {
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
  }
};
