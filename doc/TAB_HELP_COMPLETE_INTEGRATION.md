# TAB ve ? Tam Entegrasyon Rehberi

## 📋 Özet

Network Simulator'da **TAB** (otomatik tamamlama) ve **?** (yardım) tuşları tam olarak entegre edilmiştir. Kullanıcılar komut kısaltmalarını tamamlamak, seçenekler arasında döngü yapmak ve mevcut seçenekleri görmek için bu tuşları kullanabilir.

## 🎯 Temel Özellikler

### TAB Tuşu Özellikleri
- ✓ Komut otomatik tamamlama
- ✓ Çoklu seçenek döngüsü
- ✓ Alt komut tamamlama
- ✓ Parametre tamamlama
- ✓ IP adresi tamamlama
- ✓ Başarısız tamamlamada ? yardımı

### ? Tuşu Özellikleri
- ✓ Temel komut yardımı
- ✓ Kısmi komut yardımı
- ✓ Alt komut yardımı
- ✓ Parametre yardımı
- ✓ Komut açıklamaları (Türkçe + İngilizce)
- ✓ Kategorilendirme (Komutlar vs Parametreler)

## 📚 Kullanım Örnekleri

### Örnek 1: Temel TAB Tamamlama

```
Switch> en<TAB>
Switch> enable 
```

### Örnek 2: Çoklu Seçenek Döngüsü

```
Switch> s<TAB>
Switch> show 

Switch> s<TAB>
Switch> ssh 

Switch> s<TAB>
Switch> show  (tekrar başa döner)
```

### Örnek 3: Alt Komut Tamamlama

```
Switch# show <TAB>
Switch# show running-config 

Switch# show <TAB>
Switch# show interfaces 

Switch# show <TAB>
Switch# show vlan
```

### Örnek 4: Temel ? Yardımı

```
Switch> ?
  Komutlar:
    enable               - Ayrıcalıklı moda geç (Enable privileged mode)
    exit                 - Oturumu kapat (Exit session)
    show                 - Cihaz bilgilerini göster (Display device information)
    ping                 - Ağ bağlantısını test et (Test network connectivity)
    telnet               - Telnet ile uzak cihaza bağlan (Connect to remote device via Telnet)
    ssh                  - SSH ile uzak cihaza bağlan (Connect to remote device via SSH)
    traceroute           - Hedef cihaza giden yolu göster (Display route to destination)
```

### Örnek 5: Kısmi Komut Yardımı

```
Switch> sh?
  Komutlar:
    show                 - Cihaz bilgilerini göster (Display device information)
    ssh                  - SSH ile uzak cihaza bağlan (Connect to remote device via SSH)
```

### Örnek 6: Alt Komut Yardımı

```
Switch# show ?
  Komutlar:
    running-config       - Çalışan yapılandırmayı göster
    interfaces           - Arayüzleri göster
    vlan                 - VLAN bilgilerini göster
    version              - Cihaz sürümünü göster
    mac                  - MAC adres tablosunu göster
    cdp                  - CDP komşularını göster
    ip                   - IP bilgilerini göster
    spanning-tree        - Spanning Tree bilgilerini göster
    port-security        - Port Security bilgilerini göster
    ssh                  - SSH bilgilerini göster
```

### Örnek 7: Parametreli Komut Yardımı

```
Switch# ping ?
  Parametreler:
    <ip-address>         - Hedef IP adresi
    <hostname>           - Hedef cihaz adı
```

## 🔧 Teknik Detaylar

### Dosyalar

1. **src/lib/network/executor.ts**
   - `commandHelp` - Komut ağacı
   - `commandDescriptions` - Komut açıklamaları
   - `getInlineHelp()` - Yardım çıktısı oluşturma

2. **src/components/network/Terminal.tsx**
   - `expandCommandContext()` - Komut bağlamı genişletme
   - `getAutocompleteContext()` - Otomatik tamamlama bağlamı
   - `handleTabComplete()` - TAB tuşu işleme
   - `handleKeyDown()` - Tuş işleme

3. **src/components/network/pcPanel.utils.ts**
   - `expandCommandContext()` - PC paneli için komut bağlamı

### Algoritma

#### TAB Tamamlama Algoritması

```
1. Bağlam Belirleme
   - Mevcut komut modunu belirle
   - Kısmi giriş bağlamını analiz et

2. Aday Bulma
   - Komut ağacından eşleşen adayları bul
   - Kısmi giriş ile başlayan adayları filtrele

3. Tamamlama
   - Eşleşen adaylar varsa:
     - İlk adayı tamamla
     - TAB tuşuna tekrar basıldığında sonraki adayı göster
   - Eşleşen adaylar yoksa:
     - ? yardımını otomatik olarak göster
```

#### ? Yardım Algoritması

```
1. Bağlam Belirleme
   - Mevcut komut modunu belirle
   - Kısmi giriş bağlamını analiz et

2. Aday Bulma
   - Komut ağacından tüm adayları bul
   - Kısmi giriş ile eşleşenleri filtrele

3. Kategorilendirme
   - Komutları ve parametreleri ayır
   - Komutları açıklamalarıyla birleştir

4. Gösterme
   - Biçimlendirilmiş çıktı göster
   - Türkçe ve İngilizce açıklamalar göster
```

### Entegrasyon Noktaları

#### Terminal.tsx

```typescript
// 1. Komut bağlamı genişletme
const expandCommandContext = (mode, rawValue) => {
  // Komut ağacından adayları bul
  // Kısmi giriş ile filtrele
  // Tüm adayları sakla (? için)
}

// 2. Otomatik tamamlama bağlamı
const getAutocompleteContext = (value) => {
  // expandCommandContext() çağır
  // Filtrelenmiş adayları döndür (TAB için)
  // Tüm adayları sakla (? için)
}

// 3. TAB tuşu işleme
const handleTabComplete = () => {
  // Eşleşen adayları bul
  // Adaylar varsa tamamla
  // Adaylar yoksa ? yardımını göster
}

// 4. Tuş işleme
const handleKeyDown = (e) => {
  if (e.key === 'Tab') {
    handleTabComplete()
  } else if (e.key === '?') {
    onCommand(input + '?')
  }
}
```

#### pcPanel.utils.ts

```typescript
// Komut bağlamı genişletme (PC paneli için)
export const expandCommandContext = (mode, rawValue) => {
  // Komut ağacından adayları bul
  // Kısmi giriş ile filtrele
  // Tüm adayları sakla (? için)
}
```

## 📊 Desteklenen Modlar

| Mod | TAB Desteği | ? Desteği | Komut Sayısı |
|-----|-------------|----------|--------------|
| User Mode | ✓ | ✓ | 8 |
| Privileged Mode | ✓ | ✓ | 21 |
| Config Mode | ✓ | ✓ | 28 |
| Interface Mode | ✓ | ✓ | 22 |
| VLAN Mode | ✓ | ✓ | 10 |
| Line Mode | ✓ | ✓ | 12 |
| Router Config Mode | ✓ | ✓ | 10 |
| DHCP Config Mode | ✓ | ✓ | 12 |

## 🚀 Gelişmiş Kullanım

### Hızlı Yapılandırma

```
Switch> en<TAB>
Switch> enable 
Switch# conf<TAB>
Switch# configure terminal
Switch(config)# int<TAB>
Switch(config)# interface 
Switch(config)# interface fa0/1<TAB>
Switch(config-if)# 
Switch(config-if)# no sh<TAB>
Switch(config-if)# no shutdown
```

### Komut Keşfi

```
Switch> ?
(Tüm komutlar gösterilir)

Switch> sh?
(show ve ssh gösterilir)

Switch> show ?
(show alt komutları gösterilir)

Switch# show ip ?
(IP alt komutları gösterilir)
```

### Parametreli Komutlar

```
Switch# ping ?
(Parametreler gösterilir)

Switch# ping 192.168.1.1<TAB>
(Boşluk eklenir)

Switch# ping 192.168.1.1 
```

## 💡 İpuçları

1. **TAB tuşu eşleşme bulamadığında**: Otomatik olarak ? yardımı gösterilir
2. **Çoklu seçenek**: TAB tuşuna tekrar basarak seçenekler arasında döngü yapabilirsiniz
3. **Kısmi komut**: Komutun ilk birkaç harfini yazıp TAB tuşuna basabilirsiniz
4. **Alt komutlar**: Komuttan sonra boşluk bırakıp TAB tuşuna basabilirsiniz
5. **Parametreler**: Komuttan sonra ? tuşuna basarak parametreleri görebilirsiniz

## 🧪 Test Edilmiş Senaryolar

- ✓ User mode TAB tamamlama
- ✓ Privileged mode TAB tamamlama
- ✓ Config mode TAB tamamlama
- ✓ Interface mode TAB tamamlama
- ✓ VLAN mode TAB tamamlama
- ✓ Line mode TAB tamamlama
- ✓ Router config mode TAB tamamlama
- ✓ DHCP config mode TAB tamamlama
- ✓ Çoklu seçenek döngüsü
- ✓ Alt komut tamamlama
- ✓ Parametreli komut tamamlama
- ✓ IP adresi tamamlama
- ✓ User mode ? yardımı
- ✓ Privileged mode ? yardımı
- ✓ Config mode ? yardımı
- ✓ Interface mode ? yardımı
- ✓ VLAN mode ? yardımı
- ✓ Line mode ? yardımı
- ✓ Router config mode ? yardımı
- ✓ DHCP config mode ? yardımı
- ✓ Kısmi komut ? yardımı
- ✓ Alt komut ? yardımı
- ✓ Parametreli komut ? yardımı
- ✓ TAB başarısız olduğunda ? yardımı

## 📈 İstatistikler

- **Desteklenen Modlar**: 8
- **Toplam Komut**: 100+
- **Açıklama Sayısı**: 100+
- **Dil Desteği**: 2 (Türkçe, İngilizce)
- **TAB Desteği**: ✓ Tam
- **? Desteği**: ✓ Tam
- **Entegrasyon**: ✓ Tam

## 🎓 Öğrenme Kaynakları

- `doc/HELP_SYSTEM_GUIDE.md` - Yardım sistemi rehberi
- `doc/HELP_SYSTEM_IMPLEMENTATION.md` - Yardım sistemi teknik dokümantasyonu
- `doc/TAB_AND_HELP_INTEGRATION.md` - TAB ve ? entegrasyon rehberi
- `HELP_SYSTEM_SUMMARY.md` - Yardım sistemi özeti

## ✨ Sonuç

TAB ve ? tuşları tam olarak entegre edilmiştir ve kullanıcıların komutları hızlı bir şekilde girmesine, keşfetmesine ve öğrenmesine yardımcı olur.

### Temel Avantajlar

1. **Hızlı Komut Giriş**: TAB ile komutları hızlı tamamlayabilirsiniz
2. **Komut Keşfi**: ? ile mevcut seçenekleri görebilirsiniz
3. **Öğrenme**: Açıklamalar ile komutları öğrenebilirsiniz
4. **Verimlilik**: Yazma işlemini azaltarak verimliliği artırır
5. **Kullanıcı Deneyimi**: Sezgisel ve kolay kullanım

### Gelecek İyileştirmeler

- [ ] Komut örnekleri TAB ile gösterme
- [ ] Komut sözdizimi TAB ile gösterme
- [ ] Komut kategorileri TAB ile gösterme
- [ ] Arama işlevi TAB ile gösterme
- [ ] Komut geçmişi TAB ile gösterme
- [ ] Komut tamamlama önerileri gösterme
- [ ] Bağlamsal öneriler TAB ile gösterme
