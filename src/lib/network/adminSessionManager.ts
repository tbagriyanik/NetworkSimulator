/**
 * Global Admin Session Manager for Router/WLC Web Admin and IoT Web Panel.
 * Stores authenticated sessions in memory and session/local storage
 * so that srcDoc iframe reloads / re-renders / navigation do not kick the user back to the login screen.
 */

import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeGetSessionItem,
  safeSetSessionItem,
  safeRemoveSessionItem,
  safeGetStorageKeys,
} from '@/lib/storage/safeStorage';

const authenticatedRouters = new Set<string>();
let isIotAuthenticated = false;

export function isRouterAuthenticated(deviceId: string): boolean {
  if (!deviceId) return false;
  if (authenticatedRouters.has(deviceId)) return true;
  const key = `router_admin_auth_${deviceId}`;
  if (safeGetSessionItem(key) === 'true' || safeGetItem(key) === 'true') {
    authenticatedRouters.add(deviceId);
    return true;
  }
  return false;
}

export function setRouterAuthenticated(deviceId: string, authenticated: boolean): void {
  if (!deviceId) return;
  if (authenticated) {
    authenticatedRouters.add(deviceId);
  } else {
    authenticatedRouters.delete(deviceId);
  }
  const key = `router_admin_auth_${deviceId}`;
  if (authenticated) {
    safeSetSessionItem(key, 'true');
    safeSetItem(key, 'true');
  } else {
    safeRemoveSessionItem(key);
    safeRemoveItem(key);
  }
}

export function isIotPanelAuthenticated(): boolean {
  if (isIotAuthenticated) return true;
  if (safeGetSessionItem('iotPanelAuthenticated') === 'true' || safeGetItem('iotPanelAuthenticated') === 'true') {
    isIotAuthenticated = true;
    return true;
  }
  return false;
}

export function setIotPanelAuthenticated(authenticated: boolean): void {
  isIotAuthenticated = authenticated;
  if (authenticated) {
    safeSetSessionItem('iotPanelAuthenticated', 'true');
    safeSetItem('iotPanelAuthenticated', 'true');
  } else {
    safeRemoveSessionItem('iotPanelAuthenticated');
    safeRemoveItem('iotPanelAuthenticated');
  }
}

export function clearAllAdminSessions(): void {
  authenticatedRouters.forEach((deviceId) => {
    const key = `router_admin_auth_${deviceId}`;
    safeRemoveSessionItem(key);
    safeRemoveItem(key);
  });
  authenticatedRouters.clear();
  isIotAuthenticated = false;
  safeRemoveSessionItem('iotPanelAuthenticated');
  safeRemoveItem('iotPanelAuthenticated');

  const routerAuthKeys = safeGetStorageKeys('router_admin_auth_');
  routerAuthKeys.forEach((key) => {
    safeRemoveSessionItem(key);
    safeRemoveItem(key);
  });
}
