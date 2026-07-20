'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { logger } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { cn } from '@/lib/utils';
import { Info, Terminal, Search, X, ChevronDown, Compass, Mail, Loader2, MessageSquare, Bug, Lightbulb, Check, Play, Cpu } from 'lucide-react';
import Image from 'next/image';
import { getCommandCategories } from './networkTopology.commands';
import { TutorialAnimationPlayer } from './TutorialAnimationPlayer';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

type TabType = 'help' | 'about' | 'contact';

export function AboutModal({ isOpen, onClose, onStartTour }: AboutModalProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const CONTACT_NAME_MAX_LENGTH = 64;
  const CONTACT_EMAIL_MAX_LENGTH = 254;
  const CONTACT_MESSAGE_MAX_LENGTH = 1000;
  const [activeTab, setActiveTab] = useState<TabType>('help');
  const isContactEnabled = process.env.NEXT_PUBLIC_IS_CONTACT_ENABLED == 'true';
  const isDark = theme === 'dark';
  const lang = (t as unknown as Record<string, string>).language || 'en';
  const isTR = lang === 'tr';

  const [selectedAnimId, setSelectedAnimId] = useState<string>('broadcast-vis');
  const [animationKey, setAnimationKey] = useState<number>(0);

  // Help content data - memoized to prevent infinite loops
  const helpCategories = useMemo(() => getCommandCategories(isTR), [isTR]);

  const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({
    system: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleHelp = (id: string) => {
    setExpandedHelp(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    type: 'bug' as 'bug' | 'suggestion' | 'other',
    message: ''
  });
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate fields
    const errors = {
      name: contactData.name.trim() ? '' : t.contactValidationName,
      email: contactData.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email) ? '' : t.contactValidationEmail,
      message: contactData.message.trim() ? '' : t.contactValidationMessage
    };

    setValidationErrors(errors);

    // If any errors, don't submit
    if (errors.name || errors.email || errors.message) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // Theoretically sending to a Apps Script Web App
      // Or a Next.js API route
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setContactData({ name: '', email: '', type: 'bug', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      logger.error('Contact submission error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter categories based on search query
  const filteredHelpCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;

    const query = searchQuery.toLowerCase();
    return helpCategories.map(cat => ({
      ...cat,
      cmds: cat.cmds.filter(([cmd, desc]) =>
        cmd.toLowerCase().includes(query) ||
        desc.toLowerCase().includes(query)
      )
    })).filter(cat => cat.cmds.length > 0);
  }, [searchQuery, helpCategories]);

  const tabButtonClass = (tab: TabType) => cn(
    'relative inline-flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2 text-sm font-semibold transition-all',
    activeTab === tab
      ? isDark
        ? 'bg-secondary-900 text-white border-success-500/30 shadow-sm'
        : 'bg-white text-secondary-900 border-success-500/50 shadow-sm'
      : isDark
        ? 'bg-secondary-950/40 text-secondary-400 border-transparent hover:text-secondary-200 hover:bg-secondary-900/60'
        : 'bg-secondary-100 text-secondary-500 border-transparent hover:text-secondary-700 hover:bg-secondary-50'
  );

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const newExpanded: Record<string, boolean> = {};
      filteredHelpCategories.forEach(cat => {
        newExpanded[cat.id] = true;
      });
      setTimeout(() => setExpandedHelp(prev => ({ ...prev, ...newExpanded })), 0);
    }
  }, [searchQuery, filteredHelpCategories]);

  return (
    <Dialog open={isOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-[600px] md:max-w-2xl lg:max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden liquid-glass-light">
        <TooltipWrapper title={t.close}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 w-5 h-5 rounded-md bg-error-500 hover:bg-error-600 text-white transition-colors inline-flex items-center justify-center focus:outline-none disabled:pointer-events-none"
            aria-label={t.close}
          >
            <X className="w-3 h-3" />
          </button>
        </TooltipWrapper>
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="sr-only">
            {activeTab === 'about' ? t.aboutTitle : t.commandReference}
          </DialogTitle>
          <div className={cn('flex items-end gap-2 mb-2 border-b', isDark ? 'border-secondary-800' : 'border-secondary-200')}>
            <button
              onClick={() => setActiveTab('help')}
              className={tabButtonClass('help')}
            >
              <Terminal className="w-4 h-4" />
              {t.commandReference}
            </button>

            {isContactEnabled && (
              <button
                onClick={() => setActiveTab('contact')}
                className={tabButtonClass('contact')}
              >
                <Mail className="w-4 h-4" />
                {t.contactTitle}
              </button>
            )}
            <button
              onClick={() => setActiveTab('about')}
              className={tabButtonClass('about')}
            >
              <Info className="w-4 h-4" />
              {t.aboutTitle}
            </button>
          </div>
          <DialogDescription className="sr-only">
            {activeTab === 'about' ? t.aboutIntro : activeTab === 'contact' ? t.contactTitle : t.commandReference}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border rounded-md mx-6 mb-2">
          {activeTab === 'help' && (
            <div className={cn('p-4 space-y-3 border-b shrink-0', isDark ? 'bg-secondary-900/50' : 'bg-secondary-50/50')}>
              {/* Search */}
              <div className="relative">
                <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-secondary-500' : 'text-secondary-400')} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search}
                  autoFocus
                  className={cn(
                    'w-full pl-9 pr-9 py-2.5 rounded-lg text-sm border outline-none transition-all',
                    isDark
                      ? 'bg-secondary-900 border-secondary-700 text-secondary-200 placeholder:text-secondary-500 focus:border-success-500/50'
                      : 'bg-white border-secondary-200 text-secondary-900 placeholder:text-secondary-400 focus:border-success-500'
                  )}
                />
                {searchQuery && (
                  <TooltipWrapper title={t.clearSearch}>
                    <button
                      onClick={() => setSearchQuery('')}
                      className={cn('absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors', isDark ? 'hover:bg-secondary-800 text-secondary-400' : 'hover:bg-secondary-100 text-secondary-500')}
                      aria-label={t.clearSearch}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </TooltipWrapper>
                )}
              </div>

              {/* Search Results Info */}
              {searchQuery.trim() && (
                <div className={cn('text-xs px-1', isDark ? 'text-secondary-400' : 'text-secondary-500')}>
                  {filteredHelpCategories.reduce((acc, cat) => acc + cat.cmds.length, 0)} {t.commandsFound}
                </div>
              )}

              {/* Command Modes Legend */}
              {!searchQuery.trim() && (
                <div className={cn('p-3 rounded-lg text-xs space-y-1', isDark ? 'bg-secondary-950/50 border border-secondary-800' : 'bg-white border border-secondary-200')}>
                  <div className="flex items-center justify-between border-b pb-1.5 mb-1.5 border-secondary-200 dark:border-secondary-800">
                    <p className={cn('font-semibold', isDark ? 'text-secondary-200' : 'text-secondary-700')}>
                      {t.commandModes}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono px-1 rounded", isDark ? 'bg-success-500/10 text-success-400' : 'bg-success-50 text-success-600')}>Router&gt;</span>
                      <span className={isDark ? 'text-secondary-400' : 'text-secondary-600'}>{isTR ? 'Kullanıcı Modu' : 'User Mode'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono px-1 rounded", isDark ? 'bg-success-500/10 text-success-400' : 'bg-success-50 text-success-600')}>Router#</span>
                      <span className={isDark ? 'text-secondary-400' : 'text-secondary-600'}>{isTR ? 'Ayrıcalıklı Mod' : 'Privileged Mode'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono px-1 rounded", isDark ? 'bg-success-500/10 text-success-400' : 'bg-success-50 text-success-600')}>(config)#</span>
                      <span className={isDark ? 'text-secondary-400' : 'text-secondary-600'}>{isTR ? 'Global Yapılandırma' : 'Global Config'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-mono px-1 rounded", isDark ? 'bg-success-500/10 text-success-400' : 'bg-success-50 text-success-600')}>(config-if)#</span>
                      <span className={isDark ? 'text-secondary-400' : 'text-secondary-600'}>{isTR ? 'Arayüz Yapılandırma' : 'Interface Config'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'about' ? (
              <div className="space-y-4">
                <h4 className="text-lg font-bold">{t.termsAndConditions}</h4>
                <p className="text-sm">{t.termsText}</p>
                <div className="p-3 bg-accent-500/5 rounded-lg border border-accent-500/20">
                  <p className="mt-2 text-xs text-secondary-500 dark:text-secondary-400">{t.openSourceInfo}</p>
                  <a
                    href="https://github.com/tbagriyanik/networksimulator"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-500 hover:underline break-all"
                  >{t.gitAddressLabel}</a>
                </div>
                <div className="text-center">
                  <a
                    href="https://tuzlamtal.meb.k12.tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-accent-600 dark:text-accent-400 hover:underline"
                  >
                    {t.licenseInfo}
                  </a>
                </div>
                <div className="flex justify-center">
                  <Image src="/app.png" alt="Logo" width={64} height={64} className="w-16 h-16 object-contain" />
                </div>
                <div className="grid grid-cols-3 gap-2 p-3 bg-secondary-100/50 dark:bg-secondary-900/50 rounded-lg text-center border border-secondary-200 dark:border-secondary-800 text-xs animate-in fade-in duration-300">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold">
                      {isTR ? 'Sürüm' : 'Version'}
                    </span>
                    <span className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">
                      {process.env.NEXT_PUBLIC_APP_VERSION || '2.0.0'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold">
                      {isTR ? 'GitHub Commit' : 'GitHub Commits'}
                    </span>
                    <span className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">
                      {process.env.NEXT_PUBLIC_GIT_COMMIT_COUNT || '1656'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold">
                      {isTR ? 'Kod Satırı' : 'Lines of Code'}
                    </span>
                    <span className="text-sm font-semibold text-secondary-800 dark:text-secondary-200">
                      {Number(process.env.NEXT_PUBLIC_LOC || '104709').toLocaleString(isTR ? 'tr-TR' : 'en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'contact' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("p-2 rounded-xl", isDark ? "bg-warning-500/20" : "bg-warning-100")}>
                    <MessageSquare className={cn("w-5 h-5", isDark ? "text-warning-400" : "text-warning-600")} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">{t.contactTitle}</h4>
                    <p className="text-xs opacity-60">{t.savedViaSheets}</p>
                  </div>
                </div>

                {submitStatus === 'success' ? (
                  <div className={cn("p-6 rounded-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300", isDark ? "bg-success-500/10 border border-success-500/20" : "bg-success-50 border border-success-100")}>
                    <div className="w-12 h-12 rounded-full bg-success-500 flex items-center justify-center mb-4 shadow-lg shadow-success-500/20">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <h5 className="font-bold text-lg mb-2">{t.contactSuccessTitle}</h5>
                    <p className="text-sm opacity-80">{t.contactSuccessDesc}</p>
                    <Button
                      variant="ghost"
                      className="mt-6"
                      onClick={() => setSubmitStatus('idle')}
                    >
                      {t.newMessage}
                    </Button>
                  </div>
                ) : (
                  <form id="contact-form" onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold opacity-50 px-1">{t.contactName}</label>
                        <input
                          type="text"
                          maxLength={CONTACT_NAME_MAX_LENGTH}
                          value={contactData.name}
                          onChange={e => {
                            setContactData(prev => ({ ...prev, name: e.target.value.slice(0, CONTACT_NAME_MAX_LENGTH) }));
                            setValidationErrors(prev => ({ ...prev, name: '' }));
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl border outline-none transition-all",
                            validationErrors.name
                              ? isDark ? "border-error-500/70 bg-error-900/20" : "border-error-500 bg-error-50"
                              : isDark ? "bg-secondary-900 border-secondary-700 focus:border-warning-500/50" : "bg-white border-secondary-200 focus:border-warning-600"
                          )}
                          placeholder={t.contactPlaceholderName}
                        />
                        <div className={cn("px-1 text-[10px] text-right", isDark ? "text-secondary-500" : "text-secondary-400")}>
                          {contactData.name.length}/{CONTACT_NAME_MAX_LENGTH}
                        </div>
                        {validationErrors.name && <p className="text-[10px] text-error-500 px-1">{validationErrors.name}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold opacity-50 px-1">{t.contactEmail}</label>
                        <input
                          type="email"
                          maxLength={CONTACT_EMAIL_MAX_LENGTH}
                          value={contactData.email}
                          onChange={e => {
                            setContactData(prev => ({ ...prev, email: e.target.value.slice(0, CONTACT_EMAIL_MAX_LENGTH) }));
                            setValidationErrors(prev => ({ ...prev, email: '' }));
                          }}
                          className={cn(
                            "w-full px-4 py-2.5 rounded-xl border outline-none transition-all",
                            validationErrors.email
                              ? isDark ? "border-error-500/70 bg-error-900/20" : "border-error-500 bg-error-50"
                              : isDark ? "bg-secondary-900 border-secondary-700 focus:border-warning-500/50" : "bg-white border-secondary-200 focus:border-warning-600"
                          )}
                          placeholder={t.contactPlaceholderEmail}
                        />
                        <div className={cn("px-1 text-[10px] text-right", isDark ? "text-secondary-500" : "text-secondary-400")}>
                          {contactData.email.length}/{CONTACT_EMAIL_MAX_LENGTH}
                        </div>
                        {validationErrors.email && <p className="text-[10px] text-error-500 px-1">{validationErrors.email}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold opacity-50 px-1">{t.contactType}</label>
                      <div className={cn(
                        "flex gap-2 p-1 rounded-lg",
                        isDark ? "bg-secondary-900/50 border border-secondary-800" : "bg-secondary-100 border border-secondary-200"
                      )}>
                        {[
                          { id: 'bug', label: t.bugReport, icon: Bug, color: 'text-error-500' },
                          { id: 'suggestion', label: t.suggestion, icon: Lightbulb, color: 'text-warning-500' },
                          { id: 'other', label: t.other, icon: MessageSquare, color: 'text-primary-500' }
                        ].map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setContactData(prev => ({ ...prev, type: type.id as 'bug' | 'suggestion' | 'other' }))}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md border transition-all font-medium text-sm",
                              contactData.type === type.id
                                ? isDark
                                  ? "bg-warning-500/30 border-warning-500/60 text-warning-300 shadow-lg shadow-warning-500/20"
                                  : "bg-warning-100 border-warning-400 text-warning-700 shadow-md shadow-warning-200"
                                : isDark
                                  ? "bg-transparent border-transparent text-secondary-400 hover:text-secondary-300 hover:bg-secondary-800/50"
                                  : "bg-transparent border-transparent text-secondary-600 hover:text-secondary-700 hover:bg-secondary-200/50"
                            )}
                          >
                            <type.icon className="w-4 h-4" />
                            <span className="text-xs font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold opacity-50 px-1">{t.contactMessage}</label>
                      <textarea
                        rows={5}
                        maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                        value={contactData.message}
                        onChange={e => {
                          setContactData(prev => ({ ...prev, message: e.target.value.slice(0, CONTACT_MESSAGE_MAX_LENGTH) }));
                          setValidationErrors(prev => ({ ...prev, message: '' }));
                        }}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border outline-none transition-all resize-none",
                          validationErrors.message
                            ? isDark ? "border-error-500/70 bg-error-900/20" : "border-error-500 bg-error-50"
                            : isDark ? "bg-secondary-900 border-secondary-700 focus:border-warning-500/50" : "bg-white border-secondary-200 focus:border-warning-600"
                        )}
                        placeholder={t.contactPlaceholderMessage}
                      />
                      <div className={cn("flex items-center justify-between px-1 text-[10px]", isDark ? "text-secondary-500" : "text-secondary-400")}>
                        <span>{isTR ? 'Maksimum mesaj uzunluğu' : 'Maximum message length'}: {CONTACT_MESSAGE_MAX_LENGTH}</span>
                        <span>{contactData.message.length}/{CONTACT_MESSAGE_MAX_LENGTH}</span>
                      </div>
                      {validationErrors.message && <p className="text-[10px] text-error-500 px-1">{validationErrors.message}</p>}
                    </div>

                    {submitStatus === 'error' && (
                      <p className="text-xs text-error-500 font-bold px-1">{t.contactErrorDesc}</p>
                    )}

                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Help Categories */}
                {filteredHelpCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isExp = expandedHelp[cat.id];
                  return (
                    <div key={cat.id} className={cn('rounded-lg border overflow-hidden', isDark ? 'bg-secondary-900 border-secondary-700' : 'bg-white border border-secondary-200')}>
                      <button
                        onClick={() => toggleHelp(cat.id)}
                        className={cn('w-full flex items-center justify-between p-3 text-left transition-colors', isDark ? 'hover:bg-secondary-800' : 'hover:bg-secondary-50')}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-4 h-4', isDark ? 'text-secondary-400' : 'text-secondary-500')} />
                          <span className={cn('font-medium text-sm', isDark ? 'text-secondary-200' : 'text-secondary-700')}>{cat.title}</span>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', isDark ? 'bg-secondary-800 text-secondary-400' : 'bg-secondary-100 text-secondary-500')}>
                            {cat.cmds.length}
                          </span>
                        </div>
                        <ChevronDown className={cn('w-4 h-4 transition-transform', isExp ? 'rotate-180' : '', isDark ? 'text-secondary-400' : 'text-secondary-500')} />
                      </button>
                      {isExp && (
                        <div className={cn('border-t', isDark ? 'border-secondary-700' : 'border-secondary-200')}>
                          {cat.type === 'info' ? (
                            <div className="p-4 space-y-4">
                              {cat.cmds.map(([title, content], idx) => (
                                <div key={idx} className="space-y-1.5">
                                  <h4 className={cn('font-bold text-sm', isDark ? 'text-success-400' : 'text-success-600')}>
                                    {title}
                                  </h4>
                                  <p className={cn('text-xs leading-relaxed', isDark ? 'text-secondary-300' : 'text-secondary-600')}>
                                    {content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <table className="w-full text-xs">
                              <tbody>
                                {cat.cmds.map(([cmd, desc, mode], idx) => (
                                  <tr key={idx} className={cn('border-b last:border-b-0', isDark ? 'border-secondary-800 hover:bg-secondary-800/50' : 'border-secondary-100 hover:bg-secondary-50')}>
                                    <td className="p-2 w-[45%]">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {mode && (
                                          <span className={cn(
                                            'font-mono text-[10px] px-1 rounded',
                                            isDark ? 'bg-secondary-950 text-secondary-500' : 'bg-secondary-100 text-secondary-400'
                                          )}>
                                            {mode}
                                          </span>
                                        )}
                                        <code className={cn('font-mono text-[11px] break-all', isDark ? 'text-success-400' : 'text-success-600')}>
                                          {cmd}
                                        </code>
                                      </div>
                                    </td>
                                    <td className={cn('p-2 align-top', isDark ? 'text-secondary-200' : 'text-secondary-600')}>{desc}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Educational Animations Section at the bottom of Help Tab */}
                <div className={cn("mt-6 pt-6 border-t", isDark ? "border-secondary-800" : "border-secondary-200")}>
                  <h4 className={cn("text-base font-bold mb-3 flex items-center gap-2", isDark ? "text-white" : "text-secondary-900")}>
                    <Play className="w-5 h-5 text-success-500 fill-current" />
                    {isTR ? 'Eğitim Animasyonları' : 'Educational Animations'}
                  </h4>
                  <p className="text-xs text-secondary-500 mb-4 leading-relaxed">
                    {isTR 
                      ? "Ağ protokollerinin ve veri iletim süreçlerinin animasyonlu canlandırmalarını izleyin."
                      : "Watch animated step-by-step visualizations of network protocols and data transmission processes."}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Buttons on the left/top */}
                    <div className="md:col-span-1 flex flex-col gap-1.5">
                      {[
                        { id: 'broadcast-vis', title: isTR ? 'Broadcast Görselleştirme' : 'Broadcast Visualization' },
                        { id: 'arp-anim', title: isTR ? 'ARP Adres Çözümleme' : 'ARP Address Resolution' },
                        { id: 'ping-anim', title: isTR ? 'ICMP Ping Süreci' : 'ICMP Ping Process' },
                        { id: 'dhcp-flow', title: isTR ? 'DHCP (DORA) Akışı' : 'DHCP (DORA) Flow' }
                      ].map((anim) => (
                        <button
                          key={`help-tab-${anim.id}`}
                          onClick={() => {
                            setSelectedAnimId(anim.id);
                            setAnimationKey(prev => prev + 1);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-2",
                            selectedAnimId === anim.id
                              ? isDark
                                ? "bg-success-500/10 border-success-500/40 text-success-300 shadow-md"
                                : "bg-success-50 border-success-400 text-success-700 shadow-sm"
                              : isDark
                                ? "bg-secondary-900/40 border-secondary-800 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-800/60"
                                : "bg-white border-secondary-200 text-secondary-600 hover:text-secondary-800 hover:bg-secondary-50"
                          )}
                        >
                          <Cpu className="w-3.5 h-3.5 shrink-0" />
                          {anim.title}
                        </button>
                      ))}
                    </div>
                    
                    {/* Player on the right/bottom */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <div className="rounded-xl border border-secondary-200 dark:border-secondary-800 bg-secondary-950/20 p-1">
                        <TutorialAnimationPlayer key={`help-tab-player-${animationKey}`} animationId={selectedAnimId} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 pt-2 shrink-0 gap-2">
          {activeTab === 'contact' && submitStatus !== 'success' && (
            <Button
              type="submit"
              form="contact-form"
              disabled={isSubmitting}
              className={cn("gap-2", isDark ? "bg-warning-600 hover:bg-warning-700" : "bg-warning-600 hover:bg-warning-700")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {t.contactSend}
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onStartTour}
            className={cn("gap-2", isDark ? "hover:text-accent-400 dark:hover:border-accent-500/50" : "")}
          >
            <Compass className="w-4 h-4" />
            {t.startTour}
          </Button>
          <Button
            onClick={onClose}
            className="gap-2 text-foreground hover:bg-error-500 hover:text-white transition-colors"
            variant="outline"
          >
            <X className="w-4 h-4" />
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
