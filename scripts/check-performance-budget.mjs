import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distPath = fileURLToPath(new URL("../dist", import.meta.url));
const assetsPath = join(distPath, "assets");

const budget = {
  htmlMaxBytes: 12 * 1024,
  cssMainMaxBytes: 90 * 1024,
  jsMainMaxBytes: 260 * 1024,
  totalJsMaxBytes: 420 * 1024,
  thirdPartyScriptMaxCount: 2,
};

const files = readdirSync(assetsPath);
const jsFiles = files.filter((file) => file.endsWith(".js"));
const cssFiles = files.filter((file) => file.endsWith(".css"));
const mainJs = jsFiles.find((file) => file.startsWith("index-"));
const mainCss = cssFiles.find((file) => file.startsWith("index-"));

const sizeOf = (path) => statSync(path).size;
const totalJsBytes = jsFiles.reduce((sum, file) => sum + sizeOf(join(assetsPath, file)), 0);
const htmlBytes = sizeOf(join(distPath, "index.html"));
const mainJsBytes = mainJs ? sizeOf(join(assetsPath, mainJs)) : 0;
const mainCssBytes = mainCss ? sizeOf(join(assetsPath, mainCss)) : 0;

const checks = [
  { name: "index.html", ok: htmlBytes <= budget.htmlMaxBytes, value: htmlBytes, limit: budget.htmlMaxBytes },
  { name: "main.css", ok: mainCssBytes <= budget.cssMainMaxBytes, value: mainCssBytes, limit: budget.cssMainMaxBytes },
  { name: "main.js", ok: mainJsBytes <= budget.jsMainMaxBytes, value: mainJsBytes, limit: budget.jsMainMaxBytes },
  { name: "total.js", ok: totalJsBytes <= budget.totalJsMaxBytes, value: totalJsBytes, limit: budget.totalJsMaxBytes },
];

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)}KB`;

console.log("Performance budget report:");
for (const check of checks) {
  console.log(`- ${check.name}: ${formatKb(check.value)} / limit ${formatKb(check.limit)} => ${check.ok ? "OK" : "FAIL"}`);
}

// Third-party script budget for current static index output.
if (!readdirSync(distPath).includes("index.html")) {
  console.error("dist/index.html not found");
  process.exit(1);
}
const indexFile = join(distPath, "index.html");
const indexText = readFileSync(indexFile, "utf8");
const thirdPartyScriptCount = (indexText.match(/<script[^>]+src="https?:\/\/(?!nisankoltukyikama\.com)[^"]+"/g) || []).length;
const thirdPartyOk = thirdPartyScriptCount <= budget.thirdPartyScriptMaxCount;
console.log(`- third_party_scripts: ${thirdPartyScriptCount} / limit ${budget.thirdPartyScriptMaxCount} => ${thirdPartyOk ? "OK" : "FAIL"}`);

const allOk = checks.every((check) => check.ok) && thirdPartyOk;
if (!allOk) {
  process.exit(1);
}
