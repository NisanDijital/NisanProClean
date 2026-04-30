import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.AUDIT_URL || "http://127.0.0.1:5175";
const outDir = path.resolve("reports", "customer-audit");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

async function ensureDir() {
  await fs.mkdir(outDir, { recursive: true });
}

async function snapshot(page, name) {
  const file = path.join(outDir, `${stamp}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function collectSignals(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    };

    const text = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const fixed = Array.from(document.querySelectorAll("*"))
      .filter((el) => visible(el) && window.getComputedStyle(el).position === "fixed")
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: text(el).slice(0, 120),
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

    const ctas = Array.from(document.querySelectorAll("a,button"))
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: text(el).slice(0, 100),
        href: el.getAttribute("href") || "",
      }))
      .filter((item) => /ara|whatsapp|randevu|fiyat|hemen|gonder|gönder|al/i.test(item.text + " " + item.href))
      .slice(0, 40);

    const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .filter(visible)
      .map((el) => ({ tag: el.tagName.toLowerCase(), text: text(el).slice(0, 140) }))
      .slice(0, 60);

    const mojibake = Array.from(document.querySelectorAll("body *"))
      .map(text)
      .filter((value) => /Ã|Ä|Å|�/.test(value))
      .slice(0, 30);

    return { viewport, fixed, ctas, headings, mojibake };
  });
}

async function main() {
  await ensureDir();
  const browser = await chromium.launch({ headless: true });
  const report = { baseUrl, stamp, views: [] };

  for (const profile of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height } });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2400);

    const firstScreen = await snapshot(page, `${profile.name}-01-first-screen`);
    const firstSignals = await collectSignals(page);

    await page.locator("#fiyat-hesapla").scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(900);
    const pricingScreen = await snapshot(page, `${profile.name}-02-pricing`);
    const pricingSignals = await collectSignals(page);

    await page.locator("#services").scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(900);
    const servicesScreen = await snapshot(page, `${profile.name}-03-services`);

    report.views.push({
      profile,
      screenshots: { firstScreen, pricingScreen, servicesScreen },
      firstSignals,
      pricingSignals,
    });

    await page.close();
  }

  await browser.close();
  const jsonPath = path.join(outDir, `${stamp}-customer-audit.json`);
  const mdPath = path.join(outDir, `${stamp}-customer-audit.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const lines = [];
  lines.push("# Customer Journey Audit");
  lines.push("");
  lines.push(`- URL: ${baseUrl}`);
  lines.push(`- Generated: ${stamp}`);
  lines.push("");
  for (const view of report.views) {
    lines.push(`## ${view.profile.name}`);
    lines.push(`- First screen: ${view.screenshots.firstScreen}`);
    lines.push(`- Pricing: ${view.screenshots.pricingScreen}`);
    lines.push(`- Services: ${view.screenshots.servicesScreen}`);
    lines.push(`- Fixed elements on first screen: ${view.firstSignals.fixed.length}`);
    lines.push(`- CTA-like controls on first screen: ${view.firstSignals.ctas.length}`);
    lines.push(`- Mojibake samples: ${view.firstSignals.mojibake.length + view.pricingSignals.mojibake.length}`);
    lines.push("");
  }
  await fs.writeFile(mdPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`JSON_REPORT=${jsonPath}`);
  console.log(`MARKDOWN_REPORT=${mdPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
