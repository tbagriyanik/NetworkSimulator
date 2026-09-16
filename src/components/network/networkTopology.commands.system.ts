import { Terminal, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getSystemCommands(isTR: boolean): CommandDefinition {
  return {
    id: 'system',
    icon: Terminal,
    title: isTR ? 'Oturum' : 'Session',
    type: 'commands',
    cmds: [
      ['enable', isTR ? 'Ayrıcalıklı moda geç' : 'Enter privileged mode', '>'],
      ['disable', isTR ? 'Kullanıcı moduna dön' : 'Return to user mode', '#'],
      ['configure terminal', isTR ? 'Yapılandırma modu' : 'Enter config mode', '#'],
      ['exit', isTR ? 'Moddan çık' : 'Exit current mode'],
      ['end', isTR ? 'Ayrıcalıklı moda dön' : 'Return to privileged mode'],
      ['help', isTR ? 'Yardım sistemini göster' : 'Display help system'],
    ]
  };
}