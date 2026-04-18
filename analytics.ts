type AnalyticsPrimitive = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsPrimitive | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
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
};

export const trackCallClick = (source: string, params: AnalyticsParams = {}) =>
  trackEvent("call_click", { source, ...params });

export const trackWhatsAppClick = (source: string, params: AnalyticsParams = {}) =>
  trackEvent("whatsapp_click", { source, ...params });

export const trackFormSubmit = (source: string, params: AnalyticsParams = {}) =>
  trackEvent("form_submit", { source, ...params });

export const initializeAnalytics = (measurementId?: string) => {
  if (typeof window === "undefined") return;

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
