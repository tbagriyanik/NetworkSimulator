================================================================================
NETWORK SIMULATOR v6.5.0
KURULUM, TANITIM VE KULLANIM REHBERİ / USER & SETUP GUIDE
================================================================================

1. UYGULAMA TANITIMI (HAKKINDA)
--------------------------------------------------------------------------------
Network Simulator; endüstri standardı CLI komutları, L2/L3 anahtarlama, yönlendirme 
protokolleri, kablosuz ağlar (WLC & AP), ağ güvenliği, durum denetimli güvenlik 
duvarı (Stateful Firewall), IoT cihazları, Python otomasyon betikleri ve Linux 
terminali dahil olmak üzere zengin bir ağ laboratuvarı ortamı sunar.

Öne Çıkan Başlıca Yetenekler:
• 49+ Hazır Laboratuvar Senaryosu ve Otomatik Topoloji Üretici
• Switch, Router, Firewall, WLC, PC, IoT ve Hub Cihazları (729+ CLI Komutu)
• IPv4 / IPv6, OSPF, EIGRP, BGP, RIP, STP/RSTP/MST, EtherChannel, VLAN, VTP
• NAT/PAT, ACL, HSRP Redundancy, DHCP, DNS, HTTP, Telnet, SSH ve NETCONF
• PC Terminalinde Python Yorumlayıcısı, Web Audio Ses Sentezleme ve 3D Sahne Motoru
• Canlı Paket Yakalama & İnceleme (PDU Inspector) ve Arıza Simülasyonları

2. SİSTEM GEREKSİNİMLERİ VE KURULUM
--------------------------------------------------------------------------------
[ Windows ]
- Desteklenen Sürümler: Windows 10 (64-bit) ve Windows 11.
- Kurulum: "network-simulator_6.5.0_x64-setup.exe" veya ".msi" dosyasını 
  çift tıklayarak çalıştırın. Kurulum sihirbazı gerekli dosyaları Program Files 
  altına yükleyecek ve masaüstü kısayolunu oluşturacaktır.
- Gereksinim: Windows 10 ve 11'de Microsoft Edge WebView2 yerleşik olarak gelir. 
  Harici Node.js, Rust veya başka bir bağımlılık kurmanıza GEREK YOKTUR.

[ macOS ]
- Desteklenen Sürümler: macOS 10.15 (Catalina) ve üzeri (Intel & Apple Silicon).
- Kurulum: "network-simulator_6.5.0_x64.dmg" dosyasını açın. Network Simulator 
  simgesini "Applications" (Uygulamalar) klasörüne sürükleyip bırakın.

[ Linux ]
- Ubuntu / Debian: "sudo dpkg -i network-simulator_6.5.0_amd64.deb"
- Evrensel (AppImage): "network-simulator_6.5.0_amd64.AppImage" dosyasına 
  sağ tıklayın -> Özellikler -> İzinler -> "Çalıştırılabilir" yapın ve çift tıklayın.

3. HIZLI BAŞLANGIÇ & KULLANIM İPUÇLARI
--------------------------------------------------------------------------------
• Topoloji Oluşturma: Sol araç çubuğundan cihazları (Switch, Router, PC vb.) 
  çalışma alanına sürükleyip bırakın.
• Otomatik Kablolama: Kablo aracına tıklayın, ardından bağlamak istediğiniz 
  cihazların gövdesine tıklayın; uygun portlar otomatik eşlenecektir.
• Cihaz Konsolu / CLI: Bir cihaza çift tıkladığınızda veya seçip "CLI" 
  sekmesine geçtiğinizde yapılandırma konsolu açılır.
• Hazır Senaryo Yükleme: Üst çubuktaki "Örnek Projeler" butonundan 
  seviyenize uygun hazır laboratuvarı seçerek anında yükleyebilirsiniz.

4. TEMEL KLAVYE KISAYOLLARI
--------------------------------------------------------------------------------
• F1 veya Shift + ? : Kapsamlı kısayol ve yardım penceresini açar
• F2                : Seçili cihazı yeniden adlandırır
• F5                : Ağı ve simülasyon paket trafiğini baştan başlatır (Yenile)
• Ctrl + S          : Çalıştığınız projeyi (.json) olarak kaydeder
• Ctrl + O          : Önceden kaydedilmiş proje dosyasını yükler
• Ctrl + Z / Ctrl + Y : Geri al / İleri al
• Space + Sürükle   : Tuval üzerinde serbest kaydırma (Pan)
• Fare Tekerleği    : Yakınlaştırma / Uzaklaştırma (Zoom In / Out)
• Delete / Backspace: Seçili cihazı veya kabloyu siler

5. RESMİ BAĞLANTILAR VE DESTEK
--------------------------------------------------------------------------------
Canlı Web Sürümü    : https://network2026.vercel.app
Alternatif Sunucu   : https://tuzlanet.vercel.app
GitHub Kaynak Kodu  : https://github.com/tbagriyanik/NetworkSimulator
Eğitim Dokümantasyonu: Uygulama içindeki "Rehber" ve "Kitapçık" menüleri

Başarılar ve verimli çalışmalar dileriz!
================================================================================
