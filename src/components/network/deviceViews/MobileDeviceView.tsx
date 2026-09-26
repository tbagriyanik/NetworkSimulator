'use client';

import { useState, useMemo, useEffect } from 'react';
import { Smartphone, Wifi, Server, Send, BatteryCharging, Signal, Globe, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/appStore';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import { wrapIframeContent } from '@/lib/design-tokens/iframeFonts';
import { HttpBrowserWindow } from '@/components/network/pc-panel/HttpBrowserWindow';
import { dispatchCapturedPackets } from '@/utils/packetCapture';

import { MobileWifiTab } from './mobile/MobileWifiTab';
import { MobileIpSettingsTab } from './mobile/MobileIpSettingsTab';
import { MobilePingTab } from './mobile/MobilePingTab';
import { MobileVoipTab } from './mobile/MobileVoipTab';
import { useMobileBrowser } from './mobile/useMobileBrowser';
import { useMobileVoipState } from './mobile/useMobileVoipState';

import type { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

interface MobileDeviceViewProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  isDark: boolean;
  language: string;
}

export function MobileDeviceView({
  device,
  topologyDevices,
  topologyConnections,
  deviceStates,
  isDark,
  language,
}: MobileDeviceViewProps) {
  const isTr = language === 'tr';
  const isPowerOn = device.status !== 'offline';
  const isWifiEnabled = device.wifi?.enabled !== false;

  const wifiSignalStrength = useMemo(() => {
    if (!isPowerOn || !isWifiEnabled) return 0;
    return getWirelessSignalStrength(device, topologyDevices, deviceStates);
  }, [device, topologyDevices, deviceStates, isPowerOn, isWifiEnabled]);

  const isWifiConnected = wifiSignalStrength > 0 && !!device.wifi?.ssid;
  const setDevices = useAppStore(state => state.setDevices);

  const [activeScreen, setActiveScreen] = useState<'wifi' | 'ip' | 'ping' | 'voip'>('wifi');

  const [currentTime, setCurrentTime] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setCurrentTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
    };
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const [ipMode, setIpMode] = useState<'dhcp' | 'static'>(device.ipConfigMode === 'dhcp' ? 'dhcp' : 'static');
  const [ip, setIp] = useState(device.ip || '192.168.1.105');
  const [subnet, setSubnet] = useState(device.subnet || '255.255.255.0');
  const [gateway, setGateway] = useState(device.gateway || '192.168.1.1');
  const [dns, setDns] = useState(device.dns || '8.8.8.8');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedSsid, setSelectedSsid] = useState(device.wifi?.ssid || '');

  const [targetPingIp, setTargetPingIp] = useState('192.168.1.1');
  const [pingResults, setPingResults] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);

  const {
    isBrowserOpen,
    setIsBrowserOpen,
    browserUrl,
    setBrowserUrl,
    browserContent,
    browserTitle,
    showSuggestions,
    setShowSuggestions,
    selectedSuggestionIndex,
    setSelectedSuggestionIndex,
    browserWindow,
    setBrowserWindow,
    urlInputRef,
    dragStateRef,
    resizeStateRef,
    suggestions,
    handleNavigateBrowser,
    handleOpenBrowserWindow,
  } = useMobileBrowser({
    device,
    topologyDevices,
    topologyConnections,
    deviceStates,
    language,
    isTr,
  });

  const voip = useMobileVoipState({
    device,
    topologyDevices,
    topologyConnections,
    deviceStates,
    isTr,
  });

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

  const obtainDhcpIpForSsid = (targetSsid: string) => {
    const targetAp = topologyDevices.find(d => d.wifi?.ssid === targetSsid && d.wifi?.enabled);
    let assignedIp = '192.168.1.105';
    let assignedSubnet = '255.255.255.0';
    let assignedGateway = '192.168.1.1';
    let assignedDns = '8.8.8.8';

    if (targetAp) {
      const baseIp = targetAp.ip || '192.168.1.1';
      const parts = baseIp.split('.');
      if (parts.length === 4) {
        const hostNum = Math.floor(Math.random() * 150) + 50;
        assignedIp = `${parts[0]}.${parts[1]}.${parts[2]}.${hostNum}`;
        assignedSubnet = targetAp.subnet || '255.255.255.0';
        assignedGateway = targetAp.gateway || baseIp;
        assignedDns = targetAp.dns || '8.8.8.8';
      }
    }

    return { assignedIp, assignedSubnet, assignedGateway, assignedDns };
  };

  const handleDisconnectWifi = () => {
    setSelectedSsid('');
    setDevices(
      topologyDevices.map(d => {
        if (d.id === device.id) {
          return {
            ...d,
            wifi: {
              ...d.wifi,
              ssid: '',
              enabled: false,
              security: d.wifi?.security || ('open' as const),
              channel: d.wifi?.channel || ('2.4GHz' as const),
              mode: d.wifi?.mode || ('client' as const),
            }
          };
        }
        return d;
      })
    );
  };

  const handleSelectSsid = (ssid: string) => {
    setSelectedSsid(ssid);
    let nextIp = ip;
    let nextSubnet = subnet;
    let nextGateway = gateway;
    let nextDns = dns;

    if (ipMode === 'dhcp') {
      const dhcpConfig = obtainDhcpIpForSsid(ssid);
      nextIp = dhcpConfig.assignedIp;
      nextSubnet = dhcpConfig.assignedSubnet;
      nextGateway = dhcpConfig.assignedGateway;
      nextDns = dhcpConfig.assignedDns;
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
              enabled: true,
            }
          };
        }
        return d;
      })
    );
  };

  const handleSetIpMode = (mode: 'dhcp' | 'static') => {
    setIpMode(mode);
    if (mode === 'dhcp') {
      const dhcpConfig = obtainDhcpIpForSsid(selectedSsid);
      setIp(dhcpConfig.assignedIp);
      setSubnet(dhcpConfig.assignedSubnet);
      setGateway(dhcpConfig.assignedGateway);
      setDns(dhcpConfig.assignedDns);
    }
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
              enabled: true,
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
    setPingResults([isTr ? `Ping gönderiliyor: ${targetPingIp}...` : `Pinging ${targetPingIp}...`]);

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

      if (res.capturedPackets && res.capturedPackets.length > 0) {
        dispatchCapturedPackets(res.capturedPackets);
      }

      if (res.success) {
        setPingResults([
          `PING ${targetPingIp} 56(84) bytes of data.`,
          `64 bytes from ${targetPingIp}: icmp_seq=1 ttl=64 time=2.10 ms`,
          `64 bytes from ${targetPingIp}: icmp_seq=2 ttl=64 time=1.85 ms`,
          `64 bytes from ${targetPingIp}: icmp_seq=3 ttl=64 time=1.92 ms`,
          `64 bytes from ${targetPingIp}: icmp_seq=4 ttl=64 time=1.88 ms`,
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

  let voipButtonClass: string;
  if (activeScreen === 'voip') {
    voipButtonClass = 'bg-emerald-600 text-white';
  } else if (device.activeVoipCall) {
    voipButtonClass = 'bg-emerald-950 text-emerald-300 border border-emerald-500 animate-pulse font-bold';
  } else {
    voipButtonClass = isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900';
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center custom-scrollbar">
      {/* Smartphone Outer Chassis Frame */}
      <div className={cn(
        "w-full max-w-sm rounded-[32px] border-4 p-4 shadow-2xl flex flex-col space-y-4",
        isDark ? "bg-slate-950 border-slate-700 shadow-cyan-950/20 text-white" : "bg-white border-slate-300 text-slate-900 shadow-slate-300/50"
      )}>
        {/* Status Bar */}
        <div className="flex justify-between items-center text-[10px] font-mono opacity-80 px-2">
          <span>{currentTime}</span>
          <div className={cn("w-16 h-3 rounded-full border", isDark ? "bg-black border-slate-700" : "bg-slate-200 border-slate-400")} />
          <div className="flex items-center gap-1.5">
            <Signal className={cn("w-3 h-3 transition-colors", wifiSignalStrength > 0 ? "text-emerald-500" : "opacity-40")} />
            <Wifi className={cn("w-3 h-3 transition-colors", isWifiConnected ? "text-sky-500" : "opacity-40")} />
            <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
          </div>
        </div>

        {/* Screen Header */}
        <div className={cn("text-center pb-2 border-b", isDark ? "border-slate-800" : "border-slate-200")}>
          <h2 className="text-sm font-bold flex items-center justify-center gap-1.5">
            <Smartphone className="w-4 h-4 text-sky-500" />
            {device.name}
          </h2>
          <p className={cn("text-[10px]", isDark ? "text-slate-400" : "text-slate-500")}>Mobile OS • Wi-Fi & VoIP</p>
        </div>

        {/* App Navigation Bar */}
        <div className={cn("grid grid-cols-5 gap-1 p-1 rounded-xl border text-xs", isDark ? "bg-slate-900/80 border-slate-800" : "bg-slate-100 border-slate-300")}>
          <button
            onClick={() => setActiveScreen('wifi')}
            className={cn("py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-[10px]", activeScreen === 'wifi' ? "bg-sky-600 text-white" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"))}
          >
            <Wifi className="w-3 h-3" />
            Wi-Fi
          </button>
          <button
            onClick={() => setActiveScreen('ip')}
            className={cn("py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-[10px]", activeScreen === 'ip' ? "bg-sky-600 text-white" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"))}
          >
            <Server className="w-3 h-3" />
            IP
          </button>
          <button
            onClick={() => setActiveScreen('ping')}
            className={cn("py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-[10px]", activeScreen === 'ping' ? "bg-sky-600 text-white" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"))}
          >
            <Send className="w-3 h-3" />
            Ping
          </button>
          <button
            onClick={() => setActiveScreen('voip')}
            className={cn("py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-[10px] relative", voipButtonClass)}
          >
            <PhoneCall className="w-3 h-3" />
            VoIP
            {device.activeVoipCall && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 animate-ping" />
            )}
          </button>
          <button
            onClick={() => handleOpenBrowserWindow()}
            className="py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-[10px] bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-500 hover:to-blue-500 shadow-sm"
            title={isTr ? 'Mobil Web Tarayıcısı' : 'Mobile Web Browser'}
          >
            <Globe className="w-3 h-3" />
            {isTr ? 'Tarayıcı' : 'Browser'}
          </button>
        </div>

        {/* Screen Content */}
        <div className={cn("min-h-[280px] flex-1 rounded-2xl p-4 border text-xs space-y-4", isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}>
          {activeScreen === 'wifi' && (
            <MobileWifiTab
              isDark={isDark}
              isTr={isTr}
              isWifiConnected={isWifiConnected}
              availableSsids={availableSsids}
              selectedSsid={selectedSsid}
              onDisconnectWifi={handleDisconnectWifi}
              onSelectSsid={handleSelectSsid}
            />
          )}

          {activeScreen === 'ip' && (
            <MobileIpSettingsTab
              isDark={isDark}
              isTr={isTr}
              ipMode={ipMode}
              setIpMode={handleSetIpMode}
              ip={ip}
              setIp={setIp}
              subnet={subnet}
              setSubnet={setSubnet}
              gateway={gateway}
              setGateway={setGateway}
              dns={dns}
              setDns={setDns}
              saveSuccess={saveSuccess}
              onSaveIp={handleSaveIp}
            />
          )}

          {activeScreen === 'ping' && (
            <MobilePingTab
              isDark={isDark}
              isTr={isTr}
              targetPingIp={targetPingIp}
              setTargetPingIp={setTargetPingIp}
              isPinging={isPinging}
              pingResults={pingResults}
              onSendPing={handleSendPing}
            />
          )}

          {activeScreen === 'voip' && (
            <MobileVoipTab
              device={device}
              topologyDevices={topologyDevices}
              topologyConnections={topologyConnections}
              deviceStates={deviceStates}
              isDark={isDark}
              isTr={isTr}
              dialNumber={voip.dialNumber}
              setDialNumber={voip.setDialNumber}
              callState={voip.callState}
              callDuration={voip.callDuration}
              callStatusMessage={voip.callStatusMessage}
              rtpMetrics={voip.rtpMetrics}
              activeCallTarget={voip.activeCallTarget}
              onInitiateCall={voip.handleInitiateVoipCall}
              onAnswerCall={voip.handleAnswerVoipCall}
              onEndCall={voip.handleEndVoipCall}
              onClearVoipHistory={voip.handleClearVoipHistory}
              onDialKeyPress={voip.handleDialKeyPress}
              onDialDelete={voip.handleDialDelete}
              formatDuration={voip.formatDuration}
            />
          )}
        </div>
      </div>

      {/* PC-style Floating Resizable Browser Window Portal */}
      <HttpBrowserWindow
        isOpen={isBrowserOpen}
        isMobile={false}
        isDark={isDark}
        language={language}
        browserWindow={browserWindow}
        onBrowserWindowChange={setBrowserWindow}
        title={browserTitle}
        url={browserUrl || ''}
        srcDoc={wrapIframeContent(browserContent)}
        suggestions={suggestions}
        showSuggestions={showSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
        urlInputRef={urlInputRef}
        dragStateRef={dragStateRef}
        resizeStateRef={resizeStateRef}
        currentDeviceId={device.id}
        onClose={() => setIsBrowserOpen(false)}
        onUrlChange={setBrowserUrl}
        onSetShowSuggestions={setShowSuggestions}
        onSetSelectedSuggestionIndex={setSelectedSuggestionIndex}
        onOpenWebPage={(url) => handleNavigateBrowser(url)}
      />
    </div>
  );
}
