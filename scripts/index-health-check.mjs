import fs from "node:fs/promises";
import path from "node:path";

const SITE = process.env.SITE_URL || "https://nisankoltukyikama.com";
const reportDir = path.resolve("reports", "index-health");
await fs.mkdir(reportDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outJson = path.join(reportDir, `${stamp}.json`);
const outMd = path.join(reportDir, `${stamp}.md`);

const checks = [
  { url: `${SITE}/`, expectStatus: 200 },
  { url: `${SITE}/index.html`, expectStatus: 301, expectLocation: `${SITE}/` },
  { url: `${SITE}/public_html/index.html`, expectStatus: 301, expectLocation: `${SITE}/` },
  { url: `${SITE}/public_html/test`, expectStatus: 301, expectLocation: `${SITE}/test` },
  { url: `${SITE}/nisanproclean`, expectStatus: 301, expectLocation: `${SITE}/` },
  { url: `${SITE}/nisanproclean/test`, expectStatus: 301, expectLocation: `${SITE}/` },
  { url: `${SITE}/404.html`, expectStatus: 200 },
  { url: `${SITE}/robots.txt`, expectStatus: 200 },
  { url: `${SITE}/sitemap.xml`, expectStatus: 200 },
];

async function fetchNoRedirect(url) {
  const res = await fetch(url, { redirect: "manual" });
  return {
    url,
    status: res.status,
    location: res.headers.get("location"),
    contentType: res.headers.get("content-type"),
  };
}

const results = [];
for (const c of checks) {
  try {
    const r = await fetchNoRedirect(c.url);
    const okStatus = r.status === c.expectStatus;
    const okLocation = c.expectLocation ? r.location === c.expectLocation : true;
    results.push({
      ...r,
      expectStatus: c.expectStatus,
      expectLocation: c.expectLocation || null,
      ok: okStatus && okLocation,
    });
  } catch (err) {
    results.push({
      url: c.url,
      status: null,
      location: null,
      contentType: null,
      expectStatus: c.expectStatus,
      expectLocation: c.expectLocation || null,
      ok: false,
      error: err.message,
    });
  }
}

let robotsText = "";
let sitemapText = "";
let page404 = "";
try {
  robotsText = await (await fetch(`${SITE}/robots.txt`, { redirect: "follow" })).text();
} catch {
  robotsText = "";
}
try {
  sitemapText = await (await fetch(`${SITE}/sitemap.xml`, { redirect: "follow" })).text();
} catch {
  sitemapText = "";
}
try {
  page404 = await (await fetch(`${SITE}/404.html`, { redirect: "follow" })).text();
} catch {
  page404 = "";
}

const contentChecks = {
  robotsHasSitemap: robotsText.includes(`Sitemap: ${SITE}/sitemap.xml`),
  robotsBlocksAdmin: /Disallow:\s*\/admin\.html/i.test(robotsText),
  robotsBlocksApi: /Disallow:\s*\/api\.php/i.test(robotsText),
  sitemapHas404: sitemapText.includes("/404.html"),
  sitemapHasAdmin: sitemapText.includes("/admin.html"),
  page404Noindex: /noindex,\s*follow/i.test(page404),
};

const summary = {
  site: SITE,
  generatedAt: new Date().toISOString(),
  passCount: results.filter((x) => x.ok).length,
  totalChecks: results.length,
  checks: results,
  contentChecks,
  overallOk:
    results.every((x) => x.ok) &&
    contentChecks.robotsHasSitemap &&
    contentChecks.robotsBlocksAdmin &&
    contentChecks.robotsBlocksApi &&
    !contentChecks.sitemapHas404 &&
    !contentChecks.sitemapHasAdmin &&
    contentChecks.page404Noindex,
};

await fs.writeFile(outJson, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const md = [];
md.push("# Index Health Report");
md.push("");
md.push(`- Site: ${summary.site}`);
md.push(`- Generated: ${summary.generatedAt}`);
md.push(`- Status: ${summary.overallOk ? "OK" : "ISSUES"}`);
md.push(`- Check pass: ${summary.passCount}/${summary.totalChecks}`);
md.push("");
md.push("## URL Checks");
for (const r of results) {
  const flag = r.ok ? "OK" : "FAIL";
  md.push(
    `- [${flag}] ${r.url} -> status=${r.status ?? "ERR"} expected=${r.expectStatus}` +
      (r.expectLocation ? ` location=${r.location || "-"} expected_location=${r.expectLocation}` : "")
  );
}
md.push("");
md.push("## Content Checks");
md.push(`- robots has sitemap: ${contentChecks.robotsHasSitemap}`);
md.push(`- robots blocks /admin.html: ${contentChecks.robotsBlocksAdmin}`);
md.push(`- robots blocks /api.php: ${contentChecks.robotsBlocksApi}`);
md.push(`- sitemap contains /404.html: ${contentChecks.sitemapHas404}`);
md.push(`- sitemap contains /admin.html: ${contentChecks.sitemapHasAdmin}`);
md.push(`- /404.html has noindex,follow: ${contentChecks.page404Noindex}`);
md.push("");

await fs.writeFile(outMd, `${md.join("\n")}\n`, "utf8");

console.log(`Index report JSON: ${outJson}`);
console.log(`Index report MD: ${outMd}`);
console.log(`OVERALL_OK=${summary.overallOk}`);
