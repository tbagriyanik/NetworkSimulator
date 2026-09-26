'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileCode, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { sanitizeHTTPContent } from '@/lib/security/sanitizer';
import { syncHttpContentToFs } from './pcFileSystem';

interface HttpServiceConfigProps {
  deviceId?: string;
  onEditFile?: (filePath: string) => void;
  isDark: boolean;
  language: string;
  t: Record<string, string>;
  serviceHttpEnabled: boolean;
  setServiceHttpEnabled: (val: boolean) => void;
  serviceHttpContent: string;
  setServiceHttpContent: (val: string) => void;
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  serviceDnsEnabled: boolean;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
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

export function HttpServiceConfig({
  deviceId,
  onEditFile,
  isDark,
  language,
  t,
  serviceHttpEnabled,
  setServiceHttpEnabled,
  serviceHttpContent,
  setServiceHttpContent,
  dispatchDeviceConfig,
  serviceDnsEnabled,
  serviceDnsRecords,
  serviceFtpEnabled,
  serviceMailEnabled,
  serviceMailDomain,
  serviceMailUsername,
  serviceMailPassword,
  serviceMailInbox,
  serviceMailSent,
  serviceDhcpEnabled,
  serviceDhcpPools,
}: HttpServiceConfigProps) {
  const httpContentRef = useRef<HTMLTextAreaElement>(null);

  const updateContent = (val: string) => {
    setServiceHttpContent(val);
    if (deviceId) {
      syncHttpContentToFs(deviceId, val);
    }
  };

  const applyHttpFormatting = (tag: 'b' | 'i' | 'u' | 'a' | 'img') => {
    const el = httpContentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    let formatted = '';
    if (tag === 'img') {
      formatted = selected ? `<img src="${selected}" alt="image" />` : `<img src="https://via.placeholder.com/150" alt="image" />`;
    } else if (tag === 'a') {
      formatted = `<a href="${selected || 'http://'}">${selected || 'Link'}</a>`;
    } else {
      formatted = `<${tag}>${selected}</${tag}>`;
    }
    const nextValue = text.substring(0, start) + formatted + text.substring(end);
    updateContent(nextValue);
    dispatchDeviceConfig({
      services: {
        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
        http: { enabled: serviceHttpEnabled, content: nextValue },
        ftp: { enabled: serviceFtpEnabled },
        mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
        dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
      }
    });
    // Restore selection
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start, start + formatted.length);
    }, 50);
  };

  return (
    <div className="p-3 animate-in fade-in duration-200">
      <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">
              {language === 'tr'
                ? 'HTTP (Hypertext Transfer Protocol - web içeriği)'
                : 'HTTP (Hypertext Transfer Protocol - web content)'}
            </h3>
            <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
              {t.httpServiceDescription}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceHttpEnabled ? 'bg-success-500/15 text-success-600 border border-success-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
              {serviceHttpEnabled ? (language === 'tr' ? 'AÇIK' : 'ON') : (language === 'tr' ? 'KAPALI' : 'OFF')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={serviceHttpEnabled}
              aria-label={serviceHttpEnabled
                ? (language === 'tr' ? 'HTTP hizmetini kapat' : 'Disable HTTP service')
                : (language === 'tr' ? 'HTTP hizmetini aç' : 'Enable HTTP service')}
              onClick={() => {
                const enabled = !serviceHttpEnabled;
                setServiceHttpEnabled(enabled);
                dispatchDeviceConfig({
                  services: {
                    dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                    http: { enabled, content: serviceHttpContent },
                    ftp: { enabled: serviceFtpEnabled },
                    mail: { enabled: serviceMailEnabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                    dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                  }
                });
              }}
              className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500/60 ${serviceHttpEnabled
                ? 'bg-success-500/90 border-success-400'
                : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')
                }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceHttpEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label htmlFor="http-content-textarea" className="text-xs font-bold tracking-wide text-secondary-500">HTTP Content (C:\www\index.html)</label>
            {onEditFile && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onEditFile('C:\\www\\index.html')}
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border-sky-500/30 shrink-0"
              >
                <FileCode className="w-3.5 h-3.5" />
                {language === 'tr' ? 'Gelişmiş Düzenleyici' : 'Advanced Editor'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button type="button" size="icon" variant="outline" title="Kalın (<b>)" className="h-8 w-8 text-xs font-black" onClick={() => applyHttpFormatting('b')}>B</Button>
              <Button type="button" size="icon" variant="outline" title="İtalik (<i>)" className="h-8 w-8 text-xs font-black italic" onClick={() => applyHttpFormatting('i')}>I</Button>
              <Button type="button" size="icon" variant="outline" title="Altı Çizili (<u>)" className="h-8 w-8 text-xs font-black underline" onClick={() => applyHttpFormatting('u')}>U</Button>
              <Button type="button" size="icon" variant="outline" title="Bağlantı (<a>)" className="h-8 w-8 text-xs font-semibold gap-1" onClick={() => applyHttpFormatting('a')}><LinkIcon className="w-3.5 h-3.5" /></Button>
              <Button type="button" size="icon" variant="outline" title="Resim (<img>)" className="h-8 w-8 text-xs font-semibold gap-1" onClick={() => applyHttpFormatting('img')}><ImageIcon className="w-3.5 h-3.5" /></Button>
            </div>
            <span className="text-[10px] text-secondary-500">{language === 'tr' ? 'Seçili metni biçimlendir' : 'Format selected text'}</span>
          </div>
          <textarea
            id="http-content-textarea"
            ref={httpContentRef}
            value={serviceHttpContent}
            onChange={(e) => updateContent(e.target.value)}
            placeholder={t.helloWorld}
            rows={6}
            className={`w-full rounded-lg border px-3 py-2 text-sm font-mono resize-y ${isDark ? 'bg-secondary-900 border-secondary-700 text-secondary-200' : 'bg-white border-secondary-300 text-secondary-700'}`}
          />
          {serviceHttpEnabled && (
            <div
              className={`text-xs rounded-lg px-3 py-2 overflow-hidden ${isDark ? 'bg-secondary-950 border border-secondary-800 text-secondary-200' : 'bg-secondary-50 border border-secondary-200 text-secondary-700'}`}
              style={{ contain: 'layout style paint', willChange: 'auto' }}
            >
              <span dangerouslySetInnerHTML={{ __html: sanitizeHTTPContent(serviceHttpContent || t.helloWorld) }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
