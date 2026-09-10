'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronRight, X, Sparkles } from 'lucide-react';
import { runSmartDiagnostics } from '@/lib/network/diagnostics/smartDiagnosticEngine';
import type { CanvasDevice } from '@/components/network/networkTopology.types';
import type { SwitchState } from '@/lib/network/types';
import { cn } from '@/lib/utils';

export interface SmartDiagnosticAssistantProps {
  devices: CanvasDevice[];
  deviceStates: Map<string, SwitchState>;
  language?: 'tr' | 'en';
  onSelectDevice?: (deviceId: string) => void;
  className?: string;
}

export function SmartDiagnosticAssistant({
  devices,
  deviceStates,
  language = 'tr',
  onSelectDevice,
  className,
}: SmartDiagnosticAssistantProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const issues = useMemo(() => {
    return runSmartDiagnostics(devices, deviceStates).filter((issue) => !dismissedIds.has(issue.id));
  }, [devices, deviceStates, dismissedIds]);

  if (issues.length === 0) return null;

  const isTr = language === 'tr';
  const topIssue = issues[0];

  return (
    <div className={cn('fixed bottom-6 right-6 z-40 max-w-sm w-full animate-in slide-in-from-bottom-3 duration-300', className)}>
      <div className="bg-background/95 backdrop-blur border border-amber-500/30 rounded-xl shadow-xl overflow-hidden">
        <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-500/20 rounded-md text-amber-600 dark:text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {isTr ? 'Akıllı Ağ Teşhis Asistanı' : 'Smart Diagnostic Assistant'}
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-semibold">
              {issues.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setDismissedIds((prev) => new Set([...prev, ...issues.map((i) => i.id)]))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold leading-none text-foreground">
                {isTr ? topIssue.titleTr : topIssue.titleEn}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isTr ? topIssue.descriptionTr : topIssue.descriptionEn}
              </p>
            </div>
          </div>

          <div className="bg-muted/60 p-2 rounded-lg text-[10px] text-muted-foreground space-y-1">
            <span className="font-semibold text-foreground block">
              {isTr ? '💡 Önerilen Çözüm:' : '💡 Suggested Fix:'}
            </span>
            <p>{isTr ? topIssue.suggestedFixTr : topIssue.suggestedFixEn}</p>
          </div>

          {topIssue.deviceId && onSelectDevice && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7 flex items-center justify-between"
              onClick={() => onSelectDevice(topIssue.deviceId!)}
            >
              <span>{isTr ? 'Cihaza Git & İncele' : 'Inspect Device'}</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
