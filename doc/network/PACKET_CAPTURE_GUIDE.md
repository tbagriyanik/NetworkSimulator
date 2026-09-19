# 📦 Paket Yakalama Kılavuzu / Packet Capture Guide

Network Simulator'ın **Paket Yakalama Paneli**, ağ trafiğini gelişmiş bir analizör arayüzünde gerçek zamanlı izlemenizi sağlar.

---

## 🖥️ Paneli Açma

- Üst araç çubuğundaki **Paket Yakalama** (Packet Capture) butonuna tıklayın.
- Ya da bir kablo üzerine sağ tıklayıp "Paket Yakalama" seçeneğini seçin.

---

## 📋 Panel Sütunları

| Sütun | Açıklama |
|---|---|
| **#** | Paket sıra numarası |
| **Zaman (Time)** | Paketin yakalandığı zaman damgası |
| **Kaynak (Source)** | Kaynak IP adresi |
| **Hedef (Destination)** | Hedef IP adresi |
| **Protokol** | Protokol adı ve numarası (ör. `ICMP (1)`, `STP (0x4242)`) |
| **Uzunluk (Length)** | Paket boyutu (byte) |
| **Bilgi (Info)** | Paketle ilgili özet bilgi |

---

## 🔢 Protokol Numaraları

Protokol sütununda protokol adının yanında standart numara parantez içinde gösterilir:

| Protokol | Gösterim | Açıklama |
|---|---|---|
| ICMP | `ICMP (1)` | IPv4 kontrol mesajları |
| TCP | `TCP (6)` | İletim kontrolü |
| UDP | `UDP (17)` | Kullanıcı datagram |
| HTTP | `HTTP (80)` | Web tarayıcı / HTTP istek ve yanıtları |
| FTP | `FTP (21)` | Dosya transfer istemci/sunucu istekleri |
| SMTP | `SMTP (25)` | E-posta gönderme istekleri |
| POP3 | `POP3 (110)` | E-posta alma/görüntüleme istekleri |
| DNS | `DNS (53)` | Domain isim sorgusu (A, AAAA, MX, PTR) |
| DHCP | `DHCP (67)` | Otomatik IP kiralama (Discover, Offer, Request, ACK) |
| SSH | `SSH (22)` | Güvenli kabuk erişimi |
| TELNET | `TELNET (23)` | Uzaktan komut satırı erişimi |
| OSPF | `OSPF (89)` | OSPF yönlendirme |
| EIGRP | `EIGRP (88)` | EIGRP yönlendirme |
| GRE | `GRE (47)` | Tünel kapsülleme |
| ICMPv6 | `ICMPv6 (58)` | IPv6 kontrol mesajları |
| ARP | `ARP (0x0806)` | Adres çözümleme |
| RARP | `RARP (0x8035)` | Ters adres çözümleme |
| STP | `STP (0x4242)` | Spanning Tree |

---

## 🔍 Arama ve Filtreleme

### Arama Çubuğu (Include Filter)
Paket listesini IP, protokol adı veya bilgi alanına göre filtrele:
```
192.168.1.1        → Bu IP'yi içeren paketler
ICMP               → Yalnızca ICMP paketleri
ARP Request        → ARP istek paketleri
```

### Dışlama Filtresi (Exclude Filter)
İstemediğiniz paket türlerini gizlemek için virgül veya boşlukla ayrılmış terimler girin:
```
cdp, stp           → CDP ve STP paketlerini gizle
arp stp cdp        → ARP, STP ve CDP paketlerini gizle
OSPF, EIGRP, RIP   → Routing protokol paketlerini gizle
```
> **İpucu:** Dışlama filtresi büyük/küçük harf duyarsızdır.

---

## 📄 Sayfalama (Pagination)

- Panel sayfa başına **10 paket** gösterir.
- Alttaki `◀ Önceki / Sonraki ▶` butonlarıyla gezin.
- Sağ üstte toplam paket sayısı ve mevcut sayfa gösterilir.

---

## 🌐 Arka Plan Ağ Trafiği (Background Network Activity)

Simülatör, gerçek ağlarda otomatik olarak oluşan aşağıdaki paketleri **otomatik yakalar**:

| Paket Türü | Tetikleyici | Periyot |
|---|---|---|
| **DHCP Discover** | PC DHCP modundayken | Başlangıçta |
| **DHCP Offer** | DHCP sunucu yanıtı | Başlangıçta |
| **DHCP Request** | PC IP alırken | Başlangıçta |
| **DHCP ACK** | Sunucu onayı | Başlangıçta |
| **STP BPDU** | Switch'ler arası STP | Periyodik |
| **CDP** | Cihazlar arası keşif | Periyodik |
| **OSPF Hello** | OSPF komşu bulma | Periyodik |
| **RIP Update** | RIP yönlendirme güncellemesi | Periyodik |
| **EIGRP Update** | EIGRP yönlendirme güncellemesi | Periyodik |
| **WLAN Beacon** | Access Point yayını | Periyodik |
| **ARP Request** | Ping öncesi MAC çözümleme | Ping başında |
| **ARP Reply** | MAC adresi yanıtı | Ping başında |

> Bu paketler gerçek ağ simülasyonunu olabildiğince gerçekçi kılar. Bunları görmek istemiyorsanız dışlama filtresini kullanın.

---

## 🏃 Canlı Yakalama Senaryosu

**Örnek: Ping Trafiğini İzleme**

1. Paket Yakalama panelini açın
2. Arama kutusuna `ICMP` yazın
3. Bir PC'den başka bir PC'ye ping gönderin (sağ tık → Ping)
4. ARP Request, ARP Reply, ICMP Echo Request ve ICMP Echo Reply paketlerinin sırayla göründüğünü izleyin

**Örnek: OSPF Komşuluğunu İzleme**

1. Dışlama filtresine `cdp, stp, arp` yazın
2. Arama kutusuna `OSPF` yazın
3. Router'lara OSPF konfigürasyonu uygulayın
4. OSPF Hello paketlerinin periyodik olarak göründüğünü izleyin

---

## 💡 İpuçları

---

## 🔍 Görsel PDU & Canlı Paket İnceleyici (Visual PDU Inspector)

Paket yakalamanın yanı sıra, paketlerin ağ üzerindeki iletimini, OSI katman detaylarını, protokol ağacı çözümlemesini ve ham Ethernet çerçeve (hex dump) dökümünü adım adım görselleştiren **Görsel PDU & Canlı Paket İnceleyici** sistemini içerir.

### 🎯 Özellikler ve Genel Bakış
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
   - Gerçek 16-baytlık ofset, hex baytları ve ASCII karşılıkları dökümü.
6. **Hop İlerleme & Simülasyon Oynatıcı**:
   - Başa dön, oynat/durdur, sonraki atlamaya geç ve `0.5x`, `1x`, `2x` oynatma hızı ayarı.

### 🖥️ Kullanım Adımları
- **Canlı Paket Analizi Penceresinden Erişim**: Tuval üzerinde herhangi bir cihazdan diğerine Ping gönderin. Açılan Paket Analizi penceresinde "🔍 Görsel PDU İnceleme" sekmesine tıklayın.
- **Sekmeler**:
  - **OSI Modeli (OSI Model)**: Giriş (Inbound) ve Çıkış (Outbound) katman alanlarını, MAC, IP, TTL ve port detaylarını gösterir.
  - **Protokol Ağacı (Protocol Tree)**: Paket başlıklarının kapsülleme yapısını ağaç görünümünde hiyerarşik olarak listeler.
  - **Hex Dökümü (Hex Dump)**: Ham Ethernet çerçevesinin gerçek bayt dökümünü ve ASCII karakter haritasını sunar.
- **Pencere Boyutlandırma**: Pencerelerin boyutlandırma tutamaçları (`resize handles`), içerik kaydırma çubuklarının (`scrollbar`) tıklanmasını engellemeyecek şekilde optimize edilmiştir.

---

## 📘 İlgili Dokümanlar

- [USAGE.md](../getting-started/USAGE.md) — Genel kullanım kılavuzu
- [CLI_COMMANDS.md](../cli/CLI_COMMANDS.md) — CLI komut referansı
