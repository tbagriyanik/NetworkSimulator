'use client';

import React from 'react';
import { Globe, Network, Download, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DnsServiceConfig } from './DnsServiceConfig';
import { HttpServiceConfig } from './HttpServiceConfig';
import { DhcpServiceConfig } from './DhcpServiceConfig';
import { NtpServiceConfig } from './NtpServiceConfig';
import { MailServiceConfig } from './MailServiceConfig';
import type { DhcpPoolConfig, PcFile } from './PCPanel.types';

interface ServicesTabProps {
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  activeServiceTab: 'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp';
  setActiveServiceTab: (tab: 'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp') => void;
  mobileVerticalScrollStyle?: React.CSSProperties;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;

  // DNS
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
  isDnsEditingRef: React.RefObject<boolean>;

  // HTTP
  serviceHttpEnabled: boolean;
  setServiceHttpEnabled: (val: boolean) => void;
  serviceHttpContent: string;
  setServiceHttpContent: (val: string) => void;

  // FTP
  serviceFtpEnabled: boolean;
  setServiceFtpEnabled: (val: boolean) => void;
  serviceFtpFiles: PcFile[];
  setServiceFtpFiles: (files: PcFile[]) => void;

  // DHCP
  serviceDhcpEnabled: boolean;
  setServiceDhcpEnabled: (val: boolean) => void;
  serviceDhcpPools: DhcpPoolConfig[];
  setServiceDhcpPools: (pools: DhcpPoolConfig[]) => void;
  dhcpForm: DhcpPoolConfig;
  setDhcpForm: React.Dispatch<React.SetStateAction<DhcpPoolConfig>>;
  editingDhcpIndex: number | null;
  setEditingDhcpIndex: (val: number | null) => void;
  isDhcpEditingRef: React.RefObject<boolean>;

  // NTP
  serviceNtpEnabled: boolean;
  setServiceNtpEnabled: (val: boolean) => void;
  serviceNtpServer: string;
  serviceNtpDate: string;
  setServiceNtpDate: (val: string) => void;
  serviceNtpTime: string;
  setServiceNtpTime: (val: string) => void;

  // MAIL
  serviceMailEnabled: boolean;
  setServiceMailEnabled: (val: boolean) => void;
  serviceMailDomain: string;
  setServiceMailDomain: (val: string) => void;
  serviceMailUsername: string;
  setServiceMailUsername: (val: string) => void;
  serviceMailPassword: string;
  setServiceMailPassword: (val: string) => void;
  serviceMailInbox: Array<{ from: string; subject: string; body: string; timestamp?: string }>;
  setServiceMailInbox: React.Dispatch<React.SetStateAction<Array<{ from: string; subject: string; body: string; timestamp?: string }>>>;
  serviceMailSent: Array<{ to: string; subject: string; body: string; timestamp?: string }>;
  setServiceMailSent: React.Dispatch<React.SetStateAction<Array<{ to: string; subject: string; body: string; timestamp?: string }>>>;
  mailPop3Blocked: boolean;
  handleComposeSend: (to: string, subject: string, body: string, onError: (err: string) => void, onSuccess: () => void) => void;
  handleViewReplySend: (replyBody: string, msg: { from?: string; to?: string; subject: string; body: string; timestamp?: string }, onError: (err: string) => void, onSuccess: () => void) => void;
  handleDeleteInbox: (index: number) => void;
  handleDeleteSent: (index: number) => void;
}

export function ServicesTab({
  isDark,
  language,
  t,
  activeServiceTab,
  setActiveServiceTab,
  mobileVerticalScrollStyle,
  dispatchDeviceConfig,

  // DNS
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
  isDnsEditingRef,

  // HTTP
  serviceHttpEnabled,
  setServiceHttpEnabled,
  serviceHttpContent,
  setServiceHttpContent,

  // FTP
  serviceFtpEnabled,
  setServiceFtpEnabled,
  serviceFtpFiles,
  setServiceFtpFiles,

  // DHCP
  serviceDhcpEnabled,
  setServiceDhcpEnabled,
  serviceDhcpPools,
  setServiceDhcpPools,
  dhcpForm,
  setDhcpForm,
  editingDhcpIndex,
  setEditingDhcpIndex,
  isDhcpEditingRef,

  // NTP
  serviceNtpEnabled,
  setServiceNtpEnabled,
  serviceNtpServer,
  serviceNtpDate,
  setServiceNtpDate,
  serviceNtpTime,
  setServiceNtpTime,

  // MAIL
  serviceMailEnabled,
  setServiceMailEnabled,
  serviceMailDomain,
  setServiceMailDomain,
  serviceMailUsername,
  setServiceMailUsername,
  serviceMailPassword,
  setServiceMailPassword,
  serviceMailInbox,
  setServiceMailInbox,
  serviceMailSent,
  setServiceMailSent,
  mailPop3Blocked,
  handleComposeSend,
  handleViewReplySend,
  handleDeleteInbox,
  handleDeleteSent,
}: ServicesTabProps) {

  const serviceTabClass = (tab: 'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp') => cn(
    'relative inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-xs font-semibold transition-all duration-200 ease-out focus-ring-animate',
    activeServiceTab === tab
      ? isDark
        ? 'bg-secondary-900 text-white border-secondary-600 shadow-[0_-2px_8px_rgba(0,0,0,0.3)]'
        : 'bg-white text-secondary-900 border-secondary-300 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]'
      : isDark
        ? 'bg-secondary-950/40 text-secondary-400 border-transparent hover:text-secondary-200 hover:bg-secondary-900/60'
        : 'bg-secondary-100/80 text-secondary-500 border-transparent hover:text-secondary-700 hover:bg-secondary-50'
  );

  const getServiceTabIcon = (tab: 'dns' | 'http' | 'dhcp' | 'ftp' | 'mail' | 'ntp') => {
    switch (tab) {
      case 'dns':
        return <Globe className="w-3.5 h-3.5" />;
      case 'http':
        return <Globe className="w-3.5 h-3.5" />;
      case 'dhcp':
        return <Network className="w-3.5 h-3.5" />;
      case 'ftp':
        return <Download className="w-3.5 h-3.5" />;
      case 'mail':
        return <Settings className="w-3.5 h-3.5" />;
      case 'ntp':
        return <History className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={mobileVerticalScrollStyle}
    >
      {/* Inner Tabs for Services - Modern Style */}
      <div className={`flex items-end gap-1 px-4 pt-3 border-b ${isDark ? 'border-secondary-700/50 bg-gradient-to-b from-secondary-900/20 to-transparent' : 'border-secondary-200 bg-gradient-to-b from-secondary-50/50 to-transparent'}`}>
        {(['dns', 'http', 'dhcp', 'ftp', 'mail', 'ntp'] as const).map((tab) => (
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
              (tab === 'dhcp' && serviceDhcpEnabled) ||
              (tab === 'ftp' && serviceFtpEnabled) ||
              (tab === 'mail' && serviceMailEnabled) ||
              (tab === 'ntp' && serviceNtpEnabled)) && (
                <span className={cn(
                  'w-2 h-2 rounded-full animate-pulse',
                  isDark ? 'bg-success-400' : 'bg-success-500'
                )} />
              )}
          </button>
        ))}
      </div>

      {/* Service Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {activeServiceTab === 'dns' && (
          <DnsServiceConfig
            isDark={isDark}
            language={language}
            t={t}
            serviceDnsEnabled={serviceDnsEnabled}
            setServiceDnsEnabled={setServiceDnsEnabled}
            serviceDnsRecords={serviceDnsRecords}
            setServiceDnsRecords={setServiceDnsRecords}
            dnsFormDomain={dnsFormDomain}
            setDnsFormDomain={dnsFormDomain => setDnsFormDomain(dnsFormDomain)}
            dnsFormAddress={dnsFormAddress}
            setDnsFormAddress={dnsFormAddress => setDnsFormAddress(dnsFormAddress)}
            handleAddDnsRecord={handleAddDnsRecord}
            getDnsRecordDisplay={getDnsRecordDisplay}
            dispatchDeviceConfig={dispatchDeviceConfig}
            serviceHttpEnabled={serviceHttpEnabled}
            serviceHttpContent={serviceHttpContent}
            serviceFtpEnabled={serviceFtpEnabled}
            serviceMailEnabled={serviceMailEnabled}
            serviceMailDomain={serviceMailDomain}
            serviceMailUsername={serviceMailUsername}
            serviceMailPassword={serviceMailPassword}
            serviceMailInbox={serviceMailInbox}
            serviceMailSent={serviceMailSent}
            serviceDhcpEnabled={serviceDhcpEnabled}
            serviceDhcpPools={serviceDhcpPools}
            isDnsEditingRef={isDnsEditingRef}
          />
        )}

        {activeServiceTab === 'http' && (
          <HttpServiceConfig
            isDark={isDark}
            language={language}
            t={t}
            serviceHttpEnabled={serviceHttpEnabled}
            setServiceHttpEnabled={setServiceHttpEnabled}
            serviceHttpContent={serviceHttpContent}
            setServiceHttpContent={setServiceHttpContent}
            dispatchDeviceConfig={dispatchDeviceConfig}
            serviceDnsEnabled={serviceDnsEnabled}
            serviceDnsRecords={serviceDnsRecords}
            serviceFtpEnabled={serviceFtpEnabled}
            serviceMailEnabled={serviceMailEnabled}
            serviceMailDomain={serviceMailDomain}
            serviceMailUsername={serviceMailUsername}
            serviceMailPassword={serviceMailPassword}
            serviceMailInbox={serviceMailInbox}
            serviceMailSent={serviceMailSent}
            serviceDhcpEnabled={serviceDhcpEnabled}
            serviceDhcpPools={serviceDhcpPools}
          />
        )}

        {activeServiceTab === 'dhcp' && (
          <DhcpServiceConfig
            isDark={isDark}
            language={language}
            t={t}
            serviceDhcpEnabled={serviceDhcpEnabled}
            setServiceDhcpEnabled={setServiceDhcpEnabled}
            serviceDhcpPools={serviceDhcpPools}
            setServiceDhcpPools={setServiceDhcpPools}
            dhcpForm={dhcpForm}
            setDhcpForm={setDhcpForm}
            editingDhcpIndex={editingDhcpIndex}
            setEditingDhcpIndex={setEditingDhcpIndex}
            dispatchDeviceConfig={dispatchDeviceConfig}
            serviceDnsEnabled={serviceDnsEnabled}
            serviceDnsRecords={serviceDnsRecords}
            serviceHttpEnabled={serviceHttpEnabled}
            serviceHttpContent={serviceHttpContent}
            isDhcpEditingRef={isDhcpEditingRef}
          />
        )}

        {activeServiceTab === 'ftp' && (
          <div className="p-3 animate-in fade-in duration-200">
            <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">FTP (File Transfer Protocol - dosya aktarımı)</h3>
                  <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                    {language === 'tr' ? 'Basit FTP sunucu ayarları.' : 'Basic FTP server settings.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceFtpEnabled ? 'bg-accent-500/15 text-accent-600 border border-accent-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                    {serviceFtpEnabled ? 'ON' : 'OFF'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={serviceFtpEnabled}
                    onClick={() => {
                      const enabled = !serviceFtpEnabled;
                      setServiceFtpEnabled(enabled);
                      dispatchDeviceConfig({
                        services: {
                          dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                          http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                          ftp: { enabled },
                          mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                          dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                        }
                      });
                    }}
                    className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 ${serviceFtpEnabled ? 'bg-accent-500/90 border-accent-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceFtpEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider opacity-60">
                  {language === 'tr' ? 'Dosya Listesi' : 'File List'}
                </div>
                <div className={`rounded-lg border divide-y ${isDark ? 'border-secondary-800 divide-secondary-800' : 'border-secondary-200 divide-secondary-200'}`}>
                  {(serviceFtpFiles.length > 0 ? serviceFtpFiles : []).map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-mono truncate">{file.name}</div>
                        <div className="opacity-50">
                          {file.size} B{file.modifiedAt ? ` · ${new Date(file.modifiedAt).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const nextFiles = serviceFtpFiles.filter((f) => f.name !== file.name);
                          setServiceFtpFiles(nextFiles);
                          dispatchDeviceConfig({
                            services: {
                              dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                              http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                              ftp: { enabled: serviceFtpEnabled, files: nextFiles },
                              mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                              ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: serviceNtpDate, time: serviceNtpTime },
                              dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                            }
                          });
                        }}
                      >
                        {language === 'tr' ? 'Sil' : 'Delete'}
                      </Button>
                    </div>
                  ))}
                  {serviceFtpFiles.length === 0 && (
                    <div className="px-3 py-3 text-xs opacity-50">
                      {language === 'tr' ? 'Dosya yok' : 'No files'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeServiceTab === 'mail' && (
          <MailServiceConfig
            isDark={isDark}
            language={language}
            t={t}
            serviceMailEnabled={serviceMailEnabled}
            setServiceMailEnabled={setServiceMailEnabled}
            serviceMailDomain={serviceMailDomain}
            setServiceMailDomain={setServiceMailDomain}
            serviceMailUsername={serviceMailUsername}
            setServiceMailUsername={setServiceMailUsername}
            serviceMailPassword={serviceMailPassword}
            setServiceMailPassword={setServiceMailPassword}
            serviceMailInbox={serviceMailInbox}
            setServiceMailInbox={setServiceMailInbox}
            serviceMailSent={serviceMailSent}
            setServiceMailSent={setServiceMailSent}
            dispatchDeviceConfig={dispatchDeviceConfig}
            serviceDnsEnabled={serviceDnsEnabled}
            serviceDnsRecords={serviceDnsRecords}
            serviceHttpEnabled={serviceHttpEnabled}
            serviceHttpContent={serviceHttpContent}
            serviceFtpEnabled={serviceFtpEnabled}
            serviceDhcpEnabled={serviceDhcpEnabled}
            serviceDhcpPools={serviceDhcpPools}
            mailPop3Blocked={mailPop3Blocked}
            handleComposeSend={handleComposeSend}
            handleViewReplySend={handleViewReplySend}
            handleDeleteInbox={handleDeleteInbox}
            handleDeleteSent={handleDeleteSent}
          />
        )}

        {activeServiceTab === 'ntp' && (
          <NtpServiceConfig
            isDark={isDark}
            language={language}
            serviceNtpEnabled={serviceNtpEnabled}
            setServiceNtpEnabled={setServiceNtpEnabled}
            serviceNtpServer={serviceNtpServer}
            serviceNtpDate={serviceNtpDate}
            setServiceNtpDate={setServiceNtpDate}
            serviceNtpTime={serviceNtpTime}
            setServiceNtpTime={setServiceNtpTime}
            dispatchDeviceConfig={dispatchDeviceConfig}
            serviceDnsEnabled={serviceDnsEnabled}
            serviceDnsRecords={serviceDnsRecords}
            serviceHttpEnabled={serviceHttpEnabled}
            serviceHttpContent={serviceHttpContent}
            serviceFtpEnabled={serviceFtpEnabled}
            serviceMailEnabled={serviceMailEnabled}
            serviceMailDomain={serviceMailDomain}
            serviceMailUsername={serviceMailUsername}
            serviceMailPassword={serviceMailPassword}
            serviceMailInbox={serviceMailInbox}
            serviceMailSent={serviceMailSent}
            serviceDhcpEnabled={serviceDhcpEnabled}
            serviceDhcpPools={serviceDhcpPools}
          />
        )}
      </div>
    </div>
  );
}
