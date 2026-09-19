'use client';

import dynamic from 'next/dynamic';
import type { PcOutputsSetter } from '@/components/network/pc-panel/PCPanel.types';
import type { DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import { MultiDeviceWindowManager } from '@/components/network/MultiDeviceWindowManager';
import { WindowSwitcherModal } from '@/components/network/WindowSwitcherModal';

const {
  RouterPanel,
  UnifiedDevicePanel,
  PCWindow,
  FirewallWindow,
} = {
  // Import concrete modules (not the panels barrel) so the initial bundle
  // stays lean: the barrel also re-exports certificate panels which pull in jsPDF.
  RouterPanel: dynamic(() => import('@/components/network/RouterPanel').then((m) => m.RouterPanel)),
  UnifiedDevicePanel: dynamic(() => import('@/components/network/UnifiedDevicePanel').then((m) => m.UnifiedDevicePanel)),
  PCWindow: dynamic(() => import('@/components/network/PCWindow').then((m) => m.PCWindow), { ssr: false }),
  FirewallWindow: dynamic(() => import('@/components/network/FirewallWindow').then((m) => m.FirewallWindow), { ssr: false }),
};

interface PagePanelWindowsProps {
  t: any;
  theme: any;
  isDark: boolean;
  isTR: boolean;
  language: 'tr' | 'en';
  isTablet: boolean;
  helpLevel: any;

  // Unified device panel
  showUnifiedDeviceModal: boolean;
  setShowUnifiedDeviceModal: (show: boolean) => void;
  unifiedDeviceActiveTab: any;
  setUnifiedDeviceActiveTab: (tab: any) => void;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  deviceStates: any;
  deviceOutputs: any;
  topologyDevices: any[];
  topologyConnections: any[];
  handleCommand: any;
  handleClearTerminal: () => void;
  handleUpdateHistory: (deviceId: string, history: string[]) => void;
  confirmDialog: any;
  setConfirmDialog: any;
  isExecutingCommand: boolean;
  output: any;
  prompt: string;
  state: any;
  activeDeviceTasks: any[];
  taskContext: any;
  unifiedDrag: any;
  firewallDrag: any;

  // Firewall
  showFirewallPanel: boolean;
  setShowFirewallPanel: (show: boolean) => void;
  activeFirewallId: string | null;
  firewallActiveTab: any;
  setFirewallActiveTab: (tab: any) => void;
  handleExecuteCommand: any;
  toggleDevicePower: any;
  updateDeviceConfig: any;

  // PC window
  showPCPanel: boolean;
  setShowPCPanel: (show: boolean) => void;
  showPCDeviceId: string;
  cableInfo: any;
  pcPanelInitialTab: any;
  pcOutputs: any;
  setPcOutputs: PcOutputsSetter;
  pcHistories: any;
  handleUpdatePCHistory: (deviceId: string, history: string[]) => void;
  handlePCPanelNavigateWrapper: (program: string) => void;
  handleDeviceDelete: any;
  focusedOverlay: string;
  pcDrag: any;

  // Router
  showRouterPanel: boolean;
  setShowRouterPanel: (show: boolean) => void;
  showRouterDeviceId: string;
  routerDrag: any;
}

export function PagePanelWindows({
  t,
  theme,
  isDark,
  isTR,
  language,
  isTablet,
  helpLevel,

  showUnifiedDeviceModal,
  setShowUnifiedDeviceModal,
  unifiedDeviceActiveTab,
  setUnifiedDeviceActiveTab,
  activeDeviceId,
  activeDeviceType,
  deviceStates,
  deviceOutputs,
  topologyDevices,
  topologyConnections,
  handleCommand,
  handleClearTerminal,
  handleUpdateHistory,
  confirmDialog,
  setConfirmDialog,
  isExecutingCommand,
  output,
  prompt,
  state,
  activeDeviceTasks,
  taskContext,
  unifiedDrag,
  firewallDrag,

  showFirewallPanel,
  setShowFirewallPanel,
  activeFirewallId,
  firewallActiveTab,
  setFirewallActiveTab,
  handleExecuteCommand,
  toggleDevicePower,
  updateDeviceConfig,

  showPCPanel,
  setShowPCPanel,
  showPCDeviceId,
  cableInfo,
  pcPanelInitialTab,
  pcOutputs,
  setPcOutputs,
  pcHistories,
  handleUpdatePCHistory,
  handlePCPanelNavigateWrapper,
  handleDeviceDelete,
  focusedOverlay,
  pcDrag,

  showRouterPanel,
  setShowRouterPanel,
  showRouterDeviceId,
  routerDrag,
}: PagePanelWindowsProps) {
  return (
    <>
      <UnifiedDevicePanel
        isOpen={showUnifiedDeviceModal && !isTablet}
        onOpenChange={setShowUnifiedDeviceModal}
        activeTab={unifiedDeviceActiveTab}
        onTabChange={setUnifiedDeviceActiveTab}
        deviceId={activeDeviceId}
        deviceType={activeDeviceType}
        deviceStates={deviceStates}
        topologyDevices={topologyDevices}
        topologyConnections={topologyConnections}
        handleCommand={handleCommand}
        handleClearTerminal={handleClearTerminal}
        handleUpdateHistory={handleUpdateHistory}
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        t={t}
        theme={theme}
        language={language}
        helpLevel={helpLevel}
        isDark={isDark}
        isExecutingCommand={isExecutingCommand}
        output={output}
        prompt={prompt}
        state={state}
        activeDeviceTasks={activeDeviceTasks}
        taskContext={taskContext}
        modalPosition={unifiedDrag.position}
        modalSize={unifiedDrag.size}
        handlePointerDown={unifiedDrag.handlePointerDown}
        handleResizeStart={unifiedDrag.handleResizeStart}
      />

      <FirewallWindow
        showFirewallPanel={showFirewallPanel}
        setShowFirewallPanel={setShowFirewallPanel}
        activeFirewallId={activeFirewallId}
        topologyDevices={topologyDevices}
        t={t}
        theme={theme}
        isDark={isDark}
        isTR={isTR}
        firewallActiveTab={firewallActiveTab}
        setFirewallActiveTab={setFirewallActiveTab}
        deviceStates={deviceStates}
        deviceOutputs={deviceOutputs}
        handleExecuteCommand={handleExecuteCommand}
        handleUpdateHistory={handleUpdateHistory}
        setConfirmDialog={setConfirmDialog}
        confirmDialog={confirmDialog}
        toggleDevicePower={toggleDevicePower}
        updateDeviceConfig={updateDeviceConfig}
        firewallDrag={firewallDrag}
      />

      <PCWindow
        showPCPanel={showPCPanel}
        setShowPCPanel={setShowPCPanel}
        isTablet={isTablet}
        showPCDeviceId={showPCDeviceId}
        topologyDevices={topologyDevices}
        topologyConnections={topologyConnections}
        cableInfo={cableInfo}
        pcPanelInitialTab={pcPanelInitialTab}
        deviceStates={deviceStates}
        deviceOutputs={deviceOutputs}
        pcOutputs={pcOutputs}
        setPcOutputs={setPcOutputs}
        pcHistories={pcHistories}
        handleUpdatePCHistory={handleUpdatePCHistory}
        handleExecuteCommand={handleExecuteCommand}
        handlePCPanelNavigateWrapper={handlePCPanelNavigateWrapper}
        handleDeviceDelete={handleDeviceDelete}
        focusedOverlay={focusedOverlay}
        isDark={isDark}
        t={t}
        toggleDevicePower={toggleDevicePower}
        pcDrag={pcDrag}
      />

      <MultiDeviceWindowManager
        topologyDevices={topologyDevices}
        topologyConnections={topologyConnections}
        cableInfo={cableInfo}
        deviceStates={deviceStates}
        deviceOutputs={deviceOutputs}
        pcOutputs={pcOutputs}
        setPcOutputs={setPcOutputs}
        pcHistories={pcHistories}
        handleUpdatePCHistory={handleUpdatePCHistory}
        handleUpdateHistory={handleUpdateHistory}
        handleExecuteCommand={handleExecuteCommand}
        handleDeviceDelete={handleDeviceDelete}
        isDark={isDark}
        language={language}
        theme={theme}
        t={t}
        toggleDevicePower={toggleDevicePower}
        updateDeviceConfig={updateDeviceConfig}
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        isTablet={isTablet}
      />

      <WindowSwitcherModal
        topologyDevices={topologyDevices}
        isDark={isDark}
        language={language}
      />

      <RouterPanel
        deviceId={showRouterDeviceId}
        isVisible={showRouterPanel && !isTablet}
        onClose={() => setShowRouterPanel(false)}
        topologyDevices={topologyDevices || undefined}
        topologyConnections={topologyConnections}
        deviceStates={deviceStates}
        modalPosition={routerDrag.position}
        modalSize={routerDrag.size}
        handlePointerDown={routerDrag.handlePointerDown}
        handleResizeStart={routerDrag.handleResizeStart}
        className={focusedOverlay === 'router-info' ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]" : "border-emerald-950/80"}
      />
    </>
  );
}

