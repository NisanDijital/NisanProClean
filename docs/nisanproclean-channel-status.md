# NisanProClean - Kanal Durum Notu

Bu belge, NisanProClean projesindeki Search Console, GA4 ve Clarity kurulum durumunu tek yerde toplar.

## Tamamlananlar

### 1) Google Search Console (GSC)
- Property: `sc-domain:nisankoltukyikama.com`
- `sitemap.xml` submit akisi calistirildi
- Sitemap URL'leri icin indexing request otomasyonu tetiklendi
- Ilk baseline loglari alindi

### 2) Google Analytics 4 (GA4)
- GA4 entegrasyonu aktif
- Event tracking aktif:
  - `call_click`
  - `whatsapp_click`
  - `form_submit`
  - `ga4_realtime_ping`
- Consent akisi ile uyumlu calisacak sekilde baglandi

### 3) Microsoft Clarity
- Clarity entegrasyonu aktif
- Sadece production hostlarda calisacak sekilde sinirlandi
- Event baglantilari ve export tabanli kontrol akisi projeye eklendi

## Kalan Sprint 1 Isleri

1. Canli schema dogrulamasi
2. NAP (Name/Address/Phone) tutarliligi
3. Google Business Profile optimizasyonu

## Referans Dokumanlar

- `docs/seo-baseline-2026-04-21.md`
- `docs/performance-sprint-2026-04-21.md`
- `TODO.md`
