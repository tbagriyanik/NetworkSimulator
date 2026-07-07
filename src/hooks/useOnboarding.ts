import { useCallback, useEffect } from 'react';
import { errorHandler, STORAGE_ERRORS } from '@/lib/errors/errorHandler';

interface UseOnboardingProps {
  t: Record<string, string>;
  setShowOnboarding: (show: boolean) => void;
  setOnboardingStep: React.Dispatch<React.SetStateAction<number>>;
  onboardingStep: number;
}

export function useOnboarding({
  t,
  setShowOnboarding,
  setOnboardingStep,
  onboardingStep,
}: UseOnboardingProps) {
  // Onboarding: show once per browser
  useEffect(() => {
    try {
      const seen = localStorage.getItem('netsim_onboarding_seen');
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
  }, [setShowOnboarding, setOnboardingStep]);

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
      localStorage.setItem('netsim_onboarding_seen', '1');
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
