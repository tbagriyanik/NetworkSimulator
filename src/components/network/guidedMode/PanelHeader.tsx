import React from 'react';
import { GripHorizontal, Compass, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuidedProject } from '@/lib/network/guidedMode';

export interface PanelHeaderProps {
    project: GuidedProject;
    onMinimize: () => void;
    handleMouseDown: (e: React.MouseEvent) => void;
    handleTouchStart: (e: React.TouchEvent) => void;
    t: Record<string, string>;
}

export function PanelHeader({
    project,
    onMinimize,
    handleMouseDown,
    handleTouchStart,
    t
}: PanelHeaderProps) {
    return (
        <div
            data-drag-handle
            className={cn(
                "flex items-center justify-between p-4 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 text-white",
                "cursor-grab active:cursor-grabbing select-none shadow-inner"
            )}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            <div className="flex items-center gap-2">
                <GripHorizontal className="w-4 h-4 opacity-50" />
                <Compass className="w-5 h-5 text-white animate-spin-slow" />
                <div>
                    <h3 className="font-bold text-xs tracking-tighter">
                        {t.tutorialWizard}
                    </h3>
                    <p className="text-[10px] text-primary-100/80 truncate max-w-[160px] font-medium">{project.title}</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={onMinimize}
                    className="p-1.5 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white"
                    title={t.minimize}
                >
                    <ChevronDown className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
