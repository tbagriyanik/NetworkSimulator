# Network Simulator 2026

![Version](https://img.shields.io/badge/version-1.9.5-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%2016.2%20|%20React%2019%20|%20TypeScript%206.0%20|%20Tailwind%204-green)
![FOSS](https://img.shields.io/badge/FOSS-Free%20Open%20Source-brightgreen)
![Total Lines](https://img.shields.io/badge/total--lines-101,445-lightgrey)

A browser-based network simulator for learning switching, routing, wireless, IoT, CLI, and exam workflows.

**Live app:** [network2026.vercel.app](https://network2026.vercel.app)

---

## Quick Start

```bash
npm install && npm run dev
```
## Recent Updates / Son Güncellemeler

- **Mobile PNG Export / Mobil PNG Kaydetme:** Mobil cihazlarda sorunsuz çalışması için native 'Web Share API' (Paylaşım Ekranı) entegrasyonu ve bellek optimizasyonu sağlandı.
- **Improved Connection UX / Geliştirilmiş Kablo Bağlantı Deneyimi:** Porttan porta tıklayarak kablo bağlama işlemi (`onPointerDown` kullanılarak) anında tepki verecek şekilde kararlı hale getirildi.
- **Advanced Timeline / Gelişmiş İşlem Geçmişi:** İşlem adımlarına kaydırma (scroll) desteği ve daha detaylı bildirimler ("Switch1 ve PC1 arasına bağlantı eklendi") eklendi. Tüm geçmiş adımlarını `.txt` dosyası olarak indirebilme (dışa aktarma) özelliği getirildi. Geçmiş kayıtları sayfa yenilendiğinde (F5) kaybolmamak üzere yerel depolama (localStorage) ile kalıcı hale getirildi.
- **Glassmorphism Panels / Cam Efektli Paneller:** Arıza Giderme (Troubleshooting) ve İşlem Geçmişi (Timeline) panellerine şeffaf cam efekti (backdrop-blur) ve sürükle-bırak desteği eklendi.

## Stats / İstatistikler

| Metric / Metrik | Value / Değer |
| --- | ---: |
| Total Lines / Toplam Satır (src/) | 101,445 |
| Source Files / Kaynak Dosya | 269 |
| Documentation Files / Dokümantasyon Dosya | 16 |
| Example Projects / Örnek Proje | 46 |
| Guided Lessons / Rehberli Ders | 12 |
| Exams / Sınavlar | 6 |
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
| [doc/NETWORK_SIMULATOR_KITAPCIK.md](doc/NETWORK_SIMULATOR_KITAPCIK.md) | Comprehensive Turkish training booklet / Kapsamlı Türkçe eğitim kitapçığı |
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
