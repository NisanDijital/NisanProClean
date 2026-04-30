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

type AppointmentPayload = {
  name: string;
  phone: string;
  address: string;
  service: string;
  date: string;
  time: string;
  note?: string;
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

export async function createAppointment(payload: AppointmentPayload): Promise<boolean> {
  try {
    await apiPost("appointment_book", payload);
    return true;
  } catch {
    return false;
  }
}

type ChatHistoryItem = {
  role: "user" | "assistant";
  text: string;
};

export type ApiBlogPost = {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  content: string;
  image: string;
  status?: string;
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
};

export async function fetchBlogPosts(): Promise<ApiBlogPost[]> {
  try {
    const response = await fetch("/api.php?action=blog_list&limit=30", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const data = (await response.json()) as { success?: boolean; records?: ApiBlogPost[] };
    if (!response.ok || !data.success || !Array.isArray(data.records)) {
      return [];
    }
    return data.records;
  } catch {
    return [];
  }
}

export async function askAIAgent(message: string, history: ChatHistoryItem[] = []): Promise<string> {
  try {
    const response = await fetch(`${LEAD_AGENT_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ message, history: history.slice(-12) }),
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
