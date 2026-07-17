# Google Sheets İletişim Formu Kurulumu

Bu rehber, ağ simülasyonundaki iletişim formunu Google Sheets'e nasıl bağlayacağınızı açıklar.

## 1. Google Sayfası Oluşturun
1. [Google Sheets](https://sheets.google.com)'e gidin ve yeni bir boş sayfa oluşturun.
2. İlk satıra (başlıklar) şu sütun adlarını ekleyin:
   - `Timestamp`
   - `Name`
   - `Email`
   - `Type`
   - `Message`
   - `UserAgent`

## 2. Google Apps Script'i Hazırlayın
1. Üst menüden **Uzantılar** > **Apps Script**'i seçin.
2. Açılan editöre aşağıdaki kodu yapıştırın:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data;
    
    // Hem JSON hem de Form Post desteği için
    if (e.postData.type == "application/json") {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }
    
    // Değişkenleri tanımlayalım (Mail içinde de kullanabilmek için)
    var timestamp = data.timestamp || new Date().toISOString();
    var name = data.name || "İsimsiz";
    var email = data.email || "E-posta yok";
    var type = data.type || "belirsiz";
    var message = data.message || "";
    var userAgent = data.userAgent || "";

    // Veriyi sayfaya ekle
    sheet.appendRow([timestamp, name, email, type, message, userAgent]);
    
    // ---- E-POSTA GÖNDERME BÖLÜMÜ ----    
    var konu = "NetSim Mesajı: " + name;
    
    var icerik = "Merhaba,\n\n" +
                 "Form üzerinden yeni bir mesaj alındı. Detaylar aşağıdadır:\n\n" +
                 "Tarih: " + timestamp + "\n" +
                 "İsim: " + name + "\n" +
                 "E-posta: " + email + "\n" +
                 "Tür: " + type + "\n" +
                 "Mesaj: " + message + "\n" +
                 "User Agent: " + userAgent + "\n\n" +
                 "İyi çalışmalar.";

    // Mail gönderme fonksiyonu, mail atması istemiyor iseniz aşağıdaki 57.satırı // ile açıklama satırı yapınız
    yollaMail(konu, icerik);
    // ----------------------------------
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function yollaMail(konu, icerik) {
  MailApp.sendEmail("KENDIMAILADRESINIZ@gmail.com",konu,icerik);
}
```

3. Sağ üstteki **Dağıt** (Deploy) > **Yeni dağıtım**'a tıklayın.
4. Türü **Web uygulaması** olarak seçin.
5. "Erişimi olanlar" kısmını **Herkes** (Anyone) yapın (Bu önemlidir, aksi takdirde API erişemez).
6. **Dağıt**'a tıklayın ve size verilen **Web App URL**'sini kopyalayın.

## 3. Environment Variable Ayarı
Projenizin kök dizinindeki `.env.local` dosyasına (yoksa oluşturun) kopyaladığınız URL'yi ekleyin:

```env
GOOGLE_SHEETS_CONTACT_URL=https://script.google.com/macros/s/AKfycb.../exec
```

## 4. Test Edin
Hakkında modalındaki iletişim sekmesini kullanarak bir mesaj gönderin. Mesaj anında Google Sheets sayfanıza düşecektir.

## 💡 Sorun Giderme (Troubleshooting)

### 1. "Failed to send to Google Sheets" (500 Hatası)
Eğer terminalde bu hatayı alıyorsanız, genellikle şu iki sebepten biridir:
- **Erişim Ayarı**: Apps Script'i dağıtırken "Erişimi olanlar" kısmını **"Herkes" (Anyone)** yapmamış olabilirsiniz. (Sadece siz yaparsanız, API sunucu üzerinden erişemez).
- **URL Yanlış**: `.env.local` dosyasına yapıştırdığınız URL'nin başında veya sonunda boşluk olmadığından ve `/exec` ile bittiğinden emin olun.

### 2. Apps Script Değişiklikleri
Kodu güncellediğinizde, her seferinde **"Yeni Dağıtım" (New Deployment)** oluşturmalı ve yeni URL'yi kullanmalısınız. Mevcut dağıtımı güncellemek bazen eski kodun çalışmasına sebep olabilir.
