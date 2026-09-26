import { useCallback, useEffect } from 'react';
import { errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';
import { safeGetItem, safeSetItem } from '@/lib/storage/safeStorage';

interface UseOnboardingProps {
  t: Record<string, string>;
  setShowOnboarding: (show: boolean) => void;
  setOnboardingStep: React.Dispatch<React.SetStateAction<number>>;
  onboardingStep: number;
  isAppLoading?: boolean;
  hasHydrated?: boolean;
}

export function useOnboarding({
  t,
  setShowOnboarding,
  setOnboardingStep,
  onboardingStep,
  isAppLoading,
  hasHydrated = true,
}: UseOnboardingProps) {
  // Onboarding: show once per browser only after app loading finishes
  useEffect(() => {
    if (isAppLoading || !hasHydrated) return;
    try {
      const seen = safeGetItem('netsim_onboarding_seen');
      if (!seen) {
        setShowOnboarding(true);
        setOnboardingStep(0);
      }
    } catch (err) {
      errorHandler.logError(
        STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({
          operation: 'getOnboardingStatus',
          error: String(err),
        })
      );
    }
  }, [setShowOnboarding, setOnboardingStep, isAppLoading, hasHydrated]);

  const onboardingSteps = [
    {
      title: t.tutorialWelcomeTitle,
      description: t.tutorialWelcomeDesc,
    },
    {
      title: t.tutorialTopologyTitle,
      description: t.tutorialTopologyDesc,
    },
    {
      title: t.tutorialCablesTitle,
      description: t.tutorialCablesDesc,
    },
    {
      title: t.tutorialDevicesTitle,
      description: t.tutorialDevicesDesc,
    },
    {
      title: t.tutorialPingTitle,
      description: t.tutorialPingDesc,
    },
    {
      title: t.tutorialWifiTitle,
      description: t.tutorialWifiDesc,
    },
    {
      title: t.tutorialProjectTitle,
      description: t.tutorialProjectDesc,
    },
    {
      title: t.tutorialThemeTitle,
      description: t.tutorialThemeDesc,
    },
    {
      title: t.tutorialReadyTitle,
      description: t.tutorialReadyDesc,
    },
  ];

  const closeOnboardingForever = useCallback(() => {
    try {
      safeSetItem('netsim_onboarding_seen', '1');
    } catch (err) {
      errorHandler.logError(
        STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({
          operation: 'setOnboardingSeen',
          error: String(err),
        })
      );
    }
    setShowOnboarding(false);
  }, [setShowOnboarding]);

  const nextOnboarding = useCallback(() => {
    if (onboardingStep >= onboardingSteps.length - 1) {
      closeOnboardingForever();
      return;
    }
    setOnboardingStep((s) => Math.min(s + 1, onboardingSteps.length - 1));
  }, [onboardingStep, onboardingSteps.length, closeOnboardingForever, setOnboardingStep]);

  const prevOnboarding = useCallback(() => {
    setOnboardingStep((s) => Math.max(0, s - 1));
  }, [setOnboardingStep]);

  return {
    onboardingSteps,
    closeOnboardingForever,
    nextOnboarding,
    prevOnboarding,
  };
}
