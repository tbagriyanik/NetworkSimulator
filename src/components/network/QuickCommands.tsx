'use client';

import { CommandMode } from '@/lib/network/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Translations } from '@/contexts/LanguageContext';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { ModernPanel } from '@/components/ui/ModernPanel';
import { cn } from '@/lib/utils';

interface QuickCommandsProps {
  currentMode: CommandMode;
  onExecuteCommand: (command: string) => Promise<void>;
  t: Translations;
  theme: string;
  language: 'tr' | 'en';
  isDevicePoweredOff?: boolean;
}

interface QuickCommand {
  command: string;
  label: string;
  modes: CommandMode[];
  color: string;
}

const quickCommands: QuickCommand[] = [
  { command: 'enable', label: 'enable', modes: ['user'], color: 'glass-success' },
  { command: 'disable', label: 'disable', modes: ['privileged'], color: 'glass-secondary' },
  { command: 'configure terminal', label: 'conf t', modes: ['privileged'], color: 'glass-primary' },
  { command: 'exit', label: 'exit', modes: ['privileged', 'config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config'], color: 'glass-warning' },
  { command: 'end', label: 'end', modes: ['config', 'interface', 'config-if-range', 'line', 'vlan', 'router-config'], color: 'glass-danger' },
  { command: 'show running-config', label: 'sh run', modes: ['privileged'], color: 'glass-indigo' },
  { command: 'show vlan brief', label: 'sh vlan', modes: ['privileged'], color: 'glass-secondary' },
  { command: 'show interfaces', label: 'sh int', modes: ['privileged'], color: 'glass-secondary' },
  { command: 'show version', label: 'sh ver', modes: ['privileged'], color: 'glass-secondary' },
  { command: 'show mac address-table', label: 'sh mac', modes: ['privileged'], color: 'glass-secondary' },
  { command: 'write memory', label: 'wr', modes: ['privileged'], color: 'glass-warning' },
  { command: 'no shutdown', label: 'no shut', modes: ['interface'], color: 'glass-success' },
  { command: 'shutdown', label: 'shut', modes: ['interface'], color: 'glass-danger' },
];

export function QuickCommands({ currentMode, onExecuteCommand, t, theme, language, isDevicePoweredOff = false }: QuickCommandsProps) {
  const isDark = theme === 'dark';

  // Responsive hooks
  const isMobile = useIsMobile();

  const availableCommands = quickCommands.filter(cmd =>
    cmd.modes.includes(currentMode)
  );

  const modeLabels: Record<CommandMode, string> = {
    user: t.modeUser,
    privileged: t.modePrivileged,
    config: t.modeConfig,
    interface: t.modeInterface,
    'config-if-range': 'Interface Range',
    line: t.modeLine,
    vlan: t.modeVlanLabel,
    'router-config': t.modeConfig,
    'dhcp-config': 'DHCP Pool',
    'ssid-config': 'SSID Config',
    'dot11-config': 'Dot11 Config',
  };

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';

  return (
    <ModernPanel
      id="quickcommands"
      title={t.quickCommands}
      headerAction={
        <Badge variant="outline" className={`text-xs ${isMobile ? 'text-[10px] px-1' : 'sm:text-xs'}`}>
          <span className="truncate">{modeLabels[currentMode]}</span>
        </Badge>
      }
      collapsible={false}
      className={cn("w-full max-w-none", cardBg)}
    >
      <div className="space-y-2">
        {isDevicePoweredOff ? (
          <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-bold tracking-wider text-center">
            {language === 'tr' ? 'Bağlantı hatası' : 'Connection error'}
          </div>
        ) : availableCommands.length > 0 ? (
          <div className={`grid gap-1 ${isMobile ? 'grid-cols-2' : 'sm:flex sm:flex-wrap sm:gap-1'}`}>
            {availableCommands.map((cmd) => (
              <Tooltip key={cmd.command}>
                <TooltipTrigger asChild>
                  <Button
                    variant={cmd.color as any}
                    size="sm"
                    onClick={() => onExecuteCommand(cmd.command)}
                    className={cn(
                      "text-[9px] px-2 py-1 font-black tracking-widest",
                      isMobile ? 'flex-1' : 'min-w-[50px]'
                    )}
                  >
                    <span className="truncate">{cmd.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  <span className="truncate">{cmd.command}</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        ) : (
          <div className={`text-xs text-muted-foreground text-center py-2 ${isMobile ? 'text-[9px]' : ''}`}>
            {t.noCommandsAvailable}
          </div>
        )}
      </div>
    </ModernPanel>
  );
}


