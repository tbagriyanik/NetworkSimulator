'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Pause, StepForward, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SimulationSpeedControlProps {
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onStepForward?: () => void;
  className?: string;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5];

export function SimulationSpeedControl({
  speedMultiplier,
  onSpeedChange,
  isPaused,
  onTogglePause,
  onStepForward,
  className,
}: SimulationSpeedControlProps) {

  return (
    <div className={cn('flex items-center gap-1 bg-background/80 backdrop-blur border border-border/50 rounded-lg p-1 shadow-sm', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isPaused ? 'destructive' : 'secondary'}
            size="icon"
            className="h-7 w-7 transition-colors"
            onClick={onTogglePause}
            aria-label={isPaused ? 'Simülasyonu Başlat' : 'Simülasyonu Duraklat'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isPaused ? 'Simülasyonu Başlat' : 'Simülasyonu Duraklat'}
        </TooltipContent>
      </Tooltip>

      {isPaused && onStepForward && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onStepForward}
              aria-label="Adım Adım İlerle"
            >
              <StepForward className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Adım Adım İlerle (1 Paket Adımı)
          </TooltipContent>
        </Tooltip>
      )}

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      <div className="flex items-center gap-0.5">
        <Gauge className="h-3.5 w-3.5 text-muted-foreground ml-1 mr-0.5" />
        {SPEED_OPTIONS.map((spd) => (
          <Button
            key={spd}
            variant={speedMultiplier === spd ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'h-6 px-1.5 text-[11px] font-mono rounded',
              speedMultiplier === spd ? 'font-semibold' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onSpeedChange(spd)}
          >
            {spd}x
          </Button>
        ))}
      </div>
    </div>
  );
}
