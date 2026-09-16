import { Layers, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getCommandModes(isTR: boolean): CommandDefinition {
  return {
    id: 'command_modes',
    icon: Layers,
    title: isTR ? 'Komut Modları' : 'Command Modes',
    type: 'commands',
    cmds: [
      ['Router>', isTR ? 'Kullanıcı Modu' : 'User Mode'],
      ['Router#', isTR ? 'Ayrıcalıklı Mod' : 'Privileged Mode'],
      ['(config)#', isTR ? 'Global Yapılandırma' : 'Global Config'],
      ['(config-if)#', isTR ? 'Arayüz Yapılandırma' : 'Interface Config'],
    ]
  };
}