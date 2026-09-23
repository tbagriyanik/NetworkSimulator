# Kurulum Talimatları - Network Simulator

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

Tarayıcıda açın: [http://localhost:3000](http://localhost:3000)

## 📋 Sistem Gereksinimleri

### Web Geliştirme (Web / Local Dev)
- **Node.js**: 20.9 veya üzeri (Next.js 16 gereksinimi)
- **npm**: 10 veya üzeri (veya pnpm)
- **Tarayıcı**: Modern Chromium, Firefox veya Safari

### Masaüstü Sürümleri (Desktop: Windows, macOS, Linux)

#### 1. Son Kullanıcı Bilgisayarı
- **Windows:** Windows 10 (güncel) veya Windows 11 (64-bit). Microsoft Edge WebView2 yerleşiktir. Setup (.exe / .msi) ile doğrudan kurulur.
- **macOS:** macOS 10.15+ (Intel & Apple Silicon). `.dmg` dosyası açılarak Applications klasörüne sürüklenir.
- **Linux:** Ubuntu, Debian, Fedora, Arch vb. `.deb` paketi kurulabilir veya `.AppImage` doğrudan çift tıklanarak çalıştırılır.
- *Son kullanıcının bilgisayarında Node.js, Rust veya Git bulunmasına gerek yoktur.*

#### 2. Geliştirici Bilgisayarı (Yerel Derleme İçin)
- **Rust & Cargo:** [https://rustup.rs/](https://rustup.rs/)
- **C++ Derleme Araçları:** Windows için Visual Studio C++ Build Tools, Mac için Xcode CLI, Linux için `build-essential` & `libwebkit2gtk-4.1-dev`.
- **Node.js & npm / pnpm:** Proje bağımlılıkları için.


## 📦 Yüklü Paketler

### Core Dependencies
- **Next.js 16.3** - React framework
- **React 19** - UI library
- **TypeScript 7.0** - Type safety
- **Tailwind CSS 4** - Styling
- **jspdf** - PDF generation

### UI Components
- **shadcn/ui** - Component library
- **Radix UI** - Headless UI components (@radix-ui/react-*)
- **Lucide React** - Icons

### State Management
- **Zustand 5.0** - State management
- **React Context** - Global context

### Utilities
- **clsx** - Conditional classnames
- **class-variance-authority** - CSS class variants
- **tailwind-merge** - Tailwind class merging
- **tailwindcss-animate** - Animation utilities

### Database & Storage
- **@upstash/redis** - Redis for room tracking & session management

## 🔧 Yapılandırma

### TypeScript
```bash
npx tsc --noEmit
```

### Build
```bash
# Web üretim derlemesi
npm run build

# Masaüstü (.exe / .msi) yerel derlemesi
npm run build:exe
```

### GitHub Releases ile Otomatik .exe Dağıtımı
Projede `.github/workflows/release.yml` GitHub Actions iş akışı tanımlıdır. Yeni bir sürüm etiketi (tag) gönderdiğinizde GitHub otomatik olarak Windows üzerinde `.exe` derleyip GitHub Release'e ekler:

```bash
git add .
git commit -m "chore: release v6.5.0"
git tag v6.5.0
git push origin main --tags
```


### Test
```bash
npm run test
npm run test -- --watch
```

### Vercel Environment Variables / Vercel Ortam Değişkenleri

Sınav skor imzaları, doğrulama kaydı ve rehberli ders sertifikaları production ortamında güvenlik ve doğrulama için aşağıdaki değişkenlere ihtiyaç duyar. Vercel Project Settings > Environment Variables bölümünde **Production** için tanımlayın ve yeni deployment başlatın:

```env
CERTIFICATE_SECRET=<uzun-rastgele-gizli-deger>
EXAM_HMAC_KEY=<uzun-rastgele-hmac-anahtari>
KV_REST_API_URL=<upstash-rest-url>
KV_REST_API_TOKEN=<upstash-rest-token>
APP_URL=https://yourappUrl
```

`CERTIFICATE_SECRET` ve `EXAM_HMAC_KEY` production ortamında mutlaka tanımlanmalıdır (tanımlanmadığı takdirde production startup'ında güvenlik hatası fırlatılır). `KV_REST_API_URL` ve `KV_REST_API_TOKEN` tanımlı değilse PDF indirilebilir ancak sertifika doğrulama kodu kalıcı olarak saklanamaz.

---

## 🐛 Sorun Giderme

### PowerShell Execution Policy Hatası

Eğer şu hatayı alırsanız:
```
cannot be loaded because running scripts is disabled on this system
```

**Çözüm 1:** CMD kullanın
```cmd
npm install
```

**Çözüm 2:** PowerShell'de bypass yapın
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm install
```

### Bağımlılık Hatası

Eğer modül bulunamadı hatası alırsanız:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 Zaten Kullanılıyorsa

```bash
npm run dev -- -p 3001
```

## 📚 Proje Yapısı

```
src/
├── app/              # Next.js App Router (pages, API, layout)
├── components/       # React components (ui/, network/)
├── contexts/         # React contexts (theme, mode, language)
├── hooks/            # Custom React hooks
├── lib/              # Core logic (network/, security/, store/, etc.)
├── utils/            # Utilities (achievements, etc.)
└── tests/            # Unit, integration, accessibility and performance tests (Vitest)

public/              # Static files (icons, device images)
doc/                 # Project documentation (23 files)
examples/            # Feature demo docs
```

## 🎯 Özellikler

### Network Simulator
- ✅ Cihaz yönetimi (PC, Switch, Router, Firewall, IoT)
- ✅ Bağlantı yönetimi (Straight, Crossover, Console, WiFi)
- ✅ VLAN konfigürasyonu (access, trunk, native, VTP)
- ✅ IP routing (IPv4/IPv6) — RIP, OSPF, OSPFv3, EIGRP, static
- ✅ Ping ve connectivity kontrol
- ✅ Akıllı CLI Terminal Öneri Sistemi (typo algılaması + komut önerileri)
- ✅ Firewall/Dynamic Access Control Lists (Standard & Extended ACL)
- ✅ DHCP / DHCPv6 havuz yönetimi
- ✅ NAT (Static, Dynamic, PAT/Overload)
- ✅ HSRP yedeklilik

### Sınav Modu (Exam Mode)
- ✅ Öğretmen tarafı sınav oluşturma ve düzenleme editörü
- ✅ Proje → Sınav dönüştürme
- ✅ Öğrenci sınav dağıtımı (.json / .exam dosya formatı)
- ✅ Gelişmiş sınav içe aktarma: akıllı PC IP çıkarma, bağlantı ayrıştırma, not çıkarma, ağırlıklı puanlama
- ✅ Zamanlayıcı, puanlama ve sınav bittiğinde dondurulan sonuç ekranı
- ✅ Mobil uyumlu sınav yönetimi ve görev yeniden sıralama

### Rehberli Ders Modu (Guided Mode) & Tutorial Wizard
- ✅ Adım adım rehberli dersler (otomatik doğrulama, puan, ilerleme)
- ✅ Tutorial Wizard oyunlaştırma (points, progress, gamification)
- ✅ CLI + Yapılandırma + Bağlantı + Ping adım doğrulamaları

### IoT & Çevre İzleme
- ✅ WiFi bağlantısı ile IoT cihazları (sensör, aktüatör)
- ✅ Router AP modunda WiFi ağı (open / WPA2)
- ✅ DHCP ile otomatik IP atama (IoT + WiFi istemcileri)
- ✅ IoT Panel (sensor/actuator yönetimi, kurallar)

### Not Sistemi
- ✅ Not ekleme/silme
- ✅ Not sürükleme ve yeniden boyutlandırma
- ✅ Not stil özelleştirmesi
- ✅ Undo/Redo desteği

### Başarım Sistemi (Achievements)
- ✅ Rozet/badge sistemi ile kullanıcı başarımları
- ✅ İzlenebilir kilometre taşları ve ödül bildirimleri
- ✅ Profil ilerleme takibi

### 🆕 v4.1.0 Yeni Özellikler
- **🖥️ 4 Yeni Cihaz Tipi:** Hub (Layer-1 Multiport), Cloud/WAN (Dış İnternet), Smartphone/Tablet (Mobil), Printer (Ağ Yazıcısı)
- **🌲 MSTP Bölge İzolasyonu:** IEEE 802.1s ile bölge adı, revizyon ve digest eşleşmesi
- **🔒 IPsec Site-to-Site & GRE:** ISAKMP, ESP şifreleme, crypto-map
- **🔐 802.1X EAPOL:** Port erişim kontrolü ve RADIUS kimlik doğrulama
- **⚡ QoS Token Bucket:** Bandwidth policing (`police`) ve shaping (`shape`)
- **🧹 DHCP Snooping Option 82:** Circuit ID injection ve rate-limiting
- **🌐 BGP Politikaları:** Route-map filtering ve weight assignment

### Gelişmiş Özellikler
- ✅ Zoom ve pan (fare tekerleği / klavye)
- ✅ Multi-select (Shift + tık)
- ✅ Tuval seçimi (orta tık + sürükle)
- ✅ Pürüzsüz pencere sürükleme (edge snapping kaldırıldı)
- ✅ PC servis kalıcılığı (DHCP/DNS/HTTP ayarları yenilemede korunur)
- ✅ Dark/Light mode
- ✅ Turkish/English support
- ✅ Offline storage
- ✅ Canlı uygulama: [network2026.vercel.app](https://network2026.vercel.app)
- ✅ Alternatif canlı uygulama: [tuzlanet.vercel.app](https://tuzlanet.vercel.app)
- ✅ Oda takip sistemi (öğrenci oturum takibi)
- ✅ Google Sheets entegrasyonu
- ✅ OSPF Multi-Area (Area 0/10/20)
- ✅ STP PVST yük dengeleme
- ✅ 2 L3 Switch VLAN Routing
- ✅ All Services Lab (DNS, HTTP, DHCP, FTP, MAIL, NTP)
- ✅ IPv6 + DHCPv6 + OSPFv3

## 📖 Belgelendirme

Detaylı belgelendirme `doc/` klasöründe bulunur:

- **README.md** - Dokümantasyon giriş sayfası
- **USAGE.md** - Kullanım kılavuzu ve klavye kısayolları (TR/EN)
- **CLI_GUIDED_TUTORIAL.md** - CLI rehberli eğitim (ACL, NAT, OSPF, EIGRP dahil)
- **CLI_COMMANDS.md** - CLI komut referansı
- **L3_SWITCH_CONFIGURATION.md** - L3 Switch yapılandırma rehberi
- **QUICK_REFERENCE.md** - Hızlı referans ve kod parçacıkları
- **WIRELESS_CONFIGURATION_GUIDE.md** - Kablosuz ağ yapılandırma rehberi
- **GOOGLE_SHEETS_SETUP.md** - Google Sheets entegrasyonu kurulumu
- **ROOM_TRACKING_SETUP.md** - Oda takip sistemi kurulumu
- **CONTRIBUTING.md** - Katkı rehberi ve agent konvansiyonları
- **ERROR_HANDLING_GUIDE.md** - Hata kontrol rehberi
- **INTEGRATION_GUIDE.md** - Entegrasyon rehberi
- **DOCUMENTATION_INDEX.md** - Dokümantasyon haritası

## 🚀 Deployment

### Vercel'e Deploy

```bash
npm run build
vercel deploy
```

### Docker ile Deploy

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 📞 Destek

Sorunlar için `doc/` klasöründeki belgelendirmeyi kontrol edin.

## 📝 Lisans

FOSS License

## ✅ Kontrol Listesi

Kurulum sonrası kontrol edin:

- [ ] npm install başarılı
- [ ] npm run dev çalışıyor
- [ ] http://localhost:3000 açılıyor
- [ ] Network simulator yükleniyor
- [ ] Cihaz ekleyebiliyorsunuz
- [ ] Bağlantı oluşturabiliyorsunuz
- [ ] Ping atabiliyorsunuz
- [ ] Not ekleyebiliyorsunuz
