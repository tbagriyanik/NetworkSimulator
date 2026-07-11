'use client';

import { Monitor, Network, Laptop } from 'lucide-react';
import { normalizeMAC } from '@/lib/utils';
import type { CanvasDevice } from '../networkTopology.types';

interface DeviceTooltipData {
  deviceId: string;
  x: number;
  y: number;
  visible: boolean;
}

export interface Translations {
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dnsServer: string;
  macAddress: string;
  dhcpEnabled: string;
  openServices: string;
  active: string;
}

interface DeviceTooltipProps {
  tooltip: DeviceTooltipData;
  deviceMap: Map<string, CanvasDevice>;
  isDark: boolean;
  isTR: boolean;
  isDraggingInteractionDisabled: boolean;
  t: Translations;
}

export function DeviceTooltip({ tooltip, deviceMap, isDark, isTR, isDraggingInteractionDisabled, t }: DeviceTooltipProps) {
  if (isDraggingInteractionDisabled || !tooltip.visible) return null;

  const dev = deviceMap.get(tooltip.deviceId);

  return (
    <div
      className={`fixed z-[100] pointer-events-none transition-opacity duration-300 ${tooltip.visible ? 'opacity-100' : 'opacity-0'}`}
      style={{
        left: tooltip.x,
        top: tooltip.y + 20,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className={`px-4 py-3 rounded-2xl border liquid-glass-strong min-w-[200px] animate-scale-in shadow-2xl ${isDark
          ? 'border-secondary-700/50 text-white shadow-accent-500/10'
          : 'border-secondary-200/50 text-secondary-900 shadow-secondary-200/40'
          }`}
      >
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
          <div className={`p-1.5 rounded-lg ${isDark ? 'bg-accent-500/20 text-accent-400' : 'bg-accent-50 text-accent-600'}`}>
            {dev?.type === 'pc' || dev?.type === 'iot'
              ? <Monitor className="w-3.5 h-3.5" />
              : dev?.type === 'router'
                ? <Network className="w-3.5 h-3.5" />
                : <Laptop className="w-3.5 h-3.5" />
            }
          </div>
          <div>
            <div className="text-[10px] font-black tracking-widest opacity-30 leading-none">
              {dev?.type.toUpperCase()}
            </div>
            <div className="text-sm font-black tracking-tight leading-none mt-1">
              {dev?.name}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {dev && (
            <>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.ipAddress}</span>
                <span className="text-xs font-mono font-bold text-accent-500">{dev.ip || '0.0.0.0'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.subnetMask}</span>
                <span className="text-xs font-mono font-bold opacity-80">{dev.subnet || '255.255.255.0'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.gateway}</span>
                <span className="text-xs font-mono font-bold opacity-80">{dev.gateway || '0.0.0.0'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">IPv6</span>
                <span className="text-xs font-mono font-bold opacity-80">{dev.ipv6 || '::'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.dnsServer}</span>
                <span className="text-xs font-mono font-bold opacity-80">{dev.dns || '0.0.0.0'}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.macAddress}</span>
                <span className="text-[10px] font-mono opacity-30">{dev.macAddress ? normalizeMAC(dev.macAddress) : 'N/A'}</span>
              </div>

              {(dev.type === 'pc' || dev.type === 'iot') && (
                <div className="flex justify-between items-center gap-4 mt-1 pt-1 border-t border-white/5">
                  <span className="text-[10px] font-bold opacity-50 uppercase tracking-wider">{t.dhcpEnabled}</span>
                  <span className={`text-[10px] font-black tracking-widest ${dev.ipConfigMode === 'dhcp' ? 'text-success-500' : 'opacity-40'}`}>
                    {dev.ipConfigMode === 'dhcp' ? (isTR ? 'EVET' : 'YES') : (isTR ? 'HAYIR' : 'NO')}
                  </span>
                </div>
              )}

              {dev.services && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <div className="text-[10px] font-bold opacity-50 uppercase tracking-wider mb-1">{t.openServices}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {dev.services.http?.enabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-warning-500/20 text-warning-500 text-[9px] font-black tracking-widest border border-warning-500/20">HTTP</span>
                    )}
                    {dev.services.dns?.enabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-primary-500/20 text-primary-500 text-[9px] font-black tracking-widest border border-primary-500/20">DNS</span>
                    )}
                    {dev.services.dhcp?.enabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-500 text-[9px] font-black tracking-widest border border-purple-500/20">DHCP</span>
                    )}
                    {dev.services.ftp?.enabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-accent-500/20 text-accent-500 text-[9px] font-black tracking-widest border border-accent-500/20">FTP</span>
                    )}
                    {dev.services.mail?.enabled && (
                      <span className="px-1.5 py-0.5 rounded-md bg-error-500/20 text-error-500 text-[9px] font-black tracking-widest border border-error-500/20">MAIL</span>
                    )}
                    {(!dev.services.http?.enabled && !dev.services.dns?.enabled && !dev.services.dhcp?.enabled && !dev.services.ftp?.enabled && !dev.services.mail?.enabled) && (
                      <span className="text-[9px] opacity-40 italic">{isTR ? 'Servis yok' : 'No services'}</span>
                    )}
                  </div>

                  {dev.services?.dhcp?.pools && dev.services.dhcp.pools.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] font-bold opacity-30 uppercase tracking-wider">DHCP Pool</div>
                      {dev.services.dhcp.pools.map((pool, idx) => (
                        <div key={idx} className="text-[9px] space-y-0.5 bg-purple-500/10 rounded p-1.5">
                          <div className="flex justify-between"><span className="opacity-50">Pool:</span><span className="font-mono">{pool.poolName}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">IP:</span><span className="font-mono">{pool.startIp}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Mask:</span><span className="font-mono">{pool.subnetMask}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">GW:</span><span className="font-mono">{pool.defaultGateway}</span></div>
                          <div className="flex justify-between"><span className="opacity-50">Max:</span><span className="font-mono">{pool.maxUsers}</span></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {dev.services?.dns?.records && dev.services.dns.records.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] font-bold opacity-30 uppercase tracking-wider">{isTR ? 'DNS Kayıtları' : 'DNS Records'}</div>
                      {dev.services.dns.records.map((record, idx) => (
                        <div key={idx} className="text-[9px] flex justify-between items-center gap-2 bg-primary-500/10 rounded px-1.5 py-0.5">
                          <span className="font-mono text-primary-400 truncate max-w-[80px]">{record.domain}</span>
                          <span className="opacity-50">→</span>
                          <span className="font-mono">{record.address}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dev.services.http?.enabled && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] flex justify-between items-center">
                        <span className="opacity-60 uppercase tracking-wider">{isTR ? 'HTTP Sunucu' : 'HTTP Server'}</span>
                        <span className="text-success-500 text-[9px] font-bold">✓ {t.active}</span>
                      </div>
                      {dev.services.http.content && (
                        <div className="text-[8px] opacity-50 mt-1 truncate">{dev.services.http.content.substring(0, 50)}...</div>
                      )}
                    </div>
                  )}

                  {dev.services.ftp?.enabled && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] flex justify-between items-center">
                        <span className="opacity-60 uppercase tracking-wider">FTP Server</span>
                        <span className="text-accent-500 text-[9px] font-bold">✓ {t.active}</span>
                      </div>
                      <div className="text-[8px] opacity-50 mt-1">
                        {dev.services.ftp.anonymousAccess
                          ? (isTR ? 'Anonim erişim açık' : 'Anonymous access enabled')
                          : (isTR ? 'Kullanıcı girişi gerekli' : 'User login required')}
                      </div>
                    </div>
                  )}

                  {dev.services.mail?.enabled && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[9px] flex justify-between items-center">
                        <span className="opacity-60 uppercase tracking-wider">MAIL Server</span>
                        <span className="text-error-500 text-[9px] font-bold">✓ {t.active}</span>
                      </div>
                      <div className="text-[8px] opacity-50 mt-1 truncate">
                        {dev.services.mail.domain || 'local.lan'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Arrow */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] ${isDark ? 'border-b-secondary-900' : 'border-b-white'}`} />
      </div>
    </div>
  );
}
