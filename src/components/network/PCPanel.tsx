'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo, type CSSProperties } from 'react';
import { useEnvironment } from '@/lib/store/appStore';
import { Port, SwitchState } from '@/lib/network/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { TerminalOutput } from './Terminal';
import type { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { checkConnectivity, getWirelessSignalStrength, getWirelessDistance, getDeviceWifiConfig } from '@/lib/network/connectivity';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Laptop, Monitor, Terminal as TerminalIcon, X, CornerDownLeft, Globe, Network, History, Search, Copy, Save, Trash2, Download, Settings, Wifi, Eye, EyeOff, Radio, ArrowLeft, SlidersHorizontal, Plus, Reply, Send } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { ShortcutBadge } from '@/components/ui/ShortcutBadge';
import { toast } from "@/hooks/use-toast";
import { isValidMAC, normalizeMAC, cn } from "@/lib/utils";
import { ModernPanel } from '@/components/ui/ModernPanel';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { sanitizeHTTPContent } from '@/lib/security/sanitizer';
import { generateRouterAdminPage, isRouterDevice } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { WifiSignalMeter, IoTSensorDisplay } from './PCPanelWidgets';
import { expandCommandContext, DESKTOP_COMMANDS } from './pcPanel.utils';
import { errorHandler, STORAGE_ERRORS, DHCP_ERRORS, CLIPBOARD_ERRORS, DEVICE_ERRORS } from '@/lib/errors/errorHandler';
import { logger } from '@/lib/logger';
import { getL3Hops } from '@/lib/network/routing';
import { FormInput } from '@/components/ui/FormInput';
import { NetworkInputField } from './pc-panel/NetworkInputField';
import { SearchOutputDialog } from './pc-panel/SearchOutputDialog';
import { HiddenNavigationTabs } from './pc-panel/HiddenNavigationTabs';
import { FtpFileTransferDialog } from './pc-panel/FtpFileTransferDialog';
import { HttpBrowserWindow } from './pc-panel/HttpBrowserWindow';
import { HomeLauncher } from './pc-panel/HomeLauncher';
import { PowerOffOverlay } from './pc-panel/PowerOffOverlay';
import { getDefaultPcFiles, getPCConfigDefaults } from './pc-panel/pcPanelFiles';
import type { DhcpPoolConfig, FtpSession, OutputLine, PCActiveTab, PCPanelProps, PcFile } from './pc-panel/PCPanel.types';


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

  // Helper to render network input fields to avoid repetition
  const renderNetworkInput = useCallback((
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    error?: string,
    disabled?: boolean,
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void,
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  ) => (
    <NetworkInputField
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  ), []);

  // Ref for click-outside detection
  const panelRef = useRef<HTMLDivElement>(null);

  const terminalBg = isDark ? 'bg-black' : 'bg-secondary-50';
  const textColor = isDark ? 'text-secondary-300' : 'text-secondary-700';

  const [activeTab, setActiveTab] = useState<PCActiveTab>(initialTab || 'home');
  const activeTabRef = useRef<PCActiveTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
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

  // Handle browser back button for tablet navigation
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
  const [composeMode, setComposeMode] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [viewingMsg, setViewingMsg] = useState<{ type: 'inbox' | 'sent'; msg: { from?: string; to?: string; subject: string; body: string; timestamp?: string }; idx: number } | null>(null);
  const [viewReplyBody, setViewReplyBody] = useState('');
  const [mailError, setMailError] = useState('');
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
  const [ssidDropdownOpen, setSsidDropdownOpen] = useState(false);
  const [wifiSecurity, setWifiSecurity] = useState(deviceFromTopology?.wifi?.security ?? 'open');
  const [wifiPassword, setWifiPassword] = useState(deviceFromTopology?.wifi?.password ?? '');
  const [showWifiPassword, setShowWifiPassword] = useState(false);
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

    // First check deviceStates (router/switch runtime state) - only AP mode
    if (deviceStates) {
      ensureDeviceStatesMap(deviceStates).forEach((state, stateId) => {
        if (stateId === deviceId) return; // skip self
        const stateDevice = topologyDevices.find(d => d.id === stateId);
        // Only router/switch can be AP, not PC
        if (!stateDevice || (stateDevice.type !== 'router' && stateDevice.type !== 'switchL2' && stateDevice.type !== 'switchL3')) return;
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
        if (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3') return;
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

  // Trigger sync on change (debounced) - uses ref to avoid circular dependency
  // DISABLED: This effect was causing infinite loop with topology updates
  // Manual sync is now triggered by specific user actions instead
  /*
  const syncTriggerRef = useRef(false);
  useEffect(() => {
    if (!syncTriggerRef.current) {
      syncTriggerRef.current = true;
      return;
    }
    const handler = setTimeout(() => {
      syncToGlobalRef.current();
    }, 500);
    return () => clearTimeout(handler);
  }, [pcIP, pcMAC, pcSubnet, pcGateway, pcDNS, pcIPv6, pcIPv6Prefix, internalPcHostname, ipConfigMode, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceFtpEnabled, serviceFtpFiles, serviceMailEnabled, serviceMailDomain, serviceMailSmtpServer, serviceMailPop3Server, serviceMailUsername, serviceMailPassword, serviceMailInbox, serviceMailSent, serviceNtpEnabled, serviceNtpServer, serviceNtpDate, serviceNtpTime, serviceDhcpEnabled, serviceDhcpPools, wifiEnabled, wifiSSID, wifiBSSID, wifiSecurity, wifiPassword, wifiChannel]);
  */

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
  const httpContentRef = useRef<HTMLTextAreaElement>(null);

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

  // Find connected console device
  const getConsoleDevice = useCallback(() => {
    if (!topologyConnections || !deviceId) return null;
    const connection = topologyConnections.find(conn => {
      if (conn.cableType !== 'console' || conn.active === false) return false;
      const isSource = conn.sourceDeviceId === deviceId;
      const isTarget = conn.targetDeviceId === deviceId;
      if (isSource) {
        const port = conn.sourcePort.toLowerCase();
        return port.startsWith('com') || port === 'console' || port === 'rs232';
      }
      if (isTarget) {
        const port = conn.targetPort.toLowerCase();
        return port.startsWith('com') || port === 'console' || port === 'rs232';
      }
      return false;
    });
    if (!connection) return null;
    const otherId = connection.sourceDeviceId === deviceId ? connection.targetDeviceId : connection.sourceDeviceId;
    return topologyDevices.find(d => d.id === otherId && ((d.type === 'switchL2' || d.type === 'switchL3') || d.type === 'router')) || null;
  }, [deviceId, topologyConnections, topologyDevices]);

  const consoleDevice = getConsoleDevice();


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

  const getAutocompleteSuggestions = useCallback((value: string) => {
    const isIpv4 = (raw: string) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(raw);
    const collectKnownIps = () => {
      const fromDevices = (topologyDevices || [])
        .map((d) => d.ip)
        .filter((ip): ip is string => !!ip && isIpv4(ip) && ip !== '0.0.0.0' && ip !== '169.254.0.0');
      const fromStates = Array.from(deviceStates?.values() || [])
        .flatMap((s) => Object.values(s.ports || {}).map((p: Port) => (p as { ipAddress?: string }).ipAddress))
        .filter((ip): ip is string => !!ip && isIpv4(ip) && ip !== '0.0.0.0' && ip !== '169.254.0.0');
      return Array.from(new Set([...fromDevices, ...fromStates]));
    };

    const trimmed = value.trim();
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const currentWord = value.endsWith(' ') ? '' : (tokens[tokens.length - 1] || '').toLowerCase();
    const expectsIpArg = /^(?:telnet|ssh|ping|curl|wget|ip\s+default-gateway|default-router|dns-server)\s+\S*$/i.test(trimmed)
      || /^(?:telnet|ssh|ping|curl|wget|ip\s+default-gateway|default-router|dns-server)\s*$/i.test(trimmed);

    if (activeTab === 'desktop') {
      const base = DESKTOP_COMMANDS
        .filter((cmd) => cmd !== '?' && cmd.startsWith(currentWord))
        .slice(0, 8);
      if (!expectsIpArg) return base;
      const ipSuggestions = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(currentWord));
      return Array.from(new Set([...ipSuggestions, ...base])).slice(0, 8);
    }

    const mode = getCommandMode();
    const { candidates, currentWord: ctxCurrentWord } = expandCommandContext(mode, value);
    const suggestions = candidates.filter(
      (opt: string) => opt !== '?' && opt.toLowerCase().startsWith(ctxCurrentWord)
    );
    if (!expectsIpArg) return suggestions.slice(0, 8);
    const ipSuggestions = collectKnownIps().filter((ip) => ip.toLowerCase().startsWith(ctxCurrentWord || currentWord));
    return Array.from(new Set([...ipSuggestions, ...suggestions])).slice(0, 8);
  }, [activeTab, getCommandMode, topologyDevices, deviceStates]);

  const renderAutocompleteSuggestions = useMemo(
    () => getAutocompleteSuggestions(input),
    [getAutocompleteSuggestions, input]
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

  const isSameSubnet = useCallback((sourceIp: string, targetIp: string, subnetMask: string) => {
    try {
      const a = sourceIp.split('.').map(Number);
      const b = targetIp.split('.').map(Number);
      const m = subnetMask.split('.').map(Number);
      if (a.length !== 4 || b.length !== 4 || m.length !== 4) return false;
      for (let i = 0; i < 4; i += 1) {
        if ((a[i] & m[i]) !== (b[i] & m[i])) return false;
      }
      return true;
    } catch (err) {
      // IP subnet comparison failed - expected for malformed IPs
      if (process.env.NODE_ENV === 'development') {
        errorHandler.logError(new Error('Subnet comparison failed'), { sourceIp, targetIp, subnetMask, error: String(err) });
      }
      return false;
    }
  }, []);

  const hasGatewayForTarget = useCallback((targetIp: string) => {
    if (!isValidIpv4(pcIP) || !isValidIpv4(targetIp) || !isValidIpv4(pcSubnet)) return false;
    if (isSameSubnet(pcIP, targetIp, pcSubnet)) return true;
    return isValidIpv4(pcGateway);
  }, [pcGateway, pcIP, pcSubnet]);

  const getPortAccessVlan = useCallback((port: { accessVlan?: unknown; vlan?: unknown } | null | undefined) => Number(port?.accessVlan || port?.vlan || 1), []);

  const getPeerPortVlan = useCallback((ownerDeviceId: string, ownerPortId: string) => {
    const connection = topologyConnections.find((conn) =>
      conn.active !== false &&
      (
        (conn.sourceDeviceId === ownerDeviceId && conn.sourcePort === ownerPortId) ||
        (conn.targetDeviceId === ownerDeviceId && conn.targetPort === ownerPortId)
      )
    );
    if (!connection) return null;

    const peerDeviceId = connection.sourceDeviceId === ownerDeviceId ? connection.targetDeviceId : connection.sourceDeviceId;
    const peerPortId = connection.sourceDeviceId === ownerDeviceId ? connection.targetPort : connection.sourcePort;
    const peerPort = deviceStates?.get(peerDeviceId)?.ports?.[peerPortId];
    if (!peerPort) return null;
    if (peerPort.mode === 'trunk') return 1;
    return getPortAccessVlan(peerPort);
  }, [deviceStates, getPortAccessVlan, topologyConnections]);

  const inferEndpointVlan = useCallback((endpoint: CanvasDevice | undefined) => {
    if (!endpoint) return 1;

    const connection = topologyConnections.find((conn) =>
      conn.active !== false &&
      (conn.sourceDeviceId === endpoint.id || conn.targetDeviceId === endpoint.id)
    );
    if (!connection) {
      return Number(endpoint.vlan || 1);
    }

    const peerDeviceId = connection.sourceDeviceId === endpoint.id ? connection.targetDeviceId : connection.sourceDeviceId;
    const peerPortId = connection.sourceDeviceId === endpoint.id ? connection.targetPort : connection.sourcePort;
    const peerPort = deviceStates?.get(peerDeviceId)?.ports?.[peerPortId];
    if (!peerPort) {
      return Number(endpoint.vlan || 1);
    }
    if (peerPort.mode === 'trunk') return 1;
    return getPortAccessVlan(peerPort);
  }, [deviceStates, getPortAccessVlan, topologyConnections]);

  const getServerPoolVlan = useCallback((
    serverDevice: CanvasDevice | undefined,
    serverState: SwitchState | undefined,
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string
  ) => {
    if (!serverDevice || !isValidIpv4(poolSubnetMask)) return null;

    const anchorIp = isValidIpv4(poolGateway) ? poolGateway : poolStartIp;
    if (!isValidIpv4(anchorIp)) return null;

    if (serverDevice.type === 'pc') {
      if (isValidIpv4(serverDevice.ip || '') && isSameSubnet(serverDevice.ip || '', anchorIp, poolSubnetMask)) {
        return inferEndpointVlan(serverDevice);
      }
      return null;
    }

    const ports = serverState?.ports || {};
    for (const [portId, port] of Object.entries(ports)) {
      if (!port?.ipAddress || port.shutdown) continue;
      const effectiveMask = port.subnetMask || poolSubnetMask;
      if (!isValidIpv4(effectiveMask) || !isSameSubnet(port.ipAddress, anchorIp, effectiveMask)) continue;

      const sviMatch = portId.match(/^vlan(\d+)$/i);
      if (sviMatch) return parseInt(sviMatch[1], 10) || 1;
      if (port.mode === 'trunk') return 1;
      if (port.accessVlan || port.vlan) return getPortAccessVlan(port);

      const peerVlan = getPeerPortVlan(serverDevice.id, portId);
      return peerVlan ?? 1;
    }

    if (isValidIpv4(serverDevice.ip || '') && isSameSubnet(serverDevice.ip || '', anchorIp, poolSubnetMask)) {
      return inferEndpointVlan(serverDevice);
    }

    return null;
  }, [getPeerPortVlan, getPortAccessVlan, inferEndpointVlan, isSameSubnet, isValidIpv4]);

  const isDhcpPoolCompatibleForClient = useCallback((
    poolGateway: string,
    poolStartIp: string,
    poolSubnetMask: string,
    serverDevice: CanvasDevice | undefined,
    serverState?: SwitchState
  ) => {
    const clientDevice = deviceFromTopology;
    if (!clientDevice) return false;

    const clientWifi = getDeviceWifiConfig(clientDevice, deviceStates);
    if (clientWifi?.enabled && clientWifi.mode === 'client' && clientWifi.ssid) {
      const serverWifi = getDeviceWifiConfig(serverDevice, deviceStates);
      if (!serverWifi?.enabled || serverWifi.mode !== 'ap' || serverWifi.ssid !== clientWifi.ssid) {
        return false;
      }
      return getServerPoolVlan(serverDevice, serverState, poolGateway, poolStartIp, poolSubnetMask) !== null;
    }

    const clientVlan = inferEndpointVlan(clientDevice);
    const serverVlan = getServerPoolVlan(serverDevice, serverState, poolGateway, poolStartIp, poolSubnetMask);
    return serverVlan !== null && clientVlan === serverVlan;
  }, [deviceFromTopology, deviceStates, getServerPoolVlan, inferEndpointVlan]);

  const isLoopbackTarget = useCallback((target: string) => target.trim() === '127.0.0.1', []);

  const normalizeLookupTarget = useCallback((raw: string) => {
    const value = (raw || '').trim();
    if (!value) return '';
    try {
      const withScheme = value.startsWith('http://') || value.startsWith('https://')
        ? value
        : `http://${value}`;
      const parsed = new URL(withScheme);
      return parsed.hostname || value;
    } catch (_err) {
      // URL parsing failed - using fallback extraction
      return value.split('/')[0].split('?')[0].trim();
    }
  }, []);

  const resolveDeviceNameTarget = useCallback((raw: string) => {
    const normalized = (raw || '').trim().toLowerCase();
    if (!normalized) return null;

    if (normalized === 'localhost' || normalized === internalPcHostname.toLowerCase() || normalized === deviceId.toLowerCase()) {
      return { ip: '127.0.0.1', label: internalPcHostname };
    }

    const matched = topologyDevices.find((d) =>
      d.name?.toLowerCase() === normalized || d.id?.toLowerCase() === normalized
    );
    if (!matched) return null;

    if (matched.ip && isValidIpv4(matched.ip)) {
      return { ip: matched.ip, label: matched.name || matched.id };
    }

    const state = deviceStates?.get(matched.id);
    if (state?.ports) {
      for (const port of Object.values(state.ports)) {
        if (port?.ipAddress && isValidIpv4(port.ipAddress)) {
          return { ip: port.ipAddress, label: matched.name || matched.id };
        }
      }
    }

    return null;
  }, [deviceId, deviceStates, internalPcHostname, isValidIpv4, topologyDevices]);

  const resolveDomainWithDnsServices = useCallback((domain: string) => {
    const normalized = domain.trim().toLowerCase();
    if (!normalized) return null;

    if (!isValidIpv4(pcDNS) && !isValidIpv6(pcDNS)) return null;

    let dnsServerDevice = topologyDevices.find(
      (d) => (d.ip === pcDNS || d.ipv6 === pcDNS) && d.services?.dns?.enabled && (d.services?.dns?.records?.length || 0) > 0
    );

    let records = dnsServerDevice?.services?.dns?.records || [];

    // Also check deviceStates for DNS records (e.g. from a Router)
    if (deviceStates) {
      for (const [id, state] of deviceStates.entries()) {
        if (state.services?.dns?.enabled && (state.services.dns.records?.length || 0) > 0) {
          const topoDev = topologyDevices.find(d => d.id === id);
          // Check if this device has the IP we're looking for on ANY of its interfaces
          const hasIp = topoDev?.ip === pcDNS || topoDev?.ipv6 === pcDNS || Object.values(state.ports).some(p => p.ipAddress === pcDNS || p.ipv6Address === pcDNS);

          if (hasIp) {
            dnsServerDevice = topoDev || { id, name: state.hostname, ip: pcDNS } as unknown as CanvasDevice;
            records = state.services?.dns?.records || [];
            break;
          }
        }
      }
    }

    if ((!dnsServerDevice?.ip && !dnsServerDevice?.ipv6) || !canReachTargetIp(pcDNS, { protocol: 'udp', port: '53' })) return null;

    // Support CNAME-like records in DNS service:
    // domain -> another domain -> ... -> final IP address
    const visited = new Set<string>();
    let currentDomain = normalized;

    for (let depth = 0; depth < 10; depth += 1) {
      if (visited.has(currentDomain)) return null;
      visited.add(currentDomain);

      const record = (records || []).find((r: { domain: string }) => r.domain.toLowerCase() === currentDomain);
      if (!record) return null;

      const value = record.address.trim().toLowerCase();
      if (!value) return null;
      if (isValidIpv4(value) || isValidIpv6(value)) {
        return { address: value, server: dnsServerDevice };
      }

      currentDomain = value;
    }

    return null;
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

  const serviceTabClass = (tab: 'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp') => cn(
    'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-xs font-semibold transition-all duration-200 ease-out focus-ring-animate',
    activeServiceTab === tab
      ? isDark
        ? 'bg-secondary-900 text-white border-secondary-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
        : 'bg-white text-secondary-900 border-secondary-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
      : isDark
        ? 'bg-secondary-950/40 text-secondary-400 border-transparent hover:text-secondary-200 hover:bg-secondary-900/60'
        : 'bg-secondary-100/80 text-secondary-500 border-transparent hover:text-secondary-700 hover:bg-secondary-50'
  );

  const getServiceTabIcon = (tab: 'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp') => {
    switch (tab) {
      case 'dns':
        return <Globe className="w-3.5 h-3.5" />;
      case 'http':
        return <Globe className="w-3.5 h-3.5" />;
      case 'dhcp':
        return <Network className="w-3.5 h-3.5" />;
      case 'ftp':
        return <Download className="w-3.5 h-3.5" />;
      case 'mail':
        return <Settings className="w-3.5 h-3.5" />;
      case 'ntp':
        return <History className="w-3.5 h-3.5" />;
    }
  };

  const findHttpServerByTarget = useCallback((target: string) => {
    const normalizedTarget = target.trim().toLowerCase();
    if (!normalizedTarget) return null;

    // Localhost should always resolve to the current PC first.
    if (normalizedTarget === '127.0.0.1' || normalizedTarget === '::1') {
      const selfDevice = topologyDevices.find((d) => d.id === deviceId);
      if (selfDevice && selfDevice.services?.http?.enabled) return selfDevice;
    }

    // Check for PC HTTP servers
    const pcByIp = topologyDevices.find(
      (d) => (d.ip === target || d.ipv6?.toLowerCase() === normalizedTarget) && d.services?.http?.enabled
    );
    if (pcByIp) {
      const targetAddress = pcByIp.ipv6 && normalizedTarget === pcByIp.ipv6.toLowerCase() ? pcByIp.ipv6 : pcByIp.ip;
      if (targetAddress && canReachTargetIp(targetAddress, { protocol: 'tcp', port: '80' })) return pcByIp;
    }

    // Check for router/switch devices with HTTP service enabled
    const routerByIp = topologyDevices.find(
      (d) => (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') && (d.ip === target || d.ipv6?.toLowerCase() === normalizedTarget) && d.services?.http?.enabled
    );
    if (routerByIp) {
      const targetAddress = routerByIp.ipv6 && normalizedTarget === routerByIp.ipv6.toLowerCase() ? routerByIp.ipv6 : routerByIp.ip;
      if (targetAddress && canReachTargetIp(targetAddress, { protocol: 'tcp', port: '80' })) return routerByIp;
    }

    // Fallback: look into deviceStates interface IPs for devices that have HTTP enabled
    if (deviceStates) {
      for (const [stateId, state] of deviceStates.entries()) {
        if (!state?.services?.http?.enabled) continue;
        const topoDevice = topologyDevices.find(d => d.id === stateId);
        if (!topoDevice || (topoDevice.type !== 'router' && topoDevice.type !== 'switchL2' && topoDevice.type !== 'switchL3')) continue;
        const ports = state.ports || {};
        const match = Object.values(ports).find((port: { ipAddress?: string; ipv6Address?: string }) => port?.ipAddress === target || port?.ipv6Address?.toLowerCase() === normalizedTarget);
        if (match) {
          const matchIp = match.ipv6Address && normalizedTarget === match.ipv6Address.toLowerCase() ? match.ipv6Address : (match.ipAddress || target);
          if (canReachTargetIp(matchIp, { protocol: 'tcp', port: '80' })) {
            return {
              ...topoDevice,
              ip: matchIp
            };
          }
        }
      }
    }

    // Try DNS resolution
    const dnsResult = resolveDomainWithDnsServices(normalizedTarget);
    if (!dnsResult) return null;

    // Check resolved address for PC HTTP server
    const resolvedPc = topologyDevices.find(
      (d) => (d.ip === dnsResult.address || d.ipv6?.toLowerCase() === dnsResult.address.toLowerCase()) && d.services?.http?.enabled
    ) || null;
    if (resolvedPc && canReachTargetIp(dnsResult.address, { protocol: 'tcp', port: '80' })) return resolvedPc;

    // Check resolved address for router/switch with HTTP service enabled
    const resolvedRouter = topologyDevices.find(
      (d) => (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') && (d.ip === dnsResult.address || d.ipv6?.toLowerCase() === dnsResult.address.toLowerCase()) && d.services?.http?.enabled
    ) || null;
    if (resolvedRouter && canReachTargetIp(dnsResult.address, { protocol: 'tcp', port: '80' })) return resolvedRouter;

    // DNS fallback via deviceStates interfaces
    if (deviceStates) {
      for (const [stateId, state] of deviceStates.entries()) {
        if (!state?.services?.http?.enabled) continue;
        const topoDevice = topologyDevices.find(d => d.id === stateId);
        if (!topoDevice || (topoDevice.type !== 'router' && topoDevice.type !== 'switchL2' && topoDevice.type !== 'switchL3')) continue;
        const ports = state.ports || {};
        const match = Object.values(ports).find((port: { ipAddress?: string; ipv6Address?: string }) => port?.ipAddress === dnsResult.address || port?.ipv6Address?.toLowerCase() === dnsResult.address.toLowerCase());
        if (match) {
          const matchIp = match.ipv6Address && dnsResult.address.toLowerCase() === match.ipv6Address.toLowerCase() ? match.ipv6Address : (match.ipAddress || dnsResult.address);
          if (canReachTargetIp(matchIp, { protocol: 'tcp', port: '80' })) {
            return {
              ...topoDevice,
              ip: matchIp
            };
          }
        }
      }
    }

    return null;
  }, [canReachTargetIp, resolveDomainWithDnsServices, topologyDevices, deviceStates, deviceId]);

  const openWebPage = useCallback((rawTarget?: string, rawUrl?: string) => {
    const rawInput = (rawTarget || '').trim();
    const normalizedInput = rawInput || '192.168.1.10';
    let lookupTarget = normalizeLookupTarget(normalizedInput);
    let displayUrl = normalizedInput.startsWith('http://') || normalizedInput.startsWith('https://')
      ? normalizedInput
      : `http://${normalizedInput}`;
    if (rawUrl && rawUrl.trim().length > 0) {
      const candidate = rawUrl.trim();
      displayUrl = candidate.startsWith('http://') || candidate.startsWith('https://') ? candidate : `http://${candidate}`;
      lookupTarget = normalizeLookupTarget(candidate);
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
    const namedTarget = resolveDeviceNameTarget(target);
    const resolvedTargetIp = namedTarget?.ip || target;

    const isIpV6 = isValidIpv6(resolvedTargetIp);
    if (!isIpV6 && !isValidIpv4(resolvedTargetIp)) {
      // Domain lookup
      if (!isValidIpv4(pcDNS) && !isValidIpv6(pcDNS)) {
        addLocalOutput('error', t.dnsAddressRequired);
        return;
      }
      if (isValidIpv4(pcDNS) && !hasGatewayForTarget(pcDNS)) {
        addLocalOutput('error', t.dnsGatewayRequired);
        return;
      }
    } else if (isValidIpv4(resolvedTargetIp)) {
      if (!isLoopbackTarget(resolvedTargetIp) && !hasGatewayForTarget(resolvedTargetIp)) {
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

    const httpServer = findHttpServerByTarget(resolvedTargetIp);
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
  }, [addLocalOutput, deviceStates, findHttpServerByTarget, getAvailableIotDevices, getConnectedIotDevices, hasGatewayForTarget, isLoopbackTarget, isValidIpv4, isValidIpv6, language, normalizeLookupTarget, pcDNS, resolveDeviceNameTarget, t, iotDevices, topologyDevices, generateIotWebPanelContent, generateIotDevicePageContent, httpAppDeviceId, topologyConnections, pcIPv6]);

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

  const applyHttpFormatting = useCallback((tag: 'b' | 'u' | 'i') => {
    const textarea = httpContentRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    if (selectionStart === null || selectionEnd === null || selectionStart === selectionEnd) return;

    const selected = value.slice(selectionStart, selectionEnd);
    const wrapped = `<${tag}>${selected}</${tag}>`;
    const nextValue = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);
    setServiceHttpContent(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const caret = selectionStart + wrapped.length;
      textarea.setSelectionRange(caret, caret);
    });
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

  const resetDhcpForm = useCallback(() => {
    setDhcpForm({
      poolName: '',
      defaultGateway: '',
      dnsServer: '',
      startIp: '',
      subnetMask: '255.255.255.0',
      maxUsers: 50,
    });
    setEditingDhcpIndex(null);
    isDhcpEditingRef.current = false;
  }, []);

  const saveDhcpPool = useCallback(() => {
    const cleaned: DhcpPoolConfig = {
      poolName: dhcpForm.poolName.trim(),
      defaultGateway: dhcpForm.defaultGateway.trim(),
      dnsServer: dhcpForm.dnsServer.trim(),
      startIp: dhcpForm.startIp.trim(),
      subnetMask: dhcpForm.subnetMask.trim(),
      maxUsers: Number.isFinite(dhcpForm.maxUsers) ? Math.max(1, Number(dhcpForm.maxUsers)) : 1,
    };

    if (!cleaned.poolName || !cleaned.defaultGateway || !cleaned.dnsServer || !cleaned.startIp || !cleaned.subnetMask) {
      return;
    }

    isDhcpEditingRef.current = true;
    const newPools = editingDhcpIndex === null
      ? [...serviceDhcpPools, cleaned]
      : serviceDhcpPools.map((pool, idx) => (idx === editingDhcpIndex ? cleaned : pool));
    setServiceDhcpPools(newPools);
    dispatchDeviceConfig({
      services: {
        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
        dhcp: { enabled: serviceDhcpEnabled, pools: newPools }
      }
    });

    // Reset editing flag after a delay
    setTimeout(() => {
      isDhcpEditingRef.current = false;
    }, 1000);
    resetDhcpForm();
  }, [dhcpForm, editingDhcpIndex, resetDhcpForm]);

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
          if (!isDhcpPoolCompatibleForClient(pool.defaultGateway, pool.startIp, pool.subnetMask, server)) {
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
            if (!isDhcpPoolCompatibleForClient(pool.defaultGateway, pool.startIp, pool.subnetMask, device, state)) {
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
  }, [canReachTargetIp, deviceId, deviceStates, hasPhysicalPathToDevice, ipToNumber, isDhcpPoolCompatibleForClient, numberToIp, topologyDevices, validateIP]);

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
        if (!isDhcpPoolCompatibleForClient(pool.defaultGateway, pool.startIp, pool.subnetMask, server)) {
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
          if (!isDhcpPoolCompatibleForClient(pool.defaultGateway, pool.startIp, pool.subnetMask, device, state)) {
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
  }, [canReachTargetIp, deviceId, deviceStates, hasPhysicalPathToDevice, ipToNumber, isDhcpPoolCompatibleForClient, numberToIp, topologyDevices, validateIP]);

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

          const namedResult = resolveDeviceNameTarget(target);
          if (namedResult) {
            targetIp = namedResult.ip;
            dnsResolved = true;
          }

          // If target is not an IP, try to resolve it via DNS
          if (!isValidIpv4(targetIp) && !isValidIpv6(targetIp)) {
            const dnsResult = resolveDomainWithDnsServices(target);
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
            return;
          }

          const result = checkConnectivity(deviceId, targetIp, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'icmp' });

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
        const targetDomain = rawTargetDomain ? normalizeLookupTarget(rawTargetDomain) : '';
        if (!targetDomain) {
          addLocalOutput('output', 'Usage: nslookup <domain>');
        } else if (resolveDeviceNameTarget(targetDomain)) {
          const resolved = resolveDeviceNameTarget(targetDomain) as { ip: string; label: string };
          await addMultilineOutput(
            'output',
            `Server: local-device\nAddress: 127.0.0.1\n\nName: ${targetDomain}\nAddress: ${resolved.ip}`,
            80
          );
        } else if (!isValidIpv4(pcDNS)) {
          addLocalOutput('error', t.dnsInvalidAddress);
        } else if (!hasGatewayForTarget(pcDNS)) {
          addLocalOutput('error', t.dnsGatewayRequired);
        } else {
          const dnsResult = resolveDomainWithDnsServices(targetDomain);
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
          const namedResult = resolveDeviceNameTarget(target);
          if (namedResult) {
            targetIp = namedResult.ip;
          }
          if (!isValidIpv4(targetIp) && !isValidIpv6(targetIp)) {
            const dnsResult = resolveDomainWithDnsServices(target);
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
            const namedResult = resolveDeviceNameTarget(target);
            if (namedResult) {
              resolvedTarget = namedResult.ip;
            } else {
              const dnsResult = resolveDomainWithDnsServices(target);
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
          const namedResult = resolveDeviceNameTarget(targetArg);
          if (namedResult) {
            targetIp = namedResult.ip;
            dnsResolved = true;
          } else {
            const dnsResult = resolveDomainWithDnsServices(targetArg);
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
      const suggestions = getAutocompleteSuggestions(newValue);
      if (suggestions.length > 0) {
        setShowAutocomplete(true);
        setAutocompleteIndex(-1);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [input, undoStack, getAutocompleteSuggestions]);

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
      accent: isDark ? 'from-emerald-500 to-teal-400' : 'from-emerald-600 to-teal-500',
      buttonClass: isDark ? 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' : 'text-emerald-700 border-emerald-200 bg-emerald-50/90',
    },
    {
      tab: 'wireless' as const,
      label: language === 'tr' ? 'Kablosuz' : 'Wireless',
      subtitle: language === 'tr' ? 'Wi-Fi bilgisi' : 'Wi-Fi overview',
      icon: Wifi,
      accent: isDark ? 'from-accent-500 to-sky-400' : 'from-accent-600 to-sky-500',
      buttonClass: isDark ? 'text-accent-300 border-accent-400/20 bg-accent-500/10' : 'text-accent-700 border-accent-200 bg-accent-50/90',
    },
    {
      tab: 'settings' as const,
      label: language === 'tr' ? 'Ayarlar' : 'Settings',
      subtitle: language === 'tr' ? 'PC yapılandırması' : 'PC configuration',
      icon: Settings,
      accent: isDark ? 'from-violet-500 to-fuchsia-400' : 'from-violet-600 to-fuchsia-500',
      buttonClass: isDark ? 'text-violet-300 border-violet-400/20 bg-violet-500/10' : 'text-violet-700 border-violet-200 bg-violet-50/90',
    },
    {
      tab: 'services' as const,
      label: language === 'tr' ? 'Servisler' : 'Services',
      subtitle: language === 'tr' ? 'HTTP, DNS, DHCP' : 'HTTP, DNS, DHCP',
      icon: Globe,
      accent: isDark ? 'from-warning-500 to-orange-400' : 'from-warning-600 to-orange-500',
      buttonClass: isDark ? 'text-warning-300 border-warning-400/20 bg-warning-500/10' : 'text-warning-700 border-warning-200 bg-warning-50/90',
    },
    {
      tab: 'iot' as const,
      label: 'IoT',
      subtitle: language === 'tr' ? 'Sensör ağı' : 'Sensor network',
      icon: Radio,
      accent: isDark ? 'from-sky-500 to-indigo-400' : 'from-sky-600 to-indigo-500',
      buttonClass: isDark ? 'text-sky-300 border-sky-400/20 bg-sky-500/10' : 'text-sky-700 border-sky-200 bg-sky-50/90',
    },
  ], [language, isDark]);


  const handleComposeSend = useCallback(() => {
    const recipient = composeTo.trim();
    const subject = composeSubject.trim() || '(no subject)';
    const body = composeBody.trim();
    if (!recipient || !body) return;
    const [reqUser, reqDomain] = recipient.includes('@') ? recipient.split('@') : [recipient, serviceMailDomain];
    const targetDevice = topologyDevices.find((d: CanvasDevice) => {
      const mail = d.services?.mail;
      if (mail?.username === reqUser && mail?.domain === (reqDomain || serviceMailDomain)) return true;
      const isNameMatch = d.name === reqUser || d.ip === reqUser || d.id === reqUser;
      const isDomainMatch = d.ip === reqDomain;
      return isNameMatch && (isDomainMatch || !reqDomain);
    });
    if (!targetDevice) {
      setMailError(language === 'tr' ? 'Alıcı bulunamadı.' : 'Recipient not found.');
      return;
    }
    if (targetDevice.ip) {
      const connectivity = checkConnectivity(deviceId, targetDevice.ip, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '25' });
      if (!connectivity.success) {
        setMailError(language === 'tr' ? 'SMTP (port 25) engellendi. Posta gönderilemiyor.' : 'SMTP (port 25) blocked. Cannot send mail.');
        return;
      }
    }
    setMailError('');
    const timestamp = new Date().toISOString();
    const senderName = deviceFromTopology?.name || pcIP || serviceMailUsername;
    const senderEmail = `${serviceMailUsername}@${serviceMailDomain}`;
    const from = `${senderName} <${senderEmail}>`;
    const newInboxEntry = { from, to: recipient, subject, body, timestamp };
    let existingInbox = targetDevice.services?.mail?.inbox || [];
    if (typeof window !== 'undefined') {
      try { const stored = localStorage.getItem(`mail_inbox_${targetDevice.id}`); if (stored) existingInbox = JSON.parse(stored); } catch (_e) {}
    }
    const updatedInbox = [newInboxEntry, ...existingInbox];
    if (typeof window !== 'undefined') localStorage.setItem(`mail_inbox_${targetDevice.id}`, JSON.stringify(updatedInbox));
    const newSentEntry = { from, to: recipient, subject, body, timestamp };
    setServiceMailSent((prev) => [newSentEntry, ...prev]);
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId: targetDevice.id, config: { services: { mail: { enabled: targetDevice.services?.mail?.enabled ?? false, domain: targetDevice.services?.mail?.domain || serviceMailDomain, username: targetDevice.services?.mail?.username || serviceMailUsername, inbox: updatedInbox } } } }
    }));
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config: { services: { mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: [newSentEntry, ...serviceMailSent] } } } }
    }));
    addLocalOutput('success', language === 'tr' ? 'Mesaj gönderildi.' : 'Message sent.');
    setComposeMode(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  }, [composeTo, composeSubject, composeBody, serviceMailDomain, serviceMailUsername, serviceMailEnabled, serviceMailPassword, serviceMailInbox, serviceMailSent, topologyDevices, topologyConnections, deviceStates, deviceId, addLocalOutput, language, deviceFromTopology, pcIP]);

  const handleViewReplySend = useCallback(() => {
    if (!viewingMsg || !viewReplyBody.trim()) return;
    const { msg } = viewingMsg;
    if (!msg.from) return;
    const emailMatch = msg.from.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1] : msg.from;
    const [reqUser, reqDomain] = senderEmail.includes('@') ? senderEmail.split('@') : [senderEmail, ''];
    const targetDevice = topologyDevices.find((d: CanvasDevice) => {
      const mail = d.services?.mail;
      return mail?.username === reqUser && mail?.domain === reqDomain;
    });
    if (!targetDevice) {
      setMailError(language === 'tr' ? 'Alıcı cihaz bulunamadı.' : 'Target device not found.');
      return;
    }
    if (targetDevice.ip) {
      const connectivity = checkConnectivity(deviceId, targetDevice.ip, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '25' });
      if (!connectivity.success) {
        setMailError(language === 'tr' ? 'SMTP (port 25) engellendi. Yanıt gönderilemiyor.' : 'SMTP (port 25) blocked. Cannot send reply.');
        return;
      }
    }
    setMailError('');
    const subject = `Re: ${msg.subject}`;
    const timestamp = new Date().toISOString();
    const senderName = deviceFromTopology?.name || pcIP || serviceMailUsername;
    const senderAddr = `${serviceMailUsername}@${serviceMailDomain}`;
    const from = `${senderName} <${senderAddr}>`;
    const newInboxEntry = { from, to: msg.from, subject, body: viewReplyBody, timestamp };
    let existingInbox = targetDevice.services?.mail?.inbox || [];
    if (typeof window !== 'undefined') {
      try { const stored = localStorage.getItem(`mail_inbox_${targetDevice.id}`); if (stored) existingInbox = JSON.parse(stored); } catch (_e) {}
    }
    const updatedInbox = [newInboxEntry, ...existingInbox];
    if (typeof window !== 'undefined') localStorage.setItem(`mail_inbox_${targetDevice.id}`, JSON.stringify(updatedInbox));
    const newSentEntry = { from, to: msg.from, subject, body: viewReplyBody, timestamp };
    setServiceMailSent((prev) => [newSentEntry, ...prev]);
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId: targetDevice.id, config: { services: { mail: { enabled: targetDevice.services?.mail?.enabled ?? false, domain: targetDevice.services?.mail?.domain || serviceMailDomain, username: targetDevice.services?.mail?.username || serviceMailUsername, inbox: updatedInbox } } } }
    }));
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config: { services: { mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: [newSentEntry, ...serviceMailSent] } } } }
    }));
    addLocalOutput('success', language === 'tr' ? 'Yanıt gönderildi.' : 'Reply sent.');
    setViewReplyBody('');
    setViewingMsg(null);
  }, [viewingMsg, viewReplyBody, serviceMailDomain, serviceMailUsername, serviceMailEnabled, serviceMailPassword, serviceMailInbox, serviceMailSent, topologyDevices, topologyConnections, deviceStates, deviceId, addLocalOutput, language, mailError, deviceFromTopology, pcIP]);

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
        <div className="shrink-0 px-2 pt-2 md:px-2 md:pt-2">
          <div className={cn(
            "mx-auto flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 md:px-3 md:py-2 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]",
            isDark
              ? "border-white/10 bg-secondary-900/70 text-secondary-100"
              : "border-white/60 bg-white/70 text-secondary-900"
          )}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <div className={cn("truncate text-xs md:text-sm font-semibold", isDark ? "text-white" : "text-secondary-900")}>
                  {internalPcHostname}
                </div>
                <div className={cn("truncate text-[10px] md:text-xs font-mono", isDark ? "text-accent-300/85" : "text-accent-700/80")}>
                  {pcIP}
                </div>
              </div>
              <div className={cn(
                "pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1 md:px-2 md:py-1.5 backdrop-blur-xl shadow-sm ml-auto",
                isDark ? "border-white/10 bg-secondary-900/70" : "border-white/80 bg-white/85"
              )}>
                {/* Back Button - Shows when not on home */}
                {activeTab !== 'home' && (
                  <TooltipWrapper title={language === 'tr' ? 'Geri' : 'Back'}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goHome}
                      className={cn(
                        "h-7 w-7 md:h-9 md:w-9 rounded-full",
                        isDark ? "text-secondary-300 hover:text-accent-300 hover:bg-white/5" : "text-secondary-600 hover:text-accent-700 hover:bg-secondary-100"
                      )}
                      aria-label={language === 'tr' ? 'Geri' : 'Back'}
                    >
                      <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </TooltipWrapper>
                )}
                <TooltipWrapper title={language === 'tr' ? 'Kablosuz' : 'Wireless'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateToProgram('wireless')}
                    disabled={isPcPoweredOff}
                    className={cn(
                      "relative h-7 w-7 md:h-9 md:w-9 rounded-full",
                      activeTab === 'wireless'
                        ? (isDark ? "bg-accent-500/20 text-accent-300" : "bg-accent-100 text-accent-700")
                        : (isDark ? "text-accent-300 hover:bg-white/5" : "text-accent-700 hover:bg-secondary-100")
                    )}
                    aria-label={language === 'tr' ? 'Kablosuz' : 'Wireless'}
                  >
                    <span className="pointer-events-none w-3.5 h-3.5 md:w-4 md:h-4">
                      <WifiSignalMeter strength={wifiSignalStrength} />
                    </span>
                  </Button>
                </TooltipWrapper>
                <TooltipWrapper title={language === 'tr' ? 'Ayarlar' : 'Settings'}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateToProgram('settings')}
                    disabled={isPcPoweredOff}
                    className={cn(
                      "h-7 w-7 md:h-9 md:w-9 rounded-full",
                      activeTab === 'settings'
                        ? (isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700")
                        : (isDark ? "text-violet-300 hover:bg-white/5" : "text-violet-700 hover:bg-secondary-100")
                    )}
                    aria-label={language === 'tr' ? 'Ayarlar' : 'Settings'}
                  >
                    <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </Button>
                </TooltipWrapper>
                {isMobile && (
                  <TooltipWrapper title={language === 'tr' ? 'Hızlı ayarlar' : 'Quick settings'}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCmdSettings(prev => !prev)}
                      disabled={isPcPoweredOff}
                      className={cn(
                        "h-7 w-7 rounded-full",
                        showCmdSettings
                          ? (isDark ? "bg-warning-500/20 text-warning-300" : "bg-warning-100 text-warning-700")
                          : (isDark ? "text-warning-300 hover:bg-white/5" : "text-warning-700 hover:bg-secondary-100")
                      )}
                      aria-label={language === 'tr' ? 'Hızlı ayarlar' : 'Quick settings'}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipWrapper>
                )}
                <TooltipWrapper title={formatFullDateTime(ntpPanelTime)}>
                  <div className={cn(
                    "rounded-full px-2 py-1 md:px-3 md:py-2 text-[10px] md:text-[11px] font-mono font-semibold tracking-wide cursor-default",
                    isDark ? "bg-white/5 text-accent-200" : "bg-secondary-100 text-accent-800"
                  )}>
                    {formatTime(ntpPanelTime)}
                  </div>
                </TooltipWrapper>
                <TooltipWrapper title={t.power}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      goHome();
                      onTogglePower?.(deviceId);
                    }}
                    className={cn(
                      "h-7 w-7 md:h-9 md:w-9 rounded-full transition-all",
                      isPcPoweredOff
                        ? 'text-rose-500 hover:text-rose-400 hover:bg-rose-500/10'
                        : 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                    )}
                    aria-label={t.power}
                    disabled={!onTogglePower}
                  >
                    <svg className="w-3.5 h-3.5 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                    </svg>
                  </Button>
                </TooltipWrapper>
                {isMobile && (
                  <TooltipWrapper title={language === 'tr' ? 'Kapat' : 'Close'}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className={cn(
                        "h-7 w-7 rounded-full",
                        isDark ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-500/10"
                      )}
                      aria-label={language === 'tr' ? 'Kapat' : 'Close'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipWrapper>
                )}
              </div>
            </div>
          </div>
        </div>

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
                {/* Power Off Overlay - Tablet ekranını tamamen karartır */}
                {isPcPoweredOff && (
                  <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-error-500/20 blur-3xl rounded-full animate-pulse" />
                      <svg className="w-16 h-16 text-error-600 drop-shadow-md relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                      </svg>
                    </div>
                  </div>
                )}
                <ModernPanel
                  id={deviceId}
                  title={internalPcHostname}
                  onClose={onClose}
                  collapsible={false}
                  hideTitle={(activeTab === 'desktop' || activeTab === 'terminal') ? false : true}
                  hideHeader={(activeTab === 'desktop' || activeTab === 'terminal') ? false : true}
                  headerAction={(activeTab === 'desktop' || activeTab === 'terminal') ? (
                    <div className="flex items-center gap-1">
                      <TooltipWrapper title={(
                        <div className="flex items-center gap-2">
                          {t.search}
                          {!isMobile && <ShortcutBadge shortcut="Ctrl+F" variant="primary" />}
                        </div>
                      )}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSearchOpen(true)}
                          className={cn("h-8 w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}
                          aria-controls="search-dialog"
                          aria-label={t.search}
                        >
                          <Search className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </TooltipWrapper>
                      <TooltipWrapper title={t.copy}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyAll}
                          className={cn("h-8 w-8 rounded-lg text-secondary-600 hover:text-secondary-900", isDark && "text-secondary-300 hover:text-secondary-100")}
                          aria-label={t.copy}
                        >
                          <Copy className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </TooltipWrapper>
                      <TooltipWrapper title={language === 'tr' ? 'Terminal Ayarları' : 'Terminal Settings'}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowCmdSettings(!showCmdSettings)}
                          className={cn("h-8 w-8 rounded-lg text-secondary-600 hover:text-secondary-900", showCmdSettings && "bg-accent", isDark && "text-secondary-300 hover:text-secondary-100")}
                          aria-label={language === 'tr' ? 'Terminal Ayarları' : 'Terminal Settings'}
                        >
                          <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </TooltipWrapper>
                    </div>
                  ) : undefined}
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

                      {activeTab === 'settings' && (
                        <div
                          className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar"
                          style={mobileVerticalScrollStyle}
                        >
                          <div className={`p-4 rounded-xl border space-y-4 ${isDark ? 'bg-secondary-900/50 border-secondary-800' : 'bg-white border-secondary-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <FormInput
                                  label={t.hostname}
                                  value={internalPcHostname}
                                  onChange={(e) => {
                                    const newHostname = e.target.value.trim().slice(0, 20);
                                    setPcHostname(e.target.value);
                                    dispatchDeviceConfig({ name: newHostname });
                                  }}
                                  className="h-9"
                                />
                              </div>
                              <div className="flex-1">
                                <FormInput
                                  label="MAC Address"
                                  value={pcMAC}
                                  onChange={(e) => {
                                    const newMac = e.target.value;
                                    setPcMAC(newMac);
                                    dispatchDeviceConfig({ macAddress: isValidMAC(newMac) ? normalizeMAC(newMac) : newMac });
                                  }}
                                  placeholder="00-1a-2b-3c-4d-5e"
                                  className={`h-9 ${errors.mac ? 'border-rose-500' : ''}`}
                                />
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 py-2 border-y border-secondary-800/10 dark:border-secondary-800/50">
                              <label className="text-xs font-bold text-secondary-500 ml-1 whitespace-nowrap">
                                {t.ipConfigurationLabel}
                              </label>
                              <div className={`inline-flex p-1 rounded-xl border ${isDark ? 'bg-secondary-950 border-secondary-800' : 'bg-secondary-100 border-secondary-200'}`}>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={ipConfigMode === 'dhcp'}
                                  onClick={() => {
                                    if (manualDhcpClickRef.current) return;
                                    manualDhcpClickRef.current = true;
                                    setIpConfigMode('dhcp');
                                    dispatchDeviceConfig({ ipConfigMode: 'dhcp' });
                                    try {
                                      const lease = applyDhcpLeaseRef.current?.(true);
                                      if (lease && lease.serverName === 'link-local') {
                                        toast({
                                          title: language === 'tr' ? 'DHCP bulunamadı' : 'DHCP not found',
                                          description: language === 'tr'
                                            ? `Link-local IP atandı: ${lease.ip}`
                                            : `Assigned link-local IP: ${lease.ip}`,
                                        });
                                      }
                                    } catch (err) {
                                      errorHandler.logError(DHCP_ERRORS.LEASE_FAILED({ deviceId, source: 'manualDhcp', error: String(err) }));
                                      toast({
                                        title: language === 'tr' ? 'DHCP hatası' : 'DHCP error',
                                        description: language === 'tr'
                                          ? 'DHCP hizmeti bulunamadı. Link-local IP atandı.'
                                          : 'DHCP service not found. Link-local IP assigned.',
                                        variant: 'destructive',
                                      });
                                    }
                                    // Reset the ref after a short delay
                                    setTimeout(() => {
                                      manualDhcpClickRef.current = false;
                                    }, 100);
                                  }}
                                  className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${ipConfigMode === 'dhcp'
                                    ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/30'
                                    : (isDark ? 'text-secondary-200 hover:text-white' : 'text-secondary-500 hover:text-secondary-800')
                                    }`}
                                >
                                  DHCP
                                </button>
                                <button
                                  type="button"
                                  role="radio"
                                  aria-checked={ipConfigMode === 'static'}
                                  onClick={() => {
                                    setIpConfigMode('static');
                                    dispatchDeviceConfig({ ipConfigMode: 'static' });
                                  }}
                                  className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${ipConfigMode === 'static'
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                    : (isDark ? 'text-secondary-200 hover:text-white' : 'text-secondary-500 hover:text-secondary-800')
                                    }`}
                                >
                                  {t.staticLabel}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                              {renderNetworkInput(language === 'tr' ? 'IP Adresi' : 'IP Address', pcIP, (newIp) => {
                                setPcIP(newIp);
                                setErrors(prev => { const { ip: _ip, ...rest } = prev; return rest; });
                              }, "192.168.1.100", errors.ip, ipConfigMode === 'dhcp',
                                (e) => validateIpField(e.currentTarget.value),
                                (e) => { if (e.key === 'Enter') validateIpField(e.currentTarget.value); }
                              )}

                              {renderNetworkInput(language === 'tr' ? 'Alt Ağ Maskesi' : 'Subnet Mask', pcSubnet, (newSubnet) => {
                                setPcSubnet(newSubnet);
                                setErrors(prev => { const { subnet: _, ...rest } = prev; return rest; });
                              }, "255.255.255.0", errors.subnet, ipConfigMode === 'dhcp',
                                (e) => validateSubnetField(e.currentTarget.value),
                                (e) => { if (e.key === 'Enter') validateSubnetField(e.currentTarget.value); }
                              )}

                              {renderNetworkInput(language === 'tr' ? 'Ağ Geçidi' : 'Gateway', pcGateway, (newGateway) => {
                                setPcGateway(newGateway);
                                dispatchDeviceConfig({ gateway: newGateway });
                              }, "192.168.1.1", errors.gateway)}

                              {renderNetworkInput(language === 'tr' ? 'DNS Sunucusu' : 'DNS Server', pcDNS, (newDNS) => {
                                setPcDNS(newDNS);
                                dispatchDeviceConfig({ dns: newDNS });
                              }, "8.8.8.8", errors.dns)}
                            </div>

                            <div className={`mt-4 rounded-xl border p-4 space-y-3 ${isDark ? 'border-secondary-800 bg-secondary-950/40' : 'border-secondary-200 bg-white'}`}>
                              <div>
                                <h3 className="text-sm font-bold">NTP Server</h3>
                                <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                  {language === 'tr' ? 'NTP sunucusunu girin. IP doğruysa saat sunucudan alınır.' : 'Enter the NTP server. If the IP is valid, time is pulled from the server.'}
                                </p>
                              </div>
                              <FormInput
                                label={language === 'tr' ? 'NTP sunucu IP' : 'NTP server IP'}
                                value={serviceNtpServer}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setServiceNtpServer(value);
                                  const trimmedValue = value.trim();
                                  const isValid = !trimmedValue || isValidIpAddress(trimmedValue);
                                  setServiceNtpServerError(
                                    !trimmedValue
                                      ? ''
                                      : isValid
                                        ? ''
                                        : (language === 'tr' ? 'Geçersiz IP adresi' : 'Invalid IP address')
                                  );
                                  setServiceNtpServerPreset(
                                    value === 'pool.ntp.org'
                                      ? 'pool.ntp.org'
                                      : value === 'time.google.com'
                                        ? 'time.google.com'
                                        : value === 'time.cloudflare.com'
                                          ? 'time.cloudflare.com'
                                          : value === 'local-clock'
                                            ? 'local-clock'
                                            : 'custom'
                                  );
                                  const syncedTime = applyNtpServerTime(value);
                                  dispatchDeviceConfig({
                                    services: {
                                      ntp: {
                                        enabled: serviceNtpEnabled || (trimmedValue !== '' && isValidIpAddress(trimmedValue)),
                                        server: value,
                                        date: syncedTime?.date || serviceNtpDate,
                                        time: syncedTime?.time || serviceNtpTime
                                      }
                                    }
                                  });
                                }}
                                placeholder="192.168.1.20"
                                aria-label={language === 'tr' ? 'NTP sunucu IP' : 'NTP server IP'}
                                error={serviceNtpServerError}
                                showValidation
                                isValid={!!serviceNtpServer.trim() && !serviceNtpServerError}
                              />
                              <div className={`rounded-lg border p-3 text-xs ${isDark ? 'border-secondary-800 bg-secondary-950 text-secondary-300' : 'border-secondary-200 bg-secondary-50 text-secondary-600'}`}>
                                {language === 'tr'
                                  ? 'Sunucu geçerli bir IP ise client tarih ve saati o NTP sunucusundan okunur.'
                                  : 'If the server is a valid IP, the client date and time are read from that NTP server.'}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 pt-2 border-t border-secondary-800/10 dark:border-secondary-800/50">
                              {renderNetworkInput(language === 'tr' ? 'IPv6 Adresi' : 'IPv6 Address', pcIPv6, (newIPv6) => {
                                setPcIPv6(newIPv6);
                                dispatchDeviceConfig({ ipv6: newIPv6 });
                              }, "2001:db8:acad:1::10", errors.ipv6)}

                              {renderNetworkInput(language === 'tr' ? 'IPv6 Öneki' : 'IPv6 Prefix', pcIPv6Prefix, (newPrefix) => {
                                setPcIPv6Prefix(newPrefix);
                                dispatchDeviceConfig({ ipv6Prefix: newPrefix });
                              }, "64")}
                            </div>
                          </div>

                        </div>
                      )}

                      {activeTab === 'services' && (
                        <div
                          className="flex-1 min-h-0 flex flex-col"
                          style={mobileVerticalScrollStyle}
                        >
                          {/* Inner Tabs for Services - Modern Style */}
                          <div className={`flex items-end gap-1 px-4 pt-3 border-b ${isDark ? 'border-secondary-700/50 bg-gradient-to-b from-secondary-900/20 to-transparent' : 'border-secondary-200 bg-gradient-to-b from-secondary-50/50 to-transparent'}`}>
                            {(['dns', 'http', 'dhcp', 'ftp', 'mail', 'ntp'] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setActiveServiceTab(tab)}
                                className={serviceTabClass(tab)}
                                role="tab"
                                aria-selected={activeServiceTab === tab}
                                aria-controls={`service-panel-${tab}`}
                              >
                                {getServiceTabIcon(tab)}
                                <span className="uppercase tracking-wide">{tab}</span>
                                {((tab === 'dns' && serviceDnsEnabled) ||
                                  (tab === 'http' && serviceHttpEnabled) ||
                                  (tab === 'dhcp' && serviceDhcpEnabled) ||
                                  (tab === 'ftp' && serviceFtpEnabled) ||
                                  (tab === 'mail' && serviceMailEnabled) ||
                                  (tab === 'ntp' && serviceNtpEnabled)) && (
                                    <span className={cn(
                                      'w-2 h-2 rounded-full animate-pulse',
                                      isDark ? 'bg-emerald-400' : 'bg-emerald-500'
                                    )} />
                                  )}
                              </button>
                            ))}
                          </div>

                          {/* Service Content */}
                          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            {activeServiceTab === 'dns' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {language === 'tr'
                                          ? 'DNS (Domain Name System - isim çözümleme)'
                                          : 'DNS (Domain Name System - name resolution)'}
                                      </h3>
                                      <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                        {t.dnsRecordManagerTip}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceDnsEnabled ? 'bg-purple-500/15 text-purple-600 border border-purple-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                                        {serviceDnsEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceDnsEnabled}
                                        onClick={() => {
                                          const enabled = !serviceDnsEnabled;
                                          setServiceDnsEnabled(enabled);
                                          dispatchDeviceConfig({
                                            services: {
                                              dns: { enabled, records: serviceDnsRecords },
                                              http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                              ftp: { enabled: serviceFtpEnabled },
                                              mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                              dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                            }
                                          });
                                        }}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 ${serviceDnsEnabled
                                          ? 'bg-purple-500/90 border-purple-400'
                                          : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                                          }`}
                                      >
                                        <span
                                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceDnsEnabled ? 'translate-x-8' : 'translate-x-1'
                                            }`}
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <Input
                                      value={dnsFormDomain}
                                      onChange={(e) => setDnsFormDomain(e.target.value)}
                                      placeholder={t.dnsDomainPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddDnsRecord()}
                                    />
                                    <Input
                                      value={dnsFormAddress}
                                      onChange={(e) => setDnsFormAddress(e.target.value)}
                                      placeholder={t.dnsAddressPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddDnsRecord()}
                                    />
                                    <Button
                                      onClick={handleAddDnsRecord}
                                    >
                                      {t.addDnsRecord}
                                    </Button>
                                  </div>

                                  <div className="space-y-2">
                                    {serviceDnsRecords.length === 0 && (
                                      <div className={`text-xs ${isDark ? 'text-secondary-500' : 'text-secondary-500'}`}>
                                        {t.dnsNoRecords}
                                      </div>
                                    )}
                                    {serviceDnsRecords.map((record) => (
                                      <div key={`${record.domain}-${record.address}`} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${isDark ? 'bg-secondary-950 border border-secondary-800' : 'bg-secondary-50 border border-secondary-200'}`}>
                                        <div className="text-xs font-mono">
                                          <span>{getDnsRecordDisplay(record)}</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            isDnsEditingRef.current = true;
                                            const newRecords = serviceDnsRecords.filter((r) => !(r.domain === record.domain && r.address === record.address));
                                            setServiceDnsRecords(newRecords);
                                            dispatchDeviceConfig({
                                              services: {
                                                dns: { enabled: serviceDnsEnabled, records: newRecords },
                                                http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                                ftp: { enabled: serviceFtpEnabled },
                                                mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                                dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                              }
                                            });
                                            setTimeout(() => { isDnsEditingRef.current = false; }, 1000);
                                          }}
                                        >
                                          {t.delete}
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeServiceTab === 'http' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {language === 'tr'
                                          ? 'HTTP (Hypertext Transfer Protocol - web içeriği)'
                                          : 'HTTP (Hypertext Transfer Protocol - web content)'}
                                      </h3>
                                      <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                        {t.httpServiceDescription}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceHttpEnabled ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                                        {serviceHttpEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceHttpEnabled}
                                        onClick={() => {
                                          const enabled = !serviceHttpEnabled;
                                          setServiceHttpEnabled(enabled);
                                          dispatchDeviceConfig({
                                            services: {
                                              dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                              http: { enabled, content: serviceHttpContent },
                                              ftp: { enabled: serviceFtpEnabled },
                                              mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                              dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                            }
                                          });
                                        }}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${serviceHttpEnabled
                                          ? 'bg-emerald-500/90 border-emerald-400'
                                          : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                                          }`}
                                      >
                                        <span
                                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceHttpEnabled ? 'translate-x-8' : 'translate-x-1'
                                            }`}
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-xs font-bold  tracking-wide text-secondary-500">HTTP Content</label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex gap-1">
                                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-xs font-black" onClick={() => applyHttpFormatting('b')}>B</Button>
                                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-xs font-black italic" onClick={() => applyHttpFormatting('i')}>I</Button>
                                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-xs font-black underline" onClick={() => applyHttpFormatting('u')}>U</Button>
                                      </div>
                                      <span className="text-[10px] text-secondary-500">{language === 'tr' ? 'Seçili metni biçimlendir' : 'Format selected text'}</span>
                                    </div>
                                    <textarea
                                      ref={httpContentRef}
                                      value={serviceHttpContent}
                                      onChange={(e) => setServiceHttpContent(e.target.value)}
                                      placeholder={t.helloWorld}
                                      rows={6}
                                      className={`w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y ${isDark ? 'bg-secondary-900 border-secondary-700 text-secondary-200' : 'bg-white border-secondary-300 text-secondary-700'}`}
                                    />
                                    {serviceHttpEnabled && (
                                      <div
                                        className={`text-xs rounded-lg px-3 py-2 overflow-hidden ${isDark ? 'bg-secondary-950 border border-secondary-800 text-secondary-200' : 'bg-secondary-50 border border-secondary-200 text-secondary-700'}`}
                                        style={{ contain: 'layout style paint', willChange: 'auto' }}
                                      >
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeHTTPContent(serviceHttpContent || t.helloWorld) }} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeServiceTab === 'ftp' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">FTP (File Transfer Protocol - dosya aktarımı)</h3>
                                      <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                        {language === 'tr' ? 'Basit FTP sunucu ayarları.' : 'Basic FTP server settings.'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceFtpEnabled ? 'bg-accent-500/15 text-accent-600 border border-accent-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                                        {serviceFtpEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceFtpEnabled}
                                        onClick={() => {
                                          const enabled = !serviceFtpEnabled;
                                          setServiceFtpEnabled(enabled);
                                          dispatchDeviceConfig({
                                            services: {
                                              dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                              http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                              ftp: { enabled },
                                              mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                              dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                            }
                                          });
                                        }}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 ${serviceFtpEnabled ? 'bg-accent-500/90 border-accent-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                                      >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceFtpEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">
                                      {language === 'tr' ? 'Dosya Listesi' : 'File List'}
                                    </div>
                                    <div className={`rounded-lg border divide-y ${isDark ? 'border-secondary-800 divide-secondary-800' : 'border-secondary-200 divide-secondary-200'}`}>
                                      {(serviceFtpFiles.length > 0 ? serviceFtpFiles : []).map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                                          <div className="min-w-0">
                                            <div className="font-mono truncate">{file.name}</div>
                                            <div className="opacity-50">
                                              {file.size} B{file.modifiedAt ? ` · ${new Date(file.modifiedAt).toLocaleString()}` : ''}
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              const nextFiles = serviceFtpFiles.filter((f) => f.name !== file.name);
                                              setServiceFtpFiles(nextFiles);
                                              dispatchDeviceConfig({
                                                services: {
                                                  dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                                  http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                                  ftp: { enabled: serviceFtpEnabled, files: nextFiles },
                                                  mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                                  ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: serviceNtpDate, time: serviceNtpTime },
                                                  dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                                }
                                              });
                                            }}
                                          >
                                            {language === 'tr' ? 'Sil' : 'Delete'}
                                          </Button>
                                        </div>
                                      ))}
                                      {serviceFtpFiles.length === 0 && (
                                        <div className="px-3 py-3 text-xs opacity-50">
                                          {language === 'tr' ? 'Dosya yok' : 'No files'}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeServiceTab === 'mail' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    {composeMode || viewingMsg ? (
                                      <>
                                        <button onClick={() => { setComposeMode(false); setViewingMsg(null); setViewReplyBody(''); }} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-secondary-800 text-secondary-300' : 'hover:bg-secondary-100 text-secondary-600'}`}>
                                          <ArrowLeft className="w-4 h-4" />
                                        </button>
                                        <h3 className="text-sm font-bold flex-1">
                                          {composeMode ? (language === 'tr' ? 'Yeni Posta' : 'New Message') : (language === 'tr' ? 'Posta' : 'Message')}
                                        </h3>
                                      </>
                                    ) : (
                                      <>
                                        <div>
                                          <h3 className="text-sm font-bold">Mail Server</h3>
                                          <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                            {language === 'tr' ? 'Basit posta sunucusu.' : 'Simple mail service.'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceMailEnabled ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                                            {serviceMailEnabled ? 'ON' : 'OFF'}
                                          </span>
                                          <button
                                            type="button"
                                            role="switch"
                                            aria-checked={serviceMailEnabled}
                                            onClick={() => {
                                              const enabled = !serviceMailEnabled;
                                              setServiceMailEnabled(enabled);
                                              dispatchDeviceConfig({
                                                services: {
                                                  dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                                  http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                                  ftp: { enabled: serviceFtpEnabled },
                                                  mail: { enabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                                  dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                                }
                                              });
                                            }}
                                            className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 ${serviceMailEnabled ? 'bg-rose-500/90 border-rose-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                                          >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceMailEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  {composeMode && (
                                    <div className="space-y-3">
                                      <Input value={composeTo} onChange={(e) => { setComposeTo(e.target.value); setMailError(''); }} placeholder={language === 'tr' ? 'Alıcı (kullanici@domain)' : 'To (user@domain)'} />
                                      <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder={language === 'tr' ? 'Konu' : 'Subject'} />
                                      <textarea
                                        value={composeBody}
                                        onChange={(e) => setComposeBody(e.target.value)}
                                        placeholder={language === 'tr' ? 'Mesajınızı yazın...' : 'Write your message...'}
                                        rows={4}
                                        className={`w-full text-xs p-2 rounded border resize-none focus:outline-none focus:ring-1 ${isDark ? 'bg-secondary-800 border-secondary-700 text-secondary-200 focus:ring-accent-500/50' : 'bg-white border-secondary-300 text-secondary-800 focus:ring-accent-500/50'}`}
                                      />
                                      {mailError && (
                                        <div className="text-[11px] text-rose-500 font-bold bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                                          {mailError}
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <button
                                          onClick={handleComposeSend}
                                          disabled={!composeTo.trim() || !composeBody.trim()}
                                          className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-colors ${composeTo.trim() && composeBody.trim() ? 'bg-accent-500/90 text-white hover:bg-accent-600' : 'bg-secondary-200 text-secondary-400 cursor-not-allowed'}`}
                                        >
                                          <Send className="w-3.5 h-3.5" />
                                          {language === 'tr' ? 'Gönder' : 'Send'}
                                        </button>
                                        <button
                                          onClick={() => { setComposeMode(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); setMailError(''); }}
                                          className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${isDark ? 'bg-secondary-700 text-secondary-300 hover:bg-secondary-600' : 'bg-secondary-200 text-secondary-600 hover:bg-secondary-300'}`}
                                        >
                                          {language === 'tr' ? 'İptal' : 'Cancel'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {viewingMsg && !composeMode && (
                                    <div className="space-y-3">
                                      <div className={`rounded-lg border p-3 space-y-2 ${isDark ? 'border-secondary-800 bg-secondary-950' : 'border-secondary-200 bg-secondary-50'}`}>
                                        <div className="text-xs">
                                          <span className="opacity-60">{language === 'tr' ? 'Kimden' : 'From'}:</span> {viewingMsg.msg.from}
                                        </div>
                                        <div className="text-xs">
                                          <span className="opacity-60">{language === 'tr' ? 'Kime' : 'To'}:</span> {viewingMsg.msg.to}
                                        </div>
                                        <div className="text-xs font-bold">{viewingMsg.msg.subject}</div>
                                        {viewingMsg.msg.timestamp && <div className="text-[10px] opacity-50">{new Date(viewingMsg.msg.timestamp).toLocaleString()}</div>}
                                        <div className={`border-t pt-2 mt-2 text-xs whitespace-pre-wrap leading-relaxed ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
                                          {viewingMsg.msg.body}
                                        </div>
                                      </div>
                                      {viewingMsg.type === 'inbox' && (
                                        <>
                                          <textarea
                                            value={viewReplyBody}
                                            onChange={(e) => { setViewReplyBody(e.target.value); setMailError(''); }}
                                            placeholder={language === 'tr' ? 'Yanıtınızı yazın...' : 'Write your reply...'}
                                            rows={3}
                                            className={`w-full text-xs p-2 rounded border resize-none focus:outline-none focus:ring-1 ${isDark ? 'bg-secondary-800 border-secondary-700 text-secondary-200 focus:ring-accent-500/50' : 'bg-white border-secondary-300 text-secondary-800 focus:ring-accent-500/50'}`}
                                          />
                                          {mailError && (
                                            <div className="text-[11px] text-rose-500 font-bold bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                                              {mailError}
                                            </div>
                                          )}
                                          <div className="flex gap-2">
                                            <button
                                              onClick={handleViewReplySend}
                                              disabled={!viewReplyBody.trim()}
                                              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-colors ${viewReplyBody.trim() ? 'bg-accent-500/90 text-white hover:bg-accent-600' : 'bg-secondary-200 text-secondary-400 cursor-not-allowed'}`}
                                            >
                                              <Reply className="w-3.5 h-3.5" />
                                              {language === 'tr' ? 'Yanıtla' : 'Reply'}
                                            </button>
                                            <button
                                              onClick={() => { setViewingMsg(null); setViewReplyBody(''); setMailError(''); }}
                                              className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${isDark ? 'bg-secondary-700 text-secondary-300 hover:bg-secondary-600' : 'bg-secondary-200 text-secondary-600 hover:bg-secondary-300'}`}
                                            >
                                              {language === 'tr' ? 'Geri' : 'Back'}
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {!composeMode && !viewingMsg && (
                                    <>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Input value={serviceMailUsername} onChange={(e) => setServiceMailUsername(e.target.value)} placeholder="user" />
                                        <Input value={serviceMailDomain} onChange={(e) => setServiceMailDomain(e.target.value)} placeholder="local.lan" />
                                      </div>

                                      {mailPop3Blocked && (
                                        <div className="text-[11px] text-rose-500 font-bold bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                                          {language === 'tr' ? 'POP3 (port 110) engellendi. Posta alınamıyor.' : 'POP3 (port 110) blocked. Cannot receive mail.'}
                                        </div>
                                      )}

                                      <button
                                        onClick={() => setComposeMode(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full justify-center bg-accent-500/90 text-white hover:bg-accent-600"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        {language === 'tr' ? 'Yeni Posta' : 'New Mail'}
                                      </button>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className={`rounded-lg border flex flex-col ${isDark ? 'border-secondary-800 bg-secondary-950' : 'border-secondary-200 bg-secondary-50'}`}>
                                          <div className="p-3 border-b flex items-center justify-between">
                                            <div className="text-xs font-bold">{language === 'tr' ? 'Gelen Kutusu' : 'Inbox'}</div>
                                            <div className="text-[10px] opacity-60">{serviceMailInbox.length} {language === 'tr' ? 'mesaj' : serviceMailInbox.length <= 1 ? 'message' : 'messages'}</div>
                                          </div>
                                          <div className="flex-1 p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                            {serviceMailInbox.length === 0 ? (
                                              <div className="text-[10px] text-center opacity-50 italic py-4">{language === 'tr' ? 'Kutu boş' : 'Inbox empty'}</div>
                                            ) : (
                                              serviceMailInbox.map((msg, idx) => (
                                                <div
                                                  key={idx}
                                                  onClick={() => setViewingMsg({ type: 'inbox', msg, idx })}
                                                  className={`p-2 rounded border text-[10px] flex items-start justify-between gap-2 cursor-pointer transition-colors ${isDark ? 'border-secondary-800 bg-secondary-900/50 hover:bg-secondary-800' : 'border-secondary-200 bg-white hover:bg-secondary-100'}`}
                                                >
                                                  <div className="min-w-0 flex-1">
                                                    <div className="font-bold truncate" title={msg.from}>{msg.from}</div>
                                                    <div className="truncate opacity-80" title={msg.subject}>{msg.subject}</div>
                                                    {msg.timestamp && <div className="text-[8px] opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString()}</div>}
                                                  </div>
                                                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                      title={language === 'tr' ? 'Yanıtla' : 'Reply'}
                                                      onClick={() => setViewingMsg({ type: 'inbox', msg, idx })}
                                                      className="p-1 rounded transition-colors text-secondary-400 hover:text-accent-500 hover:bg-accent-500/20"
                                                    >
                                                      <Reply className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      title={language === 'tr' ? 'Sil' : 'Delete'}
                                                      onClick={() => handleDeleteInbox(idx)}
                                                      className="p-1 rounded hover:bg-error-500/20 text-secondary-400 hover:text-error-500 transition-colors flex-shrink-0"
                                                    >
                                                      <Trash2 className="w-3 h-3 text-red-500" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                        <div className={`rounded-lg border flex flex-col ${isDark ? 'border-secondary-800 bg-secondary-950' : 'border-secondary-200 bg-secondary-50'}`}>
                                          <div className="p-3 border-b flex items-center justify-between">
                                            <div className="text-xs font-bold">{language === 'tr' ? 'Gönderilenler' : 'Sent'}</div>
                                            <div className="text-[10px] opacity-60">{serviceMailSent.length} {language === 'tr' ? 'mesaj' : serviceMailSent.length <= 1 ? 'message' : 'messages'}</div>
                                          </div>
                                          <div className="flex-1 p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                            {serviceMailSent.length === 0 ? (
                                              <div className="text-[10px] text-center opacity-50 italic py-4">{language === 'tr' ? 'Kutu boş' : 'Sent empty'}</div>
                                            ) : (
                                              serviceMailSent.map((msg, idx) => (
                                                <div
                                                  key={idx}
                                                  onClick={() => setViewingMsg({ type: 'sent', msg, idx })}
                                                  className={`p-2 rounded border text-[10px] flex items-start justify-between gap-2 cursor-pointer transition-colors ${isDark ? 'border-secondary-800 bg-secondary-900/50 hover:bg-secondary-800' : 'border-secondary-200 bg-white hover:bg-secondary-100'}`}
                                                >
                                                  <div className="min-w-0 flex-1">
                                                    <div className="font-bold truncate" title={msg.to}>{msg.to}</div>
                                                    <div className="truncate opacity-80" title={msg.subject}>{msg.subject}</div>
                                                    {msg.timestamp && <div className="text-[8px] opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString()}</div>}
                                                  </div>
                                                  <button
                                                    title={language === 'tr' ? 'Sil' : 'Delete'}
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSent(idx); }}
                                                    className="p-1 rounded hover:bg-error-500/20 text-secondary-400 hover:text-error-500 transition-colors flex-shrink-0"
                                                  >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}

                            {activeServiceTab === 'dhcp' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {language === 'tr'
                                          ? 'DHCP (Dynamic Host Configuration Protocol - otomatik IP)'
                                          : 'DHCP (Dynamic Host Configuration Protocol - auto IP)'}
                                      </h3>
                                      <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                        {t.dhcpPoolsDescription}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceDhcpEnabled ? 'bg-sky-500/15 text-sky-600 border border-sky-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                                        {serviceDhcpEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceDhcpEnabled}
                                        onClick={() => {
                                          const enabled = !serviceDhcpEnabled;
                                          setServiceDhcpEnabled(enabled);
                                          dispatchDeviceConfig({
                                            services: {
                                              dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                              http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                              dhcp: { enabled, pools: serviceDhcpPools }
                                            }
                                          });
                                        }}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${serviceDhcpEnabled
                                          ? 'bg-sky-500/90 border-sky-400'
                                          : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                                          }`}
                                      >
                                        <span
                                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceDhcpEnabled ? 'translate-x-8' : 'translate-x-1'
                                            }`}
                                        />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Input
                                      value={dhcpForm.poolName}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, poolName: e.target.value }))}
                                      placeholder={t.dhcpPoolNamePlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
                                    />
                                    <Input
                                      value={dhcpForm.defaultGateway}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, defaultGateway: e.target.value }))}
                                      placeholder={t.dhcpPoolGatewayPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
                                    />
                                    <Input
                                      value={dhcpForm.dnsServer}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, dnsServer: e.target.value }))}
                                      placeholder={t.dhcpPoolDnsPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
                                    />
                                    <Input
                                      value={dhcpForm.startIp}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, startIp: e.target.value }))}
                                      placeholder={t.dhcpPoolStartIpPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
                                    />
                                    <Input
                                      value={dhcpForm.subnetMask}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, subnetMask: e.target.value }))}
                                      placeholder={t.dhcpPoolSubnetPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
                                    />
                                    <Input
                                      type="number"
                                      min={1}
                                      value={dhcpForm.maxUsers}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, maxUsers: Number(e.target.value || 1) }))}
                                      placeholder={t.dhcpPoolMaxUsersPlaceholder}
                                      onKeyDown={(e) => e.key === 'Enter' && saveDhcpPool()}
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button onClick={saveDhcpPool}>
                                      {editingDhcpIndex === null ? t.addPool : t.updatePool}
                                    </Button>
                                    {editingDhcpIndex !== null && (
                                      <Button variant="outline" onClick={resetDhcpForm}>
                                        {t.cancel}
                                      </Button>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    {serviceDhcpPools.length === 0 && (
                                      <div className={`text-xs ${isDark ? 'text-secondary-500' : 'text-secondary-500'}`}>
                                        {t.noDhcpPools}
                                      </div>
                                    )}
                                    {serviceDhcpPools.map((pool, index) => (
                                      <div key={`${pool.poolName}-${index}`} className={`rounded-lg px-3 py-2 space-y-2 ${isDark ? 'bg-secondary-950 border border-secondary-800' : 'bg-secondary-50 border border-secondary-200'}`}>
                                        <div className="text-xs font-mono">
                                          <div>{pool.poolName}</div>
                                          <div>GW: {pool.defaultGateway} | DNS: {pool.dnsServer}</div>
                                          <div>Start: {pool.startIp} | Mask: {pool.subnetMask} | Max: {pool.maxUsers}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              isDhcpEditingRef.current = true;
                                              setDhcpForm(pool);
                                              setEditingDhcpIndex(index);
                                            }}
                                          >
                                            {t.edit}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              isDhcpEditingRef.current = true;
                                              const newPools = serviceDhcpPools.filter((_, i) => i !== index);
                                              setServiceDhcpPools(newPools);
                                              dispatchDeviceConfig({
                                                services: {
                                                  dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                                  http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                                  dhcp: { enabled: serviceDhcpEnabled, pools: newPools }
                                                }
                                              });
                                              if (editingDhcpIndex === index) {
                                                resetDhcpForm();
                                              }
                                            }}
                                          >
                                            {t.delete}
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeServiceTab === 'ntp' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">NTP Server</h3>
                                      <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                        {language === 'tr' ? 'Hizmeti aç/kapa ve tarih/saat ayarlayın.' : 'Toggle the service and set the date/time.'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceNtpEnabled ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                                        {serviceNtpEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceNtpEnabled}
                                        onClick={() => {
                                          const enabled = !serviceNtpEnabled;
                                          setServiceNtpEnabled(enabled);
                                          dispatchDeviceConfig({
                                            services: {
                                              dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                                              http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                                              ftp: { enabled: serviceFtpEnabled },
                                              mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                                              ntp: { enabled, server: serviceNtpServer, date: serviceNtpDate, time: serviceNtpTime },
                                              dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                                            }
                                          });
                                        }}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${serviceNtpEnabled ? 'bg-indigo-500/90 border-indigo-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                                      >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceNtpEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <Input
                                      type="date"
                                      value={serviceNtpDate}
                                      onChange={(e) => {
                                        const newDate = e.target.value;
                                        setServiceNtpDate(newDate);
                                        dispatchDeviceConfig({
                                          services: {
                                            ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: newDate, time: serviceNtpTime }
                                          }
                                        });
                                      }}
                                      aria-label={language === 'tr' ? 'NTP tarih' : 'NTP date'}
                                    />
                                    <Input
                                      type="time"
                                      value={serviceNtpTime}
                                      onChange={(e) => {
                                        const newTime = e.target.value;
                                        setServiceNtpTime(newTime);
                                        dispatchDeviceConfig({
                                          services: {
                                            ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: serviceNtpDate, time: newTime }
                                          }
                                        });
                                      }}
                                      aria-label={language === 'tr' ? 'NTP saat' : 'NTP time'}
                                    />
                                  </div>
                                  <div className={`rounded-lg border p-3 text-xs ${isDark ? 'border-secondary-800 bg-secondary-950 text-secondary-300' : 'border-secondary-200 bg-secondary-50 text-secondary-600'}`}>
                                    {language === 'tr'
                                      ? 'Takvim ve saat bu sekmede düzenlenir. NTP sunucusu IP ayarları altında seçilir.'
                                      : 'Date and time are configured here. The NTP server is selected under IP settings.'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'iot' && (
                        <div className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar" style={mobileVerticalScrollStyle}>
                          <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-2 text-accent-500">
                              <div className="flex items-center gap-2">
                                <Radio className="w-5 h-5" />
                                <div>
                                  <h3 className="text-sm font-black tracking-widest">
                                    {language === 'tr' ? 'IoT Yönetimi' : 'IoT Management'}
                                  </h3>
                                  <p className="text-[10px] font-medium tracking-normal text-accent-500/70">
                                    {language === 'tr'
                                      ? 'Nesneleri yönetmek için yönetim paneli'
                                      : 'Panel for managing connected devices'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white"
                                  onClick={() => {
                                    navigateToProgram('desktop');
                                    setTimeout(() => {
                                      const apDevice = topologyDevices.find(d =>
                                        (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') &&
                                        d.services?.http?.enabled &&
                                        (d.wifi?.ssid === wifiSSID || d.ports?.some(p => p.wifi?.ssid === wifiSSID))
                                      );
                                      const targetIp = apDevice?.ip || '192.168.1.1';
                                      setInput(`curl ${targetIp}`);
                                      void executeCommand(`curl ${targetIp}`);
                                    }, 300);
                                  }}
                                >
                                  {language === 'tr' ? 'Kablosuz Ayarları Aç' : 'Open Wireless Settings'}
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white"
                                  onClick={() => {
                                    navigateToProgram('desktop');
                                    setTimeout(() => {
                                      setInput('curl http://iot-panel');
                                      void executeCommand('curl http://iot-panel');
                                    }, 300);
                                  }}
                                >
                                  {language === 'tr' ? 'Web Paneli Aç' : 'Open Web Panel'}
                                </Button>

                              </div>
                            </div>

                            {iotDevices.length === 0 ? (
                              <div className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-600'}`}>
                                {language === 'tr' ? 'Topolojide IoT nesnesi yoktur. Önce topolojiye IoT nesnesi ekleyiniz.' : 'No IoT object in topology. Add one first.'}
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Nesne Seçimi' : 'Object Selection'}</label>
                                  <Select value={selectedIotDeviceId} onValueChange={setSelectedIotDeviceId}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="IoT" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {iotDevices.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Cihaz Adı' : 'Device Name'}</label>
                                  <Input
                                    value={selectedIotDevice?.name || ''}
                                    onChange={(e) => {
                                      const newName = e.target.value;
                                      window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                                        detail: {
                                          deviceId: selectedIotDeviceId,
                                          config: { name: newName }
                                        }
                                      }));
                                    }}
                                    placeholder={language === 'tr' ? 'Cihaz adı...' : 'Device name...'}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Cihaz Türü' : 'Device Type'}</label>
                                  <Select
                                    value={`${iotKind}:${iotSensorType}`}
                                    onValueChange={(v) => {
                                      const [kind, sensor] = v.split(':');
                                      setIotKind(kind as 'cooler' | 'lamp' | 'heater' | 'sensor');
                                      setIotSensorType(sensor as 'temperature' | 'sound' | 'motion' | 'humidity' | 'light');
                                    }}
                                  >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="heater:temperature">{language === 'tr' ? 'Isıtıcı' : 'Heater'}</SelectItem>
                                      <SelectItem value="lamp:light">{language === 'tr' ? 'Lamba' : 'Lamp'}</SelectItem>
                                      <SelectItem value="cooler:temperature">{language === 'tr' ? 'Soğutucu' : 'Cooler'}</SelectItem>
                                      <SelectItem value="sensor:temperature">{language === 'tr' ? 'Isı Sensörü' : 'Temperature Sensor'}</SelectItem>
                                      <SelectItem value="sensor:light">{language === 'tr' ? 'Işık Sensörü' : 'Light Sensor'}</SelectItem>
                                      <SelectItem value="sensor:humidity">{language === 'tr' ? 'Nem Sensörü' : 'Humidity Sensor'}</SelectItem>
                                      <SelectItem value="sensor:motion">{language === 'tr' ? 'Hareket Sensörü' : 'Motion Sensor'}</SelectItem>
                                      <SelectItem value="sensor:sound">{language === 'tr' ? 'Ses Sensörü' : 'Sound Sensor'}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>


                                <div className="flex items-center gap-4">
                                  <label className="text-xs font-bold text-secondary-500 shrink-0">
                                    {language === 'tr' ? 'Cihaz Durumu (Aktif/Pasif)' : 'Device Status (Active/Passive)'}
                                  </label>
                                  <span className={`text-[9px] font-bold ${!iotCollaborationEnabled ? 'text-rose-500' : 'text-secondary-200'}`}>
                                    {language === 'tr' ? 'PASİF' : 'PASSIVE'}
                                  </span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={iotCollaborationEnabled}
                                    onClick={() => setIotCollaborationEnabled((prev) => !prev)}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300 shrink-0 ${iotCollaborationEnabled ? 'bg-accent-500 border-accent-400 shadow-[0_0_3px_rgba(6,182,212,0.15)]' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                                  >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${iotCollaborationEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                                  </button>
                                  <span className={`text-[9px] font-bold ${iotCollaborationEnabled ? 'text-accent-500' : 'text-secondary-200'}`}>
                                    {language === 'tr' ? 'AKTİF' : 'ACTIVE'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <label className="text-xs font-bold text-secondary-500 shrink-0">
                                    {language === 'tr' ? 'Güç Durumu (Açık/Kapalı)' : 'Power Status (On/Off)'}
                                  </label>
                                  <span className={`text-[9px] font-bold ${selectedIotDevice?.status === 'offline' ? 'text-rose-500' : 'text-secondary-200'}`}>
                                    {language === 'tr' ? 'KAPALI' : 'OFF'}
                                  </span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={selectedIotDevice?.status !== 'offline'}
                                    onClick={() => {
                                      if (selectedIotDevice) {
                                        const newStatus = selectedIotDevice.status === 'offline' ? 'online' : 'offline';
                                        window.dispatchEvent(new CustomEvent('update-topology-device-config', {
                                          detail: {
                                            deviceId: selectedIotDeviceId,
                                            config: { status: newStatus }
                                          }
                                        }));
                                      }
                                    }}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300 shrink-0 ${selectedIotDevice?.status !== 'offline' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_3px_rgba(16,185,129,0.15)]' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                                  >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${selectedIotDevice?.status !== 'offline' ? 'translate-x-8' : 'translate-x-1'}`} />
                                  </button>
                                  <span className={`text-[9px] font-bold ${selectedIotDevice?.status !== 'offline' ? 'text-emerald-500' : 'text-secondary-200'}`}>
                                    {language === 'tr' ? 'AÇIK' : 'ON'}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-secondary-500">{language === 'tr' ? 'Veri Saklama (not/json/metin)' : 'Data Storage (note/json/text)'}</label>
                                  <textarea
                                    value={iotDataStore}
                                    onChange={(e) => setIotDataStore(e.target.value)}
                                    rows={5}
                                    className={`w-full rounded-md border px-3 py-2 text-sm ${isDark ? 'bg-secondary-950 border-secondary-800 text-secondary-100' : 'bg-white border-secondary-300 text-secondary-900'}`}
                                    placeholder={language === 'tr' ? 'Sensör verisi veya notlar...' : 'Sensor data or notes...'}
                                  />
                                </div>

                                {(() => {
                                  const wifiStrength = selectedIotDevice ? getWirelessSignalStrength(selectedIotDevice, topologyDevices, deviceStates) : 0;
                                  const isWired = topologyConnections.some(c =>
                                    (c.sourceDeviceId === selectedIotDeviceId || c.targetDeviceId === selectedIotDeviceId) && c.active !== false
                                  );
                                  const isIotConnected = wifiStrength > 0 || isWired;

                                  return (
                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-secondary-800/50' : 'bg-secondary-50'} border ${isDark ? 'border-secondary-700' : 'border-secondary-200'}`}>
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'IP Adresi' : 'IP Address'}</div>
                                            <div className={`text-sm font-mono ${selectedIotDevice?.ip ? 'text-accent-600 dark:text-accent-300' : 'text-secondary-200'}`}>
                                              {selectedIotDevice?.ip || (language === 'tr' ? 'Atanmamış' : 'Not assigned')}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div>
                                            <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'MAC Adresi' : 'MAC Address'}</div>
                                            <div className="text-sm font-mono text-secondary-600 dark:text-secondary-200">{selectedIotDevice?.macAddress ? normalizeMAC(selectedIotDevice.macAddress) : (language === 'tr' ? 'Yok' : 'N/A')}</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'Ağ Geçidi' : 'Gateway'}</div>
                                            <div className="text-sm font-mono text-secondary-600 dark:text-secondary-200">{selectedIotDevice?.gateway || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'Alt Ağ Maskesi' : 'Subnet Mask'}</div>
                                            <div className="text-sm font-mono text-secondary-600 dark:text-secondary-200">{selectedIotDevice?.subnet || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-semibold text-secondary-500 mb-1">{language === 'tr' ? 'Durum' : 'Status'}</div>
                                            <div className={`text-sm font-semibold ${isIotConnected ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}>
                                              {isIotConnected ? (
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></span>
                                                  {language === 'tr' ? 'Çevrimiçi' : 'Online'}
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2 h-2 rounded-full bg-error-500"></span>
                                                  {language === 'tr' ? 'Çevrimdışı' : 'Offline'}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 mt-2">
                                        {selectedIotDevice?.ip && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="hover:text-primary-500"
                                            onClick={() => {
                                              const targetIp = selectedIotDevice?.ip;
                                              if (targetIp) {
                                                navigateToProgram('desktop');
                                                setTimeout(() => {
                                                  executeCommand(`ping ${targetIp}`);
                                                }, 300);
                                              }
                                            }}
                                          >
                                            <Globe className="w-4 h-4 mr-2" />
                                            {language === 'tr' ? 'Ping Gönder' : 'Ping'}
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="hover:text-primary-500"
                                          onClick={() => {
                                            if (selectedIotDeviceId) {
                                              window.parent.postMessage({
                                                type: 'router-admin-renew-iot',
                                                deviceId: selectedIotDeviceId,
                                                payload: {
                                                  iotDeviceId: selectedIotDeviceId
                                                }
                                              }, window.parent.location.origin);
                                            }
                                          }}
                                        >
                                          <Radio className="w-4 h-4 mr-2" />
                                          {language === 'tr' ? 'IP Yenile' : 'IP Renew'}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Sensor Value & Graph Display */}
                                {selectedIotDevice && (
                                  <IoTSensorDisplay
                                    device={selectedIotDevice}
                                    environment={environment}
                                    language={language}
                                    isDark={isDark}
                                  />
                                )}

                                <div className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'} flex items-center gap-1`}>
                                  <Save className="w-3 h-3" />
                                  {language === 'tr' ? 'Değişiklikler otomatik kaydediliyor' : 'Changes are auto-saved'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'wireless' && (
                        <div
                          className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar"
                          style={mobileVerticalScrollStyle}
                        >
                          <div className={`rounded-2xl border p-5 space-y-5 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 text-purple-500">
                                <Network className="w-5 h-5" />
                                <h3 className="text-sm font-black tracking-widest ">
                                  {language === 'tr' ? 'Wi-Fi (Wireless Fidelity) Bağlantısı' : 'Wi-Fi (Wireless Fidelity) Connection'}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold bg-accent-600 hover:bg-accent-700 text-white"
                                  onClick={() => {
                                    navigateToProgram('desktop');
                                    setTimeout(() => {
                                      const apDevice = topologyDevices.find(d =>
                                        (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') &&
                                        d.services?.http?.enabled &&
                                        (d.wifi?.ssid === wifiSSID || d.ports?.some(p => p.wifi?.ssid === wifiSSID))
                                      );
                                      const targetIp = apDevice?.ip || '192.168.1.1';
                                      setInput(`curl ${targetIp}`);
                                      void executeCommand(`curl ${targetIp}`);
                                    }, 300);
                                  }}
                                >
                                  {language === 'tr' ? 'Kablosuz Ayarları Aç' : 'Open Wireless Settings'}
                                </Button>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={wifiEnabled}
                                  onClick={() => {
                                    const enabled = !wifiEnabled;
                                    setWifiEnabled(enabled);
                                    dispatchDeviceConfig({
                                      wifi: {
                                        enabled: enabled,
                                        ssid: wifiSSID,
                                        bssid: wifiBSSID,
                                        security: wifiSecurity,
                                        password: wifiPassword,
                                        channel: wifiChannel,
                                        mode: 'client'
                                      }
                                    });
                                  }}
                                  className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 ${wifiEnabled
                                    ? 'bg-purple-500 border-purple-400'
                                    : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                                    }`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${wifiEnabled ? 'translate-x-8' : 'translate-x-1'
                                      }`}
                                  />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest text-secondary-500 ml-1">SSID (Service Set Identifier)</label>
                                {(() => {
                                  const filtered = availableSSIDs.filter(e =>
                                    e.ssid.toLowerCase().includes(wifiSSID.toLowerCase())
                                  );
                                  return (
                                    <div className="relative">
                                      <div className={`flex items-center border rounded-md px-3 h-9 gap-2 ${!wifiEnabled ? 'opacity-50 pointer-events-none' : ''} ${isDark ? 'bg-background border-secondary-800' : 'bg-white border-secondary-200'}`}>
                                        <input
                                          type="text"
                                          value={wifiSSID}
                                          onChange={e => {
                                            const val = e.target.value;
                                            setWifiSSID(val);
                                            setWifiBSSID('');
                                            setSsidDropdownOpen(true);
                                            // Sync WiFi change to global
                                            dispatchDeviceConfig({
                                              wifi: {
                                                enabled: wifiEnabled,
                                                ssid: val,
                                                bssid: '',
                                                security: wifiSecurity,
                                                password: wifiPassword,
                                                channel: wifiChannel,
                                                mode: 'client'
                                              }
                                            });
                                          }}
                                          onFocus={() => setSsidDropdownOpen(true)}
                                          onBlur={() => setTimeout(() => setSsidDropdownOpen(false), 150)}
                                          placeholder={language === 'tr' ? 'Ağ seçin veya yazın...' : 'Select or type SSID...'}
                                          className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder:text-secondary-500' : 'text-secondary-900 placeholder:text-secondary-400'}`}
                                        />
                                        {wifiSSID && (
                                          <button type="button" onClick={() => { setWifiSSID(''); setWifiBSSID(''); setSsidDropdownOpen(false); }} className="text-secondary-200 hover:text-white text-xs">✕</button>
                                        )}
                                        <button type="button" onClick={() => setSsidDropdownOpen(o => !o)} className="text-secondary-200 hover:text-white text-xs">▾</button>
                                      </div>
                                      {ssidDropdownOpen && (
                                        <div className={`absolute z-50 w-full mt-1 rounded-md border shadow-lg max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar ${isDark ? 'bg-secondary-900 border-secondary-700' : 'bg-white border-secondary-200'}`}>
                                          {filtered.length === 0 && (
                                            <div className={`px-3 py-2 text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-400'}`}>
                                              {language === 'tr' ? 'Ağ bulunamadı' : 'No networks found'}
                                            </div>
                                          )}
                                          {filtered.map(entry => {
                                            const hasDupe = availableSSIDs.filter(e => e.ssid === entry.ssid).length > 1;
                                            const label = hasDupe ? `${entry.ssid} (${entry.deviceName})` : entry.ssid;
                                            return (
                                              <button
                                                key={`${entry.deviceId}-${entry.ssid}`}
                                                type="button"
                                                onPointerDown={(event) => {
                                                  event.preventDefault();
                                                  setSsidDropdownOpen(false);
                                                  setWifiSSID(entry.ssid);
                                                  setWifiBSSID(entry.deviceId);
                                                  // Sync WiFi change to global
                                                  dispatchDeviceConfig({
                                                    wifi: {
                                                      enabled: wifiEnabled,
                                                      ssid: entry.ssid,
                                                      bssid: entry.deviceId,
                                                      security: wifiSecurity,
                                                      password: wifiPassword,
                                                      channel: wifiChannel,
                                                      mode: 'client'
                                                    }
                                                  });
                                                  (document.activeElement as HTMLElement | null)?.blur?.();
                                                }}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-500/20 ${isDark ? 'text-white' : 'text-secondary-900'}`}
                                              >
                                                📶 {label}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest  text-secondary-500 ml-1">
                                  {language === 'tr' ? 'Güvenlik' : 'Security'}
                                </label>
                                <Select
                                  value={wifiSecurity}
                                  onValueChange={(val: string) => {
                                    const security = val as 'open' | 'wpa' | 'wpa2' | 'wpa3';
                                    setWifiSecurity(security);
                                    dispatchDeviceConfig({
                                      wifi: {
                                        enabled: wifiEnabled,
                                        ssid: wifiSSID,
                                        bssid: wifiBSSID,
                                        security: security,
                                        password: wifiPassword,
                                        channel: wifiChannel,
                                        mode: 'client'
                                      }
                                    });
                                  }}
                                  disabled={!wifiEnabled}
                                >
                                  <SelectTrigger className={`w-full ${isDark ? 'bg-background border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900'}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">{language === 'tr' ? 'Açık' : 'Open'}</SelectItem>
                                    <SelectItem value="wpa">WPA</SelectItem>
                                    <SelectItem value="wpa2">WPA2 Personal</SelectItem>
                                    <SelectItem value="wpa3">WPA3</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {wifiSecurity !== 'open' && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black tracking-widest  text-secondary-500 ml-1">
                                    {language === 'tr' ? 'Parola' : 'Password'}
                                  </label>
                                  <div className="relative">
                                    <Input
                                      type={showWifiPassword ? 'text' : 'password'}
                                      value={wifiPassword}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setWifiPassword(val);
                                        dispatchDeviceConfig({
                                          wifi: {
                                            enabled: wifiEnabled,
                                            ssid: wifiSSID,
                                            bssid: wifiBSSID,
                                            security: wifiSecurity,
                                            password: val,
                                            channel: wifiChannel,
                                            mode: 'client'
                                          }
                                        });
                                      }}
                                      placeholder={t.securityKey}
                                      disabled={!wifiEnabled}
                                      className="bg-background pr-9"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowWifiPassword(v => !v)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-200 hover:text-white focus:outline-none"
                                      tabIndex={-1}
                                    >
                                      {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest  text-secondary-500 ml-1">
                                  {language === 'tr' ? 'Kanal' : 'Channel'}
                                </label>
                                <Select
                                  value={wifiChannel}
                                  onValueChange={(val: string) => {
                                    const channel = val as '2.4GHz' | '5GHz';
                                    setWifiChannel(channel);
                                    dispatchDeviceConfig({
                                      wifi: {
                                        enabled: wifiEnabled,
                                        ssid: wifiSSID,
                                        bssid: wifiBSSID,
                                        security: wifiSecurity,
                                        password: wifiPassword,
                                        channel: channel,
                                        mode: 'client'
                                      }
                                    });
                                  }}
                                  disabled={!wifiEnabled}
                                >
                                  <SelectTrigger className={`w-full ${isDark ? 'bg-background border-secondary-800 text-white' : 'bg-white border-secondary-200 text-secondary-900'}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="2.4GHz">2.4 GHz</SelectItem>
                                    <SelectItem value="5GHz">5 GHz</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${(() => {
                              if (!wifiEnabled) return 'text-secondary-500 bg-secondary-500/5';
                              if (!wifiSSID) return 'text-warning-500 bg-warning-500/10';
                              // Check if connected: SSID matches an active AP
                              const isConnected = !!deviceStates && Array.from(ensureDeviceStatesMap(deviceStates).entries()).some(([id, state]) => {
                                const wlan = state.ports['wlan0'];
                                if (!wlan || wlan.shutdown || wlan.wifi?.mode !== 'ap') return false;
                                if (wifiBSSID && wifiBSSID !== id) return false;
                                if (wlan.wifi?.ssid !== wifiSSID) return false;
                                const apSecurity = wlan.wifi?.security || 'open';
                                if (apSecurity !== wifiSecurity) return false;
                                if (apSecurity !== 'open' && wlan.wifi?.password !== wifiPassword) return false;
                                return true;
                              });
                              return isConnected ? 'text-emerald-500 bg-emerald-500/10' : 'text-warning-500 bg-warning-500/10';
                            })()
                              }`}>
                              <div className={`p-2 rounded-lg ${(() => {
                                if (!wifiEnabled) return 'bg-secondary-500/10';
                                if (!wifiSSID) return 'bg-warning-500/20';
                                const isConnected = !!deviceStates && Array.from(ensureDeviceStatesMap(deviceStates).entries()).some(([id, state]) => {
                                  const wlan = state.ports['wlan0'];
                                  if (!wlan || wlan.shutdown || wlan.wifi?.mode !== 'ap') return false;
                                  if (wifiBSSID && wifiBSSID !== id) return false;
                                  if (wlan.wifi?.ssid !== wifiSSID) return false;
                                  const apSecurity = wlan.wifi?.security || 'open';
                                  if (apSecurity !== wifiSecurity) return false;
                                  if (apSecurity !== 'open' && wlan.wifi?.password !== wifiPassword) return false;
                                  return true;
                                });
                                return isConnected ? 'bg-emerald-500/20' : 'bg-warning-500/20';
                              })()
                                }`}>
                                <Monitor className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="font-bold  tracking-wider mb-0.5">
                                  {language === 'tr' ? 'Durum' : 'Status'}
                                </div>
                                <div className="opacity-80">
                                  {!wifiEnabled
                                    ? (language === 'tr' ? 'Kablosuz alıcı kapalı' : 'Wireless receiver disabled')
                                    : (() => {
                                      // No SSID configured - cannot be connected
                                      if (!wifiSSID) return language === 'tr' ? 'WLAN0 aktif, ağ seçilmedi' : 'WLAN0 active, no network selected';

                                      // First check deviceStates (router/switch runtime state)
                                      const foundInStates = !!deviceStates && Array.from(ensureDeviceStatesMap(deviceStates).entries()).find(([id, state]) => {
                                        const wlan = state.ports['wlan0'];
                                        if (!wlan || wlan.shutdown || wlan.wifi?.mode !== 'ap') return false;
                                        if (wifiBSSID && wifiBSSID !== id) return false;
                                        if (wlan.wifi?.ssid !== wifiSSID) return false;
                                        const apSecurity = wlan.wifi?.security || 'open';
                                        if (apSecurity !== wifiSecurity) return false;
                                        if (apSecurity !== 'open' && wlan.wifi?.password !== wifiPassword) return false;
                                        return true;
                                      });

                                      // If not found in deviceStates, also check topologyDevices
                                      const foundInTopology = !foundInStates && topologyDevices.find((apDevice) => {
                                        if (apDevice.id === deviceId) return false;
                                        if (apDevice.type !== 'router' && apDevice.type !== 'switchL2' && apDevice.type !== 'switchL3') return false;
                                        const apWifi = apDevice.wifi;
                                        if (!apWifi || apWifi.mode !== 'ap' || !apWifi.ssid) return false;
                                        if (apWifi.ssid !== wifiSSID) return false;
                                        const apSecurity = apWifi.security || 'open';
                                        if (apSecurity !== wifiSecurity) return false;
                                        if (apSecurity !== 'open' && apWifi.password !== wifiPassword) return false;
                                        return true;
                                      });

                                      const isConnected = !!foundInStates || !!foundInTopology;
                                      if (isConnected && wifiSSID) return language === 'tr' ? `Bağlı • SSID: ${wifiSSID}` : `Connected • SSID: ${wifiSSID}`;
                                      return wifiSSID
                                        ? (language === 'tr' ? `Ağ bulunamadı: ${wifiSSID}` : `Network not found: ${wifiSSID}`)
                                        : (language === 'tr' ? 'WLAN0 aktif, ağ seçilmedi' : 'WLAN0 active, no network selected');
                                    })()
                                  }
                                </div>
                              </div>
                            </div>

                            {/* Signal Strength Display */}
                            {wifiEnabled && wifiSSID && (
                              <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${isDark ? 'bg-primary-500/10 text-primary-300 border border-primary-500/30' : 'bg-primary-50 text-primary-700 border border-primary-200'}`}>
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-primary-500/20' : 'bg-primary-100'}`}>
                                  <Wifi className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold tracking-wider mb-0.5">
                                    {language === 'tr' ? 'Sinyal Gücü' : 'Signal Strength'}
                                  </div>
                                  <div className="opacity-90">
                                    {(() => {
                                      const strength = wifiSignalStrength;
                                      const percentMap: Record<number, number> = { 0: 0, 1: 1, 2: 25, 3: 50, 4: 75, 5: 100 };
                                      const percentage = percentMap[strength] || 0;
                                      const levelMap = {
                                        tr: { 0: 'Sinyal yok', 1: 'Çok Zayıf', 2: 'Zayıf', 3: 'Orta', 4: 'İyi', 5: 'Mükemmel' },
                                        en: { 0: 'No signal', 1: 'Very Weak', 2: 'Weak', 3: 'Fair', 4: 'Good', 5: 'Excellent' }
                                      };
                                      const level = levelMap[language === 'tr' ? 'tr' : 'en'][strength as keyof typeof levelMap['en']] || 'Unknown';
                                      return `${level} (${percentage}%)`;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {(activeTab === 'desktop' || activeTab === 'terminal') && (
                        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                          {activeTab === 'terminal' && (
                            <div className={`px-3 md:px-4 py-2 border-b shrink-0 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-secondary-50'} flex items-center justify-between gap-3`}>
                              <div className="flex flex-col gap-1">
                                <div className="text-xs">
                                  {isConsoleConnected && connectedDeviceId ? (
                                    <span className="text-emerald-500 font-medium">
                                      {t.physicalConnectionDetected} {topologyDevices.find((d: CanvasDevice) => d.id === connectedDeviceId)?.name || connectedDeviceId}
                                    </span>
                                  ) : (
                                    <span className={isDark ? 'text-secondary-200' : 'text-secondary-600'}>{t.noConsoleCableDetected}</span>
                                  )}
                                </div>
                                <div className={`text-[10px] opacity-70 ${isDark ? 'text-secondary-200' : 'text-secondary-400'}`}>
                                  {t.consoleConfiguration}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={isConsoleConnected ? () => { setIsConsoleConnected(false); setConnectedDeviceId(null); } : handleConnect}
                                disabled={isPcPoweredOff || (!consoleDevice && !isConsoleConnected)}
                                className={isConsoleConnected ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}
                              >
                                {isConsoleConnected ? t.disconnect : t.connect}
                              </Button>
                            </div>
                          )}
                          {showCmdSettings && (
                            <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-4 animate-in slide-in-from-top-2 shrink-0">
                              <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">
                                {t.fontSizeLabel}: {fontSize}px
                              </label>
                              <input
                                type="range" min="10" max="20" value={fontSize}
                                aria-label={t.fontSizeLabel}
                                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                                className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                              <TooltipWrapper title={t.clearTerminalBtn}>
                                <Button
                                  variant="ghost" size="sm"
                                  onClick={() => {
                                    if (activeTab === 'desktop') setPcOutput([]);
                                    else setConsoleConnectionTime(Date.now());
                                  }}
                                  className="h-7 text-[10px] font-black tracking-widest text-rose-500 shrink-0 gap-1.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>{t.clearTerminalBtn}</span>
                                  {!isMobile && <ShortcutBadge shortcut="Ctrl+L" variant="danger" className="scale-75 origin-right" />}
                                </Button>
                              </TooltipWrapper>
                            </div>
                          )}
                          {/* Output Area - Scrollable */}
                          <div
                            ref={outputRef}
                            className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-3 md:p-6 space-y-1.5 font-geist-mono leading-relaxed custom-scrollbar min-h-0 ${isMobile ? 'mobile-scroll' : ''} ${isPcPoweredOff ? 'bg-black' : terminalBg}`}
                            style={{ ...mobileVerticalScrollStyle, fontSize: `${fontSize}px`, contain: 'layout style paint' }}
                          >
                            {isPcPoweredOff ? (
                              <div className="h-full flex flex-col items-center justify-center gap-3">
                                <svg className="w-16 h-16 text-error-600 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 5.64a9 9 0 1 1-12.73 0" />
                                </svg>
                              </div>
                            ) : (
                              (activeTab === 'desktop' ? pcOutput : activeConsoleOutput).map((line) => (
                                <div key={line.id} className="break-all animate-in fade-in slide-in-from-left-1 duration-200">
                                  {line.type === 'command' && (
                                    <div className="flex items-start gap-2 text-accent-500 font-bold">
                                      {activeTab === 'desktop' ? (
                                        <Laptop className="w-4 h-4 shrink-0 text-primary-400" />
                                      ) : (
                                        <span className="shrink-0 text-emerald-400">
                                          <Laptop className="w-4 h-4" />
                                        </span>
                                      )}
                                      <span className="shrink-0 opacity-40 select-none font-geist-mono">
                                        {activeTab === 'desktop' ? (line.prompt || `${internalPcHostname} C:\\>`) : (line.prompt || '>')}
                                      </span>
                                      <span className={isDark ? "text-secondary-100" : "text-secondary-900"}>{highlightText(line.content)}</span>
                                    </div>
                                  )}
                                  {line.type === 'output' && (
                                    <div className={`${textColor} whitespace-pre-wrap`}>
                                      {(() => {
                                        // Check if line contains copyable network values (Windows format with dots)
                                        const ipConfigMatch = line.content.match(/^(\s*(?:IPv4 Address|Default Gateway|IPv6 Address|DNS Servers|Subnet Mask|Physical Address|Host Name).*?:\s*)(.+)$/);
                                        if (ipConfigMatch) {
                                          const [, label, value] = ipConfigMatch;
                                          return (
                                            <div className="flex items-center gap-2 group">
                                              <span>{highlightText(label)}</span>
                                              <span
                                                className="font-mono cursor-pointer hover:text-emerald-400 transition-colors"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value.trim());
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${value.trim()} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                title={language === 'tr' ? 'Tıkla ve kopyala' : 'Click to copy'}
                                              >
                                                {highlightText(value)}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value.trim());
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${value.trim()} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary-700/30 ${isDark ? 'text-secondary-400 hover:text-emerald-400' : 'text-secondary-500 hover:text-emerald-600'}`}
                                                title={language === 'tr' ? 'Kopyala' : 'Copy'}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </button>
                                            </div>
                                          );
                                        }
                                        // OS IP Configuration format (without dots, like "   IPv4 Address . . . . : value")
                                        const osIpConfigMatch = line.content.match(/^(\s*(?:IPv4 Address|Default Gateway|IPv6 Address|DNS Servers|Subnet Mask|Physical Address)\s+)(.+)$/);
                                        if (osIpConfigMatch) {
                                          const [, label, value] = osIpConfigMatch;
                                          return (
                                            <div className="flex items-center gap-2 group">
                                              <span>{highlightText(label)}</span>
                                              <span
                                                className="font-mono cursor-pointer hover:text-emerald-400 transition-colors"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value.trim());
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${value.trim()} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                title={language === 'tr' ? 'Tıkla ve kopyala' : 'Click to copy'}
                                              >
                                                {highlightText(value)}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value.trim());
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${value.trim()} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary-700/30 ${isDark ? 'text-secondary-400 hover:text-emerald-400' : 'text-secondary-500 hover:text-emerald-600'}`}
                                                title={language === 'tr' ? 'Kopyala' : 'Copy'}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </button>
                                            </div>
                                          );
                                        }
                                        // DHCP renew success message with IP
                                        const dhcpMatch = line.content.match(/(DHCP lease renewed\. New IP:|IP yenilendi:|Assigned link-local IP:|No DHCP server\/pool found\. Assigned link-local IP:)(.+)/);
                                        if (dhcpMatch) {
                                          const [, label, value] = dhcpMatch;
                                          const ipValue = value.trim();
                                          return (
                                            <div className="flex items-center gap-2 group">
                                              <span>{highlightText(label)}</span>
                                              <span
                                                className="font-mono text-accent-400 cursor-pointer hover:text-emerald-400 transition-colors"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(ipValue);
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${ipValue} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                title={language === 'tr' ? 'Tıkla ve kopyala' : 'Click to copy'}
                                              >
                                                {highlightText(ipValue)}
                                              </span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(ipValue);
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${ipValue} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary-700/30 ${isDark ? 'text-secondary-400 hover:text-emerald-400' : 'text-secondary-500 hover:text-emerald-600'}`}
                                                title={language === 'tr' ? 'Kopyala' : 'Copy'}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </button>
                                            </div>
                                          );
                                        }
                                        // General IP address detection for ping, nslookup, tracert, netstat, etc.
                                        // IPv4 pattern with optional port: \d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?
                                        // IPv6 pattern (simplified): ([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}
                                        // Also match standalone IP addresses
                                        const ipAddressMatch = line.content.match(/(Reply from |Address: |\[|TCP\s+|UDP\s+|^|\s)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?|([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})(\]|:| |$)/);
                                        if (ipAddressMatch) {
                                          const [, , ipAddress] = ipAddressMatch;
                                          const fullMatch = ipAddressMatch[0];
                                          const beforeIp = line.content.substring(0, line.content.indexOf(fullMatch));
                                          const afterIp = line.content.substring(line.content.indexOf(fullMatch) + fullMatch.length);

                                          // Extract just the IP address without port if present
                                          let cleanIpAddress = ipAddress;
                                          if (ipAddress.includes(':')) {
                                            // Check if it's IPv6 or IPv4 with port
                                            if (ipAddress.includes('.') && ipAddress.includes(':')) {
                                              // IPv4 with port, e.g., 192.168.1.1:80
                                              const parts = ipAddress.split(':');
                                              if (parts.length === 2) {
                                                cleanIpAddress = parts[0];
                                              }
                                            }
                                            // IPv6 addresses also contain colons, but we keep them as is
                                          }

                                          return (
                                            <div className="flex items-center gap-2 group">
                                              <span>{highlightText(beforeIp)}</span>
                                              <span
                                                className="font-mono cursor-pointer hover:text-emerald-400 transition-colors"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(cleanIpAddress);
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${cleanIpAddress} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                title={language === 'tr' ? 'Tıkla ve kopyala' : 'Click to copy'}
                                              >
                                                {highlightText(fullMatch)}
                                              </span>
                                              <span>{highlightText(afterIp)}</span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(cleanIpAddress);
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${cleanIpAddress} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-secondary-700/30 ${isDark ? 'text-secondary-400 hover:text-emerald-400' : 'text-secondary-500 hover:text-emerald-600'}`}
                                                title={language === 'tr' ? 'Kopyala' : 'Copy'}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </button>
                                            </div>
                                          );
                                        }
                                        return <span>{highlightText(line.content)}</span>;
                                      })()}
                                    </div>
                                  )}
                                  {line.type === 'error' && <span className="text-rose-500 font-bold italic">{highlightText(line.content)}</span>}
                                  {line.type === 'success' && <span className="text-accent-500 font-bold  text-xs tracking-widest opacity-80">{highlightText(line.content)}</span>}
                                  {/* HTML çıktıları pop-up içinde gösteriliyor */}
                                </div>
                              ))
                            )}
                            {activeTab === 'terminal' && !isPcPoweredOff && !isConsoleConnected && (
                              <div className={`mt-auto text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                                {t.waitingForConnection}
                              </div>
                            )}
                          </div>
                          {/* Input Area - Fixed at bottom */}
                          {!isPcPoweredOff && (
                            <div onClick={() => inputRef.current?.focus()} className={`shrink-0 border-t bg-muted/95 backdrop-blur-sm ${isMobile ? 'p-2' : 'p-3'}`}>
                              <form onSubmit={(e) => { e.preventDefault(); executeCommand(); }} className="flex items-center gap-3 relative">

                                {/* Context hint for password/confirm in console mode */}
                                {activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending) && (
                                  <div className="absolute -top-7 left-4 right-4 text-[10px] font-black tracking-widest text-warning-400 animate-pulse">
                                    {consoleNeedsPassword
                                      ? (language === 'tr' ? 'Parola girin ve Enter\'a basın' : 'Enter password and press Enter')
                                      : (language === 'tr' ? 'Onaylamak için Enter\'a basın' : 'Press Enter to confirm')}
                                  </div>
                                )}
                                <div
                                  onClick={() => inputRef.current?.focus()}
                                   className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 bg-background rounded-lg border flex-1 group focus-within:ring-1 transition-all shadow-inner overflow-hidden ${isMobile ? 'px-3 py-2' : ''} ${activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                    ? 'border-warning-500/50 focus-within:ring-warning-500/50'
                                    : 'border-input focus-within:ring-primary/50'
                                    }`}>
                                  <span className={`font-geist-mono font-bold text-[10px] sm:text-xs select-none opacity-40 group-focus-within:opacity-100 transition-opacity shrink-0 truncate max-w-[80px] sm:max-w-none md:max-w-[150px] ${activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                    ? 'text-warning-400'
                                    : 'text-primary'
                                    }`}>
                                    {activeTab === 'desktop' ? (ftpSession ? 'ftp>' : `${internalPcHostname} C:\\>`) : (() => {
                                      if (consoleNeedsPassword) return 'Password:';
                                      if (!connectedDeviceId || !deviceStates) return '>';
                                      const state = ensureDeviceStatesMap(deviceStates).get(connectedDeviceId);
                                      const hostname = state?.hostname || 'Device';
                                      const mode = state?.currentMode || 'user';
                                      // Map CommandMode to prompt suffix
                                      const modeSuffix: Record<string, string> = {
                                        'user': '>',
                                        'privileged': '#',
                                        'config': '(config)#',
                                        'interface': '(config-if)#',
                                        'line': '(config-line)#',
                                        'vlan': '(config-vlan)#',
                                        'router-config': '(config)#'
                                      };
                                      const suffix = modeSuffix[mode] || '>';
                                      return `${hostname}${suffix}`;
                                    })()}
                                  </span>
                                  <input
                                    ref={inputRef}
                                    type={activeTab === 'terminal' && isConsoleConnected && consoleNeedsPassword ? 'password' : 'text'}
                                    value={input}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => {
                                      // Scroll input into view on mobile when keyboard opens
                                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                        setTimeout(() => {
                                          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                        }, 300);
                                      }
                                    }}
                                    className="flex-1 bg-transparent border-none outline-none font-geist-mono text-[16px] sm:text-[13px] placeholder:text-muted-foreground/50 min-w-0"
                                    placeholder={
                                      activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                        ? (consoleNeedsPassword
                                          ? (language === 'tr' ? 'Parolayı girin...' : 'Enter password...')
                                          : (language === 'tr' ? 'Enter\'a basın veya yazın...' : 'Press Enter or type...'))
                                        : t.typeCommand
                                    }
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={activeTab === 'desktop' ? isCmdInputDisabled : isConsoleInputDisabled}
                                  />
                                </div>
                                {shouldShowAutocomplete && (
                                  <div
                                    ref={autocompleteRef}
                                    className="absolute bottom-20 left-4 z-20 w-[min(420px,calc(100%-2rem))]"
                                  >
                                    <div className={cn(
                                      "rounded-lg border shadow-xl overflow-hidden",
                                      isDark ? "bg-secondary-800 border-secondary-700" : "bg-white border-secondary-200"
                                    )}>
                                      <div className={`flex items-center justify-between px-3 py-2 text-[11px] font-geist-mono font-semibold ${isDark ? 'text-secondary-200 bg-secondary-900/60' : 'text-secondary-700 bg-secondary-50'}`}>
                                        <span>{t.cmdSuggestions}</span>
                                        <span className={`text-[10px] font-bold ${isDark ? 'text-accent-300' : 'text-accent-700'}`}>
                                          Tab ↹ {t.completeWithTab}
                                        </span>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto overflow-x-hidden mobile-scroll custom-scrollbar font-geist-mono">
                                        {renderAutocompleteSuggestions.map((cmd, idx) => (
                                          <button
                                            key={`${cmd}-${idx}`}
                                            type="button"
                                            onClick={() => {
                                              completeAutocompleteSelection(cmd);
                                              inputRef.current?.focus();
                                            }}
                                            className={cn(
                                              "w-full text-left px-2.5 py-1 text-[11px] font-geist-mono transition-colors",
                                              autocompleteIndex >= 0 && idx === autocompleteIndex
                                                ? (isDark ? "bg-accent-500/20 text-accent-200" : "bg-accent-50 text-accent-900")
                                                : (isDark ? "text-secondary-300 hover:bg-primary/10" : "text-secondary-700 hover:bg-primary/10")
                                            )}
                                          >
                                            {cmd}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending) && (
                                  <Button
                                    type="button"
                                    disabled={isConsoleInputDisabled}
                                    variant="ghost"
                                    className="shrink-0 rounded-xl hover:bg-rose-500/20 text-rose-500 px-2 h-9 text-xs"
                                    onClick={() => {
                                      if (onExecuteDeviceCommand && connectedDeviceId) {
                                        if (consoleNeedsPassword) {
                                          onExecuteDeviceCommand(connectedDeviceId, '__PASSWORD_CANCELLED__');
                                        } else if (consoleReloadPending) {
                                          // For reload, send 'n' to cancel
                                          onExecuteDeviceCommand(connectedDeviceId, 'n');
                                        }
                                      }
                                      setConsolePasswordAttempted(false);
                                      setIsConsoleConnected(false);
                                      setConnectedDeviceId(null);
                                      setInput('');
                                    }}
                                    title={language === 'tr' ? 'İptal' : 'Cancel'}
                                  >
                                    <X className={cn("w-4 h-4 mr-1", isMobile && "w-3 h-3")} />
                                    <span className="text-rose-600 dark:text-rose-400 font-medium">{language === 'tr' ? 'İptal' : 'Cancel'}</span>
                                  </Button>
                                )}
                                <Button
                                  type="submit"
                                  disabled={activeTab === 'desktop' ? (!input.trim() || isCmdInputDisabled) : isConsoleInputDisabled}
                                  className={cn(
                                    "shrink-0 rounded-xl shadow-lg px-3 bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
                                    isMobile ? "h-9 text-xs" : "h-11 text-sm",
                                    activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                      && "bg-amber-500 hover:bg-amber-600 text-white"
                                  )}
                                >
                                  <span className="rounded-md p-1"><CornerDownLeft className={cn("w-4 h-4 text-white dark:text-zinc-900", isMobile && "w-3 h-3")} /></span>
                                </Button>
                                {!isMobile && handleResizeStart && (
                                  <div
                                    className="absolute -bottom-2 -right-2 z-20 h-5 w-5 cursor-se-resize select-none touch-none flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity"
                                    onPointerDown={(e) => {
                                      e.stopPropagation();
                                      handleResizeStart(e, 'se', 'pc');
                                    }}
                                  >
                                    <svg className={cn("h-3 w-3", isDark ? "text-zinc-400" : "text-zinc-500")} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                      <path d="M2 14 L14 2" />
                                      <path d="M8 14 L14 8" />
                                      <path d="M12 14 L14 12" />
                                    </svg>
                                  </div>
                                )}
                              </form>
                            </div>
                          )}
                        </div>
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
