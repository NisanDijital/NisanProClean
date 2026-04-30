# NisanProClean - Proje Backlog ve Yol Haritasi

Bu backlog 3 sprint mantigiyla tutulur:

1. Olcum ve teknik temel
2. Performans ve sayfa mimarisi
3. CRO ve AI kanal entegrasyonu

Not:
Asagidaki isaretler 2026-04-20 canli dogrulama sonucuna gore guncellendi.

## Sprint 1 - Olcum ve Teknik Temel

- [x] `robots.txt` dosyasini repo ve canlida aktif et
- [x] `sitemap.xml` uret ve Search Console'a gonder (2026-04-21: `scripts/gsc-submit.mjs` ile gonderim akisi calistirildi)
- [x] Tum indexlenebilir sayfalara `canonical` ekle
- [x] `GA4` kur (fallback measurement id + `ga4_realtime_ping` eventi eklendi)
- [x] `GSC` kur ve domain dogrulamasini tamamla (2026-04-21: `sc-domain:nisankoltukyikama.com` uzerinde otomasyon calisti)
- [x] `call_click`, `whatsapp_click`, `form_submit` event'lerini ekle
- [x] Clarity setup: sadece prod hostlarda calisacak sekilde aktif et ve export API ile dogrula
- [x] `Google Business Profile` optimizasyonunu tamamla (2026-04-22: `docs/gbp-optimization-pack-2026-04-22.md` hazirlandi)
- [x] NAP tutarliligini kontrol et (2026-04-22: `npm run nap:check` OVERALL_OK=true)
- [x] KVKK aydinlatma, gizlilik politikasi ve cerez metinlerini yayinla
- [x] Consent mode / cerez onay akisini ekle
- [x] Form guvenligini tamamla
- [x] `CSRF`, server-side validation, spam korumasi ve rate limit kontrollerini tamamla
- [x] Canli sitede schema dogrulamasi yap (2026-04-22: `npm run schema:check:live` OVERALL_OK=true)
- [x] Mobil Lighthouse baz skorlarini kaydet (2026-04-21: mobile score 41, FCP 8.1s, LCP 8.5s, CLS 0.33)
- [x] `http/https`, `www/non-www`, slash/no-slash yonlendirme disiplinini kontrol et
- [x] Security headers'i canlida teyit et
- [x] `HSTS`, `CSP`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
CSP su an minimal (`upgrade-insecure-requests`). Ileride stricter CSP policy yazilacak.
- [x] GSC index coverage ve enhancement raporlarini ilk baz olarak kaydet (2026-04-21: 18 URL icin request indexing aksiyonu tetiklendi, log raporu olustu)

## Sprint 2 - Performans ve Sayfa Mimarisi

- [x] `LCP`, `FCP`, `CLS` ve `INP` odakli performans sprinti yap (2026-04-21: canli mobile score 93, FCP 2.0s, LCP 2.2s, CLS 0)
- [x] Hero ve ust bolum gorsellerini daha da optimize et
- [x] Font yukleme stratejisini optimize et
- [x] Gorsel standardi belirle
- [x] `WebP/AVIF`, sabit boyut, responsive image kural seti uygula
- [x] Gereksiz ucuncu parti script budget'i koy
- [x] Performans budget tanimla
- [x] Ilk ekran CTA'larini mobilde daha gorunur hale getir
- [x] Ana hizmetler icin ayri URL ac
- [x] `/koltuk-yikama/`
- [x] `/yatak-yikama/`
- [x] `/arac-koltugu-yikama/`
- [x] `/sandalye-yikama/`
- [x] Her hizmet sayfasina ayri H1, FAQ, surec, fiyat mantigi ve CTA koy
- [x] Hizmet sayfalari icin ic linkleme planini kur
- [x] `Breadcrumb` schema ekle
- [x] Afyon merkez ve oncelikli mahalle/ilce landing page'leri ac

### Keyword aksiyonlari (2026-04-21 CSV)

- [x] Keyword export analizi tamamlandi (85 satir, ana kumeler: koltuk 28, arac 24, yatak 23, sandalye 5)
- [x] "fiyat" niyetine ozel landing page ac (`/fiyatlar/`) ve servis bazli fiyat bloklari ekle
- [x] "yerinde koltuk yikama" niyetini mevcut `/koltuk-yikama/` sayfasinda H2 + FAQ + internal link ile guclendir
- [x] "arac ici koltuk yikama / arac koltuk temizleyici" niyetini `/arac-koltugu-yikama/` sayfasinda ayri alt bolumlerle isle
- [x] "evde yatak yikama fiyatlari" icin `/yatak-yikama/` sayfasinda lokal fiyat/SSS bolumu ac
- [x] Yazim varyasyonlarini (yikama/yikama, fiyatlari/fiyatlari) FAQ ve blog iceriginde dogal sekilde kapsa

## Sprint 3 - CRO ve AI Kanal Entegrasyonu

- [ ] Once/sonra vaka icerikleri ekle
- [ ] Yorum toplama akislarini kur
- [ ] Yorumlari sayfa ici guven katmanina ve structured data tarafina bagla
- [x] Admin panelde lead kaynak raporu ekle
- [x] Lead pipeline status yapisini netlestir (`Yeni lead > Arandi > Teklif verildi > Randevu > Tamamlandi > Yorum istendi`)
- [x] Standart mesaj setini olustur (`docs/mesaj-sablonlari.md`)
- [ ] WhatsApp ve Instagram mesajlarini tek yerde toplayan AI ajan mimarisini kur
- [ ] Webhook guvenligi ve loglamayi ekle
- [ ] AI ajan icin insan devri fallback akisini tanimla
- [ ] Twilio ile sesli cagri PoC baslat
- [x] UTM ve source bazli lead attribution raporu ekle
- [ ] Remarketing ve donusum optimizasyon testleri yap
- [x] AI ekip rol dagilimi ve isletim modeli dokumante et (`docs/ai-ekip-isletim-sistemi.md`)

## Denetim Checklisti (2026-04-26)

Bu bolum, son kapsamli analiz raporundan cikan aksiyonlari tek yerde takip etmek icin eklendi.

### A) Kritik Teknik / Performans

- [ ] TTFB 5s+ problemini kalici olarak kapat (hedef: < 1.0s)
- [x] HTML ve asset cache politikasini sikilastir (`.htaccess` cache-control + expires)
- [x] Kritik olmayan bolumleri lazy-load et (AI modulu, fiyat araci, alt bolumler)
- [ ] Canli PSI desktop skorunu 70+ bandina sabitle
- [ ] Canli PSI mobile skorunu 90+ bandinda stabil tut
- [ ] Lighthouse olcumleri icin haftalik "median" takip raporu olustur

### B) SEO Render / Icerik Gorunurlugu

- [ ] SPA render riskine karsi prerender/SSR karari al ve uygula (Prerender.io veya Next.js gecis karari)
- [x] Canonical, robots, sitemap, schema temel seti aktif tut
- [ ] Heading hiyerarsisini kaynakta da guclendir (H1-H2-H3 kontrol listesi)
- [ ] Blog sayfalari icin meta description ve title zenginlestirme turu yap

### C) CRO / Guven Katmani

- [ ] Hero alanina once-sonra kanit gorsellerini ekle
- [ ] "50+ yorum" iddiasini gercek veriyle hizala (gosterilen kart + kaynak tutarliligi)
- [x] "Esya koruma sigortasi - Yakinda" metnini netlestir (2026-04-26: hero metni kaldirildi, yerine desteklenebilir guvence dili yazildi)
- [ ] Fiyat hesaplama -> randevu akisini tek akista kisalt (multi-step sadeleştirme)

### D) Google Isletme Profili (birlikte acilacak)

- [ ] Google Business Profile kaydini ac / sahiplik dogrulamasini tamamla
- [x] GBP launch kit ve 30 gunluk post plani hazirla (`docs/gbp-launch-kit-2026-04-30.md`, `docs/gbp-post-plan-30-days-2026-04-30.md`)
- [ ] NAP bilgilerini birebir site ile hizala (ad, telefon, hizmet bolgesi)
- [ ] Haftalik GBP icerik rutini baslat (post + gorsel + yorum talebi)
- [ ] GBP linkini schema `sameAs` ve footer ile net bagla

## Oncelik Sirasi

1. `robots.txt` + `sitemap.xml` + `canonical`
2. `GA4` + `GSC` + event tracking
3. Mobil performans
4. Hizmet URL'leri
5. Lokasyon sayfalari
6. KVKK / gizlilik / cerez
7. AI kanal entegrasyonu
