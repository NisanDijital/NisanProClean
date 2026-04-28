type ApiPayload = Record<string, unknown>;

let csrfTokenCache: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  const response = await fetch("/api.php?action=csrf_token", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await response.json();
  if (!response.ok || !data?.success || typeof data.token !== "string" || data.token.length < 16) {
    throw new Error(data?.error || "Guvenlik tokeni alinamadi.");
  }
  csrfTokenCache = data.token;
  return csrfTokenCache;
}

export async function apiPost(action: string, payload: ApiPayload) {
  const csrfToken = await ensureCsrfToken();

  const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    throw new Error("Sunucu yaniti okunamadi.");
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || "Islem basarisiz.");
  }

  return data;
}

type LeadAgentPayload = {
  name: string;
  phone: string;
  address: string;
  service: string;
  date: string;
  slot: string;
  source?: string;
};

const LEAD_AGENT_URL =
  import.meta.env.VITE_LEAD_AGENT_URL ||
  "https://nisanproclean-lead-agent.nisankoltukyikamacom.workers.dev";

export async function sendLeadToAgent(payload: LeadAgentPayload): Promise<boolean> {
  try {
    const response = await fetch(`${LEAD_AGENT_URL}/lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function askAIAgent(message: string): Promise<string> {
  try {
    const response = await fetch(`${LEAD_AGENT_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ message }),
    });

    const data = (await response.json()) as { reply?: string };
    if (!response.ok) {
      return data.reply || "Su an yanit veremiyorum. Lutfen tekrar deneyin.";
    }

    return data.reply || "Sorunu anladim. Randevu icin bilgilerini paylasabilirsin.";
  } catch {
    return "Baglanti hatasi var. Lutfen internet baglantini kontrol edip tekrar dene.";
  }
}
