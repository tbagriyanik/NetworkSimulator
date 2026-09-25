/**
 * Helper utility to detect if running in a Desktop build (Tauri / Static Export Desktop app).
 */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_IS_DESKTOP === 'true';
  }

  // Check env flag or window.__TAURI_INTERNALS__ / window.__TAURI__
  const isEnvDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === 'true';
  const isTauriGlobal = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;

  return isEnvDesktop || isTauriGlobal;
}
