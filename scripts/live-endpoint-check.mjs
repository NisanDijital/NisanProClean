const siteBase = (process.env.SITE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
const workerBase = (process.env.WORKER_URL || "https://nisanproclean-lead-agent.nisankoltukyikamacom.workers.dev").replace(/\/+$/, "");

const checks = [
  `${siteBase}/`,
  `${siteBase}/blog/`,
  `${siteBase}/admin.html`,
  `${workerBase}/health`,
];

const results = [];
let allOk = true;

for (const url of checks) {
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: "follow" });
    const ms = Date.now() - started;
    const ok = response.status === 200;
    results.push({ url, status: response.status, ms, ok });
    if (!ok) allOk = false;
  } catch (error) {
    results.push({
      url,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      error: String(error?.message || error),
    });
    allOk = false;
  }
}

for (const row of results) {
  const marker = row.ok ? "OK" : "FAIL";
  console.log(`[live-check] ${marker} ${row.url} status=${row.status} ms=${row.ms}`);
  if (row.error) console.log(`[live-check] error=${row.error}`);
}

if (!allOk) {
  process.exit(1);
}
