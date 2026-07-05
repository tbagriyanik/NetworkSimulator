import React from 'react';
import { CanvasDevice } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

export interface PortTooltipProps {
  portTooltip: {
    visible: boolean;
    x: number;
    y: number;
    deviceId: string;
    portId: string;
  };
  deviceMap: Map<string, CanvasDevice>;
  deviceStates?: Map<string, SwitchState>;
  isDark: boolean;
  language: string;
  getIotDeviceStatus: (device: CanvasDevice) => string;
  getIotPowerStatus: (device: CanvasDevice) => string;
  getIotOpenCloseStatus: (device: CanvasDevice) => string;
  getLivePortVlanText: (deviceId: string, portId: string) => string;
}

export const PortTooltip: React.FC<PortTooltipProps> = ({
  portTooltip,
  deviceMap,
  deviceStates,
  isDark,
  language,
  getIotDeviceStatus,
  getIotPowerStatus,
  getIotOpenCloseStatus,
  getLivePortVlanText
}) => {
  if (!portTooltip || !portTooltip.visible) return null;

  return (
    <div
      className={`fixed z-[100] pointer-events-none transition-opacity duration-300 ${portTooltip.visible ? 'opacity-100' : 'opacity-0'
        }`}
      style={{
        left: portTooltip.x,
        top: portTooltip.y - 35, // Increased distance from port (was -10)
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div
        className={`px-3 py-2 rounded-xl border liquid-glass-strong animate-scale-in shadow-2xl ${isDark
          ? 'border-secondary-700/50 text-white shadow-accent-500/10'
          : 'border-secondary-200/50 text-secondary-900 shadow-secondary-200/50'
          }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-2 h-2 rounded-full ${(() => {
            const dev = deviceMap.get(portTooltip.deviceId);
            const prt = dev?.ports.find(p => p.id === portTooltip.portId);
            const devState = deviceStates?.get(portTooltip.deviceId);
            const simPort = devState?.ports?.[portTooltip.portId];
            const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';
            const deviceVlan = dev?.vlan || simPort?.accessVlan || simPort?.vlan || 1;
            const isVlan1 = deviceVlan === 1;
            if (isSTPBlocked && isVlan1) return 'bg-pink-500';
            return dev?.status === 'offline' || prt?.shutdown ? 'bg-error-500' : prt?.status === 'connected' ? 'bg-success-500' : 'bg-secondary-400';
          })()
            }`} />
          <span className="text-[10px] font-black tracking-widest opacity-30">
            {portTooltip.portId}
          </span>
        </div>

        <div className="space-y-0.5">
          <div className="text-xs font-bold">
            {(() => {
              const dev = deviceMap.get(portTooltip.deviceId);
              if (dev?.type === 'iot') {
                const kind = dev.iot?.kind;
                const isControllable = kind === 'lamp' || kind === 'heater' || kind === 'cooler';
                return (
                  <div className="space-y-0.5">
                    <div>
                      {language === 'tr' ? 'Cihaz Durumu:' : 'Device Status:'}{' '}
                      <span className="text-accent-500">{getIotDeviceStatus(dev)}</span>
                    </div>
                    <div>
                      {language === 'tr' ? 'Güç Durumu:' : 'Power Status:'}{' '}
                      <span className="text-accent-500">{getIotPowerStatus(dev)}</span>
                    </div>
                    {isControllable && (
                      <div>
                        {language === 'tr' ? 'Açık/Kapalı:' : 'Open/Closed:'}{' '}
                        <span className="text-accent-500">{getIotOpenCloseStatus(dev)}</span>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <>
                  VLAN:{' '}
                  <span className="text-accent-500">
                    {getLivePortVlanText(portTooltip.deviceId, portTooltip.portId)}
                  </span>
                </>
              );
            })()}
          </div>
          <div className="text-xs font-bold">
            {language === 'tr' ? 'Durum:' : 'Status:'}{' '}
            <span className={
              (() => {
                const dev = deviceMap.get(portTooltip.deviceId);
                const prt = dev?.ports.find(p => p.id === portTooltip.portId);
                const devState = deviceStates?.get(portTooltip.deviceId);
                const simPort = devState?.ports?.[portTooltip.portId];
                const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';
                const deviceVlan = dev?.vlan || simPort?.accessVlan || simPort?.vlan || 1;
                const isVlan1 = deviceVlan === 1;
                if (isSTPBlocked && isVlan1) return 'text-pink-500';
                return dev?.status === 'offline' || prt?.shutdown ? 'text-error-500' : prt?.status === 'connected' ? 'text-success-500' : 'text-secondary-400';
              })()
            }>
              {(() => {
                const dev = deviceMap.get(portTooltip.deviceId);
                const prt = dev?.ports.find(p => p.id === portTooltip.portId);
                const devState = deviceStates?.get(portTooltip.deviceId);
                const simPort = devState?.ports?.[portTooltip.portId];
                const isSTPBlocked = simPort?.spanningTree?.state === 'blocking' || simPort?.spanningTree?.role === 'alternate';

                if (dev?.status === 'offline') {
                  return language === 'tr' ? 'Cihaz Kapalı' : 'Device Off';
                }
                if (isSTPBlocked) {
                  const role = simPort?.spanningTree?.role || '';
                  const state = simPort?.spanningTree?.state || '';
                  const roleMap: Record<string, string> = { 'root': 'Root', 'designated': 'Desg', 'alternate': 'Altn', 'backup': 'Back' };
                  const stateMap: Record<string, string> = { 'forwarding': 'FWD', 'blocking': 'BLK', 'listening': 'LIS', 'learning': 'LRN' };
                  const roleText = roleMap[role] || role;
                  const stateText = stateMap[state] || state;
                  return language === 'tr' ? `STP Bloke (${roleText} ${stateText})` : `STP Blocked (${roleText} ${stateText})`;
                }
                if (prt?.shutdown) {
                  return language === 'tr' ? 'Kapalı (Shutdown)' : 'Shutdown';
                }
                if (prt?.status === 'connected') {
                  return language === 'tr' ? 'Bağlı (Up)' : 'Connected (Up)';
                }
                return language === 'tr' ? 'Bağlı Değil (Down)' : 'Not Connected (Down)';
              })()
              }
            </span>
          </div>

          {(() => {
            const dev = deviceMap.get(portTooltip.deviceId);
            const prt = dev?.ports.find(p => p.id === portTooltip.portId);
            if (prt?.ipAddress) {
              return (
                <div className="text-xs font-bold">
                  IP:{' '}
                  <span className="text-warning-400">
                    {prt.ipAddress}{prt.subnetMask ? `/${prt.subnetMask}` : ''}
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {deviceMap.get(portTooltip.deviceId)?.ports.find(p => p.id === portTooltip.portId)?.status === 'connected' && (
            <div className="text-[10px] opacity-70">
              {language === 'tr' ? 'Fiziksel bağlantı aktif' : 'Physical link active'}
            </div>
          )}
        </div>

        {/* Arrow */}
        <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${isDark ? 'border-t-secondary-800' : 'border-t-white'
          }`} />
      </div>
    </div>
  );
};
