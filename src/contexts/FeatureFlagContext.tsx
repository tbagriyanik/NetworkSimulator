'use client';

import { createContext, useState, useEffect, useMemo } from 'react';
import { secureStorage } from '@/lib/storage/secureStorage';

export interface FeatureFlags {
  modernShell: boolean;
  accessibilityEnhancements: boolean;
  performanceGuardrails: boolean;
}

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  setFlag: (key: keyof FeatureFlags, enabled: boolean) => void;
}

const defaultFlags: FeatureFlags = {
  modernShell: true,
  accessibilityEnhancements: true,
  performanceGuardrails: true,
};

const STORAGE_KEY = 'netsim_feature_flags';

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  useEffect(() => {
    try {
      const saved = secureStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setTimeout(() => setFlags({ ...defaultFlags, ...parsed }), 0);
          }
        } catch {
          // ignore malformed stored JSON
        }
      }
    } catch {
      // ignore malformed flag payloads
    }
  }, []);

  useEffect(() => {
    try {
      secureStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {
      // ignore persistence failures
    }
  }, [flags]);

  const value = useMemo(() => ({
    flags,
    setFlag: (key: keyof FeatureFlags, enabled: boolean) => {
      setFlags(prev => ({ ...prev, [key]: enabled }));
    },
  }), [flags]);

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}


