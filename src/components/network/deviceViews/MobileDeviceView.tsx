'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Smartphone, Wifi, Server, Send, BatteryCharging, Signal, Globe, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/appStore';
import { checkConnectivity } from '@/lib/network/connectivity/pathResolution';
import { getWirelessSignalStrength } from '@/lib/network/connectivity';
import { isRouterDevice, generateRouterAdminPage } from '@/components/network/WifiControlPanel';
import { generatePrinterWebPanelContent } from '@/lib/network/printerWebPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { wrapIframeContent } from '@/lib/design-tokens/iframeFonts';
import { HttpBrowserWindow } from '@/components/network/pc-panel/HttpBrowserWindow';
import { dispatchCapturedPackets } from '@/utils/packetCapture';
import { setRouterAuthenticated, setIotPanelAuthenticated } from '@/lib/network/adminSessionManager';
import { MobileWifiTab } from './mobile/MobileWifiTab';
import { MobileIpSettingsTab } from './mobile/MobileIpSettingsTab';
import { MobilePingTab } from './mobile/MobilePingTab';
import { MobileVoipTab } from './mobile/MobileVoipTab';

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

  // Calculate real Wi-Fi signal strength from topology (0-5 scale)
  const wifiSignalStrength = useMemo(() => {
    if (!isPowerOn || !isWifiEnabled) return 0;
    return getWirelessSignalStrength(device, topologyDevices, deviceStates);
  }, [device, topologyDevices, deviceStates, isPowerOn, isWifiEnabled]);

  const isWifiConnected = wifiSignalStrength > 0 && !!device.wifi?.ssid;
  const setDevices = useAppStore(state => state.setDevices);

  const [activeScreen, setActiveScreen] = useState<'wifi' | 'ip' | 'ping' | 'voip'>('wifi');

  // Current local time formatted as HH:mm
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

  // IP Settings
  const [ipMode, setIpMode] = useState<'dhcp' | 'static'>(device.ipConfigMode === 'dhcp' ? 'dhcp' : 'static');
  const [ip, setIp] = useState(device.ip || '192.168.1.105');
  const [subnet, setSubnet] = useState(device.subnet || '255.255.255.0');
  const [gateway, setGateway] = useState(device.gateway || '192.168.1.1');
  const [dns, setDns] = useState(device.dns || '8.8.8.8');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Wi-Fi Connection
  const [selectedSsid, setSelectedSsid] = useState(device.wifi?.ssid || '');

  // Diagnostic Ping state
  const [targetPingIp, setTargetPingIp] = useState('192.168.1.1');
  const [pingResults, setPingResults] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);

  // VoIP / IP Voice Dial Pad State
  const [dialNumber, setDialNumber] = useState('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'failed'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusMessage, setCallStatusMessage] = useState('');
  const [rtpMetrics, setRtpMetrics] = useState<{ rtt: number; jitter: number; loss: number }>({ rtt: 2, jitter: 0.5, loss: 0 });
  const activeCallTargetRef = useRef<CanvasDevice | null>(null);

  // Mobile Web Browser Floating Window State
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState(device.gateway || '192.168.1.1');
  const [browserContent, setBrowserContent] = useState<string>('');
  const [browserTitle, setBrowserTitle] = useState('Web Browser');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [browserWindow, setBrowserWindow] = useState({
    x: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerWidth / 2 - 280) : 100),
    y: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerHeight / 2 - 220) : 100),
    width: 560,
    height: 400,
  });

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resizeStateRef = useRef<{ side: any; startX: number; startY: number; originX: number; originY: number; originW: number; originH: number } | null>(null);

  // Timer for active call duration, RTP metrics & connectivity loss monitoring
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (callState === 'connected' || callState === 'calling') {
      timer = setInterval(() => {
        if (callState === 'connected') {
          setCallDuration(prev => prev + 1);
          setRtpMetrics({
            rtt: Math.floor(Math.random() * 4) + 2,
            jitter: Number((Math.random() * 0.8 + 0.1).toFixed(1)),
            loss: 0
          });
        }

        // Check if connection to remote peer is still alive
        const activeVoip = device.activeVoipCall;
        const targetDev = activeCallTargetRef.current || topologyDevices.find(d =>
          d.id !== device.id && (
            d.id === activeVoip?.callerId ||
            d.activeVoipCall?.callerId === device.id ||
            (d.activeVoipCall && activeVoip && d.activeVoipCall.callerId === activeVoip.callerId)
          )
        );

        if (targetDev) {
          const targetIp = targetDev.ip || activeVoip?.callerIp || dialNumber;
          if (targetIp) {
            const res = checkConnectivity(
              device.id,
              targetIp,
              topologyDevices,
              topologyConnections,
              deviceStates,
              isTr ? 'tr' : 'en',
              { protocol: 'udp', port: '5060' }
            );

            if (!res.success || targetDev.status === 'offline') {
              handleEndVoipCall();
              setCallState('failed');
              setCallStatusMessage(isTr ? 'Arama Sonlandırıldı: Bağlantı koptu!' : 'Call Ended: Connection lost!');
              setTimeout(() => {
                setCallState('idle');
                setCallStatusMessage('');
              }, 3000);
            }
          }
        }
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState, device, topologyDevices, topologyConnections, deviceStates, isTr, dialNumber]);

  // Sync call state when incoming call or active call state changes remotely
  useEffect(() => {
    if (!device.activeVoipCall) {
      if (callState !== 'idle' && callState !== 'failed') {
        setCallState('idle');
        setCallStatusMessage('');
        activeCallTargetRef.current = null;
      }
    } else if (device.activeVoipCall.status === 'connected' && callState !== 'connected') {
      setCallState('connected');
      const peerName = device.activeVoipCall.callerName;
      setCallStatusMessage(isTr ? `Bağlandı: ${peerName}` : `Connected to ${peerName}`);
    }
  }, [device.activeVoipCall, callState, isTr]);

  // Address bar autocomplete suggestions
  const suggestions = useMemo(() => {
    const list = [
      device.gateway || '192.168.1.1',
      '8.8.8.8',
      '1.1.1.1',
      'http://iot-panel',
    ];
    topologyDevices.forEach(d => {
      if (d.ip) list.push(`http://${d.ip}`);
    });
    return Array.from(new Set(list));
  }, [device.gateway, topologyDevices]);

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

  // Helper to obtain DHCP IP based on connected AP/WLC or default subnet
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

  // Track call duration in ref for accurate history saving
  const callDurationRef = useRef(0);
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Initiate VoIP Call
  const handleInitiateVoipCall = (targetInput?: string) => {
    const rawTarget = (targetInput || dialNumber).trim();
    if (!rawTarget) return;

    setCallState('calling');
    setCallStatusMessage(isTr ? `Aranıyor: ${rawTarget}...` : `Calling ${rawTarget}...`);

    let targetDev = topologyDevices.find(d => d.ip === rawTarget || d.name?.toLowerCase() === rawTarget.toLowerCase() || d.id === rawTarget);

    if (!targetDev && /^\d+$/.test(rawTarget)) {
      targetDev = topologyDevices.find(d => d.ip?.endsWith(`.${rawTarget}`) || d.ip?.includes(rawTarget));
    }

    setTimeout(() => {
      const targetIpToTest = targetDev?.ip || rawTarget;
      const res = checkConnectivity(
        device.id,
        targetIpToTest,
        topologyDevices,
        topologyConnections,
        deviceStates,
        isTr ? 'tr' : 'en',
        { protocol: 'udp', port: '5060' }
      );

      if (res.capturedPackets && res.capturedPackets.length > 0) {
        dispatchCapturedPackets(res.capturedPackets);
      } else {
        dispatchCapturedPackets([{
          connectionId: topologyConnections[0]?.id || '',
          sourceIp: device.ip || '0.0.0.0',
          targetIp: targetIpToTest,
          protocol: 'SIP/UDP',
          length: 420,
          info: `SIP INVITE Call Request (Port 5060) -> ${targetIpToTest}`
        }]);
      }

      if (targetDev && targetDev.status === 'offline') {
        setCallState('failed');
        setCallStatusMessage(isTr ? `Arama Başarısız: "${targetDev.name}" kapalı (Power Off)!` : `Call Failed: "${targetDev.name}" is powered off!`);
        setTimeout(() => {
          setCallState('idle');
          setCallStatusMessage('');
        }, 3500);
        return;
      }

      if (res.success) {
        activeCallTargetRef.current = targetDev || null;
        setCallState('connected');
        const targetName = targetDev ? targetDev.name : targetIpToTest;
        setCallStatusMessage(isTr ? `Arama Yapılıyor (Çalıyor): ${targetName}` : `Ringing ${targetName}...`);

        setDevices(prev =>
          prev.map(d => {
            if (d.id === device.id) {
              return {
                ...d,
                activeVoipCall: {
                  callerId: device.id,
                  callerName: targetName,
                  callerIp: targetIpToTest,
                  status: 'ringing'
                }
              };
            }
            if (targetDev && d.id === targetDev.id) {
              return {
                ...d,
                activeVoipCall: {
                  callerId: device.id,
                  callerName: device.name,
                  callerIp: device.ip,
                  status: 'ringing'
                }
              };
            }
            return d;
          })
        );
      } else {
        setCallState('failed');
        setCallStatusMessage(res.error || (isTr ? 'Arama Başarısız: Hedef Ulaşılamıyor' : 'Call Failed: Target Unreachable'));
        setTimeout(() => {
          setCallState('idle');
          setCallStatusMessage('');
        }, 3000);
      }
    }, 1200);
  };

  const handleAnswerVoipCall = () => {
    if (!device.activeVoipCall) return;
    const callerId = device.activeVoipCall.callerId;
    setCallState('connected');

    setDevices(prev =>
      prev.map(d => {
        if (d.id === device.id || d.id === callerId) {
          return {
            ...d,
            activeVoipCall: {
              ...(d.activeVoipCall || { callerId, callerName: device.name, callerIp: device.ip }),
              status: 'connected'
            }
          };
        }
        return d;
      })
    );
  };

  const handleEndVoipCall = () => {
    const activeVoip = device.activeVoipCall;
    const targetDev = activeCallTargetRef.current;

    // Find remote peer ID whether this device is caller or callee
    const remotePeerDev = targetDev || topologyDevices.find(d =>
      d.id !== device.id && (
        d.id === activeVoip?.callerId ||
        d.activeVoipCall?.callerId === device.id ||
        (d.activeVoipCall && activeVoip && d.activeVoipCall.callerId === activeVoip.callerId)
      )
    );

    const duration = callDurationRef.current;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDevices(prev =>
      prev.map(d => {
        const isThisDev = d.id === device.id;
        const isRemoteDev = remotePeerDev && d.id === remotePeerDev.id;

        if (isThisDev) {
          const peerName = remotePeerDev ? remotePeerDev.name : (activeVoip?.callerName || dialNumber || 'VoIP Peer');
          const peerIp = remotePeerDev ? remotePeerDev.ip : activeVoip?.callerIp;
          const newHistoryItem = {
            id: `call-${Date.now()}-${Math.random()}`,
            peerName,
            peerIp,
            type: (targetDev ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
            status: (activeVoip?.status === 'connected' || callState === 'connected' ? 'answered' : 'rejected') as 'answered' | 'rejected',
            durationSeconds: duration,
            timestamp: timeStr
          };
          return {
            ...d,
            activeVoipCall: undefined,
            voipHistory: [newHistoryItem, ...(d.voipHistory || [])]
          };
        }

        if (isRemoteDev) {
          const newHistoryItem = {
            id: `call-${Date.now()}-${Math.random()}`,
            peerName: device.name,
            peerIp: device.ip,
            type: (targetDev ? 'incoming' : 'outgoing') as 'outgoing' | 'incoming',
            status: (activeVoip?.status === 'connected' || callState === 'connected' ? 'answered' : 'rejected') as 'answered' | 'rejected',
            durationSeconds: duration,
            timestamp: timeStr
          };
          return {
            ...d,
            activeVoipCall: undefined,
            voipHistory: [newHistoryItem, ...(d.voipHistory || [])]
          };
        }

        return d;
      })
    );

    setCallState('idle');
    setCallStatusMessage('');
    activeCallTargetRef.current = null;
  };

  const handleClearVoipHistory = () => {
    setDevices(prev =>
      prev.map(d => (d.id === device.id ? { ...d, voipHistory: [] } : d))
    );
  };

  const handleDialKeyPress = (key: string) => {
    if (callState !== 'idle') return;
    setDialNumber(prev => prev + key);
  };

  const handleDialDelete = () => {
    if (callState !== 'idle') return;
    setDialNumber(prev => prev.slice(0, -1));
  };

  const handleNavigateBrowser = (targetUrl?: string) => {
    const rawUrl = (targetUrl || browserUrl || '192.168.1.1').trim();
    if (!rawUrl || rawUrl === '0.0.0.0') return;

    let displayUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `http://${rawUrl}`;
    setBrowserUrl(displayUrl);

    let hostOrIp = displayUrl.replace(/^https?:\/\//i, '').split('/')[0].split(':')[0];

    // Handle IoT Web Panel shortcut
    if (rawUrl === 'http://iot-panel' || rawUrl === 'iot-panel') {
      const iotDevices = topologyDevices.filter(d => d.type === 'iot');
      const content = generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]);
      setBrowserContent(content);
      setBrowserTitle(isTr ? 'IoT Kontrol Paneli' : 'IoT Web Panel');
      return;
    }

    // Handle IoT device detail URL
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
        return;
      }
    }

    // Check target device by IP or hostname
    let targetDev = topologyDevices.find(d => d.ip === hostOrIp || d.name?.toLowerCase() === hostOrIp.toLowerCase() || d.id === hostOrIp);

    // If host is explicitly 'gateway' or targetDev is not found and matches device.gateway
    if (!targetDev && (hostOrIp === 'gateway' || (device.gateway && hostOrIp === device.gateway))) {
      const gwIp = device.gateway || '192.168.1.1';
      targetDev = topologyDevices.find(d => d.ip === gwIp) || topologyDevices.find(d => d.type === 'router' || d.type === 'wlc' || d.type === 'firewall');
      if (targetDev) hostOrIp = targetDev.ip || gwIp;
    }

    const connRes = checkConnectivity(
      device.id,
      targetDev?.ip || hostOrIp,
      topologyDevices,
      topologyConnections,
      deviceStates,
      isTr ? 'tr' : 'en',
      { protocol: 'tcp', port: '80' }
    );

    if (!connRes.success) {
      setBrowserTitle(isTr ? 'Bağlantı Hatası' : 'Connection Error');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:48px;margin-bottom:12px;">🚫</div>
          <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-danger-500);">${isTr ? 'Sunucuya Ulaşılamıyor' : 'Server Unreachable'}</h1>
          <p style="margin:0 0 12px;font-size:14px;color:var(--color-secondary-500);">${connRes.error || (isTr ? 'Ağ geçidi veya sunucu yanıt vermiyor.' : 'Gateway or server not responding.')}</p>
          <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-danger-100);color:var(--color-danger-800);font-size:12px;">${displayUrl}</code>
        </main>
      `);
      return;
    }

    const cloudDevice = topologyDevices.find(d => d.type === 'cloud');

    // 1. Router / WLC Admin Panel
    if (targetDev && (isRouterDevice(targetDev) || targetDev.type === 'router' || targetDev.type === 'wlc')) {
      const runtimeState = deviceStates.get(targetDev.id);
      const adminPage = generateRouterAdminPage(targetDev, language, runtimeState, [], []);
      setBrowserTitle(targetDev.name || 'Router Admin');
      setBrowserContent(adminPage);
    }
    // 2. Printer Control Panel
    else if (targetDev && targetDev.type === 'printer') {
      const printerPage = generatePrinterWebPanelContent(targetDev, language);
      setBrowserTitle(targetDev.name || 'Printer Web');
      setBrowserContent(printerPage);
    }
    // 3. Public WAN / Cloud Internet Services (8.8.8.8, 1.1.1.1)
    else if (hostOrIp === '8.8.8.8' || hostOrIp === '8.8.4.4' || hostOrIp === '1.1.1.1' || targetDev?.type === 'cloud') {
      if (!cloudDevice) {
        setBrowserTitle(isTr ? 'Cihaz Bulunamadı' : 'Device Not Found');
        setBrowserContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🌐 ⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-danger-500);">${isTr ? 'Bulut (WAN) Cihazı Bulunamadı' : 'Cloud (WAN) Device Not Found'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:var(--color-secondary-500);">${isTr ? 'Ağda bağlı bir Bulut (Cloud/WAN) cihazı bulunmuyor!' : 'No Cloud (WAN) device exists on the network!'}</p>
            <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-danger-100);color:var(--color-danger-800);font-size:12px;">${displayUrl}</code>
          </main>
        `);
        return;
      }
      if (cloudDevice.status === 'offline') {
        setBrowserTitle(isTr ? 'Bulut Kapalı' : 'Cloud Offline');
        setBrowserContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">☁️ ⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:var(--color-danger-500);">${isTr ? 'Bulut Hizmeti Kapalı' : 'Cloud Service Offline'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:var(--color-secondary-500);">${isTr ? 'Hedef Bulut (WAN) cihazının gücü kapalı (Power Off) durumda!' : 'Target Cloud (WAN) device is powered off!'}</p>
            <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-danger-100);color:var(--color-danger-800);font-size:12px;">${displayUrl}</code>
          </main>
        `);
        return;
      }
      setBrowserTitle(isTr ? 'Genel Arama Kapısı - WAN' : 'Public Search Portal - WAN');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:var(--color-primary-500);margin-bottom:8px;">🌐  ${isTr ? 'Arama Kapısı' : 'Web Portal'}</div>
          <p style="font-size:14px;color:var(--color-secondary-500);margin-bottom:20px;">${isTr ? 'Genel WAN İnternet Geçidi (8.8.8.8)' : 'Public WAN Internet Gateway (8.8.8.8)'}</p>
          <div style="border:1px solid var(--color-secondary-300);border-radius:24px;padding:10px 20px;max-width:320px;margin:0 auto 20px;font-size:13px;color:var(--color-secondary-700);">🔍 ${isTr ? 'Arama yapın veya URL girin' : 'Search or type URL'}</div>
          <div style="background:var(--color-secondary-100);padding:16px;border-radius:12px;font-size:12px;color:var(--color-secondary-800);text-align:left;max-width:400px;margin:0 auto;">
            <strong style="color:var(--color-secondary-900);">${isTr ? 'İnternet Bağlantısı Aktif' : 'Internet Connection Active'}</strong><br/>
            ${isTr ? 'WAN Köprüsü ve Genel DNS Sunucusu başarıyla yanıt verdi.' : 'WAN Transit Bridge and Public DNS Server responded successfully.'}
          </div>
        </main>
      `);
    }
    // 4. End Device HTTP Web Server
    else if (targetDev && (targetDev.services?.http?.enabled || targetDev.ip)) {
      const pageContent = targetDev.services?.http?.content || `
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <h2 style="font-size:24px;color:var(--color-success-500);margin-bottom:8px;">Welcome to ${targetDev.name || targetDev.id}</h2>
          <p style="font-size:14px;color:var(--color-secondary-700);">HTTP Web Server is online and active.</p>
        </main>
      `;
      setBrowserTitle(`${targetDev.name || targetDev.id} Web`);
      setBrowserContent(pageContent);
    }
    // 5. Fallback 404
    else {
      setBrowserTitle('404 Not Found');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <h1 style="font-size:40px;margin:0 0 8px;">404</h1>
          <p style="font-size:14px;color:var(--color-secondary-500);margin:0 0 12px;">${isTr ? 'Web Sayfası Bulunamadı' : 'Web Page Not Found'}</p>
          <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:var(--color-secondary-100);color:var(--color-secondary-900);font-size:12px;">${displayUrl}</code>
        </main>
      `);
    }
  };

  useEffect(() => {
    const handleMobilePanelMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }
      const data = event.data;
      if (!data) return;

      if (data.type === 'router-admin-auth-success') {
        if (data.deviceId) setRouterAuthenticated(data.deviceId, true);
        return;
      } else if (data.type === 'router-admin-logout') {
        if (data.deviceId) setRouterAuthenticated(data.deviceId, false);
        return;
      } else if (data.type === 'iot-panel-auth-success') {
        setIotPanelAuthenticated(true);
        return;
      } else if (data.type === 'iot-panel-logout') {
        setIotPanelAuthenticated(false);
        return;
      } else if (data.type === 'open-iot-device' && data.deviceId) {
        handleNavigateBrowser(`iot://iot-device/${data.deviceId}`);
      } else if (data.type === 'back-to-iot-list') {
        handleNavigateBrowser('http://iot-panel');
      }
    };

    window.addEventListener('message', handleMobilePanelMessage);
    return () => window.removeEventListener('message', handleMobilePanelMessage);
  }, [topologyDevices, language, isTr]);

  const handleOpenBrowserWindow = (targetUrl?: string) => {
    const defaultUrl = (device.gateway && device.gateway !== '0.0.0.0') ? device.gateway : '192.168.1.1';
    const target = targetUrl || (browserUrl && browserUrl !== '0.0.0.0' ? browserUrl : defaultUrl);
    handleNavigateBrowser(target);
    setIsBrowserOpen(true);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

        {/* App Navigation Bar (5 Tabs: Wi-Fi, IP Config, Ping, VoIP, Web Browser) */}
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
              dialNumber={dialNumber}
              setDialNumber={setDialNumber}
              callState={callState}
              callDuration={callDuration}
              callStatusMessage={callStatusMessage}
              rtpMetrics={rtpMetrics}
              activeCallTarget={activeCallTargetRef.current}
              onInitiateCall={handleInitiateVoipCall}
              onAnswerCall={handleAnswerVoipCall}
              onEndCall={handleEndVoipCall}
              onClearVoipHistory={handleClearVoipHistory}
              onDialKeyPress={handleDialKeyPress}
              onDialDelete={handleDialDelete}
              formatDuration={formatDuration}
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


