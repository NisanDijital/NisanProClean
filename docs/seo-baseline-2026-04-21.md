# SEO Baseline - 2026-04-21

Bu belge, 2026-04-21 tarihinde canli site icin alinan ilk teknik baseline kaydidir.

## 1) Lighthouse (canli URL)

URL: `https://nisankoltukyikama.com/`

### Mobile
- Performance: **41**
- FCP: **8.1 s**
- LCP: **8.5 s**
- CLS: **0.33**
- TBT: **0 ms**

Kaynak dosya (lokal): `reports/lighthouse-mobile-baseline.json`

### Desktop
- Performance: **85**
- FCP: **1.3 s**
- LCP: **1.6 s**
- CLS: **0.012**
- TBT: **0 ms**

Kaynak dosya (lokal): `reports/lighthouse-desktop-baseline.json`

## 2) Search Console (GSC) otomasyon sonucu

- Property: `sc-domain:nisankoltukyikama.com`
- Sitemap submit adimi tetiklendi
- Sitemap'ten cekilen URL sayisi: **18**
- URL Inspection -> Request Indexing aksiyonu: **18/18 clicked**
- Sonuc: `confirmed=0`, `clicked_only=18`, `unavailable=0`

Kaynak log (lokal): `reports/gsc/2026-04-20T23-57-58-330Z-gsc-run.log`

Not:
`clicked_only` sonucu, GSC tarafinda popup metni gorulmeden buton tiklandigini ifade eder. Bu nedenle Coverage/Enhancement ekrani ertesi gun manuel kontrol edilerek nihai durum teyit edilmelidir.
