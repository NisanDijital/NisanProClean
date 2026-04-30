# NisanProClean Backend

Bu backend `api.php` uzerinden hem referans kodu sistemi hem de randevu + admin akisini yonetir.

## Kurulum

1. `backend/config.example.php` dosyasini `backend/config.php` olarak kopyalayin.
2. `config.php` icindeki DB ve sifre alanlarini doldurun.
3. Canliya yuklerken:
   - `backend/api.php` -> `public_html/api.php`
   - `backend/config.php` -> `public_html/config.php`
   - (opsiyonel) `backend/admin.html` -> `public_html/admin.html`

Not: `config.php` git'e alinmaz (`.gitignore` icinde).

## Veri Modu

- `db_enabled=true` ise MySQL kullanir.
- `db_enabled=false` ise `storage/` altinda JSON fallback kullanir.

## Temel Endpointler

- `GET /api.php?action=health`
- `GET /api.php?action=csrf_token`
- `POST /api.php?action=generate`
- `POST /api.php?action=referral_otp_request`
- `POST /api.php?action=referral_otp_verify`
- `GET /api.php?action=appointment_slots`
- `POST /api.php?action=appointment_book`
- `POST /api.php?action=subscription_create`
- `GET /api.php?action=blog_list&limit=30`

## Admin Endpointler

- `POST /api.php?action=admin_login`
- `POST /api.php?action=admin_logout`
- `GET /api.php?action=admin_status`
- `GET /api.php?action=admin_list`
- `POST /api.php?action=admin_update_points`
- `POST /api.php?action=admin_backup`
- `GET /api.php?action=admin_logs`
- `GET /api.php?action=admin_appointments`
- `POST /api.php?action=admin_appointment_status`
- `GET /api.php?action=admin_subscriptions`
- `POST /api.php?action=admin_subscription_status`
- `GET /api.php?action=admin_lead_report&days=30`
- `GET /api.php?action=admin_blog_list`
- `POST /api.php?action=admin_blog_upsert`
- `POST /api.php?action=admin_blog_delete`

`admin_lead_report` son `days` gun icindeki (1-365) lead source dagilimini randevu ve uyelik icin ayri verir.

## Guvenlik Notlari

- Tum `POST` endpointleri icin `X-CSRF-Token` zorunludur.
- Token almak icin once `GET /api.php?action=csrf_token` cagrisi yapin.
- Public endpointlerde spam/honeypot kontrolu (`hp`, `website`, `company_website`) aktiftir.
- Public form endpointlerinde IP+telefon bazli rate limit uygulanir.
- `admin_login` endpointinde ayri brute-force rate limit vardir.

Config alanlari:

- `csrf_token_ttl_seconds`
- `rate_limit_enabled`
- `rate_limit_window_seconds`
- `rate_limit_max_public`
- `rate_limit_max_admin_login`
- `blog_api_token` (opsiyonel: dis blog yazma ajanlari icin Bearer token)

## Blog API

Canli sitedeki blog bolumu once `GET /api.php?action=blog_list` endpointini okur. Endpoint bos ya da ulasilamazsa statik yazilara duser.

Blog yazmak icin iki guvenli yol vardir:

1. Admin oturumu + `X-CSRF-Token`
2. Dis ajan icin `Authorization: Bearer BLOG_API_TOKEN`

`backend/config.php` icinde:

```php
'blog_api_token' => 'UZUN_RASTGELE_TOKEN',
```

Yeni yazi ekleme veya guncelleme:

```bash
curl -X POST "https://nisankoltukyikama.com/api.php?action=admin_blog_upsert" \
  -H "Authorization: Bearer UZUN_RASTGELE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Afyon Koltuk Yikama Fiyatlari 2026",
    "slug": "afyon-koltuk-yikama-fiyatlari-2026",
    "category": "Yerel Rehber",
    "excerpt": "Afyon merkezde koltuk yikama fiyatlarini etkileyen parca, kumas ve leke kriterleri.",
    "content": "<p>Afyon koltuk yikama fiyatlari...</p>",
    "image": "/media/hero-1280.jpg",
    "status": "published",
    "meta_title": "Afyon Koltuk Yikama Fiyatlari 2026",
    "meta_description": "Afyon merkezde koltuk yikama fiyatlari ve randevu sureci."
  }'
```

Silme:

```bash
curl -X POST "https://nisankoltukyikama.com/api.php?action=admin_blog_delete" \
  -H "Authorization: Bearer UZUN_RASTGELE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"afyon-koltuk-yikama-fiyatlari-2026"}'
```

## Cron

- `GET /api.php?action=cron_backup&token=CRON_TOKEN`
- `CRON_TOKEN` degeri `config.php` icindeki `cron_token` ile ayni olmali.

## Slot Ayari

`config.php`:

- `slot_days`: kac gun ileriye slot acilacagi
- `slot_hours`: saat bloklari (varsayilan: `09:00`, `13:00`, `17:00`)

## WhatsApp Bildirim (Agent)

Randevu ve uyelik kayitlarinda otomatik bildirim icin:

- `notify_enabled`: `true`
- `notify_mode`: `webhook`
- `notify_webhook_url`: agent webhook URL
- `notify_webhook_token`: (opsiyonel) Bearer token

Backend webhook'a su formatta POST atar:

```json
{
  "event": "appointment_booked",
  "ts": "2026-04-17T00:00:00+00:00",
  "payload": {
    "name": "Ad Soyad",
    "phone": "905xxxxxxxxx",
    "address": "Adres",
    "service": "Koltuk Yikama",
    "date": "2026-04-20",
    "time": "13:00",
    "note": "",
    "message": "Yeni randevu talebi..."
  }
}
```

Desteklenen event degerleri:

- `appointment_booked`
- `subscription_created`

## Lead Attribution

`appointment_book` ve `subscription_create` endpointleri su alanlari alir:

- `source` (ornek: `whatsapp`, `instagram`, `google`)
- `utm_source`
- `utm_medium`
- `utm_campaign`

Girilmeyen kayitlar otomatik `direct` olarak isaretlenir.

## WhatsApp Cloud API (Direkt)

Agent yerine direkt Meta Cloud API istersen:

- `notify_enabled`: `true`
- `notify_mode`: `whatsapp_cloud`
- `wa_phone_number_id`
- `wa_access_token`
- `wa_to` (bildirim gidecek numara)

## OTP Guvenli Musteri Sorgulama

- `otp_enabled`: OTP zorunlulugu ac/kapat
- `otp_secret`: hashleme anahtari (zorunlu)
- `otp_ttl_seconds`: kod gecerlilik suresi (varsayilan 300)
- `otp_max_attempts`: max deneme (varsayilan 5)
- `otp_cooldown_seconds`: tekrar kod isteme bekleme suresi
- `otp_rate_limit_hour`: 1 saatlik max kod talebi

Not: OTP gonderimi mevcut bildirim sistemi uzerinden calisir (`notify_*` ayarlari).
