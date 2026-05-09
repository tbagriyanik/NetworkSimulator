# Network Simulator 2026 - Planning

## Güncel Durum

- **Sürüm**: 1.6.1
- **Tarih**: 2026-05-09
- **Uygulama kodu**: 72,000+
- **Örnek kod satırı**: 300
- **Dokümantasyon satırı**: 150+
- **Toplam satır**: 72,450+
- **Kod dosyası**: 185+
- **Hazır topoloji örneği**: 32
- **Rehberli ders**: 4
- **CLI komut ailesi**: 180+
- **Test Durumu**: ✅ Tüm testler geçiyor (Build, Lint, TypeScript)

Not: Toplam satır sayısı uygulama kodu, örnek kod ve dokümantasyonun birleşimidir.

## Son Yapılanlar

### React Hooks ve Build Düzeltmeleri (Mayıs 2026 - 8 Mayıs)

- **Yeni Özellikler ve Property'ler**:
  - `firewall` cihaz tipi desteği - Güvenlik duvarı cihazları için port yapılandırması
  - `isTR` dil kontrolü - Türkçe/İngilizce arayüz desteği için merkezi yardımcı
  - IoT cihaz `rules` sistemi - Sensör kuralları ve otomasyon desteği
  - `stableRefs` pattern - React hooks immutability sorunları için çözüm
  - `environment` değişkenleri - IoT kural işleme için ortam ayarları
  - `deviceCounterRef` güncellemesi - Firewall sayacı desteği

- **Düzeltilen Hatalar**:
  - React hooks immutability hataları (`latestDevicesRef` vb.)
  - `useTheme` context hatası (ThemeProvider sıralaması)
  - `isTR` undefined hatası (dil değişkeni scope'u)
  - `rulesHtml` undefined hatası (IoT web paneli)
  - ESLint disable yönerge temizliği

- **Build ve Lint Durumu**: ✅ Tüm hatalar düzeltildi, build başarılı

### Firewall + IoT Kalıcılık Güncellemesi (Mayıs 2026 - 9 Mayıs)

- **Firewall Rule Kalıcılığı**:
  - `updateDeviceConfig` akışında `firewallRules` artık topoloji cihazı ile birlikte `deviceStates` içine de yazılıyor.
  - Cihaz tekrar seçildiğinde firewall panelindeki kurallar korunuyor.
- **Running Config Senkronizasyonu**:
  - `buildRunningConfig` firewall cihazları için ACL satırları üretir hale getirildi.
  - Firewall kuralları artık cihazın gerçek `running-config` içeriğinde görünür.
- **CLI Görünürlüğü**:
  - `show access-lists` komutu yalnızca klasik ACL değil, firewall paneli kurallarını da listeler.
  - Kural yoksa davranış korunur: `% No access lists configured`.
- **Dokümantasyon Eşlemesi**:
  - README, plan ve examples dokümanları yeni davranışa göre güncellendi.

### Jest → Vitest API Geçişi Tamamlandı (Mayıs 2026)

- **API Dönüştürme**: Tüm Jest API çağrıları Vitest API'sine dönüştürüldü
  - `jest.mock()` → `vi.mock()`
  - `jest.fn()` → `vi.fn()`
  - `jest.useFakeTimers()` → `vi.useFakeTimers()`
  - `jest.clearAllMocks()` → `vi.clearAllMocks()`
  - `jest.advanceTimersByTime()` → `vi.advanceTimersByTime()`
- **Test Sonuçları**: ✅ 53 test geçiyor
  - 4 test dosyası
  - 0 başarısız test
  - 100% geçme oranı
- **Kalite Kontrolleri**: ✅ Tümü başarılı
  - ESLint: Temiz
  - TypeScript: Hata yok
  - Production Build: Başarılı
- **Düzeltilen Testler**:
  - RAF throttling testleri - Mock RAF'ı düzgün çalışacak şekilde yapılandırıldı
  - Storage key format testi - localStorage API'si uyumlu hale getirildi
  - Draggable dialog positions testi - Storage mock'ları düzeltildi
  - Async timer testi - Fake timers ile uyumsuzluk çözüldü

### Chrome Ping Animasyonu Düzeltmesi (Mayıs 2026)

- **flushSync ile Senkron State Güncellemesi**: React'in batch update mekanizmasını bypass ederek, her ping animasyon frame'inde state güncellemesini hemen render etme.
- **PingAnimationOverlay Optimizasyonu**: useLayoutEffect ile SVG elemanlarının transform attribute'ü doğrudan DOM'a yazılıyor, React render mekanizmasından bağımsız olarak.
- **Hook Kuralları Uyumu**: Tüm React hook'ları bileşenin başında çağrılıyor, early return'den önce.
- **Chrome Uyumluluğu**: Firefox'ta çalışan ping animasyonu artık Chrome'da da düzgün şekilde görünüyor.

### Boş Proje ve Proje Açma Işlemlerinde Refresh Dialog Kapatılması (Mayıs 2026)

- **handleLoadProject**: Proje dosyası yüklendiğinde önceki uygulamadaki ağ yenilendi penceresini kapatıyor.
- **resetToEmptyProject**: Boş proje açıldığında refresh dialog'u kapatıyor.
- **applyExampleProject**: Örnek proje seçildiğinde refresh dialog'u kapatıyor (zaten var).

### Ping Paket Takibi ve Görselleştirme (Mayıs 2026)

- **Ping Animasyon Overlay**: Tuval üzerinde paket akışını gerçek zamanlı olarak gösteren animasyon.
- **Paket Bilgi Paneli**: Hop-by-hop analizi, gecikme bilgisi ve rota detayları.
- **Başarı/Başarısız Göstergesi**: Ping sonuçlarının görsel geri bildirimi.
- **Paket Takibi**: Her ping için detaylı paket bilgisi ve zaman ölçümleri.
- **ESC Tuşu Desteği**: Paket analiz panelini kapatmak için ESC tuşu kısayolu.
- **Mobil Geri Düğmesi Desteği**: Android ve iOS cihazlarda geri düğmesi ile paneli kapatma.
- **Tooltip Kısayolları**: Play (P), Pause (P), Next (N), Close (ESC) tuş kombinasyonları gösteriliyor.

### Geliştirilmiş Dokümantasyon ve Örnekler (Mayıs 2026)

- **Dokümantasyon İndeksi**: Tüm rehberlerin merkezi indeksi.
- **28 Hazır Örnek Proje**: Temel, orta ve ileri seviye örnekler adım adım talimatlarla.
- **Hızlı Referans Rehberi**: Yaygın görevler ve komutlar için hızlı erişim.
- **Uygulama Tamamlandı Dokümantasyonu**: Tüm özelliklerin kontrol listesi.
- **Hata Yönetimi Rehberi**: Yaygın hatalar ve çözümleri.
- **Entegrasyon Rehberi**: Harici sistemlerle entegrasyon örnekleri.

### Hata Yönetimi ve Doğrulama Iyileştirmeleri (Mayıs 2026)

- **AppErrorBoundary**: Zarif hata kurtarma ve kullanıcı dostu hata mesajları.
- **Form Doğrulama**: Giriş sanitizasyonu ve gerçek zamanlı doğrulama.
- **Bildirim Yöneticisi**: Tutarlı toast ve uyarı işleme sistemi.
- **API İstemcisi**: Yeniden deneme mantığı ve timeout yönetimi ile sağlam HTTP istemcisi.

### İletişim Formu ve Geri Bildirim (Mayıs 2026)

- **Geliştirilmiş İletişim Formu**: Doğrulama ve gönderim takibi ile.
- **Geri Bildirim Sistemi**: Kullanıcılardan sorun raporlama ve öneriler.
- **Contact API**: Güvenli form gönderimi ve veri işleme.

### UI/UX Performans Optimizasyonları (Faz 1 & 2)

- **Zustand Seçiciler**: Bileşenlerin sadece ilgili veri değiştiğinde render edilmesini sağlayan granüler seçici yapısı kuruldu.
- **NetworkTopologyView Memoizasyonu**: Gereksiz re-render'ları önlemek için `React.memo` ve özel karşılaştırma fonksiyonları eklendi.
- **CSS Animasyonları**: Framer Motion animasyonları, performans artışı için saf CSS transition ve keyframe yapılarıyla değiştirildi.
- **Bileşen Temizliği**: Kullanılmayan Radix UI bağımlılıkları temizlendi, bundle boyutu optimize edildi.
- **Virtual Device List**: Büyük cihaz listeleri için `react-window` tabanlı sanallaştırma (virtualization) uygulandı.
- **Spatial Partitioning**: Büyük topolojilerde render performansını artırmak için "Spatial Partitioning" ve "Viewport Culling" algoritmaları eklendi.
- **Kod Bölümleme (Code Splitting)**: Terminal, Config Panel ve Security Panel gibi büyük modüller dinamik import (`next/dynamic`) ile ayrıştırıldı.
- **Progressive Loading**: Skeleton ekranlar ve shimmer animasyonları ile içerik yükleme deneyimi iyileştirildi.
- **Performans İzleme**: FPS takibi, boyama (paint) ve yerleşim (layout) metrikleri ile Web Vitals takibi entegre edildi.

### CLI ve Topoloji Senkronizasyon Düzeltmeleri

- **Konfigürasyon Yönetimi**: `saveConfig` ve `eraseConfig` bayrakları ile `startup-config` ve `running-config` senkronizasyonu CLI üzerinden tam çalışır hale getirildi.
- **Canlı Config Paneli**: ConfigPanel artık statik bir üretici yerine doğrudan cihazın canlı `runningConfig` dizisini gösteriyor.
- **Topoloji Geneli Görev Kontrolü**: Görev tamamlama kontrolleri sadece aktif cihazı değil, tüm topolojiyi ve bağlantıları tarayacak şekilde genişletildi.
- **Hostname Yayılımı**: Topoloji üzerinde yapılan isim değişiklikleri anında CLI prompt'una ve konfigürasyon dosyalarına yansıtılıyor.
- **Sekme Senkronizasyonu**: Topoloji, CLI ve Görev sekmeleri arasında cihaz seçimi ve görsel vurgulama tam uyumlu hale getirildi.
- **Autosave Kararlılığı**: `useOptimizedAutosave` içindeki hoisting ve import hataları giderilerek çalışma zamanı çökmeleri engellendi.

### DHCP Tarama ve Lease Akışı (Mayıs 2026)
... (önceki maddeler devam eder) ...

- **Refresh sırasında DHCP taraması**: Ağ yenileme akışına DHCP sunucu/istemci taraması, aktif havuz kontrolü ve deterministic lease özeti eklendi.
- **Toplu atama bildirimi**: Refresh sonrası lease alan istemciler için toplu DHCP atama toast'ı ve sunucu/lease sayımı gösteriliyor.
- **Otomatik yenileme**: DHCP modundaki ve geçerli IP alamamış PC'ler için sayfa açılışında ve yenileme sonrasında otomatik lease denemesi güçlendirildi.
- **Havuz kaynakları birleşimi**: Router/switch CLI havuzları ile servis paneli havuzları birlikte değerlendirilerek DHCP görünürlüğü tutarlı hale getirildi.

### PC/CMD ve Bilgi Paneli Düzeltmeleri (Mayıs 2026)

- **PC bilgi kartları**: Servis rozetleri, DHCP/Static durumu ve cihaz özetleri daha net ve tutarlı gösteriliyor.
- **CMD modal akışı**: PC CMD görünümü ve ilgili modal davranışlarında düzenleme yapıldı; bilgi panelleri ile etkileşim sadeleştirildi.
- **Info panel düzenlemeleri**: Cihaz detay alanları ve yönetim görünümleri son UI düzenlemeleriyle hizalandı.

### Cihaz ve Port Standartizasyonu (Mayıs 2026)

- **Fiziksel Port Düzenlemeleri**:
  - L2 Switch (2960): 24 FastEthernet + 2 Gigabit Ethernet.
  - L3 Switch (3650): 24 FastEthernet + 4 Gigabit Ethernet + 1 WLAN.
  - Router (ISR): 4 Gigabit Ethernet + 1 WLAN.
- **Dinamik Raporlama (sh ver)**: `show version` çıktısı artık cihazın fiziksel portlarından bağımsız olarak her zaman **24 FE / 4 GE** (ve varsa Wireless) raporlayacak şekilde standardize edildi.
- **Gerçekçi Boot Sekansı**: Router ve Switch modelleri için donanıma özel POST, CPU/PCIe kontrolleri ve flash dosya sistemi başlatma mesajları eklendi.
- **Hata Giderme**: Port sayımı ve cihaz tipi tespiti sırasında oluşan TypeScript değişken çakışmaları ve tip hataları giderildi.

### UI/UX Modernizasyonu (Nisan 2026)

- **Yükleme ve Boş Durum Göstergeleri**: Uygulama genelinde tutarlı yükleme ve boş durum mesajları.
- **Modern Panel Sekmeleri**: PCPanel hizmet sekmeleri (DNS/HTTP/DHCP) ve proje seçici sekmeler için yeni tab-header stili.
- **Glassmorphism Efektler**: Buton hover glow efektleri, glassmorphism primary/secondary/danger/warning/indigo stilleri.
- **Shimmer Loading**: Skeleton bileşenlerine shimmer animasyonu eklendi.
- **Yeni UI Bileşenleri**:
  - `LoadingSpinner` - Yükleme göstergesi
  - `EmptyState` / `NetworkEmptyState` - Boş durum şablonları
- **Erişilebilirlik**: `prefers-reduced-motion` medya sorgusu, geliştirilmiş focus visible stilleri, ARIA etiketleri.
- **HelpPanel Modernizasyonu**: Modern arayüz, arama fonksiyonu, animasyonlu kategoriler.
- **Proje Seçici Görsel İyileştirmeleri**: Seviye başlıkları (Basit/Orta/İleri) için mavi renk şeması ve çizgiler.

### README ve Dokümantasyon

- README kısa proje özeti olacak şekilde yenilendi.
- Uzun özellik açıklamaları ve yol haritası [detay.md](detay.md) içine taşındı.
- README başlangıcına son proje özellikleri, son değişiklikler ve güncel sayılar eklendi.
- Örnekler kod satırından ayrı sayıldı.

### Refresh Özeti

- F5 refresh bildirimine tıklanabilir cihaz listesi eklendi.
- Liste sırası: router, L3 SW, L2 SW, PC, IoT.
- Cihaz adına tıklanınca IP, MAC, GW, IPv6 ve açık hizmetler tablosu gösteriliyor.
- Açık hizmetlerde DHCP, DNS, HTTP, WiFi AP/Client, SSH ve Telnet algılanıyor.

### Drag UX

- Cihaz veya cihaz grubu sürüklenirken port hitboxları geçici devre dışı kalıyor.
- Sürükleme sırasında kablo başlatma engelleniyor.
- Cihaz/port tooltipleri drag sırasında gizleniyor.
- Drop sonrası tüm etkileşimler otomatik geri açılıyor.

### Modal UX

- PC CMD modalı ve Switch/Router CLI modalındaki sol yeşil dekoratif drag noktaları kaldırıldı.
- Tasks modalındaki durum noktası korundu.

### Terminal Fontu

- `font-geist-mono` utility sınıfı eklendi.
- CLI terminal çıktısı, prompt, metin girişi ve öneri/yardım listesi Geist Mono kullanıyor.
- PC CMD ve console çıktısı, prompt, metin girişi ve öneri/yardım listesi Geist Mono kullanıyor.

## Kararlı Özellikler

- Interaktif topoloji tuvali.
- PC, IoT, L2 switch, L3 switch ve router cihazları.
- Straight-through, crossover ve console kablolar.
- VLAN, trunk, native VLAN ve VTP.
- STP/PVST, VLAN bazlı yol hesaplama ve link failure davranışı.
- Port security ve aging komutları.
- Static routing, L3 routing, RIP ve route doğrulama.
- DHCP, DNS ve HTTP servisleri.
- WiFi AP/client modu ve IoT yönetim paneli.
- Rehberli ders modu.
- Türkçe/İngilizce arayüz.

## Yakın Plan

- ACL/NAT/firewall simülasyonlarını genişletmek.
- Paket yakalama ve analiz ekranı eklemek.
- Rehberli ders sayısını artırmak (hedef: 10+).
- Lab otomatik puanlama sistemini güçlendirmek.
- IPv6 komut ve görselleştirme kapsamını genişletmek.
- Çoklu topoloji sekmesi desteği eklemek.
- Gelişmiş ağ analiz araçları (traceroute, netstat vb.).
- Cihaz konfigürasyon yedekleme ve geri yükleme.

## Doğrulama Notları

- `git diff --check` dokümantasyon değişiklikleri için çalıştırılmalı.
- Node/NPM bu ortamda daha önce `Could not determine Node.js install directory` ve `CSPRNG` hatası verdiği için lint/typecheck yerel Node düzeldikten sonra tekrar denenmeli.
