# Oda Takip Sistemi — Kurulum ve Kullanım

## Genel Bakış

Öğretmen-öğrenci takip sistemi, sınıf içi ağ simülasyonu derslerinde
öğrencilerin ilerlemesini anlık (polling tabanlı) takip etmek için
tasarlanmıştır. Login gerektirmez, oda kodu ile çalışır.

Mimari: Next.js App Router API routes → Vercel KV (Upstash Redis) → polling

---

## 1. Vercel KV Bağlantısı

### Vercel'de proje oluşturulduysa

1. Vercel Dashboard → Proje → **Storage** → **Create Database** → **KV**
2. Bağlanınca `KV_REST_API_URL` ve `KV_REST_API_TOKEN` otomatik eklenir
3. Yerelde çalıştırmak için: `vercel env pull .env.local`

### .env.local (manuel)

```env
KV_REST_API_URL=https://<your-db>.upstash.io
KV_REST_API_TOKEN=<your-token>
```

---

## 2. Paketler

```bash
npm install @upstash/redis
```

---

## 3. Dosya Yapısı

```
src/
├── lib/
│   ├── roomTypes.ts          # Tip tanımları (StudentProgress, RoomData)
│   └── roomStore.ts          # KV işlemleri (createRoom, updateStudent, getRoomStudents, checkRoomExists)
├── app/api/room/
│   ├── route.ts              # POST /api/room — oda oluşturma
│   └── [code]/
│       ├── route.ts          # GET /api/room/:code — oda varlık kontrolü
│       ├── students/
│       │   └── route.ts      # GET /api/room/:code/students — öğrenci listesi
│       └── student/
│           └── [studentId]/
│               └── route.ts  # PATCH /api/room/:code/student/:id — ilerleme güncelle
├── contexts/
│   └── RoomContext.tsx        # React context (oda kodu, isim, dialog durumu)
├── hooks/
│   ├── useRoomSync.ts        # Öğrenci hook'u (5sn debounce ile PATCH)
│   └── useRoomStudents.ts    # Öğretmen hook'u (4sn polling ile GET)
└── components/
    ├── RoomJoinDialog.tsx     # Öğrenci katılım dialog'u
    ├── TeacherRoomPanel.tsx   # Öğretmen paneli (oda oluşturma + izleme)
```

---

## 4. API Referansı

### `POST /api/room`

Oda oluşturur. Aynı kod tekrar gönderilirse mevcut odayı döndürür.

```json
{ "code": "AG7X2" }
```

→ `{ "success": true, "data": { "code": "AG7X2", "createdAt": ..., "students": {} } }`

### `GET /api/room/:code`

Odanın var olup olmadığını kontrol eder.

→ `{ "success": true, "data": { "exists": true } }`

### `PATCH /api/room/:code/student/:studentId`

Öğrenci ilerlemesini günceller.

```json
{
  "displayName": "Ali",
  "currentTask": "VLAN oluştur",
  "completedTasks": 3,
  "totalTasks": 10
}
```

→ `{ "success": true, "data": { "studentId": "...", ... } }`

### `GET /api/room/:code/students`

Odadaki tüm öğrencileri döndürür.

→ `{ "success": true, "data": [ { "studentId": "...", "displayName": "Ali", ... } ] }`

---

## 5. Kullanım

### Öğretmen

Sayfanın sol alt köşesindeki **Öğretmen Paneli** butonu → **Yeni Oda Oluştur**
→ 5 haneli kod üretilir → öğrencilere duyurulur.

Öğrenci listesi 4 saniyede bir otomatik güncellenir. Her öğrencinin:
- anlık görevi (`currentTask`)
- tamamlanan/toplam görev sayısı (`completedTasks` / `totalTasks`)
- progress bar'ı gösterilir.

Kod yanındaki kopyala butonu ile öğrencilere hızlıca paylaşılır.

### Öğrenci

**Öğrenci Katıl** butonu → dialog'da kod + isim girer
→ tarayıcıya kaydedilen UUID ile her PATCH'de tanınır
→ simülatördeki görev ilerlemesi 5 saniye debounce ile sunucuya gönderilir

Oturum bilgileri `localStorage`'da saklanır:
- `room-student-id` — cihaz UUID'si
- `room-joined-code` — son katılınan oda kodu
- `room-student-name` — öğrenci adı

---

## 6. Tasarım Kararları

| Karar | Açıklama |
|---|---|
| **Polling** (gerçek zamanlı değil) | Vercel serverless WebSocket tutamaz; 4sn öğretmen / 5sn öğrenci polling |
| **Doğrulama yok** | `studentId` localStorage UUID'sidir, gerçek hesap değildir |
| **4 saat TTL** | Redis key'leri 4 saat sonra otomatik silinir, her yazımda yenilenir |
| **Atomik Güncelleme** | Öğrenci verileri Redis **Hash** yapısında tutulur (`HSET`), böylece yarış durumları (race conditions) önlenir |
| **Hız Sınırlama** | API rotalarında IP bazlı `rateLimiter` uygulanmıştır |
| **@upstash/redis** | Doğrudan Upstash Redis bağlantısı — `roomStore.ts` içinde `KV_REST_API_URL` ve `KV_REST_API_TOKEN` env değişkenlerini kullanır |

---

## 7. Çıkış / Kapatma Kısayolları

| Tuş/Aksiyon | Etki |
|---|---|
| `ESC` | Öğretmen panelini / Katıl dialog'unu kapatır |
| Mobil back (Android donanım tuşu) | Açık paneli/dialog'u kapatır |
| Kapat (X) butonu (kırmızı) | Paneli kapatır |
