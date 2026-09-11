# 💻 PC CMD Komut Referansı / PC CMD Command Reference

PC panelindeki **CMD (Komut İstemi)** sekmesinde kullanılabilen tüm komutlar ve parametreleri.

> **Not:** Bu komutlar PC cihazının CMD terminalinde çalışır. Router/Switch CLI komutlarından farklıdır.

---

## 📡 ping

ICMP Echo istekleri ile bağlantı testi.

```
ping <hedef-ip> [parametreler]
ping <hostname> [parametreler]
```

| Parametre | Açıklama |
|---|---|
| `-n <sayı>` | Gönderilecek paket sayısı (varsayılan: 4) |
| `-l <bayt>` | Paket boyutu (byte) |
| `-w <ms>` | Zaman aşımı (milisaniye) |
| `-a` | IP adresini hostname'e çevir (PTR sorgusu) |
| `-t` | Ctrl+C ile durdurana kadar sürekli ping |
| `-4` | IPv4 kullan |
| `-6` | IPv6 kullan |

**Örnekler:**
```
ping 192.168.1.1
ping 192.168.1.1 -n 10
ping 192.168.1.1 -t
ping 192.168.1.1 -l 1400 -n 5
ping [IP_ADDRESS] -a
```

---

## 🗺️ tracert / traceroute

Ağ paketinin geçtiği yolu (hop-by-hop) gösterir.

```
tracert <hedef-ip>
tracert <hostname>
```

| Parametre | Açıklama |
|---|---|
| `-d` | DNS çözümlemesini atla (sadece IP göster) |
| `-h <max-hop>` | Maksimum hop sayısı |
| `-w <ms>` | Her hop için zaman aşımı |
| `-4` | IPv4 kullan |
| `-6` | IPv6 kullan |

**Örnekler:**
```
tracert 8.8.8.8
tracert 192.168.1.1 -d
tracert 192.168.1.1 -h 10
```

---

## 🔍 nslookup

DNS isim çözümleme ve sorgu aracı.

```
nslookup <hostname>
nslookup <ip-adresi>
nslookup
```

| Parametre / Sözdizimi | Açıklama |
|---|---|
| `nslookup <hostname>` | Hostname'den IP'ye çözümleme |
| `nslookup <ip>` | Ters DNS (PTR) çözümleme |
| `-type=<tür>` | Kayıt tipi (A, AAAA, MX, NS, PTR, CNAME, SOA) |
| `server <dns-ip>` | Kullanılacak DNS sunucusunu belirt |

**Örnekler:**
```
nslookup [IP_ADDRESS]
nslookup 192.168.1.1
nslookup [IP_ADDRESS] -type=MX
nslookup [IP_ADDRESS] server 8.8.8.8
```

---

## 🧮 arp

ARP önbelleğini görüntüle ve yönet.

```
arp [parametreler]
```

| Parametre | Açıklama |
|---|---|
| `-a` / `-g` | Tüm ARP önbelleğini listele |
| `-v` | Ayrıntılı çıktı |
| `-d <ip>` | Belirtilen IP için ARP girdisini sil |
| `-s <ip> <mac>` | Statik ARP girdisi ekle |

**Örnekler:**
```
arp -a
arp -d 192.168.1.1
arp -s 192.168.1.100 00-11-22-33-44-55
```

---

## 📊 netstat

Aktif ağ bağlantılarını ve istatistikleri gösterir.

```
netstat [parametreler]
```

| Parametre | Açıklama |
|---|---|
| `-a` | Tüm bağlantıları ve dinleme portlarını göster |
| `-n` | Adresleri sayısal olarak göster (DNS çözümlemesi yapma) |
| `-o` | İlgili işlem ID'sini (PID) göster |
| `-p <protokol>` | Belirtilen protokolün bağlantılarını göster (TCP, UDP) |
| `-r` | Yönlendirme tablosunu göster |
| `-s` | Her protokol için istatistikleri göster |
| `-e` | Ethernet istatistiklerini göster |

**Örnekler:**
```
netstat -a
netstat -an
netstat -r
netstat -s
```

---

## 📡 nbtstat

NetBIOS over TCP/IP istatistikleri ve isim tablosu.

```
nbtstat [parametreler]
```

| Parametre | Açıklama |
|---|---|
| `-n` | Yerel NetBIOS isim tablosu |
| `-c` | NetBIOS isim önbelleği |
| `-r` | NetBIOS isim çözümleme istatistikleri |
| `-R` | NetBIOS isim önbelleğini yenile |
| `-RR` | NetBIOS adlarını WINS sunucusuna yeniden kaydet |
| `-S` | Bağlantı ve sunucu istatistikleri |
| `-s` | Bağlantı istatistikleri |
| `-a <hostname>` | Belirtilen hostname için NetBIOS isim tablosu |
| `-A <ip>` | Belirtilen IP için NetBIOS isim tablosu |
| `-L` | NetBIOS lisans durumu |

**Örnekler:**
```
nbtstat -n
nbtstat -c
nbtstat -a PC1
```

---

## 🌐 ipconfig

PC'nin IP yapılandırmasını görüntüler ve yönetir.

```
ipconfig
ipconfig /all
ipconfig /release
ipconfig /renew
ipconfig /flushdns
ipconfig /displaydns
```

| Komut | Açıklama |
|---|---|
| `ipconfig` | Temel IP adresi, subnet mask, gateway |
| `ipconfig /all` | Tam ayrıntı (MAC, DNS, DHCP sunucu) |
| `ipconfig /release` | DHCP kirasını bırak |
| `ipconfig /renew` | DHCP kirası yenile |
| `ipconfig /flushdns` | DNS önbelleğini temizle |
| `ipconfig /displaydns` | DNS önbelleğini göster |

---

## 📁 Diğer Komutlar

| Komut | Açıklama |
|---|---|
| `copy <source> [destination]` | Dosyayı aynı klasörde veya farklı bir konuma kopyalar |
| `move <source> [destination]` | Dosya veya klasörü taşır/yeniden adlandırır |
| `ren <oldname> <newname>` | Dosya veya klasörün adını değiştirir |
| `type <dosya>` | Metin dosyasının içeriğini ekranda gösterir |
| `call <script.bat> [args]` | Başka bir batch yığın dosyasını iç içe çalıştırır |
| `ping6 <ipv6-adresi>` | IPv6 ping |
| `curl <url>` | HTTP GET isteği (PC HTTP browser simülasyonu) |
| `wget <url>` | Dosya veya web sayfası indir (IoT Web Panel erişimi için) |
| `cls` / `clear` | Terminali temizle |
| `help` | Komut yardımını listele |
| `exit` | CMD penceresini kapat |

---

## 📜 Batch (.bat / .cmd) Yığın Dosyaları

PC Komut İstemi'nde kullanıcı tanımlı `.bat` ve `.cmd` dosyaları doğrudan dosya adı girilerek çalıştırılabilir.

### Çalıştırma Sözdizimi
```
script.bat [parametre1] [parametre2] ...
script [parametre1] [parametre2] ...
call script.bat [parametreler]
C:\code\setup.bat
```

### Desteklenen Komut ve Direktifler

| Direktif / Komut | Açıklama |
|---|---|
| `@echo off` / `@echo on` | Satır komutlarının ekrana basılmasını kapatır/açar |
| `echo <mesaj>` / `echo.` | Ekrana metin yazar veya boş satır bırakır |
| `set VAR=değer` | Ortam değişkeni tanımlar (`%VAR%` ile erişilir) |
| `set` | Tüm ortam değişkenlerini listeler |
| `rem <yorum>` / `::<yorum>` | Yorum satırı (çalıştırılmaz) |
| `pause` | Kullanıcıdan devam etmek için girdi bekler (`Press any key to continue . . .`) |
| `cls` | Ekrani temizler |
| `goto :etiket` / `:etiket` | Belirtilen etikete atlar |
| `call <script.bat>` | İç içe başka bir yığın dosyasını çalıştırır |
| `%0` .. `%9` | Dosya adı (`%0`) ve girilen sıra numaralı parametreler (`%1`, `%2` vb.) |
| `%*` | Girilen tüm parametrelerin birleşimi |

**Örnek Batch Dosyası (`test.bat`):**
```bat
@echo off
rem Ağ tanı testi betiği
set TARGET=192.168.1.1
echo Hedef IP: %TARGET%
ping %TARGET%
ipconfig
```

---

## 🐧 Linux Bash Terminali & Shell Betikleri

PC panelindeki **Linux Terminal** sekmesinde kullanılabilen komutlar, dosya izinleri ve betik çalıştırma sistemi.

### Desteklenen Linux Komutları

| Komut | Açıklama | Kullanım Örneği |
|---|---|---|
| `ls [-l] [-la]` | Dizin içeriğini listeler (izinler, boyut, tarih) | `ls -la` |
| `pwd` | Çalışılan dizin yolını gösterir | `pwd` |
| `cd <dizin>` | Dizin değiştirir (`~`, `..`, `/home/user`) | `cd upload` |
| `cat <dosya>` | Dosya içeriğini ekranda gösterir | `cat script.sh` |
| `nano` / `vim` / `edit` | Metin düzenleyici penceresini açar | `nano test.py` |
| `touch <dosya>` | Boş dosya oluşturur | `touch app.py` |
| `mkdir <dizin>` | Yeni dizin oluşturur | `mkdir code` |
| `rm <dosya>` | Dosya veya dizini siler | `rm data.txt` |
| `cp <kaynak> <hedef>` | Dosya kopyalar | `cp a.txt b.txt` |
| `mv <kaynak> <hedef>` | Dosya taşır veya adını değiştirir | `mv old.txt new.txt` |
| `chmod <mod> <dosya>` | Çalıştırma / erişim izni değiştirir (`+x`, `-x`, `755`, `644`) | `chmod +x script.sh` |
| `chown <sahip> <dosya>` | Dosya sahipliğini değiştirir | `chown root script.sh` |
| `grep [-i] [-c] <pattern>` | Metin / akış içinde filtreleme yapar | `ifconfig | grep inet` |
| `wc [-l]` | Satır, kelime veya bayt sayar | `cat data.txt | wc -l` |
| `cmd > file` / `cmd >> file` | Çıktıyı dosyaya yönlendirir / sonuna ekler | `ifconfig > net_info.txt` |
| `cmd1 | cmd2` | Pipe: İlk komutun çıktısını ikinciye aktarır | `history | grep ping` |
| `history` | Daha önce çalıştırılan komut geçmişini listeler | `history` |
| `ifconfig` / `ip a` | Ağ arayüzleri ve IP yapılandırmalarını gösterir | `ifconfig` |
| `dhclient eth0` | Linux DHCP lease yeniler | `dhclient eth0` |
| `dhclient -r eth0` | Linux DHCP lease bırakır | `dhclient -r eth0` |
| `ip route` | Yönlendirme tablosunu gösterir | `ip route` |
| `ping <host>` | ICMP Echo isteği gönderir | `ping 192.168.1.1` |
| `traceroute <host>` | Paket geçiş yolunu izler | `traceroute 8.8.8.8` |
| `nslookup <domain>` | DNS çözümlemesi yapar | `nslookup samplesite.com` |
| `netstat` / `arp` | Ağ istatistikleri ve ARP tablosunu gösterir | `arp` |
| `ftp <server>` | Uzak FTP sunucusuna bağlanır | `ftp 192.168.1.50` |
| `ssh <user@host>` | Uzak sunucuya SSH bağlantısı kurar | `ssh admin@192.168.1.1` |
| `telnet <host>` | Uzak sunucuya Telnet bağlantısı kurar | `telnet 192.168.1.1` |
| `whoami` / `hostname` | Kullanıcı adı ve sistem adını gösterir/değiştirir | `hostname web-server` |
| `uname -a` / `date` / `uptime` | Sistem bilgisi, tarih ve çalışma süresi gösterir | `uname -a` |
| `clear` / `Ctrl+L` | Terminal ekranını temizler | `clear` |

### Shell Betiği Çalıştırma (`.sh` / `./script.sh`)
- **İzin Ver:** `chmod +x script.sh` ile dosyaya çalıştırma izni verin (`ls -l` çıktısında `-rwxr-xr-x` olarak görünür).
- **Çalıştır:** `./script.sh` veya `bash script.sh` komutu ile betiği yürütün. Çalıştırma izni yoksa `Permission denied` uyarısı alınır.

---

## 🐍 Python Betikleri & Yorumlayıcı (python)

PC Komut İstemi'nde dahili Python yorumlayıcısı ile betik çalıştırabilir veya interaktif REPL moduna girebilirsiniz.

### Çalıştırma Sözdizimi
```
python script.py [parametreler]
python -c "print('Merhaba')"
python
```

### ⚡ Temel Python Komutları Referansı

| Komut / Fonksiyon | Açıklama | Kullanım Örneği |
|---|---|---|
| `python <script.py>` | Belirtilen betik dosyasını çalıştırır | `python main.py` |
| `python -c "<code>"` | Komut satırından doğrudan kod çalıştırır | `python -c "print(2**10)"` |
| `print(value, ...)` | Çıktıyı ekrana yazdırır | `print("IP:", "192.168.1.1")` |
| `input([prompt])` | Kullanıcıdan klavye girdisi alır | `name = input("Cihaz adı: ")` |
| `len(s)` | Dizi, liste, sözlük veya metnin uzunluğunu döndürür | `count = len(devices)` |
| `type(obj)` | Nesnenin veri tipini döndürür (`int`, `str`, `list` vb.) | `print(type(x))` |
| `range(start, stop)` | Belirtilen aralıkta sayı üreteci oluşturur | `for i in range(1, 5):` |
| `int()`, `str()`, `float()` | Veri tipi dönüştürme fonksiyonları | `port = int("80")` |
| `list()`, `dict()`, `set()` | Koleksiyon dönüştürme fonksiyonları | `unique = set([1, 1, 2])` |
| `open(file, mode)` | Dosya okuma/yazma nesnesi döndürür | `f = open("log.txt", "w")` |
| `import <module>` | Dahili kütüphaneyi içe aktarır (`json`, `math`, `os`, `socket`) | `import socket` |
| `exit()` / `quit()` | İnteraktif Python (REPL) ortamından çıkar | `exit()` |

### Öne Çıkan Özellikler & Müfredat Uyumları
- **Nesne Yönelimli Programlama (OOP):** `class`, `__init__`, `self`, Kalıtım (Inheritance), `super()`, `isinstance()`.
- **Nitelik Kapsülleme (Decorators):** `@property`, `@<name>.setter`, `@staticmethod`, `@classmethod` ve kullanıcı tanımlı decorator'lar.
- **Generator'lar:** `yield` ve `yield from` ile lazy iterator'lar.
- **Standart Modüller:** `json`, `re`, `os.path`, simüle `socket` (ağ betikleri için), `math`, `random`, `datetime`, `sys`, `itertools`.

Detaylı kullanım rehberi ve kod örnekleri için **[PYTHON_PROGRAMMING_GUIDE.md](PYTHON_PROGRAMMING_GUIDE.md)** dokümanını inceleyin.

---

## 🔧 Bağlantı Sorunlarını Giderme Akışı

```
1. ipconfig /all            → IP adresi ve gateway doğrula
2. ping <gateway-ip>        → Gateway erişimini kontrol et
3. ping <hedef-ip>          → Uç noktaya erişimi kontrol et
4. tracert <hedef-ip>       → Paket yolunu göster
5. arp -a                   → ARP önbelleğini kontrol et
6. nslookup <hostname>      → DNS çözümlemesini kontrol et
```

---

## 📘 İlgili Dokümanlar

- [PYTHON_PROGRAMMING_GUIDE.md](PYTHON_PROGRAMMING_GUIDE.md) — Python Programlama ve Yorumlayıcı Kılavuzu
- [USAGE.md](USAGE.md) — Genel kullanım kılavuzu
- [CLI_COMMANDS.md](../cli/CLI_COMMANDS.md) — Router/Switch CLI komutları
- [CLI_GUIDED_TUTORIAL.md](../cli/CLI_GUIDED_TUTORIAL.md) — Rehberli CLI dersleri
