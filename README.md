# Network Simulator

![Version](https://img.shields.io/badge/version-1.9.8-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%2016.2%20|%20React%2019%20|%20TypeScript%206.0%20|%20Tailwind%204-green)
![FOSS](https://img.shields.io/badge/FOSS-Free%20Open%20Source-brightgreen)
![Total Lines](https://img.shields.io/badge/total--lines-109,699-lightgrey)

A browser-based network simulator for learning switching, routing, wireless, IoT, CLI, and exam workflows.

**Live app:** [network2026.vercel.app](https://network2026.vercel.app)

---

## Quick Start

```bash
npm install && npm run dev
```

## Recent Updates / Son Güncellemeler

- **Industry-Specific Scenarios / Sektörel Senaryolar:** Hastane, E-Ticaret, Okul Kampüsü ve SOHO gibi gerçek dünya kullanım senaryoları eklendi.
- **Advanced IPv6 Master Lab / Gelişmiş IPv6 Laboratuvarı:** Dual-stack, OSPFv3 ve IPv6 ACL konularını içeren kapsamlı yeni eğitim modülü eklendi.
- **"Bana Öğret" Rehberli Dersleri / Teach Me Guided Lessons:** Sıfırdan öğretim için 3 yeni seviye (Temel, Orta, İleri) eklendi; ipconfig, enable, configure terminal, hostname, router IP yapılandırma, OSPF ve ACL adım adım öğretiliyor.
- **PC Tabanlı Arıza Giderme / PC-based Troubleshooting:** Arıza tanımları artık PC özelliklerini (IP, gateway, DNS) doğrulayabiliyor; otomatik komut yazdırma (`pc-auto-type`) desteği eklendi.
 
## Stats / İstatistikler

| Metric / Metrik | Value / Değer |
| --- | ---: |
| Total Lines / Toplam Satır (src/) | 109,699 |
| Source Files / Kaynak Dosya | 315 |
| Documentation Files / Dokümantasyon Dosya | 23 |
| Example Projects / Örnek Proje | 43 |
| Guided Lessons / Rehberli Ders | 19 |
| Exams / Sınavlar | 6 |
| CLI Commands / CLI Komutları | 386+ |

## Documentation / Dokümantasyon

| Document / Doküman | Description / Açıklama |
| --- | --- |
| [INSTALL.md](INSTALL.md) | Installation & build instructions / Kurulum & derleme talimatları |
| [USAGE.md](doc/getting-started/USAGE.md) | Usage guide & keyboard shortcuts (TR/EN) / Kullanım kılavuzu & klavye kısayolları |
| [NETWORK_SIMULATOR_KITAPCIK.md](doc/training/NETWORK_SIMULATOR_KITAPCIK.md) | Comprehensive Turkish training booklet / Kapsamlı Türkçe eğitim kitapçığı |
| [history.md](doc/history.md) | Full changelog newest-to-oldest / Yeniden eskiye tam değişiklik geçmişi |
| [DOCUMENTATION_INDEX.md](doc/DOCUMENTATION_INDEX.md) | Documentation index & reading map / Diğer tüm belgeler için indeks |
| [ProjeOzellikleri.md](doc/training/ProjeOzellikleri.md) | Full features inventory (TR/EN) / Tüm özellikler envanteri (TR/EN) |
| [CONTRIBUTING.md](doc/development/CONTRIBUTING.md) | Dev agent conventions, version bump & rollback + contribution guide |

## Keyboard Shortcuts / Klavye Kısayolları

For a quick reference of simulator controls, expand the list below. For more details, see [USAGE.md](doc/getting-started/USAGE.md).
Simülatör kontrollerine hızlıca göz atmak için aşağıdaki listeyi genişletin. Daha fazla detay için [USAGE.md](doc/getting-started/USAGE.md) dosyasına bakın.

<details>
<summary><b>⌨️ Click to expand Keyboard Shortcuts / Klavye Kısayollarını görmek için tıklayın</b></summary>

### Canvas / Tuval

| Shortcut / Kısayol | Action (EN) | İşlem (TR) |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo | Geri al |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo | Yeniden yap |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Copy selected device | Seçili cihazı kopyala |
| <kbd>Ctrl</kbd> + <kbd>X</kbd> | Cut selected device | Seçili cihazı kes |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste | Yapıştır |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Select all | Tümünü seç |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save project | Projeyi kaydet |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open project file | Proje dosyasını aç |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> / <kbd>Alt</kbd> + <kbd>N</kbd> | New project | Yeni proje |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Print topology | Topolojiyi yazdır |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Toggle fullscreen | Tam ekrana geç / çık |
| <kbd>Alt</kbd> + <kbd>R</kbd> | Reset zoom/pan view | Görünümü sıfırla |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected | Seçili öğeyi sil |
| <kbd>Escape</kbd> | Cancel selection / Close mode | Seçimi iptal et / Modu kapat |
| <kbd>Ctrl</kbd> + <kbd>Scroll</kbd> | Zoom in / out | Yakınlaştır / Uzaklaştır |
| <kbd>Space</kbd> + <kbd>Drag</kbd> | Pan canvas | Canvas'ı kaydır |
| <kbd>Arrow Keys</kbd> | Move selected device(s) | Seçili cihaz(lar)ı taşı |
| <kbd>Shift</kbd> + <kbd>Arrow Keys</kbd> | Move selected device(s) faster | Seçili cihaz(lar)ı daha hızlı taşı |
| <kbd>F1</kbd> | Open / close help panel | Yardım panelini aç / kapat |
| <kbd>F5</kbd> | Refresh network topology | Ağ topolojisini yenile |
| <kbd>Home</kbd> | Reset topology view | Topoloji görünümünü sıfırla |
| <kbd>End</kbd> | Focus last element | Son öğeye odaklan |
| <kbd>Page Up</kbd> | Scroll canvas up | Canvas'ı yukarı kaydır |
| <kbd>Page Down</kbd> | Scroll canvas down | Canvas'ı aşağı kaydır |
| <kbd>Double-click (Empty Space)</kbd> | Reset topology view | Topoloji görünümünü sıfırla |
| <kbd>Double-click (Device)</kbd> | Open collapsible device panel | Daraltılabilir cihaz panelini aç |

### Ping Packet Analysis / Ping Paket Analizi

| Shortcut / Kısayol | Action (EN) | İşlem (TR) |
| :--- | :--- | :--- |
| <kbd>P</kbd> | Play / Pause packet analysis | Paket analizi: Oynat / Duraklat |
| <kbd>N</kbd> | Next hop (when paused) | Sonraki Hop (duraklatıldığında) |

### CLI / CMD

| Shortcut / Kısayol | Action (EN) | İşlem (TR) |
| :--- | :--- | :--- |
| <kbd>Tab</kbd> | Auto-complete command | Komut tamamlama |
| <kbd>Arrow Up</kbd> / <kbd>Down</kbd> | Command history | Komut geçmişi |
| <kbd>Enter</kbd> | Execute command | Komutu çalıştır |
| <kbd>Ctrl</kbd> + <kbd>L</kbd> | Clear terminal | Terminali temizle |
| <kbd>?</kbd> | Show available commands | Kullanılabilir komutları göster |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Cancel command (CLI) | Komutu iptal et |

</details>

## Architecture / Mimari

### C4 Architecture Diagrams

**1. System Context Diagram**
```mermaid
C4Context
    title System Context Diagram for Network Simulator
    
    Person(user, "User", "Student, Instructor, or Network Enthusiast")
    System(netsim, "Network Simulator", "Browser-based interactive network simulator for learning switching, routing, wireless, and IoT.")
    
    Rel(user, netsim, "Uses", "Web Browser")
```

**2. Container Diagram**
```mermaid
C4Container
    title Container Diagram for Network Simulator 

    Person(user, "User", "Student, Instructor, or Network Enthusiast")

    System_Boundary(netsim_system, "Network Simulator") {
        Container(web_app, "Web Application", "Next.js, React, Tailwind CSS", "Delivers the SPA, renders the interactive topology canvas, CLI panels, and UI modals.")
        Container(sim_engine, "Simulation Engine", "TypeScript", "Core logic handling OSI layers, CLI parsing, packet forwarding, STP, ARP, and dynamic routing.")
        Container(state_store, "State Management", "Zustand", "Centralized store holding global application state and topology configurations.")
        ContainerDb(local_storage, "Local Storage", "Browser LocalStorage & IndexedDB", "Persists saved topologies, custom settings, and achievement records locally.")
    }

    Rel(user, web_app, "Interacts with", "Web Browser")
    Rel(web_app, state_store, "Reads/Updates state", "Zustand hooks")
    Rel(web_app, sim_engine, "Triggers network events", "Function calls")
    Rel(sim_engine, state_store, "Calculates & mutates state", "Direct modifications")
    Rel(state_store, local_storage, "Persists state", "Browser APIs")
```

### Directory Structure

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
└── tests/               # Unit & integration tests (Vitest, 552 tests)
```

## Tech Stack / Teknoloji

Next.js 16.2, React 19, TypeScript 6.0, Tailwind CSS 4, Radix UI, Zustand 5.0

## License / Lisans

Free and open source. See [LICENSE](LICENSE).

Özgür ve açık kaynak. [LICENSE](LICENSE) dosyasına bakın.
