import { createJSONStorage } from 'zustand/middleware';
import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeGetSessionItem,
  safeSetSessionItem,
  safeGetStorageKeys,
} from '@/lib/storage/safeStorage';

const TAB_STORAGE_PREFIX = 'netsim-tab-';
const TAB_ID_KEY = 'netsim-current-tab-id';

export function getTabId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let tabId = safeGetSessionItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    safeSetSessionItem(TAB_ID_KEY, tabId);
  }
  return tabId;
}

export function getTabSpecificKey(baseKey: string): string {
  const tabId = getTabId();
  return `${TAB_STORAGE_PREFIX}${tabId}-${baseKey}`;
}

export function createTabSpecificStorage() {
  return createJSONStorage(() => {
    if (typeof window === 'undefined') {
      // Return a mock storage for server-side rendering
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      };
    }
    
    return {
      getItem: (name: string) => {
        const tabKey = getTabSpecificKey(name);
        return safeGetItem(tabKey);
      },
      setItem: (name: string, value: string) => {
        const tabKey = getTabSpecificKey(name);
        safeSetItem(tabKey, value);
      },
      removeItem: (name: string) => {
        const tabKey = getTabSpecificKey(name);
        safeRemoveItem(tabKey);
      },
    };
  });
}

export function clearTabData(tabId?: string): void {
  const targetTabId = tabId || getTabId();
  const prefix = `${TAB_STORAGE_PREFIX}${targetTabId}-`;
  const keysToRemove = safeGetStorageKeys(prefix);
  keysToRemove.forEach(key => safeRemoveItem(key));
}

export function getActiveTabCount(): number {
  const tabIds = new Set<string>();
  const keys = safeGetStorageKeys(TAB_STORAGE_PREFIX);
  
  for (const key of keys) {
    // Extract tab ID from key format: netsim-tab-{tabId}-{baseKey}
    const match = key.match(/^netsim-tab-([^-]+)-/);
    if (match) {
      tabIds.add(match[1]);
    }
  }
  
  return Math.max(1, tabIds.size);
}

