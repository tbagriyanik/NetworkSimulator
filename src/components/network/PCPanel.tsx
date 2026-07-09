'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo, type CSSProperties } from 'react';
import { useEnvironment } from '@/lib/store/appStore';
import { SwitchState } from '@/lib/network/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { TerminalOutput } from './Terminal';
import type { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { checkConnectivity, getWirelessSignalStrength, getWirelessDistance, getDeviceWifiConfig } from '@/lib/network/connectivity';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { Laptop, Terminal as TerminalIcon, Globe, Settings, Wifi, Radio } from 'lucide-react';

import { toast } from "@/hooks/use-toast";
import { isValidMAC, normalizeMAC, cn } from "@/lib/utils";
import { ModernPanel } from '@/components/ui/ModernPanel';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { sanitizeHTTPContent } from '@/lib/security/sanitizer';
import { generateRouterAdminPage, isRouterDevice } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { expandCommandContext, DESKTOP_COMMANDS } from './pcPanel.utils';
import { errorHandler, STORAGE_ERRORS, DHCP_ERRORS, CLIPBOARD_ERRORS, DEVICE_ERRORS } from '@/lib/errors/errorHandler';
import { logger } from '@/lib/logger';
import { getL3Hops } from '@/lib/network/routing';
import { SearchOutputDialog } from './pc-panel/SearchOutputDialog';
import { HiddenNavigationTabs } from './pc-panel/HiddenNavigationTabs';
import { FtpFileTransferDialog } from './pc-panel/FtpFileTransferDialog';
import { HttpBrowserWindow } from './pc-panel/HttpBrowserWindow';
import { HomeLauncher } from './pc-panel/HomeLauncher';
import { PowerOffOverlay } from './pc-panel/PowerOffOverlay';
import { getDefaultPcFiles, getPCConfigDefaults } from './pc-panel/pcPanelFiles';
import type { DhcpPoolConfig, FtpSession, OutputLine, PCActiveTab, PCPanelProps, PcFile } from './pc-panel/PCPanel.types';
import { CommandLineTab } from './pc-panel/CommandLineTab';
import { ConsoleTerminalTab } from './pc-panel/ConsoleTerminalTab';
import { IpSettingsTab } from './pc-panel/IpSettingsTab';
import { ServicesTab } from './pc-panel/ServicesTab';
import { WirelessConfigTab } from './pc-panel/WirelessConfigTab';
import { IotDashboardTab } from './pc-panel/IotDashboardTab';
import { PCPanelHeader } from './pc-panel/PCPanelHeader';
import { PCPanelTerminalToolbar } from './pc-panel/PCPanelTerminalToolbar';
import {
  hasGatewayForTarget,
  normalizeLookupTarget,
  resolveDeviceNameTarget,
  resolveDomainWithDnsServices,
  findHttpServerByTarget,
  isDhcpPoolCompatibleForClient
} from './pc-panel/pcBrowser.utils';
import {
  getConsoleDevice,
  getAutocompleteSuggestions
} from './pc-panel/pcTerminal.utils';


export function PCPanel({
  deviceId,
  isVisible,
  initialTab,
  className,
  onClose,
  onTogglePower,
  topologyDevices = [],
  topologyConnections = [],
  deviceStates,
  deviceOutputs,
  pcOutputs,
  pcHistories,
  onUpdatePCHistory,
  onExecuteDeviceCommand,
  onNavigate,
  onDeleteDevice,
  handleResizeStart
}: PCPanelProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const environment = useEnvironment();

  // Responsive hooks
  const isMobile = useIsMobile();

  // Ref for click-outside detection
  const panelRef = useRef<HTMLDivElement>(null);

  const terminalBg = isDark ? 'bg-black' : 'bg-secondary-50';
  const textColor = isDark ? 'text-secondary-300' : 'text-secondary-700';

  const [activeTab, setActiveTab] = useState<PCActiveTab>(initialTab || 'home');
  const activeTabRef = useRef<PCActiveTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pc-tab-changed', {
        detail: { deviceId, activeTab }
      }));
    }
  }, [activeTab, deviceId, isVisible]);

  const [activeServiceTab, setActiveServiceTab] = useState<'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp'>('dns');
  const tabletHistoryRef = useRef<PCActiveTab[]>(['home']);
  const tabletHistoryIndexRef = useRef(0);
  const isInternalTabletNavRef = useRef(false);
  const mobileVerticalScrollStyle: CSSProperties | undefined = isMobile
    ? {
      overflowY: 'auto' as const,
      WebkitOverflowScrolling: 'touch' as const,
      overscrollBehaviorY: 'contain' as const,
      touchAction: 'pan-y' as const,
    }
    : undefined;

  const goHome = useCallback(() => {
    setActiveTab('home');
    tabletHistoryRef.current = ['home'];
    tabletHistoryIndexRef.current = 0;
    onNavigate?.('home');
  }, [onNavigate]);

  const navigateToProgram = useCallback((program: PCActiveTab) => {
    if (program === 'home') {
      // Going home - pop from history
      if (tabletHistoryIndexRef.current > 0) {
        tabletHistoryIndexRef.current--;
        isInternalTabletNavRef.current = true;
        setActiveTab(tabletHistoryRef.current[tabletHistoryIndexRef.current]);
        onNavigate?.('home');
      } else {
        setActiveTab('home');
        onNavigate?.('home');
      }
    } else {
      // Going to a program - push to history
      tabletHistoryRef.current = tabletHistoryRef.current.slice(0, tabletHistoryIndexRef.current + 1);
      tabletHistoryRef.current.push(program);
      tabletHistoryIndexRef.current = tabletHistoryRef.current.length - 1;
      setActiveTab(program);
      onNavigate?.(program);
    }
  }, [onNavigate]);

  useEffect(() => {
    const handleTabletPopState = (e: CustomEvent) => {
      const { program } = e.detail || {};
      if (program === 'home' && tabletHistoryIndexRef.current > 0) {
        tabletHistoryIndexRef.current--;
        isInternalTabletNavRef.current = true;
        setActiveTab(tabletHistoryRef.current[tabletHistoryIndexRef.current]);
      }
    };
    window.addEventListener('tablet-back', handleTabletPopState as EventListener);
    return () => window.removeEventListener('tablet-back', handleTabletPopState as EventListener);
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('terminal-font-size') || '13', 10);
    } catch (_err) {
      errorHandler.logError(STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({ key: 'terminal-font-size', operation: 'read' }));
      return 13;
    }
  });
  const [showCmdSettings, setShowCmdSettings] = useState(false);

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    try {
      localStorage.setItem('terminal-font-size', String(val));
    } catch (_err) {
      errorHandler.logError(STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({ key: 'terminal-font-size', operation: 'write', value: val }));
    }
  };
  const [input, setInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [autocompleteNavigated, setAutocompleteNavigated] = useState(false);

  // Tab cycle state
  const [tabCycleIndex, setTabCycleIndex] = useState(-1);
  const [lastTabInput, setLastTabInput] = useState('');

  // Console connection state
  const [isConsoleConnected, setIsConsoleConnected] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [consoleConnectionTime, setConsoleConnectionTime] = useState<number>(0);

  // FTP session state (interactive ftp> mode on PC desktop)
  const [ftpSession, setFtpSession] = useState<FtpSession | null>(null);
  const [isFtpFilePickerOpen, setIsFtpFilePickerOpen] = useState(false);

  // Local files downloaded via FTP get
  const [pcLocalFiles, setPcLocalFiles] = useState<PcFile[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`pc_files_${deviceId}`);
        if (stored) return JSON.parse(stored);
      } catch (_e) { }
    }
    // First time this PC is used — seed with per-PC default files
    const defaults = getDefaultPcFiles(deviceId);
    try { localStorage.setItem(`pc_files_${deviceId}`, JSON.stringify(defaults)); } catch (_e) { }
    return defaults;
  });

  // Keep desktop CMD and console histories separate.
  const [desktopHistory, setDesktopHistory] = useState<string[]>(() => {
    return pcHistories?.get(deviceId) || [];
  });
  const [desktopHistoryIndex, setDesktopHistoryIndex] = useState(-1);
  const [consoleHistory, setConsoleHistory] = useState<string[]>([]);
  const [consoleHistoryIndex, setConsoleHistoryIndex] = useState(-1);

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Load history when component mounts or deviceId changes
  useEffect(() => {
    const globalHistory = pcHistories?.get(deviceId) || [];
    setTimeout(() => setDesktopHistory(globalHistory), 0);
    setTimeout(() => setDesktopHistoryIndex(-1), 0);
  }, [deviceId, pcHistories]);

  // Sync with global history if it changes externally
  useEffect(() => {
    const globalHistory = pcHistories?.get(deviceId) || [];
    setTimeout(() => setDesktopHistory(prevHistory => {
      if (JSON.stringify(globalHistory) !== JSON.stringify(prevHistory)) {
        return globalHistory;
      }
      return prevHistory;
    }), 0);
    setTimeout(() => setDesktopHistoryIndex(-1), 0);
  }, [pcHistories, deviceId]);

  // Reset per-tab command cursor when tab changes.
  useEffect(() => {
    if (activeTab === 'desktop') setTimeout(() => setDesktopHistoryIndex(-1), 0);
    if (activeTab === 'terminal') setTimeout(() => setConsoleHistoryIndex(-1), 0);
  }, [activeTab]);

  const executeCommandRef = useRef<((cmd?: string) => Promise<void>) | null>(null);

  useEffect(() => {
    const handleAutoType = (e: Event) => {
      const { deviceId: eventDeviceId, command } = (e as CustomEvent).detail;
      if (eventDeviceId !== deviceId) return;

      // Switch to CMD/desktop tab
      setActiveTab('desktop');

      let i = 0;
      setInput('');
      const typeInterval = setInterval(() => {
        if (i < command.length) {
          const char = command.charAt(i);
          setInput(prev => prev + char);
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            if (executeCommandRef.current) {
              executeCommandRef.current(command);
            }
          }, 300);
        }
      }, 70);
    };

    window.addEventListener('pc-auto-type', handleAutoType);
    return () => window.removeEventListener('pc-auto-type', handleAutoType);
  }, [deviceId, isVisible]);

  // Get device from topology
  const deviceFromTopology = topologyDevices.find(d => d.id === deviceId);
  const defaultConfig = getPCConfigDefaults(deviceId);
  const isPcPoweredOff = deviceFromTopology?.status === 'offline';
  const wifiSignalStrength = useMemo(
    () => getWirelessSignalStrength(deviceFromTopology, topologyDevices, deviceStates),
    [deviceFromTopology, topologyDevices, deviceStates]
  );

  // Local settings state
  const [pcIP, setPcIP] = useState(deviceFromTopology?.ip || defaultConfig.ip);
  const [internalPcHostname, setInternalPcHostname] = useState(deviceFromTopology?.name || deviceId);

  const setPcHostname = useCallback((hostname: string) => {
    let processedHostname = hostname.trim();
    if (processedHostname.length > 20) {
      processedHostname = processedHostname.substring(0, 20);
    }
    setInternalPcHostname(processedHostname);
  }, []);

  // Hostname initialization only on mount
  useEffect(() => {
    setTimeout(() => setInternalPcHostname(deviceFromTopology?.name || deviceId), 0);
  }, []);

  const [pcMAC, setPcMAC] = useState(deviceFromTopology?.macAddress || defaultConfig.mac);
  const [ipConfigMode, setIpConfigMode] = useState<'static' | 'dhcp'>(deviceFromTopology?.ipConfigMode || 'static');
  const [pcGateway, setPcGateway] = useState(deviceFromTopology?.gateway || '192.168.1.1');
  const [pcDNS, setPcDNS] = useState(deviceFromTopology?.dns || '8.8.8.8');
  const [pcSubnet, setPcSubnet] = useState(deviceFromTopology?.subnet || '255.255.255.0');
  const [pcIPv6, setPcIPv6] = useState(deviceFromTopology?.ipv6 || '2001:db8:acad:1::10');
  const [pcIPv6Prefix, setPcIPv6Prefix] = useState(deviceFromTopology?.ipv6Prefix || '64');
  const [serviceDnsEnabled, setServiceDnsEnabled] = useState(deviceFromTopology?.services?.dns?.enabled ?? false);
  const [serviceDnsRecords, setServiceDnsRecords] = useState<Array<{ domain: string; address: string }>>(
    deviceFromTopology?.services?.dns?.records || []
  );
  const [dnsFormDomain, setDnsFormDomain] = useState('');
  const [dnsFormAddress, setDnsFormAddress] = useState('');

  const handleAddDnsRecord = useCallback(() => {
    isDnsEditingRef.current = true;
    const domain = dnsFormDomain.trim().toLowerCase();
    const address = dnsFormAddress.trim();
    if (!domain || !address) return;
    const newRecords = serviceDnsRecords.filter((r) => r.domain.toLowerCase() !== domain);
    newRecords.push({ domain, address });
    setServiceDnsRecords(newRecords);

    // Get current values from state variables that are defined below
    // Note: Since these are in a closure, we need to be careful with ordering or use refs
    // For now, let's fix the ordering of declarations in this file.

    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId,
        config: {
          services: {
            dns: { enabled: serviceDnsEnabled, records: newRecords }
          }
        }
      }
    }));

    setDnsFormDomain('');
    setDnsFormAddress('');
    setTimeout(() => { isDnsEditingRef.current = false; }, 1000);
  }, [dnsFormDomain, dnsFormAddress, serviceDnsRecords, deviceId, serviceDnsEnabled]);

  const [serviceHttpEnabled, setServiceHttpEnabled] = useState(deviceFromTopology?.services?.http?.enabled ?? false);
  const [serviceHttpContent, setServiceHttpContent] = useState(deviceFromTopology?.services?.http?.content || t.helloWorld);
  const [serviceFtpEnabled, setServiceFtpEnabled] = useState(deviceFromTopology?.services?.ftp?.enabled ?? false);

  const [serviceFtpFiles, setServiceFtpFiles] = useState(deviceFromTopology?.services?.ftp?.files || [
    { name: 'readme.txt', size: 1280, modifiedAt: new Date().toISOString() },
  ]);
  const [serviceMailEnabled, setServiceMailEnabled] = useState(deviceFromTopology?.services?.mail?.enabled ?? false);
  const [serviceMailDomain, setServiceMailDomain] = useState(deviceFromTopology?.services?.mail?.domain || 'local.lan');
  const [serviceMailUsername, setServiceMailUsername] = useState(deviceFromTopology?.services?.mail?.username || 'user');
  const [serviceMailPassword, setServiceMailPassword] = useState(deviceFromTopology?.services?.mail?.password || 'mail123');
  const [serviceMailInbox, setServiceMailInbox] = useState<Array<{ from: string; subject: string; body: string; timestamp?: string }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`mail_inbox_${deviceId}`);
        if (stored) return JSON.parse(stored);
      } catch (_e) { }
    }
    return deviceFromTopology?.services?.mail?.inbox || [];
  });
  const [serviceMailSent, setServiceMailSent] = useState<Array<{ to: string; subject: string; body: string; timestamp?: string }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`mail_sent_${deviceId}`);
        if (stored) return JSON.parse(stored);
      } catch (_e) { }
    }
    return deviceFromTopology?.services?.mail?.sent || [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mail_inbox_${deviceId}`, JSON.stringify(serviceMailInbox));
    }
  }, [serviceMailInbox, deviceId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mail_sent_${deviceId}`, JSON.stringify(serviceMailSent));
    }
  }, [serviceMailSent, deviceId]);
  const mailPop3Blocked = useMemo(() => {
    if (activeServiceTab !== 'mail' || !pcIP) return false;
    const result = checkConnectivity(deviceId, pcIP, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '110' });
    return !result.success;
  }, [activeServiceTab, pcIP, deviceId, topologyDevices, topologyConnections, deviceStates, language]);

  const [serviceNtpEnabled, setServiceNtpEnabled] = useState(deviceFromTopology?.services?.ntp?.enabled ?? false);
  const [serviceNtpServer, setServiceNtpServer] = useState(deviceFromTopology?.services?.ntp?.server || '');
  const [serviceNtpServerError, setServiceNtpServerError] = useState('');
  const [, setServiceNtpServerPreset] = useState<'pool.ntp.org' | 'time.google.com' | 'time.cloudflare.com' | 'local-clock' | 'custom'>(
    (deviceFromTopology?.services?.ntp?.server === 'pool.ntp.org'
      ? 'pool.ntp.org'
      : deviceFromTopology?.services?.ntp?.server === 'time.google.com'
        ? 'time.google.com'
        : deviceFromTopology?.services?.ntp?.server === 'time.cloudflare.com'
          ? 'time.cloudflare.com'
          : deviceFromTopology?.services?.ntp?.server === 'local-clock'
            ? 'local-clock'
            : 'custom')
  );
  const [serviceNtpDate, setServiceNtpDate] = useState(deviceFromTopology?.services?.ntp?.date || new Date().toISOString().slice(0, 10));
  const [serviceNtpTime, setServiceNtpTime] = useState(deviceFromTopology?.services?.ntp?.time || new Date().toTimeString().slice(0, 8));
  const [serviceDhcpEnabled, setServiceDhcpEnabled] = useState(deviceFromTopology?.services?.dhcp?.enabled ?? false);
  const [serviceDhcpPools, setServiceDhcpPools] = useState<DhcpPoolConfig[]>(deviceFromTopology?.services?.dhcp?.pools || []);
  const isDhcpEditingRef = useRef(false); // Track if user is actively editing DHCP pools
  const isDnsEditingRef = useRef(false); // Track if user is actively editing DNS records
  const checkDhcpAvailabilityRef = useRef<() => { available: boolean; reason: string }>(() => ({ available: true, reason: '' }));
  const manualDhcpClickRef = useRef(false); // Track if DHCP button was manually clicked to prevent infinite loop
  const pcIpRef = useRef(''); // Track pcIP to detect changes
  const pcSubnetRef = useRef(pcSubnet);
  const pcGatewayRef = useRef(pcGateway);
  const pcDNSRef = useRef(pcDNS);
  const applyDhcpLeaseRef = useRef<((force?: boolean) => ReturnType<typeof applyDhcpLease> | null) | undefined>(undefined);

  // Keep refs in sync with state
  useEffect(() => { pcIpRef.current = pcIP; }, [pcIP]);
  useEffect(() => { pcSubnetRef.current = pcSubnet; }, [pcSubnet]);
  useEffect(() => { pcGatewayRef.current = pcGateway; }, [pcGateway]);
  useEffect(() => { pcDNSRef.current = pcDNS; }, [pcDNS]);
  const [dhcpForm, setDhcpForm] = useState<DhcpPoolConfig>({
    poolName: '',
    defaultGateway: '',
    dnsServer: '',
    startIp: '',
    subnetMask: '255.255.255.0',
    maxUsers: 50,
  });
  const [editingDhcpIndex, setEditingDhcpIndex] = useState<number | null>(null);
  const [wifiEnabled, setWifiEnabled] = useState(deviceFromTopology?.wifi?.enabled ?? false);
  const [wifiSSID, setWifiSSID] = useState(deviceFromTopology?.wifi?.ssid ?? '');
  const [wifiSecurity, setWifiSecurity] = useState(deviceFromTopology?.wifi?.security ?? 'open');
  const [wifiPassword, setWifiPassword] = useState(deviceFromTopology?.wifi?.password ?? '');
  const [wifiChannel, setWifiChannel] = useState(deviceFromTopology?.wifi?.channel ?? '2.4GHz');
  const [wifiBSSID, setWifiBSSID] = useState(deviceFromTopology?.wifi?.bssid ?? '');
  const iotDevices = useMemo(
    () => {
      const allIotDevices = topologyDevices.filter((d) => d.type === 'iot');
      // Filter IoT devices that are reachable from the PC
      return allIotDevices.filter(device => {
        // Check if device has an IP and is in the same subnet or reachable via gateway
        if (device.ip && pcIP && pcSubnet && pcGateway) {
          try {
            const a = pcIP.split('.').map(Number);
            const b = device.ip.split('.').map(Number);
            const m = pcSubnet.split('.').map(Number);
            if (a.length === 4 && b.length === 4 && m.length === 4) {
              let sameSubnet = true;
              for (let i = 0; i < 4; i++) {
                if ((a[i] & m[i]) !== (b[i] & m[i])) {
                  sameSubnet = false;
                  break;
                }
              }
              if (sameSubnet) return true;
            }
          } catch (_err) {
            // Invalid IP format, skip silently - this is expected for malformed IPs
            if (process.env.NODE_ENV === 'development') {
              errorHandler.logError(new Error('IP validation failed'), { deviceId: device.id, ip: device.ip, pcIP, pcSubnet });
            }
          }

          // Check if device is reachable via gateway
          if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(pcGateway.trim())) return true;
        }

        // Check if device is connected via WiFi to the same AP as PC
        if (device.wifi?.enabled && device.wifi?.ssid && wifiEnabled && wifiSSID) {
          if (device.wifi.ssid === wifiSSID) return true;
        }

        // Check if device is connected via cable to the PC or in the same network
        if (topologyConnections.some(c =>
          (c.sourceDeviceId === deviceId && c.targetDeviceId === device.id) ||
          (c.targetDeviceId === deviceId && c.sourceDeviceId === device.id)
        )) {
          return true;
        }

        // Check if device is connected to the same router/AP as PC
        const connectedToSameRouter = topologyConnections.some(c => {
          const otherDeviceId = c.sourceDeviceId === deviceId ? c.targetDeviceId : c.targetDeviceId === deviceId ? c.sourceDeviceId : null;
          if (!otherDeviceId) return false;

          const otherDevice = topologyDevices.find(d => d.id === otherDeviceId);
          if (!otherDevice || (otherDevice.type !== 'router' && otherDevice.type !== 'switchL2' && otherDevice.type !== 'switchL3')) return false;

          // Check if the router/switch is in the PC's network
          if (otherDevice.ip && pcIP && pcSubnet) {
            try {
              const a = pcIP.split('.').map(Number);
              const r = otherDevice.ip.split('.').map(Number);
              const m = pcSubnet.split('.').map(Number);
              if (a.length === 4 && r.length === 4 && m.length === 4) {
                let routerInSameSubnet = true;
                for (let i = 0; i < 4; i++) {
                  if ((a[i] & m[i]) !== (r[i] & m[i])) {
                    routerInSameSubnet = false;
                    break;
                  }
                }
                if (!routerInSameSubnet) return false;
              }
            } catch (_err) {
              // Invalid IP format, skip silently - expected for malformed IPs
              if (process.env.NODE_ENV === 'development') {
                errorHandler.logError(new Error('Router IP validation failed'), { deviceId: otherDevice.id, ip: otherDevice.ip, pcIP, pcSubnet });
              }
            }
          } else if (!otherDevice.ip) {
            // Router has no IP, cannot verify network - skip
            return false;
          }

          return topologyConnections.some(c2 =>
            (c2.sourceDeviceId === otherDeviceId && c2.targetDeviceId === device.id) ||
            (c2.targetDeviceId === otherDeviceId && c2.sourceDeviceId === device.id)
          );
        });

        if (connectedToSameRouter) return true;

        return false;
      });
    },
    [topologyDevices, pcIP, pcSubnet, pcGateway, wifiEnabled, wifiSSID, deviceId, topologyConnections]
  );

  const formatFullDateTime = useCallback((date: Date) => {
    try {
      return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return date.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US');
    }
  }, [language]);

  const ntpPanelTime = useMemo(() => {
    if (!serviceNtpEnabled && !serviceNtpServer.trim()) return currentTime;
    const date = serviceNtpDate || currentTime.toISOString().slice(0, 10);
    const time = serviceNtpTime || currentTime.toTimeString().slice(0, 8);
    const combined = new Date(`${date}T${time}`);
    return Number.isNaN(combined.getTime()) ? currentTime : combined;
  }, [currentTime, serviceNtpDate, serviceNtpEnabled, serviceNtpTime, serviceNtpServer]);



  const isValidIpAddress = useCallback((value: string) => {
    const parts = value.trim().split('.');
    return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  }, []);

  const formatLocalDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const ntpSyncState = useMemo(() => {
    const serverIp = serviceNtpServer.trim();
    if (!serviceNtpEnabled && !serverIp) return null;

    // local-clock: use real system time
    if (serverIp === 'local-clock' || (!serverIp && serviceNtpEnabled)) {
      const now = new Date();
      return {
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        realtime: true,
      };
    }

    if (!isValidIpAddress(serverIp)) return null;
    const canReach = checkConnectivity(deviceId, serverIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'any' });
    if (!canReach.success) return null;

    let serverDate = '';
    let serverTime = '';

    if (canReach.targetId) {
      const targetDev = topologyDevices.find(d => d.id === canReach.targetId);
      if (targetDev) {
        if (targetDev.type === 'switchL2' || targetDev.type === 'switchL3' || targetDev.type === 'router') {
          const devState = deviceStates?.get(canReach.targetId);
          if (devState?.services?.ntp?.enabled) {
            const timeOffset = devState.services.ntp.timeOffset || 0;
            const adjustedTime = new Date(new Date().getTime() + timeOffset);
            serverDate = adjustedTime.toISOString().slice(0, 10);
            serverTime = adjustedTime.toTimeString().slice(0, 8);
          }
        } else {
          // PC/Server
          if (targetDev.services?.ntp?.enabled) {
            serverDate = targetDev.services.ntp.date || '';
            serverTime = targetDev.services.ntp.time || '';
          }
        }
      }
    }

    if (serverDate && serverTime) {
      const serverDateTime = new Date(`${serverDate}T${serverTime}`);
      if (!Number.isNaN(serverDateTime.getTime())) {
        const offset = serverDateTime.getTime() - new Date().getTime();
        return {
          date: serverDate,
          time: serverTime,
          realtime: false,
          offset,
        };
      }
    }

    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      realtime: true,
      offset: 0,
    };
  }, [deviceId, isValidIpAddress, serviceNtpEnabled, serviceNtpServer, topologyConnections, topologyDevices, deviceStates, language]);

  useEffect(() => {
    if (!ntpSyncState) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }

    if (ntpSyncState?.realtime) {
      // NTP server is synced – tick every second with real time
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }

    // Tick every second with the offset applied
    const offset = ntpSyncState.offset || 0;
    const timer = setInterval(() => {
      const adjusted = new Date(new Date().getTime() + offset);
      setCurrentTime(adjusted);
      setServiceNtpDate(adjusted.toISOString().slice(0, 10));
      setServiceNtpTime(adjusted.toTimeString().slice(0, 8));
    }, 1000);

    const initialAdjusted = new Date(new Date().getTime() + offset);
    setTimeout(() => setCurrentTime(initialAdjusted), 0);
    setTimeout(() => setServiceNtpDate(initialAdjusted.toISOString().slice(0, 10)), 0);
    setTimeout(() => setServiceNtpTime(initialAdjusted.toTimeString().slice(0, 8)), 0);

    return () => clearInterval(timer);
  }, [ntpSyncState]);

  const applyNtpServerTime = useCallback((serverAddress: string) => {
    const normalized = serverAddress.trim();
    if (!normalized || !isValidIpAddress(normalized)) return null;

    const canReach = checkConnectivity(deviceId, normalized, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'any' });
    if (!canReach.success) return null;

    let serverDate = '';
    let serverTime = '';

    if (canReach.targetId) {
      const targetDev = topologyDevices.find(d => d.id === canReach.targetId);
      if (targetDev) {
        if (targetDev.type === 'switchL2' || targetDev.type === 'switchL3' || targetDev.type === 'router') {
          const devState = deviceStates?.get(canReach.targetId);
          if (devState?.services?.ntp?.enabled) {
            const timeOffset = devState.services.ntp.timeOffset || 0;
            const adjustedTime = new Date(new Date().getTime() + timeOffset);
            serverDate = adjustedTime.toISOString().slice(0, 10);
            serverTime = adjustedTime.toTimeString().slice(0, 8);
          }
        } else {
          // PC/Server
          if (targetDev.services?.ntp?.enabled) {
            serverDate = targetDev.services.ntp.date || '';
            serverTime = targetDev.services.ntp.time || '';
          }
        }
      }
    }

    const nextDate = serverDate || new Date().toISOString().slice(0, 10);
    const nextTime = serverTime || new Date().toTimeString().slice(0, 8);

    const syncedDateTime = new Date(`${nextDate}T${nextTime}`);
    if (!Number.isNaN(syncedDateTime.getTime())) {
      setCurrentTime(syncedDateTime);
    }
    setServiceNtpDate(nextDate);
    setServiceNtpTime(nextTime);
    setServiceNtpServerPreset(
      normalized === 'pool.ntp.org'
        ? 'pool.ntp.org'
        : normalized === 'time.google.com'
          ? 'time.google.com'
          : normalized === 'time.cloudflare.com'
            ? 'time.cloudflare.com'
            : normalized === 'local-clock'
              ? 'local-clock'
              : 'custom'
    );
    return { date: nextDate, time: nextTime };
  }, [deviceId, isValidIpAddress, topologyConnections, topologyDevices, deviceStates, language]);

  useEffect(() => {
    if (!serviceNtpEnabled) return;
    if (ntpSyncState) return;

    const timer = setInterval(() => {
      setServiceNtpDate((prevDate) => {
        const startDate = prevDate || new Date().toISOString().slice(0, 10);
        const startTime = ntpTimeRef.current || new Date().toTimeString().slice(0, 8);
        const next = new Date(`${startDate}T${startTime}`);
        if (Number.isNaN(next.getTime())) return prevDate;
        next.setSeconds(next.getSeconds() + 1);
        const nextDate = formatLocalDate(next);
        const nextTime = next.toTimeString().slice(0, 8);
        setServiceNtpTime(nextTime);
        setCurrentTime(next);
        return nextDate;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [formatLocalDate, ntpSyncState, serviceNtpEnabled]);

  const lastSyncedServerRef = useRef<string>('');
  const lastSyncedServerDataRef = useRef<string>('');
  const ntpTimeRef = useRef(serviceNtpTime);
  // eslint-disable-next-line react-hooks/refs, react-hooks/immutability
  ntpTimeRef.current = serviceNtpTime;

  useEffect(() => {
    const serverIp = serviceNtpServer.trim();
    if (!serverIp || !isValidIpAddress(serverIp)) return;

    const currentServerData = JSON.stringify({ ip: serverIp, connections: topologyConnections });

    if (lastSyncedServerRef.current === serverIp && lastSyncedServerDataRef.current === currentServerData) return;

    lastSyncedServerRef.current = serverIp;
    lastSyncedServerDataRef.current = currentServerData;

    void applyNtpServerTime(serverIp);
  }, [applyNtpServerTime, isValidIpAddress, serviceNtpServer, topologyConnections, topologyDevices, deviceStates]);

  const [selectedIotDeviceId, setSelectedIotDeviceId] = useState<string>('');
  const selectedIotDevice = useMemo(
    () => iotDevices.find((d) => d.id === selectedIotDeviceId) || null,
    [iotDevices, selectedIotDeviceId]
  );

  const [iotSensorType, setIotSensorType] = useState<'temperature' | 'sound' | 'motion' | 'humidity' | 'light'>('temperature');
  const [iotKind, setIotKind] = useState<'cooler' | 'lamp' | 'heater' | 'sensor'>('sensor');
  const [iotCollaborationEnabled, setIotCollaborationEnabled] = useState(false);
  const [iotDataStore, setIotDataStore] = useState('');

  // Scan for available APs in the network topology dynamically - returns one entry per AP (allows duplicates)
  const availableSSIDs = useMemo(() => {
    const results: { ssid: string; deviceId: string; deviceName: string }[] = [];
    const addedSSIDs = new Set<string>();

    // First check deviceStates (router/switch/wlc runtime state) - only AP mode
    if (deviceStates) {
      ensureDeviceStatesMap(deviceStates).forEach((state, stateId) => {
        if (stateId === deviceId) return; // skip self
        const stateDevice = topologyDevices.find(d => d.id === stateId);
        // Only router/switch/wlc can be AP, not PC
        if (!stateDevice || (stateDevice.type !== 'router' && stateDevice.type !== 'switchL2' && stateDevice.type !== 'switchL3' && stateDevice.type !== 'wlc')) return;

        // WLC broadcasts SSIDs through wlcWlans state
        if (stateDevice.type === 'wlc' && state.wlcWlans) {
          Object.values(state.wlcWlans).forEach((wlan) => {
            if (wlan.status === 'enabled' && wlan.ssid) {
              const ssidKey = wlan.ssid;
              if (!addedSSIDs.has(ssidKey)) {
                addedSSIDs.add(ssidKey);
                results.push({
                  ssid: wlan.ssid,
                  deviceId: stateId,
                  deviceName: stateDevice?.name || stateId,
                });
              }
            }
          });
          return;
        }

        const wlanPort = state.ports['wlan0'];
        const wifiMode = (wlanPort?.wifi?.mode || '').toLowerCase();
        // Only show devices in AP mode
        if (wlanPort && !wlanPort.shutdown && wifiMode === 'ap' && wlanPort.wifi?.ssid) {
          const ssidKey = wlanPort.wifi.ssid;
          if (!addedSSIDs.has(ssidKey)) {
            addedSSIDs.add(ssidKey);
            results.push({
              ssid: wlanPort.wifi.ssid,
              deviceId: stateId,
              deviceName: stateDevice?.name || stateId,
            });
          }
        }
      });
    }
    // Also check topologyDevices for web-admin saved WiFi settings (router/switch only)
    if (results.length === 0) {
      topologyDevices.forEach((device) => {
        if (device.id === deviceId) return;
        // Only router/switch can be AP, not PC
        if (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3' && device.type !== 'wlc') return;

        // WLC broadcasts SSIDs through wlcWlans state
        if (device.type === 'wlc') {
          const wlcState = deviceStates ? ensureDeviceStatesMap(deviceStates).get(device.id) : undefined;
          const wlans = wlcState?.wlcWlans || {};
          Object.values(wlans).forEach((wlan) => {
            if (wlan.status === 'enabled' && wlan.ssid) {
              const ssidKey = wlan.ssid;
              if (!addedSSIDs.has(ssidKey)) {
                addedSSIDs.add(ssidKey);
                results.push({
                  ssid: wlan.ssid,
                  deviceId: device.id,
                  deviceName: device.name,
                });
              }
            }
          });
          return;
        }

        const wifi = device.wifi;
        // Check if WiFi is enabled and in AP mode
        if (wifi?.enabled && wifi.mode === 'ap' && wifi.ssid) {
          const ssidKey = wifi.ssid;
          if (!addedSSIDs.has(ssidKey)) {
            addedSSIDs.add(ssidKey);
            results.push({
              ssid: wifi.ssid,
              deviceId: device.id,
              deviceName: device.name,
            });
          }
        }
      });
    }
    return results;
  }, [deviceStates, deviceId, topologyDevices]);
  const [errors, setErrors] = useState<Record<string, string>>({});


  // Track previous device data to detect external topology updates.
  const prevDeviceIdRef = useRef<string | null>(null);
  const prevDeviceSnapshotRef = useRef<string>('');

  // Reset tracking refs when panel becomes visible to ensure fresh sync
  useEffect(() => {
    if (isVisible) {
      prevDeviceIdRef.current = null;
      prevDeviceSnapshotRef.current = '';
    }
  }, [isVisible]);

  // Refresh local form state when switching devices or when topology data changes externally.
  useEffect(() => {
    const deviceChanged = prevDeviceIdRef.current !== deviceId;
    const nextSnapshot = JSON.stringify({
      name: deviceFromTopology?.name || deviceId,
      macAddress: deviceFromTopology?.macAddress || defaultConfig.mac,
      ipConfigMode: deviceFromTopology?.ipConfigMode || 'static',
      services: deviceFromTopology?.services || null,
      wifi: deviceFromTopology?.wifi || null,
      ip: deviceFromTopology?.ip || defaultConfig.ip,
      subnet: deviceFromTopology?.subnet || '255.255.255.0',
      gateway: deviceFromTopology?.gateway || '192.168.1.1',
      dns: deviceFromTopology?.dns || '8.8.8.8',
      ipv6: deviceFromTopology?.ipv6 || '2001:db8:acad:1::10',
      ipv6Prefix: deviceFromTopology?.ipv6Prefix || '64',
    });
    const deviceSnapshotChanged = prevDeviceSnapshotRef.current !== nextSnapshot;

    if (deviceChanged || prevDeviceIdRef.current === null || deviceSnapshotChanged) {
      prevDeviceIdRef.current = deviceId;
      prevDeviceSnapshotRef.current = nextSnapshot;

      setInternalPcHostname(deviceFromTopology?.name || deviceId);
      setPcMAC(deviceFromTopology?.macAddress || defaultConfig.mac);
      setPcIP(deviceFromTopology?.ip || defaultConfig.ip);
      setPcSubnet(deviceFromTopology?.subnet || '255.255.255.0');
      setPcGateway(deviceFromTopology?.gateway || '192.168.1.1');
      setPcDNS(deviceFromTopology?.dns || '8.8.8.8');
      setPcIPv6(deviceFromTopology?.ipv6 || '2001:db8:acad:1::10');
      setPcIPv6Prefix(deviceFromTopology?.ipv6Prefix || '64');
      setIpConfigMode(deviceFromTopology?.ipConfigMode || 'static');
      setServiceDnsEnabled(deviceFromTopology?.services?.dns?.enabled ?? false);
      setServiceDnsRecords(deviceFromTopology?.services?.dns?.records || []);
      setServiceHttpEnabled(deviceFromTopology?.services?.http?.enabled ?? false);
      setServiceHttpContent(deviceFromTopology?.services?.http?.content || t.helloWorld);
      setServiceFtpEnabled(deviceFromTopology?.services?.ftp?.enabled ?? false);
      setServiceFtpFiles(deviceFromTopology?.services?.ftp?.files || [
        { name: 'readme.txt', size: 1280, modifiedAt: new Date().toISOString() },
      ]);
      setServiceMailEnabled(deviceFromTopology?.services?.mail?.enabled ?? false);
      setServiceMailDomain(deviceFromTopology?.services?.mail?.domain || 'local.lan');
      setServiceMailUsername(deviceFromTopology?.services?.mail?.username || 'user');
      setServiceMailPassword(deviceFromTopology?.services?.mail?.password || 'mail123');

      let inboxFromStorage = null;
      let sentFromStorage = null;
      if (typeof window !== 'undefined') {
        try {
          const storedInbox = localStorage.getItem(`mail_inbox_${deviceId}`);
          if (storedInbox) inboxFromStorage = JSON.parse(storedInbox);
          const storedSent = localStorage.getItem(`mail_sent_${deviceId}`);
          if (storedSent) sentFromStorage = JSON.parse(storedSent);
        } catch (_e) { }
      }
      setServiceMailInbox(inboxFromStorage || deviceFromTopology?.services?.mail?.inbox || []);
      setServiceMailSent(sentFromStorage || deviceFromTopology?.services?.mail?.sent || []);
      setServiceNtpEnabled(deviceFromTopology?.services?.ntp?.enabled ?? false);
      setServiceNtpServer(deviceFromTopology?.services?.ntp?.server || '');
      setServiceNtpServerPreset(
        deviceFromTopology?.services?.ntp?.server === 'pool.ntp.org'
          ? 'pool.ntp.org'
          : deviceFromTopology?.services?.ntp?.server === 'time.google.com'
            ? 'time.google.com'
            : deviceFromTopology?.services?.ntp?.server === 'time.cloudflare.com'
              ? 'time.cloudflare.com'
              : deviceFromTopology?.services?.ntp?.server === 'local-clock'
                ? 'local-clock'
                : 'custom'
      );
      setServiceNtpDate(deviceFromTopology?.services?.ntp?.date || new Date().toISOString().slice(0, 10));
      setServiceNtpTime(deviceFromTopology?.services?.ntp?.time || new Date().toTimeString().slice(0, 8));
      setServiceDhcpEnabled(deviceFromTopology?.services?.dhcp?.enabled ?? false);
      setServiceDhcpPools(deviceFromTopology?.services?.dhcp?.pools || []);

      setDnsFormDomain('');
      setDnsFormAddress('');
      setDhcpForm({
        poolName: '',
        defaultGateway: '',
        dnsServer: '',
        startIp: '',
        subnetMask: '255.255.255.0',
        maxUsers: 50,
      });
      setEditingDhcpIndex(null);
      setWifiEnabled(deviceFromTopology?.wifi?.enabled ?? false);
      setWifiSSID(deviceFromTopology?.wifi?.ssid ?? '');
      setWifiSecurity(deviceFromTopology?.wifi?.security ?? 'open');
      setWifiPassword(deviceFromTopology?.wifi?.password ?? '');
      setWifiChannel(deviceFromTopology?.wifi?.channel ?? '2.4GHz');
      setWifiBSSID(deviceFromTopology?.wifi?.bssid ?? '');
    }
  }, [defaultConfig.ip, defaultConfig.mac, deviceFromTopology, deviceId]);

  useEffect(() => {
    if (!iotDevices.length) {
      setTimeout(() => setSelectedIotDeviceId(''), 0);
      return;
    }
    if (!selectedIotDeviceId || !iotDevices.some((d) => d.id === selectedIotDeviceId)) {
      setTimeout(() => setSelectedIotDeviceId(iotDevices[0].id), 0);
    }
  }, [iotDevices, selectedIotDeviceId]);

  useEffect(() => {
    if (!selectedIotDeviceId) return;
    const device = iotDevices.find((d) => d.id === selectedIotDeviceId);
    if (!device) return;
    // Defer state updates outside the effect to avoid cascading renders
    const timer = setTimeout(() => {
      setIotSensorType(device.iot?.sensorType || 'temperature');
      setIotKind(device.iot?.kind || 'sensor');
      setIotCollaborationEnabled(!!device.iot?.collaborationEnabled);
      setIotDataStore(device.iot?.dataStore || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedIotDeviceId]);

  // When tablet powers on or opens, navigate to initial or home screen
  const initialNavDoneRef = useRef(false);
  useEffect(() => {
    if (isVisible) {
      if (!isPcPoweredOff) {
        const targetTab = initialTab || 'home';
        setTimeout(() => setActiveTab(targetTab), 0);
        tabletHistoryRef.current = [targetTab];
        tabletHistoryIndexRef.current = 0;
        onNavigate?.(targetTab);
        initialNavDoneRef.current = true;
      }
    } else {
      initialNavDoneRef.current = false;
    }
  }, [isVisible, isPcPoweredOff, initialTab, onNavigate]);

  const validateIP = (ip: string) => {
    const parts = ip.trim().split('.');
    return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  };

  const validateIPv6 = (ipv6: string) => {
    // Basic IPv6 validation - allows compressed and full formats
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ipv6);
  };

  // Validate and sync global state
  const syncToGlobal = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!validateIP(pcIP)) newErrors.ip = 'Geçersiz IP';
    if (!isValidMAC(pcMAC)) newErrors.mac = 'Geçersiz MAC';
    if (ipConfigMode === 'static') {
      if (pcSubnet && !validateIP(pcSubnet)) newErrors.subnet = 'Geçersiz Subnet';
      if (pcGateway && !validateIP(pcGateway)) newErrors.gateway = 'Geçersiz Gateway';
      if (pcDNS && !validateIP(pcDNS)) newErrors.dns = 'Geçersiz DNS';
    }
    if (pcIPv6 && !validateIPv6(pcIPv6)) newErrors.ipv6 = 'Geçersiz IPv6';

    setErrors(newErrors);

    if (deviceId) {
      // Sync config for PC and IoT devices
      const deviceType = topologyDevices.find(d => d.id === deviceId)?.type;
      if (deviceType !== 'pc' && deviceType !== 'iot') return;

      window.dispatchEvent(new CustomEvent('update-topology-device-config', {
        detail: {
          deviceId: deviceId,
          config: {
            name: internalPcHostname,
            ipConfigMode,
            ip: pcIP,
            macAddress: isValidMAC(pcMAC) ? normalizeMAC(pcMAC) : pcMAC,
            subnet: pcSubnet,
            gateway: pcGateway,
            dns: pcDNS,
            ipv6: pcIPv6,
            ipv6Prefix: pcIPv6Prefix,
            services: {
              dns: {
                enabled: serviceDnsEnabled,
                records: serviceDnsRecords
              },
              http: {
                enabled: serviceHttpEnabled,
                content: serviceHttpContent || t.helloWorld
              },
              ftp: {
                enabled: serviceFtpEnabled,
                files: serviceFtpFiles
              },
              mail: {
                enabled: serviceMailEnabled,
                domain: serviceMailDomain,
                username: serviceMailUsername,
                password: serviceMailPassword,
                inbox: serviceMailInbox,
                sent: serviceMailSent
              },
              ntp: {
                enabled: serviceNtpEnabled,
                server: serviceNtpServer,
                date: serviceNtpDate,
                time: serviceNtpTime
              },
              dhcp: {
                enabled: serviceDhcpEnabled,
                pools: serviceDhcpPools
              }
            },
            wifi: {
              enabled: wifiEnabled,
              ssid: wifiSSID,
              bssid: wifiBSSID,
              security: wifiSecurity,
              password: wifiPassword,
              channel: wifiChannel,
              mode: 'client'
            }
          }
        }
      }));
    }
  }, [internalPcHostname, ipConfigMode, pcIP, pcMAC, pcSubnet, pcGateway, pcDNS, pcIPv6, pcIPv6Prefix, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceFtpEnabled, serviceFtpFiles, serviceMailEnabled, serviceMailDomain, serviceMailUsername, serviceMailPassword, serviceMailInbox, serviceMailSent, serviceNtpEnabled, serviceNtpServer, serviceNtpDate, serviceNtpTime, serviceDhcpEnabled, serviceDhcpPools, wifiEnabled, wifiSSID, wifiBSSID, wifiSecurity, wifiPassword, wifiChannel, deviceId, topologyDevices]);

  const dispatchDeviceConfig = useCallback((config: Partial<CanvasDevice>) => {
    if (!deviceId) return;
    const nextConfig: Partial<CanvasDevice> = { ...config };
    if (config.services) {
      nextConfig.services = {
        ...(deviceFromTopology?.services || {}),
        ...config.services,
        ftp: {
          ...(deviceFromTopology?.services?.ftp || {}),
          ...(config.services.ftp || {}),
          enabled: config.services.ftp?.enabled ?? deviceFromTopology?.services?.ftp?.enabled ?? false,
        },
        mail: {
          ...(deviceFromTopology?.services?.mail || {}),
          ...(config.services.mail || {}),
          enabled: config.services.mail?.enabled ?? deviceFromTopology?.services?.mail?.enabled ?? false,
        },
        ntp: {
          ...(deviceFromTopology?.services?.ntp || {}),
          ...(config.services.ntp || {}),
          enabled: config.services.ntp?.enabled ?? deviceFromTopology?.services?.ntp?.enabled ?? false,
        },
      };
    }
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config: nextConfig }
    }));
  }, [deviceId, deviceFromTopology?.services]);

  const validateIpField = useCallback((ip: string) => {
    if (validateIP(ip)) {
      const duplicateDevices = topologyDevices.filter(d => d.id !== deviceId && d.ip === ip);
      if (duplicateDevices.length > 0) {
        const names = duplicateDevices.map(d => d.name || d.id).join(', ');
        setErrors(prev => ({ ...prev, ip: t.ipAlreadyInUse.replace('{names}', names) }));
      } else {
        setErrors(prev => { const { ip: _, ...rest } = prev; return rest; });
      }
      let updatedSubnet = pcSubnet;
      const firstOctet = ip.split('.')[0];
      if (firstOctet) {
        const octetNum = parseInt(firstOctet, 10);
        if (!isNaN(octetNum)) {
          let autoSubnet = '255.255.255.0';
          if (octetNum >= 1 && octetNum <= 126) autoSubnet = '255.0.0.0';
          else if (octetNum >= 128 && octetNum <= 191) autoSubnet = '255.255.0.0';
          else if (octetNum >= 192 && octetNum <= 223) autoSubnet = '255.255.255.0';
          updatedSubnet = autoSubnet;
          setPcSubnet(autoSubnet);
        }
      }
      dispatchDeviceConfig({ ip, subnet: updatedSubnet, ipConfigMode: 'static' });
    } else {
      setErrors(prev => ({ ...prev, ip: t.invalidIpAddress }));
    }
  }, [topologyDevices, deviceId, language, pcSubnet, dispatchDeviceConfig]);

  const validateSubnetField = useCallback((subnet: string) => {
    if (subnet && !validateIP(subnet)) {
      setErrors(prev => ({ ...prev, subnet: t.invalidSubnetMaskMsg }));
    } else {
      setErrors(prev => { const { subnet: _, ...rest } = prev; return rest; });
    }
    dispatchDeviceConfig({ subnet, ipConfigMode: 'static' });
  }, [language, dispatchDeviceConfig]);

  const saveIotConfig = useCallback((showToast: boolean = true) => {
    if (!selectedIotDeviceId) return;
    // Determine data flow direction based on kind
    const dataFlowDirection: 'input' | 'output' | 'input/output' =
      iotKind === 'sensor' ? 'input' :
        (iotKind === 'cooler' || iotKind === 'lamp' || iotKind === 'heater') ? 'output' : 'input';
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId: selectedIotDeviceId,
        config: {
          iot: {
            ...selectedIotDevice?.iot,
            sensorType: iotSensorType,
            kind: iotKind,
            dataFlowDirection,
            collaborationEnabled: iotCollaborationEnabled,
            dataStore: iotDataStore,
          }
        }
      }
    }));
    if (showToast) {
      toast({
        title: t.iotSaved,
        description: t.iotSavedDescription,
      });
    }
  }, [selectedIotDeviceId, selectedIotDevice, iotSensorType, iotKind, iotCollaborationEnabled, iotDataStore, language]);

  // Keep saveIotConfig in a ref to avoid circular dependency
  const saveIotConfigRef = useRef(saveIotConfig);
  useEffect(() => {
    saveIotConfigRef.current = saveIotConfig;
  }, [saveIotConfig]);

  // Auto-save IoT config on change (debounced) - uses ref to avoid circular dependency
  useEffect(() => {
    if (!selectedIotDeviceId) return;
    const handler = setTimeout(() => {
      saveIotConfigRef.current(false);
    }, 500);
    return () => clearTimeout(handler);
  }, [selectedIotDeviceId, iotSensorType, iotKind, iotCollaborationEnabled, iotDataStore]);

  // Keep syncToGlobal in a ref to avoid circular dependency with topology updates
  const syncToGlobalRef = useRef(syncToGlobal);
  useEffect(() => {
    syncToGlobalRef.current = syncToGlobal;
  }, [syncToGlobal]);

  // Update pcIpRef when pcIP changes
  useEffect(() => {
    pcIpRef.current = pcIP;
  }, [pcIP]);

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatchDeviceConfig({
        services: {
          dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
          http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
          ftp: {
            enabled: serviceFtpEnabled,
          },
          mail: {
            enabled: serviceMailEnabled,
            domain: serviceMailDomain,
            username: serviceMailUsername,
            password: serviceMailPassword,
            inbox: serviceMailInbox,
            sent: serviceMailSent,
          },
          ntp: {
            enabled: serviceNtpEnabled,
            server: serviceNtpServer,
            date: serviceNtpDate,
            time: serviceNtpTime,
          },
          dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools },
        },
      });
    }, 250);

    return () => clearTimeout(handler);
  }, [
    dispatchDeviceConfig,
    serviceDnsEnabled,
    serviceDnsRecords,
    serviceHttpEnabled,
    serviceHttpContent,
    serviceFtpEnabled,
    serviceMailEnabled,
    serviceMailDomain,
    serviceMailUsername,
    serviceMailPassword,
    serviceMailInbox,
    serviceMailSent,
    serviceNtpEnabled,
    serviceNtpServer,
    serviceNtpDate,
    serviceNtpTime,
    serviceDhcpEnabled,
    serviceDhcpPools,
  ]);

  // Local output for Desktop (Local) - initialize from prop if available
  const getInitialPcOutput = (): OutputLine[] => {
    if (pcOutputs?.has(deviceId)) {
      return pcOutputs.get(deviceId) as OutputLine[];
    }
    return [{
      id: '1',
      type: 'output',
      content: 'OS [Version 10.0.26200.8037]\n(c) OS Corporation. All rights reserved.\n\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ' + (deviceFromTopology?.ip || '0.0.0.0') + '\n   Subnet Mask . . . . . . . . . . : ' + (deviceFromTopology?.subnet || '255.255.255.0') + '\n   Default Gateway . . . . . . . . . : ' + (deviceFromTopology?.gateway || '0.0.0.0') + '\n   IPv6 Address. . . . . . . . . . : ' + (deviceFromTopology?.ipv6 || '2001:db8:acad:1::10') + '\n'
    }];
  };

  const [pcOutput, setPcOutput] = useState<OutputLine[]>(() => getInitialPcOutput());
  const [httpAppContent, setHttpAppContent] = useState<string | null>(null);
  const [httpAppUrl, setHttpAppUrl] = useState<string>('');
  const [httpAppTitle, setHttpAppTitle] = useState<string>('HTTP Page');
  const [httpAppDeviceId, setHttpAppDeviceId] = useState<string | null>(null);
  const routerActiveTabRef = useRef<string>('wireless');
  const [showUrlSuggestions, setShowUrlSuggestions] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if web browser is open
      if (httpAppContent) return;

      const target = event.target as HTMLElement;
      // Don't close if clicking a portal (like Select dropdown, tooltips, etc.) or detached element
      if (
        !target ||
        !document.body.contains(target) ||
        target?.closest('[data-radix-portal]') ||
        target?.closest('[role="listbox"]') ||
        target?.closest('.radix-select-content') ||
        target?.closest('.radix-popper-content') ||
        target?.closest('[data-radix-select-viewport]') ||
        target?.closest('[data-radix-select-content]') ||
        target?.closest('[data-radix-select-trigger]') ||
        target?.closest('[role="combobox"]') ||
        target?.closest('[data-state="open"]') ||
        target?.closest('[role="dialog"]')
      ) {
        return;
      }

      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add listener with a small delay to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose, httpAppContent]);

  // Collect URL suggestions from existing IPs and predefined links
  const urlSuggestions = useMemo(() => {
    const suggestions: string[] = [];

    // Add predefined links with http:// prefix
    suggestions.push('http://iot-panel');

    // Add IPs from all devices in topology with http:// prefix
    topologyDevices.forEach(device => {
      if (device.ip && device.ip !== '0.0.0.0') {
        suggestions.push(`http://${device.ip}`);
      }
    });

    // Remove duplicates
    return [...new Set(suggestions)];
  }, [topologyDevices]);

  // Filter suggestions based on current input
  const filteredSuggestions = useMemo(() => {
    if (!httpAppUrl) return urlSuggestions;
    const lowerInput = httpAppUrl.toLowerCase();
    return urlSuggestions.filter(s =>
      s.toLowerCase().includes(lowerInput)
    );
  }, [httpAppUrl, urlSuggestions]);

  // Regenerate IoT panel content when dependencies change
  useEffect(() => {
    if (!httpAppDeviceId && (httpAppUrl === 'iot-panel' || httpAppUrl === 'http://iot-panel')) {
      const iotPanelContent = generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]);
      setTimeout(() => setHttpAppContent(iotPanelContent), 0);
    }
  }, [iotDevices, topologyConnections, language, httpAppUrl, httpAppDeviceId]);
  const [browserWindow, setBrowserWindow] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('pc-browser-window-state') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          x: typeof parsed.x === 'number' ? parsed.x : 40,
          y: typeof parsed.y === 'number' ? parsed.y : 140,
          width: typeof parsed.width === 'number' ? parsed.width : 960,
          height: typeof parsed.height === 'number' ? parsed.height : 400,
        };
      } catch (err) {
        errorHandler.logError(STORAGE_ERRORS.LOAD_FAILED({ key: 'pc-browser-window-state', savedValue: saved, parseError: String(err) }));
        return { x: 40, y: 140, width: 960, height: 400 };
      }
    }
    return { x: 40, y: 140, width: 960, height: 400 };
  });

  useEffect(() => {
    localStorage.setItem('pc-browser-window-state', JSON.stringify(browserWindow));
  }, [browserWindow]);

  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeStateRef = useRef<{
    side: 'left' | 'right' | 'bottom' | 'top' | 'se' | 'sw' | 'ne' | 'nw';
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Browser window ESC key handler
  useEffect(() => {
    if (!httpAppContent) return;

    const handleBrowserWindowEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setHttpAppUrl('');
        setHttpAppContent(null);
        setHttpAppDeviceId(null);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleBrowserWindowEscape, true);
    return () => {
      window.removeEventListener('keydown', handleBrowserWindowEscape, true);
    };
  }, [httpAppContent]);

  // Global Navigation handler (Escape key & Mobile Back Button)
  useEffect(() => {
    if (!isVisible) return;

    const handleNavigation = () => {
      // If search is open, let it handle itself
      if (searchOpen) return;

      // If HTTP content is open, close it first
      if (httpAppContent) {
        setHttpAppContent(null);
        setHttpAppDeviceId(null);
        return true; // Handled
      }

      // If a program is open, go back to home
      if (activeTab !== 'home') {
        goHome();
        return true; // Handled
      } else {
        // If already on home, close the panel
        onClose();
        return true; // Handled
      }
    };

    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (handleNavigation()) {
          e.preventDefault();
        }
      }
    };

    const handlePopState = (_e: PopStateEvent) => {
      if (handleNavigation()) {
        // Re-push state to prevent browser from actually going back to previous page
        // only if we want to stay in the panel
        if (isVisible) {
          window.history.pushState({ pcPanel: true }, '', window.location.href);
        }
      }
    };

    // Push initial state for back button tracking on mobile
    if (isMobile) {
      window.history.pushState({ pcPanel: true }, '', window.location.href);
      window.addEventListener('popstate', handlePopState);
    }

    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (isMobile) {
        window.removeEventListener('popstate', handlePopState);
      }
    };
  }, [isVisible, activeTab, goHome, onClose, httpAppContent, searchOpen, isMobile]);

  // Sync pcOutput when deviceId changes or pcOutputs prop updates
  useEffect(() => {
    if (pcOutputs?.has(deviceId)) {
      setTimeout(() => setPcOutput(pcOutputs.get(deviceId) ?? []), 0);
    } else {
      setTimeout(() => setPcOutput([{
        id: '1',
        type: 'output',
        content: 'OS [Version 10.0.26200.8037]\n(c) OS Corporation. All rights reserved.\n'
      }]), 0);
    }
  }, [deviceId, pcOutputs]);

  // Disconnect console when PC powers off
  useEffect(() => {
    if (isPcPoweredOff && isConsoleConnected) {
      setTimeout(() => setIsConsoleConnected(false), 0);
      setTimeout(() => setConsoleConnectionTime(0), 0);
      // Don't clear connectedDeviceId so we can reconnect when power comes back on
    }
  }, [isPcPoweredOff, isConsoleConnected]);

  // Reconnect console when PC powers on if it was connected before
  useEffect(() => {
    if (!isPcPoweredOff && connectedDeviceId && !isConsoleConnected) {
      // Auto-reconnect to the same device
      const device = topologyDevices.find(d => d.id === connectedDeviceId);
      if (device && device.status !== 'offline') {
        setTimeout(() => setConsoleConnectionTime(Date.now()), 0);
        setTimeout(() => setIsConsoleConnected(true), 0);
      }
    }
  }, [isPcPoweredOff, connectedDeviceId, isConsoleConnected, topologyDevices]);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const prevIpConfigModeRef = useRef(ipConfigMode);

  const highlightText = useCallback((text: string) => {
    const q = searchQuery.trim();
    if (!q) return text;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(safe, 'gi');
    const parts = text.split(re);
    const matches = text.match(re);
    if (!matches) return text;
    const out: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) out.push(<span key={`p-${i}`}>{parts[i]}</span>);
      if (matches[i]) {
        out.push(
          <mark
            key={`m-${i}`}
            className={`px-0.5 rounded ${isDark ? 'bg-accent-500/20 text-accent-200' : 'bg-accent-200 text-secondary-900'}`}
          >
            {matches[i]}
          </mark>
        );
      }
    }
    return <>{out}</>;
  }, [searchQuery, isDark]);

  const getConsoleDeviceCallback = useCallback(() => {
    return getConsoleDevice({
      deviceId,
      topologyDevices,
      topologyConnections: topologyConnections as unknown as CanvasConnection[]
    });
  }, [deviceId, topologyConnections, topologyDevices]);

  const consoleDevice = getConsoleDeviceCallback();


  // Synchronized Console Output from Global State
  const activeConsoleOutput = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return [];
    const allOutput = deviceOutputs?.get(connectedDeviceId) || [];
    return allOutput.filter((line: TerminalOutput) => (line.timestamp || 0) >= consoleConnectionTime);
  }, [isConsoleConnected, connectedDeviceId, deviceOutputs, consoleConnectionTime]);

  // Auto-focus input when visible, tab changes, or command completes
  useEffect(() => {
    if (!isVisible || (activeTab !== 'desktop' && activeTab !== 'terminal')) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isVisible, activeTab, pcOutput, activeConsoleOutput]);

  // Always keep CMD/Console views pinned to the latest output
  useEffect(() => {
    if (!outputRef.current) return;
    const el = outputRef.current;
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [pcOutput, activeConsoleOutput, activeTab]);

  const handleCopyAll = useCallback(async () => {
    try {
      const lines = (activeTab === 'desktop' ? pcOutput : activeConsoleOutput).map((line: OutputLine | TerminalOutput) => {
        if (line.type === 'command') return `${activeTab === 'desktop' ? 'C:\\>' : (line.prompt || '>')}${line.content}`;
        return line.content;
      });
      await navigator.clipboard.writeText(lines.join('\n'));
      toast({
        title: t.copyToastSuccessTitle,
        description: t.copyToastSuccessDescription,
      });
    } catch (_err) {
      errorHandler.logError(CLIPBOARD_ERRORS.COPY_FAILED({ contentLength: pcOutput.length, activeTab }));
      toast({
        title: t.copyToastFailureTitle,
        description: t.copyToastFailureDescription,
        variant: "destructive",
      });
    }
  }, [activeTab, pcOutput, activeConsoleOutput, t]);

  const connectedConsoleDevice = useMemo(() => {
    if (!connectedDeviceId) return null;
    return topologyDevices.find(d => d.id === connectedDeviceId) || null;
  }, [connectedDeviceId, topologyDevices]);

  const isConsoleTargetPoweredOff = isConsoleConnected && !!connectedConsoleDevice && connectedConsoleDevice.status === 'offline';
  const isCmdInputDisabled = isPcPoweredOff;
  const consoleAwaitingPassword = !!(connectedDeviceId && deviceStates?.get(connectedDeviceId)?.awaitingPassword);
  const isConsoleInputDisabled = isPcPoweredOff || !isConsoleConnected || isConsoleTargetPoweredOff;

  // Detect password/confirm states from device state
  const consoleNeedsPassword = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return false;
    const state = deviceStates?.get(connectedDeviceId);
    // Only show password prompt if explicitly awaiting password
    return state?.awaitingPassword === true;
  }, [isConsoleConnected, connectedDeviceId, deviceStates]);

  const consoleReloadPending = false;

  const consoleConfirmDialog = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return null;
    // Don't show confirm dialog if password is still being entered
    if (consoleNeedsPassword) return null;
    const output = deviceOutputs?.get(connectedDeviceId) || [];
    const confirmLine = output.find((line: TerminalOutput) => line.type === 'output' && /\[confirm\]/i.test(line.content));
    if (confirmLine) {
      return { show: true, message: confirmLine.content };
    }
    return null;
  }, [isConsoleConnected, connectedDeviceId, deviceOutputs, consoleNeedsPassword]);

  // Keep password prompts focused so SSH/Telnet input is immediately usable.
  useEffect(() => {
    if (activeTab !== 'terminal' || !isConsoleConnected) return;
    if (!consoleNeedsPassword && !consoleConfirmDialog?.show && !consoleReloadPending) return;
    const timer = setTimeout(() => {
      if (consoleNeedsPassword) setInput('');
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab, isConsoleConnected, consoleNeedsPassword, consoleConfirmDialog?.show, consoleReloadPending]);

  const getCommandMode = useCallback((): string => {
    if (activeTab === 'terminal' && isConsoleConnected && connectedDeviceId && deviceStates) {
      const state = deviceStates.get(connectedDeviceId);
      const mode = state?.currentMode || 'user';
      if (mode === 'config-if-range') return 'interface';
      return mode;
    }
    return 'user';
  }, [activeTab, isConsoleConnected, connectedDeviceId, deviceStates]);

  const getAutocompleteSuggestionsCallback = useCallback((value: string) => {
    return getAutocompleteSuggestions({
      value,
      activeTab,
      topologyDevices,
      deviceStates,
      getCommandMode
    });
  }, [activeTab, getCommandMode, topologyDevices, deviceStates]);

  const renderAutocompleteSuggestions = useMemo(
    () => getAutocompleteSuggestionsCallback(input),
    [getAutocompleteSuggestionsCallback, input]
  );

  const shouldShowAutocomplete = useMemo(
    () => showAutocomplete && input.trim().length > 0 && renderAutocompleteSuggestions.length > 0,
    [showAutocomplete, input, renderAutocompleteSuggestions]
  );
  const httpAppSrcDoc = useMemo(() => {
    if (!httpAppContent) return '';
    const trimmed = httpAppContent.trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return httpAppContent;
    }
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; }
      body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
    </style>
  </head>
  <body>${httpAppContent}</body>
</html>`;
  }, [httpAppContent]);

  const buildCompletedInput = useCallback((selected: string) => {
    const mode = getCommandMode();
    const { contextTokens } = expandCommandContext(mode, input);
    const prefix = contextTokens.join(' ');
    return prefix ? `${prefix} ${selected}` : selected;
  }, [input, getCommandMode]);

  const completeAutocompleteSelection = useCallback((selected: string) => {
    const completed = buildCompletedInput(selected);
    setInput(completed);
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    setAutocompleteNavigated(false);
    return completed;
  }, [buildCompletedInput]);

  useEffect(() => {
    if (!showAutocomplete) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (autocompleteRef.current && target && !autocompleteRef.current.contains(target)) {
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        setAutocompleteNavigated(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAutocomplete]);

  const [consolePasswordAttempted, setConsolePasswordAttempted] = useState(false);

  const consoleAuthenticated = useMemo(() => {
    if (!connectedDeviceId) return true;
    return deviceStates?.get(connectedDeviceId)?.consoleAuthenticated !== false;
  }, [connectedDeviceId, deviceStates]);

  useEffect(() => {
    if (!connectedDeviceId) return;
    if (consolePasswordAttempted && consoleAwaitingPassword) {
      toast({
        title: t.consolePasswordErrorTitle,
        description: t.consolePasswordErrorDescription,
        variant: 'destructive',
      });
      setTimeout(() => setConsolePasswordAttempted(false), 0);
      setTimeout(() => setIsConsoleConnected(false), 0);
      setTimeout(() => setConnectedDeviceId(null), 0);
    } else if (consolePasswordAttempted && !consoleAwaitingPassword && consoleAuthenticated) {
      setTimeout(() => setIsConsoleConnected(true), 0);
      setTimeout(() => setConsolePasswordAttempted(false), 0);
    } else if (consolePasswordAttempted && !consoleAwaitingPassword && !consoleAuthenticated) {
      setTimeout(() => setConsolePasswordAttempted(false), 0);
      setTimeout(() => setIsConsoleConnected(false), 0);
      setTimeout(() => setConnectedDeviceId(null), 0);
    }
  }, [consoleAuthenticated, consoleAwaitingPassword, consolePasswordAttempted, connectedDeviceId, t]);

  const connectionErrorText = useMemo(() => {
    if (!isPcPoweredOff && !isConsoleTargetPoweredOff) return '';
    return t.pcConnectionError;
  }, [isPcPoweredOff, isConsoleTargetPoweredOff, t]);

  const addLocalOutput = useCallback((type: OutputLine['type'], content: string, prompt?: string) => {
    // HTML çıktısını pop-up (modal) içinde aç
    if (type === 'html') {
      const safe = sanitizeHTTPContent(content || '') || ' ';
      const withLineBreaks = safe.replace(/\r?\n/g, '<br />');
      setHttpAppContent(withLineBreaks.trim() ? withLineBreaks : '<em>No HTTP content</em>');
      setHttpAppTitle(t.httpManagementPage);

      // Terminalde bilgilendir
      setPcOutput(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'success',
        content: t.httpPageOpened
      }]);
      setTimeout(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }, 0);
      return;
    }

    const newLine: OutputLine = { id: Math.random().toString(36).substr(2, 9), type, content, prompt };
    setPcOutput(prev => [...prev, newLine]);
    setTimeout(() => {
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }, 0);
  }, [language]);

  // Get connected IoT devices for a router/AP
  const getConnectedIotDevices = useCallback((routerId: string) => {
    const routerDevice = topologyDevices.find(d => d.id === routerId);
    if (!routerDevice) return [];

    const routerSsid = routerDevice.wifi?.ssid || '';
    const routerSecurity = routerDevice.wifi?.security || 'open';

    return topologyDevices
      .filter(d => {
        if (d.type !== 'iot') return false;

        let isWifiConnected = false;
        if (routerSsid) {
          isWifiConnected = d.wifi?.bssid === routerId ||
            (d.wifi?.ssid === routerSsid && d.wifi?.security === routerSecurity);
        }

        const isWiredConnected = topologyConnections.some(c =>
          (c.sourceDeviceId === routerId && c.targetDeviceId === d.id) ||
          (c.targetDeviceId === routerId && c.sourceDeviceId === d.id)
        );

        return isWifiConnected || isWiredConnected;
      })
      .map(d => {
        const isWiredConnected = topologyConnections.some(c =>
          (c.sourceDeviceId === routerId && c.targetDeviceId === d.id) ||
          (c.targetDeviceId === routerId && c.sourceDeviceId === d.id)
        );

        let deviceIp = d.ip;
        if (isWiredConnected && !deviceIp) {
          const routerIp = routerDevice?.ip || '192.168.1.1';
          const baseIpParts = routerIp.split('.');
          const usedIps = new Set<string>();
          topologyDevices.forEach(td => {
            if (td.ip && td.ip.startsWith(baseIpParts[0] + '.' + baseIpParts[1] + '.' + baseIpParts[2])) {
              usedIps.add(td.ip);
            }
          });
          for (let i = 100; i <= 254; i++) {
            const testIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
            if (!usedIps.has(testIp)) {
              deviceIp = testIp;
              break;
            }
          }
          if (!deviceIp) deviceIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.150`;

          // Assign IP asynchronously to avoid state mutation during render
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('update-topology-device-config', {
              detail: {
                deviceId: d.id,
                config: {
                  ip: deviceIp,
                  ipConfigMode: 'dhcp',
                  gateway: routerIp,
                  subnet: routerDevice?.subnet || '255.255.255.0',
                  dns: routerIp,
                },
              },
            }));
          }, 0);
        }

        return {
          id: d.id,
          name: d.name,
          sensorType: d.iot?.sensorType || 'temperature',
          connected: !!(isWiredConnected || (d.status === 'online' && d.wifi?.enabled)),
          ip: deviceIp,
          isWired: isWiredConnected,
        };
      });
  }, [topologyDevices, topologyConnections]);

  // Get available IoT devices that can be connected (not connected to this AP)
  const getAvailableIotDevices = useCallback((routerId: string) => {
    const routerDevice = topologyDevices.find(d => d.id === routerId);
    if (!routerDevice) return [];

    const routerSsid = routerDevice.wifi?.ssid || '';

    return topologyDevices
      .filter(d => {
        if (d.type !== 'iot') return false;

        const isWiredConnected = topologyConnections.some(c =>
          (c.sourceDeviceId === routerId && c.targetDeviceId === d.id) ||
          (c.targetDeviceId === routerId && c.sourceDeviceId === d.id)
        );

        if (isWiredConnected) return false;

        if (!routerSsid) return true;
        const isConnectedToThisAp = d.wifi?.bssid === routerId || d.wifi?.ssid === routerSsid;
        return !isConnectedToThisAp;
      })
      .map(d => ({
        id: d.id,
        name: d.name,
        sensorType: d.iot?.sensorType || 'temperature',
        currentSsid: d.wifi?.ssid || undefined,
      }));
  }, [topologyDevices, topologyConnections]);

  const canReachTargetIp = useCallback((targetIp: string, options: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string } = { protocol: 'icmp' }) => {
    const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', options);

    // Global packet capture integration
    if (result.capturedPackets && result.capturedPackets.length > 0 && typeof window !== 'undefined') {
      result.capturedPackets.forEach(pkt => {
        window.dispatchEvent(new CustomEvent('packet-captured', { detail: pkt }));
      });
    }

    return result.success;
  }, [deviceId, topologyDevices, topologyConnections, deviceStates, language]);

  const isValidIpv4 = useCallback((value: string) => validateIP(value), []);
  const isValidIpv6 = useCallback((value: string) => validateIPv6(value), []);

  const isDhcpPoolCompatibleForClientCallback = useCallback((
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    serverDevice: CanvasDevice | undefined,
    serverState?: SwitchState
  ) => {
    return isDhcpPoolCompatibleForClient({
      poolGateway,
      poolStartIp,
      poolSubnetMask,
      serverDevice,
      serverState,
      clientDevice: deviceFromTopology,
      deviceStates,
      topologyConnections: topologyConnections as unknown as CanvasConnection[],
      isValidIpv4,
      getDeviceWifiConfig,
    });
  }, [deviceFromTopology, deviceStates, topologyConnections, isValidIpv4]);

  const isLoopbackTarget = useCallback((target: string) => target.trim() === '127.0.0.1', []);

  const hasGatewayForTargetCallback = useCallback((targetIp: string) => {
    return hasGatewayForTarget({
      pcIP,
      targetIp,
      pcSubnet,
      pcGateway,
      isValidIpv4
    });
  }, [pcGateway, pcIP, pcSubnet, isValidIpv4]);

  const normalizeLookupTargetCallback = useCallback((raw: string) => {
    return normalizeLookupTarget(raw);
  }, []);

  const resolveDeviceNameTargetCallback = useCallback((raw: string) => {
    return resolveDeviceNameTarget({
      raw,
      internalPcHostname,
      deviceId,
      topologyDevices,
      deviceStates,
      isValidIpv4
    });
  }, [deviceId, deviceStates, internalPcHostname, isValidIpv4, topologyDevices]);

  const resolveDomainWithDnsServicesCallback = useCallback((domain: string) => {
    return resolveDomainWithDnsServices({
      domain,
      pcDNS,
      topologyDevices,
      deviceStates,
      canReachTargetIp,
      isValidIpv4,
      isValidIpv6
    });
  }, [canReachTargetIp, isValidIpv4, isValidIpv6, pcDNS, topologyDevices, deviceStates]);

  const getDnsRecordDisplay = useCallback((record: { domain: string; address: string }) => {
    const chain: string[] = [record.domain, record.address.trim()];
    const startAddress = record.address.trim().toLowerCase();
    const isIp = !startAddress || isValidIpv4(startAddress) || isValidIpv6(startAddress);
    const recordType = isIp
      ? (isValidIpv6(startAddress)
        ? (language === 'tr' ? 'AAAA Kaydı (IPv6 Address)' : 'AAAA Record (IPv6 Address)')
        : (language === 'tr' ? 'A Kaydı (Address Record)' : 'A Record (Address Record)'))
      : (language === 'tr' ? 'CNAME Kaydı (Canonical Name Record)' : 'CNAME Record (Canonical Name Record)');
    if (isIp) {
      return `${recordType}: ${chain.join(' -> ')}`;
    }

    const visited = new Set<string>([record.domain.toLowerCase(), startAddress]);
    let currentDomain = startAddress;

    for (let depth = 0; depth < 10; depth += 1) {
      const nextRecord = serviceDnsRecords.find((r) => r.domain.toLowerCase() === currentDomain);
      if (!nextRecord) break;

      const nextAddress = nextRecord.address.trim();
      if (!nextAddress) break;
      chain.push(nextAddress);

      const normalizedNext = nextAddress.toLowerCase();
      if (isValidIpv4(normalizedNext) || isValidIpv6(normalizedNext)) break;
      if (visited.has(normalizedNext)) break;

      visited.add(normalizedNext);
      currentDomain = normalizedNext;
    }

    return `${recordType}: ${chain.join(' -> ')}`;
  }, [isValidIpv4, isValidIpv6, language, serviceDnsRecords]);

  const findHttpServerByTargetCallback = useCallback((target: string) => {
    return findHttpServerByTarget({
      target,
      deviceId,
      topologyDevices,
      deviceStates,
      canReachTargetIp,
      resolveDomainWithDnsServices: resolveDomainWithDnsServicesCallback,
    });
  }, [canReachTargetIp, resolveDomainWithDnsServicesCallback, topologyDevices, deviceStates, deviceId]);

  const openWebPage = useCallback((rawTarget?: string, rawUrl?: string) => {
    const rawInput = (rawTarget || '').trim();
    const normalizedInput = rawInput || '192.168.1.10';
    let lookupTarget = normalizeLookupTargetCallback(normalizedInput);
    let displayUrl = normalizedInput.startsWith('http://') || normalizedInput.startsWith('https://')
      ? normalizedInput
      : `http://${normalizedInput}`;
    if (rawUrl && rawUrl.trim().length > 0) {
      const candidate = rawUrl.trim();
      displayUrl = candidate.startsWith('http://') || candidate.startsWith('https://') ? candidate : `http://${candidate}`;
      lookupTarget = normalizeLookupTargetCallback(candidate);
    }

    // Handle special IoT Web Panel URL
    if (rawTarget === 'http://iot-panel' || rawTarget === 'iot-panel') {
      setHttpAppUrl(displayUrl);
      setHttpAppContent(generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]));
      setHttpAppTitle(t.iotWebPanel);
      setHttpAppDeviceId(null);
      return;
    }

    // Handle special IoT Device URL
    if (rawTarget?.startsWith('iot://iot-device/')) {
      const targetDeviceId = rawTarget.split('iot://iot-device/')[1];
      const targetDevice = topologyDevices.find(d => d.id === targetDeviceId);
      if (targetDevice && targetDevice.type === 'iot') {
        const isActive = targetDevice.iot?.collaborationEnabled ?? true;
        const isPoweredOff = targetDevice.status === 'offline';
        const kind = targetDevice.iot?.kind || 'sensor';
        const rules = targetDevice.iot?.rules || [];
        const sensorType = targetDevice.iot?.sensorType || 'temperature';
        const dataFlowDirection = targetDevice.iot?.dataFlowDirection || (kind === 'sensor' ? 'input' : 'output');
        const iotDevicePage = generateIotDevicePageContent(targetDevice.id, targetDevice.name || targetDevice.id, language, isActive, isPoweredOff, kind, rules, sensorType, iotDevices, dataFlowDirection, topologyDevices);
        setHttpAppUrl(displayUrl);
        setHttpAppContent(iotDevicePage);
        setHttpAppTitle(`${targetDevice.name || targetDevice.id} ${t.deviceManagement}`);
        setHttpAppDeviceId(targetDevice.id);
      }
      return;
    }

    // Browser-style inputs can include protocol/path/query. We only resolve host/IP.
    try {
      const parsed = new URL(displayUrl);
      lookupTarget = parsed.hostname || lookupTarget;
      displayUrl = parsed.toString();
    } catch (_err) {
      // URL parsing failed - using raw input as fallback
    }

    // Strip brackets from IPv6 hostnames if present (e.g. [2001:db8::1] -> 2001:db8::1)
    if (lookupTarget.startsWith('[') && lookupTarget.endsWith(']')) {
      lookupTarget = lookupTarget.slice(1, -1);
    }

    const target = lookupTarget.trim() || '192.168.1.10';
    const namedTarget = resolveDeviceNameTargetCallback(target);
    const resolvedTargetIp = namedTarget?.ip || target;

    const isIpV6 = isValidIpv6(resolvedTargetIp);
    if (!isIpV6 && !isValidIpv4(resolvedTargetIp)) {
      // Domain lookup
      if (!isValidIpv4(pcDNS) && !isValidIpv6(pcDNS)) {
        addLocalOutput('error', t.dnsAddressRequired);
        return;
      }
      if (isValidIpv4(pcDNS) && !hasGatewayForTargetCallback(pcDNS)) {
        addLocalOutput('error', t.dnsGatewayRequired);
        return;
      }
    } else if (isValidIpv4(resolvedTargetIp)) {
      if (!isLoopbackTarget(resolvedTargetIp) && !hasGatewayForTargetCallback(resolvedTargetIp)) {
        addLocalOutput('error', t.targetGatewayRequired);
        return;
      }
    } else if (isIpV6) {
      if (!pcIPv6) {
        addLocalOutput('error', language === 'tr' ? 'PC\'de IPv6 adresi yapılandırılmamış.' : 'IPv6 address is not configured on this PC.');
        return;
      }
    }

    // Check firewall for HTTP traffic
    const connectivityResult = checkConnectivity(deviceId, resolvedTargetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '80' });
    if (!connectivityResult.success && connectivityResult.error?.includes('firewall')) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('Access Denied');
      setHttpAppContent(`
        <main style="padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;">
          <div style="font-size:64px;margin-bottom:16px;">🛡️</div>
          <h1 style="margin:0 0 8px;font-size:24px;color:var(--color-error-500);">${language === 'tr' ? 'Erişim Engellendi' : 'Access Denied'}</h1>
          <p style="margin:0 0 12px;font-size:16px;color:var(--color-muted-foreground);">${connectivityResult.error}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-error-100);color:var(--color-error-800);font-size:13px;">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', connectivityResult.error);
      return;
    }

    const httpServer = findHttpServerByTargetCallback(resolvedTargetIp);
    setHttpAppUrl(displayUrl);

    if (!httpServer) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('404 Not Found');
      setHttpAppContent(`
        <main style="padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
          <h1 style="margin:0 0 8px;font-size:28px;">404</h1>
          <p style="margin:0 0 12px;font-size:16px;">${language === 'tr' ? 'Sayfa bulunamadı' : 'Page not found'}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:var(--color-secondary-100);color:var(--color-secondary-900);">${displayUrl}</code>
        </main>
      `);
      addLocalOutput('error', `404 Not Found: ${target}`);
    } else if (isRouterDevice(httpServer)) {
      const runtimeState = deviceStates?.get(httpServer.id);
      const connectedIot = getConnectedIotDevices(httpServer.id);
      const availableIot = getAvailableIotDevices(httpServer.id);
      const adminPage = generateRouterAdminPage(httpServer, language, runtimeState, connectedIot, availableIot);
      setHttpAppDeviceId(httpServer.id);
      setHttpAppContent(adminPage);
      setHttpAppTitle(language === 'tr' ? 'Yönlendirici Yönetimi' : 'Router Management');
      addLocalOutput('success', language === 'tr'
        ? 'HTTP sayfası yeni pencerede açıldı.'
        : 'HTTP page opened in a new window.');
    } else {
      setHttpAppDeviceId(null);
      addLocalOutput('html', httpServer.services?.http?.content || t.helloWorld);
    }
  }, [addLocalOutput, deviceStates, findHttpServerByTargetCallback, getAvailableIotDevices, getConnectedIotDevices, hasGatewayForTargetCallback, isLoopbackTarget, isValidIpv4, isValidIpv6, language, normalizeLookupTargetCallback, pcDNS, resolveDeviceNameTargetCallback, t, iotDevices, topologyDevices, generateIotWebPanelContent, generateIotDevicePageContent, httpAppDeviceId, topologyConnections, pcIPv6]);

  useEffect(() => {
    const handleRouterAdminMessage = (event: MessageEvent) => {
      // Security: Validate origin to prevent cross-site scripting or data injection from malicious frames.
      // We allow window.location.origin for same-origin messages and 'null' for local srcdoc iframes.
      if (event.origin !== window.location.origin && event.origin !== 'null') {
        return;
      }

      const data = event.data;

      if (!data) {
        return;
      }

      if (data.type === 'router-admin-toast') {
        const payload = data.payload || {};
        const variant = payload.type === 'error' ? 'destructive' : undefined;
        toast({
          title: payload.type === 'error'
            ? (language === 'tr' ? 'Hata' : 'Error')
            : payload.type === 'success'
              ? (language === 'tr' ? 'Başarılı' : 'Success')
              : payload.type === 'warning'
                ? (language === 'tr' ? 'Uyarı' : 'Warning')
                : (language === 'tr' ? 'Bilgi' : 'Info'),
          description: payload.message || '',
          variant,
        });
        return;
      }

      // Track which tab is active in the router admin page
      if (data.type === 'router-admin-tab-change') {
        routerActiveTabRef.current = data.tab || 'wireless';
        return;
      }

      // For WiFi save operations, require httpAppDeviceId match
      const isRouterSpecificMessage = data.type === 'router-admin-save-wifi';
      if (isRouterSpecificMessage && httpAppDeviceId && data.deviceId && data.deviceId !== httpAppDeviceId) {
        return;
      }

      // IoT messages are always accepted (deviceId in payload)


      const allocateIotIpConfig = (routerDeviceId: string, excludeDeviceId?: string) => {
        const routerDevice = topologyDevices.find((d) => d.id === routerDeviceId);
        const routerState = routerDeviceId ? deviceStates?.get(routerDeviceId) : undefined;
        let routerIp = routerDevice?.ip || '';
        let routerSubnet = routerDevice?.subnet || '';

        // Prefer the actual configured interface IP/subnet when the topology card is stale.
        if (routerState?.ports) {
          for (const port of Object.values(routerState.ports)) {
            if (!port.shutdown && port.ipAddress) {
              routerIp = port.ipAddress;
              routerSubnet = port.subnetMask || routerSubnet;
              break;
            }
          }
        }

        if (!routerIp) routerIp = '192.168.1.1';
        if (!routerSubnet) routerSubnet = '255.255.255.0';
        const baseIpParts = routerIp.split('.');
        let newIp = '';

        const usedIps = new Set<string>();
        topologyDevices.forEach((d) => {
          if (d.id === excludeDeviceId) return;
          if (d.ip && d.ip.startsWith(baseIpParts[0] + '.' + baseIpParts[1] + '.' + baseIpParts[2])) {
            usedIps.add(d.ip);
          }
        });

        for (let i = 100; i <= 254; i++) {
          const testIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
          if (!usedIps.has(testIp)) {
            newIp = testIp;
            break;
          }
        }

        if (!newIp) {
          for (let i = 2; i < 100; i++) {
            const testIp = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
            if (!usedIps.has(testIp) && testIp !== routerIp) {
              newIp = testIp;
              break;
            }
          }
        }

        if (!newIp) {
          const fallbackUsedIps = new Set<string>();
          topologyDevices.forEach((d) => {
            if (d.id !== excludeDeviceId && d.ip) fallbackUsedIps.add(d.ip);
          });
          return {
            ip: generateRandomLinkLocalIpv4(fallbackUsedIps),
            gateway: '0.0.0.0',
            subnet: '255.255.0.0',
            dns: '0.0.0.0',
            source: 'apipa' as const,
          };
        }

        return {
          ip: newIp,
          gateway: routerIp,
          subnet: routerSubnet,
          dns: routerIp,
          source: 'dhcp' as const,
        };
      };

      // Handle WiFi settings save
      if (data.type === 'router-admin-save-wifi') {
        const device = topologyDevices.find((d) => d.id === httpAppDeviceId);
        const payload = data.payload || {};
        const nextWifi = {
          enabled: Boolean(payload.enabled),
          ssid: String(payload.ssid || ''),
          security: payload.security || 'open',
          password: String(payload.password || ''),
          channel: payload.channel || '2.4GHz',
          mode: payload.mode || 'ap',
          hidden: Boolean(payload.hidden),
          maxClients: Number(payload.maxClients || 32),
          bssid: device?.wifi?.bssid || '',
        };

        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: httpAppDeviceId,
            config: {
              wifi: nextWifi,
            },
          },
        }));

        addLocalOutput(
          'success',
          language === 'tr'
            ? `${device?.name || 'Cihaz'} WiFi ayarları uygulandı.`
            : `${device?.name || 'Device'} WiFi settings applied.`
        );
      }

      // Handle IoT device connect (existing device)
      if (data.type === 'router-admin-connect-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) {
          logger.warn('No iotDeviceId provided');
          return;
        }

        const iotDevice = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!iotDevice || iotDevice.type !== 'iot') {
          logger.warn('IoT device not found or wrong type:', iotDeviceId);
          return;
        }

        const ipConfig = allocateIotIpConfig(httpAppDeviceId || '', iotDeviceId);

        // Update the IoT device's WiFi config to connect to this AP
        const updatedWifi = {
          enabled: true,
          ssid: payload.ssid || '',
          security: payload.security || 'open',
          password: payload.password || '',
          channel: payload.channel || '2.4GHz',
          mode: 'client' as const,
          bssid: httpAppDeviceId,
        };

        // Dispatch event to update the IoT device with IP
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: iotDeviceId,
            config: {
              wifi: updatedWifi,
              status: 'online',
              ip: ipConfig.ip,
              ipConfigMode: 'dhcp' as const,
              gateway: ipConfig.gateway,
              subnet: ipConfig.subnet,
              dns: ipConfig.dns,
            },
          },
        }));

        addLocalOutput(
          'success',
          language === 'tr'
            ? `IoT cihaz "${iotDevice.name}" ağa bağlandı. IP: ${ipConfig.ip}`
            : `IoT device "${iotDevice.name}" connected to the network. IP: ${ipConfig.ip}`
        );
      }

      if (data.type === 'router-admin-renew-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) return;

        const iotDevice = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!iotDevice || iotDevice.type !== 'iot') return;

        const ipConfig = allocateIotIpConfig(httpAppDeviceId || '', iotDeviceId);

        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: iotDeviceId,
            config: {
              ip: ipConfig.ip,
              ipConfigMode: 'dhcp' as const,
              gateway: ipConfig.gateway,
              subnet: ipConfig.subnet,
              dns: ipConfig.dns,
            },
          },
        }));

        addLocalOutput(
          'success',
          language === 'tr'
            ? `IoT cihaz "${iotDevice.name}" için IP yenilendi: ${ipConfig.ip}`
            : `Renewed IP for IoT device "${iotDevice.name}": ${ipConfig.ip}`
        );

        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }
      }

      // Handle IoT device delete
      if (data.type === 'router-admin-delete-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) return;

        if (onDeleteDevice) {
          onDeleteDevice(iotDeviceId);
        }
      }

      // Handle IoT device disconnect
      if (data.type === 'router-admin-disconnect-iot') {
        const payload = data.payload || {};
        const iotDeviceId = payload.iotDeviceId;

        if (!iotDeviceId) {
          logger.warn('No iotDeviceId provided for disconnect');
          return;
        }

        const iotDevice = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!iotDevice || iotDevice.type !== 'iot') {
          logger.warn('IoT device not found or wrong type for disconnect:', iotDeviceId);
          return;
        }

        // Update the IoT device's WiFi config to disconnect (disable WiFi)
        const updatedWifi = {
          enabled: false,
          ssid: '',
          security: 'open' as const,
          password: '',
          channel: '2.4GHz' as const,
          mode: 'client' as const,
          bssid: undefined,
        };

        // Update ports to clear WiFi connection
        const updatedPorts = iotDevice.ports.map(p =>
          p.id === 'wlan0'
            ? { ...p, status: 'disconnected' as const, ipAddress: undefined, subnetMask: undefined, wifi: { ssid: '', security: 'open' as const, channel: '2.4GHz' as const, mode: 'client' as const } }
            : p
        );

        // Dispatch event to update the IoT device
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: iotDeviceId,
            config: {
              wifi: updatedWifi,
              ip: '',
              subnet: '',
              gateway: '',
              ports: updatedPorts,
            },
          },
        }));

        // Delete any physical cable connections between this AP and the IoT device
        if (topologyConnections) {
          topologyConnections.forEach(conn => {
            if ((conn.sourceDeviceId === httpAppDeviceId && conn.targetDeviceId === iotDeviceId) ||
              (conn.targetDeviceId === httpAppDeviceId && conn.sourceDeviceId === iotDeviceId)) {
              window.dispatchEvent(new CustomEvent('delete-topology-connection', {
                detail: { connectionId: (conn as CanvasConnection).id }
              }));
            }
          });
        }
        addLocalOutput(
          'success',
          language === 'tr'
            ? `IoT cihaz "${iotDevice.name}" ağdan çıkarıldı.`
            : `IoT device "${iotDevice.name}" disconnected from the network.`
        );

        // Refresh router admin page to update device list
        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }
      }

      // Handle refresh devices request (after bulk operations)
      if (data.type === 'router-admin-refresh-devices') {
        if (httpAppDeviceId) {
          const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
          if (targetDevice && isRouterDevice(targetDevice)) {
            const runtimeState = deviceStates?.get(httpAppDeviceId);
            const connectedIot = getConnectedIotDevices(httpAppDeviceId);
            const availableIot = getAvailableIotDevices(httpAppDeviceId);
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
            setHttpAppContent(refreshed);
          }
        }
      }

      // Handle messages from IoT Web Panel
      if (data.type === 'open-iot-device') {
        const { deviceId } = data;
        openWebPage(`iot://iot-device/${deviceId}`);
      }

      // Handle back to IoT list message
      if (data.type === 'back-to-iot-list') {
        setHttpAppDeviceId(null);
        setHttpAppContent(null); // Clear content to force regeneration
        setTimeout(() => {
          openWebPage('http://iot-panel');
        }, 50); // Small delay to ensure state updates
      }

      // Handle toggle IoT device status message
      if (data.type === 'toggle-iot-device') {
        const { deviceId, active } = data;
        const targetDevice = topologyDevices.find((d) => d.id === deviceId);
        if (targetDevice && targetDevice.type === 'iot') {
          window.dispatchEvent(new CustomEvent('update-topology-device-config', {
            detail: {
              deviceId: deviceId,
              config: {
                iot: {
                  ...targetDevice.iot,
                  collaborationEnabled: active,
                },
              },
            },
          }));
          addLocalOutput(
            'success',
            language === 'tr'
              ? `IoT cihaz "${targetDevice.name || deviceId}" durumu ${active ? 'aktif edildi.' : 'pasif edildi.'}`
              : `IoT device "${targetDevice.name || deviceId}" status ${active ? 'activated.' : 'deactivated.'}`
          );
        }
      }

      // Handle update IoT rules message
      if (data.type === 'update-iot-rules') {
        const { deviceId, rules } = data;
        const targetDevice = topologyDevices.find((d) => d.id === deviceId);
        if (targetDevice && targetDevice.type === 'iot') {
          window.dispatchEvent(new CustomEvent('update-topology-device-config', {
            detail: {
              deviceId: deviceId,
              config: {
                iot: {
                  ...targetDevice.iot,
                  rules: rules,
                },
              },
            },
          }));
          addLocalOutput(
            'success',
            language === 'tr'
              ? `IoT cihaz "${targetDevice.name || deviceId}" kuralları güncellendi.`
              : `IoT device "${targetDevice.name || deviceId}" rules updated.`
          );
        }
      }
    };

    window.addEventListener('message', handleRouterAdminMessage);
    return () => window.removeEventListener('message', handleRouterAdminMessage);
  }, [addLocalOutput, httpAppDeviceId, language, topologyDevices, topologyConnections, getConnectedIotDevices, getAvailableIotDevices, openWebPage]);

  useEffect(() => {
    if (!httpAppContent || !isMobile || typeof window === 'undefined') return;
    setTimeout(() => setBrowserWindow((prev) => ({
      ...prev,
      x: 8,
      y: Math.max(80, prev.y),
      width: Math.max(280, window.innerWidth - 16),
    })), 0);
  }, [httpAppContent, isMobile]);

  useEffect(() => {
    if (!httpAppDeviceId) return;
    const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
    if (!targetDevice || !isRouterDevice(targetDevice)) return;

    const runtimeState = deviceStates?.get(httpAppDeviceId);
    const connectedIot = getConnectedIotDevices(httpAppDeviceId);
    const availableIot = getAvailableIotDevices(httpAppDeviceId);
    const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot, undefined, undefined, routerActiveTabRef.current);
    setHttpAppContent(refreshed);
  }, [httpAppDeviceId, topologyDevices, deviceStates, getConnectedIotDevices, getAvailableIotDevices]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      // Cancel previous animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (dragStateRef.current) {
          const dragState = dragStateRef.current;
          const dx = event.clientX - dragState.startX;
          const dy = event.clientY - dragState.startY;
          setBrowserWindow((prev) => ({
            ...prev,
            x: dragState.originX + dx,
            y: dragState.originY + dy,
          }));
        } else if (resizeStateRef.current) {
          const state = resizeStateRef.current;
          const dx = event.clientX - state.startX;
          const dy = event.clientY - state.startY;
          setBrowserWindow((prev) => {
            const minW = 420, minH = 260;
            if (state.side === 'bottom') return { ...prev, height: Math.max(minH, state.originH + dy) };
            if (state.side === 'right') return { ...prev, width: Math.max(minW, state.originW + dx) };
            if (state.side === 'top') {
              const nh = Math.max(minH, state.originH - dy);
              return { ...prev, height: nh, y: Math.max(0, state.originY - (nh - state.originH)) };
            }
            if (state.side === 'left') {
              const nw = Math.max(minW, state.originW - dx);
              return { ...prev, width: nw, x: Math.max(0, state.originX - (nw - state.originW)) };
            }
            if (state.side === 'se') return { ...prev, width: Math.max(minW, state.originW + dx), height: Math.max(minH, state.originH + dy) };
            if (state.side === 'sw') {
              const nw = Math.max(minW, state.originW - dx);
              return { ...prev, width: nw, x: Math.max(0, state.originX - (nw - state.originW)), height: Math.max(minH, state.originH + dy) };
            }
            if (state.side === 'ne') {
              const nh = Math.max(minH, state.originH - dy);
              return { ...prev, width: Math.max(minW, state.originW + dx), height: nh, y: Math.max(0, state.originY - (nh - state.originH)) };
            }
            if (state.side === 'nw') {
              const nwW = Math.max(minW, state.originW - dx);
              const nwH = Math.max(minH, state.originH - dy);
              return { ...prev, width: nwW, x: Math.max(0, state.originX - (nwW - state.originW)), height: nwH, y: Math.max(0, state.originY - (nwH - state.originH)) };
            }
            return prev;
          });
        }
      });
    };

    const handlePointerEnd = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      dragStateRef.current = null;
      resizeStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  // Add multi-line output with delay between each line for realistic typing effect
  const addMultilineOutput = useCallback(async (type: OutputLine['type'], content: string, delayMs: number = 50) => {
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isLast = i === lines.length - 1;

      const newLine: OutputLine = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        content: line,
        prompt: i === 0 ? undefined : '' // Empty prompt for continuation lines
      };

      setPcOutput(prev => [...prev, newLine]);

      // Scroll after each line
      setTimeout(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }, 0);

      // Wait before next line (except for last)
      if (!isLast && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }, []);

  const hasPhysicalPathToDevice = useCallback((targetDeviceId: string) => {
    if (!targetDeviceId || targetDeviceId === deviceId) return false;
    const sourceDevice = topologyDevices.find((d) => d.id === deviceId);
    const targetDevice = topologyDevices.find((d) => d.id === targetDeviceId);
    if (!sourceDevice || !targetDevice) return false;
    if (sourceDevice.status === 'offline' || targetDevice.status === 'offline') return false;

    // DHCP discover can also traverse an implicit Wi-Fi link.
    const sourceWifi = getDeviceWifiConfig(sourceDevice, deviceStates);
    const targetWifi = getDeviceWifiConfig(targetDevice, deviceStates);
    if (
      sourceDevice.type === 'pc' &&
      sourceWifi?.enabled &&
      (sourceWifi.mode === 'client' || sourceWifi.mode === 'sta') &&
      sourceWifi.ssid &&
      targetWifi?.enabled &&
      targetWifi.mode === 'ap' &&
      targetWifi.ssid &&
      sourceWifi.ssid.toLowerCase() === targetWifi.ssid.toLowerCase() &&
      getWirelessSignalStrength(sourceDevice, topologyDevices, deviceStates) > 0
    ) {
      return true;
    }

    const queue: string[] = [deviceId];
    const visited = new Set<string>([deviceId]);

    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === targetDeviceId) return true;

      const neighbors = topologyConnections
        .filter((c) => c.active !== false && (c.sourceDeviceId === current || c.targetDeviceId === current))
        .map((c) => (c.sourceDeviceId === current ? c.targetDeviceId : c.sourceDeviceId));

      for (const next of neighbors) {
        if (visited.has(next)) continue;
        const nextDevice = topologyDevices.find((d) => d.id === next);
        if (!nextDevice || nextDevice.status === 'offline') continue;
        visited.add(next);
        queue.push(next);
      }
    }

    return false;
  }, [deviceId, topologyConnections, topologyDevices, deviceStates]);







  const formatMacForArp = useCallback((mac?: string) => {
    if (!mac) return '';
    const hex = mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    if (hex.length !== 12) return mac.toLowerCase();
    return hex.match(/.{1,2}/g)?.join('-') || mac.toLowerCase();
  }, []);

  const buildArpTableOutput = useCallback(() => {
    // Get all devices including IoT that have IP and MAC
    const allDevices = topologyDevices.filter((d) =>
      d.id !== deviceId && !!d.ip && !!d.macAddress && canReachTargetIp(d.ip)
    );

    // Also include IoT devices that are connected to the same network
    const connectedIoTDevices = topologyDevices.filter((d) => {
      if (d.type !== 'iot') return false;
      if (!d.ip || !d.macAddress) return false;
      if (d.id === deviceId) return false;
      // Check if IoT is reachable (same subnet or through gateway)
      return canReachTargetIp(d.ip);
    });

    // Combine and deduplicate
    const combinedDevices = [...allDevices, ...connectedIoTDevices];
    const uniqueDevices = Array.from(new Map(combinedDevices.map(d => [d.id, d])).values());

    const reachableHosts = uniqueDevices.map((d) => ({
      ip: d.ip,
      mac: formatMacForArp(d.macAddress),
      type: d.type === 'iot' ? 'dynamic (IoT)' : 'dynamic',
    }));

    if (reachableHosts.length === 0) {
      return `Interface: ${pcIP} --- 0x3\n  Internet Address      Physical Address      Type`;
    }

    const rows = reachableHosts
      .map((h) => `  ${h.ip.padEnd(20)} ${h.mac.padEnd(21)} ${h.type}`)
      .join('\n');

    return `Interface: ${pcIP} --- 0x3\n  Internet Address      Physical Address      Type\n${rows}`;
  }, [canReachTargetIp, deviceId, formatMacForArp, pcIP, topologyDevices]);

  const ipToNumber = useCallback((ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
    return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
  }, []);

  const numberToIp = useCallback((num: number) => {
    const a = (num >>> 24) & 255;
    const b = (num >>> 16) & 255;
    const c = (num >>> 8) & 255;
    const d = num & 255;
    return `${a}.${b}.${c}.${d}`;
  }, []);

  const getDhcpLease = useCallback((): { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null => {
    try {
      const usedIps = new Set(
        topologyDevices
          .filter((d) => d.id !== deviceId && validateIP(d.ip || ''))
          .map((d) => d.ip)
      );

      // 1. Check PC DHCP servers from topology
      const pcServers = topologyDevices.filter(
        (d) =>
          d.id !== deviceId &&
          d.services?.dhcp?.enabled &&
          (d.services?.dhcp?.pools?.length || 0) > 0 &&
          !!d.ip &&
          (hasPhysicalPathToDevice(d.id) || canReachTargetIp(d.ip))
      );

      for (const server of pcServers) {
        const pools = server.services?.dhcp?.pools || [];
        for (const pool of pools) {
          if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
            continue;
          }
          if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, server)) {
            continue;
          }
          const start = ipToNumber(pool.startIp);
          if (start === null) continue;
          const maxUsers = Math.max(1, Number(pool.maxUsers || 1));

          // Check if pool is full
          let availableCount = 0;
          for (let i = 0; i < maxUsers; i += 1) {
            const candidate = numberToIp(start + i);
            if (!usedIps.has(candidate)) {
              availableCount++;
            }
          }

          // Skip full pools
          if (availableCount === 0) {
            continue;
          }

          for (let i = 0; i < maxUsers; i += 1) {
            const candidate = numberToIp(start + i);
            if (!usedIps.has(candidate)) {
              return {
                ip: candidate,
                subnetMask: pool.subnetMask,
                gateway: pool.defaultGateway,
                dns: pool.dnsServer,
                serverName: server.name,
                poolName: pool.poolName,
              };
            }
          }
        }
      }

      // 2. Check Router/Switch DHCP servers from deviceStates (CLI-configured pools)
      const safeDeviceStates = ensureDeviceStatesMap(deviceStates);

      if (safeDeviceStates) {
        for (const [deviceId_, state] of safeDeviceStates.entries()) {
          if (deviceId_ === deviceId) continue;
          const device = topologyDevices.find(d => d.id === deviceId_);
          if (!device || (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3')) continue;

          // Check DHCP pools from both runtime services mirror and raw CLI state.
          // Some flows may have dhcpPools populated while services mirror is stale.
          const mirroredPools = state.services?.dhcp?.pools || [];
          const cliPools = Object.entries(state.dhcpPools || {}).map(([poolName, pool]: [string, { network?: string; subnetMask?: string; startIp?: string; defaultRouter?: string; dnsServer?: string; maxUsers?: number | string }]) => {
            const networkBase = typeof pool?.network === 'string' ? pool.network : '';
            const networkPrefix = networkBase.split('.').slice(0, 3).join('.');
            const fallbackStart = networkPrefix ? `${networkPrefix}.100` : '192.168.1.100';
            const fallbackGateway = networkPrefix ? `${networkPrefix}.1` : '192.168.1.1';
            return {
              poolName,
              subnetMask: pool?.subnetMask || '255.255.255.0',
              startIp: pool?.startIp || fallbackStart,
              defaultGateway: pool?.defaultRouter || fallbackGateway,
              dnsServer: pool?.dnsServer || '8.8.8.8',
              maxUsers: Number(pool?.maxUsers || 50),
            };
          });
          const dhcpPools = [...mirroredPools];
          for (const pool of cliPools) {
            if (!dhcpPools.some((p: DhcpPoolConfig) => p.poolName === pool.poolName)) {
              dhcpPools.push(pool);
            }
          }
          if (dhcpPools.length === 0) continue;

          // DHCP DISCOVER is L2 broadcast; client has no usable IP yet.
          // In that case, only physical path is required (no server IP prerequisite).
          let deviceIp = device.ip;
          if (!deviceIp && state.ports) {
            for (const portId in state.ports) {
              const port = state.ports[portId];
              if (port.ipAddress && !port.shutdown) {
                deviceIp = port.ipAddress;
                break;
              }
            }
          }

          // Check if PC can reach this DHCP server:
          // - no client IP yet => physical path is enough
          // - client already has IP => normal reachability check by server IP
          const canReach = hasPhysicalPathToDevice(deviceId_) || (!!deviceIp && canReachTargetIp(deviceIp));
          if (!canReach) continue;

          // Use this device's DHCP pools
          for (const pool of dhcpPools) {
            if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
              continue;
            }
            if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, device, state)) {
              continue;
            }
            const start = ipToNumber(pool.startIp);
            if (start === null) continue;
            const maxUsers = Math.max(1, Number(pool.maxUsers || 50));

            // Check if pool is full
            let availableCount = 0;
            for (let i = 0; i < maxUsers; i += 1) {
              const candidate = numberToIp(start + i);
              if (!usedIps.has(candidate)) {
                availableCount++;
              }
            }

            // Skip full pools
            if (availableCount === 0) {
              continue;
            }

            for (let i = 0; i < maxUsers; i += 1) {
              const candidate = numberToIp(start + i);
              if (!usedIps.has(candidate)) {
                return {
                  ip: candidate,
                  subnetMask: pool.subnetMask,
                  gateway: pool.defaultGateway,
                  dns: pool.dnsServer,
                  serverName: device.name || state.hostname || deviceId_,
                  poolName: pool.poolName,
                };
              }
            }
          }
        }
      }

      return null;
    } catch (err) {
      errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'getDhcpLease', error: String(err) }));
      return null;
    }
  }, [canReachTargetIp, deviceId, deviceStates, hasPhysicalPathToDevice, ipToNumber, isDhcpPoolCompatibleForClientCallback, numberToIp, topologyDevices, validateIP]);

  // Check if DHCP pools are available and get failure reason
  const checkDhcpAvailability = useCallback((): { available: boolean; reason: string } => {
    const usedIps = new Set(
      topologyDevices
        .filter((d) => d.id !== deviceId && validateIP(d.ip || ''))
        .map((d) => d.ip)
    );

    // Check PC DHCP servers
    const pcServers = topologyDevices.filter(
      (d) =>
        d.id !== deviceId &&
        d.services?.dhcp?.enabled &&
        (d.services?.dhcp?.pools?.length || 0) > 0 &&
        !!d.ip &&
        (hasPhysicalPathToDevice(d.id) || canReachTargetIp(d.ip))
    );

    // Check Router/Switch DHCP servers availability
    let hasAnyDhcpService = pcServers.length > 0;

    // Safety check: ensure deviceStates is iterable
    const safeDeviceStates = ensureDeviceStatesMap(deviceStates);

    if (!hasAnyDhcpService && safeDeviceStates) {
      for (const [deviceId_, state] of safeDeviceStates.entries()) {
        if (deviceId_ === deviceId) continue;
        const device = topologyDevices.find(d => d.id === deviceId_);
        if (!device || (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3')) continue;

        const mirroredPools = state.services?.dhcp?.pools || [];
        const cliPools = Object.entries(state.dhcpPools || {}).length;
        if (mirroredPools.length > 0 || cliPools > 0) {
          hasAnyDhcpService = true;
          break;
        }
      }
    }

    // If no DHCP service available at all
    if (!hasAnyDhcpService) {
      return { available: false, reason: 'no_dhcp_service' };
    }

    for (const server of pcServers) {
      const pools = server.services?.dhcp?.pools || [];
      for (const pool of pools) {
        if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
          continue;
        }
        if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, server)) {
          continue;
        }
        const start = ipToNumber(pool.startIp);
        if (start === null) continue;
        const maxUsers = Math.max(1, Number(pool.maxUsers || 1));

        let availableCount = 0;
        for (let i = 0; i < maxUsers; i += 1) {
          const candidate = numberToIp(start + i);
          if (!usedIps.has(candidate)) {
            availableCount++;
          }
        }

        if (availableCount > 0) {
          return { available: true, reason: '' };
        }
      }
    }

    // Check Router/Switch DHCP servers
    if (deviceStates) {
      for (const [deviceId_, state] of ensureDeviceStatesMap(deviceStates).entries()) {
        if (deviceId_ === deviceId) continue;
        const device = topologyDevices.find(d => d.id === deviceId_);
        if (!device || (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3')) continue;

        const mirroredPools = state.services?.dhcp?.pools || [];
        const cliPools = Object.entries(state.dhcpPools || {}).map(([poolName, pool]: [string, { network?: string; subnetMask?: string; startIp?: string; defaultRouter?: string; dnsServer?: string; maxUsers?: number | string }]) => {
          const networkBase = typeof pool?.network === 'string' ? pool.network : '';
          const networkPrefix = networkBase.split('.').slice(0, 3).join('.');
          const fallbackStart = networkPrefix ? `${networkPrefix}.100` : '192.168.1.100';
          const fallbackGateway = networkPrefix ? `${networkPrefix}.1` : '192.168.1.1';
          return {
            poolName,
            subnetMask: pool?.subnetMask || '255.255.255.0',
            startIp: pool?.startIp || fallbackStart,
            defaultGateway: pool?.defaultRouter || fallbackGateway,
            dnsServer: pool?.dnsServer || '8.8.8.8',
            maxUsers: Number(pool?.maxUsers || 50),
          };
        });
        const dhcpPools = [...mirroredPools];
        for (const pool of cliPools) {
          if (!dhcpPools.some((p: DhcpPoolConfig) => p.poolName === pool.poolName)) {
            dhcpPools.push(pool);
          }
        }
        if (dhcpPools.length === 0) continue;

        let deviceIp = device.ip;
        if (!deviceIp && state.ports) {
          for (const portId in state.ports) {
            const port = state.ports[portId];
            if (port.ipAddress && !port.shutdown) {
              deviceIp = port.ipAddress;
              break;
            }
          }
        }

        const canReach = hasPhysicalPathToDevice(deviceId_) || (!!deviceIp && canReachTargetIp(deviceIp));
        if (!canReach) continue;

        for (const pool of dhcpPools) {
          if (!validateIP(pool.startIp) || !validateIP(pool.subnetMask) || !validateIP(pool.defaultGateway) || !validateIP(pool.dnsServer)) {
            continue;
          }
          if (!isDhcpPoolCompatibleForClientCallback(pool.defaultGateway, pool.startIp, pool.subnetMask, device, state)) {
            continue;
          }
          const start = ipToNumber(pool.startIp);
          if (start === null) continue;
          const maxUsers = Math.max(1, Number(pool.maxUsers || 50));

          let availableCount = 0;
          for (let i = 0; i < maxUsers; i += 1) {
            const candidate = numberToIp(start + i);
            if (!usedIps.has(candidate)) {
              availableCount++;
            }
          }

          if (availableCount > 0) {
            return { available: true, reason: '' };
          }
        }
      }
    }

    return { available: false, reason: 'all_pools_full' };
  }, [canReachTargetIp, deviceId, deviceStates, hasPhysicalPathToDevice, ipToNumber, isDhcpPoolCompatibleForClientCallback, numberToIp, topologyDevices, validateIP]);

  // Keep ref in sync with callback
  useEffect(() => {
    checkDhcpAvailabilityRef.current = checkDhcpAvailability;
  }, [checkDhcpAvailability]);

  const applyDhcpLease = useCallback((force = false) => {
    const lease = getDhcpLease();
    // Use refs for comparison to avoid dependency issues
    const currentPcIP = pcIpRef.current;
    const currentPcSubnet = pcSubnetRef.current;
    const currentPcGateway = pcGatewayRef.current;
    const currentPcDNS = pcDNSRef.current;

    if (!lease) {
      const usedIps = new Set(
        topologyDevices
          .filter((d) => d.id !== deviceId && validateIP(d.ip || ''))
          .map((d) => d.ip)
      );
      const linkLocalIp = generateRandomLinkLocalIpv4(usedIps);
      const linkLocalLease = {
        ip: linkLocalIp,
        subnetMask: '255.255.0.0',
        gateway: '0.0.0.0',
        dns: '0.0.0.0',
        serverName: 'link-local',
        poolName: 'APIPA',
      };
      if (!force &&
        linkLocalLease.ip === currentPcIP &&
        linkLocalLease.subnetMask === currentPcSubnet &&
        linkLocalLease.gateway === currentPcGateway &&
        linkLocalLease.dns === currentPcDNS
      ) {
        return linkLocalLease;
      }
      setPcIP(linkLocalLease.ip);
      setPcSubnet(linkLocalLease.subnetMask);
      setPcGateway(linkLocalLease.gateway);
      setPcDNS(linkLocalLease.dns);
      // Update topology to persist the link-local IP
      window.dispatchEvent(new CustomEvent('update-topology-device-config', {
        detail: {
          deviceId,
          config: {
            ip: linkLocalLease.ip,
            subnet: linkLocalLease.subnetMask,
            gateway: linkLocalLease.gateway,
            dns: linkLocalLease.dns,
            ipConfigMode: 'dhcp'
          }
        }
      }));
      return linkLocalLease;
    }
    if (!force &&
      lease.ip === currentPcIP &&
      lease.subnetMask === currentPcSubnet &&
      lease.gateway === currentPcGateway &&
      lease.dns === currentPcDNS
    ) {
      return lease;
    }
    setPcIP(lease.ip);
    setPcSubnet(lease.subnetMask);
    setPcGateway(lease.gateway);
    setPcDNS(lease.dns);
    // Update topology to persist the DHCP lease IP
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: {
        deviceId,
        config: {
          ip: lease.ip,
          subnet: lease.subnetMask,
          gateway: lease.gateway,
          dns: lease.dns,
          ipConfigMode: 'dhcp'
        }
      }
    }));
    return lease;
  }, [getDhcpLease, deviceId, topologyDevices, validateIP]); // Removed pcIP, pcSubnet, pcGateway, pcDNS - using refs instead

  // Keep ref in sync with callback to avoid dependency issues in useEffect
  useEffect(() => {
    applyDhcpLeaseRef.current = applyDhcpLease;
  }, [applyDhcpLease]);

  // When DHCP mode is selected, request a lease immediately and notify the user.
  // Also retry if topology connections change, in case we were waiting for a cable.
  // Also retry on page load if device has link-local IP (169.254.x.x) and is in DHCP mode.
  useEffect(() => {
    // Skip if DHCP button was manually clicked (toast already shown by button handler)
    if (manualDhcpClickRef.current) {
      prevIpConfigModeRef.current = ipConfigMode;
      return;
    }

    // Check if IP is link-local (APIPA) - 169.254.x.x range
    const isLinkLocal = pcIP && pcIP.startsWith('169.254.');
    // If we already have a valid non-link-local IP and we didn't just switch to DHCP mode,
    // don't try to get a new lease automatically on every connection change.
    const hasValidIp = pcIP && pcIP !== '0.0.0.0' && !isLinkLocal;

    if (ipConfigMode !== 'dhcp') {
      prevIpConfigModeRef.current = ipConfigMode;
      return;
    }

    // If mode hasn't changed AND we already have a valid IP (not link-local), don't re-trigger
    // However, if we have a link-local IP, always try to get a proper DHCP lease
    if (prevIpConfigModeRef.current === 'dhcp' && hasValidIp && !isLinkLocal) {
      return;
    }

    let lease;
    try {
      lease = applyDhcpLeaseRef.current?.(true);
    } catch (err) {
      errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'applyDhcpLease', error: String(err) }));
    }
    if (lease && lease.serverName !== 'link-local') {
      toast({
        title: t.dhcpSuccessTitle,
        description: t.dhcpSuccessDescription.replace('{ip}', lease.ip),
      });
    } else {
      // DHCP bulunamadıysa otomatik link-local (APIPA) atandı.
      if (lease && lease.serverName === 'link-local' && prevIpConfigModeRef.current !== 'dhcp') {
        toast({
          title: language === 'tr' ? 'DHCP bulunamadı' : 'DHCP not found',
          description: language === 'tr'
            ? `Link-local IP atandı: ${lease.ip}`
            : `Assigned link-local IP: ${lease.ip}`,
        });
      } else if (prevIpConfigModeRef.current !== 'dhcp') {
        // Legacy failure toast (should be rare now; kept for safety)
        try {
          const dhcpCheck = checkDhcpAvailabilityRef.current();
          let errorMessage = t.dhcpFailureDescription;
          if (dhcpCheck.reason === 'all_pools_full') {
            errorMessage = language === 'tr'
              ? 'DHCP havuzları dolu! Maksimum IP sayısına ulaşıldı.'
              : 'All DHCP pools are full! Maximum number of IP addresses reached.';
          } else if (dhcpCheck.reason === 'no_dhcp_service') {
            errorMessage = language === 'tr'
              ? 'Ağda DHCP hizmeti bulunamadı! Lütfen bir DHCP sunucusu yapılandırın.'
              : 'No DHCP service found on the network! Please configure a DHCP server.';
          }
          toast({
            title: t.dhcpFailureTitle,
            description: errorMessage,
            variant: 'destructive',
          });
        } catch (checkErr) {
          errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'checkDhcpAvailability', error: String(checkErr) }));
          toast({
            title: t.dhcpFailureTitle,
            description: t.dhcpFailureDescription,
            variant: 'destructive',
          });
        }
      }
    }

    prevIpConfigModeRef.current = ipConfigMode;
  }, [ipConfigMode, t, topologyConnections, language]); // Removed applyDhcpLease - using ref instead

  // Listen for auto-renew-dhcp event from page.tsx
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAutoRenewDhcp = (event: Event) => {
      const customEvent = event as CustomEvent<{ deviceId: string }>;
      if (customEvent.detail && customEvent.detail.deviceId === deviceId) {
        // Only trigger if this PC is in DHCP mode and has no valid IP (0.0.0.0 or 169.254.x.x)
        if (ipConfigMode === 'dhcp' && (!pcIP || pcIP === '0.0.0.0' || pcIP.startsWith('169.254.'))) {
          try {
            const lease = applyDhcpLeaseRef.current?.(true);
            if (lease && lease.serverName !== 'link-local') {
              addLocalOutput('success', `DHCP lease renewed. New IP: ${lease.ip}`);
            }
          } catch (err) {
            errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'autoRenewDhcp', error: String(err) }));
          }
        }
      }
    };

    window.addEventListener('auto-renew-dhcp', handleAutoRenewDhcp);
    return () => window.removeEventListener('auto-renew-dhcp', handleAutoRenewDhcp);
  }, [deviceId, ipConfigMode, pcIP, addLocalOutput]); // Removed applyDhcpLease - using ref instead

  const handleConnect = async () => {
    if (!consoleDevice) return;

    // Clear previous console output before connecting
    setPcOutput([]);

    setConnectedDeviceId(consoleDevice.id);
    setConsoleConnectionTime(Date.now());
    if (onExecuteDeviceCommand) {
      await onExecuteDeviceCommand(consoleDevice.id, '__CONSOLE_CONNECT__');
      const deviceState = deviceStates?.get(consoleDevice.id);
      if (!deviceState?.awaitingPassword) {
        setIsConsoleConnected(true);
      }
    } else {
      setIsConsoleConnected(true);
    }
  };

  const executeFtpPut = useCallback((fileName: string) => {
    const session = ftpSession;
    if (!session) return;
    const newFile = { name: fileName, size: 1024, modifiedAt: new Date().toISOString() };
    const nextFiles = [...(session.files || []), newFile];
    setFtpSession({ ...session, files: nextFiles });

    if (session.targetDeviceId) {
      const targetDev = topologyDevices.find(d => d.id === session.targetDeviceId);
      if (targetDev) {
        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
          detail: {
            deviceId: session.targetDeviceId,
            config: {
              services: {
                ...targetDev.services,
                ftp: {
                  ...targetDev.services?.ftp,
                  enabled: true,
                  files: [...((targetDev.services?.ftp?.files || []).filter((f: { name: string }) => f.name !== fileName)), newFile]
                }
              }
            }
          }
        }));
      }
    }

    addLocalOutput('output', `150 Opening BINARY mode data connection for ${fileName}\n226 Transfer complete.`);
  }, [ftpSession, addLocalOutput, topologyDevices]);

  const handleFtpSessionCommand = useCallback((cmdLine: string) => {
    const session = ftpSession;
    if (!session) return;
    const cmd = cmdLine.trim().toLowerCase();
    if (cmd === 'quit' || cmd === 'bye' || cmd === 'exit') {
      addLocalOutput('output', '221 Goodbye.');
      setFtpSession(null);
      return;
    }
    if (cmd === 'help' || cmd === '?') {
      addLocalOutput('output', 'Commands: put, ls, dir, get <file>, quit, bye, exit');
      return;
    }
    if (cmd === 'ls' || cmd === 'dir') {
      const files = session.files;
      if (!files || files.length === 0) {
        addLocalOutput('output', '(empty)');
      } else {
        const list = files.map(f => `${f.name.padEnd(20)} ${(f.size || 0).toString().padStart(8)} bytes`).join('\n');
        addLocalOutput('output', list);
      }
      return;
    }
    const getMatch = cmdLine.trim().match(/^(get|recv|mget)\s+(.+)/i);
    if (getMatch) {
      const fileName = getMatch[2];
      const serverFile = session.files?.find(f => f.name.toLowerCase() === fileName.toLowerCase());
      const localFile = { name: fileName, size: serverFile?.size || 0, modifiedAt: new Date().toISOString() };
      setPcLocalFiles(prev => {
        const updated = prev.filter(f => f.name !== fileName).concat(localFile);
        try { localStorage.setItem(`pc_files_${deviceId}`, JSON.stringify(updated)); } catch (_e) { /* ignore */ }
        return updated;
      });
      addLocalOutput('output', `150 Opening BINARY mode data connection for ${fileName}\n226 Transfer complete.`);
      return;
    }
    const putMatch = cmdLine.trim().match(/^(put|send|mput)(?:\s+(.+))?$/i);
    if (putMatch) {
      if (putMatch[2]) {
        // Direct upload: file must exist in pcLocalFiles
        const fileName = putMatch[2];
        const localFile = pcLocalFiles.find(f => f.name.toLowerCase() === fileName.toLowerCase());
        if (localFile) {
          executeFtpPut(localFile.name);
        } else {
          addLocalOutput('error', `Local file '${fileName}' not found.`);
        }
      } else {
        setIsFtpFilePickerOpen(true);
      }
      return;
    }
    addLocalOutput('output', '200 Command okay.');
  }, [ftpSession, addLocalOutput, topologyDevices, setIsFtpFilePickerOpen, pcLocalFiles, executeFtpPut]);



  const executeCommand = async (cmdToExecute?: string) => {
    const command = (cmdToExecute || input).trim();
    if (!command) return;
    if ((activeTabRef.current === 'desktop' && isCmdInputDisabled) || (activeTabRef.current === 'terminal' && isConsoleInputDisabled)) {
      addLocalOutput('error', connectionErrorText || t.pcConnectionError);
      setInput('');
      return;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pc-command-executed', {
        detail: { deviceId, command }
      }));
    }

    if (activeTabRef.current === 'desktop') {
      if (desktopHistory[0] !== command) {
        const newHistory = [command, ...desktopHistory].slice(0, 50);
        setDesktopHistory(newHistory);
        if (onUpdatePCHistory) onUpdatePCHistory(deviceId, newHistory);
      }
      setDesktopHistoryIndex(-1);
    } else if (activeTabRef.current === 'terminal') {
      if (consoleHistory[0] !== command) {
        const newHistory = [command, ...consoleHistory].slice(0, 50);
        setConsoleHistory(newHistory);
      }
      setConsoleHistoryIndex(-1);
    }
    setInput('');
    setShowAutocomplete(false);
    setAutocompleteIndex(-1);
    setAutocompleteNavigated(false);
    if (activeTabRef.current === 'desktop') {
      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase();
      // FTP session mode: route all input (except 'ftp') to FTP handler
      if (ftpSession && cmd !== 'ftp') {
        addLocalOutput('command', command, 'ftp>');
        handleFtpSessionCommand(command);
        return;
      }
      addLocalOutput('command', command);
      const args = parts.slice(1);
      if (cmd === 'ipconfig') {
        if (args.includes('/release')) {
          setPcIP('0.0.0.0');
          addLocalOutput('success', 'IP address released successfully.');
        } else if (args.includes('/renew')) {
          try {
            const lease = applyDhcpLeaseRef.current?.() ?? null;
            if (lease && lease.serverName !== 'link-local') {
              addLocalOutput(
                'success',
                `DHCP lease acquired from ${lease.serverName}/${lease.poolName}. New IP: ${lease.ip}`
              );
            } else {
              addLocalOutput('success', `No DHCP server/pool found. Assigned link-local IP: ${lease?.ip || '(pending)'}`);
            }
          } catch (err) {
            addLocalOutput('error', 'DHCP renew failed. Please check network connection.');
            errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'ipconfigRenew', error: String(err) }));
          }
        } else if (args.includes('/all')) {
          const ipConfigModeText = ipConfigMode === 'dhcp' ? 'Yes' : 'No';
          await addMultilineOutput('output', `Windows IP Configuration\n\n   Host Name . . . . . . . . . . . . : ${internalPcHostname}\n   Primary Dns Suffix  . . . . . . . : \n   Node Type . . . . . . . . . . . . : Hybrid\n   IP Routing Enabled. . . . . . . : No\n   WINS Proxy Enabled. . . . . . . . : No\n\nEthernet adapter Ethernet:\n\n   Connection-specific DNS Suffix  . : \n   Description . . . . . . . . . . . : Intel(R) PRO/1000 MT Network Connection\n   Physical Address. . . . . . . . . : ${pcMAC}\n   DHCP Enabled. . . . . . . . . . . : ${ipConfigModeText}\n   Autoconfiguration Enabled . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${pcIP}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   DNS Servers . . . . . . . . . . . : ${pcDNS}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}(Preferred)\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n\n${wifiEnabled ? `Ethernet adapter Wireless Network Connection:\n\n   Connection-specific DNS Suffix  . : \n   Description . . . . . . . . . . . : Intel(R) Wireless WiFi Link 4965AGN\n   Physical Address. . . . . . . . . : ${pcMAC}\n   DHCP Enabled. . . . . . . . . . . : ${ipConfigModeText}\n   Autoconfiguration Enabled . . . . : Yes\n   IPv4 Address. . . . . . . . . . . : ${pcIP}(Preferred)\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   DNS Servers . . . . . . . . . . . : ${pcDNS}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}(Preferred)\n   NetBIOS over Tcpip. . . . . . . . : Enabled\n\n` : ''}`, 80);
        } else {
          await addMultilineOutput('output', `OS IP Configuration\n\nEthernet adapter Ethernet connection:\n   IPv4 Address. . . . . . . . . . . : ${pcIP}\n   Subnet Mask . . . . . . . . . . . : ${pcSubnet}\n   Default Gateway . . . . . . . . . : ${pcGateway}\n   IPv6 Address. . . . . . . . . . . : ${pcIPv6}`, 80);
        }
      } else if (cmd === 'ping') {
        const target = args[0];
        if (!target) {
          addLocalOutput('output', 'Usage: ping <target_name_or_address>');
        } else {
          let targetIp = target;
          let dnsResolved = false;

          const namedResult = resolveDeviceNameTargetCallback(target);
          if (namedResult) {
            targetIp = namedResult.ip;
            dnsResolved = true;
          }

          // If target is not an IP, try to resolve it via DNS
          if (!isValidIpv4(targetIp) && !isValidIpv6(targetIp)) {
            const dnsResult = resolveDomainWithDnsServicesCallback(target);
            if (dnsResult) {
              targetIp = dnsResult.address;
              dnsResolved = true;
            } else {
              addLocalOutput('output', `Ping request could not find host ${target}. Please check the name and try again.`);
              return;
            }
          }

          if (isLoopbackTarget(targetIp)) {
            const pingTargetDisplay = dnsResolved ? `${target} [127.0.0.1]` : '127.0.0.1';
            await addMultilineOutput('output', `Pinging ${pingTargetDisplay} with 32 bytes of data:\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\nReply from 127.0.0.1: bytes=32 time<1ms TTL=128\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, 100);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pc-command-executed', {
                detail: { deviceId, command, output: 'Reply from 127.0.0.1' }
              }));
            }
            return;
          }

          const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'icmp' });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pc-command-executed', {
              detail: { deviceId, command, output: result.success ? 'Reply from' : 'timed out' }
            }));
          }

          if (result.capturedPackets && result.capturedPackets.length > 0 && typeof window !== 'undefined') {
            result.capturedPackets.forEach(pkt => {
              window.dispatchEvent(new CustomEvent('packet-captured', { detail: pkt }));
            });
          }

          if (result.success) {
            const pingTargetDisplay = dnsResolved ? `${target} [${targetIp.toLowerCase()}]` : targetIp.toLowerCase();

            // Calculate ping latency from both source and target WiFi distances
            const srcDist = getWirelessDistance(deviceFromTopology, topologyDevices, deviceStates);
            const targetDevice = result.targetId ? topologyDevices.find(d => d.id === result.targetId) : undefined;
            const dstDist = getWirelessDistance(targetDevice, topologyDevices, deviceStates);

            const srcWired = srcDist === Infinity;
            const dstWired = dstDist === Infinity;
            const effectiveDist = (srcWired ? 0 : srcDist) + (dstWired ? 0 : dstDist);
            const allWired = srcWired && dstWired;

            const generatePingTime = () => {
              if (allWired) return 0; // <1ms
              // Exponential curve over combined distance
              const base = Math.exp(effectiveDist / 130);
              return Math.max(1, Math.round(base * (1 + (Math.random() * 0.16 - 0.08))));
            };

            const time1 = generatePingTime();
            const time2 = generatePingTime();
            const time3 = generatePingTime();
            const time4 = generatePingTime();

            const formatTime = (ms: number) => ms === 0 ? '<1ms' : `${ms}ms`;

            await addMultilineOutput('output', `Pinging ${pingTargetDisplay} with 32 bytes of data:\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time1)} TTL=128\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time2)} TTL=128\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time3)} TTL=128\nReply from ${targetIp.toLowerCase()}: bytes=32 time=${formatTime(time4)} TTL=128\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`, 100);
          } else {
            const pingTargetDisplay = dnsResolved ? `${target} [${targetIp.toLowerCase()}]` : targetIp.toLowerCase();
            // Windows-style timeout for all pings in PC terminal, matching user request for IPv6
            const errorMsg = '\nRequest timed out.';
            await addMultilineOutput('output', `Pinging ${pingTargetDisplay} with 32 bytes of data:${errorMsg}${errorMsg}${errorMsg}${errorMsg}\n\nPing statistics for ${pingTargetDisplay}:\n    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)`, 100);
          }
        }
      } else if (cmd === 'nslookup') {
        const rawTargetDomain = args[0];
        const targetDomain = rawTargetDomain ? normalizeLookupTargetCallback(rawTargetDomain) : '';
        if (!targetDomain) {
          addLocalOutput('output', 'Usage: nslookup <domain>');
        } else if (resolveDeviceNameTargetCallback(targetDomain)) {
          const resolved = resolveDeviceNameTargetCallback(targetDomain) as { ip: string; label: string };
          await addMultilineOutput(
            'output',
            `Server: local-device\nAddress: 127.0.0.1\n\nName: ${targetDomain}\nAddress: ${resolved.ip}`,
            80
          );
        } else if (!isValidIpv4(pcDNS)) {
          addLocalOutput('error', t.dnsInvalidAddress);
        } else if (!hasGatewayForTargetCallback(pcDNS)) {
          addLocalOutput('error', t.dnsGatewayRequired);
        } else {
          const dnsResult = resolveDomainWithDnsServicesCallback(targetDomain);
          if (!dnsResult) {
            await addMultilineOutput('output', `*** DNS request timed out\n*** Can't find ${targetDomain}: Non-existent domain`, 80);
          } else {
            await addMultilineOutput(
              'output',
              `Server: ${dnsResult.server.name}\nAddress: ${dnsResult.server.ip}\n\nName: ${targetDomain}\nAddress: ${dnsResult.address}`,
              80
            );
          }
        }
      } else if (cmd === 'curl' || cmd === 'wget') {
        const url = args[0];
        if (!url) {
          addLocalOutput('output', `Usage: ${cmd} <url>`);
        } else {
          // Always open in the built-in browser modal instead of new tab
          openWebPage(url, args[1]);
        }
      } else if (cmd === 'telnet' || cmd === 'ssh') {
        const isSsh = cmd === 'ssh';
        const targetSpec = args[0];
        const extraPort = args[1];

        const isSshLoginFlag = isSsh && targetSpec === '-l';
        const sshUserFromFlag = isSshLoginFlag ? (args[1] || '') : '';
        const sshTargetFromFlag = isSshLoginFlag ? (args[2] || '') : '';
        const sshPortFromFlag = isSshLoginFlag ? args[3] : undefined;

        const sshUserFromSpec = isSsh && !isSshLoginFlag && targetSpec?.includes('@')
          ? targetSpec.split('@')[0].trim()
          : '';
        const targetFromSpec = isSsh && !isSshLoginFlag && targetSpec?.includes('@')
          ? targetSpec.split('@').slice(1).join('@').trim()
          : targetSpec;

        const username = isSsh ? ((sshUserFromFlag || sshUserFromSpec) || 'admin') : '';
        const target = isSshLoginFlag ? sshTargetFromFlag : targetFromSpec;
        const port = isSsh
          ? ((sshPortFromFlag || (isSshLoginFlag ? undefined : extraPort)) || '22')
          : (extraPort || '23');
        if (!target) {
          addLocalOutput('output', isSsh
            ? 'Usage: ssh -l <username> <ip> [port]\n       ssh <username>@<ip> [port]'
            : 'Usage: telnet <ip_or_domain> [port]');
          return;
        } else if (isSsh) {
          const isValidUsername = /^[A-Za-z0-9._-]+$/.test(username);
          const isValidTargetIp = isValidIpv4(target);
          if (!isValidUsername) {
            addLocalOutput('error', 'Invalid SSH username format');
            return;
          }
          if (!isValidTargetIp) {
            addLocalOutput('error', `Invalid SSH target IP: ${target}`);
            return;
          }
        }

        // Resolve target IP (telnet supports hostnames; ssh path already validated an IPv4).
        let targetIp = target;
        if (!isSsh) {
          const namedResult = resolveDeviceNameTargetCallback(target);
          if (namedResult) {
            targetIp = namedResult.ip;
          }
          if (!isValidIpv4(targetIp) && !isValidIpv6(targetIp)) {
            const dnsResult = resolveDomainWithDnsServicesCallback(target);
            if (dnsResult) {
              targetIp = dnsResult.address;
            } else {
              addLocalOutput('error', `Could not resolve hostname ${target}`);
              return;
            }
          }
        }

        if (isLoopbackTarget(targetIp)) {
          addLocalOutput('success', isSsh
            ? `Trying ${username}@127.0.0.1 ${port} ...\nConnected to 127.0.0.1 as ${username}.`
            : `Trying 127.0.0.1 ${port} ...\nConnected to 127.0.0.1.`);
          return;
        }

        // Check connectivity
        const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port });

        if (result.success && result.targetId) {
          // Find target device to see if it's a switch or router
          const targetDevice = topologyDevices.find(d => d.id === result.targetId);
          if (targetDevice && ((targetDevice.type === 'switchL2' || targetDevice.type === 'switchL3') || targetDevice.type === 'router')) {
            // Check target device's transport input configuration
            if (deviceStates) {
              const targetState = deviceStates.get(result.targetId);
              if (targetState?.security?.vtyLines) {
                const transportInput = targetState.security.vtyLines.transportInput || [];
                if (isSsh) {
                  const isSshActive = transportInput.includes('all') || transportInput.includes('ssh');
                  if (!isSshActive) {
                    addLocalOutput('error', `Connecting to ${targetIp}...Could not open connection to the host, on port 22: Connect failed`);
                    return;
                  }
                } else {
                  const isTelnetActive = transportInput.includes('all') || transportInput.includes('telnet');
                  if (!isTelnetActive) {
                    addLocalOutput('error', `Connecting to ${targetIp}...Could not open connection to the host, on port 23: Connect failed`);
                    return;
                  }
                }
              }
            }

            // Successfully connected - switch to terminal tab and connect
            addLocalOutput('success', isSsh
              ? `Trying ${username}@${targetIp} ${port} ...\nConnected to ${targetIp} as ${username}.`
              : `Trying ${targetIp} ${port} ...\nConnected to ${targetIp}.`);

            // Give it a tiny delay for the user to see the "Connected" message before switching
            setTimeout(() => {
              setConnectedDeviceId(result.targetId as string);
              setConsoleConnectionTime(Date.now());
              setIsConsoleConnected(true);

              // Trigger remote VTY session bootstrap so password/login policy is applied.
              if (onExecuteDeviceCommand) {
                void onExecuteDeviceCommand(
                  result.targetId as string,
                  isSsh ? `__SSH_CONNECT__:${username}` : '__TELNET_CONNECT__'
                );
              }

              setActiveTab('terminal');
              onNavigate?.('terminal');
            }, 500);
          } else {
            addLocalOutput('error', `Connection refused by ${targetIp}`);
          }
        } else {
          addLocalOutput('error', `Connecting to ${targetIp}... failed: ${result.error || 'Destination unreachable'}`);
        }
      } else if (cmd === 'arp') {
        if (args.length === 0 || (args.length === 1 && args[0].toLowerCase() === '-a')) {
          addLocalOutput('output', buildArpTableOutput());
        } else {
          addLocalOutput('output', 'Usage: arp -a');
        }
      } else if (cmd === 'tracert' || cmd === 'traceroute') {
        const target = args[0];
        if (!target) {
          addLocalOutput('output', `Usage: ${cmd} <target_name_or_address>`);
        } else {
          let resolvedTarget = target;
          if (!isValidIpv4(target) && !isValidIpv6(target)) {
            const namedResult = resolveDeviceNameTargetCallback(target);
            if (namedResult) {
              resolvedTarget = namedResult.ip;
            } else {
              const dnsResult = resolveDomainWithDnsServicesCallback(target);
              if (dnsResult) {
                resolvedTarget = dnsResult.address;
              }
            }
          }
          if (isLoopbackTarget(resolvedTarget)) {
            await addMultilineOutput('output', `Tracing route to 127.0.0.1 over a maximum of 30 hops:\n\n  1    <1 ms    <1 ms    <1 ms  localhost [127.0.0.1]\n\nTrace complete.`, 80);
            return;
          }
          addLocalOutput('output', `Tracing route to ${target} over a maximum of 30 hops:\n`);
          const result = checkConnectivity(deviceId, resolvedTarget, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'icmp' });

          if (result.success) {
            const l3Hops = getL3Hops(deviceId, resolvedTarget, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map());
            if (l3Hops && l3Hops.length > 0) {
              let hopOutput = '';
              l3Hops.forEach((hop, index) => {
                hopOutput += `  ${index + 1}    <1 ms    <1 ms    <1 ms  ${hop.name} [${hop.ip}]\n`;
              });
              await addMultilineOutput('output', hopOutput + '\nTrace complete.', 80);
            } else {
              await addMultilineOutput('output', `  1    *        *        *     Request timed out.\n\nTrace complete.`, 80);
            }
          } else {
            await addMultilineOutput('output', `  1    *        *        *     Request timed out.\n\nTrace complete.`, 80);
          }
        }
      } else if (cmd === 'netstat') {
        let output = '\nActive Connections\n\n  Proto  Local Address          Foreign Address        State\n';
        output += `  TCP    ${pcIP}:135            0.0.0.0:0              LISTENING\n`;
        output += `  TCP    ${pcIP}:445            0.0.0.0:0              LISTENING\n`;

        if (serviceHttpEnabled) output += `  TCP    ${pcIP}:80             0.0.0.0:0              LISTENING\n`;
        if (serviceDnsEnabled) output += `  UDP    ${pcIP}:53             *:*                    \n`;
        if (serviceDhcpEnabled) output += `  UDP    ${pcIP}:67             *:*                    \n`;

        output += `  TCP    ${pcIP}:49664          0.0.0.0:0              LISTENING\n`;
        output += `  TCP    ${pcIP}:49665          0.0.0.0:0              LISTENING\n`;
        await addMultilineOutput('output', output, 60);
      } else if (cmd === 'nbtstat') {
        if (args.includes('-n')) {
          await addMultilineOutput('output', `\nNetBIOS Local Name Table\n\n       Name               Type         Status\n    ---------------------------------------------\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <00>  UNIQUE      Registered\n    WORKGROUP        <00>  GROUP       Registered\n    ${internalPcHostname.toUpperCase().padEnd(15)}  <20>  UNIQUE      Registered\n`, 80);
        } else {
          addLocalOutput('output', 'Usage: nbtstat [-n]');
        }
      } else if (cmd === 'getmac') {
        const mac = formatMacForArp(pcMAC).toUpperCase();
        await addMultilineOutput(
          'output',
          `Physical Address    Transport Name\n=================== ============================================\n${mac.padEnd(19)} \\Device\\Tcpip_{${deviceId.toUpperCase()}}`,
          60
        );
      } else if (cmd === 'ftp') {
        const targetArg = args[0];
        if (!targetArg) {
          addLocalOutput('output', 'Usage: ftp <server_address>');
          return;
        }

        let targetIp = targetArg;
        let dnsResolved = false;
        // Resolve hostname if not an IP
        if (!isValidIpv4(targetArg) && !isValidIpv6(targetArg)) {
          const namedResult = resolveDeviceNameTargetCallback(targetArg);
          if (namedResult) {
            targetIp = namedResult.ip;
            dnsResolved = true;
          } else {
            const dnsResult = resolveDomainWithDnsServicesCallback(targetArg);
            if (dnsResult) {
              targetIp = dnsResult.address;
              dnsResolved = true;
            } else {
              addLocalOutput('error', language === 'tr'
                ? `DNS sorgusu başarısız: '${targetArg}' çözümlenemedi.`
                : `Could not resolve hostname '${targetArg}'.`);
              return;
            }
          }
        }

        const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '21' });

        if (result.capturedPackets && result.capturedPackets.length > 0 && typeof window !== 'undefined') {
          result.capturedPackets.forEach(pkt => {
            window.dispatchEvent(new CustomEvent('packet-captured', { detail: pkt }));
          });
        }

        if (!result.success) {
          const err = result.error || '';
          const displayTarget = dnsResolved ? `${targetArg} [${targetIp}]` : targetIp;
          if (/firewall|güvenlik duvarı/i.test(err)) {
            addLocalOutput('error', `${displayTarget}: ${err}`);
          } else if (/acl/i.test(err)) {
            addLocalOutput('error', `${displayTarget}: ${err}`);
          } else if (/ip address/i.test(err)) {
            addLocalOutput('error', language === 'tr'
              ? 'FTP bağlantısı sağlanamadı: Kaynak cihazın IP adresi yok.'
              : 'Could not connect to FTP server: Source device has no IP address.');
          } else {
            addLocalOutput('error', language === 'tr'
              ? `FTP bağlantısı sağlanamadı: ${displayTarget} adresine ulaşılamıyor.`
              : `Could not connect to FTP server at ${displayTarget}: Destination unreachable.`);
          }
          return;
        }
        const targetDevice = result.targetId
          ? topologyDevices.find(d => d.id === result.targetId)
          : topologyDevices.find(d => d.ip === targetIp);
        const deviceByIp = topologyDevices.find(d => d.ip === targetIp);
        const targetDeviceId = targetDevice?.id || deviceByIp?.id;
        const targetState = targetDeviceId
          ? deviceStates?.get(targetDeviceId)
          : undefined;
        const ftpService =
          targetDevice?.services?.ftp?.enabled ? targetDevice.services.ftp :
            deviceByIp?.services?.ftp?.enabled ? deviceByIp.services.ftp :
              targetState?.services?.ftp?.enabled ? targetState.services.ftp :
                undefined;
        if (!ftpService?.enabled) {
          addLocalOutput('error', language === 'tr'
            ? `FTP bağlantısı sağlanamadı: ${targetIp} üzerinde FTP servisi aktif değil.`
            : `FTP service is not enabled on ${targetIp}.`);
          return;
        }
        const files = ftpService.files || [];
        const resolvedDeviceId = result.targetId || targetDevice?.id || deviceByIp?.id || '';
        // Start interactive FTP session
        setFtpSession({ host: targetArg, targetDeviceId: resolvedDeviceId, files });
        setIsFtpFilePickerOpen(true);
        addLocalOutput('output', `Connected to ${targetArg}.`);
        addLocalOutput('output', '220 FTP server ready.');
        addLocalOutput('success', language === 'tr' ? 'Dosya transfer ekranı açıldı.' : 'File transfer window opened.');
      } else if (cmd === 'help' || cmd === '?') {
        addLocalOutput('output', `Available commands: ipconfig, ping, tracert, traceroute, telnet, ssh, ftp, netstat, nbtstat, getmac, nslookup, curl, wget, arp, hostname, dir, ver, cls, exit, quit`);
      } else if (cmd === 'cls') {
        setPcOutput([]);
      } else if (cmd === 'exit' || cmd === 'quit') {
        onClose();
      } else if (cmd === 'hostname') {
        if (args[0]) {
          setPcHostname(args[0]);
          addLocalOutput('success', `Hostname set to ${args[0]}`);
        } else {
          addLocalOutput('output', internalPcHostname);
        }
      } else if (cmd === 'ver') {
        addLocalOutput('output', `OS [Version 10.0.26200.8037]`);
      } else if (cmd === 'dir') {
        const localFiles = pcLocalFiles;
        let fileLines = '';
        let totalSize = 0;
        if (localFiles.length > 0) {
          fileLines = '\n' + localFiles.map(f => {
            const d = f.modifiedAt ? new Date(f.modifiedAt) : new Date();
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            const year = d.getFullYear();
            const mm = d.getMinutes().toString().padStart(2, '0');
            const ap = d.getHours() >= 12 ? 'PM' : 'AM';
            const h12 = (d.getHours() % 12 || 12).toString().padStart(2, '0');
            totalSize += f.size || 0;
            return `${month}/${day}/${year}  ${h12}:${mm} ${ap}             ${(f.size || 0).toString().padStart(8)} ${f.name}`;
          }).join('\n');
        }
        addLocalOutput('output', ` Volume in drive C is OS
 Volume Serial Number is 1234-5678

 Directory of C:\\
03/27/2026  10:00 AM    <DIR>          .
03/27/2026  10:00 AM    <DIR>          ..
${fileLines}
               ${localFiles.length} File(s)          ${totalSize} bytes
               2 Dir(s)  100,000,000,000 bytes free`);
      } else {
        addLocalOutput('error', `'${command}' is not recognized as an internal or external command.`);
      }
    } else {
      // Console (terminal) tab
      if (!isConsoleConnected) {
        addLocalOutput('error', t.pcNoDeviceConnected);
        return;
      }

      // Handle password input
      if (consoleNeedsPassword) {
        if (onExecuteDeviceCommand && connectedDeviceId) {
          try {
            await onExecuteDeviceCommand(connectedDeviceId, input);
          } catch (err) {
            errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'passwordInput', error: String(err) }));
          }
        }
        setInput('');
        return;
      }

      // After password is correct, check for confirm states
      // Handle confirm dialog (reload confirmation, etc.)
      // Only send "confirm" if input is empty (Enter pressed with no text)
      if ((consoleConfirmDialog?.show || consoleReloadPending)) {
        if (!command) {
          // Empty input = confirm
          if (onExecuteDeviceCommand && connectedDeviceId) {
            try {
              await onExecuteDeviceCommand(connectedDeviceId, 'confirm');
            } catch (err) {
              errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'confirmDialog', error: String(err) }));
            }
          }
          setInput('');
          return;
        }
        // User typed something - check if it's a known confirmation response
        const lowerCmd = command.toLowerCase().trim();
        if (lowerCmd === 'confirm' || lowerCmd === 'y' || lowerCmd === 'yes') {
          // These are valid confirm responses
          if (onExecuteDeviceCommand && connectedDeviceId) {
            try {
              await onExecuteDeviceCommand(connectedDeviceId, 'confirm');
            } catch (err) {
              errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'confirmResponse', error: String(err) }));
            }
          }
          setInput('');
          return;
        }
        // User typed something else - send as command (will fail on switch)
      }

      // Console tab: do not mirror remote commands into local PC CMD output.
      if (onExecuteDeviceCommand && connectedDeviceId) {
        try {
          await onExecuteDeviceCommand(connectedDeviceId, command);
        } catch (err) {
          errorHandler.logError(DEVICE_ERRORS.DEVICE_OFFLINE(connectedDeviceId, { operation: 'executeCommand', command, error: String(err) }));
        }
      }
    }
  };

  const handleTabComplete = useCallback(() => {
    const value = input;
    if (!value && tabCycleIndex === -1) return;

    const isIpv4 = (raw: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(raw);
    const trimmed = value.trim();
    const hasTrailingSpace = /\s$/.test(value);

    const ipAddressMatch = trimmed.match(/^ip\s+address\s+(\S+)(?:\s+(\S+))?$/i);
    if (ipAddressMatch) {
      const ip = ipAddressMatch[1];
      const mask = ipAddressMatch[2];
      if (isIpv4(ip) && !mask) {
        setInput(`ip address ${ip} 255.255.255.0`);
        setTabCycleIndex(-1);
        return;
      }
      if (isIpv4(ip) && mask && isIpv4(mask) && !hasTrailingSpace) {
        setInput(`${trimmed} `);
        setTabCycleIndex(-1);
        return;
      }
    }

    const singleIpArgMatch = trimmed.match(/^(?:ip\s+default-gateway|ping|http|telnet|ssh)\s+(\S+)$/i);
    if (singleIpArgMatch && isIpv4(singleIpArgMatch[1]) && !hasTrailingSpace) {
      setInput(`${trimmed} `);
      setTabCycleIndex(-1);
      return;
    }

    const networkMatch = trimmed.match(/^network\s+(\S+)(?:\s+(\S+))?$/i);
    if (networkMatch) {
      const netIp = networkMatch[1];
      const mask = networkMatch[2];
      if (isIpv4(netIp) && !mask) {
        setInput(`network ${netIp} 255.255.255.0`);
        setTabCycleIndex(-1);
        return;
      }
      if (isIpv4(netIp) && mask && isIpv4(mask) && !hasTrailingSpace) {
        setInput(`${trimmed} `);
        setTabCycleIndex(-1);
        return;
      }
    }

    const dhcpSingleIpArgMatch = trimmed.match(/^(?:default-router|dns-server)\s+(\S+)$/i);
    if (dhcpSingleIpArgMatch && isIpv4(dhcpSingleIpArgMatch[1]) && !hasTrailingSpace) {
      setInput(`${trimmed} `);
      setTabCycleIndex(-1);
      return;
    }

    let matches: string[] = [];
    let contextTokens: string[] = [];

    if (activeTab === 'desktop') {
      const tokens = value.trim().split(/\s+/).filter(Boolean);
      const currentWord = value.endsWith(' ') ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
      contextTokens = [];
      matches = DESKTOP_COMMANDS.filter(opt => opt !== '?' && opt.toLowerCase().startsWith(currentWord));
    } else {
      const mode = getCommandMode();
      const context = expandCommandContext(mode, value);
      contextTokens = context.contextTokens;
      matches = context.candidates.filter(opt => opt !== '?' && opt.toLowerCase().startsWith(context.currentWord));
    }

    if (matches.length > 0) {
      if (tabCycleIndex === -1) {
        setLastTabInput(value);
        setTabCycleIndex(0);
        const completion = matches[0];
        const prefix = contextTokens.join(' ');
        setInput(prefix ? `${prefix} ${completion}` : completion);
      } else {
        const nextIndex = (tabCycleIndex + 1) % matches.length;
        setTabCycleIndex(nextIndex);
        const originalParts = lastTabInput.split(/\s+/);
        const originalContext = lastTabInput.endsWith(' ') ? lastTabInput.trim() : originalParts.slice(0, -1).join(' ');
        const completion = matches[nextIndex];
        setInput(originalContext ? `${originalContext} ${completion}` : completion);
      }
    } else if (value.trim() && activeTab === 'terminal' && isConsoleConnected) {
      // No matches in console mode - trigger help
      executeCommand(value.trim() + ' ?');
    }
  }, [input, tabCycleIndex, lastTabInput, getCommandMode, executeCommand, isConsoleConnected, activeTab, setTabCycleIndex, setLastTabInput]);

  // Undo/Redo helpers
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const newUndoStack = [...undoStack];
      const previousInput = newUndoStack.pop() || '';
      setRedoStack([input, ...redoStack]);
      setInput(previousInput);
      setUndoStack(newUndoStack);
    }
  }, [input, undoStack, redoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const nextInput = newRedoStack.shift() || '';
      setUndoStack([...undoStack, input]);
      setInput(nextInput);
      setRedoStack(newRedoStack);
    }
  }, [input, undoStack, redoStack]);

  const handleInputChange = useCallback((newValue: string) => {
    // Intercept '?' for immediate help in terminal mode (NOS style)
    if (activeTab === 'terminal' && isConsoleConnected && newValue.endsWith('?') && !consoleNeedsPassword && !consoleConfirmDialog?.show) {
      const partialCommand = newValue.slice(0, -1);
      setUndoStack([...undoStack, input]);
      setRedoStack([]);
      setInput(partialCommand); // Keep part before ?

      // Trigger help command immediately
      void executeCommand(newValue);
      return;
    }

    setUndoStack([...undoStack, input]);
    setRedoStack([]);
    setInput(newValue);
    setAutocompleteNavigated(false);

    if (newValue.trim().length > 0) {
      const suggestions = getAutocompleteSuggestionsCallback(newValue);
      if (suggestions.length > 0) {
        setShowAutocomplete(true);
        setAutocompleteIndex(-1);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [input, undoStack, getAutocompleteSuggestionsCallback]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Global terminal shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setSearchOpen(true);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (activeTab === 'desktop') setPcOutput([]);
      else if (activeTab === 'terminal') setConsoleConnectionTime(Date.now());
      setInput('');
      setShowAutocomplete(false);
      setAutocompleteIndex(-1);
      setAutocompleteNavigated(false);
      return;
    }

    const autocompleteSuggestions = renderAutocompleteSuggestions;
    const canUseAutocomplete = showAutocomplete && autocompleteSuggestions.length > 0;

    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      if (activeTab === 'desktop') {
        setPcOutput([]);
      } else if (activeTab === 'terminal') {
        // Reset console view by moving the window start time forward
        setConsoleConnectionTime(Date.now());
      }
      return;
    }

    // Handle Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleUndo();
      return;
    }

    // Handle Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Escape cancels password/confirm and returns to normal input
    if (e.key === 'Escape') {
      if (showAutocomplete) {
        e.preventDefault();
        setShowAutocomplete(false);
        setAutocompleteIndex(-1);
        setAutocompleteNavigated(false);
        return;
      }
      if (activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)) {
        e.preventDefault();
        if (onExecuteDeviceCommand && connectedDeviceId) {
          if (consoleNeedsPassword) {
            onExecuteDeviceCommand(connectedDeviceId, '__PASSWORD_CANCELLED__');
          } else if (consoleReloadPending) {
            // For reload, send 'n' to cancel
            onExecuteDeviceCommand(connectedDeviceId, 'n');
          }
        }
        if (consoleNeedsPassword) {
          setConsolePasswordAttempted(false);
          setIsConsoleConnected(false);
          setConnectedDeviceId(null);
        }
        setInput('');
        return;
      }
    }

    // Handle Ctrl+A (Select All) - Let browser handle natively
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      // Don't preventDefault - let browser handle select all
      return;
    }

    // Handle Ctrl+X (Cut) - Let browser handle natively
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      // Don't preventDefault - let browser handle cut
      return;
    }

    // Handle Ctrl+C (Copy) - Let browser handle natively
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      // Don't preventDefault - let browser handle copy
      return;
    }

    // Handle Ctrl+V (Paste) - Let browser handle natively
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      return;
    }

    // Handle Ctrl+X (Cut)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      const inputElement = e.currentTarget as HTMLInputElement;
      if (input) {
        const start = inputElement.selectionStart || 0;
        const end = inputElement.selectionEnd || 0;
        if (start !== end) {
          const selectedText = input.substring(start, end);
          navigator.clipboard.writeText(selectedText).then(() => {
            const newInput = input.substring(0, start) + input.substring(end);
            setInput(newInput);
          });
        }
      }
      return;
    }

    // Handle Ctrl+C (Copy)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const inputElement = e.currentTarget as HTMLInputElement;
      if (input) {
        const start = inputElement.selectionStart || 0;
        const end = inputElement.selectionEnd || 0;
        if (start !== end) {
          const selectedText = input.substring(start, end);
          navigator.clipboard.writeText(selectedText);
        } else if (input) {
          // If no selection, copy all
          navigator.clipboard.writeText(input);
        }
      }
      return;
    }

    // Handle Ctrl+V (Paste) - Let browser handle it naturally, just prevent default to stop any global handlers
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      // Don't prevent default - let the browser handle paste natively
      // The only reason we had custom handling was to control cursor position
      // But browser default is more reliable
      return;
    }

    if (e.key === 'Enter') {
      if (canUseAutocomplete && autocompleteNavigated) {
        e.preventDefault();
        const completed = completeAutocompleteSelection(autocompleteSuggestions[autocompleteIndex] || autocompleteSuggestions[0]);
        executeCommand(completed);
        return;
      }
      executeCommand();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (canUseAutocomplete) {
        completeAutocompleteSelection(autocompleteSuggestions[autocompleteIndex] || autocompleteSuggestions[0]);
        return;
      }
      handleTabComplete();
    } else if (e.key === 'ArrowUp') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return autocompleteSuggestions.length - 1;
          return prev <= 0 ? autocompleteSuggestions.length - 1 : prev - 1;
        });
        setAutocompleteNavigated(true);
        return;
      }
      e.preventDefault();
      if (activeTab === 'desktop') {
        if (desktopHistory.length > 0 && desktopHistoryIndex < desktopHistory.length - 1) {
          const ni = desktopHistoryIndex + 1;
          setDesktopHistoryIndex(ni);
          setInput(desktopHistory[ni]);
        }
      } else if (activeTab === 'terminal') {
        if (consoleHistory.length > 0 && consoleHistoryIndex < consoleHistory.length - 1) {
          const ni = consoleHistoryIndex + 1;
          setConsoleHistoryIndex(ni);
          setInput(consoleHistory[ni]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      if (canUseAutocomplete) {
        e.preventDefault();
        setAutocompleteIndex(prev => {
          if (prev === -1) return 0;
          return (prev + 1) % autocompleteSuggestions.length;
        });
        setAutocompleteNavigated(true);
        return;
      }
      e.preventDefault();
      if (activeTab === 'desktop') {
        if (desktopHistoryIndex > 0) {
          const ni = desktopHistoryIndex - 1;
          setDesktopHistoryIndex(ni);
          setInput(desktopHistory[ni]);
        } else if (desktopHistoryIndex === 0) {
          setDesktopHistoryIndex(-1);
          setInput('');
        }
      } else if (activeTab === 'terminal') {
        if (consoleHistoryIndex > 0) {
          const ni = consoleHistoryIndex - 1;
          setConsoleHistoryIndex(ni);
          setInput(consoleHistory[ni]);
        } else if (consoleHistoryIndex === 0) {
          setConsoleHistoryIndex(-1);
          setInput('');
        }
      }
    }
  };



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };
  const launcherApps = useMemo(() => [
    {
      tab: 'desktop' as const,
      label: 'CMD',
      subtitle: language === 'tr' ? 'Komut İstemi' : 'Command Prompt',
      icon: TerminalIcon,
      accent: isDark ? 'from-primary-500 to-accent-400' : 'from-primary-600 to-accent-500',
      buttonClass: isDark ? 'text-primary-300 border-primary-400/20 bg-primary-500/10' : 'text-primary-700 border-primary-200 bg-primary-50/90',
    },
    {
      tab: 'terminal' as const,
      label: language === 'tr' ? 'Konsol' : 'Console',
      subtitle: language === 'tr' ? 'Cihaza seri bağlan' : 'Serial device access',
      icon: Laptop,
      accent: isDark ? 'from-success-500 to-accent-400' : 'from-success-600 to-accent-500',
      buttonClass: isDark ? 'text-success-300 border-success-400/20 bg-success-500/10' : 'text-success-700 border-success-200 bg-success-50/90',
    },
    {
      tab: 'wireless' as const,
      label: language === 'tr' ? 'Kablosuz' : 'Wireless',
      subtitle: language === 'tr' ? 'Wi-Fi bilgisi' : 'Wi-Fi overview',
      icon: Wifi,
      accent: isDark ? 'from-accent-500 to-accent-400' : 'from-accent-600 to-accent-500',
      buttonClass: isDark ? 'text-accent-300 border-accent-400/20 bg-accent-500/10' : 'text-accent-700 border-accent-200 bg-accent-50/90',
    },
    {
      tab: 'settings' as const,
      label: language === 'tr' ? 'Ayarlar' : 'Settings',
      subtitle: language === 'tr' ? 'PC yapılandırması' : 'PC configuration',
      icon: Settings,
      accent: isDark ? 'from-purple-500 to-pink-400' : 'from-purple-600 to-pink-500',
      buttonClass: isDark ? 'text-purple-300 border-purple-400/20 bg-purple-500/10' : 'text-purple-700 border-purple-200 bg-purple-50/90',
    },
    {
      tab: 'services' as const,
      label: language === 'tr' ? 'Servisler' : 'Services',
      subtitle: language === 'tr' ? 'HTTP, DNS, DHCP' : 'HTTP, DNS, DHCP',
      icon: Globe,
      accent: isDark ? 'from-warning-500 to-warning-400' : 'from-warning-600 to-warning-500',
      buttonClass: isDark ? 'text-warning-300 border-warning-400/20 bg-warning-500/10' : 'text-warning-700 border-warning-200 bg-warning-50/90',
    },
    {
      tab: 'iot' as const,
      label: 'IoT',
      subtitle: language === 'tr' ? 'Sensör ağı' : 'Sensor network',
      icon: Radio,
      accent: isDark ? 'from-accent-500 to-primary-400' : 'from-accent-600 to-primary-500',
      buttonClass: isDark ? 'text-accent-300 border-accent-400/20 bg-accent-500/10' : 'text-accent-700 border-accent-200 bg-accent-50/90',
    },
  ], [language, isDark]);


  const handleComposeSend = useCallback((to: string, subject: string, body: string, onError: (err: string) => void, onSuccess: () => void) => {
    const recipient = to.trim();
    const subj = subject.trim() || '(no subject)';
    const bdy = body.trim();
    if (!recipient || !bdy) return;
    const [reqUser, reqDomain] = recipient.includes('@') ? recipient.split('@') : [recipient, serviceMailDomain];
    const targetDevice = topologyDevices.find((d: CanvasDevice) => {
      const mail = d.services?.mail;
      if (mail?.username === reqUser && mail?.domain === (reqDomain || serviceMailDomain)) return true;
      const isNameMatch = d.name === reqUser || d.ip === reqUser || d.id === reqUser;
      const isDomainMatch = d.ip === reqDomain;
      return isNameMatch && (isDomainMatch || !reqDomain);
    });
    if (!targetDevice) {
      onError(language === 'tr' ? 'Alıcı bulunamadı.' : 'Recipient not found.');
      return;
    }
    if (targetDevice.ip) {
      const connectivity = checkConnectivity(deviceId, targetDevice.ip, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '25' });
      if (!connectivity.success) {
        onError(language === 'tr' ? 'SMTP (port 25) engellendi. Posta gönderilemiyor.' : 'SMTP (port 25) blocked. Cannot send mail.');
        return;
      }
    }
    onError('');
    const timestamp = new Date().toISOString();
    const senderName = deviceFromTopology?.name || pcIP || serviceMailUsername;
    const senderEmail = `${serviceMailUsername}@${serviceMailDomain}`;
    const from = `${senderName} <${senderEmail}>`;
    const newInboxEntry = { from, to: recipient, subject: subj, body: bdy, timestamp };
    let existingInbox = targetDevice.services?.mail?.inbox || [];
    if (typeof window !== 'undefined') {
      try { const stored = localStorage.getItem(`mail_inbox_${targetDevice.id}`); if (stored) existingInbox = JSON.parse(stored); } catch (_e) {}
    }
    const updatedInbox = [newInboxEntry, ...existingInbox];
    if (typeof window !== 'undefined') localStorage.setItem(`mail_inbox_${targetDevice.id}`, JSON.stringify(updatedInbox));
    const newSentEntry = { from, to: recipient, subject: subj, body: bdy, timestamp };
    setServiceMailSent((prev) => [newSentEntry, ...prev]);
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId: targetDevice.id, config: { services: { mail: { enabled: targetDevice.services?.mail?.enabled ?? false, domain: targetDevice.services?.mail?.domain || serviceMailDomain, username: targetDevice.services?.mail?.username || serviceMailUsername, inbox: updatedInbox } } } }
    }));
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config: { services: { mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: [newSentEntry, ...serviceMailSent] } } } }
    }));
    addLocalOutput('success', language === 'tr' ? 'Mesaj gönderildi.' : 'Message sent.');
    onSuccess();
  }, [serviceMailDomain, serviceMailUsername, serviceMailEnabled, serviceMailPassword, serviceMailInbox, serviceMailSent, topologyDevices, topologyConnections, deviceStates, deviceId, addLocalOutput, language, deviceFromTopology, pcIP]);

  const handleViewReplySend = useCallback((replyBody: string, msg: { from?: string; to?: string; subject: string; body: string; timestamp?: string }, onError: (err: string) => void, onSuccess: () => void) => {
    if (!replyBody.trim() || !msg) return;
    if (!msg.from) return;
    const emailMatch = msg.from.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : msg.from;
    const [reqUser, reqDomain] = senderEmail.includes('@') ? senderEmail.split('@') : [senderEmail, ''];
    const targetDevice = topologyDevices.find((d: CanvasDevice) => {
      const mail = d.services?.mail;
      return mail?.username === reqUser && mail?.domain === reqDomain;
    });
    if (!targetDevice) {
      onError(language === 'tr' ? 'Alıcı cihaz bulunamadı.' : 'Target device not found.');
      return;
    }
    if (targetDevice.ip) {
      const connectivity = checkConnectivity(deviceId, targetDevice.ip, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '25' });
      if (!connectivity.success) {
        onError(language === 'tr' ? 'SMTP (port 25) engellendi. Yanıt gönderilemiyor.' : 'SMTP (port 25) blocked. Cannot send reply.');
        return;
      }
    }
    onError('');
    const subject = `Re: ${msg.subject}`;
    const timestamp = new Date().toISOString();
    const senderName = deviceFromTopology?.name || pcIP || serviceMailUsername;
    const senderAddr = `${serviceMailUsername}@${serviceMailDomain}`;
    const from = `${senderName} <${senderAddr}>`;
    const newInboxEntry = { from, to: msg.from, subject, body: replyBody, timestamp };
    let existingInbox = targetDevice.services?.mail?.inbox || [];
    if (typeof window !== 'undefined') {
      try { const stored = localStorage.getItem(`mail_inbox_${targetDevice.id}`); if (stored) existingInbox = JSON.parse(stored); } catch (_e) {}
    }
    const updatedInbox = [newInboxEntry, ...existingInbox];
    if (typeof window !== 'undefined') localStorage.setItem(`mail_inbox_${targetDevice.id}`, JSON.stringify(updatedInbox));
    const newSentEntry = { from, to: msg.from, subject, body: replyBody, timestamp };
    setServiceMailSent((prev) => [newSentEntry, ...prev]);
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId: targetDevice.id, config: { services: { mail: { enabled: targetDevice.services?.mail?.enabled ?? false, domain: targetDevice.services?.mail?.domain || serviceMailDomain, username: targetDevice.services?.mail?.username || serviceMailUsername, inbox: updatedInbox } } } }
    }));
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config: { services: { mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: [newSentEntry, ...serviceMailSent] } } } }
    }));
    addLocalOutput('success', language === 'tr' ? 'Yanıt gönderildi.' : 'Reply sent.');
    onSuccess();
  }, [serviceMailDomain, serviceMailUsername, serviceMailEnabled, serviceMailPassword, serviceMailInbox, serviceMailSent, topologyDevices, topologyConnections, deviceStates, deviceId, addLocalOutput, language, deviceFromTopology, pcIP]);

  const handleDeleteInbox = useCallback((idx: number) => {
    const updated = serviceMailInbox.filter((_, i) => i !== idx);
    setServiceMailInbox(updated);
    dispatchDeviceConfig({
      services: {
        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
        ftp: { enabled: serviceFtpEnabled },
        mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: updated, sent: serviceMailSent },
        dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
      }
    });
  }, [serviceMailInbox, serviceMailEnabled, serviceMailDomain, serviceMailUsername, serviceMailPassword, serviceMailSent, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceFtpEnabled, serviceDhcpEnabled, serviceDhcpPools, dispatchDeviceConfig]);

  const handleDeleteSent = useCallback((idx: number) => {
    const updated = serviceMailSent.filter((_, i) => i !== idx);
    setServiceMailSent(updated);
    dispatchDeviceConfig({
      services: {
        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
        ftp: { enabled: serviceFtpEnabled },
        mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: updated },
        dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
      }
    });
  }, [serviceMailSent, serviceMailEnabled, serviceMailDomain, serviceMailUsername, serviceMailPassword, serviceMailInbox, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceFtpEnabled, serviceDhcpEnabled, serviceDhcpPools, dispatchDeviceConfig]);

  useEffect(() => {
    executeCommandRef.current = executeCommand;
  }, [executeCommand]);

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={panelRef}
        className={cn(
          "relative w-full h-full min-h-0 flex flex-col overflow-hidden",
          className
        )}
      >
        <PCPanelHeader
          isDark={isDark}
          internalPcHostname={internalPcHostname}
          pcIP={pcIP}
          activeTab={activeTab}
          language={language}
          isPcPoweredOff={isPcPoweredOff}
          wifiSignalStrength={wifiSignalStrength}
          showCmdSettings={showCmdSettings}
          isMobile={isMobile}
          ntpPanelTime={ntpPanelTime}
          t={t}
          deviceId={deviceId}
          onGoHome={goHome}
          onNavigateToProgram={navigateToProgram}
          onToggleShowCmdSettings={() => setShowCmdSettings(prev => !prev)}
          onTogglePower={onTogglePower}
          onClose={onClose}
          formatTime={formatTime}
          formatFullDateTime={formatFullDateTime}
        />

        <div className="flex-1 min-h-0 px-2 pb-2 md:px-2 md:pb-2">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] items-center justify-center overflow-hidden">
            <div
              className={cn(
                "relative flex h-full min-h-0 w-full flex-col overflow-hidden shadow-[0_15px_50px_rgba(15,23,42,0.1)]",
                isMobile
                  ? (isDark
                    ? "max-w-[430px] rounded-[2.5rem] border-[10px] border-secondary-950 bg-transparent"
                    : "max-w-[430px] rounded-[2.5rem] border-[10px] border-secondary-200 bg-transparent")
                  : (isDark
                    ? "rounded-[2rem] border border-white/10 bg-transparent"
                    : "rounded-[2rem] border border-white/70 bg-transparent")
              )}
            >
              <div className={cn(
                "relative flex-1 min-h-0 flex flex-col overflow-hidden",
                isDark
                  ? 'bg-[linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)]'
                  : 'bg-[linear-gradient(180deg,#ffffff_0%,#eff6ff_55%,#dbeafe_100%)]'
              )}>
                <div className="pointer-events-none absolute inset-0">
                </div>
                <ModernPanel
                  id={deviceId}
                  title={internalPcHostname}
                  onClose={onClose}
                  collapsible={false}
                  hideTitle={(activeTab === 'desktop' || activeTab === 'terminal') ? false : true}
                  hideHeader={(activeTab === 'desktop' || activeTab === 'terminal') ? false : true}
                  headerAction={<PCPanelTerminalToolbar
                    activeTab={activeTab}
                    isDark={isDark}
                    t={t}
                    isMobile={isMobile}
                    language={language}
                    showCmdSettings={showCmdSettings}
                    onSearchOpen={() => setSearchOpen(true)}
                    onCopyAll={handleCopyAll}
                    onToggleCmdSettings={() => setShowCmdSettings(!showCmdSettings)}
                  />}
                  showHeaderOnMobile
                  noPadding
                  style={{ height: '100%' }}
                  className="w-full min-w-0 h-full flex flex-col relative bg-transparent border-none shadow-none"
                >
                  {/* Power Off Overlay - Mobile/Desktop ekranını tamamen karartır */}
                  {isPcPoweredOff && <PowerOffOverlay />}
                  <div className="bg-transparent flex-1 min-h-0 flex flex-col">

                    <SearchOutputDialog
                      open={searchOpen}
                      onOpenChange={setSearchOpen}
                      isDark={isDark}
                      labels={{
                        searchOutputTitle: t.searchOutputTitle,
                        searchOutputDescription: t.searchOutputDescription,
                        searchPlaceholder: t.searchPlaceholder,
                        close: t.close,
                      }}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                    />

                    {/* Navigation Tabs - Hide on mobile, use main app tabs */}
                    <HiddenNavigationTabs
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                      isMobile={isMobile}
                      language={language}
                      httpAppContent={httpAppContent}
                      httpAppDeviceId={httpAppDeviceId}
                      openWebPage={openWebPage}
                      labels={{
                        commandPromptTab: t.commandPromptTab,
                        consoleTab: t.consoleTab,
                        settingsTab: t.settingsTab,
                        servicesTab: t.servicesTab,
                      }}
                    />

                    {/* Content Area */}
                    <div className={cn(
                      "relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden",
                      "p-[5px]",
                      isMobile ? "mx-[10px]" : "" // Add horizontal margin for mobile
                    )}>
                      {activeTab === 'home' && !isPcPoweredOff && (
                        <HomeLauncher
                          apps={launcherApps}
                          isDark={isDark}
                          isPoweredOff={isPcPoweredOff}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                          onNavigate={navigateToProgram}
                        />
                      )}

                      {activeTab === 'desktop' && (
                        <CommandLineTab
                          isDark={isDark}
                          language={language}
                          t={t}
                          fontSize={fontSize}
                          terminalBg={terminalBg}
                          textColor={textColor}
                          isMobile={isMobile}
                          isPcPoweredOff={isPcPoweredOff}
                          pcOutput={pcOutput}
                          setPcOutput={setPcOutput}
                          input={input}
                          setInput={setInput}
                          isCmdInputDisabled={isCmdInputDisabled}
                          ftpSession={ftpSession}
                          internalPcHostname={internalPcHostname}
                          showCmdSettings={showCmdSettings}
                          handleFontSizeChange={handleFontSizeChange}
                          executeCommand={executeCommand}
                          inputRef={inputRef}
                          outputRef={outputRef}
                          handleInputChange={handleInputChange}
                          handleKeyDown={handleKeyDown}
                          shouldShowAutocomplete={shouldShowAutocomplete}
                          renderAutocompleteSuggestions={renderAutocompleteSuggestions}
                          autocompleteIndex={autocompleteIndex}
                          autocompleteRef={autocompleteRef}
                          completeAutocompleteSelection={completeAutocompleteSelection}
                          handleResizeStart={handleResizeStart}
                          highlightText={highlightText}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                        />
                      )}

                      {activeTab === 'terminal' && (
                        <ConsoleTerminalTab
                          isDark={isDark}
                          language={language}
                          t={t}
                          fontSize={fontSize}
                          terminalBg={terminalBg}
                          textColor={textColor}
                          isMobile={isMobile}
                          isPcPoweredOff={isPcPoweredOff}
                          isConsoleConnected={isConsoleConnected}
                          connectedDeviceId={connectedDeviceId}
                          topologyDevices={topologyDevices}
                          isConsoleInputDisabled={isConsoleInputDisabled}
                          consoleNeedsPassword={consoleNeedsPassword}
                          consoleConfirmDialog={consoleConfirmDialog}
                          consoleReloadPending={consoleReloadPending}
                          activeConsoleOutput={activeConsoleOutput}
                          setConsoleConnectionTime={setConsoleConnectionTime}
                          setIsConsoleConnected={setIsConsoleConnected}
                          setConnectedDeviceId={setConnectedDeviceId}
                          handleConnect={handleConnect}
                          showCmdSettings={showCmdSettings}
                          executeCommand={executeCommand}
                          input={input}
                          handleInputChange={handleInputChange}
                          handleKeyDown={handleKeyDown}
                          onExecuteDeviceCommand={onExecuteDeviceCommand}
                          setConsolePasswordAttempted={setConsolePasswordAttempted}
                          setInput={setInput}
                          highlightText={highlightText}
                          consoleDevice={consoleDevice}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                        />
                      )}

                      {activeTab === 'settings' && (
                        <IpSettingsTab
                          isDark={isDark}
                          fontSize={fontSize}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                          pcIP={pcIP}
                          setPcIP={setPcIP}
                          pcMAC={pcMAC}
                          setPcMAC={setPcMAC}
                          ipConfigMode={ipConfigMode}
                          setIpConfigMode={setIpConfigMode}
                          pcSubnet={pcSubnet}
                          setPcSubnet={setPcSubnet}
                          pcGateway={pcGateway}
                          setPcGateway={setPcGateway}
                          pcDNS={pcDNS}
                          setPcDNS={setPcDNS}
                          pcIPv6={pcIPv6}
                          setPcIPv6={setPcIPv6}
                          pcIPv6Prefix={pcIPv6Prefix}
                          setPcIPv6Prefix={setPcIPv6Prefix}
                          internalPcHostname={internalPcHostname}
                          setPcHostname={setPcHostname}
                          serviceNtpServer={serviceNtpServer}
                          setServiceNtpServer={setServiceNtpServer}
                          serviceNtpServerError={serviceNtpServerError}
                          setServiceNtpServerError={setServiceNtpServerError}
                          setServiceNtpServerPreset={setServiceNtpServerPreset}
                          serviceNtpEnabled={serviceNtpEnabled}
                          serviceNtpDate={serviceNtpDate}
                          serviceNtpTime={serviceNtpTime}
                          errors={errors}
                          setErrors={setErrors}
                          t={t}
                          language={language}
                          dispatchDeviceConfig={dispatchDeviceConfig}
                          validateIpField={validateIpField}
                          validateSubnetField={validateSubnetField}
                          isValidIpAddress={isValidIpAddress}
                          applyNtpServerTime={applyNtpServerTime}
                          deviceId={deviceId}
                          manualDhcpClickRef={manualDhcpClickRef}
                          applyDhcpLeaseRef={applyDhcpLeaseRef}
                        />
                      )}

                      {activeTab === 'services' && (
                        <ServicesTab
                          isDark={isDark}
                          language={language}
                          t={t}
                          activeServiceTab={activeServiceTab}
                          setActiveServiceTab={setActiveServiceTab}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                          dispatchDeviceConfig={dispatchDeviceConfig}
                          serviceDnsEnabled={serviceDnsEnabled}
                          setServiceDnsEnabled={setServiceDnsEnabled}
                          serviceDnsRecords={serviceDnsRecords}
                          setServiceDnsRecords={setServiceDnsRecords}
                          dnsFormDomain={dnsFormDomain}
                          setDnsFormDomain={setDnsFormDomain}
                          dnsFormAddress={dnsFormAddress}
                          setDnsFormAddress={setDnsFormAddress}
                          handleAddDnsRecord={handleAddDnsRecord}
                          getDnsRecordDisplay={getDnsRecordDisplay}
                          isDnsEditingRef={isDnsEditingRef}
                          serviceHttpEnabled={serviceHttpEnabled}
                          setServiceHttpEnabled={setServiceHttpEnabled}
                          serviceHttpContent={serviceHttpContent}
                          setServiceHttpContent={setServiceHttpContent}
                          serviceFtpEnabled={serviceFtpEnabled}
                          setServiceFtpEnabled={setServiceFtpEnabled}
                          serviceFtpFiles={serviceFtpFiles}
                          setServiceFtpFiles={setServiceFtpFiles}
                          serviceDhcpEnabled={serviceDhcpEnabled}
                          setServiceDhcpEnabled={setServiceDhcpEnabled}
                          serviceDhcpPools={serviceDhcpPools}
                          setServiceDhcpPools={setServiceDhcpPools}
                          dhcpForm={dhcpForm}
                          setDhcpForm={setDhcpForm}
                          editingDhcpIndex={editingDhcpIndex}
                          setEditingDhcpIndex={setEditingDhcpIndex}
                          isDhcpEditingRef={isDhcpEditingRef}
                          serviceNtpEnabled={serviceNtpEnabled}
                          setServiceNtpEnabled={setServiceNtpEnabled}
                          serviceNtpServer={serviceNtpServer}
                          serviceNtpDate={serviceNtpDate}
                          setServiceNtpDate={setServiceNtpDate}
                          serviceNtpTime={serviceNtpTime}
                          setServiceNtpTime={setServiceNtpTime}
                          serviceMailEnabled={serviceMailEnabled}
                          setServiceMailEnabled={setServiceMailEnabled}
                          serviceMailDomain={serviceMailDomain}
                          setServiceMailDomain={setServiceMailDomain}
                          serviceMailUsername={serviceMailUsername}
                          setServiceMailUsername={setServiceMailUsername}
                          serviceMailPassword={serviceMailPassword}
                          setServiceMailPassword={setServiceMailPassword}
                          serviceMailInbox={serviceMailInbox}
                          setServiceMailInbox={setServiceMailInbox}
                          serviceMailSent={serviceMailSent}
                          setServiceMailSent={setServiceMailSent}
                          mailPop3Blocked={mailPop3Blocked}
                          handleComposeSend={handleComposeSend}
                          handleViewReplySend={handleViewReplySend}
                          handleDeleteInbox={handleDeleteInbox}
                          handleDeleteSent={handleDeleteSent}
                        />
                      )}

                      {activeTab === 'iot' && (
                        <IotDashboardTab
                          isDark={isDark}
                          language={language}
                          isMobile={isMobile}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                          iotDevices={iotDevices}
                          selectedIotDeviceId={selectedIotDeviceId}
                          setSelectedIotDeviceId={setSelectedIotDeviceId}
                          selectedIotDevice={selectedIotDevice}
                          iotSensorType={iotSensorType}
                          setIotSensorType={setIotSensorType}
                          iotKind={iotKind}
                          setIotKind={setIotKind}
                          iotCollaborationEnabled={iotCollaborationEnabled}
                          setIotCollaborationEnabled={setIotCollaborationEnabled}
                          iotDataStore={iotDataStore}
                          setIotDataStore={setIotDataStore}
                          topologyDevices={topologyDevices}
                          deviceStates={deviceStates}
                          topologyConnections={topologyConnections}
                          deviceId={deviceId}
                          wifiSSID={wifiSSID}
                          navigateToProgram={(program) => navigateToProgram(program as PCActiveTab)}
                          setInput={setInput}
                          executeCommand={executeCommand}
                          environment={environment}
                        />
                      )}

                      {activeTab === 'wireless' && (
                        <WirelessConfigTab
                          isDark={isDark}
                          language={language}
                          t={t}
                          wifiEnabled={wifiEnabled}
                          setWifiEnabled={setWifiEnabled}
                          wifiSSID={wifiSSID}
                          setWifiSSID={setWifiSSID}
                          wifiBSSID={wifiBSSID}
                          setWifiBSSID={setWifiBSSID}
                          wifiSecurity={wifiSecurity}
                          setWifiSecurity={setWifiSecurity}
                          wifiPassword={wifiPassword}
                          setWifiPassword={setWifiPassword}
                          wifiChannel={wifiChannel}
                          setWifiChannel={setWifiChannel}
                          availableSSIDs={availableSSIDs}
                          deviceStates={deviceStates}
                          topologyDevices={topologyDevices}
                          deviceId={deviceId}
                          wifiSignalStrength={wifiSignalStrength}
                          dispatchDeviceConfig={dispatchDeviceConfig}
                          navigateToProgram={(program) => navigateToProgram(program as PCActiveTab)}
                          setInput={setInput}
                          executeCommand={executeCommand}
                          mobileVerticalScrollStyle={mobileVerticalScrollStyle}
                        />
                      )}
                    </div>
                  </div>
                </ModernPanel>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FtpFileTransferDialog
        open={isFtpFilePickerOpen}
        onOpenChange={setIsFtpFilePickerOpen}
        session={ftpSession}
        localFiles={pcLocalFiles}
        language={language}
        isDark={isDark}
        onGetFile={(fileName) => handleFtpSessionCommand(`get ${fileName}`)}
        onPutFile={executeFtpPut}
      />

      <HttpBrowserWindow
        isOpen={!!httpAppContent}
        isMobile={isMobile}
        isDark={isDark}
        language={language}
        browserWindow={browserWindow}
        onBrowserWindowChange={setBrowserWindow}
        title={httpAppTitle}
        url={httpAppUrl || ''}
        srcDoc={httpAppSrcDoc}
        suggestions={filteredSuggestions}
        showSuggestions={showUrlSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
        urlInputRef={urlInputRef}
        dragStateRef={dragStateRef}
        resizeStateRef={resizeStateRef}
        onClose={() => {
          setHttpAppUrl('');
          setHttpAppContent(null);
          setHttpAppDeviceId(null);
          inputRef.current?.focus();
        }}
        onUrlChange={setHttpAppUrl}
        onSetShowSuggestions={setShowUrlSuggestions}
        onSetSelectedSuggestionIndex={setSelectedSuggestionIndex}
        onOpenWebPage={openWebPage}
      />
    </>
  );
}
