'use client';

import { createContext, useContext, type RefObject, type CSSProperties, type Dispatch, type SetStateAction, type PointerEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { SwitchState } from '@/lib/network/types';
import type { CanvasConnection, CanvasDevice } from '../networkTopology.types';
import type { TerminalOutput } from '../Terminal';
import type { DhcpPoolConfig, OutputLine, PCActiveTab, PcFile } from './PCPanel.types';
import type { SyslogMessage } from '@/lib/network/syslog';
import type { LauncherApp } from './HomeLauncher';
import type { EnvironmentSettings } from '@/lib/store/appStore';

export interface MailInboxItem {
  from: string;
  subject: string;
  body: string;
  timestamp?: string;
}

export interface MailSentItem {
  to: string;
  subject: string;
  body: string;
  timestamp?: string;
}

export interface MailItem {
  from?: string;
  to?: string;
  subject: string;
  body: string;
  timestamp?: string;
}

export interface DhcpFormState {
  poolName: string;
  defaultGateway: string;
  dnsServer: string;
  startIp: string;
  subnetMask: string;
  maxUsers: number;
}

export type ServiceTabType = 'dns' | 'http' | 'ftp' | 'dhcp' | 'mail' | 'ntp' | 'syslog';

/** All state and callbacks shared between PCPanel and its tab components. */
export interface PCPanelContextValue {
  // Identity
  deviceId: string;
  isDark: boolean;
  language: 'tr' | 'en';
  t: Record<string, string>;
  environment: EnvironmentSettings;

  // Layout
  isMobile: boolean;
  mobileVerticalScrollStyle: CSSProperties | undefined;
  fontSize: number;
  terminalBg: string;
  textColor: string;

  // Navigation
  activeTab: PCActiveTab;
  setActiveTab: (tab: PCActiveTab) => void;
  navigateToProgram: (tab: PCActiveTab) => void;
  goHome: () => void;

  // Device topology
  isPcPoweredOff: boolean;
  deviceFromTopology: CanvasDevice | undefined;
  topologyDevices: CanvasDevice[];
  topologyConnections: Array<{ sourceDeviceId: string; sourcePort: string; targetDeviceId: string; targetPort: string; cableType?: string; active?: boolean }> | CanvasConnection[];
  deviceStates: Map<string, SwitchState> | undefined;
  deviceOutputs: Map<string, TerminalOutput[]> | undefined;
  handleResizeStart?: (e: PointerEvent, direction: string, id: string) => void;

  // PC Network config
  pcIP: string;
  setPcIP: (ip: string) => void;
  pcMAC: string;
  setPcMAC: (mac: string) => void;
  pcSubnet: string;
  setPcSubnet: (s: string) => void;
  pcGateway: string;
  setPcGateway: (g: string) => void;
  pcDNS: string;
  setPcDNS: (d: string) => void;
  pcIPv6: string;
  setPcIPv6: (v: string) => void;
  pcIPv6Prefix: string;
  setPcIPv6Prefix: (p: string) => void;
  ipConfigMode: 'static' | 'dhcp';
  setIpConfigMode: (m: 'static' | 'dhcp') => void;
  internalPcHostname: string;
  setPcHostname: (name: string) => void;
  wifiEnabled: boolean;
  setWifiEnabled: (v: boolean) => void;
  wifiSSID: string;
  setWifiSSID: (s: string) => void;
  wifiBSSID: string;
  setWifiBSSID: (b: string) => void;
  wifiSecurity: string;
  setWifiSecurity: Dispatch<SetStateAction<'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3'>> | ((s: string) => void);
  wifiPassword: string;
  setWifiPassword: (p: string) => void;
  wifiChannel: string;
  setWifiChannel: (c: string) => void;
  wifiSignalStrength: number;
  availableSSIDs: Array<{ ssid: string; deviceId: string; deviceName: string; channel?: string }>;

  // Command execution
  input: string;
  setInput: (v: string) => void;
  executeCommand: (cmd?: string) => Promise<void>;
  isCmdInputDisabled: boolean;
  currentPath: string;
  setCurrentPath: (p: string) => void;

  // Output
  pcOutput: OutputLine[];
  setPcOutput: Dispatch<SetStateAction<OutputLine[]>>;
  addLocalOutput: (type: OutputLine['type'], content: string, prompt?: string) => void;
  addMultilineOutput: (type: OutputLine['type'], content: string, delayMs?: number) => Promise<void>;

  // Autocomplete
  shouldShowAutocomplete: boolean;
  renderAutocompleteSuggestions: ReactNode;
  autocompleteIndex: number;
  completeAutocompleteSelection: (word: string) => void;
  handleInputChange: (v: string) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;

  // Refs
  inputRef: RefObject<HTMLInputElement | null>;
  outputRef: RefObject<HTMLDivElement | null>;
  autocompleteRef: RefObject<HTMLDivElement | null>;
  showCmdSettings: boolean;
  setShowCmdSettings: (v: boolean) => void;
  handleFontSizeChange: (size: number) => void;
  highlightText: (text: string) => ReactNode;

  // Sessions
  ftpSession: import('./PCPanel.types').FtpSession | null;
  pythonSession: import('./PCPanel.types').PythonSession | null;
  setPythonSession: React.Dispatch<React.SetStateAction<import('./PCPanel.types').PythonSession | null>>;
  editingFile: { path: string; content: string } | null;
  setEditingFile: (f: { path: string; content: string } | null) => void;

  // Console
  isConsoleConnected: boolean;
  setIsConsoleConnected: (v: boolean) => void;
  connectedDeviceId: string | null;
  setConnectedDeviceId: (id: string | null) => void;
  setConsoleConnectionTime: (t: number) => void;
  isConsoleInputDisabled: boolean;
  consoleNeedsPassword: boolean;
  consoleConfirmDialog: { show: boolean; message: string } | null;
  consoleReloadPending: boolean;
  consoleDevice: CanvasDevice | null;
  handleConnect: () => Promise<void>;
  onExecuteDeviceCommand?: (deviceId: string, command: string) => Promise<unknown>;
  setConsolePasswordAttempted: (v: boolean) => void;
  activeConsoleOutput: TerminalOutput[];

  // Reachability
  canReachTargetIp: (targetIp: string, options?: { protocol?: 'tcp' | 'udp' | 'icmp' | 'any'; port?: string }) => boolean;
  resolveDeviceNameTargetCallback: (raw: string) => { ip: string; label?: string } | null;

  // Refs needed by tabs
  applyDhcpLeaseRef: RefObject<((force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string } | null) | null>;
  manualDhcpClickRef: RefObject<boolean>;
  isDnsEditingRef: RefObject<boolean>;
  isDhcpEditingRef: RefObject<boolean>;

  // Active service sub-tab
  activeServiceTab: ServiceTabType;
  setActiveServiceTab: Dispatch<SetStateAction<ServiceTabType>> | ((tab: ServiceTabType) => void);

  // Service state: DNS
  serviceDnsEnabled: boolean;
  setServiceDnsEnabled: (v: boolean) => void;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  setServiceDnsRecords: (r: Array<{ domain: string; address: string }>) => void;
  dnsFormDomain: string;
  setDnsFormDomain: (v: string) => void;
  dnsFormAddress: string;
  setDnsFormAddress: (v: string) => void;
  handleAddDnsRecord: () => void;
  getDnsRecordDisplay: (record: { domain: string; address: string }) => string;

  // Service state: HTTP
  serviceHttpEnabled: boolean;
  setServiceHttpEnabled: (v: boolean) => void;
  serviceHttpContent: string;
  setServiceHttpContent: (c: string) => void;

  // Service state: FTP
  serviceFtpEnabled: boolean;
  setServiceFtpEnabled: (v: boolean) => void;
  serviceFtpFiles: PcFile[];
  setServiceFtpFiles: (f: PcFile[]) => void;

  // Service state: DHCP
  serviceDhcpEnabled: boolean;
  setServiceDhcpEnabled: (v: boolean) => void;
  serviceDhcpPools: DhcpPoolConfig[];
  setServiceDhcpPools: (p: DhcpPoolConfig[]) => void;
  dhcpForm: DhcpFormState;
  setDhcpForm: Dispatch<SetStateAction<DhcpFormState>>;
  editingDhcpIndex: number | null;
  setEditingDhcpIndex: (i: number | null) => void;

  // Service state: NTP
  serviceNtpEnabled: boolean;
  setServiceNtpEnabled: (v: boolean) => void;
  serviceNtpServer: string;
  setServiceNtpServer: (s: string) => void;
  serviceNtpServerError: string;
  setServiceNtpServerError: (e: string) => void;
  setServiceNtpServerPreset: (preset: 'pool.ntp.org' | 'local-clock' | 'custom') => void;
  serviceNtpDate: string;
  setServiceNtpDate: (d: string) => void;
  serviceNtpTime: string;
  setServiceNtpTime: (t: string) => void;
  applyNtpServerTime: (serverAddress: string) => { date: string; time: string } | null;
  ntpPanelTime: Date;
  ntpSyncState: unknown;

  // Service state: Mail
  serviceMailEnabled: boolean;
  setServiceMailEnabled: (v: boolean) => void;
  serviceMailDomain: string;
  setServiceMailDomain: (d: string) => void;
  serviceMailUsername: string;
  setServiceMailUsername: (u: string) => void;
  serviceMailPassword: string;
  setServiceMailPassword: (p: string) => void;
  serviceMailInbox: MailInboxItem[];
  setServiceMailInbox: Dispatch<SetStateAction<MailInboxItem[]>>;
  serviceMailSent: MailSentItem[];
  setServiceMailSent: Dispatch<SetStateAction<MailSentItem[]>>;
  mailPop3Blocked: boolean;
  handleComposeSend: (to: string, subject: string, body: string, onError: (err: string) => void, onSuccess: () => void) => void;
  handleViewReplySend: (replyBody: string, msg: MailItem, onError: (err: string) => void, onSuccess: () => void) => void;
  handleDeleteInbox: (index: number) => void;
  handleDeleteSent: (index: number) => void;

  // Service state: Syslog
  serviceSyslogEnabled: boolean;
  setServiceSyslogEnabled: (v: boolean) => void;
  serviceSyslogMessages: SyslogMessage[];
  setServiceSyslogMessages: (m: SyslogMessage[]) => void;

  // Validation
  validateIpField: (ip: string) => void;
  validateSubnetField: (subnet: string) => void;
  isValidIpAddress: (ip: string) => boolean;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;

  // Dispatch
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;

  // IoT
  iotDevices: CanvasDevice[];
  selectedIotDeviceId: string;
  setSelectedIotDeviceId: (id: string) => void;
  selectedIotDevice: CanvasDevice | null;
  iotSensorType: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light';
  setIotSensorType: (t: 'temperature' | 'sound' | 'motion' | 'humidity' | 'light') => void;
  iotKind: 'cooler' | 'lamp' | 'heater' | 'sensor';
  setIotKind: (k: 'cooler' | 'lamp' | 'heater' | 'sensor') => void;
  iotCollaborationEnabled: boolean;
  setIotCollaborationEnabled: (e: boolean) => void;
  iotDataStore: string;
  setIotDataStore: (d: string) => void;

  // Browser
  openWebPage: (target?: string, url?: string) => void;
  httpAppContent: string | null;
  setHttpAppContent: (c: string | null) => void;
  httpAppUrl: string;
  setHttpAppUrl: (u: string) => void;
  httpAppTitle: string;
  setHttpAppTitle: (t: string) => void;
  httpAppDeviceId: string | null;
  setHttpAppDeviceId: (id: string | null) => void;
  browserWindow: { x: number; y: number; width: number; height: number };
  setBrowserWindow: Dispatch<SetStateAction<{ x: number; y: number; width: number; height: number }>>;
  filteredSuggestions: string[];
  showUrlSuggestions: boolean;
  setShowUrlSuggestions: (v: boolean) => void;
  selectedSuggestionIndex: number;
  setSelectedSuggestionIndex: Dispatch<SetStateAction<number>>;
  urlInputRef: RefObject<HTMLInputElement | null>;
  dragStateRef: RefObject<{ startX: number; startY: number; originX: number; originY: number } | null>;
  resizeStateRef: RefObject<{ side: string; startX: number; startY: number; originX: number; originY: number; originW: number; originH: number } | null>;
  routerActiveTabRef: RefObject<string>;

  // ARP
  buildArpTableOutput: () => string;
  addPcArpEntry: (ip: string, mac: string, isIot?: boolean) => void;

  // FTP
  isFtpFilePickerOpen: boolean;
  setIsFtpFilePickerOpen: (v: boolean) => void;
  executeFtpPut: (fileName: string) => void | Promise<void>;
  handleFtpSessionCommand: (cmd: string) => void;
  getNtpNow: () => Date | null;

  // Launcher
  launcherApps: LauncherApp[];

  // Search
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  goToNextMatch: () => void;
  goToPrevMatch: () => void;
  searchMatchIndex: number;
  searchMatchCount: number;

  // Shell helpers
  formatFullDateTime: (date: Date) => string;
  handleCopyAll: () => void | Promise<void>;

  // Misc
  onClose: () => void;
}

export const PCPanelContext = createContext<PCPanelContextValue | null>(null);

export function usePCPanel(): PCPanelContextValue {
  const ctx = useContext(PCPanelContext);
  if (!ctx) throw new Error('usePCPanel must be used within PCPanelProvider');
  return ctx;
}
