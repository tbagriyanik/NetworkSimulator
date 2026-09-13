'use client';

import { Wifi, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileWifiTabProps {
  isDark: boolean;
  isTr: boolean;
  isWifiConnected: boolean;
  availableSsids: string[];
  selectedSsid: string;
  onDisconnectWifi: () => void;
  onSelectSsid: (ssid: string) => void;
}

export function MobileWifiTab({
  isDark,
  isTr,
  isWifiConnected,
  availableSsids,
  selectedSsid,
  onDisconnectWifi,
  onSelectSsid,
}: MobileWifiTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-sky-400">
          <Wifi className="w-4 h-4" />
          {isTr ? 'Kablosuz Ağlar (Wi-Fi)' : 'Available Wi-Fi SSIDs'}
        </span>
        {isWifiConnected ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
            {isTr ? 'Ağ Aktif' : 'Link Active'}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500">802.11ax Ready</span>
        )}
      </div>

      <div className="space-y-2">
        {availableSsids.length === 0 ? (
          <div className={cn("p-4 rounded-xl border text-center text-xs", isDark ? "border-slate-800 bg-slate-950/40 text-slate-400" : "border-slate-200 bg-slate-100 text-slate-500")}>
            {isTr ? 'Kapsama alanında aktif Wi-Fi ağı bulunamadı' : 'No active Wi-Fi networks found in range'}
          </div>
        ) : (
          availableSsids.map((ssid, idx) => {
            const isConnected = selectedSsid === ssid && isWifiConnected;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (isConnected) {
                    onDisconnectWifi();
                  } else {
                    onSelectSsid(ssid);
                  }
                }}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                  isConnected 
                    ? (isDark ? "bg-sky-950/60 border-sky-500 text-white shadow-sm shadow-sky-900/30" : "bg-sky-50 border-sky-400 text-sky-950 shadow-sm") 
                    : (isDark ? "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50")
                )}
              >
                <div className="flex items-center gap-2">
                  <Wifi className={cn("w-4 h-4", isConnected ? "text-sky-400 animate-pulse" : "text-slate-500")} />
                  <div>
                    <div className="font-semibold text-xs">{ssid}</div>
                    <div className="text-[10px] opacity-60">WPA2/WPA3 Enterprise • 5GHz</div>
                  </div>
                </div>
                {isConnected ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30">
                      {isTr ? 'Bağlı' : 'Connected'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDisconnectWifi();
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-800/40 ml-1"
                    >
                      {isTr ? 'Kes' : 'Drop'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-50">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
