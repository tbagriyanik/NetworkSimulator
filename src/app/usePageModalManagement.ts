import { useEffect, useRef } from 'react';

interface PageModalManagementOptions {
  hasUnsavedChanges: boolean;
  modalHistoryPushedRef: { current: boolean };
  showMobileMenu: boolean;
  confirmDialog: unknown;
  saveDialog: unknown;
  showPCPanel: boolean;
  showFirewallPanel: boolean;
  showRouterPanel: boolean;
  showUnifiedDeviceModal: boolean;
  showAboutModal: boolean;
  showProjectPicker: boolean;
  showOnboarding: boolean;
  setShowMobileMenu: (value: boolean) => void;
  setConfirmDialog: (value: null) => void;
  setSaveDialog: (value: null) => void;
  setShowPCPanel: (value: boolean) => void;
  setShowRouterPanel: (value: boolean) => void;
  setShowUnifiedDeviceModal: (value: boolean) => void;
  setShowAboutModal: (value: boolean) => void;
  setShowProjectPicker: (value: boolean) => void;
  setShowOnboarding: (value: boolean) => void;
  setShowBasarilarim: (value: boolean) => void;
}

export function usePageModalManagement(options: PageModalManagementOptions): void {
  const { hasUnsavedChanges } = options;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handlePopState = () => {
      const opts = optionsRef.current;
      opts.setShowMobileMenu(false);
      opts.setConfirmDialog(null);
      opts.setSaveDialog(null);
      opts.setShowProjectPicker(false);
      opts.setShowOnboarding(false);
      opts.setShowBasarilarim(false);
      window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'back' } }));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}
