import { useEffect } from 'react';
import type { PCActiveTab } from './PCPanel.types';

interface UsePCPanelGlobalNavOptions {
  isVisible: boolean;
  isMobile?: boolean;
  searchOpen: boolean;
  httpAppContent: string | null;
  setHttpAppContent: (c: string | null) => void;
  setHttpAppDeviceId: (id: string | null) => void;
  activeTab: PCActiveTab;
  goHome: () => void;
  onClose: () => void;
}

/**
 * Global navigation handler (Escape key & mobile back button).
 * Extracted from PCPanel orchestrator.
 */
export function usePCPanelGlobalNav({
  isVisible,
  searchOpen,
  httpAppContent,
  setHttpAppContent,
  setHttpAppDeviceId,
  activeTab,
  goHome,
  onClose,
}: UsePCPanelGlobalNavOptions) {
  useEffect(() => {
    if (!isVisible) return;

    const handleNavigation = () => {
      // If search is open, let it handle itself
      if (searchOpen) return;

      // If HTTP content is open, close it first
      if (httpAppContent) {
        setHttpAppContent(null);
        setHttpAppDeviceId(null);
        return true; // Handled
      }

      // If a program is open, go back to home
      if (activeTab !== 'home') {
        goHome();
        return true; // Handled
      } else {
        // If already on home, close the panel
        onClose();
        return true; // Handled
      }
    };

    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (handleNavigation()) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isVisible, activeTab, goHome, onClose, httpAppContent, searchOpen]);
}
