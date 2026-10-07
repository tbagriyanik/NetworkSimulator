'use client';

import { useState, useEffect } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage/safeStorage';
import { cn } from '@/lib/utils';
import { WINDOW_FOCUS_BORDER_CLASS } from '@/components/ui/windowStandards';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveDeviceList } from '@/components/network/LiveDeviceList';

import { RefreshReportPanelProps } from './RefreshReportPanel/types';
import { RefreshHeader } from './RefreshReportPanel/RefreshHeader';

export function RefreshReportPanel({
  refreshNetworkReport,
  setRefreshNetworkReport,
  refreshReportRef,
  isMobile,
  isDark,
  focusedOverlay,
  setFocusedOverlay,
  language,
  t: _t,
  handleRefreshNetwork,
  liveSummary,
  topologyDevices,
  deviceStates,
  bringElementToFront,
  isExamActive = false,
}: RefreshReportPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = safeGetItem('refresh-report-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    safeSetItem('refresh-report-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  if (!refreshNetworkReport?.show) return null;

  return (
    <div
      ref={refreshReportRef}
      data-draggable-id={!isMobile ? "refresh-network-report" : undefined}
      className={cn(
        "fixed z-[100] flex flex-col overflow-hidden backdrop-blur-md select-none",
        isMobile
          ? 'top-[84px] left-3 right-3 max-w-[360px] mx-auto rounded-xl border shadow-2xl animate-in fade-in duration-200'
          : 'top-20 right-4 w-full max-w-sm rounded-xl border shadow-2xl animate-in slide-in-from-right-full duration-300',
        isDark
          ? 'bg-secondary-950/85 text-secondary-100 shadow-black/40'
          : 'bg-white/85 text-secondary-900 shadow-secondary-200/50',
        WINDOW_FOCUS_BORDER_CLASS(focusedOverlay === 'refresh', isDark)
      )}
      style={{
        zIndex: 100,
        maxHeight: isCollapsed ? 'none' : (isMobile ? 'calc(100dvh - 100px)' : 'calc(100vh - 20px)'),
        height: isCollapsed ? 'auto' : undefined,
        resize: isMobile || isCollapsed ? 'none' : 'both',
        overflow: 'hidden',
        ...(isMobile
          ? {
              position: 'fixed',
              top: '84px',
              left: '12px',
              right: '12px',
              margin: '0 auto',
              width: 'auto',
              maxWidth: '360px',
              transform: 'none',
            }
          : {}),
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a, .no-drag')) return;
        setFocusedOverlay('refresh');
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea, a, .no-drag')) return;
        setFocusedOverlay('refresh');
        bringElementToFront(e.currentTarget as HTMLElement);
      }}
    >
      <div className={`flex min-h-0 flex-col ${isCollapsed ? 'h-auto' : 'h-full flex-1'}`}>
        <RefreshHeader
          title={refreshNetworkReport.title}
          isDark={isDark}
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          onRefresh={handleRefreshNetwork}
          onClose={() => setRefreshNetworkReport(null)}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          setFocusedOverlay={setFocusedOverlay}
          language={language}
        />
        {!isCollapsed && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
                      {refreshNetworkReport.dhcpMessages.map((msg: string, i: number) => (
                        <div key={`dhcp-msg-${msg}-${i}`} className="flex items-center gap-1.5">
                          <span>{i + 1}.</span>
                          <span>{msg}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {refreshNetworkReport.stpMessage && (
                    <div className="text-pink-700 dark:text-pink-300 font-medium py-0.5 px-2 bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-500/30 rounded-lg w-fit text-xs">
                      {refreshNetworkReport.stpMessage}
                    </div>
                  )}
                  {refreshNetworkReport.portSecurityMessage && (
                    <div className="text-red-700 dark:text-red-300 font-medium py-0.5 px-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 rounded-lg w-fit text-xs">
                      {refreshNetworkReport.portSecurityMessage}
                    </div>
                  )}
                  {refreshNetworkReport.topologyMessage && (
                    <div className="text-amber-800 dark:text-amber-300 font-medium py-0.5 px-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-lg w-fit text-xs">
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
                            {(topologyDevices.filter(d => d.type === 'hub').length > 0) && (
                              <div className="flex justify-between">
                                <span>Hub</span>
                                <span>{topologyDevices.filter(d => d.type === 'hub').length}</span>
                              </div>
                            )}
                            {(topologyDevices.filter(d => d.type === 'cloud').length > 0) && (
                              <div className="flex justify-between">
                                <span>Cloud (WAN)</span>
                                <span>{topologyDevices.filter(d => d.type === 'cloud').length}</span>
                              </div>
                            )}
                            {(topologyDevices.filter(d => d.type === 'mobile').length > 0) && (
                              <div className="flex justify-between">
                                <span>{language === 'tr' ? 'Mobil Cihaz' : 'Mobile'}</span>
                                <span>{topologyDevices.filter(d => d.type === 'mobile').length}</span>
                              </div>
                            )}
                            {(topologyDevices.filter(d => d.type === 'printer').length > 0) && (
                              <div className="flex justify-between">
                                <span>{language === 'tr' ? 'Yazıcı' : 'Printer'}</span>
                                <span>{topologyDevices.filter(d => d.type === 'printer').length}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'}`}>
                          <div className={`font-semibold mb-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                            {language === 'tr' ? 'Ağ Uyarıları' : 'Network Warnings'} ({refreshNetworkReport.summary.networkWarnings.length})
                          </div>
                          <div className="space-y-0.5">
                            {refreshNetworkReport.summary.networkWarnings.map((w: string, i: number) => (
                              <div key={`net-warn-${w}-${i}`} className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                                <span>⚠</span>
                                <span>{w}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {refreshNetworkReport.summary.networkWarnings.length === 0 && (
                        <div className={`rounded-lg p-2.5 ${isDark ? 'bg-secondary-800/60' : 'bg-secondary-100/80'} text-xs text-center ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                          {language === 'tr' ? 'Uyarı yok' : 'No warnings'}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="devices" className="mt-2">
                  <LiveDeviceList
                    devices={topologyDevices}
                    deviceStates={deviceStates}
                    language={language}
                    showCommandSummary={!isExamActive}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
