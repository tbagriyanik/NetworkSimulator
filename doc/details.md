
## Latest Updates

### v1.9.8 (2026-07-16)

| English | Türkçe |
| --- | --- |
| **Collapsible Info Panels**: PC and Router information popups are now collapsible; sections (WiFi, Services, IP Mode, etc.) can be toggled with a single click and state is persisted in localStorage | **Daraltılabilir Bilgi Panelleri**: PC ve Router bilgilendirme popup'ları artık daraltılabilir; bölümler (WiFi, Servisler, IP Modu, vb.) tek tıkla gizlenip gösterilebilir ve durum localStorage'da saklanır |
| **Collapsible Network Refresh Report Panel**: The Ağ Yenilendi Paneli (Network Refresh Report) is now collapsible; the header button allows expanding/collapsing and state is persisted in localStorage | **Daraltılabilir Ağ Yenileme Raporu Paneli**: Ağ Yenilendi Paneli artık daraltılabilir; başlık düğmesiyle genişletme/daraltma mümkün ve durum localStorage'da saklanır |

### v1.9.6 (2026-07-08)
| English | Türkçe |
| --- | --- |
| **"Teach Me" Guided Lessons**: 3 new guided projects for absolute beginners — Beginner (PC ipconfig, switch enable/configure terminal/hostname), Intermediate (router interface IP assignment & no shutdown), and Advanced (OSPF process + network statement + standard ACL). | **"Bana Öğret" Rehberli Dersleri**: Sıfırdan öğrenim için 3 yeni rehberli proje — Temel (PC ipconfig, switch enable/configure terminal/hostname), Orta (router arayüz IP atama ve no shutdown) ve İleri (OSPF işlemi + network ifadesi + standart ACL). |
| **PC-based Troubleshooting**: Fault definitions now validate PC properties (IP, gateway, DNS, hostname) via `pc.` prefix; TroubleshootingPanel resolves PC faults against topology devices. | **PC Tabanlı Arıza Giderme**: Arıza tanımları artık `pc.` ön eki ile PC özelliklerini (IP, gateway, DNS, hostname) doğrulayabiliyor; TroubleshootingPanel PC arızalarını topoloji cihazlarına karşı çözüyor. |
| **Auto-Type Command Injection**: External `pc-auto-type` event types commands character-by-character into the PC CMD and executes them automatically. | **Otomatik Komut Yazdırma**: Harici `pc-auto-type` olayı, komutları karakter karakter PC CMD'ye yazar ve otomatik çalıştırır. |
| **New Window Events**: `pc-tab-changed` and `pc-command-executed` events broadcast PC panel state to external components. | **Yeni Pencere Olayları**: `pc-tab-changed` ve `pc-command-executed` olayları PC panel durumu dış bileşenlere bildiriyor. |

### v1.9.5 (2026-07-07)
| English | Türkçe |
| --- | --- |
| **Industry Scenarios**: 4 new real-world setups: SOHO, School Campus, Hospital, and E-Commerce with multi-step verification. | **Sektörel Senaryolar**: Çok adımlı doğrulamaya sahip 4 yeni gerçek dünya kurulumu: SOHO, Okul Kampüsü, Hastane ve E-Ticaret. |
| **Voice Narration (TTS)**: New "Read Aloud" button in Guided Mode to assist learning through speech synthesis. | **Sesli Anlatım (TTS)**: Rehberli Modda konuşma sentezi yoluyla öğrenmeyi destekleyen yeni "Sesli Dinle" butonu. |
| **PDF Certificates**: Automated certificate generation upon completing labs, including student name and score. | **PDF Sertifikaları**: Öğrenci adı ve puanını içeren, laboratuvar tamamlandığında otomatik sertifika üretimi. |
| **Extended Troubleshooting**: New "Find and Fix" challenges for Trunk misconfigurations and OSPF area mismatches. | **Gelişmiş Arıza Giderme**: Trunk yapılandırma hataları ve OSPF alan uyumsuzlukları için yeni "Bul ve Düzelt" görevleri. |
| **IPv6 Master Lab**: Comprehensive dual-stack scenario featuring OSPFv3 and IPv6 traffic filtering (ACLs). | **IPv6 Master Lab**: OSPFv3 ve IPv6 trafik filtreleme (ACL) özelliklerini içeren kapsamlı dual-stack senaryosu. |

### v1.9.3 (2026-06-30)
| English | Türkçe |
| --- | --- |
| **PNG Export**: 300 DPI high-resolution export with topology-faithful rendering — full device visuals, cable colors by type, port name labels, auto-sized notes with rounded colored backgrounds. | **PNG Çıktısı**: Topolojiye sadık 300 DPI yüksek çözünürlüklü dışa aktarma — tam cihaz görselleri, kablo türüne göre renkler, port adı etiketleri, otomatik boyutlu yuvarlak renkli notlar. |
| **Cable Break/Fix**: Unplug/PlugZap icons replace scissors/zap for cable state toggle; power status icons on devices. | **Kablo Kes/Onar**: Kablo durumu değiştirme için makas/şimşek yerine Unplug/PlugZap simgeleri; cihazlarda güç durumu simgeleri. |
| **Protocol Status Panel**: OSPF/STP/HSRP/EIGRP status integrated into the "Özet" tab of the refresh network report; standalone floating panel removed. | **Protokol Durum Paneli**: OSPF/STP/HSRP/EIGRP durumu ağ yenileme raporunun "Özet" sekmesine entegre edildi; bağımsız panel kaldırıldı. |
| **Network Status Panel**: Fixed z-index above header, scroll on overflow, non-floating on mobile, safe off-screen repositioning. | **Ağ Durum Paneli**: Header üzerinde sabit z-index, taşma durumunda kaydırma, mobilde olmayan, güvenli ekran dışı konumlandırma. |
| **Drag Fix**: Cable connection points no longer misalign when dragging devices (port positions now use the same calculation as normal render). | **Sürükleme Düzeltmesi**: Cihaz taşırken kablo bağlantı noktaları artık kaymıyor (port pozisyonları normal render ile aynı hesaplamayı kullanır). |
| **UI Cleanup**: Removed floating mobile add-device button; mobile network status panel is non-draggable. | **UI Temizliği**: Mobil cihaz ekle butonu kaldırıldı; mobil ağ durum paneli sürüklenemez. |

| English | Türkçe |
| --- | --- |
| **FTP Services**: FTP client/server configuration, file upload, and file transfer simulation across devices. | **FTP Servisleri**: FTP istemci/sunucu yapılandırması, dosya yükleme ve cihazlar arası dosya aktarım simülasyonu. |
| **NTP Time Sync**: NTP server/client configuration for network-wide time synchronization. | **NTP Zaman Senkronizasyonu**: Ağ genelinde zaman senkronizasyonu için NTP sunucu/istemci yapılandırması. |
| **Mail Services**: Email sending, receiving, and mailbox simulation within the network topology. | **Mail Servisleri**: Ağ topolojisi içinde e-posta gönderme, alma ve posta kutusu simülasyonu. |
| **Firewall Service Integration**: Firewall rules with integrated service selection for traffic filtering. | **Güvenlik Duvarı Servis Entegrasyonu**: Trafik filtreleme için entegre servis seçimli güvenlik duvarı kuralları. |
| **Wireless Dashboard**: Dedicated wireless device home page with SSID and security management. | **Kablosuz Gösterge Paneli**: SSID ve güvenlik yönetimi ile özel kablosuz cihaz ana sayfası. |
| **IoT Panel Tabs**: Tabbed IoT device panel for managing sensors, actuators, and device settings. | **IoT Panel Sekmeleri**: Sensörler, aktüatörler ve cihaz ayarlarını yönetmek için sekmeli IoT cihaz paneli. |
| **Sensor Enhancements**: Motion sensor radius visualization, mouse-adjustable sound sensor range, lamp icon. | **Sensör Geliştirmeleri**: Hareket sensörü yarıçap görselleştirmesi, fare ayarlanabilir ses sensörü menzili, lamba simgesi. |
| **Window Resizable Notes**: Resizable windows with collapsible sections and note-taking capability. | **Pencere Notları**: Daraltılabilir bölümler ve not alma özelliği ile yeniden boyutlandırılabilir pencereler. |
| **API Rate Limiting**: Contact form API rate limiting for improved security and abuse prevention. | **API Hız Sınırlama**: Gelişmiş güvenlik ve kötüye kullanım önleme için iletişim formu API hız sınırlaması. |
| **Browser Window ESC Close**: Web browser window closes with ESC key without affecting PC panel. | **Tarayıcı Penceresi ESC Kapatma**: Web tarayıcı penceresi ESC tuşu ile kapatılır, PC paneli etkilenmez. |
| **Window Snap Removal**: PC, Switch, Router, and Firewall windows no longer snap to screen edges during drag/resize. | **Pencere Snap Kaldırma**: PC, Switch, Router ve Firewall pencereleri sürükleme/yeniden boyutlandırma sırasında ekran kenarlarına snap olmaz. |
| **PC History Cleanup**: New projects and opened projects no longer inherit previous PC cmd/CLI history. | **PC Geçmiş Temizliği**: Yeni projeler ve açılan projeler artık önceki PC cmd/CLI geçmişini almaz. |
| **Achievement System**: Activity tracking for projects, guided lessons, and exams with session duration logging. | **Başarım Sistemi**: Projeler, rehberli dersler ve sınavlar için aktivite takibi ile oturum süresi günlüğü. |
| **Exam Mode**: Teacher exam editor, project-to-exam conversion, mobile-responsive layout, and secure student distribution. | **Sınav Modu**: Öğretmen sınav düzenleyicisi, projeden sınava dönüşüm, mobil uyumlu düzen ve güvenli öğrenci dağıtımı. |
| **Guided Mode & Tutorial Wizard**: Step-by-step guided lessons with points, progress tracking, and hint system. | **Rehberli Mod ve Eğitim Sihirbazı**: Kazanılan puanları, ilerleme takibi ve ipucu sistemi ile adım adım rehberli dersler. |
| **Intelligent CLI Assistant**: Fuzzy-matched command suggestions and device-aware subcommand hints below CLI error messages. | **Akıllı CLI Asistanı**: CLI hata mesajlarının altında bulanık eşleştirmeli komut önerileri ve cihaz bilinçli alt komut ipuçları. |
| **Exam Import Enhancements**: Improved `.json` / `.exam` import with smarter PC IP extraction, connection parsing, and weighted scoring. | **Sınav İçe Aktarma İyileştirmeleri**: Gelişmiş `.json` / `.exam` içe aktarma ile akıllı PC IP çıkarma, bağlantı ayrıştırma ve ağırlıklı puanlama. |
| **PC Services Persistence**: PC service configurations (DHCP, DNS, HTTP) persist across network refreshes. | **PC Servis Kalıcılığı**: PC servis yapılandırmaları (DHCP, DNS, HTTP) ağ yenilemelerinde korunur. |
| **WLC & AP Management**: Wireless LAN Controller with Lightweight AP support, dot11 WLAN config, AP join, auth-mac filtering. | **WLC ve AP Yönetimi**: Hafif AP desteği ile Kablosuz LAN Denetleyicisi, dot11 WLAN yapılandırması, AP katılımı, auth-mac filtreleme. |
| **Serial / WAN Interfaces**: HDLC and PPP encapsulation, clock rate, PAP/CHAP authentication, DCE/DTE detection. | **Seri / WAN Arayüzleri**: HDLC ve PPP kapsülleme, saat hızı, PAP/CHAP kimlik doğrulama, DCE/DTE tespiti. |
| **Advanced Routing**: EIGRP (named/config), BGP (basic), OSPFv3 (IPv6), RIPng (IPv6), route redistribution. | **Gelişmiş Yönlendirme**: EIGRP (adlandırılmış/yapılandırma), BGP (temel), OSPFv3 (IPv6), RIPng (IPv6), rota yeniden dağıtımı. |
| **IoT & Firewall CLI**: Complete CLI command sets for IoT sensor/actuator management and firewall rule/policy configuration. | **IoT ve Güvenlik Duvarı CLI**: IoT sensör/aktüatör yönetimi ve güvenlik duvarı kural/politika yapılandırması için eksiksiz CLI komut setleri. |
| **Help System Overhaul**: 150+ CLI commands documented in bilingual help panel, organized by device context (switch, router, wireless, WLC, IoT, firewall). | **Yardım Sistemi Revizyonu**: Cihaz bağlamına göre düzenlenmiş 150+ CLI komutunun iki dilli yardım panelinde belgelenmesi. |
| **Canvas Drag Smoothness**: Eliminated position jitter during device drag by using fresh DOM rect per frame and disabling SVG transitions during movement. | **Kanvas Sürükleme Pürüzsüzlüğü**: Hareket sırasında kare başına taze DOM rect kullanımı ve SVG geçişlerinin devre dışı bırakılmasıyla cihaz sürüklemede konum titremesi giderildi. |
| **Turkish Training Booklet**: Comprehensive Turkish language training booklet covering networking fundamentals, CLI, routing, WAN, wireless, and security. | **Türkçe Eğitim Kitapçığı**: Ağ temelleri, CLI, yönlendirme, WAN, kablosuz ve güvenlik konularını kapsayan kapsamlı Türkçe eğitim kitapçığı. |
| **Serial Encapsulation**: HDLC and PPP encapsulation mismatch detection during connectivity checks. | **Seri Kapsülleme**: Bağlantı kontrolleri sırasında HDLC ve PPP kapsülleme uyumsuzluğu tespiti. |
| **No Hostname Command**: Reset device hostname to default with `no hostname` command. | **No Hostname Komutu**: `no hostname` komutu ile cihaz hostname'ini varsayılana sıfırlama. |
| **Room Tracking System**: Real-time teacher-student progress monitoring via room codes and Vercel KV persistence. | **Oda Takip Sistemi**: Oda kodları ve Vercel KV kalıcılığı ile gerçek zamanlı öğretmen-öğrenci ilerleme takibi. |
| **ACL Standard & Extended**: Standard and extended access control lists for traffic filtering and security policies. | **ACL Standard ve Extended**: Trafik filtreleme ve güvenlik politikaları için standart ve genişletilmiş erişim kontrol listeleri. |
| **NAT (Static/Dynamic/PAT)**: Network Address Translation — static one-to-one, dynamic pool, and PAT overload. | **NAT (Static/Dynamic/PAT)**: Ağ Adresi Çevirisi — statik birebir, dinamik havuz ve PAT overload. |
| **HSRP Redundancy**: Hot Standby Router Protocol for default gateway redundancy and failover. | **HSRP Yedeklilik**: Varsayılan ağ geçidi yedekliliği ve arıza geçişi için HSRP. |
| **OSPF Multi-Area**: Multi-area OSPF with Area 0, Area 10, Area 20, and stub area configuration. | **OSPF Multi-Area**: Area 0, Area 10, Area 20 ve stub alan yapılandırması ile çok alanlı OSPF. |
| **EIGRP Dynamic Routing**: Enhanced Interior Gateway Routing Protocol with named/config mode. | **EIGRP Dinamik Yönlendirme**: Adlandırılmış/yapılandırma modu ile Gelişmiş İç Ağ Geçidi Yönlendirme Protokolü. |
| **IPv6 Advanced Lab**: IPv6 addressing, DHCPv6 pools, OSPFv3 dynamic routing for next-gen networking. | **IPv6 Gelişmiş Laboratuvar**: IPv6 adresleme, DHCPv6 havuzları, yeni nesil ağlar için OSPFv3 dinamik yönlendirme. |
| **All Services Lab**: Comprehensive lab with DNS, HTTP, DHCP, FTP, MAIL, and NTP services running on PCs. | **Tüm Servisler Laboratuvarı**: PC'lerde çalışan DNS, HTTP, DHCP, FTP, MAIL ve NTP servislerini içeren kapsamlı laboratuvar. |
| **Google Sheets Integration**: Contact form data stored in Google Sheets via Apps Script API. | **Google Sheets Entegrasyonu**: Apps Script API aracılığıyla iletişim formu verilerinin Google Sheets'te saklanması. |
| **Redis / KV Storage**: Upstash Redis for room tracking session persistence and real-time sync. | **Redis / KV Depolama**: Oda takibi oturum kalıcılığı ve gerçek zamanlı senkronizasyon için Upstash Redis. |

---

## Features / Özellikler

### 🌐 Network Core / Ağ Çekirdeği

| English | Türkçe |
| --- | --- |
| **Switching**: VLAN, STP, trunk/access ports, MAC learning, switchport security | **Anahtarlama**: VLAN, STP, trunk/access portları, MAC öğrenmesi, switchport güvenliği |
| **Routing**: Static routes, OSPF (multi-area), RIP, EIGRP, BGP, inter-VLAN routing, L3 switching, default routes, route redistribution | **Yönlendirme**: Statik rotalar, OSPF (çok alanlı), RIP, EIGRP, BGP, VLAN'lar arası yönlendirme, L3 anahtarlama, varsayılan rotalar, rota yeniden dağıtımı |
| **NAT**: Static NAT, Dynamic NAT pool, PAT overload | **NAT**: Statik NAT, Dinamik NAT havuzu, PAT overload |
| **HSRP**: Hot Standby Router Protocol for gateway redundancy | **HSRP**: Ağ geçidi yedekliliği için HSRP |
| **IPv6**: IPv6 addressing, DHCPv6, OSPFv3, RIPng | **IPv6**: IPv6 adresleme, DHCPv6, OSPFv3, RIPng |
| **Wireless**: WLAN configuration, SSID management, wireless security, WLC/AP management, dot11 commands | **Kablosuz**: WLAN yapılandırması, SSID yönetimi, kablosuz güvenlik, WLC/AP yönetimi, dot11 komutları |
| **IoT**: Device management, IoT web panel, sensor/actuator integration, IoT CLI commands | **IoT**: Cihaz yönetimi, IoT web paneli, sensör/aktüatör entegrasyonu, IoT CLI komutları |
| **Firewall / ACL**: Standard & Extended ACLs, firewall rules, traffic filtering, firewall CLI commands | **Güvenlik Duvarı / ACL**: Standard ve Extended ACL'ler, güvenlik duvarı kuralları, trafik filtreleme, güvenlik duvarı CLI komutları |
| **DHCP**: DHCP server & client configuration, address pools, lease management | **DHCP**: DHCP sunucu ve istemci yapılandırması, adres havuzları, kira yönetimi |
| **DNS**: DNS configuration, name resolution | **DNS**: DNS yapılandırması, ad çözümleme |
| **FTP**: FTP server & client, file upload, file transfer simulation | **FTP**: FTP sunucu ve istemci, dosya yükleme, dosya aktarım simülasyonu |
| **NTP**: NTP server & client, time synchronization across devices | **NTP**: NTP sunucu ve istemci, cihazlar arası zaman senkronizasyonu |
| **Mail**: SMTP/IMAP simulation, email send/receive, mailbox management | **Mail**: SMTP/IMAP simülasyonu, e-posta gönderme/alma, posta kutusu yönetimi |
| **ARP**: ARP table management, MAC-to-IP resolution | **ARP**: ARP tablosu yönetimi, MAC-IP çözümleme |
| **Link-Local**: Automatic link-local addressing (169.254.x.x) | **Link-Yerel**: Otomatik link-yerel adresleme (169.254.x.x) |
| **Connectivity Testing**: Ping, traceroute, extended ping | **Bağlantı Testi**: Ping, traceroute, genişletilmiş ping |
| **Serialization**: Export/import network topologies as JSON | **Serileştirme**: Ağ topolojilerini JSON olarak dışa/içe aktarma |
| **Room Tracking**: Teacher-student progress monitoring via room codes | **Oda Takibi**: Oda kodları üzerinden öğretmen-öğrenci ilerleme takibi |

### 🖥️ CLI Engine / CLI Motoru

| English | Türkçe |
| --- | --- |
| **Command Families**: CLI with enable mode, configure terminal, interface config, etc. | **Komut Ailesi**: CLI (enable modu, configure terminal, interface config, vb.) |
| **Context-Aware Help**: Device-aware subcommand suggestions and syntax hints | **Bağlam Duyarlı Yardım**: Cihaz bilinçli alt komut önerileri ve sözdizimi ipuçları |
| **Fuzzy Matching**: Intelligent command matching with typo tolerance | **Bulanık Eşleştirme**: Yazım hatası toleranslı akıllı komut eşleştirme |
| **Pipe Support**: Command output piping and filtering | **Pipe Desteği**: Komut çıktısı yönlendirme ve filtreleme |
| **VLAN Commands**: VLAN creation, assignment, trunk configuration | **VLAN Komutları**: VLAN oluşturma, atama, trunk yapılandırması |
| **Interface Commands**: IP addressing, description, admin state, speed/duplex | **Arayüz Komutları**: IP adresleme, açıklama, yönetsel durum, hız/duplex |
| **Routing Protocol Commands**: OSPF, RIP, EIGRP, BGP, OSPFv3, RIPng configuration | **Yönlendirme Protokolü Komutları**: OSPF, RIP, EIGRP, BGP, OSPFv3, RIPng yapılandırması |
| **Serial / WAN Commands**: HDLC, PPP, clock rate, PAP/CHAP authentication, DCE/DTE detection | **Seri / WAN Komutları**: HDLC, PPP, saat hızı, PAP/CHAP kimlik doğrulama, DCE/DTE tespiti |
| **Show Commands**: Running-config, startup-config, interfaces, VLAN, ARP, routing tables, DHCP leases, NTP status, IoT status, WLAN status | **Show Komutları**: Running-config, startup-config, arayüzler, VLAN, ARP, yönlendirme tabloları, DHCP kiralamaları, NTP durumu, IoT durumu, WLAN durumu |
| **CLI History**: Command history navigation with up/down arrows | **Komut Geçmişi**: Yukarı/aşağı ok tuşları ile komut geçmişi gezintisi |

### 🎮 Modes / Modlar

| English | Türkçe |
| --- | --- |
| **Free Mode**: Sandbox environment — build any topology, configure freely | **Serbest Mod**: Sanal alan ortamı — dilediğiniz topolojiyi kurun, özgürce yapılandırın |
| **Guided Mode**: Step-by-step tutorials with hints, scoring, and progress tracking, including new "Teach Me" beginner-to-advanced tracks | **Rehberli Mod**: İpuçları, puanlama ve ilerleme takibi ile adım adım eğitim; yeni "Bana Öğret" temel-ileri seviye eğitim yolları dahil |
| **Exam Mode**: Teacher exam editor, project-to-exam conversion, automatic scoring, student distribution | **Sınav Modu**: Öğretmen sınav düzenleyicisi, projeden sınava dönüşüm, otomatik puanlama, öğrenci dağıtımı |
| **Exam Import**: Smart `.json` / `.exam` file import with PC IP extraction and connection parsing | **Sınav İçe Aktarma**: PC IP çıkarma ve bağlantı ayrıştırma ile akıllı `.json` / `.exam` dosya içe aktarma |

### 🏆 Activity / Aktiviteler

| English | Türkçe |
| --- | --- |
| **Activity Tracking**: Session duration, completed projects, guided lessons, and exam history | **Aktivite Takibi**: Oturum süresi, tamamlanan projeler, rehberli dersler ve sınav geçmişi |
| **Achievement Panel**: Visual display of tracked activities with timestamps and scores | **Başarım Paneli**: Zaman damgaları ve puanlarla takip edilen aktivitelerin görsel görüntülenmesi |
| **Example Projects**: Pre-built example projects with guides | **Örnek Projeler**: Kılavuzlarla birlikte önceden oluşturulmuş örnek proje |

### 🧩 UI & UX

| English | Türkçe |
| --- | --- |
| **Network Canvas**: Drag & drop topology builder with visual connections | **Ağ Tuvali**: Sürükle-bırak topoloji oluşturucu, görsel bağlantılar |
| **Device Palette**: Router, switch, PC, laptop, server, IoT, wireless device palette | **Cihaz Paleti**: Yönlendirici, anahtar, PC, dizüstü, sunucu, IoT, kablosuz cihaz paleti |
| **CLI Terminal**: Full-featured terminal with syntax highlighting | **CLI Terminali**: Sözdizimi vurgulamalı, tam donanımlı tarzı terminal |
| **Context Panels**: PC Panel, Firewall Panel, IoT Panel, Device Configuration Panel | **Bağlam Panelleri**: PC Paneli, Güvenlik Duvarı Paneli, IoT Paneli, Cihaz Yapılandırma Paneli |
| **Quick Commands**: One-click common command suggestions | **Hızlı Komutlar**: Tek tıklamayla sık kullanılan komut önerileri |
| **Mode Selector**: Easy switching between Free, Guided, and Exam modes | **Mod Seçici**: Serbest, Rehberli ve Sınav modları arasında kolay geçiş |
| **Voice Narration (TTS)**: Built-in text-to-speech for guided instructions | **Sesli Anlatım (TTS)**: Rehberli talimatlar için yerleşik metin okuma desteği |
| **Achievement Panel**: Visual badge gallery with progress tracking | **Başarım Paneli**: İlerleme takibi ile görsel rozet galerisi |
| **Help Panel**: Context-sensitive help system | **Yardım Paneli**: Bağlama duyarlı yardım sistemi |
| **Keyboard Navigation**: Full keyboard shortcuts for all operations | **Klavye Gezintisi**: Tüm işlemler için tam klavye kısayolları |
| **Screen Reader Support**: ARIA labels and accessibility features | **Ekran Okuyucu Desteği**: ARIA etiketleri ve erişilebilirlik özellikleri |
| **High Contrast Mode**: Visual accessibility mode for better readability | **Yüksek Kontrast Modu**: Daha iyi okunabilirlik için görsel erişilebilirlik modu |
| **Responsive Design**: Mobile-friendly layout with adaptive breakpoints | **Duyarlı Tasarım**: Mobil uyumlu düzen, uyarlanabilir kırılım noktaları |
| **Drag & Drop Windows**: Resizable and draggable dialog windows | **Sürükle-Bırak Pencereler**: Yeniden boyutlandırılabilir ve sürüklenebilir diyalog pencereleri |
| **Toast Notifications**: Non-intrusive notification system | **Toast Bildirimleri**: Rahatsız etmeyen bildirim sistemi |
| **Multi-language**: Full Turkish / English interface support | **Çoklu Dil**: Tam Türkçe / İngilizce arayüz desteği |

### 🔧 Technical / Teknik

| English | Türkçe |
| --- | --- |
| **State Management**: Zustand 5.0 with optimized stores | **Durum Yönetimi**: Optimize edilmiş depolar ile Zustand 5.0 |
| **History System**: Undo/redo with canvas history tracking | **Geçmiş Sistemi**: Tuval geçmişi takibi ile geri alma/ileri alma |
| **Project Persistence**: Save/load projects with browser storage | **Proje Kalıcılığı**: Tarayıcı depolama ile proje kaydetme/yükleme |
| **Offline Storage**: Service worker with offline caching | **Çevrimdışı Depolama**: Servis çalışanı ile çevrimdışı önbellekleme |
| **Session Management**: Secure session handling for exam mode | **Oturum Yönetimi**: Sınav modu için güvenli oturum yönetimi |
| **Error Handling**: Comprehensive error handling and user feedback | **Hata Yönetimi**: Kapsamlı hata yönetimi ve kullanıcı geri bildirimi |
| **Performance Monitoring**: Canvas optimization and bundle optimization | **Performans İzleme**: Tuval optimizasyonu ve paket optimizasyonu |
| **Animation System**: Smooth transitions and micro-interactions | **Animasyon Sistemi**: Pürüzsüz geçişler ve mikro etkileşimler |
| **PDF Export**: Generate exam/result PDFs and success certificates using jspdf | **PDF Çıktısı**: jspdf ile sınav sonuçları ve başarı sertifikaları oluşturma |
| **Redis / KV**: Upstash Redis for room tracking session persistence | **Redis / KV**: Oda takibi oturum kalıcılığı için Upstash Redis |
| **Google Sheets API**: Contact form data export to Google Sheets | **Google Sheets API**: İletişim formu verilerinin Google Sheets'e aktarımı |

---