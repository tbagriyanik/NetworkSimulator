/**
 * Global Admin Session Manager for Router/WLC Web Admin and IoT Web Panel.
 * Stores authenticated sessions in memory and session/local storage
 * so that srcDoc iframe reloads / re-renders / navigation do not kick the user back to the login screen.
 */

const authenticatedRouters = new Set<string>();
let isIotAuthenticated = false;

function safeStorage(action: () => void): void {
  try {
    if (typeof window !== 'undefined') {
      action();
    }
  } catch (err) {
    // Storage access may be restricted in sandboxed contexts or private mode
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[adminSessionManager] Storage operation suppressed:', err);
    }
  }
}

export function isRouterAuthenticated(deviceId: string): boolean {
  if (!deviceId) return false;
  if (authenticatedRouters.has(deviceId)) return true;
  let authenticated = false;
  safeStorage(() => {
    const key = `router_admin_auth_${deviceId}`;
    if (window.sessionStorage?.getItem(key) === 'true' || window.localStorage?.getItem(key) === 'true') {
      authenticatedRouters.add(deviceId);
      authenticated = true;
    }
  });
  return authenticated;
}

export function setRouterAuthenticated(deviceId: string, authenticated: boolean): void {
  if (!deviceId) return;
  if (authenticated) {
    authenticatedRouters.add(deviceId);
  } else {
    authenticatedRouters.delete(deviceId);
  }
  safeStorage(() => {
    const key = `router_admin_auth_${deviceId}`;
    if (authenticated) {
      window.sessionStorage?.setItem(key, 'true');
      window.localStorage?.setItem(key, 'true');
    } else {
      window.sessionStorage?.removeItem(key);
      window.localStorage?.removeItem(key);
    }
  });
}

export function isIotPanelAuthenticated(): boolean {
  if (isIotAuthenticated) return true;
  let authenticated = false;
  safeStorage(() => {
    if (window.sessionStorage?.getItem('iotPanelAuthenticated') === 'true' || window.localStorage?.getItem('iotPanelAuthenticated') === 'true') {
      isIotAuthenticated = true;
      authenticated = true;
    }
  });
  return authenticated;
}

export function setIotPanelAuthenticated(authenticated: boolean): void {
  isIotAuthenticated = authenticated;
  safeStorage(() => {
    if (authenticated) {
      window.sessionStorage?.setItem('iotPanelAuthenticated', 'true');
      window.localStorage?.setItem('iotPanelAuthenticated', 'true');
    } else {
      window.sessionStorage?.removeItem('iotPanelAuthenticated');
      window.localStorage?.removeItem('iotPanelAuthenticated');
    }
  });
}

export function clearAllAdminSessions(): void {
  authenticatedRouters.forEach((deviceId) => {
    safeStorage(() => {
      const key = `router_admin_auth_${deviceId}`;
      window.sessionStorage?.removeItem(key);
      window.localStorage?.removeItem(key);
    });
  });
  authenticatedRouters.clear();
  isIotAuthenticated = false;
  safeStorage(() => {
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
  });
}
