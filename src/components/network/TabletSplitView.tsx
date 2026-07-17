'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedDevicePanel } from '@/components/network/UnifiedDevicePanel';
import { PCPanel } from '@/components/network/PCPanel';
import { RouterPanel } from '@/components/network/RouterPanel';
import { CanvasDevice, CanvasConnection, DeviceType } from './networkTopology.types';
import { CableInfo, SwitchState } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TerminalOutput } from './Terminal';
import { OutputLine as PCOutputLine, PCActiveTab } from './pc-panel/PCPanel.types';
import type { TaskDefinition, TaskContext } from '@/lib/network/taskDefinitions';

interface TabletSplitViewProps {
  isTablet: boolean;
  showPCPanel: boolean;
  setShowPCPanel: (show: boolean) => void;
  showUnifiedDeviceModal: boolean;
  setShowUnifiedDeviceModal: (show: boolean) => void;
  showRouterPanel: boolean;
  setShowRouterPanel: (show: boolean) => void;
  unifiedDeviceActiveTab: 'console' | 'settings' | 'stp';
  setUnifiedDeviceActiveTab: (tab: 'console' | 'settings' | 'stp') => void;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  deviceStates: Map<string, SwitchState>;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  handleCommand: (command: string) => Promise<unknown>;
  handleClearTerminal: () => void;
  toggleDevicePower: (deviceId: string) => void;
  handleUpdateHistory: (deviceId: string, history: string[]) => void;
  confirmDialog: { show: boolean; message?: string; onConfirm: () => void } | null;
  setConfirmDialog: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  t: Translations;
  theme: string;
  language: 'tr' | 'en';
  helpLevel: 'beginner' | 'intermediate' | 'exam';
  isDark: boolean;
  isExecutingCommand: boolean;
  output: TerminalOutput[];
  prompt: string;
  state: SwitchState;
  activeDeviceTasks: TaskDefinition[];
  taskContext: TaskContext;
  showPCDeviceId: string;
  cableInfo: CableInfo;
  pcPanelInitialTab: PCActiveTab;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  pcHistories: Map<string, string[]>;
  handleUpdatePCHistory: (deviceId: string, history: string[]) => void;
  handleExecuteCommand: (deviceId: string, command: string) => Promise<unknown>;
  handlePCPanelNavigateWrapper: (program: string) => void;
  handleDeviceDelete: (deviceId: string) => void;
  showRouterDeviceId: string;
  focusedOverlay: string;
}

export function TabletSplitView({
  isTablet,
  showPCPanel,
  setShowPCPanel,
  showUnifiedDeviceModal,
  setShowUnifiedDeviceModal,
  showRouterPanel,
  setShowRouterPanel,
  unifiedDeviceActiveTab,
  setUnifiedDeviceActiveTab,
  activeDeviceId,
  activeDeviceType,
  deviceStates,
  topologyDevices,
  topologyConnections,
  handleCommand,
  handleClearTerminal,
  toggleDevicePower,
  handleUpdateHistory,
  confirmDialog,
  setConfirmDialog,
  t,
  theme,
  language,
  helpLevel,
  isDark,
  isExecutingCommand,
  output,
  prompt,
  state,
  activeDeviceTasks,
  taskContext,
  showPCDeviceId,
  cableInfo,
  pcPanelInitialTab,
  deviceOutputs,
  pcOutputs,
  pcHistories,
  handleUpdatePCHistory,
  handleExecuteCommand,
  handlePCPanelNavigateWrapper,
  handleDeviceDelete,
  showRouterDeviceId,
  focusedOverlay,
}: TabletSplitViewProps) {
  if (!isTablet || (!showPCPanel && !showUnifiedDeviceModal && !showRouterPanel)) return null;

  return (
    <div className="w-1/2 h-full bg-background/50 backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-500 border-l border-primary/10 relative z-50">
      {showUnifiedDeviceModal && (
        <UnifiedDevicePanel
          isOpen={true}
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
          toggleDevicePower={toggleDevicePower}
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
          modalPosition={{ x: 0, y: 0 }}
          modalSize={{ width: 0, height: 0 }}
          handlePointerDown={() => { }}
          handleResizeStart={() => { }}
          className="!static !w-full !h-full !translate-x-0 !translate-y-0 !shadow-none !border-none !rounded-none"
        />
      )}
      {showPCPanel && (
        <div className="h-full flex flex-col">
          <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "bg-secondary-900" : "bg-secondary-50", focusedOverlay === 'pc-info' ? "border-emerald-400 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]" : "border-emerald-950/80")}>
            <h2 className="font-bold text-sm truncate">
              {t.pcTerminal} - {topologyDevices?.find((d: CanvasDevice) => d.id === showPCDeviceId)?.name || showPCDeviceId}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowPCPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <PCPanel
            deviceId={showPCDeviceId}
            cableInfo={cableInfo}
            initialTab={pcPanelInitialTab}
            isVisible={true}
            onClose={() => setShowPCPanel(false)}
            onTogglePower={toggleDevicePower}
            topologyDevices={topologyDevices || undefined}
            topologyConnections={topologyConnections || undefined}
            deviceStates={deviceStates}
            deviceOutputs={deviceOutputs}
            pcOutputs={pcOutputs}
            pcHistories={pcHistories}
            onUpdatePCHistory={handleUpdatePCHistory}
            onExecuteDeviceCommand={handleExecuteCommand}
            onNavigate={handlePCPanelNavigateWrapper}
            onDeleteDevice={handleDeviceDelete}
            className="!flex-1"
          />
        </div>
      )}
      {showRouterPanel && (
        <div className="h-full flex flex-col">
          <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "bg-secondary-900" : "bg-secondary-50", focusedOverlay === 'router-info' ? "border-emerald-400 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]" : "border-emerald-950/80")}>
            <h2 className="font-bold text-sm truncate">
              {t.configure} - {topologyDevices?.find((d: CanvasDevice) => d.id === showRouterDeviceId)?.name || showRouterDeviceId}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowRouterPanel(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <RouterPanel
            deviceId={showRouterDeviceId}
            isVisible={true}
            onClose={() => setShowRouterPanel(false)}
            topologyDevices={topologyDevices || undefined}
            topologyConnections={topologyConnections}
            deviceStates={deviceStates}
            modalPosition={{ x: 0, y: 0 }}
            modalSize={{ width: 0, height: 0 }}
            handlePointerDown={() => { }}
            handleResizeStart={() => { }}
            className="!static !w-full !h-full !translate-x-0 !translate-y-0 !shadow-none !border-none !rounded-none"
          />
        </div>
      )}
    </div>
  );
}
