'use client';

import React, { useState } from 'react';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { PCPanel } from './PCPanel';
import { FirewallPanel } from './FirewallPanel';
import { UnifiedDevicePanel } from './UnifiedDevicePanel';
import { CanvasDevice, CanvasConnection, DeviceType, FirewallRule } from './networkTopology.types';
import { CableInfo, SwitchState } from '@/lib/network/types';
import { TerminalOutput } from './Terminal';
import { OutputLine as PCOutputLine, PcOutputsSetter, type PCActiveTab } from './pc-panel/PCPanel.types';
import { useMultiWindowStore, DeviceWindowItem } from '@/hooks/useMultiWindowStore';
import { useWindowStore } from '@/hooks/useWindowStore';
import { DeviceIcon } from './DeviceIcon';
import { TaskDefinition, TaskContext } from '@/lib/network/taskDefinitions';
import type { Translations } from '@/contexts/LanguageContext';

interface MultiDeviceWindowManagerProps {
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  cableInfo: CableInfo;
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  setPcOutputs: PcOutputsSetter;
  pcHistories: Map<string, string[]>;
  handleUpdatePCHistory: (deviceId: string, history: string[]) => void;
  handleUpdateHistory: (deviceId: string, history: string[]) => void;
  handleExecuteCommand: (deviceId: string, command: string) => Promise<unknown>;
  handleDeviceDelete: (deviceId: string) => void;
  isDark: boolean;
  language: string;
  theme?: string;
  t: Translations;
  toggleDevicePower: (deviceId: string) => void;
  updateDeviceConfig?: (deviceId: string, config: { firewallRules?: FirewallRule[] }) => void;
  confirmDialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null;
  setConfirmDialog: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  isTablet?: boolean;
}

export function MultiDeviceWindowManager({
  topologyDevices,
  topologyConnections,
  cableInfo,
  deviceStates,
  deviceOutputs,
  pcOutputs,
  setPcOutputs,
  pcHistories,
  handleUpdatePCHistory,
  handleUpdateHistory,
  handleExecuteCommand,
  handleDeviceDelete,
  isDark,
  language,
  theme = 'network',
  t,
  toggleDevicePower,
  updateDeviceConfig,
  confirmDialog = null,
  setConfirmDialog = () => {},
}: MultiDeviceWindowManagerProps) {
  const {
    openWindows,
    closeDeviceWindow,
    restoreWindow,
    windowPositions,
    windowSizes,
    windowRestoreRequests,
    updateWindowPosition,
    updateWindowSize,
    layoutMode,
    setLayoutMode,
    splitViewSideBySide,
    activeTabId,
    setActiveTabId,
  } = useMultiWindowStore();
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const setActiveWindow = useWindowStore((state) => state.setActiveWindow);
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

  if (openWindows.length === 0) return null;

  const currentTabId = activeTabId && openWindows.some((w) => w.id === activeTabId) ? activeTabId : openWindows[0]?.id;

  return (
    <>
      {/* Sol Ortadaki Açık Pencereler Simgeleri (Left-Middle Open Windows Dock) */}
      {openWindows.length > 0 && (
        <aside
          aria-label={language === 'tr' ? 'Açık Pencereler' : 'Open Windows'}
          className={`fixed left-0 top-1/2 -translate-y-1/2 z-[9995] flex flex-col items-center gap-1.5 p-1.5 rounded-r-2xl border border-l-0 shadow-2xl backdrop-blur-xl transition-all select-none animate-in slide-in-from-left duration-200 ${
            isDark
              ? 'bg-secondary-950/95 border-secondary-800/80 shadow-black/60'
              : 'bg-white/95 border-secondary-200 shadow-secondary-900/20'
          }`}
        >
          {/* Header indicator */}
          <div className="flex flex-col items-center py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-bold tracking-wider text-emerald-400 mt-0.5">
              {openWindows.length}
            </span>
          </div>

          <div className="w-5 h-px bg-secondary-700/40 my-0.5" />

          {/* Window Icons List */}
          <div className="flex flex-col items-center gap-1.5 max-h-[70vh] overflow-y-auto overflow-x-hidden custom-scrollbar pr-0.5">
            {openWindows.map((win) => {
              const device = topologyDevices.find((item) => item.id === win.id);
              const label = device?.name || win.id;
              const isActive = activeWindowId === win.id || (layoutMode === 'tabs' && win.id === currentTabId);

              return (
                <div key={`left-dock-${win.id}`} className="relative group flex items-center">
                  <button
                    type="button"
                    aria-label={label}
                    title={`${label} (${win.type})`}
                    onClick={() => {
                      restoreWindow(win.id);
                      setActiveWindow(win.id);
                      if (layoutMode === 'tabs') {
                        setActiveTabId(win.id);
                      }
                    }}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all transform active:scale-95 ${
                      isActive
                        ? isDark
                          ? 'bg-emerald-600/30 text-emerald-300 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10'
                        : isDark
                          ? 'text-secondary-400 hover:bg-secondary-800/80 hover:text-white hover:scale-105'
                          : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 hover:scale-105'
                    }`}
                  >
                    <DeviceIcon
                      type={(device?.type || win.type) as DeviceType}
                      switchModel={device?.switchModel}
                      size={20}
                      active={isActive}
                    />

                    {/* Active dot indicator on edge */}
                    {isActive && (
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 rounded-r-full bg-emerald-400 shadow-sm" />
                    )}
                  </button>

                  {/* Close button on hover */}
                  <button
                    type="button"
                    title={language === 'tr' ? `${label} Penceresini Kapat` : `Close ${label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeDeviceWindow(win.id);
                    }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow hover:bg-red-600 transition-all z-10"
                  >
                    ×
                  </button>

                  {/* Tooltip flyout on hover */}
                  <div
                    className={`absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xl border backdrop-blur-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 ${
                      isDark
                        ? 'bg-secondary-900/95 text-white border-secondary-700'
                        : 'bg-white text-secondary-900 border-secondary-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{label}</span>
                      <span className="text-[10px] px-1 py-0.2 rounded uppercase opacity-60 bg-secondary-700/30">
                        {win.type}
                      </span>
                    </div>
                    {device?.ip && (
                      <div className="text-[10px] text-secondary-400 font-mono mt-0.5">
                        {device.ip}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Floating Window Controls / Layout Toolbar when multiple windows open */}
      {openWindows.length > 1 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[9990] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-900/90 text-white border border-secondary-700/60 shadow-xl backdrop-blur-md text-xs select-none">
          <span className="font-semibold text-emerald-400 mr-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {openWindows.length} {language === 'tr' ? 'Pencere' : 'Windows'}
          </span>
          <div className="w-px h-4 bg-secondary-700 mx-1" />
          <button
            type="button"
            onClick={() => setLayoutMode('free')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${layoutMode === 'free' ? 'bg-emerald-500 text-white shadow' : 'hover:bg-secondary-800 text-secondary-300'}`}
          >
            {language === 'tr' ? 'Serbest' : 'Free Float'}
          </button>
          <button
            type="button"
            onClick={() => splitViewSideBySide()}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${layoutMode === 'split' ? 'bg-blue-500 text-white shadow' : 'hover:bg-secondary-800 text-secondary-300'}`}
          >
            {language === 'tr' ? 'Yan Yana (Böl)' : 'Side-by-Side'}
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('tabs')}
            className={`px-2.5 py-1 rounded-full font-medium transition-all ${layoutMode === 'tabs' ? 'bg-purple-500 text-white shadow' : 'hover:bg-secondary-800 text-secondary-300'}`}
          >
            {language === 'tr' ? 'Sekmeli Görünüm' : 'Tabbed View'}
          </button>
        </div>
      )}

      {/* Tabbed View Navigation Bar when Tabs layout mode is enabled */}
      {layoutMode === 'tabs' && openWindows.length > 0 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9989] flex items-center gap-1 p-1 rounded-xl bg-secondary-950/95 text-white border border-secondary-800 shadow-2xl backdrop-blur-lg max-w-4xl overflow-x-auto custom-scrollbar">
          {openWindows.map((win) => {
            const devObj = topologyDevices.find((d) => d.id === win.id);
            const devName = devObj?.name || win.id;
            const isActive = win.id === currentTabId;
            return (
              <button
                key={`tab-nav-${win.id}`}
                type="button"
                onClick={() => setActiveTabId(win.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${isActive
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-400/30'
                  : 'bg-secondary-900/60 text-secondary-300 hover:bg-secondary-800 hover:text-white'
                  }`}
              >
                <span className="truncate max-w-[120px]">{devName}</span>
                <span className="text-[10px] opacity-60 uppercase">({win.type})</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeDeviceWindow(win.id);
                  }}
                  className="hover:text-red-400 ml-1 rounded p-0.5"
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>
      )}

      {openWindows.map((win: DeviceWindowItem) => {
        if (layoutMode === 'tabs' && win.id !== currentTabId) {
          return null;
        }

        const deviceObj = topologyDevices.find((d) => d.id === win.id);
        const deviceName = deviceObj?.name || win.id;
        const deviceType = (deviceObj?.type || win.type) as DeviceType;
        const position = layoutMode === 'tabs'
          ? { x: typeof window !== 'undefined' ? Math.max(0, Math.floor((window.innerWidth - 800) / 2)) : 100, y: 120 }
          : (windowPositions[win.id] || { x: win.x || 120, y: win.y || 80 });
        const size = layoutMode === 'tabs'
          ? { width: typeof window !== 'undefined' ? Math.min(1000, window.innerWidth - 40) : 800, height: typeof window !== 'undefined' ? Math.min(650, window.innerHeight - 150) : 600 }
          : (windowSizes[win.id] || { width: win.width || 720, height: win.height || 540 });

        const handlePointerDown = (e: React.PointerEvent) => {
          // Pointer capture for dragging
          const startX = e.clientX - position.x;
          const startY = e.clientY - position.y;

          const onPointerMove = (moveEvt: PointerEvent) => {
            const nextX = Math.max(0, Math.min(window.innerWidth - 100, moveEvt.clientX - startX));
            const nextY = Math.max(0, Math.min(window.innerHeight - 60, moveEvt.clientY - startY));
            updateWindowPosition(win.id, { x: nextX, y: nextY });
          };

          const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        };

        const handleResizeStart = (e: React.PointerEvent, direction: string) => {
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = size.width;
          const startHeight = size.height;
          const startPosX = position.x;
          const startPosY = position.y;

          const onPointerMove = (moveEvt: PointerEvent) => {
            const dx = moveEvt.clientX - startX;
            const dy = moveEvt.clientY - startY;
            let newW = startWidth;
            let newH = startHeight;
            let newX = startPosX;
            let newY = startPosY;

            if (direction.includes('e')) newW = Math.max(400, startWidth + dx);
            if (direction.includes('s')) newH = Math.max(300, startHeight + dy);
            if (direction.includes('w')) {
              newW = Math.max(400, startWidth - dx);
              newX = startPosX + (startWidth - newW);
            }
            if (direction.includes('n')) {
              newH = Math.max(300, startHeight - dy);
              newY = startPosY + (startHeight - newH);
            }

            updateWindowSize(win.id, { width: newW, height: newH });
            if (newX !== startPosX || newY !== startPosY) {
              updateWindowPosition(win.id, { x: newX, y: newY });
            }
          };

          const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        };

        // Render PC Window
        if (deviceType === 'pc') {
          return (
            <DraggableWindowWrapper
              key={win.id}
              id={win.id}
              title={`PC Terminal - ${deviceName}`}
              isOpen={true}
              onClose={() => closeDeviceWindow(win.id)}
              isDark={isDark}
              modalPosition={position}
              modalSize={size}
              handlePointerDown={handlePointerDown}
              handleResizeStart={handleResizeStart}
              collapsible
              restoreRequest={windowRestoreRequests[win.id]}
            >
              <div className="flex-1 overflow-hidden relative rounded-b-xl">
                <PCPanel
                  key={`pc-panel-${win.id}`}
                  className="h-full min-h-0 !border-none"
                  deviceId={win.id}
                  cableInfo={cableInfo}
                  initialTab={(win.initialTab as PCActiveTab) || 'home'}
                  isVisible={true}
                  onClose={() => closeDeviceWindow(win.id)}
                  onTogglePower={toggleDevicePower}
                  topologyDevices={topologyDevices}
                  topologyConnections={topologyConnections}
                  deviceStates={deviceStates}
                  deviceOutputs={deviceOutputs}
                  pcOutputs={pcOutputs}
                  setPcOutputs={setPcOutputs}
                  pcHistories={pcHistories}
                  onUpdatePCHistory={handleUpdatePCHistory}
                  onExecuteDeviceCommand={handleExecuteCommand}
                  onDeleteDevice={handleDeviceDelete}
                  handleResizeStart={handleResizeStart}
                />
              </div>
            </DraggableWindowWrapper>
          );
        }

        // Render Firewall Window
        if (deviceType === 'firewall') {
          return (
            <DraggableWindowWrapper
              key={win.id}
              id={win.id}
              title={`Firewall - ${deviceName}`}
              isOpen={true}
              onClose={() => closeDeviceWindow(win.id)}
              isDark={isDark}
              modalPosition={position}
              modalSize={size}
              handlePointerDown={handlePointerDown}
              handleResizeStart={handleResizeStart}
              collapsible
              restoreRequest={windowRestoreRequests[win.id]}
            >
              <div className="flex-1 overflow-y-auto rounded-b-xl p-4 custom-scrollbar">
                <FirewallPanel
                  device={(deviceObj || { id: win.id, name: deviceName, type: 'firewall', x: 0, y: 0, ports: [] }) as unknown as CanvasDevice}
                  t={t}
                  theme={theme}
                  isDevicePoweredOff={deviceObj?.status === 'offline'}
                  onUpdateRules={(rules) => {
                    if (updateDeviceConfig) updateDeviceConfig(win.id, { firewallRules: rules });
                  }}
                  deviceStates={deviceStates}
                  deviceOutputs={deviceOutputs}
                  onExecuteCommand={(cmd) => handleExecuteCommand(win.id, cmd)}
                  onUpdateHistory={(devId, hist) => handleUpdateHistory(win.id, Array.isArray(hist) ? hist : (Array.isArray(devId) ? devId : []))}
                  setConfirmDialog={setConfirmDialog}
                  confirmDialog={confirmDialog}
                  topologyDevices={topologyDevices}
                  activeTab={(activeTabs[win.id] || win.initialTab || 'console') as 'console' | 'settings'}
                  onTabChange={(tab) => setActiveTabs((prev) => ({ ...prev, [win.id]: tab }))}
                  onTogglePower={toggleDevicePower}
                />
              </div>
            </DraggableWindowWrapper>
          );
        }

        const isSwitch = deviceType === 'switchL2' || deviceType === 'switchL3';
        const deviceState = (deviceStates.get(win.id) || {
          hostname: deviceName,
          switchModel: isSwitch ? 'NS-L2-24TT-L' : undefined,
          ports: {},
          vlanTable: {},
          security: {},
          services: {},
        }) as unknown as SwitchState;


        const output = deviceOutputs.get(win.id) || [];
        const prompt = (deviceState as unknown as { prompt?: string }).prompt || `${deviceName}>`;
        const currentActiveTab = (activeTabs[win.id] || win.initialTab || 'console') as 'console' | 'settings' | 'stp' | 'physical';

        return (
          <UnifiedDevicePanel
            key={win.id}
            isOpen={true}
            onOpenChange={(open) => {
              if (!open) closeDeviceWindow(win.id);
            }}
            activeTab={currentActiveTab}
            onTabChange={(tab) => setActiveTabs((prev) => ({ ...prev, [win.id]: tab }))}
            deviceId={win.id}
            deviceType={deviceType}
            deviceStates={deviceStates}
            topologyDevices={topologyDevices}
            topologyConnections={topologyConnections}
            handleCommand={(cmd) => handleExecuteCommand(win.id, cmd)}
            handleClearTerminal={() => {
              deviceOutputs.set(win.id, []);
            }}
            handleUpdateHistory={(devId, hist) => handleUpdateHistory(win.id, Array.isArray(hist) ? hist : (Array.isArray(devId) ? devId : []))}
            confirmDialog={confirmDialog}
            setConfirmDialog={setConfirmDialog}
            t={t}
            theme={theme}
            language={language}
            helpLevel="intermediate"
            isDark={isDark}
            isExecutingCommand={false}
            output={output}
            prompt={prompt}
            state={deviceState}
            activeDeviceTasks={[] as TaskDefinition[]}
            taskContext={{} as TaskContext}
            modalPosition={position}
            modalSize={size}
            handlePointerDown={handlePointerDown}
            handleResizeStart={handleResizeStart}
            restoreRequest={windowRestoreRequests[win.id]}
          />
        );
      })}
    </>
  );
}
