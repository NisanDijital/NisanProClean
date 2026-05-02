import { test, expect } from "@playwright/test";

test("home page responds and renders primary CTA", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  const cta = page.getByRole("link", { name: /fiyat teklifi al|fiyat hesapla|whatsapp/i }).first();
  await expect(cta).toBeVisible();
});

test("blog page responds", async ({ page }) => {
  const response = await page.goto("/blog/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
});

test("admin page responds", async ({ page }) => {
  const response = await page.goto("/admin.html", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
});
