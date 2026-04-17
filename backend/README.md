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
- `POST /api.php?action=generate`
- `GET /api.php?action=appointment_slots`
- `POST /api.php?action=appointment_book`

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

## Cron

- `GET /api.php?action=cron_backup&token=CRON_TOKEN`
- `CRON_TOKEN` degeri `config.php` icindeki `cron_token` ile ayni olmali.

## Slot Ayari

`config.php`:

- `slot_days`: kac gun ileriye slot acilacagi
- `slot_hours`: saat bloklari (varsayilan: `09:00`, `13:00`, `17:00`)
