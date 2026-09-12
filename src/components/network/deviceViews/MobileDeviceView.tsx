'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Smartphone, Wifi, Server, CheckCircle2, RefreshCw, Send, Radio, BatteryCharging, Signal, Globe, PhoneCall, PhoneOff, Phone, User, Trash2 } from 'lucide-react';
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
import { isSameSubnet } from '@/components/network/pc-panel/pcBrowser.utils';
import { setRouterAuthenticated, setIotPanelAuthenticated } from '@/lib/network/adminSessionManager';

import type { CanvasDevice, CanvasConnection } from '../networkTopology.types';
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
          <h1 style="margin:0 0 8px;font-size:22px;color:#ef4444;">${isTr ? 'Sunucuya Ulaşılamıyor' : 'Server Unreachable'}</h1>
          <p style="margin:0 0 12px;font-size:14px;color:#64748b;">${connRes.error || (isTr ? 'Ağ geçidi veya sunucu yanıt vermiyor.' : 'Gateway or server not responding.')}</p>
          <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:#fee2e2;color:#991b1b;font-size:12px;">${displayUrl}</code>
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
            <div style="font-size:48px;margin-bottom:12px;">🌐⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:#ef4444;">${isTr ? 'Bulut (WAN) Cihazı Bulunamadı' : 'Cloud (WAN) Device Not Found'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:#64748b;">${isTr ? 'Ağda bağlı bir Bulut (Cloud/WAN) cihazı bulunmuyor!' : 'No Cloud (WAN) device exists on the network!'}</p>
            <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:#fee2e2;color:#991b1b;font-size:12px;">${displayUrl}</code>
          </main>
        `);
        return;
      }
      if (cloudDevice.status === 'offline') {
        setBrowserTitle(isTr ? 'Bulut Kapalı' : 'Cloud Offline');
        setBrowserContent(`
          <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">☁️⚡</div>
            <h1 style="margin:0 0 8px;font-size:22px;color:#ef4444;">${isTr ? 'Bulut Hizmeti Kapalı' : 'Cloud Service Offline'}</h1>
            <p style="margin:0 0 12px;font-size:14px;color:#64748b;">${isTr ? 'Hedef Bulut (WAN) cihazının gücü kapalı (Power Off) durumda!' : 'Target Cloud (WAN) device is powered off!'}</p>
            <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:#fee2e2;color:#991b1b;font-size:12px;">${displayUrl}</code>
          </main>
        `);
        return;
      }
      setBrowserTitle(isTr ? 'Genel Arama Kapısı - WAN' : 'Public Search Portal - WAN');
      setBrowserContent(`
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <div style="font-size:36px;font-weight:bold;color:#3b82f6;margin-bottom:8px;">🌐 ${isTr ? 'Arama Kapısı' : 'Web Portal'}</div>
          <p style="font-size:14px;color:#64748b;margin-bottom:20px;">${isTr ? 'Genel WAN İnternet Geçidi (8.8.8.8)' : 'Public WAN Internet Gateway (8.8.8.8)'}</p>
          <div style="border:1px solid #cbd5e1;border-radius:24px;padding:10px 20px;max-width:320px;margin:0 auto 20px;font-size:13px;color:#475569;">🔍 ${isTr ? 'Arama yapın veya URL girin' : 'Search or type URL'}</div>
          <div style="background:#f1f5f9;padding:16px;border-radius:12px;font-size:12px;color:#334155;text-align:left;max-width:400px;margin:0 auto;">
            <strong style="color:#1e293b;">${isTr ? 'İnternet Bağlantısı Aktif' : 'Internet Connection Active'}</strong><br/>
            ${isTr ? 'WAN Köprüsü ve Genel DNS Sunucusu başarıyla yanıt verdi.' : 'WAN Transit Bridge and Public DNS Server responded successfully.'}
          </div>
        </main>
      `);
    }
    // 4. End Device HTTP Web Server
    else if (targetDev && (targetDev.services?.http?.enabled || targetDev.ip)) {
      const pageContent = targetDev.services?.http?.content || `
        <main style="padding:32px;font-family:'Inria Sans',sans-serif;text-align:center;">
          <h2 style="font-size:24px;color:#10b981;margin-bottom:8px;">Welcome to ${targetDev.name || targetDev.id}</h2>
          <p style="font-size:14px;color:#475569;">HTTP Web Server is online and active.</p>
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
          <p style="font-size:14px;color:#64748b;margin:0 0 12px;">${isTr ? 'Web Sayfası Bulunamadı' : 'Web Page Not Found'}</p>
          <code style="display:inline-block;padding:6px 12px;border-radius:8px;background:#f1f5f9;color:#0f172a;font-size:12px;">${displayUrl}</code>
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
            className={cn("py-1.5 rounded-lg font-medium flex items-center justify-center gap-1 transition-colors text-[10px] relative", activeScreen === 'voip' ? "bg-emerald-600 text-white" : device.activeVoipCall ? "bg-emerald-950 text-emerald-300 border border-emerald-500 animate-pulse font-bold" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"))}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Radio className="w-4 h-4" />
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
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-center text-slate-400 text-xs">
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
                            handleDisconnectWifi();
                          } else {
                            handleSelectSsid(ssid);
                          }
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                          isConnected ? "bg-sky-950/60 border-sky-500 text-white shadow-sm shadow-sky-900/30" : "bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40"
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
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 font-medium">
                              {isTr ? 'Kapat' : 'Disconnect'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-sky-400 hover:text-sky-300 font-medium">{isTr ? 'Bağlan' : 'Connect'}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex gap-2">
                {isWifiConnected && (
                  <button
                    onClick={handleDisconnectWifi}
                    className="flex-1 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    {isTr ? 'Bağlantıyı Kopar' : 'Disconnect Wi-Fi'}
                  </button>
                )}
                <button
                  onClick={handleSaveIp}
                  className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isTr ? 'Ağı Güncelle' : 'Update Wireless Link'}
                </button>
              </div>
            </div>
          )}

          {activeScreen === 'ip' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Server className="w-4 h-4" />
                  {isTr ? 'IP Adresi Ayarları' : 'IP Address Settings'}
                </span>
                <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => handleSetIpMode('dhcp')}
                    className={cn("px-2 py-0.5 rounded font-medium", ipMode === 'dhcp' ? "bg-sky-600 text-white" : "text-slate-400")}
                  >
                    DHCP
                  </button>
                  <button
                    onClick={() => handleSetIpMode('static')}
                    className={cn("px-2 py-0.5 rounded font-medium", ipMode === 'static' ? "bg-sky-600 text-white" : "text-slate-400")}
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
                  <label className="block mb-1 font-medium opacity-80">{isTr ? 'Ağ Geçidi' : 'Gateway'}</label>
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
                  onClick={handleSaveIp}
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
          )}

          {activeScreen === 'ping' && (
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
                      handleSendPing();
                    }
                  }}
                  placeholder={isTr ? "Hedef IP (192.168.1.1)" : "Target IP (192.168.1.1)"}
                  className={cn(
                    "flex-1 px-2.5 py-1.5 rounded-lg border font-mono outline-none text-xs transition-colors",
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
                  )}
                />
                <button
                  onClick={handleSendPing}
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
          )}

          {activeScreen === 'voip' && (
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
                      onClick={handleAnswerVoipCall}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
                    >
                      <Phone className="w-4 h-4" />
                      {isTr ? 'Cevapla' : 'Answer'}
                    </button>
                    <button
                      onClick={handleEndVoipCall}
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
                            handleInitiateVoipCall();
                          }
                        }
                      }}
                      placeholder={isTr ? "IP veya Dahili No Girin (192.168.1.50)..." : "Enter IP or Extension (192.168.1.50)..."}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-center text-sm text-emerald-400 placeholder:text-slate-600 outline-none"
                    />
                    {dialNumber && (
                      <button
                        onClick={handleDialDelete}
                        className="absolute right-2 top-2.5 text-xs text-slate-500 hover:text-rose-400 px-1 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dial Pad Grid (3x4) */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => (
                      <button
                        key={key}
                        onClick={() => handleDialKeyPress(key)}
                        className="h-9 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 font-bold text-sm text-slate-200 transition-all active:scale-95 flex items-center justify-center"
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleInitiateVoipCall()}
                      disabled={(() => {
                        const val = dialNumber.trim();
                        if (!val) return true;
                        const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(val);
                        const isExtensionDigits = /^[0-9*#]+$/.test(val);
                        const isKnownDeviceName = topologyDevices.some(d => d.name?.toLowerCase() === val.toLowerCase() || d.id === val);
                        return !(isIp || isExtensionDigits || isKnownDeviceName);
                      })()}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {isTr ? 'Ara' : 'Call'}
                    </button>
                  </div>

                  {/* Topology Directory / Quick Contacts */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
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
                                    handleInitiateVoipCall(d.ip);
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
                            onClick={handleClearVoipHistory}
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
                      {activeCallTargetRef.current ? activeCallTargetRef.current.name : (device.activeVoipCall?.callerName || dialNumber || 'VoIP Peer')}
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
                      onClick={handleEndVoipCall}
                      className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-950"
                    >
                      <PhoneOff className="w-4 h-4" />
                      {isTr ? 'Aramayı Sonlandır' : 'End Call'}
                    </button>
                  </div>
                </div>
              )}
            </div>
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

