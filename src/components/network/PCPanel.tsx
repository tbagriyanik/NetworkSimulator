'use client';

import { useState, useRef, useEffect, KeyboardEvent, useCallback, useMemo, type CSSProperties } from 'react';
import { useSwitchState, useAppStore, useEnvironment } from '@/lib/store/appStore';
import { CableInfo, SwitchState } from '@/lib/network/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { TerminalOutput } from './Terminal';
import type { CanvasDevice } from './networkTopology.types';
import { checkConnectivity, getWirelessSignalStrength, getWirelessDistance, getDeviceWifiConfig } from '@/lib/network/connectivity';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Laptop, Monitor, Terminal as TerminalIcon, X, CornerDownLeft, Command, Globe, Network, ShieldCheck, History, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, Copy, Save, Trash2, Download, Settings, Wifi, Eye, EyeOff, Radio, LayoutGrid, ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from "@/hooks/use-toast";
import { isValidMAC, normalizeMAC, cn } from "@/lib/utils";
import { ModernPanel } from '@/components/ui/ModernPanel';
import { useIsMobile, useIsDesktop } from '@/hooks/use-breakpoint';
import { sanitizeHTTPContent } from '@/lib/security/sanitizer';
import { generateRouterAdminPage, isRouterDevice } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent, generateIotDevicePageContent } from '@/lib/network/iotWebPanel';
import { generateRandomLinkLocalIpv4 } from '@/lib/network/linkLocal';
import { WifiSignalMeter, IoTSensorDisplay } from './PCPanelWidgets';
import { expandCommandContext, DESKTOP_COMMANDS } from './pcPanel.utils';
import { errorHandler, STORAGE_ERRORS, DHCP_ERRORS, CLIPBOARD_ERRORS, DEVICE_ERRORS } from '@/lib/errors/errorHandler';


interface OutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'prompt' | 'html';
  content: string;
  prompt?: string;
}

interface DhcpPoolConfig {
  poolName: string;
  defaultGateway: string;
  dnsServer: string;
  startIp: string;
  subnetMask: string;
  maxUsers: number;
}

interface PCPanelProps {
  deviceId: string;
  cableInfo: CableInfo;
  isVisible: boolean;
  initialTab?: 'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot';
  className?: string;
  onClose: () => void;
  onTogglePower?: (deviceId: string) => void;
  topologyDevices?: CanvasDevice[];
  topologyConnections?: {
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType?: string;
    active?: boolean
  }[];
  deviceStates?: Map<string, SwitchState>;
  deviceOutputs?: Map<string, TerminalOutput[]>;
  pcOutputs?: Map<string, OutputLine[]>;
  pcHistories?: Map<string, string[]>;
  onUpdatePCHistory?: (deviceId: string, history: string[]) => void;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<any>;
  onNavigate?: (program: string) => void;
  onDeleteDevice?: (deviceId: string) => void;
}


export function PCPanel({
  deviceId,
  cableInfo,
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
  onDeleteDevice
}: PCPanelProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const environment = useEnvironment();

  // Responsive hooks
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  // Helper to render network input fields to avoid repetition
  const renderNetworkInput = useCallback((label: string, value: string, onChange: (val: string) => void, placeholder: string, error?: string, disabled?: boolean) => (
    <div className="space-y-1.5 flex-1">
      <label className="text-xs font-bold text-slate-500 ml-1">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("h-9", error && "border-rose-500")}
      />
      {error && <p className="text-[10px] text-rose-500 mt-1 ml-1">{error}</p>}
    </div>
  ), []);

  // Ref for click-outside detection
  const panelRef = useRef<HTMLDivElement>(null);

  // Use granular selector for device state to prevent cascading re-renders
  const deviceState = useSwitchState(deviceId);

  const terminalBg = isDark ? 'bg-black' : 'bg-slate-50';
  const textColor = isDark ? 'text-slate-300' : 'text-slate-700';
  const cmdColor = isDark ? 'text-slate-100' : 'text-slate-900';
  const inputBg = isDark ? 'bg-black/50' : 'bg-white';
  const inputBorder = isDark ? 'border-slate-800' : 'border-slate-300';

  const [activeTab, setActiveTab] = useState<PCActiveTab>(initialTab || 'home');
  const activeTabRef = useRef<PCActiveTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  const [activeServiceTab, setActiveServiceTab] = useState<'dns' | 'http' | 'dhcp'>('dns');
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
    } catch (err) {
      errorHandler.logError(STORAGE_ERRORS.LOCAL_STORAGE_UNAVAILABLE({ key: 'terminal-font-size', operation: 'read' }));
      return 13;
    }
  });
  const [showCmdSettings, setShowCmdSettings] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    try {
      localStorage.setItem('terminal-font-size', String(val));
    } catch (err) {
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

  // Game state
  const [gameActive, setGameActive] = useState(false);
  const [snake, setSnake] = useState<{ x: number, y: number }[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [gameScore, setGameScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameLanguage, setGameLanguage] = useState<'en' | 'tr'>('en');

  // Console connection state
  const [isConsoleConnected, setIsConsoleConnected] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [consoleConnectionTime, setConsoleConnectionTime] = useState<number>(0);

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
    setDesktopHistory(globalHistory);
    setDesktopHistoryIndex(-1);
  }, [deviceId, pcHistories]);

  // Sync with global history if it changes externally
  useEffect(() => {
    const globalHistory = pcHistories?.get(deviceId) || [];
    setDesktopHistory(prevHistory => {
      if (JSON.stringify(globalHistory) !== JSON.stringify(prevHistory)) {
        return globalHistory;
      }
      return prevHistory;
    });
    setDesktopHistoryIndex(-1);
  }, [pcHistories, deviceId]);

  // Reset per-tab command cursor when tab changes.
  useEffect(() => {
    if (activeTab === 'desktop') setDesktopHistoryIndex(-1);
    if (activeTab === 'terminal') setConsoleHistoryIndex(-1);
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
    setInternalPcHostname(deviceFromTopology?.name || deviceId);
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
  const [editingDnsIndex, setEditingDnsIndex] = useState<number | null>(null);
  const [serviceHttpEnabled, setServiceHttpEnabled] = useState(deviceFromTopology?.services?.http?.enabled ?? false);
  const [serviceHttpContent, setServiceHttpContent] = useState(deviceFromTopology?.services?.http?.content || 'Merhaba Dünya!');
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
          } catch (err) {
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
            } catch (err) {
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
      setServiceHttpContent(deviceFromTopology?.services?.http?.content || 'Merhaba Dünya!');
      setServiceDhcpEnabled(deviceFromTopology?.services?.dhcp?.enabled ?? false);
      setServiceDhcpPools(deviceFromTopology?.services?.dhcp?.pools || []);

      setDnsFormDomain('');
      setDnsFormAddress('');
      setEditingDnsIndex(null);
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
      setSelectedIotDeviceId('');
      return;
    }
    if (!selectedIotDeviceId || !iotDevices.some((d) => d.id === selectedIotDeviceId)) {
      setSelectedIotDeviceId(iotDevices[0].id);
    }
  }, [iotDevices, selectedIotDeviceId]);

  useEffect(() => {
    if (!selectedIotDevice) return;
    setIotSensorType(selectedIotDevice.iot?.sensorType || 'temperature');
    setIotKind(selectedIotDevice.iot?.kind || 'sensor');
    setIotCollaborationEnabled(!!selectedIotDevice.iot?.collaborationEnabled);
    setIotDataStore(selectedIotDevice.iot?.dataStore || '');
  }, [selectedIotDevice]);

  // When tablet powers on or opens, navigate to initial or home screen
  const initialNavDoneRef = useRef(false);
  useEffect(() => {
    if (isVisible) {
      if (!isPcPoweredOff) {
        const targetTab = initialTab || 'home';
        setActiveTab(targetTab);
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
                content: serviceHttpContent || 'Merhaba Dünya!'
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
  }, [internalPcHostname, ipConfigMode, pcIP, pcMAC, pcSubnet, pcGateway, pcDNS, pcIPv6, pcIPv6Prefix, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceDhcpEnabled, serviceDhcpPools, wifiEnabled, wifiSSID, wifiBSSID, wifiSecurity, wifiPassword, wifiChannel, deviceId, topologyDevices]);

  const dispatchDeviceConfig = useCallback((config: Partial<CanvasDevice>) => {
    if (!deviceId) return;
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config }
    }));
  }, [deviceId]);

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
        title: language === 'tr' ? 'IoT kaydedildi' : 'IoT saved',
        description: language === 'tr' ? 'Seçili IoT nesnesi güncellendi.' : 'Selected IoT object updated.',
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
  }, [pcIP, pcMAC, pcSubnet, pcGateway, pcDNS, pcIPv6, pcIPv6Prefix, internalPcHostname, ipConfigMode, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceDhcpEnabled, serviceDhcpPools, wifiEnabled, wifiSSID, wifiBSSID, wifiSecurity, wifiPassword, wifiChannel]);
  */

  // Local output for Desktop (Local) - initialize from prop if available
  const getInitialPcOutput = (): OutputLine[] => {
    if (pcOutputs?.has(deviceId)) {
      return pcOutputs.get(deviceId)!;
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
  const [showUrlSuggestions, setShowUrlSuggestions] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if web browser is open
      if (httpAppContent) return;

      const target = event.target as HTMLElement;
      // Don't close if clicking a portal (like Select dropdown, tooltips, etc.)
      if (
        target?.closest('[data-radix-portal]') ||
        target?.closest('[role="listbox"]') ||
        target?.closest('.radix-select-content') ||
        target?.closest('.radix-popper-content')
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
      const iotPanelContent = generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections);
      setHttpAppContent(iotPanelContent);
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
    side: 'left' | 'right' | 'bottom';
    startX: number;
    startY: number;
    originX: number;
    originW: number;
    originH: number;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Global Navigation handler (Escape key & Mobile Back Button)
  useEffect(() => {
    if (!isVisible) return;

    const handleNavigation = () => {
      // If search is open, let it handle itself
      if (searchOpen) return;
      // If game is active, let it handle itself
      if (gameActive) return;

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

    const handlePopState = (e: PopStateEvent) => {
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
  }, [isVisible, activeTab, goHome, onClose, httpAppContent, searchOpen, gameActive, isMobile]);

  // Sync pcOutput when deviceId changes or pcOutputs prop updates
  useEffect(() => {
    if (pcOutputs?.has(deviceId)) {
      setPcOutput(pcOutputs.get(deviceId)!);
    } else {
      setPcOutput([{
        id: '1',
        type: 'output',
        content: 'OS [Version 10.0.26200.8037]\n(c) OS Corporation. All rights reserved.\n'
      }]);
    }
  }, [deviceId, pcOutputs]);

  // Disconnect console when PC powers off
  useEffect(() => {
    if (isPcPoweredOff && isConsoleConnected) {
      setIsConsoleConnected(false);
      setConsoleConnectionTime(0);
      // Don't clear connectedDeviceId so we can reconnect when power comes back on
    }
  }, [isPcPoweredOff, isConsoleConnected]);

  // Reconnect console when PC powers on if it was connected before
  useEffect(() => {
    if (!isPcPoweredOff && connectedDeviceId && !isConsoleConnected) {
      // Auto-reconnect to the same device
      const device = topologyDevices.find(d => d.id === connectedDeviceId);
      if (device && device.status !== 'offline') {
        setConsoleConnectionTime(Date.now());
        setIsConsoleConnected(true);
      }
    }
  }, [isPcPoweredOff, connectedDeviceId, isConsoleConnected, topologyDevices]);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const httpContentRef = useRef<HTMLTextAreaElement>(null);
  const commandQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
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
            className={`px-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-200' : 'bg-cyan-200 text-slate-900'}`}
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

  // Game loop
  useEffect(() => {
    if (!gameActive || gameOver) return;
    const gameInterval = setInterval(() => {
      setSnake(currentSnake => {
        const newSnake = [...currentSnake];
        const head = { ...newSnake[0] };
        head.x += direction.x;
        head.y += direction.y;
        if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 20) {
          setGameOver(true);
          return currentSnake;
        }
        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameOver(true);
          return currentSnake;
        }
        newSnake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          setGameScore(prev => prev + 10);
          setFood({
            x: Math.floor(Math.random() * 30),
            y: Math.floor(Math.random() * 20)
          });
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, 150);
    return () => clearInterval(gameInterval);
  }, [gameActive, direction, food, gameOver]);

  // Game controls
  useEffect(() => {
    if (!gameActive) return;
    const handleGameKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGameActive(false);
        return;
      }
      if (gameOver && e.key === ' ') {
        setSnake([{ x: 10, y: 10 }]);
        setFood({ x: 15, y: 15 });
        setDirection({ x: 1, y: 0 });
        setGameScore(0);
        setGameOver(false);
        return;
      }
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
      }
    };
    window.addEventListener('keydown', handleGameKey);
    return () => window.removeEventListener('keydown', handleGameKey);
  }, [gameActive, direction, gameOver]);

  // Synchronized Console Output from Global State
  const activeConsoleOutput = useMemo(() => {
    if (!isConsoleConnected || !connectedDeviceId) return [];
    const allOutput = deviceOutputs?.get(connectedDeviceId) || [];
    return allOutput.filter((line: any) => (line.timestamp || 0) >= consoleConnectionTime);
  }, [isConsoleConnected, connectedDeviceId, deviceOutputs, consoleConnectionTime]);

  // Auto-focus input when visible, tab changes, or command completes
  useEffect(() => {
    if (isVisible && (activeTab === 'desktop' || activeTab === 'terminal')) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
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
      const lines = (activeTab === 'desktop' ? pcOutput : activeConsoleOutput).map((line: any) => {
        if (line.type === 'command') return `${activeTab === 'desktop' ? 'C:\\>' : (line.prompt || '>')}${line.content}`;
        return line.content;
      });
      await navigator.clipboard.writeText(lines.join('\n'));
      toast({
        title: t.copyToastSuccessTitle,
        description: t.copyToastSuccessDescription,
      });
    } catch (err) {
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
    const confirmLine = output.find((line: any) => line.type === 'output' && /\[confirm\]/i.test(line.content));
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
        .flatMap((s) => Object.values(s.ports || {}).map((p: any) => p?.ipAddress))
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
    const { candidates, currentWord: ctxCurrentWord } = expandCommandContext(mode as any, value);
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
    const { contextTokens } = expandCommandContext(mode as any, input);
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
      setConsolePasswordAttempted(false);
      setIsConsoleConnected(false);
      setConnectedDeviceId(null);
    } else if (consolePasswordAttempted && !consoleAwaitingPassword && consoleAuthenticated) {
      setIsConsoleConnected(true);
      setConsolePasswordAttempted(false);
    } else if (consolePasswordAttempted && !consoleAwaitingPassword && !consoleAuthenticated) {
      setConsolePasswordAttempted(false);
      setIsConsoleConnected(false);
      setConnectedDeviceId(null);
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
      setHttpAppTitle(language === 'tr' ? 'HTTP Yönetim Sayfası' : 'HTTP Management Page');

      // Terminalde bilgilendir
      setPcOutput(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        type: 'success',
        content: language === 'tr'
          ? 'HTTP sayfası yeni pencerede açıldı.'
          : 'HTTP page opened in a new window.'
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
    const result = checkConnectivity(deviceId, targetIp, topologyDevices as any, topologyConnections as any, deviceStates || new Map(), t.language as 'tr' | 'en', options);
    return result.success;
  }, [deviceId, topologyDevices, topologyConnections, deviceStates, t.language]);

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

  const getPortAccessVlan = useCallback((port: any) => Number(port?.accessVlan || port?.vlan || 1), []);

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
    } catch (err) {
      // URL parsing failed - using fallback extraction
      if (process.env.NODE_ENV === 'development') {
        errorHandler.logError(new Error('URL parsing failed'), { raw, error: String(err) });
      }
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

    if (!isValidIpv4(pcDNS)) return null;
    const configuredDnsServer = topologyDevices.find(
      (d) => d.type === 'pc' && d.ip === pcDNS && d.services?.dns?.enabled && (d.services?.dns?.records?.length || 0) > 0
    );
    if (!configuredDnsServer?.ip || !canReachTargetIp(configuredDnsServer.ip, { protocol: 'udp', port: '53' })) return null;

    // Support CNAME-like records in PC DNS service:
    // domain -> another domain -> ... -> final IPv4 address
    const records = configuredDnsServer.services?.dns?.records || [];
    const visited = new Set<string>();
    let currentDomain = normalized;

    for (let depth = 0; depth < 10; depth += 1) {
      if (visited.has(currentDomain)) return null;
      visited.add(currentDomain);

      const record = records.find((r) => r.domain.toLowerCase() === currentDomain);
      if (!record) return null;

      const value = record.address.trim().toLowerCase();
      if (!value) return null;
      if (isValidIpv4(value)) {
        return { address: value, server: configuredDnsServer };
      }

      currentDomain = value;
    }

    return null;
  }, [canReachTargetIp, isValidIpv4, pcDNS, topologyDevices]);

  const getDnsRecordDisplay = useCallback((record: { domain: string; address: string }) => {
    const chain: string[] = [record.domain, record.address.trim()];
    const startAddress = record.address.trim().toLowerCase();
    const recordType = !startAddress || isValidIpv4(startAddress)
      ? (language === 'tr' ? 'A Kaydı (Address Record)' : 'A Record (Address Record)')
      : (language === 'tr' ? 'CNAME Kaydı (Canonical Name Record)' : 'CNAME Record (Canonical Name Record)');
    if (!startAddress || isValidIpv4(startAddress)) {
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
      if (isValidIpv4(normalizedNext)) break;
      if (visited.has(normalizedNext)) break;

      visited.add(normalizedNext);
      currentDomain = normalizedNext;
    }

    return `${recordType}: ${chain.join(' -> ')}`;
  }, [isValidIpv4, language, serviceDnsRecords]);

  const serviceTabClass = (tab: 'dns' | 'http' | 'dhcp') => cn(
    'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-xs font-semibold transition-all duration-200 ease-out focus-ring-animate',
    activeServiceTab === tab
      ? isDark
        ? 'bg-slate-900 text-white border-slate-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
        : 'bg-white text-slate-900 border-slate-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
      : isDark
        ? 'bg-slate-950/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
        : 'bg-slate-100/80 text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
  );

  const getServiceTabIcon = (tab: 'dns' | 'http' | 'dhcp') => {
    switch (tab) {
      case 'dns':
        return <Globe className="w-3.5 h-3.5" />;
      case 'http':
        return <Globe className="w-3.5 h-3.5" />;
      case 'dhcp':
        return <Network className="w-3.5 h-3.5" />;
    }
  };

  const findHttpServerByTarget = useCallback((target: string) => {
    const normalizedTarget = target.trim().toLowerCase();
    if (!normalizedTarget) return null;

    // Localhost should always resolve to the current PC first.
    if (normalizedTarget === '127.0.0.1') {
      const selfDevice = topologyDevices.find((d) => d.id === deviceId);
      if (selfDevice && selfDevice.services?.http?.enabled) return selfDevice;
    }

    // Check for PC HTTP servers
    const pcByIp = topologyDevices.find(
      (d) => d.type === 'pc' && d.ip === target && d.services?.http?.enabled
    );
    if (pcByIp && pcByIp.ip && canReachTargetIp(pcByIp.ip, { protocol: 'tcp', port: '80' })) return pcByIp;

    // Check for router/switch devices with HTTP service enabled
    const routerByIp = topologyDevices.find(
      (d) => (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') && d.ip === target && d.services?.http?.enabled
    );
    if (routerByIp && routerByIp.ip && canReachTargetIp(routerByIp.ip, { protocol: 'tcp', port: '80' })) return routerByIp;

    // Fallback: look into deviceStates interface IPs (e.g., VLAN/SVI, routed ports) for devices that have HTTP enabled
    if (deviceStates) {
      for (const [stateId, state] of deviceStates.entries()) {
        if (!state?.services?.http?.enabled) continue;
        const topoDevice = topologyDevices.find(d => d.id === stateId);
        if (!topoDevice || (topoDevice.type !== 'router' && topoDevice.type !== 'switchL2' && topoDevice.type !== 'switchL3')) continue;
        const ports = state.ports || {};
        const match = Object.values(ports).find((port: any) => port?.ipAddress === target);
        if (match && canReachTargetIp(target, { protocol: 'tcp', port: '80' })) {
          return {
            ...topoDevice,
            ip: target
          };
        }
      }
    }

    // Try DNS resolution
    const dnsResult = resolveDomainWithDnsServices(normalizedTarget);
    if (!dnsResult) return null;

    // Check resolved address for PC HTTP server
    const resolvedPc = topologyDevices.find(
      (d) => d.type === 'pc' && d.ip === dnsResult.address && d.services?.http?.enabled
    ) || null;
    if (resolvedPc?.ip && canReachTargetIp(resolvedPc.ip, { protocol: 'tcp', port: '80' })) return resolvedPc;

    // Check resolved address for router/switch with HTTP service enabled
    const resolvedRouter = topologyDevices.find(
      (d) => (d.type === 'router' || d.type === 'switchL2' || d.type === 'switchL3') && d.ip === dnsResult.address && d.services?.http?.enabled
    ) || null;
    if (resolvedRouter?.ip && canReachTargetIp(resolvedRouter.ip, { protocol: 'tcp', port: '80' })) return resolvedRouter;

    // DNS fallback via deviceStates interfaces
    if (deviceStates) {
      for (const [stateId, state] of deviceStates.entries()) {
        if (!state?.services?.http?.enabled) continue;
        const topoDevice = topologyDevices.find(d => d.id === stateId);
        if (!topoDevice || (topoDevice.type !== 'router' && topoDevice.type !== 'switchL2' && topoDevice.type !== 'switchL3')) continue;
        const ports = state.ports || {};
        const match = Object.values(ports).find((port: any) => port?.ipAddress === dnsResult.address);
        if (match && canReachTargetIp(match.ipAddress || dnsResult.address, { protocol: 'tcp', port: '80' })) {
          return {
            ...topoDevice,
            ip: match.ipAddress || dnsResult.address
          };
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
      setHttpAppContent(generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections));
      setHttpAppTitle(language === 'tr' ? 'IoT Web Paneli' : 'IoT Web Panel');
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
        setHttpAppContent(iotDevicePage);
        setHttpAppTitle(`${targetDevice.name || targetDevice.id} ${language === 'tr' ? 'Yönetimi' : 'Management'}`);
        setHttpAppDeviceId(targetDevice.id);
      }
      return;
    }

    // Browser-style inputs can include protocol/path/query. We only resolve host/IP.
    try {
      const parsed = new URL(displayUrl);
      lookupTarget = parsed.hostname || lookupTarget;
      displayUrl = parsed.toString();
    } catch (err) {
      // URL parsing failed - using raw input as fallback
      if (process.env.NODE_ENV === 'development') {
        errorHandler.logError(new Error('Browser URL parsing failed'), { displayUrl, error: String(err) });
      }
    }

    const target = lookupTarget.trim() || '192.168.1.10';
    const namedTarget = resolveDeviceNameTarget(target);
    const resolvedTargetIp = namedTarget?.ip || target;
    if (!isLoopbackTarget(resolvedTargetIp) && isValidIpv4(resolvedTargetIp) && !hasGatewayForTarget(resolvedTargetIp)) {
      addLocalOutput('error', t.targetGatewayRequired);
      return;
    }
    if (!isValidIpv4(resolvedTargetIp)) {
      if (!isValidIpv4(pcDNS)) {
        addLocalOutput('error', t.dnsAddressRequired);
        return;
      }
      if (!hasGatewayForTarget(pcDNS)) {
        addLocalOutput('error', t.dnsGatewayRequired);
        return;
      }
    }

    // Check firewall for HTTP traffic
    const connectivityResult = checkConnectivity(deviceId, resolvedTargetIp, topologyDevices as any, topologyConnections as any, deviceStates || new Map(), t.language as 'tr' | 'en', { protocol: 'tcp', port: '80' });
    if (!connectivityResult.success && connectivityResult.error?.includes('firewall')) {
      setHttpAppDeviceId(null);
      setHttpAppTitle('Access Denied');
      setHttpAppContent(`
        <main style="padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;">
          <div style="font-size:64px;margin-bottom:16px;">🛡️</div>
          <h1 style="margin:0 0 8px;font-size:24px;color:#dc3545;">${language === 'tr' ? 'Erişim Engellendi' : 'Access Denied'}</h1>
          <p style="margin:0 0 12px;font-size:16px;color:#666;">${connectivityResult.error}</p>
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:#f8d7da;color:#721c24;font-size:13px;">${displayUrl}</code>
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
          <code style="display:inline-block;padding:6px 10px;border-radius:8px;background:#f1f5f9;color:#0f172a;">${displayUrl}</code>
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
      addLocalOutput('html', httpServer.services?.http?.content || 'Merhaba Dünya!');
    }
  }, [addLocalOutput, deviceStates, findHttpServerByTarget, getAvailableIotDevices, getConnectedIotDevices, hasGatewayForTarget, isLoopbackTarget, isValidIpv4, language, normalizeLookupTarget, pcDNS, resolveDeviceNameTarget, t, iotDevices, topologyDevices, generateIotWebPanelContent, generateIotDevicePageContent, httpAppDeviceId, topologyConnections]);

  useEffect(() => {
    const handleRouterAdminMessage = (event: MessageEvent) => {
      const data = event.data;

      if (!data) {
        return;
      }

      // For WiFi save operations, require httpAppDeviceId match
      const isRouterSpecificMessage = data.type === 'router-admin-save-wifi';
      if (isRouterSpecificMessage && httpAppDeviceId && data.deviceId && data.deviceId !== httpAppDeviceId) {
        return;
      }

      // IoT messages are always accepted (deviceId in payload)
      const isIoTMessage = data.type === 'router-admin-connect-iot' || data.type === 'router-admin-disconnect-iot' || data.type === 'router-admin-renew-iot';

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
          console.warn('No iotDeviceId provided');
          return;
        }

        // Find the existing IoT device in topology
        const iotDevice = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!iotDevice || iotDevice.type !== 'iot') {
          console.warn('IoT device not found or wrong type:', iotDeviceId);
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
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot);
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
          console.warn('No iotDeviceId provided for disconnect');
          return;
        }

        // Find the existing IoT device in topology
        const iotDevice = topologyDevices.find((d) => d.id === iotDeviceId);
        if (!iotDevice || iotDevice.type !== 'iot') {
          console.warn('IoT device not found or wrong type for disconnect:', iotDeviceId);
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
                detail: { connectionId: (conn as any).id }
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
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot);
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
            const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot);
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
    setBrowserWindow((prev) => ({
      ...prev,
      x: 8,
      y: Math.max(80, prev.y),
      width: Math.max(280, window.innerWidth - 16),
    }));
  }, [httpAppContent, isMobile]);

  useEffect(() => {
    if (!httpAppDeviceId) return;
    const targetDevice = topologyDevices.find((d) => d.id === httpAppDeviceId);
    if (!targetDevice || !isRouterDevice(targetDevice)) return;

    const runtimeState = deviceStates?.get(httpAppDeviceId);
    const connectedIot = getConnectedIotDevices(httpAppDeviceId);
    const availableIot = getAvailableIotDevices(httpAppDeviceId);
    const refreshed = generateRouterAdminPage(targetDevice, language, runtimeState, connectedIot, availableIot);
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
            x: Math.max(0, dragState.originX + dx),
            y: Math.max(0, dragState.originY + dy),
          }));
        } else if (resizeStateRef.current) {
          const state = resizeStateRef.current;
          const dx = event.clientX - state.startX;
          const dy = event.clientY - state.startY;
          setBrowserWindow((prev) => {
            if (state.side === 'bottom') {
              return {
                ...prev,
                height: Math.max(260, state.originH + dy),
              };
            }
            if (state.side === 'right') {
              return {
                ...prev,
                width: Math.max(420, state.originW + dx),
              };
            }

            const nextWidth = Math.max(420, state.originW - dx);
            const widthDiff = nextWidth - state.originW;
            return {
              ...prev,
              width: nextWidth,
              x: Math.max(0, state.originX - widthDiff),
            };
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
    const sourceWifi = getDeviceWifiConfig(sourceDevice as any, deviceStates);
    const targetWifi = getDeviceWifiConfig(targetDevice as any, deviceStates);
    if (
      sourceDevice.type === 'pc' &&
      sourceWifi?.enabled &&
      (sourceWifi.mode === 'client' || sourceWifi.mode === 'sta') &&
      sourceWifi.ssid &&
      targetWifi?.enabled &&
      targetWifi.mode === 'ap' &&
      targetWifi.ssid &&
      sourceWifi.ssid.toLowerCase() === targetWifi.ssid.toLowerCase() &&
      getWirelessSignalStrength(sourceDevice as any, topologyDevices as any, deviceStates) > 0
    ) {
      return true;
    }

    const queue: string[] = [deviceId];
    const visited = new Set<string>([deviceId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
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
    setServiceDhcpPools((prev) => {
      if (editingDhcpIndex === null) {
        return [...prev, cleaned];
      }
      return prev.map((pool, idx) => (idx === editingDhcpIndex ? cleaned : pool));
    });

    // Reset editing flag after a delay to allow useEffect to sync
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
          d.type === 'pc' &&
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
          const cliPools = Object.entries(state.dhcpPools || {}).map(([poolName, pool]: [string, any]) => {
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
            if (!dhcpPools.some((p: any) => p.poolName === pool.poolName)) {
              dhcpPools.push(pool as any);
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
        d.type === 'pc' &&
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
        const cliPools = Object.entries(state.dhcpPools || {}).map(([poolName, pool]: [string, any]) => {
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
          if (!dhcpPools.some((p: any) => p.poolName === pool.poolName)) {
            dhcpPools.push(pool as any);
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
      addLocalOutput('command', command);
      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase();
      const normalizedCmd = cmd
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const args = parts.slice(1);
      if (normalizedCmd === 'snake' || normalizedCmd === 'yilan') {
        setGameActive(true);
        setSnake([{ x: 10, y: 10 }]);
        setFood({ x: 15, y: 15 });
        setDirection({ x: 1, y: 0 });
        setGameScore(0);
        setGameOver(false);
        setGameLanguage(normalizedCmd === 'yilan' ? 'tr' : 'en');
        return;
      }
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

          const result = checkConnectivity(deviceId, targetIp, topologyDevices as any, topologyConnections as any, deviceStates || new Map(), t.language as 'tr' | 'en', { protocol: 'icmp' });
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
          const resolved = resolveDeviceNameTarget(targetDomain)!;
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
        const protocol = isSsh ? 'tcp' : 'tcp'; // both use TCP
        const defaultPort = isSsh ? '22' : '23';
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
        const result = checkConnectivity(deviceId, targetIp, topologyDevices as any, topologyConnections as any, deviceStates || new Map(), t.language as 'tr' | 'en', { protocol: 'tcp', port });

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
              setConnectedDeviceId(result.targetId!);
              setConsoleConnectionTime(Date.now());
              setIsConsoleConnected(true);

              // Trigger remote VTY session bootstrap so password/login policy is applied.
              if (onExecuteDeviceCommand) {
                void onExecuteDeviceCommand(
                  result.targetId!,
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
      } else if (cmd === 'tracert') {
        const target = args[0];
        if (!target) {
          addLocalOutput('output', 'Usage: tracert <target_name_or_address>');
        } else {
          const resolvedTarget = resolveDeviceNameTarget(target)?.ip || target;
          if (isLoopbackTarget(resolvedTarget)) {
            await addMultilineOutput('output', `Tracing route to 127.0.0.1 over a maximum of 30 hops:\n\n  1    <1 ms    <1 ms    <1 ms  localhost [127.0.0.1]\n\nTrace complete.`, 80);
            return;
          }
          addLocalOutput('output', `Tracing route to ${target} over a maximum of 30 hops:\n`);
          const result = checkConnectivity(deviceId, resolvedTarget, topologyDevices as any, topologyConnections as any, deviceStates || new Map(), t.language as 'tr' | 'en', { protocol: 'icmp' });

          if (result.hops && result.hops.length > 0) {
            let hopOutput = '';
            result.hops.forEach((hop, index) => {
              // Simulate some variation in hop display
              const hopName = hop;
              const hopDevice = topologyDevices.find(d => d.name === hop || d.id === hop);
              const hopIp = hopDevice?.ipv6 || hopDevice?.ip || '?.?.?.?';
              hopOutput += `  ${index + 1}    <1 ms    <1 ms    <1 ms  ${hopName} [${hopIp}]\n`;
            });
            await addMultilineOutput('output', hopOutput + '\nTrace complete.', 80);
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
      } else if (cmd === 'help' || cmd === '?') {
        addLocalOutput('output', `Available commands: ipconfig, ping, tracert, telnet, ssh, netstat, nbtstat, getmac, nslookup, curl, wget, arp, hostname, dir, ver, cls, exit, quit, snake`);
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
        addLocalOutput('output', ` Volume in drive C is OS
 Volume Serial Number is 1234-5678

 Directory of C:\\n
03/27/2026  10:00 AM    <DIR>          .
03/27/2026  10:00 AM    <DIR>          ..
               0 File(s)              0 bytes
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

      const parts = command.split(' ');
      const cmd = parts[0].toLowerCase().replace(/ı/g, 'i').replace(/İ/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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
      const context = expandCommandContext(mode as any, value);
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
    // Intercept '?' for immediate help in terminal mode (IOS style)
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

  const recentCommands = (activeTab === 'terminal' ? consoleHistory : desktopHistory).slice(0, 10);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };
  const launcherApps = useMemo(() => [
    {
      tab: 'desktop' as const,
      label: 'CMD',
      subtitle: language === 'tr' ? 'Komut İstemi' : 'Command Prompt',
      icon: TerminalIcon,
      accent: isDark ? 'from-blue-500 to-cyan-400' : 'from-blue-600 to-cyan-500',
      buttonClass: isDark ? 'text-blue-300 border-blue-400/20 bg-blue-500/10' : 'text-blue-700 border-blue-200 bg-blue-50/90',
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
      accent: isDark ? 'from-cyan-500 to-sky-400' : 'from-cyan-600 to-sky-500',
      buttonClass: isDark ? 'text-cyan-300 border-cyan-400/20 bg-cyan-500/10' : 'text-cyan-700 border-cyan-200 bg-cyan-50/90',
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
      accent: isDark ? 'from-amber-500 to-orange-400' : 'from-amber-600 to-orange-500',
      buttonClass: isDark ? 'text-amber-300 border-amber-400/20 bg-amber-500/10' : 'text-amber-700 border-amber-200 bg-amber-50/90',
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
  const activeAppMeta = launcherApps.find((app) => app.tab === activeTab);

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
            "mx-auto flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 md:px-3 md:py-2 backdrop-blur-2xl shadow-[0_20px_60px_rgba(15,23,42,0.16)]",
            isDark
              ? "border-white/10 bg-slate-900/70 text-slate-100"
              : "border-white/60 bg-white/70 text-slate-900"
          )}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <div className={cn("truncate text-xs md:text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>
                  {internalPcHostname}
                </div>
                <div className={cn("truncate text-[10px] md:text-xs font-mono", isDark ? "text-cyan-300/85" : "text-cyan-700/80")}>
                  {pcIP}
                </div>
              </div>
              <div className={cn(
                "pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1 md:px-2 md:py-1.5 backdrop-blur-2xl shadow-lg mr-auto",
                isDark ? "border-white/10 bg-slate-900/70" : "border-white/80 bg-white/85"
              )}>
                {/* Back Button - Shows when not on home */}
                {activeTab !== 'home' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goHome}
                        className={cn(
                          "h-7 w-7 md:h-9 md:w-9 rounded-full",
                          isDark ? "text-slate-300 hover:text-cyan-300 hover:bg-white/5" : "text-slate-600 hover:text-cyan-700 hover:bg-slate-100"
                        )}
                        aria-label={language === 'tr' ? 'Geri' : 'Back'}
                      >
                        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{language === 'tr' ? 'Geri' : 'Back'}</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateToProgram('wireless')}
                      disabled={isPcPoweredOff}
                      className={cn(
                        "relative h-7 w-7 md:h-9 md:w-9 rounded-full",
                        activeTab === 'wireless'
                          ? (isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-700")
                          : (isDark ? "text-cyan-300 hover:bg-white/5" : "text-cyan-700 hover:bg-slate-100")
                      )}
                      aria-label={language === 'tr' ? 'Kablosuz' : 'Wireless'}
                    >
                      <span className="pointer-events-none w-3.5 h-3.5 md:w-4 md:h-4">
                        <WifiSignalMeter strength={wifiSignalStrength} />
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'tr' ? 'Kablosuz' : 'Wireless'}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateToProgram('settings')}
                      disabled={isPcPoweredOff}
                      className={cn(
                        "h-7 w-7 md:h-9 md:w-9 rounded-full",
                        activeTab === 'settings'
                          ? (isDark ? "bg-violet-500/20 text-violet-300" : "bg-violet-100 text-violet-700")
                          : (isDark ? "text-violet-300 hover:bg-white/5" : "text-violet-700 hover:bg-slate-100")
                      )}
                      aria-label={language === 'tr' ? 'Ayarlar' : 'Settings'}
                    >
                      <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{language === 'tr' ? 'Ayarlar' : 'Settings'}</TooltipContent>
                </Tooltip>
                {isMobile && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowCmdSettings(prev => !prev)}
                        disabled={isPcPoweredOff}
                        className={cn(
                          "h-7 w-7 rounded-full",
                          showCmdSettings
                            ? (isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700")
                            : (isDark ? "text-amber-300 hover:bg-white/5" : "text-amber-700 hover:bg-slate-100")
                        )}
                        aria-label={language === 'tr' ? 'Hızlı ayarlar' : 'Quick settings'}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{language === 'tr' ? 'Hızlı ayarlar' : 'Quick settings'}</TooltipContent>
                  </Tooltip>
                )}
                <div className={cn(
                  "rounded-full px-2 py-1 md:px-3 md:py-2 text-[10px] md:text-[11px] font-mono font-semibold tracking-wide",
                  isDark ? "bg-white/5 text-cyan-200" : "bg-slate-100 text-cyan-800"
                )}>
                  {formatTime(currentTime)}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent className="rounded-md px-2.5 py-1">{t.power}</TooltipContent>
                </Tooltip>
                {isMobile && (
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>{language === 'tr' ? 'Kapat' : 'Close'}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-2 pb-2 md:px-2 md:pb-2">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1500px] items-center justify-center overflow-hidden">
            <div
              className={cn(
                "relative flex h-full min-h-0 w-full flex-col overflow-hidden shadow-[0_30px_120px_rgba(15,23,42,0.28)]",
                isMobile
                  ? (isDark
                    ? "max-w-[430px] rounded-[2.5rem] border-[10px] border-slate-950 bg-transparent"
                    : "max-w-[430px] rounded-[2.5rem] border-[10px] border-slate-200 bg-transparent")
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
                      <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
                      <svg className="w-16 h-16 text-red-600 drop-shadow-xl relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                  hideTitle
                  hideHeader
                  showHeaderOnMobile
                  noPadding
                  style={{ height: '100%' }}
                  className="w-full min-w-0 h-full flex flex-col relative bg-transparent border-none shadow-none"
                >
                  {/* Power Off Overlay - Mobile/Desktop ekranını tamamen karartır */}
                  {isPcPoweredOff && (
                    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
                        <svg className="w-16 h-16 text-red-600 drop-shadow-xl relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="bg-transparent flex-1 min-h-0 flex flex-col">

                    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
                      <DialogContent className={`${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white'} sm:max-w-md`}>
                        <DialogHeader>
                          <DialogTitle>{t.searchOutputTitle}</DialogTitle>
                          <DialogDescription className={isDark ? 'text-slate-200' : 'text-slate-600'}>
                            {t.searchOutputDescription}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="relative">
                          <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t.searchPlaceholder}
                            className="pr-9"
                            autoFocus
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-200 hover:text-slate-50 dark:hover:text-slate-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button onClick={() => setSearchOpen(false)} className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                            {t.close}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Navigation Tabs - Hide on mobile, use main app tabs */}
                    <div className="hidden">
                      <Button
                        variant={activeTab === 'home' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('home')}
                        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'home' ? 'bg-slate-500/10 text-slate-300' : 'text-slate-500 hover:text-slate-300'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <Monitor className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{language === 'tr' ? 'Ana Ekran' : 'Home'}</span>
                      </Button>
                      <Button
                        variant={activeTab === 'desktop' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('desktop')}
                        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'desktop' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <Command className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{t.commandPromptTab}</span>
                      </Button>
                      {/* New IoT Web Panel Button */}
                      <Button
                        variant={httpAppDeviceId ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (!httpAppDeviceId) {
                            openWebPage('http://iot-panel');
                          }
                          setActiveTab('desktop'); // Ensure desktop tab is active when IoT panel is opened
                        }}
                        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'desktop' && httpAppContent && !httpAppDeviceId ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{language === 'tr' ? 'IoT Paneli' : 'IoT Panel'}</span>
                      </Button>
                      <Button
                        variant={activeTab === 'terminal' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('terminal')}
                        className={`h-9 px-4 text-xs font-black tracking-wider  transition-all gap-2 ${activeTab === 'terminal' ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-500 hover:text-emerald-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <TerminalIcon className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{t.consoleTab}</span>
                      </Button>
                      <Button
                        variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('settings')}
                        className={`h-9 px-4 text-xs font-black tracking-wider  transition-all gap-2 ${activeTab === 'settings' ? 'bg-purple-500/10 text-purple-500' : 'text-slate-500 hover:text-purple-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{t.settingsTab}</span>
                      </Button>
                      <Button
                        variant={activeTab === 'services' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('services')}
                        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'services' ? 'bg-amber-500/10 text-amber-500' : 'text-slate-500 hover:text-amber-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <Globe className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>
                          {t.servicesTab}
                        </span>
                      </Button>
                      <Button
                        variant={activeTab === 'wireless' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('wireless')}
                        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'wireless' ? 'bg-purple-500/10 text-purple-500' : 'text-slate-500 hover:text-purple-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <Network className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>{language === 'tr' ? 'Kablosuz' : 'Wireless'}</span>
                      </Button>
                      <Button
                        variant={activeTab === 'iot' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('iot')}
                        className={`h-9 px-4 text-xs font-black tracking-wider transition-all gap-2 ${activeTab === 'iot' ? 'bg-cyan-500/10 text-cyan-500' : 'text-slate-500 hover:text-cyan-500'} ${isMobile ? 'flex-1 min-w-0' : ''}`}
                      >
                        <Radio className="w-4 h-4" />
                        <span className={isMobile ? 'sr-only' : 'hidden md:inline'}>IoT</span>
                      </Button>
                    </div>

                    {/* Content Area */}
                    <div className={cn(
                      "relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden",
                      activeTab === 'home' ? "px-2 pb-2 pt-2 md:px-5 md:pb-5 md:pt-5" : "px-2 pb-2 pt-2 md:px-5 md:pb-5 md:pt-5",
                      isMobile ? "mx-[10px]" : "" // Add horizontal margin for mobile
                    )}>
                      {activeTab === 'home' && !isPcPoweredOff && (
                        <div
                          className="flex-1 min-h-0"
                          style={mobileVerticalScrollStyle}
                        >
                          <div className={cn(
                            "relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border shadow-[0_24px_80px_rgba(15,23,42,0.22)]",
                            isDark ? "border-white/10 bg-slate-950/45" : "border-white/80 bg-white/55"
                          )}>
                            <div className="pointer-events-none absolute inset-0">
                              <div className={cn(
                                "absolute inset-0",
                                isDark
                                  ? "bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(15,23,42,0.56))]"
                                  : "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,246,255,0.84))]"
                              )} />
                            </div>
                            <div className="relative flex flex-1 flex-col overflow-y-auto p-3 md:p-8 custom-scrollbar">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-5 py-2">
                                {launcherApps.map((app) => (
                                  <button
                                    key={app.tab}
                                    onClick={() => navigateToProgram(app.tab)}
                                    disabled={isPcPoweredOff}
                                    className={cn(
                                      "group flex min-h-[85px] flex-col items-center justify-center gap-2 rounded-[1.25rem] border p-2 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl disabled:opacity-40 md:min-h-[150px] md:p-5 md:gap-3 md:rounded-[1.5rem]",
                                      app.buttonClass,
                                      isDark ? "hover:bg-white/10" : "hover:bg-white"
                                    )}
                                  >
                                    <div className={cn(
                                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-105 md:h-16 md:w-16 md:rounded-[1.25rem]",
                                      app.accent
                                    )}>
                                      <app.icon className="h-6 w-6 md:h-8 md:w-8" />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-sm font-semibold md:text-base">{app.label}</div>
                                      <div className={cn("text-[11px] leading-4 md:text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                                        {app.subtitle}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'settings' && (
                        <div
                          className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden"
                          style={mobileVerticalScrollStyle}
                        >
                          <div className={`p-4 rounded-xl border space-y-4 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">{t.hostname}</label>
                                <Input type="text" value={internalPcHostname} onChange={(e) => {
                                  const newHostname = e.target.value.trim().slice(0, 20);
                                  setPcHostname(e.target.value);
                                  dispatchDeviceConfig({ name: newHostname });
                                }} className="h-9" />
                              </div>
                              <div className="space-y-1.5 flex-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">MAC Address</label>
                                <Input type="text" value={pcMAC} onChange={(e) => {
                                  const newMac = e.target.value;
                                  setPcMAC(newMac);
                                  dispatchDeviceConfig({ macAddress: isValidMAC(newMac) ? normalizeMAC(newMac) : newMac });
                                }} placeholder="00-1a-2b-3c-4d-5e" className={`h-9 ${errors.mac ? 'border-rose-500' : ''}`} />
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 py-2 border-y border-slate-800/10 dark:border-slate-800/50">
                              <label className="text-xs font-bold text-slate-500 ml-1 whitespace-nowrap">
                                {t.ipConfigurationLabel}
                              </label>
                              <div className={`inline-flex p-1 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
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
                                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                                    : (isDark ? 'text-slate-200 hover:text-white' : 'text-slate-500 hover:text-slate-800')
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
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : (isDark ? 'text-slate-200 hover:text-white' : 'text-slate-500 hover:text-slate-800')
                                    }`}
                                >
                                  {t.staticLabel}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                              {renderNetworkInput("IP Address", pcIP, (newIp) => {
                                setPcIP(newIp);
                                  if (validateIP(newIp)) {
                                    const duplicateDevices = topologyDevices.filter(d => d.id !== deviceId && d.ip === newIp);
                                    if (duplicateDevices.length > 0) {
                                      const names = duplicateDevices.map(d => d.name || d.id).join(', ');
                                      setErrors(prev => ({ ...prev, ip: language === 'tr' ? `Bu IP adresi zaten ${names} tarafından kullanılıyor` : `This IP address is already used by ${names}` }));
                                    } else {
                                    setErrors(prev => { const { ip, ...rest } = prev; return rest; });
                                  }
                                }
                                let updatedSubnet = pcSubnet;
                                const firstOctet = newIp.split('.')[0];
                                if (firstOctet) {
                                  const octetNum = parseInt(firstOctet, 10);
                                  if (!isNaN(octetNum)) {
                                    let autoSubnet = '255.255.255.0';
                                    if (octetNum === 10) autoSubnet = '255.0.0.0';
                                    else if (octetNum === 192) autoSubnet = '255.255.255.0';
                                    else if (octetNum === 169) autoSubnet = '255.255.0.0';
                                    updatedSubnet = autoSubnet;
                                    setPcSubnet(autoSubnet);
                                  }
                                }
                                setTimeout(() => dispatchDeviceConfig({ ip: newIp, subnet: updatedSubnet, ipConfigMode: 'static' }), 500);
                              }, "192.168.1.100", errors.ip, ipConfigMode === 'dhcp')}

                              {renderNetworkInput("Subnet Mask", pcSubnet, (newSubnet) => {
                                setPcSubnet(newSubnet);
                                setTimeout(() => dispatchDeviceConfig({ subnet: newSubnet, ipConfigMode: 'static' }), 500);
                              }, "255.255.255.0", errors.subnet, ipConfigMode === 'dhcp')}

                              {renderNetworkInput("Gateway", pcGateway, (newGateway) => {
                                setPcGateway(newGateway);
                                dispatchDeviceConfig({ gateway: newGateway });
                              }, "192.168.1.1", errors.gateway)}

                              {renderNetworkInput("DNS Server", pcDNS, (newDNS) => {
                                setPcDNS(newDNS);
                                dispatchDeviceConfig({ dns: newDNS });
                              }, "8.8.8.8", errors.dns)}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 pt-2 border-t border-slate-800/10 dark:border-slate-800/50">
                              {renderNetworkInput("IPv6 Address", pcIPv6, (newIPv6) => {
                                setPcIPv6(newIPv6);
                                dispatchDeviceConfig({ ipv6: newIPv6 });
                              }, "2001:db8:acad:1::10", errors.ipv6)}

                              {renderNetworkInput("IPv6 Prefix", pcIPv6Prefix, (newPrefix) => {
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
                          <div className={`flex items-end gap-1 px-4 pt-3 border-b ${isDark ? 'border-slate-700/50 bg-gradient-to-b from-slate-900/20 to-transparent' : 'border-slate-200 bg-gradient-to-b from-slate-50/50 to-transparent'}`}>
                            {(['dns', 'http', 'dhcp'] as const).map((tab) => (
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
                                  (tab === 'dhcp' && serviceDhcpEnabled)) && (
                                    <span className={cn(
                                      'w-2 h-2 rounded-full animate-pulse',
                                      isDark ? 'bg-emerald-400' : 'bg-emerald-500'
                                    )} />
                                  )}
                              </button>
                            ))}
                          </div>

                          {/* Service Content */}
                          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                            {activeServiceTab === 'dns' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {t.language === 'tr'
                                          ? 'DNS (Domain Name System - isim çözümleme)'
                                          : 'DNS (Domain Name System - name resolution)'}
                                      </h3>
                                      <p className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {t.dnsRecordManagerTip}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceDnsEnabled ? 'bg-purple-500/15 text-purple-600 border border-purple-500/30' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                                        {serviceDnsEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceDnsEnabled}
                                        onClick={() => setServiceDnsEnabled((prev) => !prev)}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 ${serviceDnsEnabled
                                          ? 'bg-purple-500/90 border-purple-400'
                                          : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300')
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
                                    />
                                    <Input
                                      value={dnsFormAddress}
                                      onChange={(e) => setDnsFormAddress(e.target.value)}
                                      placeholder={t.dnsAddressPlaceholder}
                                    />
                                    <Button
                                      onClick={() => {
                                        isDnsEditingRef.current = true;
                                        const domain = dnsFormDomain.trim().toLowerCase();
                                        const address = dnsFormAddress.trim();
                                        if (!domain || !address) return;
                                        setServiceDnsRecords((prev) => {
                                          const withoutSame = prev.filter((r) => r.domain.toLowerCase() !== domain);
                                          return [...withoutSame, { domain, address }];
                                        });
                                        setDnsFormDomain('');
                                        setDnsFormAddress('');
                                        // Reset editing flag after a delay
                                        setTimeout(() => { isDnsEditingRef.current = false; }, 1000);
                                      }}
                                    >
                                      {t.addDnsRecord}
                                    </Button>
                                  </div>

                                  <div className="space-y-2">
                                    {serviceDnsRecords.length === 0 && (
                                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                        {t.dnsNoRecords}
                                      </div>
                                    )}
                                    {serviceDnsRecords.map((record) => (
                                      <div key={`${record.domain}-${record.address}`} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
                                        <div className="text-xs font-mono">
                                          <span>{getDnsRecordDisplay(record)}</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            isDnsEditingRef.current = true;
                                            setServiceDnsRecords((prev) => prev.filter((r) => !(r.domain === record.domain && r.address === record.address)));
                                            // Reset editing flag after a delay
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
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {t.language === 'tr'
                                          ? 'HTTP (Hypertext Transfer Protocol - web içeriği)'
                                          : 'HTTP (Hypertext Transfer Protocol - web content)'}
                                      </h3>
                                      <p className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {t.httpServiceDescription}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceHttpEnabled ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                                        {serviceHttpEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceHttpEnabled}
                                        onClick={() => setServiceHttpEnabled((prev) => !prev)}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${serviceHttpEnabled
                                          ? 'bg-emerald-500/90 border-emerald-400'
                                          : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300')
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
                                    <label className="text-xs font-bold  tracking-wide text-slate-500">HTTP Content</label>
                                    <div className="flex items-center gap-2">
                                      <div className="flex gap-1">
                                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-xs font-black" onClick={() => applyHttpFormatting('b')}>B</Button>
                                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-xs font-black italic" onClick={() => applyHttpFormatting('i')}>I</Button>
                                        <Button type="button" size="icon" variant="outline" className="h-8 w-8 text-xs font-black underline" onClick={() => applyHttpFormatting('u')}>U</Button>
                                      </div>
                                      <span className="text-[10px] text-slate-500">{t.language === 'tr' ? 'Seçili metni biçimlendir' : 'Format selected text'}</span>
                                    </div>
                                    <textarea
                                      ref={httpContentRef}
                                      value={serviceHttpContent}
                                      onChange={(e) => setServiceHttpContent(e.target.value)}
                                      placeholder="Merhaba Dünya!"
                                      rows={6}
                                      className={`w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
                                    />
                                    {serviceHttpEnabled && (
                                      <div
                                        className={`text-xs rounded-lg px-3 py-2 overflow-hidden ${isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}
                                        style={{ contain: 'layout style paint', willChange: 'auto' }}
                                      >
                                        <span dangerouslySetInnerHTML={{ __html: sanitizeHTTPContent(serviceHttpContent || 'Merhaba Dünya!') }} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeServiceTab === 'dhcp' && (
                              <div className="p-3">
                                <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h3 className="text-sm font-bold">
                                        {t.language === 'tr'
                                          ? 'DHCP (Dynamic Host Configuration Protocol - otomatik IP)'
                                          : 'DHCP (Dynamic Host Configuration Protocol - auto IP)'}
                                      </h3>
                                      <p className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {t.dhcpPoolsDescription}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceDhcpEnabled ? 'bg-sky-500/15 text-sky-600 border border-sky-500/30' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                                        {serviceDhcpEnabled ? 'ON' : 'OFF'}
                                      </span>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={serviceDhcpEnabled}
                                        onClick={() => setServiceDhcpEnabled((prev) => !prev)}
                                        className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 ${serviceDhcpEnabled
                                          ? 'bg-sky-500/90 border-sky-400'
                                          : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300')
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
                                    />
                                    <Input
                                      value={dhcpForm.defaultGateway}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, defaultGateway: e.target.value }))}
                                      placeholder={t.dhcpPoolGatewayPlaceholder}
                                    />
                                    <Input
                                      value={dhcpForm.dnsServer}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, dnsServer: e.target.value }))}
                                      placeholder={t.dhcpPoolDnsPlaceholder}
                                    />
                                    <Input
                                      value={dhcpForm.startIp}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, startIp: e.target.value }))}
                                      placeholder={t.dhcpPoolStartIpPlaceholder}
                                    />
                                    <Input
                                      value={dhcpForm.subnetMask}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, subnetMask: e.target.value }))}
                                      placeholder={t.dhcpPoolSubnetPlaceholder}
                                    />
                                    <Input
                                      type="number"
                                      min={1}
                                      value={dhcpForm.maxUsers}
                                      onChange={(e) => setDhcpForm((prev) => ({ ...prev, maxUsers: Number(e.target.value || 1) }))}
                                      placeholder={t.dhcpPoolMaxUsersPlaceholder}
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
                                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                        {t.noDhcpPools}
                                      </div>
                                    )}
                                    {serviceDhcpPools.map((pool, index) => (
                                      <div key={`${pool.poolName}-${index}`} className={`rounded-lg px-3 py-2 space-y-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-200'}`}>
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
                                              setServiceDhcpPools((prev) => prev.filter((_, i) => i !== index));
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
                          </div>
                        </div>
                      )}

                      {activeTab === 'iot' && (
                        <div className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden" style={mobileVerticalScrollStyle}>
                          <div className={`rounded-2xl border p-4 space-y-4 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-2 text-cyan-500">
                              <div className="flex items-center gap-2">
                                <Radio className="w-5 h-5" />
                                <div>
                                  <h3 className="text-sm font-black tracking-widest">
                                    {language === 'tr' ? 'IoT Yönetimi' : 'IoT Management'}
                                  </h3>
                                  <p className="text-[10px] font-medium tracking-normal text-cyan-500/70">
                                    {language === 'tr'
                                      ? 'Nesneleri yönetmek için yönetim paneli'
                                      : 'Panel for managing connected devices'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white"
                                  onClick={() => {
                                    navigateToProgram('desktop');
                                    setTimeout(() => {
                                      setInput('curl 192.168.1.1');
                                      void executeCommand('curl 192.168.1.1');
                                    }, 300);
                                  }}
                                >
                                  {language === 'tr' ? 'Kablosuz Ayarları Aç' : 'Open Wireless Settings'}
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white"
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
                              <div className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
                                {language === 'tr' ? 'Topolojide IoT nesnesi yoktur. Önce topolojiye IoT nesnesi ekleyiniz.' : 'No IoT object in topology. Add one first.'}
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500">{language === 'tr' ? 'Nesne Seçimi' : 'Object Selection'}</label>
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
                                  <label className="text-xs font-bold text-slate-500">{language === 'tr' ? 'Cihaz Adı' : 'Device Name'}</label>
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
                                  <label className="text-xs font-bold text-slate-500">{language === 'tr' ? 'Cihaz Türü' : 'Device Type'}</label>
                                  <Select
                                    value={`${iotKind}:${iotSensorType}`}
                                    onValueChange={(v) => {
                                      const [kind, sensor] = v.split(':');
                                      setIotKind(kind as any);
                                      setIotSensorType(sensor as any);
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
                                  <label className="text-xs font-bold text-slate-500 shrink-0">
                                    {language === 'tr' ? 'Cihaz Durumu (Aktif/Pasif)' : 'Device Status (Active/Passive)'}
                                  </label>
                                  <span className={`text-[9px] font-bold ${!iotCollaborationEnabled ? 'text-rose-500' : 'text-slate-200'}`}>
                                    {language === 'tr' ? 'PASİF' : 'PASSIVE'}
                                  </span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={iotCollaborationEnabled}
                                    onClick={() => setIotCollaborationEnabled((prev) => !prev)}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300 shrink-0 ${iotCollaborationEnabled ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300')}`}
                                  >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${iotCollaborationEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                                  </button>
                                  <span className={`text-[9px] font-bold ${iotCollaborationEnabled ? 'text-cyan-500' : 'text-slate-200'}`}>
                                    {language === 'tr' ? 'AKTİF' : 'ACTIVE'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <label className="text-xs font-bold text-slate-500 shrink-0">
                                    {language === 'tr' ? 'Güç Durumu (Açık/Kapalı)' : 'Power Status (On/Off)'}
                                  </label>
                                  <span className={`text-[9px] font-bold ${selectedIotDevice?.status === 'offline' ? 'text-rose-500' : 'text-slate-200'}`}>
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
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300 shrink-0 ${selectedIotDevice?.status !== 'offline' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300')}`}
                                  >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${selectedIotDevice?.status !== 'offline' ? 'translate-x-8' : 'translate-x-1'}`} />
                                  </button>
                                  <span className={`text-[9px] font-bold ${selectedIotDevice?.status !== 'offline' ? 'text-emerald-500' : 'text-slate-200'}`}>
                                    {language === 'tr' ? 'AÇIK' : 'ON'}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500">{language === 'tr' ? 'Veri Saklama (not/json/metin)' : 'Data Storage (note/json/text)'}</label>
                                  <textarea
                                    value={iotDataStore}
                                    onChange={(e) => setIotDataStore(e.target.value)}
                                    rows={5}
                                    className={`w-full rounded-md border px-3 py-2 text-sm ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'}`}
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
                                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                      <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="text-[11px] font-semibold text-slate-500 mb-1">IP Address</div>
                                            <div className={`text-sm font-mono ${selectedIotDevice?.ip ? 'text-cyan-600 dark:text-cyan-300' : 'text-slate-200'}`}>
                                              {selectedIotDevice?.ip || 'Not assigned'}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                          <div>
                                            <div className="text-[11px] font-semibold text-slate-500 mb-1">MAC Address</div>
                                            <div className="text-sm font-mono text-slate-600 dark:text-slate-200">{selectedIotDevice?.macAddress ? normalizeMAC(selectedIotDevice.macAddress) : 'N/A'}</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-semibold text-slate-500 mb-1">Gateway</div>
                                            <div className="text-sm font-mono text-slate-600 dark:text-slate-200">{selectedIotDevice?.gateway || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-semibold text-slate-500 mb-1">Subnet Mask</div>
                                            <div className="text-sm font-mono text-slate-600 dark:text-slate-200">{selectedIotDevice?.subnet || '-'}</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-semibold text-slate-500 mb-1">Status</div>
                                            <div className={`text-sm font-semibold ${isIotConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                              {isIotConnected ? (
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                                  Online
                                                </span>
                                              ) : (
                                                <span className="flex items-center gap-1.5">
                                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                  Offline
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
                                            className="hover:text-blue-500"
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
                                            Ping
                                          </Button>
                                        )}
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="hover:text-blue-500"
                                          onClick={() => {
                                            if (selectedIotDeviceId) {
                                              window.parent.postMessage({
                                                type: 'router-admin-renew-iot',
                                                deviceId: selectedIotDeviceId,
                                                payload: {
                                                  iotDeviceId: selectedIotDeviceId
                                                }
                                              }, '*');
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

                                <div className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-500'} flex items-center gap-1`}>
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
                          className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden"
                          style={mobileVerticalScrollStyle}
                        >
                          <div className={`rounded-2xl border p-5 space-y-5 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
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
                                  className="h-7 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white"
                                  onClick={() => {
                                    navigateToProgram('desktop');
                                    setTimeout(() => {
                                      setInput('curl 192.168.1.1');
                                      void executeCommand('curl 192.168.1.1');
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
                                    : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300')
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
                                <label className="text-[10px] font-black tracking-widest text-slate-500 ml-1">SSID (Service Set Identifier)</label>
                                {(() => {
                                  const filtered = availableSSIDs.filter(e =>
                                    e.ssid.toLowerCase().includes(wifiSSID.toLowerCase())
                                  );
                                  return (
                                    <div className="relative">
                                      <div className={`flex items-center border rounded-md px-3 h-9 gap-2 ${!wifiEnabled ? 'opacity-50 pointer-events-none' : ''} ${isDark ? 'bg-background border-slate-800' : 'bg-white border-slate-200'}`}>
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
                                          className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
                                        />
                                        {wifiSSID && (
                                          <button type="button" onClick={() => { setWifiSSID(''); setWifiBSSID(''); setSsidDropdownOpen(false); }} className="text-slate-200 hover:text-white text-xs">✕</button>
                                        )}
                                        <button type="button" onClick={() => setSsidDropdownOpen(o => !o)} className="text-slate-200 hover:text-white text-xs">▾</button>
                                      </div>
                                      {ssidDropdownOpen && (
                                        <div className={`absolute z-50 w-full mt-1 rounded-md border shadow-lg max-h-48 overflow-y-auto overflow-x-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                                          {filtered.length === 0 && (
                                            <div className={`px-3 py-2 text-xs ${isDark ? 'text-slate-200' : 'text-slate-400'}`}>
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
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-500/20 ${isDark ? 'text-white' : 'text-slate-900'}`}
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
                                <label className="text-[10px] font-black tracking-widest  text-slate-500 ml-1">
                                  {language === 'tr' ? 'Güvenlik' : 'Security'}
                                </label>
                                <Select
                                  value={wifiSecurity}
                                  onValueChange={(val) => {
                                    const security = val as any;
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
                                  <SelectTrigger className={`w-full ${isDark ? 'bg-background border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="wpa">WPA</SelectItem>
                                    <SelectItem value="wpa2">WPA2 Personal</SelectItem>
                                    <SelectItem value="wpa3">WPA3</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {wifiSecurity !== 'open' && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black tracking-widest  text-slate-500 ml-1">
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
                                      placeholder="Security Key"
                                      disabled={!wifiEnabled}
                                      className="bg-background pr-9"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowWifiPassword(v => !v)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-200 hover:text-white focus:outline-none"
                                      tabIndex={-1}
                                    >
                                      {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest  text-slate-500 ml-1">
                                  {language === 'tr' ? 'Kanal' : 'Channel'}
                                </label>
                                <Select
                                  value={wifiChannel}
                                  onValueChange={(val) => {
                                    const channel = val as any;
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
                                  <SelectTrigger className={`w-full ${isDark ? 'bg-background border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
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
                              if (!wifiEnabled) return 'text-slate-500 bg-slate-500/5';
                              if (!wifiSSID) return 'text-amber-500 bg-amber-500/10';
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
                              return isConnected ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10';
                            })()
                              }`}>
                              <div className={`p-2 rounded-lg ${(() => {
                                if (!wifiEnabled) return 'bg-slate-500/10';
                                if (!wifiSSID) return 'bg-amber-500/20';
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
                                return isConnected ? 'bg-emerald-500/20' : 'bg-amber-500/20';
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
                              <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${isDark ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
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
                        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden relative">
                          {activeTab === 'terminal' && (
                            <div className={`px-3 md:px-4 py-2 border-b shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'} flex items-center justify-between gap-3`}>
                              <div className="flex flex-col gap-1">
                                <div className="text-xs">
                                  {isConsoleConnected && connectedDeviceId ? (
                                    <span className="text-emerald-500 font-medium">
                                      {t.physicalConnectionDetected} {topologyDevices.find((d: any) => d.id === connectedDeviceId)?.name || connectedDeviceId}
                                    </span>
                                  ) : (
                                    <span className={isDark ? 'text-slate-200' : 'text-slate-600'}>{t.noConsoleCableDetected}</span>
                                  )}
                                </div>
                                <div className={`text-[10px] opacity-70 ${isDark ? 'text-slate-200' : 'text-slate-400'}`}>
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
                                {language === 'tr' ? 'Yazı Boyutu' : 'Font Size'}: {fontSize}px
                              </label>
                              <input
                                type="range" min="10" max="20" value={fontSize}
                                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                                className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => {
                                  if (activeTab === 'desktop') setPcOutput([]);
                                  else setConsoleConnectionTime(Date.now());
                                }}
                                className="h-7 text-[10px] font-black tracking-widest text-rose-500 shrink-0"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> {t.clearTerminalBtn}
                              </Button>
                            </div>
                          )}
                          {/* Output Area - Scrollable */}
                          <div
                            ref={outputRef}
                            className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth p-3 md:p-6 space-y-1.5 font-geist-mono leading-relaxed custom-scrollbar ${isMobile ? 'mobile-scroll' : ''} ${isPcPoweredOff ? 'bg-black' : terminalBg}`}
                            style={{ ...mobileVerticalScrollStyle, fontSize: `${fontSize}px`, paddingBottom: isMobile ? '8rem' : '7rem', contain: 'layout style paint' }}
                          >
                            {isPcPoweredOff ? (
                              <div className="h-full flex flex-col items-center justify-center gap-3">
                                <svg className="w-16 h-16 text-red-600 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v10" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 1 1-12.728 0" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.36 5.64a9 9 0 1 1-12.73 0" />
                                </svg>
                              </div>
                            ) : gameActive && activeTab === 'desktop' ? (
                              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                <div className={`text-xs ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
                                  {gameLanguage === 'tr'
                                    ? `Skor: ${gameScore} | Çıkış: ESC | Yeniden: SPACE`
                                    : `Score: ${gameScore} | Exit: ESC | Restart: SPACE`}
                                </div>
                                <div
                                  className={`grid border rounded-md p-1 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'}`}
                                  style={{ gridTemplateColumns: 'repeat(30, minmax(0, 10px))', gridTemplateRows: 'repeat(20, minmax(0, 10px))', gap: '1px' }}
                                >
                                  {Array.from({ length: 30 * 20 }).map((_, idx) => {
                                    const x = idx % 30;
                                    const y = Math.floor(idx / 30);
                                    const isHead = snake[0]?.x === x && snake[0]?.y === y;
                                    const isBody = snake.slice(1).some((s) => s.x === x && s.y === y);
                                    const isFood = food.x === x && food.y === y;

                                    return (
                                      <div
                                        key={idx}
                                        className={`w-[10px] h-[10px] ${isHead
                                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                          : isBody
                                            ? 'bg-emerald-600'
                                            : isFood
                                              ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)] animate-pulse'
                                              : (isDark ? 'bg-slate-800' : 'bg-slate-100')
                                          }`}
                                      />
                                    );
                                  })}
                                </div>
                                {gameOver && (
                                  <div className="text-rose-500 font-bold text-sm">
                                    {gameLanguage === 'tr' ? 'Oyun Bitti!' : 'Game Over!'}
                                  </div>
                                )}
                                {/* Mobile Touch Controls */}
                                <div className="grid grid-cols-3 gap-1 mt-2 md:hidden">
                                  <div />
                                  <button
                                    onClick={() => direction.y === 0 && setDirection({ x: 0, y: -1 })}
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-200 active:bg-slate-300'}`}
                                  >
                                    <ChevronUp className="w-6 h-6" />
                                  </button>
                                  <div />
                                  <button
                                    onClick={() => direction.x === 0 && setDirection({ x: -1, y: 0 })}
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-200 active:bg-slate-300'}`}
                                  >
                                    <ChevronLeft className="w-6 h-6" />
                                  </button>
                                  <button
                                    onClick={() => gameOver && (() => { setSnake([{ x: 10, y: 10 }]); setFood({ x: 15, y: 15 }); setDirection({ x: 1, y: 0 }); setGameScore(0); setGameOver(false); })()}
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold ${gameOver ? 'bg-emerald-500 text-white' : (isDark ? 'bg-slate-800' : 'bg-slate-100')}`}
                                  >
                                    {gameOver ? (gameLanguage === 'tr' ? 'YENİ' : 'NEW') : ''}
                                  </button>
                                  <button
                                    onClick={() => direction.x === 0 && setDirection({ x: 1, y: 0 })}
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-200 active:bg-slate-300'}`}
                                  >
                                    <ChevronRight className="w-6 h-6" />
                                  </button>
                                  <div />
                                  <button
                                    onClick={() => direction.y === 0 && setDirection({ x: 0, y: 1 })}
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 active:bg-slate-600' : 'bg-slate-200 active:bg-slate-300'}`}
                                  >
                                    <ChevronDown className="w-6 h-6" />
                                  </button>
                                  <div />
                                </div>
                              </div>
                            ) : (
                              (activeTab === 'desktop' ? pcOutput : activeConsoleOutput).map((line) => (
                                <div key={line.id} className="break-all animate-in fade-in slide-in-from-left-1 duration-200">
                                  {line.type === 'command' && (
                                    <div className="flex items-start gap-2 text-cyan-500 font-bold">
                                      {activeTab === 'desktop' ? (
                                        <Laptop className="w-4 h-4 shrink-0 text-blue-400" />
                                      ) : (
                                        <span className="shrink-0 text-emerald-400">
                                          <Laptop className="w-4 h-4" />
                                        </span>
                                      )}
                                      <span className="shrink-0 opacity-40 select-none font-geist-mono">
                                        {activeTab === 'desktop' ? `${internalPcHostname} C:\>` : (line.prompt || '>')}
                                      </span>
                                      <span className={isDark ? "text-slate-100" : "text-slate-900"}>{highlightText(line.content)}</span>
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
                                              <span className="font-mono">{highlightText(value)}</span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value.trim());
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${value.trim()} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/30 ${isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
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
                                              <span className="font-mono">{highlightText(value)}</span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(value.trim());
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${value.trim()} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/30 ${isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
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
                                              <span className="font-mono text-cyan-400">{highlightText(ipValue)}</span>
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(ipValue);
                                                  toast({
                                                    title: language === 'tr' ? 'Kopyalandı' : 'Copied',
                                                    description: `${ipValue} ${language === 'tr' ? 'panoya kopyalandı' : 'copied to clipboard'}`,
                                                  });
                                                }}
                                                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-700/30 ${isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'}`}
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
                                  {line.type === 'success' && <span className="text-cyan-500 font-bold  text-xs tracking-widest opacity-80">{highlightText(line.content)}</span>}
                                  {/* HTML çıktıları pop-up içinde gösteriliyor */}
                                </div>
                              ))
                            )}
                            {activeTab === 'terminal' && !isPcPoweredOff && !isConsoleConnected && (
                              <div className={`mt-auto text-xs ${isDark ? 'text-slate-200' : 'text-slate-500'}`}>
                                {t.waitingForConnection}
                              </div>
                            )}
                          </div>
                          {/* Input Area - Fixed at bottom */}
                          {!isPcPoweredOff && (
                            <div className={`absolute inset-x-0 bottom-0 z-20 border-t bg-muted/95 backdrop-blur-sm ${isMobile ? 'p-2' : 'p-3'}`}>
                              <form onSubmit={(e) => { e.preventDefault(); executeCommand(); }} className="flex items-center gap-3 relative">

                                {/* Context hint for password/confirm in console mode */}
                                {activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending) && (
                                  <div className="absolute -top-7 left-4 right-4 text-[10px] font-black tracking-widest text-amber-400 animate-pulse">
                                    {consoleNeedsPassword
                                      ? (language === 'tr' ? 'Parola girin ve Enter\'a basın' : 'Enter password and press Enter')
                                      : (language === 'tr' ? 'Onaylamak için Enter\'a basın' : 'Press Enter to confirm')}
                                  </div>
                                )}
                                <div className={`flex items-center gap-3 px-3 py-2 bg-background rounded-lg border flex-1 group focus-within:ring-1 transition-all shadow-inner ${isMobile ? 'px-3 py-2' : ''} ${activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                  ? 'border-amber-500/50 focus-within:ring-amber-500/50'
                                  : 'border-input focus-within:ring-primary/50'
                                  }`}>
                                  <span className={`font-geist-mono font-bold text-xs select-none opacity-40 group-focus-within:opacity-100 transition-opacity shrink-0 ${activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                    ? 'text-amber-400'
                                    : 'text-primary'
                                    }`}>
                                    {activeTab === 'desktop' ? `${internalPcHostname} C:\>` : (() => {
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
                                    className="flex-1 bg-transparent border-none outline-none font-geist-mono text-[13px]"
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
                                      isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                    )}>
                                      <div className={`flex items-center justify-between px-3 py-2 text-[11px] font-geist-mono font-semibold ${isDark ? 'text-slate-200 bg-slate-900/60' : 'text-slate-700 bg-slate-50'}`}>
                                        <span>{t.cmdSuggestions}</span>
                                        <span className={`text-[10px] font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                                          Tab ↹ {t.completeWithTab}
                                        </span>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto overflow-x-hidden mobile-scroll font-geist-mono">
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
                                                ? (isDark ? "bg-cyan-500/20 text-cyan-200" : "bg-cyan-50 text-cyan-900")
                                                : (isDark ? "text-slate-300 hover:bg-primary/10" : "text-slate-700 hover:bg-primary/10")
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
                                    size="icon"
                                    variant="ghost"
                                    className="shrink-0 rounded-xl hover:bg-rose-500/20 text-rose-500"
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
                                    <X className="w-5 h-5" />
                                  </Button>
                                )}
                                <Button
                                  type="submit"
                                  disabled={activeTab === 'desktop' ? (!input.trim() || isCmdInputDisabled) : isConsoleInputDisabled}
                                  size="icon"
                                  className={cn(
                                    "shrink-0 rounded-xl shadow-lg",
                                    isMobile ? "h-9 w-9" : "h-11 w-11",
                                    activeTab === 'terminal' && isConsoleConnected && (consoleNeedsPassword || consoleConfirmDialog?.show || consoleReloadPending)
                                      ? 'bg-amber-500 hover:bg-amber-600'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  )}
                                >
                                  <CornerDownLeft className={cn("w-5 h-5", isMobile && "w-4 h-4")} />
                                </Button>
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

      {/* HTTP content in-tablet viewer */}
      {httpAppContent && (
        <div
          className="fixed inset-0 z-[999] pointer-events-auto bg-black/20"
          onClick={(e) => {
            e.stopPropagation();
            setHttpAppContent(null);
            inputRef.current?.focus();
          }}
        >
          <div
            className="absolute"
            style={isMobile
              ? {
                left: 8,
                right: 8,
                top: browserWindow.y,
                width: 'auto',
                height: browserWindow.height,
                willChange: 'transform',
                contain: 'layout style paint',
              }
              : {
                left: browserWindow.x,
                top: browserWindow.y,
                width: browserWindow.width,
                height: browserWindow.height,
                willChange: 'transform',
                contain: 'layout style paint',
              }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`h-full w-full rounded-2xl shadow-2xl border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} flex flex-col overflow-hidden`}
              style={{ borderWidth: 3, willChange: 'auto', contain: 'layout style paint' }}
            >
              <div
                className={`flex items-center justify-between px-4 py-2 border-b cursor-grab active:cursor-grabbing select-none touch-none ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100'}`}
                onPointerDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('input, textarea, select, button')) return;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragStateRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: browserWindow.x,
                    originY: browserWindow.y,
                  };
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openWebPage(httpAppUrl);
                    }}
                    onKeyDown={(e) => {
                      // Prevent browser keys from bubbling into underlying CMD handlers.
                      e.stopPropagation();
                    }}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className="flex flex-col flex-1 min-w-0 relative">
                      <span className="text-sm font-semibold truncate">{httpAppTitle}</span>
                      <input
                        ref={urlInputRef}
                        value={httpAppUrl || ''}
                        onChange={(e) => {
                          setHttpAppUrl(e.target.value);
                          setSelectedSuggestionIndex(-1);
                        }}
                        onFocus={() => {
                          setShowUrlSuggestions(true);
                          setSelectedSuggestionIndex(-1);
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          const suggestions = filteredSuggestions.slice(0, 10);

                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev =>
                              prev < suggestions.length - 1 ? prev + 1 : prev
                            );
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedSuggestionIndex(prev =>
                              prev > 0 ? prev - 1 : -1
                            );
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                              setHttpAppUrl(suggestions[selectedSuggestionIndex]);
                              setShowUrlSuggestions(false);
                              openWebPage(suggestions[selectedSuggestionIndex]);
                            } else {
                              setShowUrlSuggestions(false);
                              openWebPage(httpAppUrl);
                            }
                          }
                        }}
                        placeholder="http://"
                        className={`mt-1 w-full text-xs rounded-md px-2 py-1 border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
                      />
                      {showUrlSuggestions && filteredSuggestions.length > 0 && (
                        <div className={`absolute top-full left-0 right-0 mt-1 rounded-md border shadow-lg max-h-48 overflow-y-auto overflow-x-hidden z-50 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
                          {filteredSuggestions.slice(0, 10).map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setHttpAppUrl(suggestion);
                                setShowUrlSuggestions(false);
                                openWebPage(suggestion);
                              }}
                              onMouseEnter={() => setSelectedSuggestionIndex(index)}
                              className={`w-full text-left px-2 py-1.5 text-xs cursor-pointer ${index === selectedSuggestionIndex ? (isDark ? 'bg-slate-700' : 'bg-slate-200') : 'hover:bg-slate-100 dark:hover:bg-slate-800'} ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      type="submit"
                      variant="default"
                      className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {language === 'tr' ? 'Git' : 'Go'}
                    </Button>
                  </form>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    setHttpAppContent(null);
                    setHttpAppDeviceId(null);
                    inputRef.current?.focus();
                  }}
                  className="ml-3 shrink-0"
                  aria-label={language === 'tr' ? 'Kapat' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden bg-gradient-to-b from-transparent to-slate-50 dark:to-slate-900" style={{ contain: 'layout style paint' }}>
                <iframe
                  title={httpAppTitle}
                  srcDoc={httpAppSrcDoc}
                  sandbox="allow-forms allow-scripts allow-same-origin allow-modals"
                  className="h-full w-full border-0 bg-white"
                  style={{ display: 'block' }}
                />
              </div>
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize select-none touch-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  resizeStateRef.current = {
                    side: 'left',
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: browserWindow.x,
                    originW: browserWindow.width,
                    originH: browserWindow.height,
                  };
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize select-none touch-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  resizeStateRef.current = {
                    side: 'right',
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: browserWindow.x,
                    originW: browserWindow.width,
                    originH: browserWindow.height,
                  };
                }}
              />
              <div
                className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize select-none touch-none"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  resizeStateRef.current = {
                    side: 'bottom',
                    startX: e.clientX,
                    startY: e.clientY,
                    originX: browserWindow.x,
                    originW: browserWindow.width,
                    originH: browserWindow.height,
                  };
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type PCActiveTab = 'home' | 'desktop' | 'terminal' | 'settings' | 'services' | 'wireless' | 'iot';

function getPCConfigDefaults(id: string) {
  const num = id.split('-')[1] || '1';
  return {
    ip: `192.168.1.${10 + parseInt(num)}`,
    mac: `00-40-96-99-88-7${num}`
  };
}
