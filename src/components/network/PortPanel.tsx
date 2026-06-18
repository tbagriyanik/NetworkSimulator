'use client';

import { Port, PortLEDColor } from '@/lib/network/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Translations } from '@/contexts/LanguageContext';
import { Database, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RouterIcon, SwitchIcon } from './PCPanelWidgets';

const getPortVlan = (port: Port): number => Number(port.accessVlan || port.vlan || 1);

// Connection type for topology
interface TopologyConnection {
  id: string;
  sourceDeviceId: string;
  sourcePort: string;
  targetDeviceId: string;
  targetPort: string;
  active: boolean;
}

interface PortPanelProps {
  ports: Record<string, Port>;
  t: Translations;
  theme: string;
  deviceName?: string;
  deviceModel?: string;
  activeDeviceId?: string;
  isDevicePoweredOff?: boolean;
  topologyDevices?: { id: string; status?: string }[];
  onTogglePower?: (deviceId: string) => void;
  topologyConnections?: TopologyConnection[];
  onClose?: () => void;
}

const ledColorClasses: Record<PortLEDColor, string> = {
  green: 'bg-green-500 shadow-[0_0_2px_rgba(34,197,94,0.2)]',
  gray: 'bg-zinc-500 transition-colors',
  orange: 'bg-orange-500 shadow-[0_0_2px_rgba(249,115,22,0.2)]',
  white: 'bg-white shadow-[0_0_1px_rgba(255,255,255,0.2)] border border-zinc-300',
  off: 'bg-zinc-700 transition-colors',
  red: 'bg-red-500 shadow-[0_0_2px_rgba(239,68,68,0.2)]'
};

export function PortPanel({ ports, t, theme, deviceName, deviceModel, activeDeviceId, isDevicePoweredOff = false, topologyDevices = [], onTogglePower, topologyConnections, onClose }: PortPanelProps) {
  const isDark = theme === 'dark';

  // Count open/closed ports
  const openPortsCount = isDevicePoweredOff ? 0 : Object.values(ports).filter(p => !p.shutdown).length;
  const totalPortsCount = Object.keys(ports).length;

  // Check if a port is connected in topology
  const isPortConnectedInTopology = (portId: string): boolean => {
    if (!topologyConnections || !activeDeviceId) return false;
    const lowerPortId = portId.toLowerCase();
    const lowerDeviceId = activeDeviceId.toLowerCase();

    return topologyConnections.some(conn => {
      if (!conn.active) return false;
      const connSourceId = conn.sourceDeviceId.toLowerCase();
      const connTargetId = conn.targetDeviceId.toLowerCase();
      const connSourcePort = conn.sourcePort.toLowerCase();
      const connTargetPort = conn.targetPort.toLowerCase();

      return (connSourceId === lowerDeviceId && connSourcePort === lowerPortId) ||
        (connTargetId === lowerDeviceId && connTargetPort === lowerPortId);
    });
  };

  const getPeerDeviceIdForPort = (portId: string): string | null => {
    if (!topologyConnections || !activeDeviceId) return null;
    const lowerPortId = portId.toLowerCase();
    const lowerDeviceId = activeDeviceId.toLowerCase();

    const conn = topologyConnections.find((c) => {
      if (!c.active) return false;
      const connSourceId = c.sourceDeviceId.toLowerCase();
      const connTargetId = c.targetDeviceId.toLowerCase();
      const connSourcePort = c.sourcePort.toLowerCase();
      const connTargetPort = c.targetPort.toLowerCase();
      return (connSourceId === lowerDeviceId && connSourcePort === lowerPortId) ||
        (connTargetId === lowerDeviceId && connTargetPort === lowerPortId);
    });

    if (!conn) return null;
    return conn.sourceDeviceId.toLowerCase() === lowerDeviceId ? conn.targetDeviceId : conn.sourceDeviceId;
  };

  const sortPorts = (a: Port, b: Port): number => {
    const partsA = a.id.split('/');
    const partsB = b.id.split('/');
    const aMod = partsA.length >= 3 ? parseInt(partsA[partsA.length - 2], 10) || 0 : 0;
    const bMod = partsB.length >= 3 ? parseInt(partsB[partsB.length - 2], 10) || 0 : 0;
    if (aMod !== bMod) return aMod - bMod;
    const aNum = parseInt(partsA[partsA.length - 1], 10) || 0;
    const bNum = parseInt(partsB[partsB.length - 1], 10) || 0;
    return aNum - bNum;
  };

  const faPorts = Object.values(ports)
    .filter(p => p.type === 'fastethernet' && p.id !== 'vlan1' && !p.id.startsWith('wlan'))
    .sort(sortPorts);

  const giPorts = Object.values(ports)
    .filter(p => p.type === 'gigabitethernet' && p.id !== 'vlan1' && !p.id.startsWith('wlan'))
    .sort(sortPorts);

  const serialPorts = Object.values(ports)
    .filter(p => p.type === 'serial')
    .sort(sortPorts);

  const consolePort = Object.values(ports).find(p => p.id.toLowerCase() === 'console');

  const systemLedColor: PortLEDColor = isDevicePoweredOff
    ? 'gray'
    : Object.values(ports).some((port) => port.status === 'blocked')
      ? 'orange'
      : 'green';

  const renderStatusLed = (label: 'PWR' | 'SYST', color: PortLEDColor, tooltipText: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${ledColorClasses[color]} transition-all duration-300`} />
          </div>
          <span className={`text-xs font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent hideArrow side="bottom" className={`${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'} p-2 text-xs rounded-lg shadow-xl`}>
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );

  const renderPort = (port: Port) => {
    const isConnectedInTopology = isPortConnectedInTopology(port.id);
    const peerId = isConnectedInTopology ? getPeerDeviceIdForPort(port.id) : null;
    const isPeerPoweredOff = !!peerId && topologyDevices.some(d => d.id === peerId && d.status === 'offline');

    // Determine LED color based on topology connection and port state
    let ledColor: PortLEDColor;
    let statusLabel: string;

    if (isDevicePoweredOff) {
      ledColor = 'gray';
      statusLabel = t.closed;
      return (
        <Tooltip key={port.id}>
          <TooltipTrigger asChild>
            <div
              className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-default min-w-[45px] sm:min-w-[60px] hover:bg-slate-700/30 ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-200'}`}
            >
              <div className="relative mb-1">
                <div
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${ledColorClasses[ledColor]} transition-all duration-300`}
                />
              </div>
              <span className={`text-sm font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'} transition-colors`}>
                {port.id}
              </span>
              <Badge
                variant={port.mode === 'trunk' ? 'default' : 'secondary'}
                className={`text-[10px] px-1.5 py-0 mt-1 font-bold ${port.mode === 'trunk' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'}`}
              >
                {port.mode === 'trunk' ? 'TRUNK' : `V${getPortVlan(port)}`}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"

            className={`${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} p-3 max-w-xs rounded-[25px] shadow-2xl`}
          >
            <div className="space-y-1 text-xs">
              <div className="font-bold text-cyan-400">{port.id.toUpperCase()}</div>
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t.status}:</span> {statusLabel}
              </div>
              {port.type === 'serial' && port.serialEncapsulation && (
                <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Encapsulation:</span> {port.serialEncapsulation.toUpperCase()}
                </div>
              )}
              {port.type === 'serial' && port.dce !== undefined && (
                <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Role:</span> {port.dce ? 'DCE' : 'DTE'}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Router/Switch ports should only be green if physically connected in topology AND the peer device is powered on.
    // STP blocked check takes priority over connected status
    if (port.status === 'blocked' || port.spanningTree?.state === 'blocking' || port.spanningTree?.role === 'alternate') {
      ledColor = 'orange';
      statusLabel = t.blocked;
    } else if (port.shutdown) {
      ledColor = 'gray';
      statusLabel = t.closed;
    } else if (isConnectedInTopology) {
      if (isPeerPoweredOff) {
        ledColor = 'gray';
        statusLabel = t.closed;
      } else {
        ledColor = 'green';
        statusLabel = t.connected;
      }
    } else if (port.status === 'connected' && !topologyConnections) {
      // Fallback for when topology isn't provided (standalone view)
      ledColor = 'green';
      statusLabel = t.connected;
    } else {
      ledColor = 'white';
      statusLabel = t.idle;
    }

    return (
      <Tooltip key={port.id}>
        <TooltipTrigger asChild>
          <div
            className={`flex flex-col items-center p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-default min-w-[45px] sm:min-w-[60px] hover:bg-slate-700/30 ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-200'}`}
          >
            <div className="relative mb-1">
              <div
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${ledColorClasses[ledColor]} transition-all duration-300`}
              />
            </div>
            <span className={`text-sm font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-700'} transition-colors`}>
              {port.id}
            </span>
            <Badge
              variant={port.mode === 'trunk' ? 'default' : 'secondary'}
              className={`text-sm px-2 py-0.5 h-auto mt-0.5 transition-all duration-200 ${port.mode === 'trunk' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : ''}`}
            >
              {port.mode === 'trunk' ? 'Trunk' : `V${getPortVlan(port)}`}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"

          className={`${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} p-3 max-w-xs rounded-[25px] shadow-2xl`}
        >
          <div className="space-y-1 text-xs">
            <div className="font-bold text-cyan-400">{port.id.toUpperCase()}</div>
            <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t.status}:</span> {statusLabel}
            </div>
            {port.spanningTree && (
              <div className={isDark ? 'text-orange-400' : 'text-orange-500'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>STP:</span>{' '}
                {port.spanningTree.role === 'root' && 'Root'}{' '}
                {port.spanningTree.role === 'designated' && 'Desg'}{' '}
                {port.spanningTree.role === 'alternate' && 'Altn'}{' '}
                {port.spanningTree.role === 'backup' && 'Back'}{' '}
                {port.spanningTree.state === 'forwarding' && 'FWD'}{' '}
                {port.spanningTree.state === 'blocking' && 'BLK'}{' '}
                {port.spanningTree.state === 'listening' && 'LIS'}{' '}
                {port.spanningTree.state === 'learning' && 'LRN'}
              </div>
            )}
            {port.ipAddress && (
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>IP:</span>{' '}
                <span className="text-amber-400">{port.ipAddress}{port.subnetMask ? `/${port.subnetMask}` : ''}</span>
              </div>
            )}
            {port.ipv6Address && (
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>IPv6:</span>{' '}
                <span className="text-amber-400">{port.ipv6Address}{port.ipv6Prefix ? `/${port.ipv6Prefix}` : ''}</span>
              </div>
            )}
            <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t.mode}:</span> <span className="capitalize">{port.mode}</span>
            </div>
            <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>VLAN:</span> {port.mode === 'trunk' ? 'Trunk' : getPortVlan(port)}
            </div>
            <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t.speed}:</span> {port.speed === 'auto' ? 'Auto' : port.speed + ' Mbps'}
            </div>
            <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t.duplex}:</span> {port.duplex === 'auto' ? 'Auto' : <span className="capitalize">{port.duplex}</span>}
            </div>
            {port.type === 'serial' && port.serialEncapsulation && (
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Encapsulation:</span> {port.serialEncapsulation.toUpperCase()}
              </div>
            )}
            {port.type === 'serial' && port.dce !== undefined && (
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Role:</span> {port.dce ? 'DCE' : 'DTE'}
              </div>
            )}
            {peerId && (
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Connected to:</span> {peerId}
              </div>
            )}
            {(port.description || port.name) && (
              <div className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{t.description}:</span> {port.description || port.name}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const innerBg = isDark ? 'bg-slate-900' : 'bg-slate-100';
  const innerBorder = isDark ? 'border-slate-600' : 'border-slate-300';

  return (
    <TooltipProvider>
      <Card className={`${cardBg}`}>
        <CardHeader className={`py-3 px-5 border-b ${isDark ? 'border-slate-800/50 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${deviceModel === 'ISR 4451 X' ? (isDark ? 'bg-purple-900/30' : 'bg-purple-100') : deviceModel === 'WS-C3650-24PS' ? (isDark ? 'bg-purple-900/30' : 'bg-purple-100') : deviceModel === 'WS-C2960-24TT-L' ? (isDark ? 'bg-green-900/30' : 'bg-green-100') : (isDark ? 'bg-cyan-900/30' : 'bg-cyan-100')}`}>
                {deviceModel === 'ISR 4451 X' ? (
                  <RouterIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                ) : deviceModel === 'WS-C3650-24PS' ? (
                  <SwitchIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" isL3={true} />
                ) : deviceModel === 'WS-C2960-24TT-L' ? (
                  <SwitchIcon className="w-5 h-5 text-green-600 dark:text-green-400" isL3={false} />
                ) : (
                  <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                )}
              </div>
              <div>
                <CardTitle className={deviceModel === 'ISR 4451 X' ? "text-purple-400 text-base sm:text-lg" : deviceModel === 'WS-C3650-24PS' ? "text-purple-400 text-base sm:text-lg" : deviceModel === 'WS-C2960-24TT-L' ? "text-green-400 text-base sm:text-lg" : "text-cyan-400 text-base sm:text-lg"}>
                  {deviceName || t.switchTitle}
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'} ml-2`}>
                    {deviceModel}
                  </span>
                </CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {openPortsCount}/{totalPortsCount} {t.on.toLowerCase()}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => activeDeviceId && onTogglePower?.(activeDeviceId)}
                    className={`h-8 w-8 rounded-lg transition-all ${isDevicePoweredOff ? 'text-rose-500 hover:bg-rose-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`}
                    aria-label={t.on}
                    disabled={!activeDeviceId || !onTogglePower}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent hideArrow side="bottom" className={`${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} p-2 text-xs rounded-[25px] shadow-2xl`}>
                  {t.language === 'tr'
                    ? `Güç: ${isDevicePoweredOff ? t.off : t.on}`
                    : `Power: ${isDevicePoweredOff ? t.off : t.on}`}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`${innerBg} rounded-lg p-2 sm:p-4 border ${innerBorder}`}>
            <div className={`flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-full cursor-pointer transition-all duration-200 hover:scale-125 group flex items-center justify-center ${isDevicePoweredOff ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 animate-pulse hover:bg-green-600'}`}
                      onClick={onClose}
                    >
                      <X className="w-3 h-3 opacity-0 group-hover:opacity-100 text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t.close}
                  </TooltipContent>
                </Tooltip>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{deviceModel || 'WS-C2960-24TT-L'}</span>
              </div>
              <div className="flex gap-2">
                {renderStatusLed(
                  'PWR',
                  isDevicePoweredOff ? 'gray' : 'green',
                  t.language === 'tr'
                    ? `${t.power}: ${isDevicePoweredOff ? t.off : t.on}`
                    : `Power: ${isDevicePoweredOff ? t.off : t.on}`
                )}
                {renderStatusLed(
                  'SYST',
                  systemLedColor,
                  t.language === 'tr'
                    ? `Sistem durumu: ${isDevicePoweredOff ? t.off : systemLedColor === 'orange' ? 'Uyarı' : 'Çalışıyor'}`
                    : `System status: ${isDevicePoweredOff ? t.off : systemLedColor === 'orange' ? 'Warning' : 'Operational'}`
                )}
              </div>
            </div>

            {faPorts.length > 0 && (
              <div className="mb-3 sm:mb-4">
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} mb-2`}>{t.fastEthernetPorts}</div>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-0.5 sm:gap-1">
                  {faPorts.map(renderPort)}
                </div>
              </div>
            )}

            {(giPorts.length > 0 || consolePort) && (
              <div className={`pt-2 ${faPorts.length > 0 ? 'border-t' : ''} ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{t.gigabitPorts}</div>
                  {consolePort && (
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} pr-4`}>{t.language === 'tr' ? 'Konsol' : 'Console'}</div>
                  )}
                </div>
                <div className="flex gap-2 justify-center items-start flex-wrap">
                  {giPorts.map(renderPort)}
                  {consolePort && (
                    <div className="flex items-center ml-2 pl-4 border-l border-slate-700/30">
                      {renderPort(consolePort)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {serialPorts.length > 0 && (
              <div className={`pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} mb-2`}>{t.language === 'tr' ? 'Seri Portlar' : 'Serial Ports'}</div>
                <div className="flex gap-2 justify-center items-start flex-wrap">
                  {serialPorts.map(renderPort)}
                </div>
              </div>
            )}

          </div>

          <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-green-500" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t.connected}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-gray-500" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t.closed}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-orange-500" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t.blocked}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white border border-slate-300" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t.idle}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
