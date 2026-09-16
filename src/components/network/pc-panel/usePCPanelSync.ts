import { useCallback, useEffect, type SetStateAction } from 'react';
import type { CanvasDevice } from '../NetworkTopology/types/networkTopology.types';
import { validateIP, validateIPv6 } from './pcPanelHelpers';
import { isValidMAC, normalizeMAC } from '@/lib/utils';

type PCPanelErrorMap = Record<string, string>;

type DnsRecord = { domain: string; address: string };
type FtpFile = { name: string; size: number; modifiedAt?: string };
type MailInboxEntry = { from: string; subject: string; body: string; timestamp?: string };
type MailSentEntry = { to: string; subject: string; body: string; timestamp?: string };
type DhcpPool = {
  poolName: string;
  defaultGateway: string;
  dnsServer: string;
  startIp: string;
  subnetMask: string;
  maxUsers: number;
};

export interface UsePCPanelSyncParams {
  deviceId: string;
  deviceFromTopology?: CanvasDevice;
  topologyDevices: CanvasDevice[];
  internalPcHostname: string;
  ipConfigMode: string;
  pcIP: string;
  pcMAC: string;
  pcSubnet: string;
  pcGateway: string;
  pcDNS: string;
  pcIPv6: string;
  pcIPv6Prefix: string;
  serviceDnsEnabled: boolean;
  serviceDnsRecords: DnsRecord[];
  serviceHttpEnabled: boolean;
  serviceHttpContent: string | null;
  serviceFtpEnabled: boolean;
  serviceFtpFiles: FtpFile[];
  serviceMailEnabled: boolean;
  serviceMailDomain: string;
  serviceMailUsername: string;
  serviceMailPassword: string;
  serviceMailInbox: MailInboxEntry[];
  serviceMailSent: MailSentEntry[];
  serviceNtpEnabled: boolean;
  serviceNtpServer: string;
  serviceNtpDate: string;
  serviceNtpTime: string;
  serviceDhcpEnabled: boolean;
  serviceDhcpPools: DhcpPool[];
  wifiEnabled: boolean;
  wifiSSID: string;
  wifiBSSID: string;
  wifiSecurity: string;
  wifiPassword: string;
  wifiChannel: number | string;
  setErrors: (updater: SetStateAction<PCPanelErrorMap>) => void;
  pcIpRef: React.MutableRefObject<string>;
  t: Record<string, string>;
}

export function usePCPanelSync({
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
}: UsePCPanelSyncParams) {

  const dispatchDeviceConfig = useCallback((config: Partial<CanvasDevice>) => {
    if (!deviceId) return;
    const nextConfig: Partial<CanvasDevice> = { ...config };
    if (config.services) {
      nextConfig.services = {
        ...deviceFromTopology?.services,
        ...config.services,
        ftp: {
          ...deviceFromTopology?.services?.ftp,
          ...config.services.ftp,
          enabled: config.services.ftp?.enabled ?? deviceFromTopology?.services?.ftp?.enabled ?? false,
        },
        mail: {
          ...deviceFromTopology?.services?.mail,
          ...config.services.mail,
          enabled: config.services.mail?.enabled ?? deviceFromTopology?.services?.mail?.enabled ?? false,
        },
        ntp: {
          ...deviceFromTopology?.services?.ntp,
          ...config.services.ntp,
          enabled: config.services.ntp?.enabled ?? deviceFromTopology?.services?.ntp?.enabled ?? false,
        },
      };
    }
    window.dispatchEvent(new CustomEvent('update-topology-device-config', {
      detail: { deviceId, config: nextConfig }
    }));
  }, [deviceId, deviceFromTopology?.services]);

  const syncToGlobal = useCallback(() => {
    const newErrors: PCPanelErrorMap = {};
    if (!validateIP(pcIP)) newErrors.ip = 'GeÃ§ersiz IP';
    if (!isValidMAC(pcMAC)) newErrors.mac = 'GeÃ§ersiz MAC';
    if (ipConfigMode === 'static') {
      if (pcSubnet && !validateIP(pcSubnet)) newErrors.subnet = 'GeÃ§ersiz Subnet';
      if (pcGateway && !validateIP(pcGateway)) newErrors.gateway = 'GeÃ§ersiz Gateway';
      if (pcDNS && !validateIP(pcDNS)) newErrors.dns = 'GeÃ§ersiz DNS';
    }
    if (pcIPv6 && !validateIPv6(pcIPv6)) newErrors.ipv6 = 'GeÃ§ersiz IPv6';

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
                content: serviceHttpContent || t.helloWorld || "" || ""
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
              },
              syslog: {
                enabled: deviceFromTopology?.services?.syslog?.enabled ?? false,
                messages: deviceFromTopology?.services?.syslog?.messages ?? []
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
  }, [internalPcHostname, ipConfigMode, pcIP, pcMAC, pcSubnet, pcGateway, pcDNS, pcIPv6, pcIPv6Prefix, serviceDnsEnabled, serviceDnsRecords, serviceHttpEnabled, serviceHttpContent, serviceFtpEnabled, serviceFtpFiles, serviceMailEnabled, serviceMailDomain, serviceMailUsername, serviceMailPassword, serviceMailInbox, serviceMailSent, serviceNtpEnabled, serviceNtpServer, serviceNtpDate, serviceNtpTime, serviceDhcpEnabled, serviceDhcpPools, wifiEnabled, wifiSSID, wifiBSSID, wifiSecurity, wifiPassword, wifiChannel, deviceId, topologyDevices, setErrors, t]);

  useEffect(() => {
    pcIpRef.current = pcIP;
  }, [pcIP, pcIpRef]);

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatchDeviceConfig({
        services: {
          dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
          http: { enabled: serviceHttpEnabled, content: serviceHttpContent || "" },
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
          syslog: {
            enabled: deviceFromTopology?.services?.syslog?.enabled ?? false,
            messages: deviceFromTopology?.services?.syslog?.messages ?? []
          }
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
    deviceFromTopology?.services?.syslog?.enabled,
    deviceFromTopology?.services?.syslog?.messages,
  ]);

  return { dispatchDeviceConfig, syncToGlobal };
}





