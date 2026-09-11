/**
 * Global Admin Session Manager for Router/WLC Web Admin and IoT Web Panel.
 * Stores authenticated sessions in memory and session/local storage
 * so that srcDoc iframe reloads / re-renders / navigation do not kick the user back to the login screen.
 */

const authenticatedRouters = new Set<string>();
let isIotAuthenticated = false;

export function isRouterAuthenticated(deviceId: string): boolean {
  if (!deviceId) return false;
  if (authenticatedRouters.has(deviceId)) return true;
  try {
    if (typeof window !== 'undefined') {
      const key = `router_admin_auth_${deviceId}`;
      if (window.sessionStorage?.getItem(key) === 'true' || window.localStorage?.getItem(key) === 'true') {
        authenticatedRouters.add(deviceId);
        return true;
      }
    }
  } catch {}
  return false;
}

export function setRouterAuthenticated(deviceId: string, authenticated: boolean): void {
  if (!deviceId) return;
  if (authenticated) {
    authenticatedRouters.add(deviceId);
  } else {
    authenticatedRouters.delete(deviceId);
  }
  try {
    if (typeof window !== 'undefined') {
      const key = `router_admin_auth_${deviceId}`;
      if (authenticated) {
        window.sessionStorage?.setItem(key, 'true');
        window.localStorage?.setItem(key, 'true');
      } else {
        window.sessionStorage?.removeItem(key);
        window.localStorage?.removeItem(key);
      }
    }
  } catch {}
}

export function isIotPanelAuthenticated(): boolean {
  if (isIotAuthenticated) return true;
  try {
    if (typeof window !== 'undefined') {
      if (window.sessionStorage?.getItem('iotPanelAuthenticated') === 'true' || window.localStorage?.getItem('iotPanelAuthenticated') === 'true') {
        isIotAuthenticated = true;
        return true;
      }
    }
  } catch {}
  return false;
}

export function setIotPanelAuthenticated(authenticated: boolean): void {
  isIotAuthenticated = authenticated;
  try {
    if (typeof window !== 'undefined') {
      if (authenticated) {
        window.sessionStorage?.setItem('iotPanelAuthenticated', 'true');
        window.localStorage?.setItem('iotPanelAuthenticated', 'true');
      } else {
        window.sessionStorage?.removeItem('iotPanelAuthenticated');
        window.localStorage?.removeItem('iotPanelAuthenticated');
      }
    }
  } catch {}
}

export function clearAllAdminSessions(): void {
  authenticatedRouters.forEach((deviceId) => {
    try {
      if (typeof window !== 'undefined') {
        const key = `router_admin_auth_${deviceId}`;
        window.sessionStorage?.removeItem(key);
        window.localStorage?.removeItem(key);
      }
    } catch {}
  });
  authenticatedRouters.clear();
  isIotAuthenticated = false;
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.removeItem('iotPanelAuthenticated');
      window.localStorage?.removeItem('iotPanelAuthenticated');
      if (window.sessionStorage) {
        Object.keys(window.sessionStorage).forEach((key) => {
          if (key.startsWith('router_admin_auth_')) window.sessionStorage.removeItem(key);
        });
      }
      if (window.localStorage) {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('router_admin_auth_')) window.localStorage.removeItem(key);
        });
      }
    }
  } catch {}
}
