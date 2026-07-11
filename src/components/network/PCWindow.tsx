'use client';

import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { PCPanel } from './PCPanel';
import { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { CableInfo, SwitchState } from '@/lib/network/types';
import { cn } from '@/lib/utils';

import { TerminalOutput } from './Terminal';
import { OutputLine as PCOutputLine, PCActiveTab } from './pc-panel/PCPanel.types';

interface PCWindowProps {
  showPCPanel: boolean;
  setShowPCPanel: (show: boolean) => void;
  isTablet: boolean;
  showPCDeviceId: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  cableInfo: CableInfo;
  pcPanelInitialTab: PCActiveTab;
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  pcHistories: Map<string, string[]>;
  handleUpdatePCHistory: (deviceId: string, history: string[]) => void;
  handleExecuteCommand: (deviceId: string, command: string) => Promise<unknown>;
  handlePCPanelNavigateWrapper: (program: string) => void;
  handleDeviceDelete: (deviceId: string) => void;
  focusedOverlay: string;
  isDark: boolean;
  t: Record<string, string>;
  toggleDevicePower: (deviceId: string) => void;
  pcDrag: {
    position: { x: number; y: number };
    size: { width: number; height: number };
    handlePointerDown: (e: React.PointerEvent, id: string) => void;
    handleResizeStart: (e: React.PointerEvent, direction: string, id: string) => void;
  };
}

export function PCWindow({
  showPCPanel,
  setShowPCPanel,
  isTablet,
  showPCDeviceId,
  topologyDevices,
  topologyConnections,
  cableInfo,
  pcPanelInitialTab,
  deviceStates,
  deviceOutputs,
  pcOutputs,
  pcHistories,
  handleUpdatePCHistory,
  handleExecuteCommand,
  handlePCPanelNavigateWrapper,
  handleDeviceDelete,
  focusedOverlay,
  isDark,
  t,
  toggleDevicePower,
  pcDrag,
}: PCWindowProps) {
  if (!showPCPanel || isTablet) return null;

  return (
    <DraggableWindowWrapper
      id="pc"
      title={`${t.pcTerminal} - ${topologyDevices?.find((d: CanvasDevice) => d.id === showPCDeviceId)?.name || showPCDeviceId}`}
      isOpen={showPCPanel}
      onClose={() => setShowPCPanel(false)}
      isDark={isDark}
      modalPosition={pcDrag.position}
      modalSize={pcDrag.size}
      handlePointerDown={pcDrag.handlePointerDown}
      handleResizeStart={pcDrag.handleResizeStart}
      className={cn(focusedOverlay === 'pc-info' ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]" : "border-emerald-950/80")}
    >
      <div className="flex-1 overflow-hidden relative rounded-b-2xl">
        <PCPanel
          key="pc-panel"
          className="h-full min-h-0 !border-none"
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
          handleResizeStart={pcDrag.handleResizeStart}
        />
      </div>
    </DraggableWindowWrapper>
  );
}
