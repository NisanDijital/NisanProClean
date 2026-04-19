# NisanProClean

NisanProClean, Afyonkarahisar ve çevresinde profesyonel yerinde koltuk, yatak ve araç koltuk temizliği hizmetleri sunan yeni nesil bir temizlik firmasıdır. 

Bu proje; sıradan bir kurumsal tanıtım sitesi olmak yerine, müşteri psikolojisine hitap eden ve doğrudan satışa yönelik tasarlanmış akıllı bir platformdur.

## Pazarlama ve Satış Özellikleri

* **Akıllı Fiyat Hesaplayıcı:** Ziyaretçilerin kendi eşyalarını seçerek anında sepet tutarı oluşturabilmesini sağlar.
* **ProClean Care (Kasko Abonelik Sistemi):** Hizmet sektörüne uyarlanmış aylık ödemeli (Gümüş, Altın, Platin) koruma ve abonelik paketleri. Sepet tutarına göre akıllı "Upsell" (üst paket önerme) yapar.
* **Canlı Sosyal Kanıt (FOMO):** Sayfanın sol alt köşesinde gerçek zamanlı "x kişi şu an inceliyor", "y kişi az önce Altın Kasko aldı" gibi psikolojik tetikleyici bildirimler çıkarır.
* **Müşteri Yönlendirme (Referans) Programı:** Arkadaşını getirene nakit iade (cashback) vadederek kulaktan kulağa pazarlamayı teşvik eder.
* **Lekeni Çek Gönder:** WhatsApp hızlı iletişim butonu aracılığıyla, üşengeç müşterilerden fotoğraf isteyerek hızlı fiyatlandırma sağlar.
* **SEO Odaklı İçerik (Bait-and-Switch):** "Koltuk yıkama makinesi alınır mı", "Koltuk neyle silinir" gibi yüksek hacimli internet aramalarını yakalayıp profesyonel hizmete yönlendiren özel blog mimarisi.

## Teknoloji Altyapısı

* **Frontend:** React, TypeScript, Tailwind CSS
* **Build Aracı:** Vite
* **İkonlar:** Google Material Symbols
* **Responsive Tasarım:** Mobil öncelikli (Mobile First) sorunsuz görünüm.

## Kurulum ve Çalıştırma

Geliştirme ortamını bilgisayarınızda başlatmak için aşağıdaki komutları kullanabilirsiniz:

```bash
# Kurulum
npm install

# Geliştirme Sunucusunu Başlatma
npm run dev

# Üretim (Production) İçin Derleme
npm run build
```

## GitHub Actions ile Otomatik Deploy

Repo icine `.github/workflows/deploy-frontend.yml` eklendi.
`main` branch'e her push atildiginda:

1. `npm ci`
2. `npm run -s lint`
3. `npm run -s build`
4. `dist/` klasoru FTP ile canliya yuklenir

GitHub repository secrets olarak su alanlari ekleyin:

- `FTP_SERVER` (ornek: `ftp.nisankoltukyikama.com`)
- `FTP_USERNAME` (ornek: `u171467859.deploytmp` veya canli hesap)
- `FTP_PASSWORD`
- `FTP_SERVER_DIR` (ornek: `/` veya `/public_html/`)

Workflow'u manuel calistirmak icin Actions ekranindan `Deploy Frontend` -> `Run workflow` kullanabilirsiniz.

## Clarity Kurulumu (Detayli)

Clarity entegrasyonu artik runtime tarafinda yonetiliyor:
- Sadece izin verilen hostlarda (varsayilan: `nisankoltukyikama.com`, `www.nisankoltukyikama.com`) script yuklenir.
- Boylece dev/staging URL'leri Clarity datasini kirletmez.
- `call_click`, `whatsapp_click`, `form_submit` event'leri Clarity custom event/tag olarak da gonderilir.

### 1) Env Degerleri

`.env` dosyasina su alanlari girin:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_CLARITY_PROJECT_ID=xxxxxxxxxx
VITE_CLARITY_ALLOWED_HOSTS=nisankoltukyikama.com,www.nisankoltukyikama.com
```

Not:
- Clarity `Project ID` degeri dashboarddaki script kodundan gelir.
- `VITE_CLARITY_ALLOWED_HOSTS` bos birakilirsa varsayilan prod host listesi kullanilir.

### 2) Canli Dogrulama

Tarayici konsolunda:
- `window.clarity` fonksiyonu tanimli olmali.
- Test olarak sayfada WhatsApp veya telefon CTA tiklandiginda custom event akisina dusmeli.

### 3) Clarity Data Export ile Hizli Rapor

Repo icinde rapor scripti var:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\clarity-live-insights.ps1 -Token "<CLARITY_JWT>" -Days 1
```

Script prod URL filtreli olarak su metrikleri verir:
- `Traffic`
- `DeadClickCount`
- `RageClickCount`
- `QuickbackClick`
- `EngagementTime`
- `ScrollDepth`

### 4) Onemli Operasyon Notu

Clarity API rate-limit (`429`) verebilir. Bu durumda 30-60 saniye bekleyip tekrar deneyin.
