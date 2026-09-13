# 🐍 Python Programlama Kılavuzu & Yorumlayıcı Referansı

Network Simulator PC panelinde çalışan yerleşik Python yorumlayıcısı, Nesne Yönelimli Programlama (OOP), Generator'lar, Decorator'lar ve Temel Algoritma konularını öğretmek amacıyla tasarlanmış güvenli bir JS/TS motorudur.

---

## 🚀 1. Python Betiklerini Çalıştırma Yöntemleri

PC cihazının **CMD (Komut İstemi)** sekmesinde veya **Dosya Düzenleyici (File Editor)** arayüzünde Python kodları aşağıdaki yöntemlerle çalıştırılabilir:

### A. CMD Üzerinden Betik Çalıştırma
```cmd
python script.py
python C:\code\main.py arg1 arg2
```

### B. Tek Satırlık Komut Çalıştırma (`-c` bayrağı)
```cmd
python -c "print('Merhaba NetworkSimulator!')"
python -c "import math; print(math.sqrt(16))"
```

### C. İnteraktif Python Kabuğu (REPL)
CMD terminaline `python` yazarak interaktif yorumlayıcıya girilebilir:
```cmd
C:\> python
Python (simulated) on win32
Type "help", "copyright", "credits" or "license" for more information.
>>> x = 10
>>> print(x * 2)
20
>>> exit()
```

### D. Dosya Düzenleyici (File Editor) İle Çalıştırma
PC Masaüstündeki **Dosya Düzenleyici** uygulamasında uzantısı `.py` olan bir dosya oluşturup kaydedildikten sonra araç çubuğundaki **▶ Çalıştır (Play)** butonuna basarak koda doğrudan çıktı alabilirsiniz.

---

## 🧮 2. Temel Veri Tipleri ve Değişkenler

Yorumlayıcı tüm standart Python ilkel ve koleksiyon veri tiplerini destekler:

| Veri Tipi | Örnek Tanımlama | Açıklama |
|---|---|---|
| `int` | `x = 42` | Tam sayı |
| `float` | `pi = 3.14159` | Ondalıklı sayı |
| `bool` | `is_active = True` | Mantıksal değer (`True` / `False`) |
| `str` | `name = "Router-1"` | Metin / String (`f"IP: {ip}"` f-string desteği dahil) |
| `list` | `ports = [21, 22, 80, 443]` | Değiştirilebilir sıralı liste |
| `dict` | `host = {"ip": "192.168.1.1", "role": "Gateway"}` | Anahtar-değer sözlüğü |
| `set` | `vlans = {10, 20, 30}` | Benzersiz küme |
| `tuple` | `coords = (10, 20)` | Değiştirilemez demet |
| `complex` | `z = 3 + 4j` | Karmaşık sayı |

**Dahili Dönüşüm ve Yardımcı Fonksiyonlar:**
`int()`, `float()`, `str()`, `bool()`, `list()`, `dict()`, `set()`, `type()`, `len()`, `range()`, `sum()`, `min()`, `max()`, `abs()`, `round()`, `sorted()`, `reversed()`.

### 🛠️ Temel Python Komut ve Dahili Fonksiyon Özeti

| Komut / Fonksiyon | Sözdizimi Örneği | Açıklama |
|---|---|---|
| `print()` | `print("Çıktı:", x)` | Standart çıktıya metin veya değişken yazdırır |
| `input()` | `name = input("Adınız: ")` | Kullanıcıdan metin girdisi alır |
| `type()` | `type("123")` | Değişkenin veya nesnenin veri tipini öğrenir (`str`) |
| `len()` | `len([10, 20, 30])` | Liste, metin veya koleksiyon eleman sayısını verir |
| `range()` | `range(0, 10, 2)` | Sayısal aralık üreteci oluşturur |
| `str.split()` | `"192.168.1.1".split(".")` | Metni belirtilen ayraca göre böler (`['192','168','1','1']`) |
| `str.join()` | `"-".join(["a", "b"])` | Liste elemanlarını metin olarak birleştirir (`"a-b"`) |
| `list.append()` | `ports.append(8080)` | Listeye yeni eleman ekler |
| `dict.get()` | `host.get("ip", "N/A")` | Sözlükten güvenli değer okur |
| `import` | `import math, json, os, socket` | Standard kütüphane veya ağ modülünü yükler |

---

## 🔀 3. Kontrol Akışı (Control Flow)

### A. Koşullu İfadeler (`if / elif / else`)
```python
status_code = 200

if status_code == 200:
    print("Bağlantı Başarılı")
elif status_code == 404:
    print("Sayfa Bulunamadı")
else:
    print("Bilinmeyen Durum")
```

### B. Döngüler (`for` ve `while`)
```python
# for döngüsü ve range()
for i in range(1, 5):
    print(f"Paket #{i} gönderildi")

# Liste iterasyonu ve enumerate()
devices = ["Switch-1", "Switch-2", "Router-1"]
for idx, dev in enumerate(devices, start=1):
    print(f"{idx}. Cihaz: {dev}")

# while döngüsü
count = 3
while count > 0:
    print(f"Geri sayım: {count}")
    count -= 1
```

### C. Hata Yakalama (`try / except / else / finally`)
```python
try:
    result = 10 / 0
except Exception as e:
    print(f"Hata yakalandı: {e}")
finally:
    print("İşlem tamamlandı.")
```

### D. Bağlam Yöneticisi ve Dosya Okuma/Yazma (`open(...)`)
NetworkSimulator PC sanal dosya sistemi üzerinde `open(file, mode)` fonksiyonu ile dosya okuma (`r`), yazma (`w`), ekleme (`a`) ve okuma-yazma (`r+`) işlemleri tam desteklenmektedir:

```python
# Dosyaya yazma
with open("log.txt", "w") as f:
    f.write("Ağ başlangıç kaydı\n")
    f.write("Status: OK\n")

# Dosyadan okuma
with open("log.txt", "r") as f:
    content = f.read()
    print("Dosya İçeriği:\n" + content)

# Satır satır okuma
f = open("log.txt", "r")
lines = f.readlines()
for line in lines:
    print("Satır:", line.strip())
f.close()
```

---

## ⚙️ 4. Fonksiyonlar ve Generator'lar (`yield`)

### A. Fonksiyon Tanımlama
```python
def calculate_subnet(ip, mask=24):
    return f"{ip}/{mask}"

print(calculate_subnet("192.168.1.0"))
```

### B. Tembel Üreteçler (Generators - `yield`)
`yield` yapısı ile hafıza dostu lazy iterator'lar oluşturabilirsiniz:

```python
def count_down(n):
    while n > 0:
        yield n
        n -= 1

for num in count_down(3):
    print(f"Adım: {num}")
# Çıktı:
# Adım: 3
# Adım: 2
# Adım: 1
```

---

## 🏛️ 5. Nesne Yönelimli Programlama (OOP)

Sınıf tanımları, kurucu metot (`__init__`), nitelik bağlama (`self`), kalıtım ve polymorphism tam olarak desteklenmektedir.

### A. Temel Sınıf ve Nesne Örnekleme
```python
class NetworkDevice:
    def __init__(self, hostname, ip_address):
        self.hostname = hostname
        self.ip_address = ip_address

    def get_info(self):
        return f"{self.hostname} ({self.ip_address})"

dev1 = NetworkDevice("PC-1", "192.168.1.10")
print(dev1.get_info())  # PC-1 (192.168.1.10)
```

### B. Kalıtım (Inheritance) ve `super()`
```python
class Router(NetworkDevice):
    def __init__(self, hostname, ip_address, routing_protocol):
        super().__init__(hostname, ip_address)
        self.routing_protocol = routing_protocol

    def get_info(self):
        base_info = super().get_info()
        return f"[Router] {base_info} - Protocol: {self.routing_protocol}"

r1 = Router("R1", "10.0.0.1", "OSPF")
print(r1.get_info())  # [Router] R1 (10.0.0.1) - Protocol: OSPF
print(isinstance(r1, NetworkDevice))  # True
```

---

## 🎨 6. Decorator Sistemleri

### A. `@property` ve Getter / Setter Kapsülleme
```python
class Interface:
    def __init__(self, name, speed=1000):
        self.name = name
        self._speed = speed

    @property
    def speed(self):
        return self._speed

    @speed.setter
    def speed(self, value):
        if value < 10:
            raise ValueError("Hız 10 Mbps'den düşük olamaz!")
        self._speed = value

eth0 = Interface("GigabitEthernet0/0")
print(eth0.speed)  # 1000
eth0.speed = 100
print(eth0.speed)  # 100
```

### B. `@staticmethod` ve `@classmethod`
```python
class IPUtils:
    @staticmethod
    def is_valid_octet(octet):
        return 0 <= octet <= 255

print(IPUtils.is_valid_octet(192))  # True
print(IPUtils.is_valid_octet(300))  # False
```

### C. Özel Kullanıcı Tanımlı Decorator'lar
```python
def log_execution(func):
    def wrapper(*args, **kwargs):
        print(f"[LOG] {func.__name__} çağrılıyor...")
        return func(*args, **kwargs)
    return wrapper

@log_execution
def send_ping(dest):
    print(f"Ping -> {dest}")

send_ping("8.8.8.8")
```

---

## 📦 7. Dahili ve Standart Modüller

### A. `json` Modülü
```python
import json

data = {"hostname": "R1", "interfaces": ["Gi0/0", "Gi0/1"], "active": True}
json_str = json.dumps(data, indent=2)
print(json_str)

parsed = json.loads(json_str)
print(parsed["hostname"])  # R1
```

### B. `re` (Düzenli İfadeler - Regex) Modülü
```python
import re

log = "Interface GigabitEthernet0/1 changed state to UP at 192.168.1.1"
match = re.search(r"GigabitEthernet\d+/\d+", log)
if match:
    print(f"Bulunan Arayüz: {match.group(0)}")  # GigabitEthernet0/1

ips = re.findall(r"\d+\.\d+\.\d+\.\d+", log)
print(f"Bulunan IP'ler: {ips}")  # ['192.168.1.1']
```

### C. `os.path` Modülü
```python
import os

path = os.path.join("C:\\code", "config.txt")
print(path)  # C:\code\config.txt
print(os.path.basename(path))  # config.txt
print(os.path.dirname(path))   # C:\code
print(os.path.splitext(path))  # ('C:\\code\\config', '.txt')
```

### D. Simüle Edilmiş `socket` Modülü (Ağ Eğitimi)
Soket programlama pratikleri için tarayıcı üzerinde simüle edilen soket modülü:

```python
import socket

# Soket oluşturma
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("192.168.1.1", 80))

# Veri gönderme & alma
s.send("GET / HTTP/1.1\r\n\r\n")
response = s.recv(1024)
print(response)
s.close()
```

### E. 3D Sahne Motoru (`scene3d` / `vpython` / `three3d`)
3D grafik sahneler oluşturmak, geometrik nesneleri yönetmek ve CSG işlemleri yapmak için simüle edilmiş 3D sahne modülü:

```python
import scene3d as s3d

# Sahne oluşturma ve gökyüzü/ışık ayarları
scene = s3d.Scene(title="Ağ Veri Merkezi 3D", background="dark")
scene.set_sky("sunset")
scene.set_light("sun", intensity=1.2)

# Primitif 3D Nesneler
p = s3d.Plane(x=0, y=0, z=0, width=20, height=20, color="gray")
c1 = s3d.Cube(x=-2, y=1, z=0, size=2, color="blue", opacity=0.9)
s1 = s3d.Sphere(x=2, y=1, z=0, radius=1, color="red")
cyl = s3d.Cylinder(x=0, y=2, z=-3, radius=0.8, height=3, color="green")

# Yapıcı Katı Geometri (CSG) Operasyonları
comb = c1.union(s1)          # Birleştirme (Union)
diff = cyl.subtract(c1)      # Çıkarma (Difference)

# Nesne Özellikleri Güncelleme (Getter / Setter)
c1.color = "cyan"
c1.wireframe = True
c1.position = (1, 2, 3)
```

### F. Dinamik Ses ve Müzik Sentetörü (`audio` / `music` / `synth` / `winsound`)
Web Audio API sentezleyicisi üzerinden ses efekti, nota, polifonik akor ve melodi üretip diske kaydetme modülü:

```python
import audio

# Tekil Nota ve Frekans Çalma
audio.play_tone(frequency=440, duration=0.5, volume=0.8) # 440Hz A4
audio.play_note("C4", duration=0.4)                       # Do 4

# Polifonik Akor ve Melodi Dizileri
audio.play_chord(["C4", "E4", "G4"], duration=1.0)       # C Major Akoru
audio.play_melody(["C4", "D4", "E4", "F4", "G4"], speed=1.2)

# Oyun ve Arayüz Ses Efektleri
audio.play_sfx("coin")      # 'coin', 'laser', 'jump', 'explosion', 'powerup'

# WAV Dosyası Oluşturup Diske Kaydetme
audio.save_wav("C:\\music\\melody.wav", notes=["C4", "E4", "G4", "C5"])
```

### G. Diğer Standart Modüller
- `math`: `sqrt`, `pow`, `sin`, `cos`, `floor`, `ceil`, `pi`, `e`, `log10`.
- `random`: `randint`, `choice`, `shuffle`, `random`, `randrange`, `uniform`.
- `datetime` / `time`: `datetime.now()`, `time.time()`, `time.sleep()`.
- `sys`: `sys.version`, `sys.platform`, `sys.argv`, `sys.exit()`.
- `itertools`: `product`, `permutations`, `combinations`, `chain`.

---

## 🛡️ 8. Güvenlik ve Sandbox Mimarisi

- Yorumlayıcı tamamen istemci tarafı (in-browser) JavaScript/TypeScript motoru üzerinde çalışır; sunucuya veya kullanıcının gerçek işletim sistemine erişimi yoktur.
- `__class__`, `__mro__`, `__subclasses__`, `__globals__`, `__builtins__`, `__import__`, `__proto__` gibi dunder erişimleri güvenlik katmanı tarafından bloke edilir.

---

## 📘 9. İlgili Dokümanlar

- [PC_CMD_REFERENCE.md](PC_CMD_REFERENCE.md) — PC Komut İstemi ve Batch (.bat) referansı
- [USAGE.md](USAGE.md) — Simülatör kullanım kılavuzu
- [CLI_COMMANDS.md](../cli/CLI_COMMANDS.md) — Router/Switch CLI komutları
