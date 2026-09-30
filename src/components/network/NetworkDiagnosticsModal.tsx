'use client';

import { useState, useMemo } from 'react';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { useDrag } from '@/hooks/useDrag';
import { Button } from '@/components/ui/button';
import { DeviceIcon } from './DeviceIcon';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Lightbulb,
  Network,
  ShieldAlert,
  ArrowLeftRight,
} from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { runRootCauseAnalysis, NetworkDiagnosticResult } from '@/lib/network/connectivity/networkTroubleshooter';
import { diagnoseVlanMismatches } from '@/lib/network/vlanDiagnostics';
import { evaluateNetworkAssertion, NetworkAssertionRule } from '@/lib/network/networkAssertionEngine';

interface NetworkDiagnosticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: CanvasDevice[];
  connections: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
  isDark?: boolean;
  language?: 'tr' | 'en';
  defaultSourceId?: string;
  defaultTargetId?: string;
}

export function NetworkDiagnosticsModal({
  open,
  onOpenChange,
  devices,
  connections,
  deviceStates,
  isDark = true,
  language = 'tr',
  defaultSourceId,
  defaultTargetId,
}: NetworkDiagnosticsModalProps) {
  const isTr = language === 'tr';

  const dragProps = useDrag({
    storageKey: 'networkDiagnostics',
    defaultPosition: typeof window !== 'undefined'
      ? { x: Math.max(16, Math.floor((window.innerWidth - 680) / 2)), y: Math.max(136, Math.floor((window.innerHeight - 560) / 2)) }
      : { x: 120, y: 136 },
    defaultSize: { width: 680, height: 560 },
    minSize: { width: 440, height: 320 },
    mode: 'drag-resize',
    disableSnap: true,
  });

  const eligibleDevices = useMemo(() => {
    return devices;
  }, [devices]);

  const groupedDevices = useMemo(() => {
    const endDevices: CanvasDevice[] = [];
    const routerDevices: CanvasDevice[] = [];
    const switchDevices: CanvasDevice[] = [];
    const cloudDevices: CanvasDevice[] = [];
    const otherDevices: CanvasDevice[] = [];

    eligibleDevices.forEach((d) => {
      switch (d.type) {
        case 'pc':
        case 'iot':
        case 'mobile':
        case 'printer':
          endDevices.push(d);
          break;
        case 'router':
        case 'firewall':
          routerDevices.push(d);
          break;
        case 'switchL2':
        case 'switchL3':
        case 'hub':
        case 'wlc':
          switchDevices.push(d);
          break;
        case 'cloud':
          cloudDevices.push(d);
          break;
        default:
          otherDevices.push(d);
          break;
      }
    });

    const groups: { id: string; label: { tr: string; en: string }; devices: CanvasDevice[] }[] = [];
    if (endDevices.length > 0) {
      groups.push({
        id: 'end',
        label: { tr: 'Uç Cihazlar (PC, Telefon, Yazıcı)', en: 'End Devices' },
        devices: endDevices,
      });
    }
    if (routerDevices.length > 0) {
      groups.push({
        id: 'routers',
        label: { tr: 'Yönlendirici & Güvenlik (Router, Firewall)', en: 'Routers & Security' },
        devices: routerDevices,
      });
    }
    if (switchDevices.length > 0) {
      groups.push({
        id: 'switches',
        label: { tr: 'Anahtar & Çoklayıcı (Switch, Hub, WLC)', en: 'Switches & Hubs' },
        devices: switchDevices,
      });
    }
    if (cloudDevices.length > 0) {
      groups.push({
        id: 'cloud',
        label: { tr: 'Dış Ağ & Bulut (Internet, WAN)', en: 'Cloud & WAN' },
        devices: cloudDevices,
      });
    }
    if (otherDevices.length > 0) {
      groups.push({
        id: 'other',
        label: { tr: 'Diğer Cihazlar', en: 'Other Devices' },
        devices: otherDevices,
      });
    }
    return groups;
  }, [eligibleDevices]);

  const [sourceId, setSourceId] = useState<string>(() => {
    return defaultSourceId || (eligibleDevices[0]?.id ?? '');
  });

  const [targetId, setTargetId] = useState<string>(() => {
    return defaultTargetId || (eligibleDevices[1]?.id ?? eligibleDevices[0]?.id ?? '');
  });

  const selectedSourceDevice = useMemo(() => eligibleDevices.find(d => d.id === sourceId), [eligibleDevices, sourceId]);
  const selectedTargetDevice = useMemo(() => eligibleDevices.find(d => d.id === targetId), [eligibleDevices, targetId]);

  const handleSwap = () => {
    setSourceId(targetId);
    setTargetId(sourceId);
  };

  const diagnosticResult: NetworkDiagnosticResult = useMemo(() => {
    if (!sourceId || !targetId) {
      return { canCommunicate: false, sourceDevice: null, targetDevice: null, issues: [], passedChecks: [] };
    }
    const res = runRootCauseAnalysis(sourceId, targetId, devices, connections, deviceStates);
    if (deviceStates) {
      const vlanMismatches = diagnoseVlanMismatches(devices, connections, deviceStates);
      vlanMismatches.forEach(vm => {
        const titleTr = `Native/VLAN Uyumsuzluğu (${vm.sourceDeviceName} ↔ ${vm.targetDeviceName})`;
        const titleEn = `VLAN Mismatch (${vm.sourceDeviceName} ↔ ${vm.targetDeviceName})`;
        if (!res.issues.some(i => (i.title?.tr || '').includes(vm.sourceDeviceName) && (i.title?.tr || '').includes(vm.targetDeviceName))) {
          res.issues.push({
            id: `vlan-mismatch-${vm.connectionId}`,
            category: 'vlan',
            severity: 'error',
            title: { tr: titleTr, en: titleEn },
            description: { tr: vm.message, en: vm.message },
            suggestedFix: { tr: vm.recommendation, en: vm.recommendation }
          });
          res.canCommunicate = false;
        }
      });
    }
    return res;
  }, [sourceId, targetId, devices, connections, deviceStates]);

  if (!open) return null;

  const headerActions = (
    <div className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
      diagnosticResult.canCommunicate
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    }`}>
      {diagnosticResult.canCommunicate ? (
        <>
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>{isTr ? 'Bağlantı Başarılı' : 'Healthy'}</span>
        </>
      ) : (
        <>
          <XCircle className="w-3 h-3 text-rose-400" />
          <span>{isTr ? `${diagnosticResult.issues.length} Sorun` : `${diagnosticResult.issues.length} Issue(s)`}</span>
        </>
      )}
    </div>
  );

  return (
    <DraggableWindowWrapper
      id="networkDiagnosticsModal"
      alwaysOnTop={true}
      title={
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{isTr ? 'Ağ Sorun Neden Analizcisi' : 'Network Diagnostics & Root Cause Analyzer'}</span>
        </div>
      }
      isOpen={open}
      onClose={() => onOpenChange(false)}
      isDark={isDark}
      modalPosition={dragProps.position}
      modalSize={dragProps.size}
      handlePointerDown={dragProps.handlePointerDown}
      handleResizeStart={dragProps.handleResizeStart}
      collapsible={true}
      mobileFullScreen={false}
      headerActions={headerActions}
      className={isDark ? '!bg-secondary-950 border-secondary-800' : '!bg-white border-secondary-300'}
      contentClassName="p-4 overflow-y-auto space-y-4 custom-scrollbar"
    >
      {/* Source & Target Selection */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 shrink-0 bg-secondary-900/40 p-3 rounded-xl border border-secondary-800/60">
        {/* Source Device */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-sky-400" />
              {isTr ? 'Kaynak Cihaz' : 'Source Device'}
            </label>
            {selectedSourceDevice && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {selectedSourceDevice.ip || (selectedSourceDevice.type === 'cloud' ? (isTr ? 'Bulut' : 'Cloud') : 'L2')}
              </span>
            )}
          </div>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className={`w-full text-xs h-9 ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
              {selectedSourceDevice ? (
                <div className="flex items-center gap-2 truncate">
                  <DeviceIcon type={selectedSourceDevice.type} size={16} switchModel={selectedSourceDevice.switchModel} className="shrink-0 text-sky-400" />
                  <span className="font-semibold">{selectedSourceDevice.name}</span>
                  {selectedSourceDevice.ip && (
                    <span className="text-[10px] font-mono opacity-70">({selectedSourceDevice.ip})</span>
                  )}
                </div>
              ) : (
                <SelectValue placeholder={isTr ? 'Kaynak seçin' : 'Select source'} />
              )}
            </SelectTrigger>
            <SelectContent className={`z-[10005] max-h-72 ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
              {groupedDevices.map((group, gIdx) => (
                <SelectGroup key={group.id}>
                  {gIdx > 0 && <SelectSeparator className={isDark ? 'bg-secondary-800' : 'bg-secondary-200'} />}
                  <SelectLabel className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                    {group.label[language]}
                  </SelectLabel>
                  {group.devices.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer py-1.5">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="font-medium truncate flex items-center gap-2">
                          <DeviceIcon type={d.type} size={16} switchModel={d.switchModel} className="shrink-0" />
                          <span>{d.name}</span>
                        </span>
                        {d.ip ? (
                          <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {d.ip}
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-50 italic">
                            {d.type === 'cloud' ? (isTr ? 'Bulut/WAN' : 'WAN') : (d.type === 'switchL2' || d.type === 'hub' ? 'L2' : (isTr ? 'IP Yok' : 'No IP'))}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Swap Button */}
        <div className="flex items-center justify-center pb-0.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSwap}
            title={isTr ? 'Kaynak ve Hedef Cihazı Yer Değiştir (⇄)' : 'Swap Source & Target'}
            className={`h-9 w-9 shrink-0 ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-300 hover:text-white hover:bg-secondary-800' : 'bg-secondary-100 border-secondary-200 text-secondary-700 hover:bg-secondary-200'}`}
          >
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
          </Button>
        </div>

        {/* Target Device */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              {isTr ? 'Hedef Cihaz' : 'Target Device'}
            </label>
            {selectedTargetDevice && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {selectedTargetDevice.ip || (selectedTargetDevice.type === 'cloud' ? (isTr ? 'Bulut' : 'Cloud') : 'L2')}
              </span>
            )}
          </div>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className={`w-full text-xs h-9 ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
              {selectedTargetDevice ? (
                <div className="flex items-center gap-2 truncate">
                  <DeviceIcon type={selectedTargetDevice.type} size={16} switchModel={selectedTargetDevice.switchModel} className="shrink-0 text-purple-400" />
                  <span className="font-semibold">{selectedTargetDevice.name}</span>
                  {selectedTargetDevice.ip && (
                    <span className="text-[10px] font-mono opacity-70">({selectedTargetDevice.ip})</span>
                  )}
                </div>
              ) : (
                <SelectValue placeholder={isTr ? 'Hedef seçin' : 'Select target'} />
              )}
            </SelectTrigger>
            <SelectContent className={`z-[10005] max-h-72 ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
              {groupedDevices.map((group, gIdx) => (
                <SelectGroup key={group.id}>
                  {gIdx > 0 && <SelectSeparator className={isDark ? 'bg-secondary-800' : 'bg-secondary-200'} />}
                  <SelectLabel className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                    {group.label[language]}
                  </SelectLabel>
                  {group.devices.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer py-1.5">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="font-medium truncate flex items-center gap-2">
                          <DeviceIcon type={d.type} size={16} switchModel={d.switchModel} className="shrink-0" />
                          <span>{d.name}</span>
                        </span>
                        {d.ip ? (
                          <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {d.ip}
                          </span>
                        ) : (
                          <span className="text-[10px] opacity-50 italic">
                            {d.type === 'cloud' ? (isTr ? 'Bulut/WAN' : 'WAN') : (d.type === 'switchL2' || d.type === 'hub' ? 'L2' : (isTr ? 'IP Yok' : 'No IP'))}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all shrink-0 ${
          diagnosticResult.canCommunicate
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
        }`}
      >
        {diagnosticResult.canCommunicate ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
        )}
        <div className="flex-1">
          <div className="text-sm font-bold">
            {diagnosticResult.canCommunicate
              ? isTr
                ? 'Bağlantı Başarılı: Paketler sorunsuz iletiliyor'
                : 'Connection Healthy: Packets can flow end-to-end'
              : isTr
                ? `Bağlantı Başarısız: ${diagnosticResult.issues.length} sorun tespit edildi`
                : `Connection Failed: ${diagnosticResult.issues.length} issue(s) detected`}
          </div>
          <div className="text-xs opacity-80">
            {diagnosticResult.canCommunicate
              ? isTr
                ? 'Kaynak ve hedef cihaz arasındaki tüm L1-L3 protokolleri ve yönlendirme kuralları geçerli.'
                : 'Physical, data-link, and network layer configurations are valid.'
              : isTr
                ? 'Aşağıdaki adımları inceleyerek bağlantıyı onarabilirsiniz.'
                : 'Review the identified issues and recommendations below.'}
          </div>
        </div>
      </div>

      {/* Identified Issues */}
      {diagnosticResult.issues.length > 0 && (
        <div className="space-y-2.5 shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            {isTr ? 'Tespit Edilen Kök Nedenler' : 'Identified Root Causes'}
          </div>
          <div className="space-y-2">
            {diagnosticResult.issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-3 rounded-xl border ${
                  isDark ? 'bg-secondary-900/60 border-rose-900/40' : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {issue.title[language]}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-bold">
                    {issue.category === 'ip' ? 'IP' :
                      issue.category === 'physical' ? (isTr ? 'Fiziksel' : 'Physical') :
                        issue.category === 'gateway' ? (isTr ? 'Gateway' : 'Gateway') :
                          issue.category === 'vlan' ? 'VLAN' :
                            issue.category === 'routing' ? (isTr ? 'Yönlendirme' : 'Routing') :
                              issue.category.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-secondary-300 mt-1">{issue.description[language]}</p>
                <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 border ${
                  isDark ? 'bg-amber-950/20 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold">{isTr ? 'Çözüm Önerisi: ' : 'Suggested Fix: '}</span>
                    {issue.suggestedFix[language]}
                  </div>
                </div>

                {/* Direct Jump to Device action */}
                <div className="mt-2 flex items-center justify-end gap-2">
                  {diagnosticResult.sourceDevice && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onOpenChange(false);
                        window.dispatchEvent(new CustomEvent('open-device-cli', { detail: { deviceId: diagnosticResult.sourceDevice!.id } }));
                      }}
                      className="h-6 px-2 text-[10.5px] font-mono text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 flex items-center gap-1"
                    >
                      <DeviceIcon type={diagnosticResult.sourceDevice.type} size={13} className="shrink-0" />
                      <span>{diagnosticResult.sourceDevice.name} {diagnosticResult.sourceDevice.type === 'pc' ? (isTr ? 'CMD Aç' : 'Open CMD') : (isTr ? 'CLI Aç' : 'Open CLI')}</span>
                    </Button>
                  )}
                  {diagnosticResult.targetDevice && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onOpenChange(false);
                        window.dispatchEvent(new CustomEvent('open-device-cli', { detail: { deviceId: diagnosticResult.targetDevice!.id } }));
                      }}
                      className="h-6 px-2 text-[10.5px] font-mono text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex items-center gap-1"
                    >
                      <DeviceIcon type={diagnosticResult.targetDevice.type} size={13} className="shrink-0" />
                      <span>{diagnosticResult.targetDevice.name} {diagnosticResult.targetDevice.type === 'pc' ? (isTr ? 'CMD Aç' : 'Open CMD') : (isTr ? 'CLI Aç' : 'Open CLI')}</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Passed Checks */}
      {diagnosticResult.passedChecks.length > 0 && (
        <div className="space-y-2 shrink-0">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {isTr ? 'Başarılı Kontroller' : 'Passed Checks'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {diagnosticResult.passedChecks.map((check, idx) => (
              <div
                key={`passed-${idx}-${check.en.slice(0, 15)}`}
                className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                  isDark ? 'bg-secondary-900/40 border-secondary-800/60 text-secondary-300' : 'bg-secondary-50 border-secondary-200 text-secondary-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{check[language]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automated Network Verification & Assertion Section */}
      <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-950/20 space-y-2 shrink-0">
        <div className="text-xs font-bold text-sky-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            {isTr ? 'Otomatik Ağ Doğrulama & Test Assertion\'ı' : 'Automated Network Verification & Assertions'}
          </span>
          <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300">
            {selectedSourceDevice?.name || 'Src'} ↔ {selectedTargetDevice?.name || 'Dst'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {(() => {
            if (!sourceId || !targetId || sourceId === targetId) {
              return (
                <div className="col-span-2 text-[11px] opacity-70 italic">
                  {isTr ? 'Test assertion çalıştırmak için kaynak ve hedef cihazları seçin.' : 'Select source and target devices to run assertion checks.'}
                </div>
              );
            }

            const pingSuccessRule: NetworkAssertionRule = {
              id: 'ping-success',
              type: 'PING_SUCCESS',
              sourceDeviceId: sourceId,
              targetDeviceId: targetId,
              descriptionTr: 'Ping Erişimi Başarılı Olmalı',
              descriptionEn: 'Ping Reachability Required',
            };
            const pingFailRule: NetworkAssertionRule = {
              id: 'ping-fail',
              type: 'PING_FAIL',
              sourceDeviceId: sourceId,
              targetDeviceId: targetId,
              descriptionTr: 'VLAN / ACL İzolasyonu (Ping Engeli)',
              descriptionEn: 'VLAN / ACL Isolation (Ping Blocked)',
            };
            const httpRule: NetworkAssertionRule = {
              id: 'port-http',
              type: 'PORT_REACHABLE',
              sourceDeviceId: sourceId,
              targetDeviceId: targetId,
              port: 80,
              descriptionTr: 'Web Sunucu Port 80 (HTTP) Açık',
              descriptionEn: 'Web Server Port 80 (HTTP) Open',
            };
            const portBlockedRule: NetworkAssertionRule = {
              id: 'port-blocked',
              type: 'PORT_BLOCKED',
              sourceDeviceId: sourceId,
              targetDeviceId: targetId,
              port: 22,
              descriptionTr: 'Port 22 (SSH) Engelli / Kapalı',
              descriptionEn: 'Port 22 (SSH) Blocked / Closed',
            };

            const assertions = [pingSuccessRule, pingFailRule, httpRule, portBlockedRule];
            const results = assertions.map(r => evaluateNetworkAssertion(r, devices, connections, deviceStates));

            return results.map(res => (
              <div
                key={res.ruleId}
                className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                  res.passed
                    ? (isDark ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900')
                    : (isDark ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900')
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {res.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  <span className="font-mono text-[11px] truncate">
                    {isTr ? res.messageTr : res.messageEn}
                  </span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                  res.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {res.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ));
          })()}
        </div>
      </div>

      <div className="pt-2 flex justify-end shrink-0">
        <Button
          size="sm"
          onClick={() => onOpenChange(false)}
          className="text-xs bg-primary-600 hover:bg-primary-500 text-white"
        >
          {isTr ? 'Tamam' : 'Close'}
        </Button>
      </div>
    </DraggableWindowWrapper>
  );
}
