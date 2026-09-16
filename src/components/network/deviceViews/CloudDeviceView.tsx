'use client';

import { useMemo } from 'react';
import { Globe, Radio, Server, Activity, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';

interface CloudDeviceViewProps {
  device: CanvasDevice;
  topologyDevices?: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  isDark: boolean;
  language: string;
}

export function CloudDeviceView({
  device,
  topologyDevices,
  topologyConnections,
  isDark,
  language,
}: CloudDeviceViewProps) {
  const isTr = language === 'tr';

  // Count active WAN links to Cloud
  const connectedLinks = useMemo(() => {
    return topologyConnections.filter(c => c.sourceDeviceId === device.id || c.targetDeviceId === device.id);
  }, [topologyConnections, device.id]);


  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
      {/* Header Info */}
      <div className={cn(
        "p-5 rounded-xl border flex items-center justify-between",
        isDark ? "bg-secondary-900/60 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              WAN / Internet Service Provider
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-normal">

                {isTr ? 'Aktif İnternet Geçidi' : 'Active Internet Gateway'}
              </span>
            </h2>
            <p className="text-xs opacity-60">Global Autonomous System (AS15169 / Public WAN Transit Cloud)</p>
          </div>
        </div>
        <div className="text-right font-mono text-xs opacity-70">
          <div>Eth0 (WAN): Public ISP Bridge</div>
          <div>Active Links: {connectedLinks.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Public Internet Services */}
        <div className={cn(
          "p-5 rounded-xl border space-y-4",
          isDark ? "bg-secondary-900/40 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
        )}>
          <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-3 border-secondary-700/40">
            <Server className="w-4 h-4 text-cyan-400" />
            {isTr ? 'Simüle Edilen Genel İnternet Servisleri' : 'Simulated Public Internet Services'}
          </h3>

          <div className="space-y-3 text-xs">
            <div className={cn("p-3 rounded-lg border flex items-center justify-between", isDark ? "bg-secondary-950 border-secondary-800" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold">{isTr ? 'Birincil Genel DNS Servisi' : 'Primary Public DNS Service'}</div>
                  <div className={cn("text-[10px] font-mono", isDark ? "text-secondary-400" : "text-slate-500")}>8.8.8.8 / 8.8.4.4</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-semibold">ONLINE</span>
            </div>

            <div className={cn("p-3 rounded-lg border flex items-center justify-between", isDark ? "bg-secondary-950 border-secondary-800" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="font-semibold">{isTr ? 'İkincil Genel DNS Çözümleyici' : 'Secondary Public DNS Resolver'}</div>
                  <div className={cn("text-[10px] font-mono", isDark ? "text-secondary-400" : "text-slate-500")}>1.1.1.1 / 1.0.0.1</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-semibold">ONLINE</span>
            </div>

            <div className={cn("p-3 rounded-lg border flex items-center justify-between", isDark ? "bg-secondary-950 border-secondary-800" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold">{isTr ? 'Genel NTP Zaman Sunucusu' : 'Public NTP Time Server'}</div>
                  <div className={cn("text-[10px] font-mono", isDark ? "text-secondary-400" : "text-slate-500")}>pool.ntp.org</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-semibold">SYNCHRONIZED</span>
            </div>
          </div>
        </div>

        {/* Right Column: WAN Link Statistics */}
        <div className={cn(
          "p-5 rounded-xl border space-y-4",
          isDark ? "bg-secondary-900/40 border-secondary-800" : "bg-white border-secondary-200 shadow-sm text-slate-800"
        )}>
          <h3 className={cn("text-sm font-bold flex items-center gap-2 border-b pb-3", isDark ? "border-secondary-700/40" : "border-slate-200")}>
            <Activity className="w-4 h-4 text-cyan-400" />
            {isTr ? 'WAN Bağlantı & Trafik Monitörü' : 'WAN Link & Traffic Monitor'}
          </h3>

          <div className="space-y-4 text-xs">
            <div className={cn("flex justify-between items-center p-3 rounded-lg border", isDark ? "bg-secondary-950 border-secondary-800" : "bg-slate-50 border-slate-200")}>
              <span>{isTr ? 'Simüle Edilen Gecikme (WAN Latency)' : 'Simulated WAN Latency'}</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">12 ms</span>
            </div>

            <div className={cn("flex justify-between items-center p-3 rounded-lg border", isDark ? "bg-secondary-950 border-secondary-800" : "bg-slate-50 border-slate-200")}>
              <span>{isTr ? 'Aktif WAN Bağlantıları (Customer Links)' : 'Active Customer WAN Links'}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{connectedLinks.length} Connections</span>
            </div>

            <div className={cn("p-3 rounded-lg border space-y-2", isDark ? "bg-secondary-950 border-secondary-800" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                  {isTr ? 'Ağ Geçidi İletim Modu' : 'Gateway Forwarding Mode'}
                </span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">NAT / Transit Bridge</span>
              </div>
              <p className={cn("text-[10px] leading-relaxed", isDark ? "opacity-70" : "text-slate-600")}>
                {isTr
                  ? 'Bulut (Cloud) nesnesi dış internet hatlarını ve servis sağlayıcı (ISP) omurgasını temsil eder. Yerel ağınızdaki cihazlar dış dünyadaki IP adreslerine veya alan adlarına eriştiğinde paketler Bulut geçidi üzerinden başarıyla iletilir.'
                  : 'The Cloud device simulates external ISP WAN connectivity. Any internal network devices reaching external IP addresses or domain names are automatically routed and bridged through the Cloud gateway.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WAN Ethernet Ports List */}
      <div className={cn(
        "p-5 rounded-xl border space-y-4",
        isDark ? "bg-secondary-900/40 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
      )}>
        <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-3 border-secondary-700/40">
          <Server className="w-4 h-4 text-cyan-400" />
          {isTr ? 'ISP Arayüz & Port Listesi (WAN Ethernet Interfaces)' : 'ISP Interface & Port List (WAN Ethernet Interfaces)'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {(device.ports || [
            { id: 'eth0', label: 'Eth0', status: 'disconnected' },
            { id: 'eth1', label: 'Eth1', status: 'disconnected' },
            { id: 'eth2', label: 'Eth2', status: 'disconnected' },
            { id: 'eth3', label: 'Eth3', status: 'disconnected' },
          ]).map((port) => {
            const activeConn = topologyConnections.find(
              c => (c.sourceDeviceId === device.id && c.sourcePort === port.id) ||
                   (c.targetDeviceId === device.id && c.targetPort === port.id)
            );
            const isConnected = !!activeConn;
            const peerDeviceId = activeConn
              ? (activeConn.sourceDeviceId === device.id ? activeConn.targetDeviceId : activeConn.sourceDeviceId)
              : null;
            const peerDevice = peerDeviceId && topologyDevices
              ? topologyDevices.find(d => d.id === peerDeviceId)
              : null;

            return (
              <div
                key={port.id}
                className={cn(
                  "p-3 rounded-lg border flex flex-col justify-between space-y-2",
                  isConnected
                    ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-200"
                    : isDark ? "bg-secondary-950/40 border-secondary-800 text-secondary-400" : "bg-slate-50 border-secondary-200 text-slate-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
                    {port.label || port.id}
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded font-mono font-semibold",
                    isConnected ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-secondary-800 text-secondary-400"
                  )}>
                    {isConnected ? (isTr ? 'BAÄLI / UP' : 'CONNECTED / UP') : (isTr ? 'BOÅTA / DOWN' : 'DISCONNECTED')}
                  </span>
                </div>

                <div className="text-[11px] font-mono space-y-0.5 opacity-80">
                  <div>IP: {port.id === 'eth0' ? (device.ip || '203.0.113.1') : 'DHCP/WAN Bridge'}</div>
                  {isConnected && peerDevice && (
                    <div className="text-emerald-400 truncate">
                      {isTr ? 'Komşu:' : 'Peer:'} {peerDevice.name} ({peerDevice.ip || 'DHCP'})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

