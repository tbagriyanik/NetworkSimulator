import { Repeat, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getAlternativeCliCommands(isTR: boolean): CommandDefinition {
  return {
    id: 'alt_cli_compat',
    icon: Repeat,
    title: isTR ? 'Alternatif CLI Uyumluluğu' : 'Alternative CLI Compatibility',
    type: 'commands',
    cmds: [
      ['system-view / sys', isTR ? 'Yapılandırma moduna geç (configure terminal)' : 'Enter configuration mode (configure terminal)', '> / #'],
      ['undo <komut>', isTR ? 'Komutu geri al / iptal et (no <komut> dinamik eşleşme)' : 'Negate / remove command (dynamic no <command>)', '(config)#'],
      ['display current-configuration / dis cur', isTR ? 'Aktif yapılandırmayı göster (show running-config)' : 'Display active config (show running-config)', '#'],
      ['display saved-configuration', isTR ? 'Başlangıç yapılandırmasını göster (show startup-config)' : 'Display startup config (show startup-config)', '#'],
      ['display ip interface brief / dis ip int br', isTR ? 'Arayüz IP özetini göster (show ip interface brief)' : 'Display interface IP summary (show ip interface brief)', '#'],
      ['display ip routing-table / dis ip ro', isTR ? 'Yönlendirme tablosunu göster (show ip route)' : 'Display IP routing table (show ip route)', '#'],
      ['display vlan', isTR ? 'VLAN özet tablosunu göster (show vlan brief)' : 'Display VLAN summary (show vlan brief)', '#'],
      ['display arp', isTR ? 'ARP tablosunu göster (show ip arp)' : 'Display ARP table (show ip arp)', '#'],
      ['display mac-address', isTR ? 'MAC adres tablosunu göster (show mac address-table)' : 'Display MAC table (show mac address-table)', '#'],
      ['display stp', isTR ? 'Spanning Tree durumunu göster (show spanning-tree)' : 'Display Spanning Tree status (show spanning-tree)', '#'],
      ['display version / dis ver', isTR ? 'Sürüm bilgisini göster (show version)' : 'Display system software version (show version)', '#'],
      ['display clock', isTR ? 'Sistem saatini göster (show clock)' : 'Display system clock (show clock)', '#'],
      ['display lldp neighbor', isTR ? 'LLDP komşularını göster (show lldp neighbors)' : 'Display LLDP neighbors (show lldp neighbors)', '#'],
      ['display ip pool', isTR ? 'DHCP havuz durumunu göster (show ip dhcp pool)' : 'Display DHCP pool status (show ip dhcp pool)', '#'],
      ['return', isTR ? 'Ayrıcalıklı moda dön (end)' : 'Return to privileged mode (end)', '(config)#'],
      ['quit / q', isTR ? 'Mevcut alt moddan çık (exit)' : 'Exit current sub-mode (exit)'],
    ]
  };
}
