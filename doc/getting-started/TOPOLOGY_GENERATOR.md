# 🔄 Topoloji Üretici Kılavuzu / Topology Generator Guide

**Topoloji Üretici (Topology Generator)**, önceden tanımlanmış senaryolardan ağ topolojileri oluşturmanızı sağlayan gelişmiş bir sihirbaz aracıdır.

---

## 🚀 Nasıl Açılır?

Üst araç çubuğundaki **"Topoloji Üret"** butonuna tıklayın (veya sağ tık context menüsünden erişin).

---

## 📋 Özellikler

| Özellik | Açıklama |
|---|---|
| **Şablon Arama** | Senaryo adına veya açıklamasına göre arama yapın |
| **Kategori Filtresi** | Protokol kategorisine göre filtreleyin (VLAN, Routing, Wireless vb.) |
| **Önizleme** | Şablonu seçmeden önce açıklamasını ve cihaz sayısını görün |
| **Otomatik Konfigürasyon** | Seçilen şablon tüm cihazlarla birlikte önceden yapılandırılmış gelir |
| **Proje Başlığı** | Oluşturulan topoloji kendi başlığı ve açıklamasıyla kaydedilir |

---

## 📂 Mevcut Senaryolar

### 🔀 Switching Senaryoları
| Senaryo | Cihaz | Açıklama |
|---|---|---|
| Single VLAN | 1 Switch + 2 PC | Temel VLAN konfigürasyonu |
| Trunk & VTP | 2 Switch + 4 PC | Trunk bağlantısı ve VTP sunucu/istemci |
| Native VLAN | 2 Switch + 2 PC | Native VLAN yapılandırması |
| STP Triangle | 3 Switch + 3 PC | Üçgen STP topolojisi |
| STP Redundant | 3 Switch + 6 PC | Yedekli STP yapısı |
| STP 3-Switch PVST | 3 Switch + 3 PC | Per-VLAN STP yük dengeleme |
| EtherChannel | 2 Switch + 4 PC | LACP/PAgP EtherChannel |

### 🌐 Routing Senaryoları
| Senaryo | Cihaz | Açıklama |
|---|---|---|
| Static Routing | 3 Router + 4 PC | Statik yönlendirme |
| RIP Dynamic Routing | 3 Router + 4 PC | RIP protokolü |
| OSPF Multi-Area 1 | 4 Router + 6 PC | OSPFv2 çoklu alan |
| OSPF Multi-Area 2 | 5 Router + 8 PC | OSPFv2 ABR/ASBR |
| EIGRP Basic | 3 Router + 4 PC | EIGRP DUAL algoritması |
| L3 Routing | 2 L3 Switch + 4 PC | L3 anahtar tabanlı yönlendirme |
| ROAS | 1 Router + 1 Switch + 4 PC | Router-on-a-Stick |

### 🔐 Güvenlik Senaryoları
| Senaryo | Cihaz | Açıklama |
|---|---|---|
| ACL Standard Basic | 2 Router + 4 PC | Standart ACL |
| ACL Extended Basic | 2 Router + 4 PC | Genişletilmiş ACL |
| NAT Static | 1 Router + 2 PC | Statik NAT |
| NAT Dynamic | 1 Router + 3 PC | Dinamik NAT |
| NAT PAT | 1 Router + 4 PC | PAT/Overload |
| Port Security | 1 Switch + 3 PC | MAC kısıtlaması |
| Firewall Basic | 1 Firewall + 2 PC | Güvenlik Duvarı (Firewall) temel yapılandırması |
| Basic Secure | 2 Router + 2 PC + 1 Switch | SSH + ACL + Port Security |

### 📡 Wireless Senaryoları
| Senaryo | Cihaz | Açıklama |
|---|---|---|
| IoT & WiFi Lab | 1 Router + 1 PC + 3 IoT | IoT sensörler ve WiFi |
| WAP Multi-SSID | 1 Router + 4 PC | Çoklu SSID yapılandırması |
| WiFi Intermediate | 2 Router + 2 PC | WPA2 güvenlik |
| WLC Enterprise Wireless | 1 WLC + 2 AP + 6 PC | Kurumsal kablosuz ağ |

### 🏭 Sektörel Senaryolar
| Senaryo | Açıklama |
|---|---|
| Campus Network | Üniversite kampüs ağı |
| SOHO | Küçük ofis/ev ofisi |
| Hospital | Hastane ağı |
| E-Commerce | E-ticaret sunucu ağı |
| Real-World Comprehensive | Kapsamlı gerçek dünya senaryosu |
| All Services Lab | DNS + HTTP + DHCP + FTP + MAIL + NTP |
| Greenhouse IoT Lab | Sera IoT otomasyon sistemi |

### 🔧 Sorun Giderme Senaryoları
| Senaryo | Arıza Tipi |
|---|---|
| Trouble: ACL | ACL engellemesi |
| Trouble: Duplicate IP | Çakışan IP |
| Trouble: Gateway | Yanlış varsayılan ağ geçidi |
| Trouble: IVR | Inter-VLAN yönlendirme sorunu |
| Trouble: Mask | Yanlış subnet mask |
| Trouble: OSPF Area | OSPF alan uyuşmazlığı |
| Trouble: Shutdown | Kapalı arayüz |
| Trouble: VLAN | Yanlış VLAN ataması |

### 🔀 HSRP & Gelişmiş
| Senaryo | Açıklama |
|---|---|
| HSRP Redundancy | HSRP yedeklilik |
| DHCP Router | DHCP sunucu + istemciler |
| Router SSH | SSH ile güvenli erişim |
| L3 Switch 2-VLAN | İki VLAN arasında L3 yönlendirme |
| IPv6 Master Lab | IPv6 + DHCPv6 + OSPFv3 |
| IPv6 Advanced Lab | Gelişmiş IPv6 yapılandırması |

---

## 🎯 Kullanım Adımları

1. **"Topoloji Üret" butonuna tıklayın**
2. **Arama kutusuna** senaryonun adını veya anahtar kelimesini yazın (örn. `ospf`, `vlan`, `nat`)
3. Listeden istediğiniz senaryoyu seçin — sağ tarafta açıklama görünür
4. **"Oluştur"** butonuna tıklayın
5. Topoloji canvas'a otomatik olarak yüklenir; tüm cihazlar konfigüre edilmiş hâlde gelir
6. Ping atarak veya `show` komutlarıyla doğrulayın

### Adım adım simülasyon davranışı

Adım adım yürütme seçildiğinde CLI komutları terminalde eksiksiz ve karakter karakter yazılır. Komutlar cihaz bazında sıraya alınır; `enable` ve `configure terminal` tamamlanmadan sonraki yapılandırma komutu gönderilmez. Aynı mode-entry komutunun tekrar gönderilmesi engellenir.

Bir cihaz için çalıştırılacak gerçek bir işlem yoksa o cihazın penceresi açılmaz. İşlem içeren cihaz pencereleri yapılandırma tamamlandıktan sonra otomatik kapanır. Simülasyonu duraklatmak veya durdurmak için alt çubuktaki kontrolleri ya da `Esc` tuşunu kullanabilirsiniz.

### Pencere ve canvas etkileşimi

- Cihaz gövdesinin tamamı tıklanabilir; düzensiz SVG cihaz şekillerinde de seçim alanı korunur.
- Açık cihaz penceresinin herhangi bir alanını `Alt` basılıyken sol tıklayıp sürükleyerek taşıyabilirsiniz.
- `Ctrl + sürükle` cihazları ızgaraya hizalar; `Space + sürükle` canvas'ı kaydırır.
- PNG dışa aktarma, ekrandaki kablo eğrilerini ve paralel bağlantı ofsetlerini korur.

---

## 💡 İpuçları

- Senaryo yükledikten sonra **Ctrl+Z** ile geri alabilirsiniz.
- Senaryo üzerine kendi değişikliklerinizi ekleyebilir ve **Ctrl+S** ile kaydedebilirsiniz.
- Sorun giderme senaryolarında kasıtlı bir hata var — bulup düzeltmeye çalışın!

---

## 📘 İlgili Dokümanlar

- [USAGE.md](USAGE.md) — Genel kullanım kılavuzu
- [CLI_GUIDED_TUTORIAL.md](../cli/CLI_GUIDED_TUTORIAL.md) — Adım adım CLI dersleri
- [examples.md](../reference/examples.md) — Örnek proje çözümleri
