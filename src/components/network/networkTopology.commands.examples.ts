import { Lightbulb, Wifi, Server, Layers, Globe, Router, Network, Shield, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getDhcpExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-dhcp',
    icon: Lightbulb,
    title: isTR ? 'Örnek: DHCP Sunucusu' : 'Example: DHCP Server',
    type: 'examples',
    cmds: [
      ['ip dhcp pool MY_POOL', isTR ? '1. DHCP havuzu oluştur' : '1. Create DHCP pool', '(config)#'],
      ['network 192.168.1.0 255.255.255.0', isTR ? '2. Havuz ağını ve maskesini belirle' : '2. Define pool network and mask', '(config-dhcp)#'],
      ['default-router 192.168.1.1', isTR ? '3. Varsayılan ağ geçidini belirle' : '3. Set default gateway', '(config-dhcp)#'],
      ['dns-server 8.8.8.8', isTR ? '4. DNS sunucusunu belirle' : '4. Set DNS server', '(config-dhcp)#'],
      ['exit', isTR ? '5. Havuz modundan çık' : '5. Exit pool mode', '(config-dhcp)#'],
      ['ip dhcp excluded-address 192.168.1.1', isTR ? '6. Dağıtılmayacak adresleri hariç tut' : '6. Exclude addresses from pool', '(config)#'],
    ]
  };
}

export function getWifiExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-wifi',
    icon: Wifi,
    title: isTR ? 'Örnek: Wi-Fi Ayarları' : 'Example: Wi-Fi Setup',
    type: 'examples',
    cmds: [
      ['dot11 ssid MY_WIFI', isTR ? '1. SSID yapılandırmasına gir' : '1. Enter SSID config', '(config)#'],
      ['authentication open', isTR ? '2. Açık kimlik doğrulama (veya WPA)' : '2. Open authentication (or WPA)', '(config-ssid)#'],
      ['guest-mode', isTR ? '3. SSID\'yi yayınla (Beacon)' : '3. Broadcast SSID (Beacon)', '(config-ssid)#'],
      ['exit', isTR ? '4. SSID modundan çık' : '4. Exit SSID mode', '(config-ssid)#'],
      ['interface Dot11Radio 0', isTR ? '5. Radyo arayüzüne gir' : '5. Enter radio interface', '(config)#'],
      ['ssid MY_WIFI', isTR ? '6. SSID\'yi radyoya ata' : '6. Assign SSID to radio', '(config-if)#'],
      ['no shutdown', isTR ? '7. Radyoyu etkinleştir' : '7. Enable radio', '(config-if)#'],
    ]
  };
}

export function getSshExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-ssh',
    icon: Server,
    title: isTR ? 'Örnek: SSH Sunucusu' : 'Example: SSH Server',
    type: 'examples',
    cmds: [
      ['hostname R1', isTR ? '1. Cihaz adını belirle' : '1. Set the device hostname', '(config)#'],
      ['ip domain-name example.local', isTR ? '2. RSA anahtarı için alan adı belirle' : '2. Set the domain name for RSA key generation', '(config)#'],
      ['username admin privilege 15 secret netsim', isTR ? '3. Yerel yönetici kullanıcısı oluştur' : '3. Create a local administrator account', '(config)#'],
      ['crypto key generate rsa', isTR ? '4. RSA anahtarlarını oluştur' : '4. Generate RSA keys', '(config)#'],
      ['ip ssh version 2', isTR ? "5. SSH sürüm 2'yi etkinleştir" : '5. Enable SSH version 2', '(config)#'],
      ['line vty 0 4', isTR ? '6. VTY hatlarını yapılandır' : '6. Configure the VTY lines', '(config)#'],
      ['login local', isTR ? '7. Yerel kullanıcı doğrulamasını etkinleştir' : '7. Enable local user authentication', '(config-line)#'],
      ['transport input ssh', isTR ? '8. Yalnızca SSH erişimine izin ver' : '8. Allow SSH access only', '(config-line)#'],
      ['ssh -l admin 192.168.1.150', isTR ? '9. SSH bağlantısını test et' : '9. Test the SSH connection', '>'],
    ]
  };
}

export function getVlanExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-vlan',
    icon: Layers,
    title: isTR ? 'Örnek: VLAN & Trunk' : 'Example: VLAN & Trunk',
    type: 'examples',
    cmds: [
      ['vlan 10', isTR ? '1. VLAN 10 oluştur' : '1. Create VLAN 10', '(config)#'],
      ['name SALES', isTR ? '2. VLAN adını "SALES" yap' : '2. Name VLAN "SALES"', '(config-vlan)#'],
      ['interface range fa0/1 - 10', isTR ? '3. İlk 10 portu seç' : '3. Select first 10 ports', '(config)#'],
      ['switchport mode access', isTR ? '4. Portları erişim moduna al' : '4. Set ports to access mode', '(config-if)#'],
      ['switchport access vlan 10', isTR ? '5. Portları VLAN 10\'a ata' : '5. Assign ports to VLAN 10', '(config-if)#'],
      ['interface gi0/1', isTR ? '6. Uplink portunu seç' : '6. Select uplink port', '(config)#'],
      ['switchport mode trunk', isTR ? '7. Portu Trunk moduna al' : '7. Set port to Trunk mode', '(config-if)#'],
    ]
  };
}

export function getNatExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-nat',
    icon: Globe,
    title: isTR ? 'Örnek: NAT & PAT' : 'Example: NAT & PAT',
    type: 'examples',
    cmds: [
      ['access-list 1 permit 192.168.1.0 0.0.0.255', isTR ? '1. İç ağ için ACL tanımla' : '1. Define ACL for internal network', '(config)#'],
      ['ip nat inside source list 1 interface gi0/0 overload', isTR ? '2. PAT (Overload) kuralı ekle' : '2. Add PAT (Overload) rule', '(config)#'],
      ['interface gi0/1', isTR ? '3. İç arayüze gir' : '3. Select inside interface', '(config)#'],
      ['ip nat inside', isTR ? '4. İç arayüz olarak işaretle' : '4. Mark as inside interface', '(config-if)#'],
      ['interface gi0/0', isTR ? '5. Dış (internet) arayüzüne gir' : '5. Select outside interface', '(config)#'],
      ['ip nat outside', isTR ? '6. Dış arayüz olarak işaretle' : '6. Mark as outside interface', '(config-if)#'],
      ['show ip nat translations', isTR ? '7. NAT çeviri tablosunu gör' : '7. View NAT translations', '#'],
    ]
  };
}

export function getRouterOnAStickExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-router-on-a-stick',
    icon: Router,
    title: isTR ? 'Örnek: Router-on-a-Stick' : 'Example: Router-on-a-Stick',
    type: 'examples',
    cmds: [
      ['interface gi0/0.10', isTR ? '1. VLAN 10 alt-arayüzünü oluştur' : '1. Create VLAN 10 subinterface', '(config)#'],
      ['encapsulation dot1q 10', isTR ? '2. Dot1Q kapsülleme & VLAN 10 ataması' : '2. Set Dot1Q encapsulation & VLAN 10', '(config-subif)#'],
      ['ip address 192.168.10.1 255.255.255.0', isTR ? '3. VLAN 10 ağ geçidi IP\'sini ata' : '3. Set VLAN 10 gateway IP', '(config-subif)#'],
      ['interface gi0/0.20', isTR ? '4. VLAN 20 alt-arayüzünü oluştur' : '4. Create VLAN 20 subinterface', '(config)#'],
      ['encapsulation dot1q 20', isTR ? '5. Dot1Q kapsülleme & VLAN 20 ataması' : '5. Set Dot1Q encapsulation & VLAN 20', '(config-subif)#'],
      ['ip address 192.168.20.1 255.255.255.0', isTR ? '6. VLAN 20 ağ geçidi IP\'sini ata' : '6. Set VLAN 20 gateway IP', '(config-subif)#'],
      ['interface gi0/0', isTR ? '7. Ana fiziksel arayüze gir ve aç' : '7. Enter main physical interface & enable', '(config)#'],
      ['no shutdown', isTR ? '8. Fiziksel arayüzü etkinleştir' : '8. Enable physical interface', '(config-if)#'],
    ]
  };
}

export function getEtherChannelExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-etherchannel',
    icon: Layers,
    title: isTR ? 'Örnek: EtherChannel (LACP)' : 'Example: EtherChannel (LACP)',
    type: 'examples',
    cmds: [
      ['interface range fa0/1 - 2', isTR ? '1. Bağlanacak fiziksel portları seç' : '1. Select physical ports to bundle', '(config)#'],
      ['channel-group 1 mode active', isTR ? '2. LACP active modunda grupla' : '2. Group in LACP active mode', '(config-if-range)#'],
      ['interface port-channel 1', isTR ? '3. Oluşan Port-Channel arayüzüne gir' : '3. Select created Port-Channel interface', '(config)#'],
      ['switchport mode trunk', isTR ? '4. Mantıksal portu Trunk yap' : '4. Set logical port to Trunk mode', '(config-if)#'],
      ['show etherchannel summary', isTR ? '5. Gruba dahil durumunu kontrol et' : '5. Verify EtherChannel summary status', '#'],
    ]
  };
}

export function getHsrpExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-hsrp',
    icon: Server,
    title: isTR ? 'Örnek: HSRP Ağ Geçidi Yedekleme' : 'Example: HSRP Gateway Redundancy',
    type: 'examples',
    cmds: [
      ['interface gi0/0', isTR ? '1. LAN tarafındaki arayüze gir' : '1. Enter LAN-facing interface', '(config)#'],
      ['standby 1 ip 192.168.1.254', isTR ? '2. Sanal IP (Virtual IP) adresini ata' : '2. Set Virtual IP address', '(config-if)#'],
      ['standby 1 priority 110', isTR ? '3. Önceliği artır (Birincil Router yap)' : '3. Increase priority (Make Active Router)', '(config-if)#'],
      ['standby 1 preempt', isTR ? '4. Geri devralma (preempt) modunu aç' : '4. Enable preemption mode', '(config-if)#'],
      ['show standby brief', isTR ? '5. HSRP aktif/beklemede durumunu kontrol et' : '5. Verify HSRP status', '#'],
    ]
  };
}

export function getOspfExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-ospf',
    icon: Network,
    title: isTR ? 'Örnek: OSPF Yönlendirme' : 'Example: OSPF Routing',
    type: 'examples',
    cmds: [
      ['router ospf 1', isTR ? '1. OSPF sürecini başlat (Process ID 1)' : '1. Enable OSPF process 1', '(config)#'],
      ['router-id 1.1.1.1', isTR ? '2. Router ID kimliğini belirle' : '2. Set Router ID', '(config-router)#'],
      ['network 192.168.1.0 0.0.0.255 area 0', isTR ? '3. Yerel LAN ağını Area 0\'a duyur' : '3. Advertise LAN network in Area 0', '(config-router)#'],
      ['network 10.0.0.0 0.0.0.3 area 0', isTR ? '4. WAN bağlantısını Area 0\'a duyur' : '4. Advertise WAN link in Area 0', '(config-router)#'],
      ['show ip ospf neighbor', isTR ? '5. OSPF komşuluk durumunu doğrula' : '5. Verify OSPF neighbor adjacency', '#'],
    ]
  };
}

export function getAclExample(isTR: boolean): CommandDefinition {
  return {
    id: 'examples-acl',
    icon: Shield,
    title: isTR ? 'Örnek: Genişletilmiş ACL' : 'Example: Extended ACL',
    type: 'examples',
    cmds: [
      ['access-list 100 deny tcp 192.168.1.0 0.0.0.255 host 10.0.0.5 eq 80', isTR ? '1. 192.168.1.0/24 ağının 10.0.0.5 web sunucusuna (HTTP/80) erişimini engelle' : '1. Block HTTP traffic from 192.168.1.0/24 to 10.0.0.5', '(config)#'],
      ['access-list 100 permit ip any any', isTR ? '2. Diğer tüm trafiğe izin ver' : '2. Permit all other IP traffic', '(config)#'],
      ['interface gi0/0', isTR ? '3. Trafiğin girdiği arayüze gir' : '3. Select inbound interface', '(config)#'],
      ['ip access-group 100 in', isTR ? '4. ACL kuralını arayüzün girişine uygula' : '4. Apply ACL to inbound interface', '(config-if)#'],
      ['show access-lists', isTR ? '5. ACL kurallarını ve eşleşmelerini denetle' : '5. Verify ACL rules and hit count', '#'],
    ]
  };
}