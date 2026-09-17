import { Settings, Eye, Radio, Zap, Shield, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getNetSimCommands(isTR: boolean): CommandDefinition[] {
  return [
    {
      id: 'interface',
      icon: Settings,
      title: isTR ? 'Arayüz Komutları' : 'Interface Commands',
      type: 'commands',
      cmds: [
        ['ip address <ip> <mask>', isTR ? 'IP adresi ata' : 'Assign IP address', '(config-if)#'],
        ['no ip address', isTR ? 'IP adresini kaldır' : 'Remove IP address', '(config-if)#'],
        ['ip address dhcp', isTR ? 'DHCP ile IP al' : 'Get IP via DHCP', '(config-if)#'],
        ['no shutdown', isTR ? 'Arayüzü aç' : 'Enable interface', '(config-if)#'],
        ['shutdown', isTR ? 'Arayüzü kapat' : 'Disable interface', '(config-if)#'],
        ['description <text>', isTR ? 'Açıklama ekle' : 'Add description', '(config-if)#'],
        ['speed <10|100|1000|auto>', isTR ? 'Hız ayarla' : 'Set speed', '(config-if)#'],
        ['duplex <full|half|auto>', isTR ? 'Duplex ayarla' : 'Set duplex', '(config-if)#'],
      ]
    },
    {
      id: 'show',
      icon: Eye,
      title: isTR ? 'Show Komutları' : 'Show Commands',
      type: 'commands',
      cmds: [
        ['show running-config', isTR ? 'Çalışan yapılandırmayı göster' : 'Show running config', '#'],
        ['show startup-config', isTR ? 'Başlangıç yapılandırmasını göster' : 'Show startup config', '#'],
        ['show ip interface brief', isTR ? 'Arayüz özetini göster' : 'Show interface summary', '#'],
        ['show ip route', isTR ? 'Yönlendirme tablosunu göster' : 'Show routing table', '#'],
        ['show vlan brief', isTR ? 'VLAN özetini göster' : 'Show VLAN summary', '#'],
        ['show mac address-table', isTR ? 'MAC tablosunu göster' : 'Show MAC table', '#'],
        ['show spanning-tree', isTR ? 'STP durumunu göster' : 'Show STP status', '#'],
        ['show cdp neighbors', isTR ? 'CDP komşularını göster' : 'Show CDP neighbors', '#'],
        ['show version', isTR ? 'Sürüm bilgisini göster' : 'Show version info', '#'],
      ]
    },
    {
      id: 'firewall',
      icon: Shield,
      title: isTR ? 'Güvenlik Komutları' : 'Security Commands',
      type: 'commands',
      cmds: [
        ['access-list <num> <permit|deny> <src> <dst>', isTR ? 'ACL kuralı ekle' : 'Add ACL rule', '(config)#'],
        ['no access-list <num>', isTR ? 'ACL sil' : 'Remove ACL', '(config)#'],
        ['ip access-group <num> <in|out>', isTR ? 'ACL uygula' : 'Apply ACL', '(config-if)#'],
        ['no ip access-group', isTR ? 'ACL kaldır' : 'Remove ACL', '(config-if)#'],
      ]
    },
    {
      id: 'wireless',
      icon: Radio,
      title: isTR ? 'Kablosuz Komutları' : 'Wireless Commands',
      type: 'commands',
      cmds: [
        ['dot11 ssid <name>', isTR ? 'SSID yapılandır' : 'Configure SSID', '(config)#'],
        ['ssid <name>', isTR ? 'SSID ata' : 'Assign SSID', '(config-if)#'],
        ['encryption <type>', isTR ? 'Şifreleme ayarla' : 'Set encryption', '(config-ssid)#'],
      ]
    },
    {
      id: 'bgp_mpls',
      icon: Zap,
      title: isTR ? 'BGP/MPLS Komutları' : 'BGP/MPLS Commands',
      type: 'commands',
      cmds: [
        ['router bgp <as>', isTR ? 'BGP sürecini başlat' : 'Start BGP process', '(config)#'],
        ['neighbor <ip> remote-as <as>', isTR ? 'Komşu ekle' : 'Add neighbor', '(config-router)#'],
        ['mpls ip', isTR ? 'MPLS etkinleştir' : 'Enable MPLS', '(config-if)#'],
        ['mpls ldp router-id <ip>', isTR ? 'LDP router ID ayarla' : 'Set LDP router ID', '(config)#'],
      ]
    }
  ];
}