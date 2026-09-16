import { Network, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getNetworkingCommands(isTR: boolean): CommandDefinition {
  return {
    id: 'subnetting_info',
    icon: Network,
    title: isTR ? 'Subnetting & Alt Ağlar' : 'Subnetting & Subnets',
    type: 'info',
    cmds: [
      [isTR ? 'Subnet Mask (Alt Ağ Maskesi)' : 'Subnet Mask', isTR ? 'IP adresinin ağ ve host bölümlerini ayırmak için kullanılır (ör: /24 = 255.255.255.0 = 256 adres).' : 'Used to separate network and host portions of IP address (e.g. /24 = 255.255.255.0 = 256 addresses).'],
      [isTR ? 'Ağ Adresi (Network Address)' : 'Network Address', isTR ? 'Alt ağın ilk adresidir, cihazlara atanamaz (ör: 192.168.1.0).' : 'First address of the subnet, cannot be assigned to devices (e.g., 192.168.1.0).'],
      [isTR ? 'Yayın Adresi (Broadcast Address)' : 'Broadcast Address', isTR ? 'Alt ağın son adresidir, tüm cihazlara yayın için kullanılır (ör: 192.168.1.255).' : 'Last address of the subnet, used to broadcast to all devices (e.g., 192.168.1.255).'],
      [isTR ? 'Kullanılabilir Host Sayısı' : 'Usable Host Count', isTR ? '2^(32 - Prefix) - 2 formülü ile hesaplanır.' : 'Calculated using 2^(32 - Prefix) - 2 formula.'],
    ]
  };
}