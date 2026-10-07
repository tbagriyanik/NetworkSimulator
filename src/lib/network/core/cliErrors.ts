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
      trimmed.startsWith('ip dhcp pool ')
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
      trimmed.startsWith('switchport')
    ) {
      return {
        tr: 'Arayüz ayarları için önce ilgili arayüzün içine girmelisiniz: örn. "interface GigabitEthernet0/1" veya "int fa0/1"',
        en: 'Enter interface mode first: e.g. "interface GigabitEthernet0/1" or "int fa0/1"'
      };
    }
  }

  // 4. Yazım hataları için düzeltme önerileri
  if (trimmed === 'conft' || trimmed === 'conf  t' || trimmed === 'conft t') {
    return {
      tr: 'Bunu mu demek istediniz: "conf t" veya "configure terminal"',
      en: 'Did you mean: "conf t" or "configure terminal"'
    };
  }

  if (trimmed === 'shw' || trimmed === 'sho' || trimmed.startsWith('shw ') || trimmed.startsWith('sho ')) {
    return {
      tr: 'Bunu mu demek istediniz: "show ..."',
      en: 'Did you mean: "show ..."'
    };
  }

  return undefined;
}


