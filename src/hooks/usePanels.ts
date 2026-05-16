'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';

interface PanelState {
  showPCPanel: boolean;
  showFirewallPanel: boolean;
  activeFirewallId: string | null;
  firewallActiveTab: 'console' | 'settings';
  pcPanelInitialTab: 'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot';
  showPCDeviceId: string;
  showRouterPanel: boolean;
  showRouterDeviceId: string;
  showUnifiedDeviceModal: boolean;
  unifiedDeviceActiveTab: 'console' | 'settings';
  showAboutModal: boolean;
  showMobileMenu: boolean;
  isEnvironmentPanelOpen: boolean;
  showProjectPicker: boolean;
  projectPickerTab: 'all' | 'guided';
  showOnboarding: boolean;
  onboardingStep: number;
}

interface PanelActions {
  setShowPCPanel: Dispatch<SetStateAction<boolean>>;
  setShowFirewallPanel: Dispatch<SetStateAction<boolean>>;
  setActiveFirewallId: Dispatch<SetStateAction<string | null>>;
  setFirewallActiveTab: Dispatch<SetStateAction<'console' | 'settings'>>;
  setPcPanelInitialTab: Dispatch<SetStateAction<'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot'>>;
  setShowPCDeviceId: Dispatch<SetStateAction<string>>;
  setShowRouterPanel: Dispatch<SetStateAction<boolean>>;
  setShowRouterDeviceId: Dispatch<SetStateAction<string>>;
  setShowUnifiedDeviceModal: Dispatch<SetStateAction<boolean>>;
  setUnifiedDeviceActiveTab: Dispatch<SetStateAction<'console' | 'settings'>>;
  setShowAboutModal: Dispatch<SetStateAction<boolean>>;
  setShowMobileMenu: Dispatch<SetStateAction<boolean>>;
  setIsEnvironmentPanelOpen: Dispatch<SetStateAction<boolean>>;
  setShowProjectPicker: Dispatch<SetStateAction<boolean>>;
  setProjectPickerTab: Dispatch<SetStateAction<'all' | 'guided'>>;
  setShowOnboarding: Dispatch<SetStateAction<boolean>>;
  setOnboardingStep: Dispatch<SetStateAction<number>>;
  closeAllPanels: () => void;
}

export function usePanels(): PanelState & PanelActions {
  const [showPCPanel, setShowPCPanel] = useState(false);
  const [showFirewallPanel, setShowFirewallPanel] = useState(false);
  const [activeFirewallId, setActiveFirewallId] = useState<string | null>(null);
  const [firewallActiveTab, setFirewallActiveTab] = useState<'console' | 'settings'>('console');
  const [pcPanelInitialTab, setPcPanelInitialTab] = useState<'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot'>('home');
  const [showPCDeviceId, setShowPCDeviceId] = useState<string>('pc-1');
  const [showRouterPanel, setShowRouterPanel] = useState(false);
  const [showRouterDeviceId, setShowRouterDeviceId] = useState<string>('router-1');
  const [showUnifiedDeviceModal, setShowUnifiedDeviceModal] = useState(false);
  const [unifiedDeviceActiveTab, setUnifiedDeviceActiveTab] = useState<'console' | 'settings'>('console');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isEnvironmentPanelOpen, setIsEnvironmentPanelOpen] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectPickerTab, setProjectPickerTab] = useState<'all' | 'guided'>('all');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const closeAllPanels = () => {
    setShowPCPanel(false);
    setShowFirewallPanel(false);
    setShowRouterPanel(false);
    setShowUnifiedDeviceModal(false);
    setShowAboutModal(false);
    setShowMobileMenu(false);
    setIsEnvironmentPanelOpen(false);
    setShowProjectPicker(false);
    setShowOnboarding(false);
  };

  return {
    showPCPanel, setShowPCPanel,
    showFirewallPanel, setShowFirewallPanel,
    activeFirewallId, setActiveFirewallId,
    firewallActiveTab, setFirewallActiveTab,
    pcPanelInitialTab, setPcPanelInitialTab,
    showPCDeviceId, setShowPCDeviceId,
    showRouterPanel, setShowRouterPanel,
    showRouterDeviceId, setShowRouterDeviceId,
    showUnifiedDeviceModal, setShowUnifiedDeviceModal,
    unifiedDeviceActiveTab, setUnifiedDeviceActiveTab,
    showAboutModal, setShowAboutModal,
    showMobileMenu, setShowMobileMenu,
    isEnvironmentPanelOpen, setIsEnvironmentPanelOpen,
    showProjectPicker, setShowProjectPicker,
    projectPickerTab, setProjectPickerTab,
    showOnboarding, setShowOnboarding,
    onboardingStep, setOnboardingStep,
    closeAllPanels,
  };
}
