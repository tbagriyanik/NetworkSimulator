# Network Simulator 2026

![Version](https://img.shields.io/badge/version-1.8.0-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%2016.2%20|%20React%2019%20|%20TypeScript%206.0%20|%20Tailwind%204-green)
![FOSS](https://img.shields.io/badge/FOSS-Free%20Open%20Source-brightgreen)
![Total Lines](https://img.shields.io/badge/total--lines-93067-lightgrey)

A browser-based network simulator for learning switching, routing, wireless, IoT, CLI, and exam workflows.

**Live app:** [network2026.vercel.app](https://network2026.vercel.app)

---

## Latest Updates

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
| **Achievement System**: Badge system with trackable milestones, reward notifications, and profile progress tracking. | **Başarım Sistemi**: Takip edilebilir kilometre taşları, ödül bildirimleri ve profil ilerleme takibi ile rozet sistemi. |
| **Exam Mode**: Teacher exam editor, project-to-exam conversion, mobile-responsive layout, and secure student distribution. | **Sınav Modu**: Öğretmen sınav düzenleyicisi, projeden sınava dönüşüm, mobil uyumlu düzen ve güvenli öğrenci dağıtımı. |
| **Guided Mode & Tutorial Wizard**: Step-by-step guided lessons with gamification points, progress tracking, and hint system. | **Rehberli Mod ve Eğitim Sihirbazı**: Oyunlaştırma puanları, ilerleme takibi ve ipucu sistemi ile adım adım rehberli dersler. |
| **Intelligent CLI Assistant**: Fuzzy-matched command suggestions and device-aware subcommand hints below CLI error messages. | **Akıllı CLI Asistanı**: CLI hata mesajlarının altında bulanık eşleştirmeli komut önerileri ve cihaz bilinçli alt komut ipuçları. |
| **Exam Import Enhancements**: Improved `.json` / `.exam` import with smarter PC IP extraction, connection parsing, and weighted scoring. | **Sınav İçe Aktarma İyileştirmeleri**: Gelişmiş `.json` / `.exam` içe aktarma ile akıllı PC IP çıkarma, bağlantı ayrıştırma ve ağırlıklı puanlama. |
| **PC Services Persistence**: PC service configurations (DHCP, DNS, HTTP) persist across network refreshes. | **PC Servis Kalıcılığı**: PC servis yapılandırmaları (DHCP, DNS, HTTP) ağ yenilemelerinde korunur. |
| **WLC & AP Management**: Wireless LAN Controller with Lightweight AP support, dot11 WLAN config, AP join, auth-mac filtering. | **WLC ve AP Yönetimi**: Hafif AP desteği ile Kablosuz LAN Denetleyicisi, dot11 WLAN yapılandırması, AP katılımı, auth-mac filtreleme. |
| **Serial / WAN Interfaces**: HDLC and PPP encapsulation, clock rate, PAP/CHAP authentication, DCE/DTE detection. | **Seri / WAN Arayüzleri**: HDLC ve PPP kapsülleme, saat hızı, PAP/CHAP kimlik doğrulama, DCE/DTE tespiti. |
| **Advanced Routing**: EIGRP (named/config), BGP (basic), OSPFv3 (IPv6), RIPng (IPv6), route redistribution. | **Gelişmiş Yönlendirme**: EIGRP (adlandırılmış/yapılandırma), BGP (temel), OSPFv3 (IPv6), RIPng (IPv6), rota yeniden dağıtımı. |
| **IoT & Firewall CLI**: Complete CLI command sets for IoT sensor/actuator management and firewall rule/policy configuration. | **IoT ve Güvenlik Duvarı CLI**: IoT sensör/aktüatör yönetimi ve güvenlik duvarı kural/politika yapılandırması için eksiksiz CLI komut setleri. |
| **Help System Overhaul**: 150+ CLI commands documented in bilingual help panel, organized by device context (switch, router, wireless, WLC, IoT, firewall). | **Yardım Sistemi Revizyonu**: Cihaz bağlamına göre düzenlenmiş 150+ CLI komutunun iki dilli yardım panelinde belgelenmesi. |
| **Canvas Drag Smoothness**: Eliminated position jitter during device drag by using fresh DOM rect per frame and disabling SVG transitions during movement. | **Kanvas Sürükleme Pürüzsüzlüğü**: Hareket sırasında kare başına taze DOM rect kullanımı ve SVG geçişlerinin devre dışı bırakılmasıyla cihaz sürüklemede konum titremesi giderildi. |

---

## Features / Özellikler

### 🌐 Network Core / Ağ Çekirdeği

| English | Türkçe |
| --- | --- |
| **Switching**: VLAN, STP, trunk/access ports, MAC learning, switchport security | **Anahtarlama**: VLAN, STP, trunk/access portları, MAC öğrenmesi, switchport güvenliği |
| **Routing**: Static routes, OSPF, RIP, EIGRP, inter-VLAN routing, L3 switching, default routes | **Yönlendirme**: Statik rotalar, OSPF, RIP, EIGRP, VLAN'lar arası yönlendirme, L3 anahtarlama, varsayılan rotalar |
| **Wireless**: WLAN configuration, SSID management, wireless security, WLC/AP management, dot11 commands | **Kablosuz**: WLAN yapılandırması, SSID yönetimi, kablosuz güvenlik, WLC/AP yönetimi, dot11 komutları |
| **IoT**: Device management, IoT web panel, sensor/actuator integration, IoT CLI commands | **IoT**: Cihaz yönetimi, IoT web paneli, sensör/aktüatör entegrasyonu, IoT CLI komutları |
| **Firewall / ACL**: Access control lists, firewall rules, traffic filtering, firewall CLI commands | **Güvenlik Duvarı / ACL**: Erişim kontrol listeleri, güvenlik duvarı kuralları, trafik filtreleme, güvenlik duvarı CLI komutları |
| **DHCP**: DHCP server & client configuration, address pools, lease management | **DHCP**: DHCP sunucu ve istemci yapılandırması, adres havuzları, kira yönetimi |
| **DNS**: DNS configuration, name resolution | **DNS**: DNS yapılandırması, ad çözümleme |
| **FTP**: FTP server & client, file upload, file transfer simulation | **FTP**: FTP sunucu ve istemci, dosya yükleme, dosya aktarım simülasyonu |
| **NTP**: NTP server & client, time synchronization across devices | **NTP**: NTP sunucu ve istemci, cihazlar arası zaman senkronizasyonu |
| **Mail**: SMTP/IMAP simulation, email send/receive, mailbox management | **Mail**: SMTP/IMAP simülasyonu, e-posta gönderme/alma, posta kutusu yönetimi |
| **ARP**: ARP table management, MAC-to-IP resolution | **ARP**: ARP tablosu yönetimi, MAC-IP çözümleme |
| **Link-Local**: Automatic link-local addressing (169.254.x.x) | **Link-Yerel**: Otomatik link-yerel adresleme (169.254.x.x) |
| **Connectivity Testing**: Ping, traceroute, extended ping | **Bağlantı Testi**: Ping, traceroute, genişletilmiş ping |
| **Serialization**: Export/import network topologies as JSON | **Serileştirme**: Ağ topolojilerini JSON olarak dışa/içe aktarma |

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
| **Guided Mode**: Step-by-step tutorials with hints, scoring, and progress tracking | **Rehberli Mod**: İpuçları, puanlama ve ilerleme takibi ile adım adım eğitim |
| **Exam Mode**: Teacher exam editor, project-to-exam conversion, automatic scoring, student distribution | **Sınav Modu**: Öğretmen sınav düzenleyicisi, projeden sınava dönüşüm, otomatik puanlama, öğrenci dağıtımı |
| **Exam Import**: Smart `.json` / `.exam` file import with PC IP extraction and connection parsing | **Sınav İçe Aktarma**: PC IP çıkarma ve bağlantı ayrıştırma ile akıllı `.json` / `.exam` dosya içe aktarma |

### 🏆 Gamification / Oyunlaştırma

| English | Türkçe |
| --- | --- |
| **Achievement System**: Unlockable badges for completing tasks and milestones | **Başarım Sistemi**: Görevleri ve kilometre taşlarını tamamlayarak kazanılan rozetler |
| **Progress Tracking**: Visual progress bars and completion stats per achievement | **İlerleme Takibi**: Her başarım için görsel ilerleme çubukları ve tamamlanma istatistikleri |
| **Reward Notifications**: Toast notifications when achievements are unlocked | **Ödül Bildirimleri**: Başarım kazanıldığında toast bildirimleri |
| **Profile Panel**: Achievement profile showing all badges and progress | **Profil Paneli**: Tüm rozetleri ve ilerlemeyi gösteren başarım profili |
| **Gamification Points**: Points earned through tasks, lessons, and challenges | **Oyunlaştırma Puanları**: Görevler, dersler ve zorluklar aracılığıyla kazanılan puanlar |
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

---

## Quick Start

```bash
npm install && npm run dev
```

## Stats / İstatistikler

| Metric / Metrik | Value / Değer |
| --- | ---: |
| Total Lines / Toplam Satır | 117,255 |
| Source Code Lines / Kaynak Kod Satırı | 93,067 |
| Documentation Lines / Dokümantasyon Satırı | 4,525 |
| Other Documentation MD / Diğer Doküman MD | 1,826 |
| Source Files / Kaynak Dosya | 172 |
| Documentation Files / Dokümantasyon Dosya | 13 |
| Example Projects / Örnek Proje | 40 |
| Guided Lessons / Rehberli Ders | 12 |
| Exams / Sınav | 6 |
| CLI Command Families / CLI Komut Ailesi | 200+ |

## Documentation / Dokümantasyon

| Document / Doküman | Description / Açıklama |
| --- | --- |
| [examples.md](examples.md) | Example projects with step-by-step guides / Adım adım örnek projeler |
| [INSTALL.md](INSTALL.md) | Installation & build instructions / Kurulum & derleme talimatları |
| [doc/USAGE.md](doc/USAGE.md) | Usage guide & keyboard shortcuts (TR/EN) / Kullanım kılavuzu & klavye kısayolları |
| [doc/CLI_GUIDED_TUTORIAL.md](doc/CLI_GUIDED_TUTORIAL.md) | 30-lesson CLI guided tutorial (incl. ACL) / 30 dersten oluşan pratik CLI rehberli eğitim (ACL dahil) |
| [doc/CLI_COMMANDS.md](doc/CLI_COMMANDS.md) | CLI commands reference / CLI komut referansı |
| [doc/QUICK_REFERENCE.md](doc/QUICK_REFERENCE.md) | Quick reference & code snippets / Hızlı referans & kod parçacıkları |
| [doc/WIRELESS_CONFIGURATION_GUIDE.md](doc/WIRELESS_CONFIGURATION_GUIDE.md) | Wireless network configuration / Kablosuz ağ yapılandırma |
| [doc/L3_SWITCH_CONFIGURATION.md](doc/L3_SWITCH_CONFIGURATION.md) | Layer 3 switching guide / L3 anahtarlama rehberi |
| [doc/GOOGLE_SHEETS_SETUP.md](doc/GOOGLE_SHEETS_SETUP.md) | Google Sheets integration / Google Sheets entegrasyonu |
| [doc/DOCUMENTATION_INDEX.md](doc/DOCUMENTATION_INDEX.md) | Documentation index & reading map / Dokümantasyon indeksi & okuma haritası |

## Architecture / Mimari

```
src/
├── app/                  # Next.js App Router — pages & layouts
├── components/           # React components
│   ├── ui/              # Reusable UI (cards, dialogs, panels, inputs)
│   └── network/         # Network-specific (Terminal, Topology, PCPanel)
├── hooks/               # Custom React hooks
├── lib/
│   └── network/         # Network simulation engine
│       └── core/        # CLI command implementations
├── store/               # Zustand state management
├── types/               # TypeScript type definitions
├── utils/               # Utilities (achievements, gamification)
├── constants/           # Constants & configuration
├── styles/              # CSS & design tokens
└── contexts/            # React contexts (theme, mode, language)
```

## Tech Stack / Teknoloji

Next.js 16.2, React 19, TypeScript 6.0, Tailwind CSS 4, Radix UI, Zustand 5.0

## License / Lisans

Free and open source. See [LICENSE](LICENSE).

Özgür ve açık kaynak. [LICENSE](LICENSE) dosyasına bakın.
