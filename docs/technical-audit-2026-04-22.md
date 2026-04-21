# Technical Audit Snapshot - 2026-04-22

## Canli Schema Kontrolu

Komut:
`npm run schema:check:live`

Sonuc:
- Required schema types: OK
- LocalBusiness required fields: OK
- JSON-LD parse errors: 0
- Overall: `true`

Rapor:
`reports/schema-live-check.json`

## NAP Tutarlilik Kontrolu

Komut:
`npm run nap:check`

Kontrol edilen dosyalar:
- `index.html`
- `public/koltuk-yikama/index.html`
- `public/yatak-yikama/index.html`
- `public/arac-koltugu-yikama/index.html`
- `public/sandalye-yikama/index.html`
- `public/fiyatlar/index.html`

Sonuc:
- Tum sayfalar: OK
- Overall: `true`

Rapor:
`reports/nap-consistency-report.json`
