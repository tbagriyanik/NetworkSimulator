# Kurulum Talimatları - Network Simulator

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükle

```bash
pnpm install
```

veya

```bash
npm install
```

### 2. Geliştirme Sunucusunu Başlat

```bash
pnpm dev
```

veya

```bash
npm run dev
```

Tarayıcıda açın: [http://localhost:3000](http://localhost:3000)

## 📋 Sistem Gereksinimleri

- **Node.js**: 18.0 veya üzeri
- **npm**: 9.0 veya üzeri (veya bun)
- **Tarayıcı**: Modern tarayıcı (Chrome, Firefox, Safari, Edge)

## 📦 Yüklü Paketler

### Core Dependencies
- **Next.js 16.2** - React framework
- **React 19** - UI library
- **TypeScript 6.0** - Type safety
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
- **isomorphic-dompurify** - HTML sanitization

### Database & Storage
- **@upstash/redis** - Redis for room tracking & session management

## 🔧 Yapılandırma

### TypeScript
```bash
pnpm tsc --noEmit
```

### Linting
```bash
pnpm lint
```

### Build
```bash
pnpm build
```

### Test
```bash
pnpm test
pnpm vitest        # watch mode
```

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
└── tests/            # Unit & integration tests (Vitest, 552+ tests)

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

### Gelişmiş Özellikler
- ✅ Zoom ve pan (fare tekerleği / klavye)
- ✅ Multi-select (Shift + tık)
- ✅ Tuval seçimi (orta tık + sürükle)
- ✅ Pürüzsüz pencere sürükleme (edge snapping kaldırıldı)
- ✅ PC servis kalıcılığı (DHCP/DNS/HTTP ayarları yenilemede korunur)
- ✅ Dark/Light mode
- ✅ Turkish/English support
- ✅ Offline storage
- ✅ Canlı uygulama: network2026.vercel.app
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
- **CLI_GUIDED_TUTORIAL.md** - 30 derslik CLI rehberli eğitim (ACL, NAT, OSPF, EIGRP dahil)
- **CLI_COMMANDS.md** - 450+ CLI komut referansı
- **L3_SWITCH_CONFIGURATION.md** - L3 Switch yapılandırma rehberi
- **QUICK_REFERENCE.md** - Hızlı referans ve kod parçacıkları
- **WIRELESS_CONFIGURATION_GUIDE.md** - Kablosuz ağ yapılandırma rehberi
- **GOOGLE_SHEETS_SETUP.md** - Google Sheets entegrasyonu kurulumu
- **ROOM_TRACKING_SETUP.md** - Oda takip sistemi kurulumu
- **SERVICE_FEATURES.md** - PC servis özellikleri (FTP, Mail, NTP, DNS, HTTP, DHCP)
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
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
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
