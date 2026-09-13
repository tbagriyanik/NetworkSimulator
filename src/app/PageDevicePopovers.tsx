'use client';

import { CanvasDevice, CanvasConnection } from '@/components/network/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { PCInfoPopover, RouterInfoPopover } from '@/components/network/DeviceInfoPopovers';
import { useMultiWindowStore } from '@/hooks/useMultiWindowStore';

interface PageDevicePopoversProps {
  showDevicePopovers: boolean;
  activeDeviceId: string;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  topologyConnections: CanvasConnection[];
  t: Record<string, any>;
  language: string;
  isDark: boolean;
  focusedOverlay: string | null;
  setFocusedOverlay: (overlay: any) => void;
  setSelectedDevice: (d: any) => void;
  setActiveDeviceId: (id: string) => void;
  setActiveDeviceType: (type: any) => void;
  setUnifiedDeviceActiveTab: (tab: any) => void;
  setShowPCDeviceId: (id: string) => void;
  setPcPanelInitialTab: (tab: any) => void;
  getOrCreatePCOutputs: (id: string, devices: CanvasDevice[]) => void;
  handleDeviceDoubleClick: (type: any, id: string) => void;
}

export function PageDevicePopovers({
  showDevicePopovers,
  activeDeviceId,
  topologyDevices,
  deviceStates,
  topologyConnections,
  t,
  language,
  isDark,
  focusedOverlay,
  setFocusedOverlay,
  setSelectedDevice,
  setActiveDeviceId,
  setActiveDeviceType,
  setUnifiedDeviceActiveTab,
  setShowPCDeviceId,
  setPcPanelInitialTab,
  getOrCreatePCOutputs,
  handleDeviceDoubleClick,
}: PageDevicePopoversProps) {
  if (!showDevicePopovers) return null;

  const activeDevice = activeDeviceId
    ? topologyDevices?.find(d => d.id === activeDeviceId) ?? null
    : null;
  const isPcDevice = activeDevice?.type === 'pc' || activeDeviceId?.startsWith('pc-');

  return (
    <>
      {isPcDevice && activeDevice && (
        <PCInfoPopover
          pc={activeDevice}
          t={t as any}
          language={language as 'tr' | 'en'}
          isDark={isDark}
          isFocused={focusedOverlay === 'pc-info'}
          onClose={() => {
            setSelectedDevice(null);
            setActiveDeviceId('');
          }}
          onFocus={() => setFocusedOverlay('pc-info')}
          zIndex={focusedOverlay === 'pc-info' ? 36 : 25}
          handleDeviceDoubleClick={handleDeviceDoubleClick as any}
          onOpenPanel={(id) => handleDeviceDoubleClick('pc', id)}
          onOpenSettings={(id) => {
            setShowPCDeviceId(id);
            getOrCreatePCOutputs(id, topologyDevices);
            setPcPanelInitialTab('settings');
            useMultiWindowStore.getState().openDeviceWindow(id, 'pc', 'settings');
          }}
          topologyDevices={topologyDevices}
          deviceStates={deviceStates}
        />
      )}

      {activeDeviceId && (activeDeviceId.startsWith('router-') || topologyDevices?.find(d => d.id === activeDeviceId)?.type === 'router') && topologyDevices && (
        <RouterInfoPopover
          router={topologyDevices.find(d => d.id === activeDeviceId) as CanvasDevice}
          routerState={deviceStates.get(activeDeviceId)}
          t={t as any}
          language={language as 'tr' | 'en'}
          isDark={isDark}
          isFocused={focusedOverlay === 'router-info'}
          onClose={() => {
            setSelectedDevice(null);
            setActiveDeviceId('');
          }}
          onFocus={() => setFocusedOverlay('router-info')}
          zIndex={focusedOverlay === 'router-info' ? 36 : 25}
          handleDeviceDoubleClick={handleDeviceDoubleClick as any}
          onOpenPanel={(id) => handleDeviceDoubleClick('router', id)}
          onOpenSettings={(id) => {
            setActiveDeviceId(id);
            const device = topologyDevices?.find(d => d.id === id);
            if (device) setActiveDeviceType(device.type);
            setUnifiedDeviceActiveTab('settings');
            useMultiWindowStore.getState().openDeviceWindow(id, device?.type || 'router', 'settings');
          }}
          topologyConnections={topologyConnections}
        />
      )}
    </>
  );
}
