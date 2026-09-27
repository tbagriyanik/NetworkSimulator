'use client';

import { useState, useMemo } from 'react';
import { DraggableWindowWrapper } from './DraggableWindowWrapper';
import { useDrag } from '@/hooks/useDrag';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Lightbulb,
  Network,
  ShieldAlert,
} from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from './NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { runRootCauseAnalysis, NetworkDiagnosticResult } from '@/lib/network/connectivity/networkTroubleshooter';

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
    return devices.filter(d => d.type !== 'cloud');
  }, [devices]);

  const [sourceId, setSourceId] = useState<string>(() => {
    return defaultSourceId || (eligibleDevices[0]?.id ?? '');
  });

  const [targetId, setTargetId] = useState<string>(() => {
    return defaultTargetId || (eligibleDevices[1]?.id ?? eligibleDevices[0]?.id ?? '');
  });

  const diagnosticResult: NetworkDiagnosticResult = useMemo(() => {
    if (!sourceId || !targetId) {
      return { canCommunicate: false, sourceDevice: null, targetDevice: null, issues: [], passedChecks: [] };
    }
    return runRootCauseAnalysis(sourceId, targetId, devices, connections, deviceStates);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-secondary-300 flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-sky-400" />
            {isTr ? 'Kaynak Cihaz' : 'Source Device'}
          </label>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className={`w-full text-xs h-9 ${isDark ? 'bg-secondary-900 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
              <SelectValue placeholder={isTr ? 'Kaynak seçin' : 'Select source'} />
            </SelectTrigger>
            <SelectContent className={`z-[10005] ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
              {eligibleDevices.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
                  {d.name} {d.ip ? `(${d.ip})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-secondary-300 flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-purple-400" />
            {isTr ? 'Hedef Cihaz' : 'Target Device'}
          </label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className={`w-full text-xs h-9 ${isDark ? 'bg-secondary-900 border-secondary-800' : 'bg-secondary-50 border-secondary-200'}`}>
              <SelectValue placeholder={isTr ? 'Hedef seçin' : 'Select target'} />
            </SelectTrigger>
            <SelectContent className={`z-[10005] ${isDark ? 'bg-secondary-900 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'}`}>
              {eligibleDevices.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
                  {d.name} {d.ip ? `(${d.ip})` : ''}
                </SelectItem>
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
                      className="h-6 px-2 text-[10.5px] font-mono text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                    >
                      ⚙️ {diagnosticResult.sourceDevice.name} {diagnosticResult.sourceDevice.type === 'pc' ? (isTr ? 'CMD Aç' : 'Open CMD') : (isTr ? 'CLI Aç' : 'Open CLI')}
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
                      className="h-6 px-2 text-[10.5px] font-mono text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      ⚙️ {diagnosticResult.targetDevice.name} {diagnosticResult.targetDevice.type === 'pc' ? (isTr ? 'CMD Aç' : 'Open CMD') : (isTr ? 'CLI Aç' : 'Open CLI')}
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
