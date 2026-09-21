import { useCallback, useEffect } from 'react';
import type { CanvasDevice, CanvasConnection, CanvasNote } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';
import type { RefreshNetworkReport } from '@/hooks/useRefreshReport';

interface UsePageTopologyActionsParams {
  t: Translations;
  hasUnsavedChanges: boolean;
  isExamActive: boolean;
  handleSaveProject: () => void;
  closeExam: () => void;
  resetWorkspaceUiState: () => void;
  resetToEmptyProject: () => void;
  closeAllPanels: () => void;
  setDevices: (devices: CanvasDevice[]) => void;
  setConnections: (connections: CanvasConnection[]) => void;
  setDeviceStates: (states: Map<string, SwitchState>) => void;
  setNotes: (notes: CanvasNote[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setProjectName: (name: string) => void;
  setProjectSearchQuery: (query: string) => void;
  setShowProjectPicker: (show: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;
  setConfirmDialog: React.Dispatch<React.SetStateAction<{ show: boolean; message: string; action: string; onConfirm: () => void } | null>>;
  setSaveDialog: (dialog: { show: boolean; message: string; onConfirm: (save: boolean) => void } | null) => void;
  setShowPCPanel: (show: boolean) => void;
  setShowRouterPanel: (show: boolean) => void;
  setShowUnifiedDeviceModal: (show: boolean) => void;
  setShowAboutModal: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setShowBasarilarim: (show: boolean) => void;
  setShowTeacherPanel: (show: boolean) => void;
  setShowRoomJoinDialog: (show: boolean) => void;
  setIsGeneratorOpen: (show: boolean) => void;
  setRefreshNetworkReport: React.Dispatch<React.SetStateAction<RefreshNetworkReport | null>>;
  refreshNetworkReport: RefreshNetworkReport | null;
  refreshReportRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
}

export function usePageTopologyActions({
  t,
  hasUnsavedChanges,
  isExamActive,
  handleSaveProject,
  closeExam,
  resetWorkspaceUiState,
  resetToEmptyProject,
  closeAllPanels,
  setDevices,
  setConnections,
  setDeviceStates,
  setNotes,
  setZoom,
  setPan,
  setProjectName,
  setProjectSearchQuery,
  setShowProjectPicker,
  setShowMobileMenu,
  setConfirmDialog,
  setSaveDialog,
  setShowPCPanel,
  setShowRouterPanel,
  setShowUnifiedDeviceModal,
  setShowAboutModal,
  setShowOnboarding,
  setShowBasarilarim,
  setShowTeacherPanel,
  setShowRoomJoinDialog,
  setIsGeneratorOpen,
  setRefreshNetworkReport,
  refreshNetworkReport,
  refreshReportRef,
  isMobile,
}: UsePageTopologyActionsParams) {
  const closeEscLikeWindows = useCallback(() => {
    setShowMobileMenu(false);
    setConfirmDialog(null);
    setSaveDialog(null);
    setShowPCPanel(false);
    setShowRouterPanel(false);
    setShowUnifiedDeviceModal(false);
    setShowAboutModal(false);
    setShowProjectPicker(false);
    setShowOnboarding(false);
    setShowBasarilarim(false);
    setShowTeacherPanel(false);
    setShowRoomJoinDialog(false);
    setIsGeneratorOpen(false);
    if (!isExamActive) {
      setRefreshNetworkReport((prev) => (prev ? { ...prev, show: false } : null));
    }
    window.dispatchEvent(new CustomEvent('close-menus-broadcast', { detail: { source: 'escape' } }));
  }, [
    isExamActive,
    setRefreshNetworkReport,
    setShowTeacherPanel,
    setShowRoomJoinDialog,
    setShowMobileMenu,
    setConfirmDialog,
    setSaveDialog,
    setShowPCPanel,
    setShowRouterPanel,
    setShowUnifiedDeviceModal,
    setShowAboutModal,
    setShowProjectPicker,
    setShowOnboarding,
    setShowBasarilarim,
    setIsGeneratorOpen,
  ]);

  useEffect(() => {
    const handleMobileBack = () => {
      closeEscLikeWindows();
      closeAllPanels();
    };
    window.addEventListener('mobile-back-pressed', handleMobileBack as EventListener);
    return () => window.removeEventListener('mobile-back-pressed', handleMobileBack as EventListener);
  }, [closeAllPanels, closeEscLikeWindows]);

  const runWithSaveGuard = useCallback(
    (action: () => void) => {
      if (hasUnsavedChanges) {
        setSaveDialog({
          show: true,
          message: t.unsavedChangesConfirm,
          onConfirm: (save: boolean) => {
            setSaveDialog(null);
            if (save) {
              handleSaveProject();
            }
            action();
          },
        });
        return;
      }
      action();
    },
    [hasUnsavedChanges, handleSaveProject, setSaveDialog, t.unsavedChangesConfirm]
  );

  const handleGeneratedTopology = useCallback(
    (data: {
      devices: CanvasDevice[];
      connections: CanvasConnection[];
      deviceStates: Map<string, SwitchState>;
      projectName?: string;
      projectDescription?: string;
    }) => {
      resetWorkspaceUiState();
      resetToEmptyProject();
      setDevices(data.devices);
      setConnections(data.connections);
      setDeviceStates(data.deviceStates);
      setNotes([]);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      if (data.projectName) {
        setProjectName(data.projectName);
      }

      if (data.projectDescription) {
        localStorage.setItem('lastProjectDescription', data.projectDescription);
      } else {
        localStorage.removeItem('lastProjectDescription');
      }

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('add-summary-note'));
      }, 500);
    },
    [
      resetWorkspaceUiState,
      resetToEmptyProject,
      setDevices,
      setConnections,
      setDeviceStates,
      setNotes,
      setZoom,
      setPan,
      setProjectName,
    ]
  );

  useEffect(() => {
    const handleOpenGenerator = () => setIsGeneratorOpen(true);
    window.addEventListener('trigger-topology-generator', handleOpenGenerator);
    return () => window.removeEventListener('trigger-topology-generator', handleOpenGenerator);
  }, [setIsGeneratorOpen]);

  const handleNewProject = useCallback(() => {
    setProjectSearchQuery('');
    closeExam();
    resetWorkspaceUiState();
    runWithSaveGuard(() => setShowProjectPicker(true));
  }, [closeExam, resetWorkspaceUiState, runWithSaveGuard, setProjectSearchQuery, setShowProjectPicker]);

  // Draggable refresh network report saved position
  useEffect(() => {
    if (!refreshNetworkReport?.show || !refreshReportRef.current) return;
    if (isMobile) return;
    try {
      const saved = localStorage.getItem('draggable_position_refresh-network-report');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const el = refreshReportRef.current;
          const rect = el.getBoundingClientRect();
          const safeX = Math.max(4, Math.min(parsed.x, vw - rect.width - 4));
          const safeY = Math.max(128, Math.min(parsed.y, vh - rect.height - 4));
          el.style.position = 'fixed';
          el.style.left = `${safeX}px`;
          el.style.top = `${safeY}px`;
          el.style.right = 'auto';
          el.style.bottom = 'auto';
          el.style.transform = 'none';
        }
      }
    } catch {
      // ignore parsing error
    }
  }, [refreshNetworkReport?.show, isMobile, refreshReportRef]);

  return {
    closeEscLikeWindows,
    runWithSaveGuard,
    handleGeneratedTopology,
    handleNewProject,
  };
}
