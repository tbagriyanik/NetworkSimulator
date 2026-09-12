'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Cpu, Power, RefreshCw, Wifi, WifiOff, Server, CheckCircle2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { wrapIframeContent } from '@/lib/design-tokens/iframeFonts';
import { HttpBrowserWindow } from '@/components/network/pc-panel/HttpBrowserWindow';

import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import type { SwitchState } from '@/lib/network/types';

interface IotDeviceViewProps {
  device: CanvasDevice;
  topologyDevices: CanvasDevice[];
  topologyConnections: CanvasConnection[];
  deviceStates: Map<string, SwitchState>;
  isDark: boolean;
  language: string;
}

export function IotDeviceView({
  device,
  topologyDevices,
  topologyConnections,
  deviceStates,
  isDark,
  language,
}: IotDeviceViewProps) {
  const isTr = language === 'tr';
  const liveDevice = topologyDevices.find(d => d.id === device.id) || device;

  const isPowerOn = liveDevice.status !== 'offline';
  const isCollaborationEnabled = liveDevice.iot?.collaborationEnabled !== false;

  const iotKind = liveDevice.iot?.kind || 'sensor';
  const iotSensorType = liveDevice.iot?.sensorType || 'temperature';

  const [deviceName, setDeviceName] = useState(liveDevice.name || liveDevice.id);
  const [dataStore, setDataStore] = useState(liveDevice.iot?.dataStore || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setDeviceName(liveDevice.name || liveDevice.id);
    setDataStore(liveDevice.iot?.dataStore || '');
  }, [liveDevice.id, liveDevice.name, liveDevice.iot?.dataStore]);

  const wifiSignalStrength = getWirelessSignalStrength(liveDevice, topologyDevices, deviceStates);
  const isWired = topologyConnections.some(c =>
    (c.sourceDeviceId === liveDevice.id || c.targetDeviceId === liveDevice.id) && c.active !== false
  );
  const isNetworkConnected = (wifiSignalStrength > 0 || isWired) && isPowerOn;
  const isWifiConnected = wifiSignalStrength > 0 && isPowerOn;

  const handleTypeChange = (value: string) => {
    const [kind, sensor] = value.split(':');
    const newKind = kind as 'cooler' | 'lamp' | 'heater' | 'sensor';
    const newSensor = sensor as 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';

    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: liveDevice.id,
        config: {
          iot: {
            ...liveDevice.iot,
            kind: newKind,
            sensorType: newSensor,
          }
        }
      }
    }));
  };

  const handleTogglePower = () => {
    const nextStatus: 'online' | 'offline' = isPowerOn ? 'offline' : 'online';
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId: liveDevice.id, config: { status: nextStatus } }
    }));
  };

  const handleToggleCollaboration = () => {
    const nextCollab = !isCollaborationEnabled;
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: liveDevice.id,
        config: {
          iot: {
            ...liveDevice.iot,
            collaborationEnabled: nextCollab
          }
        }
      }
    }));
  };

  // IP Configuration State
  const [ipMode, setIpMode] = useState<'dhcp' | 'static'>(liveDevice.ipConfigMode === 'dhcp' ? 'dhcp' : 'static');
  const [ip, setIp] = useState(liveDevice.ip || '192.168.1.105');
  const [subnet, setSubnet] = useState(liveDevice.subnet || '255.255.255.0');
  const [gateway, setGateway] = useState(liveDevice.gateway || '192.168.1.1');
  const [dns, setDns] = useState(liveDevice.dns || '8.8.8.8');

  useEffect(() => {
    if (liveDevice.ipConfigMode) setIpMode(liveDevice.ipConfigMode);
    if (liveDevice.ip) setIp(liveDevice.ip);
    if (liveDevice.subnet) setSubnet(liveDevice.subnet);
    if (liveDevice.gateway) setGateway(liveDevice.gateway);
    if (liveDevice.dns) setDns(liveDevice.dns);
  }, [liveDevice.ipConfigMode, liveDevice.ip, liveDevice.subnet, liveDevice.gateway, liveDevice.dns]);

  // Helper to obtain DHCP IP based on connected AP/WLC or default subnet
  const obtainDhcpIpForSsid = (targetSsid: string) => {
    const targetAp = topologyDevices.find(d => (d.wifi?.ssid === targetSsid && d.wifi?.enabled) || (d.type === 'wlc' && d.wifi?.enabled));
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

  const handleSelectIpMode = (mode: 'dhcp' | 'static') => {
    setIpMode(mode);
    let nextIp = ip;
    let nextSubnet = subnet;
    let nextGateway = gateway;
    let nextDns = dns;

    if (mode === 'dhcp') {
      const dhcpConfig = obtainDhcpIpForSsid(selectedSsid);
      nextIp = dhcpConfig.assignedIp;
      nextSubnet = dhcpConfig.assignedSubnet;
      nextGateway = dhcpConfig.assignedGateway;
      nextDns = dhcpConfig.assignedDns;
      setIp(nextIp);
      setSubnet(nextSubnet);
      setGateway(nextGateway);
      setDns(nextDns);
    }

    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: liveDevice.id,
        config: {
          ipConfigMode: mode,
          ip: nextIp,
          subnet: nextSubnet,
          gateway: nextGateway,
          dns: nextDns,
        }
      }
    }));
  };

  const handleSaveConfig = () => {
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: liveDevice.id,
        config: {
          name: deviceName,
          ipConfigMode: ipMode,
          ip,
          subnet,
          gateway,
          dns,
          iot: {
            ...liveDevice.iot,
            dataStore: dataStore,
          }
        }
      }
    }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Gather available Wi-Fi SSIDs from topology devices
  const availableSsids = useMemo(() => {
    const set = new Set<string>();
    topologyDevices.forEach(d => {
      if (d.wifi?.enabled !== false && d.wifi?.ssid) {
        set.add(d.wifi.ssid);
      }
      d.ports?.forEach((p: { wifi?: { ssid?: string; enabled?: boolean } }) => {
        if (p.wifi?.enabled !== false && p.wifi?.ssid) {
          set.add(p.wifi.ssid);
        }
      });
    });
    // Fallback if no AP found in topology
    if (set.size === 0) set.add('IoT-Network');
    return Array.from(set);
  }, [topologyDevices]);

  const [selectedSsid, setSelectedSsid] = useState<string>('');

  useEffect(() => {
    if (liveDevice.wifi?.ssid) {
      setSelectedSsid(liveDevice.wifi.ssid);
    } else if (availableSsids.length > 0) {
      setSelectedSsid(availableSsids[0]);
    }
  }, [liveDevice.wifi?.ssid, availableSsids]);

  const handleConnectWifi = (ssidTarget?: string) => {
    const ssidToConnect = ssidTarget || selectedSsid || availableSsids[0] || 'IoT-Network';
    let nextIp = ip;
    let nextSubnet = subnet;
    let nextGateway = gateway;
    let nextDns = dns;

    if (ipMode === 'dhcp') {
      const dhcpConfig = obtainDhcpIpForSsid(ssidToConnect);
      nextIp = dhcpConfig.assignedIp;
      nextSubnet = dhcpConfig.assignedSubnet;
      nextGateway = dhcpConfig.assignedGateway;
      nextDns = dhcpConfig.assignedDns;
      setIp(nextIp);
      setSubnet(nextSubnet);
      setGateway(nextGateway);
      setDns(nextDns);
    }

    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: liveDevice.id,
        config: {
          ipConfigMode: ipMode,
          ip: nextIp,
          subnet: nextSubnet,
          gateway: nextGateway,
          dns: nextDns,
          wifi: {
            ssid: ssidToConnect,
            security: 'open',
            channel: '2.4GHz',
            mode: 'client',
            enabled: true,
          }
        }
      }
    }));
  };

  const handleDisconnectWifi = () => {
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: liveDevice.id,
        config: {
          wifi: {
            ssid: '',
            security: 'open',
            channel: '2.4GHz',
            mode: 'client',
            enabled: false,
          }
        }
      }
    }));
  };

  // Web Browser Modal State for http://iot-panel
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('http://iot-panel');
  const [browserContent, setBrowserContent] = useState('');
  const [browserTitle, setBrowserTitle] = useState('IoT Web Panel');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [browserWindow, setBrowserWindow] = useState({
    x: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerWidth / 2 - 280) : 100),
    y: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerHeight / 2 - 220) : 100),
    width: 580,
    height: 420,
  });

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resizeStateRef = useRef<{ side: any; startX: number; startY: number; originX: number; originY: number; originW: number; originH: number } | null>(null);

  const suggestions = useMemo(() => ['http://iot-panel', '192.168.1.1', '8.8.8.8'], []);

  const handleOpenIotPanelWeb = (targetUrl?: string | React.MouseEvent) => {
    const rawUrl = (typeof targetUrl === 'string' && targetUrl ? targetUrl : browserUrl || 'http://iot-panel').trim();
    setBrowserUrl(rawUrl);

    if (rawUrl.startsWith('iot://iot-device/')) {
      const targetDeviceId = rawUrl.split('iot://iot-device/')[1];
      const targetDevice = topologyDevices.find(d => d.id === targetDeviceId);
      if (targetDevice && targetDevice.type === 'iot') {
        const iotDevices = topologyDevices.filter(d => d.type === 'iot');
        const isActive = targetDevice.iot?.collaborationEnabled ?? true;
        const isPoweredOff = targetDevice.status === 'offline';
        const kind = targetDevice.iot?.kind || 'sensor';
        const rules = targetDevice.iot?.rules || [];
        const sensorType = targetDevice.iot?.sensorType || 'temperature';
        const dataFlowDirection = targetDevice.iot?.dataFlowDirection || (kind === 'sensor' ? 'input' : 'output');
        const iotDevicePage = generateIotDevicePageContent(targetDevice.id, targetDevice.name || targetDevice.id, language, isActive, isPoweredOff, kind, rules, sensorType, iotDevices, dataFlowDirection, topologyDevices);
        setBrowserTitle(`${targetDevice.name || targetDevice.id} ${isTr ? 'Cihaz Yönetimi' : 'Device Management'}`);
        setBrowserContent(iotDevicePage);
        setIsBrowserOpen(true);
        return;
      }
    }

    const iotDevices = topologyDevices.filter(d => d.type === 'iot');
    const content = generateIotWebPanelContent(
      iotDevices,
      language,
      undefined,
      undefined,
      topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]
    );

    setBrowserTitle(isTr ? 'IoT Kontrol Paneli' : 'IoT Web Panel');
    setBrowserContent(content);
    setIsBrowserOpen(true);
  };

  useEffect(() => {
    const handleIotPanelMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }
      const data = event.data;
      if (!data) return;

      if (data.type === 'open-iot-device' && data.deviceId) {
        handleOpenIotPanelWeb(`iot://iot-device/${data.deviceId}`);
      } else if (data.type === 'back-to-iot-list') {
        handleOpenIotPanelWeb('http://iot-panel');
      } else if (data.type === 'toggle-iot-device') {
        const { deviceId: targetId, active } = data;
        const targetDev = topologyDevices.find(d => d.id === targetId);
        if (targetDev && targetDev.type === 'iot') {
          window.dispatchEvent(new CustomEvent('update-topology-device-config', {
            detail: {
              deviceId: targetId,
              config: {
                iot: {
                  ...targetDev.iot,
                  collaborationEnabled: active,
                },
              },
            },
          }));
        }
      } else if (data.type === 'update-iot-rules') {
        const { deviceId: targetId, rules } = data;
        const targetDev = topologyDevices.find(d => d.id === targetId);
        if (targetDev && targetDev.type === 'iot') {
          window.dispatchEvent(new CustomEvent('update-topology-device-config', {
            detail: {
              deviceId: targetId,
              config: {
                iot: {
                  ...targetDev.iot,
                  rules,
                },
              },
            },
          }));
        }
      }
    };

    window.addEventListener('message', handleIotPanelMessage);
    return () => window.removeEventListener('message', handleIotPanelMessage);
  }, [topologyDevices, language, isTr, liveDevice.id, topologyConnections]);

  return (
    <div className="space-y-4 p-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
      {/* Header Info */}
      <div className={cn("p-4 rounded-xl border flex items-center justify-between", isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200")}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm", isDark ? "bg-cyan-950/60 border-cyan-800 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-foreground flex items-center gap-2">
              <span>{liveDevice.name || liveDevice.id}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                IoT Device
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              IP: {liveDevice.ip || 'DHCP/Unassigned'} | MAC: {liveDevice.macAddress || 'N/A'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePower}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-sm",
              isPowerOn
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                : "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
            )}
          >
            <Power className="w-3.5 h-3.5" />
            {isPowerOn ? (isTr ? 'Güç Açık' : 'Power On') : (isTr ? 'Güç Kapalı' : 'Power Off')}
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className={cn("p-4 rounded-xl border space-y-4", isDark ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-muted-foreground">{isTr ? 'Cihaz Adı' : 'Device Name'}</label>
            <input
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              className={cn("w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none", isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900")}
              placeholder={isTr ? "IoT Cihaz Adı..." : "IoT Device Name..."}
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-muted-foreground">{isTr ? 'Cihaz Türü / Sensör' : 'Device Type / Sensor'}</label>
            <Select value={`${iotKind}:${iotSensorType}`} onValueChange={handleTypeChange}>
              <SelectTrigger className={cn("w-full h-9 text-xs", isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-300")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heater:temperature">{isTr ? 'Isıtıcı' : 'Heater'}</SelectItem>
                <SelectItem value="lamp:light">{isTr ? 'Lamba' : 'Lamp'}</SelectItem>
                <SelectItem value="cooler:temperature">{isTr ? 'Soğutucu' : 'Cooler'}</SelectItem>
                <SelectItem value="sensor:temperature">{isTr ? 'Isı Sensörü' : 'Temperature Sensor'}</SelectItem>
                <SelectItem value="sensor:light">{isTr ? 'Işık Sensörü' : 'Light Sensor'}</SelectItem>
                <SelectItem value="sensor:humidity">{isTr ? 'Nem Sensörü' : 'Humidity Sensor'}</SelectItem>
                <SelectItem value="sensor:motion">{isTr ? 'Hareket Sensörü' : 'Motion Sensor'}</SelectItem>
                <SelectItem value="sensor:sound">{isTr ? 'Ses Sensörü' : 'Sound Sensor'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between py-2 border-y border-slate-800/40">
          <div>
            <div className="font-bold text-foreground">{isTr ? 'Cihaz Durumu' : 'Device Status'}</div>
            <div className="text-[11px] text-muted-foreground">{isTr ? 'Cihazın ağ ve sensör simülasyon yanıtını açar/kapatır' : 'Toggles sensor response & network automation'}</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isCollaborationEnabled}
            onClick={handleToggleCollaboration}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors shrink-0 px-0.5",
              isCollaborationEnabled ? 'bg-cyan-600 border-cyan-500 justify-end' : (isDark ? 'bg-slate-800 border-slate-700 justify-start' : 'bg-slate-200 border-slate-300 justify-start')
            )}
          >
            <span className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-all" />
          </button>
        </div>

        {/* IP Configuration (DHCP / Static) */}
        <div className="space-y-3 pt-2 border-t border-slate-800/40">
          <div className="flex items-center justify-between">
            <label className="font-bold text-muted-foreground">{isTr ? 'IP Yapılandırması' : 'IP Configuration'}</label>
            <div className={cn("inline-flex p-0.5 rounded-lg border", isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300")}>
              <button
                type="button"
                onClick={() => handleSelectIpMode('dhcp')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                  ipMode === 'dhcp'
                    ? "bg-cyan-600 text-white shadow-sm"
                    : (isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                )}
              >
                DHCP
              </button>
              <button
                type="button"
                onClick={() => handleSelectIpMode('static')}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                  ipMode === 'static'
                    ? "bg-cyan-600 text-white shadow-sm"
                    : (isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900")
                )}
              >
                {isTr ? 'Statik' : 'Static'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">{isTr ? 'IP Adresi' : 'IP Address'}</label>
              <input
                type="text"
                value={ip}
                onChange={e => setIp(e.target.value)}
                disabled={ipMode === 'dhcp'}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono text-xs outline-none transition-colors",
                  ipMode === 'dhcp' ? "opacity-60 cursor-not-allowed" : "",
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">{isTr ? 'Alt Ağ Maskesi' : 'Subnet Mask'}</label>
              <input
                type="text"
                value={subnet}
                onChange={e => setSubnet(e.target.value)}
                disabled={ipMode === 'dhcp'}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono text-xs outline-none transition-colors",
                  ipMode === 'dhcp' ? "opacity-60 cursor-not-allowed" : "",
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">{isTr ? 'Ağ Geçidi (Gateway)' : 'Default Gateway'}</label>
              <input
                type="text"
                value={gateway}
                onChange={e => setGateway(e.target.value)}
                disabled={ipMode === 'dhcp'}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono text-xs outline-none transition-colors",
                  ipMode === 'dhcp' ? "opacity-60 cursor-not-allowed" : "",
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">DNS Server</label>
              <input
                type="text"
                value={dns}
                onChange={e => setDns(e.target.value)}
                disabled={ipMode === 'dhcp'}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border font-mono text-xs outline-none transition-colors",
                  ipMode === 'dhcp' ? "opacity-60 cursor-not-allowed" : "",
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900"
                )}
              />
            </div>
          </div>
        </div>

        {/* Data storage */}
        <div className="space-y-1.5">
          <label className="font-bold text-muted-foreground">{isTr ? 'Veri Saklama / Notlar (JSON veya Metin)' : 'Data Storage / Notes (JSON or Text)'}</label>
          <textarea
            value={dataStore}
            onChange={e => setDataStore(e.target.value)}
            rows={3}
            className={cn("w-full px-3 py-2 rounded-lg border font-mono text-xs outline-none custom-scrollbar", isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-300 text-slate-900")}
            placeholder={isTr ? "Sensör verileri veya notlar..." : "Sensor data or notes..."}
          />
        </div>

        {/* Network Status & Wireless Control Panel */}
        <div className={cn("p-3 rounded-lg border space-y-3 text-xs font-mono", isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-100 border-slate-200")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <span className={isNetworkConnected ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {isNetworkConnected ? (isTr ? 'Ağ Bağlantısı Aktif' : 'Network Connected') : (isTr ? 'Ağ Bağlantısı Yok' : 'No Network Connection')}
              </span>
            </div>
            {liveDevice.wifi?.ssid && (
              <div className="flex items-center gap-1.5 text-sky-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi SSID: {liveDevice.wifi?.ssid}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/30">
            <Select value={selectedSsid} onValueChange={(val) => {
              setSelectedSsid(val);
              handleConnectWifi(val);
            }}>
              <SelectTrigger className={cn("h-8 min-w-[130px] text-xs font-mono", isDark ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-900")}>
                <SelectValue placeholder="WiFi Seç..." />
              </SelectTrigger>
              <SelectContent>
                {availableSsids.map((ssid) => (
                  <SelectItem key={ssid} value={ssid} className="font-mono text-xs">
                    {ssid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={() => handleConnectWifi()}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors border shadow-sm h-8",
                isWifiConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-sky-600 hover:bg-sky-500 text-white border-sky-500"
              )}
            >
              <Wifi className="w-3.5 h-3.5" />
              {isTr ? 'Bağlan' : 'Connect'}
            </button>

            <button
              type="button"
              onClick={handleDisconnectWifi}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm h-8"
            >
              <WifiOff className="w-3.5 h-3.5" />
              {isTr ? 'Bağlantı Kapat' : 'Disconnect'}
            </button>

            <button
              type="button"
              onClick={() => handleOpenIotPanelWeb()}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm h-8"
            >
              <Globe className="w-3.5 h-3.5" />
              http://iot-panel
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md"
          >
            {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-white" /> : <RefreshCw className="w-4 h-4" />}
            {saveSuccess ? (isTr ? 'Kaydedildi!' : 'Saved!') : (isTr ? 'Ayarları Kaydet' : 'Save Settings')}
          </button>
        </div>
      </div>

      {/* Floating Web Browser Window Modal */}
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
        currentDeviceId={liveDevice.id}
        onClose={() => setIsBrowserOpen(false)}
        onUrlChange={setBrowserUrl}
        onSetShowSuggestions={setShowSuggestions}
        onSetSelectedSuggestionIndex={setSelectedSuggestionIndex}
        onOpenWebPage={(url) => handleOpenIotPanelWeb(url)}
      />
    </div>
  );
}
