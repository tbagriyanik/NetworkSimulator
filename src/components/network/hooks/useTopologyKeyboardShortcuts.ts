'use client';

import { useCanvasKeyboard } from './useCanvasKeyboard';
import type { CanvasDevice, ContextMenuState } from '../networkTopology.types';

export interface UseTopologyKeyboardShortcutsProps {
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
  setPingMode: (active: boolean) => void;
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
  onOpenShortcutsModal?: () => void;
}

export function useTopologyKeyboardShortcuts(props: UseTopologyKeyboardShortcutsProps) {
  useCanvasKeyboard(props);
}
