'use client';

import { useEffect, type RefObject, type Dispatch, type SetStateAction } from 'react';
import type { CanvasDevice, DeviceType } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { TerminalOutput } from '@/components/network/Terminal';
import { useAppStore } from '@/lib/store/appStore';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';

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
  getOrCreateDeviceState: (deviceId: string, deviceType: DeviceType, initialHostname?: string, initialMac?: string, switchModel?: string, initialServices?: CanvasDevice['services']) => SwitchState;
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
  setUnifiedDeviceActiveTab: Dispatch<SetStateAction<'console' | 'settings' | 'stp' | 'physical'>>;
  setShowUnifiedDeviceModal: Dispatch<SetStateAction<boolean>>;
  tabs: { label: string }[];
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAnyModalOpen = Boolean(
        showAboutModal ||
        showProjectPicker ||
        showOnboarding ||
        showUnifiedDeviceModal ||
        showPCPanel ||
        showRouterPanel ||
        showFirewallPanel ||
        showMobileMenu ||
        confirmDialog?.show ||
        saveDialog?.show ||
        document.querySelector('[data-cable-port-selector]')
      );

      const focusedElement = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      const isEditable = Boolean(
        focusedElement && (
          focusedElement.tagName === 'INPUT' ||
          focusedElement.tagName === 'TEXTAREA' ||
          focusedElement.getAttribute('contenteditable') === 'true' ||
          focusedElement.closest('[data-note-id], textarea, input, select, [contenteditable="true"]')
        )
      );

      const isWindowInteriorFocused = Boolean(
        focusedElement?.closest('[data-code-editor], [data-modal-content], [data-slot="dialog-content"], [role="dialog"], .dialog-content')
      );

      const isModalOrWindowActive = isAnyModalOpen || isWindowInteriorFocused;

      const isCodeEditorFocused = Boolean(
        (e.target as HTMLElement | null)?.closest?.('[data-code-editor]')
      );
      const isTerminalInputFocused = Boolean(
        (e.target as HTMLElement | null)?.closest?.('[data-terminal-input]')
      );
      if (isModalOrWindowActive) {
        const isTabKey = e.key === 'Tab' || e.code === 'Tab';
        // Shift+Tab inside a CLI/CMD terminal window opens the window switcher
        // (Tab still passes through for command completion).
        if (isTabKey && isTerminalInputFocused && e.shiftKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (!useMultiWindowStore.getState().isSwitcherOpen) {
            const activeWindowId = useWindowStore.getState().activeWindowId;
            useMultiWindowStore.getState().openSwitcher(activeWindowId, true);
          }
          return;
        }
        // Terminal inputs handle Tab themselves (command completion); code editors handle Tab (indent).
        if (isTabKey && (isCodeEditorFocused || isTerminalInputFocused)) {
          // pass through to the element's own handler
        } else if (isTabKey) {
          // Focus trap for modals/dialogs: cycle Tab/Shift+Tab within the dialog.
          const container = (e.target as HTMLElement | null)?.closest?.(
            '[data-modal-content], [data-slot="dialog-content"], [role="dialog"], .dialog-content'
          );
          const focusables = container
            ? Array.from(
              container.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              )
            ).filter((el) => {
              const s = getComputedStyle(el);
              return s.display !== 'none' && s.visibility !== 'hidden';
            })
            : [];
          if (focusables.length > 0) {
            const idx = focusables.indexOf(document.activeElement as HTMLElement);
            const nextIdx = e.shiftKey
              ? idx <= 0 ? focusables.length - 1 : idx - 1
              : idx === -1 ? 0 : (idx + 1) % focusables.length;
            e.preventDefault();
            e.stopImmediatePropagation();
            focusables[nextIdx]?.focus();
            return;
          }
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }
      }

      if (e.key === 'F1' || e.code === 'F1') {
        if (isEditable) return;
        e.preventDefault();
        setShowAboutModal(prev => !prev);
        return;
      }

      if (e.key === 'F5') {
        if (isModalOrWindowActive || isEditable) return;
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

      // Tab and Shift+Tab pass through to interior controls when a modal/window or note/input is active
      if (e.key === 'Tab' || e.code === 'Tab') {
        if (isModalOrWindowActive || isEditable) {
          return;
        }

        if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (useMultiWindowStore.getState().isSwitcherOpen) {
            return;
          }
          const activeWindowId = useWindowStore.getState().activeWindowId;
          useMultiWindowStore.getState().openSwitcher(activeWindowId, e.shiftKey);
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (isModalOrWindowActive) {
          return;
        }

        const key = e.key.toLowerCase();

        if (key === 'p') {
          if (isEditable) return;
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
          if (isEditable) return;
          e.preventDefault();
          fileInputRef.current?.click();
        }
        if (key === 'n' && !e.shiftKey) {
          if (isEditable) return;
          e.preventDefault();
          handleNewProject();
        }
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (isModalOrWindowActive || isEditable) {
          return;
        }

        const key = e.key.toLowerCase();
        if (key === 'n') {
          e.preventDefault();
          handleNewProject();
        } else if (key === 'f') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('trigger-topology-zoom-to-fit'));
        } else if (key === 'm') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('trigger-topology-toggle-minimap'));
        } else if (key === 'l') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('trigger-topology-toggle-network-log'));
        }
      }


      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (isModalOrWindowActive || isEditable) {
          return;
        }

        const isWindowFocused = document.hasFocus();
        const isTopologyOnly = activeTabRef.current === 'topology'
          && !isAnyModalOpen;

        if (isTopologyOnly) {
          const key = e.key.toLowerCase();
          if (key === 's') {
            e.preventDefault();
            const current = useAppStore.getState().topology.isSimulationMode;
            useAppStore.getState().setSimulationMode(!current);
            return;
          }

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

      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        if (isModalOrWindowActive || isEditable) {
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

            const windowStore = useMultiWindowStore.getState();
            if (windowStore.isWindowOpen(nextDevice.id)) {
              windowStore.restoreWindow(nextDevice.id);
              useWindowStore.getState().setActiveWindow(nextDevice.id);
            }
          }
        }
      }

      if (e.key === 'Enter') {
        if (e.defaultPrevented || isModalOrWindowActive || isEditable) return;
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
            handleDeviceDoubleClick(device.type, device.id);
          }

        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    showMobileMenu, confirmDialog, saveDialog, showPCPanel, showRouterPanel,
    showFirewallPanel, showUnifiedDeviceModal, showAboutModal, showProjectPicker,
    showOnboarding, isTimelineMinimized, selectedDevice, activeDeviceId, activeTab,
    topologyDevices, handleSaveProject, handleNewProject, handleUndo, handleRedo,
    handleDeviceDoubleClick, handleRefreshNetwork, closeEscLikeWindows,
    getOrCreateDeviceState, getOrCreateDeviceOutputs, setShowAboutModal,
    setTopologyKey, setIsTimelineMinimized, setClearSelectionTrigger, setSelectedDevice,
    setActiveDeviceId, setActiveDeviceType, setActiveTab, setUnifiedDeviceActiveTab,
    setShowUnifiedDeviceModal
  ]);
}
