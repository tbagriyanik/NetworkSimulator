'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const QUICK_COMMANDS: Record<string, string[]> = {
  user: ['enable', 'show ip int brief', 'show version', 'ping '],
  privileged: ['conf t', 'show run', 'show ip route', 'show mac address-table', 'show vlan brief', 'wr', 'disable', 'exit'],
  config: ['int fa0/1', 'int gi0/1', 'vlan ', 'ip dhcp pool ', 'router ospf 1', 'hostname ', 'exit', 'end'],
  interface: ['ip add ', 'no shut', 'switchport mode access', 'switchport mode trunk', 'switchport access vlan ', 'exit', 'end'],
  'config-if-range': ['switchport mode access', 'switchport access vlan ', 'no shut', 'exit', 'end'],
  line: ['password ', 'login', 'exit', 'end'],
  vlan: ['name ', 'exit', 'end'],
  'router-config': ['network ', 'passive-interface ', 'exit', 'end'],
  'dhcp-config': ['network ', 'default-router ', 'dns-server ', 'exit', 'end'],
  'config-std-nacl': ['permit ', 'deny ', 'exit', 'end'],
  'config-ext-nacl': ['permit ', 'deny ', 'exit', 'end'],
  pc: ['ipconfig', 'ping ', 'tracert ', 'nslookup ', 'telnet ', 'ssh ', 'help', 'cls'],
  iot: ['help', 'cls']
};

interface QuickCommandsBarProps {
  deviceType?: string;
  mode: string;
  isDark: boolean;
  onRun: (cmd: string) => void;
}

export function QuickCommandsBar({ deviceType, mode, isDark, onRun }: QuickCommandsBarProps) {
  const commands = deviceType === 'pc'
    ? QUICK_COMMANDS.pc
    : deviceType === 'iot'
      ? QUICK_COMMANDS.iot
      : QUICK_COMMANDS[mode] || [];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1.5 mb-1 px-1 no-scrollbar items-center">
      <span className="text-[10px] font-mono font-bold opacity-40 uppercase tracking-wider shrink-0 mr-0.5">Quick:</span>
      {commands.map((cmd) => (
        <Button
          key={cmd}
          type="button"
          variant="secondary"
          size="sm"
          className={cn(
            "h-6 px-2.5 text-[10px] font-mono font-semibold tracking-tight whitespace-nowrap rounded-md flex-shrink-0 border shadow-xs transition-colors",
            isDark
              ? "bg-secondary-800/90 border-secondary-700/80 text-secondary-300 hover:bg-secondary-700 hover:text-white"
              : "bg-white border-secondary-300 text-secondary-700 hover:bg-secondary-100 hover:text-secondary-900"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRun(cmd);
          }}
        >
          {cmd.trim()}
        </Button>
      ))}
    </div>
  );
}