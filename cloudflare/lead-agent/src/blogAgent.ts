export type BlogAgentEnv = {
  LEAD_LOGS: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_MODELS?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  AI_MODEL_PRIMARY?: string;
  AI_MODEL_FALLBACK?: string;
  AI_MODELS?: string;
  AI?: {
    run(
      model: string,
      input: {
        messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
        max_tokens?: number;
        temperature?: number;
      },
    ): Promise<{ response?: string }>;
  };
  BLOG_API_BASE_URL?: string;
  BLOG_API_TOKEN?: string;
  BLOG_DAILY_ENABLED?: string;
  BLOG_SEED_KEYWORDS?: string;
  BLOG_OPENROUTER_MODEL?: string;
  BLOG_OPENROUTER_MODELS?: string;
  BLOG_GEMINI_MODEL?: string;
  BLOG_WORKERS_AI_MODELS?: string;
};

type KeywordRank = {
  keyword: string;
  rank: number | null;
};

type BlogDraft = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
};

const BUSINESS_PHONE_CANONICAL = "05079581642";

const parseModelList = (value?: string) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

const BLOG_DEFAULT_KEYWORDS = [
  "afyon koltuk yikama",
  "afyon koltuk yikama fiyatlari",
  "afyon yatak yikama",
  "afyon arac koltugu yikama",
  "erenler koltuk yikama",
  "uydukent koltuk yikama",
  "erkmen koltuk yikama",
  "sandikli koltuk yikama",
  "bolvadin koltuk yikama",
  "emirdag koltuk yikama",
];

const defaultOpenRouterModels = [
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-120b:free",
  "z-ai/glm-4.5-air:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const defaultWorkersModels = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/qwen/qwen3-30b-a3b-fp8",
  "@cf/meta/llama-4-scout-17b-16e-instruct",
  "@cf/google/gemma-3-12b-it",
];

const defaultSiteContextPaths = [
  "/",
  "/fiyatlar/",
  "/afyon-merkez-koltuk-yikama/",
  "/blog/",
];

const getKeywordSeeds = (env: BlogAgentEnv) => {
  const custom = parseModelList(env.BLOG_SEED_KEYWORDS);
  return custom.length > 0 ? custom : BLOG_DEFAULT_KEYWORDS;
};

const isEnabled = (value?: string) => {
  if (!value) return true;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase().trim());
};

async function fetchKeywordSuggestions(seed: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=tr&q=${encodeURIComponent(seed)}`;
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) return [];
    const data = (await response.json()) as unknown[];
    const list = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    return list
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => item.length >= 6)
      .slice(0, 8);
  } catch {
    return [];
  }
}

function decodeDdgUrl(encodedUrl: string): string {
  try {
    return decodeURIComponent(encodedUrl.replace(/\+/g, "%20"));
  } catch {
    return encodedUrl;
  }
}

async function fetchKeywordRank(keyword: string, domain: string): Promise<number | null> {
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`);
    if (!response.ok) return null;
    const html = await response.text();
    const matches = [...html.matchAll(/uddg=([^"&]+)/g)];
    const urls = matches.map((m) => decodeDdgUrl(m[1] || ""));
    const index = urls.findIndex((url) => url.includes(domain));
    return index >= 0 ? index + 1 : null;
  } catch {
    return null;
  }
}

async function getPublicBlogSlugs(baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api.php?action=blog_list&limit=100`);
    if (!response.ok) return [];
    const data = (await response.json()) as { success?: boolean; records?: Array<{ slug?: string }> };
    if (!data.success || !Array.isArray(data.records)) return [];
    return data.records.map((item) => String(item.slug || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const stripHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

async function fetchSiteContext(baseUrl: string): Promise<string> {
  const chunks: string[] = [];
  for (const path of defaultSiteContextPaths) {
    try {
      const response = await fetch(`${baseUrl}${path}`);
      if (!response.ok) continue;
      const html = await response.text();
      const plain = stripHtml(html).slice(0, 1200);
      if (plain.length > 120) {
        chunks.push(`${path}\n${plain}`);
      }
    } catch {
      // skip
    }
  }
  return chunks.join("\n\n---\n\n").slice(0, 4500);
}

const pickKeyword = async (env: BlogAgentEnv, domain: string) => {
  const seeds = getKeywordSeeds(env);
  const suggestionBuckets = await Promise.all(seeds.slice(0, 4).map((seed) => fetchKeywordSuggestions(seed)));
  const candidates = [...new Set([...seeds, ...suggestionBuckets.flat()])].slice(0, 24);
  const rankChecks = await Promise.all(candidates.map(async (keyword) => ({ keyword, rank: await fetchKeywordRank(keyword, domain) })));
  const historyRaw = await env.LEAD_LOGS.get("blog-keyword-history");
  const history = historyRaw ? (JSON.parse(historyRaw) as string[]) : [];
  const filtered = rankChecks.filter((item) => !history.includes(item.keyword));
  const pool = filtered.length > 0 ? filtered : rankChecks;
  pool.sort((a, b) => {
    const aRank = a.rank ?? 999;
    const bRank = b.rank ?? 999;
    return bRank - aRank;
  });
  const selected = pool[0] ?? { keyword: seeds[0], rank: null };
  const nextHistory = [...history, selected.keyword].slice(-50);
  await env.LEAD_LOGS.put("blog-keyword-history", JSON.stringify(nextHistory), { expirationTtl: 60 * 60 * 24 * 365 });
  return {
    selected,
    rankChecks: rankChecks.slice(0, 12),
  };
};

const blogMessages = (prompt: string) => [
  {
    role: "system" as const,
    content:
      "Sen NisanProClean icin SEO yazari ajanisin. Sadece gecerli JSON don. Turkce yaz. Icerik sahte bilgi icermesin. Yerel niyet: Afyon koltuk yikama. Cikti anahtarlari: title, slug, category, excerpt, content, meta_title, meta_description.",
  },
  {
    role: "user" as const,
    content: prompt,
  },
];

async function runOpenRouter(env: BlogAgentEnv, prompt: string): Promise<string> {
  if (!env.OPENROUTER_API_KEY) return "";
  const models = [
    ...parseModelList(env.BLOG_OPENROUTER_MODELS),
    env.BLOG_OPENROUTER_MODEL || "",
    ...parseModelList(env.OPENROUTER_MODELS),
    env.OPENROUTER_MODEL || "",
    ...defaultOpenRouterModels,
  ].filter((model, idx, arr) => model && arr.indexOf(model) === idx);

  for (const model of models) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nisankoltukyikama.com",
        "X-Title": "NisanProClean Blog Agent",
      },
      body: JSON.stringify({
        model,
        messages: blogMessages(prompt),
        temperature: 0.3,
        max_tokens: 1800,
      }),
    });
    if (!response.ok) continue;
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (text) return text;
  }
  return "";
}

async function runGemini(env: BlogAgentEnv, prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) return "";
  const model = encodeURIComponent(env.BLOG_GEMINI_MODEL || env.GEMINI_MODEL || "gemini-2.5-flash");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Sadece gecerli JSON don." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1900, temperature: 0.35 },
      }),
    },
  );
  if (!response.ok) return "";
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data.candidates?.[0]?.content?.parts || []).map((item) => item.text || "").join("").trim();
  return text;
}

async function runWorkersAI(env: BlogAgentEnv, prompt: string): Promise<string> {
  if (!env.AI) return "";
  const models = [
    ...parseModelList(env.BLOG_WORKERS_AI_MODELS),
    ...parseModelList(env.AI_MODELS),
    env.AI_MODEL_PRIMARY || "",
    env.AI_MODEL_FALLBACK || "",
    ...defaultWorkersModels,
  ].filter((model, idx, arr) => model && arr.indexOf(model) === idx);

  for (const model of models) {
    try {
      const result = await env.AI.run(model, {
        messages: blogMessages(prompt),
        max_tokens: 1800,
        temperature: 0.35,
      });
      const text = (result.response || "").trim();
      if (text) return text;
    } catch {
      // continue
    }
  }
  return "";
}

const extractJson = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : trimmed;
};

const parseDraft = (raw: string): BlogDraft => {
  const parsed = JSON.parse(extractJson(raw)) as Partial<BlogDraft>;
  const title = String(parsed.title || "").trim();
  const category = String(parsed.category || "Yerel Rehber").trim();
  const excerpt = String(parsed.excerpt || "").trim();
  const content = String(parsed.content || "").trim();
  const slug = normalizeSlug(String(parsed.slug || title));
  const meta_title = String(parsed.meta_title || title).trim();
  const meta_description = String(parsed.meta_description || excerpt).trim();
  if (title.length < 16) throw new Error("title_too_short");
  if (slug.length < 6) throw new Error("slug_invalid");
  if (content.replace(/<[^>]+>/g, "").length < 700) throw new Error("content_too_short");
  return { title, slug, category, excerpt, content, meta_title, meta_description };
};

const sanitizeDraft = (draft: BlogDraft): BlogDraft => {
  const patched = { ...draft };
  patched.content = patched.content
    .replace(/https?:\/\/(www\.)?nisanproclean\.com/gi, "https://nisankoltukyikama.com")
    .replace(/www\.nisanproclean\.com/gi, "nisankoltukyikama.com");
  patched.excerpt = patched.excerpt
    .replace(/https?:\/\/(www\.)?nisanproclean\.com/gi, "https://nisankoltukyikama.com")
    .replace(/www\.nisanproclean\.com/gi, "nisankoltukyikama.com");
  patched.meta_description = patched.meta_description
    .replace(/https?:\/\/(www\.)?nisanproclean\.com/gi, "https://nisankoltukyikama.com")
    .replace(/www\.nisanproclean\.com/gi, "nisankoltukyikama.com");
  return patched;
};

const validateDraftQuality = (draft: BlogDraft): void => {
  const fullText = `${draft.title}\n${draft.excerpt}\n${draft.content}\n${draft.meta_description}`;
  const externalLink = fullText.match(/https?:\/\/[^\s"'<)]+/gi)?.find((url) => !/https?:\/\/(www\.)?nisankoltukyikama\.com/i.test(url));
  if (externalLink) {
    throw new Error(`external_link_not_allowed:${externalLink}`);
  }

  const phoneMatches = fullText.match(/(?:\+?90|0)?\s*5\d[\d\s().-]{8,}/g) || [];
  for (const rawPhone of phoneMatches) {
    const digits = rawPhone.replace(/\D/g, "");
    const normalized = digits.startsWith("90") && digits.length === 12 ? `0${digits.slice(2)}` : digits;
    if (!normalized.includes(BUSINESS_PHONE_CANONICAL)) {
      throw new Error(`unexpected_phone:${rawPhone}`);
    }
  }

  const tlMatches = fullText.match(/\b\d{2,}\s*TL\b/gi) || [];
  if (tlMatches.length > 6) {
    throw new Error("too_many_price_claims");
  }
};

async function publishDraft(env: BlogAgentEnv, draft: BlogDraft): Promise<{ ok: boolean; body: string }> {
  const baseUrl = (env.BLOG_API_BASE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
  const token = (env.BLOG_API_TOKEN || "").trim();
  if (!token) throw new Error("missing_blog_api_token");
  const response = await fetch(`${baseUrl}/api.php?action=admin_blog_upsert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Blog-Api-Token": token,
    },
    body: JSON.stringify({
      ...draft,
      status: "published",
      image: "/media/hero-1280.jpg",
      author: "NisanProClean",
    }),
  });
  const body = await response.text();
  return { ok: response.ok, body };
}

export async function runDailyBlogAgent(env: BlogAgentEnv): Promise<{ ok: boolean; details: string }> {
  if (!isEnabled(env.BLOG_DAILY_ENABLED)) {
    return { ok: true, details: "blog_daily_disabled" };
  }

  const baseUrl = (env.BLOG_API_BASE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
  const domain = new URL(baseUrl).host;
  const { selected, rankChecks } = await pickKeyword(env, domain);
  const existingSlugs = await getPublicBlogSlugs(baseUrl);
  const siteContext = await fetchSiteContext(baseUrl);

  const prompt = [
    "NisanProClean icin blog yaz.",
    `Ana hedef kelime: ${selected.keyword}`,
    `Son kontrol edilen siralama: ${selected.rank ?? "bulunamadi"}`,
    `Mevcut sluglar: ${existingSlugs.slice(0, 40).join(", ") || "yok"}`,
    `Keyword/rank tablosu: ${rankChecks.map((x) => `${x.keyword}:${x.rank ?? "NA"}`).join(" | ")}`,
    "Kurallar:",
    "- 900-1300 kelime arasi",
    "- Sadece Afyon hizmet niyeti",
    "- Somut, ikna edici, spam olmayan dil",
    "- Baslikta hedef kelimeyi dogal kullan",
    "- Slug benzersiz ve kisa olsun",
    "- Uydurma telefon numarasi yazma. Sadece 0507 958 16 42 kullanilabilir.",
    "- Dis domain linki verme. Sadece nisankoltukyikama.com linki kullanabilirsin.",
    "- Fiyat tablosu veya kesin rakam uydurma. Fiyati etkileyen faktorleri anlat ve fiyat hesaplama sayfasina yonlendir.",
    "- Asagidaki SITE_CONTEXT icindeki marka dili, hizmet kapsamasi ve lokasyonlara sadik kal.",
    `SITE_CONTEXT:\n${siteContext || "baglam_alinamadi"}`,
    "- Cikti SADECE JSON olsun",
  ].join("\n");

  const outputs = [await runOpenRouter(env, prompt), await runGemini(env, prompt), await runWorkersAI(env, prompt)].filter(Boolean);
  if (outputs.length === 0) {
    return { ok: false, details: "no_model_output" };
  }

  let draft: BlogDraft | null = null;
  let parseError = "";
  for (const output of outputs) {
    try {
      draft = sanitizeDraft(parseDraft(output));
      validateDraftQuality(draft);
      break;
    } catch (error) {
      parseError = String((error as Error).message || error);
    }
  }

  if (!draft) {
    return { ok: false, details: `draft_parse_failed:${parseError}` };
  }

  if (existingSlugs.includes(draft.slug)) {
    draft.slug = `${draft.slug}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  }

  const publish = await publishDraft(env, draft);
  const log = {
    ts: new Date().toISOString(),
    keyword: selected.keyword,
    rank: selected.rank,
    slug: draft.slug,
    title: draft.title,
    publish_ok: publish.ok,
    response: publish.body.slice(0, 500),
  };
  await env.LEAD_LOGS.put(`blog-run:${Date.now()}`, JSON.stringify(log), { expirationTtl: 60 * 60 * 24 * 90 });

  return { ok: publish.ok, details: JSON.stringify(log) };
}
