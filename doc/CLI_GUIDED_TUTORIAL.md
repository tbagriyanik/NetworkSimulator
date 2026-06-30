# 🎓 Network Simulator - Rehberli Dersler

## CLI Komutları Rehberli Ders Serisi

Bu rehber, Network Simulator'daki tüm CLI komutlarını pratik örneklerle öğrenmenizi sağlar. Her bölüm belirli bir cihaz türü ve komut grubu için tasarlanmıştır.

---

## 📋 İçindekiler

### Rehberli Dersler Serisi
1. [Temel Modu Komutları](#temel-modu-komutları)
2. [Ayrıcalıklı Modu Komutları](#ayrıcalıklı-modu-komutları)
3. [Global Konfigürasyon Komutları](#global-konfigürasyon-komutları)
4. [Arayüz Konfigürasyonu](#arayüz-konfigürasyonu)
5. [VLAN Yönetimi](#vlan-yönetimi)
6. [Yönlendirme Protokolleri](#yönlendirme-protokolleri)
7. [Güvenlik Komutları](#güvenlik-komutları)
8. [Kablosuz (WiFi) Komutları](#kablosuz-wifi-komutları)
9. [Hata Ayıklama ve İzleme](#hata-ayıklama-ve-izleme)
10. [İleri Konular](#ileri-konular)

### Ek Bölümler
- [Örnek Projeler (40 Proje)](#örnek-projeler)
- [Pratik Senaryolar](#pratik-senaryolar)
- [Hızlı Referans Tablosu](#hızlı-referans-tablosu)
- [Sorun Giderme İpuçları](#sorun-giderme-ipuçları)

---

## 🎓 Rehberli Dersler Hakkında

Bu ders serisi, Network Simulator'da CLI komutlarını öğrenmek için tasarlanmıştır:

- **30 Pratik Ders:** Başlangıçtan ileri seviyeye
- **4 Zorluk Seviyesi:** ⭐ Başlangıç → ⭐⭐⭐⭐ Çok İleri
- **5 Cihaz Türü:** Switch, Router, WLC, AP, IoT
- **150+ Komut Örneği:** Gerçek dünya senaryoları
- **40 Örnek Proje:** Farklı senaryolar için hazır ağ topolojileri
- **Adım Adım Talimatlar:** Her ders için detaylı açıklamalar
- **Beklenen Sonuçlar:** Her adımdan sonra ne olması gerektiği

### Ders Formatı

Her ders aşağıdaki yapıya sahiptir:

```
📌 Ders N: Başlık

**Cihaz Türü:** Hangi cihazda test edileceği
**Zorluk Seviyesi:** ⭐ Başlangıç → ⭐⭐⭐⭐ Çok İleri

#### Ön Koşullar (varsa)
- Gerekli hazırlıklar

#### Adım 1: Başlık
```
Komut
```
**Beklenen Sonuç:** Ne olması gerektiği

#### 📝 Notlar
- Önemli bilgiler
- İpuçları
```

---

## Temel Modu Komutları

### 📌 Ders 1: Modu Değiştirme ve Yardım Sistemi

**Cihaz Türü:** Herhangi bir cihaz (Switch, Router, WLC)  
**Zorluk Seviyesi:** ⭐ Başlangıç

#### Adım 1: Cihazı Seçin ve Terminal Açın
- Herhangi bir cihaza çift tıklayın
- Terminal paneli açılacak
- Komut satırında `>` işareti görürsünüz (Kullanıcı Modu)

#### Adım 2: Yardım Sistemini Keşfedin
```
> help
```
**Beklenen Sonuç:** Tüm mevcut komutların listesi görüntülenir

#### Adım 3: Belirli Komut Hakkında Yardım Alın
```
> ?
```
**Beklenen Sonuç:** Mevcut komutlar listelenir

#### Adım 4: Ayrıcalıklı Moda Geçin
```
> enable
```
**Beklenen Sonuç:** Komut satırı `#` ile değişir (Ayrıcalıklı Mod)

#### Adım 5: Kullanıcı Moduna Dönün
```
# disable
```
**Beklenen Sonuç:** Komut satırı tekrar `>` olur

#### 📝 Notlar
- `enable` komutu ayrıcalıklı moda geçiş sağlar
- `disable` komutu kullanıcı moduna geri döner
- `help` komutu her zaman kullanılabilir
- `?` karakteri komut tamamlama için kullanılır

---

## Ayrıcalıklı Modu Komutları

### 📌 Ders 2: Bağlantı Testi ve Ağ Tanılaması

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Ön Koşullar
- En az 2 cihaz ağa bağlı olmalı
- Cihazlara IP adresleri atanmış olmalı

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Ping Komutu ile Bağlantı Testi
```
# ping 192.168.1.2
```
**Beklenen Sonuç:** 
```
ICMP echo reply received from 192.168.1.2
```

#### Adım 3: Farklı Paket Boyutu ile Ping
```
# ping 192.168.1.2 size 1500
```
**Beklenen Sonuç:** Daha büyük paketler gönderilir

#### Adım 4: Belirli Sayıda Ping Gönder
```
# ping 192.168.1.2 count 5
```
**Beklenen Sonuç:** Tam olarak 5 ICMP paketi gönderilir

#### Adım 5: Rota İzleme (Traceroute)
```
# traceroute 192.168.1.2
```
**Beklenen Sonuç:** Hedef cihaza giden yol adım adım gösterilir

#### 📝 Notlar
- `ping` komutu bağlantı testinde kullanılır
- `traceroute` komutu ağ yolunu gösterir
- Paket boyutu ve sayısı özelleştirilebilir
- Hedef cihaza ulaşılamıyorsa "Timeout" mesajı görülür

---

### 📌 Ders 3: Konfigürasyon Yönetimi

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Çalışan Konfigürasyonu Görüntüle
```
# show running-config
```
**Beklenen Sonuç:** Cihazın tüm aktif konfigürasyonu görüntülenir

#### Adım 2: Başlangıç Konfigürasyonunu Görüntüle
```
# show startup-config
```
**Beklenen Sonuç:** Cihaz başladığında yüklenen konfigürasyon gösterilir

#### Adım 3: Cihaz Sürümünü Kontrol Et
```
# show version
```
**Beklenen Sonuç:** Cihaz modeli, NOS sürümü ve diğer bilgiler görüntülenir

#### Adım 4: Konfigürasyonu Kaydet
```
# write memory
```
**Beklenen Sonuç:** Çalışan konfigürasyon NVRAM'a kaydedilir

#### Adım 5: Alternatif Kaydetme Yöntemi
```
# copy running-config startup-config
```
**Beklenen Sonuç:** Aynı sonuç, farklı komut

#### 📝 Notlar
- `show running-config` aktif konfigürasyonu gösterir
- `show startup-config` başlangıç konfigürasyonunu gösterir
- `write memory` değişiklikleri kalıcı hale getirir
- Kaydetmeden cihazı yeniden başlatırsanız değişiklikler kaybolur

---

## Global Konfigürasyon Komutları

### 📌 Ders 4: Cihaz Temel Ayarları

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```
**Beklenen Sonuç:** Komut satırı `(config)#` olur

#### Adım 2: Cihaz Adını Ayarla
```
(config)# hostname SW-MAIN
```
**Beklenen Sonuç:** Komut satırı `SW-MAIN(config)#` olur

#### Adım 3: Motd (Message of the Day) Başlığı Ayarla
```
(config)# banner motd #Yetkisiz Erişim Yasaktır!#
```
**Beklenen Sonuç:** Başlık kaydedilir

#### Adım 4: Etkinleştirme Şifresi Ayarla
```
(config)# enable secret MySecurePassword123
```
**Beklenen Sonuç:** Ayrıcalıklı moda giriş için şifre gerekli olur

#### Adım 5: Varsayılan Ağ Geçidini Ayarla
```
(config)# ip default-gateway 192.168.1.1
```
**Beklenen Sonuç:** Cihazın varsayılan ağ geçidi ayarlanır

#### Adım 6: Konfigürasyon Modundan Çık
```
(config)# exit
```
**Beklenen Sonuç:** Komut satırı `#` olur

#### 📝 Notlar
- `configure terminal` konfigürasyon moduna giriş sağlar
- `hostname` cihazın adını değiştirir
- `banner` başlangıç mesajı gösterir
- `enable secret` ayrıcalıklı moda giriş şifresi belirler
- `exit` komut satırından çıkış sağlar

---

### 📌 Ders 5: DNS ve Zaman Ayarları

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: DNS Sunucusu Ayarla
```
(config)# ip name-server 8.8.8.8
```
**Beklenen Sonuç:** DNS sunucusu kaydedilir

#### Adım 3: Alan Adı Ayarla
```
(config)# ip domain-name example.com
```
**Beklenen Sonuç:** Alan adı konfigürasyona eklenir

#### Adım 4: Saat Dilimini Ayarla
```
(config)# clock timezone EST -5
```
**Beklenen Sonuç:** Saat dilimi EST olarak ayarlanır

#### Adım 5: NTP Sunucusu Ekle
```
(config)# ntp server 192.168.1.100
```
**Beklenen Sonuç:** NTP sunucusu kaydedilir

#### Adım 6: Saati Kontrol Et
```
(config)# exit
# show clock
```
**Beklenen Sonuç:** Cihazın güncel saati gösterilir

#### 📝 Notlar
- `ip name-server` DNS sunucusu belirler
- `ip domain-name` varsayılan alan adını ayarlar
- `clock timezone` saat dilimini ayarlar
- `ntp server` zaman senkronizasyonu sağlar
- `show clock` güncel saati gösterir

---

## Arayüz Konfigürasyonu

### 📌 Ders 6: Temel Arayüz Ayarları

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüze Girin
```
(config)# interface FastEthernet0/1
```
**Beklenen Sonuç:** Komut satırı `(config-if)#` olur

#### Adım 3: Arayüzü Açıkla
```
(config-if)# description Bağlantı-Sunucu-1
```
**Beklenen Sonuç:** Arayüz açıklaması kaydedilir

#### Adım 4: Arayüzü Etkinleştir
```
(config-if)# no shutdown
```
**Beklenen Sonuç:** Arayüz aktif hale gelir

#### Adım 5: Hız ve Duplex Ayarla
```
(config-if)# speed 100
(config-if)# duplex full
```
**Beklenen Sonuç:** Arayüz hızı 100 Mbps, duplex full olur

#### Adım 6: IP Adresi Ata (Router için)
```
(config-if)# ip address 192.168.1.1 255.255.255.0
```
**Beklenen Sonuç:** Arayüze IP adresi atanır

#### Adım 7: Arayüz Durumunu Kontrol Et
```
(config-if)# exit
# show interfaces FastEthernet0/1
```
**Beklenen Sonuç:** Arayüz detayları gösterilir

#### 📝 Notlar
- `interface` komutu arayüz konfigürasyonuna giriş sağlar
- `description` arayüzü tanımlamaya yardımcı olur
- `no shutdown` arayüzü etkinleştirir
- `shutdown` arayüzü devre dışı bırakır
- `speed` ve `duplex` arayüz özelliklerini ayarlar
- `ip address` arayüze IP adresi atar

---

### 📌 Ders 7: Arayüz Aralığı Konfigürasyonu

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüz Aralığını Seç
```
(config)# interface range FastEthernet0/1 - 5
```
**Beklenen Sonuç:** Komut satırı `(config-if-range)#` olur

#### Adım 3: Tüm Arayüzleri Açıkla
```
(config-if-range)# description Kullanıcı-Portları
```
**Beklenen Sonuç:** Tüm seçili arayüzlere açıklama eklenir

#### Adım 4: Tüm Arayüzleri Etkinleştir
```
(config-if-range)# no shutdown
```
**Beklenen Sonuç:** Tüm arayüzler aktif hale gelir

#### Adım 5: Hızı Ayarla
```
(config-if-range)# speed 100
```
**Beklenen Sonuç:** Tüm arayüzlerin hızı 100 Mbps olur

#### 📝 Notlar
- `interface range` birden fazla arayüzü aynı anda konfigüre etmeyi sağlar
- Aralık formatı: `FastEthernet0/1 - 5` (1'den 5'e kadar)
- Tüm komutlar seçili arayüzlere uygulanır
- Zaman tasarrufu sağlar

---

## VLAN Yönetimi

### 📌 Ders 8: VLAN Oluşturma ve Yönetimi

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: VLAN Oluştur
```
(config)# vlan 10
```
**Beklenen Sonuç:** Komut satırı `(config-vlan)#` olur

#### Adım 3: VLAN Adı Belirle
```
(config-vlan)# name Muhasebe
```
**Beklenen Sonuç:** VLAN 10 "Muhasebe" olarak adlandırılır

#### Adım 4: VLAN Durumunu Ayarla
```
(config-vlan)# state active
```
**Beklenen Sonuç:** VLAN aktif hale gelir

#### Adım 5: VLAN Modundan Çık
```
(config-vlan)# exit
```

#### Adım 6: Başka VLAN Oluştur
```
(config)# vlan 20
(config-vlan)# name İnsan-Kaynakları
(config-vlan)# state active
(config-vlan)# exit
```

#### Adım 7: VLAN Bilgilerini Görüntüle
```
(config)# exit
# show vlan brief
```
**Beklenen Sonuç:** Tüm VLAN'lar listelenir

#### 📝 Notlar
- `vlan <id>` yeni VLAN oluşturur
- `name` VLAN'a ad verir
- `state active` VLAN'ı etkinleştirir
- `show vlan` tüm VLAN'ları gösterir
- VLAN 1 varsayılan VLAN'dır

---

### 📌 Ders 9: Arayüzleri VLAN'a Atama

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Ön Koşullar
- VLAN 10 ve VLAN 20 oluşturulmuş olmalı

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüze Girin
```
(config)# interface FastEthernet0/1
```

#### Adım 3: Erişim Modunu Ayarla
```
(config-if)# switchport mode access
```
**Beklenen Sonuç:** Arayüz erişim moduna geçer

#### Adım 4: VLAN Ata
```
(config-if)# switchport access vlan 10
```
**Beklenen Sonuç:** Arayüz VLAN 10'a atanır

#### Adım 5: Başka Arayüzü Farklı VLAN'a Ata
```
(config-if)# exit
(config)# interface FastEthernet0/2
(config-if)# switchport mode access
(config-if)# switchport access vlan 20
```

#### Adım 6: Atamayı Kontrol Et
```
(config-if)# exit
# show vlan brief
```
**Beklenen Sonuç:** Arayüzler ilgili VLAN'lara atanmış görülür

#### 📝 Notlar
- `switchport mode access` arayüzü erişim moduna ayarlar
- `switchport access vlan` arayüzü VLAN'a atar
- Bir arayüz sadece bir VLAN'a ait olabilir
- `show vlan` atamayı doğrulamaya yardımcı olur

---

### 📌 Ders 10: Trunk Portları Konfigürasyonu

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Trunk Arayüzüne Girin
```
(config)# interface GigabitEthernet0/1
```

#### Adım 3: Trunk Modunu Etkinleştir
```
(config-if)# switchport mode trunk
```
**Beklenen Sonuç:** Arayüz trunk moduna geçer

#### Adım 4: Native VLAN Ayarla
```
(config-if)# switchport trunk native vlan 1
```
**Beklenen Sonuç:** Native VLAN 1 olarak ayarlanır

#### Adım 5: İzin Verilen VLAN'ları Belirle
```
(config-if)# switchport trunk allowed vlan 1,10,20
```
**Beklenen Sonuç:** Sadece VLAN 1, 10, 20 trunk üzerinden geçer

#### Adım 6: DTP'yi Devre Dışı Bırak
```
(config-if)# switchport nonegotiate
```
**Beklenen Sonuç:** DTP devre dışı bırakılır

#### Adım 7: Trunk Durumunu Kontrol Et
```
(config-if)# exit
# show interfaces trunk
```
**Beklenen Sonuç:** Trunk arayüzü ve ayarları gösterilir

#### 📝 Notlar
- `switchport mode trunk` arayüzü trunk moduna ayarlar
- `switchport trunk native vlan` native VLAN'ı belirler
- `switchport trunk allowed vlan` izin verilen VLAN'ları sınırlar
- `switchport nonegotiate` DTP'yi devre dışı bırakır
- Trunk portları birden fazla VLAN trafiğini taşır

---

## Yönlendirme Protokolleri

### 📌 Ders 11: Statik Yönlendirme

**Cihaz Türü:** Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Ön Koşullar
- En az 2 router ağa bağlı olmalı
- Routerların arayüzlerine IP adresleri atanmış olmalı

#### Adım 1: Ayrıcalıklı Moda Girin
```
# enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: Statik Rota Ekle
```
(config)# ip route 192.168.2.0 255.255.255.0 192.168.1.2
```
**Beklenen Sonuç:** Rota yönlendirme tablosuna eklenir

#### Adım 4: Varsayılan Rota Ekle
```
(config)# ip route 0.0.0.0 0.0.0.0 192.168.1.1
```
**Beklenen Sonuç:** Varsayılan rota ayarlanır

#### Adım 5: Yönlendirme Tablosunu Kontrol Et
```
(config)# exit
# show ip route
```
**Beklenen Sonuç:** Eklenen rotalar gösterilir

#### Adım 6: Rota Sil
```
# configure terminal
(config)# no ip route 192.168.2.0 255.255.255.0 192.168.1.2
```
**Beklenen Sonuç:** Rota yönlendirme tablosundan kaldırılır

#### 📝 Notlar
- `ip route` statik rota ekler
- Format: `ip route <hedef-ağ> <maske> <sonraki-atlama>`
- `0.0.0.0 0.0.0.0` varsayılan rota anlamına gelir
- `no ip route` rota siler
- `show ip route` tüm rotaları gösterir

---

### 📌 Ders 12: RIP Yönlendirme Protokolü

**Cihaz Türü:** Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: RIP Yönlendirmesini Etkinleştir
```
(config)# router rip
```
**Beklenen Sonuç:** Komut satırı `(config-router)#` olur

#### Adım 3: Ağ Ekle
```
(config-router)# network 192.168.1.0
```
**Beklenen Sonuç:** Ağ RIP'e eklenir

#### Adım 4: Başka Ağ Ekle
```
(config-router)# network 192.168.2.0
```

#### Adım 5: Pasif Arayüz Ayarla
```
(config-router)# passive-interface FastEthernet0/0
```
**Beklenen Sonuç:** Arayüz RIP paketleri göndermez

#### Adım 6: RIP Durumunu Kontrol Et
```
(config-router)# exit
# show ip route
```
**Beklenen Sonuç:** RIP rotaları gösterilir

#### 📝 Notlar
- `router rip` RIP yönlendirmesini etkinleştirir
- `network` ağları RIP'e ekler
- `passive-interface` arayüzü pasif yapar
- RIP v1 sınıflandırılmış yönlendirme kullanır
- RIP v2 CIDR destekler

---

### 📌 Ders 13: OSPF Yönlendirme Protokolü

**Cihaz Türü:** Router  
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: OSPF Yönlendirmesini Etkinleştir
```
(config)# router ospf 1
```
**Beklenen Sonuç:** Komut satırı `(config-router)#` olur (OSPF modu)

#### Adım 3: Router ID Ayarla
```
(config-router)# router-id 1.1.1.1
```
**Beklenen Sonuç:** Router ID ayarlanır

#### Adım 4: Ağ Ekle
```
(config-router)# network 192.168.1.0 0.0.0.255 area 0
```
**Beklenen Sonuç:** Ağ OSPF'e eklenir

#### Adım 5: Başka Ağ Ekle
```
(config-router)# network 192.168.2.0 0.0.0.255 area 0
```

#### Adım 6: Pasif Arayüz Ayarla
```
(config-router)# passive-interface FastEthernet0/0
```

#### Adım 7: OSPF Durumunu Kontrol Et
```
(config-router)# exit
# show ip route
```
**Beklenen Sonuç:** OSPF rotaları gösterilir

#### 📝 Notlar
- `router ospf <id>` OSPF yönlendirmesini etkinleştirir
- `router-id` OSPF router kimliğini ayarlar
- `network` komutu wildcard maskesi kullanır
- `area` OSPF alanını belirler
- OSPF daha hızlı yakınsama sağlar

---

## Güvenlik Komutları

### 📌 Ders 14: Port Güvenliği

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Arayüze Girin
```
(config)# interface FastEthernet0/1
```

#### Adım 3: Port Güvenliğini Etkinleştir
```
(config-if)# switchport port-security
```
**Beklenen Sonuç:** Port güvenliği etkinleştirilir

#### Adım 4: Maksimum MAC Adresi Ayarla
```
(config-if)# switchport port-security maximum 2
```
**Beklenen Sonuç:** Portun maksimum 2 MAC adresi kabul etmesi ayarlanır

#### Adım 5: İhlal Eylemini Ayarla
```
(config-if)# switchport port-security violation shutdown
```
**Beklenen Sonuç:** İhlal durumunda port kapatılır

#### Adım 6: Sticky MAC Etkinleştir
```
(config-if)# switchport port-security mac-address sticky
```
**Beklenen Sonuç:** Dinamik MAC adresleri yapışkan hale gelir

#### Adım 7: Port Güvenliği Durumunu Kontrol Et
```
(config-if)# exit
# show port-security
```
**Beklenen Sonuç:** Port güvenliği ayarları gösterilir

#### 📝 Notlar
- `switchport port-security` port güvenliğini etkinleştirir
- `maximum` izin verilen MAC adresi sayısını belirler
- `violation` ihlal durumunda yapılacak işlemi belirler
- `mac-address sticky` MAC adreslerini otomatik öğrenir
- Üç ihlal modu: protect, restrict, shutdown

---

### 📌 Ders 15: SSH Konfigürasyonu

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: RSA Anahtarları Oluştur
```
(config)# crypto key generate rsa
```
**Beklenen Sonuç:** RSA anahtarları oluşturulur

#### Adım 3: SSH Sürümünü Ayarla
```
(config)# ip ssh version 2
```
**Beklenen Sonuç:** SSH v2 etkinleştirilir

#### Adım 4: SSH Zaman Aşımını Ayarla
```
(config)# ip ssh time-out 120
```
**Beklenen Sonuç:** SSH bağlantısı 120 saniye sonra zaman aşımına uğrar

#### Adım 5: SSH Yeniden Deneme Limitini Ayarla
```
(config)# ip ssh authentication-retries 3
```
**Beklenen Sonuç:** 3 başarısız deneme sonra bağlantı kesilir

#### Adım 6: VTY Hatlarını Yapılandır
```
(config)# line vty 0 4
(config-line)# transport input ssh
(config-line)# login local
```
**Beklenen Sonuç:** SSH erişimi etkinleştirilir

#### Adım 7: SSH Durumunu Kontrol Et
```
(config-line)# exit
# show ssh
```
**Beklenen Sonuç:** SSH ayarları gösterilir

#### 📝 Notlar
- `crypto key generate rsa` SSH için gerekli anahtarları oluşturur
- `ip ssh version 2` SSH v2'yi etkinleştirir
- `transport input ssh` SSH erişimini sınırlar
- `login local` yerel kullanıcı veritabanını kullanır
- SSH Telnet'ten daha güvenlidir

---

### 📌 Ders 16: Kullanıcı Yönetimi

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Yerel Kullanıcı Oluştur
```
(config)# username admin privilege 15 secret MyPassword123
```
**Beklenen Sonuç:** Yönetici kullanıcı oluşturulur

#### Adım 3: Başka Kullanıcı Oluştur
```
(config)# username operator privilege 5 secret OpPassword456
```
**Beklenen Sonuç:** Operatör kullanıcı oluşturulur

#### Adım 4: Şifre Şifrelemesini Etkinleştir
```
(config)# service password-encryption
```
**Beklenen Sonuç:** Tüm şifreler şifrelenir

#### Adım 5: VTY Hatlarını Yapılandır
```
(config)# line vty 0 4
(config-line)# login local
(config-line)# transport input ssh telnet
```

#### Adım 6: Kullanıcıları Kontrol Et
```
(config-line)# exit
# show users
```
**Beklenen Sonuç:** Bağlı kullanıcılar gösterilir

#### 📝 Notlar
- `username` yerel kullanıcı oluşturur
- `privilege` kullanıcı ayrıcalık seviyesini belirler (0-15)
- `secret` şifreyi MD5 ile şifreler
- `service password-encryption` tüm şifreleri şifreler
- `login local` yerel kullanıcı veritabanını kullanır

---

## Kablosuz (WiFi) Komutları

### 📌 Ders 17: Kablosuz LAN Denetleyicisi (WLC) Konfigürasyonu

**Cihaz Türü:** Wireless LAN Controller (WLC)  
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Ön Koşullar
- Ağda WLC cihazı bulunmalı
- En az bir Access Point (AP) bağlı olmalı

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: WLAN Oluştur
```
(config)# wlan MyNetwork 1 MySSID
```
**Beklenen Sonuç:** WLAN "MyNetwork" adıyla SSID "MySSID" ile oluşturulur

#### Adım 4: WPA Güvenliğini Ayarla
```
(config)# security wpa psk set-key ascii 0 MySecurePassword123
```
**Beklenen Sonuç:** WPA güvenliği etkinleştirilir

#### Adım 5: RF Kanalını Ayarla
```
(config)# channel 6
```
**Beklenen Sonuç:** Kablosuz kanal 6 olarak ayarlanır

#### Adım 6: WLAN Durumunu Kontrol Et
```
(config)# exit
# show wlan summary
```
**Beklenen Sonuç:** WLAN bilgileri gösterilir

#### Adım 7: Access Point Durumunu Kontrol Et
```
# show ap summary
```
**Beklenen Sonuç:** Bağlı Access Point'ler listelenir

#### 📝 Notlar
- `wlan` komutu yeni WLAN oluşturur
- `security wpa psk` WPA güvenliğini ayarlar
- `channel` RF kanalını belirler (1-13 veya 1-14)
- `show wlan summary` tüm WLAN'ları gösterir
- `show ap summary` bağlı AP'leri gösterir

---

### 📌 Ders 18: Access Point (AP) Konfigürasyonu

**Cihaz Türü:** Access Point (AP)  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: AP Modunu Ayarla
```
(config)# station-role root
```
**Beklenen Sonuç:** AP root moda ayarlanır

#### Adım 4: Kablosuz Arayüzü Yapılandır
```
(config)# interface Wireless0
(config-if)# ip address 192.168.1.100 255.255.255.0
(config-if)# no shutdown
```

#### Adım 5: SSID Ayarla
```
(config-if)# exit
(config)# ssid MyNetwork
```

#### Adım 6: Güvenlik Ayarla
```
(config)# security wpa2 psk MyPassword123
```

#### Adım 7: AP Durumunu Kontrol Et
```
(config)# exit
# show wireless
```
**Beklenen Sonuç:** Kablosuz durumu gösterilir

#### 📝 Notlar
- `station-role root` AP'yi root moda ayarlar
- `ssid` kablosuz ağ adını belirler
- `security wpa2 psk` WPA2 güvenliğini ayarlar
- AP'ler WLC tarafından yönetilir
- Kablosuz arayüzüne IP adresi atanmalı

---

## Hata Ayıklama ve İzleme

### 📌 Ders 19: Ağ Tanılaması ve Hata Ayıklama

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Hata Ayıklamayı Etkinleştir
```
# debug ip packet
```
**Beklenen Sonuç:** IP paket hata ayıklaması başlar

#### Adım 3: Başka Bir Cihaza Ping Gönder
```
# ping 192.168.1.2
```
**Beklenen Sonuç:** Hata ayıklama çıktısı gösterilir

#### Adım 4: Hata Ayıklamayı Devre Dışı Bırak
```
# undebug all
```
**Beklenen Sonuç:** Tüm hata ayıklama devre dışı bırakılır

#### Adım 5: Hata Ayıklama Durumunu Kontrol Et
```
# show debugging
```
**Beklenen Sonuç:** Etkin hata ayıklama seçenekleri gösterilir

#### Adım 6: ARP Tablosunu Kontrol Et
```
# show arp
```
**Beklenen Sonuç:** ARP tablosu gösterilir

#### Adım 7: ARP Önbelleğini Temizle
```
# clear arp-cache
```
**Beklenen Sonuç:** ARP tablosu temizlenir

#### 📝 Notlar
- `debug` komutu hata ayıklamayı etkinleştirir
- `undebug all` tüm hata ayıklamayı devre dışı bırakır
- `show debugging` etkin hata ayıklama seçeneklerini gösterir
- `show arp` ARP tablosunu gösterir
- `clear arp-cache` ARP tablosunu temizler

---

### 📌 Ders 20: Arayüz İstatistikleri ve Durumu

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Tüm Arayüzleri Görüntüle
```
# show interfaces
```
**Beklenen Sonuç:** Tüm arayüzlerin detaylı bilgileri gösterilir

#### Adım 3: Belirli Arayüzü Görüntüle
```
# show interface FastEthernet0/1
```
**Beklenen Sonuç:** Arayüzün detaylı bilgileri gösterilir

#### Adım 4: Arayüz Durumunu Kısaca Görüntüle
```
# show interfaces status
```
**Beklenen Sonuç:** Tüm arayüzlerin kısa durumu gösterilir

#### Adım 5: IP Arayüzlerini Görüntüle
```
# show ip interface brief
```
**Beklenen Sonuç:** IP adresleri ile arayüzler gösterilir

#### Adım 6: Arayüz Sayaçlarını Temizle
```
# clear counters
```
**Beklenen Sonuç:** Arayüz istatistikleri sıfırlanır

#### Adım 7: MAC Adres Tablosunu Temizle
```
# clear mac address-table
```
**Beklenen Sonuç:** MAC adres tablosu temizlenir

#### 📝 Notlar
- `show interfaces` tüm arayüzlerin detaylı bilgisini gösterir
- `show interfaces status` kısa durum gösterir
- `show ip interface brief` IP bilgisini gösterir
- `clear counters` istatistikleri sıfırlar
- `clear mac address-table` MAC tablosunu temizler

---

### 📌 Ders 21: Spanning Tree Protokolü (STP) İzleme

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: STP Durumunu Görüntüle
```
# show spanning-tree
```
**Beklenen Sonuç:** STP bilgileri gösterilir

#### Adım 3: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 4: STP Modunu Ayarla
```
(config)# spanning-tree mode rapid-pvst
```
**Beklenen Sonuç:** STP modu Rapid PVST olur

#### Adım 5: VLAN STP Önceliğini Ayarla
```
(config)# spanning-tree vlan 1 priority 4096
```
**Beklenen Sonuç:** VLAN 1 için STP önceliği ayarlanır

#### Adım 6: PortFast'ı Etkinleştir
```
(config)# spanning-tree portfast default
```
**Beklenen Sonuç:** PortFast tüm erişim portlarında etkinleştirilir

#### Adım 7: STP Durumunu Tekrar Kontrol Et
```
(config)# exit
# show spanning-tree
```
**Beklenen Sonuç:** Güncellenmiş STP bilgileri gösterilir

#### 📝 Notlar
- `spanning-tree mode` STP modunu belirler (pvst, rapid-pvst, mst)
- `spanning-tree vlan priority` VLAN STP önceliğini ayarlar
- `spanning-tree portfast` PortFast'ı etkinleştirir
- Düşük öncelik değeri root bridge olma olasılığını artırır
- PortFast erişim portlarında STP gecikmesini azaltır

---

### 📌 Ders 22: CDP (Discovery Protocol) Kullanımı

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐ Orta

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: CDP Komşularını Görüntüle
```
# show cdp neighbors
```
**Beklenen Sonuç:** Bağlı CDP komşuları listelenir

#### Adım 3: CDP Detaylı Bilgisini Görüntüle
```
# show cdp neighbors detail
```
**Beklenen Sonuç:** Komşuların detaylı bilgileri gösterilir

#### Adım 4: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 5: CDP'yi Etkinleştir
```
(config)# cdp run
```
**Beklenen Sonuç:** CDP etkinleştirilir

#### Adım 6: Belirli Arayüzde CDP'yi Devre Dışı Bırak
```
(config)# interface FastEthernet0/1
(config-if)# no cdp enable
```

#### Adım 7: CDP Durumunu Kontrol Et
```
(config-if)# exit
# show cdp
```
**Beklenen Sonuç:** CDP genel bilgileri gösterilir

#### 📝 Notlar
- `show cdp neighbors` bağlı komşuları gösterir
- `cdp run` CDP'yi etkinleştirir
- `no cdp enable` belirli arayüzde CDP'yi devre dışı bırakır
- CDP cihazları otomatik olarak keşfeder
- CDP güvenlik riski olabilir, gerekli olmayan yerlerde devre dışı bırakılmalı

---

### 📌 Ders 23: DHCP Snooping

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: DHCP Snooping'i Etkinleştir
```
(config)# ip dhcp snooping
```
**Beklenen Sonuç:** DHCP snooping etkinleştirilir

#### Adım 3: VLAN'larda DHCP Snooping'i Etkinleştir
```
(config)# ip dhcp snooping vlan 1,10,20
```
**Beklenen Sonuç:** Belirtilen VLAN'larda DHCP snooping etkinleştirilir

#### Adım 4: Arayüzü Güvenilir Olarak Ayarla
```
(config)# interface GigabitEthernet0/1
(config-if)# ip dhcp snooping trust
```
**Beklenen Sonuç:** Arayüz güvenilir DHCP sunucusu olarak ayarlanır

#### Adım 5: DHCP Snooping Durumunu Kontrol Et
```
(config-if)# exit
# show ip dhcp snooping
```
**Beklenen Sonuç:** DHCP snooping ayarları gösterilir

#### Adım 6: DHCP Bağlamalarını Görüntüle
```
# show ip dhcp binding
```
**Beklenen Sonuç:** DHCP tarafından atanan IP adresleri gösterilir

#### 📝 Notlar
- `ip dhcp snooping` DHCP snooping'i etkinleştirir
- `ip dhcp snooping vlan` belirli VLAN'larda etkinleştirir
- `ip dhcp snooping trust` arayüzü güvenilir yapar
- DHCP snooping rogue DHCP sunucularını engeller
- Güvenilir arayüzler DHCP sunucularına bağlanır

---

## İleri Konular

### 📌 Ders 24: DHCP Sunucusu Konfigürasyonu

**Cihaz Türü:** Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: DHCP Havuzu Oluştur
```
(config)# ip dhcp pool OFFICE
```
**Beklenen Sonuç:** Komut satırı `(dhcp-config)#` olur

#### Adım 3: Ağ Tanımla
```
(dhcp-config)# network 192.168.1.0 255.255.255.0
```
**Beklenen Sonuç:** DHCP havuzunun ağı tanımlanır

#### Adım 4: Varsayılan Ağ Geçidini Ayarla
```
(dhcp-config)# default-router 192.168.1.1
```
**Beklenen Sonuç:** Varsayılan ağ geçidi ayarlanır

#### Adım 5: DNS Sunucusu Ekle
```
(dhcp-config)# dns-server 8.8.8.8 8.8.4.4
```
**Beklenen Sonuç:** DNS sunucuları eklenir

#### Adım 6: Kira Süresi Ayarla
```
(dhcp-config)# lease 7
```
**Beklenen Sonuç:** Kira süresi 7 gün olur

#### Adım 7: Alan Adı Ayarla
```
(dhcp-config)# domain-name example.com
```
**Beklenen Sonuç:** Alan adı ayarlanır

#### Adım 8: Hariç Tutulan Adresleri Ayarla
```
(dhcp-config)# exit
(config)# ip dhcp excluded-address 192.168.1.1 192.168.1.10
```
**Beklenen Sonuç:** 1-10 adresleri DHCP'den hariç tutulur

#### Adım 9: DHCP Havuzunu Kontrol Et
```
(config)# exit
# show ip dhcp pool
```
**Beklenen Sonuç:** DHCP havuzu bilgileri gösterilir

#### 📝 Notlar
- `ip dhcp pool` DHCP havuzu oluşturur
- `network` havuzun ağını tanımlar
- `default-router` varsayılan ağ geçidini ayarlar
- `dns-server` DNS sunucularını ayarlar
- `lease` kira süresini belirler
- `ip dhcp excluded-address` adresleri hariç tutar

---

### 📌 Ders 25: EtherChannel Konfigürasyonu

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Ön Koşullar
- En az 2 switch ağa bağlı olmalı
- Aralarında en az 2 bağlantı olmalı

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: İlk Arayüzü Seç
```
(config)# interface FastEthernet0/1
```

#### Adım 3: Channel Group Ekle
```
(config-if)# channel-group 1 mode active
```
**Beklenen Sonuç:** Arayüz channel group 1'e eklenir

#### Adım 4: İkinci Arayüzü Seç
```
(config-if)# exit
(config)# interface FastEthernet0/2
```

#### Adım 5: Aynı Channel Group'a Ekle
```
(config-if)# channel-group 1 mode active
```

#### Adım 6: EtherChannel Durumunu Kontrol Et
```
(config-if)# exit
# show etherchannel summary
```
**Beklenen Sonuç:** EtherChannel bilgileri gösterilir

#### Adım 7: Port Channel Arayüzünü Yapılandır
```
# configure terminal
(config)# interface Port-channel 1
(config-if)# switchport mode trunk
(config-if)# switchport trunk allowed vlan 1,10,20
```

#### 📝 Notlar
- `channel-group` arayüzleri EtherChannel'a ekler
- `mode active` LACP aktif modunu kullanır
- `mode on` statik EtherChannel kullanır
- Port-channel arayüzü mantıksal bağlantıyı temsil eder
- EtherChannel bant genişliğini artırır

---

### 📌 Ders 26: QoS (Quality of Service) Konfigürasyonu

**Cihaz Türü:** Switch  
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: MLS QoS'u Etkinleştir
```
(config)# mls qos
```
**Beklenen Sonuç:** QoS etkinleştirilir

#### Adım 3: Arayüze Girin
```
(config)# interface FastEthernet0/1
```

#### Adım 4: QoS Güven Durumunu Ayarla
```
(config-if)# mls qos trust cos
```
**Beklenen Sonuç:** Arayüz CoS değerlerine güvenir

#### Adım 5: Varsayılan CoS Değeri Ayarla
```
(config-if)# mls qos cos 3
```
**Beklenen Sonuç:** Varsayılan CoS değeri 3 olur

#### Adım 6: QoS Durumunu Kontrol Et
```
(config-if)# exit
# show mls qos
```
**Beklenen Sonuç:** QoS ayarları gösterilir

#### 📝 Notlar
- `mls qos` QoS'u etkinleştirir
- `mls qos trust` arayüzün güven durumunu ayarlar
- `mls qos cos` varsayılan CoS değerini ayarlar
- CoS değerleri 0-7 arasında değişir
- QoS trafik önceliğini belirler

---

### 📌 Ders 27: IPv6 Konfigürasyonu

**Cihaz Türü:** Router  
**Zorluk Seviyesi:** ⭐⭐⭐⭐ Çok İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: IPv6 Yönlendirmesini Etkinleştir
```
(config)# ipv6 unicast-routing
```
**Beklenen Sonuç:** IPv6 yönlendirmesi etkinleştirilir

#### Adım 3: Arayüze Girin
```
(config)# interface FastEthernet0/0
```

#### Adım 4: IPv6 Adresi Ata
```
(config-if)# ipv6 address 2001:db8::1/64
```
**Beklenen Sonuç:** IPv6 adresi atanır

#### Adım 5: Arayüzü Etkinleştir
```
(config-if)# no shutdown
```

#### Adım 6: IPv6 Statik Rota Ekle
```
(config-if)# exit
(config)# ipv6 route 2001:db8:2::/64 2001:db8::2
```
**Beklenen Sonuç:** IPv6 rota eklenir

#### Adım 7: IPv6 Yönlendirme Tablosunu Kontrol Et
```
(config)# exit
# show ipv6 route
```
**Beklenen Sonuç:** IPv6 rotaları gösterilir

#### Adım 8: IPv6 Arayüzlerini Kontrol Et
```
# show ipv6 interface brief
```
**Beklenen Sonuç:** IPv6 arayüzleri gösterilir

#### 📝 Notlar
- `ipv6 unicast-routing` IPv6 yönlendirmesini etkinleştirir
- `ipv6 address` IPv6 adresi atar
- `ipv6 route` IPv6 statik rota ekler
- IPv6 adresleri 128 bit uzunluğundadır
- CIDR notasyonu IPv6'da da kullanılır

---

### 📌 Ders 28: Sistem Yönetimi ve Bakım

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Cihaz Envanterini Görüntüle
```
# show inventory
```
**Beklenen Sonuç:** Donanım envanteri gösterilir

#### Adım 3: Ortam Durumunu Kontrol Et
```
# show environment
```
**Beklenen Sonuç:** Sıcaklık, fan, güç kaynağı bilgileri gösterilir

#### Adım 4: Bellek Kullanımını Kontrol Et
```
# show memory
```
**Beklenen Sonuç:** Bellek istatistikleri gösterilir

#### Adım 5: İşlemci Kullanımını Kontrol Et
```
# show processes
```
**Beklenen Sonuç:** CPU işlemleri gösterilir

#### Adım 6: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 7: Sistem MTU'sunu Ayarla
```
(config)# system mtu 1500
```
**Beklenen Sonuç:** Sistem MTU'su ayarlanır

#### Adım 8: Cihazı Yeniden Başlat
```
(config)# exit
# reload
```
**Beklenen Sonuç:** Cihaz yeniden başlatılır

#### 📝 Notlar
- `show inventory` donanım bilgisini gösterir
- `show environment` sistem durumunu gösterir
- `show memory` bellek kullanımını gösterir
- `show processes` CPU kullanımını gösterir
- `reload` cihazı yeniden başlatır
- Yeniden başlatmadan önce konfigürasyonu kaydedin

---

### 📌 Ders 29: Komut Takma Adları ve Makrolar

**Cihaz Türü:** Switch veya Router  
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 2: Komut Takma Adı Oluştur
```
(config)# alias exec si show interfaces
```
**Beklenen Sonuç:** "si" komutu "show interfaces" için takma ad olur

#### Adım 3: Başka Takma Ad Oluştur
```
(config)# alias exec sr show running-config
```

#### Adım 4: Takma Adları Kontrol Et
```
(config)# exit
# show alias
```
**Beklenen Sonuç:** Oluşturulan takma adlar gösterilir

#### Adım 5: Takma Adı Kullan
```
# si
```
**Beklenen Sonuç:** "show interfaces" komutu çalışır

#### Adım 6: Makro Tanımla
```
# configure terminal
(config)# macro name SHOW-ALL
(config)# show interfaces
(config)# show ip route
(config)# show vlan
(config)# exit
```

#### 📝 Notlar
- `alias exec` komut takma adı oluşturur
- Takma adlar yazım hızını artırır
- `macro name` makro tanımlar
- Makrolar birden fazla komutu bir arada çalıştırır
- `show alias` tüm takma adları gösterir

---

### 📌 Ders 30: Erişim Kontrol Listeleri (ACL)

**Cihaz Türü:** Router
**Zorluk Seviyesi:** ⭐⭐⭐ İleri

#### Adım 1: Ayrıcalıklı Moda Girin
```
> enable
```

#### Adım 2: Konfigürasyon Moduna Girin
```
# configure terminal
```

#### Adım 3: Standart Access-List Oluşturun
```
(config)# access-list 1 deny host 192.168.1.10
(config)# access-list 1 permit any
```
**Beklenen Sonuç:** PC-1 (192.168.1.10) trafiğini engelleyen, diğer tüm trafiğe izin veren ACL oluşturulur

#### Adım 4: ACL'i Arayüze Uygulayın
```
(config)# interface gi0/0
(config-if)# ip access-group 1 out
```
**Beklenen Sonuç:** ACL 1, Gi0/0 arayüzünde outgoing yönde uygulanır

#### Adım 5: ACL'i Görüntüleyin
```
(config-if)# exit
# show access-lists
```
**Beklenen Sonuç:** Oluşturulan ACL kuralları listelenir

#### Adım 6: Konfigürasyonu Kaydet
```
# write memory
```

#### 📝 Notlar
- Standart ACL'ler (1-99) yalnızca kaynak IP'ye göre filtreleme yapar
- Extended ACL'ler (100-199) kaynak/hedef IP, port ve protokole göre filtreleme yapar
- `access-list` komutu global konfigürasyon modunda çalışır
- `ip access-group` komutu interface konfigürasyon modunda çalışır
- ACL'ler sıralı olarak işlenir; ilk eşleşen kural uygulanır
- Her ACL'in sonunda `permit any` veya `deny any` ile bitmesi önerilir
- `show access-lists` tüm ACL'leri gösterir
- Named ACL için `ip access-list standard <isim>` kullanılır

---

## 🎯 Pratik Senaryolar

### Senaryo 1: Temel Ağ Kurulumu

**Hedef:** 2 switch ve 1 router ile basit bir ağ kurmak

**Adımlar:**
1. Her cihaza hostname atayın
2. Arayüzlere IP adresleri atayın
3. Statik rotalar ekleyin
4. Ping ile bağlantıyı test edin

**Beklenen Sonuç:** Tüm cihazlar birbirine ping atabilir

---

### Senaryo 2: VLAN Segmentasyonu

**Hedef:** 3 VLAN oluşturup arayüzleri atamak

**Adımlar:**
1. VLAN 10, 20, 30 oluşturun
2. Her VLAN'a ad verin
3. Arayüzleri VLAN'lara atayın
4. Trunk port yapılandırın
5. VLAN durumunu kontrol edin

**Beklenen Sonuç:** VLAN'lar düzgün şekilde yapılandırılır

---

### Senaryo 3: Güvenli Uzaktan Erişim

**Hedef:** SSH üzerinden güvenli erişim sağlamak

**Adımlar:**
1. RSA anahtarları oluşturun
2. SSH v2'yi etkinleştirin
3. Yerel kullanıcı oluşturun
4. VTY hatlarını yapılandırın
5. SSH bağlantısını test edin

**Beklenen Sonuç:** SSH üzerinden güvenli bağlantı sağlanır

---

### Senaryo 4: Dinamik Yönlendirme

**Hedef:** OSPF yönlendirmesini yapılandırmak

**Adımlar:**
1. OSPF'i etkinleştirin
2. Router ID'sini ayarlayın
3. Ağları OSPF'e ekleyin
4. Pasif arayüzleri ayarlayın
5. Yönlendirme tablosunu kontrol edin

**Beklenen Sonuç:** OSPF rotaları otomatik olarak öğrenilir

---

### Senaryo 5: Kablosuz Ağ Kurulumu

**Hedef:** WLC ve AP ile kablosuz ağ kurmak

**Adımlar:**
1. WLC'de WLAN oluşturun
2. WPA2 güvenliğini ayarlayın
3. RF kanalını belirleyin
4. AP'leri bağlayın
5. Kablosuz durumunu kontrol edin

**Beklenen Sonuç:** Kablosuz ağ aktif ve erişilebilir

---

## 📁 Örnek Projeler

Network Simulator, farklı zorluk seviyelerinde **40 hazır örnek proje** ile birlikte gelir. Her proje önceden yapılandırılmış cihazlar ve bağlantılarla birlikte yüklenir.

| # | Proje | Etiket | Seviye | Açıklama |
|---|-------|--------|--------|----------|
| 1 | Basit Ağ + Parolalar | TEMEL | ⭐ Başlangıç | Temel ağ güvenliği için console, VTY ve enable parolaları |
| 2 | 1 Switch VLAN | VLAN | ⭐ Başlangıç | Tek switch üzerinde VLAN 10 ve 20 ile iki PC erişim portu |
| 3 | 2 Switch Trunk + VTP | TRUNK/VTP | ⭐⭐ Orta | İki switch arası trunk bağlantısı ve VTP ile VLAN yayılımı |
| 4 | ROAS (Router-on-a-Stick) | ROAS | ⭐⭐ Orta | Tek trunk interface üzerinden inter-VLAN routing |
| 5 | Legacy Inter-VLAN Routing | LEGACY ROUTING | ⭐⭐ Orta | Router iki fiziksel interface ile VLAN'lara bağlanır |
| 6 | Port-Security | GÜVENLİK | ⭐⭐ Orta | Switch portunda MAC adres tabanlı güvenlik kısıtlaması |
| 7 | Inter-VLAN Routing (L3 Switch) | L3 ROUTING | ⭐⭐⭐ İleri | L3 switch üzerinde dört VLAN arası routing |
| 8 | Static Routing Lab | ROUTING | ⭐⭐⭐ İleri | İki router arası statik yönlendirme |
| 9 | EtherChannel Lab | ETHERCHANNEL | ⭐⭐⭐ İleri | LACP ile birden fazla link tek bir mantıksal bağlantıda |
| 10 | STP Redundant Links | STP | ⭐⭐⭐ İleri | Rapid-PVST redundant linklerde loop önleme |
| 11 | STP Triangle Topology | STP | ⭐⭐⭐ İleri | Üç switch triangle topolojisinde STP |
| 12 | Campus Network | CAMPUS | ⭐⭐⭐ İleri | Core router ile iki access switch arası routing |
| 13 | Kablosuz Ağ (WiFi) | WiFi | ⭐⭐ Orta | Router access point mode ile kablosuz istemci bağlantısı |
| 14 | IoT WiFi Laboratuvarı | IoT | ⭐⭐ Orta | Üç IoT cihazı ve PC açık WiFi ağına bağlanır |
| 15 | Sera Krokisi (Akıllı Tarım) | ÇEVRE | ⭐⭐ Orta | Dört çevresel sensör WPA2 güvenli WiFi ile sera izleme |
| 16 | Router SSH (1 PC + 1 Router) | SSH | ⭐ Başlangıç | PC üzerinden router'a SSH ile güvenli bağlantı |
| 17 | Router DHCP (2 PC + 1 Switch + 1 Router) | DHCP | ⭐ Başlangıç | Router DHCP havuzu üzerinden iki PC'ye otomatik IP |
| 18 | Firewall Temel (ICMP Bloke) | FIREWALL | ⭐ Başlangıç | ICMP engellenmiş, diğer tüm trafiğe izin verilmiş firewall |
| 19 | MAC Tablo Öğrenme | MAC | ⭐ Başlangıç | Switch MAC adres tablosu öğrenme özelliği |
| 20 | DNS ve HTTP Test | DNS/HTTP | ⭐⭐ Orta | DNS name resolution ve HTTP web erişimi testi |
| 21 | ARP ve MAC Tablo Çalışması | MAC | ⭐ Başlangıç | ARP ve MAC adres tablosu arasındaki ilişki |
| 22 | IP Yapılandırma Laboratuvarı | IP | ⭐ Başlangıç | IP yapılandırmasının ağ bağlantısı üzerindeki etkisi |
| 23 | DHCP Dağıtım Senaryosu | DHCP | ⭐⭐ Orta | DHCP otomatik IP dağıtımı vs manuel yapılandırma |
| 24 | 2 Switch Trunk Uygulaması | TRUNK | ⭐⭐ Orta | İki switch trunk bağlantısı ile VLAN trafiği |
| 25 | Native VLAN Yapılandırması | NATIVE | ⭐ Başlangıç | İki switch arası native VLAN 99 trunk bağlantısı |
| 26 | STP 3 Switch PVST | STP | ⭐⭐⭐ İleri | PVST ile her VLAN için farklı root bridge yük dengelemesi |
| 27 | 2 L3 Switch VLAN (AG1/AG2) | L3 VLAN | ⭐⭐⭐ İleri | İki L3 switch SVI gateway ile VLAN'lar arası routing |
| 28 | L3 Switch Statik Yönlendirme | STATIC ROUTING | ⭐⭐⭐ İleri | Multilayer switch'ler ve router statik rotalar |
| 29 | RIP Dinamik Yönlendirme | RIP ROUTING | ⭐⭐⭐ İleri | RIP dinamik yönlendirme protokolü ile otomatik route öğrenimi |
| 30 | ACL Standard | ACL | ⭐⭐ Orta | Standard ACL ile temel erişim kontrolü |
| 31 | ACL Extended | ACL | ⭐⭐⭐ İleri | Extended ACL ile protokol/port bazlı filtreleme |
| 32 | NAT Static | NAT | ⭐⭐ Orta | Static NAT ile birebir adres eşlemesi |
| 33 | NAT Dynamic | NAT | ⭐⭐⭐ İleri | NAT havuzu ile dinamik çeviri |
| 34 | NAT PAT | NAT | ⭐⭐⭐ İleri | PAT (NAT overload) ile çoktan-bire çeviri |
| 35 | HSRP Redundancy | HSRP | ⭐⭐⭐ İleri | Varsayılan ağ geçidi yedekliliği için HSRP |
| 36 | OSPF Multi-Area | OSPF | ⭐⭐⭐ İleri | Area 0 ve Area 10 ile çok alanlı OSPF |
| 37 | OSPF Multi-Area | OSPF | ⭐⭐⭐ İleri | ABR üzerinden farklı OSPF alanlarının omurgaya bağlanması |
| 38 | EIGRP Basic | EIGRP | ⭐⭐⭐ İleri | Temel EIGRP komutları ile dinamik yönlendirme |
| 39 | IPv6 Gelişmiş Lab (DHCPv6 & OSPFv3) | IPv6 | ⭐⭐⭐ İleri | IPv6 adresleme, DHCPv6 havuzları ve OSPFv3 |
| 40 | Tüm Servisler Laboratuvarı | SERVİSLER | ⭐⭐ Orta | DNS, HTTP, DHCP, FTP, MAIL, NTP servislerinin bir arada bulunduğu lab |

### Seviyelere Göre Dağılım
- ⭐ **Başlangıç (12 proje):** Temel ağ, parolalar, VLAN, SSH, DHCP, firewall, MAC, ARP, IP, native VLAN
- ⭐⭐ **Orta (13 proje):** Trunk, VTP, ROAS, inter-VLAN, port-security, WiFi, IoT, DNS/HTTP, DHCP, ACL, NAT, servisler
- ⭐⭐⭐ **İleri (15 proje):** L3 routing, static routing, EtherChannel, STP, campus, PVST, OSPF, EIGRP, IPv6, HSRP, extended ACL, NAT/PAT

---

## 📚 Hızlı Referans Tablosu

### Sık Kullanılan Komutlar

| Komut | Açıklama | Mod |
|-------|----------|-----|
| `enable` | Ayrıcalıklı moda gir | User |
| `configure terminal` | Konfigürasyon moduna gir | Privileged |
| `exit` | Moddan çık | Tüm |
| `show running-config` | Aktif konfigürasyonu göster | Privileged |
| `write memory` | Konfigürasyonu kaydet | Privileged |
| `ping <host>` | Bağlantı testi | Privileged |
| `interface <name>` | Arayüze gir | Config |
| `ip address <ip> <mask>` | IP adresi ata | Interface |
| `no shutdown` | Arayüzü etkinleştir | Interface |
| `vlan <id>` | VLAN oluştur | Config |
| `show vlan` | VLAN'ları göster | Privileged |

---

## 🔍 Sorun Giderme İpuçları

### Komut Çalışmıyor
- Doğru modda olduğunuzu kontrol edin
- `?` ile komut sözdizimini kontrol edin
- Yazım hatalarını kontrol edin

### Bağlantı Sorunu
- Arayüzlerin `no shutdown` olduğunu kontrol edin
- IP adreslerini kontrol edin
- Yönlendirme tablosunu kontrol edin
- Ping ile bağlantıyı test edin

### Konfigürasyon Kayboldu
- `write memory` ile konfigürasyonu kaydedin
- `show startup-config` ile başlangıç konfigürasyonunu kontrol edin
- Cihazı yeniden başlatmadan önce kaydedin

### Performans Sorunu
- `show processes` ile CPU kullanımını kontrol edin
- `show memory` ile bellek kullanımını kontrol edin
- Gereksiz hata ayıklamayı devre dışı bırakın

---

## 📖 Ek Kaynaklar

- [CLI Komutları Referansı](CLI_COMMANDS.md)
- [Hata Ayıklama Kılavuzu](ERROR_HANDLING_GUIDE.md)
- [L3 Switch Konfigürasyonu](L3_SWITCH_CONFIGURATION.md)
- [Kablosuz Konfigürasyon](WIRELESS_CONFIGURATION_GUIDE.md)

---

## 💡 İpuçları ve Püf Noktaları

1. **Tab Tamamlama:** Komutları hızlı yazabilmek için TAB tuşunu kullanın
2. **Komut Geçmişi:** Önceki komutlara erişmek için yukarı ok tuşunu kullanın
3. **Kısayollar:** Sık kullanılan komutlar için takma adlar oluşturun
4. **Yardım Sistemi:** Bilinmeyen komutlar için `?` kullanın
5. **Konfigürasyon Yedekleme:** Önemli değişikliklerden önce konfigürasyonu kaydedin

---

### Proje 1: Basit Ağ + Parolalar

**Hedef:** Switch üzerinde console, VTY ve enable parolalarını yapılandırmak ve doğrulamak.

**Cihazlar:** 1 Switch (SW1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/1 (Straight), PC-2 COM1 → SW1 Console (Console)

**Adımlar:**
1. SW1 terminaline girin: `enable`, `configure terminal`
2. Parolaları ayarlayın: `enable secret class`, `enable password paswd`, `service password-encryption`
3. Console hattını yapılandırın: `line con 0`, `password console`, `login`, `logging synchronous`
4. VTY hattını yapılandırın: `line vty 0 4`, `password vty123`, `login`, `transport input telnet ssh`
5. VLAN 10 oluşturun: `vlan 10`, `name VLAN10`
6. SVI arayüzünü yapılandırın: `interface vlan 10`, `ip address 192.168.10.150 255.255.255.0`, `no shutdown`
7. PC-1 portunu VLAN 10'a atayın: `interface fa0/1`, `switchport mode access`, `switchport access vlan 10`
8. PC-1'e IP 192.168.10.10/24 verin, gateway 192.168.10.150

**Test:** PC-2 Console terminalinden SW1'e bağlanın; PC-1 CMD'den `telnet 192.168.10.150` (şifre: vty123), enable şifresi: class/paswd

**Beklenen Sonuç:** Switch'e konsol ve telnet üzerinden parolalarla erişilebilir.

---

### Proje 2: 1 Switch VLAN

**Hedef:** Tek switch üzerinde VLAN 10 ve 20 oluşturarak PC'leri farklı broadcast domain'lerine ayırmak.

**Cihazlar:** 1 Switch (SW1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/1, PC-2 Eth0 → SW1 Fa0/2

**Adımlar:**
1. SW1 terminaline girin: `enable`, `configure terminal`
2. VLAN 10 oluşturun: `vlan 10`, `name VLAN10`
3. VLAN 20 oluşturun: `vlan 20`, `name VLAN20`
4. Fa0/1'i VLAN 10'a atayın: `interface fa0/1`, `switchport mode access`, `switchport access vlan 10`
5. Fa0/2'yi VLAN 20'ye atayın: `interface fa0/2`, `switchport mode access`, `switchport access vlan 20`
6. PC-1: IP 192.168.10.10/24, VLAN 10; PC-2: IP 192.168.20.10/24, VLAN 20

**Test:** `show vlan brief`, `show interfaces status`, PC-1'den PC-2'ye ping

**Beklenen Sonuç:** PC'ler farklı VLAN'larda olduğu için birbirine ping atamaz.

---

### Proje 3: 2 Switch Trunk + VTP

**Hedef:** İki switch arasında VTP kullanarak VLAN bilgilerinin otomatik yayılımını sağlamak.

**Cihazlar:** 2 Switch (SW1, SW2), 1 PC (PC-1)

**Bağlantılar:** SW1 Gi0/1 → SW2 Gi0/1 (Crossover), PC-1 Eth0 → SW2 Fa0/1

**Adımlar:**
1. SW1: `vtp mode server`, `vtp domain LAB`
2. SW2: `vtp mode client`, `vtp domain LAB`
3. SW1 Gi0/1 trunk yapın: `interface gi0/1`, `switchport mode trunk`
4. SW2 Gi0/1 trunk yapın: `interface gi0/1`, `switchport mode trunk`
5. SW1'de VLAN 10 ve 20 oluşturun → SW2'ye otomatik yayılır
6. SW2 Fa0/1'i VLAN 10'a atayın: `interface fa0/1`, `switchport mode access`, `switchport access vlan 10`
7. PC-1: IP 192.168.10.10/24, VLAN 10

**Test:** `show vlan brief` (her iki switch'te), `show interfaces trunk`

**Beklenen Sonuç:** SW1'de oluşturulan VLAN'lar VTP sayesinde SW2'de otomatik görünür.

---

### Proje 4: ROAS (Router-on-a-Stick)

**Hedef:** Router-on-a-Stick kullanarak tek trunk interface üzerinden inter-VLAN routing sağlamak.

**Cihazlar:** 1 Switch (SW1), 1 Router (R1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/1, PC-2 Eth0 → SW1 Fa0/2, SW1 Gi0/1 → R1 Gi0/0 (Crossover)

**Adımlar:**
1. SW1'de VLAN 10 ve 20 oluşturun; Fa0/1 → VLAN 10, Fa0/2 → VLAN 20
2. SW1 Gi0/1 trunk yapın: `switchport trunk encapsulation dot1q`, `switchport mode trunk`
3. R1'de: `interface gi0/0`, `no shutdown`
4. Subinterface Gi0/0.10: `encapsulation dot1q 10`, `ip address 192.168.10.1 255.255.255.0`
5. Subinterface Gi0/0.20: `encapsulation dot1q 20`, `ip address 192.168.20.1 255.255.255.0`
6. PC-1: IP 192.168.10.10/24, GW 192.168.10.1; PC-2: IP 192.168.20.10/24, GW 192.168.20.1

**Test:** PC-1 > `ping 192.168.20.10`

**Beklenen Sonuç:** Farklı VLAN'lardaki PC'ler birbirine ping atabilir.

---

### Proje 5: Legacy Inter-VLAN Routing

**Hedef:** Router üzerinde iki fiziksel interface kullanarak VLAN'lar arası routing sağlamak.

**Cihazlar:** 1 Switch (SW1), 1 Router (R1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/2, PC-2 Eth0 → SW1 Fa0/12, R1 Gi0/1 → SW1 Fa0/11 (Crossover), R1 Gi0/0 → SW1 Fa0/1 (Crossover)

**Adımlar:**
1. SW1: VLAN 10 (Fa0/2, Fa0/11), VLAN 20 (Fa0/12, Fa0/1) oluşturun
2. R1 Gi0/1: `ip address 192.168.0.1 255.255.255.0`, `no shutdown`
3. R1 Gi0/0: `ip address 192.168.1.1 255.255.255.0`, `no shutdown`
4. PC-1: IP 192.168.0.2/24, GW 192.168.0.1; PC-2: IP 192.168.1.2/24, GW 192.168.1.1

**Test:** PC-1 > `ping 192.168.1.2`

**Beklenen Sonuç:** Router iki farklı fiziksel arayüz üzerinden VLAN'lar arası iletişimi sağlar.

---

### Proje 6: Port-Security

**Hedef:** Switch portunda MAC adres tabanlı güvenlik kısıtlaması yapılandırmak.

**Cihazlar:** 1 Switch (SW1), 1 PC (PC-1)

**Bağlantılar:** PC-1 Eth0 → SW1 Fa0/3

**Adımlar:**
1. `interface fa0/3`, `switchport mode access`
2. `switchport port-security`, `switchport port-security maximum 1`
3. `switchport port-security violation shutdown`
4. `switchport port-security mac-address sticky`
5. PC-1: IP 192.168.1.10/24

**Test:** `show port-security interface fa0/3`, `show port-security address`

**Beklenen Sonuç:** Port sadece öğrendiği MAC adresine izin verir; başka MAC bağlanırsa port shutdown olur.

---

### Proje 7: Inter-VLAN Routing (L3 Switch)

**Hedef:** L3 switch üzerinde SVI interface'leri ile dört VLAN arası routing sağlamak.

**Cihazlar:** 1 L3 Switch (L3SW1), 4 PC (PC-1, PC-2, PC-3, PC-4)

**Bağlantılar:** PC-1→Gi1/0/1, PC-2→Gi1/0/2, PC-3→Gi1/0/3, PC-4→Gi1/0/4

**Adımlar:**
1. L3SW1: `ip routing`
2. VLAN 10, 20, 30, 40 oluşturun
3. SVI'ları yapılandırın: `interface vlan 10`, `ip address 192.168.10.1 255.255.255.0` (benzer şekilde 20/30/40)
4. Portları atayın: `interface gi1/0/1`, `switchport mode access`, `switchport access vlan 10`
5. PC'ler: IP 192.168.x.10/24, GW 192.168.x.1

**Test:** `show ip route`, tüm PC'ler arası ping

**Beklenen Sonuç:** Tüm PC'ler birbirine ping atabilir.

---

### Proje 8: Static Routing Lab

**Hedef:** İki router arasında statik yönlendirme ile farklı subnetler arası iletişim sağlamak.

**Cihazlar:** 2 Router (R1, R2), 2 Switch, 2 PC

**Bağlantılar:** PC-1→SW1→R1-Gi0/0, R1-Gi0/1→R2-Gi0/0, R2-Gi0/1→SW2→PC-2

**Adımlar:**
1. R1 Gi0/0: `ip address 192.168.1.1 255.255.255.0`; R1 Gi0/1: `ip address 192.168.10.1 255.255.255.0`
2. R2 Gi0/0: `ip address 192.168.1.2 255.255.255.0`; R2 Gi0/1: `ip address 192.168.20.1 255.255.255.0`
3. R1: `ip route 192.168.20.0 255.255.255.0 192.168.1.2`
4. R2: `ip route 192.168.10.0 255.255.255.0 192.168.1.1`
5. PC-1: IP 192.168.10.10/24, GW 192.168.10.1; PC-2: IP 192.168.20.10/24, GW 192.168.20.1

**Test:** PC-1 > `ping 192.168.20.10`, `show ip route`

**Beklenen Sonuç:** İki farklı ağdaki PC'ler statik rotalar sayesinde birbirine ping atabilir.

---

### Proje 9: EtherChannel Lab

**Hedef:** LACP ile birden fazla linki tek bir mantıksal bağlantıda birleştirerek bant genişliğini artırmak.

**Cihazlar:** 2 Switch (SW1, SW2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW2 Fa0/1, SW1 Gi0/1-2 → SW2 Gi0/1-2 (Crossover)

**Adımlar:**
1. Her switch'te VLAN 10 oluşturun
2. SW1: `interface range gi0/1-2`, `channel-group 1 mode active`
3. SW1: `interface port-channel 1`, `switchport mode trunk`
4. SW2'de aynı EtherChannel konfigürasyonu
5. PC-1: IP 192.168.10.10/24; PC-2: IP 192.168.10.11/24

**Test:** `show etherchannel summary`, PC-1 > `ping 192.168.10.11`

**Beklenen Sonuç:** İki switch arasında LACP EtherChannel aktif, PC'ler birbirine ping atabilir.

---

### Proje 10: STP Redundant Links

**Hedef:** Rapid-PVST kullanarak redundant linklerde loop önlemek.

**Cihazlar:** 2 Switch (SW1, SW2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW2 Fa0/1, SW1 Gi0/1-2 → SW2 Gi0/1-2 (Crossover)

**Adımlar:**
1. SW1: `spanning-tree mode rapid-pvst`, `spanning-tree vlan 10 priority 28672` (root bridge)
2. SW2: `spanning-tree mode rapid-pvst`
3. Her switch'te VLAN 10 oluşturun, trunk portları yapılandırın
4. PC-1: IP 192.168.10.10/24; PC-2: IP 192.168.10.11/24

**Test:** `show spanning-tree` (Gi0/2 BLK olmalı), kabloyu çekip Gi0/2'nin devralmasını gözlemleyin

**Beklenen Sonuç:** STP bir portu bloke eder, loop önlenir, redundant bağlantı hazır bekler.

---

### Proje 11: STP Triangle Topology

**Hedef:** Üç switch üçgen topolojisinde STP'nin loop önleme davranışını gözlemlemek.

**Cihazlar:** 3 Switch (SW1, SW2, SW3), 2 PC

**Bağlantılar:** SW1-Fa0/1↔SW3-Fa0/1, SW1-Fa0/2↔SW2-Fa0/1, SW2-Fa0/2↔SW3-Fa0/2 (üçgen bağlantı), PC-1→SW1 Fa0/24, PC-2→SW2 Fa0/24

**Adımlar:**
1. SW2: `spanning-tree mode rapid-pvst`, priority 28672 (root)
2. SW1/SW3: `spanning-tree mode rapid-pvst`, priority 32768
3. Tüm trunk portları konfigüre edin
4. PC'ler: IP 192.168.1.10/24 ve 192.168.1.11/24

**Test:** `show spanning-tree` (SW1 Fa0/1 bloke olmalı)

**Beklenen Sonuç:** Üçgen topolojide bir port STP tarafından bloke edilir, loop önlenir.

---

### Proje 12: Campus Network

**Hedef:** Core router ile iki access switch arasında VLAN'lar arası routing sağlamak.

**Cihazlar:** 1 Router (CORE-R1), 2 Switch (ACC-SW1, ACC-SW2), 2 PC

**Bağlantılar:** PC-1→ACC-SW1, ACC-SW1 Gi0/1→CORE-R1 Gi0/0, CORE-R1 Gi0/1→ACC-SW2 Gi0/1, ACC-SW2→PC-2

**Adımlar:**
1. CORE-R1 Gi0/0: `ip address 192.168.10.1 255.255.255.0`, Gi0/1: `ip address 192.168.20.1 255.255.255.0`
2. ACC-SW1: VLAN 10 oluşturun, Fa0/1 access VLAN 10, Gi0/1 access VLAN 10
3. ACC-SW2: VLAN 20 oluşturun, Fa0/1 access VLAN 20, Gi0/1 access VLAN 20
4. PC-1: IP 192.168.10.10/24, GW 192.168.10.1; PC-2: IP 192.168.20.10/24, GW 192.168.20.1

**Test:** PC-1 > `ping 192.168.20.10`

**Beklenen Sonuç:** Campus ağda core router VLAN'lar arası routing sağlar.

---

### Proje 13: Kablosuz Ağ (WiFi)

**Hedef:** Router AP modunda kablosuz ağ oluşturarak PC'lerin kablosuz bağlanmasını sağlamak.

**Cihazlar:** 1 Router (R1), 2 PC (PC-1, PC-2)

**Bağlantılar:** Kablosuz (WiFi) - R1 wlan0 AP mode, PC-1 ve PC-2 WiFi client

**Adımlar:**
1. R1 wlan0: AP modu, SSID `HomeWiFi`, open security, IP 192.168.1.1/24
2. R1 DHCP havuzu (`wifi-pool`): network 192.168.1.0/24, default-router 192.168.1.1
3. PC-1: WiFi SSID `HomeWiFi`, IP 192.168.1.10/24 (statik)
4. PC-2: WiFi SSID `HomeWiFi`, IP 192.168.1.11/24 (statik)

**Test:** PC-1 > `ping 192.168.1.11`, PC-1 > `wget 192.168.1.1`

**Beklenen Sonuç:** PC'ler kablosuz ağ üzerinden birbirine ve router'a erişebilir.

---

### Proje 14: IoT WiFi Laboratuvarı

**Hedef:** IoT cihazlarını açık kablosuz ağa bağlayarak sensör verilerini izlemek.

**Cihazlar:** 1 Router (R1), 1 PC (PC-1), 3 IoT (IoT-Temp, IoT-Humidity, IoT-Motion)

**Bağlantılar:** Tüm cihazlar kablosuz (WiFi) - R1 AP mode, SSID `IoT-Network`, open security

**Adımlar:**
1. R1: AP modu, SSID `IoT-Network`, DHCP havuzu 192.168.1.100-150
2. PC-1 ve IoT cihazları: WiFi client, DHCP ile IP alır
3. PC-1 gateway 192.168.1.1

**Test:** PC-1 > `ping 192.168.1.1`, PC-1 > `wget http://iot-panel` (IoT panelini görüntüle)

**Beklenen Sonuç:** IoT cihazları kablosuz ağa bağlanır, PC-1 IoT panelini görüntüleyebilir.

---

### Proje 15: Sera Krokisi (Akıllı Tarım)

**Hedef:** WPA2 güvenli WiFi ile IoT sensörleri ve aktüatörlerle sera ortamını otomatik izlemek.

**Cihazlar:** 1 Router (R1-SERA), 1 PC (PC-1), 4 IoT sensör, 3 IoT aktüatör

**Bağlantılar:** Tüm cihazlar kablosuz (WiFi) - R1 AP mode, SSID `GreenHouse-Network`, WPA2 şifre: `sera`

**Adımlar:**
1. R1: AP modu, SSID `GreenHouse-Network`, WPA2 şifre `sera`, DHCP 192.168.2.100-150
2. PC-1: IP 192.168.2.10/24, GW 192.168.2.1
3. IoT sensörler: 192.168.2.101-104 (sıcaklık, nem, ışık, hareket)
4. IoT aktüatörler: 192.168.2.111-113 (ısıtıcı, soğutucu, lamba)
5. Otomatik kurallar: sıcaklık >28°C soğutucu ON, <18°C ısıtıcı ON

**Test:** PC-1 > `wget 192.168.2.1` (WiFi panel), `wget http://iot-panel` (IoT yönetim)

**Beklenen Sonuç:** Sensörler otomatik kurallarla aktüatörleri kontrol eder, sera ortamı izlenir.

---

### Proje 16: Router SSH (1 PC + 1 Router)

**Hedef:** Router üzerinde SSH yapılandırarak güvenli uzaktan yönetim sağlamak.

**Cihazlar:** 1 Router (R1), 1 PC (PC-1)

**Bağlantılar:** PC-1 Eth0 → R1 Gi0/0 (Straight)

**Adımlar:**
1. R1: `hostname R1`, `ip domain-name lab.local`
2. `crypto key generate rsa modulus 1024`, `ip ssh version 2`
3. `username admin privilege 15 secret 1234`, `enable secret 123`
4. `line vty 0 4`, `login local`, `transport input ssh`
5. `interface gi0/0`, `ip address 192.168.1.150 255.255.255.0`, `no shutdown`
6. PC-1: IP 192.168.1.10/24, GW 192.168.1.150

**Test:** PC-1 CMD > `ssh admin@192.168.1.150` (şifre: 1234), R1 > `show ssh`

**Beklenen Sonuç:** SSH ile router'a güvenli bağlantı sağlanır.

---

### Proje 17: Router DHCP (2 PC + 1 Switch + 1 Router)

**Hedef:** Router DHCP sunucusu üzerinden PC'lere otomatik IP ataması yapmak.

**Cihazlar:** 1 Router (R1), 1 Switch (SW1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW1 Fa0/2, SW1 Gi0/1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. R1 Gi0/0: `ip address 192.168.10.1 255.255.255.0`, `no shutdown`
2. R1: `ip dhcp pool LAN`, `network 192.168.10.0 255.255.255.0`, `default-router 192.168.10.1`, `dns-server 8.8.8.8`
3. SW1: switchport mode access tüm portlara
4. PC-1 ve PC-2: IP mode DHCP

**Test:** PC-1 CMD > `ipconfig /renew`, R1 > `show ip dhcp binding`

**Beklenen Sonuç:** PC'ler DHCP'den 192.168.10.100+ aralığında IP alır.

---

### Proje 18: Firewall Temel (ICMP Bloke)

**Hedef:** Firewall cihazında ICMP (ping) trafiğini engelleyip diğer tüm trafiğe izin vermek.

**Cihazlar:** 1 Firewall (FW-1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → FW-1 Gi0/0, FW-1 Gi0/1 → PC-2 Eth0

**Adımlar:**
1. FW-1 Kural 1 (ICMP Deny): source `*`, target `*`, protocol ICMP, action DENY
2. FW-1 Kural 2 (ANY Allow): source `*`, target `*`, protocol ANY, action ALLOW
3. PC-1: IP 192.168.1.10/24, GW 192.168.1.1; PC-2: IP 192.168.1.20/24, GW 192.168.1.1

**Test:** PC-1 > `ping 192.168.1.20` (BAŞARISIZ), PC-1 > `wget 192.168.1.20` (BAŞARILI)

**Beklenen Sonuç:** Ping engellenir, HTTP/HTTPS gibi diğer protokoller çalışır.

---

### Proje 19: MAC Tablo Öğrenme

**Hedef:** Switch MAC adres tablosunun dinamik öğrenme özelliğini incelemek.

**Cihazlar:** 1 Switch (SW1), 1 Router (ROUTER-2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 Eth0 → Switch Fa0/1, PC-2 Eth0 → Switch Fa0/2, Router Gi0/0 → Switch Fa0/3

**Adımlar:**
1. PC-1: IP 192.168.1.10/24, MAC 00-e0-f7-01-a1-b1
2. PC-2: IP 192.168.1.20/24, MAC 97-31-e5-97-a7-03
3. Router: IP 192.168.1.254/24
4. Switch: tüm portları access mode, VLAN 1

**Test:** Switch > `show mac address-table`, PC-1 > `ping 192.168.1.20`, ardından Switch > `show mac address-table`

**Beklenen Sonuç:** Switch önce MAC tablosunu öğrenir, ping sonrası MAC adreslerini tabloda görürsünüz.

---

### Proje 20: DNS ve HTTP Test

**Hedef:** DNS name resolution ve HTTP web erişimini test etmek.

**Cihazlar:** 1 Switch (SWITCH-1), 1 Server (PC-DNS/HTTP-10.0.0.10), 1 Client (PC-CLIENT)

**Bağlantılar:** Server → Switch Fa0/1, Client → Switch Fa0/10, Router → Switch Fa0/11

**Adımlar:**
1. Sunucuya DNS ve HTTP servisleri yapılandırın (192.168.1.10)
2. a10.com domain'ini sunucu IP'sine çözümleyecek DNS kaydı ekleyin
3. Client PC: IP 192.168.1.100/24, DNS 192.168.1.10

**Test:** Client > `wget 192.168.1.10`, Client > `wget a10.com`, Client > `nslookup a10.com`

**Beklenen Sonuç:** HTTP web sayfasına erişilir, DNS isim çözümlemesi başarılı olur.

---

### Proje 21: ARP ve MAC Tablo Çalışması

**Hedef:** ARP ve MAC adres tablosu arasındaki ilişkiyi incelemek.

**Cihazlar:** 1 Switch (SWITCH-1), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1 → Switch Fa0/1, PC-2 → Switch Fa0/2

**Adımlar:**
1. PC-1: IP 192.168.1.10/24; PC-2: IP 192.168.1.20/24
2. Switch: tüm portlar access mode VLAN 1

**Test:** PC-1 > `arp -a` (ping öncesi), PC-1 > `ping 192.168.1.20`, PC-1 > `arp -a` (ping sonrası), Switch > `show mac address-table`

**Beklenen Sonuç:** Ping öncesi ARP boştur; ping sonrası ARP tablosunda hedef IP-MAC eşleşmesi görülür. Switch MAC tablosunda her iki port için MAC kaydı oluşur.

---

### Proje 22: IP Yapılandırma Laboratuvarı

**Hedef:** IP yapılandırmasının ağ bağlantısı üzerindeki etkisini incelemek.

**Cihazlar:** 1 Switch (SWITCH), 2 PC (PC1, PC2), 1 PC (PC3)

**Bağlantılar:** PC1→Switch Fa0/1, PC2→Switch Fa0/2, PC3→Switch Fa0/3

**Adımlar:**
1. PC1: IP 192.168.1.10/24
2. PC2: IP 192.168.1.20/24
3. PC3: IP 192.168.2.30/24 (farklı subnet)
4. Switch: tüm portlar access VLAN 1

**Test:** PC1 > `ping 192.168.1.20` (BAŞARILI), PC1 > `ping 192.168.2.30` (BAŞARISIZ)

**Beklenen Sonuç:** Aynı subnet'teki PC'ler haberleşir, farklı subnet'teki PC'ye erişilemez (router olmadan).

---

### Proje 23: DHCP Dağıtım Senaryosu

**Hedef:** DHCP otomatik IP dağıtımı ile manuel yapılandırmayı karşılaştırmak.

**Cihazlar:** 1 Router (DHCP server), 1 Switch, 3 PC (PC1, PC2, PC3)

**Bağlantılar:** PC1→Switch Fa0/1, PC2→Switch Fa0/2, PC3→Switch Fa0/3, Switch Gi0/1→Router Gi0/0

**Adımlar:**
1. Router: DHCP havuzu yapılandırın (192.168.10.100-200 aralığı)
2. PC1 ve PC2: IP mode DHCP
3. PC3: IP 192.168.10.50/24 (manuel statik)
4. Switch: tüm portlar access mode

**Test:** PC1 > `ipconfig /renew`, PC2 > `ipconfig /renew`, Router > `show ip dhcp binding`

**Beklenen Sonuç:** PC1 ve PC2 otomatik IP alır, PC3 statik IP ile çalışır. DHCP binding tablosunda atanan IP'ler görülür.

---

### Proje 24: 2 Switch Trunk Uygulaması

**Hedef:** İki switch arasında trunk bağlantısı ile VLAN trafiğini taşımak.

**Cihazlar:** 2 Switch (SW-1, SW-2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW-1 Fa0/1, PC-2→SW-2 Fa0/1, SW-1 Gi0/1→SW-2 Gi0/1 (Crossover)

**Adımlar:**
1. Her iki switch'te de VLAN 100 ve VLAN 200 oluşturun
2. SW-1 Fa0/1: `switchport mode access`, `switchport access vlan 100`
3. SW-2 Fa0/1: `switchport mode access`, `switchport access vlan 200`
4. Her iki switch'te Gi0/1: `switchport mode trunk`
5. PC-1: IP 192.168.100.10/24, VLAN 100; PC-2: IP 192.168.200.10/24, VLAN 200

**Test:** `show vlan brief`, `show interfaces trunk`

**Beklenen Sonuç:** Trunk bağlantısı üzerinden VLAN 100 ve 200 trafiği geçer, PC'ler farklı VLAN'da olduğu için ping başarısız olur.

---

### Proje 25: Native VLAN Yapılandırması

**Hedef:** İki switch arasında native VLAN 99 trunk bağlantısı yapılandırmak.

**Cihazlar:** 2 Switch (SW1, SW2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→SW1 Fa0/1, PC-2→SW2 Fa0/1, SW1 Fa0/24→SW2 Fa0/24 (Crossover)

**Adımlar:**
1. Her iki switch'te VLAN 99 (`NativeVLAN`) oluşturun
2. SW1/SW2 Fa0/1: `switchport mode access`, `switchport access vlan 99`
3. SW1/SW2 Fa0/24: `switchport mode trunk`, `switchport trunk native vlan 99`
4. PC-1: IP 192.168.99.10/24; PC-2: IP 192.168.99.11/24

**Test:** `show interfaces trunk`, PC-1 > `ping 192.168.99.11`

**Beklenen Sonuç:** Native VLAN 99 üzerinden etiketsiz trafik geçer, PC'ler birbirine ping atabilir.

---

### Proje 26: STP 3 Switch PVST

**Hedef:** PVST ile her VLAN için farklı root bridge belirleyerek yük dengelemesi sağlamak.

**Cihazlar:** 3 L3 Switch (SW1, SW2, SW3), 9 PC

**Bağlantılar:** SW'ler arası trunk (triangular), her switch'e 3 PC (VLAN 1,10,20)

**Adımlar:**
1. Her switch'te VLAN 1, 10, 20 oluşturun
2. Trunk portları (`gi1/0/1-2`) yapılandırın
3. SW1: `spanning-tree vlan 1 priority 24576` (VLAN1 root)
4. SW2: `spanning-tree vlan 10 priority 24576` (VLAN10 root)
5. SW3: `spanning-tree vlan 20 priority 24576` (VLAN20 root)
6. SVI'ları ve PC portlarını atayın

**Test:** `show spanning-tree vlan 1`, `show spanning-tree vlan 10`, `show spanning-tree vlan 20`, tüm PC'ler arası ping

**Beklenen Sonuç:** Her VLAN farklı root kullanır, PVST ile yük dengelemesi sağlanır.

---

### Proje 27: 2 L3 Switch VLAN (AG1/AG2)

**Hedef:** İki L3 switch arasında trunk bağlantısı ile VLAN 10 ve 20 arası routing sağlamak.

**Cihazlar:** 2 L3 Switch (Switch2, Switch4), 8 PC

**Bağlantılar:** Switch2 Gi1/0/5 → Switch4 Gi1/0/5 (Crossover trunk), her switch'e 4 PC

**Adımlar:**
1. Switch2: `ip routing`, VLAN 10 (`AG1`) ve 20 (`AG2`) oluşturun
2. SVI'lar: `interface vlan 10`, `ip address 192.168.10.1`; `interface vlan 20`, `ip address 192.168.20.1`
3. Trunk port: `interface gi1/0/5`, `switchport trunk encapsulation dot1q`, `switchport mode trunk`
4. Switch4'te aynı konfigürasyonu yapın
5. PC'ler: VLAN 10 → IP 192.168.10.x, VLAN 20 → IP 192.168.20.x

**Test:** Tüm PC'ler arası ping

**Beklenen Sonuç:** İki L3 switch arasında trunk, tüm PC'ler birbirine ping atabilir.

---

### Proje 28: L3 Switch Statik Yönlendirme

**Hedef:** Multilayer switch'ler ve router arasında statik rotalarla ağlar arası iletişim sağlamak.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC

**Bağlantılar:** PC0→SW0→ML1 Gi1/0/2, ML1 Gi1/0/1→R3 Gi0/0, R3 Gi0/1→ML2 Gi1/0/1, ML2 Gi1/0/2→SW1→PC4

**Adımlar:**
1. ML1: `ip routing`, Gi1/0/1 `no switchport`, IP 10.0.0.1/8; Gi1/0/2 IP 192.168.1.1/24; `ip route 192.168.2.0 255.255.255.0 10.0.0.2`
2. R3: Gi0/0 IP 10.0.0.2/8; Gi0/1 IP 20.0.0.1/8; `ip route 192.168.1.0 255.255.255.0 10.0.0.1`; `ip route 192.168.2.0 255.255.255.0 20.0.0.2`
3. ML2: `ip routing`, Gi1/0/1 IP 20.0.0.2/8; Gi1/0/2 IP 192.168.2.1/24; `ip route 192.168.1.0 255.255.255.0 20.0.0.1`
4. PC0: IP 192.168.1.10/24, GW 192.168.1.1; PC4: IP 192.168.2.10/24, GW 192.168.2.1

**Test:** PC0 > `ping 192.168.2.10`, `show ip route`

**Beklenen Sonuç:** L3 switch'ler ve router statik rotalarla iki farklı ağ arasında iletişim sağlar.

---

### Proje 29: RIP Dinamik Yönlendirme

**Hedef:** RIP dinamik yönlendirme protokolü ile otomatik route öğrenimi sağlamak.

**Cihazlar:** 2 L3 Switch (ML0, ML1), 2 L2 Switch, 4 PC

**Bağlantılar:** PC0/PC1→SW0-L2→ML0 Gi1/0/23, ML0 Gi1/0/24→ML1 Gi1/0/24 (Crossover), ML1 Gi1/0/23→SW3-L2→PC2/PC3

**Adımlar:**
1. ML0: `ip routing`, Gi1/0/23 IP 192.168.1.1/24, Gi1/0/24 IP 192.168.2.1/24; `router rip`, `network 192.168.1.0`, `network 192.168.2.0`
2. ML1: `ip routing`, Gi1/0/24 IP 192.168.2.2/24, Gi1/0/23 IP 192.168.3.1/24; `router rip`, `network 192.168.2.0`, `network 192.168.3.0`
3. PC0/PC1: IP 192.168.1.x/24, GW 192.168.1.1; PC2/PC3: IP 192.168.3.x/24, GW 192.168.3.1

**Test:** PC0 > `ping 192.168.3.10`, `show ip route` (RIP rotalarını gör)

**Beklenen Sonuç:** RIP ile ağlar otomatik öğrenilir, PC'ler birbirine ping atabilir.

---

### Proje 30: ACL Standard

**Hedef:** Standard ACL ile 192.168.1.0/24 ağından gelen trafiği engellemek.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC (Proje 28 topolojisi)

**Bağlantılar:** Proje 28 topolojisinin aynısı

**Adımlar:**
1. Proje 28'deki statik yönlendirme konfigürasyonunu uygulayın
2. R3 üzerinde: `access-list 10 deny 192.168.1.0 0.0.0.255`, `access-list 10 permit any`
3. ACL'i uygulayın: `interface gi0/1`, `ip access-group 10 out`
4. PC0: IP 192.168.1.10/24; PC4: IP 192.168.2.10/24

**Test:** PC0 > `ping 192.168.2.10` (BAŞARISIZ), `show access-lists`

**Beklenen Sonuç:** 192.168.1.0/24 ağından gelen trafik engellenir, diğer ağlara izin verilir.

---

### Proje 31: ACL Extended

**Hedef:** Extended ACL ile sadece HTTP (port 80) trafiğine izin verip diğer tüm trafiği engellemek.

**Cihazlar:** 1 Firewall, 2 PC (PC-1, PC-2) (Proje 18 topolojisi)

**Bağlantılar:** PC-1→FW-1→PC-2 (Proje 18 ile aynı)

**Adımlar:**
1. FW-1 üzerinde named extended ACL oluşturun: `ip access-list extended WEB-FILTER`
2. `permit tcp any any eq 80`, `deny ip any any`
3. ACL'i arayüze uygulayın
4. PC-1: IP 192.168.1.10/24; PC-2: IP 192.168.1.20/24

**Test:** PC-1 > `wget 192.168.1.20` (BAŞARILI), PC-1 > `ping 192.168.1.20` (BAŞARISIZ)

**Beklenen Sonuç:** Sadece HTTP (80) trafiğine izin verilir, ping ve diğer protokoller engellenir.

---

### Proje 32: NAT Static

**Hedef:** Static NAT ile iç ağdaki bir cihazı birebir dış IP'ye eşlemek.

**Cihazlar:** 1 Router (R1), 1 Switch, 2 PC (Proje 17 topolojisi)

**Bağlantılar:** PC-1→SW1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. Proje 17'deki DHCP konfigürasyonunu uygulayın
2. R1'de: `ip nat inside source static 192.168.1.10 203.0.113.10`
3. `interface gi0/0`, `ip nat inside`; `interface gi0/1`, `ip nat outside`
4. PC-1: IP 192.168.1.10/24

**Test:** `show ip nat translations`

**Beklenen Sonuç:** 192.168.1.10 → 203.0.113.10 static NAT çevirisi aktiftir.

---

### Proje 33: NAT Dynamic

**Hedef:** NAT havuzu kullanarak dinamik adres çevirisi yapmak.

**Cihazlar:** 1 Router (R1), 1 Switch, 2 PC (Proje 17 topolojisi)

**Bağlantılar:** PC-1→SW1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. Proje 17'deki DHCP konfigürasyonunu uygulayın
2. R1'de: `ip nat pool OUT 203.0.113.20 203.0.113.30 netmask 255.255.255.0`
3. `access-list 1 permit 192.168.1.0 0.0.0.255`
4. `ip nat inside source list 1 pool OUT`
5. `interface gi0/0`, `ip nat inside`; `interface gi0/1`, `ip nat outside`

**Test:** PC-1'den dışarıya trafik gönderin, `show ip nat translations`

**Beklenen Sonuç:** İç ağdaki cihazlar NAT havuzundaki adreslere dinamik olarak çevrilir.

---

### Proje 34: NAT PAT

**Hedef:** PAT (NAT Overload) ile birden çok iç cihazı tek bir dış IP'ye yönlendirmek.

**Cihazlar:** 1 Router (R1), 1 Switch, 2 PC (Proje 17 topolojisi)

**Bağlantılar:** PC-1→SW1→R1 Gi0/0 (Crossover)

**Adımlar:**
1. Proje 17'deki DHCP konfigürasyonunu uygulayın
2. R1'de: `access-list 1 permit 192.168.1.0 0.0.0.255`
3. `ip nat inside source list 1 interface gi0/0 overload`
4. `interface gi0/0`, `ip nat inside`; `interface gi0/1`, `ip nat outside`

**Test:** PC'lerden trafik gönderin, `show ip nat translations`

**Beklenen Sonuç:** Tüm iç cihazlar tek bir dış IP'ye (gi0/0) port numaraları ile çevrilir.

---

### Proje 35: HSRP Redundancy

**Hedef:** HSRP ile varsayılan ağ geçidi yedekliliği sağlamak.

**Cihazlar:** 2 L3 Switch (Switch2, Switch4), 8 PC (Proje 27 topolojisi)

**Bağlantılar:** Proje 27 topolojisi

**Adımlar:**
1. Proje 27'deki L3 switch konfigürasyonunu uygulayın
2. Switch2 VLAN 10: `standby 1 ip 192.168.10.254`, `standby 1 priority 110`, `standby 1 preempt`
3. Switch4 VLAN 10: `standby 1 ip 192.168.10.254`
4. Switch2 VLAN 20: `standby 2 ip 192.168.20.254`, `standby 2 priority 110`, `standby 2 preempt`
5. Switch4 VLAN 20: `standby 2 ip 192.168.20.254`
6. PC'ler: GW 192.168.10.254 veya 192.168.20.254

**Test:** `show standby`, Switch2'yi kapatıp Switch4'ün devralmasını gözlemleyin

**Beklenen Sonuç:** Switch2 aktif HSRP router'dır; arızalanırsa Switch4 otomatik devralır.

---

### Proje 36: OSPF Multi-Area 1

**Hedef:** Area 0 ve Area 10 ile çok alanlı OSPF yapılandırmak.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC (Proje 28 topolojisi)

**Bağlantılar:** Proje 28 topolojisi

**Adımlar:**
1. ML1: `router ospf 1`, `network 10.0.0.0 0.0.0.255 area 0`, `network 192.168.1.0 0.0.0.255 area 10`
2. R3: `router ospf 1`, `network 10.0.0.0 0.0.0.255 area 0`, `network 20.0.0.0 0.0.0.255 area 0`
3. ML2: `router ospf 1`, `network 20.0.0.0 0.0.0.255 area 0`, `network 192.168.2.0 0.0.0.255 area 20`
4. Statik rotaları kaldırın (OSPF dinamik öğrenecek)

**Test:** `show ip route`, `show ip ospf neighbor`, PC0 > `ping 192.168.2.10`

**Beklenen Sonuç:** OSPF ile rotalar dinamik öğrenilir, farklı alanlardaki PC'ler haberleşir.

---

### Proje 37: OSPF Multi-Area 2

**Hedef:** ABR üzerinden farklı OSPF alanlarını omurgaya bağlamak ve stub alan yapılandırmak.

**Cihazlar:** 2 L3 Switch (ML1, ML2), 1 Router (R3), 2 L2 Switch, 2 PC (Proje 28 topolojisi)

**Bağlantılar:** Proje 28 topolojisi

**Adımlar:**
1. Proje 36'daki OSPF konfigürasyonunu uygulayın
2. ML2'de: `router ospf 1`, `area 20 stub`
3. R3'te (ABR): `area 10 range 10.10.0.0 255.255.0.0` (route summarization)
4. ML1'de: `area 10 stub` (eğer ML1 Area 10'a atanmışsa)

**Test:** `show ip route`, `show ip ospf`, PC0 > `ping 192.168.2.10`

**Beklenen Sonuç:** Stub alan dış rotaları sınırlar, ABR route summarization yapar.

---

### Proje 38: EIGRP Basic

**Hedef:** Temel EIGRP komutları ile dinamik yönlendirme kurulumu yapmak.

**Cihazlar:** 2 L3 Switch (ML0, ML1), 2 L2 Switch, 4 PC (Proje 29 topolojisi)

**Bağlantılar:** Proje 29 topolojisi

**Adımlar:**
1. ML0: `router eigrp 100`, `network 192.168.1.0 0.0.0.255`, `network 192.168.2.0 0.0.0.255`, `no auto-summary`
2. ML1: `router eigrp 100`, `network 192.168.2.0 0.0.0.255`, `network 192.168.3.0 0.0.0.255`, `no auto-summary`
3. L3 switch'lerde routed portları konfigüre edin

**Test:** `show ip route`, `show ip eigrp neighbors`, PC0 > `ping 192.168.3.10`

**Beklenen Sonuç:** EIGRP ile komşuluk kurulur, rotalar otomatik öğrenilir.

---

### Proje 39: IPv6 Gelişmiş Lab (DHCPv6 & OSPFv3)

**Hedef:** IPv6 adresleme, DHCPv6 ve OSPFv3 ile çift yığın (dual-stack) ağ kurmak.

**Cihazlar:** 2 Router (R1, R2), 2 PC (PC-1, PC-2)

**Bağlantılar:** PC-1→R1 Gi0/0, R1 Gi0/1→R2 Gi0/1 (Crossover), R2 Gi0/0→PC-2

**Adımlar:**
1. Her iki router'da: `ipv6 unicast-routing`
2. R1 Gi0/0: `ipv6 address 2001:DB8:1::1/64`; Gi0/1: `ipv6 address 2001:DB8:AC::1/64`
3. R2 Gi0/0: `ipv6 address 2001:DB8:2::1/64`; Gi0/1: `ipv6 address 2001:DB8:AC::2/64`
4. DHCPv6 havuzları oluşturun (R1: pool LAN, prefix 2001:db8:1::/64)
5. OSPFv3: `ipv6 router ospf 1`, `router-id` atayın, `interface` üzerinden etkinleştirin
6. PC-1: IPv6 2001:DB8:1::10/64; PC-2: IPv6 2001:DB8:2::20/64

**Test:** PC-1 > `ping 2001:DB8:2::20`, `show ipv6 route`

**Beklenen Sonuç:** IPv6 adresleme, DHCPv6 ve OSPFv3 ile çift yığın ağ çalışır durumdadır.

---

### Proje 40: Tüm Servisler Laboratuvarı

**Hedef:** DNS, HTTP, DHCP, FTP, MAIL ve NTP servislerinin bir arada bulunduğu kapsamlı laboratuvar kurmak.

**Cihazlar:** 1 Switch (SW1), 6 PC (PC-DNS, PC-HTTP, PC-DHCP, PC-FTP, PC-MAIL, PC-NTP)

**Bağlantılar:** Tüm PC'ler SW1'e bağlı (Fa0/1-6)

**Adımlar:**
1. PC-DNS (192.168.1.10): DNS servisi, kayıtlar: www.lab.local→1.20, ftp.lab.local→1.40, mail.lab.local→1.50
2. PC-HTTP (192.168.1.20): HTTP web sunucusu
3. PC-DHCP (192.168.1.30): DHCP havuzu, IP 192.168.1.100-150
4. PC-FTP (192.168.1.40): FTP sunucusu (welcome.txt, data.csv)
5. PC-MAIL (192.168.1.50): Mail sunucusu (admin@lab.local)
6. PC-NTP (192.168.1.60): NTP zaman sunucusu
7. Tüm PC'ler DNS: 192.168.1.10

**Test:** PC'den `nslookup www.lab.local`, `wget www.lab.local`, `ftp 192.168.1.40`, Switch > `ntp server 192.168.1.60`, `show clock`

**Beklenen Sonuç:** Tüm ağ servisleri (DNS, HTTP, FTP, MAIL, NTP, DHCP) çalışır durumdadır.

---

**Son Güncelleme:** Haziran 2026  
**Versiyon:** 1.9.3

