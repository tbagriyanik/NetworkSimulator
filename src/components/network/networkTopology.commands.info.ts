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
      title: isTR ? 'Ağ Terimleri & Protokol Özellikleri' : 'Network Terms & Protocol Features',
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
        ['SDN / IBN', isTR ? 'Yazılım Tanımlı Ağ & Niyet Tabanlı Politika Yönetimi' : 'Software-Defined & Intent-Based Networking'],
        ['NETCONF / YANG', isTR ? 'Model tabanlı cihaz yönetimi ve veri modelleme' : 'Model-driven device management & data modeling'],
        ['MQTT / CoAP', isTR ? 'Hafif IoT mesajlaşma ve RESTful UDP servisleri' : 'Lightweight IoT messaging & RESTful UDP services'],
        ['FHRP (HSRP/VRRP)', isTR ? 'İlk atlama ağ geçidi yedeklilik protokolleri' : 'First Hop Redundancy Protocols'],
        ['ACL', isTR ? 'Erişim kontrol listesi ve paket filtreleme' : 'Access Control List & packet filtering'],
        ['IP Fragmentation / MTU', isTR ? 'Don\'t Fragment (DF) biti kontrolü, Fragment Offset/MF parçalama ve OSPF MTU uyumsuzluk simülasyonu' : 'DF bit validation, Fragment Offset/MF calculation & OSPF MTU mismatch simulation'],
        ['Stateful TCP 3-Way Handshake', isTR ? 'RFC 793 uyumlu SYN -> SYN-ACK -> ACK el sıkışması ve FIN/RST bağlantı kapatma adımları' : 'RFC 793 compliant SYN -> SYN-ACK -> ACK handshake & FIN/RST teardown simulation'],
        ['QoS & Kuyruk Yönetimi', isTR ? 'Strict Priority (LLQ), WFQ, Tail Drop / WRED düşürme ve DSCP/CoS etiketleme' : 'Strict Priority (LLQ), WFQ, Tail Drop / WRED congestion avoidance & DSCP/CoS marking'],
        ['Multicast (IGMP / PIM-SM)', isTR ? 'IGMPv2/v3 üyelik raporları, L2 IGMP Snooping tablosu ve PIM-SM Rendezvous Point (RP) ağacı' : 'IGMPv2/v3 join/leave, L2 IGMP Snooping table & PIM-SM Rendezvous Point (RP) shared tree'],
        ['Otomatik Ağ Doğrulama (Assertions)', isTR ? 'Kural tabanlı PING_SUCCESS, PING_FAIL (VLAN İzolasyon), PORT_REACHABLE ve PORT_BLOCKED test motoru' : 'Rule-based PING_SUCCESS, PING_FAIL (VLAN Isolation), PORT_REACHABLE and PORT_BLOCKED assertion engine'],
        ['Wireshark Paket Analizörü', isTR ? 'Ethernet II (802.1Q VLAN), IPv4 (TTL/Flags), TCP (SYN/ACK), UDP, HTTP/MQTT başlık ağacı incelemesi' : 'Ethernet II (802.1Q VLAN), IPv4 (TTL/Flags), TCP (SYN/ACK), UDP, HTTP/MQTT protocol tree inspection'],
        ['Hazır Mimariler (Templates)', isTR ? '3-Tier Enterprise Core-Distribution-Access, Data Center Spine-Leaf ve BGP WAN şablonları' : '3-Tier Enterprise Core-Distribution-Access, Data Center Spine-Leaf & BGP WAN templates'],
      ]
    }
  ];
}