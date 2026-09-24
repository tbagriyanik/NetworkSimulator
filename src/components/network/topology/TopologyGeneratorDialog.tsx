'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  Loader2,
  Monitor,
  Wand2,
  Search,
  Sparkles,
  Info,
  FlaskConical,
  Layers,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CanvasDevice, CanvasConnection } from '../NetworkTopology/types/networkTopology.types';
import { SwitchState } from '@/lib/network/types';
import { SCENARIOS, CATEGORY_LABELS, type ScenarioType, type ScenarioCategory } from './topologyScenarios';
import { generateTopology } from './scenarioGenerators';
import { TEST_TOPOLOGY_SCENARIOS, type TestTopologyScenario } from './testTopologyScenarios';
import { addTopologyRecord } from '@/utils/achievementRecords';

interface TopologyGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: {
    devices: CanvasDevice[];
    connections: CanvasConnection[];
    deviceStates: Map<string, SwitchState>;
    projectName?: string;
    projectDescription?: string;
  }) => void;
}

type GeneratorTab = 'architectures' | 'testLabs';
type TestCategoryFilter = 'all' | 'switching' | 'routing' | 'e2e' | 'security' | 'ipv6' | 'wireless' | 'diagnostics';

export function TopologyGeneratorDialog({
  open,
  onOpenChange,
  onGenerate,
}: TopologyGeneratorDialogProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isTr = language === 'tr';

  const [activeTab, setActiveTab] = useState<GeneratorTab>('architectures');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ScenarioCategory | 'all'>('all');
  const [selectedTestCategory, setSelectedTestCategory] = useState<TestCategoryFilter>('all');
  const [scenario, setScenario] = useState<ScenarioType>('soho');
  const [selectedTestId, setSelectedTestId] = useState<string>('test-stp-triangle');
  const [pcCount, setPcCount] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(false);

  // List of test topology scenarios
  const testScenarios = useMemo<TestTopologyScenario[]>(() => {
    return TEST_TOPOLOGY_SCENARIOS;
  }, []);

  const selectedDef = useMemo(() => {
    return SCENARIOS.find(s => s.id === scenario) ?? SCENARIOS[0];
  }, [scenario]);

  const selectedTest = useMemo(() => {
    return testScenarios.find(p => p.id === selectedTestId) ?? testScenarios[0];
  }, [testScenarios, selectedTestId]);

  const handleClose = useCallback(() => {
    if (!isLoading) onOpenChange(false);
  }, [isLoading, onOpenChange]);

  // Mobile back button support
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ topologyGenerator: true }, '');
    const onPopState = () => handleClose();
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [open, handleClose]);

  // Category labels for test scenarios
  const testCategoryLabels: Record<TestCategoryFilter, { tr: string; en: string }> = {
    all: { tr: 'Tüm Testler', en: 'All Tests' },
    switching: { tr: 'Anahtarlama', en: 'Switching' },
    routing: { tr: 'Yönlendirme', en: 'Routing' },
    e2e: { tr: 'Uçtan Uca (E2E)', en: 'End-to-End (E2E)' },
    security: { tr: 'Güvenlik', en: 'Security' },
    ipv6: { tr: 'IPv6', en: 'IPv6' },
    wireless: { tr: 'Kablosuz (WLC)', en: 'Wireless (WLC)' },
    diagnostics: { tr: 'Teşhis (Diagnostics)', en: 'Diagnostics' },
  };

  // Filtered standard scenarios
  const filteredScenarios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SCENARIOS.filter(s => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        s.labelTr.toLowerCase().includes(q) ||
        s.labelEn.toLowerCase().includes(q) ||
        s.descTr.toLowerCase().includes(q) ||
        s.descEn.toLowerCase().includes(q) ||
        CATEGORY_LABELS[s.category].tr.toLowerCase().includes(q) ||
        CATEGORY_LABELS[s.category].en.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Filtered test scenarios
  const filteredTestScenarios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return testScenarios.filter(p => {
      if (selectedTestCategory !== 'all' && p.category !== selectedTestCategory) return false;
      if (!q) return true;
      return (
        p.titleTr.toLowerCase().includes(q) ||
        p.titleEn.toLowerCase().includes(q) ||
        p.descTr.toLowerCase().includes(q) ||
        p.descEn.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.tags.some(tag => tag.toLowerCase().includes(q))
      );
    });
  }, [testScenarios, selectedTestCategory, searchQuery]);

  const allCategories: ScenarioCategory[] = [
    'basic',
    'topology',
    'datacenter',
    'wireless',
    'switching',
    'routing',
    'security'
  ];

  const handleGenerate = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        if (activeTab === 'architectures') {
          const result = generateTopology(scenario, pcCount);
          const name = isTr ? selectedDef.labelTr : selectedDef.labelEn;
          const description = isTr ? selectedDef.descTr : selectedDef.descEn;
          const objective = isTr ? selectedDef.objectiveTr : selectedDef.objectiveEn;

          const formattedDescription = [
            `📌 ${name}`,
            `🎯 ${isTr ? 'Amaç' : 'Objective'}: ${objective || description}`,
            `📋 ${isTr ? 'Ağ Yapısı' : 'Architecture'}: ${description}`,
          ].join('\n\n');

          onGenerate({
            ...result,
            projectName: name,
            projectDescription: formattedDescription,
          });
          addTopologyRecord(name, selectedDef.category);
          toast({
            title: isTr ? 'Topoloji Üretildi! 🚀' : 'Topology Generated! 🚀',
            description: isTr
              ? `${name} başarıyla oluşturuldu ve tuvale aktarıldı.`
              : `${name} successfully generated and added to canvas.`,
          });
        } else {
          // Generate Test scenario
          if (!selectedTest) return;

          const built = selectedTest.build(isTr);
          const title = isTr ? selectedTest.titleTr : selectedTest.titleEn;
          const desc = isTr ? selectedTest.descTr : selectedTest.descEn;
          const objective = isTr ? selectedTest.objectiveTr : selectedTest.objectiveEn;

          const formattedDescription = [
            `🧪 ${title}`,
            `🎯 Amaç: ${objective}`,
            `📋 Açıklama: ${desc}`,
            `⚙️ Doğrulama: ${isTr ? built.detailTr : built.detailEn}`,
          ].join('\n\n');

          onGenerate({
            devices: built.devices,
            connections: built.connections,
            deviceStates: built.deviceStates,
            projectName: title,
            projectDescription: formattedDescription,
          });
          addTopologyRecord(title, selectedTest.category);

          toast({
            title: isTr ? 'Test Topolojisi Yüklendi! 🧪' : 'Test Topology Loaded! 🧪',
            description: isTr
              ? `"${title}" başarıyla tuvale aktarıldı.`
              : `"${title}" successfully loaded.`,
          });
        }
        onOpenChange(false);
      } catch {
        toast({
          title: isTr ? 'Hata' : 'Error',
          description: isTr ? 'Topoloji oluşturulurken bir sorun oluştu.' : 'Failed to generate topology.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }, 150);
  }, [activeTab, scenario, pcCount, selectedDef, selectedTest, isTr, onGenerate, onOpenChange]);

  // Enter key trigger
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`${isDark
            ? 'bg-secondary-900 border-secondary-700/80 text-white'
            : 'bg-white border-secondary-200 text-secondary-900'
          } sm:max-w-3xl w-[95vw] rounded-2xl md:rounded-3xl shadow-2xl h-[88vh] max-h-[88vh] !flex !flex-col p-3 sm:p-5 !overflow-hidden !gap-0`}
        onEscapeKeyDown={isLoading ? undefined : () => handleClose()}
        onPointerDownOutside={isLoading ? undefined : () => handleClose()}
      >
        {/* Header */}
        <DialogHeader className="shrink-0 space-y-1 pb-1 pr-6">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base sm:text-xl font-bold flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="truncate">{isTr ? 'Otomatik Topoloji Üretici' : 'Automatic Topology Generator'}</span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {activeTab === 'architectures' ? `${SCENARIOS.length} ${isTr ? 'Mimari' : 'Architectures'}` : `${testScenarios.length} ${isTr ? 'Test Topolojisi' : 'Test Topologies'}`}
              </span>
            </div>
          </div>
          <DialogDescription className={`text-[11px] sm:text-xs leading-tight ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
            {isTr
              ? 'Standart ağ mimarilerini hazır doğrulama topolojilerini tek tıkla üretin.'
              : 'Instantly generate standard network architectures or verified test topologies with one click.'}
          </DialogDescription>
        </DialogHeader>

        {/* Top Tab Switcher */}
        <div className="shrink-0 pt-2 pb-1.5">
          <div className={`grid grid-cols-2 p-1 rounded-xl border ${isDark ? 'bg-secondary-950/70 border-secondary-800' : 'bg-secondary-100 border-secondary-200'}`}>
            <button
              onClick={() => setActiveTab('architectures')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === 'architectures'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : isDark
                    ? 'text-secondary-400 hover:text-secondary-200 hover:bg-secondary-800/60'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-white/60'
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isTr ? 'Standart Mimariler' : 'Standard Architectures'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-0.5">
                {SCENARIOS.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('testLabs')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === 'testLabs'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                  : isDark
                    ? 'text-secondary-400 hover:text-secondary-200 hover:bg-secondary-800/60'
                    : 'text-secondary-600 hover:text-secondary-900 hover:bg-white/60'
                }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{isTr ? 'Test Topolojileri' : 'Test Topologies'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 ml-0.5">
                {testScenarios.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filter bar: Search + Category Pills */}
        <div className="shrink-0 space-y-1.5 py-1">
          {/* Search bar */}
          <div className="relative">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'architectures'
                  ? (isTr ? 'Mimari ara (Spine-Leaf, OSPF, BGP, SOHO, DMZ)...' : 'Search scenario (Spine-Leaf, OSPF, BGP)...')
                  : (isTr ? 'Test senaryosu ara (STP, VXLAN EVPN, OSPF, HSRP)...' : 'Search test scenario (STP, VXLAN EVPN, OSPF)...')
              }
              className={`pl-8 pr-7 h-8 text-[11px] sm:text-xs rounded-lg ${isDark
                  ? 'bg-secondary-800/80 border-secondary-700 text-white placeholder:text-secondary-500 focus-visible:ring-purple-500/40'
                  : 'bg-secondary-50 border-secondary-200 text-secondary-900 placeholder:text-secondary-400 focus-visible:ring-purple-500/40'
                }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold ${isDark ? 'text-secondary-400 hover:text-white' : 'text-secondary-500 hover:text-secondary-900'}`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {activeTab === 'architectures' ? (
              <>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${selectedCategory === 'all'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isDark
                        ? 'bg-secondary-800 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/60'
                        : 'bg-secondary-100 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-200'
                    }`}
                >
                  {isTr ? 'Tümü' : 'All'} ({SCENARIOS.length})
                </button>
                {allCategories.map(cat => {
                  const count = SCENARIOS.filter(s => s.category === cat).length;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${isSelected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : isDark
                            ? 'bg-secondary-800 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/60'
                            : 'bg-secondary-100 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-200'
                        }`}
                    >
                      {isTr ? CATEGORY_LABELS[cat].tr : CATEGORY_LABELS[cat].en} ({count})
                    </button>
                  );
                })}
              </>
            ) : (
              (Object.keys(testCategoryLabels) as TestCategoryFilter[]).map(cat => {
                const count = cat === 'all' ? testScenarios.length : testScenarios.filter(p => p.category === cat).length;
                const isSelected = selectedTestCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedTestCategory(cat)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${isSelected
                        ? 'bg-purple-600 text-white shadow-sm'
                        : isDark
                          ? 'bg-secondary-800 text-secondary-400 hover:text-secondary-200 hover:bg-secondary-700/60'
                          : 'bg-secondary-100 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-200'
                      }`}
                  >
                    {isTr ? testCategoryLabels[cat].tr : testCategoryLabels[cat].en} ({count})
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Content List Area */}
        <div className="flex-1 overflow-y-auto min-h-0 py-1 space-y-2 custom-scrollbar">
          {activeTab === 'architectures' ? (
            filteredScenarios.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                {filteredScenarios.map(s => {
                  const Icon = s.icon;
                  const isSelected = scenario === s.id;
                  const badge = isTr ? s.badgeTr : s.badgeEn;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setScenario(s.id)}
                      className={`flex flex-col justify-between p-2.5 rounded-xl text-left transition-all duration-150 border relative group w-full min-w-0 box-border ${isSelected
                          ? isDark
                            ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/20'
                            : 'border-purple-500 bg-purple-50/90 ring-1 ring-purple-400/50 shadow-sm'
                          : isDark
                            ? 'border-secondary-800 hover:border-secondary-700 bg-secondary-800/40 hover:bg-secondary-800/80'
                            : 'border-secondary-200/90 hover:border-secondary-300 bg-secondary-50/60 hover:bg-secondary-100/80'
                        }`}
                    >
                      <div className="flex items-start gap-2.5 w-full min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 transition-colors ${isSelected
                            ? 'bg-purple-500 text-white'
                            : isDark
                              ? 'bg-secondary-700/70 text-secondary-300 group-hover:text-purple-400'
                              : 'bg-secondary-200/80 text-secondary-700 group-hover:text-purple-600'
                          }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 justify-between min-w-0">
                            <div className={`text-xs font-bold truncate min-w-0 flex-1 ${isSelected
                                ? isDark ? 'text-purple-200' : 'text-purple-900'
                                : isDark ? 'text-white' : 'text-secondary-900'
                              }`}>
                              {isTr ? s.labelTr : s.labelEn}
                            </div>
                            {badge && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium shrink-0 ml-1 ${isSelected
                                  ? 'bg-purple-500/30 text-purple-300 border border-purple-400/30'
                                  : isDark
                                    ? 'bg-secondary-700 text-secondary-400'
                                    : 'bg-secondary-200 text-secondary-600'
                                }`}>
                                {badge}
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] leading-tight mt-0.5 line-clamp-2 ${isDark ? 'text-secondary-400' : 'text-secondary-600'
                            }`}>
                            {isTr ? s.descTr : s.descEn}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-8 text-xs flex flex-col items-center justify-center gap-1.5 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                <Info className="w-5 h-5 opacity-60" />
                <span>{isTr ? 'Aradığınız kriterlere uygun mimari bulunamadı.' : 'No scenarios match your search.'}</span>
              </div>
            )
          ) : (
            filteredTestScenarios.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                {filteredTestScenarios.map(p => {
                  const isSelected = selectedTestId === p.id;
                  const title = isTr ? p.titleTr : p.titleEn;
                  const desc = isTr ? p.descTr : p.descEn;

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedTestId(p.id)}
                      className={`flex flex-col justify-between p-2.5 rounded-xl text-left transition-all duration-150 border relative group w-full min-w-0 box-border ${isSelected
                          ? isDark
                            ? 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500/50 shadow-md shadow-purple-950/20'
                            : 'border-purple-500 bg-purple-50/90 ring-1 ring-purple-400/50 shadow-sm'
                          : isDark
                            ? 'border-secondary-800 hover:border-secondary-700 bg-secondary-800/40 hover:bg-secondary-800/80'
                            : 'border-secondary-200/90 hover:border-secondary-300 bg-secondary-50/60 hover:bg-secondary-100/80'
                        }`}
                    >
                      <div className="flex items-start gap-2.5 w-full min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 transition-colors ${isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                          <FlaskConical className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 justify-between min-w-0">
                            <div className={`text-xs font-bold truncate min-w-0 flex-1 ${isSelected
                                ? isDark ? 'text-purple-200' : 'text-purple-900'
                                : isDark ? 'text-white' : 'text-secondary-900'
                              }`}>
                              {title}
                            </div>
                          </div>
                          <p className={`text-[10px] leading-tight mt-1 line-clamp-2 ${isDark ? 'text-secondary-400' : 'text-secondary-600'
                            }`}>
                            {desc}
                          </p>
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {p.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className={`text-[8px] px-1 py-0.2 rounded font-mono ${isDark ? 'bg-secondary-800 text-secondary-400' : 'bg-secondary-200 text-secondary-600'
                                    }`}
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={`text-center py-8 text-xs flex flex-col items-center justify-center gap-1.5 ${isDark ? 'text-secondary-500' : 'text-secondary-400'}`}>
                <Info className="w-5 h-5 opacity-60" />
                <span>{isTr ? 'Aradığınız kriterlere uygun test senaryosu bulunamadı.' : 'No test scenarios match your search.'}</span>
              </div>
            )
          )}
        </div>

        {/* Selected Preview & Actions */}
        <div className={`shrink-0 pt-2.5 mt-auto border-t ${isDark ? 'border-secondary-800 bg-secondary-900' : 'border-secondary-200 bg-white'} space-y-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Selected description pill */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <div className={`p-1 rounded-md shrink-0 ${isDark ? 'bg-purple-950/40 text-purple-400 border border-purple-500/20' : 'bg-purple-100 text-purple-700'}`}>
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="text-[10px] sm:text-[11px] leading-tight min-w-0 truncate">
                {activeTab === 'architectures' ? (
                  <>
                    <span className="font-semibold text-purple-400">{isTr ? selectedDef.labelTr : selectedDef.labelEn}: </span>
                    <span className={isDark ? 'text-secondary-300' : 'text-secondary-600'}>
                      {isTr ? selectedDef.descTr : selectedDef.descEn}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-purple-400">
                      {isTr ? selectedTest?.titleTr : selectedTest?.titleEn}:{' '}
                    </span>
                    <span className={isDark ? 'text-secondary-300' : 'text-secondary-600'}>
                      {isTr ? selectedTest?.descTr : selectedTest?.descEn}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* PC Count Selector if applicable (Only in standard architectures) */}
            {activeTab === 'architectures' && selectedDef.showPcCount && (
              <div className="flex items-center gap-1 shrink-0">
                <Label className="text-[10px] font-bold shrink-0">{isTr ? 'Uç Cihaz:' : 'Clients:'}</Label>
                <div className="flex gap-1">
                  {[1, 2, 4].map(num => (
                    <Button
                      key={num}
                      size="sm"
                      variant={pcCount === num ? 'default' : 'outline'}
                      className={`h-6 px-1.5 text-[10px] rounded-md ${pcCount === num
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : isDark
                            ? 'border-secondary-700 hover:bg-secondary-800'
                            : 'border-secondary-300 hover:bg-secondary-100'
                        }`}
                      onClick={() => setPcCount(num)}
                    >
                      <Monitor className="w-2.5 h-2.5 mr-0.5" />
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isLoading}
              className="text-xs h-8 px-3 rounded-lg"
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs h-8.5 px-4.5 rounded-lg shadow-md shadow-purple-600/30 transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  {isTr ? 'Oluşturuluyor...' : 'Generating...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1" />
                  {isTr ? 'Topolojiyi Üret & Yükle' : 'Generate & Load'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

