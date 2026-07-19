'use client';

import { useEffect, type RefObject, type Dispatch, type SetStateAction } from 'react';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '@/components/network/Terminal';

export function useKeyboardShortcuts({
  showMobileMenu,
  confirmDialog,
  saveDialog,
  showPCPanel,
  showRouterPanel,
  showFirewallPanel,
  showUnifiedDeviceModal,
  showAboutModal,
  showProjectPicker,
  showOnboarding,
  isTimelineMinimized,
  selectedDevice,
  activeDeviceId,
  activeTab,
  topologyDevices,
  activeTabRef,
  fileInputRef,
  handleSaveProject,
  handleNewProject,
  handleUndo,
  handleRedo,
  handleDeviceDoubleClick,
  handleRefreshNetwork,
  closeEscLikeWindows,
  getOrCreateDeviceState,
  getOrCreateDeviceOutputs,
  setShowMobileMenu,
  setShowPCPanel,
  setShowRouterPanel,
  setShowProjectPicker,
  setShowAboutModal,
  setTopologyKey,
  setIsTimelineMinimized,
  setClearSelectionTrigger,
  setSelectedDevice,
  setActiveDeviceId,
  setActiveDeviceType,
  setActiveTab,
  setUnifiedDeviceActiveTab,
  setShowUnifiedDeviceModal,
  tabs,
}: {
  showMobileMenu: boolean;
  confirmDialog: { show: boolean; onConfirm: () => void } | null;
  saveDialog: { show: boolean; onConfirm: (save: boolean) => void } | null;
  showPCPanel: boolean;
  showRouterPanel: boolean;
  showFirewallPanel: boolean;
  showUnifiedDeviceModal: boolean;
  showAboutModal: boolean;
  showProjectPicker: boolean;
  showOnboarding: boolean;
  isTimelineMinimized: boolean;
  selectedDevice: DeviceType | null;
  activeDeviceId: string;
  activeTab: string;
  topologyDevices: CanvasDevice[];
  activeTabRef: RefObject<string | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleSaveProject: () => void;
  handleNewProject: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleDeviceDoubleClick: (type: DeviceType, id: string) => void;
  handleRefreshNetwork: () => void;
  closeEscLikeWindows: () => void;
  getOrCreateDeviceState: (deviceId: string, deviceType: DeviceType, initialHostname?: string, initialMac?: string, switchModel?: string) => SwitchState;
  getOrCreateDeviceOutputs: (deviceId: string, deviceStateArg?: SwitchState) => TerminalOutput[];
  setShowMobileMenu: Dispatch<SetStateAction<boolean>>;
  setShowPCPanel: Dispatch<SetStateAction<boolean>>;
  setShowRouterPanel: Dispatch<SetStateAction<boolean>>;
  setShowProjectPicker: Dispatch<SetStateAction<boolean>>;
  setShowAboutModal: Dispatch<SetStateAction<boolean>>;
  setTopologyKey: Dispatch<SetStateAction<number>>;
  setIsTimelineMinimized: Dispatch<SetStateAction<boolean>>;
  setClearSelectionTrigger: Dispatch<SetStateAction<number>>;
  setSelectedDevice: Dispatch<SetStateAction<DeviceType | null>>;
  setActiveDeviceId: Dispatch<SetStateAction<string>>;
  setActiveDeviceType: Dispatch<SetStateAction<DeviceType>>;
  setActiveTab: (tab: 'topology' | 'terminal' | 'cmd' | 'tasks') => void;
  setUnifiedDeviceActiveTab: Dispatch<SetStateAction<'console' | 'settings' | 'stp'>>;
  setShowUnifiedDeviceModal: Dispatch<SetStateAction<boolean>>;
  tabs: { label: string }[];
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1' || e.code === 'F1') {
        e.preventDefault();
        setShowAboutModal(prev => !prev);
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        setTopologyKey(prev => prev + 1);
        handleRefreshNetwork();
        return;
      }

      if (e.key === 'Escape') {
        if (!showPCPanel) {
          closeEscLikeWindows();
        }
      }

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();

        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

        if (key === 'p') {
          e.preventDefault();
          if (activeTabRef.current !== 'topology') {
            setActiveTab('topology');
            setTimeout(() => window.print(), 150);
          } else {
            window.print();
          }
        }

        if (key === 'z') {
          if (activeTabRef.current === 'topology' && !isEditable) {
            e.preventDefault();
            handleUndo();
          }
        }
        if (key === 'y') {
          if (activeTabRef.current === 'topology' && !isEditable) {
            e.preventDefault();
            handleRedo();
          }
        }
        if (key === 's') {
          e.preventDefault();
          handleSaveProject();
        }
        if (key === 'o') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
        if (key === 'n' && !e.shiftKey) {
          e.preventDefault();
          handleNewProject();
        }
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'n') {
          e.preventDefault();
          handleNewProject();
        }
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;
        const isWindowFocused = document.hasFocus();
        const isTopologyOnly = activeTabRef.current === 'topology'
          && !showPCPanel
          && !showRouterPanel
          && !showFirewallPanel
          && !showUnifiedDeviceModal
          && !showProjectPicker
          && !showAboutModal
          && !showOnboarding
          && !showMobileMenu;

        if (!isEditable && isTopologyOnly) {
          const isQuoteToggle = e.key === '"' || e.code === 'Quote';
          if (isQuoteToggle) {
            e.preventDefault();
            if (isWindowFocused && isTimelineMinimized) {
              setIsTimelineMinimized(false);
            } else {
              setIsTimelineMinimized(prev => !prev);
            }
            return;
          }
        }
      }

      if (e.key === 'Tab') {
        if (showProjectPicker) {
          return;
        }
        if (activeTab === 'topology' && topologyDevices.length > 0 && !showPCPanel && !showRouterPanel && !showUnifiedDeviceModal) {
          e.preventDefault();

          if (selectedDevice) {
            setSelectedDevice(null);
            setClearSelectionTrigger(prev => prev + 1);
          }

          const currentIndex = topologyDevices.findIndex(d => d.id === activeDeviceId);
          const direction = e.shiftKey ? -1 : 1;
          const nextIndex = currentIndex === -1
            ? (direction > 0 ? 0 : topologyDevices.length - 1)
            : (currentIndex + direction + topologyDevices.length) % topologyDevices.length;
          const nextDevice = topologyDevices[nextIndex];
          if (nextDevice) {
            setActiveDeviceId(nextDevice.id);
            setActiveDeviceType(nextDevice.type);
          }
        }
      }

      if (e.key === 'Enter') {
        if (e.defaultPrevented) return;
        if (showUnifiedDeviceModal || showAboutModal || showPCPanel || showFirewallPanel || showRouterPanel || showProjectPicker || showOnboarding || !!confirmDialog?.show || !!saveDialog?.show) {
          return;
        }
        if (confirmDialog?.show) {
          e.preventDefault();
          confirmDialog.onConfirm();
        } else if (saveDialog?.show) {
          e.preventDefault();
          saveDialog.onConfirm(true);
        } else if (activeTab === 'topology' && activeDeviceId && !activeDeviceId.startsWith('note-')) {
          e.preventDefault();
          const device = topologyDevices.find(d => d.id === activeDeviceId);
          if (device) {
            if (device.type === 'router' || device.type === 'switchL2' || device.type === 'switchL3') {
              const deviceState = getOrCreateDeviceState(device.id, device.type, device.name, device.macAddress, device.switchModel);
              getOrCreateDeviceOutputs(device.id, deviceState);
              setActiveDeviceId(device.id);
              setActiveDeviceType(device.type);
              setUnifiedDeviceActiveTab('console');
              setShowUnifiedDeviceModal(true);
            } else {
              handleDeviceDoubleClick(device.type, device.id);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel, showProjectPicker, handleSaveProject, handleNewProject, handleUndo, handleRedo, tabs, setShowMobileMenu, setShowPCPanel, setShowRouterPanel, setShowProjectPicker, setActiveTab, activeTab, topologyDevices, handleDeviceDoubleClick, handleRefreshNetwork, closeEscLikeWindows]);
}
