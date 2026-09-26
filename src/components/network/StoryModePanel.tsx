'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Crosshair,
  Gamepad2,
  Lightbulb,
  Maximize2,
  Minus,
  Radio,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { safeGetJSON, safeSetJSON } from '@/lib/storage/safeStorage';
import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { STORY_CAMPAIGNS, type StoryCampaign, type StoryStep } from '@/lib/network/storyScenarios';
import { addStoryCampaignRecord, getSummary } from '@/utils/achievementRecords';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

type SavedStoryState = {
  campaignId: string;
  stepIndex: number;
  score: number;
  skipped: number;
  completed: boolean;
  completedCampaigns?: string[];
  choicesMade?: Record<string, number>;
};

const STORAGE_KEY = 'netsim_interactive_story_v4';

function initialStoryState(): SavedStoryState {
  return {
    campaignId: STORY_CAMPAIGNS[0].id,
    stepIndex: 0,
    score: 0,
    skipped: 0,
    completed: false,
    completedCampaigns: [],
    choicesMade: {},
  };
}

export function StoryModePanel({
  open,
  onClose,
  topologyDevices = [],
  topologyConnections = [],
  deviceStates,
}: {
  open: boolean;
  onClose: () => void;
  topologyDevices?: CanvasDevice[];
  topologyConnections?: CanvasConnection[];
  deviceStates?: Map<string, SwitchState>;
}) {
  const { t, language } = useLanguage();
  const isTr = language === 'tr';
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'high-contrast';

  const [state, setState] = useState<SavedStoryState>(initialStoryState);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 460, height: 650 });
  const [message, setMessage] = useState('');
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'Tümü' | 'Basit' | 'Orta' | 'İleri'>('Tümü');
  const interaction = useRef<{ type: 'drag' | 'resize'; x: number; y: number; width: number; height: number } | null>(null);
  const completedKey = useRef<string | null>(null);
  const { toast } = useToast();

  // Load state from safeStorage
  useEffect(() => {
    const saved = safeGetJSON<Partial<typeof state> | null>(STORAGE_KEY, null);
    if (saved && typeof saved === 'object') {
      setState((prev) => ({ ...prev, ...saved }));
    }
  }, []);

  // Persist state to safeStorage
  useEffect(() => {
    if (open) {
      safeSetJSON(STORAGE_KEY, state);
    }
  }, [state, open]);

  // Handle escape / mobile back
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const closeOnMobileBack = () => onClose();
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('mobile-back-pressed', closeOnMobileBack);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('mobile-back-pressed', closeOnMobileBack);
    };
  }, [open, onClose]);

  // Current active campaign and step
  const activeCampaign: StoryCampaign = useMemo(() => {
    return STORY_CAMPAIGNS.find((c) => c.id === state.campaignId) || STORY_CAMPAIGNS[0];
  }, [state.campaignId]);

  const currentStep: StoryStep = useMemo(() => {
    const steps = activeCampaign.steps;
    const idx = Math.min(Math.max(0, state.stepIndex), steps.length - 1);
    return steps[idx];
  }, [activeCampaign, state.stepIndex]);

  // Check objective completion automatically
  const activityComplete = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.check(topologyDevices, topologyConnections, deviceStates);
  }, [currentStep, topologyDevices, topologyConnections, deviceStates]);

  // Rank calculation based on score
  const rank = useMemo(() => {
    if (state.score >= 1200) return isTr ? 'Baş Siber Operatör' : 'Lead Cyber Operator';
    if (state.score >= 800) return isTr ? 'Ağ Mimarı' : 'Network Architect';
    if (state.score >= 500) return isTr ? 'Siber Savunucu' : 'Cyber Defender';
    if (state.score >= 250) return isTr ? 'Ağ Teknisyeni' : 'Network Technician';
    return isTr ? 'Stajyer' : 'Trainee';
  }, [state.score, isTr]);

  // Auto trigger stage progression on objective complete
  useEffect(() => {
    if (!open || !activityComplete || state.completed) return;
    const stepKey = `${state.campaignId}:${state.stepIndex}:${topologyDevices.length}:${topologyConnections.length}`;
    if (completedKey.current === stepKey) return;
    completedKey.current = stepKey;

    const earned = currentStep.points;
    const isLast = state.stepIndex >= activeCampaign.steps.length - 1;
    const nextScore = state.score + earned;

    if (isLast) {
      addStoryCampaignRecord(activeCampaign.id, activeCampaign.title, nextScore, rank);
    }

    const stepTitle = (!isTr && currentStep.titleEn) ? currentStep.titleEn : currentStep.title;
    const stepLearn = (!isTr && currentStep.learnEn) ? currentStep.learnEn : currentStep.learn;
    const campaignTitle = (!isTr && activeCampaign.titleEn) ? activeCampaign.titleEn : activeCampaign.title;

    setMessage(isTr ? `Tebrikler! ${stepLearn}` : `Congratulations! ${stepLearn}`);
    toast({
      title: isLast
        ? (isTr ? 'SENARYO TAMAMLANDI!' : 'CAMPAIGN COMPLETED!')
        : (isTr ? 'Görev Başarıyla Tamamlandı!' : 'Objective Successfully Completed!'),
      description: isLast
        ? (isTr ? `${campaignTitle} senaryosunu başarıyla tamamladın!` : `Successfully completed ${campaignTitle} campaign!`)
        : (isTr ? `${stepTitle} tamamlandı. +${earned} Puan Kazandın!` : `${stepTitle} completed. Earned +${earned} Points!`),
    });

    setState((prev) => {
      const isAlreadyCompleted = prev.completedCampaigns?.includes(prev.campaignId);
      const updatedCampaigns = isLast && !isAlreadyCompleted
        ? [...(prev.completedCampaigns || []), prev.campaignId]
        : prev.completedCampaigns || [];

      return {
        ...prev,
        score: nextScore,
        stepIndex: isLast ? prev.stepIndex : prev.stepIndex + 1,
        completed: isLast,
        completedCampaigns: updatedCampaigns,
      };
    });
  }, [
    open,
    activityComplete,
    state.completed,
    state.campaignId,
    state.stepIndex,
    state.score,
    topologyDevices.length,
    topologyConnections.length,
    currentStep,
    activeCampaign,
    rank,
    toast,
  ]);

  // Drag & Resize Handlers
  useEffect(() => {
    const move = (event: MouseEvent) => {
      const active = interaction.current;
      if (!active) return;
      if (active.type === 'drag') {
        setPosition({ x: event.clientX - active.x, y: event.clientY - active.y });
      } else {
        setSize({
          width: Math.max(340, active.width + event.clientX - active.x),
          height: Math.max(340, active.height + event.clientY - active.y),
        });
      }
    };
    const stop = () => {
      interaction.current = null;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  const beginDrag = (event: React.MouseEvent) => {
    interaction.current = {
      type: 'drag',
      x: event.clientX - position.x,
      y: event.clientY - position.y,
      width: 0,
      height: 0,
    };
  };

  const beginResize = (event: React.MouseEvent) => {
    event.stopPropagation();
    interaction.current = {
      type: 'resize',
      x: event.clientX,
      y: event.clientY,
      width: size.width,
      height: size.height,
    };
  };

  const summary = getSummary();

  if (!open) return null;

  const handleManualCheck = () => {
    if (!activityComplete) {
      setMessage(
        isTr
          ? 'Görev şartları henüz karşılanmadı. Lütfen çalışma alanındaki cihazları ve bağlantıları kontrol et.'
          : 'Objective requirements are not yet met. Please check the devices and connections in the workspace.'
      );
      return;
    }
    const stepLearn = (!isTr && currentStep.learnEn) ? currentStep.learnEn : currentStep.learn;
    setMessage(isTr ? `Harika iş çıkardın! ${stepLearn}` : `Great job! ${stepLearn}`);
  };

  const handleSkip = () => {
    const isLast = state.stepIndex >= activeCampaign.steps.length - 1;
    if (isLast) {
      addStoryCampaignRecord(activeCampaign.id, activeCampaign.title, state.score, rank);
    }
    setMessage(
      isTr
        ? 'Aşama atlandı. İlgili konuyu daha sonra tekrar inceleyebilirsin.'
        : 'Stage skipped. You can review this topic again later.'
    );
    setState((prev) => {
      const isAlreadyCompleted = prev.completedCampaigns?.includes(prev.campaignId);
      const updatedCampaigns = isLast && !isAlreadyCompleted
        ? [...(prev.completedCampaigns || []), prev.campaignId]
        : prev.completedCampaigns || [];

      return {
        ...prev,
        skipped: prev.skipped + 1,
        stepIndex: isLast ? prev.stepIndex : prev.stepIndex + 1,
        completed: isLast,
        completedCampaigns: updatedCampaigns,
      };
    });
  };

  const handleResetCampaign = () => {
    setState((prev) => ({
      ...prev,
      stepIndex: 0,
      completed: false,
    }));
    setMessage(isTr ? 'Senaryo baştan başlatıldı.' : 'Campaign restarted.');
  };

  const handleSelectCampaign = (campaignId: string) => {
    setState((prev) => ({
      ...prev,
      campaignId,
      stepIndex: 0,
      completed: prev.completedCampaigns?.includes(campaignId) || false,
    }));
    setShowCampaignSelector(false);
    setMessage(isTr ? 'Yeni hikaye senaryosu yüklendi.' : 'New story campaign loaded.');
  };

  const handleChoiceSelect = (optionIndex: number) => {
    if (!currentStep.choice) return;
    const chosen = currentStep.choice.options[optionIndex];
    if (!chosen) return;

    const choiceKey = `${state.campaignId}:${state.stepIndex}`;
    if (state.choicesMade?.[choiceKey] !== undefined) return;

    setState((prev) => ({
      ...prev,
      score: prev.score + chosen.bonusPoints,
      choicesMade: {
        ...prev.choicesMade,
        [choiceKey]: optionIndex,
      },
    }));

    const effectText = (!isTr && chosen.effectTextEn) ? chosen.effectTextEn : chosen.effectText;
    toast({
      title: isTr ? 'Karar Verildi!' : 'Decision Made!',
      description: `${effectText} +${chosen.bonusPoints} ${isTr ? 'Bonus Puan!' : 'Bonus Points!'}`,
    });
  };

  const renderIcon = (name: string) => {
    switch (name) {
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-sky-400" />;
      case 'RefreshCw':
        return <RefreshCw className="w-5 h-5 text-emerald-400" />;
      default:
        return <Shield className="w-5 h-5 text-primary-400" />;
    }
  };

  return (
    <div
      className="fixed z-[120] pointer-events-none"
      style={{
        right: 16 - position.x,
        top: 80 + position.y,
        width: `min(${size.width}px, calc(100vw - 2rem))`,
        height: collapsed ? 58 : `min(${size.height}px, calc(100vh - 6.5rem))`,
      }}
    >
      <section
        className={`relative h-full rounded-2xl border shadow-2xl overflow-hidden pointer-events-auto flex flex-col transition-colors ${isDark
            ? 'border-primary-500/30 bg-secondary-950/95 text-white'
            : 'border-primary-500/40 bg-white/95 text-secondary-900'
          }`}
        role="dialog"
        aria-modal="false"
        aria-label="Etkileşimli Hikaye Modu"
      >
        {/* Header / Drag Bar */}
        <div
          onMouseDown={beginDrag}
          className={`h-[58px] px-4 py-3 border-b flex items-center justify-between cursor-move select-none shrink-0 ${isDark
              ? 'border-white/10 bg-gradient-to-r from-primary-950 via-secondary-950 to-primary-950 text-white'
              : 'border-secondary-200 bg-gradient-to-r from-primary-50 via-secondary-50 to-primary-50 text-secondary-900'
            }`}
        >
          <div className="flex items-center gap-2 text-primary-500 font-bold text-xs tracking-widest">
            <Gamepad2 className="w-4 h-4 text-primary-500 animate-pulse" />
            <span>{isTr ? 'ETKİLEŞİMLİ HİKAYE MODU' : 'INTERACTIVE STORY MODE'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-xs px-2 ${isDark
                  ? 'text-primary-300 hover:text-primary-100 hover:bg-white/10'
                  : 'text-primary-700 hover:text-primary-900 hover:bg-primary-50'
                }`}
              onClick={() => setShowCampaignSelector((v) => !v)}
              title={isTr ? "Senaryo Değiştir" : "Change Scenario"}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {isTr ? "Senaryolar" : "Scenarios"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? (isTr ? 'Genişlet' : 'Expand') : (isTr ? 'Daralt' : 'Collapse')}
            >
              {collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-error-500 hover:bg-error-500/10 hover:text-error-400"
              onClick={onClose}
              aria-label={isTr ? "Kapat" : "Close"}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        {!collapsed && (
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* Campaign Selector Overlay Modal */}
            {showCampaignSelector ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold tracking-wider ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>
                    {t.selectStoryCampaign || (isTr ? 'HİKAYE SENARYOSU SEÇ' : 'SELECT STORY CAMPAIGN')}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCampaignSelector(false)}>
                    {t.back || (isTr ? 'Geri' : 'Back')}
                  </Button>
                </div>

                {/* Category Filter Pills */}
                <div className={`flex gap-1.5 p-1 rounded-xl border text-xs ${isDark ? 'bg-secondary-900/80 border-white/10' : 'bg-secondary-100 border-secondary-200'
                  }`}>
                  {[
                    { id: 'Tümü', label: t.filterAll || (isTr ? 'Tümü' : 'All') },
                    { id: 'Basit', label: t.filterBasic || (isTr ? 'Basit' : 'Basic') },
                    { id: 'Orta', label: t.filterIntermediate || (isTr ? 'Orta' : 'Intermediate') },
                    { id: 'İleri', label: t.filterAdvanced || (isTr ? 'İleri' : 'Advanced') },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as 'Tümü' | 'Basit' | 'Orta' | 'İleri')}
                      className={`flex-1 py-1 px-2 rounded-lg font-bold transition-all text-center ${selectedCategory === cat.id
                          ? 'bg-primary-500 text-white shadow-sm'
                          : isDark
                            ? 'text-secondary-400 hover:text-white hover:bg-white/5'
                            : 'text-secondary-600 hover:text-secondary-900 hover:bg-secondary-200'
                        }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {STORY_CAMPAIGNS.filter(
                    (campaign) => selectedCategory === 'Tümü' || campaign.category === selectedCategory
                  ).map((campaign) => {
                    const isCompleted =
                      state.completedCampaigns?.includes(campaign.id) ||
                      summary.storyCampaigns?.some((sc) => sc.id === campaign.id);

                    const categoryLabel =
                      campaign.category === 'Basit'
                        ? (isTr ? 'Basit' : 'Basic')
                        : campaign.category === 'Orta'
                          ? (isTr ? 'Orta' : 'Intermediate')
                          : (isTr ? 'İleri' : 'Advanced');

                    const categoryBadgeColor =
                      campaign.category === 'Basit'
                        ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : campaign.category === 'Orta'
                          ? isDark ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-sky-100 text-sky-800 border-sky-300'
                          : isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300';

                    return (
                      <div
                        key={campaign.id}
                        onClick={() => handleSelectCampaign(campaign.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${campaign.id === state.campaignId
                            ? isDark
                              ? 'border-primary-500 bg-primary-950/50 shadow-lg'
                              : 'border-primary-500 bg-primary-50/80 shadow-lg'
                            : isCompleted
                              ? isDark
                                ? 'border-success-500/40 bg-success-950/20 hover:border-success-400/80 hover:bg-success-950/30'
                                : 'border-success-300 bg-success-50/80 hover:border-success-400'
                              : isDark
                                ? 'border-white/10 bg-secondary-900/60 hover:border-primary-400/80 hover:bg-primary-500/10'
                                : 'border-secondary-200 bg-secondary-50/60 hover:border-primary-400 hover:bg-primary-50/50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderIcon(campaign.iconName)}
                            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-secondary-900'}`}>
                              {(!isTr && campaign.titleEn) ? campaign.titleEn : campaign.title}
                            </span>
                            {isCompleted && (
                              <span title={isTr ? "Tamamlandı" : "Completed"} className="text-sm leading-none select-none">
                                👍
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadgeColor}`}>
                              {categoryLabel}
                            </span>
                            {isCompleted && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${isDark
                                  ? 'bg-success-500/20 text-success-300 border-success-500/40'
                                  : 'bg-success-100 text-success-700 border-success-300'
                                }`}>
                                {isTr ? 'TAMAMLANDI' : 'COMPLETED'}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-secondary-300' : 'text-secondary-600'}`}>
                          {(!isTr && campaign.descriptionEn) ? campaign.descriptionEn : campaign.description}
                        </p>
                        <div className={`mt-3 flex items-center justify-between text-[11px] border-t pt-2 ${isDark ? 'text-secondary-400 border-white/5' : 'text-secondary-500 border-secondary-200'
                          }`}>
                          <span>{isTr ? 'Rol' : 'Role'}: {(!isTr && campaign.roleEn) ? campaign.roleEn : campaign.role}</span>
                          <span className="flex items-center font-semibold">
                            {isCompleted ? (
                              <span className={isDark ? 'text-success-400 flex items-center gap-1' : 'text-success-600 flex items-center gap-1'}>
                                {isTr ? 'Tekrar Dene' : 'Retry'} <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className={isDark ? 'text-primary-400 flex items-center gap-1' : 'text-primary-600 flex items-center gap-1'}>
                                {isTr ? 'Başla' : 'Start'} <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Header Stats Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                      <span className={`font-medium truncate ${isDark ? 'text-secondary-300' : 'text-secondary-700'}`}>
                        {(!isTr && activeCampaign.titleEn) ? activeCampaign.titleEn : activeCampaign.title}
                      </span>
                      {state.completedCampaigns?.includes(activeCampaign.id) && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${isDark
                            ? 'bg-success-500/20 text-success-300 border-success-500/30'
                            : 'bg-success-100 text-success-800 border-success-300'
                          }`}>
                          {isTr ? 'Tamamlandı' : 'Completed'}
                        </span>
                      )}
                    </div>
                    <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {state.score} {isTr ? 'Puan' : 'Points'} · <span className={isDark ? 'text-primary-300' : 'text-primary-600'}>{rank}</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-secondary-200'}`}>
                    <div
                      className="h-2 bg-gradient-to-r from-primary-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${((state.completed ? activeCampaign.steps.length : state.stepIndex) /
                          activeCampaign.steps.length) *
                          100
                          }%`,
                      }}
                    />
                  </div>
                  <div className={`flex justify-between text-[11px] ${isDark ? 'text-secondary-400' : 'text-secondary-500'}`}>
                    <span>
                      {isTr ? 'Aşama' : 'Stage'} {Math.min(state.stepIndex + 1, activeCampaign.steps.length)} / {activeCampaign.steps.length}
                    </span>
                    <span>
                      {(!isTr && currentStep?.levelEn) ? currentStep.levelEn : (currentStep?.level || (isTr ? 'Başlangıç' : 'Beginner'))}
                    </span>
                  </div>
                </div>

                {/* Main Step Display or Completion Card */}
                {state.completed ? (
                  <div className={`rounded-xl border p-6 text-center space-y-3 ${isDark ? 'bg-success-500/10 border-success-500/30' : 'bg-success-50 border-success-300'
                    }`}>
                    <div className="mx-auto w-14 h-14 rounded-full bg-success-500/20 border border-success-500/40 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                      👍
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs ${isDark ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-amber-100 border-amber-300 text-amber-800'
                      }`}>
                      <CheckCircle2 className="w-4 h-4 text-success-500" /> {isTr ? 'SENARYO TAMAMLANDI 👍' : 'CAMPAIGN COMPLETED 👍'}
                    </div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-secondary-900'}`}>
                      {isTr ? 'Tebrikler! Senaryoyu Bitirdin!' : 'Congratulations! Campaign Completed!'}
                    </h3>
                    <p className={`text-sm ${isDark ? 'text-secondary-300' : 'text-secondary-600'}`}>
                      {isTr ? (
                        <><strong>{activeCampaign.title}</strong> operasyonunu başarıyla sevk ve idare ettin.</>
                      ) : (
                        <>Successfully completed the <strong>{(!isTr && activeCampaign.titleEn) ? activeCampaign.titleEn : activeCampaign.title}</strong> operation.</>
                      )}
                    </p>
                    <div className={`p-3 rounded-lg border text-xs space-y-1 ${isDark ? 'bg-secondary-900/80 border-white/10' : 'bg-white border-secondary-200'
                      }`}>
                      <div>
                        {isTr ? 'Toplam Skor:' : 'Total Score:'} <strong className={isDark ? 'text-amber-300' : 'text-amber-600'}>{state.score} {isTr ? 'Puan' : 'Points'}</strong>
                      </div>
                      <div>
                        {isTr ? 'Kazanılan Unvan:' : 'Earned Rank:'} <strong className={isDark ? 'text-primary-300' : 'text-primary-600'}>{rank}</strong>
                      </div>
                      <div>{isTr ? 'Atlanan Aşama:' : 'Skipped Stages:'} {state.skipped}</div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2">
                      <Button
                        variant="outline"
                        className={`flex-1 text-xs ${isDark
                            ? 'border-primary-500/40 text-primary-300 hover:bg-primary-500/20'
                            : 'border-primary-400 text-primary-700 hover:bg-primary-50'
                          }`}
                        onClick={() => setShowCampaignSelector(true)}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> {isTr ? 'Yeni Senaryo Seç' : 'Select New Campaign'}
                      </Button>
                      <Button
                        variant="outline"
                        className={`flex-1 text-xs ${isDark
                            ? 'border-white/20 text-secondary-200 hover:bg-white/10'
                            : 'border-secondary-300 text-secondary-700 hover:bg-secondary-100'
                          }`}
                        onClick={handleResetCampaign}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-500" /> {isTr ? 'Baştan Başla' : 'Restart Campaign'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Telsiz / Incident Broadcast Banner */}
                    {currentStep.incidentEvent && (
                      <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${isDark ? 'border-amber-500/30 bg-amber-950/40' : 'border-amber-300 bg-amber-50/80'
                        }`}>
                        <Radio className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                              {(!isTr && currentStep.incidentEvent.titleEn) ? currentStep.incidentEvent.titleEn : currentStep.incidentEvent.title}
                            </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-200/90' : 'text-amber-900'}`}>
                            {(!isTr && currentStep.incidentEvent.detailEn) ? currentStep.incidentEvent.detailEn : currentStep.incidentEvent.detail}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step Title & Narrative */}
                    <div className="space-y-2">
                      <div className={`flex items-center gap-2 font-bold text-base ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>
                        {renderIcon(activeCampaign.iconName)}
                        <span>{(!isTr && currentStep.titleEn) ? currentStep.titleEn : currentStep.title}</span>
                      </div>
                      <p className={`text-sm leading-relaxed border-l-2 pl-3 py-1 rounded-r-lg ${isDark
                          ? 'border-primary-500/40 text-secondary-200 bg-primary-950/20'
                          : 'border-primary-400 text-secondary-700 bg-primary-50/50'
                        }`}>
                        {(!isTr && currentStep.narrativeEn) ? currentStep.narrativeEn : currentStep.narrative}
                      </p>
                    </div>

                    {/* Objective Card */}
                    <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'border-primary-400/30 bg-primary-950/30' : 'border-primary-200 bg-primary-50/40'
                      }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`uppercase tracking-widest font-bold flex items-center gap-1.5 ${isDark ? 'text-primary-300' : 'text-primary-700'
                          }`}>
                          <Shield className="w-3.5 h-3.5" /> {isTr ? 'GÖREV HEDEFİ' : 'MISSION OBJECTIVE'}
                        </span>
                        <span className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                          +{currentStep.points} {isTr ? 'Puan' : 'Pts'}
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-secondary-900'}`}>
                        {(!isTr && currentStep.objectiveEn) ? currentStep.objectiveEn : currentStep.objective}
                      </p>
                      <div className={`flex items-center justify-between pt-2 border-t text-xs ${isDark ? 'border-white/10 text-secondary-400' : 'border-secondary-200 text-secondary-500'
                        }`}>
                        <span>{isTr ? 'Canlı Ağ Durumu:' : 'Live Network State:'}</span>
                        <span className={`font-semibold ${isDark ? 'text-primary-300' : 'text-primary-700'}`}>
                          {topologyDevices.length} {isTr ? 'Cihaz' : 'Devices'} · {topologyConnections.length} {isTr ? 'Bağlantı' : 'Connections'}
                        </span>
                      </div>
                    </div>

                    {/* Choice Event if present */}
                    {currentStep.choice && (
                      <div className={`rounded-xl border p-3.5 space-y-2 ${isDark ? 'border-sky-500/30 bg-sky-950/30' : 'border-sky-300 bg-sky-50/60'
                        }`}>
                        <p className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-sky-300' : 'text-sky-800'}`}>
                          <AlertTriangle className="w-3.5 h-3.5 text-sky-500" />
                          {isTr ? 'KARAR NOKTASI:' : 'DECISION POINT:'} {(!isTr && currentStep.choice.questionEn) ? currentStep.choice.questionEn : currentStep.choice.question}
                        </p>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {currentStep.choice.options.map((option, idx) => {
                            const choiceKey = `${state.campaignId}:${state.stepIndex}`;
                            const isSelected = state.choicesMade?.[choiceKey] === idx;
                            const isChosenAny = state.choicesMade?.[choiceKey] !== undefined;

                            return (
                              <button
                                key={`choice-opt-${idx}-${option.id || idx}`}
                                disabled={isChosenAny}
                                onClick={() => handleChoiceSelect(idx)}
                                className={`text-left text-xs p-2.5 rounded-lg border transition-all ${isSelected
                                    ? isDark
                                      ? 'bg-sky-500/20 border-sky-400 text-sky-100 font-semibold'
                                      : 'bg-sky-100 border-sky-400 text-sky-900 font-semibold'
                                    : isChosenAny
                                      ? isDark
                                        ? 'bg-secondary-900/40 border-white/5 text-secondary-500 cursor-not-allowed'
                                        : 'bg-secondary-100 border-secondary-200 text-secondary-400 cursor-not-allowed'
                                      : isDark
                                        ? 'bg-secondary-900/80 border-white/10 text-secondary-200 hover:border-sky-400/50 hover:bg-sky-950/50'
                                        : 'bg-white border-secondary-200 text-secondary-700 hover:border-sky-400 hover:bg-sky-50'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{(!isTr && option.labelEn) ? option.labelEn : option.label}</span>
                                  <span className={`text-[10px] font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                    +{option.bonusPoints} BP
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Status Feedback Message */}
                    {message && (
                      <div className={`p-3 rounded-lg border text-xs leading-relaxed ${isDark ? 'bg-primary-500/10 border-primary-500/20 text-primary-200' : 'bg-primary-50 border-primary-200 text-primary-900'
                        }`}>
                        {message}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button onClick={handleManualCheck} size="sm" className="gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> {isTr ? 'Görevi Doğrula' : 'Verify Objective'}
                      </Button>
                      {topologyDevices.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const firstDev = topologyDevices[0];
                            if (firstDev) {
                              window.dispatchEvent(new CustomEvent('focus-device', {
                                detail: {
                                  deviceId: firstDev.id,
                                  x: firstDev.x,
                                  y: firstDev.y
                                }
                              }));
                              toast({
                                title: isTr ? "Cihaz Odaklandı" : "Device Focused",
                                description: `${firstDev.name} (${firstDev.type})`
                              });
                            }
                          }}
                          className={`gap-1.5 ${isDark ? 'border-primary-500/30 text-primary-300 hover:bg-primary-500/20' : 'border-primary-300 text-primary-700 hover:bg-primary-50'
                            }`}
                          title={isTr ? "Topolojideki cihazı ortala ve odaklan" : "Pan and focus on topology device"}
                        >
                          <Crosshair className="w-4 h-4 text-primary-500" /> {isTr ? 'Cihaza Odaklan' : 'Focus Device'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const hintText = (!isTr && currentStep.hintEn) ? currentStep.hintEn : currentStep.hint;
                          setMessage(`${isTr ? 'İpucu:' : 'Hint:'} ${hintText}`);
                        }}
                        className={`gap-1.5 ${isDark ? 'border-white/20 text-secondary-200 hover:bg-white/10' : 'border-secondary-300 text-secondary-700 hover:bg-secondary-100'
                          }`}
                      >
                        <Lightbulb className="w-4 h-4 text-amber-500" /> {isTr ? 'İpucu' : 'Hint'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className={`gap-1.5 ${isDark ? 'text-secondary-400 hover:text-white' : 'text-secondary-500 hover:text-secondary-900'}`}
                      >
                        <SkipForward className="w-4 h-4" /> {isTr ? 'Aşama Geç' : 'Skip Stage'}
                      </Button>
                    </div>
                  </>
                )}

                {/* Footer Controls */}
                <div className={`flex items-center justify-between border-t pt-3 text-xs ${isDark ? 'border-white/10 text-secondary-400' : 'border-secondary-200 text-secondary-500'
                  }`}>
                  <span>{state.skipped} {isTr ? 'Aşama Atlandı' : 'Stages Skipped'}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCampaignSelector(true)}
                      className={`h-7 text-xs ${isDark ? 'text-primary-300 hover:text-primary-100 hover:bg-white/10' : 'text-primary-700 hover:text-primary-900 hover:bg-primary-50'
                        }`}
                    >
                      <Sparkles className="w-3 h-3 mr-1 text-primary-500" /> {isTr ? 'Senaryo Seç' : 'Select Scenario'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetCampaign}
                      className={`h-7 text-xs ${isDark ? 'text-secondary-400 hover:text-error-400' : 'text-secondary-500 hover:text-error-600'
                        }`}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> {isTr ? 'Baştan Başla' : 'Restart'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Resizer handle */}
        {!collapsed && (
          <div
            onMouseDown={beginResize}
            className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-end justify-end opacity-80 hover:opacity-100 transition-opacity z-[60] select-none"
            aria-label="Pencereyi yeniden boyutlandır"
            title="Boyutlandır"
          >
            <div className={`w-2.5 h-2.5 rounded-br-full border-b-2 border-r-2 bg-transparent ${isDark ? 'border-secondary-400' : 'border-secondary-600'
              }`} />
          </div>
        )}
      </section>
    </div>
  );
}
