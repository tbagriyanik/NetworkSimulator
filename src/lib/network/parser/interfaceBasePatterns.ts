import type { CommandPattern } from './commandPatterns.types';

export const interfaceBasePatterns: Record<string, CommandPattern> = {
  // Interface komutları
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
  'ip address': {
    pattern: /^ip\s+address\s+(?:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(\s+secondary)?|dhcp)$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 1,
    maxArgs: 3
  },
  'no ip address': {
    pattern: /^no\s+ip\s+address(?:\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?:\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})?)?$/i,
    modes: ['interface', 'config-if-range'],
    minArgs: 0,
    maxArgs: 3
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
  }
};

