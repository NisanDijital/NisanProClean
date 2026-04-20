# Google Search Console Runbook

Bu dosya `nisankoltukyikama.com` icin GSC kurulumunu hizli tamamlamak icin hazirlandi.

## 1) Property dogrulama

- Property tipi: `Domain` (`nisankoltukyikama.com`)
- DNS TXT kaydi ile dogrulama yap.
- Dogrulamadan sonra property secimi: `nisankoltukyikama.com` (URL prefix degil).
- Operasyonel onerilen kullanim: sadece bu `Domain property` aktif izleme icin kullanilsin.
- Ayni siteye ait URL-prefix property'ler zorunlu degil; silinebilir veya pasif birakilabilir.

## 2) Sitemap gonderimi

- GSC menusu: `Indexing` -> `Sitemaps`
- Yeni sitemap:
  - `https://nisankoltukyikama.com/sitemap.xml`
- Beklenen durum: `Success`

## 3) URL Inspection oncelik listesi

Asagidaki URL'leri tek tek `URL Inspection` kutusuna yapistir:

1. `https://nisankoltukyikama.com/`
2. `https://nisankoltukyikama.com/koltuk-yikama/`
3. `https://nisankoltukyikama.com/yatak-yikama/`
4. `https://nisankoltukyikama.com/arac-koltugu-yikama/`
5. `https://nisankoltukyikama.com/sandalye-yikama/`
6. `https://nisankoltukyikama.com/afyon-merkez-koltuk-yikama/`
7. `https://nisankoltukyikama.com/erenler-koltuk-yikama/`
8. `https://nisankoltukyikama.com/uydukent-koltuk-yikama/`
9. `https://nisankoltukyikama.com/erkmen-koltuk-yikama/`
10. `https://nisankoltukyikama.com/sahipata-koltuk-yikama/`
11. `https://nisankoltukyikama.com/sandikli-koltuk-yikama/`
12. `https://nisankoltukyikama.com/bolvadin-koltuk-yikama/`
13. `https://nisankoltukyikama.com/emirdag-koltuk-yikama/`

Her URL icin:

- `Test live URL`
- Sonra `Request indexing`

## 4) Ilk 48 saat takip

- `Indexing` -> `Pages` raporunda:
  - `Crawled - currently not indexed`
  - `Discovered - currently not indexed`
  durumlarini izle.
- `Enhancements` tarafinda schema uyari/hata var mi kontrol et.
- `Performance` raporunda sorgularin gelmesi 1-3 gun surebilir.

## 5) Teknik kontrol notu

Mevcut teknik durum:

- `robots.txt` canlida aktif ve `sitemap` referansi var.
- `sitemap.xml` canlida aciliyor ve lokasyon URL'lerini iceriyor.
- Lokasyon sayfalarinda `Service`, `BreadcrumbList`, `FAQPage`, `LocalBusiness` JSON-LD var.

## 6) Otomatik Search Console submit (deploy sonrasi)

Repo artik her build'de `public/sitemap.xml` dosyasini otomatik uretir.
Deploy workflow'u da opsiyonel olarak Search Console API'ye sitemap submit eder.

Gerekli GitHub Secrets:

- `GSC_CLIENT_ID`
- `GSC_CLIENT_SECRET`
- `GSC_REFRESH_TOKEN`

Notlar:

- Bu secret'lar yoksa deploy yine basarili olur, sadece GSC submit adimi atlanir.
- URL bazli manuel `Request indexing` kadar agresif degildir; temel amac sitemap'i otomatik guncel tutmaktir.

## 7) Clarity vs GSC trafik farki icin otomatik rapor

Repo'da gunluk rapor workflow'u vardir:

- Workflow: `.github/workflows/traffic-gap-report.yml`
- Script: `scripts/traffic-gap-report.mjs`
- Cikti: `reports/traffic-gap-*.md` ve `reports/traffic-gap-*.json` (artifact olarak saklanir)

Gerekli GitHub Secrets:

- `CLARITY_EXPORT_TOKEN` (Clarity live insights icin)
- `GSC_CLIENT_ID`
- `GSC_CLIENT_SECRET`
- `GSC_REFRESH_TOKEN`
