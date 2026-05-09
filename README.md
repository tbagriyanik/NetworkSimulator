# Network Simulator 2026

A modern browser-based network simulator for learning switching, routing, wireless, IoT, and CLI workflows.

![Version](https://img.shields.io/badge/version-1.6.0-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%2016.2%20|%20React%2019%20|%20TypeScript%205.9%20|%20Tailwind%204-green)
![FOSS](https://img.shields.io/badge/FOSS-Free%20Open%20Source-brightgreen)
![Total Lines](https://img.shields.io/badge/total--lines-72450+-lightgrey)

Live app: [network2026.vercel.app](https://network2026.vercel.app)

---

## English

### Core Features

- **Interactive Topology Canvas**: PCs, IoT devices, L2/L3 Switches, and Routers.
- **Realistic CLI/Console**: Command history, suggestion lists, help output, and Geist Mono terminal font.
- **Advanced Switching**: VLAN, Trunking, Native VLAN, VTP, EtherChannel, STP/PVST, and Port Security.
- **Robust Routing**: IPv4/IPv6 Static routing, L3 Switching, RIP, OSPF patterns, RIPng, OSPFv3, and `show ip route` analysis.
- **Wireless & IoT**: WiFi AP/Client modes, web-based WiFi management, IoT control panels, and sensor simulation.
- **Guided Lesson Mode**: Step-by-step tasks with automatic completion detection and progress tracking.
- **Modern UI/UX**: Keyboard shortcuts, glassmorphism effects, shimmer loading, and accessible design.

### Recent Updates (v1.7.0)

- **IPv6 Routing Protocols (RIPng & OSPFv3)**:
  - Added support for **RIPng** (RIP next generation) for IPv6.
  - Added support for **OSPFv3** (OSPF for IPv6) with multi-area capability.
  - Implemented **IPv6 Static Routing** with prefix/length notation.
  - New show commands: `show ipv6 route` and `show ipv6 interface brief`.
  - Realistic IPv6 prefix matching and shorthand expansion logic.

- **Bug Fixes & Stability Improvements (May 8, 2026)**:
  - Fixed React hooks immutability errors (`latestDevicesRef`, ref synchronization)
  - Fixed `useTheme` context error (ThemeProvider ordering)
  - Fixed `isTR` undefined error (language variable scope)
  - Fixed `rulesHtml` undefined error (IoT web panel)
  - Added `firewall` device type support with proper port configuration
  - Added IoT device `rules` system for sensor automation
  - All builds, lint, and TypeScript checks now passing ✅

- **UI/UX Performance Phase 1 & 2**:
  - Implemented **Zustand Selectors** for granular state management and reduced re-renders.
  - Added **Spatial Partitioning** and **Viewport Culling** for smooth rendering of large topologies.
  - Replaced Framer Motion with optimized **CSS Animations**.
  - Integrated **Code Splitting** for faster initial loads (Terminal, Config Panel, etc.).
  - Added **Virtual Device Lists** using `react-window`.
- **CLI & Topology Synchronization**:
  - Full `startup-config` and `running-config` management via CLI (`write memory`, `erase`).
  - Live **Running Config Panel** showing real-time device state.
  - Automated **Hostname Propagation** between topology canvas and CLI prompt.
  - Cross-tab state synchronization (Topology, CLI, Tasks).
- **Standardized Port Density**: Industry-standard port layouts for C2960 (24eth+2gig), C3650 (24eth+4gig+1wlan), and ISR 4451 (4gig+1wlan).
- **Enhanced Documentation & Examples**:
  - Comprehensive **Documentation Index** with guides for CLI, error handling, and integration.
  - **28 Ready-to-Use Example Projects** with step-by-step instructions.
  - **Quick Reference Guide** for common tasks and commands.
  - **Implementation Complete** documentation with feature checklist.
- **Ping Packet Tracking & Visualization**:
  - Real-time **Ping Animation Overlay** showing packet flow on canvas.
  - **Packet Info Panel** with detailed hop-by-hop analysis.
  - Visual feedback for successful/failed pings with timing information.
  - **ESC key support** to close packet analysis panel.
  - **Mobile back button support** for seamless mobile navigation.
- **Improved Error Handling & Validation**:
  - **AppErrorBoundary** with graceful error recovery and user feedback.
  - **Form Validation** utilities for input sanitization and error messages.
  - **Notification Manager** for consistent toast and alert handling.
- **API Client & Contact Form**:
  - Robust **API Client** with retry logic and error handling.
  - Enhanced **Contact Form** with validation and submission tracking.
  - Support for feedback and issue reporting.

### Statistics

| Metric | Value |
| --- | ---: |
| Application Code | 72,000+ |
| Example Code | 300 |
| Documentation | 150+ |
| **Total Lines** | **72,450+** |
| Source Files | 185+ |
| Ready Topologies | 32 |
| Guided Lessons | 4 |
| CLI Command Families | 180+ |

---

## Türkçe

### Temel Özellikler

- **Etkileşimli Topoloji Tuvali**: PC, IoT, L2/L3 Switch ve Router cihazları.
- **Gerçekçi CLI/Console**: Komut geçmişi, öneri listesi, yardım çıktısı ve Geist Mono terminal fontu.
- **Gelişmiş Switching**: VLAN, Trunking, Native VLAN, VTP, EtherChannel, STP/PVST ve Port Security.
- **Kapsamlı Routing**: IPv4/IPv6 Statik yönlendirme, L3 Switch yönlendirme, RIP, OSPF, RIPng, OSPFv3 ve `show ip route` çıktıları.
- **Wireless ve IoT**: WiFi AP/Client modları, web tabanlı WiFi yönetimi, IoT paneli ve sensör simülasyonu.
- **Rehberli Ders Modu**: Otomatik tamamlama algılama ve ilerleme takibi ile adım adım görevler.
- **Modern UI/UX**: Klavye kısayolları, glassmorphism efektleri, shimmer loading ve erişilebilir tasarım.

### Son Güncellemeler (v1.7.0)

- **IPv6 Yönlendirme Protokolleri (RIPng & OSPFv3)**:
  - IPv6 için **RIPng** desteği eklendi.
  - Çoklu alan (multi-area) destekli **OSPFv3** eklendi.
  - Prefix/uzunluk notasyonu ile **IPv6 Statik Rotalar** eklendi.
  - Yeni show komutları: `show ipv6 route` ve `show ipv6 interface brief`.
  - Gerçekçi IPv6 prefix eşleştirme ve kısa yazım (shorthand) genişletme mantığı.

- **Hata Düzeltmeleri ve Kararlılık İyileştirmeleri (8 Mayıs 2026)**:
  - React hooks immutability hataları düzeltildi (`latestDevicesRef`, ref senkronizasyonu)
  - `useTheme` context hatası düzeltildi (ThemeProvider sıralaması)
  - `isTR` undefined hatası düzeltildi (dil değişkeni scope'u)
  - `rulesHtml` undefined hatası düzeltildi (IoT web paneli)
  - `firewall` cihaz tipi desteği eklendi, port yapılandırması
  - IoT cihaz `rules` sistemi eklendi - sensör otomasyonu
  - Tüm build, lint ve TypeScript kontrolleri başarılı ✅

- **UI/UX Performans Faz 1 & 2**:
  - Gereksiz render'ları önlemek için **Zustand Seçiciler** ve memoizasyon eklendi.
  - Büyük ağlarda akıcı performans için **Spatial Partitioning** ve **Viewport Culling** algoritmaları uygulandı.
  - Performans artışı için Framer Motion yerine **CSS Animasyonları** kullanılmaya başlandı.
  - Açılış hızını artırmak için modüler **Kod Bölümleme** (Terminal, Config Panel vb.) yapıldı.
  - Büyük listeler için **Virtual Device List** (sanal liste) yapısı kuruldu.
- **CLI ve Topoloji Senkronizasyonu**:
  - CLI üzerinden `write memory` ve `erase` komutları ile tam **startup/running-config** yönetimi.
  - Cihazın canlı durumunu gösteren **Canlı Konfigürasyon Paneli**.
  - Tuval üzerindeki isim değişikliklerinin anında CLI prompt'una yansıması (**Hostname Yayılımı**).
  - Sekmeler arası (Topoloji, CLI, Görevler) tam durum senkronizasyonu.
- **Standart Port Yapısı**: C2960 (24eth+2gig), C3650 (24eth+4gig+1wlan) ve ISR 4451 (4gig+1wlan) modelleri için endüstri standardı port düzeni.
- **Geliştirilmiş Dokümantasyon & Örnekler**:
  - **Dokümantasyon İndeksi** ile CLI, hata yönetimi ve entegrasyon rehberleri.
  - **28 Hazır Örnek Proje** adım adım talimatlarla.
  - **Hızlı Referans Rehberi** yaygın görevler ve komutlar için.
  - **Uygulama Tamamlandı** dokümantasyonu özellik kontrol listesiyle.
- **Ping Paket Takibi & Görselleştirme**:
  - Gerçek zamanlı **Ping Animasyon Overlay** tuval üzerinde paket akışını gösteriyor.
  - **Paket Bilgi Paneli** detaylı hop-by-hop analizi ile.
  - Başarılı/başarısız ping'ler için görsel geri bildirim ve zamanlama bilgisi.
  - **ESC tuşu desteği** paket analiz panelini kapatmak için.
  - **Mobil geri düğmesi desteği** sorunsuz mobil navigasyon için.
- **Geliştirilmiş Hata Yönetimi & Doğrulama**:
  - **AppErrorBoundary** zarif hata kurtarma ve kullanıcı geri bildirimi ile.
  - **Form Doğrulama** araçları giriş sanitizasyonu ve hata mesajları için.
  - **Bildirim Yöneticisi** tutarlı toast ve uyarı işleme için.
- **API İstemcisi & İletişim Formu**:
  - Sağlam **API İstemcisi** yeniden deneme mantığı ve hata işleme ile.
  - Geliştirilmiş **İletişim Formu** doğrulama ve gönderim takibi ile.
  - Geri bildirim ve sorun raporlama desteği.

### İstatistikler

| Metrik | Değer |
| --- | ---: |
| Uygulama Kodu | 72,000+ |
| Örnek Kod | 300 |
| Dokümantasyon | 150+ |
| **Toplam Satır** | **72,450+** |
| Kaynak Dosya | 185+ |
| Hazır Topoloji | 32 |
| Rehberli Ders | 4 |
| CLI Komut Ailesi | 180+ |

---

## Quick Start / Hızlı Başlangıç

```bash
npm install
npm run dev
```

## Documentation / Belgeler

- **Detailed Description / Ayrıntılı Açıklama**: [detay.md](detay.md)
- **Examples / Örnekler**: [examples.md](examples.md)
- **CLI Commands / CLI Komutları**: [CLI_COMMANDS.md](CLI_COMMANDS.md)
- **Installation / Kurulum**: [INSTALL.md](INSTALL.md)
- **Google Sheets Kurulum**: [Google Sheets](GOOGLE_SHEETS_SETUP.md)

## Tech Stack / Teknoloji

- Next.js 16.2, React 19, TypeScript 5.9, Tailwind CSS 4, Radix UI

## License / Lisans

Free and open source. See [LICENSE](LICENSE).
