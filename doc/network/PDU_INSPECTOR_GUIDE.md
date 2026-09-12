# 🔍 Görsel PDU & Paket İnceleyici Kılavuzu / Visual PDU & Packet Inspector Guide

Network Simulator, paketlerin ağ üzerindeki iletimini, OSI katman detaylarını, protokol ağacı çözümlemesini ve ham Ethernet çerçeve (hex dump) dökümünü adım adım görselleştiren **Görsel PDU & Canlı Paket İnceleyici** sistemini içerir.

---

## 🎯 Özellikler ve Genel Bakış

1. **Gömülü ve Bağımsız PDU Analizi**:
   - **Gömülü Sekme**: Ping & Paket Bilgi Paneli içerisindeki "🔍 Görsel PDU İnceleme" sekmesi üzerinden doğrudan pencere içinde analiz.
   - **Tam Ekran Modal**: Bağımsız modal pencere üzerinden genişletilmiş analiz imkanı.
2. **OSI Katman Analizi (Layer 1 - Layer 7)**:
   - **Giriş Katmanları (Inbound PDU Layers)**: Paketin arayüze girişindeki port, kablo sinyali, MAC başlıkları, IP alanları, TTL, protokol ve uygulama yükü.
   - **Çıkış Katmanları (Outbound PDU Layers)**: Cihazın yönlendirme sonrası paketi egress portuna aktarırken yeniden kapsüllediği yeni kaynak/hedef MAC, azaltılmış TTL ve güncellenen checksum alanları.
3. **Cihaz Karar Günlüğü (Device Decision Log)**:
   - Paketin her bir atlama noktasında (Hop) cihazın verdiği yönlendirme, anahtarlama, NAT, ACL filtreleme veya paket düşürme (DROP) kararlarının adım adım dökümü.
4. **Protokol Ağacı Çözümlemesi (Protocol Tree)**:
   - `Ethernet II` → `802.1Q VLAN` → `IPv4 / IPv6 / ARP` → `ICMP / TCP / UDP / OSPF / DHCP` hiyerarşik protokol ağacı.
5. **Ham Hex & ASCII Dökümü (Raw Hex Dump)**:
   - Gerçek Wireshark/pcap uyumlu 16-baytlık ofset, hex baytları ve ASCII karşılıkları dökümü.
6. **Hop İlerleme & Simülasyon Oynatıcı**:
   - Başa dön, oynat/durdur, sonraki atlamaya geç ve `0.5x`, `1x`, `2x` oynatma hızı ayarı.

---

## 🖥️ Kullanım Adımları

### 1. Canlı Paket Analizi Penceresinden Erişim
- Tuval üzerinde herhangi bir cihazdan diğerine Ping gönderin veya paket akışını başlatın.
- Açılan **Paket Analizi** penceresinde üst sekmelerden **"🔍 Görsel PDU İnceleme"** veya **"🔍 İzleme Detayları"** butonuna tıklayın.
- İlgili atlamanın (Hop) OSI katmanlarını, karar günlüğünü veya Hex dökümünü anında inceleyin.

### 2. Sekmeler Arası Gezinme
- **OSI Modeli (OSI Model)**: Giriş (Inbound) ve Çıkış (Outbound) katman alanlarını, MAC, IP, TTL ve port detaylarını gösterir.
- **Protokol Ağacı (Protocol Tree)**: Paket başlıklarının kapsülleme yapısını ağaç görünümünde hiyerarşik olarak listeler.
- **Hex Dökümü (Hex Dump)**: Ham Ethernet çerçevesinin gerçek bayt dökümünü ve ASCII karakter haritasını sunar.

---

## 🪟 Pencere Boyutlandırma ve Kaydırma (Scrollbar) İyileştirmeleri

- Pencerelerin sağ ve alt kenarındaki boyutlandırma tutamaçları (`resize handles`), içerik kaydırma çubuklarının (`scrollbar`) tıklanmasını engellemeyecek şekilde mikro-piksel kenar boşluğu (`contentInset`) ile optimize edilmiştir.
- Tüm sekmelerde dikey ve yatay kaydırma çubukları doğrudan fareyle tutulup akıcı bir şekilde kaydırılabilir.

---

## 📘 İlgili Dokümanlar

- [PACKET_CAPTURE_GUIDE.md](PACKET_CAPTURE_GUIDE.md) — Paket Yakalama Kılavuzu
- [CLI_COMMANDS.md](../cli/CLI_COMMANDS.md) — CLI Komut Referansı
