'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, XCircle, Stethoscope, Lightbulb, Network, ShieldAlert } from 'lucide-react';
import type { CanvasDevice, CanvasConnection } from './networkTopology.types';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl border shadow-2xl ${
          isDark ? 'bg-secondary-950 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-200 text-secondary-900'
        }`}
      >
        <DialogHeader className="border-b pb-3 border-secondary-800/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                {isTr ? 'Ağ Teşhis & Kök Neden Analizcisi' : 'Network Diagnostics & Root Cause Analyzer'}
              </DialogTitle>
              <DialogDescription className="text-xs text-secondary-400">
                {isTr
                  ? 'İki cihaz arasındaki bağlantı kopukluklarını, subnet, VLAN ve gateway hatalarını anında analiz edin.'
                  : 'Instantly diagnose connectivity issues, subnet, VLAN and gateway misconfigurations.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Source & Target Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
          className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
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
          <div className="space-y-2.5">
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-mono">
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-300 mt-1">{issue.description[language]}</p>
                  <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 border ${
                    isDark ? 'bg-amber-950/20 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">{isTr ? 'Çözüm Önerisi: ' : 'Suggested Fix: '}</span>
                      {issue.suggestedFix[language]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Passed Checks */}
        {diagnosticResult.passedChecks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {isTr ? 'Başarılı Kontroller' : 'Passed Checks'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {diagnosticResult.passedChecks.map((check, idx) => (
                <div
                  key={idx}
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

        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs bg-primary-600 hover:bg-primary-500 text-white"
          >
            {isTr ? 'Tamam' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
