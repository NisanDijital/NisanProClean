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
  BLOG_BOOTCAMP_DAYS?: string;
  BLOG_BOOTCAMP_PER_DAY?: string;
  BLOG_NORMAL_PER_DAY?: string;
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

type PublicBlogRecord = BlogDraft & {
  id?: number;
  status?: string;
  author?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  image?: string;
};

const BUSINESS_PHONE_CANONICAL = "05079581642";
const BUSINESS_PHONE_DISPLAY = "0507 958 16 42";
const SITE_BASE_URL = "https://nisankoltukyikama.com";

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
  "openai/gpt-oss-120b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-26b-a4b-it:free",
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

const parsePositiveInt = (value: string | undefined, fallbackValue: number): number => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackValue;
  return parsed;
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

async function getPublicBlogRecords(baseUrl: string): Promise<PublicBlogRecord[]> {
  try {
    const response = await fetch(`${baseUrl}/api.php?action=blog_list&limit=100`);
    if (!response.ok) return [];
    const data = (await response.json()) as { success?: boolean; records?: PublicBlogRecord[] };
    if (!data.success || !Array.isArray(data.records)) return [];
    return data.records;
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

const countMatches = (value: string, regex: RegExp) => [...value.matchAll(regex)].length;

const sanitizeDraft = (draft: BlogDraft): BlogDraft => {
  const patched = { ...draft };
  const replaceWrongPhones = (value: string) =>
    value
      .replace(/(?:\+?90|0)?\s*5\d[\d\s().-]{8,}/g, BUSINESS_PHONE_DISPLAY)
      .replace(/0\s*242[\d\s().-]{7,}/g, BUSINESS_PHONE_DISPLAY);
  patched.content = patched.content
    .replace(/https?:\/\/(www\.)?nisanproclean\.com/gi, SITE_BASE_URL)
    .replace(/www\.nisanproclean\.com/gi, "nisankoltukyikama.com");
  patched.excerpt = patched.excerpt
    .replace(/https?:\/\/(www\.)?nisanproclean\.com/gi, SITE_BASE_URL)
    .replace(/www\.nisanproclean\.com/gi, "nisankoltukyikama.com");
  patched.meta_description = patched.meta_description
    .replace(/https?:\/\/(www\.)?nisanproclean\.com/gi, SITE_BASE_URL)
    .replace(/www\.nisanproclean\.com/gi, "nisankoltukyikama.com");
  patched.content = replaceWrongPhones(patched.content)
    .replace(/https:\/\/www\.nisanproclean\.com/gi, SITE_BASE_URL)
    .replace(/https:\/\/nisankoltukyikama\.com\/fiyat-hesaplama/gi, `${SITE_BASE_URL}/fiyatlar/`)
    .replace(/\bSoruCevap\b/gi, "")
    .replace(/<a([^>]+)href="https:\/\/nisankoltukyikama\.com"([^>]*)>nisankoltukyikama\.com<\/a>/gi, '<a$1href="https://nisankoltukyikama.com/"$2>nisankoltukyikama.com</a>');
  patched.excerpt = replaceWrongPhones(patched.excerpt);
  patched.meta_description = replaceWrongPhones(patched.meta_description);
  patched.content = postProcessHtml(patched.content);
  patched.excerpt = ensureReadableSpacing(patched.excerpt);
  patched.meta_description = ensureReadableSpacing(patched.meta_description);
  return patched;
};

const validateDraftQuality = (draft: BlogDraft): void => {
  const fullText = `${draft.title}\n${draft.excerpt}\n${draft.content}\n${draft.meta_description}`;
  const stripped = draft.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

  if (draft.excerpt.length < 120) {
    throw new Error("excerpt_too_short");
  }

  if (draft.meta_description.length < 120 || draft.meta_description.length > 180) {
    throw new Error("meta_description_length_invalid");
  }

  if (countMatches(draft.content, /<h2\b/gi) < 5) {
    throw new Error("not_enough_h2");
  }

  if (countMatches(draft.content, /<h3\b/gi) < 3) {
    throw new Error("not_enough_h3");
  }

  if (!/<ul\b|<ol\b/gi.test(draft.content)) {
    throw new Error("list_missing");
  }

  if (!/S[ıi]k Sorulan Sorular/i.test(stripped)) {
    throw new Error("faq_section_missing");
  }

  if (/SoruCevap|Koltuk TipiTemel Yikama|Telefonla da 0242/i.test(fullText)) {
    throw new Error("broken_format_or_wrong_contact");
  }

  if (/(^|\n)\s*[-*]\s+/m.test(draft.content) && !/<li>/i.test(draft.content)) {
    throw new Error("markdown_list_detected");
  }

  if (/\|.+\|/.test(draft.content) || /<\/p>\s*\n\s*Koltuk Tipi/i.test(draft.content)) {
    throw new Error("table_artifact_detected");
  }
};

const deriveKeywordFromRecord = (record: PublicBlogRecord) => {
  const source = `${record.slug || ""} ${record.title || ""}`.toLowerCase();
  const pairs = [
    "afyon koltuk yikama fiyatlari",
    "afyon arac koltugu yikama",
    "afyon yatak yikama",
    "afyon merkez koltuk yikama",
    "erenler koltuk yikama",
    "uydukent koltuk yikama",
    "erkmen koltuk yikama",
    "sandikli koltuk yikama",
    "bolvadin koltuk yikama",
    "emirdag koltuk yikama",
    "afyon koltuk yikama",
  ];
  return pairs.find((item) => source.includes(item.replace(/\s+/g, "-")) || source.includes(item)) || "afyon koltuk yikama";
};

const buildBlogPrompt = (params: {
  keyword: string;
  selectedRankText: string;
  existingSlugs: string[];
  rankLine: string;
  siteContext: string;
  originalTitle?: string;
  originalSlug?: string;
  mode?: "new" | "repair";
}) =>
  [
    params.mode === "repair" ? "NisanProClean icin mevcut blog yazisini bastan ve temiz sekilde yeniden yaz." : "NisanProClean icin yeni bir blog yaz.",
    `Ana hedef kelime: ${params.keyword}`,
    `Son kontrol edilen siralama: ${params.selectedRankText}`,
    `Mevcut sluglar: ${params.existingSlugs.slice(0, 40).join(", ") || "yok"}`,
    `Keyword/rank tablosu: ${params.rankLine}`,
    params.originalTitle ? `Eski baslik referansi: ${params.originalTitle}` : "",
    params.originalSlug ? `Eski slug referansi: ${params.originalSlug}` : "",
    "Kurallar:",
    "- Sadece gecerli JSON don",
    "- JSON anahtarlari: title, slug, category, excerpt, content, meta_title, meta_description",
    "- Yalnizca Turkce yaz",
    "- 900-1300 kelime arasi yaz",
    "- Sadece Afyon hizmet niyeti ve NisanProClean marka dili",
    "- Uydurma bilgi, sahte kampanya, sahte garanti, sahte yorum, sahte fiyat tablosu yazma",
    `- Telefon olarak sadece ${BUSINESS_PHONE_DISPLAY} kullan`,
    "- Dis domain linki verme. Sadece nisankoltukyikama.com linkleri kullan",
    "- Kesin fiyat rakami verme. Fiyati etkileyen faktorleri anlat ve /fiyatlar/ sayfasina yonlendir",
    "- Icerik HTML olacak. Markdown kullanma",
    "- En az 5 adet <h2> ve en az 3 adet <h3> kullan",
    "- En az 1 adet <ul> veya <ol> kullan",
    "- Mutlaka 'Sik Sorulan Sorular' adli bir bolum olsun ve soru-cevaplari <h3> + <p> ile yaz",
    "- Tablolari markdown veya duz metin olarak verme",
    "- Son bolumde net CTA ver: telefon ve fiyatlar sayfasi",
    "- Asagidaki SITE_CONTEXT icindeki marka dili, hizmet kapsamasi ve lokasyonlara sadik kal",
    `SITE_CONTEXT:\n${params.siteContext || "baglam_alinamadi"}`,
  ]
    .filter(Boolean)
    .join("\n");

const sentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const trMap: Record<string, string> = {
  afyon: "Afyon",
  merkez: "Merkez",
  erenler: "Erenler",
  uydukent: "Uydukent",
  erkmen: "Erkmen",
  sahipata: "Sahipata",
  sandikli: "Sandıklı",
  bolvadin: "Bolvadin",
  emirdag: "Emirdağ",
  koltuk: "koltuk",
  yikama: "yıkama",
  yatak: "yatak",
  arac: "araç",
  koltugu: "koltuğu",
  fiyatlari: "fiyatları",
};

const humanizeAsciiKeyword = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part, index) => {
      const mapped = trMap[part] || part;
      if (index === 0 && mapped.length > 0) return mapped.charAt(0).toUpperCase() + mapped.slice(1);
      return mapped;
    })
    .join(" ");

const titleCaseWords = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const humanizeLocation = (value: string) => {
  const mapped = humanizeAsciiKeyword(value);
  return mapped === "Afyon merkez" ? "Afyon Merkez" : mapped;
};

const formatKeywordPhrase = (keyword: string) => {
  const phrase = humanizeAsciiKeyword(keyword).trim();
  return phrase.length > 0 ? phrase.charAt(0).toLowerCase() + phrase.slice(1) : phrase;
};

const ensureReadableSpacing = (value: string) =>
  value
    .replace(/(0507\s958\s16\s42)(?=[A-Za-zÇĞİÖŞÜçğıöşü])/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();

const cleanAnchorAttributes = (value: string) =>
  value.replace(/<a\s+([^>]*?)>/gi, (_match, attrs: string) => {
    const href = attrs.match(/href="([^"]+)"/i)?.[1];
    const rel = attrs.match(/rel="([^"]+)"/i)?.[1];
    const target = attrs.match(/target="([^"]+)"/i)?.[1];
    const rebuilt = [
      href ? `href="${href}"` : "",
      rel ? `rel="${rel}"` : "",
      target ? `target="${target}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<a ${rebuilt}>`;
  });

const postProcessHtml = (value: string) =>
  ensureReadableSpacing(
    cleanAnchorAttributes(
      value
        .replace(/\bIcin\b/g, "İçin")
        .replace(/\bNasil\b/g, "Nasıl")
        .replace(/\bOnemli\b/g, "Önemli")
        .replace(/\bFiyati\b/g, "Fiyatı")
        .replace(/\bBaslica\b/g, "Başlıca")
        .replace(/\bSureci\b/g, "Süreci")
        .replace(/\bMusaitlik\b/g, "Müsaitlik")
        .replace(/\bSik Sorulan Sorular\b/g, "Sık Sorulan Sorular")
        .replace(/\bSonuc\b/g, "Sonuç")
        .replace(/\bIletisim\b/g, "İletişim"),
    ),
  );

const detectService = (keyword: string) => {
  if (keyword.includes("yatak")) return { key: "yatak", label: "Yatak Yikama" };
  if (keyword.includes("arac")) return { key: "arac", label: "Arac Koltugu Yikama" };
  return { key: "koltuk", label: "Koltuk Yikama" };
};

const detectLocation = (keyword: string) => {
  const found =
    ["afyon merkez", "erenler", "uydukent", "erkmen", "sahipata", "sandikli", "bolvadin", "emirdag"].find((item) =>
      keyword.includes(item),
    ) || "afyon";
  return found;
};

const buildDeterministicDraft = (keyword: string): BlogDraft => {
  const normalizedKeyword = keyword.toLowerCase();
  const service = detectService(normalizedKeyword);
  const location = detectLocation(normalizedKeyword);
  const locationTitle = humanizeLocation(location === "afyon" ? "afyon" : location);
  const serviceTitle = titleCaseWords(humanizeAsciiKeyword(service.label.toLowerCase()));
  const keywordPhrase = formatKeywordPhrase(normalizedKeyword);
  const title = `${locationTitle} ${serviceTitle} | NisanProClean ile Yerinde Derin Temizlik`;
  const slug = normalizeSlug(normalizedKeyword);
  const category = "Yerel Rehber";
  const excerpt = `${locationTitle} bölgesinde ${keywordPhrase} hizmeti arayanlar için NisanProClean; yerinde uygulama, hızlı kuruma yaklaşımı, randevu akışı ve fiyatı etkileyen noktaları sade biçimde anlatır.`;
  const content = [
    `<p>${locationTitle} bölgesinde ${keywordPhrase} ihtiyacı genelde leke, koku, yoğun kullanım ve kısa sürede tekrar kullanabilme beklentisiyle ortaya çıkar. NisanProClean olarak bu yazıda süreci sadeleştiriyor, fiyatı etkileyen noktaları anlatıyor ve randevu kararını hızlandıracak net bir çerçeve sunuyoruz.</p>`,
    `<h2>${locationTitle} Bölgesinde ${serviceTitle} Neden Önemlidir?</h2>`,
    `<p>Evde, ofiste veya araç içinde kullanılan döşemeler zamanla toz, ter, günlük kir, alerjen ve koku biriktirir. Düzenli profesyonel temizlik yalnızca görüntüyü toparlamaz; kullanım konforunu artırır, iç mekân hissini ferahlatır ve yoğun kullanılan alanlarda daha sağlıklı bir düzen kurulmasına yardımcı olur.</p>`,
    `<h2>NisanProClean Süreci Nasıl İlerler?</h2>`,
    `<ul><li>Ön inceleme ile kumaş, leke ve kullanım yoğunluğu değerlendirilir.</li><li>Yüzeydeki gevşek kir profesyonel vakumla alınır.</li><li>Malzemeye uygun ürün ve yöntem seçilir.</li><li>Derin temizlik sonrası kontrollü nem ve hızlı kuruma hedeflenir.</li></ul>`,
    `<h2>Fiyatı Etkileyen Başlıca Unsurlar</h2>`,
    `<p>Kesin fiyat tek bir sabit rakama bağlı değildir. Parça sayısı, kumaş tipi, leke yoğunluğu, ek hijyen ihtiyacı ve adres bilgisi toplamı etkiler. En sağlıklı yol, önce <a href="${SITE_BASE_URL}/fiyatlar/">fiyatlar</a> sayfasından seçim yapmak, sonra detayları teyit etmektir.</p>`,
    `<h3>Kumaş ve Yüzey Tipi</h3>`,
    `<p>Mikrofiber, klasik kumaş, deri ya da farklı döşeme tipleri aynı şekilde ele alınmaz. Uygulanacak ürün, temas süresi ve kuruma planı buna göre değişir.</p>`,
    `<h3>Leke ve Koku Yoğunluğu</h3>`,
    `<p>Kahve, yağ, sigara, evcil hayvan izi veya uzun süre beklemiş lekeler daha dikkatli işlem gerektirir. Bu da süreci ve kullanılan ürün miktarını doğrudan etkiler.</p>`,
    `<h3>Randevu ve Ulaşım Planı</h3>`,
    `<p>${locationTitle} ve yakın bölgelerde günlük rota planlaması yapıldığı için tarih, saat aralığı ve açık adres bilgisi operasyonu doğrudan etkiler. Bu yüzden ilk iletişimde temel bilgilerin net olması işleri hızlandırır.</p>`,
    `<h2>Randevu Süreci Nasıldır?</h2>`,
    `<ol><li>Telefon veya WhatsApp üzerinden temel bilgi alınır.</li><li>Adres, hizmet tipi ve uygun saat aralığı netleştirilir.</li><li>Gerekirse fotoğraf üzerinden ön değerlendirme yapılır.</li><li>Müsaitlik onayıyla kayıt açılır ve ekip planı kesinleşir.</li></ol>`,
    `<h2>Müsaitlik İsterken Hangi Bilgiler Hazır Olmalı?</h2>`,
    `<ul><li>Ad soyad</li><li>Telefon numarası</li><li>Açık adres</li><li>Hizmet tipi</li><li>Tercih edilen tarih</li><li>Saat aralığı: 09:00-12:00 / 13:00-16:00 / 17:00-20:00</li></ul>`,
    `<h2>Sık Sorulan Sorular</h2>`,
    `<h3>Kuruma süresi neye göre değişir?</h3><p>Uygulanan yöntem, hava akışı, malzeme tipi ve ortam koşulları kuruma süresini etkiler. Amaç, kontrollü nemle alanı mümkün olduğunca hızlı kullanıma döndürmektir.</p>`,
    `<h3>Kesin fiyat neden telefonda teyit edilir?</h3><p>Parça sayısı, malzeme tipi ve leke durumu görülmeden tek rakam vermek sağlıklı olmaz. Önce kapsam netleşir, sonra fiyat teyit edilir.</p>`,
    `<h3>Fotoğraf göndermek faydalı olur mu?</h3><p>Evet. Özellikle leke, koku veya yoğun kir durumunda ön değerlendirme hızlanır ve daha doğru yönlendirme yapılır.</p>`,
    `<h2>Neden NisanProClean?</h2>`,
    `<p>NisanProClean; Afyon ve çevresinde yerinde hizmet, net randevu akışı, anlaşılır fiyat mantığı ve hızlı geri dönüş üzerine kurulu bir çalışma düzeni sunar. Büyük vaatler yerine tutarlı iş akışıyla ilerler.</p>`,
    `<h2>Sonuç ve İletişim</h2>`,
    `<p>${locationTitle} için ${keywordPhrase} arıyorsanız önce <a href="${SITE_BASE_URL}/fiyatlar/">fiyatlar</a> sayfasına bakabilir, ardından ${BUSINESS_PHONE_DISPLAY} numarası üzerinden detay paylaşıp randevu sürecini başlatabilirsiniz.</p>`,
  ].join("");
  const meta_title = `${locationTitle} ${serviceTitle} | NisanProClean`;
  const meta_description = `${locationTitle} bölgesinde ${keywordPhrase} için NisanProClean; yerinde uygulama, fiyatı etkileyen unsurlar, hızlı randevu akışı ve ${BUSINESS_PHONE_DISPLAY} ile kolay iletişim sunar.`;
  return { title, slug, category, excerpt, content, meta_title, meta_description };
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

  const prompt = buildBlogPrompt({
    keyword: selected.keyword,
    selectedRankText: String(selected.rank ?? "bulunamadi"),
    existingSlugs,
    rankLine: rankChecks.map((x) => `${x.keyword}:${x.rank ?? "NA"}`).join(" | "),
    siteContext,
    mode: "new",
  });

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
    try {
      draft = sanitizeDraft(buildDeterministicDraft(selected.keyword));
      validateDraftQuality(draft);
    } catch (error) {
      parseError = `${parseError}|deterministic:${String((error as Error).message || error)}`;
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
  await env.LEAD_LOGS.put("blog-run:latest", JSON.stringify(log), { expirationTtl: 60 * 60 * 24 * 90 });

  return { ok: publish.ok, details: JSON.stringify(log) };
}

export async function repairPublishedBlogs(
  env: BlogAgentEnv,
  options?: { limit?: number; slug?: string; templateOnly?: boolean; force?: boolean },
): Promise<{ ok: boolean; details: string }> {
  const baseUrl = (env.BLOG_API_BASE_URL || "https://nisankoltukyikama.com").replace(/\/+$/, "");
  const domain = new URL(baseUrl).host;
  const records = await getPublicBlogRecords(baseUrl);
  const existingSlugs = records.map((item) => item.slug).filter(Boolean);
  const siteContext = await fetchSiteContext(baseUrl);
  const limit = Math.max(1, Math.min(Number(options?.limit || 3), 10));

  const pool = options?.slug ? records.filter((record) => record.slug === options.slug) : records;
  const flagged = (options?.force ? pool : pool.filter((record) => {
    try {
      validateDraftQuality(sanitizeDraft(record));
      return false;
    } catch {
      return true;
    }
  })).slice(0, limit);

  const results: Array<{ slug: string; ok: boolean; detail: string }> = [];
  for (const record of flagged) {
    const keyword = deriveKeywordFromRecord(record);
    let draft: BlogDraft | null = null;
    try {
      draft = sanitizeDraft(buildDeterministicDraft(keyword));
      draft.slug = record.slug;
      validateDraftQuality(draft);
    } catch (error) {
      if (options?.templateOnly) {
        draft = sanitizeDraft(buildDeterministicDraft(keyword));
        draft.slug = record.slug;
      }
      if (!options?.templateOnly) {
        const prompt = buildBlogPrompt({
          keyword,
          selectedRankText: String(await fetchKeywordRank(keyword, domain) ?? "bulunamadi"),
          existingSlugs,
          rankLine: `${keyword}:${await fetchKeywordRank(keyword, domain) ?? "NA"}`,
          siteContext,
          originalTitle: record.title,
          originalSlug: record.slug,
          mode: "repair",
        });
        const outputs = [await runOpenRouter(env, prompt), await runGemini(env, prompt), await runWorkersAI(env, prompt)].filter(Boolean);
        let parseError = `deterministic:${String((error as Error).message || error)}`;
        for (const output of outputs) {
          try {
            draft = sanitizeDraft(parseDraft(output));
            draft.slug = record.slug;
            validateDraftQuality(draft);
            break;
          } catch (innerError) {
            parseError = `${parseError}|ai:${String((innerError as Error).message || innerError)}`;
          }
        }
        if (!draft) {
          results.push({ slug: record.slug, ok: false, detail: `draft_parse_failed:${parseError}` });
          continue;
        }
      }
    }

    const publish = await publishDraft(env, draft);
    results.push({ slug: record.slug, ok: publish.ok, detail: publish.ok ? "repaired" : publish.body.slice(0, 200) });
  }

  const failed = results.find((item) => !item.ok);
  const detail = JSON.stringify({
    scanned: records.length,
    flagged: flagged.length,
    repaired: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok),
  });
  await env.LEAD_LOGS.put("blog-repair:latest", detail, { expirationTtl: 60 * 60 * 24 * 90 });
  return { ok: !failed, details: detail };
}

export async function runBlogCadence(env: BlogAgentEnv): Promise<{ ok: boolean; details: string }> {
  const bootcampDays = parsePositiveInt(env.BLOG_BOOTCAMP_DAYS, 7);
  const bootcampPerDay = parsePositiveInt(env.BLOG_BOOTCAMP_PER_DAY, 3);
  const normalPerDay = parsePositiveInt(env.BLOG_NORMAL_PER_DAY, 1);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const startKey = "blog-cadence-start-date";
  const doneKey = `blog-cadence-done:${today}`;

  const existingStart = (await env.LEAD_LOGS.get(startKey)) || today;
  if (!existingStart) {
    await env.LEAD_LOGS.put(startKey, today, { expirationTtl: 60 * 60 * 24 * 365 });
  } else if (existingStart === today) {
    await env.LEAD_LOGS.put(startKey, existingStart, { expirationTtl: 60 * 60 * 24 * 365 });
  }

  const startDate = new Date(`${existingStart}T00:00:00.000Z`);
  const dayDiff = Math.max(0, Math.floor((Date.parse(`${today}T00:00:00.000Z`) - startDate.getTime()) / 86400000));
  const targetCount = dayDiff < bootcampDays ? bootcampPerDay : normalPerDay;

  const alreadyDone = parsePositiveInt(await env.LEAD_LOGS.get(doneKey) ?? "0", 0);
  const remaining = Math.max(0, targetCount - alreadyDone);

  const runLogs: Array<{ ok: boolean; details: string }> = [];
  try {
    for (let i = 0; i < remaining; i += 1) {
      try {
        const result = await runDailyBlogAgent(env);
        runLogs.push(result);
        if (!result.ok) {
          break;
        }
        await env.LEAD_LOGS.put(doneKey, String(alreadyDone + i + 1), { expirationTtl: 60 * 60 * 24 * 30 });
      } catch (error) {
        runLogs.push({ ok: false, details: `run_exception:${String((error as Error)?.message || error)}` });
        break;
      }
    }
  } catch (error) {
    runLogs.push({ ok: false, details: `cadence_exception:${String((error as Error)?.message || error)}` });
  }

  const failed = runLogs.find((x) => !x.ok);
  return {
    ok: !failed,
    details: JSON.stringify({
      ts: now.toISOString(),
      today,
      startDate: existingStart,
      dayDiff,
      targetCount,
      alreadyDone,
      attempted: runLogs.length,
      successCount: runLogs.filter((x) => x.ok).length,
      failed: failed?.details || null,
    }),
  };
}
