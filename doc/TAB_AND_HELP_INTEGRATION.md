# TAB ve ? Yardım Sistemi Entegrasyonu

## Genel Bakış

Network Simulator'da **TAB** (otomatik tamamlama) ve **?** (yardım) tuşları tam olarak entegre edilmiştir. Kullanıcılar komut kısaltmalarını tamamlamak ve mevcut seçenekleri görmek için bu tuşları kullanabilir.

## TAB Tuşu - Otomatik Tamamlama

### Temel Kullanım

TAB tuşu, kısmi komutları otomatik olarak tamamlar:

```
Switch> en<TAB>
Switch> enable 
```

### Çoklu Seçenek Döngüsü

Aynı ön ek ile birden fazla komut varsa, TAB tuşunu tekrar basarak seçenekler arasında döngü yapabilirsiniz:

```
Switch> s<TAB>
Switch> show 

Switch> s<TAB>
Switch> ssh 

Switch> s<TAB>
Switch> show  (tekrar başa döner)
```

### Alt Komutlar

TAB, alt komutları da tamamlar:

```
Switch# show <TAB>
Switch# show running-config 

Switch# show <TAB>
Switch# show interfaces 

Switch# show <TAB>
Switch# show vlan
```

### Parametreler

TAB, parametreleri de tamamlar:

```
Switch# ping 192.168.<TAB>
Switch# ping 192.168.1.1 
```

### IP Adresi Tamamlama

IP adresleri otomatik olarak tamamlanır:

```
Switch# ip address 192.168.1.<TAB>
Switch# ip address 192.168.1. 255.255.255.0
```

## ? Tuşu - Yardım

### Temel Yardım

? tuşu, mevcut bağlamda kullanılabilir komutları gösterir:

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

### Kısmi Komut Yardımı

Kısmi komut yazıp ? tuşuna basarak, eşleşen komutları görebilirsiniz:

```
Switch> sh?
  Komutlar:
    show                 - Cihaz bilgilerini göster (Display device information)
    ssh                  - SSH ile uzak cihaza bağlan (Connect to remote device via SSH)
```

### Alt Komut Yardımı

Alt komutlar için yardım görmek için:

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

### Parametreli Komut Yardımı

Parametreler için yardım görmek için:

```
Switch# ping ?
  Parametreler:
    <ip-address>         - Hedef IP adresi
    <hostname>           - Hedef cihaz adı
```

## TAB ve ? Entegrasyonu

### Senaryo 1: TAB ile Tamamlama Başarısız Olduğunda

TAB tuşu eşleşen komut bulamadığında, otomatik olarak ? yardımını gösterir:

```
Switch> xyz<TAB>
% Bilinmeyen komut

  Komutlar:
    (mevcut komutlar gösterilir)
```

### Senaryo 2: Yapılandırma Modunda

```
Switch(config)# int<TAB>
Switch(config)# interface 

Switch(config)# interface fa0/1<TAB>
Switch(config-if)# 
```

### Senaryo 3: Kısaltma Döngüsü

```
Switch# c<TAB>
Switch# configure 

Switch# c<TAB>
Switch# clear 

Switch# c<TAB>
Switch# copy 

Switch# c<TAB>
Switch# configure  (tekrar başa döner)
```

## Desteklenen Modlar

### User Mode
- TAB: `enable`, `exit`, `show`, `ping`, `telnet`, `ssh`, `traceroute`
- ?: Tüm komutlar ve açıklamaları gösterir

### Privileged Mode
- TAB: `configure`, `disable`, `show`, `clear`, `debug`, `write`, `reload`, `copy`, `erase`, `delete`, `ip`
- ?: Tüm komutlar ve açıklamaları gösterir

### Config Mode
- TAB: `hostname`, `interface`, `vlan`, `enable`, `service`, `username`, `line`, `banner`, `ip`, `ipv6`, `no`, `spanning-tree`, `vtp`, `cdp`
- ?: Tüm komutlar ve açıklamaları gösterir

### Interface Mode
- TAB: `shutdown`, `speed`, `duplex`, `description`, `switchport`, `cdp`, `spanning-tree`, `channel-group`, `ip`
- ?: Tüm komutlar ve açıklamaları gösterir

### VLAN Mode
- TAB: `name`, `state`, `no`, `debug`, `undebug`
- ?: Tüm komutlar ve açıklamaları gösterir

### Line Mode
- TAB: `password`, `login`, `transport`, `exec-timeout`, `logging`, `history`, `privilege`
- ?: Tüm komutlar ve açıklamaları gösterir

### Router Config Mode
- TAB: `network`, `router-id`, `passive-interface`, `default-information`
- ?: Tüm komutlar ve açıklamaları gösterir

### DHCP Config Mode
- TAB: `network`, `address`, `default-router`, `dns-server`, `lease`, `domain-name`
- ?: Tüm komutlar ve açıklamaları gösterir

## Teknik Detaylar

### TAB Tamamlama Algoritması

1. **Bağlam Belirleme**: Mevcut komut modunu ve kısmi giriş bağlamını belirle
2. **Aday Bulma**: Komut ağacından eşleşen adayları bul
3. **Filtreleme**: Kısmi giriş ile başlayan adayları filtrele
4. **Tamamlama**: İlk adayı tamamla
5. **Döngü**: TAB tuşuna tekrar basıldığında sonraki adayı göster

### ? Yardım Algoritması

1. **Bağlam Belirleme**: Mevcut komut modunu ve kısmi giriş bağlamını belirle
2. **Aday Bulma**: Komut ağacından tüm adayları bul
3. **Kategorilendirme**: Komutları ve parametreleri ayır
4. **Açıklama Ekleme**: Her komut için açıklamayı ekle
5. **Gösterme**: Biçimlendirilmiş çıktı göster

### Entegrasyon Noktaları

**Terminal.tsx** dosyasında:

1. **expandCommandContext()**: Komut bağlamını genişletir
   - Komut ağacından adayları bulur
   - Kısmi giriş ile filtreler
   - Tüm adayları saklar (? için)

2. **getAutocompleteContext()**: Otomatik tamamlama bağlamını hazırlar
   - Filtrelenmiş adayları döndürür (TAB için)
   - Tüm adayları saklar (? için)

3. **handleTabComplete()**: TAB tuşu işleme
   - Eşleşen adayları bulur
   - Adaylar varsa tamamlar
   - Adaylar yoksa ? yardımını gösterir

4. **handleKeyDown()**: Tuş işleme
   - TAB tuşu: handleTabComplete() çağırır
   - ? tuşu: Yardım komutu çalıştırır

## Kullanıcı Deneyimi

### Hızlı Komut Giriş

```
Switch> en<TAB>
Switch> enable 
```

### Komut Keşfi

```
Switch> ?
(Tüm komutlar gösterilir)

Switch> sh?
(show ve ssh gösterilir)

Switch> show ?
(show alt komutları gösterilir)
```

### Parametreli Komutlar

```
Switch# ping ?
(Parametreler gösterilir)

Switch# ping 192.168.1.<TAB>
(IP adresi tamamlanır)
```

## Gelecek İyileştirmeler

- [ ] Komut örnekleri TAB ile gösterme
- [ ] Komut sözdizimi TAB ile gösterme
- [ ] Komut kategorileri TAB ile gösterme
- [ ] Arama işlevi TAB ile gösterme
- [ ] Komut geçmişi TAB ile gösterme
- [ ] Komut tamamlama önerileri gösterme
- [ ] Bağlamsal öneriler TAB ile gösterme

## Performans Notları

- TAB tamamlama gerçek zamanlı olarak çalışır
- ? yardımı gerçek zamanlı olarak çalışır
- Minimal bellek kullanımı
- Statik veri yapıları kullanılır

## Sorun Giderme

### TAB tuşu çalışmıyor

1. Terminal penceresinin odakta olduğundan emin olun
2. Şifre giriş modunda değilsiniz
3. Komut onay iletişim kutusunda değilsiniz

### ? tuşu çalışmıyor

1. Terminal penceresinin odakta olduğundan emin olun
2. Şifre giriş modunda değilsiniz
3. Komut onay iletişim kutusunda değilsiniz

### TAB tamamlama yanlış komut gösteriyor

1. Komut modunun doğru olduğundan emin olun
2. Kısmi komutun doğru yazıldığından emin olun
3. Komut ağacında komutun olduğundan emin olun

## Örnekler

### Örnek 1: Hızlı Yapılandırma

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

### Örnek 2: Komut Keşfi

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

### Örnek 3: Parametreli Komutlar

```
Switch# ping ?
(Parametreler gösterilir)

Switch# ping 192.168.1.1<TAB>
(Boşluk eklenir)

Switch# ping 192.168.1.1 
```

## Sonuç

TAB ve ? tuşları tam olarak entegre edilmiştir ve kullanıcıların komutları hızlı bir şekilde girmesine ve keşfetmesine yardımcı olur.
