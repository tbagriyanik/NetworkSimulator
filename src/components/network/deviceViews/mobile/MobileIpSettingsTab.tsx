'use client';

import { Server, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileIpSettingsTabProps {
  isDark: boolean;
  isTr: boolean;
  ipMode: 'dhcp' | 'static';
  setIpMode: (mode: 'dhcp' | 'static') => void;
  ip: string;
  setIp: (v: string) => void;
  subnet: string;
  setSubnet: (v: string) => void;
  gateway: string;
  setGateway: (v: string) => void;
  dns: string;
  setDns: (v: string) => void;
  saveSuccess: boolean;
  onSaveIp: () => void;
}

export function MobileIpSettingsTab({
  isDark,
  isTr,
  ipMode,
  setIpMode,
  ip,
  setIp,
  subnet,
  setSubnet,
  gateway,
  setGateway,
  dns,
  setDns,
  saveSuccess,
  onSaveIp,
}: MobileIpSettingsTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
        <span className="flex items-center gap-1.5 text-sky-400">
          <Server className="w-4 h-4" />
          {isTr ? 'IP Yapılandırması' : 'IP Configuration'}
        </span>
        <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setIpMode('dhcp')}
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors",
              ipMode === 'dhcp' ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            DHCP
          </button>
          <button
            onClick={() => setIpMode('static')}
            className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors",
              ipMode === 'static' ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white"
            )}
          >
            {isTr ? 'Statik' : 'Static'}
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div>
          <label className="block mb-1 font-medium opacity-80">{isTr ? 'IP Adresi' : 'IP Address'}</label>
          <input
            type="text"
            disabled={ipMode === 'dhcp'}
            value={ip}
            onChange={e => setIp(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg border font-mono outline-none transition-colors",
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900",
              ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium opacity-80">{isTr ? 'Alt Ağ Maskesi' : 'Subnet Mask'}</label>
          <input
            type="text"
            disabled={ipMode === 'dhcp'}
            value={subnet}
            onChange={e => setSubnet(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg border font-mono outline-none transition-colors",
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900",
              ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium opacity-80">{isTr ? 'Ağ Geçidi (Gateway)' : 'Default Gateway'}</label>
          <input
            type="text"
            disabled={ipMode === 'dhcp'}
            value={gateway}
            onChange={e => setGateway(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg border font-mono outline-none transition-colors",
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900",
              ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium opacity-80">{isTr ? 'DNS Sunucusu' : 'DNS Server'}</label>
          <input
            type="text"
            disabled={ipMode === 'dhcp'}
            value={dns}
            onChange={e => setDns(e.target.value)}
            className={cn(
              "w-full px-2.5 py-1.5 rounded-lg border font-mono outline-none transition-colors",
              isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900",
              ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
            )}
          />
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={onSaveIp}
          className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isTr ? 'Kaydet' : 'Save Config'}
        </button>
      </div>
      {saveSuccess && (
        <div className="text-[10px] text-emerald-500 text-center font-medium animate-pulse">
          {isTr ? 'Ağ ayarları güncellendi!' : 'Network settings saved!'}
        </div>
      )}
    </div>
  );
}
