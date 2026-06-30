# 🌐 Network Simulator 2026 - Kapsamlı Kullanım Kılavuzu ve Eğitim Kitapçığı

![Simulator Logo](https://network2026.vercel.app/og-image.png)

## 📘 İçindekiler
1. [Uygulama Özellikleri ve Yenilikler](#uygulama-ozellikleri-ve-yenilikler)
2. [Kullanım Kılavuzu ve Kısayollar](#kullanim-kilavuzu-ve-kisayollar)
3. [CLI Komut Referansı](#cli-komut-referansi)
4. [30 Derste CLI Eğitimi](#30-derste-cli-egitimi)
5. [Rehberli Uygulama Adımları (148 Adım)](#rehberli-uygulama-adimlari)
6. [40 Örnek Proje ve Adım Adım Yapılışları](#40-ornek-proje-ve-adim-adim-yapilislari)

<div style="page-break-after: always;"></div>

# Network Simulator 2026

![Version](https://img.shields.io/badge/version-1.9.3-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%2016.2%20|%20React%2019%20|%20TypeScript%206.0%20|%20Tailwind%204-green)
![FOSS](https://img.shields.io/badge/FOSS-Free%20Open%20Source-brightgreen)
![Total Lines](https://img.shields.io/badge/total--lines-100,327-lightgrey)

A browser-based network simulator for learning switching, routing, wireless, IoT, CLI, and exam workflows.

**Live app:** [network2026.vercel.app](https://network2026.vercel.app)

---

## Latest Updates

| English | Türkçe |
| --- | --- |
| **FTP Services**: FTP client/server configuration, file upload, and file transfer simulation across devices. | **FTP Servisleri**: FTP istemci/sunucu yapılandırması, dosya yükleme ve cihazlar arası dosya aktarım simülasyonu. |
| **NTP Time Sync**: NTP server/client configuration for network-wide time synchronization. | **NTP Zaman Senkronizasyonu**: Ağ genelinde zaman senkronizasyonu için NTP sunucu/istemci yapılandırması. |
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
| **Activity Tracking**: Session duration, completed projects, guided lessons, and exam history | **Aktivite Takibi**: Oturum süresi, tamamlanan projeler, rehberli dersler ve sınav geçmişi |
| **Achievement Panel**: Visual display of tracked activities with timestamps and scores | **Başarım Paneli**: Zaman damgaları ve puanlarla takip edilen aktivitelerin görsel görüntülenmesi |
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
| Total Lines / Toplam Satır | 100,327 |
| Source Files / Kaynak Dosya | 220 |
| Documentation Files / Dokümantasyon Dosya | 16 |
| Example Projects / Örnek Proje | 40 |
| Guided Lessons / Rehberli Ders | 12 |
| Exams / Sınav | 7 |
| CLI Commands / CLI Komutları | 450+ |

## Documentation / Dokümantasyon

| Document / Doküman | Description / Açıklama |
| --- | --- |
| [details.md](doc/details.md) | Projects details / Proje detayları |
| [examples.md](doc/examples.md) | Example projects with step-by-step guides / Adım adım örnek projeler |
| [INSTALL.md](INSTALL.md) | Installation & build instructions / Kurulum & derleme talimatları |
| [doc/USAGE.md](doc/USAGE.md) | Usage guide & keyboard shortcuts (TR/EN) / Kullanım kılavuzu & klavye kısayolları |
| [doc/CLI_GUIDED_TUTORIAL.md](doc/CLI_GUIDED_TUTORIAL.md) | 30-lesson CLI guided tutorial (incl. ACL, NAT, OSPF, EIGRP) / 30 derslik CLI rehberli eğitim |
| [doc/CLI_COMMANDS.md](doc/CLI_COMMANDS.md) | 450+ CLI commands reference / 450+ CLI komut referansı |
| [doc/QUICK_REFERENCE.md](doc/QUICK_REFERENCE.md) | Quick reference & code snippets / Hızlı referans & kod parçacıkları |
| [doc/WIRELESS_CONFIGURATION_GUIDE.md](doc/WIRELESS_CONFIGURATION_GUIDE.md) | Wireless network configuration / Kablosuz ağ yapılandırma |
| [doc/L3_SWITCH_CONFIGURATION.md](doc/L3_SWITCH_CONFIGURATION.md) | Layer 3 switching guide / L3 anahtarlama rehberi |
| [doc/GOOGLE_SHEETS_SETUP.md](doc/GOOGLE_SHEETS_SETUP.md) | Google Sheets integration / Google Sheets entegrasyonu |
| [doc/ROOM_TRACKING_SETUP.md](doc/ROOM_TRACKING_SETUP.md) | Room tracking system setup / Oda takip sistemi kurulumu |
| [doc/DOCUMENTATION_INDEX.md](doc/DOCUMENTATION_INDEX.md) | Documentation index & reading map / Dokümantasyon indeksi & okuma haritası |
| [doc/SERVICE_FEATURES.md](doc/SERVICE_FEATURES.md) | PC service features (FTP, Mail, NTP, DNS, HTTP, DHCP) / PC servis özellikleri |
| [doc/ERROR_HANDLING_GUIDE.md](doc/ERROR_HANDLING_GUIDE.md) | Error handling guide / Hata kontrol rehberi |
| [doc/INTEGRATION_GUIDE.md](doc/INTEGRATION_GUIDE.md) | Integration guide / Entegrasyon rehberi |

## Architecture / Mimari

```
src/
├── app/                  # Next.js App Router — pages & layouts
│   ├── api/             # API routes (contact, etc.)
│   ├── [id]/            # Dynamic routes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles & design tokens
├── components/           # React components
│   ├── ui/              # Reusable UI (cards, dialogs, panels, inputs)
│   └── network/         # Network-specific (Terminal, Topology, PCPanel)
├── contexts/            # React contexts (theme, mode, language)
├── hooks/               # Custom React hooks
├── lib/
│   ├── design-tokens/  # Design tokens (colors, typography, spacing, animations)
│   ├── store/          # Zustand state management (appStore.ts)
│   ├── network/         # Network simulation engine
│   │   ├── core/        # CLI command implementations
│   │   └── examples/    # Example project JSON files
│   ├── security/        # Security utilities (sanitization, rate limiting)
│   ├── performance/     # Performance optimization (spatial partitioning)
│   └── storage/         # Storage utilities (window position management)
├── utils/               # Utilities (achievement records tracking)
└── tests/               # Test files
```

## Tech Stack / Teknoloji

Next.js 16.2, React 19, TypeScript 6.0, Tailwind CSS 4, Radix UI, Zustand 5.0

## License / Lisans

Free and open source. See [LICENSE](LICENSE).

Özgür ve açık kaynak. [LICENSE](LICENSE) dosyasına bakın.
\n\n<div style="page-break-after: always;"></div>\n\n
# Network Simulator 2026 - Usage Guide / Kullanım Kılavuzu

---

## EN: Canvas & Device Basics / TR: Tuval ve Cihaz Temelleri

| Action / İşlem | How / Nasıl |
|---|---|
| **Add device / Cihaz ekle** | Drag from palette onto canvas / Palettekten tuvale sürükle |
| **Select / Seç** | Left click / Sol tık |
| **Multi-select / Çoklu seç** | Shift + click / Shift + tık |
| **Rectangle select / Kutu seç** | Middle-click + drag / Orta tık + sürükle |
| **Move / Taşı** | Left-click + drag / Sol tık + sürükle |
| **Snap to grid / Izgaraya yapıştır** | Ctrl + drag / Ctrl + sürükle |
| **Delete / Sil** | Select + Delete / Seç + Delete |
| **Pan canvas / Tuval kaydır** | Space + drag / Boşluk + sürükle OR / VEYA right-click + drag / sağ tık + sürükle |
| **Zoom / Yakınlaştır** | Mouse wheel / Fare tekerleği OR / VEYA Ctrl + Scroll |
| **Context menu / Bağlam menüsü** | Right-click device / Cihaza sağ tık |
| **Open device / Cihaz aç** | Double-click device / Cihaza çift tık |

### Cable Types / Kablo Tipleri
| Cable / Kablo | Use / Kullanım |
|---|---|
| **Straight-through / Düz** | PC ↔ Switch, Router ↔ Switch |
| **Crossover / Çapraz** | Switch ↔ Switch, Router ↔ Router, PC ↔ PC, PC ↔ Router |
| **Console** | PC COM → Switch/Router Console port |

---

## EN: Device Interaction / TR: Cihaz Etkileşimi

| Device / Cihaz | Panel / How to open / Nasıl açılır |
|---|---|
| **PC** | Double-click → CMD, Services (DHCP/DNS/HTTP/FTP/Mail/NTP), WiFi, IoT tabs |
| **Switch / Router** | Double-click → CLI terminal (full NOS-style) |
| **L3 Switch** | Same as Switch + `ip routing` for Layer 3 |
| **Firewall** | Dedicated panel with drag-drop rule builder |
| **IoT** | Web-based sensor/actuator management panel |

### CLI Modes / CLI Modları
| Prompt | Mode / Mod | Description / Açıklama |
|---|---|---|
| `Switch>` | User EXEC | Basic monitoring (`show`, `ping`, `enable`) |
| `Switch#` | Privileged EXEC | All commands (`configure terminal`, `debug`, `reload`) |
| `Switch(config)#` | Global Config | System config (`hostname`, `vlan`, `interface`) |
| `Switch(config-if)#` | Interface | Port config (`switchport`, `ip address`, `shutdown`) |
| `Switch(config-line)#` | Line | Console/VTY config (`password`, `login`) |
| `Switch(config-vlan)#` | VLAN | VLAN config (`name`, `state`) |
| `Switch(config-router)#` | Router | RIP/OSPF config (`network`, `router-id`) |
| `Switch(dhcp-config)#` | DHCP Pool | DHCP config (`network`, `default-router`) |
| `Switch(config-ssid)#` | SSID Config | SSID security (`authentication`, `guest-mode`, `mbssid`) |
| `Switch(config-dot11)#` | Dot11 Wireless | Wireless radio (`channel`, `speed`, `station-role`, `power`) |
| `WLC(config-wlan)#` | WLAN Config | WLAN profile (`wlan`, `security`, `shutdown`) |
| `PC>` | CMD | Windows-style commands (`ipconfig`, `ping`, `nslookup`) |

---

## EN: Keyboard Shortcuts / TR: Klavye Kısayolları

### Canvas / Tuval
| Shortcut / Kısayol | EN | TR |
|---|---|---|
| `Ctrl + Z` | Undo | Geri al |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo | Yeniden yap |
| `Ctrl + C` | Copy selected device | Seçili cihazı kopyala |
| `Ctrl + X` | Cut selected device | Seçili cihazı kes |
| `Ctrl + V` | Paste | Yapıştır |
| `Ctrl + A` | Select all | Tümünü seç |
| `Delete` / `Backspace` | Delete selected | Seçili öğeyi sil |
| `Escape` | Cancel selection / Close mode | Seçimi iptal et / Modu kapat |
| `Ctrl + Scroll` | Zoom in / out | Yakınlaştır / Uzaklaştır |
| `Space + Drag` | Pan canvas | Canvas'ı kaydır |
| `Arrow Keys` | Move selected device(s) | Seçili cihaz(lar)ı taşı |
| `Shift + Arrow Keys` | Move selected device(s) faster | Seçili cihaz(lar)ı daha hızlı taşı |
| `F1` | Open / close help panel | Yardım panelini aç / kapat |
| `F5` | Refresh network topology | Ağ topolojisini yenile |
| `Home` | Reset topology view | Topoloji görünümünü sıfırla |
| `End` | Focus last element | Son öğeye odaklan |
| `Page Up` | Scroll canvas up | Canvas'ı yukarı kaydır |
| `Page Down` | Scroll canvas down | Canvas'ı aşağı kaydır |
| `Double-click (Empty Space)` | Reset topology view | Topoloji görünümünü sıfırla |
| `Double-click (Device)` | Open device panel | Cihaz panelini aç |

### Ping Packet Analysis / Ping Paket Analizi
| Shortcut / Kısayol | EN | TR |
|---|---|---|
| `P` | Play / Pause packet analysis | Paket analizi: Oynat / Duraklat |
| `N` | Next hop (when paused) | Sonraki Hop (duraklatıldığında) |

### CLI / CMD
| Shortcut / Kısayol | EN | TR |
|---|---|---|
| `Tab` | Auto-complete command | Komut tamamlama |
| `Arrow Up / Down` | Command history | Komut geçmişi |
| `Enter` | Execute command | Komutu çalıştır |
| `Ctrl + L` | Clear terminal | Terminali temizle |
| `?` | Show available commands | Kullanılabilir komutları göster |
| `Ctrl + C` | Cancel command (CLI) | Komutu iptal et |

---

## EN: PC CMD Commands / TR: PC CMD Komutları

| Command / Komut | EN | TR |
|---|---|---|
| `ipconfig [/all] [/release] [/renew]` | IP configuration | IP yapılandırması |
| `ping <host>` | Test connectivity | Bağlantı testi |
| `tracert <host>` | Trace route | Rota izleme |
| `netstat` | Network statistics | Ağ istatistikleri |
| `nslookup <domain>` | DNS lookup | DNS sorgusu |
| `telnet <host> [port]` | Telnet connection | Telnet bağlantısı |
| `ftp <host>` | FTP connection | FTP bağlantısı |
| `ssh [-l user] <host>` | SSH connection | SSH bağlantısı |
| `curl` / `wget <url>` | View web page | Web sayfası görüntüle |
| `arp -a` | ARP table | ARP tablosu |
| `hostname` | Computer name | Bilgisayar adı |
| `dir` | Directory listing | Dosya listesi |
| `ver` | Version info | Versiyon bilgisi |
| `cls` | Clear screen | Ekranı temizle |
| `help` / `?` | Desktop command help | PC komut yardımı |

---

## EN: Tips / TR: İpuçları

- **F1** anywhere toggles the help panel / Her yerde F1 yardım panelini açar
- **ESC** closes modals and deselects / ESC modal kapatır ve seçimi iptal eder
- **?** in CLI or CMD shows available commands / CLI veya CMD'de `?` komutları gösterir
- **CLI Suggestions** show valid commands when you make a typo / CLI hataları yaptığınızda benzer geçerli komutları önerir
- **Tab** auto-completes commands / `Tab` komutları tamamlar
- **Ctrl + Drag** snaps devices to 16px grid / `Ctrl + Drag` cihazları ızgaraya yapıştırır
- **Double-click** any device to open its panel / Cihaza çift tık paneli açar
- **Space + Drag** pans the canvas when zoomed in / `Boşluk + Sürükle` yakınlaştırınca tuvali kaydırır
- **Arrow Keys** move selected devices on topology / `Ok Tuşları` topolojide seçili cihazları taşır
- **Shift + Arrow Keys** moves selected devices faster / `Shift + Ok Tuşları` daha hızlı taşır
- **P** and **N** control ping packet animation playback / `P` ve `N` ping animasyonunu kontrol eder
- **F5** refreshes the network topology / `F5` topolojiyi yeniler
- Config panel shows live `running-config` / Config paneli canlı `running-config` gösterir
- Windows are auto-positioned and restored on refresh / Pencereler otomatik konumlanır ve yenilemede geri yüklenir
\n\n<div style="page-break-after: always;"></div>\n\n
# 💻 Network CLI Commands Reference

The simulator supports **280+ commands** across multiple configuration modes.


## Keyboard Shortcuts

### General Navigation
| Shortcut | Action |
|----------|--------|
| `Ctrl+A` | Select all devices |
| `Escape` | Cancel current operation / Close modal |
| `Tab` | Auto-complete command in CLI |
| `Arrow Up/Down` | Navigate command history in CLI |
| `Enter` | Execute command / Confirm action |
| `Delete` | Delete selected items |
| `F5` | Refresh network topology |

### Canvas Navigation
| Shortcut | Action |
|----------|--------|
| `Left-click + Drag` | Pan canvas |
| `Middle-click + Drag` | Rectangle selection |
| `Right-click` | Open context menu |
| `Home` | Reset topology view (zoom 1.0, center) |
| `Double-click (Empty Space)` | Reset topology view (zoom 1.0, center) |
| `End` | Focus last element |
| `Page Up` / `Page Down` | Scroll canvas vertically |
| `Mouse Wheel` | Zoom in/out |
| `Ctrl + Drag Device` | Snap device to grid (16px grid) |

### Device Operations
| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Copy configuration |
| `Ctrl+V` | Paste configuration |
| `Ctrl+X` | Cut configuration |
| `Ctrl+S` | Save configuration |
| `Ctrl+L` | Clear terminal |
| `Double-click Device` | Open device configuration panel |

## Command Overview

### System & Session Commands (User/Privileged Mode)
| Command | Description | Mode |
|---------|-------------|------|
| `enable` | Enter privileged EXEC mode | User |
| `disable` | Return to user EXEC mode | Privileged |
| `configure terminal` | Enter global configuration mode | Privileged |
| `exit` | Exit current mode/session | All |
| `end` | Return to privileged mode from any sub-mode | All |
| `help` | Display help system information | All |

### Privileged EXEC Commands
| Command | Description |
|---------|-------------|
| `ping <host> [size] [count]` | Test connectivity to host with ICMP |
| `traceroute <host>` | Trace route to destination |
| `telnet <host> [port]` | Connect to remote device via Telnet |
| `ssh -l <username> <host>` | Connect via SSH (with username) |
| `write memory` | Save running configuration to NVRAM |
| `copy running-config startup-config` | Save configuration |
| `copy running-config flash:[:filename]` | Save configuration to flash |
| `copy running-config tftp:` | Upload config to TFTP server |
| `copy flash:[:filename] startup-config` | Restore configuration from flash |
| `copy flash:[:filename] running-config` | Merge flash config into running config |
| `copy startup-config running-config` | Merge startup config into running config |
| `copy tftp: running-config` | Download and merge config from TFTP |
| `copy tftp: flash:` | Download file from TFTP to flash |
| `erase startup-config` | Erase startup configuration |
| `erase nvram:` | Erase NVRAM filesystem |
| `delete flash:vlan.dat` | Delete VLAN database file |
| `delete nvram:` | Delete NVRAM contents |
| `reload` | Reload the device |
| `clock set <hh:mm:ss> <day> <month> <year>` | Set system clock |
| `more <filename>` | Display contents of a file |
| `setup` | Enter initial setup dialog |
| `test <type>` | Run diagnostics |
| `configure replace <url>` | Replace running config with file |
| `disconnect` | Disconnect network connection |
| `resume <n>` | Resume a suspended session |
| `suspend` | Suspend current Telnet/SSH session (Ctrl+Shift+6 then X) |
| `debug <type>` | Enable debugging (requires argument, e.g., `debug ip packet`) |
| `no debug <type>` | Disable specific debugging |
| `no debug all` | Disable all debugging |
| `undebug all` | Disable all debugging |
| `undebug` | Disable all debugging (alias) |
| `terminal length <n>` | Set terminal page length |
| `terminal width <n>` | Set terminal width |
| `terminal monitor` | Enable terminal monitoring |
| `terminal no monitor` | Disable terminal monitoring |
| `clear arp-cache` | Clear ARP cache |
| `clear mac address-table` | Clear MAC address table |
| `clear counters` | Clear interface counters |
| `clear line <n>` | Clear a terminal line |
| `clear interface <name>` | Clear interface counters |
| `do <command>` | Execute privileged command from config mode |
| `help` | Display help system information |
| `show access-lists` | Display all access lists |

### Global Configuration Commands
| Command | Description |
|---------|-------------|
| `hostname <name>` | Set device hostname |
| `vlan <id>` | Create/enter VLAN configuration |
| `no vlan <id>` | Delete VLAN |
| `name <name>` | Set VLAN name (in vlan mode) |
| `no name` | Remove VLAN name (in vlan mode only) |
| `state <active\|suspend>` | Set VLAN state |
| `interface <name>` | Enter interface configuration |
| `interface range <range>` | Configure interface range |
| `no interface vlan <id>` | Delete VLAN interface |
| `ip routing` | Enable IP routing (L3 switches) |
| `no ip routing` | Disable IP routing |
| `ip default-gateway <ip>` | Set default gateway |
| `no ip default-gateway` | Remove default gateway |
| `ip domain-name <name>` | Set domain name |
| `no ip domain-name` | Remove domain name |
| `ip domain-lookup` | Enable DNS lookup |
| `no ip domain-lookup` | Disable DNS lookup |
| `ip host <name> <ip>` | Add static hostname-to-IP mapping |
| `no ip host <name>` | Remove static host mapping |
| `ip http server` | Enable HTTP server |
| `no ip http server` | Disable HTTP server |
| `ip ssh version {1\|2}` | Set SSH version |
| `ip ssh time-out <seconds>` | Set SSH timeout |
| `no ip ssh time-out` | Remove SSH timeout |
| `ip dhcp snooping` | Enable DHCP snooping |
| `ip dhcp snooping vlan <list>` | Enable DHCP snooping on VLANs |
| `no ip dhcp snooping` | Disable DHCP snooping |
| `ip arp inspection` | Enable ARP inspection |
| `service password-encryption` | Encrypt passwords |
| `no service password-encryption` | Disable password encryption |
| `enable secret <password>` | Set enable secret |
| `no enable secret` | Remove enable secret |
| `enable password <password>` | Set enable password |
| `no enable password` | Remove enable password |
| `banner motd #<message>#` | Set MOTD banner |
| `banner login #<message>#` | Set login banner |
| `banner exec #<message>#` | Set exec banner |
| `no banner motd` | Remove MOTD banner |
| `no banner login` | Remove login banner |
| `no banner exec` | Remove exec banner |
| `vtp mode {server\|client\|transparent}` | Set VTP mode |
| `vtp domain <name>` | Set VTP domain |
| `vtp password <password>` | Set VTP password |
| `spanning-tree mode {pvst\|rapid-pvst\|mst}` | Set STP mode |
| `no spanning-tree` | Disable spanning-tree |
| `spanning-tree vlan <id> priority <val>` | Set VLAN STP priority |
| `spanning-tree vlan <id> root` | Set VLAN STP root |
| `spanning-tree portfast default` | Enable PortFast globally |
| `username <name> [privilege <lvl>] [password\|secret] <pass>` | Create user |
| `no username <name>` | Remove user |
| `cdp run` | Enable CDP globally |
| `no cdp run` | Disable CDP |
| `cdp timer <sec>` | Set CDP update interval |
| `cdp holdtime <sec>` | Set CDP hold time |
| `mls qos` | Enable MLS QoS |
| `no mls qos` | Disable MLS QoS |
| `router rip` | Enable RIP routing |
| `router ospf [<id>]` | Enable OSPF routing |
| `no router rip` | Disable RIP |
| `no router ospf` | Disable OSPF |
| `ip dhcp pool <name>` | Create DHCP pool / enter dhcp-config mode |
| `no ip dhcp pool <name>` | Remove DHCP pool |
| `ip dhcp excluded-address <low> [<high>]` | Exclude addresses from DHCP |
| `no ip dhcp excluded-address <low> [<high>]` | Remove excluded address range |
| `ntp server <ip>` | Configure NTP server |
| `clock timezone <name> <offset>` | Set timezone |
| `ip name-server <ip>` | Configure DNS server |
| `system mtu <size>` | Set system MTU |
| `errdisable recovery` | Configure errdisable recovery (all causes) |
| `errdisable recovery cause <cause>` | Configure errdisable recovery per cause |
| `ipv6 unicast-routing` | Enable IPv6 routing |
| `no ipv6 unicast-routing` | Disable IPv6 routing |
| `ipv6 dhcp pool <name>` | Create IPv6 DHCP pool / enter dhcp-config mode |
| `no ipv6 dhcp pool <name>` | Remove IPv6 DHCP pool |
| `ipv6 router rip <name>` | Enable RIPng routing process |
| `ipv6 router ospf <id>` | Enable OSPFv3 routing process |
| `no ipv6 router rip <name>` | Disable RIPng |
| `no ipv6 router ospf <id>` | Disable OSPFv3 |
| `crypto key generate rsa` | Generate RSA keys for SSH |
| `ip ssh authentication-retries <n>` | Set SSH retry limit |
| `snmp-server community <str> {RO\|RW}` | Set SNMP community |
| `snmp-server contact <text>` | Set SNMP contact |
| `snmp-server location <text>` | Set SNMP location |
| `archive` | Enter archive config mode |
| `alias <mode> <name> <cmd>` | Create command alias |
| `no alias <name>` | Remove command alias |
| `macro name <name>` | Define command macro |
| `sdm prefer <template>` | Set SDM template |
| `ip arp inspection vlan <id>` | Enable DAI on VLAN |
| `default interface <name>` | Reset interface to default configuration |
| `mac access-list extended <name>` | Create named MAC access list |
| `class-map [match-all\|match-any] <name>` | Create QoS class map |
| `policy-map <name>` | Create QoS policy map |
| `template <name>` | Enter template configuration mode |
| `access-list <id> <action> <condition>` | Create numbered ACL (1-99 standard, 100-199 extended) |
| `ip access-list {standard|extended} <name>` | Create named ACL |
| `no access-list <id>` | Remove numbered ACL |
| `ip nat inside source {static <local> <global> | list <acl> {pool <name> | interface <intf>} [overload]}` | Configure NAT |
| `ip nat pool <name> <start> <end> {netmask <mask} | prefix-length <len>}` | Define NAT pool |
| `no ip nat ...` | Remove NAT configuration |
| `ip route <network> <mask> <next-hop>` | Add static IPv4 route |
| `no ip route <network> <mask> [next-hop]` | Remove static IPv4 route (next-hop optional if single route) |
| `ipv6 route <prefix>/<len> <next-hop>` | Add static IPv6 route |
| `no ipv6 route <prefix>/<len> [next-hop]` | Remove static IPv6 route |

### Interface Configuration Commands
| Command | Description |
|---------|-------------|
| `shutdown` | Administratively disable interface |
| `no shutdown` | Enable interface |
| `speed {10\|100\|1000\|auto}` | Set interface speed |
| `duplex {half\|full\|auto}` | Set duplex mode |
| `description <text>` | Set interface description |
| `no description` | Clear description |
| `switchport mode access` | Set access mode |
| `switchport mode trunk` | Set trunk mode |
| `switchport mode dynamic auto` | Set DTP dynamic auto mode |
| `switchport mode dynamic desirable` | Set DTP dynamic desirable mode |
| `switchport mode dot1q-tunnel` | Set dot1q tunnel mode |
| `no switchport mode` | Reset switchport mode |
| `switchport access vlan <id>` | Assign VLAN |
| `no switchport access vlan` | Remove VLAN assignment |
| `switchport trunk native vlan <id>` | Set native VLAN |
| `switchport trunk allowed vlan <list>` | Set allowed VLANs |
| `switchport nonegotiate` | Disable DTP |
| `switchport voice vlan <id>` | Set voice VLAN |
| `switchport port-security` | Enable port security |
| `switchport port-security maximum <n>` | Set max MAC addresses |
| `switchport port-security violation {protect\|restrict\|shutdown}` | Set violation action |
| `switchport port-security mac-address sticky` | Enable sticky MAC |
| `no switchport port-security` | Disable port security |
| `no switchport` | Convert to routed port (L3) |
| `spanning-tree portfast` | Enable PortFast |
| `spanning-tree bpduguard enable` | Enable BPDU Guard |
| `spanning-tree bpduguard disable` | Disable BPDU Guard |
| `spanning-tree cost <cost>` | Set STP cost |
| `spanning-tree priority <prio>` | Set STP priority |
| `no spanning-tree` | Disable spanning-tree on interface |
| `ip address <ip> <mask>` | Assign IP address with subnet mask |
| `no ip address` | Remove IP address |
| `ip nat {inside | outside}` | Set interface NAT side |
| `no ip nat {inside | outside}` | Remove NAT side |
| `standby <group> ip <virtual-ip>` | Configure HSRP virtual IP |
| `standby <group> priority <prio>` | Set HSRP priority |
| `standby <group> preempt` | Enable HSRP preemption |
| `no standby <group> ...` | Remove HSRP configuration |
| `ip default-gateway <ip>` | Set default gateway (interface) |
| `no ip default-gateway` | Remove default gateway (interface) |
| `ip helper-address <ip>` | Set DHCP relay |
| `no ip helper-address` | Remove DHCP relay |
| `cdp enable` | Enable CDP on interface |
| `no cdp enable` | Disable CDP on interface |
| `channel-group <n> mode {on\|active\|passive}` | Configure EtherChannel |
| `no channel-group` | Remove from channel |
| `debug` / `no debug` | Interface debugging |
| `monitor session <n>` | Configure SPAN/RSPAN |
| `no monitor session` | Remove monitoring |
| `no udld` | Disable UDLD on interface |
| `no ip proxy-arp` | Disable proxy ARP |
| `ip proxy-arp` | Enable proxy ARP |
| `ip directed-broadcast` | Enable directed broadcast forwarding |
| `no ip directed-broadcast` | Disable directed broadcast |
| `keepalive` | Enable keepalive |
| `no keepalive` | Disable keepalive |
| `mtu <size>` | Set interface MTU |
| `channel-protocol {lacp\|pagp}` | Set EtherChannel protocol |
| `priority-queue out` | Enable priority queue on interface |
| `queue-set <n>` | Apply QoS queue set |
| `tx-queue <n>` | Configure transmit queue |
| `power inline consumption <watt>` | Set PoE power limit |
| `encapsulation dot1q <vlan>` | Set 802.1Q encapsulation on subinterface |
| `standby <group> ipv6 <ip>` | Configure HSRP for IPv6 |
| `ip arp inspection limit <pps>` | Set ARP inspection rate limit |
| `ipv6 address <ip>/<prefix>` | Assign IPv6 address |
| `ipv6 rip <name> enable` | Enable RIPng on interface |
| `ipv6 ospf <id> area <area>` | Enable OSPFv3 on interface |
| `ipv6 dhcp server <pool-name>` | Enable IPv6 DHCP server on interface |
| `ip verify source` | Enable IP Source Guard |
| `ip dhcp snooping trust` | Set interface as trusted for DHCP |
| `ip arp inspection trust` | Set interface as trusted for DAI |
| `storm-control {broadcast\|multicast\|unicast} level <%>` | Set storm control |
| `power inline {auto\|static\|never}` | Configure PoE |
| `bandwidth <kbps>` | Set interface bandwidth |
| `delay <tens-of-ms>` | Set interface delay |
| `carrier-delay <ms>` | Set carrier delay |
| `load-interval <sec>` | Set load statistics interval |
| `mls qos trust {cos\|dscp}` | Set QoS trust state |
| `mls qos cos <val>` | Set default CoS value |
| `ip access-group <id> {in|out}` | Apply IPv4 ACL to interface |

### Wireless (WiFi) Commands
> **Note**: These commands are only valid on Wireless LAN Controllers (WLC) or autonomous Access Points (AP). They are NOT supported on switches.

| Command | Description | Device Type |
|---------|-------------|-------------|
| `dot11 ssid <name>` | Create/enter dot11 SSID config | WLC/AP |
| `wlan <name> <id> <ssid>` | Create WLAN profile | WLC only |
| `wlan shutdown` | Disable WLAN | WLC only |
| `no wlan shutdown` | Enable WLAN (undo shutdown) | WLC only |
| `ap name <name>` | Configure AP name | WLC only |
| `ap auth-mac <mac>` | Add MAC auth filter for AP join | WLC only |
| `ap rf-channel <num>` | Set AP RF channel | WLC only |
| `ap dot11 5-ghz <cmd>` | Configure 5 GHz radio on AP | WLC only |
| `authentication open` | Set open authentication (in ssid-config) | WLC/AP |
| `authentication shared` | Set shared key auth (in ssid-config) | WLC/AP |
| `authentication key-management wpa version <2\|3>` | Set WPA key management (in ssid-config) | WLC/AP |
| `mbssid` | Enable MBSSID (in ssid-config) | WLC/AP |
| `no mbssid` | Disable MBSSID (in ssid-config) | WLC/AP |
| `guest-mode` | Enable guest mode (in ssid-config) | WLC/AP |
| `no guest-mode` | Disable guest mode (in ssid-config) | WLC/AP |
| `ssid <name>` | Set SSID name (in dot11-config) | WLC/AP |
| `no ssid` | Remove SSID (in dot11-config) | WLC/AP |
| `station-role root` | Set AP to root mode | WLC/AP |
| `channel <num>` | Set RF channel (in dot11-config) | WLC/AP |
| `no channel` | Reset to auto channel selection | WLC/AP |
| `speed <rate>` | Set basic data rate (in dot11-config) | WLC/AP |
| `power local <val>` | Set local power level (in dot11-config) | WLC/AP |
| `power client <val>` | Set client power level (in dot11-config) | WLC/AP |
| `world-mode dot11d {1\|-1}` | Enable 802.11d world mode (in dot11-config) | WLC/AP |
| `security wpa psk set-key ascii 0 <password>` | Set WPA PSK key (dot11-config) | WLC/AP |
| `no security wpa psk` | Remove WPA PSK key | WLC/AP |
| `encryption mode ciphers {tkip\|aes\|tkip aes}` | Set encryption cipher (dot11-config) | WLC/AP |
| `mac-filter` | Enable MAC filter (dot11-config) | WLC/AP |
| `interface dot11radio <n>` | Enter dot11 radio interface config | WLC/AP |
| `show wlan summary` | Display WLAN summary | WLC only |
| `show ap summary` | Display AP summary | WLC only |

### Line Configuration Commands
| Command | Description |
|---------|-------------|
| `line console <n>` | Enter console line config |
| `line aux <n>` | Enter auxiliary line config |
| `line vty <start> <end>` | Enter VTY line config |
| `password <password>` | Set line password |
| `no password` | Remove line password |
| `login` | Enable password checking |
| `no login` | Disable password checking |
| `transport input {ssh\|telnet\|all\|none}` | Set allowed protocols |
| `no transport input` | Reset transport input |
| `logging synchronous` | Enable sync logging |
| `no logging synchronous` | Disable sync logging |
| `exec-timeout <min> [sec]` | Set exec timeout |
| `no exec-timeout` | Reset exec timeout |
| `history size <n>` | Set history buffer size |
| `no history` | Disable command history |
| `exec` / `no exec` | Enable/disable EXEC |
| `autocommand <cmd>` | Set auto-command |
| `no autocommand` | Remove auto-command |
| `privilege level <0-15>` | Set privilege level |
| `transport output {ssh\|telnet\|all\|none}` | Set outbound protocols |
| `transport preferred {ssh\|telnet\|none}` | Set preferred protocol |
| `session-limit <n>` | Set max sessions |
| `access-class <n> {in\|out}` | Apply ACL to line |
| `lockable` | Enable line locking |

### Serial / WAN Interface Commands
> **Note**: These commands are valid on serial interfaces (e.g., `Serial0/0/0`, `Serial0/1/0`). DCE/DTE detection is automatic based on the cable connection.

| Command | Description |
|---------|-------------|
| `encapsulation hdlc` | Set HDLC encapsulation (default) |
| `encapsulation ppp` | Set PPP encapsulation |
| `no encapsulation` | Reset to default encapsulation |
| `clock rate <bps>` | Set clock rate on DCE interface |
| `no clock rate` | Remove clock rate setting |
| `ppp authentication {chap\|pap}` | Enable PPP authentication |
| `no ppp authentication` | Disable PPP authentication |
| `ppp pap sent-username <name> password <pass>` | Set PAP credentials |
| `bandwidth <kbps>` | Set serial bandwidth |

### Router Configuration Commands (RIP/OSPF)
| Command | Description |
|---------|-------------|
| `network <ip> [wildcard] area <id>` | Add network to OSPF area |
| `no network <ip> [wildcard] area <id>` | Remove network from OSPF |
| `network <ip>` | Add RIP network |
| `no network <ip>` | Remove RIP network |
| `router-id <ip>` | Set router ID |
| `no router-id` | Reset router ID to default |
| `passive-interface <intf>` | Set passive interface |
| `no passive-interface <intf>` | Enable routing updates on interface |
| `default-information {originate\|always}` | Control default route |
| `area <id> range <ip> <mask>` | Summarize routes at area boundary |
| `area <id> stub` | Configure area as stub |
| `area <id> nssa` | Configure area as NSSA |
| `neighbor <ip> remote-as <asn>` | Configure BGP neighbor |
| `no neighbor <ip> [remote-as]` | Remove BGP neighbor |

### Router Configuration Commands (EIGRP)
| Command | Description |
|---------|-------------|
| `router eigrp <as>` | Enable EIGRP routing process |
| `no router eigrp <as>` | Disable EIGRP routing process |
| `network <ip> [wildcard]` | Advertise network via EIGRP |
| `no network <ip> [wildcard]` | Remove EIGRP network |
| `eigrp router-id <ip>` | Set EIGRP router ID |
| `no eigrp router-id` | Reset EIGRP router ID |
| `passive-interface <intf>` | Suppress routing updates |
| `no passive-interface <intf>` | Enable routing updates |

### Router Configuration Commands (BGP)
| Command | Description |
|---------|-------------|
| `router bgp <as>` | Enable BGP routing process |
| `no router bgp <as>` | Disable BGP routing process |
| `bgp router-id <ip>` | Set BGP router ID |
| `network <ip> mask <mask>` | Advertise network via BGP |
| `no network <ip> mask <mask>` | Remove BGP network |
| `neighbor <ip> remote-as <asn>` | Configure BGP neighbor |
| `no neighbor <ip>` | Remove BGP neighbor |

### IPv6 Routing (RIPng / OSPFv3)
> **Note**: Unlike IPv4, RIPng and OSPFv3 do not use `network` statements under router config mode. Routing protocol participation is enabled directly on interfaces via `ipv6 rip <name> enable` and `ipv6 ospf <id> area <area>` (see Interface Commands).

| Command | Description |
|---------|-------------|
| `ipv6 router rip <name>` | Enter RIPng config mode (optional; for router-specific settings) |
| `ipv6 router ospf <id>` | Enter OSPFv3 config mode (optional; for router-specific settings) |
| `no ipv6 router rip <name>` | Disable RIPng |
| `no ipv6 router ospf <id>` | Disable OSPFv3 |

### IPv6 DHCP Pool Configuration Commands (`ipv6-dhcp-config` mode)
| Command | Description |
|---------|-------------|
| `address prefix <prefix>` | Set IPv6 address prefix for clients |
| `no address prefix <prefix>` | Remove address prefix |
| `dns-server <ipv6>` | Set DNS server for clients |
| `domain-name <name>` | Set domain name for clients |

### Firewall Configuration Commands
> **Note**: These commands are valid on **ASA / Firewall devices only**. They are not available on IOS routers or switches.

| Command | Description |
|---------|-------------|
| `security-level <0-100>` | Set interface security level |
| `nameif <name>` | Set interface name |
| `no nameif` | Remove interface name |
| `same-security-traffic permit inter-interface` | Permit traffic between same-security interfaces |
| `no same-security-traffic permit inter-interface` | Deny same-security traffic |

### DHCP Pool Configuration Commands (`dhcp-config` mode)
| Command | Description |
|---------|-------------|
| `network <address> <mask>` | Set pool network and subnet mask |
| `default-router <ip>` | Set default gateway for clients |
| `no default-router` | Remove default gateway |
| `dns-server <ip>` | Set DNS server for clients |
| `no dns-server` | Remove DNS server |
| `lease <days> [hours] [minutes]` | Set lease duration (or `infinite`) |
| `domain-name <name>` | Set domain name for clients |
| `no domain-name` | Remove domain name |

### Show Commands
| Command | Description |
|---------|-------------|
| `show` | Requires additional keywords (use `show ?`) |
| `show running-config` | Display running configuration |
| `show running-config interface <name>` | Display running config for specific interface |
| `show startup-config` | Display startup configuration |
| `show version` | Display version information |
| `show interfaces` | Display all interfaces |
| `show interfaces trunk` | Display trunk interface information |
| `show interface <name>` | Display specific interface |
| `show ip interface brief` | Display IP interface summary (single-line IP and status overview) |
| `show ip interface` | Display detailed IP interface information (MTU, ACL, NAT, BGP rules, and other L3 features) |
| `show ip protocols` | Display routing protocol configuration |
| `show ip ssh` | Display SSH configuration and status |
| `show ip source binding` | Display IP source guard bindings |
| `show ip verify source` | Display IP source guard verification |
| `show vlan [brief]` | Display VLAN information |
| `show mac address-table` | Display MAC address table |
| `show mac address-table static` | Display static MAC address entries |
| `show cdp neighbors` | Display CDP neighbors |
| `show ip route` | Display IPv4 routing table |
| `show ipv6 route` | Display IPv6 routing table |
| `show ipv6 interface brief` | Display IPv6 interface summary |
| `show clock` | Display system clock |
| `show flash` | Display flash contents |
| `show boot` | Display boot information |
| `show spanning-tree` | Display STP information |
| `show spanning-tree interface <name>` | Display STP information for specific interface |
| `show port-security` | Display port security status |
| `show wireless` | Display wireless status | WLC only |
| `show ssh` | Display SSH status |
| `show hosts` | Display static hostname-to-IP mappings |
| `show sessions` | Display active sessions |
| `show controllers` | Display interface controller status |
| `show redundancy` | Display redundancy/HSRP status |
| `show banner motd` | Display MOTD banner |
| `show class-map` | Display QoS class maps |
| `show policy-map` | Display QoS policy maps |
| `show ipv6 dhcp pool` | Display IPv6 DHCP pools |
| `show ip ospf neighbor` | Display OSPF neighbors |
| `show ip ospf interface` | Display OSPF interface status |
| `show debugging` | Display debugging status |
| `do show <command>` | Execute show command from config mode |
| `show ip dhcp snooping` | Display DHCP snooping |
| `show ip dhcp pool` | Display DHCP pool configuration |
| `show ip dhcp binding` | Display DHCP bindings |
| `show interfaces status` | Display interface status |
| `show cdp` | Display CDP information |
| `show vtp status` | Display VTP status |
| `show vtp password` | Display VTP password |
| `show etherchannel` | Display EtherChannel |
| `show arp` / `show ip arp` | Display ARP table |
| `show mls qos` | Display QoS status |
| `show ip arp inspection` | Display ARP inspection |
| `show access-lists` | Display access lists |
| `show mac access-lists` | Display MAC access lists |
| `show history` | Display command history |
| `show users` | Display logged in users |
| `show environment` | Display hardware status |
| `show inventory` | Display hardware inventory |
| `show errdisable recovery` | Display errdisable status |
| `show errdisable detect` | Display errdisable detection |
| `show storm-control` | Display storm control |
| `show udld` | Display UDLD status |
| `show monitor` | Display SPAN sessions |
| `show processes` | Display CPU processes |
| `show memory` | Display memory usage |
| `show sdm prefer` | Display SDM template |
| `show system mtu` | Display MTU settings |
| `show ntp status` | Display NTP status |
| `show ntp associations` | Display NTP associations |
| `show snmp` | Display SNMP info |
| `show archive` | Display archive status |
| `show alias` | Display command aliases |
| `show diagnostic` | Display diagnostic results |
| `show lldp` | Display LLDP neighbors |
| `show authentication` | Display auth sessions |
| `show ip nat translations` | Display active NAT translations |
| `show ip nat statistics` | Display NAT statistics |
| `show ip ospf` | Display OSPF information and ABR status |
| `show standby [brief]` | Display HSRP status |

## Command Modes
- **User Mode** (`>`) - Basic monitoring commands
- **Privileged Mode** (`#`) - All show/debug commands
- **Config Mode** `(config)#` - Global configuration
- **Interface Mode** `(config-if)#` - Interface configuration (Ethernet, Serial, VLAN)
- **Line Mode** `(config-line)#` - Line configuration (console, VTY)
- **VLAN Mode** `(config-vlan)#` - VLAN configuration
- **Router Config Mode** `(config-router)#` - Routing protocol config (OSPF, RIP, EIGRP, BGP)
- **DHCP Pool Mode** `(dhcp-config)#` - DHCP pool configuration
- **SSID Config Mode** `(config-ssid)#` - SSID security parameters (authentication, guest-mode, mbssid)
- **Dot11 Config Mode** `(config-dot11)#` - Wireless radio/dot11 interface configuration (channel, speed, power, station-role)

## Features
- **Tab Completion**: Auto-complete commands with TAB
- **Command History**: Up/Arrow keys for previous commands
- **Context Help**: Use `?` for command help
- **Error Checking**: Detailed error messages for invalid commands
\n\n<div style="page-break-after: always;"></div>\n\n
# 🎓 Network Simulator - Rehberli Dersler

## CLI Komutları Rehberli Ders Serisi

Bu rehber, Network Simulator'daki tüm CLI komutlarını pratik örneklerle öğrenmenizi sağlar. Her bölüm belirli bir cihaz türü ve komut grubu için tasarlanmıştır.

---

## 📋 İçindekiler

### Rehberli Dersler Serisi
1. [Temel Modu Komutları](#temel-modu-komutları)
2. [Ayrıcalıklı Modu Komutları](#ayrıcalıklı-modu-komutları)
3. [Global Konfigürasyon Komutları](#global-konfigürasyon-komutları)
4. [Arayüz Konfigürasyonu](#arayüz-konfigürasyonu)
5. [VLAN Yönetimi](#vlan-yönetimi)
6. [Yönlendirme Protokolleri](#yönlendirme-protokolleri)
7. [Güvenlik Komutları](#güvenlik-komutları)
8. [Kablosuz (WiFi) Komutları](#kablosuz-wifi-komutları)
9. [Hata Ayıklama ve İzleme](#hata-ayıklama-ve-izleme)
10. [İleri Konular](#ileri-konular)

### Ek Bölümler
- [Örnek Projeler (40 Proje)](#örnek-projeler)
- [Pratik Senaryolar](#pratik-senaryolar)
- [Hızlı Referans Tablosu](#hızlı-referans-tablosu)
- [Sorun Giderme İpuçları](#sorun-giderme-ipuçları)

---

## 🎓 Rehberli Dersler Hakkında

Bu ders serisi, Network Simulator'da CLI komutlarını öğrenmek için tasarlanmıştır:

- **30 Pratik Ders:** Başlangıçtan ileri seviyeye
- **4 Zorluk Seviyesi:** ⭐ Başlangıç → ⭐⭐⭐⭐ Çok İleri
- **5 Cihaz Türü:** Switch, Router, WLC, AP, IoT
- **150+ Komut Örneği:** Gerçek dünya senaryoları
- **40 Örnek Proje:** Farklı senaryolar için hazır ağ topolojileri
- **Adım Adım Talimatlar:** Her ders için detaylı açıklamalar
- **Beklenen Sonuçlar:** Her adımdan sonra ne olması gerektiği

### Ders Formatı

Her ders aşağıdaki yapıya sahiptir:

```
📌 Ders N: Başlık

**Cihaz Türü:** Hangi cihazda test edileceği
**Zorluk Seviyesi:** ⭐ Başlangıç → ⭐⭐⭐⭐ Çok İleri

#### Ön Koşullar (varsa)
- Gerekli hazırlıklar

#### Adım 1: Başlık
```
Komut
```
**Beklenen Sonuç:** Ne olması gerektiği

#### 📝 Notlar
- Önemli bilgiler
- İpuçları
```

---

## Temel Modu Komutları

### 📌 Ders 1: Modu Değiştirme ve Yardım Sistemi

**Cihaz Türü:** Herhangi bir cihaz (Switch, Router, WLC)
**Zorluk Seviyesi:** ⭐ Başlangıç

#### Adım 1: Cihazı Seçin ve Terminal Açın
- Herhangi bir cihaza çift tıklayın
- Terminal paneli açılacak
- Komut satırında `>` işareti görürsünüz (Kullanıcı Modu)

#### Adım 2: Yardım Sistemini Keşfedin
```
> help
```
**Beklenen Sonuç:** Tüm mevcut komutların listesi görüntülenir

#### Adım 3: Belirli Komut Hakkında Yardım Alın
```
> ?
```
**Beklenen Sonuç:** Mevcut komutlar listelenir

#### Adım 4: Ayrıcalıklı Moda Geçin
```
> enable
```
**Beklenen Sonuç:** Komut satırı `#` ile değişir (Ayrıcalıklı Mod)

#### Adım 5: Kullanıcı Moduna Dönün
```
# disable
```
**Beklenen Sonuç:** Komut satırı tekrar `>` olur

#### 📝 Notlar
- `enable` komutu ayrıcalıklı moda geçiş sağlar
- `disable` komutu kullanıcı moduna geri döner
- `help` komutu her zaman kullanılabilir
- `?` karakteri komut tamamlama için kullanılır

---

## Ayrıcalıklı Modu Komutları

### 📌 Ders 2: Bağlantı Testi ve Ağ Tanılaması

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Ön Koşullar
- En az 2 cihaz ağa bağlı olmalı
- Cihazlara IP adresleri atanmış olmalı

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Ping Komutu ile Bağlantı Testi
```
# ping 192.168.1.2
```
**Beklenen Sonuç:**
```
ICMP echo reply received from 192.168.1.2
```

#### Adım 3: Farklı Paket Boyutu ile Ping
```
# ping 192.168.1.2 size 1500
```
**Beklenen Sonuç:** Daha büyük paketler gönderilir

#### Adım 4: Belirli Sayıda Ping Gönder
```
# ping 192.168.1.2 count 5
```
**Beklenen Sonuç:** Tam olarak 5 ICMP paketi gönderilir

#### Adım 5: Rota İzleme (Traceroute)
```
# traceroute 192.168.1.2
```
**Beklenen Sonuç:** Hedef cihaza giden yol adım adım gösterilir

#### 📝 Notlar
- `ping` komutu bağlantı testinde kullanılır
- `traceroute` komutu ağ yolunu gösterir
- Paket boyutu ve sayısı özelleştirilebilir
- Hedef cihaza ulaşılamıyorsa "Timeout" mesajı görülür

---

### 📌 Ders 3: Konfigürasyon Yönetimi

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Çalışan Konfigürasyonu Görüntüle
```
# show running-config
```
**Beklenen Sonuç:** Cihazın tüm aktif konfigürasyonu görüntülenir

#### Adım 2: Başlangıç Konfigürasyonunu Görüntüle
```
# show startup-config
```
**Beklenen Sonuç:** Cihaz başladığında yüklenen konfigürasyon gösterilir

#### Adım 3: Cihaz Sürümünü Kontrol Et
```
# show version
```
**Beklenen Sonuç:** Cihaz modeli, NOS sürümü ve diğer bilgiler görüntülenir

#### Adım 4: Konfigürasyonu Kaydet
```
# write memory
```
**Beklenen Sonuç:** Çalışan konfigürasyon NVRAM'a kaydedilir

#### Adım 5: Alternatif Kaydetme Yöntemi
```
# copy running-config startup-config
```
**Beklenen Sonuç:** Aynı sonuç, farklı komut

#### 📝 Notlar
- `show running-config` aktif konfigürasyonu gösterir
- `show startup-config` başlangıç konfigürasyonunu gösterir
- `write memory` değişiklikleri kalıcı hale getirir
- Kaydetmeden cihazı yeniden başlatırsanız değişiklikler kaybolur

---

## Global Konfigürasyon Komutları

### 📌 Ders 4: Cihaz Temel Ayarları

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```
**Beklenen Sonuç:** Komut satırı `(config)#` olur

#### Adım 2: Cihaz Adını Ayarla
```
(config)# hostname SW-MAIN
```
**Beklenen Sonuç:** Komut satırı `SW-MAIN(config)#` olur

#### Adım 3: Motd (Message of the Day) Başlığı Ayarla
```
(config)# banner motd #Yetkisiz Erişim Yasaktır!#
```
**Beklenen Sonuç:** Başlık kaydedilir

#### Adım 4: Etkinleştirme Şifresi Ayarla
```
(config)# enable secret MySecurePassword123
```
**Beklenen Sonuç:** Ayrıcalıklı moda giriş için şifre gerekli olur

#### Adım 5: Varsayılan Ağ Geçidini Ayarla
```
(config)# ip default-gateway 192.168.1.1
```
**Beklenen Sonuç:** Cihazın varsayılan ağ geçidi ayarlanır

#### Adım 6: Konfigürasyon Modundan Çık
```
(config)# exit
```
**Beklenen Sonuç:** Komut satırı `#` olur

#### 📝 Notlar
- `configure terminal` konfigürasyon moduna giriş sağlar
- `hostname` cihazın adını değiştirir
- `banner` başlangıç mesajı gösterir
- `enable secret` ayrıcalıklı moda giriş şifresi belirler
- `exit` komut satırından çıkış sağlar

---

### 📌 Ders 5: DNS ve Zaman Ayarları

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: DNS Sunucusu Ayarla
```
(config)# ip name-server 8.8.8.8
```
**Beklenen Sonuç:** DNS sunucusu kaydedilir

#### Adım 3: Alan Adı Ayarla
```
(config)# ip domain-name example.com
```
**Beklenen Sonuç:** Alan adı konfigürasyona eklenir

#### Adım 4: Saat Dilimini Ayarla
```
(config)# clock timezone EST -5
```
**Beklenen Sonuç:** Saat dilimi EST olarak ayarlanır

#### Adım 5: NTP Sunucusu Ekle
```
(config)# ntp server 192.168.1.100
```
**Beklenen Sonuç:** NTP sunucusu kaydedilir

#### Adım 6: Saati Kontrol Et
```
(config)# exit
# show clock
```
**Beklenen Sonuç:** Cihazın güncel saati gösterilir

#### 📝 Notlar
- `ip name-server` DNS sunucusu belirler
- `ip domain-name` varsayılan alan adını ayarlar
- `clock timezone` saat dilimini ayarlar
- `ntp server` zaman senkronizasyonu sağlar
- `show clock` güncel saati gösterir

---

## Arayüz Konfigürasyonu

### 📌 Ders 6: Temel Arayüz Ayarları

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüze Girin
```
(config)# interface FastEthernet0/1
```
**Beklenen Sonuç:** Komut satırı `(config-if)#` olur

#### Adım 3: Arayüzü Açıkla
```
(config-if)# description Bağlantı-Sunucu-1
```
**Beklenen Sonuç:** Arayüz açıklaması kaydedilir

#### Adım 4: Arayüzü Etkinleştir
```
(config-if)# no shutdown
```
**Beklenen Sonuç:** Arayüz aktif hale gelir

#### Adım 5: Hız ve Duplex Ayarla
```
(config-if)# speed 100
(config-if)# duplex full
```
**Beklenen Sonuç:** Arayüz hızı 100 Mbps, duplex full olur

#### Adım 6: IP Adresi Ata (Router için)
```
(config-if)# ip address 192.168.1.1 255.255.255.0
```
**Beklenen Sonuç:** Arayüze IP adresi atanır

#### Adım 7: Arayüz Durumunu Kontrol Et
```
(config-if)# exit
# show interfaces FastEthernet0/1
```
**Beklenen Sonuç:** Arayüz detayları gösterilir

#### 📝 Notlar
- `interface` komutu arayüz konfigürasyonuna giriş sağlar
- `description` arayüzü tanımlamaya yardımcı olur
- `no shutdown` arayüzü etkinleştirir
- `shutdown` arayüzü devre dışı bırakır
- `speed` ve `duplex` arayüz özelliklerini ayarlar
- `ip address` arayüze IP adresi atar

---

### 📌 Ders 7: Arayüz Aralığı Konfigürasyonu

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüz Aralığını Seç
```
(config)# interface range FastEthernet0/1 - 5
```
**Beklenen Sonuç:** Komut satırı `(config-if-range)#` olur

#### Adım 3: Tüm Arayüzleri Açıkla
```
(config-if-range)# description Kullanıcı-Portları
```
**Beklenen Sonuç:** Tüm seçili arayüzlere açıklama eklenir

#### Adım 4: Tüm Arayüzleri Etkinleştir
```
(config-if-range)# no shutdown
```
**Beklenen Sonuç:** Tüm arayüzler aktif hale gelir

#### Adım 5: Hızı Ayarla
```
(config-if-range)# speed 100
```
**Beklenen Sonuç:** Tüm arayüzlerin hızı 100 Mbps olur

#### 📝 Notlar
- `interface range` birden fazla arayüzü aynı anda konfigüre etmeyi sağlar
- Aralık formatı: `FastEthernet0/1 - 5` (1'den 5'e kadar)
- Tüm komutlar seçili arayüzlere uygulanır
- Zaman tasarrufu sağlar

---

## VLAN Yönetimi

### 📌 Ders 8: VLAN Oluşturma ve Yönetimi

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: VLAN Oluştur
```
(config)# vlan 10
```
**Beklenen Sonuç:** Komut satırı `(config-vlan)#` olur

#### Adım 3: VLAN Adı Belirle
```
(config-vlan)# name Muhasebe
```
**Beklenen Sonuç:** VLAN 10 "Muhasebe" olarak adlandırılır

#### Adım 4: VLAN Durumunu Ayarla
```
(config-vlan)# state active
```
**Beklenen Sonuç:** VLAN aktif hale gelir

#### Adım 5: VLAN Modundan Çık
```
(config-vlan)# exit
```

#### Adım 6: Başka VLAN Oluştur
```
(config)# vlan 20
(config-vlan)# name İnsan-Kaynakları
(config-vlan)# state active
(config-vlan)# exit
```

#### Adım 7: VLAN Bilgilerini Görüntüle
```
(config)# exit
# show vlan brief
```
**Beklenen Sonuç:** Tüm VLAN'lar listelenir

#### 📝 Notlar
- `vlan <id>` yeni VLAN oluşturur
- `name` VLAN'a ad verir
- `state active` VLAN'ı etkinleştirir
- `show vlan` tüm VLAN'ları gösterir
- VLAN 1 varsayılan VLAN'dır

---

### 📌 Ders 9: Arayüzleri VLAN'a Atama

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Ön Koşullar
- VLAN 10 ve VLAN 20 oluşturulmuş olmalı

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüze Girin
```
(config)# interface FastEthernet0/1
```

#### Adım 3: Erişim Modunu Ayarla
```
(config-if)# switchport mode access
```
**Beklenen Sonuç:** Arayüz erişim moduna geçer

#### Adım 4: VLAN Ata
```
(config-if)# switchport access vlan 10
```
**Beklenen Sonuç:** Arayüz VLAN 10'a atanır

#### Adım 5: Başka Arayüzü Farklı VLAN'a Ata
```
(config-if)# exit
(config)# interface FastEthernet0/2
(config-if)# switchport mode access
(config-if)# switchport access vlan 20
```

#### Adım 6: Atamayı Kontrol Et
```
(config-if)# exit
# show vlan brief
```
**Beklenen Sonuç:** Arayüzler ilgili VLAN'lara atanmış görülür

#### 📝 Notlar
- `switchport mode access` arayüzü erişim moduna ayarlar
- `switchport access vlan` arayüzü VLAN'a atar
- Bir arayüz sadece bir VLAN'a ait olabilir
- `show vlan` atamayı doğrulamaya yardımcı olur

---

### 📌 Ders 10: Trunk Portları Konfigürasyonu

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Trunk Arayüzüne Girin
```
(config)# interface GigabitEthernet0/1
```

#### Adım 3: Trunk Modunu Etkinleştir
```
(config-if)# switchport mode trunk
```
**Beklenen Sonuç:** Arayüz trunk moduna geçer

#### Adım 4: Native VLAN Ayarla
```
(config-if)# switchport trunk native vlan 1
```
**Beklenen Sonuç:** Native VLAN 1 olarak ayarlanır

#### Adım 5: İzin Verilen VLAN'ları Belirle
```
(config-if)# switchport trunk allowed vlan 1,10,20
```
**Beklenen Sonuç:** Sadece VLAN 1, 10, 20 trunk üzerinden geçer

#### Adım 6: DTP'yi Devre Dışı Bırak
```
(config-if)# switchport nonegotiate
```
**Beklenen Sonuç:** DTP devre dışı bırakılır

#### Adım 7: Trunk Durumunu Kontrol Et
```
(config-if)# exit
# show interfaces trunk
```
**Beklenen Sonuç:** Trunk arayüzü ve ayarları gösterilir

#### 📝 Notlar
- `switchport mode trunk` arayüzü trunk moduna ayarlar
- `switchport trunk native vlan` native VLAN'ı belirler
- `switchport trunk allowed vlan` izin verilen VLAN'ları sınırlar
- `switchport nonegotiate` DTP'yi devre dışı bırakır
- Trunk portları birden fazla VLAN trafiğini taşır

---

## Yönlendirme Protokolleri

### 📌 Ders 11: Statik Yönlendirme

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Ön Koşullar
- En az 2 router ağa bağlı olmalı
- Routerların arayüzlerine IP adresleri atanmış olmalı

#### Adım 1: Ayrıcalıklı Moda Girin
```
# enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: Statik Rota Ekle
```
(config)# ip route 192.168.2.0 255.255.255.0 192.168.1.2
```
**Beklenen Sonuç:** Rota yönlendirme tablosuna eklenir

#### Adım 4: Varsayılan Rota Ekle
```
(config)# ip route 0.0.0.0 0.0.0.0 192.168.1.1
```
**Beklenen Sonuç:** Varsayılan rota ayarlanır

#### Adım 5: Yönlendirme Tablosunu Kontrol Et
```
(config)# exit
# show ip route
```
**Beklenen Sonuç:** Eklenen rotalar gösterilir

#### Adım 6: Rota Sil
```
# configure terminal
(config)# no ip route 192.168.2.0 255.255.255.0 192.168.1.2
```
**Beklenen Sonuç:** Rota yönlendirme tablosundan kaldırılır

#### 📝 Notlar
- `ip route` statik rota ekler
- Format: `ip route <hedef-ağ> <maske> <sonraki-atlama>`
- `0.0.0.0 0.0.0.0` varsayılan rota anlamına gelir
- `no ip route` rota siler
- `show ip route` tüm rotaları gösterir

---

### 📌 Ders 12: RIP Yönlendirme Protokolü

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: RIP Yönlendirmesini Etkinleştir
```
(config)# router rip
```
**Beklenen Sonuç:** Komut satırı `(config-router)#` olur

#### Adım 3: Ağ Ekle
```
(config-router)# network 192.168.1.0
```
**Beklenen Sonuç:** Ağ RIP'e eklenir

#### Adım 4: Başka Ağ Ekle
```
(config-router)# network 192.168.2.0
```

#### Adım 5: Pasif Arayüz Ayarla
```
(config-router)# passive-interface FastEthernet0/0
```
**Beklenen Sonuç:** Arayüz RIP paketleri göndermez

#### Adım 6: RIP Durumunu Kontrol Et
```
(config-router)# exit
# show ip route
```
**Beklenen Sonuç:** RIP rotaları gösterilir

#### 📝 Notlar
- `router rip` RIP yönlendirmesini etkinleştirir
- `network` ağları RIP'e ekler
- `passive-interface` arayüzü pasif yapar
- RIP v1 sınıflandırılmış yönlendirme kullanır
- RIP v2 CIDR destekler

---

### 📌 Ders 13: OSPF Yönlendirme Protokolü

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: OSPF Yönlendirmesini Etkinleştir
```
(config)# router ospf 1
```
**Beklenen Sonuç:** Komut satırı `(config-router)#` olur (OSPF modu)

#### Adım 3: Router ID Ayarla
```
(config-router)# router-id 1.1.1.1
```
**Beklenen Sonuç:** Router ID ayarlanır

#### Adım 4: Ağ Ekle
```
(config-router)# network 192.168.1.0 0.0.0.255 area 0
```
**Beklenen Sonuç:** Ağ OSPF'e eklenir

#### Adım 5: Başka Ağ Ekle
```
(config-router)# network 192.168.2.0 0.0.0.255 area 0
```

#### Adım 6: Pasif Arayüz Ayarla
```
(config-router)# passive-interface FastEthernet0/0
```

#### Adım 7: OSPF Durumunu Kontrol Et
```
(config-router)# exit
# show ip route
```
**Beklenen Sonuç:** OSPF rotaları gösterilir

#### 📝 Notlar
- `router ospf <id>` OSPF yönlendirmesini etkinleştirir
- `router-id` OSPF router kimliğini ayarlar
- `network` komutu wildcard maskesi kullanır
- `area` OSPF alanını belirler
- OSPF daha hızlı yakınsama sağlar

---

## Güvenlik Komutları

### 📌 Ders 14: Port Güvenliği

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüze Girin
```
(config)# interface FastEthernet0/1
```

#### Adım 3: Port Güvenliğini Etkinleştir
```
(config-if)# switchport port-security
```
**Beklenen Sonuç:** Port güvenliği etkinleştirilir

#### Adım 4: Maksimum MAC Adresi Ayarla
```
(config-if)# switchport port-security maximum 2
```
**Beklenen Sonuç:** Portun maksimum 2 MAC adresi kabul etmesi ayarlanır

#### Adım 5: İhlal Eylemini Ayarla
```
(config-if)# switchport port-security violation shutdown
```
**Beklenen Sonuç:** İhlal durumunda port kapatılır

#### Adım 6: Sticky MAC Etkinleştir
```
(config-if)# switchport port-security mac-address sticky
```
**Beklenen Sonuç:** Dinamik MAC adresleri yapışkan hale gelir

#### Adım 7: Port Güvenliği Durumunu Kontrol Et
```
(config-if)# exit
# show port-security
```
**Beklenen Sonuç:** Port güvenliği ayarları gösterilir

#### 📝 Notlar
- `switchport port-security` port güvenliğini etkinleştirir
- `maximum` izin verilen MAC adresi sayısını belirler
- `violation` ihlal durumunda yapılacak işlemi belirler
- `mac-address sticky` MAC adreslerini otomatik öğrenir
- Üç ihlal modu: protect, restrict, shutdown

---

### 📌 Ders 15: SSH Konfigürasyonu

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: RSA Anahtarları Oluştur
```
(config)# crypto key generate rsa
```
**Beklenen Sonuç:** RSA anahtarları oluşturulur

#### Adım 3: SSH Sürümünü Ayarla
```
(config)# ip ssh version 2
```
**Beklenen Sonuç:** SSH v2 etkinleştirilir

#### Adım 4: SSH Zaman Aşımını Ayarla
```
(config)# ip ssh time-out 120
```
**Beklenen Sonuç:** SSH bağlantısı 120 saniye sonra zaman aşımına uğrar

#### Adım 5: SSH Yeniden Deneme Limitini Ayarla
```
(config)# ip ssh authentication-retries 3
```
**Beklenen Sonuç:** 3 başarısız deneme sonra bağlantı kesilir

#### Adım 6: VTY Hatlarını Yapılandır
```
(config)# line vty 0 4
(config-line)# transport input ssh
(config-line)# login local
```
**Beklenen Sonuç:** SSH erişimi etkinleştirilir

#### Adım 7: SSH Durumunu Kontrol Et
```
(config-line)# exit
# show ssh
```
**Beklenen Sonuç:** SSH ayarları gösterilir

#### 📝 Notlar
- `crypto key generate rsa` SSH için gerekli anahtarları oluşturur
- `ip ssh version 2` SSH v2'yi etkinleştirir
- `transport input ssh` SSH erişimini sınırlar
- `login local` yerel kullanıcı veritabanını kullanır
- SSH Telnet'ten daha güvenlidir

---

### 📌 Ders 16: Kullanıcı Yönetimi

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Yerel Kullanıcı Oluştur
```
(config)# username admin privilege 15 secret MyPassword123
```
**Beklenen Sonuç:** Yönetici kullanıcı oluşturulur

#### Adım 3: Başka Kullanıcı Oluştur
```
(config)# username operator privilege 5 secret OpPassword456
```
**Beklenen Sonuç:** Operatör kullanıcı oluşturulur

#### Adım 4: Şifre Şifrelemesini Etkinleştir
```
(config)# service password-encryption
```
**Beklenen Sonuç:** Tüm şifreler şifrelenir

#### Adım 5: VTY Hatlarını Yapılandır
```
(config)# line vty 0 4
(config-line)# login local
(config-line)# transport input ssh telnet
```

#### Adım 6: Kullanıcıları Kontrol Et
```
(config-line)# exit
# show users
```
**Beklenen Sonuç:** Bağlı kullanıcılar gösterilir

#### 📝 Notlar
- `username` yerel kullanıcı oluşturur
- `privilege` kullanıcı ayrıcalık seviyesini belirler (0-15)
- `secret` şifreyi MD5 ile şifreler
- `service password-encryption` tüm şifreleri şifreler
- `login local` yerel kullanıcı veritabanını kullanır

---

## Kablosuz (WiFi) Komutları

### 📌 Ders 17: Kablosuz LAN Denetleyicisi (WLC) Konfigürasyonu

**Cihaz Türü:** Wireless LAN Controller (WLC)
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Ön Koşullar
- Ağda WLC cihazı bulunmalı
- En az bir Access Point (AP) bağlı olmalı

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: WLAN Oluştur
```
(config)# wlan MyNetwork 1 MySSID
```
**Beklenen Sonuç:** WLAN "MyNetwork" adıyla SSID "MySSID" ile oluşturulur

#### Adım 4: WPA Güvenliğini Ayarla
```
(config)# security wpa psk set-key ascii 0 MySecurePassword123
```
**Beklenen Sonuç:** WPA güvenliği etkinleştirilir

#### Adım 5: RF Kanalını Ayarla
```
(config)# channel 6
```
**Beklenen Sonuç:** Kablosuz kanal 6 olarak ayarlanır

#### Adım 6: WLAN Durumunu Kontrol Et
```
(config)# exit
# show wlan summary
```
**Beklenen Sonuç:** WLAN bilgileri gösterilir

#### Adım 7: Access Point Durumunu Kontrol Et
```
# show ap summary
```
**Beklenen Sonuç:** Bağlı Access Point'ler listelenir

#### 📝 Notlar
- `wlan` komutu yeni WLAN oluşturur
- `security wpa psk` WPA güvenliğini ayarlar
- `channel` RF kanalını belirler (1-13 veya 1-14)
- `show wlan summary` tüm WLAN'ları gösterir
- `show ap summary` bağlı AP'leri gösterir

---

### 📌 Ders 18: Access Point (AP) Konfigürasyonu

**Cihaz Türü:** Access Point (AP)
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: AP Modunu Ayarla
```
(config)# station-role root
```
**Beklenen Sonuç:** AP root moda ayarlanır

#### Adım 4: Kablosuz Arayüzü Yapılandır
```
(config)# interface Wireless0
(config-if)# ip address 192.168.1.100 255.255.255.0
(config-if)# no shutdown
```

#### Adım 5: SSID Ayarla
```
(config-if)# exit
(config)# ssid MyNetwork
```

#### Adım 6: Güvenlik Ayarla
```
(config)# security wpa2 psk MyPassword123
```

#### Adım 7: AP Durumunu Kontrol Et
```
(config)# exit
# show wireless
```
**Beklenen Sonuç:** Kablosuz durumu gösterilir

#### 📝 Notlar
- `station-role root` AP'yi root moda ayarlar
- `ssid` kablosuz ağ adını belirler
- `security wpa2 psk` WPA2 güvenliğini ayarlar
- AP'ler WLC tarafından yönetilir
- Kablosuz arayüzüne IP adresi atanmalı

---

## Hata Ayıklama ve İzleme

### 📌 Ders 19: Ağ Tanılaması ve Hata Ayıklama

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Hata Ayıklamayı Etkinleştir
```
# debug ip packet
```
**Beklenen Sonuç:** IP paket hata ayıklaması başlar

#### Adım 3: Başka Bir Cihaza Ping Gönder
```
# ping 192.168.1.2
```
**Beklenen Sonuç:** Hata ayıklama çıktısı gösterilir

#### Adım 4: Hata Ayıklamayı Devre Dışı Bırak
```
# undebug all
```
**Beklenen Sonuç:** Tüm hata ayıklama devre dışı bırakılır

#### Adım 5: Hata Ayıklama Durumunu Kontrol Et
```
# show debugging
```
**Beklenen Sonuç:** Etkin hata ayıklama seçenekleri gösterilir

#### Adım 6: ARP Tablosunu Kontrol Et
```
# show arp
```
**Beklenen Sonuç:** ARP tablosu gösterilir

#### Adım 7: ARP Önbelleğini Temizle
```
# clear arp-cache
```
**Beklenen Sonuç:** ARP tablosu temizlenir

#### 📝 Notlar
- `debug` komutu hata ayıklamayı etkinleştirir
- `undebug all` tüm hata ayıklamayı devre dışı bırakır
- `show debugging` etkin hata ayıklama seçeneklerini gösterir
- `show arp` ARP tablosunu gösterir
- `clear arp-cache` ARP tablosunu temizler

---

### 📌 Ders 20: Arayüz İstatistikleri ve Durumu

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Tüm Arayüzleri Görüntüle
```
# show interfaces
```
**Beklenen Sonuç:** Tüm arayüzlerin detaylı bilgileri gösterilir

#### Adım 3: Belirli Arayüzü Görüntüle
```
# show interface FastEthernet0/1
```
**Beklenen Sonuç:** Arayüzün detaylı bilgileri gösterilir

#### Adım 4: Arayüz Durumunu Kısaca Görüntüle
```
# show interfaces status
```
**Beklenen Sonuç:** Tüm arayüzlerin kısa durumu gösterilir

#### Adım 5: IP Arayüzlerini Görüntüle
```
# show ip interface brief
```
**Beklenen Sonuç:** IP adresleri ile arayüzler gösterilir

#### Adım 6: Arayüz Sayaçlarını Temizle
```
# clear counters
```
**Beklenen Sonuç:** Arayüz istatistikleri sıfırlanır

#### Adım 7: MAC Adres Tablosunu Temizle
```
# clear mac address-table
```
**Beklenen Sonuç:** MAC adres tablosu temizlenir

#### 📝 Notlar
- `show interfaces` tüm arayüzlerin detaylı bilgisini gösterir
- `show interfaces status` kısa durum gösterir
- `show ip interface brief` IP bilgisini gösterir
- `clear counters` istatistikleri sıfırlar
- `clear mac address-table` MAC tablosunu temizler

---

### 📌 Ders 21: Spanning Tree Protokolü (STP) İzleme

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: STP Durumunu Görüntüle
```
# show spanning-tree
```
**Beklenen Sonuç:** STP bilgileri gösterilir

#### Adım 3: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 4: STP Modunu Ayarla
```
(config)# spanning-tree mode rapid-pvst
```
**Beklenen Sonuç:** STP modu Rapid PVST olur

#### Adım 5: VLAN STP Önceliğini Ayarla
```
(config)# spanning-tree vlan 1 priority 4096
```
**Beklenen Sonuç:** VLAN 1 için STP önceliği ayarlanır

#### Adım 6: PortFast'ı Etkinleştir
```
(config)# spanning-tree portfast default
```
**Beklenen Sonuç:** PortFast tüm erişim portlarında etkinleştirilir

#### Adım 7: STP Durumunu Tekrar Kontrol Et
```
(config)# exit
# show spanning-tree
```
**Beklenen Sonuç:** Güncellenmiş STP bilgileri gösterilir

#### 📝 Notlar
- `spanning-tree mode` STP modunu belirler (pvst, rapid-pvst, mst)
- `spanning-tree vlan priority` VLAN STP önceliğini ayarlar
- `spanning-tree portfast` PortFast'ı etkinleştirir
- Düşük öncelik değeri root bridge olma olasılığını artırır
- PortFast erişim portlarında STP gecikmesini azaltır

---

### 📌 Ders 22: CDP (Discovery Protocol) Kullanımı

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: CDP Komşularını Görüntüle
```
# show cdp neighbors
```
**Beklenen Sonuç:** Bağlı CDP komşuları listelenir

#### Adım 3: CDP Detaylı Bilgisini Görüntüle
```
# show cdp neighbors detail
```
**Beklenen Sonuç:** Komşuların detaylı bilgileri gösterilir

#### Adım 4: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 5: CDP'yi Etkinleştir
```
(config)# cdp run
```
**Beklenen Sonuç:** CDP etkinleştirilir

#### Adım 6: Belirli Arayüzde CDP'yi Devre Dışı Bırak
```
(config)# interface FastEthernet0/1
(config-if)# no cdp enable
```

#### Adım 7: CDP Durumunu Kontrol Et
```
(config-if)# exit
# show cdp
```
**Beklenen Sonuç:** CDP genel bilgileri gösterilir

#### 📝 Notlar
- `show cdp neighbors` bağlı komşuları gösterir
- `cdp run` CDP'yi etkinleştirir
- `no cdp enable` belirli arayüzde CDP'yi devre dışı bırakır
- CDP cihazları otomatik olarak keşfeder
- CDP güvenlik riski olabilir, gerekli olmayan yerlerde devre dışı bırakılmalı

---

### 📌 Ders 23: DHCP Snooping

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: DHCP Snooping'i Etkinleştir
```
(config)# ip dhcp snooping
```
**Beklenen Sonuç:** DHCP snooping etkinleştirilir

#### Adım 3: VLAN'larda DHCP Snooping'i Etkinleştir
```
(config)# ip dhcp snooping vlan 1,10,20
```
**Beklenen Sonuç:** Belirtilen VLAN'larda DHCP snooping etkinleştirilir

#### Adım 4: Arayüzü Güvenilir Olarak Ayarla
```
(config)# interface GigabitEthernet0/1
(config-if)# ip dhcp snooping trust
```
**Beklenen Sonuç:** Arayüz güvenilir DHCP sunucusu olarak ayarlanır

#### Adım 5: DHCP Snooping Durumunu Kontrol Et
```
(config-if)# exit
# show ip dhcp snooping
```
**Beklenen Sonuç:** DHCP snooping ayarları gösterilir

#### Adım 6: DHCP Bağlamalarını Görüntüle
```
# show ip dhcp binding
```
**Beklenen Sonuç:** DHCP tarafından atanan IP adresleri gösterilir

#### 📝 Notlar
- `ip dhcp snooping` DHCP snooping'i etkinleştirir
- `ip dhcp snooping vlan` belirli VLAN'larda etkinleştirir
- `ip dhcp snooping trust` arayüzü güvenilir yapar
- DHCP snooping rogue DHCP sunucularını engeller
- Güvenilir arayüzler DHCP sunucularına bağlanır

---

## İleri Konular

### 📌 Ders 24: DHCP Sunucusu Konfigürasyonu

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: DHCP Havuzu Oluştur
```
(config)# ip dhcp pool OFFICE
```
**Beklenen Sonuç:** Komut satırı `(dhcp-config)#` olur

#### Adım 3: Ağ Tanımla
```
(dhcp-config)# network 192.168.1.0 255.255.255.0
```
**Beklenen Sonuç:** DHCP havuzunun ağı tanımlanır

#### Adım 4: Varsayılan Ağ Geçidini Ayarla
```
(dhcp-config)# default-router 192.168.1.1
```
**Beklenen Sonuç:** Varsayılan ağ geçidi ayarlanır

#### Adım 5: DNS Sunucusu Ekle
```
(dhcp-config)# dns-server 8.8.8.8 8.8.4.4
```
**Beklenen Sonuç:** DNS sunucuları eklenir

#### Adım 6: Kira Süresi Ayarla
```
(dhcp-config)# lease 7
```
**Beklenen Sonuç:** Kira süresi 7 gün olur

#### Adım 7: Alan Adı Ayarla
```
(dhcp-config)# domain-name example.com
```
**Beklenen Sonuç:** Alan adı ayarlanır

#### Adım 8: Hariç Tutulan Adresleri Ayarla
```
(dhcp-config)# exit
(config)# ip dhcp excluded-address 192.168.1.1 192.168.1.10
```
**Beklenen Sonuç:** 1-10 adresleri DHCP'den hariç tutulur

#### Adım 9: DHCP Havuzunu Kontrol Et
```
(config)# exit
# show ip dhcp pool
```
**Beklenen Sonuç:** DHCP havuzu bilgileri gösterilir

#### 📝 Notlar
- `ip dhcp pool` DHCP havuzu oluşturur
- `network` havuzun ağını tanımlar
- `default-router` varsayılan ağ geçidini ayarlar
- `dns-server` DNS sunucularını ayarlar
- `lease` kira süresini belirler
- `ip dhcp excluded-address` adresleri hariç tutar

---

### 📌 Ders 25: EtherChannel Konfigürasyonu

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Ön Koşullar
- En az 2 switch ağa bağlı olmalı
- Aralarında en az 2 bağlantı olmalı

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: İlk Arayüzü Seç
```
(config)# interface FastEthernet0/1
```

#### Adım 3: Channel Group Ekle
```
(config-if)# channel-group 1 mode active
```
**Beklenen Sonuç:** Arayüz channel group 1'e eklenir

#### Adım 4: İkinci Arayüzü Seç
```
(config-if)# exit
(config)# interface FastEthernet0/2
```

#### Adım 5: Aynı Channel Group'a Ekle
```
(config-if)# channel-group 1 mode active
```

#### Adım 6: EtherChannel Durumunu Kontrol Et
```
(config-if)# exit
# show etherchannel summary
```
**Beklenen Sonuç:** EtherChannel bilgileri gösterilir

#### Adım 7: Port Channel Arayüzünü Yapılandır
```
# configure terminal
(config)# interface Port-channel 1
(config-if)# switchport mode trunk
(config-if)# switchport trunk allowed vlan 1,10,20
```

#### 📝 Notlar
- `channel-group` arayüzleri EtherChannel'a ekler
- `mode active` LACP aktif modunu kullanır
- `mode on` statik EtherChannel kullanır
- Port-channel arayüzü mantıksal bağlantıyı temsil eder
- EtherChannel bant genişliğini artırır

---

### 📌 Ders 26: QoS (Quality of Service) Konfigürasyonu

**Cihaz Türü:** Switch
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: MLS QoS'u Etkinleştir
```
(config)# mls qos
```
**Beklenen Sonuç:** QoS etkinleştirilir

#### Adım 3: Arayüze Girin
```
(config)# interface FastEthernet0/1
```

#### Adım 4: QoS Güven Durumunu Ayarla
```
(config-if)# mls qos trust cos
```
**Beklenen Sonuç:** Arayüz CoS değerlerine güvenir

#### Adım 5: Varsayılan CoS Değeri Ayarla
```
(config-if)# mls qos cos 3
```
**Beklenen Sonuç:** Varsayılan CoS değeri 3 olur

#### Adım 6: QoS Durumunu Kontrol Et
```
(config-if)# exit
# show mls qos
```
**Beklenen Sonuç:** QoS ayarları gösterilir

#### 📝 Notlar
- `mls qos` QoS'u etkinleştirir
- `mls qos trust` arayüzün güven durumunu ayarlar
- `mls qos cos` varsayılan CoS değerini ayarlar
- CoS değerleri 0-7 arasında değişir
- QoS trafik önceliğini belirler

---

### 📌 Ders 27: IPv6 Konfigürasyonu

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: IPv6 Yönlendirmesini Etkinleştir
```
(config)# ipv6 unicast-routing
```
**Beklenen Sonuç:** IPv6 yönlendirmesi etkinleştirilir

#### Adım 3: Arayüze Girin
```
(config)# interface FastEthernet0/0
```

#### Adım 4: IPv6 Adresi Ata
```
(config-if)# ipv6 address 2001:db8::1/64
```
**Beklenen Sonuç:** IPv6 adresi atanır

#### Adım 5: Arayüzü Etkinleştir
```
(config-if)# no shutdown
```

#### Adım 6: IPv6 Statik Rota Ekle
```
(config-if)# exit
(config)# ipv6 route 2001:db8:2::/64 2001:db8::2
```
**Beklenen Sonuç:** IPv6 rota eklenir

#### Adım 7: IPv6 Yönlendirme Tablosunu Kontrol Et
```
(config)# exit
# show ipv6 route
```
**Beklenen Sonuç:** IPv6 rotaları gösterilir

#### Adım 8: IPv6 Arayüzlerini Kontrol Et
```
# show ipv6 interface brief
```
**Beklenen Sonuç:** IPv6 arayüzleri gösterilir

#### 📝 Notlar
- `ipv6 unicast-routing` IPv6 yönlendirmesini etkinleştirir
- `ipv6 address` IPv6 adresi atar
- `ipv6 route` IPv6 statik rota ekler
- IPv6 adresleri 128 bit uzunluğundadır
- CIDR notasyonu IPv6'da da kullanılır

---

### 📌 Ders 28: Sistem Yönetimi ve Bakım

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Cihaz Envanterini Görüntüle
```
# show inventory
```
**Beklenen Sonuç:** Donanım envanteri gösterilir

#### Adım 3: Ortam Durumunu Kontrol Et
```
# show environment
```
**Beklenen Sonuç:** Sıcaklık, fan, güç kaynağı bilgileri gösterilir

#### Adım 4: Bellek Kullanımını Kontrol Et
```
# show memory
```
**Beklenen Sonuç:** Bellek istatistikleri gösterilir

#### Adım 5: İşlemci Kullanımını Kontrol Et
```
# show processes
```
**Beklenen Sonuç:** CPU işlemleri gösterilir

#### Adım 6: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 7: Sistem MTU'sunu Ayarla
```
(config)# system mtu 1500
```
**Beklenen Sonuç:** Sistem MTU'su ayarlanır

#### Adım 8: Cihazı Yeniden Başlat
```
(config)# exit
# reload
```
**Beklenen Sonuç:** Cihaz yeniden başlatılır

#### 📝 Notlar
- `show inventory` donanım bilgisini gösterir
- `show environment` sistem durumunu gösterir
- `show memory` bellek kullanımını gösterir
- `show processes` CPU kullanımını gösterir
- `reload` cihazı yeniden başlatır
- Yeniden başlatmadan önce konfigürasyonu kaydedin

---

### 📌 Ders 29: Komut Takma Adları ve Makrolar

**Cihaz Türü:** Switch veya Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Komut Takma Adı Oluştur
```
(config)# alias exec si show interfaces
```
**Beklenen Sonuç:** "si" komutu "show interfaces" için takma ad olur

#### Adım 3: Başka Takma Ad Oluştur
```
(config)# alias exec sr show running-config
```

#### Adım 4: Takma Adları Kontrol Et
```
(config)# exit
# show alias
```
**Beklenen Sonuç:** Oluşturulan takma adlar gösterilir

#### Adım 5: Takma Adı Kullan
```
# si
```
**Beklenen Sonuç:** "show interfaces" komutu çalışır

#### Adım 6: Makro Tanımla
```
# configure terminal
(config)# macro name SHOW-ALL
(config)# show interfaces
(config)# show ip route
(config)# show vlan
(config)# exit
```

#### 📝 Notlar
- `alias exec` komut takma adı oluşturur
- Takma adlar yazım hızını artırır
- `macro name` makro tanımlar
- Makrolar birden fazla komutu bir arada çalıştırır
- `show alias` tüm takma adları gösterir

---

### 📌 Ders 30: Erişim Kontrol Listeleri (ACL)

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: Standart Access-List Oluşturun
```
(config)# access-list 1 deny host 192.168.1.10
(config)# access-list 1 permit any
```
**Beklenen Sonuç:** PC-1 (192.168.1.10) trafiğini engelleyen, diğer tüm trafiğe izin veren ACL oluşturulur

#### Adım 4: ACL'i Arayüze Uygulayın
```
(config)# interface gi0/0
(config-if)# ip access-group 1 out
```
**Beklenen Sonuç:** ACL 1, Gi0/0 arayüzünde outgoing yönde uygulanır

#### Adım 5: ACL'i Görüntüleyin
```
(config-if)# exit
# show access-lists
```
**Beklenen Sonuç:** Oluşturulan ACL kuralları listelenir

#### Adım 6: Konfigürasyonu Kaydet
```
# write memory
```

#### 📝 Notlar
- Standart ACL'ler (1-99) yalnızca kaynak IP'ye göre filtreleme yapar
- Extended ACL'ler (100-199) kaynak/hedef IP, port ve protokole göre filtreleme yapar
- `access-list` komutu global konfigürasyon modunda çalışır
- `ip access-group` komutu interface konfigürasyon modunda çalışır
- ACL'ler sıralı olarak işlenir; ilk eşleşen kural uygulanır
- Her ACL'in sonunda `permit any` veya `deny any` ile bitmesi önerilir
- `show access-lists` tüm ACL'leri gösterir
- Named ACL için `ip access-list standard <isim>` kullanılır

---

## 🎯 Pratik Senaryolar

### Senaryo 1: Temel Ağ Kurulumu

**Hedef:** 2 switch ve 1 router ile basit bir ağ kurmak

**Adımlar:**
1. Her cihaza hostname atayın
2. Arayüzlere IP adresleri atayın
3. Statik rotalar ekleyin
4. Ping ile bağlantıyı test edin

**Beklenen Sonuç:** Tüm cihazlar birbirine ping atabilir

---

### Senaryo 2: VLAN Segmentasyonu

**Hedef:** 3 VLAN oluşturup arayüzleri atamak

**Adımlar:**
1. VLAN 10, 20, 30 oluşturun
2. Her VLAN'a ad verin
3. Arayüzleri VLAN'lara atayın
4. Trunk port yapılandırın
5. VLAN durumunu kontrol edin

**Beklenen Sonuç:** VLAN'lar düzgün şekilde yapılandırılır

---

### Senaryo 3: Güvenli Uzaktan Erişim

**Hedef:** SSH üzerinden güvenli erişim sağlamak

**Adımlar:**
1. RSA anahtarları oluşturun
2. SSH v2'yi etkinleştirin
3. Yerel kullanıcı oluşturun
4. VTY hatlarını yapılandırın
5. SSH bağlantısını test edin

**Beklenen Sonuç:** SSH üzerinden güvenli bağlantı sağlanır

---

### Senaryo 4: Dinamik Yönlendirme

**Hedef:** OSPF yönlendirmesini yapılandırmak

**Adımlar:**
1. OSPF'i etkinleştirin
2. Router ID'sini ayarlayın
3. Ağları OSPF'e ekleyin
4. Pasif arayüzleri ayarlayın
5. Yönlendirme tablosunu kontrol edin

**Beklenen Sonuç:** OSPF rotaları otomatik olarak öğrenilir

---

### Senaryo 5: Kablosuz Ağ Kurulumu

**Hedef:** WLC ve AP ile kablosuz ağ kurmak

**Adımlar:**
1. WLC'de WLAN oluşturun
2. WPA2 güvenliğini ayarlayın
3. RF kanalını belirleyin
4. AP'leri bağlayın
5. Kablosuz durumunu kontrol edin

**Beklenen Sonuç:** Kablosuz ağ aktif ve erişilebilir

---

## 📁 Örnek Projeler

Network Simulator, farklı zorluk seviyelerinde **40 hazır örnek proje** ile birlikte gelir. Her proje önceden yapılandırılmış cihazlar ve bağlantılarla birlikte yüklenir.

| # | Proje | Etiket | Seviye | Açıklama |
|---|-------|--------|--------|----------|
| 1 | Basit Ağ + Parolalar | TEMEL | ⭐ Başlangıç | Temel ağ güvenliği için console, VTY ve enable parolaları |
| 2 | 1 Switch VLAN | VLAN | ⭐ Başlangıç | Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu |
| 3 | 2 Switch Trunk + VTP | TRUNK/VTP | ⭐⭐ Orta | İki switch arası trunk bağlantısı ve VTP ile VLAN yayılımı |
| 4 | ROAS (Router-on-a-Stick) | ROAS | ⭐⭐ Orta | Tek trunk interface üzerinden inter-VLAN routing |
| 5 | Legacy Inter-VLAN Routing | LEGACY ROUTING | ⭐⭐ Orta | Router iki fiziksel interface ile VLAN'lara bağlanır |
| 6 | Port-Security | GÜVENLİK | ⭐⭐ Orta | Switch portunda MAC adres tabanlı güvenlik kısıtlaması |
| 7 | Inter-VLAN Routing (L3 Switch) | L3 ROUTING | ⭐⭐⭐ İleri | L3 switch üzerinde dört VLAN arası routing |
| 8 | Static Routing Lab | ROUTING | ⭐⭐⭐ İleri | İki router arası statik yönlendirme |
| 9 | EtherChannel Lab | ETHERCHANNEL | ⭐⭐⭐ İleri | LACP ile birden fazla link tek bir mantıksal bağlantıda |
| 10 | STP Redundant Links | STP | ⭐⭐⭐ İleri | Rapid-PVST redundant linklerde loop önleme |
| 11 | STP Triangle Topology | STP | ⭐⭐⭐ İleri | Üç switch triangle topolojisinde STP |
| 12 | Campus Network | CAMPUS | ⭐⭐⭐ İleri | Core router ile iki access switch arası routing |
| 13 | Kablosuz Ağ (WiFi) | WiFi | ⭐⭐ Orta | Router access point mode ile kablosuz istemci bağlantısı |
| 14 | IoT WiFi Laboratuvarı | IoT | ⭐⭐ Orta | Üç IoT cihazı ve PC açık WiFi ağına bağlanır |
| 15 | Sera Krokisi (Akıllı Tarım) | ÇEVRE | ⭐⭐ Orta | Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme |
| 16 | Router SSH (1 PC + 1 Router) | SSH | ⭐ Başlangıç | PC üzerinden router'a SSH ile güvenli bağlantı |
| 17 | Router DHCP (2 PC + 1 Switch + 1 Router) | DHCP | ⭐ Başlangıç | Router DHCP havuzu üzerinden iki PC'ye otomatik IP |
| 18 | Firewall Temel (ICMP Bloke) | FIREWALL | ⭐ Başlangıç | ICMP engellenmiş, diğer tüm trafiğe izin verilmiş firewall |
| 19 | MAC Tablo Öğrenme | MAC | ⭐ Başlangıç | Switch MAC adres tablosu öğrenme özelliği |
| 20 | DNS ve HTTP Test | DNS/HTTP | ⭐⭐ Orta | DNS name resolution ve HTTP web erişimi testi |
| 21 | ARP ve MAC Tablo Çalışması | MAC | ⭐ Başlangıç | ARP ve MAC adres tablosu arasındaki ilişki |
| 22 | IP Yapılandırma Laboratuvarı | IP | ⭐ Başlangıç | IP yapılandırmasının ağ bağlantısı üzerindeki etkisi |
| 23 | DHCP Dağıtım Senaryosu | DHCP | ⭐⭐ Orta | DHCP otomatik IP dağıtımı vs manuel yapılandırma |
| 24 | 2 Switch Trunk Uygulaması | TRUNK | ⭐⭐ Orta | İki switch trunk bağlantısı ile VLAN trafiği |
| 25 | Native VLAN Yapılandırması | NATIVE | ⭐ Başlangıç | İki switch arası native VLAN 99 trunk bağlantısı |
| 26 | STP 3 Switch PVST | STP | ⭐⭐⭐ İleri | PVST ile her VLAN için farklı root bridge yük dengelemesi |
| 27 | 2 L3 Switch VLAN (AG1/AG2) | L3 VLAN | ⭐⭐⭐ İleri | İki L3 switch SVI gateway ile VLAN'lar arası routing |
| 28 | L3 Switch Statik Yönlendirme | STATIC ROUTING | ⭐⭐⭐ İleri | Multilayer switch'ler ve router statik rotalar |
| 29 | RIP Dinamik Yönlendirme | RIP ROUTING | ⭐⭐⭐ İleri | RIP dinamik yönlendirme protokolü ile otomatik route öğrenimi |
| 30 | ACL Standard | ACL | ⭐⭐ Orta | Standard ACL ile temel erişim kontrolü |
| 31 | ACL Extended | ACL | ⭐⭐⭐ İleri | Extended ACL ile protokol/port bazlı filtreleme |
| 32 | NAT Static | NAT | ⭐⭐ Orta | Static NAT ile birebir adres eşlemesi |
| 33 | NAT Dynamic | NAT | ⭐⭐⭐ İleri | NAT havuzu ile dinamik çeviri |
| 34 | NAT PAT | NAT | ⭐⭐⭐ İleri | PAT (NAT overload) ile çoktan-bire çeviri |
| 35 | HSRP Redundancy | HSRP | ⭐⭐⭐ İleri | Varsayılan ağ geçidi yedekliliği için HSRP |
| 36 | OSPF Multi-Area | OSPF | ⭐⭐⭐ İleri | Area 0 ve Area 10 ile çok alanlı OSPF |
| 37 | OSPF Multi-Area | OSPF | ⭐⭐⭐ İleri | ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması |
| 38 | EIGRP Basic | EIGRP | ⭐⭐⭐ İleri | Temel EIGRP komutları ile dinamik yönlendirme |
| 39 | IPv6 Gelişmiş Lab (DHCPv6 & OSPFv3) | IPv6 | ⭐⭐⭐ İleri | IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 |
| 40 | Tüm Servisler Laboratuvarı | SERVİSLER | ⭐⭐ Orta | DNS, HTTP, DHCP, FTP, MAIL, NTP servislerinin bir arada bulunduğu lab |

### Seviyelere Göre Dağılım
- ⭐ **Başlangıç (12 proje):** Temel ağ, parolalar, VLAN, SSH, DHCP, firewall, MAC, ARP, IP, native VLAN
- ⭐⭐ **Orta (13 proje):** Trunk, VTP, ROAS, inter-VLAN, port-security, WiFi, IoT, DNS/HTTP, DHCP, ACL, NAT, servisler
- ⭐⭐⭐ **İleri (15 proje):** L3 routing, static routing, EtherChannel, STP, campus, PVST, OSPF, EIGRP, IPv6, HSRP, extended ACL, NAT/PAT

---

## 📚 Hızlı Referans Tablosu

### Sık Kullanılan Komutlar

| Komut | Açıklama | Mod |
|-------|----------|-----|
| `enable` | Ayrıcalıklı moda gir | User |
| `configure terminal` | Konfigürasyon moduna gir | Privileged |
| `exit` | Moddan çık | Tüm |
| `show running-config` | Aktif konfigürasyonu göster | Privileged |
| `write memory` | Konfigürasyonu kaydet | Privileged |
| `ping <host>` | Bağlantı testi | Privileged |
| `interface <name>` | Arayüze gir | Config |
| `ip address <ip> <mask>` | IP adresi ata | Interface |
| `no shutdown` | Arayüzü etkinleştir | Interface |
| `vlan <id>` | VLAN oluştur | Config |
| `show vlan` | VLAN'ları göster | Privileged |

---

## 🔍 Sorun Giderme İpuçları

### Komut Çalışmıyor
- Doğru modda olduğunuzu kontrol edin
- `?` ile komut sözdizimini kontrol edin
- Yazım hatalarını kontrol edin

### Bağlantı Sorunu
- Arayüzlerin `no shutdown` olduğunu kontrol edin
- IP adreslerini kontrol edin
- Yönlendirme tablosunu kontrol edin
- Ping ile bağlantıyı test edin

### Konfigürasyon Kayboldu
- `write memory` ile konfigürasyonu kaydedin
- `show startup-config` ile başlangıç konfigürasyonunu kontrol edin
- Cihazı yeniden başlatmadan önce kaydedin

### Performans Sorunu
- `show processes` ile CPU kullanımını kontrol edin
- `show memory` ile bellek kullanımını kontrol edin
- Gereksiz hata ayıklamayı devre dışı bırakın

---

## 📖 Ek Kaynaklar

- [CLI Komutları Referansı](CLI_COMMANDS.md)
- [Hata Ayıklama Kılavuzu](ERROR_HANDLING_GUIDE.md)
- [L3 Switch Konfigürasyonu](L3_SWITCH_CONFIGURATION.md)
- [Kablosuz Konfigürasyon](WIRELESS_CONFIGURATION_GUIDE.md)

---

## 💡 İpuçları ve Püf Noktaları

1. **Tab Tamamlama:** Komutları hızlı yazabilmek için TAB tuşunu kullanın
2. **Komut Geçmişi:** Önceki komutlara erişmek için yukarı ok tuşunu kullanın
3. **Kısayollar:** Sık kullanılan komutlar için takma adlar oluşturun
4. **Yardım Sistemi:** Bilinmeyen komutlar için `?` kullanın
5. **Konfigürasyon Yedekleme:** Önemli değişikliklerden önce konfigürasyonu kaydedin

---

### Proje 1: Basit Ağ + Parolalar

**Hedef:** Switch üzerinde console, VTY ve enable parolalarını yapılandırmak ve doğrulamak.

**Cihazlar:** 1 Switch (SW1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/1 (Straight), PC-2 COM1 → SW1 Console (Console)

**Adımlar:**
1. SW1 terminaline girin: `enable`, `configure terminal`
2. Parolaları ayarlayın: `enable secret class`, `enable password paswd`, `service password-encryption`
3. Console hattını yapılandırın: `line con 0`, `password console`, `login`, `logging synchronous`
4. VTY hattını yapılandırın: `line vty 0 4`, `password vty123`, `login`, `transport input telnet ssh`
5. VLAN 10 oluşturun: `vlan 10`, `name VLAN10`
6. SVI arayüzünü yapılandırın: `interface vlan 10`, `ip address 192.168.10.150 255.255.255.0`, `no shutdown`
7. PC-1 portunu VLAN 10'a atayın: `interface fa0/1`, `switchport mode access`, `switchport access vlan 10`
8. PC-1'e IP 192.168.10.10/24 verin, gateway 192.168.10.150

**Test:** PC-2 Console terminalinden SW1'e bağlanın; PC-1 CMD'den `telnet 192.168.10.150` (şifre: vty123), enable şifresi: class/paswd

**Beklenen Sonuç:** Switch'e konsol ve telnet üzerinden parolalarla erişilebilir.

---

### Proje 2: 1 Switch VLAN

**Hedef:** Tek switch üzerinde VLAN 10 ve 20 oluşturarak PC'leri farklı broadcast domain'lerine ayırmak.

**Cihazlar:** 1 Switch (SW1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/1, PC-2 Eth0 → SW1 Fa0/2

**Adımlar:**
1. SW1 terminaline girin: `enable`, `configure terminal`
2. VLAN 10 oluşturun: `vlan 10`, `name VLAN10`
3. VLAN 20 oluşturun: `vlan 20`, `name VLAN20`
4. Fa0/1'i VLAN 10'a atayın: `interface fa0/1`, `switchport mode access`, `switchport access vlan 10`
5. Fa0/2'yi VLAN 20'ye atayın: `interface fa0/2`, `switchport mode access`, `switchport access vlan 20`
6. PC-1: IP 192.168.10.10/24, VLAN 10; PC-2: IP 192.168.20.10/24, VLAN 20

**Test:** `show vlan brief`, `show interfaces status`, PC-1'den PC-2'ye ping

**Beklenen Sonuç:** PC'ler farklı VLAN'larda olduğu için birbirine ping atamaz.

---

### Proje 3: 2 Switch Trunk + VTP

**Hedef:** İki switch arasında VTP kullanarak VLAN bilgilerinin otomatik yayılımını sağlamak.

**Cihazlar:** 2 Switch (SW1, SW2), 1 PC (PC-1)

**Bağlantılar:** SW1 Gi0/1 → SW2 Gi0/1 (Crossover), PC-1 Eth0 → SW2 Fa0/1

**Adımlar:**
1. SW1: `vtp mode server`, `vtp domain LAB`
2. SW2: `vtp mode client`, `vtp domain LAB`
3. SW1 Gi0/1 trunk yapın: `interface gi0/1`, `switchport mode trunk`
4. SW2 Gi0/1 trunk yapın: `interface gi0/1`, `switchport mode trunk`
5. SW1'de VLAN 10 ve 20 oluşturun → SW2'ye otomatik yayılır
6. SW2 Fa0/1'i VLAN 10'a atayın: `interface fa0/1`, `switchport mode access`, `switchport access vlan 10`
7. PC-1: IP 192.168.10.10/24, VLAN 10

**Test:** `show vlan brief` (her iki switch'te), `show interfaces trunk`

**Beklenen Sonuç:** SW1'de oluşturulan VLAN'lar VTP sayesinde SW2'de otomatik görünür.

---

### Proje 4: ROAS (Router-on-a-Stick)

**Hedef:** Router-on-a-Stick kullanarak tek trunk interface üzerinden inter-VLAN routing sağlamak.

**Cihazlar:** 1 Switch (SW1), 1 Router (R1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/1, PC-2 Eth0 → SW1 Fa0/2, SW1 Gi0/1 → R1 Gi0/0 (Crossover)

**Adımlar:**
1. SW1'de VLAN 10 ve 20 oluşturun; Fa0/1 → VLAN 10, Fa0/2 → VLAN 20
2. SW1 Gi0/1 trunk yapın: `switchport trunk encapsulation dot1q`, `switchport mode trunk`
3. R1'de: `interface gi0/0`, `no shutdown`
4. Subinterface Gi0/0.10: `encapsulation dot1q 10`, `ip address 192.168.10.1 255.255.255.0`
5. Subinterface Gi0/0.20: `encapsulation dot1q 20`, `ip address 192.168.20.1 255.255.255.0`
6. PC-1: IP 192.168.10.10/24, GW 192.168.10.1; PC-2: IP 192.168.20.10/24, GW 192.168.20.1

**Test:** PC-1 > `ping 192.168.20.10`

**Beklenen Sonuç:** Farklı VLAN'lardaki PC'ler birbirine ping atabilir.

---

### Proje 5: Legacy Inter-VLAN Routing

**Hedef:** Router üzerinde iki fiziksel interface kullanarak VLAN'lar arası routing sağlamak.

**Cihazlar:** 1 Switch (SW1), 1 Router (R1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/2, PC-2 Eth0 → SW1 Fa0/12, R1 Gi0/1 → SW1 Fa0/11 (Crossover), R1 Gi0/0 → SW1 Fa0/1 (Crossover)

**Adımlar:**
1. SW1: VLAN 10 (Fa0/2, Fa0/11), VLAN 20 (Fa0/12, Fa0/1) oluşturun
2. R1 Gi0/1: `ip address 192.168.0.1 255.255.255.0`, `no shutdown`
3. R1 Gi0/0: `ip address 192.168.1.1 255.255.255.0`, `no shutdown`
4. PC-1: IP 192.168.0.2/24, GW 192.168.0.1; PC-2: IP 192.168.1.2/24, GW 192.168.1.1

**Test:** PC-1 > `ping 192.168.1.2`

**Beklenen Sonuç:** Router iki farklı fiziksel arayüz üzerinden VLAN'lar arası iletişimi sağlar.

---

### Proje 6: Port-Security

**Hedef:** Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırmak.

**Cihazlar:** 1 Switch (SW1), 1 PC (PC-1)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/3

**Adımlar:**
1. `interface fa0/3`, `switchport mode access`
2. `switchport port-security`, `switchport port-security maximum 1`
3. `switchport port-security violation shutdown`
4. `switchport port-security mac-address sticky`
5. PC-1: IP 192.168.1.10/24

**Test:** `show port-security interface fa0/3`, `show port-security address`

**Beklenen Sonuç:** Port sadece öğrendiği MAC adresine izin verir; başka MAC bağlanırsa port shutdown olur.

---

### Proje 7: Inter-VLAN Routing (L3 Switch)

**Hedef:** L3 switch üzerinde SVI interface'leri ile dört VLAN arası routing sağlamak.

**Cihazlar:** 1 L3 Switch (L3SW1), 4 PC (PC-1, PC-2, PC-3, PC-4)

**Bağlantılar:** PC-1→Gi1/0/1, PC-2→Gi1/0/2, PC-3→Gi1/0/3, PC-4→Gi1/0/4

**Adımlar:**
1. L3SW1: `ip routing`
2. VLAN 10, 20, 30, 40 oluşturun
3. SVI'ları yapılandırın: `interface vlan 10`, `ip address 192.168.10.1 255.255.255.0` (benzer şekilde 20/30/40)
4. Portları atayın: `interface gi1/0/1`, `switchport mode access`, `switchport access vlan 10`
5. PC'ler: IP 192.168.x.10/24, GW 192.168.x.1

**Test:** `show ip route`, tüm PC'ler arası ping

**Beklenen Sonuç:** Tüm PC'ler birbirine ping atabilir.

---

### Proje 8: Static Routing Lab

**Hedef:** İki router arasında statik yönlendirme ile farklı subnetler arası iletişim sağlamak.

**Cihazlar:** 2 Router (R1, R2), 2 Switch, 2 PC

**Bağlantılar:** PC-1→SW1→R1-Gi0/0, R1-Gi0/1→R2-Gi0/0, R2-Gi0/1→SW2→PC-2

**Adımlar:**
1. R1 Gi0/0: `ip address 192.168.1.1 255.255.255.0`; R1 Gi0/1: `ip address 192.168.10.1 255.255.255.0`
2. R2 Gi0/0: `ip address 192.168.1.2 255.255.255.0`; R2 Gi0/1: `ip address 192.168.20.1 255.255.255.0`
3. R1: `ip route 192.168.20.0 255.255.255.0 192.168.1.2`
4. R2: `ip route 192.168.10.0 255.255.255.0 192.168.1.1`
5. PC-1: IP 192.168.10.10/24, GW 192.168.10.1; PC-2: IP 192.168.20.10/24, GW 192.168.20.1

**Test:** PC-1 > `ping 192.168.20.10`, `show ip route`

**Beklenen Sonuç:** İki farklı ağdaki PC'ler statik rotalar sayesinde birbirine ping atabilir.

---

### Proje 9: EtherChannel Lab

**Hedef:** LACP ile birden fazla linki tek bir mantıksal bağlantıda birleştirerek bant genişliğini artırmak.

**Cihazlar:** 2 Switch (SW1, SW2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW2 Fa0/1, SW1 Gi0/1-2 → SW2 Gi0/1-2 (Crossover)

**Adımlar:**
1. Her switch'te VLAN 10 oluşturun
2. SW1: `interface range gi0/1-2`, `channel-group 1 mode active`
3. SW1: `interface port-channel 1`, `switchport mode trunk`
4. SW2'de aynı EtherChannel konfigürasyonu
5. PC-1: IP 192.168.10.10/24; PC-2: IP 192.168.10.11/24

**Test:** `show etherchannel summary`, PC-1 > `ping 192.168.10.11`

**Beklenen Sonuç:** İki switch arasında LACP EtherChannel aktif, PC'ler birbirine ping atabilir.

---

### Proje 10: STP Redundant Links

**Hedef:** Rapid-PVST kullanarak redundant linklerde loop önlemek.

**Cihazlar:** 2 Switch (SW1, SW2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW2 Fa0/1, SW1 Gi0/1-2 → SW2 Gi0/1-2 (Crossover)

**Adımlar:**
1. SW1: `spanning-tree mode rapid-pvst`, `spanning-tree vlan 10 priority 28672` (root bridge)
2. SW2: `spanning-tree mode rapid-pvst`
3. Her switch'te VLAN 10 oluşturun, trunk portları yapılandırın
4. PC-1: IP 192.168.10.10/24; PC-2: IP 192.168.10.11/24

**Test:** `show spanning-tree` (Gi0/2 BLK olmalı), kabloyu çekip Gi0/2'nin devralmasını gözlemleyin

**Beklenen Sonuç:** STP bir portu bloke eder, loop önlenir, redundant bağlantı hazır bekler.

---

### Proje 11: STP Triangle Topology

**Hedef:** Üç switch üçgen topolojisinde STP'nin loop önleme davranışını gözlemlemek.

**Cihazlar:** 3 Switch (SW1, SW2, SW3), 2 PC

**Bağlantılar:** SW1-Fa0/1↔SW3-Fa0/1, SW1-Fa0/2↔SW2-Fa0/1, SW2-Fa0/2↔SW3-Fa0/2 (üçgen bağlantı), PC-1→SW1 Fa0/24, PC-2→SW2 Fa0/24

**Adımlar:**
1. SW2: `spanning-tree mode rapid-pvst`, priority 28672 (root)
2. SW1/SW3: `spanning-tree mode rapid-pvst`, priority 32768
3. Tüm trunk portları konfigüre edin
4. PC'ler: IP 192.168.1.10/24 ve 192.168.1.11/24

**Test:** `show spanning-tree` (SW1 Fa0/1 bloke olmalı)

**Beklenen Sonuç:** Üçgen topolojide bir port STP tarafından bloke edilir, loop önlenir.

---

### Proje 12: Campus Network

**Hedef:** Core router ile iki access switch arasında VLAN'lar arası routing sağlamak.

**Cihazlar:** 1 Router (CORE-R1), 2 Switch (ACC-SW1, ACC-SW2), 2 PC

**Bağlantılar:** PC-1→ACC-SW1, ACC-SW1 Gi0/1→CORE-R1 Gi0/0, CORE-R1 Gi0/1→ACC-SW2 Gi0/1, ACC-SW2→PC-2

**Adımlar:**
1. CORE-R1 Gi0/0: `ip address 192.168.10.1 255.255.255.0`, Gi0/1: `ip address 192.168.20.1 255.255.255.0`
2. ACC-SW1: VLAN 10 oluşturun, Fa0/1 access VLAN 10, Gi0/1 access VLAN 10
3. ACC-SW2: VLAN 20 oluşturun, Fa0/1 access VLAN 20, Gi0/1 access VLAN 20
4. PC-1: IP 192.168.10.10/24, GW 192.168.10.1; PC-2: IP 192.168.20.10/24, GW 192.168.20.1

**Test:** PC-1 > `ping 192.168.20.10`

**Beklenen Sonuç:** Campus ağda core router VLAN'lar arası routing sağlar.

---

### Proje 13: Kablosuz Ağ (WiFi)

**Hedef:** Router AP modunda kablosuz ağ oluşturarak PC'lerin kablosuz bağlanmasını sağlamak.

**Cihazlar:** 1 Router (R1), 2 PC (PC-1, PC-2)

**Bağlantılar:** Kablosuz (WiFi) - R1 wlan0 AP mode, PC-1 ve PC-2 WiFi client

**Adımlar:**
1. R1 wlan0: AP modu, SSID `HomeWiFi`, open security, IP 192.168.1.1/24
2. R1 DHCP havuzu (`wifi-pool`): network 192.168.1.0/24, default-router 192.168.1.1
3. PC-1: WiFi SSID `HomeWiFi`, IP 192.168.1.10/24 (statik)
4. PC-2: WiFi SSID `HomeWiFi`, IP 192.168.1.11/24 (statik)

**Test:** PC-1 > `ping 192.168.1.11`, PC-1 > `wget 192.168.1.1`

**Beklenen Sonuç:** PC'ler kablosuz ağ üzerinden birbirine ve router'a erişebilir.

---

### Proje 14: IoT WiFi Laboratuvarı

**Hedef:** IoT cihazlarını açık kablosuz ağa bağlayarak sensör verilerini izlemek.

**Cihazlar:** 1 Router (R1), 1 PC (PC-1), 3 IoT (IoT-Temp, IoT-Humidity, IoT-Motion)

**Bağlantılar:** Tüm cihazlar kablosuz (WiFi) - R1 AP mode, SSID `IoT-Network`, open security

**Adımlar:**
1. R1: AP modu, SSID `IoT-Network`, DHCP havuzu 192.168.1.100-150
2. PC-1 ve IoT cihazları: WiFi client, DHCP ile IP alır
3. PC-1 gateway 192.168.1.1

**Test:** PC-1 > `ping 192.168.1.1`, PC-1 > `wget http://iot-panel` (IoT panelini görüntüle)

**Beklenen Sonuç:** IoT cihazları kablosuz ağa bağlanır, PC-1 IoT panelini görüntüleyebilir.

---

### Proje 15: Sera Krokisi (Akıllı Tarım)

**Hedef:** WPA2 güvenli WiFi ile IoT sensörleri ve aktüatörlerle sera ortamını otomatik izlemek.

**Cihazlar:** 1 Router (R1-SERA), 1 PC (PC-1), 4 IoT sensör, 3 IoT aktüatör

**Bağlantılar:** Tüm cihazlar kablosuz (WiFi) - R1 AP mode, SSID `GreenHouse-Network`, WPA2 şifre: `sera`

**Adımlar:**
1. R1: AP modu, SSID `GreenHouse-Network`, WPA2 şifre `sera`, DHCP 192.168.2.100-150
2. PC-1: IP 192.168.2.10/24, GW 192.168.2.1
3. IoT sensörler: 192.168.2.101-104 (sıcaklık, nem, ışık, hareket)
4. IoT aktüatörler: 192.168.2.111-113 (ısıtıcı, soğutucu, lamba)
5. Otomatik kurallar: sıcaklık >28°C soğutucu ON, <18°C ısıtıcı ON

**Test:** PC-1 > `wget 192.168.2.1` (WiFi panel), `wget http://iot-panel` (IoT yönetim)

**Beklenen Sonuç:** Sensörler otomatik kurallarla aktüatörleri kontrol eder, sera ortamı izlenir.

---

### Proje 16: Router SSH (1 PC + 1 Router)

**Hedef:** Router üzerinde SSH yapılandırarak güvenli uzaktan yönetim sağlamak.

**Cihazlar:** 1 Router (R1), 1 PC (PC-1)

**Bağlantılar:** PC-1 Eth0 → R1 Gi0/0 (Straight)

**Adımlar:**
1. R1: `hostname R1`, `ip domain-name lab.local`
2. `crypto key generate rsa modulus 1024`, `ip ssh version 2`
3. `username admin privilege 15 secret 1234`, `enable secret 123`
4. `line vty 0 4`, `login local`, `transport input ssh`
5. `interface gi0/0`, `ip address 192.168.1.150 255.255.255.0`, `no shutdown`
6. PC-1: IP 192.168.1.10/24, GW 192.168.1.150

**Test:** PC-1 CMD > `ssh admin@192.168.1.150` (şifre: 1234), R1 > `show ssh`

**Beklenen Sonuç:** SSH ile router'a güvenli bağlantı sağlanır.

---

### Proje 17: Router DHCP (2 PC + 1 Switch + 1 Router)

**Hedef:** Router DHCP sunucusu üzerinden PC'lere otomatik IP ataması yapmak.

**Cihazlar:** 1 Router (R1), 1 Switch (SW1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW1 Fa0/2, SW1 Gi0/1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. R1 Gi0/0: `ip address 192.168.10.1 255.255.255.0`, `no shutdown`
2. R1: `ip dhcp pool LAN`, `network 192.168.10.0 255.255.255.0`, `default-router 192.168.10.1`, `dns-server 8.8.8.8`
3. SW1: switchport mode access tüm portlara
4. PC-1 ve PC-2: IP mode DHCP

**Test:** PC-1 CMD > `ipconfig /renew`, R1 > `show ip dhcp binding`

**Beklenen Sonuç:** PC'ler DHCP'den 192.168.10.100+ aralığında IP alır.

---

### Proje 18: Firewall Temel (ICMP Bloke)

**Hedef:** Firewall cihazında ICMP (ping) trafiğini engelleyip diğer tüm trafiğe izin vermek.

**Cihazlar:** 1 Firewall (FW-1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → FW-1 Gi0/0, FW-1 Gi0/1 → PC-2 Eth0

**Adımlar:**
1. FW-1 Kural 1 (ICMP Deny): source `*`, target `*`, protocol ICMP, action DENY
2. FW-1 Kural 2 (ANY Allow): source `*`, target `*`, protocol ANY, action ALLOW
3. PC-1: IP 192.168.1.10/24, GW 192.168.1.1; PC-2: IP 192.168.1.20/24, GW 192.168.1.1

**Test:** PC-1 > `ping 192.168.1.20` (BAŞARISIZ), PC-1 > `wget 192.168.1.20` (BAŞARILI)

**Beklenen Sonuç:** Ping engellenir, HTTP/HTTPS gibi diğer protokoller çalışır.

---

### Proje 19: MAC Tablo Öğrenme

**Hedef:** Switch MAC adres tablosunun dinamik öğrenme özelliğini incelemek.

**Cihazlar:** 1 Switch (SW1), 1 Router (ROUTER-2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → Switch Fa0/1, PC-2 Eth0 → Switch Fa0/2, Router Gi0/0 → Switch Fa0/3

**Adımlar:**
1. PC-1: IP 192.168.1.10/24, MAC 00-e0-f7-01-a1-b1
2. PC-2: IP 192.168.1.20/24, MAC 97-31-e5-97-a7-03
3. Router: IP 192.168.1.254/24
4. Switch: tüm portları access mode, VLAN 1

**Test:** Switch > `show mac address-table`, PC-1 > `ping 192.168.1.20`, ardından Switch > `show mac address-table`

**Beklenen Sonuç:** Switch önce MAC tablosunu öğrenir, ping sonrası MAC adreslerini tabloda görürsünüz.

---

### Proje 20: DNS ve HTTP Test

**Hedef:** DNS name resolution ve HTTP web erişimini test etmek.

**Cihazlar:** 1 Switch (SWITCH-1), 1 Server (PC-DNS/HTTP-10.0.0.10), 1 Client (PC-CLIENT)

**Bağlantılar:** Server → Switch Fa0/1, Client → Switch Fa0/10, Router → Switch Fa0/11

**Adımlar:**
1. Sunucuya DNS ve HTTP servisleri yapılandırın (192.168.1.10)
2. a10.com domain'ini sunucu IP'sine çözümleyecek DNS kaydı ekleyin
3. Client PC: IP 192.168.1.100/24, DNS 192.168.1.10

**Test:** Client > `wget 192.168.1.10`, Client > `wget a10.com`, Client > `nslookup a10.com`

**Beklenen Sonuç:** HTTP web sayfasına erişilir, DNS isim çözümlemesi başarılı olur.

---

### Proje 21: ARP ve MAC Tablo Çalışması

**Hedef:** ARP ve MAC adres tablosu arasındaki ilişkiyi incelemek.

**Cihazlar:** 1 Switch (SWITCH-1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 → Switch Fa0/1, PC-2 → Switch Fa0/2

**Adımlar:**
1. PC-1: IP 192.168.1.10/24; PC-2: IP 192.168.1.20/24
2. Switch: tüm portlar access mode VLAN 1

**Test:** PC-1 > `arp -a` (ping öncesi), PC-1 > `ping 192.168.1.20`, PC-1 > `arp -a` (ping sonrası), Switch > `show mac address-table`

**Beklenen Sonuç:** Ping öncesi ARP boştur; ping sonrası ARP tablosunda hedef IP-MAC eşleşmesi görülür. Switch MAC tablosunda her iki port için MAC kaydı oluşur.

---

### Proje 22: IP Yapılandırma Laboratuvarı

**Hedef:** IP yapılandırmasının ağ bağlantısı üzerindeki etkisini incelemek.

**Cihazlar:** 1 Switch (SWITCH), 2 PC (PC1, PC2), 1 PC (PC3)

**Bağlantılar:** PC1→Switch Fa0/1, PC2→Switch Fa0/2, PC3→Switch Fa0/3

**Adımlar:**
1. PC1: IP 192.168.1.10/24
2. PC2: IP 192.168.1.20/24
3. PC3: IP 192.168.2.30/24 (farklı subnet)
4. Switch: tüm portlar access VLAN 1

**Test:** PC1 > `ping 192.168.1.20` (BAŞARILI), PC1 > `ping 192.168.2.30` (BAŞARISIZ)

**Beklenen Sonuç:** Aynı subnet'teki PC'ler haberleşir, farklı subnet'teki PC'ye erişilemez (router olmadan).

---

### Proje 23: DHCP Dağıtım Senaryosu

**Hedef:** DHCP otomatik IP dağıtımı ile manuel yapılandırmayı karşılaştırmak.

**Cihazlar:** 1 Router (DHCP server), 1 Switch, 3 PC (PC1, PC2, PC3)

**Bağlantılar:** PC1→Switch Fa0/1, PC2→Switch Fa0/2, PC3→Switch Fa0/3, Switch Gi0/1→Router Gi0/0

**Adımlar:**
1. Router: DHCP havuzu yapılandırın (192.168.10.100-200 aralığı)
2. PC1 ve PC2: IP mode DHCP
3. PC3: IP 192.168.10.50/24 (manuel statik)
4. Switch: tüm portlar access mode

**Test:** PC1 > `ipconfig /renew`, PC2 > `ipconfig /renew`, Router > `show ip dhcp binding`

**Beklenen Sonuç:** PC1 ve PC2 otomatik IP alır, PC3 statik IP ile çalışır. DHCP binding tablosunda atanan IP'ler görülür.

---

### Proje 24: 2 Switch Trunk Uygulaması

**Hedef:** İki switch arasında trunk bağlantısı ile VLAN trafiğini taşımak.

**Cihazlar:** 2 Switch (SW-1, SW-2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW-1 Fa0/1, PC-2→SW-2 Fa0/1, SW-1 Gi0/1→SW-2 Gi0/1 (Crossover)

**Adımlar:**
1. Her iki switch'te de VLAN 100 ve VLAN 200 oluşturun
2. SW-1 Fa0/1: `switchport mode access`, `switchport access vlan 100`
3. SW-2 Fa0/1: `switchport mode access`, `switchport access vlan 200`
4. Her iki switch'te Gi0/1: `switchport mode trunk`
5. PC-1: IP 192.168.100.10/24, VLAN 100; PC-2: IP 192.168.200.10/24, VLAN 200

**Test:** `show vlan brief`, `show interfaces trunk`

**Beklenen Sonuç:** Trunk bağlantısı üzerinden VLAN 100 ve 200 trafiği geçer, PC'ler farklı VLAN'da olduğu için ping başarısız olur.

---

### Proje 25: Native VLAN Yapılandırması

**Hedef:** İki switch arasında native VLAN 99 trunk bağlantısı yapılandırmak.

**Cihazlar:** 2 Switch (SW1, SW2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW2 Fa0/1, SW1 Fa0/24→SW2 Fa0/24 (Crossover)

**Adımlar:**
1. Her iki switch'te VLAN 99 (`NativeVLAN`) oluşturun
2. SW1/SW2 Fa0/1: `switchport mode access`, `switchport access vlan 99`
3. SW1/SW2 Fa0/24: `switchport mode trunk`, `switchport trunk native vlan 99`
4. PC-1: IP 192.168.99.10/24; PC-2: IP 192.168.99.11/24

**Test:** `show interfaces trunk`, PC-1 > `ping 192.168.99.11`

**Beklenen Sonuç:** Native VLAN 99 üzerinden etiketsiz trafik geçer, PC'ler birbirine ping atabilir.

---

### Proje 26: STP 3 Switch PVST

**Hedef:** PVST ile her VLAN için farklı root bridge belirleyerek yük dengelemesi sağlamak.

**Cihazlar:** 3 L3 Switch (SW1, SW2, SW3), 9 PC

**Bağlantılar:** SW'ler arası trunk (triangular), her switch'e 3 PC (VLAN 1,10,20)

**Adımlar:**
1. Her switch'te VLAN 1, 10, 20 oluşturun
2. Trunk portları (`gi1/0/1-2`) yapılandırın
3. SW1: `spanning-tree vlan 1 priority 24576` (VLAN1 root)
4. SW2: `spanning-tree vlan 10 priority 24576` (VLAN10 root)
5. SW3: `spanning-tree vlan 20 priority 24576` (VLAN20 root)
6. SVI'ları ve PC portlarını atayın

**Test:** `show spanning-tree vlan 1`, `show spanning-tree vlan 10`, `show spanning-tree vlan 20`, tüm PC'ler arası ping

**Beklenen Sonuç:** Her VLAN farklı root kullanır, PVST ile yük dengelemesi sağlanır.

---

### Proje 27: 2 L3 Switch VLAN (AG1/AG2)

**Hedef:** İki L3 switch arasında trunk bağlantısı ile VLAN 10 ve 20 arası routing sağlamak.

**Cihazlar:** 2 L3 Switch (Switch2, Switch4), 8 PC

**Bağlantılar:** Switch2 Gi1/0/5 → Switch4 Gi1/0/5 (Crossover trunk), her switch'e 4 PC

**Adımlar:**
1. Switch2: `ip routing`, VLAN 10 (`AG1`) ve 20 (`AG2`) oluşturun
2. SVI'lar: `interface vlan 10`, `ip address 192.168.10.1`; `interface vlan 20`, `ip address 192.168.20.1`
3. Trunk port: `interface gi1/0/5`, `switchport trunk encapsulation dot1q`, `switchport mode trunk`
4. Switch4'te aynı konfigürasyonu yapın
5. PC'ler: VLAN 10 → IP 192.168.10.x, VLAN 20 → IP 192.168.20.x

**Test:** Tüm PC'ler arası ping

**Beklenen Sonuç:** İki L3 switch arasında trunk, tüm PC'ler birbirine ping atabilir.

---

### Proje 28: L3 Switch Statik Yönlendirme

**Hedef:** Multilayer switch'ler ve router arasında statik rotalarla ağlar arası iletişim sağlamak.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC

**Bağlantılar:** PC0→SW0→ML1 Gi1/0/2, ML1 Gi1/0/1→R3 Gi0/0, R3 Gi0/1→ML2 Gi1/0/1, ML2 Gi1/0/2→SW1→PC4

**Adımlar:**
1. ML1: `ip routing`, Gi1/0/1 `no switchport`, IP 10.0.0.1/8; Gi1/0/2 IP 192.168.1.1/24; `ip route 192.168.2.0 255.255.255.0 10.0.0.2`
2. R3: Gi0/0 IP 10.0.0.2/8; Gi0/1 IP 20.0.0.1/8; `ip route 192.168.1.0 255.255.255.0 10.0.0.1`; `ip route 192.168.2.0 255.255.255.0 20.0.0.2`
3. ML2: `ip routing`, Gi1/0/1 IP 20.0.0.2/8; Gi1/0/2 IP 192.168.2.1/24; `ip route 192.168.1.0 255.255.255.0 20.0.0.1`
4. PC0: IP 192.168.1.10/24, GW 192.168.1.1; PC4: IP 192.168.2.10/24, GW 192.168.2.1

**Test:** PC0 > `ping 192.168.2.10`, `show ip route`

**Beklenen Sonuç:** L3 switch'ler ve router statik rotalarla iki farklı ağ arasında iletişim sağlar.

---

### Proje 29: RIP Dinamik Yönlendirme

**Hedef:** RIP dinamik yönlendirme protokolü ile otomatik route öğrenimi sağlamak.

**Cihazlar:** 2 L3 Switch (ML0, ML1), 2 L2 Switch, 4 PC

**Bağlantılar:** PC0/PC1→SW0-L2→ML0 Gi1/0/23, ML0 Gi1/0/24→ML1 Gi1/0/24 (Crossover), ML1 Gi1/0/23→SW3-L2→PC2/PC3

**Adımlar:**
1. ML0: `ip routing`, Gi1/0/23 IP 192.168.1.1/24, Gi1/0/24 IP 192.168.2.1/24; `router rip`, `network 192.168.1.0`, `network 192.168.2.0`
2. ML1: `ip routing`, Gi1/0/24 IP 192.168.2.2/24, Gi1/0/23 IP 192.168.3.1/24; `router rip`, `network 192.168.2.0`, `network 192.168.3.0`
3. PC0/PC1: IP 192.168.1.x/24, GW 192.168.1.1; PC2/PC3: IP 192.168.3.x/24, GW 192.168.3.1

**Test:** PC0 > `ping 192.168.3.10`, `show ip route` (RIP rotalarını gör)

**Beklenen Sonuç:** RIP ile ağlar otomatik öğrenilir, PC'ler birbirine ping atabilir.

---

### Proje 30: ACL Standard

**Hedef:** Standard ACL ile 192.168.1.0/24 ağından gelen trafiği engellemek.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC (Proje 28 topolojisi)

**Bağlantılar:** Proje 28 topolojisinin aynısı

**Adımlar:**
1. Proje 28'deki statik yönlendirme konfigürasyonunu uygulayın
2. R3 üzerinde: `access-list 10 deny 192.168.1.0 0.0.0.255`, `access-list 10 permit any`
3. ACL'i uygulayın: `interface gi0/1`, `ip access-group 10 out`
4. PC0: IP 192.168.1.10/24; PC4: IP 192.168.2.10/24

**Test:** PC0 > `ping 192.168.2.10` (BAŞARISIZ), `show access-lists`

**Beklenen Sonuç:** 192.168.1.0/24 ağından gelen trafik engellenir, diğer ağlara izin verilir.

---

### Proje 31: ACL Extended

**Hedef:** Extended ACL ile sadece HTTP (port 80) trafiğine izin verip diğer tüm trafiği engellemek.

**Cihazlar:** 1 Firewall, 2 PC (PC-1, PC-2) (Proje 18 topolojisi)

**Bağlantılar:** PC-1→FW-1→PC-2 (Proje 18 ile aynı)

**Adımlar:**
1. FW-1 üzerinde named extended ACL oluşturun: `ip access-list extended WEB-FILTER`
2. `permit tcp any any eq 80`, `deny ip any any`
3. ACL'i arayüze uygulayın
4. PC-1: IP 192.168.1.10/24; PC-2: IP 192.168.1.20/24

**Test:** PC-1 > `wget 192.168.1.20` (BAŞARILI), PC-1 > `ping 192.168.1.20` (BAŞARISIZ)

**Beklenen Sonuç:** Sadece HTTP (80) trafiğine izin verilir, ping ve diğer protokoller engellenir.

---

### Proje 32: NAT Static

**Hedef:** Static NAT ile iç ağdaki bir cihazı birebir dış IP'ye eşlemek.

**Cihazlar:** 1 Router (R1), 1 Switch, 2 PC (Proje 17 topolojisi)

**Bağlantılar:** PC-1→SW1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. Proje 17'deki DHCP konfigürasyonunu uygulayın
2. R1'de: `ip nat inside source static 192.168.1.10 203.0.113.10`
3. `interface gi0/0`, `ip nat inside`; `interface gi0/1`, `ip nat outside`
4. PC-1: IP 192.168.1.10/24

**Test:** `show ip nat translations`

**Beklenen Sonuç:** 192.168.1.10 → 203.0.113.10 static NAT çevirisi aktiftir.

---

### Proje 33: NAT Dynamic

**Hedef:** NAT havuzu kullanarak dinamik adres çevirisi yapmak.

**Cihazlar:** 1 Router (R1), 1 Switch, 2 PC (Proje 17 topolojisi)

**Bağlantılar:** PC-1→SW1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. Proje 17'deki DHCP konfigürasyonunu uygulayın
2. R1'de: `ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0`
3. `access-list 1 permit 192.168.1.0 0.0.0.255`
4. `ip nat inside source list 1 pool OUT`
5. `interface gi0/0`, `ip nat inside`; `interface gi0/1`, `ip nat outside`

**Test:** PC-1'den dışarıya trafik gönderin, `show ip nat translations`

**Beklenen Sonuç:** İç ağdaki cihazlar NAT havuzundaki adreslere dinamik olarak çevrilir.

---

### Proje 34: NAT PAT

**Hedef:** PAT (NAT Overload) ile birden çok iç cihazı tek bir dış IP'ye yönlendirmek.

**Cihazlar:** 1 Router (R1), 1 Switch, 2 PC (Proje 17 topolojisi)

**Bağlantılar:** PC-1→SW1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. Proje 17'deki DHCP konfigürasyonunu uygulayın
2. R1'de: `access-list 1 permit 192.168.1.0 0.0.0.255`
3. `ip nat inside source list 1 interface gi0/0 overload`
4. `interface gi0/0`, `ip nat inside`; `interface gi0/1`, `ip nat outside`

**Test:** PC'lerden trafik gönderin, `show ip nat translations`

**Beklenen Sonuç:** Tüm iç cihazlar tek bir dış IP'ye (gi0/0) port numaraları ile çevrilir.

---

### Proje 35: HSRP Redundancy

**Hedef:** HSRP ile varsayılan ağ geçidi yedekliliği sağlamak.

**Cihazlar:** 2 L3 Switch (Switch2, Switch4), 8 PC (Proje 27 topolojisi)

**Bağlantılar:** Proje 27 topolojisi

**Adımlar:**
1. Proje 27'deki L3 switch konfigürasyonunu uygulayın
2. Switch2 VLAN 10: `standby 1 ip 192.168.10.254`, `standby 1 priority 110`, `standby 1 preempt`
3. Switch4 VLAN 10: `standby 1 ip 192.168.10.254`
4. Switch2 VLAN 20: `standby 2 ip 192.168.20.254`, `standby 2 priority 110`, `standby 2 preempt`
5. Switch4 VLAN 20: `standby 2 ip 192.168.20.254`
6. PC'ler: GW 192.168.10.254 veya 192.168.20.254

**Test:** `show standby`, Switch2'yi kapatıp Switch4'ün devralmasını gözlemleyin

**Beklenen Sonuç:** Switch2 aktif HSRP router'dır; arızalanırsa Switch4 otomatik devralır.

---

### Proje 36: OSPF Multi-Area 1

**Hedef:** Area 0 ve Area 10 ile çok alanlı OSPF yapılandırmak.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC (Proje 28 topolojisi)

**Bağlantılar:** Proje 28 topolojisi

**Adımlar:**
1. ML1: `router ospf 1`, `network 10.0.0.0 0.0.0.255 area 0`, `network 192.168.1.0 0.0.0.255 area 10`
2. R3: `router ospf 1`, `network 10.0.0.0 0.0.0.255 area 0`, `network 20.0.0.0 0.0.0.255 area 0`
3. ML2: `router ospf 1`, `network 20.0.0.0 0.0.0.255 area 0`, `network 192.168.2.0 0.0.0.255 area 20`
4. Statik rotaları kaldırın (OSPF dinamik öğrenecek)

**Test:** `show ip route`, `show ip ospf neighbor`, PC0 > `ping 192.168.2.10`

**Beklenen Sonuç:** OSPF ile rotalar dinamik öğrenilir, farklı alanlardaki PC'ler haberleşir.

---

### Proje 37: OSPF Multi-Area 2

**Hedef:** ABR üzerinden farklı OSPF alanlarını omurgaya bağlamak ve stub alan yapılandırmak.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC (Proje 28 topolojisi)

**Bağlantılar:** Proje 28 topolojisi

**Adımlar:**
1. Proje 36'daki OSPF konfigürasyonunu uygulayın
2. ML2'de: `router ospf 1`, `area 20 stub`
3. R3'te (ABR): `area 10 range 10.10.0.0 255.255.0.0` (route summarization)
4. ML1'de: `area 10 stub` (eğer ML1 Area 10'a atanmışsa)

**Test:** `show ip route`, `show ip ospf`, PC0 > `ping 192.168.2.10`

**Beklenen Sonuç:** Stub alan dış rotaları sınırlar, ABR route summarization yapar.

---

### Proje 38: EIGRP Basic

**Hedef:** Temel EIGRP komutları ile dinamik yönlendirme kurulumu yapmak.

**Cihazlar:** 2 L3 Switch (ML0, ML1), 2 L2 Switch, 4 PC (Proje 29 topolojisi)

**Bağlantılar:** Proje 29 topolojisi

**Adımlar:**
1. ML0: `router eigrp 100`, `network 192.168.1.0 0.0.0.255`, `network 192.168.2.0 0.0.0.255`, `no auto-summary`
2. ML1: `router eigrp 100`, `network 192.168.2.0 0.0.0.255`, `network 192.168.3.0 0.0.0.255`, `no auto-summary`
3. L3 switch'lerde routed portları konfigüre edin

**Test:** `show ip route`, `show ip eigrp neighbors`, PC0 > `ping 192.168.3.10`

**Beklenen Sonuç:** EIGRP ile komşuluk kurulur, rotalar otomatik öğrenilir.

---

### Proje 39: IPv6 Gelişmiş Lab (DHCPv6 & OSPFv3)

**Hedef:** IPv6 adresleme, DHCPv6 ve OSPFv3 ile çift yığın (dual-stack) ağ kurmak.

**Cihazlar:** 2 Router (R1, R2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→R1 Gi0/0, R1 Gi0/1→R2 Gi0/1 (Crossover), R2 Gi0/0→PC-2

**Adımlar:**
1. Her iki router'da: `ipv6 unicast-routing`
2. R1 Gi0/0: `ipv6 address 2001:DB8:1::1/64`; Gi0/1: `ipv6 address 2001:DB8:AC::1/64`
3. R2 Gi0/0: `ipv6 address 2001:DB8:2::1/64`; Gi0/1: `ipv6 address 2001:DB8:AC::2/64`
4. DHCPv6 havuzları oluşturun (R1: pool LAN, prefix 2001:db8:1::/64)
5. OSPFv3: `ipv6 router ospf 1`, `router-id` atayın, `interface` üzerinden etkinleştirin
6. PC-1: IPv6 2001:DB8:1::10/64; PC-2: IPv6 2001:DB8:2::20/64

**Test:** PC-1 > `ping 2001:DB8:2::20`, `show ipv6 route`

**Beklenen Sonuç:** IPv6 adresleme, DHCPv6 ve OSPFv3 ile çift yığın ağ çalışır durumdadır.

---

### Proje 40: Tüm Servisler Laboratuvarı

**Hedef:** DNS, HTTP, DHCP, FTP, MAIL ve NTP servislerinin bir arada bulunduğu kapsamlı laboratuvar kurmak.

**Cihazlar:** 1 Switch (SW1), 6 PC (PC-DNS, PC-HTTP, PC-DHCP, PC-FTP, PC-MAIL, PC-NTP)

**Bağlantılar:** Tüm PC'ler SW1'e bağlı (Fa0/1-6)

**Adımlar:**
1. PC-DNS (192.168.1.10): DNS servisi, kayıtlar: www.lab.local→1.20, ftp.lab.local→1.40, mail.lab.local→1.50
2. PC-HTTP (192.168.1.20): HTTP web sunucusu
3. PC-DHCP (192.168.1.30): DHCP havuzu, IP 192.168.1.100-150
4. PC-FTP (192.168.1.40): FTP sunucusu (welcome.txt, data.csv)
5. PC-MAIL (192.168.1.50): Mail sunucusu (admin@lab.local)
6. PC-NTP (192.168.1.60): NTP zaman sunucusu
7. Tüm PC'ler DNS: 192.168.1.10

**Test:** PC'den `nslookup www.lab.local`, `wget www.lab.local`, Switch > `ntp server 192.168.1.60`, `show clock`

**Beklenen Sonuç:** Tüm ağ servisleri (DNS, HTTP, FTP, MAIL, NTP, DHCP) çalışır durumdadır.

---

**Son Güncelleme:** Haziran 2026
**Versiyon:** 1.9.3

\n\n<div style="page-break-after: always;"></div>\n\n
# 🎓 Rehberli Ders Adımları (Guided Steps)

### Adım 1: Bilgisayar Ekle
**Açıklama:** Araç çubuğundan PC simgesine tıklayarak topolojiye bir bilgisayar ekleyin.

**İpucu:** Üst menüdeki bilgisayar simgesine bir kez tıklayın.

---

### Adım 2: Switch Ekle
**Açıklama:** Şimdi ağımıza bir Switch (anahtar) ekleyelim.

**İpucu:** Yeşil renkli Switch simgesine tıklayın.

---

### Adım 3: Cihazları Bağla
**Açıklama:** Düz (Straight) kabloyu seçin ve PC ile Switch arasında bağlantı kurun.

**İpucu:** Kabloyu seçin, PC'ye tıklayın (Eth0), ardından Switch'e tıklayın (Fa0/1).

---

### Adım 4: CMD'yi Aç
**Açıklama:** Bilgisayara çift tıklayarak terminali açın ve "Command Prompt" (Komut İstemi) uygulamasına girin.

**İpucu:** PC üzerine çift tıklayın, ardından CMD simgesine basın.

---

### Adım 5: IP Yapılandırmasını Gör
**Açıklama:** Bilgisayarın IP adresini görmek için "ipconfig" komutunu yazın.

**İpucu:** Terminalde "ipconfig" yazıp Enter'a basın.

---

### Adım 6: Yardım Al
**Açıklama:** Kullanabileceğiniz tüm komutları görmek için "help" yazın.

**İpucu:** "help" yazıp Enter'a basın.

---

### Adım 7: Switch CLI Aç
**Açıklama:** Switch cihazına çift tıklayarak CLI (Komut Satırı Arayüzü) ekranına girin.

**İpucu:** Switch-1 üzerine çift tıklayın.

---

### Adım 8: Ayrıcalıklı Mod
**Açıklama:** "enable" komutu ile ayrıcalıklı moda geçin. Bu modda ayarları görebilirsiniz.

**İpucu:** "enable" yazın.

---

### Adım 9: Yapılandırma Modu
**Açıklama:** Cihaz ayarlarını değiştirmek için "configure terminal" komutunu kullanın.

**İpucu:** "conf t" yazın.

---

### Adım 10: PC'yi Switch'e Bağla
**Açıklama:** PC-1 cihazını Switch-1'e kablo ile bağlayın

**İpucu:** Straight-Through kablo seçin. PC-1 Eth0 -> Switch-1 Fa0/1

---

### Adım 11: Switch Terminalini Aç
**Açıklama:** Switch cihazına çift tıklayarak terminalini açın

**İpucu:** Switch-1 üzerine çift tıklayın.

---

### Adım 12: Enable Moduna Geç
**Açıklama:** Ayrıcalıklı moda geçmek için enable komutunu kullanın

**İpucu:** "enable" yazıp Enter'a basın.

---

### Adım 13: Yapılandırma Moduna Geç
**Açıklama:** Global yapılandırma moduna geçmek için conf t komutunu kullanın

**İpucu:** "conf t" yazın.

---

### Adım 14: Hostname Değiştir
**Açıklama:** Switch'e SW-Lab ismini verin

**İpucu:** "hostname SW-Lab" yazın.

---

### Adım 15: Port Aktifleştir
**Açıklama:** FastEthernet 0/1 portunu aktif hale getirin

**İpucu:** int fa0/1 -> no shutdown

---

### Adım 16: Yapılandırmayı Kaydet
**Açıklama:** Yaptığınız değişiklikleri kaydedin

**İpucu:** exit yapıp "write memory" yazın.

---

### Adım 17: Fiziksel Bağlantıyı Kurma
**Açıklama:** İki bilgisayarı switch'e bağlayın

**İpucu:** PC-1 -> Fa0/1, PC-2 -> Fa0/2 (Düz kablo)

---

### Adım 18: PC0 IP Yapılandırması
**Açıklama:** PC0'a 192.168.1.10 IP adresi atayın

**İpucu:** Desktop > IP Config > 192.168.1.10

---

### Adım 19: PC1 IP Yapılandırması
**Açıklama:** PC1'e 192.168.1.20 IP adresi atayın

**İpucu:** Desktop > IP Config > 192.168.1.20

---

### Adım 20: Ping Testi
**Açıklama:** PC0'dan PC1'e ping atın

**İpucu:** PC0 CMD > "ping 192.168.1.20"

---

### Adım 21: Terminali Aç
**Açıklama:** Switch terminalini açın

**İpucu:** Switch üzerine çift tıklayın.

---

### Adım 22: Enable Modu
**Açıklama:** Ayrıcalıklı moda geçin

**İpucu:** "enable" yazın.

---

### Adım 23: Yapılandırma Modu
**Açıklama:** Global yapılandırma moduna geçin

**İpucu:** "conf t" yazın.

---

### Adım 24: VLAN 10 Oluştur
**Açıklama:** VLAN 10'u oluşturun

**İpucu:** "vlan 10" yazın.

---

### Adım 25: VLAN İsimlendir
**Açıklama:** VLAN 10'a SALES ismini verin

**İpucu:** "name SALES" yazın.

---

### Adım 26: Arayüz Seçimi
**Açıklama:** FastEthernet 0/1 arayüzüne girin

**İpucu:** "int fa0/1" yazın.

---

### Adım 27: VLAN Atama
**Açıklama:** Arayüzü VLAN 10'a atayın

**İpucu:** "switchport access vlan 10" yazın.

---

### Adım 28: Terminali Aç
**Açıklama:** Router terminalini açın

**İpucu:** Router üzerine çift tıklayın.

---

### Adım 29: Enable Modu
**Açıklama:** Ayrıcalıklı moda geçin

**İpucu:** "enable" yazın.

---

### Adım 30: Yapılandırma Modu
**Açıklama:** Global yapılandırma moduna geçin

**İpucu:** "conf t" yazın.

---

### Adım 31: Arayüz Seçimi
**Açıklama:** GigabitEthernet 0/0 arayüzüne girin

**İpucu:** "int gi0/0" yazın.

---

### Adım 32: IP Adresi Ata
**Açıklama:** Arayüze 192.168.1.1 IP adresi atayın

**İpucu:** "ip address 192.168.1.1 255.255.255.0" yazın.

---

### Adım 33: Arayüzü Aç
**Açıklama:** Arayüzü aktif hale getirin

**İpucu:** "no shutdown" yazın.

---

### Adım 34: Arayüzden Çık
**Açıklama:** Arayüz yapılandırmasından çıkın

**İpucu:** "exit" yazın.

---

### Adım 35: Havuz Oluştur
**Açıklama:** LAN isminde bir DHCP havuzu oluşturun

**İpucu:** "ip dhcp pool LAN" yazın.

---

### Adım 36: Ağ Tanımla
**Açıklama:** Dağıtılacak ağ adresini tanımlayın

**İpucu:** "network 192.168.1.0 255.255.255.0" yazın.

---

### Adım 37: Varsayılan Ağ Geçidi
**Açıklama:** Havuz için varsayılan ağ geçidini tanımlayın

**İpucu:** "default-router 192.168.1.1" yazın.

---

### Adım 38: R1 Terminali
**Açıklama:** R1 router terminalini açın

**İpucu:** R1 üzerine çift tıklayın.

---

### Adım 39: Enable Modu
**Açıklama:** Ayrıcalıklı moda geçin

**İpucu:** "enable" yazın.

---

### Adım 40: Yapılandırma Modu
**Açıklama:** Global yapılandırma moduna geçin

**İpucu:** "conf t" yazın.

---

### Adım 41: R1 Rota Ekle
**Açıklama:** 192.168.2.0 ağına giden rotayı ekleyin

**İpucu:** "ip route 192.168.2.0 255.255.255.0 10.0.0.2" yazın.

---

### Adım 42: R2 Terminali
**Açıklama:** R2 router terminalini açın

**İpucu:** R2 üzerine çift tıklayın.

---

### Adım 43: R2 Rota Ekle
**Açıklama:** 192.168.1.0 ağına giden rotayı ekleyin

**İpucu:** "ip route 192.168.1.0 255.255.255.0 10.0.0.1" yazın.

---

### Adım 44: Terminali Aç
**Açıklama:** Switch terminalini açın

**İpucu:** Switch üzerine çift tıklayın.

---

### Adım 45: Enable Modu
**Açıklama:** Ayrıcalıklı moda geçin

**İpucu:** "enable" yazın.

---

### Adım 46: Yapılandırma Modu
**Açıklama:** Global yapılandırma moduna geçin

**İpucu:** "conf t" yazın.

---

### Adım 47: Arayüz Seçimi
**Açıklama:** FastEthernet 0/1 arayüzüne girin

**İpucu:** "int fa0/1" yazın.

---

### Adım 48: Erişim Modu
**Açıklama:** Portu access moduna alın

**İpucu:** "switchport mode access" yazın.

---

### Adım 49: Güvenliği Aç
**Açıklama:** Port güvenliğini etkinleştirin

**İpucu:** "switchport port-security" yazın.

---

### Adım 50: Sticky MAC
**Açıklama:** MAC adreslerini kalıcı öğrenmeyi açın

**İpucu:** "switchport port-security mac-address sticky" yazın.

---

### Adım 51: Maksimum MAC
**Açıklama:** Maksimum 1 MAC adresine izin verin

**İpucu:** "switchport port-security maximum 1" yazın.

---

### Adım 52: Terminali Aç
**Açıklama:** Router terminalini açın

**İpucu:** Router üzerine çift tıklayın.

---

### Adım 53: Enable Modu
**Açıklama:** Ayrıcalıklı moda geçin

**İpucu:** "enable" yazın.

---

### Adım 54: Yapılandırma Modu
**Açıklama:** Global yapılandırma moduna geçin

**İpucu:** "conf t" yazın.

---

### Adım 55: RIP Başlat
**Açıklama:** RIP yönlendirme protokolünü başlatın

**İpucu:** "router rip" yazın.

---

### Adım 56: RIP Versiyon
**Açıklama:** Versiyon 2'yi seçin

**İpucu:** "version 2" yazın.

---

### Adım 57: Ağ 1 Ekle
**Açıklama:** 192.168.1.0 ağını ekleyin

**İpucu:** "network 192.168.1.0" yazın.

---

### Adım 58: Auto-Summary Kapat
**Açıklama:** Otomatik özetlemeyi kapatın

**İpucu:** "no auto-summary" yazın.

---

### Adım 59: Sunucu Paneli
**Açıklama:** Sunucu cihazını açın

**İpucu:** Server-Web üzerine çift tıklayın.

---

### Adım 60: HTTP Servisi
**Açıklama:** HTTP servisini aktif edin

**İpucu:** HTTP sekmesinden "On" seçin.

---

### Adım 61: DNS Sunucu
**Açıklama:** DNS sunucusunu açın

**İpucu:** DNS-Server üzerine çift tıklayın.

---

### Adım 62: DNS Servisi
**Açıklama:** DNS servisini aktif edin

**İpucu:** DNS sekmesinden "On" seçin.

---

### Adım 63: DNS Kaydı
**Açıklama:** Kayıt ekleyin (www.lab.com -> 192.168.1.10)

**İpucu:** İsim ve IP girip "Add" basın.

---

### Adım 64: Enable Komutu
**Açıklama:** Ayrıcalıklı moda geçmek için enable komutunu kullanın

**İpucu:** switch-1: enable yazın

---

### Adım 65: Disable Komutu
**Açıklama:** Kullanıcı moduna dönmek için disable komutunu kullanın

**İpucu:** switch-1: disable yazın

---

### Adım 66: Help Komutu
**Açıklama:** Yardım sistemini kullanın

**İpucu:** switch-1: help yazın

---

### Adım 67: Konfigürasyonu Görüntüle
**Açıklama:** show running-config komutunu kullanın

**İpucu:** switch-1: show running-config yazın

---

### Adım 68: Konfigürasyonu Kaydet
**Açıklama:** write memory komutunu kullanın

**İpucu:** switch-1: write memory yazın

---

### Adım 69: Hostname Ayarla
**Açıklama:** Switch'e SW-Lab ismini verin

**İpucu:** switch-1: hostname SW-Lab yazın

---

### Adım 70: Banner Ayarla
**Açıklama:** Banner komutunu kullanın

**İpucu:** switch-1: banner motd yazın

---

### Adım 71: Enable Secret Ayarla
**Açıklama:** Enable secret komutunu kullanın

**İpucu:** switch-1: enable secret password yazın

---

### Adım 72: DNS Sunucusu Ayarla
**Açıklama:** DNS sunucusu komutunu kullanın

**İpucu:** switch-1: ip name-server 8.8.8.8 yazın

---

### Adım 73: Saat Dilimi Ayarla
**Açıklama:** Saat dilimi komutunu kullanın

**İpucu:** switch-1: clock timezone UTC 0 yazın

---

### Adım 74: NTP Sunucusu Ayarla
**Açıklama:** NTP sunucusu komutunu kullanın

**İpucu:** switch-1: ntp server 192.168.1.1 yazın

---

### Adım 75: Arayüz Seçimi
**Açıklama:** FastEthernet 0/1 arayüzüne girin

**İpucu:** switch-1: interface fa0/1 yazın

---

### Adım 76: Arayüzü Aktifleştir
**Açıklama:** no shutdown komutu ile arayüzü aktif hale getirin

**İpucu:** switch-1: no shutdown yazın

---

### Adım 77: Port Kapat
**Açıklama:** shutdown komutu ile portu devre dışı bırakın

**İpucu:** switch-1: shutdown yazın

---

### Adım 78: Arayüz Açıklaması
**Açıklama:** Arayüze açıklama metni ekleyin

**İpucu:** switch-1: description LAN-Port yazın

---

### Adım 79: Port Hızı
**Açıklama:** Arayüz hızını 100 Mbps olarak ayarlayın

**İpucu:** switch-1: speed 100 yazın

---

### Adım 80: Port Duplexi
**Açıklama:** Arayüz duplex modunu full olarak ayarlayın

**İpucu:** switch-1: duplex full yazın

---

### Adım 81: Arayüz Aralığı
**Açıklama:** Birden fazla arayüzü aynı anda seçin

**İpucu:** switch-1: interface range fa0/1 - 5 yazın

---

### Adım 82: VLAN Oluştur
**Açıklama:** VLAN 10 oluşturun

**İpucu:** switch-1: vlan 10 yazın

---

### Adım 83: VLAN İsimlendir
**Açıklama:** VLAN'a SALES ismini verin

**İpucu:** switch-1: name SALES yazın

---

### Adım 84: VLAN Atama
**Açıklama:** Arayüzü VLAN 10'a atayın

**İpucu:** switch-1: switchport access vlan 10 yazın

---

### Adım 85: Trunk Portu
**Açıklama:** fa0/24 için Trunk portu yapılandırın

**İpucu:** switch-1: switchport mode trunk yazın

---

### Adım 86: Trunk İzinli VLAN
**Açıklama:** Trunk üzerinde izinli VLAN'ları belirleyin

**İpucu:** switch-1: switchport trunk allowed vlan 10,20 yazın

---

### Adım 87: Native VLAN
**Açıklama:** Trunk için native VLAN ayarlayın

**İpucu:** switch-1: switchport trunk native vlan 99 yazın

---

### Adım 88: Port Güvenliği
**Açıklama:** fa0/1 için Port güvenliğini etkinleştirin

**İpucu:** switch-1: switchport port-security yazın

---

### Adım 89: Sticky MAC
**Açıklama:** MAC adreslerini kalıcı öğrenmeyi açın

**İpucu:** switch-1: switchport port-security mac-address sticky yazın

---

### Adım 90: DHCP Snooping Aç
**Açıklama:** DHCP Snooping özelliğini etkinleştirin

**İpucu:** switch-1: ip dhcp snooping yazın

---

### Adım 91: DHCP Snooping VLAN
**Açıklama:** VLAN'lar için DHCP Snooping yapılandırın

**İpucu:** switch-1: ip dhcp snooping vlan 1,10,20 yazın

---

### Adım 92: Hata Kurtarma
**Açıklama:** errdisable recovery özelliğini etkinleştirin

**İpucu:** switch-1: errdisable recovery cause all yazın

---

### Adım 93: GigabitEthernet Arayüz
**Açıklama:** GigabitEthernet 0/1 arayüzüne girin

**İpucu:** switch-1: interface gi0/1 yazın

---

### Adım 94: EtherChannel
**Açıklama:** EtherChannel kanal grubu oluşturun

**İpucu:** switch-1: channel-group 1 mode active yazın

---

### Adım 95: QoS Etkinleştir
**Açıklama:** QoS özelliğini etkinleştirin

**İpucu:** switch-1: mls qos yazın

---

### Adım 96: QoS Trust
**Açıklama:** gi0/1 arayüzde CoS güvenini ayarlayın

**İpucu:** switch-1: mls qos trust cos yazın

---

### Adım 97: EtherChannel Göster
**Açıklama:** EtherChannel durumunu görüntüleyin

**İpucu:** switch-1: show etherchannel summary yazın

---

### Adım 98: Arayüzleri Göster
**Açıklama:** show interfaces komutunu kullanın

**İpucu:** switch-1: show interfaces yazın

---

### Adım 99: VLAN'ları Göster
**Açıklama:** show vlan komutunu kullanın

**İpucu:** switch-1: show vlan yazın

---

### Adım 100: STP Göster
**Açıklama:** show spanning-tree komutunu kullanın

**İpucu:** switch-1: show spanning-tree yazın

---

### Adım 101: STP Modu Ayarla
**Açıklama:** spanning-tree mode komutunu kullanın

**İpucu:** switch-1: spanning-tree mode rapid-pvst yazın

---

### Adım 102: CDP Komşuları Göster
**Açıklama:** show cdp neighbors komutunu kullanın

**İpucu:** switch-1: show cdp neighbors yazın

---

### Adım 103: CDP Aç
**Açıklama:** cdp run komutunu kullanın

**İpucu:** switch-1: cdp run yazın

---

### Adım 104: Envanter Göster
**Açıklama:** show inventory komutunu kullanın

**İpucu:** switch-1: show inventory yazın

---

### Adım 105: Ortam Göster
**Açıklama:** show environment komutunu kullanın

**İpucu:** switch-1: show environment yazın

---

### Adım 106: Bellek Göster
**Açıklama:** show memory komutunu kullanın

**İpucu:** switch-1: show memory yazın

---

### Adım 107: MAC Tablosu Göster
**Açıklama:** show mac address-table komutunu kullanın

**İpucu:** switch-1: show mac address-table yazın

---

### Adım 108: VLAN Özeti Göster
**Açıklama:** show vlan brief komutunu kullanın

**İpucu:** switch-1: show vlan brief yazın

---

### Adım 109: Trunk'ları Göster
**Açıklama:** show interfaces trunk komutunu kullanın

**İpucu:** switch-1: show interfaces trunk yazın

---

### Adım 110: Port Güvenliği Göster
**Açıklama:** show port-security komutunu kullanın

**İpucu:** switch-1: show port-security yazın

---

### Adım 111: CDP Komşuları Detay
**Açıklama:** CDP komşu detaylarını görüntüleyin

**İpucu:** switch-1: show cdp neighbors detail yazın

---

### Adım 112: LLDP Komşuları Göster
**Açıklama:** show lldp neighbors komutunu kullanın

**İpucu:** switch-1: show lldp neighbors yazın

---

### Adım 113: Sürüm Göster
**Açıklama:** show version komutunu kullanın

**İpucu:** switch-1: show version yazın

---

### Adım 114: Saat Göster
**Açıklama:** show clock komutunu kullanın

**İpucu:** switch-1: show clock yazın

---

### Adım 115: Komut Geçmişi Göster
**Açıklama:** show history komutunu kullanın

**İpucu:** switch-1: show history yazın

---

### Adım 116: Ping Komutu
**Açıklama:** Ping komutu ile ağ bağlantısını test edin

**İpucu:** pc-1: ping 192.168.1.2 yazın

---

### Adım 117: Statik Yönlendirme
**Açıklama:** Statik rota ekleyin

**İpucu:** router-1: ip route 192.168.2.0 255.255.255.0 192.168.1.2 yazın

---

### Adım 118: RIP Başlat
**Açıklama:** RIP yönlendirme protokolünü başlatın

**İpucu:** router-1: router rip yazın

---

### Adım 119: Ağ Ekle
**Açıklama:** RIP'e ağ adresini ekleyin

**İpucu:** router-1: network 192.168.1.0 yazın

---

### Adım 120: OSPF Başlat
**Açıklama:** OSPF yönlendirme protokolünü başlatın

**İpucu:** router-1: router ospf 1 yazın

---

### Adım 121: Router ID
**Açıklama:** OSPF Router ID'yi ayarlayın

**İpucu:** router-1: router-id 1.1.1.1 yazın

---

### Adım 122: Protokolleri Göster
**Açıklama:** show ip protocols komutunu kullanın

**İpucu:** router-1: show ip protocols yazın

---

### Adım 123: OSPF Komşuları Göster
**Açıklama:** OSPF komşularını görüntüleyin

**İpucu:** router-1: show ip ospf neighbor yazın

---

### Adım 124: Traceroute
**Açıklama:** traceroute komutu ile ağ yolunu izleyin

**İpucu:** router-1: traceroute 192.168.2.1 yazın

---

### Adım 125: RSA Anahtarı
**Açıklama:** RSA anahtarı oluşturun

**İpucu:** router-1: crypto key generate rsa yazın

---

### Adım 126: SSH Versiyonu
**Açıklama:** SSH versiyon 2'yi ayarlayın

**İpucu:** router-1: ip ssh version 2 yazın

---

### Adım 127: Kullanıcı Yönetimi
**Açıklama:** Yerel kullanıcı oluşturun

**İpucu:** router-1: username admin privilege 15 secret password yazın

---

### Adım 128: WLAN Oluştur
**Açıklama:** Kablosuz ağ oluşturun

**İpucu:** router-1: wlan MyNetwork 1 MySSID yazın

---

### Adım 129: Station Role
**Açıklama:** Access Point rolünü ayarlayın

**İpucu:** router-1: station-role root yazın

---

### Adım 130: SSID Ayarla
**Açıklama:** Kablosuz ağ SSID'sini ayarlayın

**İpucu:** router-1: ssid MySSID yazın

---

### Adım 131: Debug Başlat
**Açıklama:** Debug komutunu kullanın

**İpucu:** router-1: debug ip packet yazın

---

### Adım 132: Debug Kapat
**Açıklama:** Undebug komutunu kullanın

**İpucu:** router-1: undebug all yazın

---

### Adım 133: Rotaları Göster
**Açıklama:** show ip route komutunu kullanın

**İpucu:** router-1: show ip route yazın

---

### Adım 134: IP Arayüz Özeti
**Açıklama:** show ip interface brief komutunu kullanın

**İpucu:** router-1: show ip interface brief yazın

---

### Adım 135: ARP Tablosu Göster
**Açıklama:** show ip arp komutunu kullanın

**İpucu:** router-1: show ip arp yazın

---

### Adım 136: DHCP Havuzu Oluştur
**Açıklama:** DHCP havuzu oluşturun

**İpucu:** router-1: ip dhcp pool LAN yazın

---

### Adım 137: DHCP Ağı
**Açıklama:** DHCP havuzu için ağ tanımlayın

**İpucu:** router-1: network 192.168.1.0 255.255.255.0 yazın

---

### Adım 138: DHCP Varsayılan Ağ Geçidi
**Açıklama:** DHCP havuzu için varsayılan ağ geçidini ayarlayın

**İpucu:** router-1: default-router 192.168.1.1 yazın

---

### Adım 139: IPv6 Yönlendirme
**Açıklama:** IPv6 yönlendirmeyi etkinleştirin

**İpucu:** router-1: ipv6 unicast-routing yazın

---

### Adım 140: IPv6 Arayüz Adresi
**Açıklama:** Arayüze IPv6 adresi atayın

**İpucu:** router-1: ipv6 address 2001::1/64 yazın

---

### Adım 141: Komut Takma Adı
**Açıklama:** Komut takma adı oluşturun

**İpucu:** router-1: alias exec si show interfaces yazın

---

### Adım 142: Show Alias
**Açıklama:** Oluşturulan takma adları görüntüleyin

**İpucu:** router-1: show alias yazın

---

### Adım 143: ACL Reddet
**Açıklama:** Standart ACL ile bir hostu reddedin

**İpucu:** router-1: access-list 1 deny host 192.168.1.10 yazın

---

### Adım 144: ACL İzin Ver
**Açıklama:** ACL ile tüm trafiğe izin verin

**İpucu:** router-1: access-list 1 permit any yazın

---

### Adım 145: Arayüz Seçimi
**Açıklama:** GigabitEthernet 0/0 arayüzüne girin

**İpucu:** router-1: interface gi0/0 yazın

---

### Adım 146: ACL Uygula
**Açıklama:** ACL'yi arayüze uygulayın

**İpucu:** router-1: ip access-group 1 out yazın

---

### Adım 147: Yapılandırmayı Kaydet
**Açıklama:** copy running-config startup-config komutunu kullanın

**İpucu:** router-1: copy running-config startup-config yazın

---

### Adım 148: Cihazı Yeniden Başlat
**Açıklama:** reload komutu ile cihazı yeniden başlatın

**İpucu:** router-1: reload yazın

---

\n\n<div style="page-break-after: always;"></div>\n\n
# Network Simulator 2026 - Example Projects

This document provides detailed descriptions of all 40 example projects available in the Network Simulator 2026.

## Table of Contents

- [Basic Level](#basic-level)
- [Intermediate Level](#intermediate-level)
- [Advanced Level](#advanced-level)

---

## Basic Level

### 1. Basic Network + Passwords
**ID:** `basic-secure`
**Tag:** TEMEL
**Description:** Temel ağ güvenliği için console, VTY ve enable parolaları yapılandırılmıştır.
**Details:** Şifreler: enable secret: class, enable password: paswd, console: console, vty: vty123

**Kısa Tanıtım:**
Temel ağ güvenliği için console, VTY ve enable parolaları yapılandırılmıştır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet PC (PC-1) ekle
   - 1 adet PC (PC-2) ekle (Console için)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 COM1 -> SW1 Console (Console kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - enable secret class
   - enable password paswd
   - service password-encryption
   - line con 0
     password console
     login
     logging synchronous
   - line vty 0 4
     password vty123
     login
     transport input telnet ssh
   - exit

3. **VLAN ve IP Ayarları:**
   - vlan 10
     name VLAN10
   - exit
   - interface vlan 10
     ip address 192.168.10.150 255.255.255.0
     no shutdown
   - exit
   - interface fa0/1
     switchport access vlan 10
     switchport mode access
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.150
   - PC-2: Console bağlantısı için IP gerekmez

5. **Test:**
   - PC-2 Console terminalinden SW1'e bağlan
   - PC-1 CMD: telnet 192.168.10.150
   - Kullanıcı adı: (yok), Şifre: vty123
   - Enable şifresi: class veya paswd

### 2. Single Switch VLANs
**ID:** `single-vlan`
**Tag:** VLAN
**Description:** Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu yapılandırması.
**Details:** PC-1: VLAN 10 (192.168.10.10), PC-2: VLAN 20 (192.168.20.10)

**Kısa Tanıtım:**
Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu yapılandırması.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 2 adet PC ekle (PC-1, PC-2)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)

2. **Switch VLAN Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit

3. **Port VLAN Ataması:**
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/2
     switchport mode access
     switchport access vlan 20
   - exit

4. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, VLAN 10
   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, VLAN 20

5. **Doğrulama:**
   - show vlan brief (VLAN 10 ve 20'yi gör)
   - show interfaces status (port VLAN atamalarını kontrol et)
   - PC-1 ve PC-2 birbirine ping atamaz (farklı VLAN'lar)

### 3. Router SSH (1 PC + 1 Router)
**ID:** `router-ssh-1pc`
**Tag:** SSH
**Description:** PC-1 üzerinden router R1 cihazına SSH ile güvenli bağlantı.
**Details:** Komut: ssh admin@192.168.1.150, Şifre: 1234

**Kısa Tanıtım:**
PC-1 üzerinden router R1 cihazına SSH ile güvenli bağlantı.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle
   - 1 adet PC (PC-1) ekle
   - PC-1 Eth0 -> R1 Gi0/0 (Straight kablo)

2. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - hostname R1
   - ip domain-name lab.local
   - crypto key generate rsa modulus 1024
   - ip ssh version 2
   - username admin privilege 15 secret 1234
   - enable secret 123
   - line vty 0 4
     login local
     transport input ssh
   - exit

3. **Interface Ayarları:**
   - interface gi0/0
     ip address 192.168.1.150 255.255.255.0
     no shutdown
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.150

5. **Test:**
   - PC-1 CMD: ssh admin@192.168.1.150
   - Şifre: 1234
   - R1> show ssh (SSH bağlantılarını gör)
   - R1> show ip ssh (SSH durumunu kontrol et)

### 4. Router DHCP (2 PCs + 1 Switch + 1 Router)
**ID:** `router-dhcp-2pc`
**Tag:** DHCP
**Description:** Router DHCP havuzu üzerinden iki PCye otomatik IP dağıtımı.
**Details:** R1: ip dhcp pool LAN, network 192.168.1.0 255.255.255.0, default-router 192.168.1.1

**Kısa Tanıtım:**
Router DHCP havuzu üzerinden iki PCye otomatik IP dağıtımı.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle
   - 1 adet Switch (SW1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - R1 Gi0/0 -> SW1 Gi0/1 (Crossover kablo)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)

2. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.10.1 255.255.255.0
     no shutdown
   - exit
   - ip dhcp pool LAN
     network 192.168.10.0 255.255.255.0
     default-router 192.168.10.1
     dns-server 8.8.8.8
   - exit

3. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - interface vlan 1
     ip address 192.168.10.2 255.255.255.0
     no shutdown
   - exit
   - interface fa0/1
     switchport mode access
   - exit
   - interface fa0/2
     switchport mode access
   - exit
   - interface gi0/1
     switchport mode access
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP mode DHCP
   - PC-2: IP mode DHCP

5. **Test:**
   - PC-1 CMD: ipconfig /renew
   - PC-2 CMD: ipconfig /renew
   - R1> show ip dhcp binding (DHCP atamalarını gör)
   - PC-1 ve PC-2 IP almalı (192.168.10.100+ aralığı)

### 5. MAC Table Lab
**ID:** `mac-table-lab`
**Tag:** MAC
**Description:** Switch MAC adres tablosu öğrenme özelliği incelenir.
**Details:** PC1 MAC: 00-e0-f7-01-a1-b1, PC2 MAC: 97-31-e5-97-a7-03

**Kısa Tanıtım:**
Switch MAC adres tablosu öğrenme özelliği incelenir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 2 adet PC (PC1, PC2) ekle
   - 1 adet Router (R2) ekle
   - Cihazları switch'e bağla

2. **Trafik Oluşturma:**
   - PC'lerden ping gönder
   - Router'dan ping gönder

3. **MAC Tablosunu İncele:**
   - SW1 terminaline gir: enable
   - show mac address-table
   - Öğrenilen MAC adreslerini not et

4. **Analiz:**
   - Hangi port'tan hangi MAC adresi öğrenildi?
   - Switch kaynak MAC adreslerini nasıl öğrenir?

### 6. ARP vs MAC Table
**ID:** `mac-arp-lab`
**Tag:** MAC
**Description:** ARP ve MAC adres tablosu arasındaki ilişki incelenir.
**Details:** PC: arp -a, Switch: show mac address-table

**Kısa Tanıtım:**
ARP ve MAC adres tablosu arasındaki ilişki incelenir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - PC'ler ve switch arası bağlantıları kur

2. **Trafik Oluşturma:**
   - PC'lerden ping gönder

3. **ARP Cache İncele:**
   - PC terminalinde: arp -a
   - IP-MAC eşleşmelerini gör

4. **MAC Tablosu İncele:**
   - Switch terminalinde: show mac address-table
   - Port-MAC eşleşmelerini gör

5. **Karşılaştırma:**
   - ARP cache (Layer 3: IP -> MAC)
   - MAC tablosu (Layer 2: Port -> MAC)
   - İki tablo arasındaki ilişkiyi anla

### 7. IP Configuration Lab
**ID:** `ip-config-lab`
**Tag:** IP
**Description:** IP yapılandırmasının ağ bağlantısı üzerindeki etkisi incelenir.
**Details:** PC1/PC2: 192.168.1.x/24, PC3: farklı subnet

**Kısa Tanıtım:**
IP yapılandırmasının ağ bağlantısı üzerindeki etkisi incelenir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet PC ekle
   - Switch'e bağla

2. **IP Konfigürasyonu:**
   - PC-1: 192.168.1.10/255.255.255.0
   - PC-2: 192.168.1.20/255.255.255.0
   - PC-3: 192.168.2.10/255.255.255.0 (farklı subnet)

3. **Test:**
   - PC-1 -> PC-2 ping (başarılı)
   - PC-1 -> PC-3 ping (başarısız)

4. **Analiz:**
   - Aynı subnet'teki cihazlar iletişim kurabilir
   - Farklı subnet'teki cihazlar router olmadan iletişim kuramaz

### 8. Native VLAN Configuration
**ID:** `native-vlan-basic`
**Tag:** NATIVE
**Description:** İki switch arası native VLAN 99 trunk bağlantısı yapılandırılır.
**Details:** SW1/SW2: vlan 99, Fa0/24 trunk, switchport trunk native vlan 99

**Kısa Tanıtım:**
İki switch arası native VLAN 99 trunk bağlantısı yapılandırılır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Fa0/24 -> SW2 Fa0/24 (Crossover kablo)

2. **SW1 Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 99
     name NativeVLAN
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 99
   - exit
   - interface fa0/24
     switchport mode trunk
     switchport trunk native vlan 99
   - exit

3. **SW2 Konfigürasyonu:**
   - SW2 terminaline gir: enable, conf t
   - vlan 99
     name NativeVLAN
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 99
   - exit
   - interface fa0/24
     switchport mode trunk
     switchport trunk native vlan 99
   - exit

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.99.10, Subnet 255.255.255.0, VLAN 99
   - PC-2: IP 192.168.99.11, Subnet 255.255.255.0, VLAN 99

5. **Test:**
   - show interfaces trunk (trunk ve native VLAN'ı gör)
   - PC-1 ping 192.168.99.11 (PC-2)

### 9. Firewall Basic (ICMP Block)
**ID:** `firewall-basic`
**Tag:** FIREWALL
**Description:** ICMP (ping) engellenmiş, diğer tüm trafiğe izin verilmiş basit firewall.
**Details:** Kural 1: DENY ICMP | Kural 2: ALLOW ANY | PC-1 ping BAŞARISIZ, wget BAŞARILI

**Kısa Tanıtım:**
ICMP (ping) engellenmiş, diğer tüm trafiğe izin verilmiş basit firewall.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Firewall (FW-1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> FW-1 Gi0/0 (Crossover kablo)
   - FW-1 Gi0/1 -> PC-2 Eth0 (Crossover kablo)

2. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0, Gateway 192.168.1.1
   - PC-2: IP 192.168.1.20, Subnet 255.255.255.0, Gateway 192.168.1.1

3. **Firewall Kuralları:**
   - Kural 1: ICMP (ping) protokolünü DENY olarak yapılandır
   - Kural 2: Tüm trafiğe (ANY) ALLOW kuralı ekle

4. **Test:**
   - PC-1 > ping 192.168.1.20 (BAŞARISIZ - ICMP engelli)
   - PC-1 > wget 192.168.1.20 (BAŞARILI - HTTP izinli)

---

## Intermediate Level

### 10. Two Switch Trunk + VTP
**ID:** `trunk-vtp`
**Tag:** TRUNK/VTP
**Description:** İki switch arası trunk bağlantısı ve VTP domain ile VLAN yayılımı sağlanır.
**Details:** VTP domain: LAB, Gi0/1 trunk, VLAN 10/20 otomatik yayılır

**Kısa Tanıtım:**
İki switch arası trunk bağlantısı ve VTP domain ile VLAN yayılımı sağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 1 adet PC (PC-1) ekle
   - PC-1 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)

2. **SW1 Konfigürasyonu (VTP Server):**
   - SW1 terminaline gir: enable, conf t
   - vtp mode server
   - vtp domain LAB
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit
   - interface gi0/1
     switchport mode trunk
   - exit

3. **SW2 Konfigürasyonu (VTP Client):**
   - SW2 terminaline gir: enable, conf t
   - vtp mode client
   - vtp domain LAB
   - interface gi0/1
     switchport mode trunk
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit

4. **Doğrulama:**
   - SW2'de: show vlan brief (VLAN 10 ve 20 otomatik gelmiş olmalı)
   - show vtp status
   - show interface trunk

### 11. ROAS (Router-on-a-Stick)
**ID:** `roas`
**Tag:** ROAS
**Description:** Router-on-a-Stick ile tek trunk interface üzerinden inter-VLAN routing.
**Details:** Router subinterface: Gi0/0.10 (VLAN 10), Gi0/0.20 (VLAN 20)

**Kısa Tanıtım:**
Router-on-a-Stick ile tek trunk interface üzerinden inter-VLAN routing.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet Router (R1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)
   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/2
     switchport mode access
     switchport access vlan 20
   - exit
   - interface gi0/1
     switchport trunk encapsulation dot1q
     switchport mode trunk
   - exit

3. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/0
     no shutdown
   - exit
   - interface gi0/0.10
     encapsulation dot1q 10
     ip address 192.168.10.1 255.255.255.0
   - exit
   - interface gi0/0.20
     encapsulation dot1q 20
     ip address 192.168.20.1 255.255.255.0
   - exit

4. **PC IP ve Gateway Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, Subnet 255.255.255.0, Gateway 192.168.10.1, VLAN 10
   - PC-2: IP 192.168.20.10, Subnet 255.255.255.0, Gateway 192.168.20.1, VLAN 20

5. **Test:**
   - PC-1 ping 192.168.20.10 (PC-2) - Başarılı (inter-VLAN routing)

### 12. Legacy Inter-VLAN Routing
**ID:** `legacy-routing`
**Tag:** LEGACY ROUTING
**Description:** Router iki fiziksel interface ile VLANlara bağlanır, trunk kullanılmaz.
**Details:** Router Gi0/1: VLAN 10 (192.168.0.1), Gi0/0: VLAN 20 (192.168.1.1)

**Kısa Tanıtım:**
Router iki fiziksel interface ile VLANlara bağlanır, trunk kullanılmaz.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet Router (R1) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/2 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/12 (Straight kablo)
   - R1 Gi0/1 -> SW1 Fa0/11 (Crossover kablo)
   - R1 Gi0/0 -> SW1 Fa0/1 (Crossover kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - vlan 20
     name VLAN20
   - exit
   - interface fa0/2
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/12
     switchport mode access
     switchport access vlan 20
   - exit
   - interface fa0/11
     switchport mode access
     switchport access vlan 10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 20
   - exit

3. **Router Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/1
     ip address 192.168.0.1 255.255.255.0
     no shutdown
   - exit
   - interface gi0/0
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - ip routing (otomatik aktiftir)

4. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.0.2, Subnet 255.255.255.0, Gateway 192.168.0.1, VLAN 10
   - PC-2: IP 192.168.1.2, Subnet 255.255.255.0, Gateway 192.168.1.1, VLAN 20

5. **Test:**
   - PC-1 ping 192.168.1.2 (PC-2) - Başarılı (inter-VLAN routing)

### 13. Port-Security
**ID:** `port-security`
**Tag:** GÜVENLİK
**Description:** Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırılmıştır.
**Details:** Fa0/3: max MAC 1, violation shutdown, MAC: 00-11-22-33-44-55

**Kısa Tanıtım:**
Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırılmıştır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Switch (SW1) ekle
   - 1 adet PC (PC-1) ekle
   - PC-1 Eth0 -> SW1 Fa0/3 (Straight kablo)

2. **Switch Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - interface fa0/3
     switchport mode access
     switchport port-security
     switchport port-security maximum 1
     switchport port-security violation shutdown
     switchport port-security mac-address sticky
   - exit

3. **PC Konfigürasyonu:**
   - PC-1: IP 192.168.1.10, Subnet 255.255.255.0
   - PC-1 MAC adresi otomatik öğrenilir (sticky)

4. **Doğrulama:**
   - show port-security interface fa0/3
   - show port-security address

5. **Test:**
   - PC-1'den trafik gönder (ping)
   - Farklı bir MAC adresi bağlanırsa port shutdown olur

⚠️ Not: Ağı Yenile (F5)

### 14. Wireless Network (WiFi)
**ID:** `wifi-intermediate`
**Tag:** WiFi
**Description:** Router access point mode ile kablosuz istemci bağlantısı sağlanır.
**Details:** SSID: HomeWiFi, Şifre: yok (open), Router AP mode

**Kısa Tanıtım:**
Router access point mode ile kablosuz istemci bağlantısı sağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle (AP mode)
   - 2 adet PC (PC-1, PC-2) ekle (WiFi client)

2. **Router Konfigürasyonu:**
   - R1 wlan0 üzerinde AP modunda SSID: HomeWiFi (open) yayınlar
   - DHCP havuzu (192.168.1.100-150) yapılandırılmıştır

3. **PC WiFi:**
   - PC-1 ve PC-2 kablosuz ağa (SSID match) bağlı

4. **Test:**
   - PC-1 > ping 192.168.1.11 (kablosuz iletişim testi)
   - PC-1 > wget 192.168.1.1 (Wifi kontrol paneli)

⚠️ Not: Ağı Yenile (F5)

### 15. IoT WiFi Lab
**ID:** `iot-wifi-lab`
**Tag:** IoT
**Description:** Üç IoT cihazı ve PC DHCP üzerinden açık WiFi ağına bağlanır.
**Details:** SSID: IoT-Network, DHCP IP desteği, 3 IoT cihazı

**Kısa Tanıtım:**
Üç IoT cihazı ve PC DHCP üzerinden açık WiFi ağına bağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle (AP mode)
   - 3 adet IoT cihazı ekle (Sıcaklık, Nem, Hareket)
   - 1 adet PC (PC-1) ekle

2. **Router Konfigürasyonu:**
   - R1 wlan0 üzerinde AP modunda SSID: IoT-Network (Open) yayınlar
   - DHCP havuzu (192.168.1.100-150)

3. **Bağlantı:**
   - PC-1 ve 3 IoT cihazı kablosuz ağa (DHCP) bağlıdır

4. **Test:**
   - PC-1 > ping 192.168.1.1 ile bağlantıyı test edin
   - PC-1 > wget http://iot-panel ile cihaz kontrol paneline ulaşınız
   - PC-1 üzerinde wget 192.168.1.1 ile WiFi panelinden IoT cihazlarını yönetin

⚠️ Not: Ağı Yenile (F5)

### 16. Greenhouse Sketch (Smart Farm)
**ID:** `greenhouse-iot-lab`
**Tag:** ÇEVRE
**Description:** Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme yapar.
**Details:** SSID: GreenHouse-Network, Şifre: sera (WPA2), 4 sensör

**Kısa Tanıtım:**
Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme yapar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (R1) ekle (AP mode)
   - 4 IoT Sensör: Sıcaklık (.101), Nem (.102), Işık (.103), Kapı/Hareket (.104)
   - 3 Aktüatör: Isıtıcı (.111), Soğutucu (.112), Lamba (.113)
   - 1 adet PC (PC-1) ekle

2. **Router Konfigürasyonu:**
   - SSID: GreenHouse-Network, WPA2 şifre: sera
   - DHCP havuzu (192.168.2.100-150)

3. **Sensörler ve Aktüatörler:**
   - IoT cihazları WiFi üzerinden bağlanır
   - Sıcaklık sensörü ısıtıcı/soğutucuyu otomatik yönetir
   - Işık sensörü lambayı otomatik yönetir

4. **Test:**
   - PC-1 ile WiFi panelinden (wget 192.168.2.1) sensörleri izleyin
   - IoT Panel: wget http://iot-panel (admin/admin) ile cihazları ve kuralları yönetin

### 17. DNS + HTTP Test
**ID:** `dns-http`
**Tag:** DNS/HTTP
**Description:** DNS name resolution ve HTTP web erişimi test edilir.
**Details:** Test: wget 192.168.1.10, wget a10.com, nslookup a10.com

**Kısa Tanıtım:**
DNS name resolution ve HTTP web erişimi test edilir.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 1 Router (DNS/HTTP server) ve 1 PC ekleyin.
2. **Router:** HTTP sunucusunu ve DNS kayıtlarını yapılandırın (`ip host a10.com 192.168.1.10`).
3. **Test PC:** `nslookup a10.com` ve `wget a10.com` komutlarını çalıştırın.

### 18. DHCP Distribution Scenario
**ID:** `dhcp-distribution`
**Tag:** DHCP
**Description:** DHCP sunucusu otomatik IP dağıtımı yaparken manuel yapılandırma karşılaştırılır.
**Details:** DHCP sunucusu PC1 ve PC2ye IP atarken PC3 manuel yapılandırma ile kalır.

**Kısa Tanıtım:**
DHCP sunucusu otomatik IP dağıtımı yaparken manuel yapılandırma karşılaştırılır.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 1 Router (DHCP server), 1 Switch, 3 PC ekleyin.
2. **Router DHCP:** `ip dhcp pool LAN` ile DHCP havuzu oluşturun.
3. **PC'ler:** PC1/PC2 DHCP modunda, PC3 manuel IP ile yapılandırın.
4. **Test:** `ipconfig` ile atanan IP'leri karşılaştırın.

### 19. 2 Switch Trunk Application
**ID:** `trunk-2switch`
**Tag:** TRUNK
**Description:** İki switch trunk bağlantısı ile VLAN trafiğini taşır.
**Details:** SW-1/2: Fa0/1 VLAN100, Fa0/11 VLAN200, Gi0/1 trunk

**Kısa Tanıtım:**
İki switch trunk bağlantısı ile VLAN trafiğini taşır.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 2 Switch, 2 PC (VLAN 100) ve 2 PC (VLAN 200) ekleyin.
2. **Switch:** VLAN 100 ve 200 oluşturun, access portları atayın, Gi0/1 trunk yapılandırın.
3. **PC'ler:** VLAN 100 PC'leri 192.168.100.x, VLAN 200 PC'leri 192.168.200.x IP alır.
4. **Test:** Aynı VLAN'daki PC'ler birbirine ping atabilir, farklı VLAN'dakiler atamaz.

### 20. ACL Standard
**ID:** `acl-standard-basic`
**Tag:** ACL
**Description:** Standard ACL ile temel erişim kontrolü.
**Details:** access-list 10 deny 192.168.1.0 0.0.0.255, access-list 10 permit any

**Kısa Tanıtım:**
Standard ACL ile temel erişim kontrolü.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 Router (R1), 1 Switch (SW1), 2 PC (PC-1, PC-2) ekleyin.
   - PC-1 ve PC-2'yi SW1'e, SW1'i R1'e bağlayın.
2. **IP Yapılandırması:**
   - PC-1: `192.168.1.10/24`, GW `192.168.1.1`
   - PC-2: `192.168.2.10/24`, GW `192.168.2.1`
   - R1 arayüzleri ilgili ağlara IP alacak şekilde yapılandırın.
3. **ACL Tanımı:**
   - R1 CLI:
   - `access-list 10 deny 192.168.1.0 0.0.0.255`
   - `access-list 10 permit any`
4. **ACL Uygulama:**
   - ACL 10'u hedef ağa yakın çıkış/yön arayüzüne uygulayın:
   - `interface gi0/1`
   - `ip access-group 10 out`
5. **Doğrulama:**
   - `show access-lists`
   - PC-1'den hedef ağa ping test edin (engellenmeli), diğer kaynakları test edin.

### 21. NAT Static
**ID:** `nat-static-basic`
**Tag:** NAT
**Description:** Static NAT ile birebir adres eşlemesi.
**Details:** ip nat inside source static 192.168.1.10 203.0.113.10

**Kısa Tanıtım:**
Static NAT ile birebir adres eşlemesi.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 Router, 1 iç ağ istemcisi/sunucusu, 1 dış ağ test istemcisi kurun.
2. **Inside/Outside Arayüzleri:**
   - İç arayüz: `ip nat inside`
   - Dış arayüz: `ip nat outside`
3. **Static NAT Kuralı:**
   - `ip nat inside source static 192.168.1.10 203.0.113.10`
4. **Yönlendirme:**
   - Gerekli default/static route'ları ekleyin.
5. **Doğrulama:**
    - Dış istemciden `203.0.113.10` adresine erişimi test edin.

### 22. All Services Lab (DNS, HTTP, FTP, MAIL, NTP, DHCP)
**ID:** `all-services-lab`
**Tag:** SERVICES
**Description:** A comprehensive lab featuring basic network services (DNS, HTTP, DHCP, FTP, MAIL, NTP) running on PCs.
**Details:** DNS: 1.10, HTTP: 1.20, DHCP: 1.30, FTP: 1.40, MAIL: 1.50, NTP: 1.60

**Kısa Tanıtım:**
PC'ler üzerinde çalışan temel ağ servislerinin bir arada bulunduğu kapsamlı laboratuvar.

**Adım Adım Proje Yapımı:**
1. **Topoloji:**
   - 1 adet Switch (SW1) ve 6 adet PC (PC-DNS, PC-HTTP, PC-DHCP, PC-FTP, PC-MAIL, PC-NTP) ekleyin.
   - Tüm PC'leri SW1'e bağlayın.
2. **IP Yapılandırması:**
   - PC-DNS: `192.168.1.10/24`
   - PC-HTTP: `192.168.1.20/24`
   - PC-DHCP: `192.168.1.30/24`
   - PC-FTP: `192.168.1.40/24`
   - PC-MAIL: `192.168.1.50/24`
   - PC-NTP: `192.168.1.60/24`
3. **Servis Konfigürasyonu:**
   - Her PC'de ilgili servisi (DNS, HTTP, DHCP, FTP, MAIL, NTP) etkinleştirin.
4. **Test:**
   - PC'ler arası servis erişimini test edin (nslookup, wget, ping).

---

## Advanced Level

### 40. Inter-VLAN Routing (L3 Switch)
**ID:** `l3-routing`
**Tag:** L3 ROUTING
**Description:** L3 switch üzerinde dört VLAN arası routing aktiftir.
**Details:** VLAN 10: 192.168.10.1, VLAN 20: 192.168.20.1, VLAN 30: 192.168.30.1, VLAN 40: 192.168.40.1

**Kısa Tanıtım:**
L3 switch üzerinde dört VLAN arası routing aktiftir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet L3 Switch (L3SW1) ekle
   - 4 adet PC ekle (PC-1, PC-2, PC-3, PC-4)
   - PC-1 Eth0 -> L3SW1 Gi1/0/1 (Straight kablo)
   - PC-2 Eth0 -> L3SW1 Gi1/0/2 (Straight kablo)
   - PC-3 Eth0 -> L3SW1 Gi1/0/3 (Straight kablo)
   - PC-4 Eth0 -> L3SW1 Gi1/0/4 (Straight kablo)

2. **L3 Switch Konfigürasyonu:**
   - L3SW1 terminaline gir: enable, conf t
   - ip routing
    - vlan 10
      name VLAN10
    - exit
    - vlan 20
      name VLAN20
    - exit
    - vlan 30
      name VLAN30
    - exit
    - vlan 40
      name VLAN40
    - exit
    - interface vlan 10
      ip address 192.168.10.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 20
      ip address 192.168.20.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 30
      ip address 192.168.30.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 40
      ip address 192.168.40.1 255.255.255.0
      no shutdown
    - exit
   - Access port atamaları (Gi1/0/1-4)

3. **PC'ler:** Her VLAN için bir PC bağlayın, gateway SVI IP'si olsun

4. **Test:**
   - show ip route (routing tablosunu gör)
   - Tüm PC'ler birbirine ping atabilir

### 40. Static Routing Lab
**ID:** `static-routing`
**Tag:** ROUTING
**Description:** İki router arası statik yönlendirme ile farklı subnetler arası iletişim.
**Details:** R1: ip route 192.168.20.0 255.255.255.0 192.168.1.2 | R2: ip route 192.168.10.0 255.255.255.0 192.168.1.1

**Kısa Tanıtım:**
İki router arası statik yönlendirme ile farklı subnetler arası iletişim.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Router (R1, R2) ekle
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> R1 Gi0/0 (Crossover kablo)
   - R1 Gi0/1 -> R2 Gi0/0 (Crossover kablo)
   - R2 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)

2. **R1 Konfigürasyonu:**
   - R1 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 192.168.10.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.20.0 255.255.255.0 192.168.1.2
   - exit

3. **R2 Konfigürasyonu:**
   - R2 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.1.2 255.255.255.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 192.168.20.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.10.0 255.255.255.0 192.168.1.1
   - exit

4. **Switch Konfigürasyonu:**
   - SW1 ve SW2: access port yapılandırması

5. **PC IP ve Gateway Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, GW 192.168.10.1
   - PC-2: IP 192.168.20.10, GW 192.168.20.1

6. **Test:**
   - show ip route (statik rotaları gör)
   - PC-1 ping 192.168.20.10 (PC-2)

### 40. EtherChannel Lab
**ID:** `etherchannel`
**Tag:** ETHERCHANNEL
**Description:** LACP ile birden fazla link tek bir mantıksal bağlantıda birleştirilir.
**Details:** Fa0/1-2: channel-group 1 mode active, Po1 trunk

**Kısa Tanıtım:**
LACP ile birden fazla link tek bir mantıksal bağlantıda birleştirilir.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)
   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)

2. **SW1 Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     channel-group 1 mode active
   - exit
   - interface port-channel 1
     switchport mode trunk
   - exit

3. **SW2 Konfigürasyonu:**
   - SW2 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     channel-group 1 mode active
   - exit
   - interface port-channel 1
     switchport mode trunk
   - exit

4. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, VLAN 10
   - PC-2: IP 192.168.10.11, VLAN 10

5. **Test:**
   - show etherchannel summary (EtherChannel durumunu gör)
   - show spanning-tree (STP durumunu kontrol et)
   - PC-1 ping 192.168.10.11 (PC-2)

### 40. STP Redundant Links
**ID:** `stp-redundant`
**Tag:** STP
**Description:** Rapid-PVST redundant linklerde loop önlemek için STP kullanır.
**Details:** SW1: spanning-tree priority 28672 (root)

**Kısa Tanıtım:**
Rapid-PVST redundant linklerde loop önlemek için STP kullanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet Switch (SW1, SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/1 (Straight kablo)
   - SW1 Gi0/1 -> SW2 Gi0/1 (Crossover kablo)
   - SW1 Gi0/2 -> SW2 Gi0/2 (Crossover kablo)

2. **SW1 Konfigürasyonu (ROOT BRIDGE):**
   - SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     switchport mode trunk
   - exit
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 10 priority 28672
   - exit

3. **SW2 Konfigürasyonu:**
   - SW2 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface range gi0/1-2
     switchport mode trunk
   - exit
   - spanning-tree mode rapid-pvst
   - exit

4. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, VLAN 10
   - PC-2: IP 192.168.10.11, VLAN 10

5. **Test:**
   - show spanning-tree (STP durumunu gör)
   - SW1 Gi0/2 bloke olmalı (BLK)
   - Gi0/1 kablo kesilirse Gi0/2 otomatik aktif olur

⚠️ Not: Ağı Yenile (F5)

### 40. STP Triangle Topology
**ID:** `stp-triangle`
**Tag:** STP
**Description:** Üç switch triangle topolojisinde STP bir portu bloke eder.
**Details:** SW1 Fa0/1 bloke (STP), SW2 root

**Kısa Tanıtım:**
Üç switch triangle topolojisinde STP bir portu bloke eder.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet Switch (SW1, SW2, SW3) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> SW1 Fa0/24 (Straight kablo)
   - PC-2 Eth0 -> SW2 Fa0/24 (Straight kablo)
   - SW1 Fa0/1 -> SW3 Fa0/1 (Crossover kablo)
   - SW1 Fa0/2 -> SW2 Fa0/1 (Crossover kablo)
   - SW2 Fa0/2 -> SW3 Fa0/2 (Crossover kablo)

2. **SW1 Konfigürasyonu:**
   - SW1 terminaline gir: enable, conf t
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 1 priority 32768
   - exit

3. **SW2 Konfigürasyonu (ROOT BRIDGE):**
   - SW2 terminaline gir: enable, conf t
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 1 priority 28672
   - exit

4. **SW3 Konfigürasyonu:**
   - SW3 terminaline gir: enable, conf t
   - spanning-tree mode rapid-pvst
   - spanning-tree vlan 1 priority 32768
   - exit

5. **Test:**
   - show spanning-tree ile STP durumunu kontrol et
   - Bloke port (SW1 Fa0/1)
   - SW1 Fa0/1 kablo kesilirse otomatik aktif olur

⚠️ Not: Ağı Yenile (F5)

### 40. Campus Network
**ID:** `campus-network`
**Tag:** CAMPUS
**Description:** Core router iki access switch arası routing sağlar.
**Details:** CORE-R1: Gi0/0 VLAN 10, Gi0/1 VLAN 20, ip routing

**Kısa Tanıtım:**
Core router iki access switch arası routing sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 1 adet Router (CORE-R1) ekle
   - 2 adet Switch (ACC-SW1, ACC-SW2) ekle
   - 2 adet PC (PC-1, PC-2) ekle
   - PC-1 Eth0 -> ACC-SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> ACC-SW2 Fa0/1 (Straight kablo)
   - ACC-SW1 Gi0/1 -> CORE-R1 Gi0/0 (Crossover kablo)
   - ACC-SW2 Gi0/1 -> CORE-R1 Gi0/1 (Crossover kablo)

2. **CORE-R1 Konfigürasyonu:**
   - CORE-R1 terminaline gir: enable, conf t
   - interface gi0/0
     ip address 192.168.10.1 255.255.255.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 192.168.20.1 255.255.255.0
     no shutdown
   - exit
   - ip routing
   - exit

3. **ACC-SW1 Konfigürasyonu:**
   - ACC-SW1 terminaline gir: enable, conf t
   - vlan 10
     name VLAN10
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 10
   - exit
   - interface gi0/1
     switchport mode access
   - exit

4. **ACC-SW2 Konfigürasyonu:**
   - ACC-SW2 terminaline gir: enable, conf t
   - vlan 20
     name VLAN20
   - exit
   - interface fa0/1
     switchport mode access
     switchport access vlan 20
   - exit
   - interface gi0/1
     switchport mode access
   - exit

5. **PC IP Konfigürasyonu:**
   - PC-1: IP 192.168.10.10, GW 192.168.10.1, VLAN 10
   - PC-2: IP 192.168.20.10, GW 192.168.20.1, VLAN 20

6. **Test:**
   - PC-1 ping 192.168.20.10 (PC-2)

### 40. STP 3 Switch PVST
**ID:** `stp-3switch-pvst`
**Tag:** STP
**Description:** PVST ile her VLAN için farklı root bridge yük dengelemesi sağlanır.
**Details:** VLAN1 root SW1, VLAN10 root SW2, VLAN20 root SW3

**Kısa Tanıtım:**
PVST ile her VLAN için farklı root bridge yük dengelemesi sağlanır.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 3 adet L3 Switch (SW1, SW2, SW3) ekle
   - 9 adet PC ekle (her switch için 3 PC)
   - Switch'ler arası trunk bağlantıları kur (Gi1/0/1-2)
   - PC'leri ilgili VLAN'lara bağla

2. **VLAN'lar Oluştur:**
   - Her switch'te vlan 1, 10, 20 oluştur

3. **Root Bridge Ayarla:**
   - SW1: spanning-tree vlan 1 priority 24576
   - SW2: spanning-tree vlan 10 priority 24576
   - SW3: spanning-tree vlan 20 priority 24576

4. **Trunk Bağlantıları:**
   - Gi1/0/1 ve Gi1/0/2 trunk mode (dot1q encapsulation)

5. **Test:**
   - show spanning-tree vlan 1
   - show spanning-tree vlan 10
   - show spanning-tree vlan 20
   - Her VLAN farklı root kullanır

### 40. 2 L3 Switch VLAN (AG1/AG2)
**ID:** `l3-switch-2vlan`
**Tag:** L3 VLAN
**Description:** İki L3 switch SVI gateway ile VLAN 10 ve 20 arası routing sağlar.
**Details:** Switch2/4: ip routing, VLAN10 SVI 192.168.10.1, VLAN20 SVI 192.168.20.1

**Kısa Tanıtım:**
İki L3 switch SVI gateway ile VLAN 10 ve 20 arası routing sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet L3 Switch (Switch2, Switch4) ekle
   - 8 adet PC ekle (PC4-PC11)
   - Switch2 Gi1/0/5 -> Switch4 Gi1/0/5 (Crossover kablo)
   - PC4-PC5 -> Switch2 Gi1/0/1-2 (VLAN 10)
   - PC6-PC7 -> Switch2 Gi1/0/3-4 (VLAN 20)
   - PC8-PC9 -> Switch4 Gi1/0/1-2 (VLAN 10)
   - PC10-PC11 -> Switch4 Gi1/0/3-4 (VLAN 20)

2. **Switch2 Konfigürasyonu:**
   - Switch2 terminaline gir: enable, conf t
    - vlan 10
      name AG1
    - exit
    - vlan 20
      name AG2
    - exit
    - ip routing
    - interface vlan 10
      ip address 192.168.10.1 255.255.255.0
      no shutdown
    - exit
    - interface vlan 20
      ip address 192.168.20.1 255.255.255.0
      no shutdown
    - exit
    - interface gi1/0/5
      switchport trunk encapsulation dot1q
      switchport mode trunk
    - exit
    - interface range gi1/0/1-2
      switchport mode access
      switchport access vlan 10
    - exit
    - interface range gi1/0/3-4
      switchport mode access
      switchport access vlan 20
    - exit

3. **Switch4 Konfigürasyonu:**
    - Aynı yapılandırma Switch2 ile aynı

4. **PC IP Konfigürasyonu:**
   - VLAN 10 PC'ler: IP 192.168.10.x, GW 192.168.10.1
   - VLAN 20 PC'ler: IP 192.168.20.x, GW 192.168.20.1

5. **Test:**
   - Tüm PC'ler birbirine ping atabilir

### 40. L3 Switch Static Routing
**ID:** `static-l3-routing`
**Tag:** STATIK ROUTING
**Description:** Multilayer switchler ve router statik rotalarla ağlar arası iletişim sağlar.
**Details:** ML1: ip route 192.168.2.0 255.255.255.0 10.0.0.2 | R3: ip route 192.168.1.0 255.255.255.0 10.0.0.1, ip route 192.168.2.0 255.255.255.0 20.0.0.2 | ML2: ip route 192.168.1.0 255.255.255.0 20.0.0.1

**Kısa Tanıtım:**
Multilayer switchler ve router statik rotalarla ağlar arası iletişim sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet L3 Switch (ML1, ML2) ekle
   - 1 adet Router (R3) ekle
   - 2 adet L2 Switch (Switch0, Switch1) ekle
   - 4 adet PC ekle
   - Bağlantıları topolojiye göre yapıştır

2. **ML1 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/1
     no switchport
     ip address 10.0.0.1 255.0.0.0
     no shutdown
   - exit
   - interface gi1/0/2
     no switchport
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.2.0 255.255.255.0 10.0.0.2

3. **R3 Konfigürasyonu:**
   - enable, conf t
   - interface gi0/0
     ip address 10.0.0.2 255.0.0.0
     no shutdown
   - exit
   - interface gi0/1
     ip address 20.0.0.1 255.0.0.0
     no shutdown
   - exit
   - ip route 192.168.1.0 255.255.255.0 10.0.0.1
   - ip route 192.168.2.0 255.255.255.0 20.0.0.2

4. **ML2 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/1
     no switchport
     ip address 20.0.0.2 255.0.0.0
     no shutdown
   - exit
   - interface gi1/0/2
     no switchport
     ip address 192.168.2.1 255.255.255.0
     no shutdown
   - exit
   - ip route 192.168.1.0 255.255.255.0 20.0.0.1

5. **Test:**
   - show ip route (statik rotaları gör)
   - PC'ler arası ping testi

### 40. RIP Dynamic Routing
**ID:** `rip-dynamic-routing`
**Tag:** RIP ROUTING
**Description:** RIP dinamik yönlendirme protokolü otomatik route öğrenimi sağlar.
**Details:** ML0: router rip, network 192.168.1.0, network 192.168.2.0 | ML1: router rip, network 192.168.2.0, network 192.168.3.0

**Kısa Tanıtım:**
RIP dinamik yönlendirme protokolü otomatik route öğrenimi sağlar.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - 2 adet L3 Switch (ML0, ML1) ekle
   - 2 adet L2 Switch (Switch0-L2, Switch3-L2) ekle
   - 4 adet PC (PC0-PC3) ekle
   - PC0-PC1 -> Switch0-L2 Fa0/1-2
   - Switch0-L2 Fa0/24 -> ML0 Gi1/0/23
   - ML0 Gi1/0/24 -> ML1 Gi1/0/24 (Crossover)
   - ML1 Gi1/0/23 -> Switch3-L2 Fa0/24
   - Switch3-L2 Fa0/1-2 -> PC2-PC3

2. **ML0 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/23
     no switchport
     ip address 192.168.1.1 255.255.255.0
     no shutdown
   - exit
   - interface gi1/0/24
     no switchport
     ip address 192.168.2.1 255.255.255.0
     no shutdown
   - exit
   - router rip
     network 192.168.1.0
     network 192.168.2.0
   - exit

3. **ML1 Konfigürasyonu:**
   - enable, conf t
   - ip routing
   - interface gi1/0/24
     no switchport
     ip address 192.168.2.2 255.255.255.0
     no shutdown
   - exit
   - interface gi1/0/23
     no switchport
     ip address 192.168.3.1 255.255.255.0
     no shutdown
   - exit
   - router rip
     network 192.168.2.0
     network 192.168.3.0
   - exit

4. **PC Konfigürasyonu:**
   - PC0-PC1: IP 192.168.1.x, GW 192.168.1.1
   - PC2-PC3: IP 192.168.3.x, GW 192.168.3.1

5. **Test:**
   - show ip route (dinamik rotaları gör)
   - PC0 ping 192.168.3.10 (PC2)

### 40. ACL Extended
**ID:** `acl-extended-basic`
**Tag:** ACL
**Description:** Extended ACL ile protokol/port bazlı filtreleme.
**Details:** ip access-list extended WEB-FILTER, permit tcp any any eq 80, deny ip any any

**Kısa Tanıtım:**
Extended ACL ile protokol/port bazlı filtreleme.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - Router, switch ve en az 2 istemci ekleyin.
2. **Temel IP Ayarları:**
   - İstemcileri farklı segmentlerden erişecek şekilde yapılandırın.
3. **Extended ACL Yazımı:**
   - `ip access-list extended WEB-FILTER`
   - `permit tcp any any eq 80`
   - `deny ip any any`
4. **Arayüze Uygulama:**
   - `interface gi0/0`
   - `ip access-group WEB-FILTER in`
5. **Test:**
   - HTTP (`wget`/web erişimi) başarılı olmalı.
   - Ping ve diğer trafik türleri engellenmeli.
    - `show access-lists` ile sayaçları kontrol edin.

### 40. NAT Dynamic
**ID:** `nat-dynamic-basic`
**Tag:** NAT
**Description:** NAT havuzu ile dinamik çeviri.
**Details:** ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0

**Kısa Tanıtım:**
NAT havuzu ile dinamik çeviri.

**Adım Adım Proje Yapımı:**
1. **NAT Havuzu Tanımı:**
   - `ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0`
2. **Erişim Listesi:**
   - `access-list 1 permit 192.168.1.0 0.0.0.255`
3. **NAT Eşleme:**
   - `ip nat inside source list 1 pool OUT`
4. **Inside/Outside Arayüz Ataması:**
   - İç arayüzlerde `ip nat inside`, dış arayüzde `ip nat outside`.
5. **Test ve Doğrulama:**
   - İç istemcilerden dış ağa trafik oluşturun.
   - `show ip nat translations` ve `show ip nat statistics` komutlarını kontrol edin.

### 40. NAT PAT
**ID:** `nat-pat-basic`
**Tag:** NAT
**Description:** PAT (NAT overload) ile çoktan-bire çeviri.
**Details:** ip nat inside source list 1 interface gi0/0 overload

**Kısa Tanıtım:**
PAT (NAT overload) ile çoktan-bire çeviri.

**Adım Adım Proje Yapımı:**
1. **ACL Tanımı:**
   - `access-list 1 permit 192.168.10.0 0.0.0.255`
2. **PAT Konfigürasyonu:**
   - `ip nat inside source list 1 interface gi0/0 overload`
3. **Arayüz Rolleri:**
   - LAN arayüzü `ip nat inside`
   - WAN arayüzü `ip nat outside`
4. **Yönlendirme:**
   - `ip route 0.0.0.0 0.0.0.0 <upstream-next-hop>`
5. **Doğrulama:**
   - Birden fazla PC’den eşzamanlı web/ping testi yapın.
   - `show ip nat translations` içinde port bazlı eşleşmeleri görün.

### 40. HSRP Redundancy
**ID:** `hsrp-redundancy-basic`
**Tag:** HSRP
**Description:** Varsayılan ağ geçidi yedekliliği için HSRP.
**Details:** standby 1 ip 192.168.10.254, standby 1 priority 110, standby 1 preempt

**Kısa Tanıtım:**
Varsayılan ağ geçidi yedekliliği için HSRP.

**Adım Adım Proje Yapımı:**
1. **Topoloji Oluşturma:**
   - Aynı VLAN’a bağlı 2 L3 cihaz ve istemciler ekleyin.
2. **SVI/IP Konfigürasyonu:**
   - Her iki cihazda VLAN arayüzlerine gerçek IP verin.
3. **HSRP Ayarları (Primary):**
   - `standby 1 ip 192.168.10.254`
   - `standby 1 priority 110`
   - `standby 1 preempt`
4. **HSRP Ayarları (Secondary):**
   - Aynı grup ve sanal IP ile daha düşük priority verin.
5. **Failover Testi:**
   - Primary arayüzünü kapatıp gateway erişimini test edin.
   - `show standby brief` ile active/standby durumlarını doğrulayın.

### 40. OSPF Multi-Area
**ID:** `ospf-multi-area-1`
**Tag:** OSPF
**Description:** Area 0 ve Area 10 ile çok alanlı OSPF.
**Details:** router ospf 1, network 10.0.0.0 0.0.0.255 area 0, network 10.0.10.0 0.0.0.255 area 10

**Kısa Tanıtım:**
Area 0 ve Area 10 ile çok alanlı OSPF.

**Adım Adım Proje Yapımı:**
1. **Router Planı:**
   - En az 3 router ile bir ABR topolojisi kurun.
2. **OSPF Süreci:**
   - `router ospf 1`
3. **Area Atamaları:**
   - Backbone linklerinde `area 0`
   - Uç segmentlerde `area 10`
4. **Arayüz/Network Komutları:**
   - `network 10.0.0.0 0.0.0.255 area 0`
   - `network 10.0.10.0 0.0.0.255 area 10`
5. **Doğrulama:**
   - `show ip ospf neighbor`
   - `show ip route ospf`
   - Farklı alanlardaki istemciler arası ping testi.

### 40. OSPF Multi-Area
**ID:** `ospf-multi-area-2`
**Tag:** OSPF
**Description:** ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması.
**Details:** router ospf 1, area 20 stub, area 10 range 10.10.0.0 255.255.0.0

**Kısa Tanıtım:**
ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması.

**Adım Adım Proje Yapımı:**
1. **Çok Alanlı Topoloji:**
   - Area 0, Area 10 ve Area 20 içeren yapı oluşturun.
2. **Stub Area Tanımı:**
   - İlgili ABR/area router’da `area 20 stub`.
3. **Özetleme (Summarization):**
   - ABR üzerinde `area 10 range 10.10.0.0 255.255.0.0`.
4. **Komşuluk ve LSA Kontrolü:**
   - `show ip ospf database`
   - `show ip ospf interface brief`
5. **Test:**
   - Stub area’dan dış alanlara erişimi doğrulayın.
   - Routing tablosunda özet rota davranışını kontrol edin.

### 40. EIGRP Basic
**ID:** `eigrp-basic-1`
**Tag:** EIGRP
**Description:** Temel EIGRP komutları ile dinamik yönlendirme kurulumu.
**Details:** router eigrp 100, network 192.168.1.0 0.0.0.255, no auto-summary

**Kısa Tanıtım:**
Temel EIGRP komutları ile dinamik yönlendirme kurulumu.

**Adım Adım Proje Yapımı:**
1. **Topoloji Kurulumu:**
   - En az 2 router ve uç ağlar oluşturun.
2. **EIGRP Süreci:**
   - `router eigrp 100`
3. **Ağ Duyuruları:**
   - `network 192.168.1.0 0.0.0.255`
   - Diğer bağlı ağları da ekleyin.
4. **Özetleme Ayarı:**
   - `no auto-summary`
5. **Doğrulama:**
   - `show ip eigrp neighbors`
   - `show ip route eigrp`
   - Uçtan uca ping ile erişim testi.

### 40. IPv6 Advanced Lab (DHCPv6 & OSPFv3)
**ID:** `ipv6-advanced-lab`
**Tag:** IPv6
**Description:** IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 dinamik yönlendirme.
**Details:** ipv6 unicast-routing, ipv6 dhcp pool LAN, address prefix 2001:db8:1::/64, ipv6 router ospf 1

**Kısa Tanıtım:**
IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 dinamik yönlendirme.

**Adım Adım Proje Yapımı:**
1. **Topoloji:** 2 Router ve bağlı PC'ler ekleyin.
2. **Unicast Routing:** `ipv6 unicast-routing` komutu ile IPv6 yönlendirmeyi aktif edin.
3. **Adresleme:** Interface'lere `2001:db8:...` bloklarından IP atayın.
4. **DHCPv6:** İstemciler için DHCPv6 havuzu oluşturun.
5. **OSPFv3:** `ipv6 router ospf 1` ile router'lar arası dinamik rota paylaşımı sağlayın.

---

## Summary

| Level | Count |
|-------|-------|
| Basic | 9 |
| Intermediate | 13 |
| Advanced | 18 |
| **Total Examples** | **40** |
| **Total Code Lines** | **15,650** |

## Getting Started

To use these examples:
1. Open the Network Simulator 2026.
2. Click on "Example Projects" in the sidebar.
3. Select an example from the list.
4. The example will load with pre-configured devices and connections.
5. Follow the notes provided in the canvas for specific configuration steps.

## Contributing

To add a new example:
1. Define devices in `src/lib/network/exampleProjects.ts`.
2. Configure connections between devices.
3. Set initial states for each device.
4. Add notes explaining the topology and configuration.
5. Add the example to the `exampleProjects` array.
6. Update this documentation.

---

## Grid ve Snap Ayarları

### Grid Noktaları
- **Grid Boyutu:** 16px (küçültülmüş)
- **Grid Noktası Yarıçapı:** 0.5px (daha ince görünüm)

### Snap-to-Grid Özelliği
- **Varsayılan:** Etkin
- **Ctrl + Drag:** Cihazları tam grid'e yapıştırır (16px grid)
- **Kullanım:** Cihazları düzenli bir şekilde hizalamak için Ctrl tuşunu basılı tutarak sürükleyin

---

## Kısayol Güncellemeleri

### Yeni Kısayollar
| Kısayol | İşlem |
|---------|-------|
| `F5` | Ağ topolojisini yenile |
| `Ctrl + Drag` | Cihazı grid'e yapıştır (16px) |
| `Ctrl+X` | Konfigürasyonu kes |
| `Double-click` | Cihaz yapılandırma panelini aç |

---

## DHCP Sunucusu Yapılandırması Örneği

**Amaç:** Router üzerinde DHCP sunucusu yapılandırarak PC'lere otomatik IP ataması yapmak.

### Topoloji Oluşturma
1. **Cihazlar:**
   - 1 adet Router (R1)
   - 1 adet Switch (SW1)
   - 2 adet PC (PC-1, PC-2)

2. **Bağlantılar:**
   - R1 Gi0/0 -> SW1 Gi0/1 (Crossover kablo)
   - PC-1 Eth0 -> SW1 Fa0/1 (Straight kablo)
   - PC-2 Eth0 -> SW1 Fa0/2 (Straight kablo)

### Router DHCP Yapılandırması

```
R1# enable
R1# configure terminal
R1(config)# interface gi0/0
R1(config-if)# ip address 192.168.10.1 255.255.255.0
R1(config-if)# no shutdown
R1(config-if)# exit
R1(config)# ip dhcp pool LAN
R1(dhcp-config)# network 192.168.10.0 255.255.255.0
R1(dhcp-config)# default-router 192.168.10.1
R1(dhcp-config)# dns-server 8.8.8.8
R1(dhcp-config)# lease 1
R1(dhcp-config)# exit
R1(config)# exit
R1# write memory
```

### Switch Yapılandırması

```
SW1# enable
SW1# configure terminal
SW1(config)# interface vlan 1
SW1(config-if)# ip address 192.168.10.2 255.255.255.0
SW1(config-if)# no shutdown
SW1(config-if)# exit
SW1(config)# interface range fa0/1-2
SW1(config-if-range)# switchport mode access
SW1(config-if-range)# exit
SW1(config)# exit
SW1# write memory
```

### PC Yapılandırması

1. **PC-1 ve PC-2:**
   - IP Yapılandırması: DHCP
   - Terminal'de: `ipconfig /renew` (Windows) veya `dhclient` (Linux)

### Doğrulama

```
R1# show ip dhcp binding
R1# show ip dhcp pool
PC-1# ipconfig (Windows) veya ifconfig (Linux)
PC-2# ipconfig (Windows) veya ifconfig (Linux)
```

### Beklenen Sonuç

- PC-1: 192.168.10.3 (DHCP tarafından atanmış)
- PC-2: 192.168.10.4 (DHCP tarafından atanmış)
- Her PC'nin Gateway: 192.168.10.1
- Her PC'nin DNS: 8.8.8.8

### Sorun Giderme

**Sorun:** İlk otomatik ağ yenilemesinde portlar takılı görünüyor
- **Çözüm:** Elle ağ yenileme (F5) yapın. Sistem portların durumunu doğru şekilde güncelleyecektir.

**Sorun:** PC'ler DHCP IP alamıyor
- Kontrol edin: `show ip dhcp pool` (Router'da pool tanımlı mı?)
- Kontrol edin: `show ip dhcp binding` (Lease atanmış mı?)
- Kontrol edin: Bağlantılar aktif mi? (show interfaces)

**Sorun:** PC'ler birbirine ping atamıyor
- Kontrol edin: Aynı subnet'te mi? (192.168.10.x)
- Kontrol edin: Gateway doğru mu? (192.168.10.1)
- Kontrol edin: Switch port'ları aktif mi? (show interfaces status)

---

## IPv6 Yönlendirme Yapılandırması Örneği (OSPFv3)

**Amaç:** İki router arasında OSPFv3 kullanarak IPv6 bağlantısı sağlamak.

### Topoloji Oluşturma
1. **Cihazlar:**
   - 2 adet Router (R1, R2)
   - 2 adet PC (PC-1, PC-2)

2. **Bağlantılar:**
   - R1 Gi0/1 -> R2 Gi0/1 (Crossover kablo)
   - PC-1 Eth0 -> R1 Gi0/0 (Straight kablo)
   - PC-2 Eth0 -> R2 Gi0/0 (Straight kablo)

### Router-1 Yapılandırması

```
R1# enable
R1# configure terminal
R1(config)# ipv6 unicast-routing
R1(config)# interface gi0/0
R1(config-if)# ipv6 address 2001:db8:1::1/64
R1(config-if)# no shutdown
R1(config-if)# ipv6 ospf 1 area 0
R1(config-if)# exit
R1(config)# interface gi0/1
R1(config-if)# ipv6 address 2001:db8:12::1/64
R1(config-if)# no shutdown
R1(config-if)# ipv6 ospf 1 area 0
R1(config-if)# exit
R1(config)# ipv6 router ospf 1
R1(config-router)# exit
```

### Router-2 Yapılandırması

```
R2# enable
R2# configure terminal
R2(config)# ipv6 unicast-routing
R2(config)# interface gi0/0
R2(config-if)# ipv6 address 2001:db8:2::1/64
R2(config-if)# no shutdown
R2(config-if)# ipv6 ospf 1 area 0
R2(config-if)# exit
R2(config)# interface gi0/1
R2(config-if)# ipv6 address 2001:db8:12::2/64
R2(config-if)# no shutdown
R2(config-if)# ipv6 ospf 1 area 0
R2(config-if)# exit
R2(config)# ipv6 router ospf 1
R2(config-router)# exit
```

### Doğrulama

```
R1# show ipv6 route
R1# show ipv6 interface brief
PC-1# ping 2001:db8:2::10 (PC-2'nin IPv6 adresi)
```
