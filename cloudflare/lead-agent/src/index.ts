export interface Env {
  LEAD_LOGS: KVNamespace;
  ALLOWED_ORIGIN: string;
  AI_MODEL_PRIMARY?: string;
  AI_MODEL_FALLBACK?: string;
  AI?: Ai;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
    },
  ): Promise<void>;
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

const normalizePhone = (value = "") => value.replace(/\D/g, "");

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

const normalizeForIntent = (message: string) =>
  message.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{Diacritic}/gu, "");

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

const systemPrompt = [
  "Sen NisanProClean icin calisan bir randevu asistanisin.",
  "Her zaman Turkce cevap ver.",
  "Kisa, net ve yardimci cevap ver.",
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

const todayKey = () => new Date().toISOString().slice(0, 10);
const defaultPrimaryModel = "@cf/qwen/qwen3-30b-a3b-fp8";
const defaultFallbackModel = "@cf/zai-org/glm-4.7-flash";

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

      if (containsPricingIntent(userMessage)) {
        return new Response(JSON.stringify({ success: true, reply: pricingReply }), {
          status: 200,
          headers: { ...cors(origin), "content-type": "application/json" },
        });
      }

      if (containsAppointmentIntent(userMessage)) {
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
                { role: "user", content: userMessage },
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

    const leadId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const payload = {
      id: leadId,
      createdAt,
      name: (body.name || "").trim(),
      phone: normalizePhone(body.phone || ""),
      address: (body.address || "").trim(),
      service: (body.service || "").trim(),
      date: (body.date || "").trim(),
      slot: (body.slot || "").trim(),
      source: (body.source || "web").trim(),
    };

    await env.LEAD_LOGS.put(`lead:${leadId}`, JSON.stringify(payload), {
      expirationTtl: 60 * 60 * 24 * 180,
    });

    const dailyCounterKey = `counter:${todayKey()}`;
    const current = Number((await env.LEAD_LOGS.get(dailyCounterKey)) || "0");
    await env.LEAD_LOGS.put(dailyCounterKey, String(current + 1), {
      expirationTtl: 60 * 60 * 24 * 370,
    });

    return new Response(JSON.stringify({ success: true, id: leadId }), {
      status: 201,
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
