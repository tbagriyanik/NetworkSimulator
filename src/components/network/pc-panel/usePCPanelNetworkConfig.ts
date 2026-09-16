'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanvasConnection, CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import type { DhcpPoolConfig, PcFile } from './PCPanel.types';
import { checkConnectivity } from '@/lib/network/connectivity';
import { secureStorage } from '@/lib/storage/secureStorage';
import { loadFs, readFile, getFtpFilesFromUploadDir, syncMailFilesToFs, syncHttpContentToFs } from './pcFileSystem';

export interface UsePCPanelNetworkConfigOptions {
  deviceId: string;
  deviceFromTopology: CanvasDevice | undefined;
  defaultConfig: { ip: string; mac: string };
  t: Record<string, string>;
  activeServiceTab: string;
  topologyDevices: CanvasDevice[];
  topologyConnections: {
    sourceDeviceId: string;
    sourcePort: string;
    targetDeviceId: string;
    targetPort: string;
    cableType?: string;
    active?: boolean;
  }[];
  deviceStates: Map<string, SwitchState> | undefined;
  language: string;
}

export function usePCPanelNetworkConfig({
  deviceId,
  deviceFromTopology,
  defaultConfig,
  t,
  activeServiceTab,
  topologyDevices,
  topologyConnections,
  deviceStates,
  language,
}: UsePCPanelNetworkConfigOptions) {
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

  return {
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
  };
}
