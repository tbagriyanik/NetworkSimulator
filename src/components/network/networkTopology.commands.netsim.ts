import { Settings, Eye, Radio, Zap, Shield, Share2, Activity, LucideIcon } from 'lucide-react';

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
        ['bgp confederation identifier <as>', isTR ? 'BGP konfederasyon AS tanımla' : 'Set BGP confederation AS', '(config-router)#'],
        ['bgp always-compare-med', isTR ? 'Tüm yollarda MED karşılaştır' : 'Always compare MED', '(config-router)#'],
        ['mpls ip', isTR ? 'MPLS etkinleştir' : 'Enable MPLS', '(config-if)#'],
        ['mpls ldp router-id <ip>', isTR ? 'LDP router ID ayarla' : 'Set LDP router ID', '(config)#'],
      ]
    },
    {
      id: 'multicast_pim',
      icon: Share2,
      title: isTR ? 'Multicast & PIM / IGMP' : 'Multicast & PIM / IGMP',
      type: 'commands',
      cmds: [
        ['ip multicast-routing', isTR ? 'Global multicast yönlendirmeyi aç' : 'Enable multicast routing', '(config)#'],
        ['ip pim sparse-mode', isTR ? 'Arayüzde PIM sparse mod aç' : 'Enable PIM sparse mode', '(config-if)#'],
        ['ip pim dense-mode', isTR ? 'Arayüzde PIM dense mod aç' : 'Enable PIM dense mode', '(config-if)#'],
        ['ip igmp join-group <ip>', isTR ? 'IGMP multicast grubuna katıl' : 'Join IGMP multicast group', '(config-if)#'],
        ['ip igmp version <1|2|3>', isTR ? 'IGMP sürümünü ayarla' : 'Set IGMP version', '(config-if)#'],
        ['show ip mroute', isTR ? 'Multicast yönlendirme tablosunu göster' : 'Show multicast routing table', '#'],
        ['show ip pim interface', isTR ? 'PIM arayüz durumunu göster' : 'Show PIM interfaces', '#'],
        ['show ip pim neighbor', isTR ? 'PIM komşu tablosunu göster' : 'Show PIM neighbors', '#'],
        ['show ip igmp groups', isTR ? 'IGMP grup üyeliklerini göster' : 'Show IGMP groups', '#'],
      ]
    },
    {
      id: 'adv_network',
      icon: Activity,
      title: isTR ? 'Gelişmiş Servisler & EEM' : 'Advanced Services & EEM',
      type: 'commands',
      cmds: [
        ['snmp-server group <name> v3 priv', isTR ? 'SNMPv3 grubu tanımla' : 'Create SNMPv3 group', '(config)#'],
        ['snmp-server user <user> <group> v3 auth sha <p> priv aes <p>', isTR ? 'SNMPv3 kullanıcısı oluştur' : 'Create SNMPv3 user', '(config)#'],
        ['snmp-server host <ip> traps version 3 <user>', isTR ? 'SNMPv3 trap hedefi ata' : 'Set SNMPv3 trap host', '(config)#'],
        ['ip sla responder', isTR ? 'IP SLA responder servisini aç' : 'Enable IP SLA responder', '(config)#'],
        ['ip inspect name <name> <proto> alert on', isTR ? 'CBAC denetim kuralı tanımla' : 'Define CBAC inspect rule', '(config)#'],
        ['ip inspect <name> in|out', isTR ? 'Arayüze CBAC denetimi uygula' : 'Apply CBAC inspection on interface', '(config-if)#'],
        ['tunnel protection ipsec profile <name>', isTR ? 'Tunnel arayüzüne IPSec koruma profili ata' : 'Assign IPSec profile to tunnel', '(config-if)#'],
        ['spanning-tree uplinkfast', isTR ? 'STP UplinkFast hızlandırmayı aç' : 'Enable STP UplinkFast', '(config)#'],
        ['spanning-tree backbonefast', isTR ? 'STP BackboneFast hızlandırmayı aç' : 'Enable STP BackboneFast', '(config)#'],
        ['event manager applet <name>', isTR ? 'EEM applet yapılandırma moduna gir' : 'Enter EEM applet mode', '(config)#'],
        ['event syslog pattern <regex>', isTR ? 'EEM syslog tetikleyicisi' : 'EEM syslog event trigger', '(config-applet)#'],
        ['action <id> syslog msg <msg>', isTR ? 'EEM aksiyonu tanımla' : 'Define EEM action', '(config-applet)#'],
        ['netconf-yang', isTR ? 'NETCONF-YANG veri deposunu başlat' : 'Initialize NETCONF-YANG', '(config)#'],
        ['netconf ssh', isTR ? 'NETCONF SSH sunucusunu (port 830) aç' : 'Enable NETCONF SSH server (port 830)', '(config)#'],
        ['show snmp group | show snmp user', isTR ? 'SNMPv3 grup ve kullanıcıları göster' : 'Show SNMPv3 groups and users', '#'],
        ['show ip inspect config', isTR ? 'CBAC yapılandırmasını göster' : 'Show CBAC inspect config', '#'],
        ['show event manager applet all', isTR ? 'EEM applet listesini göster' : 'Show all EEM applets', '#'],
        ['show netconf-yang status', isTR ? 'NETCONF servis durumunu göster' : 'Show NETCONF-YANG status', '#'],
      ]
    },
    {
      id: 'telemetry_iot',
      icon: Activity,
      title: isTR ? 'Telemetry & IoT Protocol Akışları' : 'Telemetry & IoT Protocol Flows',
      type: 'info',
      cmds: [
        ['sFlow / NetFlow', isTR ? 'Forward edilen paketlerden sample/flow export üretir' : 'Creates sample/flow exports from forwarded packets', 'pipeline'],
        ['MQTT 1883 / 8883', isTR ? 'CONNECT, PUBLISH, SUBSCRIBE ve QoS 1 PUBACK akışı' : 'CONNECT, PUBLISH, SUBSCRIBE and QoS 1 PUBACK flow', 'TCP'],
        ['CoAP 5683 / 5684', isTR ? 'GET/PUT/POST/DELETE, ACK ve transaction state' : 'GET/PUT/POST/DELETE, ACK and transaction state', 'UDP'],
        ['NETCONF 830', isTR ? 'Hello, get, edit-config, commit ve close-session frame akışı' : 'Hello, get, edit-config, commit and close-session frame flow', 'TCP'],
        ['CAPWAP', isTR ? 'Discovery → Join → Config → Data → Run state machine' : 'Discovery → Join → Config → Data → Run state machine', 'control/data'],
      ]
    }
  ];
}
