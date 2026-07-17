# Wireless WiFi Konfigürasyonu Rehberi

## Genel Bakış

Network Simulator'da wireless cihazlar (Access Point, Router) için WiFi ayarları gerçek komutları ile yapılabilir. Bu rehber, SSID yapılandırması, güvenlik ayarları, kanal seçimi, güç ayarları ve MAC filtreleme işlemlerini açıklar.

## 🚀 Hızlı Başlangıç

### Basit SSID Oluşturma

```bash
Router# configure terminal
Router(config)# dot11 ssid MyWiFi
Router(config-ssid)# authentication open
Router(config-ssid)# guest-mode
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# ssid MyWiFi
Router(config-if)# channel 6
Router(config-if)# station-role root
Router(config-if)# exit
Router(config)# end
```

### WPA2 ile Güvenli WiFi

```bash
Router# configure terminal
Router(config)# dot11 ssid SecureWiFi
Router(config-ssid)# authentication open
Router(config-ssid)# authentication key-management wpa version 2
Router(config-ssid)# wpa-psk ascii MyPassword123!
Router(config-ssid)# guest-mode
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# encryption mode ciphers aes-ccm
Router(config-if)# ssid SecureWiFi
Router(config-if)# channel 6
Router(config-if)# power full
Router(config-if)# station-role root
Router(config-if)# exit
Router(config)# end
```

---

## Desteklenen Wireless Komutları

### 1. SSID Yapılandırması

SSID (Service Set Identifier) tanımlamak için `dot11 ssid` komutunu kullanın:

```
Router# configure terminal
Router(config)# dot11 ssid OKUL_WIFI
Router(config-ssid)# 
```

**Parametreler:**
- SSID adı: 1-32 karakter arasında olmalıdır
- Türkçe karakterler desteklenmektedir

### 2. Kimlik Doğrulama (Authentication)

SSID için kimlik doğrulama modunu ayarlayın:

```
Router(config-ssid)# authentication open
```

**Geçerli Değerler:**
- `open` - Açık kimlik doğrulama (şifre yok)
- `shared` - Paylaşılan anahtar kimlik doğrulaması
- `network-eap` - Network EAP kimlik doğrulaması

### 3. WPA/WPA2/WPA3 Güvenlik

Güvenlik standardını belirleyin:

```
Router(config-ssid)# authentication key-management wpa version 2
```

**Geçerli Versiyonlar:**
- `2` - WPA2 (802.11i)
- `3` - WPA3 (en yeni standart)

### 4. WiFi Şifresi (Pre-Shared Key)

SSID için şifre belirleyin:

```
Router(config-ssid)# wpa-psk ascii Sifre123!
```

**Parametreler:**
- `ascii` - ASCII formatında şifre
- `hex` - Hexadecimal formatında şifre
- Şifre uzunluğu: 8-63 karakter

### 5. Konuk Modu (Guest Mode)

SSID'nin dışarıya yayınlanmasını (görünmesini) sağlayın:

```
Router(config-ssid)# guest-mode
```

Bu komut SSID'yi broadcast yapar ve cihazlar tarafından görülebilir hale getirir.

### 6. SSID Konfigürasyonundan Çıkış

```
Router(config-ssid)# exit
Router(config)#
```

## Radyo Arayüzü Konfigürasyonu

### 1. Dot11Radio Arayüzüne Giriş

2.4 GHz veya 5 GHz radyo arayüzüne girin:

```
Router(config)# interface dot11radio 0
Router(config-if)#
```

**Radyo ID'leri:**
- `0` - 2.4 GHz frekans bandı
- `1` - 5 GHz frekans bandı

### 2. Şifreleme Algoritması

Şifreleme algoritmasını seçin:

```
Router(config-if)# encryption mode ciphers aes-ccm
```

**Geçerli Algoritmalar:**
- `aes-ccm` - AES-CCM (önerilen)
- `tkip` - TKIP (eski)
- `aes-tkip` - AES ve TKIP desteği

### 3. SSID Bağlama

Önceden tanımlanan SSID'yi radyoya bağlayın:

```
Router(config-if)# ssid OKUL_WIFI
```

### 4. Kanal Seçimi

Yayın kanalını seçin (çakışmayı önlemek için):

```
Router(config-if)# channel 6
```

**2.4 GHz Kanalları:** 1-14 (bölgeye göre değişir)
**5 GHz Kanalları:** 36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165

### 5. Transmit Güç Ayarı

Radyo transmit gücünü ayarlayın:

```
Router(config-if)# power full
```

**Geçerli Değerler:**
- `full` - Tam güç
- `half` - Yarı güç
- `quarter` - Çeyrek güç
- `eighth` - Sekizde bir güç
- `1-30` - dBm cinsinden güç değeri

### 6. İstasyon Rolü

Cihazın rolünü belirleyin:

```
Router(config-if)# station-role root
```

**Geçerli Roller:**
- `root` - Ana verici (Access Point)
- `repeater` - Tekrarlayıcı
- `client` - İstemci

### 7. MAC Filtreleme

MAC adreslerine göre erişim kontrolü:

```
Router(config-if)# mac-filter allow AA:BB:CC:DD:EE:FF
Router(config-if)# mac-filter deny 11:22:33:44:55:66
```

**Parametreler:**
- `allow` - İzin verilen MAC adresleri
- `deny` - Reddedilen MAC adresleri
- MAC adresi formatı: `AA:BB:CC:DD:EE:FF`

### 8. Radyo Konfigürasyonundan Çıkış

```
Router(config-if)# exit
Router(config)#
```

## Tam Örnek: OKUL_WIFI Konfigürasyonu

```
Router# configure terminal
Router(config)# dot11 ssid OKUL_WIFI
Router(config-ssid)# authentication open
Router(config-ssid)# authentication key-management wpa version 2
Router(config-ssid)# wpa-psk ascii Sifre123!
Router(config-ssid)# guest-mode
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# encryption mode ciphers aes-ccm
Router(config-if)# ssid OKUL_WIFI
Router(config-if)# channel 6
Router(config-if)# station-role root
Router(config-if)# power full
Router(config-if)# mac-filter allow AA:BB:CC:DD:EE:FF
Router(config-if)# exit
Router(config)# end
Router#
```

## WLC (Wireless LAN Controller) Access Point Konfigürasyonu

Yeni eklenen WLC Access Point yönetimi komutları ile AP'leri doğrudan Controller üzerinden yapılandırabilirsiniz.

### 1. AP Konfigürasyon Moduna Giriş
```
WLC(config)# ap AP1
WLC(ap-config)# 
```

### 2. MAC Adresi ile AP Yetkilendirme
```
WLC(ap-config)# auth-mac 0011.2233.4455
```

### 3. Radyo Kanalı Ayarı
```
WLC(ap-config)# rf-channel 6
```

### 4. 5GHz İleri Düzey Ayarlar
```
WLC(ap-config)# dot11 5ghz power-constraint 15
WLC(ap-config)# dot11 5ghz channelswitch mode 1
```

Bu ayarlar yapıldığında `show ap summary` veya `show wireless` ile WLC üzerindeki erişim noktalarını görebilirsiniz.


## Wireless Konfigürasyonunu Görüntüleme

Tüm wireless ayarlarını görmek için:

```
Router# show wireless
```

Çıktı örneği:
```
=== Wireless Configuration ===

SSID Configurations:

  SSID: OKUL_WIFI
    Authentication: open
    Key Management: wpa
    WPA Version: 2
    Pre-Shared Key: Sifre123!
    Guest Mode: Enabled


Radio Configurations:

  Radio 0 (2.4GHz):
    SSID: OKUL_WIFI
    Channel: 6
    Power: full
    Encryption: aes-ccm
    Station Role: root
    Status: Enabled
    MAC Filter: Enabled
      Allow List: AA:BB:CC:DD:EE:FF
```

## Güvenlik En İyi Uygulamaları

### 1. Güçlü Şifre Kullanın
- En az 12 karakter uzunluğunda
- Büyük harf, küçük harf, sayı ve özel karakterler içerin
- Örnek: `Okul2026!Wifi#Secure`

### 2. WPA2 veya WPA3 Kullanın
- WPA2 minimum güvenlik standardı
- WPA3 en yeni ve en güvenli standart
- WEP ve açık kimlik doğrulama kullanmayın

### 3. Kanal Seçimi
- 2.4 GHz: Kanallar 1, 6, 11 (çakışmayan)
- 5 GHz: Daha geniş kanal seçeneği
- Çevredeki ağları taramak için `show wireless` kullanın

### 4. MAC Filtreleme
- Bilinen cihazların MAC adreslerini beyaz listeye ekleyin
- Rogue cihazları kara listeye ekleyin
- MAC adresleri kolayca spooflanabilir, tek başına yeterli değildir

### 5. Transmit Gücü
- Gerekli alanı kapsayacak kadar güç kullanın
- Gereksiz yere yüksek güç kullanmayın
- Enerji tasarrufu ve güvenlik için optimize edin

## Sorun Giderme

### SSID Görünmüyor
- `guest-mode` komutunun çalıştırıldığını kontrol edin
- Radyo arayüzünün açık olduğunu kontrol edin (`no shutdown`)
- Kanal ayarlarını kontrol edin

### Bağlantı Başarısız
- Şifrenin doğru olduğunu kontrol edin
- Güvenlik standardının (WPA2/WPA3) doğru olduğunu kontrol edin
- MAC filtreleme ayarlarını kontrol edin

### Düşük Sinyal Gücü
- Transmit gücünü artırın
- Kanal seçimini optimize edin
- Cihazın konumunu değiştirin

## Komut Özeti

| Komut | Açıklama | Mod |
|-------|----------|-----|
| `dot11 ssid <name>` | SSID tanımla | config |
| `authentication <type>` | Kimlik doğrulama modu | ssid-config |
| `authentication key-management wpa version <2\|3>` | WPA versiyonu | ssid-config |
| `wpa-psk ascii <password>` | WiFi şifresi | ssid-config |
| `guest-mode` | SSID broadcast | ssid-config |
| `interface dot11radio <0\|1>` | Radyo arayüzü | config |
| `encryption mode ciphers <cipher>` | Şifreleme algoritması | dot11-config |
| `ssid <name>` | SSID bağla | dot11-config |
| `channel <number>` | Kanal seçimi | dot11-config |
| `power <level>` | Transmit gücü | dot11-config |
| `station-role <role>` | İstasyon rolü | dot11-config |
| `mac-filter <allow\|deny> <mac>` | MAC filtreleme | dot11-config |
| `ap <name>` | WLC üzerinde AP yapılandırma | config |
| `auth-mac <mac>` | AP yetkilendirme MAC adresi | ap-config |
| `rf-channel <number>` | AP Radyo kanalı | ap-config |
| `dot11 5ghz power-constraint <value>` | AP 5GHz güç sınırı | ap-config |
| `show wireless` | Wireless ayarlarını göster | privileged |

## Ek Kaynaklar

- Wireless LAN Controller Configuration Guide
- IEEE 802.11 Wireless Standards
- WPA2/WPA3 Security Standards
- Network Simulator Documentation

---
 
**Son Güncelleme:** 2026-07-12
**Versiyon**: 1.9.8
