'use client';

import { SyslogMessage, SYSLOG_SEVERITIES } from '@/lib/network/syslog';
import { useState, useEffect } from 'react';

interface SyslogServiceConfigProps {
  isDark: boolean;
  language: string;
  serviceSyslogEnabled: boolean;
  setServiceSyslogEnabled: (val: boolean) => void;
  serviceSyslogMessages: SyslogMessage[];
  setServiceSyslogMessages: (val: SyslogMessage[]) => void;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;

  // Need these to pass to dispatchDeviceConfig
  serviceDnsEnabled: boolean;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  serviceHttpEnabled: boolean;
  serviceHttpContent: string;
  serviceFtpEnabled: boolean;
  serviceMailEnabled: boolean;
  serviceMailDomain: string;
  serviceMailUsername: string;
  serviceMailPassword: string;
  serviceMailInbox: Array<any>;
  serviceMailSent: Array<any>;
  serviceNtpEnabled: boolean;
  serviceNtpServer: string;
  serviceNtpDate: string;
  serviceNtpTime: string;
  serviceDhcpEnabled: boolean;
  serviceDhcpPools: Array<any>;
}

export function SyslogServiceConfig({
  isDark,
  language,
  serviceSyslogEnabled,
  setServiceSyslogEnabled,
  serviceSyslogMessages,
  setServiceSyslogMessages,
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
}: SyslogServiceConfigProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('');

  useEffect(() => {
    if (!serviceSyslogEnabled) return;

    // Simulate incoming logs for demo purposes
    const interval = setInterval(() => {
      const severities = [1, 2, 3, 4, 5, 6, 7];
      const facilities = ['SYS', 'LINK', 'LINEPROTO', 'OSPF', 'IP'];
      const mnemonics = ['UPDOWN', 'CONFIG_I', 'CHANGED', 'NEIGHBOR_UP'];

      const sev = severities[Math.floor(Math.random() * severities.length)];
      const fac = facilities[Math.floor(Math.random() * facilities.length)];
      const mne = mnemonics[Math.floor(Math.random() * mnemonics.length)];

      const newMsg: SyslogMessage = {
        id: Math.random().toString(36).substring(2, 11),
        timestamp: Date.now(),
        sourceIp: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
        sourceName: 'Router' + Math.floor(Math.random() * 5 + 1),
        facility: fac,
        severity: sev,
        severityName: SYSLOG_SEVERITIES[sev],
        mnemonic: mne,
        message: 'Simulated network event occurred.'
      };

      const msgs = [...serviceSyslogMessages, newMsg];
      setServiceSyslogMessages(msgs.length > 500 ? msgs.slice(msgs.length - 500) : msgs);
    }, 15000); // Generate a message every 15 seconds

    return () => clearInterval(interval);
  }, [serviceSyslogEnabled, serviceSyslogMessages, setServiceSyslogMessages]);

  const filteredMessages = serviceSyslogMessages.filter(msg => {
    if (filterSeverity !== 'all' && msg.severity !== Number(filterSeverity)) {
      return false;
    }
    if (filterSource && !msg.sourceName.toLowerCase().includes(filterSource.toLowerCase()) && !msg.sourceIp.includes(filterSource)) {
      return false;
    }
    return true;
  });

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 0: case 1: case 2: case 3: return 'text-red-500'; // Error/Critical
      case 4: return 'text-orange-500'; // Warning
      case 5: case 6: return 'text-blue-500'; // Info/Notice
      case 7: return 'text-gray-500'; // Debug
      default: return 'text-gray-500';
    }
  };

  const handleClear = () => {
    setServiceSyslogMessages([]);
    dispatchDeviceConfig({
      services: {
        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
        ftp: { enabled: serviceFtpEnabled },
        mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
        ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: serviceNtpDate, time: serviceNtpTime },
        dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools },
        syslog: { enabled: serviceSyslogEnabled, messages: [] }
      }
    });
  };

  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    if (serviceSyslogMessages.length === 0) return;

    const text = serviceSyslogMessages.map(m =>
      `[${new Date(m.timestamp).toISOString()}] ${m.sourceIp} (${m.sourceName}) %${m.facility}-${m.severity}-${m.mnemonic}: ${m.message}`
    ).join('\n');

    // 1. Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }

    // 2. Trigger file download (.log file)
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `syslog-export-${new Date().toISOString().slice(0, 10)}.log`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback if Blob fails
    }

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="p-3 animate-in fade-in duration-200 flex flex-col h-full">
      <div className={`rounded-xl border p-4 flex-none space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-bold">Syslog Server</h3>
              <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                {language === 'tr' ? 'Ağ cihazlarından gelen günlük mesajlarını topla.' : 'Collect log messages from network devices.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceSyslogEnabled ? 'bg-primary-500/15 text-primary-600 border border-primary-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
              {serviceSyslogEnabled ? (language === 'tr' ? 'AÇIK' : 'ON') : (language === 'tr' ? 'KAPALI' : 'OFF')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={serviceSyslogEnabled}
            aria-label={serviceSyslogEnabled
              ? (language === 'tr' ? 'Syslog hizmetini kapat' : 'Disable syslog service')
              : (language === 'tr' ? 'Syslog hizmetini aç' : 'Enable syslog service')}
              onClick={() => {
                const enabled = !serviceSyslogEnabled;
                setServiceSyslogEnabled(enabled);
                dispatchDeviceConfig({
                  services: {
                    dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                    http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                    ftp: { enabled: serviceFtpEnabled },
                    mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                    ntp: { enabled: serviceNtpEnabled, server: serviceNtpServer, date: serviceNtpDate, time: serviceNtpTime },
                    dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools },
                    syslog: { enabled, messages: serviceSyslogMessages }
                  }
                });
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 ${serviceSyslogEnabled ? 'bg-primary-500/90 border-primary-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceSyslogEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className={`w-full text-xs rounded-md border p-1.5 ${isDark ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-secondary-300'}`}
            >
              <option value="all">{language === 'tr' ? 'Tüm Seviyeler' : 'All Severities'}</option>
              {Object.entries(SYSLOG_SEVERITIES).map(([level, name]) => (
                <option key={level} value={level}>{level} - {name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <input
              type="text"
              placeholder={language === 'tr' ? 'Kaynak cihaz (IP/İsim)' : 'Source device (IP/Name)'}
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className={`w-full text-xs rounded-md border p-1.5 ${isDark ? 'bg-secondary-800 border-secondary-700 text-white' : 'bg-white border-secondary-300'}`}
            />
          </div>
          <button
            onClick={handleClear}
            className={`px-3 py-1 text-xs rounded border ${isDark ? 'border-secondary-700 hover:bg-secondary-800 text-secondary-300' : 'border-secondary-300 hover:bg-secondary-100 text-secondary-600'}`}
          >
            {language === 'tr' ? 'Temizle' : 'Clear'}
          </button>
          <button
            onClick={handleExport}
            disabled={serviceSyslogMessages.length === 0}
            className={`px-3 py-1 text-xs rounded border flex items-center gap-1.5 transition-all ${
              exportSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 font-bold'
                : (isDark ? 'border-secondary-700 hover:bg-secondary-800 text-secondary-300 disabled:opacity-40' : 'border-secondary-300 hover:bg-secondary-100 text-secondary-600 disabled:opacity-40')
            }`}
          >
            <span>{exportSuccess ? (language === 'tr' ? '✓ Aktarıldı & İndirildi' : '✓ Exported & Downloaded') : (language === 'tr' ? 'Dışa Aktar (.log)' : 'Export (.log)')}</span>
          </button>
        </div>
      </div>

      <div className={`mt-4 flex-1 min-h-[200px] overflow-hidden flex flex-col rounded-xl border ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-xs text-left">
            <thead className={`sticky top-0 z-10 ${isDark ? 'bg-secondary-800 text-secondary-200' : 'bg-secondary-100 text-secondary-600'}`}>
              <tr>
                <th className="px-3 py-2 whitespace-nowrap">Time</th>
                <th className="px-3 py-2 whitespace-nowrap">Source</th>
                <th className="px-3 py-2 whitespace-nowrap">Severity</th>
                <th className="px-3 py-2 whitespace-nowrap">Facility</th>
                <th className="px-3 py-2 w-full">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200/10">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-secondary-500">
                    {language === 'tr' ? 'Mesaj bulunamadı' : 'No messages found'}
                  </td>
                </tr>
              ) : (
                filteredMessages.map(msg => (
                  <tr key={msg.id} className={isDark ? 'hover:bg-secondary-800/50' : 'hover:bg-secondary-50'}>
                    <td className="px-3 py-1.5 whitespace-nowrap opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {msg.sourceIp} ({msg.sourceName})
                    </td>
                    <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${getSeverityColor(msg.severity)}`}>
                      {msg.severity}-{msg.severityName}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {msg.facility}
                    </td>
                    <td className="px-3 py-1.5 break-all">
                      %{msg.facility}-{msg.severity}-{msg.mnemonic}: {msg.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
