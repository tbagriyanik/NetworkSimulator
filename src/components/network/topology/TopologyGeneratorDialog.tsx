'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Loader2, Monitor, Wand2, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CanvasDevice, CanvasConnection } from '../networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { SCENARIOS, CATEGORY_LABELS, type ScenarioType } from './topologyScenarios';
import { generateTopology } from './scenarioGenerators';

interface TopologyGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
    projectName?: string;
  }) => void;
}

export function TopologyGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: TopologyGeneratorDialogProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTr = language === 'tr';

  const [searchQuery, setSearchQuery] = useState('');
  const [scenario, setScenario] = useState<ScenarioType>('soho');
  const [pcCount, setPcCount] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);

  // Select the first scenario if current one gets filtered out? It's fine to keep it unless we want auto-selection.
  const selectedDef = SCENARIOS.find(s => s.id === scenario) ?? SCENARIOS[0];

  const handleClose = useCallback(() => {
    if (!isLoading) onOpenChange(false);
  }, [isLoading, onOpenChange]);

  // ── Mobile back button (popstate) closes the dialog ──────────────────
  useEffect(() => {
    if (!open) return;
    // Push a dummy history entry so pressing "Back" pops it instead of navigating
    window.history.pushState({ topologyGenerator: true }, '');
    const onPopState = () => handleClose();
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [open, handleClose]);

  const handleGenerate = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        const result = generateTopology(scenario, pcCount);
        const name = isTr ? selectedDef.labelTr : selectedDef.labelEn;
        onGenerate({
          ...result,
          projectName: name,
        });
        toast({
          title: isTr ? 'Topoloji Üretildi! 🚀' : 'Topology Generated! 🚀',
          description: isTr
            ? 'Topoloji başarıyla oluşturuldu ve özet notu eklendi.'
            : 'Topology successfully generated and summary note added.',
        });
        onOpenChange(false);
      } catch (err) {
        toast({
          title: isTr ? 'Hata' : 'Error',
          description: String(err),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }, 400);
  }, [scenario, pcCount, onGenerate, onOpenChange, isTr, selectedDef]);

  // ── Enter key triggers generation ──────────────────
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'A') && activeEl !== document.body) {
          return;
        }
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, isLoading, handleGenerate]);

  // Group scenarios by category for display
  const categories = ['basic', 'wireless', 'switching', 'routing', 'security'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${isDark ? 'bg-secondary-900 border-success-500/30 text-white' : 'bg-white border-success-500 text-secondary-900'} sm:max-w-lg rounded-none md:rounded-3xl shadow-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto`}
        onEscapeKeyDown={isLoading ? undefined : () => handleClose()}
        onPointerDownOutside={isLoading ? undefined : () => handleClose()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-purple-500 animate-pulse" />
            {isTr ? 'Otomatik Topoloji Üretici' : 'Automatic Topology Generator'}
          </DialogTitle>
          <DialogDescription className={isDark ? 'text-secondary-400' : 'text-secondary-500'}>
            {isTr
              ? 'Hazır ağ senaryoları ve cihaz yapılandırmaları oluşturun.'
              : 'Generate complete network topologies and device configurations.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isTr ? 'Senaryo ara...' : 'Search scenarios...'}
              className={`pl-9 h-9 text-sm ${
                isDark 
                  ? 'bg-secondary-800/50 border-secondary-700 text-white placeholder:text-secondary-500 focus-visible:ring-purple-500/50' 
                  : 'bg-secondary-50 border-secondary-200 text-secondary-900 placeholder:text-secondary-400 focus-visible:ring-purple-500/50'
              }`}
            />
          </div>

          {/* Scenario Selector – scrollable, responsive height */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{isTr ? 'Ağ Senaryosu' : 'Network Scenario'}</Label>
            <div className="max-h-[40dvh] sm:max-h-[280px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
              {categories.map(cat => {
                const items = SCENARIOS.filter(s => {
                  if (s.category !== cat) return false;
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    s.labelTr.toLowerCase().includes(query) ||
                    s.labelEn.toLowerCase().includes(query) ||
                    s.descTr.toLowerCase().includes(query) ||
                    s.descEn.toLowerCase().includes(query)
                  );
                });
                
                if (items.length === 0) return null;
                const label = CATEGORY_LABELS[cat];
                return (
                  <div key={cat}>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                      {isTr ? label.tr : label.en}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map(s => {
                        const Icon = s.icon;
                        const selected = scenario === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setScenario(s.id)}
                            className={`flex items-start gap-2 p-2 rounded-xl text-left transition-all duration-150 border ${
                              selected
                                ? isDark
                                  ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/40'
                                  : 'border-purple-500 bg-purple-50 ring-1 ring-purple-400/40'
                                : isDark
                                  ? 'border-secondary-700 hover:border-secondary-600 bg-secondary-800/50 hover:bg-secondary-800'
                                  : 'border-secondary-200 hover:border-secondary-300 bg-secondary-50 hover:bg-secondary-100'
                            }`}
                          >
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? 'text-purple-500' : isDark ? 'text-secondary-400' : 'text-secondary-500'}`} />
                            <div className="min-w-0">
                              <div className={`text-xs font-semibold leading-tight ${selected ? (isDark ? 'text-purple-300' : 'text-purple-700') : ''}`}>
                                {isTr ? s.labelTr : s.labelEn}
                              </div>
                              <div className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                                {isTr ? s.descTr : s.descEn}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* No results message */}
              {categories.every(cat => 
                SCENARIOS.filter(s => {
                  if (s.category !== cat) return false;
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    s.labelTr.toLowerCase().includes(query) ||
                    s.labelEn.toLowerCase().includes(query) ||
                    s.descTr.toLowerCase().includes(query) ||
                    s.descEn.toLowerCase().includes(query)
                  );
                }).length === 0
              ) && (
                <div className={`text-center py-8 text-sm ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                  {isTr ? 'Sonuç bulunamadı.' : 'No results found.'}
                </div>
              )}
            </div>
          </div>

          {/* PC Count – shown only for scenarios that support it */}
          {selectedDef.showPcCount && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{isTr ? 'PC Sayısı' : 'PC Count'}</Label>
              <div className="flex gap-2">
                {[1, 2, 4].map(num => (
                  <Button
                    key={num}
                    variant={pcCount === num ? 'default' : 'outline'}
                    className="flex-1 h-9 text-xs"
                    onClick={() => setPcCount(num)}
                  >
                    <Monitor className="w-3.5 h-3.5 mr-1" />
                    {num} PC
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
            {t.cancel}
          </Button>
          <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700 text-white font-bold" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="w-4 h-4 mr-1" />}
            {isTr ? 'Üret' : 'Generate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
