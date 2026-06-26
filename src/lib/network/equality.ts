/**
 * Fast equality helpers for performance-critical paths.
 * BOLT: Replaces expensive JSON.stringify calls in memo comparators and event handlers.
 */

/**
 * Checks if two string arrays are equal by length and content.
 */
export function areArraysEqual(a: string[] | undefined | null, b: string[] | undefined | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Checks if two WiFi configuration objects are equal.
 * Handles both CanvasDevice and CanvasPort WiFi structures.
 */
export function areWifiConfigsEqual(
  a: { ssid: string; security: string; password?: string; channel: string; mode?: string; bssid?: string } | undefined | null,
  b: { ssid: string; security: string; password?: string; channel: string; mode?: string; bssid?: string } | undefined | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.ssid === b.ssid &&
    a.security === b.security &&
    a.password === b.password &&
    a.channel === b.channel &&
    a.mode === b.mode &&
    a.bssid === b.bssid
  );
}
