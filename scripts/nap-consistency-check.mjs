import fs from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = path.resolve("reports");
const REPORT_PATH = path.join(REPORT_DIR, "nap-consistency-report.json");

const expected = {
  businessName: "NisanProClean",
  phoneLocalDigits: "05079581642",
  phoneInternationalDigits: "905079581642",
  locality: "Afyonkarahisar",
};

const pagesToCheck = [
  path.resolve("index.html"),
  path.resolve("public", "koltuk-yikama", "index.html"),
  path.resolve("public", "yatak-yikama", "index.html"),
  path.resolve("public", "arac-koltugu-yikama", "index.html"),
  path.resolve("public", "sandalye-yikama", "index.html"),
  path.resolve("public", "fiyatlar", "index.html"),
];

const digitsOnly = (value) => (value || "").replace(/\D/g, "");

const run = async () => {
  const checks = [];

  for (const filePath of pagesToCheck) {
    const html = await fs.readFile(filePath, "utf8");
    const nameOk = html.includes(expected.businessName);
    const phoneLocalOk = html.includes(expected.phoneLocalDigits) || digitsOnly(html).includes(expected.phoneLocalDigits);
    const phoneIntlOk = html.includes(expected.phoneInternationalDigits) || digitsOnly(html).includes(expected.phoneInternationalDigits);
    const localityOk = html.includes(expected.locality) || html.includes("Afyon Merkez");

    checks.push({
      file: filePath,
      nameOk,
      phoneLocalOk,
      phoneIntlOk,
      localityOk,
      ok: nameOk && (phoneLocalOk || phoneIntlOk) && localityOk,
    });
  }

  const result = {
    checkedAtUtc: new Date().toISOString(),
    expected,
    checks,
    ok: checks.every((item) => item.ok),
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`NAP report written: ${REPORT_PATH}`);
  for (const item of checks) {
    const short = path.relative(process.cwd(), item.file);
    console.log(`${short}: ${item.ok ? "OK" : "FAIL"}`);
  }
  console.log(`OVERALL_OK=${result.ok}`);

  if (!result.ok) process.exit(1);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
