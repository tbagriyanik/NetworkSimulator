import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from '@/hooks/use-toast';

export interface UiPreferences {
  showMinimap: boolean;
  showZoomToolbar: boolean;
  showEventLogs: boolean;
  showFooter: boolean;
  showDevicePopovers: boolean;
}

export const defaultUiPreferences: UiPreferences = {
  showMinimap: true,
  showZoomToolbar: true,
  showEventLogs: true,
  showFooter: true,
  showDevicePopovers: true,
};

interface UiPreferencesStore {
  preferences: UiPreferences;
  updatePreference: (key: keyof UiPreferences, value: boolean) => void;
  resetPreferences: () => void;
}

const memoryStore = new Map<string, string>();

const safeStorage = createJSONStorage(() => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }
  return {
    getItem: (key: string) => memoryStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
    },
  };
});

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
