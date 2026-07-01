'use client';


import { Input } from '@/components/ui/input';

interface NtpServiceConfigProps {
  isDark: boolean;
  language: string;
  serviceNtpEnabled: boolean;
  setServiceNtpEnabled: (val: boolean) => void;
  serviceNtpServer: string;
  serviceNtpDate: string;
  setServiceNtpDate: (val: string) => void;
  serviceNtpTime: string;
  setServiceNtpTime: (val: string) => void;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  serviceDnsEnabled: boolean;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
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
}

export function NtpServiceConfig({
  isDark,
  language,
  serviceNtpEnabled,
  setServiceNtpEnabled,
  serviceNtpServer,
  serviceNtpDate,
  setServiceNtpDate,
  serviceNtpTime,
  setServiceNtpTime,
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
  serviceDhcpEnabled,
  serviceDhcpPools,
}: NtpServiceConfigProps) {
  return (
    <div className="p-3 animate-in fade-in duration-200">
      <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">NTP Server</h3>
            <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
              {language === 'tr' ? 'Hizmeti aç/kapa ve tarih/saat ayarlayın.' : 'Toggle the service and set the date/time.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceNtpEnabled ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
              {serviceNtpEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={serviceNtpEnabled}
              onClick={() => {
                const enabled = !serviceNtpEnabled;
                setServiceNtpEnabled(enabled);
                dispatchDeviceConfig({
                  services: {
                    dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                    http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                    ftp: { enabled: serviceFtpEnabled },
                    mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                    ntp: { enabled, server: serviceNtpServer, date: serviceNtpDate, time: serviceNtpTime },
                    dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                  }
                });
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${serviceNtpEnabled ? 'bg-indigo-500/90 border-indigo-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceNtpEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            value={serviceNtpDate}
            onChange={(e) => {
              const newDate = e.target.value;
              setServiceNtpDate(newDate);
              dispatchDeviceConfig({
                services: {
                  ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: newDate, time: serviceNtpTime }
                }
              });
            }}
            aria-label={language === 'tr' ? 'NTP tarih' : 'NTP date'}
          />
          <Input
            type="time"
            value={serviceNtpTime}
            onChange={(e) => {
              const newTime = e.target.value;
              setServiceNtpTime(newTime);
              dispatchDeviceConfig({
                services: {
                  ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: serviceNtpDate, time: newTime }
                }
              });
            }}
            aria-label={language === 'tr' ? 'NTP saat' : 'NTP time'}
          />
        </div>
        <div className={`rounded-lg border p-3 text-xs ${isDark ? 'border-secondary-800 bg-secondary-950 text-secondary-300' : 'border-secondary-200 bg-secondary-50 text-secondary-600'}`}>
          {language === 'tr'
            ? 'Takvim ve saat bu sekmede düzenlenir. NTP sunucusu IP ayarları altında seçilir.'
            : 'Date and time are configured here. The NTP server is selected under IP settings.'}
        </div>
      </div>
    </div>
  );
}
