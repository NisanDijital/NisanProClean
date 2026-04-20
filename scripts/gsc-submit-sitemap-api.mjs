const SITE_DOMAIN = process.env.GSC_SITE_DOMAIN || "nisankoltukyikama.com";
const SITEMAP_URL = process.env.SITEMAP_URL || `https://${SITE_DOMAIN}/sitemap.xml`;

const CLIENT_ID = process.env.GSC_CLIENT_ID;
const CLIENT_SECRET = process.env.GSC_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GSC_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.log("GSC credentials are missing. Skipping automatic sitemap submit.");
  process.exit(0);
}

const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
    grant_type: "refresh_token",
  }),
});

if (!tokenResp.ok) {
  const text = await tokenResp.text();
  throw new Error(`Failed to get Google access token: ${tokenResp.status} ${text}`);
}

const tokenJson = await tokenResp.json();
const accessToken = tokenJson.access_token;
if (!accessToken) throw new Error("No access_token received from Google OAuth token endpoint.");

const site = encodeURIComponent(`sc-domain:${SITE_DOMAIN}`);
const feedpath = encodeURIComponent(SITEMAP_URL);
const submitUrl = `https://www.googleapis.com/webmasters/v3/sites/${site}/sitemaps/${feedpath}`;

const submitResp = await fetch(submitUrl, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!submitResp.ok) {
  const text = await submitResp.text();
  throw new Error(`Failed to submit sitemap to GSC API: ${submitResp.status} ${text}`);
}

console.log(`Sitemap submitted to GSC: ${SITEMAP_URL}`);
