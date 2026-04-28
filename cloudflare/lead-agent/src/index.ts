export interface Env {
  LEAD_LOGS: KVNamespace;
  ALLOWED_ORIGIN: string;
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

const todayKey = () => new Date().toISOString().slice(0, 10);

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
