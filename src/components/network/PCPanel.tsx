'use client';

import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { useEnvironment } from '@/lib/store/appStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { CanvasConnection } from './NetworkTopology/types/networkTopology.types';

import { toast } from "@/hooks/use-toast";
import { useOutputSearch } from '@/hooks/useOutputSearch';
import { useIsMobile, useIsTablet } from '@/hooks/use-breakpoint';
import { generateRouterAdminPage, isRouterDevice } from '@/components/network/WifiControlPanel';
import { generateIotWebPanelContent } from '@/lib/network/iotWebPanel';

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
import { usePCPanelNetworkConfig } from './pc-panel/usePCPanelNetworkConfig';
import { usePCPanelDiscovery } from './pc-panel/usePCPanelDiscovery';
import { usePCPanelWifiClients } from './pc-panel/usePCPanelWifiClients';
import { usePCPanelNetworkSupport } from './pc-panel/usePCPanelNetworkSupport';
import { usePCPanelOutput } from './pc-panel/usePCPanelOutput';
import { validateIP, isValidIpAddress, highlightText as highlightTextHelper, getInitialPcOutput } from './pc-panel/pcPanelHelpers';
import type { OutputLine, PCPanelProps } from './pc-panel/PCPanel.types';
import { usePCPanelState } from './pc-panel/usePCPanelState';
import { PCPanelContext, type PCPanelContextValue } from './pc-panel/PCPanelContext';
import { PCPanelShell } from './pc-panel/PCPanelShell';
import { PCPanelDialogs } from './pc-panel/PCPanelDialogs';
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

  const {
    pcIP, setPcIP,
    internalPcHostname, setInternalPcHostname, setPcHostname,
    pcMAC, setPcMAC,
    ipConfigMode, setIpConfigMode,
    pcGateway, setPcGateway,
    pcDNS, setPcDNS,
    pcSubnet, setPcSubnet,
    pcIPv6, setPcIPv6,
    pcIPv6Prefix, setPcIPv6Prefix,
    serviceDnsEnabled, setServiceDnsEnabled,
    serviceDnsRecords, setServiceDnsRecords,
    dnsFormDomain, setDnsFormDomain,
    dnsFormAddress, setDnsFormAddress,
    handleAddDnsRecord,
    serviceHttpEnabled, setServiceHttpEnabled,
    serviceHttpContent, setServiceHttpContent,
    serviceFtpEnabled, setServiceFtpEnabled,
    serviceFtpFiles, setServiceFtpFiles,
    serviceMailEnabled, setServiceMailEnabled,
    serviceMailDomain, setServiceMailDomain,
    serviceMailUsername, setServiceMailUsername,
    serviceMailPassword, setServiceMailPassword,
    serviceMailInbox, setServiceMailInbox,
    serviceMailSent, setServiceMailSent,
    mailPop3Blocked,
    serviceNtpEnabled, setServiceNtpEnabled,
    serviceNtpServer, setServiceNtpServer,
    serviceNtpServerError, setServiceNtpServerError,
    setServiceNtpServerPreset,
    serviceNtpDate, setServiceNtpDate,
    serviceNtpTime, setServiceNtpTime,
    serviceDhcpEnabled, setServiceDhcpEnabled,
    serviceDhcpPools, setServiceDhcpPools,
    serviceSyslogEnabled, setServiceSyslogEnabled,
    serviceSyslogMessages, setServiceSyslogMessages,
    isDhcpEditingRef, isDnsEditingRef,
    checkDhcpAvailabilityRef, manualDhcpClickRef,
    pcIpRef, pcSubnetRef, pcGatewayRef, pcDNSRef,
    applyDhcpLeaseRef,
    dhcpForm, setDhcpForm,
    editingDhcpIndex, setEditingDhcpIndex,
    wifiEnabled, setWifiEnabled,
    wifiSSID, setWifiSSID,
    wifiSecurity, setWifiSecurity,
    wifiPassword, setWifiPassword,
    wifiChannel, setWifiChannel,
    wifiBSSID, setWifiBSSID,
  } = usePCPanelNetworkConfig({
    deviceId,
    deviceFromTopology,
    defaultConfig,
    t,
    activeServiceTab,
    topologyDevices,
    topologyConnections,
    deviceStates,
    language,
  });

  const { wifiSignalStrength, iotDevices, availableSSIDs } = usePCPanelDiscovery({
    deviceFromTopology,
    deviceId,
    topologyDevices,
    topologyConnections,
    deviceStates,
    pcIP,
    pcSubnet,
    pcGateway,
    wifiEnabled,
    wifiSSID,
  });

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

  // Dragging and resizing is handled entirely by HttpBrowserWindow.tsx via direct DOM updates

  const { addLocalOutput, addMultilineOutput } = usePCPanelOutput({
    setHttpAppContent,
    setHttpAppTitle,
    setPcOutput,
    outputRef,
    t,
    language,
  });

  const { getConnectedIotDevices, getAvailableIotDevices } = usePCPanelWifiClients({
    topologyDevices,
    topologyConnections,
    deviceStates,
  });

  const {
    canReachTargetIp,
    isValidIpv4,
    isValidIpv6,
    isDhcpPoolCompatibleForClientCallback,
    isLoopbackTarget,
    hasGatewayForTargetCallback,
    normalizeLookupTargetCallback,
    resolveDeviceNameTargetCallback,
    resolveDomainWithDnsServicesCallback,
    getDnsRecordDisplay,
    findHttpServerByTargetCallback,
    hasPhysicalPathToDevice,
  } = usePCPanelNetworkSupport({
    deviceId,
    deviceFromTopology,
    internalPcHostname,
    pcIP,
    pcSubnet,
    pcGateway,
    pcDNS,
    topologyDevices,
    topologyConnections,
    deviceStates,
    serviceDnsRecords,
    language,
  });

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

  usePCPanelDhcp({
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
