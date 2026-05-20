# Wireless WiFi Konfigürasyonu - Test Senaryoları

## Test Ortamı

- **Cihaz Tipi:** Router (Wireless Access Point)
- **Desteklenen Modlar:** config, ssid-config, dot11-config
- **Dil:** Türkçe ve İngilizce

## Test Senaryoları

### Senaryo 1: Basit SSID Oluşturma

**Amaç:** Temel SSID yapılandırması

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid TestSSID
Router(config-ssid)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- SSID "TestSSID" başarıyla oluşturulur
- Varsayılan ayarlar uygulanır:
  - Authentication: open
  - Key Management: none
  - Guest Mode: Disabled

---

### Senaryo 2: WPA2 Güvenliği ile SSID

**Amaç:** WPA2 şifreli SSID oluşturma

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid SecureWiFi
Router(config-ssid)# authentication open
Router(config-ssid)# authentication key-management wpa version 2
Router(config-ssid)# wpa-psk ascii MyPassword123
Router(config-ssid)# guest-mode
Router(config-ssid)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- SSID "SecureWiFi" oluşturulur
- WPA2 güvenliği etkinleştirilir
- Şifre "MyPassword123" ayarlanır
- Guest mode etkinleştirilir

---

### Senaryo 3: WPA3 Güvenliği

**Amaç:** WPA3 (en yeni standart) ile SSID oluşturma

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid ModernWiFi
Router(config-ssid)# authentication open
Router(config-ssid)# authentication key-management wpa version 3
Router(config-ssid)# wpa-psk ascii SecurePassword2024!
Router(config-ssid)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- SSID "ModernWiFi" oluşturulur
- WPA3 güvenliği etkinleştirilir
- Şifre ayarlanır

---

### Senaryo 4: Radyo Arayüzü Konfigürasyonu (2.4GHz)

**Amaç:** 2.4GHz radyo arayüzünü yapılandırma

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid MyNetwork
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# ssid MyNetwork
Router(config-if)# channel 6
Router(config-if)# power full
Router(config-if)# station-role root
Router(config-if)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- 2.4GHz radyo (dot11radio 0) yapılandırılır
- SSID bağlanır
- Kanal 6 seçilir
- Transmit gücü tam ayarlanır
- İstasyon rolü root (AP) olarak ayarlanır

---

### Senaryo 5: Radyo Arayüzü Konfigürasyonu (5GHz)

**Amaç:** 5GHz radyo arayüzünü yapılandırma

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid HighSpeed5G
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 1
Router(config-if)# ssid HighSpeed5G
Router(config-if)# channel 36
Router(config-if)# power full
Router(config-if)# station-role root
Router(config-if)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- 5GHz radyo (dot11radio 1) yapılandırılır
- SSID bağlanır
- Kanal 36 seçilir (5GHz kanalı)
- Transmit gücü tam ayarlanır

---

### Senaryo 6: Şifreleme Algoritması Seçimi

**Amaç:** Farklı şifreleme algoritmalarını test etme

**Test 1: AES-CCM**
```
Router# configure terminal
Router(config)# dot11 ssid AESNetwork
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# encryption mode ciphers aes-ccm
Router(config-if)# ssid AESNetwork
Router(config-if)# exit
Router(config)# end
```

**Test 2: TKIP**
```
Router# configure terminal
Router(config)# dot11 ssid TKIPNetwork
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# encryption mode ciphers tkip
Router(config-if)# ssid TKIPNetwork
Router(config-if)# exit
Router(config)# end
```

**Beklenen Sonuç:**
- Her iki şifreleme algoritması başarıyla ayarlanır
- Konfigürasyon kaydedilir

---

### Senaryo 7: MAC Filtreleme

**Amaç:** MAC adres filtreleme (allow/deny)

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid FilteredNetwork
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# ssid FilteredNetwork
Router(config-if)# mac-filter allow AA:BB:CC:DD:EE:FF
Router(config-if)# mac-filter allow 11:22:33:44:55:66
Router(config-if)# mac-filter deny 99:88:77:66:55:44
Router(config-if)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- MAC filtreleme etkinleştirilir
- İzin verilen MAC adresleri: AA:BB:CC:DD:EE:FF, 11:22:33:44:55:66
- Reddedilen MAC adresleri: 99:88:77:66:55:44

---

### Senaryo 8: Transmit Gücü Ayarları

**Amaç:** Farklı transmit gücü seviyelerini test etme

**Adımlar:**
```
Router# configure terminal
Router(config)# dot11 ssid PowerTest
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# ssid PowerTest
Router(config-if)# power full
Router(config-if)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- Transmit gücü "full" olarak ayarlanır
- Diğer seçenekler: half, quarter, eighth, 1-30 dBm

---

### Senaryo 9: Kanal Seçimi Doğrulaması

**Amaç:** Geçerli ve geçersiz kanal numaralarını test etme

**Test 1: Geçerli 2.4GHz Kanalı**
```
Router# configure terminal
Router(config)# dot11 ssid ChannelTest
Router(config-ssid)# authentication open
Router(config-ssid)# exit
Router(config)# interface dot11radio 0
Router(config-if)# ssid ChannelTest
Router(config-if)# channel 6
Router(config-if)# exit
Router(config)# end
```

**Test 2: Geçersiz Kanal (2.4GHz)**
```
Router# configure terminal
Router(config)# interface dot11radio 0
Router(config-if)# channel 20
```

**Beklenen Sonuç:**
- Kanal 6 başarıyla ayarlanır
- Kanal 20 hata verir (2.4GHz için geçersiz)

---

### Senaryo 10: Hata Yönetimi - Geçersiz SSID Adı

**Amaç:** SSID adı validasyonunu test etme

**Test 1: Çok Kısa SSID**
```
Router# configure terminal
Router(config)# dot11 ssid
```

**Test 2: Çok Uzun SSID (33+ karakter)**
```
Router# configure terminal
Router(config)# dot11 ssid VeryLongSSIDNameThatExceedsTheMaximumAllowedLength
```

**Beklenen Sonuç:**
- Boş SSID adı hata verir
- 33+ karakterli SSID adı hata verir
- Hata mesajı: "SSID adı 1-32 karakter arasında olmalıdır"

---

### Senaryo 11: Hata Yönetimi - Geçersiz Şifre

**Amaç:** Şifre uzunluğu validasyonunu test etme

**Test 1: Çok Kısa Şifre (7 karakter)**
```
Router# configure terminal
Router(config)# dot11 ssid TestSSID
Router(config-ssid)# wpa-psk ascii Short12
```

**Test 2: Çok Uzun Şifre (64+ karakter)**
```
Router# configure terminal
Router(config-ssid)# wpa-psk ascii VeryLongPasswordThatExceedsTheMaximumAllowedLengthOfSixtyThreeCharacters
```

**Beklenen Sonuç:**
- 7 karakterli şifre hata verir
- 64+ karakterli şifre hata verir
- Hata mesajı: "Şifre 8-63 karakter arasında olmalıdır"

---

### Senaryo 12: Hata Yönetimi - Geçersiz MAC Adresi

**Amaç:** MAC adresi formatı validasyonunu test etme

**Test 1: Geçersiz Format**
```
Router# configure terminal
Router(config)# interface dot11radio 0
Router(config-if)# mac-filter allow AABBCCDDEEFF
```

**Test 2: Geçerli Format**
```
Router# configure terminal
Router(config)# interface dot11radio 0
Router(config-if)# mac-filter allow AA:BB:CC:DD:EE:FF
```

**Beklenen Sonuç:**
- Geçersiz format hata verir
- Geçerli format başarıyla ayarlanır

---

### Senaryo 13: Tam Wireless Konfigürasyonu

**Amaç:** Tüm wireless özelliklerini birlikte test etme

**Adımlar:**
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
Router(config-if)# power full
Router(config-if)# station-role root
Router(config-if)# mac-filter allow AA:BB:CC:DD:EE:FF
Router(config-if)# mac-filter deny 99:88:77:66:55:44
Router(config-if)# exit
Router(config)# end
Router# show wireless
```

**Beklenen Sonuç:**
- Tüm ayarlar başarıyla uygulanır
- `show wireless` komutu tüm konfigürasyonu gösterir

---

## Test Kontrol Listesi

### Komut Testleri
- [ ] `dot11 ssid` - SSID oluşturma
- [ ] `authentication` - Kimlik doğrulama modu
- [ ] `authentication key-management` - WPA versiyonu
- [ ] `wpa-psk` - Şifre ayarı
- [ ] `guest-mode` - SSID broadcast
- [ ] `interface dot11radio 0` - 2.4GHz radyo
- [ ] `interface dot11radio 1` - 5GHz radyo
- [ ] `encryption mode` - Şifreleme algoritması
- [ ] `ssid` - SSID bağlama
- [ ] `channel` - Kanal seçimi
- [ ] `power` - Transmit gücü
- [ ] `station-role` - İstasyon rolü
- [ ] `mac-filter allow` - MAC izin listesi
- [ ] `mac-filter deny` - MAC reddetme listesi
- [ ] `show wireless` - Konfigürasyonu görüntüleme

### Validasyon Testleri
- [ ] SSID adı uzunluğu (1-32 karakter)
- [ ] Şifre uzunluğu (8-63 karakter)
- [ ] Kanal numarası (2.4GHz: 1-14, 5GHz: 36-165)
- [ ] MAC adresi formatı (AA:BB:CC:DD:EE:FF)
- [ ] Kimlik doğrulama türleri
- [ ] WPA versiyonları
- [ ] Şifreleme algoritmaları
- [ ] Transmit gücü seviyeleri
- [ ] İstasyon rolleri

### Hata Yönetimi Testleri
- [ ] Geçersiz SSID adı
- [ ] Geçersiz şifre
- [ ] Geçersiz kanal
- [ ] Geçersiz MAC adresi
- [ ] Tanımlanmamış SSID referansı
- [ ] Geçersiz kimlik doğrulama türü
- [ ] Geçersiz WPA versiyonu

### Mod Testleri
- [ ] Config modundan ssid-config moduna geçiş
- [ ] ssid-config modundan config moduna dönüş
- [ ] Config modundan dot11-config moduna geçiş
- [ ] dot11-config modundan config moduna dönüş
- [ ] Prompt doğru gösterilir

### Dil Testleri
- [ ] Türkçe hata mesajları
- [ ] İngilizce hata mesajları
- [ ] Türkçe komut açıklamaları
- [ ] İngilizce komut açıklamaları

---

## Beklenen Sonuçlar

### Başarılı Testler
- ✓ Tüm komutlar doğru şekilde işlenir
- ✓ Konfigürasyon başarıyla kaydedilir
- ✓ `show wireless` komutu tüm ayarları gösterir
- ✓ Hata mesajları açık ve anlaşılırdır
- ✓ Modlar doğru şekilde değişir
- ✓ Prompt doğru gösterilir

### Başarısız Testler
- ✗ Geçersiz komutlar hata verir
- ✗ Geçersiz parametreler hata verir
- ✗ Validasyon başarısız olur

---

**Test Tarihi:** 2026-05-20
**Test Durumu:** Hazır
**Versiyon:** 1.0
