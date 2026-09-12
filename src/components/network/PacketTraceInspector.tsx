// Updated PacketTraceInspector with tabbed Visual PDU Inspector
import React, { useState } from 'react';
import { PipelineResult, PacketTrace, HopResult } from '@/lib/network/forwarding/packetPipeline';
import { getDropReasonDetail } from '@/lib/network/forwarding/dropReasons';
import { VisualPduInspectorModal } from './VisualPduInspectorModal';
import { EmbeddedPduInspector } from './EmbeddedPduInspector';
// Duplicate import removed

interface PacketTraceInspectorProps {
  isOpen?: boolean;
  onClose?: () => void;
  pipelineResult: PipelineResult | null;
  onSelectHop?: (deviceId: string) => void;
  embedded?: boolean;
  isDark?: boolean;
  language?: 'tr' | 'en';
}

const tr = {
  emptyTrace: 'İzleme verisi bulunamadı.',
  hopSection: 'Sekans & Düğüm Sekansı (Hops)',
  egress: 'Çıkış:',
  dropped: 'Düşürüldü',
  reached: 'Hedef alındı',
  pipelineDecisions: (deviceId: string) => `${deviceId} — Pipeline Aşama Kararları`,
  stageDetail: (stage: string) => `Aşama Detayı: ${stage}`,
  action: (action: string) => `Eylem: ${action}`,
  frameHeader: 'Paket Başlık Bilgisi (Frame Header Snapshot)',
  srcMac: 'Kaynak MAC',
  dstMac: 'Hedef MAC',
  srcIp: 'Kaynak IP',
  dstIp: 'Hedef IP',
  protocol: 'Protokol',
  ttl: 'TTL',
  vlan: 'VLAN ID',
  ingressPort: 'Giriş Portu',
  noHop: 'Hop seçilmedi',
  suggestion: '💡 Öneri:',
  modalTitle: 'Canlı Paket İzleme',
  delivered: 'Paket hedef düğüme başarıyla ulaştı',
  interrupted: (reason: string) => `Paket akışı kesintiye uğradı: ${reason}`,
  closeEsc: 'Kapat (ESC)',
  tabPdu: '🔍 Görsel PDU İnceleme',
  tabTrace: '🔍 İzleme Detayları',
};

const en = {
  emptyTrace: 'No trace data found.',
  hopSection: 'Hops Sequence',
  egress: 'Egress:',
  dropped: 'Dropped',
  reached: 'Destination reached',
  pipelineDecisions: (deviceId: string) => `${deviceId} — Pipeline Stage Decisions`,
  stageDetail: (stage: string) => `Stage Detail: ${stage}`,
  action: (action: string) => `Action: ${action}`,
  frameHeader: 'Frame Header Snapshot',
  srcMac: 'Source MAC',
  dstMac: 'Destination MAC',
  srcIp: 'Source IP',
  dstIp: 'Destination IP',
  protocol: 'Protocol',
  ttl: 'TTL',
  vlan: 'VLAN ID',
  ingressPort: 'Ingress Port',
  noHop: 'No hop selected',
  suggestion: '💡 Suggestion:',
  modalTitle: 'Live Packet Trace',
  delivered: 'Packet reached the destination node successfully',
  interrupted: (reason: string) => `Packet flow interrupted: ${reason}`,
  closeEsc: 'Close (ESC)',
  tabPdu: '🔍 Visual PDU Inspector',
  tabTrace: '🔍 Trace Details',
};

export const PacketTraceView: React.FC<{
  pipelineResult: PipelineResult | null;
  onSelectHop?: (deviceId: string) => void;
  isDark?: boolean;
  language?: 'tr' | 'en';
}> = ({ pipelineResult, onSelectHop, isDark = true, language = 'tr' }) => {
  const [activeHopIndex, setActiveHopIndex] = useState<number>(0);
  const [activeStageIndex, setActiveStageIndex] = useState<number | null>(null);

  const t = language === 'en' ? en : tr;

  if (!pipelineResult) {
    return (
      <div className={`p-8 text-center text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {t.emptyTrace}
      </div>
    );
  }

  const { hopResults, success, dropReason } = pipelineResult;
  const activeHop: HopResult | undefined = hopResults[activeHopIndex];
  const hopTraces = activeHop?.traces || [];

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'pass':
      case 'forward':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'drop':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'flood':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'trap':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      case 'skip':
      default:
        return 'bg-slate-700/40 text-slate-400 border-slate-600/40';
    }
  };

  const activeTrace: PacketTrace | undefined =
    activeStageIndex !== null ? hopTraces[activeStageIndex] : hopTraces[hopTraces.length - 1];

  const parsedDrop = dropReason ? getDropReasonDetail(dropReason) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
      {/* Drop Highlight Banner if failed */}
      {!success && parsedDrop && (
        <div className={`border-b px-4 py-2.5 flex items-start gap-3 text-xs shrink-0 ${isDark ? 'bg-rose-950/60 border-rose-800/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
          <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 font-mono font-bold text-[10px] shrink-0">
            {parsedDrop.category} DROP
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{parsedDrop.title}</div>
            <div className="text-[11px] opacity-90">{parsedDrop.description}</div>
            {parsedDrop.suggestedFix && (
              <div className="mt-0.5 italic text-[11px] opacity-80">{t.suggestion} {parsedDrop.suggestedFix}</div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-700/40 dark:divide-slate-800">
        {/* Hop Stepper Navigation (Left Panel) */}
        <div className={`md:col-span-4 p-3 overflow-y-auto space-y-2 min-h-0 ${isDark ? 'bg-slate-950/40' : 'bg-slate-50/50'
          }`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
            {t.hopSection}
          </div>
          {hopResults.map((hop, idx) => {
            const hasDrop = hop.traces.some(a => a.action === 'drop');
            const isSelected = idx === activeHopIndex;
            return (
              <button
                key={`${hop.deviceId}-${idx}`}
                onClick={() => {
                  setActiveHopIndex(idx);
                  setActiveStageIndex(null);
                  if (onSelectHop) onSelectHop(hop.deviceId);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${isSelected
                    ? isDark
                      ? 'bg-sky-950/60 border-sky-500/80 text-sky-100 shadow-md'
                      : 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm font-semibold'
                    : hasDrop
                      ? isDark
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-200 hover-bg-rose-900/40'
                        : 'bg-rose-50/70 border-rose-300 text-rose-900 hover-bg-rose-100'
                      : isDark
                        ? 'bg-slate-900/50 border-slate-800 text-slate-300 hover-bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-700 hover-bg-slate-100'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-300' : 'bg-slate-200 border border-slate-300 text-slate-700'
                    }`}>{idx + 1}</span>
                  <div className="min-w-1 flex-1">
                    <div className="text-xs font-medium truncate">{hop.deviceId}</div>
                    <div className="text-[10px] opacity-70 truncate">
                      {hop.egressPorts.length > 0
                        ? `${t.egress} ${hop.egressPorts.join(', ')}`
                        : hasDrop
                          ? t.dropped
                          : t.reached}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono shrink-0 ${hasDrop
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}
                >
                  {hasDrop ? 'DROP' : 'PASS'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pipeline Stage Inspector (Right Panel) */}
        <div className={`md:col-span-8 p-4 overflow-y-auto flex flex-col gap-4 min-h-0 ${isDark ? 'bg-slate-900/20' : 'bg-white'
          }`}>
          {activeHop ? (
            <>
              {/* Hop Stage Timeline */}
              <div>
                <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>{t.pipelineDecisions(activeHop.deviceId)}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hopTraces.map((trace, sIdx) => {
                    const isStageSelected = activeStageIndex === sIdx;
                    return (
                      <button
                        key={`${trace.stage}-${sIdx}`}
                        onClick={() => setActiveStageIndex(sIdx)}
                        className={`p-2 rounded-lg border text-left transition ${isStageSelected
                            ? isDark
                              ? 'border-sky-400 bg-sky-950/40 ring-1 ring-sky-400/50'
                              : 'border-sky-500 bg-sky-50 ring-1 ring-sky-400/40'
                            : isDark
                              ? 'border-slate-800 bg-slate-900/60 hover-bg-slate-800'
                              : 'border-slate-200 bg-slate-50 hover-bg-slate-100'
                          }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {trace.stage}
                          </span>
                          <span className={`px-1 py-0.2 rounded border uppercase font-mono text-[9px] ${getActionBadgeClass(trace.action)}`}>
                            {trace.action}
                          </span>
                        </div>
                        <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{trace.reason}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Stage Detail & Frame Header Inspector */}
              {activeTrace && (
                <div className="space-y-3 pt-2 border-t border-slate-700/40 dark:border-slate-800">
                  <div className={`border rounded-xl p-3 space-y-2 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-sky-400 font-mono tracking-wide">
                        {t.stageDetail(activeTrace.stage)}
                      </span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${getActionBadgeClass(activeTrace.action)}`}>
                        {t.action(activeTrace.action)}
                      </span>
                    </div>
                    <p className={`text-xs font-medium p-2.5 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}>{activeTrace.reason}</p>
                  </div>

                  {/* Frame Snapshot Header */}
                  <div className={`border rounded-xl p-3 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <div className={`text-[10px] font-bold uppercase font-mono mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                      {t.frameHeader}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.srcMac}</span>
                        <span className={`font-mono text-[11px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {activeTrace.frameSnapshot.srcMac || '—'}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.dstMac}</span>
                        <span className={`font-mono text-[11px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {activeTrace.frameSnapshot.dstMac || '—'}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.srcIp}</span>
                        <span className="font-mono text-[11px] text-sky-400 font-semibold">
                          {activeTrace.frameSnapshot.srcIp || '—'}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.dstIp}</span>
                        <span className="font-mono text-[11px] text-sky-400 font-semibold">
                          {activeTrace.frameSnapshot.dstIp || '—'}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.protocol}</span>
                        <span className="font-mono text-[11px] text-amber-400 font-semibold">
                          {activeTrace.frameSnapshot.protocol}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.ttl}</span>
                        <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                          {activeTrace.frameSnapshot.ttl ?? 64}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.vlan}</span>
                        <span className="font-mono text-[11px] text-purple-400 font-semibold">
                          {activeTrace.frameSnapshot.vlanId || 1}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-slate-500 block text-[9px] uppercase font-semibold">{t.ingressPort}</span>
                        <span className={`font-mono text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {activeTrace.portId || 'Local'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">{t.noHop}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PacketTraceInspector: React.FC<PacketTraceInspectorProps> = ({
  isOpen = true,
  onClose,
  pipelineResult,
  onSelectHop,
  embedded = false,
  isDark = true,
  language = 'tr',
}) => {
  const [activePane, setActivePane] = useState<'trace' | 'pdu'>('trace');
  const [showPduModal, setShowPduModal] = useState(false);

  const t = language === 'en' ? en : tr;

  if (embedded) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${pipelineResult?.success ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
            <div>
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">{t.modalTitle}</h2>
              <p className="text-xs text-slate-400">
                {pipelineResult?.success
                  ? t.delivered
                  : t.interrupted(pipelineResult?.dropReason || (language === 'en' ? 'Drop detected' : 'Drop algılandı'))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePane('trace')}
              className={`px-3 py-1 text-xs rounded ${activePane === 'trace' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}
            >
              {t.tabTrace}
            </button>
            <button
              onClick={() => setActivePane('pdu')}
              className={`px-3 py-1 text-xs rounded ${activePane === 'pdu' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}
            >
              {t.tabPdu}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover-bg-slate-700 border border-slate-600 rounded-lg transition"
              >
                {t.closeEsc}
              </button>
            )}
          </div>
        </div>
        {/* Content */}
        {activePane === 'trace' ? (
          <PacketTraceView pipelineResult={pipelineResult} onSelectHop={onSelectHop} isDark={isDark} language={language} />
        ) : (
          <EmbeddedPduInspector
            pipelineResult={pipelineResult}
            isDark={isDark}
            language={language}
          />
        )}
      </div>
    );
  }

  if (!isOpen || !pipelineResult) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${pipelineResult.success ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
              <div>
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">{t.modalTitle}</h2>
                <p className="text-xs text-slate-400">
                  {pipelineResult.success
                    ? t.delivered
                    : t.interrupted(pipelineResult.dropReason || (language === 'en' ? 'Drop detected' : 'Drop algılandı'))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tab Switch */}
              <button
                onClick={() => setActivePane('trace')}
                className={`px-3 py-1 text-xs rounded ${activePane === 'trace' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}
              >
                {t.tabTrace}
              </button>
              <button
                onClick={() => setActivePane('pdu')}
                className={`px-3 py-1 text-xs rounded ${activePane === 'pdu' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}
              >
                {t.tabPdu}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover-bg-slate-700 border border-slate-600 rounded-lg transition"
                >
                  {t.closeEsc}
                </button>
              )}
            </div>
          </div>
          {/* Content */}
          {activePane === 'trace' ? (
            <PacketTraceView pipelineResult={pipelineResult} onSelectHop={onSelectHop} isDark={isDark} language={language} />
          ) : (
            <EmbeddedPduInspector
              pipelineResult={pipelineResult}
              isDark={isDark}
              language={language}
            />
          )}
        </div>
      </div>
      {/* Separate PDU Modal */}
      {showPduModal && (
        <VisualPduInspectorModal
          isOpen={true}
          onClose={() => setShowPduModal(false)}
          pipelineResult={pipelineResult}
          isDark={isDark}
          language={language}
        />
      )}
    </>
  );
};
