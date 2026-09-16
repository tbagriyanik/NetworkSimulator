import React from 'react';
import { Target, Play, Lightbulb, ChevronUp, ChevronDown, VolumeX, Volume2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuidedStep } from '@/lib/network/guidedMode';
import { TutorialAnimationPlayer } from '../TutorialAnimationPlayer';

export interface CurrentStepPanelProps {
    currentStep: GuidedStep;
    totalSteps: number;
    language: 'tr' | 'en';
    showHint: boolean;
    setShowHint: (val: boolean) => void;
    showAnimation: boolean;
    setShowAnimation: (val: boolean) => void;
    isSpeaking: boolean;
    handleToggleSpeech: () => void;
    usedShowMeStepIds: Set<string>;
    setUsedShowMeStepIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    expandedSteps: string[];
    toggleStepExpand: (stepId: string) => void;
    t: Record<string, string>;
}

export function CurrentStepPanel({
    currentStep,
    totalSteps,
    language,
    showHint,
    setShowHint,
    showAnimation,
    setShowAnimation,
    isSpeaking,
    handleToggleSpeech,
    usedShowMeStepIds,
    setUsedShowMeStepIds,
    expandedSteps,
    toggleStepExpand,
    t
}: CurrentStepPanelProps) {
    return (
        <div className="p-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary-500" />
                    <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {t.currentStep}: {currentStep.order}
                    </span>
                </div>
                <span className="text-[10px] font-bold text-primary-500/70 dark:text-primary-400/70 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full">
                    {currentStep.order}/{totalSteps}
                </span>
            </div>
            <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-medium text-sm text-secondary-800 dark:text-secondary-200">
                    {currentStep.title[language]}
                </h4>
                <button
                    onClick={handleToggleSpeech}
                    className={cn(
                        "p-1 rounded-md transition-all shrink-0",
                        isSpeaking
                            ? "bg-primary-500 text-white animate-pulse"
                            : "hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400"
                    )}
                    title={isSpeaking ? (language === 'tr' ? 'Durdur' : 'Stop') : (language === 'tr' ? 'Sesli Dinle' : 'Read Aloud')}
                >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
            </div>
            <p className="text-xs text-secondary-600 dark:text-secondary-400 mb-2">
                {currentStep.description[language]}
            </p>

            {/* Animation Section */}
            {currentStep.animationId && (
                <div className="mb-3 space-y-2">
                    <button
                        onClick={() => setShowAnimation(!showAnimation)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        {showAnimation ? t.hideAnimation : t.showAnimation}
                    </button>
                    {showAnimation && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                            <TutorialAnimationPlayer animationId={currentStep.animationId} />
                        </div>
                    )}
                </div>
            )}

            {/* Hint Section */}
            <Collapsible open={showHint} onOpenChange={setShowHint}>
                <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 transition-colors">
                        <Lightbulb className="w-3 h-3" />
                        {showHint ? t.hideHint : t.showHint}
                        {showHint ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="mt-2 p-2 bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 rounded text-xs text-warning-800 dark:text-warning-200 flex flex-col gap-2">
                        <div>
                            <Lightbulb className="w-3 h-3 inline mr-1" />
                            {currentStep.hint[language]}
                        </div>
                        {(currentStep.checkType === 'command' || currentStep.checkType === 'ping') && (() => {
                            const isUsed = usedShowMeStepIds.has(currentStep.id);
                            return (
                                <button
                                    disabled={isUsed}
                                    onClick={() => {
                                        if (isUsed) return;
                                        setUsedShowMeStepIds(prev => new Set(prev).add(currentStep.id));
                                        setTimeout(() => {
                                            setUsedShowMeStepIds(prev => {
                                                const next = new Set(prev);
                                                next.delete(currentStep.id);
                                                return next;
                                            });
                                        }, 2500);
                                        window.dispatchEvent(new CustomEvent('request-show-me', {
                                            detail: {
                                                stepId: currentStep.id,
                                                checkType: currentStep.checkType,
                                                commandPattern: currentStep.checkParams?.commandPattern,
                                                toIp: currentStep.checkParams?.toIp,
                                                deviceType: currentStep.checkParams?.deviceType,
                                                targetDeviceId: currentStep.checkParams?.targetDeviceId || currentStep.checkParams?.fromDevice,
                                                hintCommand: currentStep.hint.en || currentStep.hint.tr
                                            }
                                        }));
                                    }}
                                    className={cn(
                                        "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all shadow-sm w-full mt-1",
                                        isUsed
                                            ? "bg-secondary-300 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400 cursor-not-allowed opacity-60"
                                            : "bg-warning-500 hover:bg-warning-600 text-white"
                                    )}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    {isUsed
                                        ? (language === 'tr' ? 'Gösterildi' : 'Shown')
                                        : (language === 'tr' ? 'Bana Göster' : 'Show Me')}
                                </button>
                            );
                        })()}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {/* Detailed Instructions */}
            {currentStep.detailedInstructions && (
                <Collapsible
                    open={expandedSteps.includes(currentStep.id)}
                    onOpenChange={() => toggleStepExpand(currentStep.id)}
                >
                    <CollapsibleTrigger asChild>
                        <button className="mt-2 flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors">
                            {t.instructions}
                            {expandedSteps.includes(currentStep.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <ol className="mt-2 space-y-1 text-xs text-secondary-600 dark:text-secondary-400 pl-4">
                            {currentStep.detailedInstructions[language].map((instruction, idx) => (
                                <li key={idx} className="list-decimal">
                                    {instruction}
                                </li>
                            ))}
                        </ol>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
}
