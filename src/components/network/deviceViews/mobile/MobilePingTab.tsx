'use client';

import { Send, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePingTabProps {
  isDark: boolean;
  isTr: boolean;
  targetPingIp: string;
  setTargetPingIp: (v: string) => void;
  isPinging: boolean;
  pingResults: string[];
  onSendPing: () => void;
}

export function MobilePingTab({
  isDark,
  isTr,
  targetPingIp,
  setTargetPingIp,
  isPinging,
  pingResults,
  onSendPing,
}: MobilePingTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-sky-400">
          <Send className="w-4 h-4" />
          {isTr ? 'Ping Teşhis Uygulaması' : 'Ping Diagnostics App'}
        </span>
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={targetPingIp}
          onChange={e => setTargetPingIp(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSendPing();
            }
          }}
          placeholder={isTr ? "Hedef IP (192.168.1.1)" : "Target IP (192.168.1.1)"}
          className={cn(
            "flex-1 px-2.5 py-1.5 rounded-lg border font-mono outline-none text-xs transition-colors",
            isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
          )}
        />
        <button
          onClick={onSendPing}
          disabled={isPinging}
          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1"
        >
          {isPinging ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Ping
        </button>
      </div>

      {pingResults.length > 0 && (
        <div className="p-2.5 rounded-lg bg-black font-mono text-[10px] text-emerald-400 space-y-1 overflow-x-auto border border-slate-800 max-h-[140px]">
          {pingResults.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
