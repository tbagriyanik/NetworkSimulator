# 🔧 Entegrasyon Rehberi - Hata Kontrolü & UI/UX İyileştirmeleri

Bu rehber, yeni hata kontrolü ve UI/UX bileşenlerini mevcut bileşenlere nasıl entegre edeceğinizi gösterir.

## 📋 İçindekiler

1. [Browser Alert'leri Toast'a Dönüştürme](#browser-alertleri-toasta-dönüştürme)
2. [Form Validasyonu Ekleme](#form-validasyonu-ekleme)
3. [Async İşlemlere Try-Catch Ekleme](#async-işlemlere-try-catch-ekleme)
4. [Onay Dialog'u Ekleme](#onay-dialogu-ekleme)
5. [Hata İşleme Ekleme](#hata-işleme-ekleme)

---

## Browser Alert'leri Toast'a Dönüştürme

### ❌ Eski Yöntem (Browser Alert)
```typescript
alert('❌ Lütfen bir ağ adı (SSID) girin');
```

### ✅ Yeni Yöntem (Toast Notification)
```typescript
import { useNotifications } from '@/lib/notifications/notificationManager';

function MyComponent() {
  const { error, success, warning } = useNotifications();

  const handleValidation = () => {
    if (!ssid) {
      error({
        title: 'Geçersiz SSID',
        description: 'Lütfen bir ağ adı (SSID) girin',
        code: 'INVALID_SSID',
      });
      return;
    }

    success({
      title: 'Başarılı!',
      description: 'WiFi ayarları kaydedildi.',
    });
  };

  return <button onClick={handleValidation}>Kaydet</button>;
}
```

### 📝 WifiControlPanel Örneği

**Dosya**: `src/components/network/WifiControlPanel.tsx`

```typescript
// Üst kısımda import ekle
import { useNotifications } from '@/lib/notifications/notificationManager';

// Bileşen içinde
export function WifiControlPanel() {
  const { error, success, warning } = useNotifications();

  // Eski kod:
  // if (!ssid) {
  //   alert('❌ Lütfen bir ağ adı (SSID) girin');
  //   return;
  // }

  // Yeni kod:
  if (!ssid) {
    error({
      title: 'Geçersiz SSID',
      description: 'Lütfen bir ağ adı (SSID) girin',
      code: 'INVALID_SSID',
    });
    return;
  }

  // Parola validasyonu
  if (security !== 'open' && password.length < 8) {
    error({
      title: 'Zayıf Parola',
      description: 'Parola en az 8 karakter olmalıdır',
      code: 'PASSWORD_TOO_SHORT',
      recoverySteps: [
        'En az 8 karakter uzunluğunda bir parola girin',
        'Büyük harf, küçük harf ve sayı kullanın',
      ],
    });
    return;
  }

  // Başarı mesajı
  success({
    title: 'Başarılı!',
    description: 'WiFi ayarları kaydedildi. Değişiklikler hemen geçerli olacaktır.',
  });
}
```

---

## Form Validasyonu Ekleme

### ❌ Eski Yöntem (Validasyon Yok)
```typescript
<input type="email" name="email" />
```

### ✅ Yeni Yöntem (Validasyon ile)
```typescript
import { FormInput } from '@/components/ui/FormInput';
import { validateEmail } from '@/lib/validation/formValidation';

function ContactForm() {
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string>();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Validasyon
    const error = validateEmail(value);
    setEmailError(error?.message);
  };

  return (
    <FormInput
      label="Email"
      type="email"
      value={email}
      onChange={handleEmailChange}
      error={emailError}
      hint="Asla paylaşılmayacak"
      required
      showValidation
      isValid={!emailError && email.length > 0}
    />
  );
}
```

### 📝 Toplu Form Validasyonu

```typescript
import { validateForm, validateEmail, validatePassword } from '@/lib/validation/formValidation';
import { useNotifications } from '@/lib/notifications/notificationManager';

function LoginForm() {
  const { error, success } = useNotifications();
  const [formData, setFormData] = React.useState({ email: '', password: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Toplu validasyon
    const result = validateForm(formData, {
      email: validateEmail,
      password: (pwd) => validatePassword(pwd, 8),
    });

    if (!result.isValid) {
      // Hataları state'e kaydet
      const errorMap: Record<string, string> = {};
      result.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);

      // Kullanıcıya bildir
      error({
        title: 'Form Hataları',
        description: `${result.errors.length} hata bulundu. Lütfen düzeltin.`,
      });
      return;
    }

    // Gönder
    success({
      title: 'Başarılı!',
      description: 'Form gönderildi.',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        required
      />
      <FormInput
        label="Parola"
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        error={errors.password}
        required
      />
      <button type="submit">Giriş Yap</button>
    </form>
  );
}
```

---

## Async İşlemlere Try-Catch Ekleme

### ❌ Eski Yöntem (Hata İşleme Yok)
```typescript
const handleSave = async () => {
  const response = await fetch('/api/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const result = await response.json();
  console.log(result);
};
```

### ✅ Yeni Yöntem (Hata İşleme ile)
```typescript
import { apiClient } from '@/lib/api/apiClient';
import { useNotifications } from '@/lib/notifications/notificationManager';

function MyComponent() {
  const { success, error, loading } = useNotifications();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    const loadingToast = loading('Kaydediliyor...', 'Lütfen bekleyin');

    try {
      const response = await apiClient.post('/api/contact', {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello!',
      });

      if (response.success) {
        success({
          title: 'Başarılı!',
          description: 'Veriler kaydedildi.',
        });
      }
    } catch (err) {
      error({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
        code: 'SAVE_FAILED',
        recoverable: true,
        recoverySteps: [
          'İnternet bağlantınızı kontrol edin',
          'Tekrar deneyin',
          'Sorun devam ederse destek ile iletişime geçin',
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return <button onClick={handleSave} disabled={isLoading}>Kaydet</button>;
}
```

---

## Onay Dialog'u Ekleme

### ❌ Eski Yöntem (Onay Yok)
```typescript
const handleDelete = () => {
  deleteItem();
};
```

### ✅ Yeni Yöntem (Onay Dialog ile)
```typescript
import { ConfirmationDialog, useConfirmationDialog } from '@/components/ui/ConfirmationDialog';

function DeleteButton() {
  const { open, setOpen, confirm, ...dialogProps } = useConfirmationDialog();

  const handleDelete = () => {
    confirm({
      title: 'Sil?',
      description: 'Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?',
      variant: 'danger',
      confirmText: 'Sil',
      cancelText: 'İptal',
      onConfirm: async () => {
        await deleteItem();
      },
    });
  };

  return (
    <>
      <button onClick={handleDelete} className="text-red-600">
        Sil
      </button>
      <ConfirmationDialog open={open} onOpenChange={setOpen} {...dialogProps} />
    </>
  );
}
```

---

## Hata İşleme Ekleme

### ❌ Eski Yöntem (Sessiz Hata)
```typescript
const handleFetch = async () => {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    setData(data);
  } catch (err) {
    console.error(err); // Sadece console'a yazılır
  }
};
```

### ✅ Yeni Yöntem (Hata Gösterimi ile)
```typescript
import { useNotifications } from '@/lib/notifications/notificationManager';
import { apiClient, ApiError } from '@/lib/api/apiClient';

function DataComponent() {
  const { success, error, critical } = useNotifications();
  const [data, setData] = React.useState(null);

  const handleFetch = async () => {
    try {
      const response = await apiClient.get('/api/data');

      if (response.success) {
        setData(response.data);
        success({
          title: 'Başarılı',
          description: 'Veriler yüklendi.',
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NETWORK_ERROR') {
          critical({
            title: 'Ağ Hatası',
            description: 'İnternet bağlantınızı kontrol edin.',
            code: err.code,
            recoverable: true,
            recoverySteps: [
              'WiFi bağlantınızı kontrol edin',
              'Sayfayı yenileyin',
              'Tekrar deneyin',
            ],
          });
        } else if (err.code === 'REQUEST_TIMEOUT') {
          error({
            title: 'Zaman Aşımı',
            description: 'İstek çok uzun sürdü. Tekrar deneyin.',
            code: err.code,
            recoverable: true,
          });
        } else {
          error({
            title: 'Hata',
            description: err.message,
            code: err.code,
          });
        }
      } else {
        error({
          title: 'Bilinmeyen Hata',
          description: 'Beklenmeyen bir hata oluştu.',
        });
      }
    }
  };

  return <button onClick={handleFetch}>Yükle</button>;
}
```

---

## 🎯 Entegrasyon Kontrol Listesi

### Adım 1: Bileşeni Hazırla
- [ ] `useNotifications` hook'u import et
- [ ] `useConfirmationDialog` hook'u import et (gerekirse)
- [ ] `FormInput` bileşenini import et (gerekirse)

### Adım 2: Alert'leri Değiştir
- [ ] Tüm `alert()` çağrılarını `error()`, `success()`, `warning()` ile değiştir
- [ ] Uygun başlık ve açıklama ekle
- [ ] Hata kodları ekle

### Adım 3: Validasyon Ekle
- [ ] Form alanlarına validasyon fonksiyonları ekle
- [ ] `FormInput` bileşenini kullan
- [ ] Hata mesajlarını göster

### Adım 4: Try-Catch Ekle
- [ ] Async işlemleri try-catch ile sarı
- [ ] Hata durumunda `error()` çağır
- [ ] Başarı durumunda `success()` çağır

### Adım 5: Onay Dialog'u Ekle
- [ ] Yıkıcı işlemler için onay dialog'u ekle
- [ ] Uygun varyant seç (danger, warning, vb.)
- [ ] Onay işlemini async yap

### Adım 6: Test Et
- [ ] Geçerli girdilerle test et
- [ ] Geçersiz girdilerle test et
- [ ] Ağ hatalarını simüle et
- [ ] Erişilebilirliği test et

---

## 📚 Örnek Dosyalar

### Tam Örnek: Geliştirilmiş Form
```typescript
'use client';

import React from 'react';
import { FormInput } from '@/components/ui/FormInput';
import { ConfirmationDialog, useConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useNotifications } from '@/lib/notifications/notificationManager';
import { validateForm, validateEmail, validatePassword } from '@/lib/validation/formValidation';
import { apiClient } from '@/lib/api/apiClient';

export function AdvancedForm() {
  const { success, error } = useNotifications();
  const { open, setOpen, confirm, ...dialogProps } = useConfirmationDialog();

  const [formData, setFormData] = React.useState({ email: '', password: '' });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Validasyon
    const validator = field === 'email' ? validateEmail : (pwd: string) => validatePassword(pwd, 8);
    const error = validator(value);
    setErrors(prev => ({
      ...prev,
      [field]: error?.message || '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Toplu validasyon
    const result = validateForm(formData, {
      email: validateEmail,
      password: (pwd) => validatePassword(pwd, 8),
    });

    if (!result.isValid) {
      const errorMap: Record<string, string> = {};
      result.errors.forEach(err => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      error({
        title: 'Form Hataları',
        description: `${result.errors.length} hata bulundu.`,
      });
      return;
    }

    // Onay dialog'u göster
    confirm({
      title: 'Gönder?',
      description: 'Formu göndermek istediğinizden emin misiniz?',
      onConfirm: async () => {
        await submitForm();
      },
    });
  };

  const submitForm = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/contact', formData);
      if (response.success) {
        success({
          title: 'Başarılı!',
          description: 'Form gönderildi.',
        });
        setFormData({ email: '', password: '' });
      }
    } catch (err) {
      error({
        title: 'Hata',
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          required
          showValidation
          isValid={!errors.email && formData.email.length > 0}
        />
        <FormInput
          label="Parola"
          type="password"
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors.password}
          required
          showValidation
          isValid={!errors.password && formData.password.length > 0}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Gönderiliyor...' : 'Gönder'}
        </button>
      </form>

      <ConfirmationDialog open={open} onOpenChange={setOpen} {...dialogProps} />
    </>
  );
}
```

---

## 🔗 İlgili Dosyalar

- Validasyon: `src/lib/validation/formValidation.ts`
- Bildirimler: `src/lib/notifications/notificationManager.ts`
- API İstemcisi: `src/lib/api/apiClient.ts`
- Form Input: `src/components/ui/FormInput.tsx`
- Onay Dialog: `src/components/ui/ConfirmationDialog.tsx`
- Hata Boundary: `src/components/ui/AppErrorBoundary.tsx`

---

## 📞 Sorular?

Detaylı bilgi için `ERROR_HANDLING_GUIDE.md` dosyasını okuyun.

---

**Güncelleme Tarihi**: 2026-06-20  
**Versiyon**: 1.9.2
