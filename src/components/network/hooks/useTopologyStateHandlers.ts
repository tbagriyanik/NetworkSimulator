'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppStore, useTopologyDevices, useTopologyConnections, useTopologyNotes, useGraphicsQuality, useIsSimulationMode, useEnvironment, useNetworkEventLogs } from '@/lib/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { useUiPreferences } from '@/hooks/useUiPreferences';
import { ContextMenuState, NetworkTopologyProps } from '../networkTopology.types';
import { DEFAULT_ZOOM } from '../networkTopology.constants';

export function useTopologyStateHandlers(props: NetworkTopologyProps) {
  const {
    activeDeviceId,
    focusDeviceId,
    zoom: zoomProp,
    pan: panProp,
    isFullscreen = false,
    onFullscreenChange,
  } = props;

  const { language, t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTR = language === 'tr';

  const [isExporting, setIsExporting] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(false);

  // Zustand store state
  const topologyDevices = useTopologyDevices();
  const topologyConnections = useTopologyConnections();
  const topologyNotes = useTopologyNotes();
  const setDevices = useAppStore((state) => state.setDevices);
  const setConnections = useAppStore((state) => state.setConnections);
  const setNotes = useAppStore((state) => state.setNotes);
  const graphicsQuality = useGraphicsQuality();
  const isSimulationMode = useIsSimulationMode();
  const activeCaptureConnectionId = useAppStore((state) => state.topology.activeCaptureConnectionId);
  const setActiveCaptureConnection = useAppStore((state) => state.setActiveCaptureConnection);
  const capturedPacketsMap = useAppStore((state) => state.topology.capturedPackets);
  const clearCapturedPackets = useAppStore((state) => state.clearCapturedPackets);
  const clearAllCapturedPackets = useAppStore((state) => state.clearAllCapturedPackets);
  const networkEventLogs = useNetworkEventLogs();
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const { preferences, updatePreference } = useUiPreferences();
  const snapToGrid = preferences.snapToGrid;
  const setSnapToGrid = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof value === 'function' ? value(preferences.snapToGrid) : value;
    updatePreference('snapToGrid', nextVal);
  }, [preferences.snapToGrid, updatePreference]);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(zoomProp ?? DEFAULT_ZOOM);
  const [pan, setPan] = useState(panProp ?? { x: 0, y: 0 });
  const isMobile = useIsMobile();

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>(activeDeviceId ? [activeDeviceId] : []);
  const selectedDeviceSet = useMemo(() => new Set(selectedDeviceIds), [selectedDeviceIds]);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Environment settings
  const environment = useEnvironment();

  // Force continuous updates for IoT measurements
  const [iotUpdateTrigger, setIotUpdateTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setIotUpdateTrigger((prev) => prev + 1);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [_selectAllMode, setSelectAllMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{
    deviceId: string;
    portId: string;
    point: { x: number; y: number };
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [configuringDevice, setConfiguringDevice] = useState<string | null>(null);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [mobileConnectionSource, setMobileConnectionSource] = useState<string | null>(null);

  const [showPortSelector, setShowPortSelector] = useState(false);
  const [portSelectorStep, setPortSelectorStep] = useState<'source' | 'target'>('source');
  const [selectedSourcePort, setSelectedSourcePort] = useState<{ deviceId: string; portId: string } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const toggleFullscreen = useCallback(() => {
    if (onFullscreenChange) {
      onFullscreenChange(!isFullscreen);
    }
  }, [isFullscreen, onFullscreenChange]);

  return {
    language,
    t,
    theme,
    isDark,
    isTR,
    isExporting,
    setIsExporting,
    isMinimapOpen,
    setIsMinimapOpen,
    topologyDevices,
    topologyConnections,
    topologyNotes,
    setDevices,
    setConnections,
    setNotes,
    graphicsQuality,
    isSimulationMode,
    activeCaptureConnectionId,
    setActiveCaptureConnection,
    capturedPacketsMap,
    clearCapturedPackets,
    clearAllCapturedPackets,
    networkEventLogs,
    showLogPanel,
    setShowLogPanel,
    showShortcutsModal,
    setShowShortcutsModal,
    preferences,
    snapToGrid,
    setSnapToGrid,
    zoom,
    setZoom,
    pan,
    setPan,
    isMobile,
    selectedDeviceIds,
    setSelectedDeviceIds,
    selectedDeviceSet,
    selectedNoteIds,
    setSelectedNoteIds,
    environment,
    iotUpdateTrigger,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    _selectAllMode,
    setSelectAllMode,
    selectionBox,
    setSelectionBox,
    isSelecting,
    setIsSelecting,
    isDrawingConnection,
    setIsDrawingConnection,
    connectionStart,
    setConnectionStart,
    mousePos,
    setMousePos,
    contextMenu,
    setContextMenu,
    configuringDevice,
    setConfiguringDevice,
    isPaletteOpen,
    setIsPaletteOpen,
    mobilePaletteOpen,
    setMobilePaletteOpen,
    mobileConnectionSource,
    setMobileConnectionSource,
    showPortSelector,
    setShowPortSelector,
    portSelectorStep,
    setPortSelectorStep,
    selectedSourcePort,
    setSelectedSourcePort,
    activeDeviceId,
    focusDeviceId,
    connectionError,
    setConnectionError,
    toggleFullscreen,
  };
}
