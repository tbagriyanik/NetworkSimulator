import { Keyboard, LucideIcon } from 'lucide-react';

export interface CommandDefinition {
  id: string;
  icon: LucideIcon;
  title: string;
  cmds: [string, string, string?][];
  type?: 'commands' | 'info' | 'examples';
}

export function getKeyboardShortcuts(isTR: boolean): CommandDefinition {
  return {
    id: 'keyboard_shortcuts',
    icon: Keyboard,
    title: isTR ? 'Fare & Klavye Kısayolları' : 'Mouse & Keyboard Shortcuts',
    type: 'info',
    cmds: [
      ['F1', isTR ? 'Yardım / Kısayollar panelini aç' : 'Open Help / Shortcuts panel'],
      ['Shift + ? / Shift + /', isTR ? 'Klavye & Tuval Kısayol Kılavuzu modalını aç' : 'Open Keyboard & Canvas Shortcuts guide modal'],
      ['F5', isTR ? 'Ağı yenile' : 'Refresh network'],
      ['Escape', isTR ? 'Önce aktif üst pencereyi, tekrar basınca alttaki pencereyi kapat' : 'Close the active top window first, then the window below'],
      ['Tab', isTR ? 'Cihazlar arasında gezin' : 'Navigate between devices'],
      ['Shift + Tab', isTR ? 'Görev Yöneticisi (Pencere listesi ve pencereler arası geçiş)' : 'Open Task Switcher and switch between device windows'],
      ['Enter', isTR ? 'Seçili cihaz penceresini aç' : 'Open selected device window'],
      ['Ctrl + M', isTR ? 'Aktif pencereyi simge durumuna küçült / büyüt' : 'Minimize / maximize active device window'],
      ['Alt + M', isTR ? 'Minimap (Harita) göster / gizle' : 'Toggle Minimap display'],
      ['Alt + L', isTR ? 'Ağ Olay Günlüğü panelini aç / kapat' : 'Toggle Network Event Log panel'],
      ['Alt + F', isTR ? 'Tüm cihazları ekrana sığdır (Fit View)' : 'Zoom to fit all devices'],
      ['Ctrl + S', isTR ? 'Projeyi kaydet' : 'Save project'],
      ['Ctrl + O', isTR ? 'Proje aç' : 'Open project'],
      ['Alt + N', isTR ? 'Yeni proje oluştur' : 'Create new project'],
      ['Ctrl + Z', isTR ? 'Geri al (Topoloji & Hizalama Hareketi)' : 'Undo (Undo topology & alignment)'],
      ['Ctrl + Y', isTR ? 'İleri al (Redo / Yeniden yap)' : 'Redo'],
      ['Ctrl + C', isTR ? 'Seçili cihazı kopyala' : 'Copy selected device'],
      ['Ctrl + X', isTR ? 'Seçili cihazı kes' : 'Cut selected device'],
      ['Ctrl + V', isTR ? 'Yapıştır' : 'Paste'],
      ['Ctrl + A', isTR ? 'Tümünü seç' : 'Select all'],
      ['Delete', isTR ? 'Seçili cihazı / öğeyi sil' : 'Delete selected device / item'],
      ['Ctrl + L', isTR ? 'CMD & CLI Ekran geçmişini temizle' : 'Clear CMD & CLI Terminal screen'],
      ['Ctrl + P', isTR ? 'Yazdır / Sertifika' : 'Print / Certificate'],
      ['S', isTR ? 'Simülasyon modunu aç/kapat' : 'Toggle simulation mode'],
      ['P', isTR ? 'Paket analizi: Oynat / Duraklat' : 'Packet analysis: Play / Pause'],
      ['N', isTR ? 'Paket analizi: Sonraki Hop (duraklatıldığında)' : 'Packet analysis: Next Hop (when paused)'],
      ['"', isTR ? 'Timeline panelini aç/kapat' : 'Toggle timeline panel'],
      ['Sol Tık (Cihaz)', isTR ? 'Cihazı seç veya sürükle' : 'Select or drag device'],
      ['Çift Tık (Cihaz)', isTR ? 'Cihaz kontrol / yapılandırma penceresini aç' : 'Open device config / control window'],
      ['Sağ Tık (Cihaz / Tuval)', isTR ? 'Bağlam menüsünü (Context Menu) aç' : 'Open context menu'],
      ['Fare Tekerleği (Scroll)', isTR ? 'Tuval üzerinde yakınlaştır / uzaklaştır (Zoom In / Out)' : 'Zoom canvas in / out'],
      ['Sol Tık + Sürükle', isTR ? 'Tuvali (Canvas) kaydır' : 'Pan canvas'],
      ['Fare Orta Tuşu + Sürükle', isTR ? 'Çoklu seçim kutusu oluştur (Çoklu Cihaz Seçimi)' : 'Box multi-selection (Multi-select devices)'],
      ['Shift + Fare Orta Tuşu / Sol Tık', isTR ? 'Mevcut seçime cihaz ekle / çıkar' : 'Add / remove device from selection'],
      ['Metin Seçimi (Mouse Selection)', isTR ? 'CMD, CLI & Konsol geçmişinden metin seçilince otomatik kopyalama' : 'Auto-Copy text selection from CMD, CLI & Console outputs'],
      ['Tab (CLI)', isTR ? 'Komut ve arayüz adı otomatik tamamlama' : 'Command & interface tab autocomplete'],
      ['Troubleshooting & Hata Enjeksiyonu', isTR ? 'Kademeli ipucu destekli sorun giderme ve hata simülasyonu' : 'Progressive hint-based troubleshooting and fault simulation'],
      ['Paket Yolculuğu & PDU Analizi', isTR ? 'Hop-by-hop L1-L7 başlık kırılımı, Hex/ASCII dump ve karar ağacı' : 'Hop-by-hop L1-L7 header breakdown, Hex/ASCII dump and decision logs'],
      ['Side-by-Side (Böl)', isTR ? 'Açık pencereleri ekranda yan yana bölünmüş yerleştir' : 'Arrange open windows side-by-side (Split View)'],
      ['Ctrl + Sürükle (Drag)', isTR ? 'Nokta Izgaraya Yapıştır (Snap-to-Grid)' : 'Snap to Grid during drag'],
      ['Çoklu Cihaz Dağıtım', isTR ? '3+ cihaz seçilince Araç Çubuğunda Yatay / Dikey Eşit Dağıt' : 'Distribute Horizontally / Vertically on 3+ devices selected'],
      ['Çevresel Ayarlar', isTR ? 'Gelişmiş Çevresel Ayarlar panelini aç' : 'Open Environmental Settings panel'],
      ['Topoloji Kayıt Yöneticisi', isTR ? 'Anlık görüntü al, JSON içe/dışa aktar (Uyumsuz JSON doğrulama & hata korumalı)' : 'Take topology snapshot, import/export JSON (with strict structure validation)'],
      ['MQTT Paket Yakalama', isTR ? 'MQTT CONNECT, PUBLISH, SUBSCRIBE, Topic, QoS ve Payload bilgilerini incele' : 'Inspect MQTT CONNECT, PUBLISH, SUBSCRIBE, Topic, QoS and Payload details'],
      ['REST / RESTCONF', isTR ? 'İstek ve yanıt panellerini ayraçtan sürükleyerek yeniden boyutlandır' : 'Resize request and response panes using the draggable divider'],
    ]
  };
}
