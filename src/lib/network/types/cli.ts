// CLI and Command Execution Types

import type { SwitchState } from './switchState';

export type CommandMode =
  | 'user'           // Switch>
  | 'privileged'     // Switch#
  | 'config'         // Switch(config)#
  | 'interface'      // Switch(config-if)#
  | 'config-if-range' // Switch(config-if-range)#
  | 'line'           // Switch(config-line)#
  | 'vlan'           // Switch(config-vlan)#
  | 'router-config'  // Router(config-router)#
  | 'dhcp-config'    // Router(dhcp-config)#
  | 'ssid-config'    // Router(config-ssid)#
  | 'dot11-config'   // Router(config-if)# [dot11Radio]
  | 'ap-config'      // AP configuration mode
  | 'config-std-nacl'  // Router(config-std-nacl)# - Named standard ACL
  | 'config-ext-nacl'  // Router(config-ext-nacl)# - Named extended ACL
  | 'config-ipv6-acl'  // Router(config-ipv6-acl)# - Named IPv6 ACL
  | 'config-mst'        // Switch(config-mst)# - MST configuration mode
  | 'config-route-map'  // Router(config-route-map)# - Route-map configuration mode
  | 'config-flow-record'   // Router(config-flow-record)# - Flexible NetFlow record mode
  | 'config-flow-exporter' // Router(config-flow-exporter)# - Flexible NetFlow exporter mode
  | 'config-flow-monitor'  // Router(config-flow-monitor)# - Flexible NetFlow monitor mode
  | 'config-applet';       // Router(config-applet)# - EEM applet mode

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  realismLevel?: 'real' | 'stub' | 'sim-only';
  hint?: string | { tr: string; en: string };
  newState?: Partial<SwitchState>;
  deviceStates?: Map<string, SwitchState>; // Cross-device state updates (e.g., port security violations)
  updatedDeviceStates?: Map<string, SwitchState>; // Cross-device state updates (e.g., STP recalculation)
  modeChange?: CommandMode;
  requiresPassword?: boolean;        // Şifre gerekiyor mu?
  passwordPrompt?: string;           // Şifre istemi metni
  passwordContext?: 'enable' | 'console' | 'vty';        // Şifre bağlamı
  requiresConfirmation?: boolean;    // Onay gerekiyor mu?
  confirmationMessage?: string;      // Onay mesajı
  confirmationAction?: string;       // Onay sonrası yapılacak işlem
  requiresReloadConfirm?: boolean;   // Reload sonrası Enter ile onay gerekiyor mu?
  telnetTarget?: { host: string; port: string };  // Telnet bağlantı hedefi
  reloadDevice?: boolean;            // Cihazı sıfırla
  saveConfig?: boolean;  // running-config'i startup-config'e kaydet
  saveFlashConfig?: boolean;  // running-config'i flash'a kaydet
  flashFilename?: string;  // flash dosya adı (örn: running-config)
  restoreFlashConfig?: boolean;  // flash'tan startup-config'e geri yükle
  flashSourceFilename?: string;  // kaynak flash dosya adı
  eraseConfig?: boolean;  // startup-config'i sil
  deleteVlanDat?: boolean;  // vlan.dat dosyasını sil
  triggerPingAnimation?: string;  // Animatör başlatmak için hedef cihaz ID'si
  exitSession?: boolean;  // Oturum sonlandırma bayrağı
  requiresTelnetPassword?: boolean;  // Telnet için şifre gerekiyor mu?
  requiresSshPassword?: boolean;  // SSH için şifre gerekiyor mu?
  sshTarget?: { host: string; username?: string; port: number };  // SSH bağlantı hedefi
  sourceDeviceId?: string;             // Telnet bağlantı hedef IP
}

export interface ParsedCommand {
  command: string;
  args: string[];
  rawInput: string;
  resolvedInput?: string;  // Alias-resolved input for executor
  intent?: {
    family: 'show' | 'interface' | 'routing' | 'system' | 'security' | 'other';
    action: string;
  };
}

export type ValidationReason = 'ok' | 'ambiguous' | 'incomplete' | 'invalid-mode' | 'unknown-command';

export interface CommandValidationResult {
  valid: boolean;
  reason: ValidationReason;
  error?: string;
  matchedPattern?: string;
}
