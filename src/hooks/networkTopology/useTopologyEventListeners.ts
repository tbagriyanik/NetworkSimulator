'use client';

import { useEffect, Dispatch, SetStateAction } from 'react';
import type { CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';

interface UseTopologyEventListenersProps {
  isExamActive: boolean;
  isExamEditorOpen: boolean;
  addDevice: (type: any, subType?: any) => void;
  addNote: () => void;
  addSummaryNote: () => void;
  handleExportPNG: () => void;
  setPingMode: Dispatch<SetStateAction<boolean>>;
  pingModeRef: React.MutableRefObject<boolean>;
  pingIsPausedRef: React.MutableRefObject<boolean>;
  pingStepModeRef: React.MutableRefObject<boolean>;
  pingAnimationRef: React.MutableRefObject<number | null>;
  pingCleanupTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setPingAnimation: Dispatch<SetStateAction<unknown>>;
  setHopPacketInfos: Dispatch<SetStateAction<unknown>>;
  setPacketPopupHop: Dispatch<SetStateAction<number | null>>;
  setPingSource: Dispatch<SetStateAction<CanvasDevice | null>>;
  pingSourceRef: React.MutableRefObject<CanvasDevice | null>;
  setPingResult: Dispatch<SetStateAction<unknown>>;
  setContextMenu: Dispatch<SetStateAction<unknown>>;
  setIsPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setShowPortSelector: Dispatch<SetStateAction<boolean>>;
  setPortSelectorStep: Dispatch<SetStateAction<'source' | 'target'>>;
  setSelectedSourcePort: Dispatch<SetStateAction<{ deviceId: string; portId: string } | null>>;
  saveToHistory: () => void;
  setDevices: Dispatch<SetStateAction<CanvasDevice[]>>;
  deleteConnection: (connectionId: string) => void;
}

export function useTopologyEventListeners({
  isExamActive,
  isExamEditorOpen,
  addDevice,
  addNote,
  addSummaryNote,
  handleExportPNG,
  setPingMode,
  pingModeRef,
  pingIsPausedRef,
  pingStepModeRef,
  pingAnimationRef,
  pingCleanupTimeoutRef,
  setPingAnimation,
  setHopPacketInfos,
  setPacketPopupHop,
  setPingSource,
  pingSourceRef,
  setPingResult,
  setContextMenu,
  setIsPaletteOpen,
  setShowPortSelector,
  setPortSelectorStep,
  setSelectedSourcePort,
  saveToHistory,
  setDevices,
  deleteConnection,
}: UseTopologyEventListenersProps) {
  // Handle toolbar events from page.tsx
  useEffect(() => {
    const handleAddDevice = (event: CustomEvent) => {
      if (isExamActive && !isExamEditorOpen) return;
      const deviceType = event.detail;
      if (deviceType === 'pc') addDevice('pc');
      else if (deviceType === 'switchL2') addDevice('switch', 'L2');
      else if (deviceType === 'switchL3') addDevice('switch', 'L3');
      else if (deviceType === 'router') addDevice('router');
      else if (deviceType === 'iot') addDevice('iot');
      else if (deviceType === 'firewall') addDevice('firewall');
      else if (deviceType === 'wlc') addDevice('wlc');
      else if (deviceType === 'hub') addDevice('hub');
      else if (deviceType === 'cloud') addDevice('cloud');
      else if (deviceType === 'mobile') addDevice('mobile');
      else if (deviceType === 'printer') addDevice('printer');
    };


    const handleTogglePingMode = () => {
      setPingMode((m) => {
        pingModeRef.current = !m;
        if (!m) {
          pingIsPausedRef.current = false;
          pingStepModeRef.current = false;
          if (pingAnimationRef.current) {
            cancelAnimationFrame(pingAnimationRef.current);
            pingAnimationRef.current = null;
          }
          if (pingCleanupTimeoutRef.current) {
            clearTimeout(pingCleanupTimeoutRef.current);
            pingCleanupTimeoutRef.current = null;
          }
          setPingAnimation(null);
          setHopPacketInfos([]);
          setPacketPopupHop(null);
        }
        return !m;
      });
      setPingSource(null);
      pingSourceRef.current = null;
      setPingResult(null);
    };

    const handleAddNote = () => addNote();
    const handleAddSummaryNote = () => addSummaryNote();

    window.addEventListener('add-device', handleAddDevice as EventListener);
    window.addEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
    window.addEventListener('add-note', handleAddNote as EventListener);
    window.addEventListener('add-summary-note', handleAddSummaryNote as EventListener);
    window.addEventListener('trigger-topology-export-png', handleExportPNG as EventListener);
    return () => {
      window.removeEventListener('add-device', handleAddDevice as EventListener);
      window.removeEventListener('toggle-ping-mode', handleTogglePingMode as EventListener);
      window.removeEventListener('add-note', handleAddNote as EventListener);
      window.removeEventListener('add-summary-note', handleAddSummaryNote as EventListener);
      window.removeEventListener('trigger-topology-export-png', handleExportPNG as EventListener);
    };
  }, [
    isExamActive,
    isExamEditorOpen,
    addDevice,
    addNote,
    addSummaryNote,
    handleExportPNG,
    setPingMode,
    pingModeRef,
    pingIsPausedRef,
    pingStepModeRef,
    pingAnimationRef,
    pingCleanupTimeoutRef,
    setPingAnimation,
    setHopPacketInfos,
    setPacketPopupHop,
    setPingSource,
    pingSourceRef,
    setPingResult,
  ]);

  // Page header & mobile triggers
  useEffect(() => {
    const openPalette = () => setIsPaletteOpen(true);
    const openConnect = () => {
      setShowPortSelector(true);
      setPortSelectorStep('source');
      setSelectedSourcePort(null);
    };
    const closeAllModals = () => {
      setIsPaletteOpen(false);
      setShowPortSelector(false);
      setContextMenu(null);
    };

    window.addEventListener('trigger-topology-palette', openPalette as EventListener);
    window.addEventListener('trigger-topology-connect', openConnect as EventListener);
    window.addEventListener('close-menus-broadcast', closeAllModals as EventListener);
    return () => {
      window.removeEventListener('trigger-topology-palette', openPalette as EventListener);
      window.removeEventListener('trigger-topology-connect', openConnect as EventListener);
      window.removeEventListener('close-menus-broadcast', closeAllModals as EventListener);
    };
  }, [setIsPaletteOpen, setShowPortSelector, setPortSelectorStep, setSelectedSourcePort, setContextMenu]);

  // Handle device config updates from WiFi control panel
  useEffect(() => {
    const handleUpdateDeviceConfig = (event: CustomEvent<{ deviceId: string; config: Partial<CanvasDevice> }>) => {
      const { deviceId, config } = event.detail;
      if (!deviceId) return;

      saveToHistory();
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== deviceId) return d;
          const updatedDevice = {
            ...d,
            ...config,
            iot: config.iot ? { ...d.iot, ...config.iot } : d.iot,
          };
          if (config.wifi && updatedDevice.ports) {
            updatedDevice.ports = updatedDevice.ports.map(p => {
              if (p.id !== 'wlan0') return p;
              const existingWifi = p.wifi || { ssid: '', security: 'open' as const, channel: '2.4GHz' as const, mode: 'client' as const };
              return {
                ...p,
                wifi: {
                  ...existingWifi,
                  ...config.wifi,
                  ssid: config.wifi?.ssid ?? existingWifi.ssid ?? '',
                },
              };
            });
          }
          return updatedDevice;
        })
      );
    };

    const handleDeleteConnection = (event: CustomEvent<{ connectionId: string }>) => {
      if (event.detail.connectionId) {
        deleteConnection(event.detail.connectionId);
      }
    };

    window.addEventListener('update-topology-device-config', handleUpdateDeviceConfig as EventListener);
    window.addEventListener('delete-topology-connection', handleDeleteConnection as EventListener);

    return () => {
      window.removeEventListener('update-topology-device-config', handleUpdateDeviceConfig as EventListener);
      window.removeEventListener('delete-topology-connection', handleDeleteConnection as EventListener);
    };
  }, [setDevices, saveToHistory, deleteConnection]);
}


