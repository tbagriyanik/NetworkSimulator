import type { GuidedStep } from '../guidedMode.types';

export const cliLessonsRouter: GuidedStep[] = [
  // ===== TÜM ROUTER İŞLEMLERİ (58-104) =====
  // Bölüm 8: Yönlendirme (Router)
  {
    id: 'cli-lesson-5-enable',
    order: 58,
    sectionTitle: { tr: 'Bölüm 8: Yönlendirme (Router)', en: 'Section 8: Routing (Router)' },
    title: { tr: 'Router Yetkili Mod', en: 'Router Privileged Mode' },
    description: { tr: 'Ayrıcalıklı moda geçmek için enable komutunu kullanın', en: 'Use enable command to enter privileged mode' },
    hint: { tr: 'enable yazın\nR-Lab>', en: 'Type enable\nR-Lab>' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-5-conf-t',
    order: 59,
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Global yapılandırma moduna geçin', en: 'Enter global configuration mode' },
    hint: { tr: 'configure terminal yazın\nR-Lab#', en: 'Type configure terminal\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'configure terminal|conf t', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-5-1',
    order: 60,
    title: { tr: 'Statik Yönlendirme', en: 'Static Routing' },
    description: { tr: 'Statik rota ekleyin', en: 'Add static route' },
    hint: { tr: 'ip route 192.168.2.0 255.255.255.0 192.168.1.2 yazın\nR-Lab(config)#', en: 'Type ip route 192.168.2.0 255.255.255.0 192.168.1.2\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip route', deviceType: 'router' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-5-2a',
    order: 61,
    title: { tr: 'RIP Başlat', en: 'Start RIP' },
    description: { tr: 'RIP yönlendirme protokolünü başlatın', en: 'Start RIP routing protocol' },
    hint: { tr: 'router rip yazın\nR-Lab(config)#', en: 'Type router rip\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'router rip', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-2b',
    order: 62,
    title: { tr: 'Ağ Ekle', en: 'Add Network' },
    description: { tr: 'RIP\'e ağ adresini ekleyin', en: 'Add network address to RIP' },
    hint: { tr: 'network 192.168.1.0 yazın\nR-Lab(config-router)#', en: 'Type network 192.168.1.0\nR-Lab(config-router)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-3a',
    order: 63,
    title: { tr: 'OSPF Başlat', en: 'Start OSPF' },
    description: { tr: 'OSPF yönlendirme protokolünü başlatın', en: 'Start OSPF routing protocol' },
    hint: { tr: 'router ospf 1 yazın\nR-Lab(config-router)#', en: 'Type router ospf 1\nR-Lab(config-router)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'router ospf', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-3b',
    order: 64,
    title: { tr: 'Router ID', en: 'Router ID' },
    description: { tr: 'OSPF Router ID\'yi ayarlayın', en: 'Set OSPF router ID' },
    hint: { tr: 'router-id 1.1.1.1 yazın\nR-Lab(config-router)#', en: 'Type router-id 1.1.1.1\nR-Lab(config-router)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'router-id', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-end-router',
    order: 65,
    title: { tr: 'Yetkili Moda Dönüş', en: 'Return to Privileged Mode' },
    description: { tr: 'Görüntüleme komutlarına geçmek için end komutunu çalıştırın', en: 'Run end command to return to privileged mode for show commands' },
    hint: { tr: 'end\nR-Lab(config-router)#', en: 'Type end\nR-Lab(config-router)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'end', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-5-4a',
    order: 66,
    title: { tr: 'Protokolleri Göster', en: 'Show Protocols' },
    description: { tr: 'show ip protocols komutunu kullanın', en: 'Use show ip protocols command' },
    hint: { tr: 'show ip protocols yazın\nR-Lab#', en: 'Type show ip protocols\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip protocols', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-4b',
    order: 67,
    title: { tr: 'OSPF Komşuları Göster', en: 'Show OSPF Neighbors' },
    description: { tr: 'OSPF komşularını görüntüleyin', en: 'Display OSPF neighbors' },
    hint: { tr: 'show ip ospf neighbor yazın\nR-Lab#', en: 'Type show ip ospf neighbor\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip ospf neighbor', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-5-4c',
    order: 68,
    title: { tr: 'Traceroute', en: 'Traceroute' },
    description: { tr: 'traceroute komutu ile ağ yolunu izleyin', en: 'Use traceroute to trace network path' },
    hint: { tr: 'traceroute 192.168.2.1 yazın\nR-Lab#', en: 'Type traceroute 192.168.2.1\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'traceroute', deviceType: 'router' },
    completed: false,
    points: 10
  },

  // Bölüm 9: Güvenlik (Router)
  {
    id: 'cli-lesson-6-conf-t',
    order: 69,
    sectionTitle: { tr: 'Bölüm 9: Güvenlik (Router)', en: 'Section 9: Security (Router)' },
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'Güvenlik ayarları için global yapılandırma moduna geçin', en: 'Enter global configuration mode for security settings' },
    hint: { tr: 'configure terminal yazın\nR-Lab#', en: 'Type configure terminal\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'configure terminal|conf t', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-6-2a',
    order: 70,
    title: { tr: 'RSA Anahtarı', en: 'RSA Key' },
    description: { tr: 'RSA anahtarı oluşturun', en: 'Generate RSA key' },
    hint: { tr: 'crypto key generate rsa yazın\nR-Lab(config)#', en: 'Type crypto key generate rsa\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'crypto key generate rsa', deviceType: 'router' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-2b',
    order: 71,
    title: { tr: 'SSH Versiyonu', en: 'SSH Version' },
    description: { tr: 'SSH versiyon 2\'yi ayarlayın', en: 'Set SSH version 2' },
    hint: { tr: 'ip ssh version 2 yazın\nR-Lab(config)#', en: 'Type ip ssh version 2\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip ssh version 2', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-6-3',
    order: 72,
    title: { tr: 'Kullanıcı Yönetimi', en: 'User Management' },
    description: { tr: 'Yerel kullanıcı oluşturun', en: 'Create local user' },
    hint: { tr: 'username admin privilege 15 secret password yazın\nR-Lab(config)#', en: 'Type username admin privilege 15 secret password\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'username', deviceType: 'router' },
    completed: false,
    points: 15
  },

  // Bölüm 10: Kablosuz (Router)
  {
    id: 'cli-lesson-7-1',
    order: 73,
    sectionTitle: { tr: 'Bölüm 10: Kablosuz (Router)', en: 'Section 10: Wireless (Router)' },
    title: { tr: 'WLAN Oluştur', en: 'Create WLAN' },
    description: { tr: 'Kablosuz ağ oluşturun', en: 'Create a wireless network' },
    hint: { tr: 'wlan MyNetwork 1 MySSID yazın\nR-Lab(config)#', en: 'Type wlan MyNetwork 1 MySSID\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'wlan', deviceType: 'router' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-7-if-radio',
    order: 74,
    title: { tr: 'Radyo Arayüzü Seçimi', en: 'Radio Interface Selection' },
    description: { tr: 'Kablosuz radyo arayüzüne girin', en: 'Enter wireless radio interface' },
    hint: { tr: 'interface dot11Radio 0 yazın\nR-Lab(config)#', en: 'Type interface dot11Radio 0\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface dot11Radio 0|int dot11Radio 0|interface dot11radio 0|int dot11radio 0', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-7-2a',
    order: 75,
    title: { tr: 'Station Role', en: 'Station Role' },
    description: { tr: 'Access Point rolünü ayarlayın', en: 'Set access point role' },
    hint: { tr: 'station-role root yazın\nR-Lab(config-if)#', en: 'Type station-role root\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'station-role', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-7-2b',
    order: 76,
    title: { tr: 'SSID Ayarla', en: 'Set SSID' },
    description: { tr: 'Kablosuz ağ SSID\'sini ayarlayın', en: 'Set wireless network SSID' },
    hint: { tr: 'ssid MySSID yazın\nR-Lab(config-if)#', en: 'Type ssid MySSID\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ssid', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-7-end',
    order: 77,
    title: { tr: 'Yetkili Moda Dönüş', en: 'Return to Privileged Mode' },
    description: { tr: 'Hata ayıklama komutlarına geçmek için end komutu ile yetkili moda dönün', en: 'Return to privileged mode with end command for debug commands' },
    hint: { tr: 'end\nR-Lab(config-if)#', en: 'Type end\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'end', deviceType: 'router' },
    completed: false,
    points: 5
  },

  // Bölüm 11: Hata Ayıklama ve Durum Kontrolleri (Router)
  {
    id: 'cli-lesson-8-1a',
    order: 78,
    sectionTitle: { tr: 'Bölüm 11: Hata Ayıklama ve Durum Kontrolleri (Router)', en: 'Section 11: Debugging and Status Checks (Router)' },
    title: { tr: 'Debug Başlat', en: 'Start Debug' },
    description: { tr: 'Debug komutunu kullanın', en: 'Use debug command' },
    hint: { tr: 'debug ip packet yazın\nR-Lab#', en: 'Type debug ip packet\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'debug ip packet', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-1b',
    order: 79,
    title: { tr: 'Debug Kapat', en: 'Stop Debug' },
    description: { tr: 'Undebug komutunu kullanın', en: 'Use undebug command' },
    hint: { tr: 'undebug all yazın\nR-Lab#', en: 'Type undebug all\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'undebug all', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2b',
    order: 80,
    title: { tr: 'Rotaları Göster', en: 'Show Routes' },
    description: { tr: 'show ip route komutunu kullanın', en: 'Use show ip route command' },
    hint: { tr: 'show ip route yazın\nR-Lab#', en: 'Type show ip route\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip route', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2f',
    order: 81,
    title: { tr: 'IP Arayüz Özeti', en: 'Show IP Interface Brief' },
    description: { tr: 'show ip interface brief komutunu kullanın', en: 'Use show ip interface brief command' },
    hint: { tr: 'show ip interface brief yazın\nR-Lab#', en: 'Type show ip interface brief\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip interface brief', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2g',
    order: 82,
    title: { tr: 'ARP Tablosu Göster', en: 'Show ARP Table' },
    description: { tr: 'show ip arp komutunu kullanın', en: 'Use show ip arp command' },
    hint: { tr: 'show ip arp yazın\nR-Lab#', en: 'Type show ip arp\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show ip arp', deviceType: 'router' },
    completed: false,
    points: 10
  },

  // Bölüm 12: İleri Router Konuları
  {
    id: 'cli-lesson-9-conf-t',
    order: 83,
    sectionTitle: { tr: 'Bölüm 12: İleri Router Konuları', en: 'Section 12: Advanced Router Topics' },
    title: { tr: 'Yapılandırma Modu', en: 'Config Mode' },
    description: { tr: 'İleri servis ayarları için global yapılandırma moduna geçin', en: 'Enter global configuration mode for advanced service settings' },
    hint: { tr: 'configure terminal yazın\nR-Lab#', en: 'Type configure terminal\nR-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'configure terminal|conf t', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-1a',
    order: 84,
    title: { tr: 'DHCP Havuzu Oluştur', en: 'Create DHCP Pool' },
    description: { tr: 'DHCP havuzu oluşturun', en: 'Create a DHCP pool' },
    hint: { tr: 'ip dhcp pool LAN yazın\nR-Lab(config)#', en: 'Type ip dhcp pool LAN\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp pool LAN', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-1b',
    order: 85,
    title: { tr: 'DHCP Ağı', en: 'DHCP Network' },
    description: { tr: 'DHCP havuzu için ağ tanımlayın', en: 'Define network for DHCP pool' },
    hint: { tr: 'network 192.168.1.0 255.255.255.0 yazın\nR-Lab(config-dhcp)#', en: 'Type network 192.168.1.0 255.255.255.0\nR-Lab(config-dhcp)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'network 192.168.1.0', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-1c',
    order: 86,
    title: { tr: 'DHCP Varsayılan Ağ Geçidi', en: 'DHCP Default Gateway' },
    description: { tr: 'DHCP havuzu için varsayılan ağ geçidini ayarlayın', en: 'Set default gateway for DHCP pool' },
    hint: { tr: 'default-router 192.168.1.1 yazın\nR-Lab(config-dhcp)#', en: 'Type default-router 192.168.1.1\nR-Lab(config-dhcp)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'default-router 192.168.1.1', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-exit-dhcp',
    order: 87,
    title: { tr: 'DHCP Modundan Çıkış', en: 'Exit DHCP Mode' },
    description: { tr: 'Global ayarlara dönmek için DHCP modundan çıkın', en: 'Exit DHCP mode to return to global configuration' },
    hint: { tr: 'exit\nR-Lab(config-dhcp)#', en: 'Type exit\nR-Lab(config-dhcp)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-4a',
    order: 88,
    title: { tr: 'IPv6 Yönlendirme', en: 'IPv6 Routing' },
    description: { tr: 'IPv6 yönlendirmeyi etkinleştirin', en: 'Enable IPv6 routing' },
    hint: { tr: 'ipv6 unicast-routing yazın\nR-Lab(config)#', en: 'Type ipv6 unicast-routing\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ipv6 unicast-routing', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-4-select-if',
    order: 89,
    title: { tr: 'Arayüze Gir', en: 'Enter Interface' },
    description: { tr: 'IPv6 adresi atamak için gi0/0 arayüzüne girin', en: 'Enter interface gi0/0 to assign IPv6 address' },
    hint: { tr: 'interface gi0/0 yazın\nR-Lab(config)#', en: 'Type interface gi0/0\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi0/0|int gi0/0', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-4b',
    order: 90,
    title: { tr: 'IPv6 Arayüz Adresi', en: 'IPv6 Interface Address' },
    description: { tr: 'Arayüze IPv6 adresi atayın', en: 'Assign IPv6 address to interface' },
    hint: { tr: 'ipv6 address 2001::1/64 yazın\nR-Lab(config-if)#', en: 'Type ipv6 address 2001::1/64\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ipv6 address', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-exit-if',
    order: 91,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'Global komutlara dönmek için arayüz modundan çıkın', en: 'Exit interface mode to return to global commands' },
    hint: { tr: 'exit\nR-Lab(config-if)#', en: 'Type exit\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-6',
    order: 92,
    title: { tr: 'Komut Takma Adı', en: 'Command Alias' },
    description: { tr: 'Komut takma adı oluşturun', en: 'Create command alias' },
    hint: { tr: 'alias exec si show interfaces yazın\nR-Lab(config)#', en: 'Type alias exec si show interfaces\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'alias exec', deviceType: 'router' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-9-7a',
    order: 93,
    title: { tr: 'ACL Reddet', en: 'ACL Deny' },
    description: { tr: 'Standart ACL ile bir hostu reddedin', en: 'Deny a host with standard ACL' },
    hint: { tr: 'access-list 1 deny host 192.168.1.10 yazın\nR-Lab(config)#', en: 'Type access-list 1 deny host 192.168.1.10\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 1 deny', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7b',
    order: 94,
    title: { tr: 'ACL İzin Ver', en: 'ACL Permit' },
    description: { tr: 'ACL ile tüm trafiğe izin verin', en: 'Permit all traffic with ACL' },
    hint: { tr: 'access-list 1 permit any yazın\nR-Lab(config)#', en: 'Type access-list 1 permit any\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'access-list 1 permit', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7c',
    order: 95,
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'GigabitEthernet 0/0 arayüzüne girin', en: 'Enter GigabitEthernet 0/0 interface' },
    hint: { tr: 'interface gi0/0 yazın\nR-Lab(config)#', en: 'Type interface gi0/0\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi0/0|int gi0/0|interface gigabitethernet 0/0|int gigabitethernet 0/0|interface gigabitethernet0/0|int gigabitethernet0/0|interface gi 0/0|int gi 0/0|interface g0/0|int g0/0', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-7d',
    order: 96,
    title: { tr: 'ACL Uygula', en: 'Apply ACL' },
    description: { tr: 'ACL\'yi arayüze uygulayın', en: 'Apply ACL to interface' },
    hint: { tr: 'ip access-group 1 out yazın\nR-Lab(config-if)#', en: 'Type ip access-group 1 out\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip access-group 1', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-exit-acl-if',
    order: 97,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'AAA ve NAT ayarlarına geçmek için arayüzden çıkın', en: 'Exit interface for AAA and NAT settings' },
    hint: { tr: 'exit\nR-Lab(config-if)#', en: 'Type exit\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'router' },
    completed: false,
    points: 5
  },

  // Bölüm 13: AAA ve Gelişmiş Ağ Özellikleri
  {
    id: 'cli-lesson-10-1a',
    order: 98,
    sectionTitle: { tr: 'Bölüm 13: AAA ve Gelişmiş Ağ Özellikleri', en: 'Section 13: AAA and Advanced Features' },
    title: { tr: 'AAA Etkinleştir', en: 'Enable AAA' },
    description: { tr: 'AAA yeni modelini etkinleştirin', en: 'Enable the AAA new model' },
    hint: { tr: 'aaa new-model yazın\nR-Lab(config)#', en: 'Type aaa new-model\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'aaa new-model', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-10-1c',
    order: 99,
    title: { tr: 'AAA Login Listesi', en: 'AAA Login List' },
    description: { tr: 'Login için yerel kullanıcı veritabanını seçin', en: 'Use the local user database for login' },
    hint: { tr: 'aaa authentication login default local yazın\nR-Lab(config)#', en: 'Type aaa authentication login default local\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'aaa authentication login', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-14-6',
    order: 100,
    title: { tr: 'NAT Overload (PAT)', en: 'NAT Overload (PAT)' },
    description: { tr: 'Dış arayüz üzerinden NAT yapılandırın', en: 'Configure NAT over external interface' },
    hint: { tr: 'ip nat inside source list 1 interface gigabitEthernet 0/0 overload yazın\nR-Lab(config)#', en: 'Type ip nat inside source list 1 interface gigabitEthernet 0/0 overload\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip nat inside source', deviceType: 'router' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-14-7',
    order: 101,
    title: { tr: 'DHCP Yardımcı Arayüzü', en: 'DHCP Helper Interface' },
    description: { tr: 'Yönlendirici arayüzüne girin', en: 'Enter router interface' },
    hint: { tr: 'interface gigabitEthernet 0/1 yazın\nR-Lab(config)#', en: 'Type interface gigabitEthernet 0/1\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface', deviceType: 'router' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-14-8',
    order: 102,
    title: { tr: 'DHCP Aktarımı', en: 'DHCP Relay' },
    description: { tr: 'DHCP sunucusunun IP adresini tanımlayın', en: 'Define DHCP server IP address' },
    hint: { tr: 'ip helper-address 192.168.2.100 yazın\nR-Lab(config-if)#', en: 'Type ip helper-address 192.168.2.100\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip helper-address', deviceType: 'router' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-14-exit',
    order: 103,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'Yapılandırmayı tamamlamak için arayüzden çıkın', en: 'Exit interface to complete configuration' },
    hint: { tr: 'exit\nR-Lab(config-if)#', en: 'Type exit\nR-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'router' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-8a',
    order: 104,
    title: { tr: 'Yapılandırmayı Kaydet', en: 'Save Config' },
    description: { tr: 'copy running-config startup-config veya write memory komutu ile ayarları kaydedin', en: 'Save config with copy running-config startup-config or write memory' },
    hint: { tr: 'do write memory yazın\nR-Lab(config)#', en: 'Type do write memory\nR-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'write memory|copy running-config|do write memory|do copy running-config|write|copy', deviceType: 'router' },
    completed: false,
    points: 10
  }
];