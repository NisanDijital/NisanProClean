export type QaEnv = {
  LEAD_LOGS: {
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  BLOG_API_BASE_URL?: string;
  QA_TARGET_URL?: string;
  QA_PSI_API_KEY?: string;
  GSC_SITE_URL?: string;
  GSC_ACCESS_TOKEN?: string;
  CLARITY_PROJECT_ID?: string;
  CLARITY_ACCESS_TOKEN?: string;
};

type PsiResult = {
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
};

type CheckResult = {
  ok: boolean;
  details: string;
};

type QaReport = {
  ts: string;
  target: string;
  speed: {
    mobile: PsiResult;
    desktop: PsiResult;
  };
  seo: {
    robots: CheckResult;
    sitemap: CheckResult;
    homepageMeta: CheckResult;
    schemaHint: CheckResult;
  };
  geo: {
    afyonSignals: CheckResult;
    localPageSignals: CheckResult;
  };
  gsc: CheckResult;
  clarity: CheckResult;
  status: "green" | "yellow" | "red";
  summary: string[];
};

const toNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const targetBaseUrl = (env: QaEnv) => {
  const raw = (env.QA_TARGET_URL || env.BLOG_API_BASE_URL || "https://nisankoltukyikama.com").trim();
  return raw.replace(/\/+$/, "");
};

const fetchPsi = async (url: string, strategy: "mobile" | "desktop", apiKey?: string): Promise<PsiResult> => {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  if (apiKey) endpoint.searchParams.set("key", apiKey);

  try {
    const response = await fetch(endpoint.toString());
    if (!response.ok) {
      return { strategy, performanceScore: null, fcpMs: null, lcpMs: null, cls: null, tbtMs: null };
    }
    const data = (await response.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { numericValue?: number }>;
      };
    };
    const audits = data.lighthouseResult?.audits || {};
    return {
      strategy,
      performanceScore: toNumber(data.lighthouseResult?.categories?.performance?.score) !== null
        ? Math.round((data.lighthouseResult?.categories?.performance?.score || 0) * 100)
        : null,
      fcpMs: toNumber(audits["first-contentful-paint"]?.numericValue),
      lcpMs: toNumber(audits["largest-contentful-paint"]?.numericValue),
      cls: toNumber(audits["cumulative-layout-shift"]?.numericValue),
      tbtMs: toNumber(audits["total-blocking-time"]?.numericValue),
    };
  } catch {
    return { strategy, performanceScore: null, fcpMs: null, lcpMs: null, cls: null, tbtMs: null };
  }
};

const textIncludesAny = (text: string, probes: string[]) => probes.some((probe) => text.includes(probe));

async function checkSeoAndGeo(baseUrl: string): Promise<QaReport["seo"] & QaReport["geo"]> {
  const robotsUrl = `${baseUrl}/robots.txt`;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  let robots: CheckResult = { ok: false, details: "robots_unreachable" };
  let sitemap: CheckResult = { ok: false, details: "sitemap_unreachable" };
  let homepageMeta: CheckResult = { ok: false, details: "homepage_unreachable" };
  let schemaHint: CheckResult = { ok: false, details: "schema_not_detected" };
  let afyonSignals: CheckResult = { ok: false, details: "content_unreachable" };
  let localPageSignals: CheckResult = { ok: false, details: "local_page_unreachable" };

  try {
    const resp = await fetch(robotsUrl);
    if (resp.ok) {
      const t = (await resp.text()).toLowerCase();
      const hasSitemap = t.includes("sitemap:");
      robots = { ok: hasSitemap, details: hasSitemap ? "robots_ok" : "robots_missing_sitemap" };
    }
  } catch {
    // ignore
  }

  try {
    const resp = await fetch(sitemapUrl);
    if (resp.ok) {
      const t = (await resp.text()).toLowerCase();
      const hasUrlset = t.includes("<urlset") || t.includes("<sitemapindex");
      sitemap = { ok: hasUrlset, details: hasUrlset ? "sitemap_ok" : "sitemap_invalid" };
    }
  } catch {
    // ignore
  }

  try {
    const resp = await fetch(baseUrl);
    if (resp.ok) {
      const html = (await resp.text()).toLowerCase();
      const hasCanonical = html.includes("rel=\"canonical\"") || html.includes("rel='canonical'");
      const hasDesc = html.includes("name=\"description\"") || html.includes("name='description'");
      homepageMeta = {
        ok: hasCanonical && hasDesc,
        details: `canonical:${hasCanonical ? "ok" : "missing"},description:${hasDesc ? "ok" : "missing"}`,
      };

      const hasSchema = textIncludesAny(html, ["application/ld+json", "localbusiness", "faqpage", "\"@type\":\"service\""]);
      schemaHint = { ok: hasSchema, details: hasSchema ? "schema_detected" : "schema_not_detected" };

      const hasAfyon = textIncludesAny(html, ["afyon", "afyonkarahisar", "erenler", "uydukent", "erkmen"]);
      afyonSignals = { ok: hasAfyon, details: hasAfyon ? "afyon_signals_ok" : "afyon_signals_weak" };
    }
  } catch {
    // ignore
  }

  const localCandidates = ["/afyon-merkez-koltuk-yikama/", "/erenler-koltuk-yikama/", "/sandikli-koltuk-yikama/"];
  for (const path of localCandidates) {
    try {
      const resp = await fetch(`${baseUrl}${path}`);
      if (!resp.ok) continue;
      const html = (await resp.text()).toLowerCase();
      const hasLocal = textIncludesAny(html, ["afyon", "koltuk", "randevu"]);
      localPageSignals = { ok: hasLocal, details: hasLocal ? `local_page_ok:${path}` : `local_page_weak:${path}` };
      break;
    } catch {
      // continue
    }
  }

  return { robots, sitemap, homepageMeta, schemaHint, afyonSignals, localPageSignals };
}

async function checkGsc(env: QaEnv): Promise<CheckResult> {
  if (!env.GSC_ACCESS_TOKEN || !env.GSC_SITE_URL) {
    return { ok: false, details: "gsc_skipped_missing_token_or_site" };
  }
  try {
    const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${env.GSC_ACCESS_TOKEN}` },
    });
    if (!response.ok) return { ok: false, details: `gsc_http_${response.status}` };
    return { ok: true, details: "gsc_connected" };
  } catch {
    return { ok: false, details: "gsc_request_failed" };
  }
}

async function checkClarity(env: QaEnv): Promise<CheckResult> {
  if (!env.CLARITY_ACCESS_TOKEN || !env.CLARITY_PROJECT_ID) {
    return { ok: false, details: "clarity_skipped_missing_token_or_project" };
  }
  try {
    const response = await fetch(`https://www.clarity.ms/export-data/api/v1/project-live-insights?projectId=${encodeURIComponent(env.CLARITY_PROJECT_ID)}`, {
      headers: { Authorization: `Bearer ${env.CLARITY_ACCESS_TOKEN}` },
    });
    if (!response.ok) return { ok: false, details: `clarity_http_${response.status}` };
    return { ok: true, details: "clarity_connected" };
  } catch {
    return { ok: false, details: "clarity_request_failed" };
  }
}

const decideStatus = (report: Omit<QaReport, "status" | "summary">): { status: QaReport["status"]; summary: string[] } => {
  const issues: string[] = [];
  const mobileScore = report.speed.mobile.performanceScore;
  const lcp = report.speed.mobile.lcpMs;
  const cls = report.speed.mobile.cls;

  if (mobileScore === null || report.speed.desktop.performanceScore === null) {
    issues.push("PageSpeed verisi alinamadi (API key/rate limit/challenge kontrol et)");
  }
  if (mobileScore !== null && mobileScore < 70) issues.push(`Mobil performans dusuk: ${mobileScore}`);
  if (lcp !== null && lcp > 4000) issues.push(`LCP yuksek: ${Math.round(lcp)}ms`);
  if (cls !== null && cls > 0.2) issues.push(`CLS yuksek: ${cls.toFixed(3)}`);
  if (!report.seo.robots.ok) issues.push(`Robots sorunu: ${report.seo.robots.details}`);
  if (!report.seo.sitemap.ok) issues.push(`Sitemap sorunu: ${report.seo.sitemap.details}`);
  if (!report.seo.homepageMeta.ok) issues.push(`Meta sorunu: ${report.seo.homepageMeta.details}`);
  if (!report.geo.afyonSignals.ok) issues.push(`GEO sinyali zayif: ${report.geo.afyonSignals.details}`);

  if (issues.length === 0) return { status: "green", summary: ["Genel durum iyi. Kritik sorun tespit edilmedi."] };
  if (issues.length <= 3) return { status: "yellow", summary: issues };
  return { status: "red", summary: issues };
};

export async function runQaGrowthMonitor(env: QaEnv): Promise<QaReport> {
  const baseUrl = targetBaseUrl(env);
  const [mobile, desktop] = await Promise.all([
    fetchPsi(baseUrl, "mobile", env.QA_PSI_API_KEY),
    fetchPsi(baseUrl, "desktop", env.QA_PSI_API_KEY),
  ]);
  const seoGeo = await checkSeoAndGeo(baseUrl);
  const [gsc, clarity] = await Promise.all([checkGsc(env), checkClarity(env)]);

  const partial: Omit<QaReport, "status" | "summary"> = {
    ts: new Date().toISOString(),
    target: baseUrl,
    speed: { mobile, desktop },
    seo: {
      robots: seoGeo.robots,
      sitemap: seoGeo.sitemap,
      homepageMeta: seoGeo.homepageMeta,
      schemaHint: seoGeo.schemaHint,
    },
    geo: {
      afyonSignals: seoGeo.afyonSignals,
      localPageSignals: seoGeo.localPageSignals,
    },
    gsc,
    clarity,
  };

  const status = decideStatus(partial);
  const report: QaReport = { ...partial, ...status };

  await env.LEAD_LOGS.put(`qa-report:${Date.now()}`, JSON.stringify(report), {
    expirationTtl: 60 * 60 * 24 * 120,
  });
  await env.LEAD_LOGS.put("qa-report:latest", JSON.stringify(report), {
    expirationTtl: 60 * 60 * 24 * 120,
  });

  return report;
}
