// Wireless Configuration and Session Types

import type { DeviceWifiSsidProfile } from '../wireless';

// WiFi Mode Types
export type WifiMode = 'ap' | 'client' | 'disabled' | 'sta';

export interface Dhcpv6Binding {
  iaid: string; // Identity Association ID (e.g. 0x00010001)
  duid: string; // Client DUID (e.g. 00:03:00:01:00:50:56:C0:00:01)
  ipv6Address: string; // Leased IPv6 address
  type: 'IA_NA' | 'IA_PD'; // Non-temporary Address or Prefix Delegation
  preferredLifetime: number; // e.g. 604800 sec
  validLifetime: number; // e.g. 2592000 sec
  interfaceId: string; // Ingress interface (e.g. Gi0/0)
  clientHostname?: string;
  leaseTime: number; // Timestamp when leased
}

export interface PppoeSession {
  sessionId: number; // e.g. 101
  clientDeviceId: string; // e.g. 'r1'
  clientInterfaceId: string; // e.g. 'gi0/0' or 'dialer1'
  clientMac: string;
  serverDeviceId: string; // e.g. 'r2'
  serverInterfaceId: string; // e.g. 'gi0/0'
  serverMac: string;
  discoveryState: 'IDLE' | 'PADI_SENT' | 'PADO_RCVD' | 'PADR_SENT' | 'PADS_RCVD' | 'ESTABLISHED';
  lcpState: 'Initial' | 'Starting' | 'ReqSent' | 'AckRcvd' | 'Opened';
  authProtocol: 'CHAP' | 'PAP' | 'NONE';
  authenticated: boolean;
  ipcpState: 'Initial' | 'ReqSent' | 'AckRcvd' | 'Opened';
  assignedIp: string;
  peerIp: string;
  primaryDns?: string;
  uptime: number; // seconds
}

export interface WifiConfig {
  enabled?: boolean;
  ssid: string;
  bssid?: string;
  password?: string;
  security?: 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3';
  channel?: '2.4GHz' | '5GHz' | string;
  mode: WifiMode;
  hidden?: boolean;
  maxClients?: number;
  macFilterEnabled?: boolean;
  macFilterMode?: 'allow' | 'deny';
  macFilterList?: string[];
  ssids?: DeviceWifiSsidProfile[];
  powerDisabled?: boolean;
  txPowerDbm?: number;
}

// Helper function to normalize WiFi config with defaults
export function normalizeWifiConfig(config: Partial<WifiConfig> & { ssid: string; mode: WifiMode }): WifiConfig {
  return {
    enabled: config.enabled ?? true,
    ssid: config.ssid,
    mode: config.mode,
    security: config.security ?? 'open',
    channel: config.channel ?? '2.4GHz',
    password: config.password,
    bssid: config.bssid,
    hidden: config.hidden,
    maxClients: config.maxClients,
    macFilterEnabled: config.macFilterEnabled,
    macFilterMode: config.macFilterMode,
    macFilterList: config.macFilterList,
    ssids: config.ssids,
    powerDisabled: config.powerDisabled,
  };
}

// Helper function to ensure WiFi config has required fields for wireless functions
export function ensureWifiConfig(config: Partial<WifiConfig> & { ssid: string; mode: WifiMode }): WifiConfig {
  return normalizeWifiConfig(config);
}

// Helper function to normalize security type
export function normalizeSecurityType(security: string | undefined): 'open' | 'wep' | 'wpa' | 'wpa2' | 'wpa3' {
  if (!security) return 'open';
  const normalized = security.toLowerCase();
  if (normalized === 'wpa3') return 'wpa3';
  if (normalized === 'wpa2') return 'wpa2';
  if (normalized === 'wpa') return 'wpa';
  if (normalized === 'wep') return 'wep';
  return 'open';
}
