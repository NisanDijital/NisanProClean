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

## Not

Canli ortam metriği icin deploy sonrasi yeniden olcum alinmalidir.
