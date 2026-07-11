'use client';

import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { FirewallPanel } from './FirewallPanel';
import { CanvasDevice, FirewallRule } from './networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import type { Translations } from '@/contexts/LanguageContext';
import { TerminalOutput } from './Terminal';

interface FirewallWindowProps {
  showFirewallPanel: boolean;
  setShowFirewallPanel: (show: boolean) => void;
  activeFirewallId: string | null;
  topologyDevices: CanvasDevice[];
  t: Translations;
  theme: string;
  isDark: boolean;
  isTR: boolean;
  firewallActiveTab: 'console' | 'rules' | 'settings';
  setFirewallActiveTab: (tab: 'console' | 'settings') => void;
  deviceStates: Map<string, SwitchState>;
  deviceOutputs: Map<string, TerminalOutput[]>;
  handleExecuteCommand: (deviceId: string, command: string) => Promise<unknown>;
  handleUpdateHistory: (deviceId: string, history: string[]) => void;
  setConfirmDialog: (dialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null) => void;
  confirmDialog: { show: boolean; message: string; action: string; onConfirm: () => void } | null;
  toggleDevicePower: (deviceId: string) => void;
  updateDeviceConfig: (deviceId: string, config: { firewallRules: FirewallRule[] }) => void;
  firewallDrag: {
    position: { x: number; y: number };
    size: { width: number; height: number };
    handlePointerDown: (e: React.PointerEvent, id: string) => void;
    handleResizeStart: (e: React.PointerEvent, direction: string, id: string) => void;
  };
}

export function FirewallWindow({
  showFirewallPanel,
  setShowFirewallPanel,
  activeFirewallId,
  topologyDevices,
  t,
  theme,
  isDark,
  isTR,
  firewallActiveTab,
  setFirewallActiveTab,
  deviceStates,
  deviceOutputs,
  handleExecuteCommand,
  handleUpdateHistory,
  setConfirmDialog,
  confirmDialog,
  toggleDevicePower,
  updateDeviceConfig,
  firewallDrag,
}: FirewallWindowProps) {
  if (!showFirewallPanel) return null;

  return (
    <DraggableWindowWrapper
      id="firewall"
      title={`${isTR ? 'Firewall' : 'Firewall'} - ${topologyDevices?.find((d: CanvasDevice) => d.id === activeFirewallId)?.name || activeFirewallId}`}
      isOpen={showFirewallPanel}
      onClose={() => {
        setShowFirewallPanel(false);
        setFirewallActiveTab('console');
      }}
      isDark={isDark}
      modalPosition={firewallDrag.position}
      modalSize={firewallDrag.size}
      handlePointerDown={firewallDrag.handlePointerDown}
      handleResizeStart={firewallDrag.handleResizeStart}
      onEscapeKeyDown={() => {
        setShowFirewallPanel(false);
        setFirewallActiveTab('console');
      }}
    >
      <div className="flex-1 overflow-y-auto rounded-b-2xl p-4 custom-scrollbar">
        {activeFirewallId && (
          <FirewallPanel
            device={topologyDevices.find(d => d.id === activeFirewallId) as CanvasDevice}
            t={t}
            theme={theme}
            isDevicePoweredOff={topologyDevices.find(d => d.id === activeFirewallId)?.status === 'offline'}
            onUpdateRules={(rules) => {
              updateDeviceConfig(activeFirewallId as string, { firewallRules: rules });
            }}
            deviceStates={deviceStates}
            deviceOutputs={deviceOutputs}
            onExecuteCommand={(cmd) => handleExecuteCommand(activeFirewallId as string, cmd)}
            onUpdateHistory={handleUpdateHistory}
            setConfirmDialog={setConfirmDialog}
            confirmDialog={confirmDialog}
            topologyDevices={topologyDevices}
            activeTab={firewallActiveTab === 'rules' ? 'settings' : firewallActiveTab}
            onTabChange={(tab) => setFirewallActiveTab(tab)}
            onTogglePower={toggleDevicePower}
          />
        )}
      </div>
    </DraggableWindowWrapper>
  );
}
