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

**Son Güncelleme:** Haziran 2026  
**Versiyon:** 1.7.0

