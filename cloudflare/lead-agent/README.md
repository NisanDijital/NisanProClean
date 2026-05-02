# NisanProClean Cloudflare Lead Agent

This worker provides a lightweight lead endpoint and daily counter for the site.

## Endpoints

- `GET /health` -> `ok`
- `POST /lead` -> stores lead payload in KV
- `POST /blog-agent/run` -> manual trigger for daily blog generation (protected by secret header)
- `POST /qa/run` -> manual trigger for QA/Growth monitor (protected by secret header)

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

## Blog Agent (daily)

This worker now includes a daily blog agent pipeline:

1. Collect keyword candidates from seed list + Google Suggest
2. Check rough ranking position from DuckDuckGo HTML results
3. Pick a target keyword (worse rank first)
4. Generate an article with model fallback chain
5. Publish to `https://nisankoltukyikama.com/api.php?action=admin_blog_upsert`

Default cron is set in `wrangler.toml`:

```toml
[triggers]
crons = ["15 6 * * *"]
```

Important secrets to set with Wrangler:

```bash
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put BLOG_API_TOKEN
npx wrangler secret put BLOG_CRON_SECRET
npx wrangler secret put SUPER_AGENT_CRON_SECRET
npx wrangler secret put SUPER_TELEGRAM_BOT_TOKEN
npx wrangler secret put SUPER_TELEGRAM_CHAT_ID
```

Manual run endpoint example:

```bash
curl -X POST "https://nisanproclean-lead-agent.nisankoltukyikamacom.workers.dev/blog-agent/run" \
  -H "x-blog-cron-secret: YOUR_SECRET"
```

## QA + Growth Monitor

Worker includes a daily QA monitor:

1. Mobile/Desktop PageSpeed pull (LCP/FCP/CLS/TBT/performance)
2. SEO checks (`robots.txt`, `sitemap.xml`, canonical/meta/schema hint)
3. GEO checks (Afyon/local landing signals)
4. Optional GSC connectivity check
5. Optional Clarity connectivity check

KV outputs:

- `qa-report:latest`
- `qa-report:*`
- `qa-scheduled:*`

Optional secrets:

```bash
npx wrangler secret put QA_CRON_SECRET
npx wrangler secret put QA_PSI_API_KEY
npx wrangler secret put GSC_ACCESS_TOKEN
npx wrangler secret put CLARITY_ACCESS_TOKEN
```

SuperAgent notification channels:

- `SUPER_NOTIFY_WEBHOOK_URL` + optional `SUPER_NOTIFY_WEBHOOK_TOKEN`
- `SUPER_TELEGRAM_BOT_TOKEN` + `SUPER_TELEGRAM_CHAT_ID`
- `SUPER_WHATSAPP_*` vars if WhatsApp is enabled

Optional vars in `wrangler.toml`:

- `GSC_SITE_URL` (example: `sc-domain:nisankoltukyikama.com`)
- `CLARITY_PROJECT_ID`

Manual run example:

```bash
curl -X POST "https://nisanproclean-lead-agent.nisankoltukyikamacom.workers.dev/qa/run" \
  -H "x-qa-cron-secret: YOUR_SECRET"
```

## Required Cloudflare API Token scopes

- `Account:Workers Scripts:Edit`
- `Account:Workers KV Storage:Edit`
- `Zone:Zone:Read` (if you also manage DNS/routes from API)

Token format is typically a longer API token. A 32-char hex value is often a zone id, not an API token.
