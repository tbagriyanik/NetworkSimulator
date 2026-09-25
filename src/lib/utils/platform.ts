/**
 * Platform detection and OS-specific input utilities (Windows, macOS, Linux)
 */

export function isMacPlatform(customUserAgent?: string): boolean {
  if (customUserAgent) {
    return /macintosh|mac os x/i.test(customUserAgent);
  }
  if (typeof navigator !== 'undefined') {
    return /macintosh|mac os x/i.test(navigator.userAgent || '');
  }
  return false;
}

export function getPlatformModifierKey(customUserAgent?: string): 'Meta' | 'Control' {
  return isMacPlatform(customUserAgent) ? 'Meta' : 'Control';
}

export function formatShortcutLabel(key: string, customUserAgent?: string): string {
  const isMac = isMacPlatform(customUserAgent);
  const upperKey = key.toUpperCase();
  if (isMac) {
    return `⌘${upperKey}`;
  }
  return `Ctrl+${upperKey}`;
}
