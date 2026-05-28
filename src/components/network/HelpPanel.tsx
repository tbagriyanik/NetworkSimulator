'use client';

import { useState, useMemo, useEffect } from 'react';
import { Translations } from '@/contexts/LanguageContext';
import { HelpCircle, X, Terminal, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { getCommandCategories } from './networkTopology.commands';

interface HelpPanelProps {
  t: Translations;
  theme: string;
  initialOpen?: boolean;
  onClose?: () => void;
}

export function HelpPanel({ t, theme, initialOpen = false, onClose }: HelpPanelProps) {
  const [open, setOpen] = useState(initialOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    system: true,
    privileged: false,
    global: false,
    'examples-dhcp': false,
    'examples-wifi': false,
    'examples-vlan': false,
    'knowledge-stp': false,
    'knowledge-dhcp': false,
    'knowledge-vlan': false,
    interface: false,
    show: false,
    keyboard: false,
  });

  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const lang = t.language || 'en';
  const isTR = lang === 'tr';

  const toggle = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Define categories with useMemo to prevent recreating on each render
  const categories = useMemo(() => getCommandCategories(isTR), [isTR]);

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    return categories.map(cat => ({
      ...cat,
      cmds: cat.cmds.filter(([cmd, desc]) =>
        cmd.toLowerCase().includes(query) ||
        desc.toLowerCase().includes(query)
      )
    })).filter(cat => cat.cmds.length > 0);
  }, [searchQuery, categories]);

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const newExpanded: Record<string, boolean> = {};
      filteredCategories.forEach(cat => {
        newExpanded[cat.id] = true;
      });
      setExpanded(prev => ({ ...prev, ...newExpanded }));
    }
  }, [searchQuery, filteredCategories]);

  // F1 key handler to open/close help panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1' || event.code === 'F1') {
        event.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false);
          onClose?.();
        }
      }}
    >
      <div
        className={cn(
          'w-full max-w-3xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-scale-in',
          isDark ? 'bg-slate-950 border border-slate-700' : 'bg-white border border-slate-200'
        )}
        role="dialog"
        aria-modal="true"
        aria-label={isTR ? 'CLI Komut Referansı' : 'CLI Command Reference'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Modern Style */}
        <div className={cn(
          'relative flex items-center justify-between p-4 pr-14 border-b shrink-0',
          isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'p-2.5 rounded-xl shadow-sm',
              isDark ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10' : 'bg-gradient-to-br from-emerald-100 to-emerald-50'
            )}>
              <Terminal className={cn('w-5 h-5', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
            </div>
            <div>
              <h2 className={cn('text-lg font-bold tracking-tight', isDark ? 'text-slate-100' : 'text-slate-900')}>
                {isTR ? 'CLI Komut Referansı' : 'CLI Command Reference'}
              </h2>
              <p className={cn('text-xs font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {isTR ? '150+ komut' : '150+ commands'}
              </p>
            </div>
          </div>
          <TooltipWrapper title={t.close}>
            <button
              onClick={() => {
                setOpen(false);
                onClose?.();
              }}
              className={cn(
                'absolute right-4 top-4 p-1.5 rounded-md transition-colors cursor-pointer',
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900'
              )}
              aria-label={t.close}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </TooltipWrapper>
        </div>

        {/* Search Bar - Fixed at top */}
        <div className={cn(
          'p-4 space-y-3 border-b shrink-0',
          isDark ? 'bg-slate-900/30 border-slate-700/50' : 'bg-slate-50/50 border-slate-200'
        )}>
          <div className="relative">
            <Search className={cn('absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4', isDark ? 'text-slate-500' : 'text-slate-400')} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTR ? 'Komut ara...' : 'Search commands...'}
              autoFocus
              className={cn(
                'w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border outline-none transition-all duration-200',
                'focus:ring-2 focus:ring-offset-0',
                isDark
                  ? 'bg-slate-900/80 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20'
              )}
            />
            {searchQuery && (
              <TooltipWrapper title={t.clearSearch}>
                <button
                  onClick={() => setSearchQuery('')}
                  className={cn(
                    'absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200',
                    isDark
                      ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                      : 'hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                  )}
                  aria-label={t.clearSearch}
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipWrapper>
            )}
          </div>

          {/* Search Results Info */}
          {searchQuery.trim() && (
            <div className={cn('text-xs px-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
              {filteredCategories.reduce((acc, cat) => acc + cat.cmds.length, 0)} {isTR ? 'komut bulundu' : 'commands found'}
            </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {/* Command Modes */}
          {!searchQuery.trim() && (
            <div className={cn('p-3 rounded-lg text-xs space-y-1', isDark ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200')}>
              <p className={cn('font-semibold mb-2', isDark ? 'text-slate-200' : 'text-slate-700')}>
                {isTR ? 'Komut Modları:' : 'Command Modes:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono px-1 rounded", isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}>Router&gt;</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isTR ? 'Kullanıcı Modu' : 'User Mode'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono px-1 rounded", isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}>Router#</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isTR ? 'Ayrıcalıklı Mod' : 'Privileged Mode'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono px-1 rounded", isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}>(config)#</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isTR ? 'Global Yapılandırma' : 'Global Config'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-mono px-1 rounded", isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}>(config-if)#</span>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isTR ? 'Arayüz Yapılandırma' : 'Interface Config'}</span>
                </div>
              </div>
            </div>
          )}


          {/* Categories (Commands) - Modern Style */}
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isExp = expanded[cat.id];
            return (
              <div
                key={cat.id}
                className={cn(
                  'rounded-xl border overflow-hidden transition-all duration-200',
                  isDark
                    ? 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                <button
                  onClick={() => toggle(cat.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3.5 text-left transition-all duration-200 focus-ring-animate',
                    isExp
                      ? (isDark ? 'bg-slate-800/50' : 'bg-slate-50')
                      : (isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/50')
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-1.5 rounded-lg',
                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500',
                      isExp && (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600')
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn('font-semibold text-sm', isDark ? 'text-slate-200' : 'text-slate-700')}>
                      {cat.title}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {cat.cmds.length}
                    </span>
                  </div>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform duration-200',
                    isExp ? 'rotate-180' : '',
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  )} />
                </button>

                {isExp && (
                  <div className={cn('border-t', isDark ? 'border-slate-700' : 'border-slate-200')}>
                    {cat.type === 'info' ? (
                      <div className="p-4 space-y-4">
                        {cat.cmds.map(([title, content], idx) => (
                          <div key={idx} className="space-y-1.5">
                            <h4 className={cn('font-bold text-sm', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                              {title}
                            </h4>
                            <p className={cn('text-xs leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-600')}>
                              {content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <tbody>
                          {cat.cmds.map(([cmd, desc, mode], idx) => (
                            <tr key={idx} className={cn('border-b last:border-b-0', isDark ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50')}>
                              <td className="p-2 w-[45%]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {mode && (
                                    <span className={cn(
                                      'font-mono text-[10px] px-1 rounded',
                                      isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                                    )}>
                                      {mode}
                                    </span>
                                  )}
                                  <code className={cn('font-mono text-[11px] break-all', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                                    {cmd}
                                  </code>
                                </div>
                              </td>
                              <td className={cn('p-2 align-top', isDark ? 'text-slate-200' : 'text-slate-600')}>
                                {desc}
                              </td>
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
        </div>


        {/* Footer stats - Fixed at bottom - Modern Style */}
        <div className={cn(
          'p-4 border-t shrink-0',
          isDark ? 'bg-slate-900/30 border-slate-700/50' : 'bg-slate-50/50 border-slate-200'
        )}>
          <div className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl text-xs',
            isDark
              ? 'bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50 text-slate-400'
              : 'bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 text-slate-600'
          )}>
            <span className="font-medium">{isTR ? 'Toplam komut:' : 'Total commands:'}</span>
            <span className={cn(
              'font-bold text-sm px-2 py-0.5 rounded-full',
              isDark
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-emerald-100 text-emerald-700'
            )}>150+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpPanel;
