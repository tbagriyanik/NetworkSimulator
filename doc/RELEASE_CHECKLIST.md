# 🚀 Release & Versioning Checklist (Tek Kaynaktan Senkronizasyon Kılavuzu)

Bu doküman, yeni bir sürüm yayınlanırken rozetlerin (badge), metriklerin, `package.json` dosyasının ve dokümantasyonun tek bir kaynak üzerinden tutarlı tutulması ve harici CDN önbellek gecikmelerinin (raw CDN lag) önlenmesi için izlenmesi gereken adımları içerir.

---

## 📌 1. Tek Kaynaktan Senkronizasyon (Single Source of Truth)

Tüm sürüm ve metrik bilgileri doğrudan `package.json` ve `src/` altındaki gerçek kaynak kod üzerinden türetilir:

1. **Sürüm Numarası:** `package.json` içerisindeki `"version"` alanı tek ana kaynaktır.
2. **Rozetler ve Tablolar:** `npm run update-readme` betiği (`scripts/update-readme-badges.cjs`), `package.json` sürümünü okuyarak `README.md` içerisindeki sürüm rozetini, toplam satır rozetini ve durum tablosunu otomatik senkronize eder.
3. **Paket Yöneticisi Bağımsızlığı:** `pnpm` ve benzeri paket yöneticileri yalnızca geliştirme ve derleme aracı olarak kullanılır; uygulamanın çalışma zamanı (`dependencies`) bağımlılıklarında yer almaz.

---

## 📋 2. Sürüm Yayınlama Kontrol Listesi (Release Checklist)

Yeni bir sürüm (`vX.Y.Z`) hazırlanırken aşağıdaki adımları sırasıyla uygulayın:

### Adım 1: Sürüm Numarasını Güncelleyin
* `package.json` dosyasındaki `"version"` alanını yeni sürüme yükseltin (ör. `6.8.0`).
* `src-tauri/tauri.conf.json` dosyasındaki `"version"` alanını eşitleyin.

### Adım 2: Rozetleri ve Metrik Tablosunu Otomatik Senkronize Edin
```bash
npm run update-readme
```
*Bu komut `README.md` dosyasındaki sürüm rozetini, toplam satır sayısını ve kaynak/doküman dosya sayılarını anında günceller.*

### Adım 3: Sürüm Notlarını Ekleyin
* `doc/history.md` dosyasının en üstüne yeni sürüm başlığını ve yapılan geliştirmeleri ekleyin.
* `doc/training/ProjeOzellikleri.md` içerisine yeni yetenek tablosunu ekleyin.
* `doc/DOCUMENTATION_INDEX.md` dosyasındaki kontrol listesini güncelleyin.

### Adım 4: Kod Doğrulama ve Derleme
```bash
npm run check
npm run build:exe
```

### Adım 5: Git Tag ve Release Dağıtımı
```bash
git add .
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

---

## ⚡ 3. CDN & Shields.io Önbellek Gecikmelerini (Lag) Önleme

* Shields.io ve GitHub ham içerik CDN'leri statik rozetleri belirli bir süre önbelleğe alabilir.
* `scripts/update-readme-badges.cjs` betiği, dinamik badge URL'lerini doğrudan statik sürüm metniyle (`https://img.shields.io/badge/version-${version}-blue`) yazarak harici API sorgularına bağlı kalmadan anlık ve tutarlı görüntülenmesini sağlar.
