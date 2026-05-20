export const IOS_ERRORS = {
  invalidInput: "% Invalid input detected at '^' marker.",
  incomplete: '% Incomplete command.',
  ambiguous: '% Ambiguous command',
  unknown: "% Unrecognized command",
  accessDenied: '% Access denied',
  badPasswords: '% Bad passwords',
  marker: '^'
} as const;

export const iosModeError = (input?: string, currentMode?: string, language: 'tr' | 'en' = 'tr'): string => {
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
  };

  const modeName = currentMode ? (modeNames[currentMode] || currentMode) : 'unknown';

  if (language === 'tr') {
    return `% Komut mevcut modda (${modeName}) kullanılamaz.`;
  }
  return `% Command not available in ${modeName} mode.`;
};
