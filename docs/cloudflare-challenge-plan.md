# NisanProClean Cloudflare Challenge Plan

Amac: public sayfalar ziyaretci ve arama motoru icin akici kalsin, riskli uclar korunmaya devam etsin.

## Sorun

- Public sayfalar bazen `Bot Verification` ekranina dusuyor.
- Bu durum:
  - SEO araclarini,
  - kesif botlarini,
  - bazi ilk ziyaretcileri,
  - reklam veya sosyal medya onizleme akislarini
  gereksiz yere zorlayabilir.

## Hedef Davranis

- Ana sayfa ve hizmet/blog sayfalari normal ziyaretciye direkt acilsin.
- `robots.txt` ve `sitemap.xml` her zaman engelsiz olsun.
- Googlebot, Bingbot ve dogrulanmis botlar challenge yemesin.
- `api.php`, admin girisleri ve agresif trafik challenge veya block gorsun.

## Uygulanacak Kural Mantigi

### 1. Her zaman serbest birak

Custom Rule veya Skip Rule mantigi:

- Path:
  - `/robots.txt`
  - `/sitemap.xml`
  - `/favicon.ico`
  - `/manifest.webmanifest`
- Action:
  - `Skip`

Atlanacaklar:

- Managed WAF
- Super Bot Fight Mode
- Rate limiting
- Browser integrity ve benzeri challenge kaynaklari

Not:
- Plan seviyesine gore birebir skip secenekleri degisebilir.
- Free planda tum bot modullerini skip edemiyorsan bile en azindan WAF ve challenge kaynaklarini ayir.

### 2. Verified bots serbest

Rule mantigi:

- If `cf.bot_management.verified_bot eq true`
- Action:
  - `Skip` veya `Allow`

Hedef:

- Googlebot
- Bingbot
- diger dogrulanmis arama botlari

### 3. Public HTML GET trafiginde challenge'i gevset

Rule mantigi:

- Method `GET`
- Host `nisankoltukyikama.com`
- Path su listede degil:
  - `/api.php`
  - `/admin`
  - `/backend`
  - `/storage`
- Action:
  - `Allow` veya en azindan `Skip challenge kaynaklari`

Bu kural tum siteyi korumasiz birakmak icin degil; public icerigi bot challenge'dan ayirmak icin.

### 4. Hassas endpointleri sert koru

Rule mantigi:

- Path contains:
  - `/api.php`
  - `/admin`
  - `/backend`
  - `/storage`
- veya query ya da method yapisi supheliyse
- Action:
  - `Managed Challenge`
  - gerekirse `Block`

### 5. Kotu bot ve scrapers icin ayri kural

Rule mantigi:

- `cf.bot_management.score lt 30`
- and `cf.bot_management.verified_bot ne true`
- and path public sayfa degil veya istek hizi supheli

Action:

- `Managed Challenge`

Bu sayede insanlara degil, dusuk puanli agresif trafige vurmus oluruz.

### 6. Challenge Passage acik olsun

Cloudflare `Challenge Passage` etkinlestir:

- Oneri: `30 dakika`

Fayda:

- Gercek kullanici bir kez challenge cozerse tekrar tekrar onune cikmaz.

## Panelde Bakilacak Ekranlar

- Security
- WAF / Security rules
- Bots
- Challenge passage
- Rate limiting
- CDN > AI veya bot related toggles

## Test Checklist

1. Normal gizli sekme ile:
   - `https://nisankoltukyikama.com/`
   - `https://nisankoltukyikama.com/afyon-koltuk-yikama/`
   - `https://nisankoltukyikama.com/blog/`
   direkt acilmali.
2. `https://nisankoltukyikama.com/robots.txt` ve `https://nisankoltukyikama.com/sitemap.xml` challenge gormemeli.
3. Search Console URL inspection tekrar denenmeli.
4. Dis SEO araclari bot verification yerine asil HTML gormeli.
5. `api.php` tarafi hala korumali kalmali.

## Basari Kriteri

- Public sayfalar challenge olmadan aciliyor.
- Search Console ve diger crawler akislarinda erisilebilirlik artiyor.
- Guvenlik tamamen kapanmiyor; sadece public icerik ile hassas uc ayriliyor.
