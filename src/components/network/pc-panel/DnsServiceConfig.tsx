'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DnsServiceConfigProps {
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  serviceDnsEnabled: boolean;
  setServiceDnsEnabled: (val: boolean) => void;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  setServiceDnsRecords: (records: Array<{ domain: string; address: string }>) => void;
  dnsFormDomain: string;
  setDnsFormDomain: (val: string) => void;
  dnsFormAddress: string;
  setDnsFormAddress: (val: string) => void;
  handleAddDnsRecord: () => void;
  getDnsRecordDisplay: (record: { domain: string; address: string }) => string;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  serviceHttpEnabled: boolean;
  serviceHttpContent: string;
  serviceFtpEnabled: boolean;
  serviceMailEnabled: boolean;
  serviceMailDomain: string;
  serviceMailUsername: string;
  serviceMailPassword: string;
  serviceMailInbox: Array<{ from: string; subject: string; body: string; timestamp?: string }>;
  serviceMailSent: Array<{ to: string; subject: string; body: string; timestamp?: string }>;
  serviceDhcpEnabled: boolean;
  serviceDhcpPools: Array<{ poolName: string; defaultGateway: string; dnsServer: string; startIp: string; subnetMask: string; maxUsers: number }>;
  isDnsEditingRef: React.RefObject<boolean>;
}

export function DnsServiceConfig({
  isDark,
  language,
  t,
  serviceDnsEnabled,
  setServiceDnsEnabled,
  serviceDnsRecords,
  setServiceDnsRecords,
  dnsFormDomain,
  setDnsFormDomain,
  dnsFormAddress,
  setDnsFormAddress,
  handleAddDnsRecord,
  getDnsRecordDisplay,
  dispatchDeviceConfig,
  serviceHttpEnabled,
  serviceHttpContent,
  serviceFtpEnabled,
  serviceMailEnabled,
  serviceMailDomain,
  serviceMailUsername,
  serviceMailPassword,
  serviceMailInbox,
  serviceMailSent,
  serviceDhcpEnabled,
  serviceDhcpPools,
  isDnsEditingRef,
}: DnsServiceConfigProps) {
  return (
    <div className="p-3 animate-in fade-in duration-200">
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
                  if (isDnsEditingRef.current !== null) {
                    // @ts-ignore
                    isDnsEditingRef.current = true;
                  }
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
                  setTimeout(() => {
                    if (isDnsEditingRef.current !== null) {
                      // @ts-ignore
                      isDnsEditingRef.current = false;
                    }
                  }, 1000);
                }}
              >
                {t.delete}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
