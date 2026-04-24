import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
const PUBLIC_DIR = path.resolve("public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");

const today = new Date().toISOString().slice(0, 10);

const legalPages = new Set(["kvkk.html", "gizlilik.html", "cerez-politikasi.html", "kullanim-sartlari.html"]);

const urlPriority = (urlPath) => {
  if (urlPath === "/") return "1.0";
  if (urlPath === "/koltuk-yikama/" || urlPath === "/yatak-yikama/" || urlPath === "/arac-koltugu-yikama/" || urlPath === "/sandalye-yikama/") {
    return "0.9";
  }
  if (urlPath.endsWith("-koltuk-yikama/")) return "0.8";
  if (legalPages.has(urlPath.replace(/^\//, ""))) return "0.3";
  return "0.7";
};

const urlFreq = (urlPath) => (legalPages.has(urlPath.replace(/^\//, "")) ? "monthly" : "weekly");

const asUrl = (urlPath) => `${SITE_URL}${urlPath}`;

const collectPublicUrls = async () => {
  const entries = await fs.readdir(PUBLIC_DIR, { withFileTypes: true });
  const urls = new Set(["/"]);

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(PUBLIC_DIR, entry.name, "index.html");
      try {
        await fs.access(indexPath);
        urls.add(`/${entry.name}/`);
      } catch {
        // ignore folders without index.html
      }
      continue;
    }

    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".html")) continue;
    if (entry.name === "index.html") continue;
    if (legalPages.has(entry.name)) continue;
    urls.add(`/${entry.name}`);
  }

  return Array.from(urls).sort((a, b) => a.localeCompare(b, "tr"));
};

const buildXml = (paths) => {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const p of paths) {
    lines.push("  <url>");
    lines.push(`    <loc>${asUrl(p)}</loc>`);
    lines.push(`    <lastmod>${today}</lastmod>`);
    lines.push(`    <changefreq>${urlFreq(p)}</changefreq>`);
    lines.push(`    <priority>${urlPriority(p)}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return `${lines.join("\n")}\n`;
};

const paths = await collectPublicUrls();
const xml = buildXml(paths);
await fs.writeFile(SITEMAP_PATH, xml, "utf8");
console.log(`Sitemap generated: ${SITEMAP_PATH}`);
console.log(`URL count: ${paths.length}`);
