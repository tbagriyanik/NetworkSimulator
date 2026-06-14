import { createJSONStorage } from 'zustand/middleware';

const TAB_STORAGE_PREFIX = 'netsim-tab-';
const TAB_ID_KEY = 'netsim-current-tab-id';

export function getTabId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(TAB_ID_KEY, tabId);
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
        return localStorage.getItem(tabKey);
      },
      setItem: (name: string, value: string) => {
        const tabKey = getTabSpecificKey(name);
        localStorage.setItem(tabKey, value);
      },
      removeItem: (name: string) => {
        const tabKey = getTabSpecificKey(name);
        localStorage.removeItem(tabKey);
      },
    };
  });
}

export function getAllTabData(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  
  const tabData: Record<string, any> = {};
  const prefix = TAB_STORAGE_PREFIX;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          tabData[key] = JSON.parse(value);
        }
      } catch {
        // Ignore invalid JSON
      }
    }
  }
  
  return tabData;
}

export function clearTabData(tabId?: string): void {
  if (typeof window === 'undefined') return;
  
  const targetTabId = tabId || getTabId();
  const prefix = `${TAB_STORAGE_PREFIX}${targetTabId}-`;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export function getActiveTabCount(): number {
  if (typeof window === 'undefined') return 1;
  
  const tabIds = new Set<string>();
  const prefix = TAB_STORAGE_PREFIX;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      // Extract tab ID from key format: netsim-tab-{tabId}-{baseKey}
      const match = key.match(/^netsim-tab-([^-]+)-/);
      if (match) {
        tabIds.add(match[1]);
      }
    }
  }
  
  return Math.max(1, tabIds.size);
}

