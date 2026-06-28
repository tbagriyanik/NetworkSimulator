# Wireless WiFi Konfigürasyonu - Hızlı Başlangıç

## 📖 Giriş

Network Simulator'da wireless cihazlar (Access Point, Router) için WiFi ayarlarını gerçek komutları ile yapabilirsiniz.

## 🚀 Hızlı Başlangıç

### Adım 1: Basit SSID Oluşturma

```bash
Router# configure terminal
Router(config)# dot11 ssid MyWiFi
Router(config-ssid)# authentication open
Router(config-ssid)# guest-mode
Router(config-ssid)# exit
```

### Adım 2: Radyo Arayüzünü Yapılandırma

```bash
Router(config)# interface dot11radio 0
Router(config-if)# ssid MyWiFi
Router(config-if)# channel 6
Router(config-if)# station-role root
Router(config-if)# exit
Router(config)# end
```

### Adım 3: Konfigürasyonu Görüntüleme

```bash
Router# show wireless
```

## 🔐 Güvenli WiFi Oluşturma

### WPA2 ile Güvenli SSID

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

## 📚 Komut Referansı

### SSID Yapılandırması

| Komut | Açıklama |
|-------|----------|
| `dot11 ssid <name>` | SSID tanımlama |
| `authentication <type>` | Kimlik doğrulama (open, shared, network-eap) |
| `authentication key-management wpa version <2\|3>` | WPA2 veya WPA3 |
| `wpa-psk ascii <password>` | WiFi şifresi (8-63 karakter) |
| `guest-mode` | SSID broadcast etme |

### Radyo Arayüzü Konfigürasyonu

| Komut | Açıklama |
|-------|----------|
| `interface dot11radio <0\|1>` | 2.4GHz (0) veya 5GHz (1) seçimi |
| `encryption mode ciphers <cipher>` | Şifreleme (aes-ccm, tkip, aes-tkip) |
| `ssid <name>` | SSID bağlama |
| `channel <number>` | Kanal seçimi |
| `power <level>` | Transmit gücü (full, half, quarter, eighth) |
| `station-role <role>` | Rol (root, repeater, client) |
| `mac-filter <allow\|deny> <mac>` | MAC filtreleme |

### Görüntüleme

| Komut | Açıklama |
|-------|----------|
| `show wireless` | Tüm wireless konfigürasyonunu göster |

## 💡 İpuçları

### Kanal Seçimi
- **2.4 GHz:** Kanallar 1, 6, 11 (çakışmayan)
- **5 GHz:** Daha geniş kanal seçeneği (36-165)

### Güvenlik
- WPA2 minimum güvenlik standardı
- WPA3 en yeni ve en güvenli standart
- Güçlü şifre kullanın (12+ karakter)

### MAC Filtreleme
- İzin verilen cihazları allow list'e ekleyin
- Rogue cihazları deny list'e ekleyin

## 📖 Detaylı Dokümantasyon

- **Kullanıcı Rehberi:** `doc/WIRELESS_CONFIGURATION_GUIDE.md`
- **Uygulama Özeti:** `doc/WIRELESS_IMPLEMENTATION_SUMMARY.md`
- **Test Senaryoları:** `doc/WIRELESS_TEST_CASES.md`
- **Özellik Özeti:** `WIRELESS_FEATURE_SUMMARY.md`

## ❓ Sık Sorulan Sorular

### S: SSID görünmüyor
**C:** `guest-mode` komutunun çalıştırıldığını kontrol edin.

### S: Bağlantı başarısız
**C:** Şifrenin doğru olduğunu ve güvenlik standardının eşleştiğini kontrol edin.

### S: Düşük sinyal gücü
**C:** Transmit gücünü artırın veya cihazın konumunu değiştirin.

## 🔧 Sorun Giderme

### SSID Tanımlanmamış Hatası
```
Error: SSID 'MyWiFi' is not defined
```
**Çözüm:** Önce `dot11 ssid MyWiFi` komutu ile SSID'yi tanımlayın.

### Geçersiz Kanal Hatası
```
Error: Invalid channel. Valid channels for 2.4GHz: 1-14
```
**Çözüm:** Frekans bandı için geçerli kanal numarası kullanın.

### Geçersiz MAC Adresi Hatası
```
Error: Invalid MAC address format (e.g., AA:BB:CC:DD:EE:FF)
```
**Çözüm:** MAC adresini `AA:BB:CC:DD:EE:FF` formatında girin.

## 📞 Destek

Sorularınız veya sorunlarınız için:
1. Dokümantasyonu kontrol edin
2. Test senaryolarını inceleyin
3. Hata mesajını dikkatlice okuyun

## 📝 Notlar

- Tüm komutlar gerçek komutlarına uyumludur
- Türkçe ve İngilizce hata mesajları desteklenir
- Konfigürasyon otomatik olarak kaydedilir

---

**Versiyon:** 1.9.2
**Tarih:** 2026-06-20
**Durum:** ✅ Hazır
