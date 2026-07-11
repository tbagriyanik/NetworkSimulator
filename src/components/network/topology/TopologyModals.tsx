import { SetStateAction, Dispatch } from 'react';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Cable, LineSquiggle, Plug, TrendingUpDown, Wifi } from "lucide-react";
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { CableInfo } from '@/lib/network/types';
import type { PingAnimationState } from '../hooks/usePingSequence';
import type { HopPacketInfo } from '../PingPacketInfoPanel';
import type { CapturedPacket } from '@/lib/store/appStore';
import { DeviceConfigModal } from '../DeviceConfigModal';
import { PacketPopup } from './PacketPopup';
import { PacketCapturePanel } from '../PacketCapturePanel';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { DEVICE_ICONS } from './DeviceIcons';
import { flushSync } from 'react-dom';

const PingPacketInfoPanel = dynamic(
  () => import('../PingPacketInfoPanel').then((m) => m.PingPacketInfoPanel),
  { ssr: false }
);

const LazyNetworkTopologyPortSelectorModal = dynamic(
  () => import('../LazyNetworkTopologyPortSelectorModal').then((m) => m.LazyNetworkTopologyPortSelectorModal),
  { ssr: false }
);

interface TopologyModalsProps {
  configuringDevice: string | null;
  deviceMap: Map<string, CanvasDevice>;
  cancelDeviceConfig: () => void;
  saveDeviceConfig: (deviceId: string, updates: Partial<CanvasDevice>) => void;
  isMobile: boolean;
  isDark: boolean;
  
  pingAnimation: PingAnimationState | null;
  hopPacketInfos: HopPacketInfo[];
  handlePingPlay: () => void;
  handlePingPause: () => void;
  handlePingNext: () => void;
  handlePingClose: () => void;
  language: 'tr' | 'en';
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
  isTR: boolean;
  addDevice: (type: 'pc' | 'iot' | 'switch' | 'router' | 'firewall' | 'wlc', layer?: 'L2' | 'L3') => void;
  cableInfo: CableInfo;
  onCableChange: (info: CableInfo) => void;
  
  showPortSelector: boolean;
  devices: CanvasDevice[];
  portSelectorStep: 'source' | 'target';
  selectedSourcePort: { deviceId: string; portId: string } | null;
  setShowPortSelector: (show: boolean) => void;
  setPortSelectorStep: (step: 'source' | 'target') => void;
  setSelectedSourcePort: (port: { deviceId: string; portId: string } | null) => void;
  setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
  setDevices: Dispatch<SetStateAction<CanvasDevice[]>>;
  connections: CanvasConnection[];
  
  activeCaptureConnectionId: string | null;
  clearCapturedPackets: (connectionId: string) => void;
  setActiveCaptureConnection: (id: string | null) => void;
  capturedPacketsMap: Record<string, CapturedPacket[]>;
  t: Record<string, string>;
}

export function TopologyModals({
  configuringDevice,
  deviceMap,
  cancelDeviceConfig,
  saveDeviceConfig,
  isMobile,
  isDark,
  
  pingAnimation,
  hopPacketInfos,
  handlePingPlay,
  handlePingPause,
  handlePingNext,
  handlePingClose,
  language,
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
  isTR,
  addDevice,
  cableInfo,
  onCableChange,
  
  showPortSelector,
  devices,
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
  setActiveCaptureConnection,
  capturedPacketsMap,
  t
}: TopologyModalsProps) {
  return (
    <>
      {/* Device Configuration Modal (Name & IP) */}
      {(() => {
        if (!configuringDevice) return null;
        const d = deviceMap.get(configuringDevice);
        return d ? (
          <DeviceConfigModal
            device={d}
            onClose={cancelDeviceConfig}
            onSave={saveDeviceConfig}
            isMobile={isMobile}
            isDark={isDark}
          />
        ) : null;
      })()}

      {/* Ping Packet Info Panel */}
      {pingAnimation && (
        <PingPacketInfoPanel
          isVisible={!!(pingAnimation.showPacketPanel)}
          isPaused={!!pingAnimation.isPaused}
          hopPacketInfos={hopPacketInfos}
          currentHopIndex={pingAnimation.currentHopIndex}
          totalHops={pingAnimation.path.length - 1}
          onPlay={handlePingPlay}
          onPause={handlePingPause}
          onNext={handlePingNext}
          onClose={handlePingClose}
          language={language}
          isDark={isDark}
          graphicsQuality={graphicsQuality}
          isMobile={isMobile}
          onFocus={onPacketPanelFocus}
          zIndex={packetPanelZIndex}
          success={pingAnimation.success}
          isReturn={!!pingAnimation.isReturn}
          errorMessage={pingAnimation.error}
          sourceName={deviceMap.get(pingAnimation.sourceId)?.name ?? pingAnimation.sourceId}
          targetName={deviceMap.get(pingAnimation.targetId)?.name ?? pingAnimation.targetId}
          sourceIp={deviceMap.get(pingAnimation.sourceId)?.ip ?? ''}
          targetIp={deviceMap.get(pingAnimation.targetId)?.ip ?? ''}
          isFocused={true}
        />
      )}

      {/* Packet Content Popup */}
      {packetPopupHop !== null && hopPacketInfos[packetPopupHop] && (
        <PacketPopup
          hopIndex={packetPopupHop}
          info={hopPacketInfos[packetPopupHop]}
          language={language}
          isDark={isDark}
          onClose={() => setPacketPopupHop(null)}
          isFocused={true}
        />
      )}

      {/* Persistent Error Toast */}
      {errorToast && !errorToast.type && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-start gap-2 bg-error-600 text-white max-w-md">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex flex-col flex-grow">
              <span className="text-sm font-medium">{errorToast.message}</span>
              {errorToast.details && (
                <span className="text-xs opacity-90 mt-0.5">{errorToast.details}</span>
              )}
            </div>
            <TooltipWrapper title={t.close}>
              <button
                onClick={() => setErrorToast(null)}
                className="flex-shrink-0 ml-2 hover:bg-error-700 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </TooltipWrapper>
          </div>
        </div>
      )}

      {/* Connection Error Toast */}
      {connectionError && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-center gap-2 bg-error-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">{connectionError}</span>
          </div>
        </div>
      )}

      {/* Mobile Device Palette Sheet */}
      <Sheet open={mobilePaletteOpen} onOpenChange={setMobilePaletteOpen}>
        <SheetContent side="bottom" className={`rounded-t-[2rem] px-6 pb-10 border-t-2 border-primary/20 backdrop-blur-xl ${isDark ? 'bg-secondary-900/95' : 'bg-white/95'}`}>
          <SheetHeader className="mb-4 pt-2">
            <SheetTitle className={`text-center font-black tracking-tighter text-xl uppercase ${isDark ? 'text-white' : 'text-secondary-900'}`}>
              {isTR ? 'Cihaz & Kablo Ekle' : 'Add Device & Cable'}
            </SheetTitle>
          </SheetHeader>

          {/* Devices */}
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
            {isTR ? 'Cihazlar' : 'Devices'}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-5">
            {([
              { type: 'pc' as const, label: 'PC', layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.pc },
              { type: 'switch' as const, label: 'L2 SW', layer: 'L2' as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.switchL2 },
              { type: 'switch' as const, label: 'L3 SW', layer: 'L3' as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.switchL3 },
              { type: 'router' as const, label: 'Router', layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.router },
              { type: 'firewall' as const, label: 'Firewall', layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.firewall },
              { type: 'iot' as const, label: 'IoT', layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.iot },
              { type: 'wlc' as const, label: 'WLC', layer: undefined as 'L2' | 'L3' | undefined, icon: DEVICE_ICONS.wlc },
            ]).map((item) => (
              <button
                key={`${item.type}-${item.layer || ''}`}
                onClick={() => {
                  addDevice(item.type, item.layer);
                  setMobilePaletteOpen(false);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${isDark
                  ? 'border-secondary-700 bg-secondary-800/50 hover:bg-secondary-800'
                  : 'border-secondary-200 bg-secondary-50 hover:bg-secondary-100'}`}
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-secondary-300' : 'text-secondary-600'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* Cables */}
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
            {isTR ? 'Kablolar' : 'Cables'}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {([
              { type: 'straight' as const, label: isTR ? 'Düz' : 'Straight', icon: <Cable className="w-5 h-5" />, activeColor: 'text-primary-400', color: 'text-primary-500' },
              { type: 'crossover' as const, label: isTR ? 'Çapraz' : 'Crossover', icon: <LineSquiggle className="w-5 h-5" />, activeColor: 'text-warning-400', color: 'text-warning-500' },
              { type: 'serial' as const, label: isTR ? 'Seri' : 'Serial', icon: <Plug className="w-5 h-5" />, activeColor: 'text-success-400', color: 'text-success-500' },
              { type: 'console' as const, label: isTR ? 'Konsol' : 'Console', icon: <TrendingUpDown className="w-5 h-5" />, activeColor: 'text-accent-400', color: 'text-accent-500' },
              { type: 'wireless' as const, label: isTR ? 'Kablo-' : 'Wireless', icon: <Wifi className="w-5 h-5" />, activeColor: 'text-purple-400', color: 'text-purple-500' },
            ]).map((item) => {
              const isActive = cableInfo.cableType === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => { onCableChange({ ...cableInfo, cableType: item.type }); setMobilePaletteOpen(false); }}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all active:scale-95 ${isActive
                    ? isDark
                      ? 'border-secondary-500 bg-secondary-700/80'
                      : 'border-secondary-400 bg-secondary-200/80'
                    : isDark
                      ? 'border-secondary-700 bg-secondary-800/50 hover:bg-secondary-800'
                      : 'border-secondary-200 bg-secondary-50 hover:bg-secondary-100'}`}
                >
                  <div className={`relative flex items-center justify-center ${isActive ? item.activeColor : item.color}`}>
                    {item.icon}
                    {isActive && <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary-500 rounded-full" />}
                  </div>
                  <span className={`text-[9px] font-bold text-center leading-tight ${isActive ? item.activeColor : item.color}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <LazyNetworkTopologyPortSelectorModal
        isOpen={showPortSelector}
        isDark={isDark}
        graphicsQuality={graphicsQuality}
        devices={devices}
        cableType={cableInfo.cableType}
        portSelectorStep={portSelectorStep}
        selectedSourcePort={selectedSourcePort}
        onClose={() => {
          setShowPortSelector(false);
          setPortSelectorStep('source');
          setSelectedSourcePort(null);
        }}
        onCableTypeChange={(nextType) => onCableChange({ ...cableInfo, cableType: nextType })}
        onSelectPort={(deviceId, portId) => {
          if (portSelectorStep === 'source') {
            flushSync(() => {
              setSelectedSourcePort({ deviceId, portId });
              setPortSelectorStep('target');
            });
          } else {
            const srcPort = selectedSourcePort as { deviceId: string; portId: string };
            if (srcPort.deviceId === deviceId && srcPort.portId === portId) return;

            const newConnection: CanvasConnection = {
              id: `conn-${Date.now()}`,
              sourceDeviceId: srcPort.deviceId,
              sourcePort: srcPort.portId,
              targetDeviceId: deviceId,
              targetPort: portId,
              cableType: cableInfo.cableType,
              active: true,
            };

            flushSync(() => {
              setConnections((prev) => [...prev, newConnection]);
              setDevices((prev) =>
                prev.map((d) => {
                  if (d.id === srcPort.deviceId) {
                    return {
                      ...d,
                      ports: d.ports.map((p) =>
                        p.id === srcPort.portId ? { ...p, status: 'connected' as const } : p
                      ),
                    };
                  }
                  if (d.id === deviceId) {
                    return {
                      ...d,
                      ports: d.ports.map((p) =>
                        p.id === portId ? { ...p, status: 'connected' as const } : p
                      ),
                    };
                  }
                  return d;
                })
              );

              const sourceDevice = deviceMap.get(srcPort.deviceId);
              const targetDevice = deviceMap.get(deviceId);
              if (sourceDevice && targetDevice) {
                onCableChange({
                  ...cableInfo,
                  connected: true,
                  sourceDevice: sourceDevice.type,
                  targetDevice: targetDevice.type,
                });
              }

              setShowPortSelector(false);
              setPortSelectorStep('source');
              setSelectedSourcePort(null);
            });

            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('stp-recalculation-needed', {
                detail: { topologyDevices: devices, topologyConnections: [...connections, newConnection] }
              }));
            }, 0);
          }
        }}
      />

      {/* Packet Capture Panel */}
      {activeCaptureConnectionId && (
        <PacketCapturePanel
          activeCaptureConnectionId={activeCaptureConnectionId}
          clearCapturedPackets={clearCapturedPackets}
          setActiveCaptureConnection={setActiveCaptureConnection}
          capturedPacketsMap={capturedPacketsMap}
          t={t}
          isDark={isDark}
        />
      )}

      {/* Toast Notification */}
      {errorToast && errorToast.type && (
        <div
          role="alert"
          aria-live="polite"
          className={`fixed bottom-4 left-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 z-40 ${errorToast.type === 'success'
            ? isDark ? 'bg-success-500/20 border border-success-500/50 text-success-300' : 'bg-success-50 border border-success-200 text-success-700'
            : isDark ? 'bg-error-500/20 border border-error-500/50 text-error-300' : 'bg-error-50 border border-error-200 text-error-700'
            }`}
        >
          {errorToast.message}
        </div>
      )}
    </>
  );
}
