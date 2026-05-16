# ⚡ Hızlı Referans - Hata Kontrolü & UI/UX

## 🎯 En Sık Kullanılan Kod Parçacıkları

### 1️⃣ Bildirim Göster
```typescript
import { useNotifications } from '@/lib/notifications/notificationManager';

const { success, error, warning, info } = useNotifications();

// Başarı
success({ title: 'Başarılı!', description: 'İşlem tamamlandı.' });

// Hata
error({ title: 'Hata', description: 'Bir şeyler yanlış gitti.' });

// Uyarı
warning({ title: 'Uyarı', description: 'Dikkat edin.' });

// Bilgi
info({ title: 'Bilgi', description: 'Bilgilendirme mesajı.' });
```

### 2️⃣ Form Validasyonu
```typescript
import { validateEmail, validatePassword, validateForm } from '@/lib/validation/formValidation';

// Tek alan
const error = validateEmail('user@example.com');

// Toplu
const result = validateForm(
  { email: 'user@example.com', password: 'pass123' },
  { email: validateEmail, password: (pwd) => validatePassword(pwd, 8) }
);
```

### 3️⃣ Form Input Bileşeni
```typescript
import { FormInput } from '@/components/ui/FormInput';

<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={handleChange}
  error={error}
  hint="Asla paylaşılmayacak"
  required
  showValidation
  isValid={!error && email.length > 0}
/>
```

### 4️⃣ Onay Dialog
```typescript
import { ConfirmationDialog, useConfirmationDialog } from '@/components/ui/ConfirmationDialog';

const { open, setOpen, confirm, ...dialogProps } = useConfirmationDialog();

const handleDelete = () => {
  confirm({
    title: 'Sil?',
    description: 'Bu işlem geri alınamaz.',
    variant: 'danger',
    onConfirm: async () => { await deleteItem(); },
  });
};

<ConfirmationDialog open={open} onOpenChange={setOpen} {...dialogProps} />
```

### 5️⃣ API İstemcisi
```typescript
import { apiClient } from '@/lib/api/apiClient';

try {
  const response = await apiClient.post('/api/contact', data);
  if (response.success) console.log(response.data);
} catch (error) {
  console.error(error.code, error.message);
}
```

### 6️⃣ Yükleme Durumları
```typescript
import { LoadingSpinner, ProgressIndicator, StatusIndicator, EmptyState } from '@/components/ui/LoadingStates';

// Spinner
<LoadingSpinner size="md" text="Yükleniyor..." variant="pulse" />

// İlerleme
<ProgressIndicator current={50} total={100} label="İndiriliyor..." />

// Durum
<StatusIndicator status="loading" label="İşleniyor" />

// Boş Durum
<EmptyState title="Veri yok" description="Henüz veri eklenmedi." variant="info" />
```

---

## 📋 Validasyon Fonksiyonları

| Fonksiyon | Kullanım | Örnek |
|-----------|----------|-------|
| `validateEmail` | Email doğrulama | `validateEmail('user@example.com')` |
| `validatePassword` | Şifre doğrulama | `validatePassword('pass123', 8)` |
| `validateSSID` | WiFi ağ adı | `validateSSID('MyNetwork')` |
| `validateIPAddress` | IP adresi | `validateIPAddress('192.168.1.1')` |
| `validateMACAddress` | MAC adresi | `validateMACAddress('00:1A:2B:3C:4D:5E')` |
| `validateHostname` | Hostname | `validateHostname('router1')` |
| `validateVLANId` | VLAN ID | `validateVLANId(10)` |
| `validatePort` | Port numarası | `validatePort(8080)` |
| `validateSubnetMask` | Subnet mask | `validateSubnetMask('255.255.255.0')` |
| `isIpv6` | IPv6 mı? | `isIpv6('2001:db8::1')` |
| `validateRequired` | Zorunlu alan | `validateRequired(value, 'fieldName')` |
| `validateNumberRange` | Sayı aralığı | `validateNumberRange(5, 1, 10, 'count')` |

---

## 🎨 Bildirim Varyantları

### Başarı
```typescript
success({ title: '✅ Başarılı', description: 'İşlem tamamlandı.' });
```

### Hata
```typescript
error({
  title: '❌ Hata',
  description: 'Bir şeyler yanlış gitti.',
  code: 'ERROR_CODE',
  recoverable: true,
  recoverySteps: ['Adım 1', 'Adım 2'],
});
```

### Uyarı
```typescript
warning({ title: '⚠️ Uyarı', description: 'Dikkat edin.' });
```

### Kritik
```typescript
critical({
  title: '🚨 Kritik Hata',
  description: 'Acil müdahale gerekli.',
  recoverySteps: ['Adım 1', 'Adım 2'],
});
```

---

## 🎯 Onay Dialog Varyantları

| Varyant | Kullanım | Renk |
|---------|----------|------|
| `default` | Normal işlemler | Mavi |
| `warning` | Uyarı gerektiren | Sarı |
| `danger` | Yıkıcı işlemler | Kırmızı |
| `info` | Bilgilendirme | Mavi |

```typescript
// Danger (Sil)
confirm({
  title: 'Sil?',
  variant: 'danger',
  confirmText: 'Sil',
  onConfirm: async () => { await deleteItem(); },
});

// Warning (Uyarı)
confirm({
  title: 'Devam et?',
  variant: 'warning',
  confirmText: 'Devam Et',
  onConfirm: async () => { await continueOperation(); },
});
```

---

## 📊 Yükleme Durumları

### LoadingSpinner
```typescript
<LoadingSpinner 
  size="md"           // sm, md, lg, xl
  text="Yükleniyor..."
  variant="default"   // default, pulse, bounce
/>
```

### ProgressIndicator
```typescript
<ProgressIndicator 
  current={50}
  total={100}
  label="İndiriliyor..."
/>
```

### StatusIndicator
```typescript
<StatusIndicator 
  status="loading"    // loading, success, error, warning, idle
  label="İşleniyor"
/>
```

### EmptyState
```typescript
<EmptyState 
  title="Veri yok"
  description="Henüz veri eklenmedi."
  variant="info"      // default, error, success, info
  icon={<CustomIcon />}
  action={<Button>Ekle</Button>}
/>
```

---

## 🔄 API Hata Kodları

| Kod | Anlamı | Çözüm |
|-----|--------|-------|
| `NETWORK_ERROR` | Ağ hatası | İnternet bağlantısını kontrol et |
| `REQUEST_TIMEOUT` | Zaman aşımı | Tekrar dene |
| `HTTP_400` | Geçersiz istek | Giriş verilerini kontrol et |
| `HTTP_401` | Yetkisiz | Giriş yap |
| `HTTP_403` | Yasak | İzin yok |
| `HTTP_404` | Bulunamadı | URL'yi kontrol et |
| `HTTP_500` | Sunucu hatası | Tekrar dene |
| `MAX_RETRIES_EXCEEDED` | Maksimum deneme aşıldı | Daha sonra dene |

---

## 🛠️ Hızlı Kurulum

### 1. Bileşeni Import Et
```typescript
import { useNotifications } from '@/lib/notifications/notificationManager';
```

### 2. Hook'u Kullan
```typescript
const { success, error } = useNotifications();
```

### 3. Çağır
```typescript
success({ title: 'Başarılı!', description: 'Tamamlandı.' });
```

---

## 📝 Yaygın Hatalar

### ❌ Hata: "useNotifications is not a function"
```typescript
// Yanlış
import { notificationManager } from '@/lib/notifications/notificationManager';
notificationManager.success(...);

// Doğru
import { useNotifications } from '@/lib/notifications/notificationManager';
const { success } = useNotifications();
success(...);
```

### ❌ Hata: "FormInput not found"
```typescript
// Yanlış
import { FormInput } from '@/components/ui/input';

// Doğru
import { FormInput } from '@/components/ui/FormInput';
```

### ❌ Hata: "Validation error is null"
```typescript
// Yanlış
const error = validateEmail('invalid');
console.log(error.message); // Crash!

// Doğru
const error = validateEmail('invalid');
if (error) {
  console.log(error.message);
}
```

---

## 🎓 Öğrenme Kaynakları

- **Detaylı Rehber**: `ERROR_HANDLING_GUIDE.md`
- **Entegrasyon Rehberi**: `INTEGRATION_GUIDE.md`
- **İyileştirmeler Özeti**: `IMPROVEMENTS_SUMMARY.md`

---

## 🚀 Sonraki Adımlar

1. [ ] WifiControlPanel'deki alert'leri toast'a dönüştür
2. [ ] Tüm formlara validasyon ekle
3. [ ] Async işlemlere try-catch ekle
4. [ ] Yıkıcı işlemler için onay dialog'u ekle
5. [ ] Terminal bileşenine hata işleme ekle

---

## 📞 Hızlı Yardım

**Soru**: Nasıl hata gösterim?  
**Cevap**: `error({ title: 'Hata', description: 'Mesaj' })`

**Soru**: Nasıl form validasyonu yapım?  
**Cevap**: `validateForm(data, { field: validator })`

**Soru**: Nasıl onay dialog'u gösterim?  
**Cevap**: `confirm({ title: 'Sil?', onConfirm: async () => {...} })`

**Soru**: Nasıl API çağrısı yapım?  
**Cevap**: `await apiClient.post('/api/endpoint', data)`

---

## 🌐 IPv6 Yönlendirme (RIPng & OSPFv3)

### 1️⃣ Global Etkinleştirme
```
Router(config)# ipv6 unicast-routing
```

### 2️⃣ RIPng Yapılandırma
```
Router(config)# ipv6 router rip TEST
Router(config)# interface gi0/0
Router(config-if)# ipv6 rip TEST enable
```

### 3️⃣ OSPFv3 Yapılandırma
```
Router(config)# ipv6 router ospf 1
Router(config)# interface gi0/0
Router(config-if)# ipv6 ospf 1 area 0
```

### 4️⃣ Doğrulama
```
Router# show ipv6 route
Router# show ipv6 interface brief
```

---

**Güncelleme Tarihi**: 2026-05-16
**Versiyon**: 1.0  
**Durum**: ✅ Hazır
