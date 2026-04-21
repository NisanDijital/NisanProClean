import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = process.env.SCHEMA_CHECK_URL || "https://nisankoltukyikama.com/";
const REPORT_DIR = path.resolve("reports");
const REPORT_PATH = path.join(REPORT_DIR, "schema-live-check.json");

const requiredTypes = [
  "LocalBusiness",
  "Service",
  "BreadcrumbList",
  "FAQPage",
];

const requiredLocalBusinessFields = [
  "name",
  "url",
  "telephone",
  "address",
];

const parseJsonLd = (html) => {
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const parsed = [];
  const errors = [];

  for (const block of blocks) {
    const raw = (block[1] || "").trim();
    if (!raw) continue;
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) parsed.push(...json);
      else parsed.push(json);
    } catch (err) {
      errors.push(String(err?.message || err));
    }
  }

  return { parsed, errors };
};

const getByType = (nodes, type) => nodes.filter((item) => item && item["@type"] === type);

const run = async () => {
  const response = await fetch(SITE_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Schema check request failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const { parsed, errors } = parseJsonLd(html);

  const result = {
    checkedAtUtc: new Date().toISOString(),
    url: SITE_URL,
    httpStatus: response.status,
    jsonLdBlockCount: parsed.length,
    parseErrors: errors,
    requiredTypes: {},
    localBusinessFieldCheck: {},
    ok: false,
  };

  for (const type of requiredTypes) {
    const matches = getByType(parsed, type);
    result.requiredTypes[type] = matches.length > 0;
  }

  const localBusiness = getByType(parsed, "LocalBusiness")[0] || {};
  for (const field of requiredLocalBusinessFields) {
    result.localBusinessFieldCheck[field] = Boolean(localBusiness[field]);
  }

  const requiredTypeOk = Object.values(result.requiredTypes).every(Boolean);
  const requiredFieldOk = Object.values(result.localBusinessFieldCheck).every(Boolean);
  const parseOk = result.parseErrors.length === 0;
  result.ok = requiredTypeOk && requiredFieldOk && parseOk;

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`Schema report written: ${REPORT_PATH}`);
  console.log(`Required types OK: ${requiredTypeOk}`);
  console.log(`LocalBusiness fields OK: ${requiredFieldOk}`);
  console.log(`Parse errors: ${result.parseErrors.length}`);
  console.log(`OVERALL_OK=${result.ok}`);

  if (!result.ok) process.exit(1);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
