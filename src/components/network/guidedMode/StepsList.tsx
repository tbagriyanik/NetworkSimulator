import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuidedProject } from '@/lib/network/guidedMode';

export interface StepsListProps {
    project: GuidedProject;
    currentStepIndex: number;
    activeStepRef: React.RefObject<HTMLDivElement | null>;
    onStepUncomplete: (stepId: string) => void;
    language: 'tr' | 'en';
    t: Record<string, string>;
}

export function StepsList({
    project,
    currentStepIndex,
    activeStepRef,
    onStepUncomplete,
    language,
    t
}: StepsListProps) {
    let currentSection: string | null = null;
    const elements: React.ReactNode[] = [];

    project.steps.forEach((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = step.completed;

        if (step.sectionTitle && step.sectionTitle[language] !== currentSection) {
            currentSection = step.sectionTitle[language];
            const sectionSteps = project.steps.filter(s =>
                s.sectionTitle && s.sectionTitle[language] === currentSection
            ).length;
            const sectionCompleted = project.steps.filter(s =>
                s.sectionTitle && s.sectionTitle[language] === currentSection && s.completed
            ).length;

            elements.push(
                <div
                    key={`section-${index}`}
                    className="px-2 pt-3 pb-1.5"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                            {step.sectionTitle[language]}
                        </span>
                        {(sectionSteps > 1) && (
                            <span className="text-[10px] text-secondary-400 tabular-nums">
                                {sectionCompleted}/{sectionSteps}
                            </span>
                        )}
                    </div>
                    <div className="mt-1 h-px bg-gradient-to-r from-primary-200 dark:from-primary-800 to-transparent" />
                </div>
            );
        }

        elements.push(
            <div
                key={step.id}
                ref={isActive ? activeStepRef : undefined}
                className={cn(
                    "flex items-start gap-2 p-2 rounded-lg transition-all",
                    isActive && "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800",
                    isCompleted && !isActive && "bg-secondary-100 dark:bg-secondary-800 opacity-60",
                    !isActive && !isCompleted && "hover:bg-secondary-50 dark:hover:bg-secondary-700/50"
                )}
            >
                <div className="mt-0.5">
                    {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-success-500" />
                    ) : isActive ? (
                        <Circle className="w-5 h-5 text-primary-500 animate-pulse" />
                    ) : (
                        <Circle className="w-5 h-5 text-secondary-300 dark:text-secondary-600" />
                    )}
                </div>

                {isCompleted && (
                    <button
                        onClick={() => onStepUncomplete(step.id)}
                        className="text-xs text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors flex-shrink-0"
                    >
                        {t.uncomplete}
                    </button>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                            "text-xs font-medium",
                            isActive && "text-primary-600 dark:text-primary-400",
                            isCompleted && "text-secondary-600 dark:text-white line-through",
                            !isActive && !isCompleted && "text-secondary-500 dark:text-secondary-400"
                        )}>
                            {step.order}. {step.title[language]}
                        </span>
                        {step.points && (
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                                isCompleted
                                    ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                                    : "bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400"
                            )}>
                                {step.points} {t.pts}
                            </span>
                        )}
                    </div>

                    {isActive && (
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 truncate">
                            {step.description[language]}
                        </p>
                    )}

                    {isCompleted && step.completedAt && project.startedAt && (
                        <p className="text-[10px] text-secondary-400 dark:text-secondary-300 mt-0.5">
                            {t.completedAt}: {new Date(step.completedAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            <span className="ml-1 text-secondary-400">
                                ({(() => {
                                    const duration = Math.round((new Date(step.completedAt).getTime() - new Date(project.startedAt).getTime()) / 1000);
                                    const minutes = Math.floor(duration / 60);
                                    const seconds = duration % 60;
                                    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                                })()})
                            </span>
                        </p>
                    )}
                </div>
            </div>
        );
    });

    return <div className="p-2 space-y-1 pr-3">{elements}</div>;
}
