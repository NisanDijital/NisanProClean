import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PROPERTY_NAME = process.env.GSC_PROPERTY || "nisankoltukyikama.com";
const REPORT_DIR = path.resolve("reports", "gsc");
const profileDir = path.resolve(".playwright-gsc-profile");
const resourceId = encodeURIComponent(`sc-domain:${PROPERTY_NAME}`);
const MAX_URLS = Number.parseInt(process.env.GSC_MAX_URLS || "100", 10);

await fs.mkdir(REPORT_DIR, { recursive: true });
await fs.mkdir(profileDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const logs = [];
const pushLog = (line) => {
  const row = `[${new Date().toISOString()}] ${line}`;
  logs.push(row);
  console.log(line);
};

const screenshot = async (page, name) => {
  const file = path.join(REPORT_DIR, `${stamp}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (text) =>
  (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const clickByTokens = async (page, tokens) => {
  const normalizedTokens = tokens.map((t) => normalize(t));
  return page.evaluate((candidateTokens) => {
    const normalizeInPage = (txt) =>
      (txt || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

    const all = Array.from(document.querySelectorAll("*"));
    for (const token of candidateTokens) {
      const node = all.find((n) => {
        if (!(n instanceof HTMLElement)) return false;
        const text = normalizeInPage(n.innerText || "");
        if (!text.includes(token)) return false;
        const style = window.getComputedStyle(n);
        return style.display !== "none" && style.visibility !== "hidden" && n.offsetParent !== null;
      });
      if (!(node instanceof HTMLElement)) continue;
      let clickable = node;
      for (let i = 0; i < 8; i += 1) {
        if (!clickable) break;
        const role = clickable.getAttribute("role");
        if (clickable.tagName === "BUTTON" || role === "button" || clickable.onclick) break;
        clickable = clickable.parentElement;
      }
      (clickable || node).click();
      return true;
    }
    return false;
  }, normalizedTokens);
};

const parseSitemapUrls = async () => {
  const xml = await fs.readFile(path.resolve("public", "sitemap.xml"), "utf8");
  const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
  const unique = Array.from(new Set(matches));
  return unique.filter(Boolean).slice(0, Math.max(1, MAX_URLS));
};

const closeLiveTestDialog = async (page) => {
  for (let i = 0; i < 6; i += 1) {
    const cancelled = await clickByTokens(page, ["IPTAL", "CANCEL"]);
    if (!cancelled) break;
    await sleep(900);
  }
};

const findVisibleLocator = async (page, selectors) => {
  for (const sel of selectors) {
    const candidate = page.locator(sel).first();
    if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) return candidate;
  }
  return null;
};

const urls = await parseSitemapUrls();
pushLog(`Loaded ${urls.length} URLs from sitemap`);

const browser = await chromium.launchPersistentContext(profileDir, { headless: false });
const page = browser.pages()[0] ?? (await browser.newPage());

let confirmed = 0;
let clickedOnly = 0;
let unavailable = 0;

try {
  pushLog("Opening Search Console");
  await page.goto("https://search.google.com/search-console", { waitUntil: "domcontentloaded" });

  if (page.url().includes("accounts.google.com")) {
    pushLog("Login screen detected, waiting for session");
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline && page.url().includes("accounts.google.com")) {
      await sleep(2500);
    }
  }

  if (page.url().includes("accounts.google.com")) {
    throw new Error("GSC session is not authenticated");
  }

  await screenshot(page, "after-open");

  pushLog("Opening property sitemap screen");
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${resourceId}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);

  await page.addStyleTag({
    content: "#google-feedback, #google-feedback iframe { pointer-events:none !important; opacity:0 !important; }",
  });

  pushLog("Submitting sitemap.xml");
  const sitemapInput = await findVisibleLocator(page, [
    'input[aria-label*="sitemap"]:not([disabled])',
    'input[aria-label*="Sitemap"]:not([disabled])',
    'input[type="text"]:not([disabled])',
  ]);
  if (!sitemapInput) throw new Error("Sitemap input not found");
  await sitemapInput.fill("sitemap.xml");
  const submitted = await clickByTokens(page, ["GONDER", "SUBMIT"]);
  if (!submitted) await sitemapInput.press("Enter");
  await sleep(2500);
  await screenshot(page, "after-sitemap-submit");

  pushLog("Opening URL inspection page");
  await page.goto(`https://search.google.com/search-console?resource_id=${resourceId}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);

  for (const target of urls) {
    pushLog(`Inspecting ${target}`);
    const box = await findVisibleLocator(page, [
      'input[aria-label*="URL"]:not([disabled])',
      'input[aria-label*="incele"]:not([disabled])',
      'input[type="text"]:not([disabled])',
    ]);
    if (!box) {
      unavailable += 1;
      pushLog(`Input not found for ${target}`);
      continue;
    }

    await box.click({ force: true });
    await box.fill(target);
    await box.press("Enter");
    await sleep(5500);

    await closeLiveTestDialog(page);

    let clicked = await clickByTokens(page, ["DIZINE EKLENMESINI ISTE", "REQUEST INDEXING"]);
    if (!clicked) {
      clicked = await clickByTokens(page, ["EKLENMESINI ISTE"]);
    }

    await sleep(2200);
    const confirmedNow = await page
      .getByText(/Dizine eklenmesi istendi|Indexing requested/i)
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    if (confirmedNow) {
      confirmed += 1;
      pushLog(`Confirmed: ${target}`);
    } else if (clicked) {
      clickedOnly += 1;
      pushLog(`Clicked (no popup): ${target}`);
    } else {
      unavailable += 1;
      pushLog(`Request action unavailable: ${target}`);
    }

    await screenshot(page, `inspect-${target.replace(/https?:\/\//, "").replace(/[\/:]/g, "_")}`);
  }

  pushLog(`Done. confirmed=${confirmed} clicked_only=${clickedOnly} unavailable=${unavailable}`);
} catch (err) {
  pushLog(`Error: ${err.message}`);
  await screenshot(page, "error");
  process.exitCode = 1;
} finally {
  const logPath = path.join(REPORT_DIR, `${stamp}-gsc-run.log`);
  await fs.writeFile(logPath, `${logs.join("\n")}\n`, "utf8");
  pushLog(`Log written: ${logPath}`);
  await browser.close();
}
