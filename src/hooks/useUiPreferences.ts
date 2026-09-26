import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from '@/hooks/use-toast';

export interface UiPreferences {
  showMinimap: boolean;
  showZoomToolbar: boolean;
  showEventLogs: boolean;
  showFooter: boolean;
  showDevicePopovers: boolean;
  showPortLabels: boolean;
  snapToGrid: boolean;
  areaOverlayMode: 'none' | 'ospf' | 'vlan' | 'bgp' | 'subnet';
}

export const defaultUiPreferences: UiPreferences = {
  showMinimap: true,
  showZoomToolbar: true,
  showEventLogs: true,
  showFooter: true,
  showDevicePopovers: true,
  showPortLabels: true,
  snapToGrid: true,
  areaOverlayMode: 'none',
};

interface UiPreferencesStore {
  preferences: UiPreferences;
  updatePreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
  resetPreferences: () => void;
}

import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage/safeStorage';

const safeStorage = createJSONStorage(() => ({
  getItem: (key: string) => safeGetItem(key),
  setItem: (key: string, value: string) => {
    safeSetItem(key, value);
  },
  removeItem: (key: string) => {
    safeRemoveItem(key);
  },
}));

export const useUiPreferencesStore = create<UiPreferencesStore>()(
  persist(
    (set) => ({
      preferences: defaultUiPreferences,
      updatePreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },
      resetPreferences: () => {
        set({ preferences: defaultUiPreferences });
        toast({
          title: 'Varsayılan Arayüze Sıfırlandı',
          description: 'Tüm gizlenen bölümler görünür hale getirildi.',
        });
      },
    }),
    {
      name: 'netsim_ui_preferences_v1',
      storage: safeStorage,
    }
  )
);

export function useUiPreferences() {
  const preferences = useUiPreferencesStore((state) => state.preferences);
  const updatePreference = useUiPreferencesStore((state) => state.updatePreference);
  const resetPreferences = useUiPreferencesStore((state) => state.resetPreferences);

  return {
    preferences,
    updatePreference,
    resetPreferences,
  };
}
