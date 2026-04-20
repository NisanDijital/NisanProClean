import fs from "node:fs/promises";
import path from "node:path";

const SITE_DOMAIN = process.env.GSC_SITE_DOMAIN || "nisankoltukyikama.com";
const SITE_URL = `https://${SITE_DOMAIN}`;
const DAYS = Number.parseInt(process.env.TRAFFIC_REPORT_DAYS || "7", 10);
const CLARITY_TOKEN = process.env.CLARITY_EXPORT_TOKEN || "";

const GSC_CLIENT_ID = process.env.GSC_CLIENT_ID || "";
const GSC_CLIENT_SECRET = process.env.GSC_CLIENT_SECRET || "";
const GSC_REFRESH_TOKEN = process.env.GSC_REFRESH_TOKEN || "";

const now = new Date();
const toDate = now.toISOString().slice(0, 10);
const from = new Date(now);
from.setUTCDate(from.getUTCDate() - Math.max(1, DAYS) + 1);
const fromDate = from.toISOString().slice(0, 10);

const reportDir = path.resolve("reports");
await fs.mkdir(reportDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outMd = path.join(reportDir, `traffic-gap-${stamp}.md`);
const outJson = path.join(reportDir, `traffic-gap-${stamp}.json`);

const result = {
  siteDomain: SITE_DOMAIN,
  fromDate,
  toDate,
  clarity: null,
  gsc: null,
  gscProperties: null,
  notes: [],
};

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

async function getGoogleAccessToken() {
  if (!GSC_CLIENT_ID || !GSC_CLIENT_SECRET || !GSC_REFRESH_TOKEN) return null;
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GSC_CLIENT_ID,
      client_secret: GSC_CLIENT_SECRET,
      refresh_token: GSC_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenResp.ok) {
    const text = await tokenResp.text();
    throw new Error(`Google token error: ${tokenResp.status} ${text}`);
  }
  const json = await tokenResp.json();
  return json.access_token || null;
}

async function fetchGsc(accessToken) {
  const siteEnc = encodeURIComponent(`sc-domain:${SITE_DOMAIN}`);

  const sitesResp = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (sitesResp.ok) {
    const sitesJson = await sitesResp.json();
    const entries = Array.isArray(sitesJson.siteEntry) ? sitesJson.siteEntry : [];
    result.gscProperties = entries
      .map((x) => x.siteUrl)
      .filter((u) => typeof u === "string" && u.includes(SITE_DOMAIN));
  }

  const body = {
    startDate: fromDate,
    endDate: toDate,
    dimensions: ["date"],
    rowLimit: 1000,
  };
  const perfResp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!perfResp.ok) {
    const text = await perfResp.text();
    throw new Error(`GSC searchAnalytics error: ${perfResp.status} ${text}`);
  }

  const perfJson = await perfResp.json();
  const rows = Array.isArray(perfJson.rows) ? perfJson.rows : [];
  const clicks = sum(rows.map((r) => Number(r.clicks || 0)));
  const impressions = sum(rows.map((r) => Number(r.impressions || 0)));
  result.gsc = { clicks, impressions, rowCount: rows.length };
}

async function fetchClarity() {
  if (!CLARITY_TOKEN) return;
  const uri = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${Math.max(
    1,
    DAYS
  )}&dimension1=URL`;
  const resp = await fetch(uri, {
    headers: {
      Authorization: `Bearer ${CLARITY_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Clarity live insights error: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  const traffic = (Array.isArray(data) ? data : []).find((x) => x.metricName === "Traffic");
  const info = Array.isArray(traffic?.information) ? traffic.information : [];
  const prodRows = info.filter((row) => {
    const u = row.URL || row.Url || "";
    return typeof u === "string" && u.startsWith(SITE_URL);
  });

  const sessions = sum(prodRows.map((r) => Number(r.totalSessionCount || r.subTotal || 0)));
  const totalHits = sum(prodRows.map((r) => Number(r.subTotal || 0)));
  result.clarity = { sessions, totalHits, rowCount: prodRows.length };
}

try {
  await fetchClarity();
} catch (err) {
  result.notes.push(`Clarity fetch failed: ${err.message}`);
}

try {
  const token = await getGoogleAccessToken();
  if (token) {
    await fetchGsc(token);
  } else {
    result.notes.push("GSC credentials missing; GSC part skipped.");
  }
} catch (err) {
  result.notes.push(`GSC fetch failed: ${err.message}`);
}

if (!result.clarity) result.notes.push("Clarity token missing or Clarity data unavailable.");
if (!result.gsc) result.notes.push("GSC data unavailable.");

const lines = [];
lines.push("# Traffic Gap Report");
lines.push("");
lines.push(`- Site: ${SITE_DOMAIN}`);
lines.push(`- Range: ${fromDate} -> ${toDate}`);
lines.push(`- Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Clarity");
if (result.clarity) {
  lines.push(`- Sessions: ${result.clarity.sessions}`);
  lines.push(`- Hits/subTotal: ${result.clarity.totalHits}`);
  lines.push(`- URL rows: ${result.clarity.rowCount}`);
} else {
  lines.push("- No data");
}
lines.push("");
lines.push("## GSC");
if (result.gsc) {
  lines.push(`- Clicks (Google organic): ${result.gsc.clicks}`);
  lines.push(`- Impressions (Google organic): ${result.gsc.impressions}`);
  lines.push(`- Rows (daily): ${result.gsc.rowCount}`);
} else {
  lines.push("- No data");
}
lines.push("");
lines.push("## GSC Properties (matching domain)");
if (result.gscProperties && result.gscProperties.length) {
  for (const p of result.gscProperties) lines.push(`- ${p}`);
} else {
  lines.push("- Not available");
}
lines.push("");
lines.push("## Notes");
if (result.notes.length) {
  for (const n of result.notes) lines.push(`- ${n}`);
} else {
  lines.push("- No warnings");
}
lines.push("");

await fs.writeFile(outMd, `${lines.join("\n")}\n`, "utf8");
await fs.writeFile(outJson, `${JSON.stringify(result, null, 2)}\n`, "utf8");

console.log(`Report written: ${outMd}`);
console.log(`Data written: ${outJson}`);
