# Network Simulator 2026 - Usage Guide / Kullanım Kılavuzu

---

## EN: Canvas & Device Basics / TR: Tuval ve Cihaz Temelleri

| Action / İşlem | How / Nasıl |
|---|---|
| **Add device / Cihaz ekle** | Drag from palette onto canvas / Palettekten tuvale sürükle |
| **Select / Seç** | Left click / Sol tık |
| **Multi-select / Çoklu seç** | Shift + click / Shift + tık |
| **Rectangle select / Kutu seç** | Middle-click + drag / Orta tık + sürükle |
| **Move / Taşı** | Left-click + drag / Sol tık + sürükle |
| **Snap to grid / Izgaraya yapıştır** | Ctrl + drag / Ctrl + sürükle |
| **Delete / Sil** | Select + Delete / Seç + Delete |
| **Pan canvas / Tuval kaydır** | Space + drag / Boşluk + sürükle OR / VEYA right-click + drag / sağ tık + sürükle |
| **Zoom / Yakınlaştır** | Mouse wheel / Fare tekerleği OR / VEYA Ctrl + Scroll |
| **Context menu / Bağlam menüsü** | Right-click device / Cihaza sağ tık |
| **Open device / Cihaz aç** | Double-click device / Cihaza çift tık |

### Cable Types / Kablo Tipleri
| Cable / Kablo | Use / Kullanım |
|---|---|
| **Straight-through / Düz** | PC ↔ Switch, Router ↔ Switch |
| **Crossover / Çapraz** | Switch ↔ Switch, Router ↔ Router, PC ↔ PC, PC ↔ Router |
| **Console** | PC COM → Switch/Router Console port |

---

## EN: Device Interaction / TR: Cihaz Etkileşimi

| Device / Cihaz | Panel / How to open / Nasıl açılır |
|---|---|
| **PC** | Double-click → CMD, Services (DHCP/DNS/HTTP/FTP/Mail/NTP), WiFi, IoT tabs |
| **Switch / Router** | Double-click → CLI terminal (full NOS-style) |
| **L3 Switch** | Same as Switch + `ip routing` for Layer 3 |
| **Firewall** | Dedicated panel with drag-drop rule builder |
| **IoT** | Web-based sensor/actuator management panel |

### CLI Modes / CLI Modları
| Prompt | Mode / Mod | Description / Açıklama |
|---|---|---|
| `Switch>` | User EXEC | Basic monitoring (`show`, `ping`, `enable`) |
| `Switch#` | Privileged EXEC | All commands (`configure terminal`, `debug`, `reload`) |
| `Switch(config)#` | Global Config | System config (`hostname`, `vlan`, `interface`) |
| `Switch(config-if)#` | Interface | Port config (`switchport`, `ip address`, `shutdown`) |
| `Switch(config-line)#` | Line | Console/VTY config (`password`, `login`) |
| `Switch(config-vlan)#` | VLAN | VLAN config (`name`, `state`) |
| `Switch(config-router)#` | Router | RIP/OSPF config (`network`, `router-id`) |
| `Switch(dhcp-config)#` | DHCP Pool | DHCP config (`network`, `default-router`) |
| `Switch(config-ssid)#` | SSID Config | SSID security (`authentication`, `guest-mode`, `mbssid`) |
| `Switch(config-dot11)#` | Dot11 Wireless | Wireless radio (`channel`, `speed`, `station-role`, `power`) |
| `WLC(config-wlan)#` | WLAN Config | WLAN profile (`wlan`, `security`, `shutdown`) |
| `PC>` | CMD | Windows-style commands (`ipconfig`, `ping`, `nslookup`) |

---

## EN: Keyboard Shortcuts / TR: Klavye Kısayolları

### Canvas / Tuval
| Shortcut / Kısayol | EN | TR |
|---|---|---|
| `Ctrl + Z` | Undo | Geri al |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo | Yeniden yap |
| `Ctrl + C` | Copy selected device | Seçili cihazı kopyala |
| `Ctrl + X` | Cut selected device | Seçili cihazı kes |
| `Ctrl + V` | Paste | Yapıştır |
| `Ctrl + A` | Select all | Tümünü seç |
| `Delete` / `Backspace` | Delete selected | Seçili öğeyi sil |
| `Escape` | Cancel selection / Close mode | Seçimi iptal et / Modu kapat |
| `Ctrl + Scroll` | Zoom in / out | Yakınlaştır / Uzaklaştır |
| `Space + Drag` | Pan canvas | Canvas'ı kaydır |
| `Arrow Keys` | Move selected device(s) | Seçili cihaz(lar)ı taşı |
| `Shift + Arrow Keys` | Move selected device(s) faster | Seçili cihaz(lar)ı daha hızlı taşı |
| `F1` | Open / close help panel | Yardım panelini aç / kapat |
| `F5` | Refresh network topology | Ağ topolojisini yenile |
| `Home` | Reset topology view | Topoloji görünümünü sıfırla |
| `End` | Focus last element | Son öğeye odaklan |
| `Page Up` | Scroll canvas up | Canvas'ı yukarı kaydır |
| `Page Down` | Scroll canvas down | Canvas'ı aşağı kaydır |
| `Double-click (Empty Space)` | Reset topology view | Topoloji görünümünü sıfırla |
| `Double-click (Device)` | Open collapsible device panel | Daraltılabilir cihaz panelini aç |

### Ping Packet Analysis / Ping Paket Analizi
| Shortcut / Kısayol | EN | TR |
|---|---|---|
| `P` | Play / Pause packet analysis | Paket analizi: Oynat / Duraklat |
| `N` | Next hop (when paused) | Sonraki Hop (duraklatıldığında) |

### CLI / CMD
| Shortcut / Kısayol | EN | TR |
|---|---|---|
| `Tab` | Auto-complete command | Komut tamamlama |
| `Arrow Up / Down` | Command history | Komut geçmişi |
| `Enter` | Execute command | Komutu çalıştır |
| `Ctrl + L` | Clear terminal | Terminali temizle |
| `?` | Show available commands | Kullanılabilir komutları göster |
| `Ctrl + C` | Cancel command (CLI) | Komutu iptal et |

---

## EN: PC CMD Commands / TR: PC CMD Komutları

| Command / Komut | EN | TR |
|---|---|---|
| `ipconfig [/all] [/release] [/renew]` | IP configuration | IP yapılandırması |
| `ping <host>` | Test connectivity | Bağlantı testi |
| `tracert <host>` | Trace route | Rota izleme |
| `netstat` | Network statistics | Ağ istatistikleri |
| `nslookup <domain>` | DNS lookup | DNS sorgusu |
| `telnet <host> [port]` | Telnet connection | Telnet bağlantısı |
| `ssh [-l user] <host>` | SSH connection | SSH bağlantısı |
| `curl` / `wget <url>` | View web page | Web sayfası görüntüle |
| `ftp` | FTP session / FTP oturumu |
| `arp -a` | ARP table | ARP tablosu |
| `hostname` | Computer name | Bilgisayar adı |
| `dir` | Directory listing | Dosya listesi |
| `ver` | Version info | Versiyon bilgisi |
| `cls` | Clear screen | Ekranı temizle |
| `help` / `?` | Desktop command help | PC komut yardımı |

---

## EN: Tips / TR: İpuçları

- **F1** anywhere toggles the help panel / Her yerde F1 yardım panelini açar
- **ESC** closes modals and deselects / ESC modal kapatır ve seçimi iptal eder
- **?** in CLI or CMD shows available commands / CLI veya CMD'de `?` komutları gösterir
- **CLI Suggestions** show valid commands when you make a typo / CLI hataları yaptığınızda benzer geçerli komutları önerir
- **Tab** auto-completes commands / `Tab` komutları tamamlar
- **Ctrl + Drag** snaps devices to 16px grid / `Ctrl + Drag` cihazları ızgaraya yapıştırır
- **Double-click** any device to open its panel / Cihaza çift tık paneli açar
- **Space + Drag** pans the canvas when zoomed in / `Boşluk + Sürükle` yakınlaştırınca tuvali kaydırır
- **Arrow Keys** move selected devices on topology / `Ok Tuşları` topolojide seçili cihazları taşır
- **Shift + Arrow Keys** moves selected devices faster / `Shift + Ok Tuşları` daha hızlı taşır
- **P** and **N** control ping packet animation playback / `P` ve `N` ping animasyonunu kontrol eder
- **F5** refreshes the network topology / `F5` topolojiyi yeniler
- Config panel shows live `running-config` / Config paneli canlı `running-config` gösterir
- Windows are auto-positioned and restored on refresh / Pencereler otomatik konumlanır ve yenilemede geri yüklenir; Ağ Yenilendi Paneli'nin daraltılmış/genişletilmiş durumu da korunur
