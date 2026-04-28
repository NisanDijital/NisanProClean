# NisanProClean Cloudflare Lead Agent

This worker provides a lightweight lead endpoint and daily counter for the site.

## Endpoints

- `GET /health` -> `ok`
- `POST /lead` -> stores lead payload in KV

Expected JSON payload:

```json
{
  "name": "Ad Soyad",
  "phone": "05xxxxxxxxx",
  "address": "Adres",
  "service": "koltuk",
  "date": "2026-05-01",
  "slot": "13:00 - 16:00",
  "source": "web"
}
```

## Deploy

1. Install dependencies:

```bash
npm i
```

2. Login to Wrangler:

```bash
npx wrangler login
```

3. Create a KV namespace and paste its id into `wrangler.toml`:

```bash
npx wrangler kv namespace create LEAD_LOGS
```

4. Deploy:

```bash
npx wrangler deploy
```

## Required Cloudflare API Token scopes

- `Account:Workers Scripts:Edit`
- `Account:Workers KV Storage:Edit`
- `Zone:Zone:Read` (if you also manage DNS/routes from API)

Token format is typically a longer API token. A 32-char hex value is often a zone id, not an API token.
