'use client';

import { PhoneCall, PhoneOff, Phone, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { isSameSubnet } from '@/components/network/pc-panel/pcBrowser.utils';
import type { CanvasDevice, CanvasConnection } from '../../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

interface MobileVoipTabProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  isDark: boolean;
  isTr: boolean;
  dialNumber: string;
  setDialNumber: (v: string | ((prev: string) => string)) => void;
  callState: 'idle' | 'calling' | 'connected' | 'failed';
  callDuration: number;
  callStatusMessage: string;
  rtpMetrics: { rtt: number; jitter: number; loss: number };
  activeCallTarget: CanvasDevice | null;
  onInitiateCall: (targetInput?: string) => void;
  onAnswerCall: () => void;
  onEndCall: () => void;
  onClearVoipHistory: () => void;
  onDialKeyPress: (key: string) => void;
  onDialDelete: () => void;
  formatDuration: (secs: number) => string;
}

export function MobileVoipTab({
  device,
  topologyDevices,
  topologyConnections,
  deviceStates,
  isDark,
  isTr,
  dialNumber,
  setDialNumber,
  callState,
  callDuration,
  callStatusMessage,
  rtpMetrics,
  activeCallTarget,
  onInitiateCall,
  onAnswerCall,
  onEndCall,
  onClearVoipHistory,
  onDialKeyPress,
  onDialDelete,
  formatDuration,
}: MobileVoipTabProps) {
  const dialButtons = [
    { key: '1', sub: '' },
    { key: '2', sub: 'ABC' },
    { key: '3', sub: 'DEF' },
    { key: '4', sub: 'GHI' },
    { key: '5', sub: 'JKL' },
    { key: '6', sub: 'MNO' },
    { key: '7', sub: 'PQRS' },
    { key: '8', sub: 'TUV' },
    { key: '9', sub: 'WXYZ' },
    { key: '*', sub: '' },
    { key: '0', sub: '+' },
    { key: '#', sub: '' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <PhoneCall className="w-4 h-4" />
          {isTr ? 'IP Voice / VoIP Phone' : 'IP Voice / VoIP Phone'}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">SIP/RTP 802.1Q</span>
      </div>

      {/* Incoming or Active VoIP Call Screen */}
      {device.activeVoipCall && device.activeVoipCall.callerId !== device.id && device.activeVoipCall.status === 'ringing' ? (
        /* Callee (Ringing) View: Answer / Decline */
        <div className="space-y-4 py-4 text-center">
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-emerald-950/60 border-2 border-emerald-500 text-emerald-400 animate-bounce shadow-lg shadow-emerald-500/30">
            <PhoneCall className="w-7 h-7" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider animate-pulse">
              {isTr ? 'Gelen Sesli Çağrı...' : 'Incoming Voice Call...'}
            </div>
            <div className="font-bold text-base text-white mt-1">
              {device.activeVoipCall.callerName}
            </div>
            <div className="text-xs font-mono text-slate-400">
              {device.activeVoipCall.callerIp || 'SIP Client'}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onAnswerCall}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
            >
              <Phone className="w-4 h-4" />
              {isTr ? 'Cevapla' : 'Answer'}
            </button>
            <button
              onClick={onEndCall}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950"
            >
              <PhoneOff className="w-4 h-4" />
              {isTr ? 'Reddet' : 'Decline'}
            </button>
          </div>
        </div>
      ) : callState === 'idle' && !device.activeVoipCall ? (
        <div className="space-y-3">
          {/* Number Input / Display */}
          <div className="relative">
            <input
              type="text"
              value={dialNumber}
              onChange={e => setDialNumber(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = dialNumber.trim();
                  const isValidTarget = val && (
                    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(val) ||
                    /^[0-9*#]+$/.test(val) ||
                    topologyDevices.some(d => d.name?.toLowerCase() === val.toLowerCase() || d.id === val)
                  );
                  if (isValidTarget) {
                    onInitiateCall();
                  }
                }
              }}
              placeholder={isTr ? "IP veya Dahili No Girin (192.168.1.50)..." : "Enter IP or Extension (192.168.1.50)..."}
              className={cn(
                "w-full pr-8 pl-3 py-2 rounded-xl border font-mono outline-none text-center text-sm font-semibold tracking-wider transition-colors",
                isDark ? "bg-slate-950 border-slate-800 text-emerald-400 placeholder:text-slate-600" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              )}
            />
            {dialNumber && (
              <button
                onClick={onDialDelete}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-mono px-1 py-0.5"
                title="Sil"
              >
                âœ•
              </button>
            )}
          </div>

          {/* Keypad Grid (3x4 Layout) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            {dialButtons.map(({ key, sub }) => (
              <button
                key={key}
                onClick={() => onDialKeyPress(key)}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-800/60 flex flex-col items-center justify-center transition-all group shadow-sm"
              >
                <span className="font-bold text-sm text-slate-100 group-hover:text-emerald-400">{key}</span>
                {sub ? (
                  <span className="text-[8px] tracking-widest text-slate-500 font-mono -mt-1">{sub}</span>
                ) : (
                  <span className="text-[8px] text-transparent leading-none select-none">.</span>
                )}
              </button>
            ))}
          </div>

          {/* Call / Action Button */}
          <div className="pt-1">
            <button
              onClick={() => onInitiateCall()}
              disabled={!dialNumber.trim() && !topologyDevices.some(d => d.type === 'mobile' && d.id !== device.id && d.ip)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
            >
              <Phone className="w-4 h-4" />
              {isTr ? 'VoIP Araması Başlat' : 'Initiate VoIP Call'}
            </button>
          </div>

          {/* Network Directory / Quick Dial List */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3 text-sky-400" />
              {isTr ? 'Ağdaki Cihaz Rehberi' : 'Network Directory'}
            </div>
            <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1 custom-scrollbar">
              {topologyDevices.filter(d => {
                if (d.id === device.id || d.type !== 'mobile' || !d.ip || !device.ip) return false;
                const devSubnet = device.subnet || '255.255.255.0';
                return isSameSubnet(device.ip, d.ip, devSubnet) || Boolean(device.gateway && device.gateway !== '0.0.0.0');
              }).length === 0 ? (
                <div className="text-[10px] text-slate-500 italic text-center py-1.5">
                  {isTr ? 'Aynı ağda ulaşılan başka telefon yok' : 'No reachable phones in same network'}
                </div>
              ) : (
                topologyDevices
                  .filter(d => {
                    if (d.id === device.id || d.type !== 'mobile' || !d.ip || !device.ip) return false;
                    const devSubnet = device.subnet || '255.255.255.0';
                    return isSameSubnet(device.ip, d.ip, devSubnet) || Boolean(device.gateway && device.gateway !== '0.0.0.0');
                  })
                  .map((d, i) => {
                    const check = checkConnectivity(
                      device.id,
                      d.ip!,
                      topologyDevices,
                      topologyConnections,
                      deviceStates,
                      isTr ? 'tr' : 'en',
                      { protocol: 'udp', port: '5060' }
                    );
                    const isTargetPoweredOn = d.status !== 'offline';
                    const isReachOk = check.success && isTargetPoweredOn;

                    return (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInitiateCall(d.ip);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors",
                          isReachOk
                            ? "bg-slate-950/60 hover:bg-slate-800 border-slate-800/60"
                            : "bg-rose-950/30 hover:bg-rose-900/40 border-rose-800/40"
                        )}
                      >
                        <div className="truncate flex-1 mr-2">
                          <div className="font-medium text-[11px] text-slate-200 truncate flex items-center gap-1.5">
                            <span>{d.name}</span>
                            {!isReachOk && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-normal">
                                {!isTargetPoweredOn
                                  ? (isTr ? 'Cihaz Kapalı' : 'Powered Off')
                                  : (check.error || (isTr ? 'Ağ Sorunu' : 'Network Issue'))}
                              </span>
                            )}
                          </div>
                          <div className={cn("text-[9px] font-mono", isReachOk ? "text-emerald-400/80" : "text-rose-400/80")}>
                            {d.ip}
                          </div>
                        </div>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 font-medium",
                          isReachOk
                            ? "text-emerald-400 bg-emerald-950/60 border-emerald-800/50"
                            : "text-rose-300 bg-rose-950/60 border-rose-800/50"
                        )}>
                          <PhoneCall className="w-2.5 h-2.5" />
                          {isReachOk ? (isTr ? 'Ara' : 'Call') : (isTr ? 'Ağ Sorunlu' : 'Issue')}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* VoIP Call History Log */}
          <div className="pt-2 border-t border-slate-800/60">
            <div className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <PhoneCall className="w-3 h-3 text-emerald-400" />
                {isTr ? 'Arama Geçmişi' : 'Call History'}
              </span>
              {device.voipHistory && device.voipHistory.length > 0 && (
                <button
                  onClick={onClearVoipHistory}
                  className="text-[9px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-800/40 transition-colors"
                  title={isTr ? 'Arama geçmişini temizle' : 'Clear call history'}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  {isTr ? 'Temizle' : 'Clear'}
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1 custom-scrollbar">
              {!device.voipHistory || device.voipHistory.length === 0 ? (
                <div className="text-[10px] text-slate-500 italic text-center py-2">
                  {isTr ? 'Henüz arama kaydı yok' : 'No recent calls'}
                </div>
              ) : (
                device.voipHistory.map((item) => (
                  <div key={item.id} className="p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/40 flex items-center justify-between text-[10px]">
                    <div className="truncate">
                      <div className="font-medium text-slate-200 flex items-center gap-1 truncate">
                        <span className={item.type === 'outgoing' ? "text-sky-400 font-bold" : "text-emerald-400 font-bold"}>
                          {item.type === 'outgoing' ? '↗' : '↙'}
                        </span>
                        {item.peerName}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono">
                        {item.timestamp} {item.peerIp ? `• ${item.peerIp}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <div className={cn(
                        "font-semibold text-[9px]",
                        item.status === 'answered' ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {item.status === 'answered' ? formatDuration(item.durationSeconds) : (isTr ? 'Cevapsız' : 'Missed')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Active / In-Progress Call Screen */
        <div className="space-y-4 py-2 text-center">
          <div className="relative inline-block">
            <div className={cn(
              "w-16 h-16 rounded-full mx-auto flex items-center justify-center border-2 transition-all",
              callState === 'calling' ? "bg-amber-950/40 border-amber-500 text-amber-400 animate-pulse" :
                callState === 'connected' ? "bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20" :
                  "bg-rose-950/40 border-rose-500 text-rose-400"
            )}>
              <PhoneCall className="w-7 h-7" />
            </div>
          </div>

          <div>
            <div className="font-bold text-sm text-white">
              {activeCallTarget ? activeCallTarget.name : (device.activeVoipCall?.callerName || dialNumber || 'VoIP Peer')}
            </div>
            <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
              {callStatusMessage || (callState === 'connected' ? (isTr ? 'Bağlantı Aktif' : 'Call Connected') : '')}
            </div>
            {callState === 'connected' && (
              <div className="text-xs font-mono font-semibold text-slate-300 mt-1">
                {formatDuration(callDuration)}
              </div>
            )}
          </div>

          {/* Real-Time RTP Quality Metrics */}
          {callState === 'connected' && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div>
                <div className="text-slate-500">RTT (Latency)</div>
                <div className="text-emerald-400 font-bold">{rtpMetrics.rtt} ms</div>
              </div>
              <div>
                <div className="text-slate-500">Jitter</div>
                <div className="text-emerald-400 font-bold">{rtpMetrics.jitter} ms</div>
              </div>
              <div>
                <div className="text-slate-500">Loss</div>
                <div className="text-emerald-400 font-bold">{rtpMetrics.loss}%</div>
              </div>
            </div>
          )}

          {/* End Call Button */}
          <div className="pt-2">
            <button
              onClick={onEndCall}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-950"
            >
              <PhoneOff className="w-4 h-4" />
              {isTr ? 'Aramayı Sonlandır' : 'End Call'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

