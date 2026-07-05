'use client';

import { useEffect } from 'react';

interface CanvasKeyboardProps {
  selectedDeviceIds: string[];
  selectedNoteIds: string[];
  deleteDevice: (id: string) => void;
  deleteNote: (id: string) => void;
  configuringDevice: string | null;
  cancelDeviceConfig: () => void;
  selectAllDevices: () => void;
  saveToHistory: () => void;
  onDeviceDelete?: (id: string) => void;
  isDrawingConnection: boolean;
  copyDevice: (ids: string[]) => void;
  cutDevice: (ids: string[]) => void;
  pasteDevice: () => void;
  pingSource: unknown;
  pingMode: boolean;
  setPingSource: (src: unknown) => void;
  setPingMode: (val: boolean) => void;
  setPingResult: (res: unknown) => void;
  toggleFullscreen: () => void;
  resetView: () => void;
  isExamActive: boolean;
  cancelConnectionDrawing: () => void;
  handlePingClose: () => void;
  packetPopupHop: number | null;
  setPacketPopupHop: (hop: number | null) => void;
  pingAnimation: unknown;
  deviceMap: Map<string, unknown>;
}

export function useCanvasKeyboard({
  selectedDeviceIds,
  selectedNoteIds,
  deleteDevice,
  deleteNote,
  configuringDevice,
  cancelDeviceConfig,
  selectAllDevices,
  saveToHistory,
  onDeviceDelete,
  isDrawingConnection,
  copyDevice,
  cutDevice,
  pasteDevice,
  pingSource,
  pingMode,
  setPingSource,
  setPingMode,
  setPingResult,
  toggleFullscreen,
  resetView,
  isExamActive,
  cancelConnectionDrawing,
  handlePingClose,
  packetPopupHop,
  setPacketPopupHop,
  pingAnimation,
  deviceMap
}: CanvasKeyboardProps) {
  useEffect(() => {
    const handleCloseBroadcast = () => {
      cancelDeviceConfig();
    };
    window.addEventListener('close-menus-broadcast', handleCloseBroadcast);

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (!e.key) return;
      const key = e.key.toLowerCase();

      // Escape key handler
      if (e.key === 'Escape') {
        if (configuringDevice) {
          e.preventDefault();
          cancelDeviceConfig();
        }
        if (isDrawingConnection) {
          e.preventDefault();
          cancelConnectionDrawing();
        }
        if (pingMode) {
          e.preventDefault();
          handlePingClose();
        }
        if (packetPopupHop !== null) {
          e.preventDefault();
          setPacketPopupHop(null);
        }
        return;
      }

      // Delete key handler
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable) {
        if (selectedDeviceIds.length > 0) {
          e.preventDefault();
          saveToHistory();
          selectedDeviceIds.forEach(id => {
            deleteDevice(id);
            if (onDeviceDelete) onDeviceDelete(id);
          });
        }
        if (selectedNoteIds.length > 0) {
          e.preventDefault();
          saveToHistory();
          selectedNoteIds.forEach(id => deleteNote(id));
        }
        return;
      }

      // Ctrl Shortcuts
      if ((e.ctrlKey || e.metaKey) && !isEditable) {
        if (key === 'a') {
          e.preventDefault();
          selectAllDevices();
        }
        if (key === 'c' && !isExamActive) {
          if (selectedDeviceIds.length > 0) {
            copyDevice(selectedDeviceIds);
          }
        }
        if (key === 'x' && !isExamActive) {
          if (selectedDeviceIds.length > 0) {
            cutDevice(selectedDeviceIds);
          }
        }
        if (key === 'v' && !isExamActive) {
          e.preventDefault();
          pasteDevice();
        }
        if (key === 'f') {
          e.preventDefault();
          toggleFullscreen();
        }
      }

      // Alt+R to reset zoom/pan view
      if (e.altKey && !e.ctrlKey && !e.metaKey && key === 'r') {
        e.preventDefault();
        resetView();
      }

      // P to enter ping mode
      if (!isEditable && key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        if (!pingMode) {
          if (selectedDeviceIds.length === 1) {
            const selectedDevice = deviceMap.get(selectedDeviceIds[0]);
            setPingSource(selectedDevice || null);
          } else {
            setPingSource(null);
          }
          setPingMode(true);
          setPingResult(null);
        } else {
          setPingMode(false);
          setPingSource(null);
          setPingResult(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('close-menus-broadcast', handleCloseBroadcast);
    };
  }, [
    selectedDeviceIds,
    selectedNoteIds,
    deleteDevice,
    deleteNote,
    configuringDevice,
    cancelDeviceConfig,
    selectAllDevices,
    saveToHistory,
    onDeviceDelete,
    isDrawingConnection,
    copyDevice,
    cutDevice,
    pasteDevice,
    pingSource,
    pingMode,
    toggleFullscreen,
    resetView,
    isExamActive,
    cancelConnectionDrawing,
    handlePingClose,
    packetPopupHop,
    setPacketPopupHop,
    pingAnimation,
    deviceMap
  ]);
}
