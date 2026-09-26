'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import type { Translations } from '@/contexts/LanguageContext';
import type { CanvasDevice, DeviceType } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { DeviceIcon } from '../DeviceIcon';
import { cn } from '@/lib/utils';
import { getDeviceCenter } from '@/components/network/NetworkTopology/utils/networkTopology.helpers';

function truncateWithEllipsis(text: string | undefined | null, maxLength: number) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

interface TopologyDeviceDropdownProps {
  t: Translations;
  isDark: boolean;
  language: 'tr' | 'en';
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  activeDeviceId: string;
  activeDeviceType: DeviceType;
  deviceSearchQuery: string;
  setDeviceSearchQuery: (q: string) => void;
  setPan: (pan: { x: number; y: number }) => void;
  handleDeviceSelectFromMenu: (type: DeviceType, id?: string, model?: string, name?: string) => void;
  toolbarGlowClass: string;
  topologyZoom: number;
}

export function TopologyDeviceDropdown({
  t,
  isDark,
  language,
  topologyDevices,
  deviceStates,
  activeDeviceId,
  activeDeviceType,
  deviceSearchQuery,
  setDeviceSearchQuery,
  setPan,
  handleDeviceSelectFromMenu,
  toolbarGlowClass,
  topologyZoom,
}: TopologyDeviceDropdownProps) {
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<'all' | 'pc' | 'sw' | 'router'>('all');
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);

  const availableCategoryCounts = useMemo(() => {
    const counts = { all: topologyDevices.length, pc: 0, sw: 0, router: 0 };
    topologyDevices.forEach((dev) => {
      if (['pc', 'mobile', 'printer', 'iot', 'server'].includes(dev.type)) {
        counts.pc++;
      } else if (['switchL2', 'switchL3', 'hub', 'wlc'].includes(dev.type)) {
        counts.sw++;
      } else if (['router', 'firewall', 'cloud'].includes(dev.type)) {
        counts.router++;
      }
    });
    return counts;
  }, [topologyDevices]);

  return (
    <DropdownMenu
      open={isDeviceDropdownOpen}
      onOpenChange={(open) => {
        setIsDeviceDropdownOpen(open);
        if (!open) {
          setDeviceSearchQuery('');
          setDeviceTypeFilter('all');
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`w-36 sm:w-48 flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${isDark
            ? 'bg-secondary-900 border-secondary-800 text-secondary-300 hover:text-white hover:border-secondary-600'
            : 'bg-white border-secondary-200 text-secondary-700 hover:text-secondary-900 hover:border-secondary-400'
            }`}
        >
          <div className="flex items-center gap-2">
            {activeDeviceId && (topologyDevices.some(d => d.id === activeDeviceId)) ? (
              <>
                {(() => {
                  const activeTopologyDevice = topologyDevices.find(d => d.id === activeDeviceId);
                  const status = activeTopologyDevice?.status || 'online';
                  const statusColor =
                    status === 'offline'
                      ? 'bg-error-500'
                      : status === 'online'
                        ? 'bg-success-400'
                        : 'bg-warning-400';
                  const statusLabel =
                    status === 'offline'
                      ? t.offline
                      : status === 'online'
                        ? t.online
                        : t.unknown;
                  return (
                    <>
                      <TooltipWrapper title={statusLabel}>
                        <span className="w-2 h-2 rounded-full mr-0.5">
                          <span className={`block w-2 h-2 rounded-full ${statusColor} shadow-[0_0_2px_rgba(45,212,191,0.3)]`} />
                        </span>
                      </TooltipWrapper>
                      <DeviceIcon
                        type={activeDeviceType}
                        switchModel={activeTopologyDevice?.switchModel}
                        className="w-5 h-5"
                      />
                      <span className="text-xs font-bold">
                        {truncateWithEllipsis(deviceStates.get(activeDeviceId)?.hostname || activeDeviceId, 15)}
                      </span>
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <Plus className={`w-4 h-4 text-secondary-500 ${toolbarGlowClass}`} />
                <span className="text-sm font-bold text-secondary-500">
                  {t.selectDeviceDropdown}
                </span>
              </>
            )}
          </div>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={`${isDark ? 'bg-secondary-900 !border-secondary-800' : 'bg-white !border-secondary-200'} w-64 sm:w-72 pt-2`}>
        {topologyDevices.length > 0 && (
          <>
            {/* Search Box */}
            <div className="px-2 pt-1 pb-1">
              <div className="relative">
                <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-secondary-400 pointer-events-none ${toolbarGlowClass}`} />
                <Input
                  value={deviceSearchQuery}
                  onChange={e => setDeviceSearchQuery(e.target.value)}
                  placeholder={t.searchShort}
                  aria-label={t.searchShort}
                  className="h-7 pl-6 pr-7 text-xs"
                  autoFocus
                  onKeyDown={e => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setDeviceSearchQuery('');
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const q = deviceSearchQuery.toLowerCase().trim();
                      const firstMatch = topologyDevices.find((device) => {
                        if (deviceTypeFilter === 'pc') {
                          if (!['pc', 'mobile', 'printer', 'iot'].includes(device.type)) return false;
                        } else if (deviceTypeFilter === 'sw') {
                          if (!['switchL2', 'switchL3', 'hub', 'wlc'].includes(device.type)) return false;
                        } else if (deviceTypeFilter === 'router') {
                          if (!['router', 'firewall', 'cloud'].includes(device.type)) return false;
                        }
                        if (!q) return true;
                        const state = deviceStates.get(device.id);
                        const name = (state?.hostname || device.name).toLowerCase();
                        const type = device.type.toLowerCase();
                        const mac = (device.macAddress || state?.macAddress || '').toLowerCase();
                        const ip = (device.ip || '').toLowerCase();
                        const portIps = state?.ports
                          ? Object.values(state.ports).map((p: { ipAddress?: string }) => p.ipAddress?.toLowerCase() || '')
                          : [];
                        const vlanMatches = state?.vlans
                          ? Object.keys(state.vlans).some(v => v.includes(q) || `vlan${v}`.includes(q) || `vlan ${v}`.includes(q))
                          : false;
                        return (
                          name.includes(q) ||
                          type.includes(q) ||
                          mac.includes(q) ||
                          ip.includes(q) ||
                          portIps.some(pIp => pIp.includes(q)) ||
                          vlanMatches
                        );
                      });

                      if (firstMatch) {
                        if (typeof window !== 'undefined') {
                          const canvasW = window.innerWidth;
                          const canvasH = window.innerHeight;
                          const center = getDeviceCenter(firstMatch);
                          const zoomLevel = topologyZoom || 1.0;
                          const targetPanX = canvasW / 2 - center.x * zoomLevel;
                          const targetPanY = canvasH / 2 - center.y * zoomLevel;
                          setPan({ x: targetPanX, y: targetPanY });
                          window.dispatchEvent(new CustomEvent('focus-device', { detail: { deviceId: firstMatch.id } }));
                        }
                        handleDeviceSelectFromMenu(firstMatch.type, firstMatch.id, firstMatch.switchModel, firstMatch.name);
                        setDeviceSearchQuery('');
                        setIsDeviceDropdownOpen(false);
                      }
                    }
                  }}
                />
                {deviceSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDeviceSearchQuery('')}
                    title={language === 'tr' ? 'Aramayı Temizle (ESC)' : 'Clear Search (ESC)'}
                    aria-label={language === 'tr' ? 'Aramayı Temizle' : 'Clear Search'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary-200 dark:hover:bg-secondary-700 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                  >
                    <X className={`w-3 h-3 ${toolbarGlowClass}`} />
                  </button>
                )}
              </div>
            </div>

            {/* Smart Type Filter Pills */}
            <div className="px-2 pt-1 pb-1.5 flex flex-wrap gap-1">
              {[
                { id: 'all', label: `${t.filterAll || (language === 'tr' ? 'Tümü' : 'All')} (${availableCategoryCounts.all})` },
                ...(availableCategoryCounts.pc > 0 ? [{ id: 'pc', label: `PC (${availableCategoryCounts.pc})` }] : []),
                ...(availableCategoryCounts.sw > 0 ? [{ id: 'sw', label: `SW (${availableCategoryCounts.sw})` }] : []),
                ...(availableCategoryCounts.router > 0 ? [{ id: 'router', label: `Router (${availableCategoryCounts.router})` }] : []),
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeviceTypeFilter(filter.id as 'all' | 'pc' | 'sw' | 'router');
                  }}
                  className={cn(
                    'flex-1 min-w-[36px] py-0.5 px-1 text-[10px] font-bold rounded transition-all text-center border whitespace-nowrap',
                    deviceTypeFilter === filter.id
                      ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                      : isDark
                        ? 'bg-secondary-800/80 text-secondary-300 border-secondary-700 hover:bg-secondary-700 hover:text-white'
                        : 'bg-secondary-100 text-secondary-700 border-secondary-200 hover:bg-secondary-200 hover:text-secondary-900'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </>
        )}

        <ScrollArea className={topologyDevices.length > 0 ? "h-56" : "h-auto"}>
          {topologyDevices.length > 0 ? (
            (() => {
              const filtered = topologyDevices
                .filter((device) => {
                  if (deviceTypeFilter === 'pc') {
                    if (!['pc', 'mobile', 'printer', 'iot'].includes(device.type)) return false;
                  } else if (deviceTypeFilter === 'sw') {
                    if (!['switchL2', 'switchL3', 'hub', 'wlc'].includes(device.type)) return false;
                  } else if (deviceTypeFilter === 'router') {
                    if (!['router', 'firewall', 'cloud'].includes(device.type)) return false;
                  }

                  if (!deviceSearchQuery.trim()) return true;
                  const q = deviceSearchQuery.toLowerCase().trim();
                  const state = deviceStates.get(device.id);
                  const name = (state?.hostname || device.name).toLowerCase();
                  const type = device.type.toLowerCase();
                  const mac = (device.macAddress || state?.macAddress || '').toLowerCase();
                  const ip = (device.ip || '').toLowerCase();
                  const portIps = state?.ports
                    ? Object.values(state.ports).map((p: { ipAddress?: string }) => p.ipAddress?.toLowerCase() || '')
                    : [];
                  const vlanMatches = state?.vlans
                    ? Object.keys(state.vlans).some(v => v.includes(q) || `vlan${v}`.includes(q) || `vlan ${v}`.includes(q))
                    : false;

                  return (
                    name.includes(q) ||
                    type.includes(q) ||
                    mac.includes(q) ||
                    ip.includes(q) ||
                    portIps.some(pIp => pIp.includes(q)) ||
                    vlanMatches
                  );
                });

              if (filtered.length === 0) {
                return (
                  <div className="p-4 text-center text-[11px] text-secondary-500 italic">
                    {t.noResultsFound}
                  </div>
                );
              }

              const selectAndFocusDevice = (device: CanvasDevice) => {
                if (typeof window !== 'undefined') {
                  const canvasW = window.innerWidth;
                  const canvasH = window.innerHeight;
                  const center = getDeviceCenter(device);
                  const zoomLevel = topologyZoom || 1.0;
                  const targetPanX = canvasW / 2 - center.x * zoomLevel;
                  const targetPanY = canvasH / 2 - center.y * zoomLevel;
                  setPan({ x: targetPanX, y: targetPanY });
                  window.dispatchEvent(new CustomEvent('focus-device', { detail: { deviceId: device.id } }));
                }
                handleDeviceSelectFromMenu(device.type, device.id, device.switchModel, device.name);
                setDeviceSearchQuery('');
              };

              return filtered.map((device) => {
                const currentDeviceState = deviceStates.get(device.id);
                const displayName = currentDeviceState?.hostname || device.name;
                const status = device.status || 'online';
                const statusColor =
                  status === 'offline'
                    ? 'bg-error-500'
                    : status === 'online'
                      ? 'bg-success-400'
                      : 'bg-warning-400';

                return (
                  <DropdownMenuItem
                    key={device.id}
                    className={`flex items-center justify-between py-1.5 px-2 cursor-pointer ${activeDeviceId === device.id ? 'bg-purple-500/10 text-purple-400 font-semibold' : ''}`}
                    onClick={() => selectAndFocusDevice(device)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`} />
                      <DeviceIcon
                        type={device.type}
                        switchModel={device.switchModel}
                        className="w-4 h-4 shrink-0"
                      />
                      <span className="text-xs font-bold truncate">{displayName}</span>
                    </div>
                    <span className="text-[10px] opacity-50 capitalize shrink-0 ml-2">{device.type}</span>
                  </DropdownMenuItem>
                );
              });
            })()
          ) : (
            <div className="p-3 text-center text-[11px] text-secondary-500 italic">
              {t.noDevicesInTopology}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
