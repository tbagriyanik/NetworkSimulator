import type React from 'react';
import { useEffect, useRef } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import type { DhcpPoolConfig, PcFile } from './PCPanel.types';
import { loadFs, readFile, getFtpFilesFromUploadDir } from './pcFileSystem';
import { secureStorage } from '@/lib/storage/secureStorage';

interface UsePCPanelDeviceSyncOptions {
  isVisible: boolean;
  deviceId: string;
  deviceFromTopology: CanvasDevice | undefined;
  defaultConfig: { ip: string; mac: string };
  helloWorld: string;
  setInternalPcHostname: (v: string) => void;
  setPcMAC: (v: string) => void;
  setPcIP: (v: string) => void;
  setPcSubnet: (v: string) => void;
  setPcGateway: (v: string) => void;
  setPcDNS: (v: string) => void;
  setPcIPv6: (v: string) => void;
  setPcIPv6Prefix: (v: string) => void;
  setIpConfigMode: React.Dispatch<React.SetStateAction<'static' | 'dhcp'>>;
  setServiceDnsEnabled: (v: boolean) => void;
  setServiceDnsRecords: (r: Array<{ domain: string; address: string }>) => void;
  setServiceHttpEnabled: (v: boolean) => void;
  setServiceHttpContent: (c: string) => void;
  setServiceFtpEnabled: (v: boolean) => void;
  setServiceFtpFiles: (f: PcFile[]) => void;
  setServiceMailEnabled: (v: boolean) => void;
  setServiceMailDomain: (d: string) => void;
  setServiceMailUsername: (u: string) => void;
  setServiceMailPassword: (p: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setServiceMailInbox: (v: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setServiceMailSent: (v: any) => void;
  setServiceNtpEnabled: (v: boolean) => void;
  setServiceNtpServer: (s: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setServiceNtpServerPreset: (v: any) => void;
  setServiceNtpDate: (d: string) => void;
  setServiceNtpTime: (t: string) => void;
  setServiceDhcpEnabled: (v: boolean) => void;
  setServiceDhcpPools: (p: DhcpPoolConfig[]) => void;
  setDnsFormDomain: (v: string) => void;
  setDnsFormAddress: (v: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDhcpForm: (v: any) => void;
  setEditingDhcpIndex: (i: number | null) => void;
  setWifiEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setWifiSSID: (s: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWifiSecurity: (s: any) => void;
  setWifiPassword: (p: string) => void;
  setWifiChannel: (c: string) => void;
  setWifiBSSID: (b: string) => void;
}

/**
 * Refreshes local form state when switching devices or when topology data
 * changes externally. Extracted from PCPanel orchestrator.
 */
export function usePCPanelDeviceSync({
  isVisible,
  deviceId,
  deviceFromTopology,
  defaultConfig,
  helloWorld,
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
}: UsePCPanelDeviceSyncOptions) {
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
      setServiceHttpEnabled(deviceFromTopology?.services?.http?.enabled ?? true);
      const fs = loadFs(deviceId);
      const wwwIndex = readFile(fs, 'C:\\www\\index.html') || readFile(fs, 'www/index.html');
      setServiceHttpContent(wwwIndex || deviceFromTopology?.services?.http?.content || helloWorld);
      setServiceFtpEnabled(deviceFromTopology?.services?.ftp?.enabled ?? false);
      setServiceFtpFiles(getFtpFilesFromUploadDir(deviceId));
      setServiceMailEnabled(deviceFromTopology?.services?.mail?.enabled ?? false);
      setServiceMailDomain(deviceFromTopology?.services?.mail?.domain || 'local.lan');
      setServiceMailUsername(deviceFromTopology?.services?.mail?.username || 'user');
      setServiceMailPassword(deviceFromTopology?.services?.mail?.password || 'mail123');

      let inboxFromStorage = null;
      let sentFromStorage = null;
      if (typeof window !== 'undefined') {
        try {
          const storedInbox = secureStorage.getItem(`mail_inbox_${deviceId}`);
          if (storedInbox) inboxFromStorage = JSON.parse(storedInbox);
          const storedSent = secureStorage.getItem(`mail_sent_${deviceId}`);
          if (storedSent) sentFromStorage = JSON.parse(storedSent);
        } catch { }
      }
      setServiceMailInbox(inboxFromStorage || deviceFromTopology?.services?.mail?.inbox || []);
      setServiceMailSent(sentFromStorage || deviceFromTopology?.services?.mail?.sent || []);
      setServiceNtpEnabled(deviceFromTopology?.services?.ntp?.enabled ?? false);
      setServiceNtpServer(deviceFromTopology?.services?.ntp?.server || '');
      setServiceNtpServerPreset(
        deviceFromTopology?.services?.ntp?.server === 'pool.ntp.org'
          ? 'pool.ntp.org'
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
      setWifiEnabled((deviceFromTopology?.wifi?.enabled ?? false) && !(deviceFromTopology?.wifi?.powerDisabled ?? false));
      setWifiSSID(deviceFromTopology?.wifi?.ssid ?? '');
      setWifiSecurity(deviceFromTopology?.wifi?.security ?? 'open');
      setWifiPassword(deviceFromTopology?.wifi?.password ?? '');
      setWifiChannel(deviceFromTopology?.wifi?.channel ?? '2.4GHz');
      setWifiBSSID(deviceFromTopology?.wifi?.bssid ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultConfig.ip, defaultConfig.mac, deviceFromTopology, deviceId]);
}

