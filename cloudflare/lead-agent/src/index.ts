export interface Env {
  LEAD_LOGS: KVNamespace;
  ALLOWED_ORIGIN: string;
  AI_MODEL_PRIMARY?: string;
  AI_MODEL_FALLBACK?: string;
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

type ChatPayload = {
  message?: string;
  history?: Array<{ role?: string; text?: string }>;
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
  "access-control-allow-headers": "content-type",
});

const normalizeForIntent = (message: string) =>
  message.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{Diacritic}/gu, "");

const normalizePhone = (value = "") => value.replace(/\D/g, "");
const normalizeKeyPart = (value = "") => normalizeForIntent(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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

const compactHistory = (payload: ChatPayload, currentMessage: string) => {
  const history = Array.isArray(payload.history) ? payload.history : [];
  const cleaned = history
    .slice(-12)
    .map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      text: String(item.text || "").trim().slice(0, 800),
    }))
    .filter((item) => item.text.length > 0);

  if (!cleaned.some((item) => item.role === "user" && item.text === currentMessage)) {
    cleaned.push({ role: "user", text: currentMessage });
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
  const nameMatch = beforePhone.match(/([\p{L}]{2,}(?:\s+[\p{L}]{2,}){0,2})\s*$/u);
  const name = nameMatch ? nameMatch[1].trim() : "";

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

  const dateMatch = normalized.match(/\b(\d{1,2})\s*(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\b/);
  const date = dateMatch ? `${dateMatch[1]} ${dateMatch[2]}` : normalized.includes("yarin") ? "yarin" : "";

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
  const address = addressPatterns.map((pattern) => conversation.match(pattern)?.[0]).find(Boolean) || "";

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

const dedupeKeyForLead = (lead: Pick<LeadPayload, "phone" | "service" | "date" | "slot">) =>
  [
    "dedupe",
    normalizePhone(lead.phone || ""),
    normalizeKeyPart(lead.service || ""),
    normalizeKeyPart(lead.date || ""),
    normalizeKeyPart(lead.slot || ""),
  ].join(":");

const todayKey = () => new Date().toISOString().slice(0, 10);

const incrementDailyCounter = async (env: Env) => {
  const dailyCounterKey = `counter:${todayKey()}`;
  const current = Number((await env.LEAD_LOGS.get(dailyCounterKey)) || "0");
  await env.LEAD_LOGS.put(dailyCounterKey, String(current + 1), {
    expirationTtl: 60 * 60 * 24 * 370,
  });
};

const saveLead = async (env: Env, payload: LeadPayload) => {
  const dedupeKey = dedupeKeyForLead(payload);
  const existingLeadId = await env.LEAD_LOGS.get(dedupeKey);
  if (existingLeadId) {
    return { id: existingLeadId, duplicate: true };
  }

  const leadId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.LEAD_LOGS.put(
    `lead:${leadId}`,
    JSON.stringify({
      id: leadId,
      createdAt,
      name: (payload.name || "").trim(),
      phone: normalizePhone(payload.phone || ""),
      address: (payload.address || "").trim(),
      service: (payload.service || "").trim(),
      date: (payload.date || "").trim(),
      slot: (payload.slot || "").trim(),
      source: (payload.source || "web").trim(),
    }),
    { expirationTtl: 60 * 60 * 24 * 180 },
  );
  await env.LEAD_LOGS.put(dedupeKey, leadId, {
    expirationTtl: 60 * 60 * 24 * 180,
  });
  await incrementDailyCounter(env);
  return { id: leadId, duplicate: false };
};

const systemPrompt = [
  "Sen NisanProClean icin calisan bir randevu asistanisin.",
  "Her zaman Turkce cevap ver.",
  "Kisa, net ve yardimci cevap ver.",
  "Musteri sinirli yazsa bile sakin kal, azarlama.",
  "Sadece koltuk, yatak, arac koltugu temizligi ve randevu konularinda cevap ver.",
  "Fiyat sorularinda asla rakam uydurma.",
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
  "Evet, leke analizi yapabiliriz.",
  "Sitedeki Yapay Zeka Leke Analizi bolumunden lekenin fotografini yukleyebilirsin.",
  "Chat alani su an fotograf almiyor; fotografli degerlendirme icin leke analizi panelini kullan ya da WhatsApp'tan fotograf gonder.",
  "",
  "Daha net sonuc icin fotografi gunduz isiginda, lekeye yakin ve net cekmeni oneririm.",
].join("\n");

const defaultPrimaryModel = "@cf/qwen/qwen3-30b-a3b-fp8";
const defaultFallbackModel = "@cf/google/gemma-3-12b-it";

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

        return new Response(JSON.stringify({ success: true, reply: appointmentSummaryReply(appointmentLead, saved, duplicate) }), {
          status: 200,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      if (containsPricingIntent(userMessage)) {
        return new Response(JSON.stringify({ success: true, reply: pricingReply }), {
          status: 200,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      if (containsStainAnalysisIntent(userMessage)) {
        return new Response(JSON.stringify({ success: true, reply: stainAnalysisReply }), {
          status: 200,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      if (containsAppointmentIntent(conversationText)) {
        return new Response(JSON.stringify({ success: true, reply: appointmentReply }), {
          status: 200,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      if (!env.AI) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ai_binding_missing",
            reply: "AI asistan su anda aktif degil. Lutfen biraz sonra tekrar deneyin.",
          }),
          {
            status: 503,
            headers: { ...cors(origin), "content-type": "application/json" },
          },
        );
      }

      try {
        const primaryModel = env.AI_MODEL_PRIMARY || defaultPrimaryModel;
        const fallbackModel = env.AI_MODEL_FALLBACK || defaultFallbackModel;
        const models = [primaryModel, fallbackModel].filter((model, index, arr) => arr.indexOf(model) === index);

        let result: { response?: string } | null = null;
        let lastError: unknown = null;

        for (const model of models) {
          try {
            result = await env.AI.run(model, {
              messages: [
                { role: "system", content: systemPrompt },
                ...history.map((item) => ({
                  role: item.role as "user" | "assistant",
                  content: item.text,
                })),
              ],
              max_tokens: 280,
              temperature: 0.25,
            });
            if ((result?.response || "").trim().length > 0) break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!result || !(result.response || "").trim()) {
          throw lastError || new Error("all_models_failed");
        }

        const reply = (result?.response || "").trim();
        return new Response(
          JSON.stringify({
            success: true,
            reply:
              reply ||
              "Sorunu anladim. Hizli randevu icin ad, telefon, adres, tarih ve saat bilgini paylasabilirsin.",
          }),
          {
            status: 200,
            headers: { ...cors(origin), "content-type": "application/json" },
          },
        );
      } catch {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ai_runtime_error",
            reply: "Sistem su an yogun. Lutfen bir kac dakika sonra tekrar deneyin.",
          }),
          {
            status: 503,
            headers: { ...cors(origin), "content-type": "application/json" },
          },
        );
      }
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
  },
};
