import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const TARGET_URLS = [
  "https://nisankoltukyikama.com/",
  "https://nisankoltukyikama.com/afyon-merkez-koltuk-yikama/",
  "https://nisankoltukyikama.com/erenler-koltuk-yikama/",
];
const PROPERTY_NAME = process.env.GSC_PROPERTY || "nisankoltukyikama.com";

const REPORT_DIR = path.resolve("reports", "gsc");
await fs.mkdir(REPORT_DIR, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const screenshot = async (page, name) => {
  const file = path.join(REPORT_DIR, `${stamp}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const resourceId = encodeURIComponent(`sc-domain:${PROPERTY_NAME}`);
const clickByTextFallback = async (page, texts) => {
  return page.evaluate((candidates) => {
    const all = Array.from(document.querySelectorAll("*"));
    for (const text of candidates) {
      const el = all.find((node) => {
        if (!(node instanceof HTMLElement)) return false;
        if (!node.innerText) return false;
        if (!node.innerText.includes(text)) return false;
        const style = window.getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden" && node.offsetParent !== null;
      });
      if (el instanceof HTMLElement) {
        el.click();
        return true;
      }
    }
    return false;
  }, texts);
};

const profileDir = path.resolve(".playwright-gsc-profile");
await fs.mkdir(profileDir, { recursive: true });
const context = await chromium.launchPersistentContext(profileDir, { headless: false });
const page = context.pages()[0] ?? (await context.newPage());

const log = [];
const pushLog = (line) => {
  log.push(`[${new Date().toISOString()}] ${line}`);
  console.log(line);
};

try {
  pushLog("Opening Search Console");
  await page.goto("https://search.google.com/search-console", { waitUntil: "domcontentloaded" });

  if (page.url().includes("accounts.google.com")) {
    pushLog("Google login page detected; waiting up to 180s for session");
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      await wait(3000);
      if (!page.url().includes("accounts.google.com")) break;
    }
  }

  await page.waitForTimeout(2500);
  await screenshot(page, "after-open");

  if (page.url().includes("accounts.google.com")) {
    pushLog("Still on login page; cannot proceed automatically");
    throw new Error("Not authenticated in GSC session");
  }

  const noPropertyText = page.getByText(/Lütfen bir mülk seçin|Please select a property/i).first();
  if (await noPropertyText.isVisible({ timeout: 3000 }).catch(() => false)) {
    pushLog("No property selected; attempting to select domain property");
    const propertyButtonCandidates = [
      page.getByRole("button", { name: /Arama özelliği|Search property/i }).first(),
      page.locator('div[role="button"]').filter({ hasText: /Arama özelliği|Search property/i }).first(),
    ];
    let propertyButton = null;
    for (const candidate of propertyButtonCandidates) {
      if (await candidate.isVisible({ timeout: 2500 }).catch(() => false)) {
        propertyButton = candidate;
        break;
      }
    }
    if (!propertyButton) throw new Error("Property selector button not found");
    await propertyButton.click();
    await page.waitForTimeout(1200);

    const searchInput = page.locator('input[type="text"]:not([disabled])').first();
    if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await searchInput.fill(PROPERTY_NAME);
      await page.waitForTimeout(1200);
    }

    const propertyOption = page.getByText(PROPERTY_NAME, { exact: false }).first();
    if (await propertyOption.isVisible({ timeout: 4000 }).catch(() => false)) {
      await propertyOption.click();
    } else if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await searchInput.press("Enter");
    } else {
      throw new Error("Property option not found");
    }
    await page.waitForTimeout(4500);
    await screenshot(page, "after-property-select");
  }

  pushLog("Opening property sitemap page");
  await page.goto(`https://search.google.com/search-console/sitemaps?resource_id=${resourceId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3500);
  await page.addStyleTag({
    content:
      "#google-feedback, #google-feedback iframe { pointer-events: none !important; opacity: 0 !important; }",
  });

  pushLog("Trying to submit sitemap.xml");
  const sitemapSelectors = [
    'input[aria-label*="sitemap"]:not([disabled])',
    'input[aria-label*="Sitemap"]:not([disabled])',
    'input[aria-label*="harita"]:not([disabled])',
    'input[placeholder*="sitemap"]:not([disabled])',
    'input[placeholder*="Sitemap"]:not([disabled])',
    'input[type="text"]:not([disabled])',
  ];

  let sitemapInput = null;
  for (const sel of sitemapSelectors) {
    const candidate = page.locator(sel).first();
    if (await candidate.isVisible({ timeout: 2500 }).catch(() => false)) {
      sitemapInput = candidate;
      break;
    }
  }
  if (!sitemapInput) throw new Error("Sitemap input not found");
  await sitemapInput.fill("sitemap.xml");
  const submitCandidates = [
    page.getByRole("button", { name: /submit|gonder|gönder|GONDER|GÖNDER/i }).first(),
    page.locator("button").filter({ hasText: /GÖNDER|GONDER|SUBMIT/ }).first(),
    page.locator('[role="button"]').filter({ hasText: /GÖNDER|GONDER|SUBMIT/ }).first(),
  ];
  let submitted = false;
  for (const btn of submitCandidates) {
    if (await btn.isVisible({ timeout: 2500 }).catch(() => false)) {
      await btn.click({ force: true });
      submitted = true;
      break;
    }
  }
  if (!submitted) {
    submitted = await clickByTextFallback(page, ["GÖNDER", "GONDER", "SUBMIT"]);
  }
  if (!submitted) await sitemapInput.press("Enter");
  await page.waitForTimeout(3500);
  await screenshot(page, "after-sitemap-submit");
  pushLog("Sitemap submit step attempted");

  const inspectBoxCandidates = [
    'input[aria-label*="Inspect"], input[placeholder*="Inspect"]',
    'input[aria-label*="URL"], input[placeholder*="URL"]',
    'input[aria-label*="incele"], input[placeholder*="incele"]',
    'input[type="search"]',
    'input[type="text"]:not([disabled])',
  ];

  for (const target of TARGET_URLS) {
    pushLog(`Inspecting ${target}`);
    let box = null;
    for (const sel of inspectBoxCandidates) {
      const candidate = page.locator(sel).first();
      if (await candidate.isVisible({ timeout: 2000 }).catch(() => false)) {
        box = candidate;
        break;
      }
    }
    if (!box) {
      box = page.locator("input").first();
      await box.waitFor({ timeout: 10000 });
    }

    await box.click({ force: true });
    await box.fill(target);
    await box.press("Enter");
    await page.waitForTimeout(6000);

    // Some runs auto-open the live URL test dialog and block the "Request indexing" action.
    for (let i = 0; i < 4; i++) {
      const liveTestDialog = page
        .getByText(/Yayınlanmış URL'nin dizine eklenebilir olup olmadığını test etme|test etme/i)
        .first();
      if (await liveTestDialog.isVisible({ timeout: 1200 }).catch(() => false)) {
        const cancelBtn = page.getByRole("button", { name: /İptal|Iptal|Cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 1200 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
          await page.waitForTimeout(1200);
          continue;
        }
      }
      break;
    }

    const requestCandidates = [
      page.getByText("DİZİNE EKLENMESİNİ İSTE", { exact: false }).first(),
      page.getByText("DIZINE EKLENMESINI ISTE", { exact: false }).first(),
      page.locator("text=/DİZİNE EKLENMESİNİ İSTE|DIZINE EKLENMESINI ISTE|Request indexing/i").first(),
    ];
    let requested = false;
    for (const requestText of requestCandidates) {
      if (await requestText.isVisible({ timeout: 2500 }).catch(() => false)) {
        await requestText.click({ force: true });
        await page.waitForTimeout(2800);
        requested = true;
        break;
      }
    }
    if (!requested) {
      requested = await clickByTextFallback(page, [
        "DİZİNE EKLENMESİNİ İSTE",
        "DIZINE EKLENMESINI ISTE",
        "Request indexing",
      ]);
      if (requested) await page.waitForTimeout(2800);
    }

    const successDialog = page.getByText(/Dizine eklenmesi istendi|Indexing requested/i).first();
    if (await successDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      pushLog(`Request indexing confirmed for ${target}`);
    } else if (requested) {
      pushLog(`Request indexing clicked for ${target} (confirmation not detected)`);
    } else {
      pushLog(`Request indexing action not available for ${target}`);
    }
    await screenshot(page, `inspect-${target.replace(/https?:\/\//, "").replace(/[\/:]/g, "_")}`);
  }

  pushLog("GSC automation steps completed");
} catch (err) {
  pushLog(`Error: ${err.message}`);
  await screenshot(page, "error");
  process.exitCode = 1;
} finally {
  const logPath = path.join(REPORT_DIR, `${stamp}-gsc-run.log`);
  await fs.writeFile(logPath, `${log.join("\n")}\n`, "utf8");
  pushLog(`Log written: ${logPath}`);
  await context.close();
}
