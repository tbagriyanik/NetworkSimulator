export const CLI_ERRORS = {
  invalidInput: "% Invalid input detected at '^' marker.",
  incomplete: '% Incomplete command.',
  ambiguous: '% Ambiguous command',
  unknown: "% Unrecognized command",
  accessDenied: '% Access denied',
  badPasswords: '% Bad passwords',
  marker: '^'
} as const;

export const cliModeError = (currentMode?: string): string => {
  const modeNames: Record<string, string> = {
    user: 'User EXEC',
    privileged: 'Privileged EXEC',
    config: 'Global Configuration',
    interface: 'Interface Configuration',
    'config-if-range': 'Interface Range Configuration',
    line: 'Line Configuration',
    vlan: 'VLAN Configuration',
    'router-config': 'Router Configuration',
    'dhcp-config': 'DHCP Pool Configuration',
    'ssid-config': 'SSID Configuration',
    'dot11-config': 'Dot11 Radio Configuration',
    'ap-config': 'AP Configuration',
  };

  const modeName = currentMode ? (modeNames[currentMode] || currentMode) : 'unknown';

  return `% Command not available in ${modeName} mode.`;
};

/**
 * Öğrenciler için hata alındığında veya yanlış modda komut girildiğinde
 * yol gösterici eğitici ipuçları üretir.
 */
export function getStudentCliHint(input: string, currentMode?: string): { tr: string; en: string } | undefined {
  const trimmed = input.trim().toLowerCase();

  // 1. User EXEC modunda privileged komutu girilmeye çalışıldığında
  if (currentMode === 'user') {
    if (
      trimmed.startsWith('conf') ||
      trimmed.startsWith('show run') ||
      trimmed.startsWith('show ip route') ||
      trimmed.startsWith('reload') ||
      trimmed.startsWith('write') ||
      trimmed === 'wr'
    ) {
      return {
        tr: 'Bu komut için önce Privileged EXEC moduna geçmelisiniz: "enable"',
        en: 'Enter Privileged EXEC mode first: "enable"'
      };
    }
    if (trimmed.startsWith('ping ') && trimmed.includes('/')) {
      return {
        tr: 'Ping komutunda subnet maskesi (CIDR /) kullanılmaz. Yalnızca hedef IP girin: örn. "ping 192.168.1.1"',
        en: 'Do not use subnet mask (CIDR /) with ping. Enter only the destination IP: e.g. "ping 192.168.1.1"'
      };
    }
    if (trimmed.startsWith('ping') || trimmed.startsWith('traceroute') || trimmed.startsWith('trace')) {
      return {
        tr: 'Bu komut User EXEC modunda da çalışır. Ayrıntılı ping için "enable" ile Privileged moda geçin.',
        en: 'This command works in User EXEC mode. For extended ping, enter Privileged mode with "enable".'
      };
    }
  }

  // 2. Privileged EXEC modunda config komutu girilmeye çalışıldığında
  if (currentMode === 'privileged') {
    if (
      trimmed.startsWith('interface') ||
      trimmed.startsWith('int ') ||
      trimmed.startsWith('router ') ||
      trimmed.startsWith('vlan ') ||
      trimmed.startsWith('ip route ') ||
      trimmed.startsWith('hostname ') ||
      trimmed.startsWith('ip dhcp pool ') ||
      trimmed.startsWith('spanning-tree') ||
      trimmed.startsWith('access-list') ||
      trimmed.startsWith('no ')
    ) {
      return {
        tr: 'Yapılandırma komutları için Global Config moduna geçmelisiniz: "configure terminal" (veya "conf t")',
        en: 'Enter Global Config mode first: "configure terminal" (or "conf t")'
      };
    }
  }

  // 3. Config modunda interface komutları girildiğinde
  if (currentMode === 'config') {
    if (
      trimmed === 'no shut' ||
      trimmed === 'no shutdown' ||
      trimmed.startsWith('ip add') ||
      trimmed.startsWith('switchport') ||
      trimmed.startsWith('duplex') ||
      trimmed.startsWith('speed') ||
      trimmed.startsWith('shutdown')
    ) {
      return {
        tr: 'Arayüz ayarları için önce ilgili arayüzün içine girmelisiniz: örn. "interface GigabitEthernet0/1" veya "int fa0/1"',
        en: 'Enter interface mode first: e.g. "interface GigabitEthernet0/1" or "int fa0/1"'
      };
    }
    if (trimmed.startsWith('network ') && !trimmed.includes('ospf') && !trimmed.includes('rip') && !trimmed.includes('eigrp')) {
      return {
        tr: '"network" komutu routing protokolü modu veya DHCP pool modunda kullanılır. "router ospf 1" veya "ip dhcp pool <isim>" ile doğru moda girin.',
        en: '"network" command is used in routing protocol or DHCP pool mode. Enter the correct mode first with "router ospf 1" or "ip dhcp pool <name>".'
      };
    }
  }

  // 4. Alt config modlarda exit/end karışıklığı
  if (
    (currentMode === 'interface' || currentMode === 'config-if-range' ||
     currentMode === 'router-config' || currentMode === 'dhcp-config') &&
    (trimmed === 'quit' || trimmed === 'logout')
  ) {
    return {
      tr: 'Bir üst moda dönmek için "exit" kullanın. Doğrudan Privileged moda dönmek için "end" veya Ctrl+Z kullanın.',
      en: 'Use "exit" to go back one level. Use "end" or Ctrl+Z to return directly to Privileged EXEC mode.'
    };
  }

  // 5. Yazım hataları için düzeltme önerileri
  if (trimmed === 'conft' || trimmed === 'conf  t' || trimmed === 'conft t') {
    return {
      tr: 'Bunu mu demek istediniz: "conf t" veya "configure terminal"',
      en: 'Did you mean: "conf t" or "configure terminal"'
    };
  }

  if (trimmed === 'shw' || trimmed === 'sho' || trimmed.startsWith('shw ') || trimmed.startsWith('sho ')) {
    return {
      tr: 'Bunu mu demek istediniz: "show ..."\nÖneri: show ip int brief | show run | show ip route',
      en: 'Did you mean: "show ..."\nSuggestion: show ip int brief | show run | show ip route'
    };
  }

  if (trimmed === 'en' || trimmed === 'enab' || trimmed === 'enabl') {
    return {
      tr: 'Bunu mu demek istediniz: "enable"',
      en: 'Did you mean: "enable"'
    };
  }

  if (trimmed === 'wr mem' || trimmed === 'wri mem' || trimmed === 'writ mem') {
    return {
      tr: 'Bunu mu demek istediniz: "write memory" veya kısaca "wr"',
      en: 'Did you mean: "write memory" or shortly "wr"'
    };
  }

  if (trimmed === 'copy run start' || trimmed === 'copy r s' || trimmed === 'copy runn start') {
    return {
      tr: 'Bunu mu demek istediniz: "copy running-config startup-config"',
      en: 'Did you mean: "copy running-config startup-config"'
    };
  }

  if (trimmed.startsWith('sh ip') && !trimmed.startsWith('show')) {
    return {
      tr: 'Bunu mu demek istediniz: "show ip ..."?\nÖrnekler: show ip int brief | show ip route | show ip ospf neighbor',
      en: 'Did you mean: "show ip ..."?\nExamples: show ip int brief | show ip route | show ip ospf neighbor'
    };
  }

  if (trimmed === 'no sh' || trimmed === 'no shu' || trimmed === 'noshutdown' || trimmed === 'noshut') {
    return {
      tr: 'Bunu mu demek istediniz: "no shutdown"\nNot: Bu komut interface modunda kullanılır. Önce "interface <isim>" ile arayüze girin.',
      en: 'Did you mean: "no shutdown"\nNote: This command is used in interface mode. Enter interface mode first.'
    };
  }

  // 6. IP adresi ve Subnet maske biçim hataları
  if (trimmed.startsWith('ip address ') || trimmed.startsWith('ip add ')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length === 3 && parts[2] !== 'dhcp') {
      return {
        tr: 'Eksik parametre: IP adresi bir subnet maskesi gerektirir (örn. "ip address 192.168.1.1 255.255.255.0").',
        en: 'Incomplete parameter: IP address requires a subnet mask (e.g., "ip address 192.168.1.1 255.255.255.0").'
      };
    }
  }

  // 7. Sık yapılan genel yazım hataları
  if (trimmed === 'conf' || trimmed === 'config') {
    return {
      tr: 'Bunu mu demek istediniz: "configure terminal" (veya "conf t")',
      en: 'Did you mean: "configure terminal" (or "conf t")'
    };
  }

  if (trimmed.startsWith('ping ') && trimmed.includes('/')) {
    return {
      tr: 'Ping komutunda subnet maskesi (CIDR /) kullanılmaz. Yalnızca hedef IP girin: örn. "ping 192.168.1.1"',
      en: 'Do not use subnet mask (CIDR /) with ping. Enter only the destination IP: e.g. "ping 192.168.1.1"'
    };
  }

  return undefined;
}
