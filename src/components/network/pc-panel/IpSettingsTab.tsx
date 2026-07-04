'use client';

import React from 'react';
import { FormInput } from '@/components/ui/FormInput';
import { NetworkInputField } from './NetworkInputField';
import { isValidMAC, normalizeMAC } from "@/lib/utils";
import { errorHandler } from '@/lib/errors/errorHandler';
import { DHCP_ERRORS } from '@/lib/errors/errorHandler';
import { toast } from "@/hooks/use-toast";

interface IpSettingsTabProps {
  isDark: boolean;
  fontSize: number;
  mobileVerticalScrollStyle?: React.CSSProperties;
  pcIP: string;
  setPcIP: (val: string) => void;
  pcMAC: string;
  setPcMAC: (val: string) => void;
  ipConfigMode: 'static' | 'dhcp';
  setIpConfigMode: (val: 'static' | 'dhcp') => void;
  pcSubnet: string;
  setPcSubnet: (val: string) => void;
  pcGateway: string;
  setPcGateway: (val: string) => void;
  pcDNS: string;
  setPcDNS: (val: string) => void;
  pcIPv6: string;
  setPcIPv6: (val: string) => void;
  pcIPv6Prefix: string;
  setPcIPv6Prefix: (val: string) => void;
  internalPcHostname: string;
  setPcHostname: (val: string) => void;
  serviceNtpServer: string;
  setServiceNtpServer: (val: string) => void;
  serviceNtpServerError: string;
  setServiceNtpServerError: (val: string) => void;
  setServiceNtpServerPreset: React.Dispatch<React.SetStateAction<'pool.ntp.org' | 'time.google.com' | 'time.cloudflare.com' | 'local-clock' | 'custom'>>;
  serviceNtpEnabled: boolean;
  serviceNtpDate: string;
  serviceNtpTime: string;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  t: Record<string, string>;
  language: string;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  validateIpField: (ip: string) => void;
  validateSubnetField: (subnet: string) => void;
  isValidIpAddress: (ip: string) => boolean;
  applyNtpServerTime: (serverAddress: string) => { date: string; time: string } | null;
  deviceId: string;
  manualDhcpClickRef: React.RefObject<boolean>;
  applyDhcpLeaseRef: React.RefObject<((force?: boolean) => { ip: string; subnetMask: string; gateway: string; dns: string; serverName: string; poolName: string; } | null) | undefined>;
}

export function IpSettingsTab({
  isDark,
  pcIP,
  setPcIP,
  pcMAC,
  setPcMAC,
  ipConfigMode,
  setIpConfigMode,
  pcSubnet,
  setPcSubnet,
  pcGateway,
  setPcGateway,
  pcDNS,
  setPcDNS,
  pcIPv6,
  setPcIPv6,
  pcIPv6Prefix,
  setPcIPv6Prefix,
  internalPcHostname,
  setPcHostname,
  serviceNtpServer,
  setServiceNtpServer,
  serviceNtpServerError,
  setServiceNtpServerError,
  setServiceNtpServerPreset,
  serviceNtpEnabled,
  serviceNtpDate,
  serviceNtpTime,
  errors,
  setErrors,
  t,
  language,
  dispatchDeviceConfig,
  validateIpField,
  validateSubnetField,
  isValidIpAddress,
  applyNtpServerTime,
  deviceId,
  manualDhcpClickRef,
  applyDhcpLeaseRef,
}: IpSettingsTabProps) {

  return (
    <div className="flex-1 min-h-0 p-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
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
              className={`h-9 ${errors.mac ? 'border-error-500' : ''}`}
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
                const manualDhcpClick = manualDhcpClickRef.current;
                if (manualDhcpClick) return;
                if (manualDhcpClickRef.current !== null) {
                  // @ts-ignore
                  manualDhcpClickRef.current = true;
                }
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
                setTimeout(() => {
                  if (manualDhcpClickRef.current !== null) {
                    // @ts-ignore
                    manualDhcpClickRef.current = false;
                  }
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
          <NetworkInputField
            label={language === 'tr' ? 'IP Adresi' : 'IP Address'}
            value={pcIP}
            onChange={(newIp) => {
              setPcIP(newIp);
              setErrors(prev => { const { ip: _ip, ...rest } = prev; return rest; });
            }}
            placeholder="192.168.1.100"
            error={errors.ip}
            disabled={ipConfigMode === 'dhcp'}
            onBlur={(e) => validateIpField(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') validateIpField(e.currentTarget.value); }}
          />

          <NetworkInputField
            label={language === 'tr' ? 'Alt Ağ Maskesi' : 'Subnet Mask'}
            value={pcSubnet}
            onChange={(newSubnet) => {
              setPcSubnet(newSubnet);
              setErrors(prev => { const { subnet: _, ...rest } = prev; return rest; });
            }}
            placeholder="255.255.255.0"
            error={errors.subnet}
            disabled={ipConfigMode === 'dhcp'}
            onBlur={(e) => validateSubnetField(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') validateSubnetField(e.currentTarget.value); }}
          />

          <NetworkInputField
            label={language === 'tr' ? 'Ağ Geçidi' : 'Gateway'}
            value={pcGateway}
            onChange={(newGateway) => {
              setPcGateway(newGateway);
              dispatchDeviceConfig({ gateway: newGateway });
            }}
            placeholder="192.168.1.1"
            error={errors.gateway}
            disabled={ipConfigMode === 'dhcp'}
          />

          <NetworkInputField
            label={language === 'tr' ? 'DNS Sunucusu' : 'DNS Server'}
            value={pcDNS}
            onChange={(newDNS) => {
              setPcDNS(newDNS);
              dispatchDeviceConfig({ dns: newDNS });
            }}
            placeholder="8.8.8.8"
            error={errors.dns}
            disabled={ipConfigMode === 'dhcp'}
          />
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
          <NetworkInputField
            label={language === 'tr' ? 'IPv6 Adresi' : 'IPv6 Address'}
            value={pcIPv6}
            onChange={(newIPv6) => {
              setPcIPv6(newIPv6);
              dispatchDeviceConfig({ ipv6: newIPv6 });
            }}
            placeholder="2001:db8:acad:1::10"
            error={errors.ipv6}
          />

          <NetworkInputField
            label={language === 'tr' ? 'IPv6 Öneki' : 'IPv6 Prefix'}
            value={pcIPv6Prefix}
            onChange={(newPrefix) => {
              setPcIPv6Prefix(newPrefix);
              dispatchDeviceConfig({ ipv6Prefix: newPrefix });
            }}
            placeholder="64"
          />
        </div>
      </div>
    </div>
  );
}
