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
