'use client';

import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { PCPanel } from './PCPanel';
import { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { CableInfo, SwitchState } from '@/lib/network/types';
import { TerminalOutput } from './Terminal';
import { OutputLine as PCOutputLine, PcOutputsSetter } from './pc-panel/PCPanel.types';
import { cn } from '@/lib/utils';

interface PCWindowProps {
  showPCPanel: boolean;
  setShowPCPanel: (show: boolean) => void;
  showPCDeviceId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pcDrag: any;
  cableInfo: CableInfo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pcPanelInitialTab: any;
  toggleDevicePower: (id: string) => void;
  topologyDevices?: CanvasDevice[];
  topologyConnections?: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  pcOutputs: Map<string, PCOutputLine[]>;
  setPcOutputs: PcOutputsSetter;
  pcHistories: Map<string, string[]>;
  handleUpdatePCHistory: (id: string, history: string[]) => void;
  handleExecuteCommand: (id: string, cmd: string) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlePCPanelNavigateWrapper: (deviceId: string, program: any) => void;
  handleDeviceDelete: (id: string) => void;
  focusedOverlay: string | null;
  isTablet?: boolean;
  isDark: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: Record<string, any>;
}

export function PCWindow({
  showPCPanel,
  setShowPCPanel,
  showPCDeviceId,
  pcDrag,
  cableInfo,
  pcPanelInitialTab,
  toggleDevicePower,
  topologyDevices,
  topologyConnections,
  deviceStates,
  deviceOutputs,
  pcOutputs,
  setPcOutputs,
  pcHistories,
  handleUpdatePCHistory,
  handleExecuteCommand,
  handlePCPanelNavigateWrapper,
  handleDeviceDelete,
  focusedOverlay,
  isTablet = false,
  isDark,
  t,
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
      collapsible
      className={cn(focusedOverlay === 'pc-info' ? "border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]" : "border-emerald-950/80")}
    >
      <div className="flex-1 overflow-hidden relative rounded-b-xl">
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
          setPcOutputs={setPcOutputs}
          pcHistories={pcHistories}
          onUpdatePCHistory={handleUpdatePCHistory}
          onExecuteDeviceCommand={handleExecuteCommand}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onNavigate={(program: any) => handlePCPanelNavigateWrapper(showPCDeviceId, program)}
          onDeleteDevice={handleDeviceDelete}
          handleResizeStart={pcDrag.handleResizeStart}
        />
      </div>
    </DraggableWindowWrapper>
  );
}
