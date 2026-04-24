import { chromium } from "playwright";

const URL = process.argv[2] || "https://nisankoltukyikama.com/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

try {
  await page.goto(URL, { waitUntil: "networkidle" });

  await page.locator("#testimonials").scrollIntoViewIfNeeded();
  const reviewButton = page.getByRole("button", { name: "Hizmet Gorusunu Paylas" });
  await reviewButton.click();
  const modalVisibleByText = await page
    .locator("text=Hizmeti Degerlendir")
    .first()
    .isVisible()
    .catch(() => false);

  const modalVisibleByClassProbe = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("div")).some((el) => {
      const cls = el.className;
      return (
        typeof cls === "string" &&
        cls.includes("fixed") &&
        cls.includes("inset-0") &&
        cls.includes("z-[100]")
      );
    });
  });

  const footerLinks = await page.$$eval("footer a", (links) =>
    links.map((link) => ({
      text: (link.textContent || "").trim(),
      href: link.getAttribute("href") || "",
    }))
  );

  const placeholderLinks = footerLinks.filter((link) => link.href === "#" || link.href.startsWith("#/"));

  const summary = {
    url: URL,
    modalVisibleAfterClick: modalVisibleByText || modalVisibleByClassProbe,
    modalVisibleByText,
    modalVisibleByClassProbe,
    footerLinkCount: footerLinks.length,
    placeholderLinkCount: placeholderLinks.length,
    placeholderLinks,
  };

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
}
