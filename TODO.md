# NisanProClean - Proje Backlog ve Yol Haritasi

Bu backlog 3 sprint mantigiyla tutulur:

1. Olcum ve teknik temel
2. Performans ve sayfa mimarisi
3. CRO ve AI kanal entegrasyonu

Not:
Asagidaki isaretler 2026-04-20 canli dogrulama sonucuna gore guncellendi.

## Sprint 1 - Olcum ve Teknik Temel

- [x] `robots.txt` dosyasini repo ve canlida aktif et
- [ ] `sitemap.xml` uret ve Search Console'a gonder (sitemap canlida aktif, Search Console gonderimi bekliyor)
- [x] Tum indexlenebilir sayfalara `canonical` ekle
- [ ] `GA4` kur
- [ ] `GSC` kur ve domain dogrulamasini tamamla
- [x] `call_click`, `whatsapp_click`, `form_submit` event'lerini ekle
- [x] Clarity setup: sadece prod hostlarda calisacak sekilde aktif et ve export API ile dogrula
- [ ] `Google Business Profile` optimizasyonunu tamamla
- [ ] NAP tutarliligini kontrol et
- [ ] KVKK aydinlatma, gizlilik politikasi ve cerez metinlerini yayinla
- [ ] Consent mode / cerez onay akisini ekle
- [ ] Form guvenligini tamamla
- [ ] `CSRF`, server-side validation, spam korumasi ve rate limit kontrollerini tamamla
- [ ] Canli sitede schema dogrulamasi yap
- [ ] Mobil Lighthouse baz skorlarini kaydet
- [x] `http/https`, `www/non-www`, slash/no-slash yonlendirme disiplinini kontrol et
- [x] Security headers'i canlida teyit et
- [x] `HSTS`, `CSP`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, `X-Content-Type-Options`
CSP su an minimal (`upgrade-insecure-requests`). Ileride stricter CSP policy yazilacak.
- [ ] GSC index coverage ve enhancement raporlarini ilk baz olarak kaydet

## Sprint 2 - Performans ve Sayfa Mimarisi

- [ ] `LCP`, `FCP`, `CLS` ve `INP` odakli performans sprinti yap
- [ ] Hero ve ust bolum gorsellerini daha da optimize et
- [ ] Font yukleme stratejisini optimize et
- [ ] Gorsel standardi belirle
- [ ] `WebP/AVIF`, sabit boyut, responsive image kural seti uygula
- [ ] Gereksiz ucuncu parti script budget'i koy
- [ ] Performans budget tanimla
- [ ] Ilk ekran CTA'larini mobilde daha gorunur hale getir
- [ ] Ana hizmetler icin ayri URL ac
- [ ] `/koltuk-yikama/`
- [ ] `/yatak-yikama/`
- [ ] `/arac-koltugu-yikama/`
- [ ] `/sandalye-yikama/`
- [ ] Her hizmet sayfasina ayri H1, FAQ, surec, fiyat mantigi ve CTA koy
- [ ] Hizmet sayfalari icin ic linkleme planini kur
- [ ] `Breadcrumb` schema ekle
- [ ] Afyon merkez ve oncelikli mahalle/ilce landing page'leri ac

## Sprint 3 - CRO ve AI Kanal Entegrasyonu

- [ ] Once/sonra vaka icerikleri ekle
- [ ] Yorum toplama akislarini kur
- [ ] Yorumlari sayfa ici guven katmanina ve structured data tarafina bagla
- [ ] Admin panelde lead kaynak raporu ekle
- [ ] Lead pipeline status yapisini netlestir
- [ ] `new`, `contacted`, `appointment`, `won`, `lost`
- [ ] WhatsApp ve Instagram mesajlarini tek yerde toplayan AI ajan mimarisini kur
- [ ] Webhook guvenligi ve loglamayi ekle
- [ ] AI ajan icin insan devri fallback akisini tanimla
- [ ] Twilio ile sesli cagri PoC baslat
- [ ] UTM ve source bazli lead attribution raporu ekle
- [ ] Remarketing ve donusum optimizasyon testleri yap

## Oncelik Sirasi

1. `robots.txt` + `sitemap.xml` + `canonical`
2. `GA4` + `GSC` + event tracking
3. Mobil performans
4. Hizmet URL'leri
5. Lokasyon sayfalari
6. KVKK / gizlilik / cerez
7. AI kanal entegrasyonu
