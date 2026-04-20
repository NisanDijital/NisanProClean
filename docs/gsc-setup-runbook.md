# Google Search Console Runbook

Bu dosya `nisankoltukyikama.com` icin GSC kurulumunu hizli tamamlamak icin hazirlandi.

## 1) Property dogrulama

- Property tipi: `Domain` (`nisankoltukyikama.com`)
- DNS TXT kaydi ile dogrulama yap.
- Dogrulamadan sonra property secimi: `nisankoltukyikama.com` (URL prefix degil).

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
