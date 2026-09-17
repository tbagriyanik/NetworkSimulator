import { Book, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getInfoCategories(isTR: boolean): CommandDefinition[] {
  return [
    {
      id: 'network_terms',
      icon: Book,
      title: isTR ? 'Ağ Terimleri' : 'Network Terms',
      type: 'info',
      cmds: [
        ['Router', isTR ? 'Ağlar arası paket yönlendirme cihazı' : 'Routes packets between networks'],
        ['Switch', isTR ? 'LAN içinde paket yönlendirme cihazı' : 'Forwards packets within LAN'],
        ['Firewall', isTR ? 'Ağ güvenliği ve trafiği filtreleme' : 'Network security and traffic filtering'],
        ['VLAN', isTR ? 'Sanal LAN - Broadcast domainleri ayırma' : 'Virtual LAN - separate broadcast domains'],
        ['Subnet', isTR ? 'Ağın daha küçük parçalara bölünmesi' : 'Division of network into smaller parts'],
        ['DHCP', isTR ? 'Dinamik IP adresi atama' : 'Dynamic IP address assignment'],
        ['NAT', isTR ? 'Ağ adresi çevirisi (IP değişimi)' : 'Network address translation'],
        ['ARP', isTR ? 'IP adresinden MAC adresini bulma' : 'Address Resolution Protocol - IP to MAC'],
        ['STP', isTR ? 'Spanning Tree - Loop önleme' : 'Spanning Tree - Loop prevention'],
        ['OSPF', isTR ? 'Open Shortest Path First yönlendirme' : 'Link-state routing protocol'],
        ['BGP', isTR ? 'Border Gateway Protocol - Internet routing' : 'Exterior gateway routing protocol'],
      ]
    }
  ];
}