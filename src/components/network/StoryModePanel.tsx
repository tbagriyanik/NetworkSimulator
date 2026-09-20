'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Cpu,
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
import type { CanvasConnection, CanvasDevice } from '@/components/network/NetworkTopology/types/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { STORY_CAMPAIGNS, type StoryCampaign, type StoryStep } from '@/lib/network/storyScenarios';
import { addStoryCampaignRecord, getSummary } from '@/utils/achievementRecords';

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
  const [state, setState] = useState<SavedStoryState>(initialStoryState);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 460, height: 650 });
  const [message, setMessage] = useState('');
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const interaction = useRef<{ type: 'drag' | 'resize'; x: number; y: number; width: number; height: number } | null>(null);
  const completedKey = useRef<string | null>(null);
  const { toast } = useToast();

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setState((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    if (open) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore storage write errors
      }
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
    if (state.score >= 1200) return 'Baş Siber Operatör';
    if (state.score >= 800) return 'Ağ Mimarı';
    if (state.score >= 500) return 'Siber Savunucu';
    if (state.score >= 250) return 'Ağ Teknisyeni';
    return 'Stajyer';
  }, [state.score]);

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

    setMessage(`Tebrikler! ${currentStep.learn}`);
    toast({
      title: isLast ? 'SENARYO TAMAMLANDI!' : 'Görev Başarıyla Tamamlandı!',
      description: isLast
        ? `${activeCampaign.title} senaryosunu başarıyla tamamladın!`
        : `${currentStep.title} tamamlandı. +${earned} Puan Kazandın!`,
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
      setMessage('Görev şartları henüz karşılanmadı. Lütfen çalışma alanındaki cihazları ve bağlantıları kontrol et.');
      return;
    }
    setMessage(`Harika iş çıkardın! ${currentStep.learn}`);
  };

  const handleSkip = () => {
    const isLast = state.stepIndex >= activeCampaign.steps.length - 1;
    if (isLast) {
      addStoryCampaignRecord(activeCampaign.id, activeCampaign.title, state.score, rank);
    }
    setMessage('Aşama atlandı. İlgili konuyu daha sonra tekrar inceleyebilirsin.');
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
    setMessage('Senaryo baştan başlatıldı.');
  };

  const handleSelectCampaign = (campaignId: string) => {
    setState((prev) => ({
      ...prev,
      campaignId,
      stepIndex: 0,
      completed: prev.completedCampaigns?.includes(campaignId) || false,
    }));
    setShowCampaignSelector(false);
    setMessage('Yeni hikaye senaryosu yüklendi.');
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

    toast({
      title: 'Karar Verildi!',
      description: `${chosen.effectText} +${chosen.bonusPoints} Bonus Puan!`,
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
        className="relative h-full rounded-2xl border border-primary-500/30 bg-secondary-950/95 text-white shadow-2xl overflow-hidden pointer-events-auto flex flex-col"
        role="dialog"
        aria-modal="false"
        aria-label="Etkileşimli Hikaye Modu"
      >
        {/* Header / Drag Bar */}
        <div
          onMouseDown={beginDrag}
          className="h-[58px] px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-primary-950 via-secondary-950 to-primary-950 cursor-move select-none shrink-0"
        >
          <div className="flex items-center gap-2 text-primary-300 text-xs font-bold tracking-widest">
            <Gamepad2 className="w-4 h-4 text-primary-400 animate-pulse" />
            <span>ETKİLEŞİMLİ HİKAYE MODU</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-primary-300 hover:text-primary-100 hover:bg-white/10"
              onClick={() => setShowCampaignSelector((v) => !v)}
              title="Senaryo Değiştir"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Senaryolar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Genişlet' : 'Daralt'}
            >
              {collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-error-500 hover:bg-error-500/10 hover:text-error-400"
              onClick={onClose}
              aria-label="Kapat"
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
                  <h3 className="text-sm font-bold text-primary-300 tracking-wider">HİKAYE SENARYOSU SEÇ</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCampaignSelector(false)}>
                    Geri
                  </Button>
                </div>
                <div className="space-y-3">
                  {STORY_CAMPAIGNS.map((campaign) => {
                    const isCompleted =
                      state.completedCampaigns?.includes(campaign.id) ||
                      summary.storyCampaigns?.some((sc) => sc.id === campaign.id);

                    return (
                      <div
                        key={campaign.id}
                        onClick={() => handleSelectCampaign(campaign.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${campaign.id === state.campaignId
                          ? 'border-primary-500 bg-primary-950/50 shadow-lg'
                          : isCompleted
                            ? 'border-success-500/40 bg-success-950/20 hover:border-success-400/80 hover:bg-success-950/30'
                            : 'border-white/10 bg-secondary-900/60 hover:border-primary-400/80 hover:bg-primary-500/10'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderIcon(campaign.iconName)}
                            <span className="font-bold text-sm text-white">{campaign.title}</span>
                            {isCompleted && (
                              <span title="Tamamlandı" className="text-sm leading-none select-none">
                                👍
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isCompleted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-500/20 text-success-300 border border-success-500/40 flex items-center gap-1">
                                TAMAMLANDI
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                              {campaign.badge}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-secondary-300 mt-2 leading-relaxed">{campaign.description}</p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-secondary-400 border-t border-white/5 pt-2">
                          <span>Rol: {campaign.role}</span>
                          <span className="flex items-center font-semibold">
                            {isCompleted ? (
                              <span className="text-success-400 flex items-center gap-1">
                                Tekrar Dene <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="text-primary-400 flex items-center gap-1">
                                Başla <ChevronRight className="w-3.5 h-3.5" />
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
                      <span className="text-secondary-300 font-medium truncate">{activeCampaign.title}</span>
                      {state.completedCampaigns?.includes(activeCampaign.id) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-success-500/20 text-success-300 border border-success-500/30 shrink-0">
                          Tamamlandı
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      {state.score} Puan · <span className="text-primary-300">{rank}</span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
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
                  <div className="flex justify-between text-[11px] text-secondary-400">
                    <span>
                      Aşama {Math.min(state.stepIndex + 1, activeCampaign.steps.length)} / {activeCampaign.steps.length}
                    </span>
                    <span>{currentStep?.level || 'Başlangıç'}</span>
                  </div>
                </div>

                {/* Main Step Display or Completion Card */}
                {state.completed ? (
                  <div className="rounded-xl bg-success-500/10 border border-success-500/30 p-6 text-center space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-full bg-success-500/20 border border-success-500/40 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                      👍
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-success-400" /> SENARYO TAMAMLANDI 👍
                    </div>
                    <h3 className="text-xl font-bold text-white">Tebrikler! Senaryoyu Bitirdin!</h3>
                    <p className="text-sm text-secondary-300">
                      <strong>{activeCampaign.title}</strong> operasyonunu başarıyla sevk ve idare ettin.
                    </p>
                    <div className="p-3 bg-secondary-900/80 rounded-lg border border-white/10 text-xs space-y-1">
                      <div>
                        Toplam Skor: <strong className="text-amber-300">{state.score} Puan</strong>
                      </div>
                      <div>
                        Kazanılan Unvan: <strong className="text-primary-300">{rank}</strong>
                      </div>
                      <div>Atlanan Aşama: {state.skipped}</div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-primary-500/40 text-primary-300 hover:bg-primary-500/20 text-xs"
                        onClick={() => setShowCampaignSelector(true)}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> Yeni Senaryo Seç
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-white/20 text-secondary-200 hover:bg-white/10 text-xs"
                        onClick={handleResetCampaign}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" /> Baştan Başla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Telsiz / Incident Broadcast Banner */}
                    {currentStep.incidentEvent && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 p-3.5 flex items-start gap-3">
                        <Radio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {currentStep.incidentEvent.title}
                            </span>
                          </div>
                          <p className="text-xs text-amber-200/90 leading-relaxed">
                            {currentStep.incidentEvent.detail}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step Title & Narrative */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-primary-300 font-bold text-base">
                        {renderIcon(activeCampaign.iconName)}
                        <span>{currentStep.title}</span>
                      </div>
                      <p className="text-sm text-secondary-200 leading-relaxed border-l-2 border-primary-500/40 pl-3 py-1 bg-primary-950/20 rounded-r-lg">
                        {currentStep.narrative}
                      </p>
                    </div>

                    {/* Objective Card */}
                    <div className="rounded-xl border border-primary-400/30 bg-primary-950/30 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="uppercase tracking-widest text-primary-300 font-bold flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> GÖREV HEDEFİ
                        </span>
                        <span className="text-amber-300 font-semibold">+{currentStep.points} Puan</span>
                      </div>
                      <p className="text-sm font-medium text-white">{currentStep.objective}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-secondary-400">
                        <span>Canlı Ağ Durumu:</span>
                        <span className="text-primary-300 font-semibold">
                          {topologyDevices.length} Cihaz · {topologyConnections.length} Bağlantı
                        </span>
                      </div>
                    </div>

                    {/* Choice Event if present */}
                    {currentStep.choice && (
                      <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-3.5 space-y-2">
                        <p className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-sky-400" />
                          KARAR NOKTASI: {currentStep.choice.question}
                        </p>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {currentStep.choice.options.map((option, idx) => {
                            const choiceKey = `${state.campaignId}:${state.stepIndex}`;
                            const isSelected = state.choicesMade?.[choiceKey] === idx;
                            const isChosenAny = state.choicesMade?.[choiceKey] !== undefined;

                            return (
                              <button
                                key={idx}
                                disabled={isChosenAny}
                                onClick={() => handleChoiceSelect(idx)}
                                className={`text-left text-xs p-2.5 rounded-lg border transition-all ${isSelected
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-100 font-semibold'
                                  : isChosenAny
                                    ? 'bg-secondary-900/40 border-white/5 text-secondary-500 cursor-not-allowed'
                                    : 'bg-secondary-900/80 border-white/10 text-secondary-200 hover:border-sky-400/50 hover:bg-sky-950/50'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{option.label}</span>
                                  <span className="text-[10px] text-amber-300 font-bold">+{option.bonusPoints} BP</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Status Feedback Message */}
                    {message && (
                      <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-200 leading-relaxed">
                        {message}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button onClick={handleManualCheck} size="sm" className="gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Görevi Doğrula
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMessage(`İpucu: ${currentStep.hint}`)}
                        className="gap-1.5 border-white/20 text-secondary-200 hover:bg-white/10"
                      >
                        <Lightbulb className="w-4 h-4 text-amber-400" /> İpucu
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSkip}
                        className="gap-1.5 text-secondary-400 hover:text-white"
                      >
                        <SkipForward className="w-4 h-4" /> Aşama Geç
                      </Button>
                    </div>
                  </>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-secondary-400">
                  <span>{state.skipped} Aşama Atlandı</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCampaignSelector(true)}
                      className="h-7 text-xs text-primary-300 hover:text-primary-100 hover:bg-white/10"
                    >
                      <Sparkles className="w-3 h-3 mr-1 text-primary-400" /> Senaryo Seç
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetCampaign}
                      className="h-7 text-xs text-secondary-400 hover:text-error-400"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Baştan Başla
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
            <div className="w-2.5 h-2.5 rounded-br-full border-b-2 border-r-2 border-secondary-400 bg-transparent" />
          </div>
        )}
      </section>
    </div>
  );
}
