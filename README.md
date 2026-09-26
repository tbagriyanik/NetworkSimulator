# Network Simulator

![Version](https://img.shields.io/badge/version-6.7.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.3.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-06B6D4?logo=tailwindcss&logoColor=white)
![FOSS](https://img.shields.io/badge/FOSS-Free%20Open%20Source-brightgreen)
![Total Lines](https://img.shields.io/badge/total--lines-~228k-lightgrey)

A comprehensive, client-side, browser-based network simulator for learning switching, routing, wireless, security, IoT, CLI terminal workflows.

**Live App:** [network2026.vercel.app](https://network2026.vercel.app) · **Alternative:** [tuzlanet.vercel.app](https://tuzlanet.vercel.app)

### Demo & Videos / Tanıtım Videoları
- 📺 **Tanıtım 1:** [https://www.youtube.com/watch?v=2Xo-ZP5qgXI](https://www.youtube.com/watch?v=2Xo-ZP5qgXI)
- 📺 **Tanıtım 2:** [https://www.youtube.com/watch?v=rSW3LiQa290](https://www.youtube.com/watch?v=rSW3LiQa290)

---

## ⚡ Quick Start / Hızlı Başlangıç

```bash
# 1. Depoyu klonlayın ve bağımlılıkları yükleyin
npm install

# 2. Geliştirme sunucusunu başlatın (http://localhost:3000)
npm run dev

# 3. Tip kontrolü, lint ve testleri çalıştırın
npx tsc --noEmit
npm run check
```

---

### 🧩 CLI Varyasyon Desteği / CLI Alias Compatibility

Simülatör, standart komut formatının yanı sıra yaygın olarak kullanılan alternatif CLI biçimlerini de tanır. `configure terminal` gibi ana komutlar yanında; `system-view`, `show config` ve `display interface brief` gibi kısa veya farklı yazım biçimleri de aynı akışta çalışır. Bu sayede öğrenciler daha tanıdık komut kalıplarıyla pratik yapabilir, ancak sistem yine tek bir standart komut modeline dayanır.

---

## 📦 Derleme & Dağıtım / Build & Releases

### 🌐 1. Web Sürümü (Web Production)
```bash
npm run build
npm run start
```
Vercel, Node.js veya Docker ortamında tam dinamik API rotalarıyla çalışır.

### 🖥️ 2. Masaüstü Sürümleri (Windows, macOS, Linux)
Tauri v2 altyapısıyla yerel masaüstü uygulaması derlemek için:
```bash
# Yerel masaüstü derlemesi (.exe / .dmg / .deb / .AppImage)
npm run build:exe
```
Çıktılar `src-tauri/target/release/bundle/` altında oluşturulur.

### 🤖 3. Mobil Android Sürümü (Android APK)
```bash
# İlk kurulum (Android Studio & SDK yüklü olmalıdır)
npx tauri android init

# APK derlemesi
npx tauri android build --apk
```
Çıktı: `src-tauri/gen/android/app/build/outputs/apk/` dizininde üretilir.

### 🚀 4. GitHub Actions ile Otomatik Cross-Platform Release
Depoda `.github/workflows/release.yml` iş akışı bulunmaktadır. Yeni bir sürüm etiketi gönderildiğinde GitHub 3 ayrı işletim sisteminde (Windows, macOS, Ubuntu) derleme yapar ve **Releases** sayfasına indirme paketlerini otomatik ekler:

```bash
git add .
git commit -m "chore: release v6.6.0"
git tag v6.6.0
git push origin main --tags
```
**Üretilen Paketler:**
- 🪟 **Windows:** `.exe` (NSIS Yükleyici) & `.msi`
- 🍏 **macOS:** `.dmg` (Disk Kalıbı) & `.app`
- 🐧 **Linux:** `.deb` (Debian/Ubuntu paketi) & `.AppImage` (Evrensel Linux paketi)

---

### 💻 Sistem Gereksinimleri / System Requirements

| Rol / Platform | Gereksinimler | Açıklama |
| :--- | :--- | :--- |
| **Son Kullanıcı (Windows)** | Windows 10/11 | Microsoft Edge WebView2 yerleşiktir. Ekstra hiçbir kurulum gerekmez. |
| **Son Kullanıcı (macOS)** | macOS 10.15+ | WebKit yerleşiktir. `.dmg` çift tıklanarak doğrudan kurulur. |
| **Son Kullanıcı (Linux)** | Ubuntu, Debian, Fedora, Arch vb. | `webkit2gtk` kütüphanesi gerekir. `.AppImage` doğrudan çalışır. |
| **Son Kullanıcı (Mobil/PWA)** | iOS Safari / Android Chrome | Tarayıcıdan "Ana Ekrana Ekle" ile anında uygulama gibi kurulur. |
| **Geliştirici (Masaüstü Derleme)** | Node.js (>=20.9), Rust & Cargo, C++ Build Tools | `npm run build:exe` için gereklidir. |
| **Geliştirici (Android Derleme)** | Android Studio, Android SDK/NDK, Java (JDK 17+) | `tauri android build` için gereklidir. |


## 🚀 Key Features / Öne Çıkan Özellikler

- **🧪 Kurumsal CLI Regresyon Matrisi & Sorun Giderme (Troubleshooting) Modu:** CLI `no` komutları (`no shutdown`, `no ip address`, `no ip route`, `no access-group`, `no switchport access vlan` vb.) için uçtan uca E2E test matrisi, bozuk topoloji üretimi ile etkileşimli arıza enjeksiyonu (`wrongVlan`, `wrongGateway`, `shutdownPort`, `aclDeny`, `brokenTrunk`, `ospfIssue`, `natIssue`, `stpIssue`), hop-by-hop paket yolculuğu (ARP, VLAN, Routing, ACL, NAT, TTL) ve RFC uyumlu paket düşme nedenleri kaydı.
- **🏗️ 28 Kategori ve 49+ Örnek Proje Kataloğu:** Otomatik Topoloji Üretici penceresinde 8 ana kategori (Temel, Topoloji, Veri Merkezi, Kablosuz, Servisler, Anahtarlama, Yönlendirme, Güvenlik) ve 28 hazır mimari senaryo. Ofis Yazıcısı & Akıllı IoT Sensör, Python Ağ Otomasyonu (OOBM Filosu) ve Kurumsal DMZ Güvenlik Duvarı laboratuvarları.
- **💻 Gelişmiş CLI & Ağ İşletim Sistemi Simülasyonu:** Switch (L2/L3), Router, Güvenlik Duvarı (Firewall), WLC, PC, IoT ve Hub cihazları için 729+ benzersiz komut içeren terminal ve komut motoru. Komut kapsamı ile gerçek protokol/iletim davranışı özellik bazında değişebilir.
- **⚙️ Gerçek Zamanlı Protokol Durum Makineleri & Yaşlanma Engine:** OSPF (Down...Full), BGP (Idle...Established) ve LACP durum makineleri; ARP, CAM/MAC tablosu ve Dynamic NAT kaydı otomatik yaşlanma (aging) ve temizleme mekanizmaları.
- **📸 Topoloji Anlık Görüntü & Geri Yükleme:** Ağ topolojisini tek tıkla dondurma, kontrol noktaları (Checkpoint) oluşturma, JSON dışa/içe aktarma ve anlık geri yükleme.
- **🐍 Python Yorumlayıcısı, Dosya & GUI/Ses/3D İşlemleri:** PC terminalinde OOP, Decorator, Generator, `open()` ile sanal dosya I/O; `tkinter`/`form` ile görsel pencereli form uygulamaları; Web Audio API tabanlı dinamik nota/akor/müzik ve ses efekti (`audio`/`music`/`synth`) sentezleme; `scene3d`/`three3d` ile interaktif 3D sahne, katı geometri (CSG) ve ışıklandırma motoru; soket ağ programlama.
- **🖥️ Çapraz Platform Özellik Eşitliği:** macOS (`Cmd`) ve Windows/Linux (`Ctrl`) kısayol standardizasyonu, native dosya diyalogları ve çevrimdışı çalışma doğrulamaları.
- **🔍 Gelişmiş Teşhis & Sağlık Denetimi:** Native VLAN mismatch, çakışan IP/MAC tespiti, routing loop tespiti, orphan port denetimi ve tek komutla `show network health` raporu.

> **Kapsam notu:** README’de listelenen CLI, parser, state, paket yakalama ve forwarding özellikleri her protokolde aynı olgunluk seviyesinde değildir. NetFlow/sFlow, MQTT, CoAP, NETCONF-YANG ve RESTCONF için mevcut davranışlar eğitim amaçlı simülasyon kapsamındadır; “destekleniyor” ifadesi tek başına tam üretim protokol uygulaması veya gerçek harici collector/server uyumluluğu anlamına gelmez.

---

## 📊 Proje Durumu / Project Status

| Metrik / Metric | Değer / Value |
| --- | --- |
| Version / Sürüm | 6.7.0 |
| Total Lines / Toplam Satır (`src/`) | ~227,632 |
| Source Files / Kaynak Dosya | 1087 |
| Documentation Files / Dokümantasyon Dosya | 30 |
| Example Projects / Örnek Proje | 49 |
| Guided Lessons / Rehberli Ders | 19 |
| Exams / Sınavlar | 6 |

---

## 📖 Documentation / Dokümantasyon

| Bölüm / Section | Doküman / Document | Açıklama / Description |
| --- | --- | --- |
| 📘 **Ana Eğitim Kitapçığı** | [NETWORK_SIMULATOR_KITAPCIK.md](doc/training/NETWORK_SIMULATOR_KITAPCIK.md) | Tüm özellikler, CLI, eğitim, senaryolar ve laboratuvarlar (Kapsamlı Kitapçık) |
| 📗 **Uygulama & Kullanım Rehberi** | [NETWORK_SIMULATOR_REHBERI.md](doc/training/NETWORK_SIMULATOR_REHBERI.md) | Modüler şasi, mimari, cihaz tipleri, kablolar, bash/python rehberi |
| **Kurulum / Setup** | [INSTALL.md](INSTALL.md) | Kurulum ve derleme / Installation and build |
| **Başlangıç / Getting started** | [USAGE.md](doc/getting-started/USAGE.md) | Kullanım ve klavye kısayolları / Usage and shortcuts |
| | [PC_CMD_REFERENCE.md](doc/getting-started/PC_CMD_REFERENCE.md) | PC CMD komutları / PC CMD commands |
| | [TOPOLOGY_GENERATOR.md](doc/getting-started/TOPOLOGY_GENERATOR.md) | Topoloji üretici sihirbazı / Topology generator |
| **CLI** | [CLI_COMMANDS.md](doc/cli/CLI_COMMANDS.md) | CLI komut referansı / CLI command reference |
| | [CLI_GUIDED_TUTORIAL.md](doc/cli/CLI_GUIDED_TUTORIAL.md) | Rehberli CLI dersleri / Guided CLI lessons |
| **Ağ / Networking** | [WIRELESS_CONFIGURATION_GUIDE.md](doc/network/WIRELESS_CONFIGURATION_GUIDE.md) | Kablosuz ağ yapılandırması / Wireless configuration |
| | [L3_SWITCH_CONFIGURATION.md](doc/network/L3_SWITCH_CONFIGURATION.md) | L3 switch yapılandırması / L3 switch configuration |
| | [PACKET_CAPTURE_GUIDE.md](doc/network/PACKET_CAPTURE_GUIDE.md) | Paket yakalama paneli / Packet capture panel |
| **Referans / Reference** | [ProjeOzellikleri.md](doc/training/ProjeOzellikleri.md) | Özellik envanteri / Feature inventory |
| | [DOCUMENTATION_INDEX.md](doc/DOCUMENTATION_INDEX.md) | Tüm belgelerin indeksi / Documentation index |
| | [history.md](doc/history.md) | Sürüm geçmişi / Changelog |
| **Geliştirme / Development** | [CONTRIBUTING.md](doc/development/CONTRIBUTING.md) | Katkı ve geliştirme rehberi / Contribution guide |

---

## ⌨️ Keyboard Shortcuts / Klavye Kısayolları

Simülatör kontrollerine hızlıca göz atmak için aşağıdaki listeyi genişletin. Daha fazla detay için [USAGE.md](doc/getting-started/USAGE.md) dosyasına bakın.

<details>
<summary><b>⌨️ Click to expand Keyboard Shortcuts / Klavye Kısayollarını görmek için tıklayın</b></summary>

### Canvas / Tuval

| Shortcut / Kısayol | Action (EN) | İşlem (TR) |
| :--- | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo | Geri al |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Redo | Yeniden yap |
| <kbd>Ctrl</kbd> + <kbd>C</kbd> | Copy selected device | Seçili cihazı kopyala |
| <kbd>Ctrl</kbd> + <kbd>X</kbd> | Cut selected device | Seçili cihazı kes |
| <kbd>Ctrl</kbd> + <kbd>V</kbd> | Paste | Yapıştır |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Select all | Tümünü seç |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save project | Projeyi kaydet |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open project file | Proje dosyasını aç |
| <kbd>Ctrl</kbd> + <kbd>N</kbd> / <kbd>Alt</kbd> + <kbd>N</kbd> | New project | Yeni proje |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Print topology | Topolojiyi yazdır |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Toggle fullscreen | Tam ekrana geç / çık |
| <kbd>Shift</kbd> + <kbd>?</kbd> | Open Shortcuts guide modal | Kısayol kılavuzu modalını aç |
| <kbd>Alt</kbd> + <kbd>M</kbd> | Toggle Minimap display | Minimap (Harita) göster / gizle |
| <kbd>Alt</kbd> + <kbd>L</kbd> | Toggle Network Log panel | Ağ Olay Günlüğü panelini aç / kapat |
| <kbd>Alt</kbd> + <kbd>F</kbd> | Zoom to fit all devices | Tüm cihazları ekrana sığdır (Fit View) |
| <kbd>Alt</kbd> + <kbd>R</kbd> | Reset zoom/pan view | Görünümü sıfırla |
| <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Delete selected | Seçili öğeyi sil |
| <kbd>Escape</kbd> | Cancel selection / Close mode | Seçimi iptal et / Modu kapat |
| <kbd>Ctrl</kbd> + <kbd>Drag</kbd> | Snap to grid | Nokta ızgaraya yapıştır |
| <kbd>Ctrl</kbd> + <kbd>Scroll</kbd> | Zoom in / out | Yakınlaştır / Uzaklaştır |
| <kbd>Space</kbd> + <kbd>Drag</kbd> | Pan canvas | Canvas'ı kaydır |
| <kbd>Arrow Keys</kbd> | Move selected device(s) | Seçili cihaz(lar)ı taşı |
| <kbd>Shift</kbd> + <kbd>Arrow Keys</kbd> | Move selected device(s) faster | Seçili cihaz(lar)ı daha hızlı taşı |
| <kbd>Mouse Selection</kbd> | Auto-Copy text on mouse selection | CMD, CLI & Konsol geçmişinden metin seçilince otomatik kopyalama |
| <kbd>F1</kbd> | Open / close help panel | Yardım panelini aç / kapat |
| <kbd>F2</kbd> | Rename / configure selected device | Seçili cihazı yeniden adlandır / yapılandır |
| <kbd>F5</kbd> | Refresh network topology | Ağ topolojisini yenile |
| <kbd>Tab</kbd> | Focus next device | Sonraki cihaza odaklan |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Open window switcher when windows are open | Açık pencereler arasında geçiş yap |
| <kbd>Ctrl</kbd> + <kbd>M</kbd> | Minimize active device window | Etkin cihaz penceresini küçült |
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

---

## 🛠️ Tech Stack / Teknoloji

- **Framework:** Next.js 16 (App Router), React 19
- **Language:** TypeScript 7.0
- **Styling:** Tailwind CSS 4, Radix UI Icons & Components
- **State Management:** Zustand 5.0
- **PDF Engine:** jsPDF + High-DPI HTML5 Canvas

---

## 📜 License / Lisans

Free and open source under the MIT License. See [LICENSE](LICENSE).

Özgür ve açık kaynak. [LICENSE](LICENSE) dosyasına bakın.
