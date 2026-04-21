# Performance Sprint Notes - 2026-04-21

## Uygulanan teknik degisiklikler

1. Hero gorseli cross-origin kaynaktan cikarilip local static dosyaya alindi:
   - `/public/media/hero-768.jpg`
   - `/public/media/hero-1280.jpg`
   - `/public/media/hero-1920.jpg`
2. Hero preload ve srcset local dosyalara tasindi:
   - `index.html`
   - `components/Hero.tsx`
3. CLS stabilizasyonu icin global stiller eklendi:
   - `scrollbar-gutter: stable`
   - `.material-symbols-outlined` icin sabit kutu olculeri

## Local Lighthouse (mobile) - after patch

URL: `http://127.0.0.1:4173/` (vite preview)

- Performance: **96**
- FCP: **1.9 s**
- LCP: **2.4 s**
- CLS: **0.018**
- TBT: **20 ms**

Kaynak dosya (lokal): `reports/lighthouse-mobile-local-after.json`

## Local Lighthouse (mobile) - app-shell + lazy load

URL: `http://127.0.0.1:4173/` (vite preview)

- Performance: **95**
- FCP: **1.2 s**
- LCP: **2.8 s**
- CLS: **0.045**
- TBT: **10 ms**

Kaynak dosya (lokal): `reports/lighthouse-mobile-local-appshell.json`

## Canli Lighthouse (mobile) - yeniden olcum

URL: `https://nisankoltukyikama.com/`

- Before (2026-04-21 baseline):
  - Performance: **41**
  - FCP: **8.1 s**
  - LCP: **8.5 s**
  - CLS: **0.33**
- After (2026-04-21):
  - Performance: **58**
  - FCP: **7.9 s**
  - LCP: **7.9 s**
  - CLS: **0**

- After app-shell + lazy (2026-04-21):
  - Performance: **93**
  - FCP: **2.0 s**
  - LCP: **2.2 s**
  - CLS: **0**

Kaynak dosyalar (lokal):
- `reports/lighthouse-mobile-baseline.json`
- `reports/lighthouse-mobile-live-after-lazy.json`
- `reports/lighthouse-mobile-live-after-appshell.json`

## Not

Performans sprintinin ana hedefleri bu turda karsilandi. Sonraki turda desktop parity ve script budget optimizasyonu devam edecek.
