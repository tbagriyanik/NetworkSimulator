'use client';

import { RefreshCw, X, Activity, ShieldCheck, Layers, Share2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { LiveDeviceList } from '@/components/network/LiveDeviceList';
import { CanvasDevice } from './networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { RefreshNetworkReport } from '@/hooks/useRefreshReport';

interface LiveSummary {
  deviceCount: { total: number; routers: number; switches: number; pcs: number; iot: number; firewalls: number; wlcs: number };
  activeLinks: number;
  vlanCount: number;
  routingTableSummary: { totalRoutes: number; connected: number; static: number; dynamic: number };
  protocolStats: {
    ospf: { count: number; neighbors: number };
    stp: { roots: number; blocked: number };
    hsrp: { active: number; standby: number };
    eigrp: { count: number; neighbors: number };
  };
}

interface RefreshReportPanelProps {
  refreshNetworkReport: RefreshNetworkReport | null;
  setRefreshNetworkReport: React.Dispatch<React.SetStateAction<RefreshNetworkReport | null>>;
  refreshReportRef: React.RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  isDark: boolean;
  focusedOverlay: string;
  setFocusedOverlay: (overlay: 'refresh' | 'packet' | 'pc-info' | 'router-info' | 'switch-info') => void;
  language: 'tr' | 'en';
  t: Record<string, string>;
  handleRefreshNetwork: () => void;
  liveSummary: LiveSummary | null;
  topologyDevices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  bringElementToFront: (el: HTMLElement) => void;
}

export function RefreshReportPanel({
  refreshNetworkReport,
  setRefreshNetworkReport,
  refreshReportRef,
  isMobile,
  isDark,
  focusedOverlay,
  setFocusedOverlay,
  language,
  t,
  handleRefreshNetwork,
  liveSummary,
  topologyDevices,
  deviceStates,
  bringElementToFront,
}: RefreshReportPanelProps) {
  if (!refreshNetworkReport?.show) return null;

  return (
    <div
      ref={refreshReportRef}
      data-draggable-id="refresh-network-report"
      className={`fixed z-[100] backdrop-blur-md select-none ${isMobile
        ? 'top-[84px] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[360px] rounded-xl border shadow-2xl'
        : 'top-20 right-4 w-full max-w-sm rounded-xl border shadow-2xl'
        } animate-in slide-in-from-right-full duration-300 ${isDark
          ? (focusedOverlay === 'refresh' ? 'bg-secondary-950/70 border-emerald-400 text-secondary-100 shadow-[0_0_0_1px_rgba(52,211,153,0.35),0_20px_40px_rgba(0,0,0,0.4)]' : 'bg-secondary-950/70 border-secondary-850/80 text-secondary-100 shadow-black/40')
          : (focusedOverlay === 'refresh' ? 'bg-white/70 border-emerald-500 text-secondary-900 shadow-[0_0_0_1px_rgba(34,197,94,0.24),0_20px_40px_rgba(15,23,42,0.12)]' : 'bg-white/70 border-secondary-200/80 text-secondary-900 shadow-secondary-200/50')
        }`}
      style={{
        zIndex: 100,
        ...(!isMobile ? { maxHeight: 'calc(100vh - 100px)' } : { maxHeight: 'calc(100vh - 140px)' })
      }}
      onMouseDown={() => setFocusedOverlay('refresh')}
      onPointerDownCapture={(e) => bringElementToFront(e.currentTarget as HTMLElement)}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b rounded-t-xl cursor-grab active:cursor-grabbing select-none ${isDark ? 'bg-white/5 border-success-500/20' : 'bg-black/5 border-success-500/30'}`}
        data-drag-handle={true}
      >
        <h3 className="text-sm font-bold flex items-center gap-2">
          {refreshNetworkReport.title}
        </h3>
        <div className="flex items-center gap-1">
          <TooltipWrapper title={t.refreshNetwork}>
            <button
               onClick={() => { handleRefreshNetwork(); }}
               className="w-5 h-5 rounded-md bg-primary-500 hover:bg-primary-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
            >
              <RefreshCw className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
          <TooltipWrapper title={t.close}>
            <button
              onClick={() => setRefreshNetworkReport(prev => prev ? { ...prev, show: false } : null)}
              className="w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 cursor-pointer transition-colors inline-flex items-center justify-center shrink-0"
            >
              <X className="w-3 h-3 text-white pointer-events-none" />
            </button>
          </TooltipWrapper>
        </div>
      </div>

      <div className="p-2 overflow-y-auto" style={{ maxHeight: isMobile ? 'calc(100vh - 210px)' : 'calc(100vh - 160px)' }}>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className={`w-full grid grid-cols-2 rounded-lg ${isDark ? 'bg-secondary-800/80' : 'bg-secondary-200/80'}`}>
            <TabsTrigger value="summary" className="text-xs">
              {language === 'tr' ? 'Özet' : 'Summary'}
            </TabsTrigger>
            <TabsTrigger value="devices" className="text-xs">
              {language === 'tr' ? 'Cihazlar' : 'Devices'} ({refreshNetworkReport.devices.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-2 space-y-2">
            {/* Quick status messages */}
            {refreshNetworkReport.dhcpMessages.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 opacity-80 text-xs">
                {refreshNetworkReport.dhcpMessages.map((msg, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span>{msg}</span>
                  </div>
                ))}
              </div>
            )}
            {refreshNetworkReport.stpMessage && (
              <div className="text-pink-500 font-medium py-0.5 px-2 bg-pink-500/10 rounded-lg w-fit text-xs">
                {refreshNetworkReport.stpMessage}
              </div>
            )}
            {refreshNetworkReport.portSecurityMessage && (
              <div className="text-error-500 font-medium py-0.5 px-2 bg-error-500/10 rounded-lg w-fit text-xs">
                {refreshNetworkReport.portSecurityMessage}
              </div>
            )}
            {refreshNetworkReport.topologyMessage && (
              <div className="text-warning-500 font-medium py-0.5 px-2 bg-warning-500/10 rounded-lg w-fit text-xs">
                {refreshNetworkReport.topologyMessage}
              </div>
            )}

            {/* Summary grid - live from store, real-time reactive */}
            {liveSummary && (
              <>
                <div className={`grid grid-cols-2 gap-2 text-xs`}>
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                    <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                      {language === 'tr' ? 'Cihaz Sayısı' : 'Device Count'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Toplam' : 'Total'}</span>
                        <span className="font-bold">{liveSummary.deviceCount.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Yönlendirici' : 'Router'}</span>
                        <span>{liveSummary.deviceCount.routers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Anahtar' : 'Switch'}</span>
                        <span>{liveSummary.deviceCount.switches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PC</span>
                        <span>{liveSummary.deviceCount.pcs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IoT</span>
                        <span>{liveSummary.deviceCount.iot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Güvenlik Duvarı' : 'Firewall'}</span>
                        <span>{liveSummary.deviceCount.firewalls}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WLC</span>
                        <span>{liveSummary.deviceCount.wlcs}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                      <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                        {language === 'tr' ? 'Aktif Bağlantılar' : 'Active Links'}
                      </div>
                      <div className="text-lg font-bold">
                        {liveSummary.activeLinks}
                      </div>
                    </div>

                    <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                      <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                        VLAN {language === 'tr' ? 'Sayısı' : 'Count'}
                      </div>
                      <div className="text-lg font-bold">
                        {liveSummary.vlanCount}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Routing table summary */}
                {liveSummary.routingTableSummary.totalRoutes > 0 && (
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs`}>
                    <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                      {language === 'tr' ? 'Yönlendirme Tablosu Özeti' : 'Routing Table Summary'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Toplam rota' : 'Total routes'}</span>
                        <span className="font-bold">{liveSummary.routingTableSummary.totalRoutes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Bağlı' : 'Connected'}</span>
                        <span>{liveSummary.routingTableSummary.connected}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Statik' : 'Static'}</span>
                        <span>{liveSummary.routingTableSummary.static}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{language === 'tr' ? 'Dinamik' : 'Dynamic'}</span>
                        <span>{liveSummary.routingTableSummary.dynamic}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Protocol Status */}
                {liveSummary.protocolStats && (
                  <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs`}>
                    <div className={`font-semibold mb-1.5 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                      {language === 'tr' ? 'Protokol Durumu' : 'Protocol Status'}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-0.5 rounded ${liveSummary.protocolStats.ospf.count > 0 ? (liveSummary.protocolStats.ospf.neighbors > 0 ? 'bg-success-500/20 text-success-500' : 'bg-warning-500/20 text-warning-500') : 'bg-secondary-500/20 text-secondary-500'}`}>
                            <Activity className="w-3 h-3" />
                          </span>
                          <span className="font-bold">OSPF</span>
                        </div>
                        <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                          {language === 'tr' ? `${liveSummary.protocolStats.ospf.neighbors} komşu` : `${liveSummary.protocolStats.ospf.neighbors} neighbors`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-0.5 rounded ${liveSummary.protocolStats.stp.roots > 0 ? 'bg-success-500/20 text-success-500' : 'bg-secondary-500/20 text-secondary-500'}`}>
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                          <span className="font-bold">STP</span>
                        </div>
                        <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                          {language === 'tr' ? `${liveSummary.protocolStats.stp.roots} Root, ${liveSummary.protocolStats.stp.blocked} bloklu` : `${liveSummary.protocolStats.stp.roots} Root, ${liveSummary.protocolStats.stp.blocked} blocked`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-0.5 rounded ${liveSummary.protocolStats.hsrp.active > 0 ? 'bg-success-500/20 text-success-500' : 'bg-secondary-500/20 text-secondary-500'}`}>
                            <Layers className="w-3 h-3" />
                          </span>
                          <span className="font-bold">HSRP</span>
                        </div>
                        <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                          A: {liveSummary.protocolStats.hsrp.active}, S: {liveSummary.protocolStats.hsrp.standby}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-0.5 rounded ${liveSummary.protocolStats.eigrp.count > 0 ? (liveSummary.protocolStats.eigrp.neighbors > 0 ? 'bg-success-500/20 text-success-500' : 'bg-error-500/20 text-error-500') : 'bg-secondary-500/20 text-secondary-500'}`}>
                            <Share2 className="w-3 h-3" />
                          </span>
                          <span className="font-bold">EIGRP</span>
                        </div>
                        <span className={`${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                          {language === 'tr' ? `${liveSummary.protocolStats.eigrp.neighbors} komşu` : `${liveSummary.protocolStats.eigrp.neighbors} neighbors`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Network warnings - from refresh report */}
            {refreshNetworkReport.summary.networkWarnings.length > 0 && (
              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs`}>
                <div className={`font-semibold mb-1 text-warning-500`}>
                  {language === 'tr' ? 'Ağ Uyarıları' : 'Network Warnings'} ({refreshNetworkReport.summary.networkWarnings.length})
                </div>
                <div className="space-y-0.5">
                  {refreshNetworkReport.summary.networkWarnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-1 text-warning-500">
                      <span>⚠</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {refreshNetworkReport.summary.networkWarnings.length === 0 && (
              <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs text-center ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                {language === 'tr' ? 'Uyarı yok' : 'No warnings'}
              </div>
            )}
          </TabsContent>

          <TabsContent value="devices" className="mt-2">
            <LiveDeviceList devices={topologyDevices} deviceStates={deviceStates} language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
