// Network Command Executor (refactored with handler map)
import { SwitchState, CommandMode, CommandResult } from './types';
import { checkConnectivity } from './connectivity';
import { addStaticRoute, removeStaticRoute, getRoutingTable } from './routing';
import { parseCommand, validateCommand, getHelpContent, commandPatterns, getLevenshteinDistance, expandKeywordPrefixes, resolveAliases } from './parser';
import { getDeviceCapabilities } from './capabilities';
import { isRouterModel } from './switchModels';
import { getModePrompt } from './initialState';
import { isValidMAC, normalizeMAC } from '../utils';
import { ensureDeviceStatesMap } from './networkUtils';
import { encryptMd5Password, decryptType7Password } from './crypto';
import { IOS_ERRORS, iosModeError } from './core/iosErrors';
import type { CanvasDevice, CanvasConnection, CanvasPort } from '@/components/network/networkTopology.types';

/**
 * Generate CLI prompt string based on current switch state
 */
export function getPrompt(state: SwitchState): string {
  const hostname = state.hostname || 'Switch';
  const mode = state.currentMode;

  switch (mode) {
    case 'user':
      return `${hostname}>`;
    case 'privileged':
      return `${hostname}#`;
    case 'config':
      return `${hostname}(config)#`;
    case 'interface':
      return `${hostname}(config-if)#`;
    case 'config-if-range':
      return `${hostname}(config-if-range)#`;
    case 'line':
      return `${hostname}(config-line)#`;
    case 'vlan':
      return `${hostname}(config-vlan)#`;
    case 'router-config':
      return `${hostname}(config-router)#`;
    case 'dhcp-config':
      return `${hostname}(dhcp-config)#`;
    case 'ssid-config':
      return `${hostname}(config-ssid)#`;
    case 'dot11-config':
      return `${hostname}(config-if)#`;
    default:
      return `${hostname}>`;
  }
}

// Import command handlers from modular files
import { systemHandlers } from './core/systemCommands';
import { showHandlers } from './core/showCommands';
import { interfaceHandlers } from './core/interfaceCommands';
import { globalConfigHandlers } from './core/globalConfigCommands';
import { routerConfigHandlers } from './core/routerConfigCommands';
import { lineHandlers } from './core/lineCommands';
import { privilegedHandlers } from './core/privilegedCommands';
import { dhcpConfigHandlers } from './core/dhcpConfigCommands';
import { firewallHandlers } from './core/firewallCommands';
import { wirelessHandlers } from './core/wirelessCommands';

// --- Command handler types & context ---
export interface CommandContext {
  language: 'tr' | 'en';
  devices?: CanvasDevice[];
  connections?: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  sourceDeviceId?: string;
}

export type CommandHandler = (
  state: SwitchState,
  input: string,
  ctx: CommandContext
) => CommandResult;

// --- Inline help tree ---
// Helper: Generate prefixes for a command (e.g., 'telnet' -> 't','te','tel'...)
const pfx = (cmd: string, completions: string[], minLen = 1): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (let i = minLen; i <= cmd.length; i++) {
    result[cmd.slice(0, i)] = completions;
  }
  return result;
};

// Helper: Generate prefixes for nested commands (e.g., 'show version')
const npfx = (base: string, cmd: string, completions: string[], minLen = 1): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  const prefix = base + ' ';
  for (let i = minLen; i <= cmd.length; i++) {
    result[prefix + cmd.slice(0, i)] = completions;
  }
  return result;
};

// Helper: Single letter or exact match
const single = (char: string, completions: string[]): Record<string, string[]> => ({ [char]: completions });

// Helper: Multi-prefix for ambiguous first letters (e.g., 't' -> ['telnet'])
const multi = (char: string, completions: string[]): Record<string, string[]> => {
  const result: Record<string, string[]> = { [char]: completions };
  completions.forEach(cmd => {
    for (let i = 1; i <= cmd.length; i++) {
      const prefix = cmd.slice(0, i);
      // Only add if this prefix is unique to this command
      const matches = completions.filter(c => c.startsWith(prefix));
      if (matches.length === 1) {
        result[char + prefix] = [cmd];
      }
    }
  });
  return result;
};

export const commandHelp: Record<string, Record<string, string[]>> = {
  'user': {
    '': ['enable', 'help', 'ping', 'show', 'telnet'],
    ...pfx('enable', ['enable']),
    ...pfx('help', ['help']),
    ...pfx('ping', ['ping']),
    ...multi('s', ['show', 'ssh']),
    ...pfx('show', ['arp', 'cdp', 'etherchannel', 'interface', 'interfaces', 'ip', 'ipv6', 'mac', 'spanning-tree', 'version', 'vlan']),
    'show cdp': ['neighbors'],
    'show interface': ['trunk'],
    'show interfaces': ['status', 'trunk'],
    'show ip': ['arp', 'interface', 'ospf', 'protocols', 'route'],
    'show ip interface': ['brief'],
    'show ip ospf': ['interface', 'neighbor'],
    'show ipv6': ['dhcp', 'interface', 'route'],
    'show ipv6 dhcp': ['pool'],
    'show ipv6 interface': ['brief'],
    'show mac': ['address-table'],
    'show vlan': ['brief'],
  },
  'privileged': {
    '': ['clear', 'clock', 'configure', 'copy', 'debug', 'delete', 'disable', 'disconnect', 'erase', 'exit', 'help', 'more', 'no', 'ping', 'reload', 'resume', 'setup', 'show', 'ssh', 'suspend', 'telnet', 'terminal', 'test', 'traceroute', 'undebug', 'write'],
    ...pfx('clear', ['arp-cache', 'counters', 'interface', 'line', 'mac']),
    'clear mac': ['address-table'],
    ...pfx('clock', ['set']),
    ...pfx('configure', ['terminal']),
    ...pfx('copy', ['flash', 'running-config', 'startup-config', 'tftp']),
    'copy flash': ['startup-config'],
    'copy running-config': ['flash', 'startup-config', 'tftp'],
    'copy startup-config': ['running-config'],
    'copy tftp': ['running-config'],
    ...pfx('delete', ['flash:vlan.dat', 'nvram']),
    ...pfx('erase', ['nvram', 'startup-config']),
    ...pfx('no', ['debug']),
    'no debug': ['all'],
    ...pfx('show', ['access-lists', 'alias', 'ap', 'archive', 'arp', 'authentication', 'banner', 'boot', 'cdp', 'class-map', 'clock', 'controllers', 'debugging', 'diagnostic', 'environment', 'errdisable', 'etherchannel', 'flash', 'history', 'interface', 'interfaces', 'inventory', 'ip', 'ipv6', 'lldp', 'mac', 'memory', 'mls', 'monitor', 'ntp', 'policy-map', 'port-security', 'processes', 'redundancy', 'running-config', 'sdm', 'sessions', 'snmp', 'spanning-tree', 'ssh', 'startup-config', 'storm-control', 'system', 'udld', 'users', 'version', 'vlan', 'vtp', 'wireless', 'wlan']),
    'show ap': ['summary'],
    'show banner': ['motd'],
    'show cdp': ['neighbors'],
    'show errdisable': ['detect', 'recovery'],
    'show interface': ['trunk'],
    'show interfaces': ['status', 'trunk'],
    'show ip': ['arp', 'dhcp', 'interface', 'ospf', 'protocols', 'route', 'source', 'ssh', 'verify'],
    'show ip arp': ['inspection'],
    'show ip dhcp': ['binding', 'pool', 'snooping'],
    'show ip interface': ['brief'],
    'show ip ospf': ['interface', 'neighbor'],
    'show ip source': ['binding'],
    'show ip verify': ['source'],
    'show ipv6': ['dhcp', 'interface', 'route'],
    'show ipv6 dhcp': ['pool'],
    'show ipv6 interface': ['brief'],
    'show mac': ['access-lists', 'address-table'],
    'show mac address-table': ['static'],
    'show mls': ['qos'],
    'show ntp': ['associations', 'status'],
    'show sdm': ['prefer'],
    'show system': ['mtu'],
    'show vlan': ['brief'],
    'show vtp': ['status'],
    'show wlan': ['summary'],
    ...pfx('terminal', ['length', 'monitor', 'no', 'width']),
    'terminal no': ['monitor'],
    ...pfx('undebug', ['all']),
    ...pfx('write', ['memory']),
  },
  'config': {
    '': ['access-list', 'alias', 'archive', 'banner', 'cdp', 'channel', 'class-map', 'clock', 'crypto', 'default', 'do', 'dot11', 'enable', 'end', 'errdisable', 'exit', 'hostname', 'interface', 'iot', 'ip', 'ipv6', 'line', 'mac', 'macro', 'mls', 'monitor', 'no', 'ntp', 'policy-map', 'router', 'sdm', 'security', 'service', 'snmp-server', 'spanning-tree', 'station-role', 'system', 'template', 'username', 'vlan', 'vtp', 'wlan'],
    ...pfx('banner', ['exec', 'login', 'motd']),
    ...pfx('cdp', ['holdtime', 'run', 'timer']),
    ...pfx('clock', ['timezone']),
    ...pfx('crypto', ['key']),
    'crypto key': ['generate'],
    'crypto key generate': ['rsa'],
    ...pfx('default', ['interface']),
    ...pfx('do', ['show']),
    ...pfx('dot11', ['ssid']),
    ...pfx('enable', ['password', 'secret']),
    ...pfx('errdisable', ['recovery']),
    'errdisable recovery': ['cause'],
    ...pfx('interface', ['dot11radio', 'range']),
    ...pfx('iot', ['sensor', 'name', 'wifi']),
    ...pfx('ip', ['access-list', 'arp', 'default-gateway', 'dhcp', 'domain', 'domain-lookup', 'domain-name', 'host', 'http', 'name-server', 'route', 'routing', 'ssh']),
    'ip arp': ['inspection'],
    'ip dhcp': ['excluded-address', 'pool', 'snooping'],
    'ip dhcp snooping': ['vlan'],
    'ip domain': ['lookup'],
    'ip http': ['server'],
    'ip ssh': ['authentication-retries', 'time-out', 'version'],
    ...pfx('ipv6', ['dhcp', 'route', 'router', 'unicast-routing']),
    'ipv6 dhcp': ['pool'],
    'ipv6 router': ['ospf', 'rip'],
    ...pfx('line', ['aux', 'console', 'vty']),
    ...pfx('mac', ['access-list']),
    ...pfx('mls', ['qos']),
    ...pfx('monitor', ['session']),
    ...pfx('no', ['access-list', 'banner', 'cdp', 'enable', 'interface', 'ip', 'ipv6', 'mls', 'monitor', 'router', 'service', 'spanning-tree', 'username', 'vlan']),
    'no banner': ['exec', 'login', 'motd'],
    'no cdp': ['run'],
    'no enable': ['password', 'secret'],
    'no ip': ['access-list', 'default-gateway', 'dhcp', 'domain-lookup', 'host', 'http', 'route', 'routing', 'ssh'],
    'no ip dhcp': ['excluded-address', 'pool', 'snooping'],
    'no ip http': ['server'],
    'no ip ssh': ['time-out'],
    'no ipv6': ['dhcp', 'route', 'router', 'unicast-routing'],
    'no ipv6 dhcp': ['pool'],
    'no ipv6 router': ['ospf', 'rip'],
    'no mls': ['qos'],
    'no monitor': ['session'],
    'no router': ['bgp', 'eigrp', 'ospf', 'rip'],
    'no service': ['password-encryption'],
    ...pfx('ntp', ['server']),
    ...pfx('router', ['bgp', 'eigrp', 'ospf', 'rip']),
    ...pfx('sdm', ['prefer']),
    ...pfx('security', ['wpa']),
    'security wpa': ['psk'],
    'security wpa psk': ['set-key'],
    ...pfx('service', ['password-encryption']),
    ...pfx('snmp-server', ['community', 'contact', 'location']),
    ...pfx('spanning-tree', ['mode', 'portfast', 'vlan']),
    ...pfx('system', ['mtu']),
    ...pfx('vtp', ['domain', 'mode', 'password']),
  },
  'interface': {
    '': ['bandwidth', 'carrier-delay', 'cdp', 'channel-group', 'channel-protocol', 'delay', 'description', 'do', 'duplex', 'encapsulation', 'encryption', 'end', 'exit', 'help', 'ip', 'ipv6', 'keepalive', 'load-interval', 'macro', 'mls', 'nameif', 'no', 'power', 'priority-queue', 'queue-set', 'security-level', 'shutdown', 'spanning-tree', 'speed', 'ssid', 'storm-control', 'switchport', 'tx-queue', 'udld'],
    ...pfx('cdp', ['enable']),
    ...pfx('do', ['show']),
    ...pfx('encapsulation', ['dot1q']),
    ...pfx('ip', ['access-group', 'address', 'arp', 'dhcp', 'directed-broadcast', 'helper-address', 'proxy-arp', 'verify']),
    'ip arp': ['inspection'],
    'ip arp inspection': ['limit', 'trust'],
    'ip dhcp': ['snooping'],
    'ip dhcp snooping': ['trust'],
    'ip verify': ['source'],
    ...pfx('ipv6', ['address', 'dhcp', 'ospf', 'rip']),
    'ipv6 dhcp': ['server'],
    'ipv6 ospf': ['area'],
    'ipv6 rip': ['enable'],
    ...pfx('mls', ['qos']),
    'mls qos': ['cos', 'trust'],
    ...pfx('no', ['cdp', 'channel-group', 'description', 'ip', 'ipv6', 'keepalive', 'shutdown', 'switchport', 'udld']),
    'no cdp': ['enable'],
    'no ip': ['access-group', 'address', 'arp', 'dhcp', 'helper-address', 'proxy-arp'],
    'no ip arp': ['inspection'],
    'no ip arp inspection': ['trust'],
    'no ip dhcp': ['snooping'],
    'no ip dhcp snooping': ['trust'],
    'no ipv6': ['ospf', 'rip'],
    'no ipv6 ospf': ['area'],
    'no ipv6 rip': ['enable'],
    'no switchport': ['access', 'mode', 'port-security'],
    'no switchport access': ['vlan'],
    ...pfx('power', ['inline']),
    'power inline': ['consumption'],
    ...pfx('priority-queue', ['out']),
    ...pfx('spanning-tree', ['bpduguard', 'cost', 'portfast', 'priority']),
    'spanning-tree bpduguard': ['disable'],
    ...pfx('storm-control', ['action']),
    ...pfx('switchport', ['access', 'block', 'mode', 'nonegotiate', 'port-security', 'protected', 'trunk', 'voice']),
    'switchport access': ['vlan'],
    'switchport port-security': ['aging', 'mac-address', 'maximum', 'violation'],
    'switchport port-security aging': ['time', 'type'],
    'switchport port-security mac-address': ['sticky'],
    'switchport trunk': ['allowed', 'encapsulation', 'native'],
    'switchport trunk allowed': ['vlan'],
    'switchport trunk native': ['vlan'],
    'switchport voice': ['vlan'],
    ...pfx('udld', ['enable', 'port']),
  },
  'config-if-range': {
    '': ['bandwidth', 'carrier-delay', 'cdp', 'channel-group', 'channel-protocol', 'delay', 'description', 'do', 'duplex', 'encapsulation', 'encryption', 'end', 'exit', 'help', 'ip', 'ipv6', 'keepalive', 'load-interval', 'macro', 'mls', 'no', 'power', 'priority-queue', 'queue-set', 'shutdown', 'spanning-tree', 'speed', 'ssid', 'storm-control', 'switchport', 'tx-queue', 'udld'],
    ...pfx('cdp', ['enable']),
    ...pfx('do', ['show']),
    ...pfx('encapsulation', ['dot1q']),
    ...pfx('ip', ['access-group', 'address', 'arp', 'dhcp', 'directed-broadcast', 'helper-address', 'proxy-arp', 'verify']),
    'ip arp': ['inspection'],
    'ip arp inspection': ['limit', 'trust'],
    'ip dhcp': ['snooping'],
    'ip dhcp snooping': ['trust'],
    'ip verify': ['source'],
    ...pfx('ipv6', ['address', 'dhcp', 'ospf', 'rip']),
    'ipv6 dhcp': ['server'],
    'ipv6 ospf': ['area'],
    'ipv6 rip': ['enable'],
    ...pfx('mls', ['qos']),
    'mls qos': ['cos', 'trust'],
    ...pfx('no', ['cdp', 'channel-group', 'description', 'ip', 'ipv6', 'keepalive', 'shutdown', 'switchport', 'udld']),
    'no cdp': ['enable'],
    'no ip': ['access-group', 'address', 'arp', 'dhcp', 'helper-address', 'proxy-arp'],
    'no ip arp': ['inspection'],
    'no ip arp inspection': ['trust'],
    'no ip dhcp': ['snooping'],
    'no ip dhcp snooping': ['trust'],
    'no ipv6': ['ospf', 'rip'],
    'no ipv6 ospf': ['area'],
    'no ipv6 rip': ['enable'],
    'no switchport': ['access', 'mode', 'port-security'],
    'no switchport access': ['vlan'],
    ...pfx('power', ['inline']),
    'power inline': ['consumption'],
    ...pfx('priority-queue', ['out']),
    ...pfx('spanning-tree', ['bpduguard', 'cost', 'portfast', 'priority']),
    'spanning-tree bpduguard': ['disable'],
    ...pfx('storm-control', ['action']),
    ...pfx('switchport', ['access', 'block', 'mode', 'nonegotiate', 'port-security', 'protected', 'trunk', 'voice']),
    'switchport access': ['vlan'],
    'switchport port-security': ['aging', 'mac-address', 'maximum', 'violation'],
    'switchport port-security aging': ['time', 'type'],
    'switchport port-security mac-address': ['sticky'],
    'switchport trunk': ['allowed', 'encapsulation', 'native'],
    'switchport trunk allowed': ['vlan'],
    'switchport trunk native': ['vlan'],
    'switchport voice': ['vlan'],
    ...pfx('udld', ['enable', 'port']),
  },
  'line': {
    '': ['access-class', 'autocommand', 'do', 'end', 'exec', 'exec-timeout', 'exit', 'help', 'history', 'lockable', 'logging', 'login', 'no', 'password', 'privilege', 'session-limit', 'transport'],
    ...pfx('do', ['show']),
    ...pfx('history', ['size']),
    ...pfx('logging', ['synchronous']),
    ...pfx('no', ['autocommand', 'exec', 'exec-timeout', 'history', 'logging', 'login', 'password', 'transport']),
    'no logging': ['synchronous'],
    'no transport': ['input'],
    ...pfx('privilege', ['level']),
    ...pfx('transport', ['input', 'output', 'preferred']),
  },
  'vlan': {
    '': ['do', 'end', 'exit', 'help', 'name', 'no', 'state'],
    ...pfx('do', ['show']),
    ...pfx('no', ['name']),
  },
  'dhcp-config': {
    '': ['address', 'default-router', 'dns-server', 'do', 'domain-name', 'end', 'exit', 'lease', 'network', 'no'],
    ...pfx('address', ['prefix']),
    ...pfx('no', ['address', 'default-router', 'dns-server', 'domain-name', 'network']),
    ...pfx('do', ['show']),
    ...pfx('network', []),
  },
  'router-config': {
    '': ['default-information', 'do', 'end', 'exit', 'neighbor', 'network', 'no', 'passive-interface', 'router-id'],
    ...pfx('default-information', ['always', 'originate']),
    ...pfx('do', ['show']),
    ...pfx('neighbor', ['remote-as']),
    ...pfx('no', ['auto-summary', 'neighbor', 'network', 'passive-interface', 'router-id']),
    ...pfx('network', []),
  },
  'ssid-config': {
    '': ['authentication', 'guest-mode', 'wpa-psk'],
    ...pfx('authentication', ['key-management']),
  },
  'dot11-config': {
    '': ['dot11', 'encryption'],
    ...pfx('dot11', ['channel', 'mac-filter', 'power', 'station-role']),
    ...pfx('encryption', ['mode']),
  },
};


// Command descriptions for help system
const commandDescriptions: Record<string, Record<string, string>> = {
  user: {
    'enable': 'Ayrıcalıklı moda geç (Enable privileged mode)',
    'exit': 'Oturumu kapat (Exit session)',
    'show': 'Cihaz bilgilerini göster (Display device information)',
    'ping': 'Ağ bağlantısını test et (Test network connectivity)',
    'telnet': 'Telnet ile uzak cihaza bağlan (Connect to remote device via Telnet)',
    'ssh': 'SSH ile uzak cihaza bağlan (Connect to remote device via SSH)',
    'traceroute': 'Hedef cihaza giden yolu göster (Display route to destination)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  privileged: {
    'configure': 'Yapılandırma moduna gir (Enter configuration mode)',
    'disable': 'Ayrıcalıklı moddan çık (Exit privileged mode)',
    'clock': 'Sistem saatini ayarla (Manage the system clock)',
    'show': 'Cihaz bilgilerini göster (Display device information)',
    'clear': 'Önbelleği temizle (Clear cache/counters)',
    'debug': 'Hata ayıklama etkinleştir (Enable debugging)',
    'undebug': 'Hata ayıklamayı devre dışı bırak (Disable debugging)',
    'terminal': 'Terminal ayarlarını yapılandır (Configure terminal settings)',
    'write': 'Yapılandırmayı kaydet (Save configuration)',
    'ping': 'Ağ bağlantısını test et (Test network connectivity)',
    'telnet': 'Telnet ile uzak cihaza bağlan (Connect to remote device via Telnet)',
    'ssh': 'SSH ile uzak cihaza bağlan (Connect to remote device via SSH)',
    'traceroute': 'Hedef cihaza giden yolu göster (Display route to destination)',
    'reload': 'Cihazı yeniden başlat (Reboot device)',
    'exit': 'Oturumu kapat (Exit session)',
    'copy': 'Dosya kopyala (Copy files)',
    'erase': 'Dosya sil (Erase files)',
    'delete': 'Dosya sil (Delete files)',
    'ip': 'IP protokolü ayarları (IP protocol settings)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  config: {
    'hostname': 'Cihaz adını ayarla (Set device hostname)',
    'interface': 'Arayüz yapılandırmasına gir (Enter interface configuration)',
    'vlan': 'VLAN yapılandırmasına gir (Enter VLAN configuration)',
    'enable': 'Enable şifresi ayarla (Set enable password)',
    'service': 'Hizmet ayarları (Service settings)',
    'username': 'Kullanıcı adı oluştur (Create username)',
    'line': 'Hat yapılandırmasına gir (Enter line configuration)',
    'banner': 'Başlık mesajı ayarla (Set banner message)',
    'ip': 'IP protokolü ayarları (IP protocol settings)',
    'ipv6': 'IPv6 protokolü ayarları (IPv6 protocol settings)',
    'crypto': 'Şifreleme ayarları (Encryption settings)',
    'snmp-server': 'SNMP sunucusu ayarları (SNMP server settings)',
    'ntp': 'NTP ayarları (NTP settings)',
    'clock': 'Saat ayarları (Clock settings)',
    'archive': 'Arşiv ayarları (Archive settings)',
    'alias': 'Komut takma adı oluştur (Create command alias)',
    'macro': 'Makro oluştur (Create macro)',
    'no': 'Komutu iptal et (Negate command)',
    'spanning-tree': 'Spanning Tree ayarları (Spanning Tree settings)',
    'vtp': 'VLAN Trunking Protocol ayarları (VTP settings)',
    'cdp': 'CDP ayarları (CDP settings)',
    'exit': 'Yapılandırma modundan çık (Exit configuration mode)',
    'end': 'Yapılandırma modundan çık (Exit configuration mode)',
    'do': 'Ayrıcalıklı komut çalıştır (Execute privileged command)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  interface: {
    'shutdown': 'Arayüzü kapat (Disable interface)',
    'no': 'Komutu iptal et (Negate command)',
    'speed': 'Bağlantı hızını ayarla (Set connection speed)',
    'duplex': 'Duplex modunu ayarla (Set duplex mode)',
    'description': 'Arayüz açıklaması ekle (Add interface description)',
    'switchport': 'Switch portu ayarları (Switchport settings)',
    'cdp': 'CDP ayarları (CDP settings)',
    'spanning-tree': 'Spanning Tree ayarları (Spanning Tree settings)',
    'channel-group': 'EtherChannel grubu ayarla (Set EtherChannel group)',
    'ip': 'IP protokolü ayarları (IP protocol settings)',
    'ssid': 'Kablosuz ağ adı ayarla (Set wireless network name)',
    'encryption': 'Şifreleme türü ayarla (Set encryption type)',
    'channel': 'Kablosuz kanal ayarla (Set wireless channel)',
    'storm-control': 'Fırtına kontrolü ayarları (Storm control settings)',
    'udld': 'UDLD ayarları (UDLD settings)',
    'monitor': 'Port izleme ayarları (Port monitoring settings)',
    'power': 'PoE güç ayarları (PoE power settings)',
    'exit': 'Arayüz yapılandırmasından çık (Exit interface configuration)',
    'end': 'Yapılandırma modundan çık (Exit configuration mode)',
    'do': 'Ayrıcalıklı komut çalıştır (Execute privileged command)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  line: {
    'password': 'Hat şifresi ayarla (Set line password)',
    'login': 'Giriş etkinleştir (Enable login)',
    'no': 'Komutu iptal et (Negate command)',
    'transport': 'Taşıma protokolü ayarla (Set transport protocol)',
    'exec-timeout': 'Oturum zaman aşımı ayarla (Set session timeout)',
    'logging': 'Günlüğe kaydetme ayarları (Logging settings)',
    'history': 'Komut geçmişi ayarları (Command history settings)',
    'privilege': 'Ayrıcalık seviyesi ayarla (Set privilege level)',
    'exit': 'Hat yapılandırmasından çık (Exit line configuration)',
    'end': 'Yapılandırma modundan çık (Exit configuration mode)',
    'do': 'Ayrıcalıklı komut çalıştır (Execute privileged command)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  vlan: {
    'name': 'VLAN adı ayarla (Set VLAN name)',
    'state': 'VLAN durumunu ayarla (Set VLAN state)',
    'no': 'Komutu iptal et (Negate command)',
    'debug': 'Hata ayıklama etkinleştir (Enable debugging)',
    'undebug': 'Hata ayıklamayı devre dışı bırak (Disable debugging)',
    'exit': 'VLAN yapılandırmasından çık (Exit VLAN configuration)',
    'end': 'Yapılandırma modundan çık (Exit configuration mode)',
    'do': 'Ayrıcalıklı komut çalıştır (Execute privileged command)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  'router-config': {
    'network': 'Ağ tanımla (Define network)',
    'router-id': 'Router kimliği ayarla (Set router ID)',
    'passive-interface': 'Pasif arayüz ayarla (Set passive interface)',
    'default-information': 'Varsayılan rota bilgisi (Default route information)',
    'no': 'Komutu iptal et (Negate command)',
    'debug': 'Hata ayıklama etkinleştir (Enable debugging)',
    'undebug': 'Hata ayıklamayı devre dışı bırak (Disable debugging)',
    'exit': 'Router yapılandırmasından çık (Exit router configuration)',
    'end': 'Yapılandırma modundan çık (Exit configuration mode)',
    'do': 'Ayrıcalıklı komut çalıştır (Execute privileged command)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
  'dhcp-config': {
    'network': 'DHCP ağı tanımla (Define DHCP network)',
    'address': 'IP adresi aralığı (IP address range)',
    'default-router': 'Varsayılan ağ geçidi (Default gateway)',
    'dns-server': 'DNS sunucusu (DNS server)',
    'lease': 'Kira süresi (Lease duration)',
    'domain-name': 'Alan adı (Domain name)',
    'no': 'Komutu iptal et (Negate command)',
    'debug': 'Hata ayıklama etkinleştir (Enable debugging)',
    'undebug': 'Hata ayıklamayı devre dışı bırak (Disable debugging)',
    'exit': 'DHCP yapılandırmasından çık (Exit DHCP configuration)',
    'end': 'Yapılandırma modundan çık (Exit configuration mode)',
    'do': 'Ayrıcalıklı komut çalıştır (Execute privileged command)',
    '?': 'Yardım göster (Display help)',
    'help': 'Yardım göster (Display help)',
  },
};

function getInlineHelp(mode: CommandMode, partialInput: string, prompt: string, state?: any): string {
  const modeCommands = commandHelp[mode] || commandHelp.user;
  const modeDescriptions = commandDescriptions[mode] || commandDescriptions.user;
  const lower = partialInput.toLowerCase().trim();

  let suggestions: string[] = [];

  // Special handling for "do <subcommand>" — delegate to privileged mode tree
  // e.g. "do ?" → privileged top-level, "do show ?" → privileged show subtree
  const isDoPrefix = lower === 'do' || lower.startsWith('do ');
  if (isDoPrefix && mode !== 'privileged' && mode !== 'user') {
    const privilegedCommands = commandHelp['privileged'] || {};
    // Strip the "do " prefix to get the sub-command portion
    const subInput = lower === 'do' ? '' : lower.slice(3); // e.g. "show", "show ip", ""

    if (subInput === '') {
      // "do ?" → list all privileged top-level commands
      suggestions = [...(privilegedCommands[''] || [])].filter(
        c => !['configure', 'disable', '?', 'help'].includes(c)
      );
    } else {
      // "do show ?" or "do ping ?" etc. → look up in privileged tree
      if (privilegedCommands[subInput]) {
        suggestions = [...privilegedCommands[subInput]];
      } else {
        // Prefix match in privileged tree
        for (const key of Object.keys(privilegedCommands)) {
          if (key.startsWith(subInput) && key !== subInput) {
            const remaining = key.substring(subInput.length).trim();
            if (remaining) {
              const nextWord = remaining.split(' ')[0];
              if (nextWord && !suggestions.includes(nextWord)) {
                suggestions.push(nextWord);
              }
            }
          }
        }
        // Fallback: commandPatterns in privileged mode
        if (suggestions.length === 0) {
          for (const [name, pattern] of Object.entries(commandPatterns)) {
            if (!pattern.modes.includes('privileged')) continue;
            if (!name.startsWith(subInput + ' ') && name !== subInput) continue;
            const remaining = name.substring(subInput.length).trim();
            if (!remaining) continue;
            const nextWord = remaining.split(' ')[0];
            if (nextWord && !suggestions.includes(nextWord)) {
              suggestions.push(nextWord);
            }
          }
        }
      }
    }
  } else {
    // 1. Exact match in commandHelp tree
    if (modeCommands[lower]) {
      suggestions = [...modeCommands[lower]];
    }

    // 2. Prefix match in commandHelp tree
    if (suggestions.length === 0) {
      for (const key of Object.keys(modeCommands)) {
        if (key.startsWith(lower) && key !== lower) {
          const remaining = key.substring(lower.length).trim();
          if (remaining) {
            const nextWord = remaining.split(' ')[0];
            if (nextWord && !suggestions.includes(nextWord)) {
              suggestions.push(nextWord);
            }
          }
        }
      }
    }

    // 3. Fallback: derive suggestions from commandPatterns for this mode
    //    This handles "no ip ?", multi-word prefixes not in commandHelp tree
    if (suggestions.length === 0) {
      const patternSuggestions: string[] = [];
      for (const [name, pattern] of Object.entries(commandPatterns)) {
        if (!pattern.modes.includes(mode)) continue;
        if (!name.startsWith(lower + ' ') && name !== lower) continue;
        const remaining = name.substring(lower.length).trim();
        if (!remaining) continue;
        const nextWord = remaining.split(' ')[0];
        if (nextWord && !patternSuggestions.includes(nextWord)) {
          patternSuggestions.push(nextWord);
        }
      }
      suggestions = patternSuggestions;
    }

    // 4. User-defined exec alias support
    if (suggestions.length === 0 && state?.execAliases) {
      const userAliases = state.execAliases;
      // Check if input (or its prefix) matches a user alias
      const sortedUserAliases = Object.entries(userAliases)
        .sort((a, b) => b[0].length - a[0].length);
      for (const [alias, fullCommand] of sortedUserAliases as [string, string][]) {
        const aliasLower = alias.toLowerCase();
        // Exact match: "si ?" — resolve and show sub-commands of the resolved command
        if (lower === aliasLower) {
          const resolvedPrefix = fullCommand.trim().toLowerCase();
          // Look up in commandHelp
          if (modeCommands[resolvedPrefix]) {
            suggestions = [...modeCommands[resolvedPrefix]];
          } else {
            // Prefix match on resolved command
            for (const key of Object.keys(modeCommands)) {
              if (key.startsWith(resolvedPrefix) && key !== resolvedPrefix) {
                const remaining = key.substring(resolvedPrefix.length).trim();
                if (remaining) {
                  const nextWord = remaining.split(' ')[0];
                  if (nextWord && !suggestions.includes(nextWord)) {
                    suggestions.push(nextWord);
                  }
                }
              }
            }
          }
          break;
        }
        // Prefix match: "si s" where alias is "si" — resolve and show sub-commands
        if (lower.startsWith(aliasLower + ' ')) {
          const rest = lower.substring(aliasLower.length).trim();
          const resolvedPrefix = (fullCommand + ' ' + rest).trim().toLowerCase();
          if (modeCommands[resolvedPrefix]) {
            suggestions = [...modeCommands[resolvedPrefix]];
          } else {
            for (const key of Object.keys(modeCommands)) {
              if (key.startsWith(resolvedPrefix) && key !== resolvedPrefix) {
                const remaining = key.substring(resolvedPrefix.length).trim();
                if (remaining) {
                  const nextWord = remaining.split(' ')[0];
                  if (nextWord && !suggestions.includes(nextWord)) {
                    suggestions.push(nextWord);
                  }
                }
              }
            }
          }
          break;
        }
      }
    }
  }

  const lines: string[] = [];
  const trimmedInput = partialInput.trim();
  lines.push(prompt + partialInput + '?');
  lines.push('');

  // Check if current input is already a complete command
  let canCR = false;
  const resolved = expandKeywordPrefixes(resolveAliases(trimmedInput, state), mode);
  for (const [name, pattern] of Object.entries(commandPatterns)) {
    if (pattern.modes.includes(mode)) {
      if (pattern.pattern.test(resolved)) {
        canCR = true;
        break;
      }
    }
  }

  if (suggestions.length === 0 && !canCR) {
    lines.push(IOS_ERRORS.unknown);
  } else {
    if (canCR && !suggestions.includes('<cr>')) {
      suggestions.push('<cr>');
    }

    // Kategorize suggestions
    const keywords: string[] = [];
    const parameters: string[] = [];

    suggestions.forEach(cmd => {
      if (cmd) {
        // Parameters are shown in angle brackets (e.g. <ip-address>)
        if (cmd.startsWith('<') && cmd.endsWith('>')) {
          parameters.push(cmd);
        } else {
          keywords.push(cmd);
        }
      }
    });

    // Display keywords first
    if (keywords.length > 0) {
      lines.push('  Komutlar:');
      keywords.forEach(cmd => {
        const description = modeDescriptions[cmd.toLowerCase()];
        if (description) {
          lines.push(`    ${cmd.padEnd(20)} - ${description}`);
        } else {
          lines.push(`    ${cmd}`);
        }
      });
    }

    // Display parameters separately
    if (parameters.length > 0) {
      if (keywords.length > 0) lines.push('');
      lines.push('  Parametreler:');
      parameters.forEach(param => {
        lines.push(`    ${param}`);
      });
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Akıllı ipucu sistemi - Mevcut duruma göre sonraki adımı önerir
 */
function getSmartHint(state: SwitchState, lang: 'tr' | 'en'): string {
  const isTr = lang === 'tr';
  const mode = state.currentMode;

  if (mode === 'user') {
    return isTr
      ? "\n💡 İpucu: Yapılandırma yapmak için 'enable' komutuyla ayrıcalıklı moda geçin."
      : "\n💡 Hint: Enter privileged mode with 'enable' command to start configuration.";
  }

  if (mode === 'privileged') {
    if (!state.hostname || state.hostname === 'Switch' || state.hostname === 'Router') {
      return isTr
        ? "\n💡 İpucu: Cihaza isim vermek için 'conf t' yazıp 'hostname <isim>' komutunu kullanın."
        : "\n💡 Hint: Use 'conf t' followed by 'hostname <name>' to name your device.";
    }
    return isTr
      ? "\n💡 İpucu: Yapılandırma moduna girmek için 'configure terminal' kullanın."
      : "\n💡 Hint: Use 'configure terminal' to enter configuration mode.";
  }

  if (mode === 'config') {
    const hasVlans = Object.keys(state.vlans || {}).length > 1; // vlan1 default
    if (!hasVlans && state.deviceType?.startsWith('switch')) {
      return isTr
        ? "\n💡 İpucu: Yeni bir sanal ağ oluşturmak için 'vlan <id>' komutunu kullanın."
        : "\n💡 Hint: Use 'vlan <id>' to create a new virtual network.";
    }
    return isTr
      ? "\n💡 İpucu: Bir portu yapılandırmak için 'interface <port-id>' komutunu kullanın (Örn: int fa0/1)."
      : "\n💡 Hint: Use 'interface <port-id>' to configure a port (e.g., int fa0/1).";
  }

  if (mode === 'interface') {
    const portId = state.currentInterface || '';
    const port = state.ports[portId];
    if (port && port.shutdown) {
      return isTr
        ? `\n💡 İpucu: ${portId} portunu aktif hale getirmek için 'no shutdown' komutunu kullanın.`
        : `\n💡 Hint: Use 'no shutdown' command to enable port ${portId}.`;
    }
    if (port && port.mode === 'access' && !port.accessVlan) {
      return isTr
        ? "\n💡 İpucu: Bu portu bir VLAN'a atamak için 'switchport access vlan <id>' kullanın."
        : "\n💡 Hint: Use 'switchport access vlan <id>' to assign this port to a VLAN.";
    }
  }

  return '';
}

/**
 * Akıllı hata tahmin ve komut öneri sistemi
 */
export function getEstimatedSuggestions(
  input: string,
  mode: CommandMode,
  state?: SwitchState
): string[] {
  const inputClean = input.trim().toLowerCase();
  if (!inputClean) return [];

  const words = inputClean.split(/\s+/);
  const lastWord = words[words.length - 1];
  const prefix = words.slice(0, -1).join(' ');

  const modeCommands = commandHelp[mode] || commandHelp.user;

  let effectivePrefix = prefix;
  let effectiveLastWord = lastWord;

  // Tüm girdinin geçerli bir prefix olup olmadığını kontrol et (örn: "do")
  const isEntireInputPrefix = !!modeCommands[inputClean] || Object.keys(commandPatterns).some(name => name.startsWith(inputClean + ' '));
  if (isEntireInputPrefix) {
    effectivePrefix = inputClean;
    effectiveLastWord = '';
  }

  // Kullanıcı tanımlı alias desteği
  if (state?.execAliases) {
    const sortedUserAliases = Object.entries(state.execAliases)
      .sort((a, b) => b[0].length - a[0].length);
    for (const [alias, fullCommand] of sortedUserAliases as [string, string][]) {
      const aliasLower = alias.toLowerCase();
      // Tam eşleşme: "si" → "show interfaces"
      if (inputClean === aliasLower) {
        effectivePrefix = fullCommand.trim().toLowerCase();
        effectiveLastWord = '';
        break;
      }
      // Prefix eşleşme: "si " ile başlayan → resolved komut + kalan
      if (inputClean.startsWith(aliasLower + ' ')) {
        const rest = inputClean.substring(aliasLower.length).trim();
        effectivePrefix = (fullCommand.trim().toLowerCase() + ' ' + rest).trim();
        effectiveLastWord = '';
        break;
      }
    }
  }

  const validNextWords = new Set<string>();

  const inferredDeviceType = state
    ? (state.deviceType === 'switch'
      ? (state.switchLayer === 'L3' ? 'switchL3' : 'switchL2')
      : state.deviceType || (state.switchLayer === 'FW' ? 'firewall' : state.switchLayer === 'L3' ? 'switchL3' : 'switchL2'))
    : 'switchL2';
  const capabilities = state ? getDeviceCapabilities({ type: inferredDeviceType } as any, state.switchModel) : undefined;

  // 1. commandHelp ağacından sonraki kelimeleri al
  if (effectivePrefix && modeCommands[effectivePrefix]) {
    modeCommands[effectivePrefix].forEach(cmd => validNextWords.add(cmd));
  } else if (!effectivePrefix) {
    (modeCommands[''] || []).forEach(cmd => validNextWords.add(cmd));
  }

  // 2. commandPatterns ağacından sonraki kelimeleri al
  for (const [patternName, pattern] of Object.entries(commandPatterns)) {
    if (!pattern.modes.includes(mode)) continue;
    if (capabilities && pattern.capability && !capabilities[pattern.capability]) continue;

    const patternWords = patternName.toLowerCase().split(/\s+/);
    if (effectivePrefix) {
      const prefixWords = effectivePrefix.split(/\s+/);
      let matchesPrefix = true;
      for (let i = 0; i < prefixWords.length; i++) {
        if (i >= patternWords.length || !patternWords[i].startsWith(prefixWords[i])) {
          matchesPrefix = false;
          break;
        }
      }
      if (matchesPrefix && patternWords.length > prefixWords.length) {
        validNextWords.add(patternWords[prefixWords.length]);
      }
    } else {
      validNextWords.add(patternWords[0]);
    }
  }

  const cleanNextWords = Array.from(validNextWords)
    .filter(s => s && !s.startsWith('<') && !s.endsWith('>'));

  // Eğer kullanıcının yazdığı son kelime varsa, en yakınları süz
  if (effectiveLastWord) {
    const closeMatches = cleanNextWords.filter(cmd =>
      cmd.startsWith(effectiveLastWord) || getLevenshteinDistance(effectiveLastWord, cmd) <= 2
    );
    if (closeMatches.length > 0) {
      return closeMatches.slice(0, 8);
    }
  }

  return cleanNextWords.slice(0, 8);
}

/**
 * Hata sonuçlarına tahmin önerilerini ekleyen yardımcı fonksiyon
 */
function processCommandResult(
  result: CommandResult,
  input: string,
  mode: CommandMode,
  state: SwitchState,
  language: 'tr' | 'en'
): CommandResult {
  if (
    !result.success &&
    result.error &&
    !result.requiresPassword &&
    !result.newState?.awaitingPassword &&
    !result.error.includes('cancelled') &&
    !result.error.includes('Access denied') &&
    !result.error.includes('Erişim reddedildi')
  ) {
    const suggestions = getEstimatedSuggestions(input, mode, state);
    if (suggestions.length > 0) {
      const suggestionTitle = language === 'tr' ? 'Tahmini Öneriler' : 'Estimated Suggestions';

      // Çift hata önerisi olmaması için mevcut "Bunu mu demek istediniz?" kısmını temizle
      let cleanError = result.error;
      const trIndex = cleanError.indexOf('\n\nBunu mu demek istediniz?');
      if (trIndex !== -1) {
        cleanError = cleanError.substring(0, trIndex);
      }
      const enIndex = cleanError.indexOf('\n\nDid you mean?');
      if (enIndex !== -1) {
        cleanError = cleanError.substring(0, enIndex);
      }

      result = {
        ...result,
        error: `${cleanError}\n\n${suggestionTitle}: ${suggestions.join(', ')}`
      };
    }
  }
  return result;
}

function applyPipeFilterOutput(
  output: string,
  filter: { type: 'include' | 'exclude' | 'begin' | 'section'; query: string }
): string {
  const lines = output.split('\n');
  const q = filter.query.toLowerCase();
  const matchLine = (line: string) => line.toLowerCase().includes(q);

  if (filter.type === 'include') {
    return lines.filter(matchLine).join('\n');
  }

  if (filter.type === 'exclude') {
    return lines.filter((line) => !matchLine(line)).join('\n');
  }

  if (filter.type === 'begin') {
    const idx = lines.findIndex(matchLine);
    return idx >= 0 ? lines.slice(idx).join('\n') : '';
  }

  // section: include matched parent line and its indented sub-lines.
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!matchLine(lines[i])) continue;
    out.push(lines[i]);
    for (let j = i + 1; j < lines.length; j++) {
      const ln = lines[j];
      if (ln.startsWith(' ') || ln.startsWith('\t') || ln.trim() === '!') {
        out.push(ln);
        continue;
      }
      break;
    }
  }
  return out.join('\n');
}

// --- Core executor ---
export function executeCommand(
  state: SwitchState,
  input: string,
  language: 'tr' | 'en' = 'tr',
  devices?: CanvasDevice[],
  connections?: CanvasConnection[],
  deviceStates?: Map<string, SwitchState>,
  sourceDeviceId?: string
): CommandResult {
  if (input === '__CANCEL__') {
    // Cancellation token - handled by useDeviceManager
    return { success: false, error: '% Command cancelled' };
  }

  if (input === '__CONSOLE_CONNECT__') {
    return handleConsoleConnect(state, language);
  }

  // Special reload control tokens from Terminal to avoid normal parsing
  if (input === '__RELOAD_CONFIRM__' || input === '__RELOAD_CANCEL__') {
    // No longer used - reload is immediate
    return { success: false, error: IOS_ERRORS.unknown };
  }

  if (input === '__TELNET_CONNECT__') {
    return handleTelnetConnect(state, language);
  }

  if (input.startsWith('__SSH_CONNECT__')) {
    const sshUser = input.includes(':') ? input.split(':').slice(1).join(':').trim() : '';
    return handleSshConnect(state, language, sshUser || undefined);
  }

  if (state.awaitingPassword) {
    if (input === '__PASSWORD_CANCELLED__') {
      // Password dialog was cancelled (ESC, back, outside click)
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: false,
          passwordContext: undefined,
          consoleAuthenticated: false,
          telnetAuthenticated: false
        }
      };
    }
    return handlePasswordInput(state, input, language);
  }

  let cmdToProcess = input.trim();
  let pipeFilter: { type: 'include' | 'exclude' | 'begin' | 'section'; query: string } | null = null;
  const lowerInput = cmdToProcess.toLowerCase();

  if (state.currentMode === 'privileged') {
    if (lowerInput === 'conf t') cmdToProcess = 'configure terminal';
    if (lowerInput.startsWith('sh ip int br')) cmdToProcess = 'show ip interface brief';
    if (lowerInput.startsWith('show ip interfaces br')) cmdToProcess = 'show ip interface brief';
    if (lowerInput.startsWith('show ip interfaces brief')) cmdToProcess = 'show ip interface brief';
    if (lowerInput.startsWith('sh run')) {
      const pipeIndex = cmdToProcess.indexOf('|');
      if (pipeIndex >= 0) {
        cmdToProcess = `show running-config ${cmdToProcess.slice(pipeIndex)}`;
      } else {
        cmdToProcess = 'show running-config';
      }
    }
    if (lowerInput.startsWith('sh ip ro')) cmdToProcess = 'show ip route';
    if (lowerInput === 'sh ssh' || lowerInput === 'show ssh') cmdToProcess = 'show ssh';
    if (lowerInput === 'wr') cmdToProcess = 'write memory';
    if (lowerInput.startsWith('sh eth')) cmdToProcess = 'show etherchannel';
    if (lowerInput.startsWith('sh etherch')) cmdToProcess = 'show etherchannel';
    if (lowerInput.startsWith('show etherc')) cmdToProcess = 'show etherchannel';
  } else if (state.currentMode === 'user') {
    if (lowerInput === 'en') cmdToProcess = 'enable';
  } else if (state.currentMode === 'config') {
    if (lowerInput.startsWith('int fa')) cmdToProcess = cmdToProcess.replace(/int fa/i, 'interface fastethernet');
    if (lowerInput.startsWith('int gig')) cmdToProcess = cmdToProcess.replace(/int gig/i, 'interface gigabitethernet');
    if (lowerInput.startsWith('int gi')) cmdToProcess = cmdToProcess.replace(/int gi/i, 'interface gigabitethernet');
    if (lowerInput.startsWith('int vlan')) cmdToProcess = cmdToProcess.replace(/int vlan/i, 'interface vlan');
    if (lowerInput.startsWith('show ip interfaces br')) cmdToProcess = 'show ip interface brief';
    if (lowerInput.startsWith('show ip interfaces brief')) cmdToProcess = 'show ip interface brief';
    if (lowerInput === 'show interface trunk') cmdToProcess = 'show interfaces trunk';
    if (lowerInput.startsWith('show cdp neighbor')) cmdToProcess = 'show cdp neighbors';
    if (lowerInput === 'show mac address') cmdToProcess = 'show mac address-table';
  }

  // Special handling for enable command when no password is set
  // Direct console access (no remote session) can bypass this check
  // Remote session = telnet or SSH connection (has telnetAuthenticated flag)
  if (cmdToProcess.toLowerCase() === 'enable') {
    const isRemoteSession = state.telnetAuthenticated || state.consoleAuthenticated;
    if (isRemoteSession) {
      const hasEnablePassword = !!(state.security?.enableSecret || state.security?.enablePassword);
      if (!hasEnablePassword) {
        return {
          success: false,
          error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied'
        };
      }
    }
  }

  const isHelpRequest = (cmdToProcess.endsWith('?') && cmdToProcess.length > 0) ||
    cmdToProcess.toLowerCase().trim() === 'help' ||
    cmdToProcess.toLowerCase().trim().endsWith(' help');

  if (isHelpRequest) {
    let partialInput = '';
    if (cmdToProcess.endsWith('?')) {
      partialInput = cmdToProcess.slice(0, -1).trim();
    } else if (cmdToProcess.toLowerCase().trim().endsWith(' help')) {
      const idx = cmdToProcess.toLowerCase().trim().lastIndexOf(' help');
      partialInput = cmdToProcess.trim().substring(0, idx).trim();
    }
    const prompt = getModePrompt(state.currentMode, state.hostname);
    let helpOutput = getInlineHelp(state.currentMode, partialInput, prompt, state);

    // Add smart hint to help output if it's a general help request
    if (partialInput === '') {
      helpOutput += getSmartHint(state, language);
    }

    return {
      success: true,
      output: helpOutput
    };
  }

  const parsed = parseCommand(cmdToProcess, state.currentMode, state);

  if (!parsed) {
    return { success: true, output: '' };
  }

  const validation = validateCommand(parsed, state.currentMode, state);

  if (!validation.valid) {
    return processCommandResult({
      success: false,
      error: validation.error || 'Unknown error'
    }, cmdToProcess, state.currentMode, state, language);
  }

  const commandName = validation.matchedPattern;
  if (!commandName) {
    return processCommandResult({
      success: false,
      error: IOS_ERRORS.unknown
    }, cmdToProcess, state.currentMode, state, language);
  }

  const ctx: CommandContext = {
    language,
    devices,
    connections,
    deviceStates: ensureDeviceStatesMap(deviceStates),
    sourceDeviceId,
  };

  const inferredDeviceType = state.deviceType === 'switch'
    ? (state.switchLayer === 'L3' ? 'switchL3' : 'switchL2')
    : (state.deviceType || (state.switchLayer === 'FW' ? 'firewall' : state.switchLayer === 'L3' ? 'switchL3' : 'switchL2'));
  const capabilities = getDeviceCapabilities({ type: inferredDeviceType as any } as any, state.switchModel);

  const requiresSwitching = [
    'vlan', 'no vlan', 'switchport', 'spanning-tree', 'vtp', 'show vlan',
    'show mac address-table', 'show spanning-tree', 'show port-security',
    'show interface trunk', 'show interfaces trunk', 'show etherchannel',
    'show storm-control', 'show udld'
  ];
  const requiresRouting = [
    'ip route', 'no ip route', 'router rip', 'router ospf', 'router eigrp',
    'ipv6 route', 'no ipv6 route', 'ipv6 router', 'show ip route', 'show ipv6 route',
    'show ip protocols', 'show ip ospf', 'show ip ospf neighbor'
  ];
  const requiresFirewall = [
    'access-group', 'object network', 'object-group', 'nat', 'same-security-traffic'
  ];

  const needsSwitching = requiresSwitching.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const needsRouting = requiresRouting.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const needsFirewall = requiresFirewall.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));

  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || (state.version?.modelName || '').includes('ASA');
  const isL3Switch = state.switchModel === 'WS-C3650-24PS';
  const isL2Switch = state.switchModel === 'WS-C2960-24TT-L';
  const isRouter = state.deviceType === 'router' || (!isFirewall && !state.deviceType?.startsWith('switch') && capabilities.routing);

  const l3OnlyCommands = [
    'show ip route', 'show ipv6 route', 'show ip protocols', 'show ip ospf', 'show ip ospf neighbor',
    'show mls qos', 'show sdm prefer', 'show ip verify source', 'show ip source binding'
  ];
  const switchOnlyCommands = [
    'show vlan', 'show vlan brief', 'show spanning-tree', 'show port-security', 'show mac address-table',
    'show interfaces trunk', 'show interface trunk', 'show vtp status', 'show etherchannel', 'show udld',
    'show storm-control', 'show errdisable recovery', 'show errdisable detect'
  ];
  const firewallOnlyCommands = ['access-group', 'nat', 'object network', 'object-group'];

  const isL3OnlyCmd = l3OnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isSwitchOnlyCmd = switchOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const isFirewallOnlyCmd = firewallOnlyCommands.some(prefix => commandName === prefix || commandName.startsWith(`${prefix} `));
  const deviceLabel = isFirewall
    ? 'firewall'
    : isRouter
      ? 'router'
      : isL3Switch
        ? 'Layer 3 switch'
        : 'Layer 2 switch';

  if ((needsSwitching && !capabilities.switching) ||
    (needsRouting && !capabilities.routing) ||
    (needsFirewall && !capabilities.firewall) ||
    (isL3OnlyCmd && !(isL3Switch || isRouter)) ||
    (isSwitchOnlyCmd && !(isL2Switch || isL3Switch)) ||
    (isFirewallOnlyCmd && !isFirewall)) {
    return processCommandResult({
      success: false,
      error: `% Invalid input detected at '^' marker.\n${commandName} is not supported on this ${deviceLabel}.`
    }, cmdToProcess, state.currentMode, state, language);
  }

  const pipeMatch = cmdToProcess.match(/^(.*?)\s*\|\s*(include|exclude|begin|section)\s+(.+)$/i);
  if (pipeMatch) {
    pipeFilter = {
      type: pipeMatch[2].toLowerCase() as 'include' | 'exclude' | 'begin' | 'section',
      query: pipeMatch[3].trim(),
    };
    cmdToProcess = pipeMatch[1].trim();
  }

  const commandInput = parsed.resolvedInput || parsed.rawInput;
  let handler = commandHandlers[commandName];

  // Intent-first routing for SHOW family to reduce raw string-prefix coupling.
  if (!handler && parsed.intent?.family === 'show') {
    const lowered = commandInput.toLowerCase();
    const showKey = Object.keys(showHandlers).find(key => lowered === key || lowered.startsWith(`${key} `));
    if (showKey) handler = showHandlers[showKey];
  }

  if (!handler) {
    return { success: true };
  }
  let result = handler(state, commandInput, ctx);
  if (pipeFilter && result.success && typeof result.output === 'string') {
    result = { ...result, output: applyPipeFilterOutput(result.output, pipeFilter) };
  }
  return processCommandResult(result, cmdToProcess, state.currentMode, state, language);
}

// --- Session helpers (kept local) ---
function handleConsoleConnect(state: SwitchState, language: 'tr' | 'en'): CommandResult {
  const needsLogin = !!(state.security.consoleLine.login && state.security.consoleLine.password);

  let output = '';

  // Calculate interface counts for boot message (Reported counts as per user request)
  const isRouter = isRouterModel(state.version.modelName) || isRouterModel(state.switchModel);
  const isL3Switch = state.version.modelName.includes('3650');
  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || state.version.modelName.includes('ASA') || state.version.modelName.includes('Firepower');

  const reportedFeCount = isRouter ? 0 : 24;
  const reportedGiCount = isFirewall
    ? 2
    : (isRouter || isL3Switch) ? 4 : 2;
  const wlanCount = Object.values(state.ports || {}).filter(p => (p?.id || '').startsWith('wlan')).length;

  let ifaceSummary = '';
  if (reportedFeCount > 0) {
    ifaceSummary += `${reportedFeCount} FastEthernet/IEEE 802.3 interface(s)\n`;
  }
  if (reportedGiCount > 0) {
    ifaceSummary += `${reportedGiCount} Gigabit Ethernet/IEEE 802.3 interface(s)`;
  }
  if (wlanCount > 0) {
    ifaceSummary += `\n${wlanCount} 802.11 Wireless interface(s)`;
  }

  // Generate realistic boot messages based on device type
  let bootMessages: string;

  if (isRouter) {
    //  ISR Router boot sequence
    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    bootMessages = language === 'tr' ?
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
ISR4451/K9 platform with 4096 K bytes of memory

${syslog}
Load/bootstrap symbols loaded, GOXR initialization
Reading all bootflash vectors
POST: CPU PCIe port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:router-software.bin...OK!
Extracting files from flash:router-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}` :
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
ISR4451/K9 platform with 4096 K bytes of memory

${syslog}
Load/bootstrap symbols loaded, GOXR initialization
Reading all bootflash vectors
POST: CPU PCIe port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:router-software.bin...OK!
Extracting files from flash:router-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}`;
  } else if (isL3Switch) {
    //  3650 L3 Switch boot sequence
    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    bootMessages = language === 'tr' ?
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C3650 platform with 131072 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU PCIe port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:l3switch-software.bin...OK!
Extracting files from flash:l3switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}` :
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C3650 platform with 131072 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU PCIe port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:l3switch-software.bin...OK!
Extracting files from flash:l3switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}`;
  } else {
    //  2960 L2 Switch boot sequence
    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    bootMessages = language === 'tr' ?
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C2960 platform with 65536 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU Ethernet port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:l2switch-software.bin...OK!
Extracting files from flash:l2switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}` :
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C2960 platform with 65536 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU Ethernet port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:l2switch-software.bin...OK!
Extracting files from flash:l2switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}`;
  }

  output += `${bootMessages}\n`;

  // Display banner MOTD next
  if (state.bannerMOTD) {
    output += `\n${state.bannerMOTD}\n`;
  }

  output += `\nReady!\n\n`;

  if (!needsLogin) {
    // Check if enable password is configured - if not, start in privileged mode
    const needsEnablePassword = !!(state.security?.enableSecret || state.security?.enablePassword);
    const initialMode = needsEnablePassword ? 'user' : 'privileged';

    const prompt = getPrompt({ ...state, currentMode: initialMode });
    output += prompt;
    return {
      success: true,
      output,
      newState: {
        consoleAuthenticated: true,
        currentMode: initialMode
      }
    };
  }

  output += 'User Access Verification\n\nPassword: ';
  return {
    success: true,
    output,
    requiresPassword: true,
    passwordPrompt: 'Password: ',
    passwordContext: 'console',
    newState: {
      consoleAuthenticated: false,
      awaitingPassword: true,
      passwordContext: 'console'
    }
  };
}

function handleTelnetConnect(state: SwitchState, language: 'tr' | 'en'): CommandResult {
  const needsLogin = !!(state.security.vtyLines?.login && state.security.vtyLines?.password);

  let output = '';

  // Calculate interface counts for boot message (Reported counts as per user request)
  const isRouter = isRouterModel(state.version.modelName) || isRouterModel(state.switchModel);
  const isL3Switch = state.version.modelName.includes('3650');
  const isFirewall = state.deviceType === 'firewall' || state.switchLayer === 'FW' || state.version.modelName.includes('ASA') || state.version.modelName.includes('Firepower');

  const reportedFeCount = isRouter ? 0 : 24;
  const reportedGiCount = isFirewall
    ? 2
    : (isRouter || isL3Switch) ? 4 : 2;
  const wlanCount = Object.values(state.ports || {}).filter(p => (p?.id || '').startsWith('wlan')).length;

  let ifaceSummary = '';
  if (reportedFeCount > 0) {
    ifaceSummary += `${reportedFeCount} FastEthernet/IEEE 802.3 interface(s)\n`;
  }
  if (reportedGiCount > 0) {
    ifaceSummary += `${reportedGiCount} Gigabit Ethernet/IEEE 802.3 interface(s)`;
  }
  if (wlanCount > 0) {
    ifaceSummary += `\n${wlanCount} 802.11 Wireless interface(s)`;
  }

  // Generate realistic boot messages based on device type
  let bootMessages: string;

  if (isRouter) {
    //  ISR Router boot sequence
    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    bootMessages = language === 'tr' ?
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
ISR4451/K9 platform with 4096 K bytes of memory

${syslog}
Extracting files from flash:router-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}` :
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
ISR4451/K9 platform with 4096 K bytes of memory

${syslog}
Extracting files from flash:router-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}`;
  } else if (isL3Switch) {
    //  3650 L3 Switch boot sequence
    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    bootMessages = language === 'tr' ?
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C3650 platform with 131072 K bytes of memory

${syslog}
Extracting files from flash:l3switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}` :
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C3650 platform with 131072 K bytes of memory

${syslog}
Extracting files from flash:l3switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}`;
  } else {
    //  2960 L2 Switch boot sequence
    const syslog = language === 'tr' ? '*** Syslog istemcisi başlatıldı' : '*** Syslog client started';
    bootMessages = language === 'tr' ?
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C2960 platform with 65536 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU Ethernet port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:l2switch-software.bin...OK!
Extracting files from flash:l2switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}` :
      `System Bootstrap
Technical Support: http://yunus.sf.net
Copyright (c) 1996-2026 by Network Systems, Inc.
C2960 platform with 65536 K bytes of memory

${syslog}
Load/bootstrap symbols loaded
Reading all bootflash vectors
POST: CPU Ethernet port Check PASS
CPU memory test . . . . . . . . . . . . . OK
Board initialization completed
Initializing flash file system

Booting flash:l2switch-software.bin...OK!
Extracting files from flash:l2switch-software.bin...
  ########## [OK]
  0 bytes remaining in flash device

${ifaceSummary}`;
  }

  output += `${bootMessages}\n`;

  if (!needsLogin) {
    // Display banner MOTD for open access
    if (state.bannerMOTD) {
      output += `\n${state.bannerMOTD}\n`;
    }
    output += `\nReady!\n\n`;

    // Telnet authentication always starts in user mode - enable password required to go to privileged
    const initialMode = 'user';

    const prompt = getPrompt({ ...state, currentMode: initialMode });
    output += prompt;
    return {
      success: true,
      output,
      newState: {
        telnetAuthenticated: true,
        currentMode: initialMode
      }
    };
  }

  // Display banner MOTD before login prompt (and banner login if configured)
  output = '';
  if (state.bannerLogin) {
    output += `${state.bannerLogin}\n`;
  }
  if (state.bannerMOTD) {
    output += `\n${state.bannerMOTD}\n`;
  }

  output += `\nReady!\n\nUser Access Verification\n\nPassword: `;
  return {
    success: true,
    output,
    requiresPassword: true,
    passwordPrompt: 'Password: ',
    passwordContext: 'vty' as const,
    newState: {
      telnetAuthenticated: false,
      awaitingPassword: true,
      passwordContext: 'vty' as const
    }
  };
}

function handleSshConnect(state: SwitchState, language: 'tr' | 'en', requestedUser?: string): CommandResult {
  const existingSessions = Array.isArray(state.sshSessions) ? state.sshSessions : [];
  const nextSourceIndex = existingSessions.length;
  const user = requestedUser || state.sshLastUser || state.hostname || 'admin';
  const source = `vty${nextSourceIndex}`;

  // SSH authentication always starts in user mode - enable password required to go to privileged
  const initialMode = 'user';

  let output = '';
  if (state.bannerLogin) {
    output += `${state.bannerLogin}\n`;
  }
  if (state.bannerMOTD) {
    output += `\n${state.bannerMOTD}\n\n`;
  } else {
    output += '\n';
  }
  output += 'Password: ';
  return {
    success: true,
    output,
    passwordPrompt: 'Password: ',
    passwordContext: 'vty' as const,
    newState: {
      telnetAuthenticated: false,
      awaitingPassword: true,
      passwordContext: 'vty' as const,
      currentMode: initialMode,
      sshLastUser: user,
      sshLastSource: source,
    }
  };
}

function handlePasswordInput(state: SwitchState, password: string, language: 'tr' | 'en'): CommandResult {
  if (state.passwordContext === 'enable') {
    // Check if enable password is configured
    const hasEnablePassword = !!(state.security.enableSecret || state.security.enablePassword);

    if (!hasEnablePassword) {
      return {
        success: false,
        error: language === 'tr' ? '% Parola ayarlanmamış' : '% No password set',
        newState: {
          awaitingPassword: false,
          passwordContext: undefined
        }
      };
    }

    let validPassword = false;

    // Check enable secret (MD5 encrypted)
    if (state.security.enableSecret) {
      const storedSecret = state.security.enableSecret;
      // If stored secret is already encrypted (starts with $1$), compare with encrypted input
      if (storedSecret.startsWith('$1$')) {
        const encryptedInput = encryptMd5Password(password);
        validPassword = encryptedInput === storedSecret;
      } else {
        // Legacy: plain text comparison
        validPassword = password === storedSecret;
      }
    }
    // Check enable password (Type 7 encrypted or plain text)
    else if (state.security.enablePassword) {
      const storedPassword = state.security.enablePassword;
      // If service password encryption is enabled, decrypt and compare
      if (state.security.servicePasswordEncryption) {
        try {
          const decryptedStored = decryptType7Password(storedPassword);
          validPassword = password === decryptedStored;
        } catch {
          // Fallback to plain text comparison if decryption fails
          validPassword = password === storedPassword;
        }
      } else {
        validPassword = password === storedPassword;
      }
    }

    if (validPassword) {
      let output = '';
      // Display exec banner when entering privileged EXEC mode
      if (state.bannerExec) {
        output = `\n${state.bannerExec}\n`;
      }
      if (state.bannerMOTD) {
        output += `\n${state.bannerMOTD}\n\n`;
      }
      return {
        success: true,
        output,
        newState: {
          currentMode: 'privileged',
          awaitingPassword: false,
          passwordContext: undefined
        }
      };
    } else {
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: true,
          passwordContext: 'enable'
        }
      };
    }
  }

  if (state.passwordContext === 'console') {
    const validPassword = password === state.security.consoleLine.password;
    if (validPassword) {
      let output = '';
      if (state.bannerMOTD) {
        output = `\n${state.bannerMOTD}\n\n`;
      }
      const prompt = getPrompt(state);
      output += prompt;
      return {
        success: true,
        output,
        newState: {
          consoleAuthenticated: true,
          awaitingPassword: false,
          passwordContext: undefined
        }
      };
    } else {
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: true,
          passwordContext: 'console'
        }
      };
    }
  }

  if (state.passwordContext === 'vty') {
    const useLocalLogin = !!state.security?.vtyLines?.loginLocal;
    const configuredPassword = state.security.vtyLines.password || '';
    const rawUsers = state.security?.users;
    const configuredUsers: { username: string; password: string; privilege: number }[] = Array.isArray(rawUsers) ? rawUsers : Object.values(rawUsers || {});
    const sshUsername = state.sshLastUser || '';
    const matchedUser = configuredUsers.find(user => user.username.toLowerCase() === sshUsername.toLowerCase());
    const validPassword = useLocalLogin
      ? !!matchedUser && String(matchedUser.password || '') === password
      : password === configuredPassword;
    if (validPassword) {
      const sessionUser = state.sshLastUser || state.hostname || 'admin';
      const sessionSource = state.sshLastSource || 'vty0';
      const existingSessions = Array.isArray(state.sshSessions) ? state.sshSessions : [];
      const nextSessions = [
        ...existingSessions.filter((session) => session.source !== sessionSource),
        { user: sessionUser, source: sessionSource, state: 'established' }
      ];
      let output = '';
      if (state.bannerMOTD) {
        output = `\n${state.bannerMOTD}\n\n`;
      }
      const prompt = getPrompt(state);
      output += prompt;
      return {
        success: true,
        output,
        newState: {
          telnetAuthenticated: true,
          awaitingPassword: false,
          passwordContext: undefined,
          sshSessions: nextSessions,
          sshLastUser: sessionUser,
          sshLastSource: sessionSource,
        }
      };
    } else {
      return {
        success: false,
        error: language === 'tr' ? '% Erişim reddedildi' : '% Access denied',
        newState: {
          awaitingPassword: true,
          passwordContext: 'vty'
        }
      };
    }
  }

  return {
    success: false,
    error: IOS_ERRORS.badPasswords,
    newState: {
      awaitingPassword: true,
      passwordContext: state.passwordContext
    }
  };
}

// --- Placeholder command handlers map ---
// Combine all handler maps into one unified command registry
const commandHandlers: Record<string, CommandHandler> = {
  // System commands
  ...systemHandlers,

  // ASA Firewall commands
  ...firewallHandlers,

  // Show commands
  ...showHandlers,

  // Interface commands
  ...interfaceHandlers,

  // Privileged commands (for "do" commands in config mode)
  ...privilegedHandlers,

  // Global configuration commands - AFTER privileged so these take precedence for overlapping commands
  ...globalConfigHandlers,

  // Router configuration commands (OSPF/RIP)
  ...routerConfigHandlers,

  // Line commands
  ...lineHandlers,

  // Wireless commands
  ...wirelessHandlers,

  // DHCP pool sub-commands (exclude generic 'network' to avoid shadowing router 'network')
  ...Object.fromEntries(Object.entries(dhcpConfigHandlers).filter(([k]) => k !== 'network')),
  'network': (state, input, ctx) => {
    if (state.currentMode === 'dhcp-config') return dhcpConfigHandlers['network'](state, input, ctx);
    if (state.currentMode === 'router-config') return routerConfigHandlers['network'](state, input, ctx);
    return { success: false, error: iosModeError() };
  }
};
