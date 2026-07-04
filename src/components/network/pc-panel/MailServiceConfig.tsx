'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, Reply, Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MailServiceConfigProps {
  isDark: boolean;
  language: string;
  t: Record<string, string>;
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
  dispatchDeviceConfig: (config: Record<string, unknown>) => void;
  serviceDnsEnabled: boolean;
  serviceDnsRecords: Array<{ domain: string; address: string }>;
  serviceHttpEnabled: boolean;
  serviceHttpContent: string;
  serviceFtpEnabled: boolean;
  serviceDhcpEnabled: boolean;
  serviceDhcpPools: Array<{ poolName: string; defaultGateway: string; dnsServer: string; startIp: string; subnetMask: string; maxUsers: number }>;
  mailPop3Blocked: boolean;
  handleComposeSend: (to: string, subject: string, body: string, onError: (err: string) => void, onSuccess: () => void) => void;
  handleViewReplySend: (replyBody: string, msg: { from?: string; to?: string; subject: string; body: string; timestamp?: string }, onError: (err: string) => void, onSuccess: () => void) => void;
  handleDeleteInbox: (index: number) => void;
  handleDeleteSent: (index: number) => void;
}

export function MailServiceConfig({
  isDark,
  language,
  serviceMailEnabled,
  setServiceMailEnabled,
  serviceMailDomain,
  setServiceMailDomain,
  serviceMailUsername,
  setServiceMailUsername,
  serviceMailPassword,
  serviceMailInbox,
  serviceMailSent,
  dispatchDeviceConfig,
  serviceDnsEnabled,
  serviceDnsRecords,
  serviceHttpEnabled,
  serviceHttpContent,
  serviceFtpEnabled,
  serviceDhcpEnabled,
  serviceDhcpPools,
  mailPop3Blocked,
  handleComposeSend,
  handleViewReplySend,
  handleDeleteInbox,
  handleDeleteSent,
}: MailServiceConfigProps) {
  const [composeMode, setComposeMode] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [viewingMsg, setViewingMsg] = useState<{ type: 'inbox' | 'sent'; msg: { from?: string; to?: string; subject: string; body: string; timestamp?: string }; idx: number } | null>(null);
  const [viewReplyBody, setViewReplyBody] = useState('');
  const [mailError, setMailError] = useState('');

  const triggerSend = () => {
    handleComposeSend(composeTo, composeSubject, composeBody, (err) => setMailError(err), () => {
      setComposeMode(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setMailError('');
    });
  };

  const triggerReply = () => {
    if (!viewingMsg) return;
    handleViewReplySend(viewReplyBody, viewingMsg.msg, (err) => setMailError(err), () => {
      setViewingMsg(null);
      setViewReplyBody('');
      setMailError('');
    });
  };

  return (
    <div className="p-3 animate-in fade-in duration-200">
      <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-secondary-800 bg-secondary-900/40' : 'border-secondary-200 bg-white'}`}>
        <div className="flex items-center justify-between gap-3">
          {composeMode || viewingMsg ? (
            <>
              <button onClick={() => { setComposeMode(false); setViewingMsg(null); setViewReplyBody(''); }} className={`p-1.5 rounded transition-colors ${isDark ? 'hover:bg-secondary-800 text-secondary-300' : 'hover:bg-secondary-100 text-secondary-600'}`}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-bold flex-1">
                {composeMode ? (language === 'tr' ? 'Yeni Posta' : 'New Message') : (language === 'tr' ? 'Posta' : 'Message')}
              </h3>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-bold">Mail Server</h3>
                <p className={`text-xs ${isDark ? 'text-secondary-200' : 'text-secondary-500'}`}>
                  {language === 'tr' ? 'Basit posta sunucusu.' : 'Simple mail service.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${serviceMailEnabled ? 'bg-error-500/15 text-error-600 border border-error-500/30' : 'bg-secondary-200 text-secondary-500 border border-secondary-300'}`}>
                  {serviceMailEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={serviceMailEnabled}
                  onClick={() => {
                    const enabled = !serviceMailEnabled;
                    setServiceMailEnabled(enabled);
                    dispatchDeviceConfig({
                      services: {
                        dns: { enabled: serviceDnsEnabled, records: serviceDnsRecords },
                        http: { enabled: serviceHttpEnabled, content: serviceHttpContent },
                        ftp: { enabled: serviceFtpEnabled },
                        mail: { enabled, domain: serviceMailDomain, username: serviceMailUsername, password: serviceMailPassword, inbox: serviceMailInbox, sent: serviceMailSent },
                        dhcp: { enabled: serviceDhcpEnabled, pools: serviceDhcpPools }
                      }
                    });
                  }}
                  className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500/60 ${serviceMailEnabled ? 'bg-error-500/90 border-error-400' : (isDark ? 'bg-secondary-800 border-secondary-700' : 'bg-secondary-200 border-secondary-300')}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${serviceMailEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
              </div>
            </>
          )}
        </div>

        {composeMode && (
          <div className="space-y-3">
            <Input value={composeTo} onChange={(e) => { setComposeTo(e.target.value); setMailError(''); }} placeholder={language === 'tr' ? 'Alıcı (kullanici@domain)' : 'To (user@domain)'} />
            <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder={language === 'tr' ? 'Konu' : 'Subject'} />
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder={language === 'tr' ? 'Mesajınızı yazın...' : 'Write your message...'}
              rows={4}
              className={`w-full text-xs p-2 rounded border resize-none focus:outline-none focus:ring-1 ${isDark ? 'bg-secondary-800 border-secondary-700 text-secondary-200 focus:ring-accent-500/50' : 'bg-white border-secondary-300 text-secondary-800 focus:ring-accent-500/50'}`}
            />
            {mailError && (
              <div className="text-[11px] text-error-500 font-bold bg-error-500/10 border border-error-500/30 rounded-lg px-3 py-2">
                {mailError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={triggerSend}
                disabled={!composeTo.trim() || !composeBody.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-colors ${composeTo.trim() && composeBody.trim() ? 'bg-accent-500/90 text-white hover:bg-accent-600' : 'bg-secondary-200 text-secondary-400 cursor-not-allowed'}`}
              >
                <Send className="w-3.5 h-3.5" />
                {language === 'tr' ? 'Gönder' : 'Send'}
              </button>
              <button
                onClick={() => { setComposeMode(false); setComposeTo(''); setComposeSubject(''); setComposeBody(''); setMailError(''); }}
                className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${isDark ? 'bg-secondary-700 text-secondary-300 hover:bg-secondary-600' : 'bg-secondary-200 text-secondary-600 hover:bg-secondary-300'}`}
              >
                {language === 'tr' ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {viewingMsg && !composeMode && (
          <div className="space-y-3">
            <div className={`rounded-lg border p-3 space-y-2 ${isDark ? 'border-secondary-800 bg-secondary-950' : 'border-secondary-200 bg-secondary-50'}`}>
              <div className="text-xs">
                <span className="opacity-60">{language === 'tr' ? 'Kimden' : 'From'}:</span> {viewingMsg.msg.from}
              </div>
              <div className="text-xs">
                <span className="opacity-60">{language === 'tr' ? 'Kime' : 'To'}:</span> {viewingMsg.msg.to}
              </div>
              <div className="text-xs font-bold">{viewingMsg.msg.subject}</div>
              {viewingMsg.msg.timestamp && <div className="text-[10px] opacity-50">{new Date(viewingMsg.msg.timestamp).toLocaleString()}</div>}
              <div className={`border-t pt-2 mt-2 text-xs whitespace-pre-wrap leading-relaxed ${isDark ? 'border-secondary-800' : 'border-secondary-200'}`}>
                {viewingMsg.msg.body}
              </div>
            </div>
            {viewingMsg.type === 'inbox' && (
              <>
                <textarea
                  value={viewReplyBody}
                  onChange={(e) => { setViewReplyBody(e.target.value); setMailError(''); }}
                  placeholder={language === 'tr' ? 'Yanıtınızı yazın...' : 'Write your reply...'}
                  rows={3}
                  className={`w-full text-xs p-2 rounded border resize-none focus:outline-none focus:ring-1 ${isDark ? 'bg-secondary-800 border-secondary-700 text-secondary-200 focus:ring-accent-500/50' : 'bg-white border-secondary-300 text-secondary-800 focus:ring-accent-500/50'}`}
                />
                {mailError && (
                  <div className="text-[11px] text-error-500 font-bold bg-error-500/10 border border-error-500/30 rounded-lg px-3 py-2">
                    {mailError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={triggerReply}
                    disabled={!viewReplyBody.trim()}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-colors ${viewReplyBody.trim() ? 'bg-accent-500/90 text-white hover:bg-accent-600' : 'bg-secondary-200 text-secondary-400 cursor-not-allowed'}`}
                  >
                    <Reply className="w-3.5 h-3.5" />
                    {language === 'tr' ? 'Yanıtla' : 'Reply'}
                  </button>
                  <button
                    onClick={() => { setViewingMsg(null); setViewReplyBody(''); setMailError(''); }}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold transition-colors ${isDark ? 'bg-secondary-700 text-secondary-300 hover:bg-secondary-600' : 'bg-secondary-200 text-secondary-600 hover:bg-secondary-300'}`}
                  >
                    {language === 'tr' ? 'Geri' : 'Back'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!composeMode && !viewingMsg && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input value={serviceMailUsername} onChange={(e) => setServiceMailUsername(e.target.value)} placeholder="user" />
              <Input value={serviceMailDomain} onChange={(e) => setServiceMailDomain(e.target.value)} placeholder="local.lan" />
            </div>

            {mailPop3Blocked && (
              <div className="text-[11px] text-error-500 font-bold bg-error-500/10 border border-error-500/30 rounded-lg px-3 py-2">
                {language === 'tr' ? 'POP3 (port 110) engellendi. Posta alınamıyor.' : 'POP3 (port 110) blocked. Cannot receive mail.'}
              </div>
            )}

            <button
              onClick={() => setComposeMode(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full justify-center bg-accent-500/90 text-white hover:bg-accent-600"
            >
              <Plus className="w-3.5 h-3.5" />
              {language === 'tr' ? 'Yeni Posta' : 'New Mail'}
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-lg border flex flex-col ${isDark ? 'border-secondary-800 bg-secondary-950' : 'border-secondary-200 bg-secondary-50'}`}>
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="text-xs font-bold">{language === 'tr' ? 'Gelen Kutusu' : 'Inbox'}</div>
                  <div className="text-[10px] opacity-60">{serviceMailInbox.length} {language === 'tr' ? 'mesaj' : serviceMailInbox.length <= 1 ? 'message' : 'messages'}</div>
                </div>
                <div className="flex-1 p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                  {serviceMailInbox.length === 0 ? (
                    <div className="text-[10px] text-center opacity-50 italic py-4">{language === 'tr' ? 'Kutu boş' : 'Inbox empty'}</div>
                  ) : (
                    serviceMailInbox.map((msg, idx) => (
                      <div
                        key={idx}
                        onClick={() => setViewingMsg({ type: 'inbox', msg, idx })}
                        className={`p-2 rounded border text-[10px] flex items-start justify-between gap-2 cursor-pointer transition-colors ${isDark ? 'border-secondary-800 bg-secondary-900/50 hover:bg-secondary-800' : 'border-secondary-200 bg-white hover:bg-secondary-100'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate" title={msg.from}>{msg.from}</div>
                          <div className="truncate opacity-80" title={msg.subject}>{msg.subject}</div>
                          {msg.timestamp && <div className="text-[8px] opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString()}</div>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            title={language === 'tr' ? 'Yanıtla' : 'Reply'}
                            onClick={() => setViewingMsg({ type: 'inbox', msg, idx })}
                            className="p-1 rounded transition-colors text-secondary-400 hover:text-accent-500 hover:bg-accent-500/20"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title={language === 'tr' ? 'Sil' : 'Delete'}
                            onClick={() => handleDeleteInbox(idx)}
                            className="p-1 rounded hover:bg-error-500/20 text-secondary-400 hover:text-error-500 transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-error-500" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className={`rounded-lg border flex flex-col ${isDark ? 'border-secondary-800 bg-secondary-950' : 'border-secondary-200 bg-secondary-50'}`}>
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="text-xs font-bold">{language === 'tr' ? 'Gönderilenler' : 'Sent'}</div>
                  <div className="text-[10px] opacity-60">{serviceMailSent.length} {language === 'tr' ? 'mesaj' : serviceMailSent.length <= 1 ? 'message' : 'messages'}</div>
                </div>
                <div className="flex-1 p-2 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                  {serviceMailSent.length === 0 ? (
                    <div className="text-[10px] text-center opacity-50 italic py-4">{language === 'tr' ? 'Kutu boş' : 'Sent empty'}</div>
                  ) : (
                    serviceMailSent.map((msg, idx) => (
                      <div
                        key={idx}
                        onClick={() => setViewingMsg({ type: 'sent', msg, idx })}
                        className={`p-2 rounded border text-[10px] flex items-start justify-between gap-2 cursor-pointer transition-colors ${isDark ? 'border-secondary-800 bg-secondary-900/50 hover:bg-secondary-800' : 'border-secondary-200 bg-white hover:bg-secondary-100'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate" title={msg.to}>{msg.to}</div>
                          <div className="truncate opacity-80" title={msg.subject}>{msg.subject}</div>
                          {msg.timestamp && <div className="text-[8px] opacity-50 mt-1">{new Date(msg.timestamp).toLocaleString()}</div>}
                        </div>
                        <button
                          title={language === 'tr' ? 'Sil' : 'Delete'}
                          onClick={(e) => { e.stopPropagation(); handleDeleteSent(idx); }}
                          className="p-1 rounded hover:bg-error-500/20 text-secondary-400 hover:text-error-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-error-500" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
