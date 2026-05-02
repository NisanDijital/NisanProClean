import { runBlogCadence, type BlogAgentEnv } from "./blogAgent";
import { runQaGrowthMonitor, type QaEnv } from "./qaMonitor";

type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export type SuperAgentEnv = BlogAgentEnv &
  QaEnv & {
    LEAD_LOGS: KVLike;
    SUPER_AGENT_ENABLED?: string;
    SUPER_NOTIFY_WEBHOOK_URL?: string;
    SUPER_NOTIFY_WEBHOOK_TOKEN?: string;
    SUPER_TELEGRAM_ENABLED?: string;
    SUPER_TELEGRAM_BOT_TOKEN?: string;
    SUPER_TELEGRAM_CHAT_ID?: string;
    SUPER_WHATSAPP_ENABLED?: string;
    SUPER_WHATSAPP_PHONE_NUMBER_ID?: string;
    SUPER_WHATSAPP_ACCESS_TOKEN?: string;
    SUPER_WHATSAPP_TO?: string;
    INSTAGRAM_INGEST_ENABLED?: string;
  };

type SuperRunSummary = {
  ts: string;
  ok: boolean;
  phase: "daily" | "manual";
  identity: {
    role: string;
    mission: string;
    operatingMode: string;
  };
  blog: { ok: boolean; details: string };
  qa: { status: "green" | "yellow" | "red"; summary: string[] };
  site: { ok: boolean; details: string };
  growth: { ok: boolean; details: string };
  instagram: { ingested: number; processed: number; details: string };
  subtasks: Array<{ id: string; type: string; status: "queued" | "done"; note: string }>;
  notifications: Array<{ channel: "webhook" | "telegram" | "whatsapp"; ok: boolean; detail: string }>;
};

export type InstagramIngestPayload = {
  source?: string;
  username?: string;
  userId?: string;
  message?: string;
  permalink?: string;
  ts?: string;
};

const isEnabled = (value?: string) => {
  if (!value) return true;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase().trim());
};

const asCompact = (value: string, limit = 300) => value.replace(/\s+/g, " ").trim().slice(0, limit);

const DIGITAL_TWIN = {
  role: "NisanProClean SuperAgent",
  mission: "Siteyi ayakta tutmak, lead ve icerik akisina hiz katmak, riskleri erken yakalamak.",
  operatingMode: "owner-mode",
};

const parseSafeJson = <T>(value: string | null, fallbackValue: T): T => {
  if (!value) return fallbackValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallbackValue;
  }
};

export async function ingestInstagramMessage(env: SuperAgentEnv, payload: InstagramIngestPayload): Promise<{ ok: boolean; id: string }> {
  const id = `ig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    id,
    source: payload.source || "instagram",
    username: String(payload.username || "").trim(),
    userId: String(payload.userId || "").trim(),
    message: String(payload.message || "").trim().slice(0, 2000),
    permalink: String(payload.permalink || "").trim(),
    ts: payload.ts || new Date().toISOString(),
    status: "queued",
  };

  await env.LEAD_LOGS.put(`ig-msg:${id}`, JSON.stringify(row), { expirationTtl: 60 * 60 * 24 * 30 });
  const queue = parseSafeJson<string[]>(await env.LEAD_LOGS.get("ig-msg:queue"), []);
  queue.push(id);
  await env.LEAD_LOGS.put("ig-msg:queue", JSON.stringify(queue.slice(-200)), { expirationTtl: 60 * 60 * 24 * 30 });
  return { ok: true, id };
}

const processInstagramQueue = async (
  env: SuperAgentEnv,
  subtasks: SuperRunSummary["subtasks"],
): Promise<{ ingested: number; processed: number; details: string }> => {
  if (!isEnabled(env.INSTAGRAM_INGEST_ENABLED)) {
    return { ingested: 0, processed: 0, details: "instagram_ingest_disabled" };
  }

  const queue = parseSafeJson<string[]>(await env.LEAD_LOGS.get("ig-msg:queue"), []);
  if (queue.length === 0) {
    return { ingested: 0, processed: 0, details: "no_pending_instagram_messages" };
  }

  const batch = queue.slice(0, 10);
  for (const id of batch) {
    const raw = parseSafeJson<Record<string, unknown>>(await env.LEAD_LOGS.get(`ig-msg:${id}`), {});
    const user = String(raw.username || raw.userId || "unknown");
    const text = asCompact(String(raw.message || ""), 160);
    const subId = await createSubtask(env, "instagram-lead-followup", `@${user} -> ${text}`);
    await completeSubtask(env, subId, "instagram lead follow-up taslagi olusturuldu");
    subtasks.push({
      id: subId,
      type: "instagram-lead-followup",
      status: "done",
      note: "instagram lead follow-up taslagi olusturuldu",
    });

    await env.LEAD_LOGS.put(
      `ig-msg:${id}`,
      JSON.stringify({
        ...raw,
        status: "processed",
        processedAt: new Date().toISOString(),
      }),
      { expirationTtl: 60 * 60 * 24 * 30 },
    );
  }

  await env.LEAD_LOGS.put("ig-msg:queue", JSON.stringify(queue.slice(batch.length)), {
    expirationTtl: 60 * 60 * 24 * 30,
  });
  return {
    ingested: queue.length,
    processed: batch.length,
    details: `processed_${batch.length}_of_${queue.length}`,
  };
};

const createSubtask = async (env: SuperAgentEnv, type: string, note: string) => {
  const id = `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await env.LEAD_LOGS.put(
    `super-subtask:${id}`,
    JSON.stringify({
      id,
      type,
      status: "queued",
      note,
      ts: new Date().toISOString(),
    }),
    { expirationTtl: 60 * 60 * 24 * 30 },
  );
  return id;
};

const completeSubtask = async (env: SuperAgentEnv, id: string, note: string) => {
  await env.LEAD_LOGS.put(
    `super-subtask:${id}`,
    JSON.stringify({
      id,
      status: "done",
      note,
      ts: new Date().toISOString(),
    }),
    { expirationTtl: 60 * 60 * 24 * 30 },
  );
};

const notifyWebhook = async (env: SuperAgentEnv, text: string) => {
  if (!env.SUPER_NOTIFY_WEBHOOK_URL) return { channel: "webhook" as const, ok: false, detail: "missing_webhook_url" };
  try {
    const response = await fetch(env.SUPER_NOTIFY_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.SUPER_NOTIFY_WEBHOOK_TOKEN ? { authorization: `Bearer ${env.SUPER_NOTIFY_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        source: "nisanproclean-super-agent",
        text,
        ts: new Date().toISOString(),
      }),
    });
    return { channel: "webhook" as const, ok: response.ok, detail: response.ok ? "sent" : `http_${response.status}` };
  } catch (error) {
    return { channel: "webhook" as const, ok: false, detail: `error:${String((error as Error).message || error)}` };
  }
};

export const sendTelegramText = async (
  env: Pick<SuperAgentEnv, "SUPER_TELEGRAM_ENABLED" | "SUPER_TELEGRAM_BOT_TOKEN" | "SUPER_TELEGRAM_CHAT_ID">,
  text: string,
) => {
  if (!isEnabled(env.SUPER_TELEGRAM_ENABLED)) {
    return { channel: "telegram" as const, ok: false, detail: "disabled" };
  }
  if (!env.SUPER_TELEGRAM_BOT_TOKEN || !env.SUPER_TELEGRAM_CHAT_ID) {
    return { channel: "telegram" as const, ok: false, detail: "missing_telegram_config" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(env.SUPER_TELEGRAM_BOT_TOKEN)}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: env.SUPER_TELEGRAM_CHAT_ID,
          text: text.slice(0, 3900),
          disable_web_page_preview: true,
        }),
      },
    );
    return { channel: "telegram" as const, ok: response.ok, detail: response.ok ? "sent" : `http_${response.status}` };
  } catch (error) {
    return { channel: "telegram" as const, ok: false, detail: `error:${String((error as Error).message || error)}` };
  }
};

const notifyWhatsApp = async (env: SuperAgentEnv, text: string) => {
  if (!isEnabled(env.SUPER_WHATSAPP_ENABLED)) {
    return { channel: "whatsapp" as const, ok: false, detail: "disabled" };
  }
  if (!env.SUPER_WHATSAPP_PHONE_NUMBER_ID || !env.SUPER_WHATSAPP_ACCESS_TOKEN || !env.SUPER_WHATSAPP_TO) {
    return { channel: "whatsapp" as const, ok: false, detail: "missing_whatsapp_config" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(env.SUPER_WHATSAPP_PHONE_NUMBER_ID)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SUPER_WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: env.SUPER_WHATSAPP_TO,
          type: "text",
          text: { body: text.slice(0, 3800) },
        }),
      },
    );
    return { channel: "whatsapp" as const, ok: response.ok, detail: response.ok ? "sent" : `http_${response.status}` };
  } catch (error) {
    return { channel: "whatsapp" as const, ok: false, detail: `error:${String((error as Error).message || error)}` };
  }
};

export async function runSuperAgent(env: SuperAgentEnv, phase: "daily" | "manual" = "manual"): Promise<SuperRunSummary> {
  if (!isEnabled(env.SUPER_AGENT_ENABLED)) {
    return {
      ts: new Date().toISOString(),
      ok: true,
      phase,
      identity: DIGITAL_TWIN,
      blog: { ok: true, details: "super_agent_disabled" },
      qa: { status: "green", summary: ["Super agent kapali"] },
      site: { ok: true, details: "disabled" },
      growth: { ok: true, details: "disabled" },
      instagram: { ingested: 0, processed: 0, details: "disabled" },
      subtasks: [],
      notifications: [],
    };
  }

  const siteCheck = await (async () => {
    const target = (env.QA_TARGET_URL || env.BLOG_API_BASE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
    try {
      const [home, admin, api] = await Promise.all([
        fetch(`${target}/`, { method: "GET" }),
        fetch(`${target}/admin.html`, { method: "GET" }),
        fetch(`${target}/api.php?action=health`, { method: "GET" }),
      ]);
      if (!home.ok || !admin.ok || !api.ok) {
        return {
          ok: false,
          details: `home:${home.status} admin:${admin.status} api:${api.status}`,
        };
      }
      return { ok: true, details: "home/admin/api ok" };
    } catch (error) {
      return { ok: false, details: `site_check_error:${String((error as Error).message || error)}` };
    }
  })();

  const blog = await runBlogCadence(env);
  const qaReport = await runQaGrowthMonitor(env);
  const subtasks: SuperRunSummary["subtasks"] = [];
  const instagram = await processInstagramQueue(env, subtasks);
  const growth = {
    ok: qaReport.status === "green" && blog.ok,
    details: qaReport.status === "green" ? "growth_path_clear" : "qa_or_blog_needs_attention",
  };

  if (!blog.ok) {
    const id = await createSubtask(env, "blog-retry", asCompact(blog.details));
    await completeSubtask(env, id, "blog retry planlandi");
    subtasks.push({ id, type: "blog-retry", status: "done", note: "blog retry planlandi" });
  }

  if (qaReport.status === "red" || qaReport.status === "yellow") {
    const id = await createSubtask(env, "qa-fix-plan", qaReport.summary.join(" | "));
    await completeSubtask(env, id, "qa aksiyon listesi olusturuldu");
    subtasks.push({ id, type: "qa-fix-plan", status: "done", note: "qa aksiyon listesi olusturuldu" });
  }

  if (!siteCheck.ok) {
    const id = await createSubtask(env, "site-recovery", siteCheck.details);
    await completeSubtask(env, id, "site recovery checklist olusturuldu");
    subtasks.push({ id, type: "site-recovery", status: "done", note: "site recovery checklist olusturuldu" });
  }

  const text =
    `NisanProClean SuperAgent Raporu\n` +
    `Tarih: ${new Date().toLocaleString("tr-TR")}\n` +
    `Rol: ${DIGITAL_TWIN.role}\n` +
    `Misyon: ${DIGITAL_TWIN.mission}\n` +
    `Faz: ${phase}\n` +
    `Site: ${siteCheck.ok ? "OK" : "HATA"} (${siteCheck.details})\n` +
    `Blog: ${blog.ok ? "OK" : "HATA"}\n` +
    `QA: ${qaReport.status.toUpperCase()} | ${qaReport.summary.join(" / ")}\n` +
    `Growth: ${growth.ok ? "CLEAR" : "ACTION"} (${growth.details})\n` +
    `Instagram: ${instagram.details}\n` +
    `Alt Gorev: ${subtasks.length}`;

  const notifications = [await notifyWebhook(env, text), await sendTelegramText(env, text), await notifyWhatsApp(env, text)];

  const summary: SuperRunSummary = {
    ts: new Date().toISOString(),
    ok: blog.ok && qaReport.status !== "red" && siteCheck.ok,
    phase,
    identity: DIGITAL_TWIN,
    blog,
    qa: { status: qaReport.status, summary: qaReport.summary },
    site: siteCheck,
    growth,
    instagram,
    subtasks,
    notifications,
  };

  await env.LEAD_LOGS.put(
    "super-agent:profile",
    JSON.stringify({
      ts: new Date().toISOString(),
      identity: DIGITAL_TWIN,
      coreDuties: [
        "site health kontrolu",
        "blog cadence yonetimi",
        "qa ve geo risk takibi",
        "aksiyon subtask olusturma",
        "yonetici bildirimleri",
      ],
    }),
    { expirationTtl: 60 * 60 * 24 * 365 },
  );

  await env.LEAD_LOGS.put(`super-run:${Date.now()}`, JSON.stringify(summary), { expirationTtl: 60 * 60 * 24 * 90 });
  await env.LEAD_LOGS.put("super-run:latest", JSON.stringify(summary), { expirationTtl: 60 * 60 * 24 * 90 });
  return summary;
}
