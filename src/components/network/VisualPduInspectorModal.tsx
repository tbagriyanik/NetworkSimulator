import React, { useState, useEffect } from 'react';
import { Layers, Terminal as TerminalIcon, Play, Pause, SkipForward, RotateCcw, Activity, ShieldCheck, Binary, Info } from 'lucide-react';
import type { PipelineResult, PacketTrace } from '@/lib/network/forwarding/packetPipeline';
import { decodePduLayers, generatePduHexAndAscii } from '@/lib/network/forwarding/pduDecoder';

interface VisualPduInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineResult: PipelineResult | null;
  isDark?: boolean;
}

export const VisualPduInspectorModal: React.FC<VisualPduInspectorModalProps> = ({
  isOpen,
  onClose,
  pipelineResult,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<'osi' | 'wireshark' | 'hex'>('osi');
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentHopIndex(0);
      setIsPlaying(false);
    }
  }, [isOpen, pipelineResult]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && pipelineResult && pipelineResult.hopResults.length > 0) {
      timer = setInterval(() => {
        setCurrentHopIndex((prev) => {
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

  if (!isOpen || !pipelineResult) return null;

  const { hopResults, success } = pipelineResult;

  const currentHop = hopResults[currentHopIndex] || hopResults[0];
  const hopTraces: PacketTrace[] = currentHop?.traces || [];
  const activeFrame = hopTraces[hopTraces.length - 1]?.frameSnapshot || pipelineResult.finalFrame;

  if (!activeFrame) return null;

  const { inLayers, outLayers, decisions } = decodePduLayers(activeFrame, hopTraces);
  const { hexDump } = generatePduHexAndAscii(activeFrame);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl h-[85vh] rounded-xl flex flex-col shadow-2xl border overflow-hidden transition-all ${isDark
          ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-cyan-950/20'
          : 'bg-white border-slate-200 text-slate-800 shadow-xl'
          }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">PDU Akış & Paket İnceleyicisi (Visual Packet Inspector)</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                >
                  {success ? 'AKTARIM BAŞARILI' : 'PAKET DÜŞTÜ (DROP)'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                OSI Katman Analizi, Protokol Ağacı ve Hex Dökümü
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
            >
              Kapat
            </button>
          </div>
        </div>

        {/* Timeline Playback Stepper Toolbar */}
        <div
          className={`px-5 py-2.5 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'
            }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentHopIndex(0);
              }}
              title="Başa Dön"
              className={`p-1.5 rounded-md border text-xs flex items-center gap-1 ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200'
                }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${isPlaying
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'
                }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Durdur' : 'Oynat'}
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentHopIndex((prev) => Math.min(hopResults.length - 1, prev + 1));
              }}
              disabled={currentHopIndex >= hopResults.length - 1}
              title="Bir Sonraki Atlama"
              className={`p-1.5 rounded-md border text-xs flex items-center gap-1 disabled:opacity-40 ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-200'
                }`}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <div className="text-xs flex items-center gap-1.5 font-mono">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Atlama:</span>
              <span className="font-bold text-cyan-400">
                {currentHopIndex + 1} / {hopResults.length || 1}
              </span>
              <span className="text-slate-500 font-sans">({currentHop?.deviceId || 'Düğüm'})</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Hız:</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${playbackSpeed === spd
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 font-bold'
                    : isDark
                      ? 'border-slate-800 text-slate-400 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* View Selector Tabs */}
            <div className="flex rounded-lg p-0.5 border border-slate-700/60 bg-slate-950/40 text-xs">
              <button
                onClick={() => setActiveTab('osi')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${activeTab === 'osi'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Layers className="w-3.5 h-3.5" />
                OSI Modeli
              </button>
              <button
                onClick={() => setActiveTab('wireshark')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${activeTab === 'wireshark'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                Protokol Ağacı
              </button>
              <button
                onClick={() => setActiveTab('hex')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${activeTab === 'hex'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Binary className="w-3.5 h-3.5" />
                Hex Dökümü
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row">
          {/* Main Tab Views */}
          {activeTab === 'osi' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-800">
              {/* Left Column: OSI Layers List */}
              <div className="w-full md:w-5/12 p-4 overflow-y-auto space-y-4 min-h-0">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Giriş Katmanları (Inbound PDU Layers)
                </div>

                <div className="space-y-2">
                  {inLayers.map((layer, idx) => {
                    const isSelected = selectedLayerIndex === idx;
                    return (
                      <button
                        key={`layer-${layer.layer}-${idx}`}
                        onClick={() => setSelectedLayerIndex(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col gap-1 ${isSelected
                          ? isDark
                            ? 'bg-cyan-950/30 border-cyan-500/60 shadow-sm'
                            : 'bg-cyan-50 border-cyan-300'
                          : isDark
                            ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-cyan-400">
                            KATMAN {layer.layer}
                          </span>
                          <span className="text-xs font-medium text-slate-300">{layer.name}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-100">{layer.title}</div>
                      </button>
                    );
                  })}
                </div>

                {outLayers.length > 0 && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pt-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Çıkış Katmanları (Outbound PDU Layers)
                    </div>
                    <div className="space-y-2">
                      {outLayers.map((layer, idx) => (
                        <div
                          key={`out-layer-${idx}`}
                          className={`p-2.5 rounded-lg border text-xs ${isDark ? 'bg-slate-950/30 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'
                            }`}
                        >
                          <div className="font-semibold text-emerald-400">{layer.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{layer.notes?.[0]}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Layer Field Details & Device Decision */}
              <div className="flex-1 p-5 overflow-y-auto space-y-5 min-h-0">
                {inLayers[selectedLayerIndex] && (
                  <div>
                    <h4 className="text-sm font-bold text-cyan-400 mb-1">
                      {inLayers[selectedLayerIndex].title}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      {inLayers[selectedLayerIndex].notes?.join(' ')}
                    </p>

                    <div className="border border-slate-800 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs divide-y divide-slate-800">
                        <thead className={isDark ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-100'}>
                          <tr>
                            <th className="px-3 py-2 font-mono">Alan (Field)</th>
                            <th className="px-3 py-2 font-mono">Değer (Value)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {inLayers[selectedLayerIndex].fields.map((field, fIdx) => (
                            <tr key={fIdx} className="hover:bg-cyan-500/5">
                              <td className="px-3 py-2 text-slate-400 font-medium">{field.label}</td>
                              <td className="px-3 py-2 text-cyan-300 font-bold">{String(field.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Device Decisions Box */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    Cihaz Karar Günlüğü ({currentHop?.deviceId})
                  </h4>
                  <div
                    className={`p-3 rounded-lg border font-mono text-xs space-y-1.5 ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'
                      }`}
                  >
                    {decisions.map((dec, dIdx) => (
                      <div key={dIdx} className="flex items-start gap-2">
                        <span className="text-cyan-500">▶</span>
                        <span>{dec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wireshark' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Protokol Ağacı Çözümlemesi
              </div>
              <div className="space-y-3 font-mono text-xs">
                {inLayers.map((layer, idx) => (
                  <details
                    key={`ws-layer-${idx}`}
                    open
                    className={`p-3 rounded-lg border transition-all ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                  >
                    <summary className="font-bold text-cyan-400 cursor-pointer select-none">
                      {layer.title}
                    </summary>
                    <div className="mt-2 pl-4 space-y-1 border-l-2 border-slate-800 text-slate-300">
                      {layer.fields.map((f, fIdx) => (
                        <div key={fIdx}>
                          <span className="text-slate-400">{f.label}:</span>{' '}
                          <span className="text-emerald-400">{String(f.value)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hex' && (
            <div className="flex-1 p-5 overflow-y-auto flex flex-col min-h-0">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Ham Paket Çerçeve Dökümü (Raw Ethernet Frame Hex Dump)
              </div>
              <pre
                className={`flex-1 p-4 rounded-lg border font-mono text-xs overflow-x-auto leading-relaxed ${isDark
                  ? 'bg-slate-950 border-slate-800 text-emerald-400 shadow-inner'
                  : 'bg-slate-900 text-emerald-300 border-slate-700'
                  }`}
              >
                {hexDump}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
