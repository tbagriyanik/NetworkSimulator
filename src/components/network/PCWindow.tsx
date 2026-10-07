'use client';

import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { PCPanel } from './PCPanel';
import { CanvasDevice, CanvasConnection } from './NetworkTopology/types/networkTopology.types';
import { CableInfo, SwitchState } from '@/lib/network/types';
import { TerminalOutput } from './Terminal';
import { OutputLine as PCOutputLine, PcOutputsSetter } from './pc-panel/PCPanel.types';

import type { UseDragReturn } from '@/hooks/useDrag';
import type { PCActiveTab } from './pc-panel/PCPanel.types';

import { WINDOW_FOCUS_BORDER_CLASS } from '@/components/ui/windowStandards';

interface PCWindowProps {
  showPCPanel: boolean;
  setShowPCPanel: (show: boolean) => void;
  showPCDeviceId: string;
  pcDrag: UseDragReturn;
  cableInfo: CableInfo;
  pcPanelInitialTab?: PCActiveTab | null;
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
  handlePCPanelNavigateWrapper: (deviceId: string, program: string) => void;
  handleDeviceDelete: (id: string) => void;
  focusedOverlay: string | null;
  isTablet?: boolean;
  isDark: boolean;
  t: Record<string, string>;
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
      className={WINDOW_FOCUS_BORDER_CLASS(focusedOverlay === 'pc-info', isDark)}
    >
      <div className="flex-1 overflow-hidden relative rounded-b-xl">
        <PCPanel
          key="pc-panel"
          className="h-full min-h-0 !border-none"
          deviceId={showPCDeviceId}
          cableInfo={cableInfo}
          initialTab={pcPanelInitialTab ?? undefined}
          isVisible
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
          onNavigate={(program: string) => handlePCPanelNavigateWrapper(showPCDeviceId, program)}
          onDeleteDevice={handleDeviceDelete}
          handleResizeStart={pcDrag.handleResizeStart}
        />
      </div>
    </DraggableWindowWrapper>
  );
}

