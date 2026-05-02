import { repairPublishedBlogs, runBlogCadence, runDailyBlogAgent } from "./blogAgent";
import { runQaGrowthMonitor } from "./qaMonitor";
import { ingestInstagramMessage, runSuperAgent, sendTelegramText } from "./superAgent";

export interface Env {
  LEAD_LOGS: KVNamespace;
  ALLOWED_ORIGIN: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_MODELS?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  AI_MODEL_PRIMARY?: string;
  AI_MODEL_FALLBACK?: string;
  AI_MODELS?: string;
  SUPER_OPENROUTER_MODEL?: string;
  SUPER_OPENROUTER_MODELS?: string;
  SUPER_GEMINI_MODEL?: string;
  SUPER_WORKERS_AI_MODELS?: string;
  BLOG_API_BASE_URL?: string;
  BLOG_API_TOKEN?: string;
  BLOG_DAILY_ENABLED?: string;
  BLOG_SEED_KEYWORDS?: string;
  BLOG_OPENROUTER_MODEL?: string;
  BLOG_OPENROUTER_MODELS?: string;
  BLOG_GEMINI_MODEL?: string;
  BLOG_WORKERS_AI_MODELS?: string;
  BLOG_BOOTCAMP_DAYS?: string;
  BLOG_BOOTCAMP_PER_DAY?: string;
  BLOG_NORMAL_PER_DAY?: string;
  SUPER_AGENT_ENABLED?: string;
  SUPER_AGENT_CRON_SECRET?: string;
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
  INSTAGRAM_INGEST_SECRET?: string;
  BLOG_CRON_SECRET?: string;
  QA_CRON_SECRET?: string;
  QA_TARGET_URL?: string;
  QA_PSI_API_KEY?: string;
  GSC_SITE_URL?: string;
  GSC_ACCESS_TOKEN?: string;
  CLARITY_PROJECT_ID?: string;
  CLARITY_ACCESS_TOKEN?: string;
  AI?: Ai;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

type ScheduledEvent = {
  readonly cron: string;
  readonly scheduledTime: number;
};

interface Ai {
  run(
    model: string,
    input: {
      messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      max_tokens?: number;
      temperature?: number;
    },
  ): Promise<{ response?: string }>;
}

type LeadPayload = {
  name?: string;
  phone?: string;
  address?: string;
  service?: string;
  date?: string;
  slot?: string;
  source?: string;
};

type LeadSaveResult = {
  id: string;
  duplicate: boolean;
  createdAt?: string;
  payload?: {
    name: string;
    phone: string;
    address: string;
    service: string;
    date: string;
    slot: string;
    source: string;
  };
};

type ChatPayload = {
  message?: string;
  history?: Array<{ role?: string; text?: string }>;
};

type ChatTurnResult = {
  success: boolean;
  reply: string;
  error?: string;
  status?: number;
  history: Array<{ role: "user" | "assistant"; text: string }>;
};

type ExtractedAppointment = {
  name: string;
  phone: string;
  address: string;
  service: string;
  date: string;
  slot: string;
  isComplete: boolean;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const cors = (origin: string) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,x-blog-cron-secret,x-qa-cron-secret,x-super-agent-secret,x-instagram-ingest-secret",
});

const normalizeForIntent = (message: string) =>
  message.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{Diacritic}/gu, "");

const normalizePhone = (value = "") => value.replace(/\D/g, "");
const normalizeKeyPart = (value = "") => normalizeForIntent(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const parseModelList = (value?: string) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isValidLead = (lead: LeadPayload) => {
  const name = (lead.name || "").trim();
  const phone = normalizePhone(lead.phone || "");
  const address = (lead.address || "").trim();
  return name.length >= 2 && phone.length >= 10 && address.length >= 5;
};

const isValidChatMessage = (payload: ChatPayload) => {
  const message = (payload.message || "").trim();
  return message.length >= 2 && message.length <= 1000;
};

const containsPricingIntent = (message: string) => {
  const normalized = normalizeForIntent(message);
  return (
    normalized.includes("fiyat") ||
    normalized.includes("ucret") ||
    normalized.includes("ne kadar") ||
    normalized.includes("kac tl") ||
    normalized.includes("fiyatlar")
  );
};

const containsNegotiationIntent = (message: string) => {
  const normalized = normalizeForIntent(message);
  return (
    normalized.includes("pahali") ||
    normalized.includes("indirim") ||
    normalized.includes("pazarlik") ||
    normalized.includes("son fiyat") ||
    normalized.includes("son ne") ||
    normalized.includes("dusur") ||
    normalized.includes("olmaz mi") ||
    normalized.includes("nakit") ||
    normalized.includes("kampanya") ||
    normalized.includes("butce") ||
    normalized.includes("uygun olur")
  );
};

const containsAppointmentIntent = (message: string) => {
  const normalized = normalizeForIntent(message);
  return (
    normalized.includes("randevu") ||
    normalized.includes("musait") ||
    normalized.includes("saat") ||
    normalized.includes("tarih") ||
    normalized.includes("slot")
  );
};

const containsMetaConversationIntent = (message: string) => {
  const normalized = normalizeForIntent(message);
  return (
    normalized.includes("ezbere") ||
    normalized.includes("sahibiyim") ||
    normalized.includes("kimsin") ||
    normalized.includes("sen bot musun") ||
    normalized.includes("beni dinlem") ||
    normalized.includes("onceki mesaji oku") ||
    normalized.includes("mesajlari oku") ||
    normalized.includes("anlamadin") ||
    normalized.includes("yanlis anladin")
  );
};

const containsOwnerReportIntent = (message: string) => {
  const normalized = normalizeForIntent(message);
  return (
    (normalized.includes("bugun") || normalized.includes("bu gun")) &&
    (normalized.includes("randevu alan") ||
      normalized.includes("lead") ||
      normalized.includes("talep") ||
      normalized.includes("kayit") ||
      normalized.includes("musteri geldi") ||
      normalized.includes("musteri var"))
  );
};

const containsStainAnalysisIntent = (message: string) => {
  const normalized = normalizeForIntent(message);
  return (
    normalized.includes("leke") ||
    normalized.includes("analiz") ||
    normalized.includes("fotograf") ||
    normalized.includes("resim") ||
    normalized.includes("cikarmi") ||
    normalized.includes("cikar mi")
  );
};

const compactHistory = (payload: ChatPayload, currentMessage: string): Array<{ role: "user" | "assistant"; text: string }> => {
  const history = Array.isArray(payload.history) ? payload.history : [];
  const cleaned = history
    .slice(-12)
    .map((item) => ({
      role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      text: String(item.text || "").trim().slice(0, 800),
    }))
    .filter((item) => item.text.length > 0);

  if (!cleaned.some((item) => item.role === "user" && item.text === currentMessage)) {
    cleaned.push({ role: "user" as const, text: currentMessage });
  }

  return cleaned;
};

const extractAppointment = (conversation: string): ExtractedAppointment => {
  const normalized = normalizeForIntent(conversation);
  const digits = conversation.replace(/\D/g, "");
  const phoneMatch = digits.match(/(?:90)?(5\d{9})/);
  const phone = phoneMatch ? `0${phoneMatch[1]}` : "";

  const phoneIndex = phoneMatch ? conversation.search(/0?\s*5\s*\d[\d\s().-]{8,}/) : -1;
  const beforePhone = phoneIndex > 0 ? conversation.slice(Math.max(0, phoneIndex - 60), phoneIndex).trim() : "";
  const explicitNameMatch = conversation.match(/(?:ad\s*soyad|isim)\s*[:\-]\s*([\p{L}]{2,}(?:\s+[\p{L}]{2,}){0,3})/iu);
  const inlineNameMatch = beforePhone.match(/([\p{L}]{2,}(?:\s+[\p{L}]{2,}){0,2})\s*$/u);
  const name = explicitNameMatch
    ? explicitNameMatch[1].trim()
    : (inlineNameMatch ? inlineNameMatch[1].trim() : "");

  const service = normalized.includes("arac")
    ? "Arac koltugu"
    : normalized.includes("yatak")
      ? "Yatak"
      : normalized.includes("koltuk")
        ? "Koltuk"
        : "";

  const slot = normalized.includes("09-12") || normalized.includes("09 12") || normalized.includes("9-12")
    ? "09:00 - 12:00"
    : normalized.includes("13-16") || normalized.includes("13 16") || normalized.includes("saat 16")
      ? "13:00 - 16:00"
      : normalized.includes("17-20") || normalized.includes("17 20")
        ? "17:00 - 20:00"
        : "";

  const dateMonthMatch = normalized.match(/\b(\d{1,2})\s*(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/);
  const dateNumericMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  const date = dateMonthMatch
    ? `${dateMonthMatch[1]} ${dateMonthMatch[2]}`
    : (dateNumericMatch ? `${dateNumericMatch[1]}.${dateNumericMatch[2]}` : (normalized.includes("yarin") ? "yarin" : ""));

  const explicitAddressMatch = conversation.match(/adres\s*[:\-]\s*([^\n,]{5,120})/iu);

  const addressPatterns = [
    /\bafyon\s+merkez\b/i,
    /\berenler\b/i,
    /\buydukent\b/i,
    /\berkmen\b/i,
    /\bsahipata\b/i,
    /\bsandikli\b/i,
    /\bbolvadin\b/i,
    /\bemirdag\b/i,
  ];
  const inferredAddress = addressPatterns.map((pattern) => conversation.match(pattern)?.[0]).find(Boolean) || "";
  const address = explicitAddressMatch ? explicitAddressMatch[1].trim() : inferredAddress;

  return {
    name,
    phone,
    address,
    service,
    date,
    slot,
    isComplete: Boolean(name && phone && address && service && date && slot),
  };
};

const appointmentSummaryReply = (lead: ExtractedAppointment, saved: boolean, duplicate = false) =>
  [
    duplicate ? "Bu randevu kaydi zaten alinmis." : saved ? "Tamam, randevu kaydini aldim." : "Bilgileri toparladim.",
    `Ad Soyad: ${lead.name}`,
    `Telefon: ${lead.phone}`,
    `Adres: ${lead.address}`,
    `Hizmet: ${lead.service}`,
    `Tarih: ${lead.date}`,
    `Saat: ${lead.slot}`,
    "",
    duplicate || saved
      ? "Musaitlik onayi icin WhatsApp uzerinden donus yapacagiz."
      : "Kayit sirasinda sorun olursa WhatsApp uzerinden devam edebiliriz.",
  ].join("\n");

const missingAppointmentReply = (lead: ExtractedAppointment) => {
  const received = [
    lead.name ? `Ad Soyad: ${lead.name}` : "",
    lead.phone ? `Telefon: ${lead.phone}` : "",
    lead.address ? `Adres: ${lead.address}` : "",
    lead.service ? `Hizmet: ${lead.service}` : "",
    lead.date ? `Tarih: ${lead.date}` : "",
    lead.slot ? `Saat: ${lead.slot}` : "",
  ].filter(Boolean);

  const missing = [
    !lead.name ? "ad soyad" : "",
    !lead.phone ? "telefon" : "",
    !lead.address ? "adres" : "",
    !lead.service ? "hizmet" : "",
    !lead.date ? "tarih" : "",
    !lead.slot ? "saat blogu" : "",
  ].filter(Boolean);

  return [
    received.length ? "Su bilgileri aldim:" : "Randevu olusturalim.",
    ...received,
    "",
    missing.length
      ? `Eksik kalan: ${missing.join(", ")}. Bunlari yazarsan kaydi hemen tamamlarim.`
      : "Bilgiler tamam gibi gorunuyor; kaydi acmayi deniyorum.",
    "Saat bloklari: 09:00-12:00 / 13:00-16:00 / 17:00-20:00.",
  ].join("\n");
};

const dedupeKeyForLead = (lead: Pick<LeadPayload, "phone" | "service" | "date" | "slot">) =>
  [
    "dedupe",
    normalizePhone(lead.phone || ""),
    normalizeKeyPart(lead.service || ""),
    normalizeKeyPart(lead.date || ""),
    normalizeKeyPart(lead.slot || ""),
  ].join(":");

const todayKey = () => new Date().toISOString().slice(0, 10);
const compactText = (value: string, limit = 300) => value.replace(/\s+/g, " ").trim().slice(0, limit);

const buildLeadTelegramText = (lead: NonNullable<LeadSaveResult["payload"]>) =>
  [
    "Yeni lead geldi",
    `Ad: ${lead.name}`,
    `Telefon: ${lead.phone}`,
    `Adres: ${lead.address}`,
    `Hizmet: ${lead.service}`,
    `Tarih: ${lead.date || "-"}`,
    `Saat: ${lead.slot || "-"}`,
    `Kaynak: ${lead.source}`,
  ].join("\n");

const notifyLeadTelegram = async (env: Env, result: LeadSaveResult) => {
  if (result.duplicate || !result.payload) return;
  await sendTelegramText(env, buildLeadTelegramText(result.payload));
};

const incrementDailyCounter = async (env: Env) => {
  const dailyCounterKey = `counter:${todayKey()}`;
  const current = Number((await env.LEAD_LOGS.get(dailyCounterKey)) || "0");
  await env.LEAD_LOGS.put(dailyCounterKey, String(current + 1), {
    expirationTtl: 60 * 60 * 24 * 370,
  });
};

const saveLead = async (env: Env, payload: LeadPayload): Promise<LeadSaveResult> => {
  const dedupeKey = dedupeKeyForLead(payload);
  const existingLeadId = await env.LEAD_LOGS.get(dedupeKey);
  if (existingLeadId) {
    return { id: existingLeadId, duplicate: true };
  }

  const leadId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const cleanedPayload = {
    name: (payload.name || "").trim(),
    phone: normalizePhone(payload.phone || ""),
    address: (payload.address || "").trim(),
    service: (payload.service || "").trim(),
    date: (payload.date || "").trim(),
    slot: (payload.slot || "").trim(),
    source: (payload.source || "web").trim(),
  };
  await env.LEAD_LOGS.put(
    `lead:${leadId}`,
    JSON.stringify({
      id: leadId,
      createdAt,
      ...cleanedPayload,
    }),
    { expirationTtl: 60 * 60 * 24 * 180 },
  );
  await env.LEAD_LOGS.put(dedupeKey, leadId, {
    expirationTtl: 60 * 60 * 24 * 180,
  });
  await incrementDailyCounter(env);
  const result: LeadSaveResult = { id: leadId, duplicate: false, createdAt, payload: cleanedPayload };
  await notifyLeadTelegram(env, result);
  return result;
};

const systemPrompt = [
  "Sen NisanProClean icin calisan bir randevu asistanisin.",
  "Her zaman Turkce cevap ver.",
  "Kisa, net, dogal ve yardimci cevap ver.",
  "Musteri sinirli yazsa bile sakin kal, azarlama.",
  "Kullanici sitenin sahibi, ekipten biri veya test eden biri olabilir; boyle bir durumda bunu kabul et ve test/iyilestirme odakli cevap ver.",
  "Kullanici seni ezbere konusmakla elestirirse savunmaya gecme; once neyi yanlis anladigini kisaca soyle, sonra daha akilli ve baglama uygun cevap ver.",
  "Sadece koltuk, yatak, arac koltugu temizligi ve randevu konularinda cevap ver.",
  "Fiyat sorularinda asla rakam uydurma.",
  "Pazarlik ve indirim isteginde yetkisiz indirim sozu verme; once kapsam, leke, adet, adres ve slot bilgisi iste.",
  "Fiyat itirazinda deger anlat, gereksiz kalemleri ayiklamayi teklif et, paket avantaji ihtimalini soyle ve randevu kapanisina yonlendir.",
  "Satis odakli ol: musteriye bir sonraki net adimi yazdir, ama rahatsiz edici baski kurma.",
  "Ayni bilgileri tekrar tekrar isteme; elde olan bilgileri kullan ve sadece eksik kalanlari sor.",
  "Gerekirse ad, telefon, adres, tarih ve saat bilgilerini istemeyi hatirlat.",
].join(" ");

const pricingReply = [
  "NisanProClean guncel temel fiyat kalemleri su sekilde:",
  "- Tekli koltuk / berjer: 350 TL",
  "- Ikili koltuk: 550 TL",
  "- Uclu koltuk: 750 TL",
  "- L koltuk (buyuk): 1250 TL",
  "- 3+2+1+1 takim: 1800 TL",
  "- Duz koltuk takimi: 2000 TL",
  "- Cift kisilik yatak: 1750 TL",
  "- Tek kisilik yatak: 1000 TL",
  "- Binek arac koltuk temizligi: 2000 TL",
  "- SUV/ticari arac koltuk temizligi: 2500 TL",
  "",
  "Net toplam icin sitedeki Fiyat Hesapla alanindan secim yapabilirsin.",
  "Istersen ad, telefon, adres, tarih ve saat bilgisini yaz; randevuyu hemen olusturalim.",
].join("\n");

const negotiationReply = [
  "Haklisin, fiyat konusunda net ve mantikli ilerleyelim.",
  "Biz fiyati gelisiguzel kirmiyoruz; isi netlestirip gereksiz kalemleri ayikliyoruz. Boylece hem dogru hizmeti alirsin hem de bosuna fazla odemezsin.",
  "",
  "Uygun paket cikarmam icin sunlari yaz:",
  "- Kac parca koltuk var? Ornek: 3+2+1, L koltuk, tekli berjer",
  "- Leke veya koku var mi? Evcil hayvan, sigara, kusma, yemek gibi",
  "- Adres hangi bolge? Afyon Merkez, Erenler, Uydukent, Erkmen vb.",
  "- Hangi gun ve saat blogu uygun? 09:00-12:00 / 13:00-16:00 / 17:00-20:00",
  "",
  "Koltuk + yatak, sandalye veya arac koltugu birlikte olursa paket avantaji konusabiliriz. Net bilgiyle en uygun secenegi cikarip randevuyu acalim.",
].join("\n");

const appointmentReply = [
  "Randevu olusturalim.",
  "Lutfen su bilgileri tek mesajda yaz:",
  "- Ad Soyad",
  "- Telefon",
  "- Adres",
  "- Hizmet (koltuk / yatak / arac koltugu)",
  "- Tarih",
  "- Saat blogu (09:00-12:00 / 13:00-16:00 / 17:00-20:00)",
  "",
  "Bilgileri yazdiginda kaydi hemen acip WhatsApp onayina yonlendirecegim.",
].join("\n");

const stainAnalysisReply = [
  "Evet, fotografla on degerlendirme yapabiliriz.",
  "Bu sohbet alani su an fotograf almiyor; en net yol WhatsApp'tan fotograf gondermen.",
  "",
  "Fotografi gunduz isiginda, lekeye yakin ve net cekersen daha dogru fiyat ve uygulama bilgisi verebiliriz.",
].join("\n");

const defaultPrimaryModel = "@cf/zai-org/glm-4.7-flash";
const defaultFallbackModel = "@cf/qwen/qwen3-30b-a3b-fp8";
const defaultOpenRouterModel = "openai/gpt-oss-120b:free";
const defaultGeminiModel = "gemini-2.5-flash";
const defaultOpenRouterModels = [
  "openai/gpt-oss-120b:free",
  "z-ai/glm-4.5-air:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
];
const defaultWorkersAIModels = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/google/gemma-3-12b-it",
];
const defaultSuperOpenRouterModels = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-26b-a4b-it:free",
];
const defaultSuperWorkersAIModels = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/google/gemma-3-12b-it",
];

const messagesForModel = (history: ReturnType<typeof compactHistory>) => [
  { role: "system" as const, content: systemPrompt },
  ...history.map((item) => ({
    role: item.role as "user" | "assistant",
    content: item.text,
  })),
];

const superAgentSystemPrompt = [
  "Sen NisanProClean SuperAgent'sin.",
  "Kullanici sitenin sahibi Ali. Musteri gibi davranma.",
  "Gorevin siteyi, lead akisini, blog/SEO/GEO islerini, QA kontrolunu ve Instagram sinyallerini yoneten akilli operasyon beyni olmak.",
  "Hazir cevap verme. Baglami oku, eldeki veriyi kullan, eksikse bunu acikca soyle.",
  "Kisa ama dusunerek cevap ver. Gereksiz form sorulari sorma.",
  "Bir aksiyon gerekiyorsa net soyle: hangi alt ajan calismali, neyi kontrol edeceksin, sonraki adim ne.",
  "Musteri randevu akisini sen ustlenme; onu customer chat agent yapar. Sen sahibi yoneten SuperAgent'sin.",
].join(" ");

const buildSuperAgentContext = async (env: Env) => {
  const today = todayKey();
  const [leadCountRaw, latestRunRaw, profileRaw] = await Promise.all([
    env.LEAD_LOGS.get(`counter:${today}`),
    env.LEAD_LOGS.get("super-run:latest"),
    env.LEAD_LOGS.get("super-agent:profile"),
  ]);
  return [
    `Bugunun tarihi: ${today}`,
    `Bugunku worker lead sayaci: ${Number(leadCountRaw || "0")}`,
    latestRunRaw ? `Son SuperAgent raporu: ${latestRunRaw.slice(0, 1800)}` : "Son SuperAgent raporu yok.",
    profileRaw ? `SuperAgent profili: ${profileRaw.slice(0, 900)}` : "SuperAgent profili yok.",
    "Canli yetenekler: blog cadence, QA/GEO monitor, site health check, Instagram ingest queue, Telegram bildirimleri, lead KV sayaci.",
  ].join("\n");
};

const messagesForSuperAgent = async (env: Env, history: ReturnType<typeof compactHistory>) => [
  { role: "system" as const, content: `${superAgentSystemPrompt}\n\n${await buildSuperAgentContext(env)}` },
  ...history.map((item) => ({
    role: item.role as "user" | "assistant",
    content: item.text,
  })),
];

const runOpenRouter = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.OPENROUTER_API_KEY) return "";

  const models = [
    ...parseModelList(env.OPENROUTER_MODELS),
    env.OPENROUTER_MODEL || defaultOpenRouterModel,
    ...defaultOpenRouterModels,
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);

  let lastError: unknown = null;
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nisankoltukyikama.com",
          "X-Title": "NisanProClean AI Asistan",
        },
        body: JSON.stringify({
          model,
          messages: messagesForModel(history),
          max_tokens: 280,
          temperature: 0.25,
        }),
      });

      if (!response.ok) {
        throw new Error(`openrouter_${response.status}_${model}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = (data.choices?.[0]?.message?.content || "").trim();
      if (reply) return reply;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return "";
};

const runSuperOpenRouter = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.OPENROUTER_API_KEY) return "";

  const models = [
    ...parseModelList(env.SUPER_OPENROUTER_MODELS),
    env.SUPER_OPENROUTER_MODEL || "",
    ...defaultSuperOpenRouterModels,
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);

  let lastError: unknown = null;
  const messages = await messagesForSuperAgent(env, history);
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nisankoltukyikama.com",
          "X-Title": "NisanProClean SuperAgent",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 520,
          temperature: 0.35,
        }),
      });

      if (!response.ok) {
        throw new Error(`super_openrouter_${response.status}_${model}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const reply = (data.choices?.[0]?.message?.content || "").trim();
      if (reply) return reply;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return "";
};

const runGemini = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.GEMINI_API_KEY) return "";

  const model = encodeURIComponent(env.GEMINI_MODEL || defaultGeminiModel);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: history.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.text }],
      })),
      generationConfig: {
        maxOutputTokens: 280,
        temperature: 0.25,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`gemini_${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "").trim();
};

const runSuperGemini = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.GEMINI_API_KEY) return "";

  const model = encodeURIComponent(env.SUPER_GEMINI_MODEL || env.GEMINI_MODEL || defaultGeminiModel);
  const messages = await messagesForSuperAgent(env, history);
  const system = messages[0]?.content || superAgentSystemPrompt;
  const contents = messages.slice(1).map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 520,
        temperature: 0.35,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`super_gemini_${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "").trim();
};

const runWorkersAI = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.AI) return "";

  const models = [
    ...parseModelList(env.AI_MODELS),
    env.AI_MODEL_PRIMARY || defaultPrimaryModel,
    env.AI_MODEL_FALLBACK || defaultFallbackModel,
    ...defaultWorkersAIModels,
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);

  for (const model of models) {
    const result = await env.AI.run(model, {
      messages: messagesForModel(history),
      max_tokens: 280,
      temperature: 0.25,
    });
    const reply = (result?.response || "").trim();
    if (reply) return reply;
  }

  return "";
};

const runSuperWorkersAI = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.AI) return "";

  const models = [
    ...parseModelList(env.SUPER_WORKERS_AI_MODELS),
    ...defaultSuperWorkersAIModels,
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);

  const messages = await messagesForSuperAgent(env, history);
  for (const model of models) {
    const result = await env.AI.run(model, {
      messages,
      max_tokens: 520,
      temperature: 0.35,
    });
    const reply = (result?.response || "").trim();
    if (reply) return reply;
  }

  return "";
};

const runBestAvailableModel = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  const providers = [
    () => runOpenRouter(env, history),
    () => runGemini(env, history),
    () => runWorkersAI(env, history),
  ];

  let lastError: unknown = null;
  for (const runProvider of providers) {
    try {
      const reply = await runProvider();
      if (reply) return reply;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("all_model_providers_failed");
};

const runSuperAgentBrain = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  const providers = [
    () => runSuperOpenRouter(env, history),
    () => runSuperGemini(env, history),
    () => runSuperWorkersAI(env, history),
  ];

  let lastError: unknown = null;
  for (const runProvider of providers) {
    try {
      const reply = await runProvider();
      if (reply) return reply;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("all_super_model_providers_failed");
};

const superAgentActionIds = [
  "lead_count",
  "site_health",
  "qa_report",
  "blog_cadence",
  "super_report",
  "instagram_status",
] as const;

type SuperAgentActionId = (typeof superAgentActionIds)[number];

type SuperAgentPlan = {
  reply?: string;
  actions?: SuperAgentActionId[];
};

type SuperAgentActionResult = {
  action: SuperAgentActionId;
  ok: boolean;
  detail: string;
};

const isSuperAgentActionId = (value: string): value is SuperAgentActionId =>
  (superAgentActionIds as readonly string[]).includes(value);

const extractJsonObject = (raw: string) => {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
};

const parseSuperAgentPlan = (raw: string): SuperAgentPlan | null => {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as { reply?: unknown; actions?: unknown };
    const actions = Array.isArray(parsed.actions)
      ? parsed.actions.map((item) => String(item || "").trim()).filter(isSuperAgentActionId)
      : [];
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 1200) : "",
      actions: actions.filter((action, index, arr) => arr.indexOf(action) === index),
    };
  } catch {
    return null;
  }
};

const superAgentPlannerPrompt = async (env: Env) =>
  [
    superAgentSystemPrompt,
    "Owner mesajini analiz et ve sadece strict JSON dondur.",
    "JSON sekli: {\"reply\":\"kisa niyet yorumu\",\"actions\":[\"lead_count\"]}",
    "Musteri randevu formu isteme; bu kanal site sahibi Ali icin.",
    "Aksiyonlari sadece gercekten kontrol/calismasi istenen isler icin sec.",
    "Aksiyonlar: lead_count=bugunku lead sayaci, site_health=canli ana sayfa/admin/api kontrolu, qa_report=SEO/GEO/PageSpeed/Clarity odakli QA monitor, blog_cadence=blog agentini calistir, super_report=tum orkestratoru calistir, instagram_status=Instagram kuyrugunu kontrol et.",
    "Eger kullanici sohbet etmek veya fikir almak istiyorsa actions bos olabilir.",
    await buildSuperAgentContext(env),
  ].join("\n");

const runSuperPlanOpenRouter = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.OPENROUTER_API_KEY) return null;
  const models = [
    ...parseModelList(env.SUPER_OPENROUTER_MODELS),
    env.SUPER_OPENROUTER_MODEL || "",
    ...defaultSuperOpenRouterModels,
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);
  const messages = [
    { role: "system" as const, content: await superAgentPlannerPrompt(env) },
    ...history.map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.text,
    })),
  ];

  let lastError: unknown = null;
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nisankoltukyikama.com",
          "X-Title": "NisanProClean SuperAgent Planner",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 260,
          temperature: 0.15,
        }),
      });
      if (!response.ok) throw new Error(`super_plan_openrouter_${response.status}_${model}`);
      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const plan = parseSuperAgentPlan((data.choices?.[0]?.message?.content || "").trim());
      if (plan) return plan;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return null;
};

const runSuperPlanGemini = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.GEMINI_API_KEY) return null;
  const model = encodeURIComponent(env.SUPER_GEMINI_MODEL || env.GEMINI_MODEL || defaultGeminiModel);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: await superAgentPlannerPrompt(env) }] },
      contents: history.map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.text }],
      })),
      generationConfig: {
        maxOutputTokens: 260,
        temperature: 0.15,
      },
    }),
  });
  if (!response.ok) throw new Error(`super_plan_gemini_${response.status}`);
  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return parseSuperAgentPlan(data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "");
};

const runSuperPlanWorkersAI = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  if (!env.AI) return null;
  const models = [
    ...parseModelList(env.SUPER_WORKERS_AI_MODELS),
    ...defaultSuperWorkersAIModels,
  ].filter((model, index, arr) => model && arr.indexOf(model) === index);
  const messages = [
    { role: "system" as const, content: await superAgentPlannerPrompt(env) },
    ...history.map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.text,
    })),
  ];
  for (const model of models) {
    const result = await env.AI.run(model, {
      messages,
      max_tokens: 260,
      temperature: 0.15,
    });
    const plan = parseSuperAgentPlan(result?.response || "");
    if (plan) return plan;
  }
  return null;
};

const runSuperAgentPlanner = async (env: Env, history: ReturnType<typeof compactHistory>) => {
  const providers = [
    () => runSuperPlanOpenRouter(env, history),
    () => runSuperPlanGemini(env, history),
    () => runSuperPlanWorkersAI(env, history),
  ];

  for (const runProvider of providers) {
    try {
      const plan = await runProvider();
      if (plan) return plan;
    } catch {
      // Fall through to the next provider; owner chat still has the direct brain fallback.
    }
  }
  return null;
};

const runSiteHealthAction = async (env: Env) => {
  const target = (env.QA_TARGET_URL || env.BLOG_API_BASE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
  const started = Date.now();
  const [home, blog, admin, api] = await Promise.all([
    fetch(`${target}/`, { method: "GET" }),
    fetch(`${target}/blog/`, { method: "GET" }),
    fetch(`${target}/admin.html`, { method: "GET" }),
    fetch(`${target}/api.php?action=health`, { method: "GET" }),
  ]);
  return `home:${home.status} blog:${blog.status} admin:${admin.status} api:${api.status} sure:${Date.now() - started}ms`;
};

const executeSuperAgentActions = async (env: Env, actions: SuperAgentActionId[]): Promise<SuperAgentActionResult[]> => {
  const uniqueActions = actions.filter((action, index, arr) => arr.indexOf(action) === index);
  const results: SuperAgentActionResult[] = [];

  for (const action of uniqueActions) {
    try {
      if (action === "lead_count") {
        const count = Number((await env.LEAD_LOGS.get(`counter:${todayKey()}`)) || "0");
        results.push({ action, ok: true, detail: `bugunku_worker_lead_sayaci:${count}` });
      } else if (action === "site_health") {
        results.push({ action, ok: true, detail: await runSiteHealthAction(env) });
      } else if (action === "qa_report") {
        const report = await runQaGrowthMonitor(env);
        results.push({ action, ok: report.status !== "red", detail: `${report.status}: ${report.summary.join(" / ")}` });
      } else if (action === "blog_cadence") {
        const blog = await runBlogCadence(env);
        results.push({ action, ok: blog.ok, detail: compactText(blog.details) });
      } else if (action === "super_report") {
        const summary = await runSuperAgent(env, "manual");
        results.push({
          action,
          ok: summary.ok,
          detail: `site:${summary.site.ok ? "ok" : "hata"} blog:${summary.blog.ok ? "ok" : "hata"} qa:${summary.qa.status} instagram:${summary.instagram.details}`,
        });
      } else if (action === "instagram_status") {
        const queue = JSON.parse((await env.LEAD_LOGS.get("ig-msg:queue")) || "[]") as unknown;
        const count = Array.isArray(queue) ? queue.length : 0;
        results.push({ action, ok: true, detail: `bekleyen_instagram_mesaji:${count}` });
      }
    } catch (error) {
      results.push({
        action,
        ok: false,
        detail: `error:${String((error as Error).message || error).slice(0, 240)}`,
      });
    }
  }

  return results;
};

const runOwnerSuperAgentTurn = async (env: Env, text: string, history: Array<{ role: "user" | "assistant"; text: string }>) => {
  const superHistory = compactHistory({ message: text, history }, text);
  const plan = await runSuperAgentPlanner(env, superHistory);
  const actions = plan?.actions || [];
  const actionResults = actions.length > 0 ? await executeSuperAgentActions(env, actions) : [];

  const synthesisHistory =
    actionResults.length > 0
      ? compactHistory(
          {
            message: [
              text,
              "",
              "CALISAN SUPERAGENT AKSIYON SONUCLARI:",
              ...actionResults.map((result) => `- ${result.action}: ${result.ok ? "OK" : "HATA"} | ${result.detail}`),
              "",
              "Bu sonuclari site sahibi Ali'ye kisa, net, aksiyon odakli ozetle. Ezbere cevap verme.",
            ].join("\n"),
            history: superHistory,
          },
          text,
        )
      : superHistory;

  let reply = "";
  try {
    reply = await runSuperAgentBrain(env, synthesisHistory);
  } catch {
    if (actionResults.length > 0) {
      reply = [
        plan?.reply || "Kontrolu calistirdim.",
        ...actionResults.map((result) => `${result.action}: ${result.ok ? "OK" : "HATA"} - ${result.detail}`),
      ].join("\n");
    } else {
      reply = containsOwnerReportIntent(text)
        ? await buildOwnerDailyReply(env)
        : "SuperAgent modeli su an cevap veremedi. Sistem ayakta; `site kontrol`, `qa calistir`, `blog durum` veya `lead var mi` diye yazarsan alt ajanlari calistiririm.";
    }
  }

  return {
    reply,
    history: appendAssistantHistory(superHistory, reply),
    actions: actionResults,
  };
};

const appendAssistantHistory = (history: Array<{ role: "user" | "assistant"; text: string }>, text: string) =>
  [...history, { role: "assistant" as const, text }].slice(-12);

const telegramSecret = (env: Env) => (env.SUPER_AGENT_CRON_SECRET || env.BLOG_CRON_SECRET || "").trim();

const sendTelegramChatMessage = async (env: Env, chatId: string, text: string) => {
  const token = (env.SUPER_TELEGRAM_BOT_TOKEN || "").trim();
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 3900),
      disable_web_page_preview: true,
    }),
  });

  return response.ok;
};

const runChatTurn = async (env: Env, body: ChatPayload): Promise<ChatTurnResult> => {
  if (!isValidChatMessage(body)) {
    return {
      success: false,
      error: "invalid_message",
      reply: "Mesajini anlayamadim. Kisa ve net yazar misin?",
      status: 422,
      history: [],
    };
  }

  const userMessage = (body.message || "").trim();
  const history = compactHistory(body, userMessage);
  const conversationText = history.map((item) => `${item.role}: ${item.text}`).join("\n");
  const appointmentLead = extractAppointment(conversationText);

  if (appointmentLead.isComplete) {
    let saved = false;
    let duplicate = false;
    try {
      const result = await saveLead(env, {
        name: appointmentLead.name,
        phone: appointmentLead.phone,
        address: appointmentLead.address,
        service: appointmentLead.service,
        date: appointmentLead.date,
        slot: appointmentLead.slot,
        source: "ai_chat_agent",
      });
      saved = true;
      duplicate = result.duplicate;
    } catch {
      saved = false;
    }

    const reply = appointmentSummaryReply(appointmentLead, saved, duplicate);
    return {
      success: true,
      reply,
      status: 200,
      history: appendAssistantHistory(history, reply),
    };
  }

  if (containsNegotiationIntent(userMessage)) {
    return {
      success: true,
      reply: negotiationReply,
      status: 200,
      history: appendAssistantHistory(history, negotiationReply),
    };
  }

  if (containsPricingIntent(userMessage)) {
    return {
      success: true,
      reply: pricingReply,
      status: 200,
      history: appendAssistantHistory(history, pricingReply),
    };
  }

  if (containsStainAnalysisIntent(userMessage)) {
    return {
      success: true,
      reply: stainAnalysisReply,
      status: 200,
      history: appendAssistantHistory(history, stainAnalysisReply),
    };
  }

  if (!containsMetaConversationIntent(userMessage) && containsAppointmentIntent(userMessage)) {
    const reply = missingAppointmentReply(appointmentLead) || appointmentReply;
    return {
      success: true,
      reply,
      status: 200,
      history: appendAssistantHistory(history, reply),
    };
  }

  if (!env.OPENROUTER_API_KEY && !env.GEMINI_API_KEY && !env.AI) {
    const reply = "AI asistan su anda aktif degil. Lutfen biraz sonra tekrar deneyin.";
    return {
      success: false,
      error: "ai_binding_missing",
      reply,
      status: 503,
      history: appendAssistantHistory(history, reply),
    };
  }

  try {
    const reply = await runBestAvailableModel(env, history);
    return {
      success: true,
      reply,
      status: 200,
      history: appendAssistantHistory(history, reply),
    };
  } catch {
    const reply =
      "Su anda cevap olustururken kisa bir sorun yasadim. Dilersen fiyat, randevu veya adres bilgilerini yaz; oradan hizla devam edelim.";
    return {
      success: false,
      error: "all_model_providers_failed",
      reply,
      status: 503,
      history: appendAssistantHistory(history, reply),
    };
  }
};

const telegramHistoryKey = (chatId: string) => `tg-history:${chatId}`;
const isOwnerChat = (env: Env, chatId: string) => chatId === String(env.SUPER_TELEGRAM_CHAT_ID || "").trim();

const buildOwnerDailyReply = async (env: Env) => {
  const count = Number((await env.LEAD_LOGS.get(`counter:${todayKey()}`)) || "0");
  return count > 0
    ? `Bugun su ana kadar ${count} yeni lead kaydi var. Istersen birazdan kaynak ve takip aksiyonlarini da ozetleyebilirim.`
    : "Bugun su ana kadar worker ustunden kaydedilmis yeni lead gorunmuyor. Istersen trafik, form ve sohbet akislarini birlikte kontrol edelim.";
};

const loadTelegramHistory = async (env: Env, chatId: string): Promise<Array<{ role: "user" | "assistant"; text: string }>> => {
  try {
    const raw = await env.LEAD_LOGS.get(telegramHistoryKey(chatId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ role?: string; text?: string }>;
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
            text: String(item.text || "").trim().slice(0, 800),
          }))
          .filter((item) => item.text.length > 0)
          .slice(-12)
      : [];
  } catch {
    return [];
  }
};

const saveTelegramHistory = async (
  env: Env,
  chatId: string,
  history: Array<{ role: "user" | "assistant"; text: string }>,
) => {
  await env.LEAD_LOGS.put(telegramHistoryKey(chatId), JSON.stringify(history.slice(-12)), {
    expirationTtl: 60 * 60 * 24 * 14,
  });
};

const saveOwnerActionLog = async (
  env: Env,
  chatId: string,
  prompt: string,
  actions: SuperAgentActionResult[],
  reply: string,
) => {
  try {
    const key = `super-owner-actions:${todayKey()}`;
    const raw = await env.LEAD_LOGS.get(key);
    const current = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const entry = {
      ts: new Date().toISOString(),
      chat_id: chatId,
      prompt: prompt.slice(0, 500),
      actions: actions.map((item) => ({
        action: item.action,
        ok: item.ok,
        detail: item.detail.slice(0, 280),
      })),
      reply: reply.slice(0, 800),
    };
    current.push(entry);
    await env.LEAD_LOGS.put(key, JSON.stringify(current.slice(-80)), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
  } catch {
    // Owner reply should continue even if action log persistence fails.
  }
};

const telegramWelcomeReply =
  [
    "Merhaba, ben NisanProClean asistani.",
    "Buradan fiyat, randevu, leke on degerlendirmesi ve hizmet bolgesi konularinda hizli yardim alabilirsin.",
    "Istersen direkt su formatta yaz:",
    "Ad Soyad - Telefon - Adres - Hizmet - Tarih - Saat blogu",
  ].join("\n");

const superAgentWelcomeReply =
  [
    "Ben NisanProClean SuperAgent.",
    "Bu Telegram hattinda seni musteri gibi degil, site sahibi gibi dinlerim.",
    "Bana lead, site, blog, SEO, QA, Instagram veya genel operasyon durumunu sorabilirsin.",
  ].join("\n");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin") || env.ALLOWED_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    const { pathname } = new URL(request.url);

    if (pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (pathname === "/blog-agent/run" && request.method === "POST") {
      const secret = (env.BLOG_CRON_SECRET || "").trim();
      const given = request.headers.get("x-blog-cron-secret")?.trim() || "";
      if (!secret || given !== secret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 401,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      const result = await runDailyBlogAgent(env);
      return new Response(JSON.stringify({ success: result.ok, details: result.details }), {
        status: result.ok ? 200 : 503,
        headers: { ...cors(origin), "content-type": "application/json" },
      });
    }

    if (pathname === "/blog-agent/run-cadence" && request.method === "POST") {
      const secret = (env.BLOG_CRON_SECRET || "").trim();
      const given = request.headers.get("x-blog-cron-secret")?.trim() || "";
      if (!secret || given !== secret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 401,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      const result = await runBlogCadence(env);
      return new Response(JSON.stringify({ success: result.ok, details: result.details }), {
        status: result.ok ? 200 : 503,
        headers: { ...cors(origin), "content-type": "application/json" },
      });
    }

    if (pathname === "/blog-agent/repair" && request.method === "POST") {
      const secret = (env.BLOG_CRON_SECRET || "").trim();
      const given = request.headers.get("x-blog-cron-secret")?.trim() || "";
      if (!secret || given !== secret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 401,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      let body: { limit?: number; slug?: string; templateOnly?: boolean; force?: boolean } = {};
      try {
        body = (await request.json()) as { limit?: number; slug?: string; templateOnly?: boolean; force?: boolean };
      } catch {
        body = {};
      }

      const result = await repairPublishedBlogs(env, {
        limit: body.limit,
        slug: body.slug,
        templateOnly: body.templateOnly,
        force: body.force,
      });
      return new Response(JSON.stringify({ success: result.ok, details: result.details }), {
        status: result.ok ? 200 : 503,
        headers: { ...cors(origin), "content-type": "application/json" },
      });
    }

    if (pathname === "/qa/run" && request.method === "POST") {
      const secret = (env.QA_CRON_SECRET || env.BLOG_CRON_SECRET || "").trim();
      const given = request.headers.get("x-qa-cron-secret")?.trim() || "";
      if (!secret || given !== secret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 401,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      const report = await runQaGrowthMonitor(env);
      return new Response(JSON.stringify({ success: true, report }), {
        status: 200,
        headers: { ...cors(origin), "content-type": "application/json" },
      });
    }

    if (pathname === "/super-agent/run" && request.method === "POST") {
      const secret = (env.SUPER_AGENT_CRON_SECRET || env.BLOG_CRON_SECRET || "").trim();
      const given = request.headers.get("x-super-agent-secret")?.trim() || "";
      if (!secret || given !== secret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 401,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      const result = await runSuperAgent(env, "manual");
      return new Response(JSON.stringify({ success: result.ok, result }), {
        status: result.ok ? 200 : 503,
        headers: { ...cors(origin), "content-type": "application/json" },
      });
    }

    if (pathname === "/ingest/instagram" && request.method === "POST") {
      const secret = (env.INSTAGRAM_INGEST_SECRET || env.SUPER_AGENT_CRON_SECRET || env.BLOG_CRON_SECRET || "").trim();
      const given = request.headers.get("x-instagram-ingest-secret")?.trim() || "";
      if (!secret || given !== secret) {
        return new Response(JSON.stringify({ success: false, error: "unauthorized" }), {
          status: 401,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      let payload: {
        source?: string;
        username?: string;
        userId?: string;
        message?: string;
        permalink?: string;
        ts?: string;
      };
      try {
        payload = (await request.json()) as typeof payload;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "invalid_json" }), {
          status: 400,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      const result = await ingestInstagramMessage(env, payload);
      return new Response(JSON.stringify({ success: result.ok, id: result.id }), {
        status: 201,
        headers: { ...cors(origin), "content-type": "application/json" },
      });
    }

    if (pathname === "/telegram/webhook" && request.method === "POST") {
      const secret = telegramSecret(env);
      const given = request.headers.get("x-telegram-bot-api-secret-token")?.trim() || "";
      if (!secret || given !== secret) {
        return json({ success: false, error: "unauthorized" }, 401);
      }

      let update: {
        message?: {
          text?: string;
          chat?: { id?: number | string };
        };
      };
      try {
        update = (await request.json()) as typeof update;
      } catch {
        return json({ success: false, error: "invalid_json" }, 400);
      }

      const chatId = String(update.message?.chat?.id || "").trim();
      const text = String(update.message?.text || "").trim();
      if (!chatId) return json({ success: true, ignored: "missing_chat_id" });
      if (!text) {
        await sendTelegramChatMessage(env, chatId, "Su an yalnizca metin mesajlari isleyebiliyorum. Yazi olarak gonder, hemen devam edelim.");
        return json({ success: true, ignored: "non_text_message" });
      }

      if (text === "/start") {
        await saveTelegramHistory(env, chatId, []);
        await sendTelegramChatMessage(env, chatId, isOwnerChat(env, chatId) ? superAgentWelcomeReply : telegramWelcomeReply);
        return json({ success: true, status: "welcomed" });
      }

      if (isOwnerChat(env, chatId)) {
        const history = await loadTelegramHistory(env, chatId);
        const result = await runOwnerSuperAgentTurn(env, text, history);
        await saveTelegramHistory(env, chatId, result.history);
        await saveOwnerActionLog(env, chatId, text, result.actions, result.reply);
        await sendTelegramChatMessage(env, chatId, result.reply);
        return json({
          success: true,
          status: "super_agent_orchestrated",
          actions: result.actions.map((action) => ({ action: action.action, ok: action.ok })),
        });
      }

      const history = await loadTelegramHistory(env, chatId);
      const result = await runChatTurn(env, { message: text, history });
      await saveTelegramHistory(env, chatId, result.history);
      await sendTelegramChatMessage(env, chatId, result.reply);

      return json({ success: true, status: result.success ? "replied" : "fallback_replied" });
    }

    if (pathname === "/chat" && request.method === "POST") {
      let body: ChatPayload;
      try {
        body = (await request.json()) as ChatPayload;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "invalid_json" }), {
          status: 400,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      if (!isValidChatMessage(body)) {
        return new Response(JSON.stringify({ success: false, error: "invalid_message" }), {
          status: 422,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }
      const result = await runChatTurn(env, body);
      return new Response(
        JSON.stringify({
          success: result.success,
          reply: result.reply,
          ...(result.error ? { error: result.error } : {}),
          history: result.history,
        }),
        {
          status: result.status || (result.success ? 200 : 503),
          headers: { ...cors(origin), "content-type": "application/json" },
        },
      );
    }

    if (pathname === "/notify" && request.method === "POST") {
      let payload: { event?: string; ts?: string; payload?: Record<string, unknown> };
      try {
        payload = (await request.json()) as { event?: string; ts?: string; payload?: Record<string, unknown> };
      } catch {
        return new Response(JSON.stringify({ success: false, error: "invalid_json" }), {
          status: 400,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      const event = String(payload.event || "unknown_event");
      const data = payload.payload || {};
      const text =
        [
          `NisanProClean Bildirim (${event})`,
          `Musteri: ${String(data.name || "-")}`,
          `Telefon: ${String(data.phone || "-")}`,
          `Adres: ${String(data.address || "-")}`,
          `Hizmet: ${String(data.service || data.plan_name || "-")}`,
          `Tarih: ${String(data.date || "-")} ${String(data.time || "")}`.trim(),
          `Not: ${String(data.note || "-")}`,
        ].join("\n");

      const notifyResult = await sendTelegramText(env, text);
      await env.LEAD_LOGS.put(
        `notify-event:${Date.now()}`,
        JSON.stringify({
          ts: new Date().toISOString(),
          event,
          ok: notifyResult.ok,
          detail: notifyResult.detail,
          payload: data,
        }),
        { expirationTtl: 60 * 60 * 24 * 30 },
      );

      return new Response(
        JSON.stringify({
          success: true,
          telegram_ok: notifyResult.ok,
          detail: notifyResult.detail,
        }),
        {
          status: 200,
          headers: { ...cors(origin), "content-type": "application/json" },
        },
      );
    }

    if (pathname !== "/lead" || request.method !== "POST") {
      return json({ success: false, error: "not_found" }, 404);
    }

    let body: LeadPayload;
    try {
      body = (await request.json()) as LeadPayload;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_json" }),
        { status: 400, headers: { ...cors(origin), "content-type": "application/json" } },
      );
    }

    if (!isValidLead(body)) {
      return new Response(
        JSON.stringify({ success: false, error: "invalid_lead" }),
        { status: 422, headers: { ...cors(origin), "content-type": "application/json" } },
      );
    }

    const payload = {
      name: (body.name || "").trim(),
      phone: normalizePhone(body.phone || ""),
      address: (body.address || "").trim(),
      service: (body.service || "").trim(),
      date: (body.date || "").trim(),
      slot: (body.slot || "").trim(),
      source: (body.source || "web").trim(),
    };
    const result = await saveLead(env, payload);

    return new Response(JSON.stringify({ success: true, id: result.id, duplicate: result.duplicate }), {
      status: result.duplicate ? 200 : 201,
      headers: { ...cors(origin), "content-type": "application/json" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const key = `counter:${todayKey()}`;
    const count = Number((await env.LEAD_LOGS.get(key)) || "0");
    await env.LEAD_LOGS.put(`daily-summary:${todayKey()}`, JSON.stringify({ count }), {
      expirationTtl: 60 * 60 * 24 * 30,
    });

    const superRun = await runSuperAgent(env, "daily");
    await env.LEAD_LOGS.put(
      `super-scheduled:${Date.now()}`,
      JSON.stringify({ ts: new Date().toISOString(), ok: superRun.ok, qa: superRun.qa.status, blog: superRun.blog.ok }),
      { expirationTtl: 60 * 60 * 24 * 90 },
    );
  },
};
