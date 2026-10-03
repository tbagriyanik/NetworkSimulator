import type { GuidedStep } from '../guidedMode.types';

export const cliLessonsSwitch: GuidedStep[] = [
  // ===== TÜM SWITCH İŞLEMLERİ (1-56) =====
  // Bölüm 1: Temel Mod Komutları (Switch)
  {
    id: 'cli-lesson-1-1a',
    order: 1,
    sectionTitle: { tr: 'Bölüm 1: Temel Mod Komutları (Switch)', en: 'Section 1: Basic Mode Commands (Switch)' },
    title: { tr: 'Enable Komutu', en: 'Enable Command' },
    description: { tr: 'Ayrıcalıklı moda geçmek için enable komutunu kullanın', en: 'Use enable command to enter privileged mode' },
    hint: { tr: 'enable yazın\nS-Lab>', en: 'Type enable\nS-Lab>' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-1-1c',
    order: 2,
    title: { tr: 'Help Komutu', en: 'Help Command' },
    description: { tr: 'Yardım sistemini kullanın', en: 'Use the help system' },
    hint: { tr: 'help yazın\nS-Lab#', en: 'Type help\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'help', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-1-3a',
    order: 3,
    title: { tr: 'Konfigürasyonu Görüntüle', en: 'View Configuration' },
    description: { tr: 'show running-config komutunu kullanın', en: 'Use show running-config command' },
    hint: { tr: 'show running-config yazın\nS-Lab#', en: 'Type show running-config\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show running-config', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-1-3b',
    order: 4,
    title: { tr: 'Konfigürasyonu Kaydet', en: 'Save Configuration' },
    description: { tr: 'write memory komutunu kullanın', en: 'Use write memory command' },
    hint: { tr: 'write memory yazın\nS-Lab#', en: 'Type write memory\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'write memory', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-1-conf-t',
    order: 5,
    title: { tr: 'Yapılandırma Moduna Geç', en: 'Enter Configuration Mode' },
    description: { tr: 'configure terminal komutuyla global yapılandırma moduna geçin', en: 'Use configure terminal to enter global configuration mode' },
    hint: { tr: 'configure terminal yazın\nS-Lab#', en: 'Type configure terminal\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'configure terminal|conf t', deviceType: 'switch' },
    completed: false,
    points: 5
  },

  // Bölüm 2: Global Konfigürasyon (Switch)
  {
    id: 'cli-lesson-2-1a',
    order: 6,
    sectionTitle: { tr: 'Bölüm 2: Global Konfigürasyon (Switch)', en: 'Section 2: Global Configuration (Switch)' },
    title: { tr: 'Hostname Ayarla', en: 'Set Hostname' },
    description: { tr: 'Switch\'e SW-Lab ismini verin', en: 'Give the switch the name SW-Lab' },
    hint: { tr: 'hostname SW-Lab yazın\nS-Lab(config)#', en: 'Type hostname SW-Lab\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'hostname SW-Lab', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-1b',
    order: 7,
    title: { tr: 'Banner Ayarla', en: 'Set Banner' },
    description: { tr: 'Giriş karşılama mesajı (MOTD) tanımlayın', en: 'Set a message of the day (MOTD) banner' },
    hint: { tr: 'banner motd #Welcome# yazın\nS-Lab(config)#', en: 'Type banner motd #Welcome#\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'banner motd', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-1c',
    order: 8,
    title: { tr: 'Enable Secret Ayarla', en: 'Set Enable Secret' },
    description: { tr: 'Enable secret komutunu kullanın', en: 'Learn enable secret command' },
    hint: { tr: 'enable secret password yazın\nS-Lab(config)#', en: 'Type enable secret password\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'enable secret', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2a',
    order: 9,
    title: { tr: 'DNS Sunucusu Ayarla', en: 'Set DNS Server' },
    description: { tr: 'DNS sunucusu komutunu kullanın', en: 'Learn DNS server command' },
    hint: { tr: 'ip name-server 8.8.8.8 yazın\nS-Lab(config)#', en: 'Type ip name-server 8.8.8.8\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip name-server', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2b',
    order: 10,
    title: { tr: 'Saat Dilimi Ayarla', en: 'Set Timezone' },
    description: { tr: 'Saat dilimi komutunu kullanın', en: 'Learn timezone command' },
    hint: { tr: 'clock timezone UTC 0 yazın\nS-Lab(config)#', en: 'Type clock timezone UTC 0\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'clock timezone', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-2-2c',
    order: 11,
    title: { tr: 'NTP Sunucusu Ayarla', en: 'Set NTP Server' },
    description: { tr: 'NTP sunucusu komutunu kullanın', en: 'Learn NTP server command' },
    hint: { tr: 'ntp server 192.168.1.1 yazın\nS-Lab(config)#', en: 'Type ntp server 192.168.1.1\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ntp server', deviceType: 'switch' },
    completed: false,
    points: 10
  },

  // Bölüm 3: Arayüz Konfigürasyonu (Switch)
  {
    id: 'cli-lesson-3-1a',
    order: 12,
    sectionTitle: { tr: 'Bölüm 3: Arayüz Konfigürasyonu (Switch)', en: 'Section 3: Interface Configuration (Switch)' },
    title: { tr: 'Arayüz Seçimi', en: 'Interface Selection' },
    description: { tr: 'GigabitEthernet 1/0/1 arayüzüne girin', en: 'Enter GigabitEthernet 1/0/1 interface' },
    hint: { tr: 'interface gi1/0/1 yazın\nS-Lab(config)#', en: 'Type interface gi1/0/1\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi1/0/1|int gi1/0/1|interface gigabitethernet 1/0/1|int gigabitethernet 1/0/1|interface gigabitethernet1/0/1|int gigabitethernet1/0/1|interface gi 1/0/1|int gi 1/0/1|interface g1/0/1|int g1/0/1', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-1b',
    order: 13,
    title: { tr: 'Arayüzü Aktifleştir', en: 'Activate Interface' },
    description: { tr: 'no shutdown komutu ile arayüzü aktif hale getirin', en: 'Use no shutdown to activate the interface' },
    hint: { tr: 'no shutdown yazın\nS-Lab(config-if)#', en: 'Type no shutdown\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'no shutdown', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-3',
    order: 14,
    title: { tr: 'Port Kapat', en: 'Shutdown Port' },
    description: { tr: 'shutdown komutu ile portu devre dışı bırakın', en: 'Use shutdown to disable the port' },
    hint: { tr: 'shutdown yazın\nS-Lab(config-if)#', en: 'Type shutdown\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'shutdown', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-4',
    order: 15,
    title: { tr: 'Arayüz Açıklaması', en: 'Interface Description' },
    description: { tr: 'Arayüze açıklama metni ekleyin', en: 'Add a description to the interface' },
    hint: { tr: 'description LAN-Port yazın\nS-Lab(config-if)#', en: 'Type description LAN-Port\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'description', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-5',
    order: 16,
    title: { tr: 'Port Hızı', en: 'Port Speed' },
    description: { tr: 'Arayüz hızını 100 Mbps olarak ayarlayın', en: 'Set interface speed to 100 Mbps' },
    hint: { tr: 'speed 100 yazın\nS-Lab(config-if)#', en: 'Type speed 100\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'speed', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-6',
    order: 17,
    title: { tr: 'Port Duplexi', en: 'Port Duplex' },
    description: { tr: 'Arayüz duplex modunu full olarak ayarlayın', en: 'Set interface duplex mode to full' },
    hint: { tr: 'duplex full yazın\nS-Lab(config-if)#', en: 'Type duplex full\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'duplex', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-3-exit-if',
    order: 18,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'VLAN oluşturmak için arayüz modundan çıkın', en: 'Exit interface mode to create VLAN' },
    hint: { tr: 'exit\nS-Lab(config-if)#', en: 'Type exit\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'switch' },
    completed: false,
    points: 5
  },

  // Bölüm 4: VLAN Yönetimi (Switch)
  {
    id: 'cli-lesson-4-1a',
    order: 19,
    sectionTitle: { tr: 'Bölüm 4: VLAN Yönetimi (Switch)', en: 'Section 4: VLAN Management (Switch)' },
    title: { tr: 'VLAN Oluştur', en: 'Create VLAN' },
    description: { tr: 'VLAN 10 oluşturun', en: 'Create VLAN 10' },
    hint: { tr: 'vlan 10 yazın\nS-Lab(config)#', en: 'Type vlan 10\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'vlan 10', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-1b',
    order: 20,
    title: { tr: 'VLAN İsimlendir', en: 'Name VLAN' },
    description: { tr: 'VLAN\'a SALES ismini verin', en: 'Give the VLAN the name SALES' },
    hint: { tr: 'name SALES yazın\nS-Lab(config-vlan)#', en: 'Type name SALES\nS-Lab(config-vlan)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'name SALES', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-exit-vlan',
    order: 21,
    title: { tr: 'VLAN Modundan Çık', en: 'Exit VLAN Mode' },
    description: { tr: 'Arayüz seçimine geçmeden önce VLAN yapılandırma modundan çıkın', en: 'Exit VLAN configuration mode before selecting interfaces' },
    hint: { tr: 'exit\nS-Lab(config-vlan)#', en: 'Type exit\nS-Lab(config-vlan)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-3-2',
    order: 22,
    title: { tr: 'Arayüz Aralığı', en: 'Interface Range' },
    description: { tr: 'Birden fazla arayüzü aynı anda seçin', en: 'Select multiple interfaces at once' },
    hint: { tr: 'interface range gi1/0/1 - 5 yazın\nS-Lab(config)#', en: 'Type interface range gi1/0/1 - 5\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface range|int range', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-4-2',
    order: 23,
    title: { tr: 'VLAN Atama', en: 'Assign VLAN' },
    description: { tr: 'Arayüzü VLAN 10\'a atayın', en: 'Assign interface to VLAN 10' },
    hint: { tr: 'switchport access vlan 10 yazın\nS-Lab(config-if)#', en: 'Type switchport access vlan 10\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport access vlan 10', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-4-exit-interface-range',
    order: 24,
    title: { tr: 'Arayüz Modundan Çık', en: 'Exit Interface Mode' },
    description: { tr: 'Trunk yapılandırmasına geçmeden önce arayüz modundan çıkın', en: 'Exit interface mode before configuring the trunk' },
    hint: { tr: 'exit\nS-Lab(config-if)#', en: 'Type exit\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-4-select-trunk-interface',
    order: 25,
    title: { tr: 'Trunk Arayüzünü Seç', en: 'Select Trunk Interface' },
    description: { tr: 'Trunk ayarları için gi1/0/24 arayüzüne geçin', en: 'Enter interface gi1/0/24 for trunk configuration' },
    hint: { tr: 'interface gi1/0/24 yazın\nS-Lab(config)#', en: 'Type interface gi1/0/24\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi1/0/24|int gi1/0/24|interface gigabitethernet 1/0/24|int gigabitethernet 1/0/24|interface gigabitethernet1/0/24|int gigabitethernet1/0/24|interface gi 1/0/24|int gi 1/0/24|interface g1/0/24|int g1/0/24', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-4-2b',
    order: 26,
    title: { tr: 'Trunk Kapsülleme', en: 'Trunk Encapsulation' },
    description: { tr: 'gi1/0/24 için Trunk kapsülleme protokolünü 802.1Q olarak ayarlayın', en: 'Set trunk encapsulation to 802.1Q for gi1/0/24' },
    hint: { tr: 'switchport trunk encapsulation dot1q yazın\nS-Lab(config-if)#', en: 'Type switchport trunk encapsulation dot1q\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport trunk encapsulation', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-3',
    order: 27,
    title: { tr: 'Trunk Portu', en: 'Trunk Port' },
    description: { tr: 'gi1/0/24 için Trunk portu yapılandırın', en: 'Configure trunk port for gi1/0/24' },
    hint: { tr: 'switchport mode trunk yazın\nS-Lab(config-if)#', en: 'Type switchport mode trunk\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport mode trunk', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-4-4',
    order: 28,
    title: { tr: 'Trunk İzinli VLAN', en: 'Trunk Allowed VLAN' },
    description: { tr: 'Trunk üzerinde izinli VLAN\'ları belirleyin', en: 'Set allowed VLANs on trunk' },
    hint: { tr: 'switchport trunk allowed vlan 10,20 yazın\nS-Lab(config-if)#', en: 'Type switchport trunk allowed vlan 10,20\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport trunk allowed vlan', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-5',
    order: 29,
    title: { tr: 'Native VLAN', en: 'Native VLAN' },
    description: { tr: 'Trunk için native VLAN ayarlayın', en: 'Set native VLAN for trunk' },
    hint: { tr: 'switchport trunk native vlan 99 yazın\nS-Lab(config-if)#', en: 'Type switchport trunk native vlan 99\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport trunk native vlan', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-4-exit-trunk',
    order: 30,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'Güvenlik ayarlarına geçmeden önce arayüz modundan çıkın', en: 'Exit interface mode before security configuration' },
    hint: { tr: 'exit\nS-Lab(config-if)#', en: 'Type exit\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'switch' },
    completed: false,
    points: 5
  },

  // Bölüm 5: Güvenlik (Switch)
  {
    id: 'cli-lesson-6-1-select-if',
    order: 31,
    sectionTitle: { tr: 'Bölüm 5: Güvenlik (Switch)', en: 'Section 5: Security (Switch)' },
    title: { tr: 'Erişim Portu Seç', en: 'Select Access Port' },
    description: { tr: 'Port güvenliği için gi1/0/1 arayüzüne girin', en: 'Enter interface gi1/0/1 for port security' },
    hint: { tr: 'interface gi1/0/1 yazın\nS-Lab(config)#', en: 'Type interface gi1/0/1\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi1/0/1|int gi1/0/1', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-6-1a',
    order: 32,
    title: { tr: 'Port Güvenliği', en: 'Port Security' },
    description: { tr: 'gi1/0/1 için Port güvenliğini etkinleştirin', en: 'Enable port security for gi1/0/1' },
    hint: { tr: 'switchport port-security yazın\nS-Lab(config-if)#', en: 'Type switchport port-security\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'switchport port-security', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-1b',
    order: 33,
    title: { tr: 'Sticky MAC', en: 'Sticky MAC' },
    description: { tr: 'MAC adreslerini kalıcı öğrenmeyi açın', en: 'Enable sticky MAC learning' },
    hint: { tr: 'switchport port-security mac-address sticky yazın\nS-Lab(config-if)#', en: 'Type switchport port-security mac-address sticky\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'mac-address sticky', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-6-exit-if',
    order: 34,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'Global güvenlik komutlarına geçmek için arayüz modundan çıkın', en: 'Exit interface mode for global security commands' },
    hint: { tr: 'exit\nS-Lab(config-if)#', en: 'Type exit\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-8-5a',
    order: 35,
    title: { tr: 'DHCP Snooping Aç', en: 'Enable DHCP Snooping' },
    description: { tr: 'DHCP Snooping özelliğini etkinleştirin', en: 'Enable DHCP snooping globally' },
    hint: { tr: 'ip dhcp snooping yazın\nS-Lab(config)#', en: 'Type ip dhcp snooping\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp snooping', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-5b',
    order: 36,
    title: { tr: 'DHCP Snooping VLAN', en: 'DHCP Snooping VLAN' },
    description: { tr: 'VLAN\'lar için DHCP Snooping yapılandırın', en: 'Configure DHCP snooping for VLANs' },
    hint: { tr: 'ip dhcp snooping vlan 1,10,20 yazın\nS-Lab(config)#', en: 'Type ip dhcp snooping vlan 1,10,20\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'ip dhcp snooping vlan', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-6-1c',
    order: 37,
    title: { tr: 'Hata Kurtarma', en: 'Error Recovery' },
    description: { tr: 'errdisable recovery özelliğini etkinleştirin', en: 'Enable errdisable recovery' },
    hint: { tr: 'errdisable recovery cause all yazın\nS-Lab(config)#', en: 'Type errdisable recovery cause all\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'errdisable recovery', deviceType: 'switch' },
    completed: false,
    points: 10
  },

  // Bölüm 6: İleri Switch Konuları
  {
    id: 'cli-lesson-9-2a',
    order: 38,
    sectionTitle: { tr: 'Bölüm 6: İleri Switch Konuları', en: 'Section 6: Advanced Switch Topics' },
    title: { tr: 'GigabitEthernet Arayüz', en: 'GigabitEthernet Interface' },
    description: { tr: 'GigabitEthernet 1/0/1 arayüzüne girin', en: 'Enter GigabitEthernet 1/0/1 interface' },
    hint: { tr: 'interface gi1/0/1 yazın\nS-Lab(config)#', en: 'Type interface gi1/0/1\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi1/0/1|int gi1/0/1|interface gigabitethernet 1/0/1|int gigabitethernet 1/0/1|interface gigabitethernet1/0/1|int gigabitethernet1/0/1|interface gi 1/0/1|int gi 1/0/1|interface g1/0/1|int g1/0/1', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-2b',
    order: 39,
    title: { tr: 'EtherChannel', en: 'EtherChannel' },
    description: { tr: 'EtherChannel kanal grubu oluşturun', en: 'Create EtherChannel group' },
    hint: { tr: 'channel-group 1 mode active yazın\nS-Lab(config-if)#', en: 'Type channel-group 1 mode active\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'channel-group', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-exit-ec',
    order: 40,
    title: { tr: 'Arayüzden Çıkış', en: 'Exit Interface' },
    description: { tr: 'Global QoS ayarları için arayüzden çıkın', en: 'Exit interface for global QoS configuration' },
    hint: { tr: 'exit\nS-Lab(config-if)#', en: 'Type exit\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'exit', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-3a',
    order: 41,
    title: { tr: 'QoS Etkinleştir', en: 'Enable QoS' },
    description: { tr: 'QoS özelliğini etkinleştirin', en: 'Enable QoS globally' },
    hint: { tr: 'mls qos yazın\nS-Lab(config)#', en: 'Type mls qos\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'mls qos', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-3-select-if',
    order: 42,
    title: { tr: 'QoS Portunu Seç', en: 'Select QoS Port' },
    description: { tr: 'CoS güvenini ayarlamak için gi1/0/1 arayüzüne girin', en: 'Enter interface gi1/0/1 to configure CoS trust' },
    hint: { tr: 'interface gi1/0/1 yazın\nS-Lab(config)#', en: 'Type interface gi1/0/1\nS-Lab(config)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'interface gi1/0/1|int gi1/0/1', deviceType: 'switch' },
    completed: false,
    points: 5
  },
  {
    id: 'cli-lesson-9-3b',
    order: 43,
    title: { tr: 'QoS Trust', en: 'QoS Trust' },
    description: { tr: 'gi1/0/1 arayüzde CoS güvenini ayarlayın', en: 'Set CoS trust on interface gi1/0/1' },
    hint: { tr: 'mls qos trust cos yazın\nS-Lab(config-if)#', en: 'Type mls qos trust cos\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'mls qos trust', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-end',
    order: 44,
    title: { tr: 'Yetkili Moda Dönüş', en: 'Return to Privileged Mode' },
    description: { tr: 'Görüntüleme komutlarına geçmek için end komutu ile yetkili moda dönün', en: 'Return to privileged mode with end command for show commands' },
    hint: { tr: 'end\nS-Lab(config-if)#', en: 'Type end\nS-Lab(config-if)#' },
    checkType: 'command',
    checkParams: { commandPattern: 'end', deviceType: 'switch' },
    completed: false,
    points: 5
  },

  // Bölüm 7: Görüntüleme ve Durum Kontrolleri (Switch)
  {
    id: 'cli-lesson-9-2c',
    order: 45,
    sectionTitle: { tr: 'Bölüm 7: Görüntüleme ve Durum Kontrolleri (Switch)', en: 'Section 7: Display and Status Checks (Switch)' },
    title: { tr: 'EtherChannel Göster', en: 'Show EtherChannel' },
    description: { tr: 'EtherChannel durumunu görüntüleyin', en: 'Display EtherChannel status' },
    hint: { tr: 'show etherchannel summary yazın\nS-Lab#', en: 'Type show etherchannel summary\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show etherchannel summary', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2a',
    order: 46,
    title: { tr: 'Arayüzleri Göster', en: 'Show Interfaces' },
    description: { tr: 'show interfaces komutunu kullanın', en: 'Use show interfaces command' },
    hint: { tr: 'show interfaces yazın\nS-Lab#', en: 'Type show interfaces\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show interfaces', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2c',
    order: 47,
    title: { tr: 'VLAN\'ları Göster', en: 'Show VLANs' },
    description: { tr: 'show vlan komutunu kullanın', en: 'Use show vlan command' },
    hint: { tr: 'show vlan yazın\nS-Lab#', en: 'Type show vlan\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show vlan', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-3a',
    order: 48,
    title: { tr: 'STP Göster', en: 'Show STP' },
    description: { tr: 'show spanning-tree komutunu kullanın', en: 'Use show spanning-tree command' },
    hint: { tr: 'show spanning-tree yazın\nS-Lab#', en: 'Type show spanning-tree\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show spanning-tree', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-8-4a',
    order: 49,
    title: { tr: 'CDP Komşuları Göster', en: 'Show CDP Neighbors' },
    description: { tr: 'show cdp neighbors komutunu kullanın', en: 'Use show cdp neighbors command' },
    hint: { tr: 'show cdp neighbors yazın\nS-Lab#', en: 'Type show cdp neighbors\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show cdp neighbors', deviceType: 'switch' },
    completed: false,
    points: 15
  },
  {
    id: 'cli-lesson-9-5a',
    order: 50,
    title: { tr: 'Envanter Göster', en: 'Show Inventory' },
    description: { tr: 'show inventory komutunu kullanın', en: 'Use show inventory command' },
    hint: { tr: 'show inventory yazın\nS-Lab#', en: 'Type show inventory\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show inventory', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5b',
    order: 51,
    title: { tr: 'Ortam Göster', en: 'Show Environment' },
    description: { tr: 'show environment komutunu kullanın', en: 'Use show environment command' },
    hint: { tr: 'show environment yazın\nS-Lab#', en: 'Type show environment\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show environment', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-9-5c',
    order: 52,
    title: { tr: 'Bellek Göster', en: 'Show Memory' },
    description: { tr: 'show memory komutunu kullanın', en: 'Use show memory command' },
    hint: { tr: 'show memory yazın\nS-Lab#', en: 'Type show memory\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show memory', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-5c',
    order: 53,
    title: { tr: 'MAC Tablosu Göster', en: 'Show MAC Table' },
    description: { tr: 'show mac address-table komutunu kullanın', en: 'Use show mac address-table command' },
    hint: { tr: 'show mac address-table yazın\nS-Lab#', en: 'Type show mac address-table\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show mac address-table', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2d',
    order: 54,
    title: { tr: 'VLAN Özeti Göster', en: 'Show VLAN Brief' },
    description: { tr: 'show vlan brief komutunu kullanın', en: 'Use show vlan brief command' },
    hint: { tr: 'show vlan brief yazın\nS-Lab#', en: 'Type show vlan brief\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show vlan brief', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-2e',
    order: 55,
    title: { tr: 'Trunk\'ları Göster', en: 'Show Trunk' },
    description: { tr: 'show interfaces trunk komutunu kullanın', en: 'Use show interfaces trunk command' },
    hint: { tr: 'show interfaces trunk yazın\nS-Lab#', en: 'Type show interfaces trunk\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show interfaces trunk', deviceType: 'switch' },
    completed: false,
    points: 10
  },
  {
    id: 'cli-lesson-8-5d',
    order: 56,
    title: { tr: 'Port Güvenliği Göster', en: 'Show Port Security' },
    description: { tr: 'show port-security komutunu kullanın', en: 'Use show port-security command' },
    hint: { tr: 'show port-security yazın\nS-Lab#', en: 'Type show port-security\nS-Lab#' },
    checkType: 'command',
    checkParams: { commandPattern: 'show port-security', deviceType: 'switch' },
    completed: false,
    points: 10
  }
];