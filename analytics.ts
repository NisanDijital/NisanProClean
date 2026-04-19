type AnalyticsPrimitive = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsPrimitive | null | undefined>;
type TrackingConsentState = "granted" | "denied";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    __nisanConversionTrackingCleanup__?: () => void;
  }
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";

const normalizeParams = (params: AnalyticsParams = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

const toFlatValue = (value: AnalyticsPrimitive | null | undefined) => {
  if (value === undefined || value === null) return "";
  return String(value).slice(0, 120);
};

const TRACKING_CONSENT_KEY = "nisan_tracking_consent";

export const getTrackingConsent = (): TrackingConsentState | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(TRACKING_CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return null;
};

export const hasTrackingConsent = () => getTrackingConsent() === "granted";

export const setTrackingConsent = (state: TrackingConsentState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRACKING_CONSENT_KEY, state);
};

const safeHostSet = (allowedHosts?: string) => {
  const list = (allowedHosts || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list);
};

const getElementSource = (element: HTMLElement) => {
  const explicit = element.dataset.analyticsSource;
  if (explicit) return explicit;

  const sourceContainer = element.closest<HTMLElement>("[data-analytics-source], section[id], header, nav, footer");
  if (sourceContainer?.dataset.analyticsSource) return sourceContainer.dataset.analyticsSource;
  if (sourceContainer?.id) return sourceContainer.id;

  const tagName = sourceContainer?.tagName.toLowerCase();
  if (tagName === "header") return "hero";
  if (tagName === "nav") return "navigation";
  if (tagName === "footer") return "footer";

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return toSlug(ariaLabel);

  return toSlug(element.textContent || "");
};

export const trackEvent = (eventName: string, params: AnalyticsParams = {}) => {
  if (typeof window === "undefined") return;

  const payload = normalizeParams(params);
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
    return;
  }

  window.dataLayer.push({ event: eventName, ...payload });

  if (typeof window.clarity === "function") {
    window.clarity("set", "last_event_name", eventName);
    if (payload.source) {
      window.clarity("set", "last_event_source", toFlatValue(payload.source));
    }
    for (const [key, value] of Object.entries(payload)) {
      window.clarity("set", `evt_${toSlug(key)}`, toFlatValue(value));
    }
    window.clarity("event", eventName);
  }
};

export const trackCallClick = (source: string, params: AnalyticsParams = {}) =>
  trackEvent("call_click", { source, ...params });

export const trackWhatsAppClick = (source: string, params: AnalyticsParams = {}) =>
  trackEvent("whatsapp_click", { source, ...params });

export const trackFormSubmit = (source: string, params: AnalyticsParams = {}) =>
  trackEvent("form_submit", { source, ...params });

export const initializeAnalytics = (measurementId?: string) => {
  if (typeof window === "undefined") return;
  if (!hasTrackingConsent()) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function (...args: unknown[]) {
      window.dataLayer.push(args);
    };

  const normalizedId = measurementId?.trim();
  if (!normalizedId) return;
  if (document.querySelector(`script[data-ga-loader="${normalizedId}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${normalizedId}`;
  script.dataset.gaLoader = normalizedId;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", normalizedId, {
    anonymize_ip: true,
    transport_type: "beacon",
  });
};

export const initializeClarity = (projectId?: string, allowedHosts?: string) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!hasTrackingConsent()) return;

  const normalizedProjectId = projectId?.trim() || "wctuxcebw4";

  const defaultAllowed = new Set(["nisankoltukyikama.com", "www.nisankoltukyikama.com"]);
  const configuredHosts = safeHostSet(allowedHosts);
  const allowHosts = configuredHosts.size > 0 ? configuredHosts : defaultAllowed;
  const currentHost = window.location.hostname.toLowerCase();
  if (!allowHosts.has(currentHost)) return;

  if (document.querySelector(`script[data-clarity-loader="${normalizedProjectId}"]`)) return;

  window.clarity =
    window.clarity ||
    function (...args: unknown[]) {
      (window.clarity as unknown as { q?: unknown[] }).q =
        (window.clarity as unknown as { q?: unknown[] }).q || [];
      (window.clarity as unknown as { q?: unknown[] }).q?.push(args);
    };

  window.setTimeout(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${normalizedProjectId}`;
    script.dataset.clarityLoader = normalizedProjectId;
    document.head.appendChild(script);
  }, 1200);
};

export const initializeConversionTracking = () => {
  if (typeof window === "undefined") return () => undefined;
  if (window.__nisanConversionTrackingCleanup__) return window.__nisanConversionTrackingCleanup__;

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;

    const href = anchor.getAttribute("href") || "";
    const source = getElementSource(anchor);

    if (href.startsWith("tel:")) {
      trackCallClick(source, { href });
      return;
    }

    if (href.includes("wa.me") || href.includes("whatsapp")) {
      trackWhatsAppClick(source, { href });
    }
  };

  document.addEventListener("click", handleDocumentClick, true);

  const cleanup = () => {
    document.removeEventListener("click", handleDocumentClick, true);
    delete window.__nisanConversionTrackingCleanup__;
  };

  window.__nisanConversionTrackingCleanup__ = cleanup;
  return cleanup;
};
