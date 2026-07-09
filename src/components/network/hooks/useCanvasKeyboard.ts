'use client';

import { useEffect } from 'react';
import type { CanvasDevice, ContextMenuState } from '../networkTopology.types';

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
  setDevices: (fn: (prev: CanvasDevice[]) => CanvasDevice[]) => void;
  setSelectedDeviceIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSelectedNoteIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  isPaletteOpen: boolean;
  setIsPaletteOpen: (val: boolean) => void;
  isFullscreen: boolean;
  onFullscreenChange?: (val: boolean) => void;
  isPingPanelVisible: boolean;
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
  deviceMap,
  setDevices,
  setSelectedDeviceIds,
  setSelectedNoteIds,
  setContextMenu,
  isPaletteOpen,
  setIsPaletteOpen,
  isFullscreen,
  onFullscreenChange,
  isPingPanelVisible,
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
        if (packetPopupHop !== null) {
          e.preventDefault();
          setPacketPopupHop(null);
          return;
        }
        if (pingAnimation) {
          e.preventDefault();
          handlePingClose();
          return;
        }
        setContextMenu(null);
        if (pingMode) {
          e.preventDefault();
          setPingMode(false);
          setPingSource(null);
          setPingResult(null);
        }
        if (isDrawingConnection) {
          e.preventDefault();
          cancelConnectionDrawing();
        }
        if (isPaletteOpen) {
          setIsPaletteOpen(false);
        }
        if (isFullscreen && onFullscreenChange) {
          onFullscreenChange(false);
        }
        return;
      }

      // Don't handle other keys if a modal is open
      if (configuringDevice) {
        return;
      }

      // Delete key handler (Plain Delete key only)
      if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && !isEditable) {
        if (selectedDeviceIds.length > 0) {
          e.preventDefault();
          saveToHistory();
          selectedDeviceIds.forEach(id => {
            deleteDevice(id);
            if (onDeviceDelete) onDeviceDelete(id);
          });
          setSelectedDeviceIds([]);
        } else if (selectedNoteIds.length > 0) {
          e.preventDefault();
          saveToHistory();
          selectedNoteIds.forEach(id => deleteNote(id));
          setSelectedNoteIds([]);
        }
        return;
      }

      // Arrow keys move selected devices on topology (disabled during exam)
      if (!isEditable && !isExamActive && selectedDeviceIds.length > 0 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const step = e.shiftKey ? 32 : 16;
        let deltaX = 0;
        let deltaY = 0;

        if (e.key === 'ArrowUp') deltaY = -step;
        if (e.key === 'ArrowDown') deltaY = step;
        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;

        if (deltaX !== 0 || deltaY !== 0) {
          e.preventDefault();
          e.stopPropagation();
          saveToHistory();
          setDevices((prev) =>
            prev.map((device) =>
              selectedDeviceIds.includes(device.id)
                ? { ...device, x: device.x + deltaX, y: device.y + deltaY }
                : device
            )
          );
          return;
        }
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
      if (!isEditable && key === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && !isPingPanelVisible) {
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
    deviceMap,
    setDevices,
    setSelectedDeviceIds,
    setSelectedNoteIds,
    setContextMenu,
    isPaletteOpen,
    setIsPaletteOpen,
    isFullscreen,
    onFullscreenChange,
    isPingPanelVisible,
    setPingMode,
    setPingSource,
    setPingResult,
  ]);
}
