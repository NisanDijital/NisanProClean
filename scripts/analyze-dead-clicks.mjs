import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const TARGET_URL = "https://nisankoltukyikama.com/";
const OUTPUT_DIR = path.resolve(".playwright-cli");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const sections = [
  { id: "features", selector: "#features" },
  { id: "testimonials", selector: "#testimonials" },
];

const isClickableScript = `
  (node) => {
    if (!node || !(node instanceof Element)) return false;
    const clickableSelector = 'a,button,input,select,textarea,[role="button"],[onclick],[data-analytics-source]';
    let current = node;
    while (current && current instanceof Element) {
      if (current.matches(clickableSelector)) return true;
      const style = window.getComputedStyle(current);
      if (style.cursor === 'pointer') return true;
      current = current.parentElement;
    }
    return false;
  }
`;

const analyzeSection = async (page, section) => {
  await page.evaluate((id) => {
    const el = document.querySelector(`#${id}`);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  }, section.id);

  await page.waitForTimeout(700);

  const data = await page.evaluate(
    ({ selector, isClickableFn }) => {
      const root = document.querySelector(selector);
      if (!root) return null;

      const isClickable = new Function("node", `return (${isClickableFn})(node);`);
      const rect = root.getBoundingClientRect();
      const cols = 8;
      const rows = 6;
      const points = [];
      let clickableCount = 0;
      let nonClickableCount = 0;

      for (let y = 1; y <= rows; y += 1) {
        for (let x = 1; x <= cols; x += 1) {
          const px = rect.left + (rect.width * x) / (cols + 1);
          const py = rect.top + (rect.height * y) / (rows + 1);
          const target = document.elementFromPoint(px, py);
          const clickable = isClickable(target);
          const text = (target?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
          const cls = target?.className ? String(target.className).slice(0, 120) : "";
          const tag = target?.tagName?.toLowerCase() || "";

          if (clickable) clickableCount += 1;
          else nonClickableCount += 1;

          points.push({
            x: Math.round(px),
            y: Math.round(py),
            clickable,
            tag,
            className: cls,
            text,
          });
        }
      }

      const interactive = Array.from(
        root.querySelectorAll('a,button,[role="button"],input[type="submit"],input[type="button"]')
      )
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
            aria: el.getAttribute("aria-label") || "",
            href: el.getAttribute("href") || "",
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        })
        .filter((el) => el.width > 0 && el.height > 0);

      return {
        selector,
        viewportRect: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
        sampleCount: points.length,
        clickableCount,
        nonClickableCount,
        nonClickableRatio: Number((nonClickableCount / points.length).toFixed(3)),
        samplePoints: points,
        interactiveElements: interactive,
      };
    },
    { selector: section.selector, isClickableFn: isClickableScript }
  );

  return data;
};

const run = async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2200);

  const report = {
    generatedAt: new Date().toISOString(),
    url: TARGET_URL,
    sections: [],
  };

  for (const section of sections) {
    const sectionData = await analyzeSection(page, section);
    if (!sectionData) {
      report.sections.push({
        id: section.id,
        error: "Section not found",
      });
      continue;
    }

    const screenshotPath = path.join(OUTPUT_DIR, `deadclick-${section.id}-${timestamp}.png`);
    const sectionElement = await page.$(section.selector);
    if (sectionElement) {
      await sectionElement.screenshot({ path: screenshotPath });
    }

    report.sections.push({
      id: section.id,
      screenshot: screenshotPath,
      ...sectionData,
    });
  }

  const reportPath = path.join(OUTPUT_DIR, `deadclick-report-${timestamp}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  await browser.close();

  console.log(`REPORT_PATH=${reportPath}`);
  for (const section of report.sections) {
    if (section.error) {
      console.log(`${section.id}: ERROR=${section.error}`);
      continue;
    }
    console.log(
      `${section.id}: nonClickableRatio=${section.nonClickableRatio}, clickableSamples=${section.clickableCount}/${section.sampleCount}, interactiveElements=${section.interactiveElements.length}`
    );
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
