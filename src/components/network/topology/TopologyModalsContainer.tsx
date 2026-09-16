'use client';

import React from 'react';
import LazyNetworkTopologyContextMenu from '../LazyNetworkTopologyContextMenu';
import { TopologyTooltips } from './TopologyTooltips';
import { TopologyModals } from './TopologyModals';
import { MinimapNavigator } from './MinimapNavigator';
import { ShortcutsModal } from '@/components/ui/ShortcutsModal';
import { NetworkEventLogPanel } from './NetworkEventLogPanel';
import type { CanvasDevice, CanvasConnection, CanvasNote, ContextMenuState } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState, CableInfo } from '@/lib/network/types';
import type { PingAnimationState } from '@/hooks/networkTopology/usePingSequence';
import type { HopPacketInfo } from '../PingPacketInfoPanel';
import type { CapturedPacket } from '@/lib/store/appStore';

export interface TopologyModalsContainerProps {
  // Context Menu Props
  contextMenu: ContextMenuState | null;
  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  isDark: boolean;
  language: 'tr' | 'en';
  noteFonts: string[];
  notes: CanvasNote[];
  devices: CanvasDevice[];
  selectedDeviceIds: string[];
  clipboardLength: number;
  noteClipboardLength: number;
  historyIndex: number;
  historyLength: number;
  isExamActive: boolean;
  isPingPanelVisible: boolean;
  setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
  updateNoteStyle: (id: string, style: Partial<CanvasNote>) => void;
  handleNoteTextCut: (id: string) => void;
  handleNoteTextCopy: (id: string) => void;
  handleNoteTextPaste: (id: string) => void;
  handleNoteTextDelete: (id: string) => void;
  handleNoteTextSelectAll: (id: string) => void;
  duplicateNote: (id: string) => void;
  pasteNotes: (x: number, y: number) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  selectAllDevices: () => void;
  handleDeviceDoubleClick: (device: CanvasDevice) => void;
  saveToHistory: () => void;
  cutDevice: (ids: string[]) => void;
  copyDevice: (ids: string[]) => void;
  pasteDevice: () => void;
  deleteDevice: (id: string) => void;
  setSelectedDeviceIds: React.Dispatch<React.SetStateAction<string[]>>;
  startDeviceConfig: (id: string) => void;
  deviceMap: Map<string, CanvasDevice>;
  setPingMode: (active: boolean) => void;
  pingModeRef: React.MutableRefObject<boolean>;
  setPingSource: (device: CanvasDevice | null) => void;
  pingSourceRef: React.MutableRefObject<CanvasDevice | null>;
  setPingResult: React.Dispatch<React.SetStateAction<{ success: boolean; message: string } | null>>;
  togglePowerDevices: (ids: string[]) => void;
  onOpenTasks?: (deviceId: string) => void;
  handleRefresh: () => void;

  // Tooltip Props
  portTooltip: { deviceId: string; portId: string; x: number; y: number; visible: boolean } | null;
  deviceStates?: Map<string, SwitchState>;
  getIotDeviceStatus: (d: CanvasDevice) => string;
  getIotPowerStatus: (d: CanvasDevice) => string;
  getIotOpenCloseStatus: (d: CanvasDevice) => string;
  getLivePortVlanText: (deviceId: string, portId: string) => string;
  connectionTooltip: { x: number; y: number; sourceDeviceName: string; sourcePort: string; targetDeviceName: string; targetPort: string; cableType: string; statusMessage: string; visible: boolean } | null;
  CABLE_COLORS: Record<string, { primary: string; bg: string; text: string; border: string; error?: { primary: string; bg: string; text: string; border: string } }>;
  deviceTooltip: { deviceId: string; x: number; y: number; visible: boolean } | null;
  isTR: boolean;
  isDraggingInteractionDisabled: boolean;
  t: Record<string, string>;

  // Sub-Modals Props
  configuringDevice: string | null;
  cancelDeviceConfig: () => void;
  saveDeviceConfig: (deviceId: string, updates: Partial<CanvasDevice>) => void;
  isMobile: boolean;
  pingAnimation: PingAnimationState | null;
  hopPacketInfos: HopPacketInfo[];
  handlePingPlay: () => void;
  handlePingPause: () => void;
  handlePingNext: () => void;
  handlePingClose: () => void;
  graphicsQuality: 'high' | 'low';
  onPacketPanelFocus?: () => void;
  packetPanelZIndex?: number;
  packetPopupHop: number | null;
  setPacketPopupHop: (hop: number | null) => void;
  errorToast: { message: string; details?: string; type?: 'error' | 'success' } | null;
  setErrorToast: (toast: { message: string; details?: string; type?: 'error' | 'success' } | null) => void;
  connectionError: string | null;
  mobilePaletteOpen: boolean;
  setMobilePaletteOpen: (open: boolean) => void;
  addDevice: (type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc' | 'hub' | 'cloud' | 'mobile' | 'printer', layer?: 'L2' | 'L3') => void;
  cableInfo: CableInfo;
  onCableChange: (info: CableInfo) => void;
  showPortSelector: boolean;
  portSelectorStep: 'source' | 'target';
  selectedSourcePort: { deviceId: string; portId: string } | null;
  setShowPortSelector: (show: boolean) => void;
  setPortSelectorStep: (step: 'source' | 'target') => void;
  setSelectedSourcePort: (port: { deviceId: string; portId: string } | null) => void;
  setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
  setDevices: React.Dispatch<React.SetStateAction<CanvasDevice[]>>;
  connections: CanvasConnection[];
  activeCaptureConnectionId: string | null;
  clearCapturedPackets: (connId: string) => void;
  clearAllCapturedPackets: () => void;
  setActiveCaptureConnection: (id: string | null) => void;
  capturedPacketsMap: Record<string, CapturedPacket[]>;

  // Minimap & Preferences Props
  showMinimap: boolean;
  isMinimapOpen: boolean;
  setIsMinimapOpen: React.Dispatch<React.SetStateAction<boolean>>;
  zoom: number;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  zoomToFit: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;

  // Shortcuts & Event Log Modals
  showShortcutsModal: boolean;
  setShowShortcutsModal: (show: boolean) => void;
  showEventLogs: boolean;
  showLogPanel: boolean;
  setShowLogPanel: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TopologyModalsContainer: React.FC<TopologyModalsContainerProps> = ({
  contextMenu,
  contextMenuRef,
  isDark,
  language,
  noteFonts,
  notes,
  devices,
  selectedDeviceIds,
  clipboardLength,
  noteClipboardLength,
  historyIndex,
  historyLength,
  isExamActive,
  isPingPanelVisible,
  setContextMenu,
  updateNoteStyle,
  handleNoteTextCut,
  handleNoteTextCopy,
  handleNoteTextPaste,
  handleNoteTextDelete,
  handleNoteTextSelectAll,
  duplicateNote,
  pasteNotes,
  handleUndo,
  handleRedo,
  selectAllDevices,
  handleDeviceDoubleClick,
  saveToHistory,
  cutDevice,
  copyDevice,
  pasteDevice,
  deleteDevice,
  setSelectedDeviceIds,
  startDeviceConfig,
  deviceMap,
  setPingMode,
  pingModeRef,
  setPingSource,
  pingSourceRef,
  setPingResult,
  togglePowerDevices,
  onOpenTasks,
  handleRefresh,

  portTooltip,
  deviceStates,
  getIotDeviceStatus,
  getIotPowerStatus,
  getIotOpenCloseStatus,
  getLivePortVlanText,
  connectionTooltip,
  CABLE_COLORS,
  deviceTooltip,
  isTR,
  isDraggingInteractionDisabled,
  t,

  configuringDevice,
  cancelDeviceConfig,
  saveDeviceConfig,
  isMobile,
  pingAnimation,
  hopPacketInfos,
  handlePingPlay,
  handlePingPause,
  handlePingNext,
  handlePingClose,
  graphicsQuality,
  onPacketPanelFocus,
  packetPanelZIndex,
  packetPopupHop,
  setPacketPopupHop,
  errorToast,
  setErrorToast,
  connectionError,
  mobilePaletteOpen,
  setMobilePaletteOpen,
  addDevice,
  cableInfo,
  onCableChange,
  showPortSelector,
  portSelectorStep,
  selectedSourcePort,
  setShowPortSelector,
  setPortSelectorStep,
  setSelectedSourcePort,
  setConnections,
  setDevices,
  connections,
  activeCaptureConnectionId,
  clearCapturedPackets,
  clearAllCapturedPackets,
  setActiveCaptureConnection,
  capturedPacketsMap,

  showMinimap,
  isMinimapOpen,
  setIsMinimapOpen,
  zoom,
  pan,
  setPan,
  setZoom,
  zoomToFit,
  canvasRef,

  showShortcutsModal,
  setShowShortcutsModal,
  showEventLogs,
  showLogPanel,
  setShowLogPanel,
}) => {
  return (
    <>
      <ShortcutsModal
        open={showShortcutsModal}
        onOpenChange={setShowShortcutsModal}
        isDark={isDark}
        language={language}
      />

      {showEventLogs && (
        <NetworkEventLogPanel
          isOpen={showLogPanel}
          onClose={() => setShowLogPanel(false)}
          isDark={isDark}
        />
      )}

      {/* Context Menu */}
      <LazyNetworkTopologyContextMenu
        contextMenu={contextMenu}
        contextMenuRef={contextMenuRef}
        isDark={isDark}
        language={language}
        noteFonts={noteFonts}
        notes={notes}
        devices={devices}
        selectedDeviceIds={selectedDeviceIds}
        clipboardLength={clipboardLength}
        noteClipboardLength={noteClipboardLength}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < historyLength - 1}
        isExamActive={isExamActive}
        isPingPanelOpen={isPingPanelVisible}
        onClose={() => setContextMenu(null)}
        onUpdateNoteStyle={(id, style) => updateNoteStyle(id, style)}
        onNoteCut={(id) => handleNoteTextCut(id)}
        onNoteCopy={(id) => handleNoteTextCopy(id)}
        onNotePaste={(id) => handleNoteTextPaste(id)}
        onNoteDeleteText={(id) => handleNoteTextDelete(id)}
        onNoteSelectAllText={(id) => handleNoteTextSelectAll(id)}
        onDuplicateNote={(id) => duplicateNote(id)}
        onPasteNotes={(x, y) => pasteNotes(x, y)}
        onUndo={() => handleUndo()}
        onRedo={() => handleRedo()}
        onSelectAll={() => selectAllDevices()}
        onOpenDevice={(d) => handleDeviceDoubleClick(d)}
        onCutDevices={(ids) => {
          saveToHistory();
          cutDevice(ids);
        }}
        onCopyDevices={(ids) => copyDevice(ids)}
        onPasteDevice={() => pasteDevice()}
        onDeleteDevices={(ids) => {
          saveToHistory();
          ids.forEach((id) => deleteDevice(id));
          setSelectedDeviceIds([]);
        }}
        onStartConfig={startDeviceConfig}
        onStartPing={(id) => {
          const device = deviceMap.get(id);
          if (device) {
            setPingMode(true);
            pingModeRef.current = true;
            setPingSource(device);
            pingSourceRef.current = device;
            setPingResult(null);
          }
        }}
        onTogglePowerDevices={(ids) => {
          saveToHistory();
          togglePowerDevices(ids);
        }}
        onSaveToHistory={() => saveToHistory()}
        onClearDeviceSelection={() => setSelectedDeviceIds([])}
        onOpenTasks={onOpenTasks}
        onRefreshNetwork={handleRefresh}
        note={notes.find((n) => n.id === contextMenu?.noteId)}
      />

      <TopologyTooltips
        portTooltip={portTooltip}
        deviceMap={deviceMap}
        deviceStates={deviceStates}
        isDark={isDark}
        language={language}
        getIotDeviceStatus={getIotDeviceStatus}
        getIotPowerStatus={getIotPowerStatus}
        getIotOpenCloseStatus={getIotOpenCloseStatus}
        getLivePortVlanText={getLivePortVlanText}
        connectionTooltip={connectionTooltip}
        CABLE_COLORS={CABLE_COLORS}
        deviceTooltip={deviceTooltip}
        isTR={isTR}
        isDraggingInteractionDisabled={isDraggingInteractionDisabled}
        t={{
          ipAddress: t.ipAddress,
          subnetMask: t.subnetMask,
          gateway: t.gateway,
          dnsServer: t.dnsServer,
          macAddress: t.macAddress,
          dhcpEnabled: t.dhcpEnabled,
          openServices: t.openServices,
          active: t.active,
        }}
      />

      <TopologyModals
        configuringDevice={configuringDevice}
        deviceMap={deviceMap}
        cancelDeviceConfig={cancelDeviceConfig}
        saveDeviceConfig={saveDeviceConfig}
        isMobile={isMobile}
        isDark={isDark}
        pingAnimation={pingAnimation}
        hopPacketInfos={hopPacketInfos}
        handlePingPlay={handlePingPlay}
        handlePingPause={handlePingPause}
        handlePingNext={handlePingNext}
        handlePingClose={handlePingClose}
        language={language}
        graphicsQuality={graphicsQuality}
        onPacketPanelFocus={onPacketPanelFocus}
        packetPanelZIndex={packetPanelZIndex}
        packetPopupHop={packetPopupHop}
        setPacketPopupHop={setPacketPopupHop}
        errorToast={errorToast}
        setErrorToast={setErrorToast}
        connectionError={connectionError}
        mobilePaletteOpen={mobilePaletteOpen}
        setMobilePaletteOpen={setMobilePaletteOpen}
        isTR={isTR}
        addDevice={addDevice}
        cableInfo={cableInfo}
        onCableChange={onCableChange}
        showPortSelector={showPortSelector}
        devices={devices}
        portSelectorStep={portSelectorStep}
        selectedSourcePort={selectedSourcePort}
        setShowPortSelector={setShowPortSelector}
        setPortSelectorStep={setPortSelectorStep}
        setSelectedSourcePort={setSelectedSourcePort}
        setConnections={setConnections}
        setDevices={setDevices}
        connections={connections}
        activeCaptureConnectionId={activeCaptureConnectionId}
        clearCapturedPackets={clearCapturedPackets}
        clearAllCapturedPackets={clearAllCapturedPackets}
        setActiveCaptureConnection={setActiveCaptureConnection}
        capturedPacketsMap={capturedPacketsMap}
        t={t}
      />

      {showMinimap && (
        <MinimapNavigator
          devices={devices}
          connections={connections}
          zoom={zoom}
          pan={pan}
          setPan={setPan}
          setZoom={setZoom}
          zoomToFit={zoomToFit}
          canvasRef={canvasRef}
          isDark={isDark}
          language={language}
          isOpen={isMinimapOpen}
          onToggle={() => setIsMinimapOpen(!isMinimapOpen)}
        />
      )}
    </>
  );
};

