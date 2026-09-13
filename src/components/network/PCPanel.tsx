'use client';

import { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { useEnvironment } from '@/lib/store/appStore';
import { SwitchState } from '@/lib/network/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { CanvasDevice, CanvasConnection } from './networkTopology.types';
import { checkConnectivity, getWirelessSignalStrength, getDeviceWifiConfig, getDeviceMacAddress, getApActiveSsids, wifiMacFilterMatches } from '@/lib/network/connectivity';
import { dispatchCapturedPackets } from '@/utils/packetCapture';
import { ensureDeviceStatesMap } from '@/lib/network/networkUtils';

import { toast } from "@/hooks/use-toast";
import { useOutputSearch } from '@/hooks/useOutputSearch';
import { useIsMobile, useIsTablet } from '@/hooks/use-breakpoint';
import { sanitizeHTTPContent } from '@/lib/security/sanitizer';
import { generateRouterAdminPage, isRouterDevice } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent } from '@/lib/network/iotWebPanel';
import { errorHandler } from '@/lib/errors/errorHandler';

import { loadFs, readFile, getFtpFilesFromUploadDir, syncMailFilesToFs, syncHttpContentToFs } from './pc-panel/pcFileSystem';
import { secureStorage } from '@/lib/storage/secureStorage';
import { getPCConfigDefaults } from './pc-panel/pcPanelFiles';
import { usePCPanelSessionState } from './pc-panel/usePCPanelSessionState';
import { usePCPanelNtp } from './pc-panel/usePCPanelNtp';
import { usePCPanelSync } from './pc-panel/usePCPanelSync';
import { usePCPanelValidation } from './pc-panel/usePCPanelValidation';
import { usePCPanelBrowserState } from './pc-panel/usePCPanelBrowserState';
import { usePCPanelTerminalSync } from './pc-panel/usePCPanelTerminalSync';
import { usePCPanelMail } from './pc-panel/usePCPanelMail';
import { usePCPanelDhcp } from './pc-panel/usePCPanelDhcp';
import { usePCPanelRouterAdmin } from './pc-panel/usePCPanelRouterAdmin';
import { usePCPanelBrowser } from './pc-panel/usePCPanelBrowser';
import { usePCPanelCommands } from './pc-panel/usePCPanelCommands';
import { usePCPanelInput } from './pc-panel/usePCPanelInput';
import { validateIP, validateIPv6, isValidIpAddress, highlightText as highlightTextHelper, getInitialPcOutput } from './pc-panel/pcPanelHelpers';
import type { DhcpPoolConfig, OutputLine, PCPanelProps, PcFile } from './pc-panel/PCPanel.types';
import { usePCPanelState } from './pc-panel/usePCPanelState';
import { PCPanelContext, type PCPanelContextValue } from './pc-panel/PCPanelContext';
import { PCPanelShell } from './pc-panel/PCPanelShell';
import { PCPanelDialogs } from './pc-panel/PCPanelDialogs';
import {
  hasGatewayForTarget,
  normalizeLookupTarget,
  resolveDeviceNameTarget,
  resolveDomainWithDnsServices,
  findHttpServerByTarget,
  isDhcpPoolCompatibleForClient
} from './pc-panel/pcBrowser.utils';
import { usePCPanelNavigation } from './pc-panel/usePCPanelNavigation';
import { usePCPanelArp } from './pc-panel/usePCPanelArp';
import { usePCPanelLauncherApps } from './pc-panel/usePCPanelLauncherApps';
import { usePCPanelAutoType } from './pc-panel/usePCPanelAutoType';
import { usePCPanelGlobalNav } from './pc-panel/usePCPanelGlobalNav';
import { usePCPanelConsole } from './pc-panel/usePCPanelConsole';
import { usePCPanelIotConfig } from './pc-panel/usePCPanelIotConfig';
import { usePCPanelDeviceSync } from './pc-panel/usePCPanelDeviceSync';

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
  setPcOutputs,
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
  const isTablet = useIsTablet();

  // The PC panel is a persistent floating window. Closing it is handled by
  // its close button, Escape, or an explicit navigation action.
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deviceFromTopology = topologyDevices.find(d => d.id === deviceId);
  const defaultConfig = getPCConfigDefaults(deviceId);
  const isPcPoweredOff = deviceFromTopology?.status === 'offline';

  const { activeTab, setActiveTab, activeTabRef, goHome, navigateToProgram } = usePCPanelNavigation({
    deviceId,
    isVisible,
    isPoweredOn: !isPcPoweredOff,
    initialTab,
    onNavigate,
  });

  const terminalBg = isDark ? 'bg-black' : 'bg-secondary-50';
  const textColor = isDark ? 'text-secondary-300' : 'text-secondary-700';

  const {
    activeServiceTab,
    setActiveServiceTab,
    fontSize,
    handleFontSizeChange,
    showCmdSettings,
    setShowCmdSettings,
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
  } = usePCPanelState();

  const mobileVerticalScrollStyle: CSSProperties | undefined = isMobile
    ? {
      overflowY: 'auto' as const,
      WebkitOverflowScrolling: 'touch' as const,
      overscrollBehaviorY: 'contain' as const,
      touchAction: 'pan-y' as const,
    }
    : undefined;

  const [input, setInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(-1);
  const [autocompleteNavigated, setAutocompleteNavigated] = useState(false);

  // Tab cycle state
  const [tabCycleIndex, setTabCycleIndex] = useState(-1);
  const [lastTabInput, setLastTabInput] = useState('');

  const [currentPath, setCurrentPath] = useState<string>('C:\\');
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);
  const sessionState = usePCPanelSessionState(deviceId, pcHistories, activeTab, setCurrentPath);
  const {
    ftpSession, setFtpSession, pythonSession, setPythonSession,
    activePythonForm, setActivePythonForm,
    activePython3DScene, setActivePython3DScene,
    isFtpFilePickerOpen, setIsFtpFilePickerOpen, pcLocalFiles, setPcLocalFiles,
    desktopHistory, setDesktopHistory, desktopHistoryIndex, setDesktopHistoryIndex,
    consoleHistory, setConsoleHistory, consoleHistoryIndex, setConsoleHistoryIndex,
  } = sessionState;

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Save currentPath per deviceId
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`pc_cwd_${deviceId}`, currentPath);
      } catch { }
    }
  }, [deviceId, currentPath]);


  // Get device from topology
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

  const [serviceHttpEnabled, setServiceHttpEnabled] = useState(deviceFromTopology?.services?.http?.enabled ?? true);
  const [serviceHttpContent, setServiceHttpContent] = useState(() => {
    const fs = loadFs(deviceId);
    const wwwIndex = readFile(fs, 'C:\\www\\index.html') || readFile(fs, 'www/index.html');
    return wwwIndex || deviceFromTopology?.services?.http?.content || t.helloWorld;
  });
  const [serviceFtpEnabled, setServiceFtpEnabled] = useState(deviceFromTopology?.services?.ftp?.enabled ?? false);
  const [serviceFtpFiles, setServiceFtpFiles] = useState<PcFile[]>(() => getFtpFilesFromUploadDir(deviceId));
  const [serviceMailEnabled, setServiceMailEnabled] = useState(deviceFromTopology?.services?.mail?.enabled ?? false);
  const [serviceMailDomain, setServiceMailDomain] = useState(deviceFromTopology?.services?.mail?.domain || 'local.lan');
  const [serviceMailUsername, setServiceMailUsername] = useState(deviceFromTopology?.services?.mail?.username || 'user');
  const [serviceMailPassword, setServiceMailPassword] = useState(deviceFromTopology?.services?.mail?.password || 'mail123');
  const [serviceMailInbox, setServiceMailInbox] = useState<Array<{ from: string; subject: string; body: string; timestamp?: string }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = secureStorage.getItem(`mail_inbox_${deviceId}`);
        if (stored) return JSON.parse(stored);
      } catch { }
    }
    return deviceFromTopology?.services?.mail?.inbox || [];
  });
  const [serviceMailSent, setServiceMailSent] = useState<Array<{ to: string; subject: string; body: string; timestamp?: string }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = secureStorage.getItem(`mail_sent_${deviceId}`);
        if (stored) return JSON.parse(stored);
      } catch { }
    }
    return deviceFromTopology?.services?.mail?.sent || [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      secureStorage.setItem(`mail_inbox_${deviceId}`, JSON.stringify(serviceMailInbox));
      secureStorage.setItem(`mail_sent_${deviceId}`, JSON.stringify(serviceMailSent));
    }
    syncMailFilesToFs(deviceId, serviceMailInbox, serviceMailSent);
  }, [serviceMailInbox, serviceMailSent, deviceId]);

  useEffect(() => {
    if (deviceId) {
      const fs = loadFs(deviceId);
      const wwwIndex = readFile(fs, 'C:\\www\\index.html') || readFile(fs, 'www/index.html');
      if (wwwIndex !== null) {
        setServiceHttpContent(wwwIndex);
      }
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId && serviceHttpContent) {
      syncHttpContentToFs(deviceId, serviceHttpContent);
    }
  }, [serviceHttpContent, deviceId]);
  const mailPop3Blocked = useMemo(() => {
    if (activeServiceTab !== 'mail' || !pcIP) return false;
    const result = checkConnectivity(deviceId, pcIP, topologyDevices, topologyConnections as unknown as CanvasConnection[], deviceStates || new Map(), language as 'tr' | 'en', { protocol: 'tcp', port: '110' });
    return !result.success;
  }, [activeServiceTab, pcIP, deviceId, topologyDevices, topologyConnections, deviceStates, language]);

  const [serviceNtpEnabled, setServiceNtpEnabled] = useState(deviceFromTopology?.services?.ntp?.enabled ?? false);
  const [serviceNtpServer, setServiceNtpServer] = useState(deviceFromTopology?.services?.ntp?.server || '');
  const [serviceNtpServerError, setServiceNtpServerError] = useState('');
  const [, setServiceNtpServerPreset] = useState<'pool.ntp.org' | 'local-clock' | 'custom'>(
    (deviceFromTopology?.services?.ntp?.server === 'pool.ntp.org'
      ? 'pool.ntp.org'
      : deviceFromTopology?.services?.ntp?.server === 'local-clock'
        ? 'local-clock'
        : 'custom')
  );
  const [serviceNtpDate, setServiceNtpDate] = useState(deviceFromTopology?.services?.ntp?.date || new Date().toISOString().slice(0, 10));
  const [serviceNtpTime, setServiceNtpTime] = useState(deviceFromTopology?.services?.ntp?.time || new Date().toTimeString().slice(0, 8));
  const [serviceDhcpEnabled, setServiceDhcpEnabled] = useState(deviceFromTopology?.services?.dhcp?.enabled ?? false);
  const [serviceDhcpPools, setServiceDhcpPools] = useState<DhcpPoolConfig[]>(deviceFromTopology?.services?.dhcp?.pools || []);
  const [serviceSyslogEnabled, setServiceSyslogEnabled] = useState(deviceFromTopology?.services?.syslog?.enabled ?? false);
  const [serviceSyslogMessages, setServiceSyslogMessages] = useState<import('@/lib/network/syslog').SyslogMessage[]>(deviceFromTopology?.services?.syslog?.messages || []);
  const isDhcpEditingRef = useRef(false); // Track if user is actively editing DHCP pools
  const isDnsEditingRef = useRef(false); // Track if user is actively editing DNS records
  const checkDhcpAvailabilityRef = useRef<() => { available: boolean; reason: string }>(() => ({ available: true, reason: '' }));
  const manualDhcpClickRef = useRef(false); // Track if DHCP button was manually clicked to prevent infinite loop
  const pcIpRef = useRef(''); // Track pcIP to detect changes
  const pcSubnetRef = useRef(pcSubnet);
  const pcGatewayRef = useRef(pcGateway);
  const pcDNSRef = useRef(pcDNS);
  const applyDhcpLeaseRef = useRef<((force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null) | null>(null);

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
  const [wifiEnabled, setWifiEnabled] = useState(
    (deviceFromTopology?.wifi?.enabled ?? false) && !(deviceFromTopology?.wifi?.powerDisabled ?? false)
  );
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
          } catch {
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
            } catch {
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

  const {
    ntpPanelTime,
    ntpSyncState,
    applyNtpServerTime,
    formatFullDateTime,
  } = usePCPanelNtp({
    language,
    deviceId,
    topologyDevices,
    topologyConnections,
    deviceStates,
    serviceNtpEnabled,
    serviceNtpServer,
    serviceNtpDate,
    setServiceNtpDate,
    serviceNtpTime,
    setServiceNtpTime,
    setServiceNtpServerPreset,
    isValidIpAddress,
  });
  const {
    selectedIotDeviceId, setSelectedIotDeviceId, selectedIotDevice,
    iotSensorType, setIotSensorType, iotKind, setIotKind,
    iotCollaborationEnabled, setIotCollaborationEnabled, iotDataStore, setIotDataStore,
  } = usePCPanelIotConfig({ iotDevices, language, t });
  // Scan for available APs and SSIDs in the network topology dynamically
  const availableSSIDs = useMemo(() => {
    const results: { ssid: string; deviceId: string; deviceName: string; channel?: string }[] = [];
    const addedKeys = new Set<string>();
    const safeStates = deviceStates ? ensureDeviceStatesMap(deviceStates) : undefined;

    topologyDevices.forEach((device) => {
      if (device.id === deviceId) return; // skip self
      if (device.type !== 'router' && device.type !== 'switchL2' && device.type !== 'switchL3' && device.type !== 'wlc') return;
      const state = safeStates?.get(device.id);
      const apWifi = getDeviceWifiConfig(device, safeStates);
      const activeSsids = getApActiveSsids(apWifi, state, safeStates);

      activeSsids.forEach(item => {
        if (!item.ssid) return;
        const uniqueKey = `${device.id}:${item.ssid}`;
        if (!addedKeys.has(uniqueKey)) {
          addedKeys.add(uniqueKey);
          results.push({
            ssid: item.ssid,
            deviceId: device.id,
            deviceName: device.name,
            channel: apWifi?.channel || '2.4GHz',
          });
        }
      });
    });

    return results;
  }, [deviceStates, deviceId, topologyDevices]);
  const [errors, setErrors] = useState<Record<string, string>>({});


  // Refresh local form state when switching devices or when topology data changes externally.
  usePCPanelDeviceSync({
    isVisible,
    deviceId,
    deviceFromTopology,
    defaultConfig,
    helloWorld: t.helloWorld,
    setInternalPcHostname,
    setPcMAC,
    setPcIP,
    setPcSubnet,
    setPcGateway,
    setPcDNS,
    setPcIPv6,
    setPcIPv6Prefix,
    setIpConfigMode,
    setServiceDnsEnabled,
    setServiceDnsRecords,
    setServiceHttpEnabled,
    setServiceHttpContent,
    setServiceFtpEnabled,
    setServiceFtpFiles,
    setServiceMailEnabled,
    setServiceMailDomain,
    setServiceMailUsername,
    setServiceMailPassword,
    setServiceMailInbox,
    setServiceMailSent,
    setServiceNtpEnabled,
    setServiceNtpServer,
    setServiceNtpServerPreset,
    setServiceNtpDate,
    setServiceNtpTime,
    setServiceDhcpEnabled,
    setServiceDhcpPools,
    setDnsFormDomain,
    setDnsFormAddress,
    setDhcpForm,
    setEditingDhcpIndex,
    setWifiEnabled,
    setWifiSSID,
    setWifiSecurity,
    setWifiPassword,
    setWifiChannel,
    setWifiBSSID,
  });

  // Validate and sync global state


  const { dispatchDeviceConfig, syncToGlobal } = usePCPanelSync({
    deviceId,
    deviceFromTopology,
    topologyDevices,
    internalPcHostname,
    ipConfigMode,
    pcIP,
    pcMAC,
    pcSubnet,
    pcGateway,
    pcDNS,
    pcIPv6,
    pcIPv6Prefix,
    serviceDnsEnabled,
    serviceDnsRecords,
    serviceHttpEnabled,
    serviceHttpContent,
    serviceFtpEnabled,
    serviceFtpFiles,
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
    wifiEnabled,
    wifiSSID,
    wifiBSSID,
    wifiSecurity,
    wifiPassword,
    wifiChannel,
    setErrors,
    pcIpRef,
    t
  });

  const { validateIpField, validateSubnetField } = usePCPanelValidation({
    deviceId,
    topologyDevices,
    pcSubnet,
    setPcSubnet,
    setErrors,
    dispatchDeviceConfig,
    t
  });

  // Keep syncToGlobal in a ref to avoid circular dependency with topology updates
  const syncToGlobalRef = useRef(syncToGlobal);
  useEffect(() => {
    syncToGlobalRef.current = syncToGlobal;
  }, [syncToGlobal]);

  const [pcOutput, setPcOutput] = useState<OutputLine[]>(() => {
    if (pcOutputs?.has(deviceId)) {
      return pcOutputs.get(deviceId) as OutputLine[];
    }
    return getInitialPcOutput(deviceFromTopology, deviceId);
  });

  const {
    isConsoleConnected, setIsConsoleConnected, connectedDeviceId, setConnectedDeviceId,
    consoleConnectionTime, setConsoleConnectionTime, setConsolePasswordAttempted,
    consoleDevice, isConsoleInputDisabled, isCmdInputDisabled, consoleNeedsPassword,
    consoleConfirmDialog, consoleReloadPending, connectionErrorText, handleConnect,
  } = usePCPanelConsole({
    deviceId,
    topologyDevices,
    topologyConnections: topologyConnections as unknown as CanvasConnection[],
    deviceStates,
    deviceOutputs,
    isPcPoweredOff,
    activeTab,
    inputRef,
    setInput,
    setPcOutput,
    onExecuteDeviceCommand,
    t,
  });

  const prevPoweredOffRef = useRef<boolean>(isPcPoweredOff);
  useEffect(() => {
    if (prevPoweredOffRef.current && !isPcPoweredOff) {
      setPcOutput(getInitialPcOutput(deviceFromTopology, deviceId));
      setCurrentPath('C:\\');
      try { localStorage.setItem(`pc_cwd_${deviceId}`, 'C:\\'); } catch { }
    }
    prevPoweredOffRef.current = isPcPoweredOff;
  }, [isPcPoweredOff, deviceFromTopology, deviceId]);
  const [httpAppContent, setHttpAppContent] = useState<string | null>(null);
  const [httpAppUrl, setHttpAppUrl] = useState<string>('');
  const [httpAppTitle, setHttpAppTitle] = useState<string>('HTTP Page');
  const [httpAppDeviceId, setHttpAppDeviceId] = useState<string | null>(null);
  const routerActiveTabRef = useRef<string>('wireless');

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [showUrlSuggestions, setShowUrlSuggestions] = useState<boolean>(false);

  const { filteredSuggestions, browserWindow, setBrowserWindow } = usePCPanelBrowserState({
    topologyDevices,
    httpAppUrl,
    setHttpAppUrl,
    httpAppContent,
    setHttpAppContent,
    setHttpAppDeviceId,
    inputRef
  });

  // Regenerate IoT panel content when dependencies change
  useEffect(() => {
    if (!httpAppDeviceId && (httpAppUrl === 'iot-panel' || httpAppUrl === 'http://iot-panel')) {
      const iotPanelContent = generateIotWebPanelContent(iotDevices, language, undefined, undefined, topologyConnections as unknown as { sourceDeviceId: string; targetDeviceId: string }[]);
      setTimeout(() => setHttpAppContent(iotPanelContent), 0);
    }
  }, [iotDevices, topologyConnections, language, httpAppUrl, httpAppDeviceId]);
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
  const urlInputRef = useRef<HTMLInputElement>(null);



  // Global Navigation handler (Escape key & Mobile Back Button)
  usePCPanelGlobalNav({
    isVisible,
    isMobile,
    searchOpen,
    httpAppContent,
    setHttpAppContent,
    setHttpAppDeviceId,
    activeTab,
    goHome,
    onClose,
  });

  // Load persisted output when switching devices. Do not react to every
  // pcOutputs update: output is persisted after each streamed chunk, and
  // reloading here can overwrite newer lines with an older snapshot.
  useEffect(() => {
    if (pcOutputs?.has(deviceId)) {
      setPcOutput(pcOutputs.get(deviceId) ?? []);
    } else {
      setPcOutput([{
        id: '1',
        type: 'output',
        content: 'NOS Network Operation System\n'
      }]);
    }
  }, [deviceId]);

  // Persist CMD output to the shared pcOutputs map so it survives window close
  useEffect(() => {
    if (!setPcOutputs) return;
    setPcOutputs(prev => {
      if (prev.get(deviceId) === pcOutput) return prev;
      return new Map(prev).set(deviceId, pcOutput);
    });
  }, [pcOutput, deviceId, setPcOutputs]);

  const outputRef = useRef<HTMLDivElement>(null);

  const {
    matchIndex: searchMatchIndex,
    matchCount: searchMatchCount,
    goToNext: goToNextMatch,
    goToPrev: goToPrevMatch,
  } = useOutputSearch({ searchQuery, containerRef: outputRef });

  const autocompleteRef = useRef<HTMLDivElement>(null);
  const prevIpConfigModeRef = useRef(ipConfigMode);

  const highlightText = useCallback((text: string) => {
    return highlightTextHelper({ text, searchQuery, isDark });
  }, [searchQuery, isDark]);

  const { activeConsoleOutput, handleCopyAll, getCommandMode, getAutocompleteSuggestionsCallback, renderAutocompleteSuggestions, shouldShowAutocomplete } = usePCPanelTerminalSync({
    isConsoleConnected,
    connectedDeviceId,
    deviceId,
    currentPath,
    deviceOutputs: deviceOutputs || new Map(),
    consoleConnectionTime,
    activeTab,
    pcOutput,
    t,
    topologyDevices,
    deviceStates: deviceStates || new Map(),
    input,
    showAutocomplete
  });

  // Auto-focus input when visible, tab changes, command completes, or search closes
  useEffect(() => {
    if (!isVisible || searchOpen || Boolean(editingFile) || isFtpFilePickerOpen || (activeTab !== 'desktop' && activeTab !== 'terminal')) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isVisible, searchOpen, editingFile, isFtpFilePickerOpen, activeTab, pcOutput, activeConsoleOutput]);

  // Always keep CMD/Console views pinned to the latest output
  useEffect(() => {
    if (!outputRef.current) return;
    const el = outputRef.current;
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  }, [pcOutput, activeConsoleOutput, activeTab]);
















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

  // Get connected wireless & IoT devices for a router/AP
  const getConnectedIotDevices = useCallback((routerId: string) => {
    const routerDevice = topologyDevices.find(d => d.id === routerId);
    if (!routerDevice) return [];

    const routerSsids = new Map<string, { security: string; password?: string }>();
    if (routerDevice.wifi?.ssid) {
      routerSsids.set(routerDevice.wifi.ssid.toLowerCase(), {
        security: routerDevice.wifi.security || 'open',
        password: routerDevice.wifi.password,
      });
    }
    if (Array.isArray(routerDevice.wifi?.ssids)) {
      for (const s of routerDevice.wifi.ssids) {
        if (s.enabled && s.ssid) {
          routerSsids.set(s.ssid.toLowerCase(), {
            security: s.security || 'open',
            password: s.password,
          });
        }
      }
    }
    const routerState = deviceStates?.get(routerId);
    if (routerState?.wlcWlans) {
      for (const wlan of Object.values(routerState.wlcWlans)) {
        if (wlan.status === 'enabled' && wlan.ssid) {
          routerSsids.set(wlan.ssid.toLowerCase(), {
            security: wlan.security || 'open',
            password: wlan.password,
          });
        }
      }
    }

    return topologyDevices
      .filter(d => {
        if (d.id === routerId) return false;
        if (d.type !== 'iot' && d.type !== 'pc' && d.type !== 'mobile' && d.type !== 'printer') return false;

        let isWifiConnected = false;
        const clientWifi = getDeviceWifiConfig(d, deviceStates);
        // Only client/STA radios are wireless clients. APs and WLCs can
        // advertise the same SSID but must never appear in this list.
        const isWirelessClient = clientWifi?.mode === 'client' || clientWifi?.mode === 'sta';
        if (isWirelessClient && clientWifi.enabled && !clientWifi.powerDisabled && clientWifi.ssid) {
          const clientSsidLower = clientWifi.ssid.toLowerCase();
          const matchedSsid = routerSsids.get(clientSsidLower);
          if (matchedSsid) {
            const clientSec = (clientWifi.security || 'open').toLowerCase();
            const apSec = (matchedSsid.security || 'open').toLowerCase();
            if (clientSec === apSec && (apSec === 'open' || matchedSsid.password === clientWifi.password)) {
              isWifiConnected = true;
            }
          }
        }
        if (isWirelessClient && (clientWifi?.bssid === routerId || d.wifi?.bssid === routerId)) {
          isWifiConnected = true;
        }

        if (isWifiConnected) {
          const routerApWifi = getDeviceWifiConfig(routerDevice, deviceStates);
          if (!wifiMacFilterMatches(routerApWifi, d, deviceStates)) {
            isWifiConnected = false;
          }
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

        const clientWifi = getDeviceWifiConfig(d, deviceStates);
        const routerWifi = getDeviceWifiConfig(routerDevice, deviceStates);
        const macAddr = getDeviceMacAddress(d, deviceStates) || d.macAddress || d.ports?.[0]?.macAddress || `00:11:22:${d.id.slice(-2)}:33:44`;

        // A device is "connected" if it is physically wired to the router OR it
        // is actually associated to this AP's SSID (wifi enabled + matching
        // SSID/security). A client whose wireless link was cut (wifi disabled
        // or ssid cleared) must not remain reported as connected.
        const clientMode = clientWifi?.mode || d.wifi?.mode;
        const isWirelessClient = clientMode === 'client' || clientMode === 'sta';
        let isAssociated = false;
        const clientSsid = clientWifi?.ssid || '';
        if (isWirelessClient && clientWifi?.enabled && clientSsid) {
          const matchedSsid = routerSsids.get(clientSsid.toLowerCase());
          if (matchedSsid) {
            const clientSec = (clientWifi.security || 'open').toLowerCase();
            const apSec = (matchedSsid.security || 'open').toLowerCase();
            if (clientSec === apSec && (apSec === 'open' || matchedSsid.password === clientWifi.password)) {
              const routerApWifi = routerWifi;
              if (wifiMacFilterMatches(routerApWifi, d, deviceStates)) {
                isAssociated = true;
              }
            }
          }
        }
        if (isWirelessClient && (clientWifi?.bssid === routerId || d.wifi?.bssid === routerId)) {
          isAssociated = true;
        }

        let signalPercent = 100;
        if (!isWiredConnected) {
          const dx = (d.x || 0) - (routerDevice.x || 0);
          const dy = (d.y || 0) - (routerDevice.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) signalPercent = 100;
          else if (dist < 250) signalPercent = 85;
          else if (dist < 350) signalPercent = 70;
          else if (dist < 450) signalPercent = 50;
          else if (dist < 550) signalPercent = 30;
          else signalPercent = 15;
        }
        const rssiDbm = isWiredConnected ? -30 : Math.min(-30, Math.max(-95, Math.round(-95 + (signalPercent * 0.65))));

        return {
          id: d.id,
          name: d.name,
          sensorType: (d.iot?.sensorType || (d.type === 'pc' ? 'Laptop/PC' : d.type)) as 'temperature' | 'sound' | 'motion' | 'humidity' | 'light',
          connected: !!(isWiredConnected || isAssociated),
          ip: deviceIp || d.ip,
          mac: macAddr,
          ssid: d.status !== 'offline' ? (clientSsid || routerDevice.wifi?.ssid || 'WiFi') : (clientSsid || 'WiFi'),
          isWired: isWiredConnected,
          signalPercent,
          rssiDbm,
        };
      });
  }, [topologyDevices, topologyConnections, deviceStates]);

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
    dispatchCapturedPackets(result.capturedPackets);

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

  const deviceName = deviceFromTopology?.name;
  const isLoopbackTarget = useCallback((target: string): boolean => {
    const trimmed = target.trim().toLowerCase();
    return Boolean(
      trimmed === '127.0.0.1' ||
      trimmed === 'localhost' ||
      (deviceId && trimmed === deviceId.toLowerCase()) ||
      (deviceName && trimmed === deviceName.toLowerCase()) ||
      (internalPcHostname && trimmed === internalPcHostname.toLowerCase()) ||
      (pcIP && trimmed === pcIP.toLowerCase())
    );
  }, [deviceId, deviceName, internalPcHostname, pcIP]);

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
        ? (language === 'tr' ? 'AAAA Kaydı' : 'AAAA Record')
        : (language === 'tr' ? 'A Kaydı' : 'A Record'))
      : (language === 'tr' ? 'CNAME Kaydı' : 'CNAME Record');
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

  // NOTE: usePCPanelBrowser is called below, after addPcArpEntry is defined,
  // so that addPcArpEntry can be passed as a prop for ARP updates on curl/wget.
  // (See the usePCPanelBrowser call site further below.)


  // NOTE: usePCPanelRouterAdmin is also moved below (depends on openWebPage).
  // Placeholder to preserve code structure — see call sites below.

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

  // Dragging and resizing is handled entirely by HttpBrowserWindow.tsx via direct DOM updates

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
    const safeStates = ensureDeviceStatesMap(deviceStates);
    const targetState = safeStates.get(targetDeviceId);

    const isTargetApMatching = (() => {
      if (!sourceWifi?.ssid) return false;
      const targetSsid = sourceWifi.ssid.toLowerCase();

      // Check standard AP wifi
      if (targetWifi?.enabled && targetWifi.mode === 'ap' && targetWifi.ssid && targetWifi.ssid.toLowerCase() === targetSsid) {
        return true;
      }

      // Check WLC centralized WLANs
      if (targetDevice.type === 'wlc' && targetState?.wlcWlans) {
        const wlan = Object.values(targetState.wlcWlans).find(
          w => w.status === 'enabled' && w.ssid?.toLowerCase() === targetSsid
        );
        if (wlan) return true;
      }

      return false;
    })();

    if (
      sourceDevice.type === 'pc' &&
      sourceWifi?.enabled &&
      (sourceWifi.mode === 'client' || sourceWifi.mode === 'sta') &&
      isTargetApMatching &&
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







  // PC ARP table state lives in usePCPanelArp (synced via localStorage and custom events).
  const { addPcArpEntry, removePcArpEntry, clearPcArpTable, buildArpTableOutput } = usePCPanelArp({ deviceId, pcIP });

  // usePCPanelBrowser and usePCPanelRouterAdmin are called here (after addPcArpEntry)
  // so that addPcArpEntry can be passed for ARP updates on curl/wget HTTP connections.
  const { openWebPage } = usePCPanelBrowser({
    language,
    deviceId,
    pcDNS,
    pcIPv6,
    topologyDevices,
    topologyConnections,
    deviceStates,
    iotDevices,
    httpAppDeviceId,
    setHttpAppUrl,
    setHttpAppContent,
    setHttpAppTitle,
    setHttpAppDeviceId,
    addLocalOutput,
    normalizeLookupTargetCallback,
    resolveDeviceNameTargetCallback,
    hasGatewayForTargetCallback,
    isLoopbackTarget,
    isValidIpv4,
    isValidIpv6,
    findHttpServerByTargetCallback,
    getConnectedIotDevices,
    getAvailableIotDevices,
    addPcArpEntry,
    t,
  });

  usePCPanelRouterAdmin({
    language,
    httpAppDeviceId,
    setHttpAppDeviceId,
    setHttpAppContent,
    routerActiveTabRef,
    topologyDevices,
    topologyConnections: topologyConnections as CanvasConnection[],
    deviceStates,
    getConnectedIotDevices,
    getAvailableIotDevices,
    openWebPage,
    addLocalOutput,
    onDeleteDevice,
  });

  const {
    getDhcpLease: _getDhcpLease,
    checkDhcpAvailability: _checkDhcpAvailability,
    applyDhcpLease: _applyDhcpLease,
  } = usePCPanelDhcp({
    language,
    deviceId,
    topologyDevices,
    topologyConnections,
    deviceStates,
    ipConfigMode,
    pcIP,
    pcIpRef,
    pcSubnetRef,
    pcGatewayRef,
    pcDNSRef,
    setPcIP,
    setPcSubnet,
    setPcGateway,
    setPcDNS,
    validateIP,
    hasPhysicalPathToDevice,
    canReachTargetIp,
    isDhcpPoolCompatibleForClientCallback,
    checkDhcpAvailabilityRef,
    applyDhcpLeaseRef,
    manualDhcpClickRef,
    prevIpConfigModeRef,
    addLocalOutput,
    toast,
    t,
  });

  // executeFtpPut and handleFtpSessionCommand moved to usePCPanelCommands hook



  const {
    executeCommand,
    executeFtpPut,
    handleFtpSessionCommand,
  } = usePCPanelCommands({
    activeTabRef,
    applyDhcpLeaseRef,
    input,
    desktopHistory,
    setDesktopHistory,
    setDesktopHistoryIndex,
    consoleHistory,
    setConsoleHistory,
    setConsoleHistoryIndex,
    setInput,
    setShowAutocomplete,
    setAutocompleteIndex,
    setAutocompleteNavigated,
    ftpSession,
    setFtpSession,
    pythonSession,
    setPythonSession,
    pcLocalFiles,
    setPcLocalFiles,
    setIsFtpFilePickerOpen,
    pcIP,
    setPcIP,
    pcSubnet,
    pcMAC,
    pcGateway,
    pcDNS,
    pcIPv6,
    internalPcHostname,
    ipConfigMode,
    deviceId,
    language,
    t,
    topologyDevices,
    topologyConnections,
    deviceStates,
    deviceFromTopology,
    isCmdInputDisabled,
    isConsoleInputDisabled,
    connectionErrorText,
    isConsoleConnected,
    connectedDeviceId,
    setConnectedDeviceId,
    setConsoleConnectionTime,
    setIsConsoleConnected,
    wifiEnabled,
    consoleNeedsPassword,
    consoleConfirmDialog,
    consoleReloadPending,
    serviceHttpEnabled,
    serviceDnsEnabled,
    serviceDhcpEnabled,
    onUpdatePCHistory,
    onExecuteDeviceCommand,
    onNavigate,
    onClose,
    setActiveTab,
    setPcOutput,
    addLocalOutput,
    addMultilineOutput,
    resolveDeviceNameTargetCallback,
    resolveDomainWithDnsServicesCallback,
    hasGatewayForTargetCallback,
    isLoopbackTarget,
    isValidIpv4,
    isValidIpv6,
    canReachTargetIp,
    normalizeLookupTargetCallback,
    buildArpTableOutput,
    addPcArpEntry,
    removePcArpEntry,
    clearPcArpTable,
    openWebPage,
    setPcHostname,
    currentPath,
    setCurrentPath,
    setEditingFile,
    getNtpNow: () => (ntpSyncState ? ntpPanelTime : null),
  });

  const {
    completeAutocompleteSelection,
    handleInputChange,
    handleKeyDown,
  } = usePCPanelInput({
    input,
    setInput,
    activeTab,
    tabCycleIndex,
    setTabCycleIndex,
    lastTabInput,
    setLastTabInput,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    showAutocomplete,
    setShowAutocomplete,
    autocompleteIndex,
    setAutocompleteIndex,
    autocompleteNavigated,
    setAutocompleteNavigated,
    setSearchOpen,
    autocompleteRef,
    getCommandMode,
    executeCommand,
    getAutocompleteSuggestionsCallback,
    isConsoleConnected,
    consoleNeedsPassword,
    consoleConfirmDialog,
    consoleReloadPending,
    connectedDeviceId,
    deviceId,
    currentPath,
    onExecuteDeviceCommand,
    setConsolePasswordAttempted,
    setIsConsoleConnected,
    setConnectedDeviceId,
    desktopHistory,
    desktopHistoryIndex,
    setDesktopHistoryIndex,
    consoleHistory,
    consoleHistoryIndex,
    setConsoleHistoryIndex,
    setPcOutput,
    setConsoleConnectionTime,
    renderAutocompleteSuggestions,
  });

  const { launcherApps } = usePCPanelLauncherApps({ isDark, language, terminalLabel: t.terminalLabel });


  const {
    handleComposeSend,
    handleViewReplySend,
    handleDeleteInbox,
    handleDeleteSent,
  } = usePCPanelMail({
    language,
    deviceId,
    deviceFromTopology,
    topologyDevices,
    topologyConnections,
    deviceStates,
    pcIP,
    serviceMailDomain,
    serviceMailUsername,
    serviceMailEnabled,
    serviceMailPassword,
    serviceMailInbox,
    setServiceMailInbox,
    serviceMailSent,
    setServiceMailSent,
    serviceDnsEnabled,
    serviceDnsRecords,
    serviceHttpEnabled,
    serviceHttpContent,
    serviceFtpEnabled,
    serviceDhcpEnabled,
    serviceDhcpPools,
    dispatchDeviceConfig,
    addLocalOutput,
    addPcArpEntry,
  });
  // Global pc-auto-type listener (types commands into the desktop input).
  usePCPanelAutoType({ deviceId, isVisible, setActiveTab, setInput, executeCommand });

  const getNtpNow = useCallback(() => (ntpSyncState ? ntpPanelTime : null), [ntpSyncState, ntpPanelTime]);

  if (!isVisible) return null;

  const contextValue: PCPanelContextValue = {
    deviceId, isDark, language, t, environment,
    isMobile, isTablet, mobileVerticalScrollStyle, fontSize, terminalBg, textColor,
    activeTab, setActiveTab, navigateToProgram, goHome,
    isPcPoweredOff, deviceFromTopology, topologyDevices, topologyConnections, deviceStates, deviceOutputs, handleResizeStart,
    pcIP, setPcIP, pcMAC, setPcMAC, pcSubnet, setPcSubnet, pcGateway, setPcGateway, pcDNS, setPcDNS,
    pcIPv6, setPcIPv6, pcIPv6Prefix, setPcIPv6Prefix, ipConfigMode, setIpConfigMode,
    internalPcHostname, setPcHostname, wifiEnabled, setWifiEnabled,
    wifiSSID, setWifiSSID, wifiBSSID, setWifiBSSID, wifiSecurity, setWifiSecurity,
    wifiPassword, setWifiPassword, wifiChannel, setWifiChannel, wifiSignalStrength, availableSSIDs,
    input, setInput, executeCommand, isCmdInputDisabled, currentPath, setCurrentPath,
    pcOutput, setPcOutput, addLocalOutput, addMultilineOutput,
    shouldShowAutocomplete, renderAutocompleteSuggestions, autocompleteIndex,
    completeAutocompleteSelection, handleInputChange, handleKeyDown,
    inputRef, outputRef, autocompleteRef, showCmdSettings, setShowCmdSettings,
    handleFontSizeChange, highlightText,
    ftpSession, pythonSession, setPythonSession, activePythonForm, setActivePythonForm,
    activePython3DScene, setActivePython3DScene, editingFile, setEditingFile,
    isConsoleConnected, setIsConsoleConnected, connectedDeviceId, setConnectedDeviceId,
    setConsoleConnectionTime, isConsoleInputDisabled, consoleNeedsPassword,
    consoleConfirmDialog, consoleReloadPending, consoleDevice, handleConnect,
    onExecuteDeviceCommand, setConsolePasswordAttempted, activeConsoleOutput,
    serviceDnsEnabled, setServiceDnsEnabled, serviceDnsRecords, setServiceDnsRecords,
    dnsFormDomain, setDnsFormDomain, dnsFormAddress, setDnsFormAddress,
    handleAddDnsRecord, getDnsRecordDisplay,
    serviceHttpEnabled, setServiceHttpEnabled, serviceHttpContent, setServiceHttpContent,
    serviceFtpEnabled, setServiceFtpEnabled, serviceFtpFiles, setServiceFtpFiles,
    serviceDhcpEnabled, setServiceDhcpEnabled, serviceDhcpPools, setServiceDhcpPools,
    dhcpForm, setDhcpForm, editingDhcpIndex, setEditingDhcpIndex,
    serviceNtpEnabled, setServiceNtpEnabled, serviceNtpServer, setServiceNtpServer,
    serviceNtpServerError, setServiceNtpServerError, setServiceNtpServerPreset,
    serviceNtpDate, setServiceNtpDate, serviceNtpTime, setServiceNtpTime,
    applyNtpServerTime, ntpPanelTime, ntpSyncState,
    serviceMailEnabled, setServiceMailEnabled, serviceMailDomain, setServiceMailDomain,
    serviceMailUsername, setServiceMailUsername, serviceMailPassword, setServiceMailPassword,
    serviceMailInbox, setServiceMailInbox, serviceMailSent, setServiceMailSent,
    mailPop3Blocked, handleComposeSend, handleViewReplySend, handleDeleteInbox, handleDeleteSent,
    serviceSyslogEnabled, setServiceSyslogEnabled, serviceSyslogMessages, setServiceSyslogMessages,
    validateIpField, validateSubnetField, isValidIpAddress, errors, setErrors, dispatchDeviceConfig,
    iotDevices, selectedIotDeviceId, setSelectedIotDeviceId, selectedIotDevice,
    iotSensorType, setIotSensorType, iotKind, setIotKind,
    iotCollaborationEnabled, setIotCollaborationEnabled, iotDataStore, setIotDataStore,
    openWebPage, httpAppContent, setHttpAppContent, httpAppUrl, setHttpAppUrl,
    httpAppTitle, setHttpAppTitle, httpAppDeviceId, setHttpAppDeviceId,
    browserWindow, setBrowserWindow, filteredSuggestions, showUrlSuggestions, setShowUrlSuggestions,
    selectedSuggestionIndex, setSelectedSuggestionIndex, urlInputRef, dragStateRef, resizeStateRef,
    routerActiveTabRef, buildArpTableOutput, addPcArpEntry,
    isFtpFilePickerOpen, setIsFtpFilePickerOpen, executeFtpPut, handleFtpSessionCommand, getNtpNow,
    launcherApps, searchOpen, setSearchOpen, searchQuery, setSearchQuery,
    goToNextMatch, goToPrevMatch, searchMatchIndex, searchMatchCount,
    formatFullDateTime, handleCopyAll, onClose,
    canReachTargetIp, resolveDeviceNameTargetCallback,
    applyDhcpLeaseRef, manualDhcpClickRef, isDnsEditingRef, isDhcpEditingRef,
    activeServiceTab, setActiveServiceTab,
  };

  return (
    <PCPanelContext.Provider value={contextValue}>
      <PCPanelShell panelRef={panelRef} className={className} onTogglePower={onTogglePower} />
      <PCPanelDialogs />
    </PCPanelContext.Provider>
  );
}
