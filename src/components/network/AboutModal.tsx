'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { csrfHeaders } from '@/lib/security/csrf';
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
import { Info, Terminal, Search, X, ChevronDown, Compass, Mail, Loader2, MessageSquare, Bug, Lightbulb, Check, Play, Cpu, Copy, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';
import { getCommandCategories } from './networkTopology.commands';
import { TutorialAnimationPlayer } from './TutorialAnimationPlayer';
import { SubnettingPanel } from './pc-panel/SubnettingPanel';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour: () => void;
  isExamActive?: boolean;
}

type TabType = 'help' | 'about' | 'contact';

export function AboutModal({ isOpen, onClose, onStartTour, isExamActive = false }: AboutModalProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const CONTACT_NAME_MAX_LENGTH = 64;
  const CONTACT_EMAIL_MAX_LENGTH = 254;
  const CONTACT_MESSAGE_MAX_LENGTH = 1000;
  const [activeTab, setActiveTab] = useState<TabType>(
    isExamActive && process.env.NEXT_PUBLIC_IS_CONTACT_ENABLED == 'true' ? 'contact' : isExamActive ? 'about' : 'help'
  );
  const isContactEnabled = process.env.NEXT_PUBLIC_IS_CONTACT_ENABLED == 'true';
  const isDark = theme === 'dark';
  const lang = (t as unknown as Record<string, string>).language || 'en';
  const isTR = lang === 'tr';

  const [selectedAnimId, setSelectedAnimId] = useState<string>('broadcast-vis');
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Help content data - memoized to prevent infinite loops
  const helpCategories = useMemo(() => getCommandCategories(isTR), [isTR]);

  const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({
    command_modes: true,
    system: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleHelp = (id: string) => {
    setExpandedHelp(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandAll = () => {
    const allExpanded = helpCategories.every(cat => expandedHelp[cat.id]);
    const nextState: Record<string, boolean> = {};
    helpCategories.forEach(cat => {
      nextState[cat.id] = !allExpanded;
    });
    setExpandedHelp(nextState);
  };

  const handleCopyCommand = useCallback((cmd: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(null), 1500);
    }
  }, []);

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
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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

  // Filter categories based on search query and category filter
  const filteredHelpCategories = useMemo(() => {
    let list = helpCategories;

    if (selectedCategoryFilter === 'commands') {
      list = list.filter(cat => cat.type === 'commands' || (!cat.type && cat.id !== 'keyboard_shortcuts'));
    } else if (selectedCategoryFilter === 'shortcuts') {
      list = list.filter(cat => cat.id === 'keyboard_shortcuts');
    } else if (selectedCategoryFilter === 'examples') {
      list = list.filter(cat => cat.type === 'examples');
    } else if (selectedCategoryFilter === 'info') {
      list = list.filter(cat => cat.type === 'info' && cat.id !== 'keyboard_shortcuts');
    }

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.map(cat => ({
      ...cat,
      cmds: cat.cmds.filter(([cmd, desc]) =>
        cmd.toLowerCase().includes(query) ||
        desc.toLowerCase().includes(query)
      )
    })).filter(cat => cat.cmds.length > 0);
  }, [searchQuery, helpCategories, selectedCategoryFilter]);

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

  // During exam mode the help (command reference) tab must not be accessible
  useEffect(() => {
    if (isExamActive && activeTab === 'help') {
      setActiveTab(isContactEnabled ? 'contact' : 'about');
    }
  }, [isExamActive, activeTab, isContactEnabled]);

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
        <DialogHeader className="p-0 pb-1 shrink-0">
          <DialogTitle className="sr-only">
            {activeTab === 'about' ? t.aboutTitle : activeTab === 'contact' ? t.contactTitle : t.commandReference}
          </DialogTitle>
          <div className={cn('flex items-end gap-2 mb-1 border-b', isDark ? 'border-secondary-800' : 'border-secondary-200')}>
            {!isExamActive && (
              <button
                onClick={() => setActiveTab('help')}
                className={tabButtonClass('help')}
              >
                <Terminal className="w-4 h-4" />
                {t.commandReference}
              </button>
            )}

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

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border rounded-md mx-2.5 mb-2">
          {activeTab === 'help' && !isExamActive && (
            <div className={cn('p-2 space-y-2 border-b-2 shrink-0', isDark ? 'bg-secondary-700 border-secondary-500/60' : 'bg-secondary-100 border-secondary-300')}>
              {/* Search & Action Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-secondary-500' : 'text-secondary-400')} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search}
                    autoFocus
                    className={cn(
                      'w-full pl-9 pr-9 py-2 rounded-lg text-sm border outline-none transition-all',
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
                <TooltipWrapper title={isTR ? "Tümünü Aç / Kapat" : "Expand / Collapse All"}>
                  <button
                    onClick={toggleExpandAll}
                    className={cn(
                      'p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors',
                      isDark ? 'bg-secondary-900 border-secondary-700 hover:bg-secondary-800 text-secondary-300' : 'bg-white border-secondary-200 hover:bg-secondary-50 text-secondary-700'
                    )}
                  >
                    <ChevronsUpDown className="w-4 h-4" />
                  </button>
                </TooltipWrapper>
              </div>
              {/* Quick Filter Badges */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <div className="flex flex-wrap items-center gap-1">
                  {[
                    { id: 'all', label: isTR ? 'Tümü' : 'All' },
                    { id: 'commands', label: isTR ? 'Komutlar' : 'Commands' },
                    { id: 'shortcuts', label: isTR ? 'Kısayollar' : 'Shortcuts' },
                    { id: 'examples', label: isTR ? 'Örnekler' : 'Examples' },
                    { id: 'info', label: isTR ? 'Bilgi & Terimler' : 'Info & Terms' }
                  ].map(badge => (
                    <button
                      key={badge.id}
                      onClick={() => setSelectedCategoryFilter(badge.id)}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all',
                        selectedCategoryFilter === badge.id
                          ? isDark
                            ? 'bg-success-500/20 border-success-500/60 text-success-300 shadow-sm'
                            : 'bg-success-100 border-success-400 text-success-800 shadow-sm'
                          : isDark
                            ? 'bg-secondary-900/60 border-secondary-700 text-secondary-400 hover:text-secondary-200'
                            : 'bg-white border-secondary-200 text-secondary-600 hover:text-secondary-800'
                      )}
                    >
                      {badge.label}
                    </button>
                  ))}
                </div>

                {/* Search Results Count */}
                <div className={cn('text-[11px] px-1 font-medium', isDark ? 'text-secondary-400' : 'text-secondary-500')}>
                  {filteredHelpCategories.reduce((acc, cat) => acc + cat.cmds.length, 0)} {t.commandsFound}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'about' ? (
              <div className="space-y-3">
                <h4 className="text-base font-bold">{t.termsAndConditions}</h4>
                <p className="text-xs leading-relaxed">{t.termsText}</p>
                <div className="p-2.5 bg-accent-500/5 rounded-lg border border-accent-500/20">
                  <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">{t.openSourceInfo}</p>
                  <span className="text-xs text-primary-500"><a href="http://yunus.sf.net">{t.gitAddressLabel}</a></span>
                </div>
                <div className="text-center">
                  <a
                    href="https://tuzlamtal.meb.k12.tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline"
                  >
                    {t.licenseInfo}
                  </a>
                </div>
                <div className="flex justify-center py-1">
                  <Image src="/app.png" alt="Logo" width={56} height={56} className="w-14 h-14 object-contain" unoptimized priority />
                </div>
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-secondary-100/50 dark:bg-secondary-900/50 rounded-lg text-center border border-secondary-200 dark:border-secondary-800 text-xs animate-in fade-in duration-300">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold">
                      {isTR ? 'Sürüm' : 'Version'}
                    </span>
                    <span className="text-xs font-semibold text-secondary-800 dark:text-secondary-200">
                      {process.env.APP_VERSION || '6.5.1'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold">
                      {isTR ? 'Commit Sayısı' : 'Commits'}
                    </span>
                    <span className="text-xs font-semibold text-secondary-800 dark:text-secondary-200">
                      {process.env.NEXT_PUBLIC_GIT_COMMIT_COUNT || '1656'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-secondary-500 dark:text-secondary-400 uppercase font-bold">
                      {isTR ? 'Kod Satırı' : 'Lines of Code'}
                    </span>
                    <span className="text-xs font-semibold text-secondary-800 dark:text-secondary-200">
                      {Number(process.env.NEXT_PUBLIC_LOC || '104709').toLocaleString(isTR ? 'tr-TR' : 'en-US')}
                    </span>
                  </div>
                </div>
              </div>
            ) : activeTab === 'contact' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className={cn("p-1.5 rounded-lg", isDark ? "bg-warning-500/20" : "bg-warning-100")}>
                    <MessageSquare className={cn("w-4 h-4", isDark ? "text-warning-400" : "text-warning-600")} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold">{t.contactTitle}</h4>
                    <p className="text-[11px] opacity-60">{t.savedViaSheets}</p>
                  </div>
                </div>

                {submitStatus === 'success' ? (
                  <div className={cn("p-4 rounded-xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300", isDark ? "bg-success-500/10 border border-success-500/20" : "bg-success-50 border border-success-100")}>
                    <div className="w-10 h-10 rounded-full bg-success-500 flex items-center justify-center mb-3 shadow-lg shadow-success-500/20">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <h5 className="font-bold text-base mb-1">{t.contactSuccessTitle}</h5>
                    <p className="text-xs opacity-80">{t.contactSuccessDesc}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSubmitStatus('idle')}
                    >
                      {t.newMessage}
                    </Button>
                  </div>
                ) : (
                  <form id="contact-form" onSubmit={handleContactSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold opacity-60 px-1">{t.contactName}</label>
                        <input
                          type="text"
                          maxLength={CONTACT_NAME_MAX_LENGTH}
                          value={contactData.name}
                          onChange={e => {
                            setContactData(prev => ({ ...prev, name: e.target.value.slice(0, CONTACT_NAME_MAX_LENGTH) }));
                            setValidationErrors(prev => ({ ...prev, name: '' }));
                          }}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all",
                            validationErrors.name
                              ? isDark ? "border-error-500/70 bg-error-900/20" : "border-error-500 bg-error-50"
                              : isDark ? "bg-secondary-900 border-secondary-700 focus:border-warning-500/50" : "bg-white border-secondary-200 focus:border-warning-600"
                          )}
                          placeholder={t.contactPlaceholderName}
                        />
                        <div className={cn("px-1 text-[10px] text-right", isDark ? "text-secondary-500" : "text-secondary-400")}>
                          {contactData.name.length}/{CONTACT_NAME_MAX_LENGTH}
                        </div>
                        {validationErrors.name && <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold px-1">{validationErrors.name}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold opacity-60 px-1">{t.contactEmail}</label>
                        <input
                          type="email"
                          maxLength={CONTACT_EMAIL_MAX_LENGTH}
                          value={contactData.email}
                          onChange={e => {
                            setContactData(prev => ({ ...prev, email: e.target.value.slice(0, CONTACT_EMAIL_MAX_LENGTH) }));
                            setValidationErrors(prev => ({ ...prev, email: '' }));
                          }}
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all",
                            validationErrors.email
                              ? isDark ? "border-error-500/70 bg-error-900/20" : "border-error-500 bg-error-50"
                              : isDark ? "bg-secondary-900 border-secondary-700 focus:border-warning-500/50" : "bg-white border-secondary-200 focus:border-warning-600"
                          )}
                          placeholder={t.contactPlaceholderEmail}
                        />
                        <div className={cn("px-1 text-[10px] text-right", isDark ? "text-secondary-500" : "text-secondary-400")}>
                          {contactData.email.length}/{CONTACT_EMAIL_MAX_LENGTH}
                        </div>
                        {validationErrors.email && <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold px-1">{validationErrors.email}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold opacity-60 px-1">{t.contactType}</label>
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
                              "flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all font-medium text-xs",
                              contactData.type === type.id
                                ? isDark
                                  ? "bg-warning-500/30 border-warning-500/60 text-warning-300 shadow-lg shadow-warning-500/20"
                                  : "bg-warning-100 border-warning-400 text-warning-700 shadow-md shadow-warning-200"
                                : isDark
                                  ? "bg-transparent border-transparent text-secondary-400 hover:text-secondary-300 hover:bg-secondary-800/50"
                                  : "bg-transparent border-transparent text-secondary-600 hover:text-secondary-700 hover:bg-secondary-200/50"
                            )}
                          >
                            <type.icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold opacity-60 px-1">{t.contactMessage}</label>
                      <textarea
                        rows={4}
                        maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                        value={contactData.message}
                        onChange={e => {
                          setContactData(prev => ({ ...prev, message: e.target.value.slice(0, CONTACT_MESSAGE_MAX_LENGTH) }));
                          setValidationErrors(prev => ({ ...prev, message: '' }));
                        }}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all resize-none",
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
                      {validationErrors.message && <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold px-1">{validationErrors.message}</p>}
                    </div>

                    {submitStatus === 'error' && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-bold px-1">{t.contactErrorDesc}</p>
                    )}

                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Help Categories */}
                {filteredHelpCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isExp = expandedHelp[cat.id];
                  return (
                    <div key={cat.id} className={cn('rounded-lg border overflow-hidden transition-all', isDark ? 'bg-secondary-900 border-secondary-700' : 'bg-white border border-secondary-200')}>
                      <button
                        onClick={() => toggleHelp(cat.id)}
                        className={cn('w-full flex items-center justify-between p-2.5 text-left transition-colors', isDark ? 'hover:bg-secondary-800' : 'hover:bg-secondary-50')}
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
                            <div className="p-3 space-y-3">
                              {cat.cmds.map(([title, content], idx) => (
                                <div key={idx} className="space-y-1">
                                  <h4 className={cn('font-bold text-xs', isDark ? 'text-success-400' : 'text-success-600')}>
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
                                  <tr key={idx} className={cn('border-b last:border-b-0 group transition-colors', isDark ? 'border-secondary-800 hover:bg-secondary-800/60' : 'border-secondary-100 hover:bg-secondary-50')}>
                                    <td className="p-2 w-[48%]">
                                      <div className="flex items-center justify-between gap-1.5">
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
                                        <TooltipWrapper title={isTR ? "Kopyala" : "Copy"}>
                                          <button
                                            onClick={() => handleCopyCommand(cmd)}
                                            className={cn(
                                              'opacity-0 group-hover:opacity-100 p-1 rounded transition-all shrink-0',
                                              isDark ? 'hover:bg-secondary-700 text-secondary-400 hover:text-white' : 'hover:bg-secondary-200 text-secondary-500 hover:text-secondary-900'
                                            )}
                                            aria-label={isTR ? "Komutu kopyala" : "Copy command"}
                                          >
                                            {copiedCmd === cmd ? (
                                              <Check className="w-3.5 h-3.5 text-success-500" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </TooltipWrapper>
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
                <div className={cn("mt-4 pt-4 border-t", isDark ? "border-secondary-800" : "border-secondary-200")}>
                  <h4 className={cn("text-sm font-bold mb-2 flex items-center gap-2", isDark ? "text-white" : "text-secondary-900")}>
                    <Play className="w-4 h-4 text-success-500 fill-current" />
                    {isTR ? 'Eğitim Animasyonları' : 'Educational Animations'}
                  </h4>
                  <p className="text-xs text-secondary-500 mb-3 leading-relaxed">
                    {isTR
                      ? "Ağ protokollerinin ve veri iletim süreçlerinin animasyonlu canlandırmalarını izleyin."
                      : "Watch animated step-by-step visualizations of network protocols and data transmission processes."}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Buttons on the left/top */}
                    <div className="md:col-span-1 flex flex-col gap-1.5">
                      {[
                        { id: 'broadcast-vis', title: isTR ? 'Broadcast Görselleştirme' : 'Broadcast Visualization' },
                        { id: 'arp-anim', title: isTR ? 'ARP Adres Çözümleme' : 'ARP Address Resolution' },
                        { id: 'ping-anim', title: isTR ? 'ICMP Ping Süreci' : 'ICMP Ping Process' },
                        { id: 'dhcp-flow', title: isTR ? 'DHCP (DORA) Akışı' : 'DHCP (DORA) Flow' },
                        { id: 'subnetting', title: isTR ? 'Subnetting Paneli' : 'Subnetting Panel' }
                      ].map((anim) => (
                        <button
                          key={`help-tab-${anim.id}`}
                          onClick={() => {
                            setSelectedAnimId(anim.id);
                            setAnimationKey(prev => prev + 1);
                          }}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-lg border transition-all text-xs font-semibold flex items-center gap-2",
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
                        {selectedAnimId === 'subnetting' ? (
                          <SubnettingPanel key="help-subnetting-panel" isDark={isDark} language={isTR ? 'tr' : 'en'} />
                        ) : (
                          <TutorialAnimationPlayer key={`help-tab-player-${animationKey}`} animationId={selectedAnimId} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-4 pt-2 shrink-0 gap-2">
          {activeTab === 'contact' && submitStatus !== 'success' && (
            <Button
              type="submit"
              form="contact-form"
              size="sm"
              disabled={isSubmitting}
              className={cn("gap-2", isDark ? "bg-warning-600 hover:bg-warning-700" : "bg-warning-600 hover:bg-warning-700")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  {t.contactSend}
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onStartTour}
            className={cn("gap-2 text-xs", isDark ? "hover:text-accent-400 dark:hover:border-accent-500/50" : "")}
          >
            <Compass className="w-3.5 h-3.5" />
            {t.startTour}
          </Button>
          <Button
            onClick={onClose}
            size="sm"
            className="gap-2 text-xs text-foreground hover:bg-error-500 hover:text-white transition-colors"
            variant="outline"
          >
            <X className="w-3.5 h-3.5" />
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
