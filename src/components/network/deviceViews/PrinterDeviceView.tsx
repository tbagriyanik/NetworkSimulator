'use client';

import { useState, useMemo } from 'react';
import { Printer, Server, CheckCircle2, RefreshCw, Send, HardDrive, Wifi, Radio, Power, Signal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/appStore';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';

import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

interface PrinterDeviceViewProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  isDark: boolean;
  language: string;
}

export function PrinterDeviceView({
  device,
  topologyDevices,
  topologyConnections,
  deviceStates,
  isDark,
  language,
}: PrinterDeviceViewProps) {
  const isTr = language === 'tr';
  const setDevices = useAppStore(state => state.setDevices);
  // Use live device from topologyDevices so dynamic state updates (like printJobs) trigger re-renders
  const liveDevice = topologyDevices.find(d => d.id === device.id) || device;

  const isPowerOn = liveDevice.status !== 'offline';
  const isWifiEnabled = liveDevice.wifi?.enabled !== false;

  // Calculate real Wi-Fi signal strength from topology (0-5 scale)
  const wifiSignalStrength = useMemo(() => {
    if (!isPowerOn || !isWifiEnabled) return 0;
    return getWirelessSignalStrength(liveDevice, topologyDevices, deviceStates);
  }, [liveDevice, topologyDevices, deviceStates, isPowerOn, isWifiEnabled]);

  const wifiSignalPercent = Math.round((wifiSignalStrength / 5) * 100);

  // Clear Print Queue Jobs
  const handleClearPrintJobs = () => {
    setDevices(
      topologyDevices.map(d => {
        if (d.id === device.id) {
          const updatedPrinter = {
            ...d,
            printJobs: []
          };
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
              detail: {
                deviceId: d.id,
                config: {
                  printJobs: []
                }
              }
            }));
          }
          return updatedPrinter;
        }
        return d;
      })
    );
  };

  // Local state for IP & Wi-Fi editing
  const [ipMode, setIpMode] = useState<'dhcp' | 'static'>(device.ipConfigMode === 'dhcp' ? 'dhcp' : 'static');
  const [ip, setIp] = useState(device.ip || '192.168.1.50');
  const [subnet, setSubnet] = useState(device.subnet || '255.255.255.0');
  const [gateway, setGateway] = useState(device.gateway || '192.168.1.1');
  const [dns, setDns] = useState(device.dns || '8.8.8.8');
  const [selectedSsid, setSelectedSsid] = useState(device.wifi?.ssid || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Toggle Power Status
  const handleTogglePower = () => {
    const nextStatus = isPowerOn ? 'offline' : 'online';
    setDevices(
      topologyDevices.map(d => (d.id === device.id ? { ...d, status: nextStatus } : d))
    );
  };

  // Toggle Wi-Fi Interface
  const handleToggleWifi = () => {
    const nextWifiEnabled = !isWifiEnabled;
    setDevices(
      topologyDevices.map(d => {
        if (d.id === device.id) {
          return {
            ...d,
            wifi: {
              ssid: selectedSsid,
              security: 'open' as const,
              channel: '2.4GHz' as const,
              mode: 'client' as const,
              enabled: nextWifiEnabled,
            }
          };
        }
        return d;
      })
    );
  };

  // Detect available active wireless SSIDs exclusively from real topology devices
  const availableSsids = useMemo(() => {
    const ssids = new Set<string>();
    topologyDevices.forEach(d => {
      if (d.wifi?.enabled && d.wifi?.mode === 'ap' && d.wifi?.ssid?.trim()) {
        ssids.add(d.wifi.ssid.trim());
      } else if (d.type === 'wlc' && d.wifi?.enabled && d.wifi?.ssid?.trim()) {
        ssids.add(d.wifi.ssid.trim());
      }
    });
    if (device.wifi?.ssid?.trim()) {
      ssids.add(device.wifi.ssid.trim());
    }
    return Array.from(ssids);
  }, [topologyDevices, device.wifi?.ssid]);

  // Diagnostic Ping state
  const [targetPingIp, setTargetPingIp] = useState('192.168.1.1');
  const [pingResults, setPingResults] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);

  // Helper to obtain DHCP IP based on connected router/DHCP server or subnet
  const obtainDhcpLeaseForPrinter = () => {
    let assignedSubnet = '255.255.255.0';
    let assignedGateway = '192.168.1.1';
    let assignedDns = '8.8.8.8';

    const dhcpServer = topologyDevices.find(d =>
      d.id !== device.id &&
      (
        (d.services?.dhcp?.enabled && (d.services?.dhcp?.pools?.length || 0) > 0) ||
        d.type === 'router' ||
        d.type === 'switchL3'
      )
    );

    if (dhcpServer) {
      const baseIp = dhcpServer.ip || '192.168.1.1';
      const parts = baseIp.split('.');
      if (parts.length === 4) {
        const hostNum = Math.floor(Math.random() * 150) + 50;
        const assignedIp = `${parts[0]}.${parts[1]}.${parts[2]}.${hostNum}`;
        assignedSubnet = dhcpServer.subnet || '255.255.255.0';
        assignedGateway = dhcpServer.gateway || baseIp;
        assignedDns = dhcpServer.dns || '8.8.8.8';
        return { assignedIp, assignedSubnet, assignedGateway, assignedDns };
      }
    }

    const anyGateway = topologyDevices.find(d => d.ip && (d.type === 'router' || d.type === 'switchL3'))?.ip || '192.168.1.1';
    const parts = anyGateway.split('.');
    const hostNum = Math.floor(Math.random() * 150) + 50;
    const assignedIp = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.${hostNum}` : '192.168.1.50';

    return { assignedIp, assignedSubnet, assignedGateway: anyGateway, assignedDns };
  };

  const handleSelectIpMode = (mode: 'dhcp' | 'static') => {
    setIpMode(mode);

    if (mode === 'dhcp') {
      const lease = obtainDhcpLeaseForPrinter();
      setIp(lease.assignedIp);
      setSubnet(lease.assignedSubnet);
      setGateway(lease.assignedGateway);
      setDns(lease.assignedDns);

      setDevices(
        topologyDevices.map(d => {
          if (d.id === device.id) {
            return {
              ...d,
              ipConfigMode: 'dhcp',
              ip: lease.assignedIp,
              subnet: lease.assignedSubnet,
              gateway: lease.assignedGateway,
              dns: lease.assignedDns,
            };
          }
          return d;
        })
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleSelectSsid = (ssid: string) => {
    setSelectedSsid(ssid);
    let nextIp = ip;
    let nextSubnet = subnet;
    let nextGateway = gateway;
    let nextDns = dns;

    if (ipMode === 'dhcp') {
      const lease = obtainDhcpLeaseForPrinter();
      nextIp = lease.assignedIp;
      nextSubnet = lease.assignedSubnet;
      nextGateway = lease.assignedGateway;
      nextDns = lease.assignedDns;
      setIp(nextIp);
      setSubnet(nextSubnet);
      setGateway(nextGateway);
      setDns(nextDns);
    }

    setDevices(
      topologyDevices.map(d => {
        if (d.id === device.id) {
          return {
            ...d,
            ipConfigMode: ipMode,
            ip: nextIp,
            subnet: nextSubnet,
            gateway: nextGateway,
            dns: nextDns,
            wifi: {
              ssid,
              security: 'open' as const,
              channel: '2.4GHz' as const,
              mode: 'client' as const,
              enabled: isWifiEnabled,
            }
          };
        }
        return d;
      })
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveIp = () => {
    setDevices(
      topologyDevices.map(d => {
        if (d.id === device.id) {
          return {
            ...d,
            ipConfigMode: ipMode,
            ip,
            subnet,
            gateway,
            dns,
            wifi: {
              ssid: selectedSsid,
              security: 'open' as const,
              channel: '2.4GHz' as const,
              mode: 'client' as const,
              enabled: isWifiEnabled,
            }
          };
        }
        return d;
      })
    );
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSendPing = () => {
    if (!targetPingIp.trim()) return;
    setIsPinging(true);
    setPingResults([isTr ? `Ping gÃ¶nderiliyor: ${targetPingIp}...` : `Pinging ${targetPingIp}...`]);

    setTimeout(() => {
      const res = checkConnectivity(
        device.id,
        targetPingIp.trim(),
        topologyDevices,
        topologyConnections,
        deviceStates,
        isTr ? 'tr' : 'en',
        { protocol: 'icmp' }
      );

      if (res.success) {
        setPingResults([
          `PING ${targetPingIp} 56(84) bytes of data.`,
          `64 bytes from ${targetPingIp}: icmp_seq=1 ttl=64 time=1.24 ms`,
          `64 bytes from ${targetPingIp}: icmp_seq=2 ttl=64 time=1.08 ms`,
          `64 bytes from ${targetPingIp}: icmp_seq=3 ttl=64 time=1.15 ms`,
          `64 bytes from ${targetPingIp}: icmp_seq=4 ttl=64 time=1.11 ms`,
          `--- ${targetPingIp} ping statistics ---`,
          `4 packets transmitted, 4 received, 0% packet loss, time 3004ms`
        ]);
      } else {
        setPingResults([
          `PING ${targetPingIp} 56(84) bytes of data.`,
          `Request timeout for icmp_seq 1`,
          `Request timeout for icmp_seq 2`,
          `Request timeout for icmp_seq 3`,
          `Request timeout for icmp_seq 4`,
          `--- ${targetPingIp} ping statistics ---`,
          `4 packets transmitted, 0 received, 100% packet loss${res.error ? ` (${res.error})` : ''}`
        ]);
      }
      setIsPinging(false);
    }, 400);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
      {/* Header Info with Power & Wi-Fi Status Controls */}
      <div className={cn(
        "p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4",
        isDark ? "bg-secondary-900/60 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center transition-all",
            isPowerOn
              ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          )}>
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              {device.name}
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-normal",
                isPowerOn
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              )}>
                {isPowerOn ? (isTr ? 'AÃ§Ä±k / Online' : 'Ready / Online') : (isTr ? 'KapalÄ± / Offline' : 'Powered Off')}
              </span>
            </h2>
            <p className="text-xs opacity-60">
              {isTr ? 'AÄŸ YazÄ±cÄ± Sunucusu (Wi-Fi & Ethernet Ã‡ift ArayÃ¼zlÃ¼)' : 'Network Print Server (Wi-Fi & Ethernet Dual Interface)'}
            </p>
          </div>
        </div>

        {/* Power & Signal Bars Indicator */}
        <div className="flex items-center gap-3">
          {/* Signal bars & Percent */}
          <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono", isDark ? "border-secondary-700/50 bg-secondary-950/40" : "border-slate-300 bg-slate-50")}>
            <Signal className={cn("w-3.5 h-3.5", wifiSignalStrength > 0 ? "text-emerald-500" : "opacity-30")} />
            <div className="flex items-end gap-0.5 h-3">
              <span className={cn("w-1 rounded-xs transition-all", wifiSignalStrength >= 1 ? "h-1.5 bg-emerald-500" : (isDark ? "h-1.5 bg-secondary-700" : "h-1.5 bg-slate-300"))} />
              <span className={cn("w-1 rounded-xs transition-all", wifiSignalStrength >= 2 ? "h-2 bg-emerald-500" : (isDark ? "h-1 bg-secondary-700" : "h-1 bg-slate-300"))} />
              <span className={cn("w-1 rounded-xs transition-all", wifiSignalStrength >= 3 ? "h-2.5 bg-emerald-500" : (isDark ? "h-1 bg-secondary-700" : "h-1 bg-slate-300"))} />
              <span className={cn("w-1 rounded-xs transition-all", wifiSignalStrength >= 4 ? "h-3 bg-emerald-500" : (isDark ? "h-1 bg-secondary-700" : "h-1 bg-slate-300"))} />
            </div>
            <span className="text-[10px] text-muted-foreground ml-1">
              %{wifiSignalPercent}
            </span>
          </div>

          {/* Power Button Toggle */}
          <button
            onClick={handleTogglePower}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              isPowerOn
                ? "bg-emerald-500/15 border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                : "bg-red-500/15 border-red-600/40 text-red-600 dark:text-red-400 hover:bg-red-500/25"
            )}
            title={isTr ? (isPowerOn ? 'YazÄ±cÄ±yÄ± Kapat' : 'YazÄ±cÄ±yÄ± AÃ§') : (isPowerOn ? 'Power Off Printer' : 'Power On Printer')}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isPowerOn ? (isTr ? 'AÃ§Ä±k' : 'ON') : (isTr ? 'KapalÄ±' : 'OFF')}</span>
          </button>
        </div>

        <div className={cn("text-right font-mono text-xs opacity-70 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0", isDark ? "border-secondary-800" : "border-slate-200")}>
          <div>MAC: {device.macAddress || '0050.56C0.0001'}</div>
          <div>Web: http://{device.ip || ip}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: IP Configuration */}
        <div className={cn(
          "p-5 rounded-xl border space-y-4",
          isDark ? "bg-secondary-900/40 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between border-b pb-3 border-secondary-700/40">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              {isTr ? 'AÄŸ & IP YapÄ±landÄ±rmasÄ±' : 'Network & IP Configuration'}
            </h3>
            <div className="flex items-center gap-1 bg-secondary-800/40 p-1 rounded-lg border border-secondary-700/50 text-xs">
              <button
                onClick={() => handleSelectIpMode('dhcp')}
                className={cn("px-2 py-0.5 rounded font-medium transition-colors", ipMode === 'dhcp' ? "bg-purple-600 text-white" : "opacity-60 hover:opacity-100")}
              >
                DHCP
              </button>
              <button
                onClick={() => handleSelectIpMode('static')}
                className={cn("px-2 py-0.5 rounded font-medium transition-colors", ipMode === 'static' ? "bg-purple-600 text-white" : "opacity-60 hover:opacity-100")}
              >
                Static
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block mb-1 font-medium opacity-80">{isTr ? 'IP Adresi' : 'IP Address'}</label>
              <input
                type="text"
                disabled={ipMode === 'dhcp'}
                value={ip}
                onChange={e => setIp(e.target.value)}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono outline-none transition-colors",
                  isDark ? "bg-secondary-950 border-secondary-700 text-white" : "bg-slate-50 border-secondary-300 text-slate-900",
                  ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium opacity-80">{isTr ? 'Alt AÄŸ Maskesi' : 'Subnet Mask'}</label>
              <input
                type="text"
                disabled={ipMode === 'dhcp'}
                value={subnet}
                onChange={e => setSubnet(e.target.value)}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono outline-none transition-colors",
                  isDark ? "bg-secondary-950 border-secondary-700 text-white" : "bg-slate-50 border-secondary-300 text-slate-900",
                  ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium opacity-80">{isTr ? 'VarsayÄ±lan AÄŸ GeÃ§idi' : 'Default Gateway'}</label>
              <input
                type="text"
                disabled={ipMode === 'dhcp'}
                value={gateway}
                onChange={e => setGateway(e.target.value)}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono outline-none transition-colors",
                  isDark ? "bg-secondary-950 border-secondary-700 text-white" : "bg-slate-50 border-secondary-300 text-slate-900",
                  ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>
            <div>
              <label className="block mb-1 font-medium opacity-80">DNS Server</label>
              <input
                type="text"
                disabled={ipMode === 'dhcp'}
                value={dns}
                onChange={e => setDns(e.target.value)}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono outline-none transition-colors",
                  isDark ? "bg-secondary-950 border-secondary-700 text-white" : "bg-slate-50 border-secondary-300 text-slate-900",
                  ipMode === 'dhcp' && "opacity-50 cursor-not-allowed"
                )}
              />
            </div>

            {/* Wi-Fi SSID Selection */}
            <div className="pt-2 border-t border-secondary-700/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-medium opacity-80 flex items-center gap-1.5 text-purple-400">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{isTr ? 'Kablosuz AÄŸ (Wi-Fi SSID)' : 'Wi-Fi Network (SSID)'}</span>
                </label>
                <button
                  type="button"
                  onClick={handleToggleWifi}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1",
                    isWifiEnabled
                      ? "bg-red-950/60 border-red-600/60 text-red-300 hover:bg-red-900/80"
                      : "bg-emerald-950/60 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/80"
                  )}
                  title={isTr ? (isWifiEnabled ? 'Wi-Fi baÄŸlantÄ±sÄ±nÄ± kapat' : 'Wi-Fi baÄŸlantÄ±sÄ±nÄ± aÃ§') : (isWifiEnabled ? 'Disconnect Wi-Fi' : 'Connect Wi-Fi')}
                >
                  <span>{isWifiEnabled ? 'âŒ' : 'âœ…'}</span>
                  <span>{isWifiEnabled ? (isTr ? 'Wi-Fi Kapat' : 'Disable Wi-Fi') : (isTr ? 'Wi-Fi AÃ§' : 'Enable Wi-Fi')}</span>
                </button>
              </div>
              {availableSsids.length === 0 ? (
                <div className="p-2.5 rounded-lg border border-secondary-800 bg-secondary-950/40 text-center text-xs opacity-60">
                  {isTr ? 'Kapsama alanÄ±nda aktif Wi-Fi aÄŸÄ± yok' : 'No active Wi-Fi networks found'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                  {availableSsids.map((ssid, idx) => {
                    const isConnected = selectedSsid === ssid;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectSsid(ssid)}
                        className={cn(
                          "p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all text-xs",
                          isConnected
                            ? "bg-purple-950/40 border-purple-500/50 text-white"
                            : isDark ? "bg-secondary-950/40 border-secondary-800 hover:border-secondary-700 text-secondary-300" : "bg-slate-50 border-secondary-200 hover:border-secondary-300 text-slate-800"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Radio className={cn("w-3.5 h-3.5", isConnected ? "text-purple-400" : "opacity-40")} />
                          <span className="font-semibold">{ssid}</span>
                        </div>
                        {isConnected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                            {isTr ? 'BaÄŸlÄ±' : 'Connected'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleSaveIp}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isTr ? 'AyarlarÄ± Kaydet' : 'Save Configuration'}
            </button>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-medium animate-pulse">
                {isTr ? 'Kaydedildi!' : 'Saved successfully!'}
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Hardware & Toner Status */}
        <div className={cn(
          "p-5 rounded-xl border space-y-4",
          isDark ? "bg-secondary-900/40 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
        )}>
          <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-3 border-secondary-700/40">
            <HardDrive className="w-4 h-4 text-purple-400" />
            {isTr ? 'DonanÄ±m & Sarf Malzemeleri' : 'Hardware & Supplies Status'}
          </h3>

          <div className="space-y-4 text-xs">
            {/* Paper Tray */}
            <div>
              <div className="flex justify-between mb-1 font-medium">
                <span>{isTr ? 'KaÄŸÄ±t Kasedi (Tray 1 - A4)' : 'Paper Tray 1 (A4)'}</span>
                <span className="text-emerald-400 font-mono">100%</span>
              </div>
              <div className="w-full bg-secondary-800 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-full w-[100%]" />
              </div>
            </div>

            {/* Toner Cartridges */}
            <div className="space-y-2 pt-1">
              <span className="block font-medium opacity-80 mb-1">{isTr ? 'Toner Seviyeleri' : 'Toner Cartridge Levels'}</span>
              <div className="grid grid-cols-4 gap-2 text-[10px] text-center font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-700 text-white">
                  <div className="font-bold">BLACK</div>
                  <div className="text-emerald-400 mt-1">98%</div>
                </div>
                <div className="p-2 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
                  <div className="font-bold">CYAN</div>
                  <div className="text-cyan-400 mt-1">92%</div>
                </div>
                <div className="p-2 rounded bg-rose-950 border border-rose-700 text-rose-300">
                  <div className="font-bold">MAGENTA</div>
                  <div className="text-rose-400 mt-1">95%</div>
                </div>
                <div className="p-2 rounded bg-amber-950 border border-amber-700 text-amber-300">
                  <div className="font-bold">YELLOW</div>
                  <div className="text-amber-400 mt-1">90%</div>
                </div>
              </div>
            </div>

            {/* Print Queue */}
            <div className="p-3 rounded-lg bg-secondary-950 border border-secondary-800 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-semibold">
                <span>{isTr ? 'YazdÄ±rma KuyruÄŸu & Gelen Belgeler' : 'Print Queue & Incoming Documents'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-mono">{(liveDevice.printJobs || []).length} {isTr ? 'Belge' : 'Jobs'}</span>
                  {(liveDevice.printJobs || []).length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPrintJobs}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-300 transition-colors cursor-pointer"
                      title={isTr ? 'YazdÄ±rma kuyruÄŸunu temizle' : 'Clear print queue'}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{isTr ? 'Temizle' : 'Clear'}</span>
                    </button>
                  )}
                </div>
              </div>

              {(!liveDevice.printJobs || liveDevice.printJobs.length === 0) ? (
                <p className="text-[10px] opacity-60 italic">
                  {isTr ? 'Bekleyen iÅŸ yok. YazÄ±cÄ± hazÄ±r konumda.' : 'No active print jobs in queue. Printer ready.'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {liveDevice.printJobs.map((job, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-purple-300 truncate max-w-[160px]">{job.documentTitle}</div>
                        <div className="text-[9px] opacity-60 font-mono">{job.senderName} â€¢ {job.pages} {isTr ? 'sayfa' : 'pg'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                          {isTr ? 'TAMAMLANDI' : 'COMPLETED'}
                        </span>
                        <div className="text-[9px] opacity-40 font-mono mt-0.5">{job.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostics: Ping Tool */}
      <div className={cn(
        "p-5 rounded-xl border space-y-3",
        isDark ? "bg-secondary-900/40 border-secondary-800" : "bg-white border-secondary-200 shadow-sm"
      )}>
        <h3 className="text-sm font-bold flex items-center gap-2 border-b pb-3 border-secondary-700/40">
          <Send className="w-4 h-4 text-purple-400" />
          {isTr ? 'YazÄ±cÄ± AÄŸ TeÅŸhisi (Ping Testi)' : 'Printer Network Diagnostics (Ping Test)'}
        </h3>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={targetPingIp}
            onChange={e => setTargetPingIp(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendPing();
              }
            }}
            placeholder={isTr ? 'Hedef IP (Ã¶rn: 192.168.1.1)' : 'Target IP (e.g. 192.168.1.1)'}
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg border font-mono text-xs outline-none",
              isDark ? "bg-secondary-950 border-secondary-700 text-white" : "bg-slate-50 border-secondary-300 text-slate-900"
            )}
          />
          <button
            onClick={handleSendPing}
            disabled={isPinging}
            className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            {isPinging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isTr ? 'Ping GÃ¶nder' : 'Send Ping'}
          </button>
        </div>

        {pingResults.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-emerald-400 space-y-1 overflow-x-auto border border-slate-800">
            {pingResults.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

