import React, { useState, useEffect } from 'react';
import { Layers, Play, Pause, SkipForward, RotateCcw, Search, X } from 'lucide-react';
import type { PipelineResult, PacketTrace } from '@/lib/network/forwarding/packetPipeline';
import { decodePduLayers, generatePduHexAndAscii } from '@/lib/network/forwarding/pduDecoder';

interface EmbeddedPduInspectorProps {
  pipelineResult: PipelineResult | null;
  isDark?: boolean;
  language?: 'tr' | 'en';
}

const tr = {
  title: 'PDU Akış & Paket İnceleyicisi',
  subtitle: 'OSI Katman Analizi, Protokol Ağacı ve Hex Dökümü',
  successBadge: 'AKTARIM BAŞARILI',
  dropBadge: 'PAKET DÜŞTÜ (DROP)',
  close: 'Kapat',
  jumpToStart: 'Başa Dön',
  play: 'Oynat',
  pause: 'Durdur',
  nextHop: 'Bir Sonraki Atlama',
  hop: 'Atlama:',
  node: 'Düğüm',
  speed: 'Hız:',
  tabOsi: 'OSI Modeli',
  tabProtocol: 'Protokol Ağacı',
  tabHex: 'Hex Dökümü',
  inboundLayers: 'Giriş Katmanları (Inbound PDU Layers)',
  outboundLayers: 'Çıkış Katmanları (Outbound PDU Layers)',
  layer: (n: number) => `KATMAN ${n}`,
  field: 'Alan (Field)',
  value: 'Değer (Value)',
  deviceLog: (deviceId: string) => `Cihaz Karar Günlüğü (${deviceId})`,
  protocolTree: 'Protokol Ağacı Çözümlemesi',
  rawHex: 'Ham Paket Çerçeve Dökümü (Raw Ethernet Frame Hex Dump)',
  filterPlaceholder: 'Filtrele (örn: IP, MAC, VLAN, ICMP, TCP)...',
  noFilterMatches: 'Filtreye uyan katman veya alan bulunamadı.',
};

const en = {
  title: 'PDU Flow & Packet Inspector',
  subtitle: 'OSI Layer Analysis, Protocol Tree and Hex Dump',
  successBadge: 'FORWARDED SUCCESSFULLY',
  dropBadge: 'PACKET DROPPED',
  close: 'Close',
  jumpToStart: 'Jump to Start',
  play: 'Play',
  pause: 'Pause',
  nextHop: 'Next Hop',
  hop: 'Hop:',
  node: 'Node',
  speed: 'Speed:',
  tabOsi: 'OSI Model',
  tabProtocol: 'Protocol Tree',
  tabHex: 'Hex Dump',
  inboundLayers: 'Inbound PDU Layers',
  outboundLayers: 'Outbound PDU Layers',
  layer: (n: number) => `LAYER ${n}`,
  field: 'Field',
  value: 'Value',
  deviceLog: (deviceId: string) => `Device Decision Log (${deviceId})`,
  protocolTree: 'Protocol Tree Analysis',
  rawHex: 'Raw Ethernet Frame Hex Dump',
  filterPlaceholder: 'Filter (e.g. IP, MAC, VLAN, ICMP, TCP)...',
  noFilterMatches: 'No matching layers or fields found.',
};

export const EmbeddedPduInspector: React.FC<EmbeddedPduInspectorProps> = ({
  pipelineResult,
  isDark = true,
  language = 'tr',
}) => {
  const [activeTab, setActiveTab] = useState<'osi' | 'protocol' | 'hex'>('osi');
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [filterQuery, setFilterQuery] = useState<string>('');

  const t = language === 'en' ? en : tr;
  const o = language === 'en' ? tr : en; // opposite language for bilingual display

  useEffect(() => {
    if (pipelineResult) {
      setCurrentHopIndex(0);
      setIsPlaying(false);
    }
  }, [pipelineResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && pipelineResult && pipelineResult.hopResults.length > 0) {
      timer = setInterval(() => {
        setCurrentHopIndex(prev => {
          if (prev >= pipelineResult.hopResults.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, pipelineResult, playbackSpeed]);

  if (!pipelineResult) return null;

  const { hopResults, success } = pipelineResult;
  const currentHop = hopResults[currentHopIndex] ?? hopResults[0];
  const hopTraces: PacketTrace[] = currentHop?.traces ?? [];
  const activeFrame = hopTraces[hopTraces.length - 1]?.frameSnapshot ?? pipelineResult.finalFrame;
  if (!activeFrame) return null;

  const { inLayers, outLayers, decisions } = decodePduLayers(activeFrame, hopTraces);
  const { hexDump } = generatePduHexAndAscii(activeFrame);

  const query = filterQuery.toLowerCase().trim();

  const filterLayerList = (layers: typeof inLayers) => {
    if (!query) return layers;
    return layers.filter(layer => {
      if (layer.name.toLowerCase().includes(query)) return true;
      if (layer.title.toLowerCase().includes(query)) return true;
      if (layer.fields?.some(f => f.label.toLowerCase().includes(query) || String(f.value).toLowerCase().includes(query))) return true;
      if (layer.notes?.some(n => n.toLowerCase().includes(query))) return true;
      return false;
    });
  };

  const filteredInLayers = filterLayerList(inLayers);
  const filteredOutLayers = filterLayerList(outLayers);
  const filteredDecisions = query
    ? decisions.filter(d => d.toLowerCase().includes(query))
    : decisions;

  return (
    <div className={`w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden transition-all ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
      {/* Header */}
      <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide">{t.title} / {o.title}</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                {success ? t.successBadge : t.dropBadge}
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.subtitle} / {o.subtitle}
            </p>
          </div>
        </div>
      </div>
      {/* Toolbar */}
      <div className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsPlaying(false); setCurrentHopIndex(0); }} title={t.jumpToStart} className={`p-1.5 rounded-md border text-xs flex items-center gap-1 ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200'}`}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)} className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${isPlaying ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'}`}>
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />} {isPlaying ? t.pause : t.play}
          </button>
          <button onClick={() => { setIsPlaying(false); setCurrentHopIndex(prev => Math.min(hopResults.length - 1, prev + 1)); }} disabled={currentHopIndex >= hopResults.length - 1} className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200 text-slate-700'}`}>
            <SkipForward className="w-3.5 h-3.5" /> {t.nextHop}
          </button>
          <select value={playbackSpeed} onChange={e => setPlaybackSpeed(Number(e.target.value))} className={`px-2 py-0.5 text-xs border rounded ${isDark ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-300 bg-white text-slate-700'}`}>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Filter Input */}
        <div className="flex-1 max-w-xs relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder={t.filterPlaceholder}
            className={`w-full pl-8 pr-7 py-1 text-xs rounded-md border outline-none font-mono transition-all ${
              isDark
                ? 'bg-slate-950/70 border-slate-700 text-slate-200 focus:border-cyan-500'
                : 'bg-white border-slate-300 text-slate-800 focus:border-cyan-600'
            }`}
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setActiveTab('osi')} className={`px-3 py-1 text-xs rounded ${activeTab === 'osi' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}>{t.tabOsi}</button>
          <button onClick={() => setActiveTab('protocol')} className={`px-3 py-1 text-xs rounded ${activeTab === 'protocol' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}>{t.tabProtocol}</button>
          <button onClick={() => setActiveTab('hex')} className={`px-3 py-1 text-xs rounded ${activeTab === 'hex' ? 'bg-cyan-600 text-cyan-100' : 'bg-cyan-950/60 text-cyan-300'} border border-cyan-500/40`}>{t.tabHex}</button>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {activeTab === 'osi' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inbound Layers */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                {t.inboundLayers}
              </h4>
              <div className="space-y-3">
                {filteredInLayers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">{filterQuery ? t.noFilterMatches : 'No inbound layer data'}</p>
                ) : (
                  filteredInLayers.map((layer, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-cyan-300">{t.layer(layer.layer)}: {layer.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{layer.title}</span>
                      </div>
                      {layer.fields && layer.fields.length > 0 && (
                        <div className="space-y-1 my-2">
                          {layer.fields.map((f, fIdx) => (
                            <div key={fIdx} className="flex justify-between text-xs py-0.5 border-b border-slate-700/30">
                              <span className="text-slate-400">{f.label}:</span>
                              <span className="font-mono text-slate-200 font-medium">{String(f.value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {layer.notes && layer.notes.length > 0 && (
                        <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/20 border border-amber-500/20 p-2 rounded">
                          {layer.notes.map((n, nIdx) => (
                            <p key={nIdx}>{n}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Outbound Layers */}
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {t.outboundLayers}
              </h4>
              <div className="space-y-3">
                {filteredOutLayers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">{filterQuery ? t.noFilterMatches : 'No outbound layer data'}</p>
                ) : (
                  filteredOutLayers.map((layer, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-emerald-300">{t.layer(layer.layer)}: {layer.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{layer.title}</span>
                      </div>
                      {layer.fields && layer.fields.length > 0 && (
                        <div className="space-y-1 my-2">
                          {layer.fields.map((f, fIdx) => (
                            <div key={fIdx} className="flex justify-between text-xs py-0.5 border-b border-slate-700/30">
                              <span className="text-slate-400">{f.label}:</span>
                              <span className="font-mono text-slate-200 font-medium">{String(f.value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {layer.notes && layer.notes.length > 0 && (
                        <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-950/20 border border-amber-500/20 p-2 rounded">
                          {layer.notes.map((n, nIdx) => (
                            <p key={nIdx}>{n}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Decisions */}
            {filteredDecisions && filteredDecisions.length > 0 && (
              <div className={`col-span-1 md:col-span-2 p-4 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-xs font-bold text-slate-300 mb-2">{t.deviceLog(currentHop?.deviceId || 'Device')}</h4>
                <div className="space-y-1 font-mono text-xs text-slate-300">
                  {filteredDecisions.map((d, dIdx) => (
                    <div key={dIdx} className="p-1.5 rounded bg-slate-900/60 border border-slate-800">
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'protocol' && (
          <div className={`p-4 rounded-lg border space-y-3 ${isDark ? 'bg-slate-950/40 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
            <h4 className="text-sm font-bold text-cyan-400">{t.protocolTree}</h4>
            <div className="font-mono text-xs space-y-2">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span className="text-indigo-400 font-bold">Ethernet II</span> (Src: {activeFrame.srcMac || '00:00:00:00:00:00'}, Dst: {activeFrame.dstMac || 'FF:FF:FF:FF:FF:FF'})
              </div>
              {activeFrame.vlanId && activeFrame.vlanId > 1 && (
                <div className="ml-4 p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-cyan-400 font-bold">802.1Q Virtual LAN</span> (ID: {activeFrame.vlanId}, Priority: {activeFrame.priority || 0})
                </div>
              )}
              {activeFrame.srcIp && (
                <div className="ml-4 p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-emerald-400 font-bold">Internet Protocol Version 4</span> (Src: {activeFrame.srcIp}, Dst: {activeFrame.dstIp}, TTL: {activeFrame.ttl ?? 64})
                </div>
              )}
              {activeFrame.arpPayload && (
                <div className="ml-4 p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-emerald-400 font-bold">Address Resolution Protocol ({activeFrame.arpPayload.operation})</span> (Sender: {activeFrame.arpPayload.senderIp}, Target: {activeFrame.arpPayload.targetIp})
                </div>
              )}
              {activeFrame.protocol && activeFrame.protocol !== 'ARP' && (
                <div className="ml-8 p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-amber-400 font-bold">{activeFrame.protocol}</span> (Details: {activeFrame.info || 'Payload Data'})
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'hex' && (
          <div className={`p-4 rounded-lg border font-mono text-xs ${isDark ? 'bg-slate-950/80 border-slate-800 text-cyan-300' : 'bg-slate-900 border-slate-700 text-cyan-300'}`}>
            <h4 className="text-xs font-bold text-slate-400 mb-2">{t.rawHex}</h4>
            <pre className="whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-cyan-600 selection:text-white" style={{ wordBreak: 'break-all' }}>{hexDump}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
